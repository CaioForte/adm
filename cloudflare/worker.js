

const CORS_HEADERS = {

  "Access-Control-Allow-Origin": "*",

  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",

  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Expose-Headers": "Content-Disposition"

};



const ITERATIONS = 100000;

const SESSION_DURATION = 21600;

const VALOR_INSCRICAO_PADRAO = 80;



function resposta(dados, status = 200) {

  return new Response(JSON.stringify(dados), {

    status,

    headers: {

      ...CORS_HEADERS,

      "Content-Type": "application/json; charset=utf-8"

    }

  });

}



function bytesParaHex(bytes) {

  return Array.from(bytes)

    .map(b => b.toString(16).padStart(2, "0"))

    .join("");

}



function hexParaBytes(hex) {

  if (!hex || hex.length % 2 !== 0 || !/^[0-9a-f]+$/i.test(hex)) {

    throw new Error("Formato hexadecimal inválido.");

  }



  const bytes = new Uint8Array(hex.length / 2);



  for (let i = 0; i < bytes.length; i++) {

    bytes[i] = parseInt(hex.substring(i * 2, i * 2 + 2), 16);

  }



  return bytes;

}



async function gerarHashSenha(senha, salt) {

  const chave = await crypto.subtle.importKey(

    "raw",

    new TextEncoder().encode(senha),

    "PBKDF2",

    false,

    ["deriveBits"]

  );



  const resultado = await crypto.subtle.deriveBits(

    {

      name: "PBKDF2",

      salt,

      iterations: ITERATIONS,

      hash: "SHA-256"

    },

    chave,

    256

  );



  return bytesParaHex(new Uint8Array(resultado));

}



async function gerarHashToken(token) {

  const resultado = await crypto.subtle.digest(

    "SHA-256",

    new TextEncoder().encode(token)

  );



  return bytesParaHex(new Uint8Array(resultado));

}



function compararHashes(a, b) {

  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) {

    return false;

  }



  let diferenca = 0;



  for (let i = 0; i < a.length; i++) {

    diferenca |= a.charCodeAt(i) ^ b.charCodeAt(i);

  }



  return diferenca === 0;

}



async function validarSessao(token, env) {

  if (!token || typeof token !== "string") return null;



  const tokenHash = await gerarHashToken(token);

  const agora = Math.floor(Date.now() / 1000);



  return await env.DB.prepare(`

    SELECT a.id, a.name, a.email, COALESCE(a.is_superadmin, 0) AS is_superadmin

    FROM sessions s

    INNER JOIN admins a ON a.id = s.admin_id

    WHERE s.token_hash = ?

      AND s.expires_at > ?

      AND a.active = 1

    LIMIT 1

  `).bind(tokenHash, agora).first();

}



async function obterEventosPermitidos(admin, env) {
  if (Number(admin.is_superadmin || 0) === 1) {
    const r = await env.DB.prepare(`SELECT id, name, type, active FROM events WHERE active = 1 ORDER BY name`).all();
    return r.results || [];
  }
  const r = await env.DB.prepare(`
    SELECT e.id, e.name, e.type, e.active
    FROM admin_event_access a INNER JOIN events e ON e.id = a.event_id
    WHERE a.admin_id = ? AND e.active = 1 ORDER BY e.name
  `).bind(admin.id).all();
  return r.results || [];
}

async function fazerLogin(request, env) {

  const body = await request.json();



  const email = String(body.email || "").trim().toLowerCase();

  const senha = String(body.senha || "");



  if (!email || !senha) {

    return resposta({

      sucesso: false,

      mensagem: "Informe o e-mail e a senha."

    }, 400);

  }



  const admin = await env.DB.prepare(`

    SELECT id, name, email, password_hash, password_salt, active, is_superadmin

    FROM admins

    WHERE lower(email) = ?

    LIMIT 1

  `).bind(email).first();



  if (!admin || admin.active !== 1 || !admin.password_salt) {

    return resposta({

      sucesso: false,

      mensagem: "E-mail ou senha inválidos."

    }, 401);

  }



  const salt = hexParaBytes(admin.password_salt);

  const hashInformado = await gerarHashSenha(senha, salt);



  if (!compararHashes(hashInformado, admin.password_hash)) {

    return resposta({

      sucesso: false,

      mensagem: "E-mail ou senha inválidos."

    }, 401);

  }



  const tokenBytes = crypto.getRandomValues(new Uint8Array(32));

  const token = bytesParaHex(tokenBytes);

  const tokenHash = await gerarHashToken(token);



  const agora = Math.floor(Date.now() / 1000);

  const expiracao = agora + SESSION_DURATION;



  await env.DB.prepare(`

    DELETE FROM sessions WHERE expires_at <= ?

  `).bind(agora).run();



  await env.DB.prepare(`

    INSERT INTO sessions (token_hash, admin_id, expires_at, created_at)

    VALUES (?, ?, ?, ?)

  `).bind(tokenHash, admin.id, expiracao, agora).run();

  const eventosPermitidos = await obterEventosPermitidos(admin, env);
  if (!eventosPermitidos.length) {
    await env.DB.prepare(`DELETE FROM sessions WHERE token_hash = ?`).bind(tokenHash).run();
    return resposta({ sucesso: false, mensagem: "Este usuário não possui acesso a nenhum evento ativo." }, 403);
  }

  return resposta({

    sucesso: true,

    dados: {

      token,

      administrador: {

        id: admin.id,

        nome: admin.name,

        email: admin.email,
        isSuperadmin: Number(admin.is_superadmin || 0) === 1,
        eventos: eventosPermitidos

      },

      expiracaoSegundos: SESSION_DURATION

    }

  });

}



async function acessoEventoPermitido(admin, evento, env) {
  if (!admin || !evento) return false;
  if (Number(admin.is_superadmin || 0) === 1) return true;
  const permitido = await env.DB.prepare(`
    SELECT e.id FROM admin_event_access a
    INNER JOIN events e ON e.id = a.event_id
    WHERE a.admin_id = ? AND a.event_id = ? AND e.active = 1
    LIMIT 1
  `).bind(admin.id, String(evento).trim().toUpperCase()).first();
  return Boolean(permitido);
}

async function validarAcessoEventoRequisicao(request, env) {
  const body = await request.clone().json().catch(() => ({}));
  if (!body.evento) return null;
  const admin = await validarSessao(body.token, env);
  if (!admin) return resposta({ sucesso: false, mensagem: "Sessão inválida ou expirada." }, 401);
  if (!(await acessoEventoPermitido(admin, body.evento, env))) {
    return resposta({ sucesso: false, mensagem: "Você não possui acesso a este evento ou ele está inativo." }, 403);
  }
  return null;
}


async function gerenciarEventos(request, env) {
  const body = await request.json().catch(() => ({}));
  const admin = await validarSessao(body.token, env);
  if (!admin) return resposta({ sucesso: false, mensagem: "Sessão inválida ou expirada." }, 401);
  if (Number(admin.is_superadmin || 0) !== 1) return resposta({ sucesso: false, mensagem: "Apenas o administrador principal pode criar ou alterar eventos." }, 403);

  const action = String(body.action || "listar");
  if (action === "listar") {
    const r = await env.DB.prepare(`SELECT id, name, type, active, start_date, maps_url, plate_start_number, last_plate_number, created_at FROM events ORDER BY created_at DESC, name`).all();
    return resposta({ sucesso: true, dados: { eventos: r.results || [] } });
  }

  if (action === "criar" || action === "alterar") {
    const id = String(body.codigo || body.id || "").trim().toUpperCase();
    const nome = String(body.nome || "").trim();
    const tipo = String(body.tipo || "").trim().toUpperCase();
    const inicio = String(body.inicioInscricoes || "").trim();
    const maps = String(body.mapsUrl || "").trim();
    const numeroInicialPlaca = Number(body.numeroInicialPlaca ?? 1);
    if (!Number.isSafeInteger(numeroInicialPlaca) || numeroInicialPlaca < 1 || numeroInicialPlaca > 999999999) return resposta({ sucesso: false, mensagem: "Informe um número inicial de placa entre 1 e 999.999.999." }, 400);
    if (!/^[A-Z0-9][A-Z0-9_-]{2,39}$/.test(id)) return resposta({ sucesso: false, mensagem: "O código deve ter de 3 a 40 caracteres: letras, números, hífen ou underline." }, 400);
    if (!nome || nome.length > 160) return resposta({ sucesso: false, mensagem: "Informe o nome do evento (até 160 caracteres)." }, 400);
    if (!["MTB", "TRAIL"].includes(tipo)) return resposta({ sucesso: false, mensagem: "Selecione MTB ou TRAIL." }, 400);
    if (maps && !/^https:\/\//i.test(maps)) return resposta({ sucesso: false, mensagem: "O link do Google Maps deve começar com https://." }, 400);

    if (action === "criar") {
      const existe = await env.DB.prepare(`SELECT id FROM events WHERE id = ?`).bind(id).first();
      if (existe) return resposta({ sucesso: false, mensagem: "Já existe um evento com esse código." }, 409);
      await env.DB.prepare(`INSERT INTO events (id, name, type, active, start_date, maps_url, plate_start_number, last_plate_number, created_at) VALUES (?, ?, ?, 1, ?, ?, ?, ?, CURRENT_TIMESTAMP)`)
        .bind(id, nome, tipo, inicio || null, maps || null, numeroInicialPlaca, numeroInicialPlaca - 1).run();
      return resposta({ sucesso: true, dados: { id } });
    }

    const originalId = String(body.id || "").trim().toUpperCase();
    if (!originalId) return resposta({ sucesso: false, mensagem: "Evento inválido." }, 400);
    if (id !== originalId) return resposta({ sucesso: false, mensagem: "O código do evento não pode ser alterado depois da criação, pois identifica inscrições e dados vinculados." }, 400);
    const result = await env.DB.prepare(`UPDATE events
      SET name = ?, type = ?, start_date = ?, maps_url = ?,
          plate_start_number = CASE WHEN last_plate_number = plate_start_number - 1 THEN ? ELSE plate_start_number END,
          last_plate_number = CASE WHEN last_plate_number = plate_start_number - 1 THEN ? - 1 ELSE last_plate_number END
      WHERE id = ?`)
      .bind(nome, tipo, inicio || null, maps || null, numeroInicialPlaca, numeroInicialPlaca, originalId).run();
    if (!result.meta?.changes) return resposta({ sucesso: false, mensagem: "Evento não encontrado." }, 404);
    return resposta({ sucesso: true, dados: { id: originalId } });
  }

  if (action === "status") {
    const id = String(body.id || "").trim().toUpperCase();
    const ativo = Number(body.ativo) === 1 ? 1 : 0;
    if (!id) return resposta({ sucesso: false, mensagem: "Evento inválido." }, 400);
    const result = await env.DB.prepare(`UPDATE events SET active = ? WHERE id = ?`).bind(ativo, id).run();
    if (!result.meta?.changes) return resposta({ sucesso: false, mensagem: "Evento não encontrado." }, 404);
    return resposta({ sucesso: true, dados: { id, active: ativo } });
  }

  return resposta({ sucesso: false, mensagem: "Ação de evento inválida." }, 400);
}


async function gerenciarChecklists(request, env) {
  const body = await request.json().catch(() => ({}));
  const admin = await validarSessao(body.token, env);
  if (!admin) return resposta({ sucesso: false, mensagem: "Sessão inválida ou expirada." }, 401);

  const evento = String(body.evento || "").trim().toUpperCase();
  if (!evento) return resposta({ sucesso: false, mensagem: "Selecione um evento." }, 400);
  if (!(await acessoEventoPermitido(admin, evento, env))) {
    return resposta({ sucesso: false, mensagem: "Você não possui acesso a este evento ou ele está inativo." }, 403);
  }
  const eventoExiste = await env.DB.prepare("SELECT id FROM events WHERE id=?").bind(evento).first();
  if (!eventoExiste) return resposta({ sucesso: false, mensagem: "Evento não encontrado." }, 404);
  const registrarAuditoriaItem = async (checklistId, itemId, action, details) => {
    await env.DB.prepare(`
      INSERT INTO checklist_history (checklist_id,checklist_item_id,event_id,actor_id,actor_name,actor_email,action,details,created_at)
      VALUES (?,?,?,?,?,?,?, ?,CURRENT_TIMESTAMP)
    `).bind(checklistId,itemId,evento,String(admin.id || ""),String(admin.name || admin.email || "Administrador"),String(admin.email || ""),action,details || "").run();
  };
  const registrarAuditoriaChecklist = async (checklistId, action, details) => {
    await env.DB.prepare(`
      INSERT INTO checklist_audit (checklist_id,event_id,actor_id,actor_name,actor_email,action,details,created_at)
      VALUES (?,?,?,?,?,?,?,CURRENT_TIMESTAMP)
    `).bind(checklistId,evento,String(admin.id || ""),String(admin.name || admin.email || "Administrador"),String(admin.email || ""),action,details || "").run();
  };

  const action = String(body.action || "listar");
  if (action === "listar") {
    const r = await env.DB.prepare(`
      SELECT c.checklist_id, c.event_id, c.title, c.description, c.status,
             c.created_at, c.updated_at, c.archived_at,
             (SELECT COUNT(*) FROM checklist_items i WHERE i.checklist_id=c.checklist_id) AS total_items,
             (SELECT COUNT(*) FROM checklist_items i WHERE i.checklist_id=c.checklist_id AND i.active=1) AS active_items
      FROM checklists c
      WHERE c.event_id=?
      ORDER BY c.checklist_id DESC
    `).bind(evento).all();
    return resposta({ sucesso: true, dados: { checklists: r.results || [] } });
  }

  if (action === "criar" || action === "alterar") {
    const title = String(body.title || "").trim();
    const description = String(body.description || "").trim();
    const items = Array.isArray(body.items) ? body.items : [];
    if (!title || title.length > 160) return resposta({ sucesso: false, mensagem: "Informe o título do checklist (até 160 caracteres)." }, 400);
    if (description.length > 1000) return resposta({ sucesso: false, mensagem: "A descrição deve ter até 1.000 caracteres." }, 400);
    if (items.length > 300) return resposta({ sucesso: false, mensagem: "O checklist permite até 300 itens." }, 400);

    const normalized = [];
    for (const item of items) {
      const desc = String(item.description || "").trim();
      if (!desc || desc.length > 300) return resposta({ sucesso: false, mensagem: "Cada item deve ter uma descrição de até 300 caracteres." }, 400);
      const id = item.checklist_item_id == null || item.checklist_item_id === "" ? null : Number(item.checklist_item_id);
      if (id !== null && (!Number.isSafeInteger(id) || id < 1)) return resposta({ sucesso: false, mensagem: "Identificador de item inválido." }, 400);
      normalized.push({ id, description: desc, active: item.active === false || Number(item.active) === 0 ? 0 : 1 });
    }

    if (action === "criar") {
      const result = await env.DB.prepare(`
        INSERT INTO checklists (event_id,title,description,status,created_by)
        VALUES (?,?,?,'active',?)
      `).bind(evento, title, description, String(admin.id || "")).run();
      const checklistId = Number(result.meta?.last_row_id || 0);
      if (!checklistId) return resposta({ sucesso: false, mensagem: "Não foi possível criar o checklist." }, 500);
      await registrarAuditoriaChecklist(checklistId,"checklist_created",`Checklist criado: ${title}`);
      for (const item of normalized) {
        const created = await env.DB.prepare(`
          INSERT INTO checklist_items (checklist_id,description,active,created_by,inactivated_by,inactivated_at)
          VALUES (?,?,?,?,?,CASE WHEN ?=0 THEN CURRENT_TIMESTAMP ELSE NULL END)
        `).bind(checklistId, item.description, item.active, String(admin.id || ""), item.active ? null : String(admin.id || ""), item.active).run();
        const itemId = Number(created.meta?.last_row_id || 0);
        if (itemId) await registrarAuditoriaItem(checklistId,itemId,"item_created",`Item criado no Admin: ${item.description}${item.active ? "" : " (inativo)"}`);
      }
      return resposta({ sucesso: true, mensagem: "Checklist criado.", dados: { checklist_id: checklistId } });
    }

    const checklistId = Number(body.checklist_id);
    if (!Number.isSafeInteger(checklistId) || checklistId < 1) return resposta({ sucesso: false, mensagem: "Checklist inválido." }, 400);
    const current = await env.DB.prepare("SELECT checklist_id,status,title,description FROM checklists WHERE checklist_id=? AND event_id=?").bind(checklistId, evento).first();
    if (!current) return resposta({ sucesso: false, mensagem: "Checklist não encontrado neste evento." }, 404);
    if (current.status !== "active") return resposta({ sucesso: false, mensagem: "Reative o checklist antes de editá-lo." }, 409);
    const idsItensInformados = normalized.filter(item => item.id !== null).map(item => item.id);
    if (new Set(idsItensInformados).size !== idsItensInformados.length) {
      return resposta({ sucesso: false, mensagem: "Um item foi enviado mais de uma vez." }, 400);
    }
    for (const itemId of idsItensInformados) {
      const pertence = await env.DB.prepare("SELECT checklist_item_id FROM checklist_items WHERE checklist_item_id=? AND checklist_id=?").bind(itemId,checklistId).first();
      if (!pertence) return resposta({ sucesso: false, mensagem: "Um dos itens não pertence a este checklist." }, 400);
    }

    await env.DB.prepare(`
      UPDATE checklists SET title=?,description=?,updated_by=?,updated_at=CURRENT_TIMESTAMP
      WHERE checklist_id=? AND event_id=?
    `).bind(title, description, String(admin.id || ""), checklistId, evento).run();
    if (String(current.title || "") !== title || String(current.description || "") !== description) {
      await registrarAuditoriaChecklist(checklistId,"checklist_updated",`Dados gerais alterados. Título anterior: ${current.title}. Novo título: ${title}. Descrição anterior: ${current.description || ""}. Nova descrição: ${description}.`);
    }

    for (const item of normalized) {
      if (item.id === null) {
        const created = await env.DB.prepare(`
          INSERT INTO checklist_items (checklist_id,description,active,created_by,inactivated_by,inactivated_at)
          VALUES (?,?,?,?,?,CASE WHEN ?=0 THEN CURRENT_TIMESTAMP ELSE NULL END)
        `).bind(checklistId, item.description, item.active, String(admin.id || ""), item.active ? null : String(admin.id || ""), item.active).run();
        const itemId = Number(created.meta?.last_row_id || 0);
        if (itemId) await registrarAuditoriaItem(checklistId,itemId,"item_created",`Item adicionado pelo Admin: ${item.description}${item.active ? "" : " (inativo)"}`);
      } else {
        const existing = await env.DB.prepare("SELECT checklist_item_id,active,description FROM checklist_items WHERE checklist_item_id=? AND checklist_id=?").bind(item.id, checklistId).first();
        if (!existing) return resposta({ sucesso: false, mensagem: "Um dos itens não pertence a este checklist." }, 400);
        await env.DB.prepare(`
          UPDATE checklist_items
          SET description=?,active=?,updated_by=?,
              inactivated_by=CASE WHEN ?=0 AND active=1 THEN ? WHEN ?=1 THEN NULL ELSE inactivated_by END,
              inactivated_at=CASE WHEN ?=0 AND active=1 THEN CURRENT_TIMESTAMP WHEN ?=1 THEN NULL ELSE inactivated_at END,
              updated_at=CURRENT_TIMESTAMP
          WHERE checklist_item_id=? AND checklist_id=?
        `).bind(item.description,item.active,String(admin.id || ""),item.active,String(admin.id || ""),item.active,item.active,item.active,item.id,checklistId).run();
        if (String(existing.description || "") !== item.description) await registrarAuditoriaItem(checklistId,item.id,"item_description_changed",`Descrição alterada de: ${existing.description} | Para: ${item.description}`);
        if (Number(existing.active) !== item.active) await registrarAuditoriaItem(checklistId,item.id,item.active ? "item_reactivated" : "item_inactivated",item.active ? "Item reativado pelo Admin." : "Item inativado pelo Admin.");
      }
    }
    return resposta({ sucesso: true, mensagem: "Checklist atualizado.", dados: { checklist_id: checklistId } });
  }

  if (action === "itens") {
    const checklistId = Number(body.checklist_id);
    if (!Number.isSafeInteger(checklistId) || checklistId < 1) return resposta({ sucesso: false, mensagem: "Checklist inválido." }, 400);
    const checklist = await env.DB.prepare("SELECT checklist_id,status FROM checklists WHERE checklist_id=? AND event_id=?").bind(checklistId, evento).first();
    if (!checklist) return resposta({ sucesso: false, mensagem: "Checklist não encontrado neste evento." }, 404);
    const r = await env.DB.prepare(`
      SELECT checklist_item_id,checklist_id,description,active,created_at,updated_at,inactivated_by,inactivated_at
      FROM checklist_items WHERE checklist_id=? ORDER BY checklist_item_id
    `).bind(checklistId).all();
    return resposta({ sucesso: true, dados: { itens: r.results || [] } });
  }

  if (action === "status") {
    const checklistId = Number(body.checklist_id);
    const status = String(body.status || "");
    if (!Number.isSafeInteger(checklistId) || checklistId < 1 || !["active","archived"].includes(status)) return resposta({ sucesso: false, mensagem: "Dados de status inválidos." }, 400);
    const current = await env.DB.prepare("SELECT checklist_id,status FROM checklists WHERE checklist_id=? AND event_id=?").bind(checklistId,evento).first();
    if (!current) return resposta({ sucesso: false, mensagem: "Checklist não encontrado neste evento." }, 404);
    await env.DB.prepare(`
      UPDATE checklists SET status=?,updated_by=?,updated_at=CURRENT_TIMESTAMP,
        archived_at=CASE WHEN ?='archived' THEN CURRENT_TIMESTAMP ELSE NULL END
      WHERE checklist_id=? AND event_id=?
    `).bind(status,String(admin.id || ""),status,checklistId,evento).run();
    await registrarAuditoriaChecklist(checklistId,status === "archived" ? "checklist_archived" : "checklist_reactivated",status === "archived" ? "Checklist arquivado no Admin." : "Checklist reativado no Admin.");
    return resposta({ sucesso: true, mensagem: status === "archived" ? "Checklist arquivado." : "Checklist reativado.", dados: { checklist_id: checklistId, status } });
  }

  return resposta({ sucesso: false, mensagem: "Ação de checklist inválida." }, 400);
}



async function gerenciarExecucaoChecklist(request, env) {
  const body = await request.json().catch(() => ({}));
  const admin = await validarSessao(body.token, env);
  if (!admin) return resposta({ sucesso:false, mensagem:"Sessão inválida ou expirada. Entre novamente." }, 401);
  const checklistId = Number(body.checklist_id);
  if (!Number.isSafeInteger(checklistId) || checklistId < 1) return resposta({ sucesso:false, mensagem:"Checklist inválido." }, 400);
  const checklist = await env.DB.prepare(`
    SELECT c.checklist_id,c.event_id,c.title,c.description,c.status,e.name AS event_name
    FROM checklists c INNER JOIN events e ON e.id=c.event_id
    WHERE c.checklist_id=? LIMIT 1
  `).bind(checklistId).first();
  if (!checklist) return resposta({ sucesso:false, mensagem:"Checklist não encontrado." }, 404);
  if (!(await acessoEventoPermitido(admin, checklist.event_id, env))) return resposta({ sucesso:false, mensagem:"Você não possui acesso a este evento." }, 403);
  const action = String(body.action || "carregar");
  const actorId = String(admin.id);
  const actorName = String(admin.name || admin.email || "Usuário");
  const actorEmail = String(admin.email || "");
  const ensureItem = async (itemId) => {
    const id = Number(itemId);
    if (!Number.isSafeInteger(id) || id < 1) return null;
    return await env.DB.prepare(`SELECT checklist_item_id,checklist_id,description,active,execution_status,resolved_by,resolved_at FROM checklist_items WHERE checklist_item_id=? AND checklist_id=?`).bind(id, checklistId).first();
  };
  const audit = async (itemId, kind, details, previousStatus=null, newStatus=null) => {
    const r = await env.DB.prepare(`
      INSERT INTO checklist_history (checklist_id,checklist_item_id,event_id,actor_id,actor_name,actor_email,action,details,previous_status,new_status,created_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP)
    `).bind(checklistId,itemId,checklist.event_id,actorId,actorName,actorEmail,kind,details || "",previousStatus,newStatus).run();
    return Number(r.meta?.last_row_id || 0);
  };
  if (action === "carregar") {
    const items = await env.DB.prepare(`
      SELECT i.checklist_item_id,i.checklist_id,i.description,i.active,i.execution_status,i.resolved_by,i.resolved_at,
        (SELECT h.actor_name FROM checklist_history h WHERE h.checklist_item_id=i.checklist_item_id AND h.action='status_changed' AND h.new_status='resolved' ORDER BY h.history_id DESC LIMIT 1) AS resolved_by_name
      FROM checklist_items i WHERE i.checklist_id=? ORDER BY i.checklist_item_id
    `).bind(checklistId).all();
    const counts = await env.DB.prepare(`SELECT COUNT(*) AS total, SUM(CASE WHEN execution_status='resolved' THEN 1 ELSE 0 END) AS resolved, SUM(CASE WHEN execution_status='in_progress' THEN 1 ELSE 0 END) AS in_progress FROM checklist_items WHERE checklist_id=? AND active=1`).bind(checklistId).first();
    return resposta({sucesso:true,dados:{checklist,items:items.results||[],counts:counts||{}}});
  }
  if (checklist.status !== "active" && action !== "historico") return resposta({sucesso:false,mensagem:"Este checklist está arquivado e disponível somente para consulta."},409);
  if (action === "status") {
    const item = await ensureItem(body.checklist_item_id);
    const next = String(body.status || "");
    const allowed = ["pending","in_progress","resolved"];
    if (!item || Number(item.active)!==1) return resposta({sucesso:false,mensagem:"Item não encontrado ou inativo."},404);
    if (!allowed.includes(next)) return resposta({sucesso:false,mensagem:"Status inválido."},400);
    const previous = String(item.execution_status || "pending");
    const justification = String(body.justification || "").trim();
    if (previous === "resolved" && next !== "resolved" && justification.length < 5) return resposta({sucesso:false,mensagem:"Informe uma justificativa com pelo menos 5 caracteres para reabrir o item."},400);
    if (previous === next) return resposta({sucesso:true,mensagem:"O item já está neste status."});
    const updated = await env.DB.prepare(`UPDATE checklist_items SET execution_status=?,resolved_by=?,resolved_at=CASE WHEN ?='resolved' THEN CURRENT_TIMESTAMP ELSE NULL END,updated_by=?,updated_at=CURRENT_TIMESTAMP WHERE checklist_item_id=? AND checklist_id=? AND execution_status=?`).bind(next,next==='resolved'?actorId:null,next,actorId,item.checklist_item_id,checklistId,previous).run();
    if (!updated.meta?.changes) return resposta({sucesso:false,mensagem:"Este item foi atualizado por outra pessoa agora. Atualize a página e tente novamente."},409);
    const detail = next==='resolved' ? "Item marcado como resolvido." : (previous==='resolved' ? `Item reaberto. Justificativa: ${justification}` : `Status alterado de ${previous} para ${next}.`);
    await audit(item.checklist_item_id,"status_changed",detail,previous,next);
    return resposta({sucesso:true,mensagem:"Status atualizado."});
  }
  if (action === "observar") {
    const item = await ensureItem(body.checklist_item_id);
    const note = String(body.observation || "").trim();
    if (!item || Number(item.active)!==1) return resposta({sucesso:false,mensagem:"Item não encontrado ou inativo."},404);
    if (!note || note.length>3000) return resposta({sucesso:false,mensagem:"A observação é obrigatória e deve ter até 3.000 caracteres."},400);
    await audit(item.checklist_item_id,"observation_added",note);
    return resposta({sucesso:true,mensagem:"Observação registrada."});
  }
  if (action === "historico") {
    const item = await ensureItem(body.checklist_item_id);
    if (!item) return resposta({sucesso:false,mensagem:"Item não encontrado."},404);
    const [history,attachments] = await Promise.all([
      env.DB.prepare(`SELECT history_id,actor_name,actor_email,action,details,previous_status,new_status,created_at FROM checklist_history WHERE checklist_item_id=? ORDER BY history_id DESC LIMIT 200`).bind(item.checklist_item_id).all(),
      env.DB.prepare(`SELECT attachment_id,checklist_item_id,file_name,mime_type,file_size,uploaded_by_name,created_at FROM checklist_attachments WHERE checklist_item_id=? ORDER BY attachment_id DESC`).bind(item.checklist_item_id).all()
    ]);
    return resposta({sucesso:true,dados:{history:history.results||[],attachments:attachments.results||[]}});
  }
  if (action === "upload") {
    const item = await ensureItem(body.checklist_item_id);
    if (!item || Number(item.active)!==1) return resposta({sucesso:false,mensagem:"Item não encontrado ou inativo."},404);
    if (!env.GAS_WEBAPP_URL || !env.GAS_UPLOAD_SECRET) return resposta({sucesso:false,mensagem:"Integração segura com Google Drive não configurada no Worker. Confira GAS_WEBAPP_URL e GAS_UPLOAD_SECRET."},503);
    const fileName = String(body.file_name || "anexo").replace(/[\\/\r\n\0]/g,"_").slice(0,180);
    const mime = String(body.mime_type || "application/octet-stream").toLowerCase();
    const base64 = String(body.file_base64 || "");
    const allowedMimes = ["application/pdf","image/jpeg","image/png"];
    if (!allowedMimes.includes(mime)) return resposta({sucesso:false,mensagem:"Formato não permitido. Envie PDF, JPG ou PNG."},400);
    if (!base64 || base64.length > 7_000_000) return resposta({sucesso:false,mensagem:"Arquivo vazio ou maior que 5 MB."},400);
    let bytes;
    try { const binary=atob(base64); bytes=Uint8Array.from(binary,ch=>ch.charCodeAt(0)); } catch { return resposta({sucesso:false,mensagem:"Arquivo inválido."},400); }
    if (!bytes.length || bytes.length > 5*1024*1024) return resposta({sucesso:false,mensagem:"O anexo deve ter no máximo 5 MB."},400);
    const startsWith = (signature) => signature.every((value,index)=>bytes[index]===value);
    const validSignature = mime === "application/pdf" ? startsWith([0x25,0x50,0x44,0x46,0x2D]) : mime === "image/jpeg" ? startsWith([0xFF,0xD8,0xFF]) : startsWith([0x89,0x50,0x4E,0x47,0x0D,0x0A,0x1A,0x0A]);
    if (!validSignature) return resposta({sucesso:false,mensagem:"O conteúdo do arquivo não corresponde ao formato informado."},400);
    const payload = {action:"uploadChecklistAttachmentWorker",internalSecret:env.GAS_UPLOAD_SECRET,eventId:checklist.event_id,checklistId,itemId:item.checklist_item_id,fileName,mimeType:mime,fileBase64:base64};
    let upstream, raw, result;
    try {
      upstream = await fetch(env.GAS_WEBAPP_URL,{method:"POST",headers:{"Content-Type":"text/plain;charset=utf-8"},body:JSON.stringify(payload),redirect:"follow"});
      raw = await upstream.text();
      try { result = JSON.parse(raw); } catch (_) { return resposta({sucesso:false,mensagem:"O Google Apps Script retornou uma resposta inválida ao enviar o anexo."},502); }
    } catch(error) {
      console.error("ERRO NO UPLOAD DO ANEXO DO CHECKLIST:",error?.message||String(error));
      return resposta({sucesso:false,mensagem:"Falha na comunicação com o Google Drive."},502);
    }
    if (!upstream.ok || !result.sucesso || !result.dados?.fileId) return resposta({sucesso:false,mensagem:result.mensagem||"Não foi possível salvar o anexo no Google Drive."},502);
    const attachmentId = crypto.randomUUID();
    // A coluna r2_key foi mantida para compatibilidade com a migração já aplicada; agora armazena drive:<fileId>.
    const storageRef = `drive:${result.dados.fileId}`;
    const historyId = await audit(item.checklist_item_id,"attachment_added",`Anexo adicionado: ${fileName}`);
    await env.DB.prepare(`INSERT INTO checklist_attachments (attachment_id,checklist_id,checklist_item_id,event_id,r2_key,file_name,mime_type,file_size,uploaded_by,uploaded_by_name,history_id,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP)`).bind(attachmentId,checklistId,item.checklist_item_id,checklist.event_id,storageRef,fileName,mime,bytes.length,actorId,actorName,historyId).run();
    return resposta({sucesso:true,mensagem:"Anexo enviado ao Google Drive.",dados:{attachment_id:attachmentId}});
  }
  return resposta({sucesso:false,mensagem:"Ação de checklist inválida."},400);
}

async function obterAnexoChecklist(request, env) {
  const body = await request.json().catch(()=>({}));
  const admin = await validarSessao(body.token,env);
  if (!admin) return resposta({sucesso:false,mensagem:"Sessão inválida ou expirada."},401);
  const id = String(body.attachment_id || "");
  const file = await env.DB.prepare(`SELECT a.*,c.status AS checklist_status FROM checklist_attachments a INNER JOIN checklists c ON c.checklist_id=a.checklist_id WHERE a.attachment_id=? LIMIT 1`).bind(id).first();
  if (!file) return resposta({sucesso:false,mensagem:"Anexo não encontrado."},404);
  if (!(await acessoEventoPermitido(admin,file.event_id,env))) return resposta({sucesso:false,mensagem:"Você não possui acesso a este evento."},403);
  const download = body.download === true;
  const storageRef = String(file.r2_key || "");
  if (storageRef.startsWith("drive:")) {
    if (!env.GAS_WEBAPP_URL || !env.GAS_UPLOAD_SECRET) return resposta({sucesso:false,mensagem:"Integração com Google Drive não configurada no Worker."},503);
    const fileId = storageRef.slice(6);
    try {
      const upstream = await fetch(env.GAS_WEBAPP_URL,{method:"POST",headers:{"Content-Type":"text/plain;charset=utf-8"},body:JSON.stringify({action:"getChecklistAttachmentWorker",internalSecret:env.GAS_UPLOAD_SECRET,fileId}),redirect:"follow"});
      const raw = await upstream.text(); let result;
      try { result = JSON.parse(raw); } catch (_) { return resposta({sucesso:false,mensagem:"O Google Apps Script retornou uma resposta inválida ao consultar o anexo."},502); }
      if (!upstream.ok || !result.sucesso || !result.dados?.base64) return resposta({sucesso:false,mensagem:result.mensagem||"Não foi possível obter o anexo no Google Drive."},502);
      const dados = result.dados, binary = atob(dados.base64), bytes = new Uint8Array(binary.length);
      for (let i=0;i<binary.length;i++) bytes[i]=binary.charCodeAt(i);
      const mime = String(dados.mimeType || file.mime_type || "application/octet-stream").toLowerCase();
      const safeName = String(dados.nome || file.file_name || "anexo").replace(/[\r\n\"\\]/g,"_");
      const inline = !download && (mime === "application/pdf" || mime.startsWith("image/"));
      const headers = new Headers(CORS_HEADERS);
      headers.set("Content-Type",mime);
      headers.set("Content-Length",String(bytes.length));
      headers.set("Content-Disposition",`${inline?"inline":"attachment"}; filename="${safeName}"; filename*=UTF-8''${encodeURIComponent(safeName)}`);
      headers.set("Cache-Control","private, no-store, max-age=0");
      headers.set("X-Content-Type-Options","nosniff");
      return new Response(bytes,{status:200,headers});
    } catch(error) {
      console.error("ERRO AO OBTER ANEXO DO CHECKLIST NO DRIVE:",error?.message||String(error));
      return resposta({sucesso:false,mensagem:"Falha na comunicação com o Google Drive."},502);
    }
  }
  // Compatibilidade com anexos antigos armazenados no R2, caso existam.
  if (!env.CHECKLIST_FILES || typeof env.CHECKLIST_FILES.get !== "function") return resposta({sucesso:false,mensagem:"Anexo antigo não encontrado no armazenamento configurado."},503);
  const object = await env.CHECKLIST_FILES.get(storageRef);
  if (!object) return resposta({sucesso:false,mensagem:"Arquivo não encontrado no armazenamento."},404);
  const safeName = String(file.file_name || "anexo").replace(/[\r\n\"]/g,"_").replace(/[^\x20-\x7E]/g,"_");
  return new Response(object.body,{status:200,headers:{...CORS_HEADERS,"Content-Type":file.mime_type || "application/octet-stream","Content-Length":String(file.file_size || object.size || 0),"Content-Disposition":`${download?'attachment':'inline'}; filename="${safeName}"`,"Cache-Control":"private, no-store"}});
}

async function gerenciarUsuarios(request, env) {
  const body = await request.json();
  const admin = await validarSessao(body.token, env);
  if (!admin) return resposta({ sucesso: false, mensagem: "Sessão inválida ou expirada." }, 401);
  if (Number(admin.is_superadmin || 0) !== 1) return resposta({ sucesso: false, mensagem: "Apenas o administrador principal pode gerenciar usuários." }, 403);

  const action = String(body.action || "listar");
  if (action === "listar") {
    const [usuarios, eventos] = await Promise.all([
      env.DB.prepare(`SELECT id, name, email, active, is_superadmin, created_at FROM admins ORDER BY name`).all(),
      env.DB.prepare(`SELECT id, name, type, active FROM events ORDER BY name`).all()
    ]);
    const acessos = await env.DB.prepare(`SELECT admin_id, event_id FROM admin_event_access`).all();
    const porUsuario = new Map();
    for (const item of (acessos.results || [])) {
      if (!porUsuario.has(item.admin_id)) porUsuario.set(item.admin_id, []);
      porUsuario.get(item.admin_id).push(item.event_id);
    }
    return resposta({ sucesso: true, dados: {
      usuarios: (usuarios.results || []).map(u => ({
        id: u.id, nome: u.name, email: u.email,
        ativo: Number(u.active) === 1 ? "SIM" : "NÃO",
        criadoEm: u.created_at || "",
        isSuperadmin: Number(u.is_superadmin || 0) === 1,
        eventos: Number(u.is_superadmin || 0) === 1 ? (eventos.results || []).map(e => e.id) : (porUsuario.get(u.id) || [])
      })),
      eventos: eventos.results || []
    }});
  }

  if (action === "criar") {
    const nome = String(body.nome || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    const senha = String(body.senha || "");
    const eventos = Array.isArray(body.eventos) ? [...new Set(body.eventos.map(x => String(x)))] : [];
    if (!nome || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return resposta({ sucesso: false, mensagem: "Informe um nome e um e-mail válido." }, 400);
    if (senha.length < 6) return resposta({ sucesso: false, mensagem: "A senha deve ter pelo menos 6 caracteres." }, 400);
    if (!eventos.length) return resposta({ sucesso: false, mensagem: "Selecione ao menos um evento para o usuário." }, 400);
    const existentes = await env.DB.prepare(`SELECT id FROM events WHERE id IN (${eventos.map(() => "?").join(",")}) AND active = 1`).bind(...eventos).all();
    if ((existentes.results || []).length !== eventos.length) return resposta({ sucesso: false, mensagem: "Um ou mais eventos selecionados não existem ou estão inativos." }, 400);
    const duplicado = await env.DB.prepare(`SELECT id FROM admins WHERE lower(email) = ? LIMIT 1`).bind(email).first();
    if (duplicado) return resposta({ sucesso: false, mensagem: "Já existe um usuário cadastrado com esse e-mail." }, 409);
    const id = crypto.randomUUID();
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const saltHex = bytesParaHex(salt);
    const hash = await gerarHashSenha(senha, salt);
    const statements = [env.DB.prepare(`INSERT INTO admins (id, name, email, password_hash, password_salt, active, is_superadmin, created_at) VALUES (?, ?, ?, ?, ?, 1, 0, CURRENT_TIMESTAMP)`).bind(id, nome, email, hash, saltHex)];
    for (const eventId of eventos) statements.push(env.DB.prepare(`INSERT INTO admin_event_access (admin_id, event_id) VALUES (?, ?)`).bind(id, eventId));
    await env.DB.batch(statements);
    return resposta({ sucesso: true, dados: { id } });
  }

  if (action === "alterarSenha") {
    const id = String(body.id || "");
    const senha = String(body.senha || "");
    const eventos = Array.isArray(body.eventos) ? [...new Set(body.eventos.map(x => String(x)))] : null;
    if (!id) return resposta({ sucesso: false, mensagem: "Usuário inválido." }, 400);
    if (senha && senha.length < 6) return resposta({ sucesso: false, mensagem: "A senha deve ter pelo menos 6 caracteres." }, 400);
    if (!eventos || !eventos.length) return resposta({ sucesso: false, mensagem: "Selecione ao menos um evento para o usuário." }, 400);
    const alvo = await env.DB.prepare(`SELECT id, is_superadmin FROM admins WHERE id = ?`).bind(id).first();
    if (!alvo) return resposta({ sucesso: false, mensagem: "Usuário não encontrado." }, 404);
    if (Number(alvo.is_superadmin || 0) === 1) return resposta({ sucesso: false, mensagem: "O acesso do administrador principal não pode ser alterado por este formulário." }, 403);
    const existentes = await env.DB.prepare(`SELECT id FROM events WHERE id IN (${eventos.map(() => "?").join(",")}) AND active = 1`).bind(...eventos).all();
    if ((existentes.results || []).length !== eventos.length) return resposta({ sucesso: false, mensagem: "Um ou mais eventos selecionados não existem ou estão inativos." }, 400);
    const statements = [
      env.DB.prepare(`DELETE FROM admin_event_access WHERE admin_id = ?`).bind(id),
      env.DB.prepare(`DELETE FROM sessions WHERE admin_id = ?`).bind(id)
    ];
    if (senha) {
      const salt = crypto.getRandomValues(new Uint8Array(16));
      const hash = await gerarHashSenha(senha, salt);
      statements.push(env.DB.prepare(`UPDATE admins SET password_hash = ?, password_salt = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).bind(hash, bytesParaHex(salt), id));
    }
    for (const eventId of eventos) statements.push(env.DB.prepare(`INSERT INTO admin_event_access (admin_id, event_id) VALUES (?, ?)`).bind(id, eventId));
    await env.DB.batch(statements);
    return resposta({ sucesso: true, dados: { atualizado: true, senhaAlterada: Boolean(senha), eventos } });
  }

  return resposta({ sucesso: false, mensagem: "Ação de usuário inválida." }, 400);
}


async function fazerLogout(request, env) {

  const body = await request.json();

  const token = body.token;



  if (token && typeof token === "string") {

    const tokenHash = await gerarHashToken(token);



    await env.DB.prepare(`

      DELETE FROM sessions WHERE token_hash = ?

    `).bind(tokenHash).run();

  }



  return resposta({

    sucesso: true,

    dados: { logout: true }

  });

}



async function verificarSessao(request, env) {

  const body = await request.json();

  const admin = await validarSessao(body.token, env);



  if (!admin) {

    return resposta({

      sucesso: false,

      mensagem: "Sessão inválida ou expirada."

    }, 401);

  }



  const eventosPermitidos = await obterEventosPermitidos(admin, env);
  return resposta({
    sucesso: true,
    dados: {
      administrador: {
        id: admin.id,
        nome: admin.name,
        email: admin.email,
        isSuperadmin: Number(admin.is_superadmin || 0) === 1,
        eventos: eventosPermitidos
      }
    }
  });

}








async function obterDashboard(request, env) {

  const body = await request.json();



  const admin = await validarSessao(body.token, env);



  if (!admin) {

    return resposta({

      sucesso: false,

      mensagem: "Sessão inválida ou expirada."

    }, 401);

  }



  const evento = String(body.evento || "MTB2026")

    .trim()

    .toUpperCase();



  if (!evento || evento.length > 100) {

    return resposta({

      sucesso: false,

      mensagem: "Evento inválido."

    }, 400);

  }



  const [indicadores, configuracao] = await Promise.all([

    env.DB.prepare(`

      SELECT

        COUNT(*) AS total,



        SUM(

          CASE

            WHEN UPPER(TRIM(payment_status)) = 'PENDENTE'

            THEN 1 ELSE 0

          END

        ) AS pagamento_pendente,



        SUM(

          CASE

            WHEN UPPER(TRIM(payment_status)) = 'PAGO'

            THEN 1 ELSE 0

          END

        ) AS pagamento_pago,



        SUM(

          CASE

            WHEN UPPER(TRIM(registration_status)) = 'PENDENTE'

            THEN 1 ELSE 0

          END

        ) AS inscricao_pendente,



        SUM(

          CASE

            WHEN UPPER(TRIM(registration_status)) = 'CONFIRMADO'

            THEN 1 ELSE 0

          END

        ) AS confirmados,



        SUM(

          CASE

            WHEN UPPER(TRIM(registration_status)) = 'CANCELADO'

            THEN 1 ELSE 0

          END

        ) AS cancelados,



        COALESCE(

          SUM(

            CASE

              WHEN UPPER(TRIM(payment_status)) = 'PAGO'

              THEN amount_cents ELSE 0

            END

          ), 0

        ) AS arrecadado_centavos,



        COALESCE(

          SUM(

            CASE

              WHEN UPPER(TRIM(payment_status)) = 'PENDENTE'

              THEN amount_cents ELSE 0

            END

          ), 0

        ) AS receber_centavos



      FROM registrations

      WHERE event_id = ?

    `).bind(evento).first(),



    env.DB.prepare(`

      SELECT setting_value

      FROM settings

      WHERE event_id = ?

        AND setting_key = 'ValorInscricao'

      LIMIT 1

    `).bind(evento).first()

  ]);



  let valorInscricao = Number(

    String(configuracao?.setting_value ?? "")

      .trim()

      .replace(",", ".")

  );



  if (!Number.isFinite(valorInscricao) || valorInscricao <= 0) {

    valorInscricao = VALOR_INSCRICAO_PADRAO;

  }



  const arrecadado =

    Number(indicadores.arrecadado_centavos || 0) / 100;



  const aReceber =

    Number(indicadores.receber_centavos || 0) / 100;



  return resposta({

    sucesso: true,

    dados: {

      totalInscritos: Number(indicadores.total || 0),



      pagamentos: {

        pendentes: Number(indicadores.pagamento_pendente || 0),

        pagos: Number(indicadores.pagamento_pago || 0)

      },



      inscricoes: {

        pendentes: Number(indicadores.inscricao_pendente || 0),

        confirmadas: Number(indicadores.confirmados || 0)

      },



      canceladas: Number(indicadores.cancelados || 0),



      financeiro: {

        valorInscricao,

        arrecadado,

        aReceber,

        totalPotencial: arrecadado + aReceber

      }

    }

  });

}










async function obterInscricoes(request, env) {

  try {

    const body = await request.json();



    const admin = await validarSessao(body.token, env);



    if (!admin) {

      return resposta({

        sucesso: false,

        mensagem: "Sessão inválida ou expirada."

      }, 401);

    }



    const evento = String(

      body.evento || "MTB2026"

    ).trim().toUpperCase();



    if (!evento || evento.length > 100) {

      return resposta({

        sucesso: false,

        mensagem: "Evento inválido."

      }, 400);

    }



    const resultado = await env.DB.prepare(`

      SELECT

        id,

        registration_number,

        plate_number,

        name,

        cpf,

        email,

        phone,

        category_name,

        payment_status,

        registration_status,

        amount_cents,

        created_at,

        notes,

        order_nsu,

        payment_method,

        transaction_nsu,

        payment_proof_key,

        payment_date,

        checkout_url,

        birth_date,

        state,

        city,

        pcd,

        team,

        event_id

      FROM registrations

      WHERE event_id = ?

      ORDER BY created_at DESC

    `)

      .bind(evento)

      .all();



    const inscricoes = (resultado.results || []).map(item => ({

      id: item.id,



      numeroInscricao: item.registration_number,
      numeroPlaca: item.plate_number == null ? "" : String(item.plate_number),

      nome: item.name,

      cpf: item.cpf,

      email: item.email,

      telefone: item.phone,



      categoria: item.category_name,



      pagamento: item.payment_status,

      statusInscricao: item.registration_status,



      valor: Number(item.amount_cents || 0) / 100,



      dataInscricao: item.created_at,

      observacao: item.notes || "",



      orderNsu: item.order_nsu || "",

      formaPagamento: item.payment_method || "",

      transactionNsu: item.transaction_nsu || "",



      receiptUrl: item.payment_proof_key || "",



      dataPagamento: item.payment_date || "",

      checkoutUrl: item.checkout_url || "",



      dataNascimento: item.birth_date || "",

      estado: item.state || "",

      cidade: item.city || "",

      pcd: item.pcd || "",

      equipe: item.team || "",



      evento: item.event_id

    }));



    return resposta({

      sucesso: true,

      dados: {

        inscricoes

      }

    });



  } catch (erro) {

    console.error(

      "ERRO AO CONSULTAR INSCRIÇÕES:",

      erro?.message || String(erro),

      erro?.stack || ""

    );



    return resposta({

      sucesso: false,

      mensagem: "Erro ao consultar inscrições."

    }, 500);

  }

}












/* =====================================================
   DETALHE DE INSCRIÇÃO
   ===================================================== */
async function uploadDocumentoInscricaoDrive(env, body, numero) {
  if (!env.GAS_WEBAPP_URL || !env.GAS_UPLOAD_SECRET) throw new Error("Integração segura com Google Drive não configurada no Worker.");
  const payload = {
    action: "uploadAnexoInscricaoWorker", internalSecret: env.GAS_UPLOAD_SECRET,
    evento: body.evento, numero, nome: body.nome, mimeType: body.mimeType,
    arquivoBase64: body.arquivoBase64, tipoDocumento: body.tipo,
    nomeAtleta: body.nomeAtleta, cpf: body.cpf
  };
  const upstream = await fetch(env.GAS_WEBAPP_URL, { method:"POST", headers:{"Content-Type":"text/plain;charset=utf-8"}, body:JSON.stringify(payload), redirect:"follow" });
  const raw = await upstream.text();
  let result; try { result = JSON.parse(raw); } catch (_) { throw new Error("O Google Apps Script retornou uma resposta inválida no envio do documento."); }
  if (!upstream.ok || !result.sucesso || !result.dados?.fileId) throw new Error(result.mensagem || "Não foi possível salvar o documento no Google Drive.");
  return result.dados;
}

async function cadastrarInscricaoD1(request, env) {
  const body = await request.json();
  const admin = await validarSessao(body.token, env);
  if (!admin) return resposta({ sucesso:false, mensagem:"Sessão inválida ou expirada. Faça login novamente." },401);
  const evento = String(body.evento || "MTB2026").trim().toUpperCase();
  const eventoExiste = await env.DB.prepare("SELECT id FROM events WHERE id=? LIMIT 1").bind(evento).first();
  if (!eventoExiste) return resposta({sucesso:false,mensagem:"Evento não encontrado ou não cadastrado no sistema."},400);
  const nome = String(body.nome || "").trim();
  const cpf = String(body.cpf || "").replace(/\D/g, "");
  const email = String(body.email || "").trim();
  const telefone = String(body.telefone || "").trim();
  const dataNascimento = String(body.dataNascimento || body.birth_date || "").trim();
  const cidade = String(body.cidade || body.city || "").trim();
  const estado = String(body.estado || body.state || "").trim().toUpperCase();
  const categoriaNome = String(body.categoria || "").trim();
  const observacaoOriginal = String(body.observacao || "").trim();
  const cortesia = body.cortesia === true || String(body.cortesia || "").toLowerCase() === "true";
  if (!nome || !email || !categoriaNome || cpf.length !== 11 || !/^\d{11}$/.test(cpf)) return resposta({sucesso:false,mensagem:"Preencha os dados obrigatórios e informe um CPF válido."},400);
  if (!validarCpfWorker(cpf)) return resposta({sucesso:false,mensagem:"CPF inválido. Informe um CPF válido com 11 dígitos."},400);
  const categoria = await env.DB.prepare(`SELECT id,name,required_documents,is_local FROM categories WHERE event_id=? AND active=1 AND lower(name)=lower(?) LIMIT 1`).bind(evento,categoriaNome).first();
  if (!categoria) return resposta({sucesso:false,mensagem:"Categoria não encontrada ou inativa para o evento selecionado."},404);
  const categoriaLocal = Number(categoria.is_local) === 1;
  const obrigatorios = documentosCategoria(categoria.required_documents);
  if (categoriaLocal && !obrigatorios.includes("COMPROVANTE_RESIDENCIA")) obrigatorios.push("COMPROVANTE_RESIDENCIA");
  let valor = 0;
  let loteAplicado = null;
  if (!cortesia) {
    const partesHoje = new Intl.DateTimeFormat("en-US", { timeZone: "America/Fortaleza", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
    const hojeFortaleza = `${partesHoje.find(p => p.type === "year").value}-${partesHoje.find(p => p.type === "month").value}-${partesHoje.find(p => p.type === "day").value}`;
    const lote = await env.DB.prepare(`SELECT id,name,general_amount_cents,local_amount_cents,amount_cents FROM batches WHERE event_id=? AND active=1 AND date(start_date)<=date(?) AND date(end_date)>=date(?) ORDER BY date(start_date) DESC, created_at DESC LIMIT 1`).bind(evento,hojeFortaleza,hojeFortaleza).first();
    if (!lote) return resposta({sucesso:false,mensagem:"Não existe lote ativo para este evento na data de hoje. Verifique a vigência dos lotes."},400);
    const valorCentavos = categoriaLocal
      ? Number(lote.local_amount_cents ?? lote.general_amount_cents ?? lote.amount_cents ?? 0)
      : Number(lote.general_amount_cents ?? lote.amount_cents ?? 0);
    if (!Number.isFinite(valorCentavos) || valorCentavos <= 0) return resposta({sucesso:false,mensagem:"O lote vigente não possui um valor válido para esta categoria."},400);
    valor = valorCentavos / 100;
    loteAplicado = { id: lote.id, nome: lote.name, tipoValor: categoriaLocal ? "local" : "geral" };
  }
  const documentos = Array.isArray(body.documentos) ? body.documentos : [];
  const porTipo = new Map(documentos.map(d => [String(d.tipo || "").trim().toUpperCase(), d]));
  for (const tipo of obrigatorios) {
    const doc = porTipo.get(tipo);
    if (!doc || !String(doc.arquivoBase64 || "").trim()) return resposta({sucesso:false,mensagem:`Anexe o documento obrigatório: ${tipo}.`},400);
  }
  const permitidos = new Set(["application/pdf","image/jpeg","image/png","image/webp"]);
  for (const doc of documentos) {
    const mime = String(doc.mimeType || "application/octet-stream").toLowerCase();
    const base64 = String(doc.arquivoBase64 || "");
    if (!obrigatorios.includes(String(doc.tipo || "").toUpperCase())) return resposta({sucesso:false,mensagem:"Foi enviado um tipo de documento não solicitado pela categoria."},400);
    if (!permitidos.has(mime) || base64.length > 7 * 1024 * 1024) return resposta({sucesso:false,mensagem:"Os documentos devem ser PDF, JPG, PNG ou WEBP, com até 5 MB cada."},400);
  }
  const duplicado = await env.DB.prepare(`SELECT id FROM registrations WHERE event_id=? AND (cpf_normalized=? OR REPLACE(REPLACE(REPLACE(cpf,'.',''),'-',''),' ','')=?) LIMIT 1`).bind(evento,cpf,cpf).first();
  if (duplicado) return resposta({sucesso:false,mensagem:"Já existe uma inscrição cadastrada para este CPF neste evento."},409);
  // A placa é sequencial por evento e é consumida no ato do cadastro.
  // UPDATE ... RETURNING garante números únicos mesmo com cadastros simultâneos.
  const placaAlocada = await env.DB.prepare(`UPDATE events SET last_plate_number = last_plate_number + 1 WHERE id = ? RETURNING last_plate_number`).bind(evento).first();
  if (!placaAlocada) return resposta({sucesso:false,mensagem:"Não foi possível reservar o número da placa para este evento."},500);
  const numeroPlaca = Number(placaAlocada.last_plate_number);
  const maximo = await env.DB.prepare(`SELECT MAX(CAST(registration_number AS INTEGER)) AS maior FROM registrations`).first();
  const numero = Number(maximo?.maior || 0) + 1;
  const id = `REG-${crypto.randomUUID().toUpperCase()}`;
  const pagamento = cortesia ? "PAGO" : "PENDENTE";
  const status = cortesia ? "CONFIRMADO" : "PENDENTE";
  const observacao = cortesia ? (observacaoOriginal ? `Cortesia | ${observacaoOriginal}` : "Cortesia") : observacaoOriginal;
  try {
    await env.DB.prepare(`INSERT INTO registrations (id,registration_number,plate_number,event_id,category_id,name,cpf,cpf_normalized,email,phone,birth_date,state,city,category_name,payment_status,registration_status,amount_cents,notes,created_by) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
      .bind(id,String(numero),numeroPlaca,evento,categoria.id,nome,body.cpf,cpf,email,telefone,dataNascimento || null,estado || null,cidade || null,categoria.name,pagamento,status,Math.round(valor*100),observacao,admin.email).run();
    const arquivos = [];
    for (const doc of documentos) {
      const salvo = await uploadDocumentoInscricaoDrive(env,{...doc,evento,nomeAtleta:nome,cpf},numero);
      await env.DB.prepare(`INSERT INTO registration_documents (id,registration_id,file_name,object_key,content_type) VALUES (?,?,?,?,?)`)
        .bind(`RDOC-${crypto.randomUUID().toUpperCase()}`,id,`${String(doc.tipo).toUpperCase()} - ${String(doc.nome || "documento")}`,`drive:${salvo.fileId}`,String(doc.mimeType || "application/octet-stream")).run();
      arquivos.push({nome:salvo.nome || doc.nome,fileId:salvo.fileId,mimeType:salvo.mimeType || doc.mimeType,viaWorker:true,tipo:doc.tipo});
    }
    // Só gera o checkout depois que todos os documentos obrigatórios foram salvos.
    let checkout = null;
    let erroCheckout = "";
    if (!cortesia) {
      try {
        checkout = await criarCheckoutInfinitePayWorker(env, {
          id, numero, evento, nome, email, telefone, valor, categoria: categoria.name
        });
        await env.DB.prepare("UPDATE registrations SET order_nsu=?, checkout_url=?, updated_at=CURRENT_TIMESTAMP WHERE id=? AND event_id=?")
          .bind(checkout.order_nsu, checkout.url, id, evento).run();
      } catch (e) {
        erroCheckout = e?.message || "Não foi possível gerar o checkout InfinitePay.";
        console.error("FALHA AO GERAR CHECKOUT:", erroCheckout);
      }
    }
    return resposta({sucesso:true,dados:{criado:true,id,numeroInscricao:numero,numeroPlaca,nome,cpf:body.cpf,email,telefone,categoria:categoria.name,categoriaLocal,lote:loteAplicado,pagamento,statusInscricao:status,valor,evento,arquivos,checkoutUrl:checkout?.url || "",orderNsu:checkout?.order_nsu || "",avisoCheckout:erroCheckout}});
  } catch (error) {
    try { await env.DB.prepare(`DELETE FROM registration_documents WHERE registration_id=?`).bind(id).run(); await env.DB.prepare(`DELETE FROM registrations WHERE id=? AND event_id=?`).bind(id,evento).run(); } catch (_) {}
    console.error("ERRO AO CADASTRAR INSCRIÇÃO D1:",error?.message || String(error));
    return resposta({sucesso:false,mensagem:error?.message || "Não foi possível cadastrar a inscrição."},500);
  }
}

async function criarCheckoutInfinitePayWorker(env, dados) {
  const handle = env.INFINITEPAY_HANDLE || "caioforte";
  const orderNsu = `${dados.evento}-${String(dados.numero).padStart(6,"0")}`;
  const isTrail = dados.evento.startsWith("TRAIL");
  const nomeEvento = isTrail ? "Itaitinga Trail Run" : "Itaitinga MTB Race";
  const redirectBase = isTrail
    ? (env.TRAIL_PAYMENT_URL || "https://itaitingatrailrun.pages.dev/pagamento.html")
    : (env.MTB_PAYMENT_URL || "https://itaitingamtbrace.pages.dev/pagamento.html");
  // A InfinitePay utiliza o objeto customer para pré-preencher os dados
  // do pagador na tela de checkout. Telefone é opcional: só enviamos quando
  // for possível normalizá-lo com segurança para o padrão internacional.
  const customer = {};
  const nomeCliente = String(dados.nome || "").trim();
  const emailCliente = String(dados.email || "").trim();
  const telefoneOriginal = String(dados.telefone || "").trim();
  const telefoneDigits = telefoneOriginal.replace(/\D/g, "");

  if (nomeCliente) customer.name = nomeCliente;
  if (emailCliente) customer.email = emailCliente;

  let telefoneCheckout = "";
  if (telefoneDigits.length === 10 || telefoneDigits.length === 11) {
    telefoneCheckout = `+55${telefoneDigits}`;
  } else if ((telefoneDigits.length === 12 || telefoneDigits.length === 13) && telefoneDigits.startsWith("55")) {
    telefoneCheckout = `+${telefoneDigits}`;
  } else if (telefoneOriginal.startsWith("+") && telefoneDigits.length >= 10 && telefoneDigits.length <= 15) {
    telefoneCheckout = `+${telefoneDigits}`;
  }
  if (telefoneCheckout) customer.phone_number = telefoneCheckout;

  const payload = {
    handle,
    order_nsu: orderNsu,
    items: [{ quantity: 1, price: Math.round(Number(dados.valor) * 100), description: `Inscrição ${nomeEvento} - ${dados.evento}` }],
    ...(Object.keys(customer).length ? { customer } : {}),
    webhook_url: `${new URL(env.WORKER_PUBLIC_URL || "https://itaitinga-mtb-api.caio-ti.workers.dev").origin}/webhooks/infinitepay`,
    redirect_url: `${redirectBase}?inscricao=${encodeURIComponent(dados.numero)}`
  };
  const resp = await fetch("https://api.checkout.infinitepay.io/links", {
    method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(payload)
  });
  const raw = await resp.text();
  let result; try { result = JSON.parse(raw); } catch (_) { throw new Error("Resposta inválida da InfinitePay."); }
  if (!resp.ok || !result.url) throw new Error(result.message || result.error || `InfinitePay não gerou o checkout (HTTP ${resp.status}).`);
  return {url:result.url, order_nsu:result.order_nsu || orderNsu};
}

async function gerarCheckoutInscricao(request, env) {
  const body = await request.json();
  const admin = await validarSessao(body.token, env);
  if (!admin) return resposta({sucesso:false,mensagem:"Sessão inválida ou expirada."},401);
  const evento = String(body.evento || "").trim().toUpperCase();
  const identificador = String(body.id || "").trim();
  const item = await env.DB.prepare("SELECT id,registration_number,event_id,name,email,phone,amount_cents,payment_status,checkout_url FROM registrations WHERE event_id=? AND (id=? OR registration_number=?) LIMIT 1")
    .bind(evento,identificador,identificador).first();
  if (!item) return resposta({sucesso:false,mensagem:"Inscrição não encontrada."},404);
  if (String(item.payment_status).toUpperCase() === "PAGO") return resposta({sucesso:false,mensagem:"Esta inscrição já está paga."},400);
  if (Number(item.amount_cents || 0) <= 0) return resposta({sucesso:false,mensagem:"Inscrições de cortesia ou sem valor não geram checkout."},400);
  if (item.checkout_url) return resposta({sucesso:true,dados:{checkoutUrl:item.checkout_url,orderNsu:item.order_nsu,reutilizado:true}});
  try {
    const checkout = await criarCheckoutInfinitePayWorker(env,{numero:item.registration_number,evento,nome:item.name,email:item.email,telefone:item.phone,valor:Number(item.amount_cents)/100});
    await env.DB.prepare("UPDATE registrations SET order_nsu=?,checkout_url=?,updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(checkout.order_nsu,checkout.url,item.id).run();
    return resposta({sucesso:true,dados:{checkoutUrl:checkout.url,orderNsu:checkout.order_nsu}});
  } catch(e) { return resposta({sucesso:false,mensagem:e?.message || "Falha ao gerar checkout."},502); }
}

async function processarWebhookInfinitePayWorker(request, env) {
  const body = await request.json();
  const orderNsu = String(body.order_nsu || "").trim();
  const transactionNsu = String(body.transaction_nsu || "").trim();
  if (!orderNsu || !transactionNsu || !body.invoice_slug) return resposta({sucesso:false,mensagem:"Webhook incompleto."},400);
  const item = await env.DB.prepare("SELECT * FROM registrations WHERE order_nsu=? LIMIT 1").bind(orderNsu).first();
  if (!item) return resposta({sucesso:false,mensagem:"Pedido não localizado."},404);
  const metodoRaw = String(body.capture_method || "").toLowerCase();
  const metodo = metodoRaw === "credit_card" ? "Cartão de crédito" : metodoRaw === "pix" ? "PIX" : metodoRaw;
  await env.DB.prepare("UPDATE registrations SET payment_status='PAGO',registration_status='CONFIRMADO',payment_method=?,transaction_nsu=?,payment_proof_key=?,payment_date=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP WHERE id=?")
    .bind(metodo,transactionNsu,String(body.receipt_url || ""),item.id).run();
  // O Apps Script permanece apenas como serviço de e-mail nesta etapa.
  // A tabela impede que webhooks repetidos enviem o mesmo e-mail mais de uma vez.
  try {
    await env.DB.prepare(`CREATE TABLE IF NOT EXISTS registration_email_notifications (order_nsu TEXT PRIMARY KEY, sent_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`).run();
    const reservaEmail = await env.DB.prepare(`INSERT OR IGNORE INTO registration_email_notifications (order_nsu) VALUES (?)`).bind(orderNsu).run();
    const reservado = Number(reservaEmail?.meta?.changes || 0) > 0;
    if (reservado && env.GAS_WEBAPP_URL && env.GAS_UPLOAD_SECRET) {
      const emailResp = await fetch(env.GAS_WEBAPP_URL,{method:"POST",headers:{"Content-Type":"text/plain;charset=utf-8"},body:JSON.stringify({action:"emailPagamentoConfirmadoWorker",internalSecret:env.GAS_UPLOAD_SECRET,dados:{numeroInscricao:item.registration_number,nome:item.name,email:item.email,categoria:item.category_name,valor:Number(item.amount_cents||0)/100,evento:item.event_id}}),redirect:"follow"});
      const emailRaw = await emailResp.text();
      let emailJson = {}; try { emailJson = JSON.parse(emailRaw); } catch (_) {}
      if (!emailResp.ok || emailJson.sucesso !== true) {
        await env.DB.prepare(`DELETE FROM registration_email_notifications WHERE order_nsu=?`).bind(orderNsu).run();
        console.error("Apps Script não confirmou o envio do e-mail:", emailRaw.slice(0,500));
      }
    }
  } catch(e) { console.error("Falha ao solicitar e-mail de confirmação:",e?.message || String(e)); }
  return resposta({sucesso:true,dados:{atualizado:true,order_nsu:orderNsu,transaction_nsu:transactionNsu}});
}

function validarCpfWorker(cpf) {
  if (!/^\d{11}$/.test(cpf) || /^(\d)\1{10}$/.test(cpf)) return false;
  let soma=0; for(let i=0;i<9;i++) soma+=Number(cpf[i])*(10-i);
  let resto=soma%11, d1=resto<2?0:11-resto; if(d1!==Number(cpf[9])) return false;
  soma=0; for(let i=0;i<10;i++) soma+=Number(cpf[i])*(11-i);
  resto=soma%11; let d2=resto<2?0:11-resto; return d2===Number(cpf[10]);
}

async function obterDetalheInscricao(request, env) {
  const body = await request.json();
  const admin = await validarSessao(body.token, env);
  if (!admin) return resposta({ sucesso: false, mensagem: "Sessão inválida ou expirada." }, 401);
  const evento = String(body.evento || "MTB2026").trim().toUpperCase();
  const identificador = String(body.id || "").trim();
  if (!identificador || !evento || evento.length > 100) {
    return resposta({ sucesso: false, mensagem: "Informe uma inscrição válida." }, 400);
  }
  const item = await env.DB.prepare(`
    SELECT id, registration_number, name, cpf, email, phone, category_name,
      payment_status, registration_status, amount_cents, created_at, notes,
      order_nsu, payment_method, transaction_nsu, payment_proof_key, payment_date, checkout_url,
      birth_date, state, city, pcd, team, event_id
    FROM registrations
    WHERE event_id = ? AND (registration_number = ? OR id = ?)
    LIMIT 1
  `).bind(evento, identificador, identificador).first();
  if (!item) return resposta({ sucesso: false, mensagem: "Inscrição não encontrada." }, 404);
  const docsResult = await env.DB.prepare(`SELECT file_name, object_key, content_type FROM registration_documents WHERE registration_id=? ORDER BY created_at`).bind(item.id).all();
  const arquivos = (docsResult.results || []).filter(d => String(d.object_key || "").startsWith("drive:")).map(d => ({ nome:d.file_name, fileId:String(d.object_key).slice(6), mimeType:d.content_type || "application/octet-stream", viaWorker:true }));
  return resposta({ sucesso: true, dados: {
    id: item.id, numeroInscricao: item.registration_number, nome: item.name,
    cpf: item.cpf || "", email: item.email || "", telefone: item.phone || "",
    categoria: item.category_name || "", pagamento: item.payment_status,
    statusInscricao: item.registration_status, valor: Number(item.amount_cents || 0) / 100,
    dataInscricao: item.created_at || "", observacao: item.notes || "",
    orderNsu: item.order_nsu || "", formaPagamento: item.payment_method || "",
    transactionNsu: item.transaction_nsu || "", receiptUrl: item.payment_proof_key || "", comprovanteUrl: item.payment_proof_key || "",
    dataPagamento: item.payment_date || "", checkoutUrl: item.checkout_url || "",
    dataNascimento: item.birth_date || "", estado: item.state || "", cidade: item.city || "",
    pcd: item.pcd || "", equipe: item.team || "", evento: item.event_id,
    arquivos, documentos: arquivos
  }});
}

/* =====================================================
   CATEGORIAS E LOTES - CADASTROS ADMINISTRATIVOS
   ===================================================== */

function catalogoAtivo(valor) {
  return valor === true || valor === 1 ||
    ["SIM", "TRUE", "1", "ATIVO"].includes(String(valor ?? "").trim().toUpperCase());
}

function documentosCategoria(valor) {
  const permitidos = new Set(["RG", "CPF", "CERTIDAO", "COMPROVANTE_RESIDENCIA"]);
  let itens = [];
  if (Array.isArray(valor)) itens = valor;
  else if (valor) {
    try {
      const parsed = JSON.parse(String(valor));
      itens = Array.isArray(parsed) ? parsed : String(valor).split("|");
    } catch {
      itens = String(valor).split("|");
    }
  }
  return [...new Set(itens.map(x => String(x || "").trim().toUpperCase()).filter(x => permitidos.has(x)))];
}

function dataCatalogo(valor) {
  const s = String(valor || "").trim();
  if (!s) return null;
  // Inputs datetime-local chegam como YYYY-MM-DDTHH:mm; manter como texto local.
  if (!/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}(?::\d{2})?)?$/.test(s)) {
    throw new Error("Data inválida.");
  }
  return s;
}

async function criarDespesaD1(request, env, body) {
  const admin = await validarSessao(body.token, env);
  if (!admin) return resposta({ sucesso: false, mensagem: "Sessão inválida ou expirada." }, 401);

  const evento = String(body.evento || "MTB2026").trim().toUpperCase();
  if (!["MTB2026", "TRAIL2026"].includes(evento)) {
    return resposta({ sucesso: false, mensagem: "Evento inválido." }, 400);
  }

  const nome = String(body.nome || "").trim();
  const fornecedorEmpresa = String(body.fornecedorEmpresa || "").trim();
  const responsavel = String(body.responsavel || "").trim();
  const contatoFornecedor = String(body.contatoFornecedor || "").trim();
  const observacao = String(body.observacao || "").trim();
  const valor = Number(body.valor);

  if (!nome) return resposta({ sucesso: false, mensagem: "Informe o nome da despesa." }, 400);
  if (!Number.isFinite(valor) || valor <= 0 || valor > 999999999) {
    return resposta({ sucesso: false, mensagem: "Informe um valor válido para a despesa." }, 400);
  }

  try {
    const eventoExiste = await env.DB.prepare("SELECT id FROM events WHERE id = ? LIMIT 1").bind(evento).first();
    if (!eventoExiste) return resposta({ sucesso: false, mensagem: "Evento não encontrado." }, 404);

    const id = crypto.randomUUID();
    const amountCents = Math.round(valor * 100);
    const inserida = await env.DB.prepare(`
      INSERT INTO expenses (
        id, event_id, expense_number, name, supplier_company,
        responsible, supplier_contact, amount_cents, status, notes
      )
      SELECT ?, ?, COALESCE(MAX(expense_number), 0) + 1, ?, ?, ?, ?, ?, 'PENDENTE', ?
      FROM expenses
      WHERE event_id = ?
      RETURNING expense_number
    `).bind(
      id, evento, nome, fornecedorEmpresa, responsavel,
      contatoFornecedor, amountCents, observacao, evento
    ).first();

    if (!inserida) throw new Error("O banco não retornou o número da despesa criada.");

    return resposta({
      sucesso: true,
      mensagem: "Despesa cadastrada com sucesso.",
      dados: {
        id,
        numero: Number(inserida.expense_number),
        evento,
        nome,
        valor: amountCents / 100,
        fornecedorEmpresa,
        responsavel,
        contatoFornecedor,
        observacao,
        status: "Pendente"
      }
    });
  } catch (erro) {
    console.error("ERRO AO CADASTRAR DESPESA:", erro?.message || String(erro));
    return resposta({ sucesso: false, mensagem: "Não foi possível cadastrar a despesa no D1." }, 500);
  }
}

async function editarDespesaD1(env, body) {
  const admin = await validarSessao(body.token, env);
  if (!admin) return resposta({ sucesso: false, mensagem: "Sessão inválida ou expirada." }, 401);

  const evento = String(body.evento || "MTB2026").trim().toUpperCase();
  const numero = Number(body.numero);
  const nome = String(body.nome || "").trim();
  const fornecedorEmpresa = String(body.fornecedorEmpresa || "").trim();
  const responsavel = String(body.responsavel || "").trim();
  const contatoFornecedor = String(body.contatoFornecedor || "").trim();
  const observacao = String(body.observacao || "").trim();
  const valor = Number(body.valor);

  if (!["MTB2026", "TRAIL2026"].includes(evento)) return resposta({ sucesso: false, mensagem: "Evento inválido." }, 400);
  if (!Number.isInteger(numero) || numero <= 0) return resposta({ sucesso: false, mensagem: "Número da despesa inválido." }, 400);
  if (!nome) return resposta({ sucesso: false, mensagem: "Informe o nome da despesa." }, 400);
  if (!Number.isFinite(valor) || valor <= 0 || valor > 999999999) return resposta({ sucesso: false, mensagem: "Informe um valor válido para a despesa." }, 400);

  try {
    const atual = await env.DB.prepare("SELECT id, status, amount_cents FROM expenses WHERE event_id = ? AND expense_number = ? LIMIT 1").bind(evento, numero).first();
    if (!atual) return resposta({ sucesso: false, mensagem: "Despesa não encontrada." }, 404);
    const pagamentos = await env.DB.prepare("SELECT COALESCE(SUM(amount_cents),0) AS total FROM expense_payments WHERE expense_id=?").bind(atual.id).first();
    const jaPago = Number(pagamentos.total||0) || (String(atual.status||"").toUpperCase()==="PAGO" ? Number(atual.amount_cents||0) : 0);
    if (Math.round(valor*100) < jaPago) return resposta({sucesso:false,mensagem:"O valor da despesa não pode ficar abaixo do total já pago."},400);

    await env.DB.prepare(`
      UPDATE expenses
      SET name = ?, supplier_company = ?, responsible = ?, supplier_contact = ?,
          amount_cents = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
      WHERE event_id = ? AND expense_number = ?
    `).bind(nome, fornecedorEmpresa, responsavel, contatoFornecedor, Math.round(valor * 100), observacao, evento, numero).run();

    return resposta({ sucesso: true, mensagem: "Despesa atualizada com sucesso.", dados: { numero, evento, nome, valor, fornecedorEmpresa, responsavel, contatoFornecedor, observacao } });
  } catch (erro) {
    console.error("ERRO AO EDITAR DESPESA:", erro?.message || String(erro));
    return resposta({ sucesso: false, mensagem: "Não foi possível atualizar a despesa no D1." }, 500);
  }
}

async function excluirDespesaD1(env, body) {
  const admin = await validarSessao(body.token, env);
  if (!admin) return resposta({ sucesso: false, mensagem: "Sessão inválida ou expirada." }, 401);

  const evento = String(body.evento || "MTB2026").trim().toUpperCase();
  const numero = Number(body.numero);
  if (!["MTB2026", "TRAIL2026"].includes(evento)) return resposta({ sucesso: false, mensagem: "Evento inválido." }, 400);
  if (!Number.isInteger(numero) || numero <= 0) return resposta({ sucesso: false, mensagem: "Número da despesa inválido." }, 400);

  try {
    const atual = await env.DB.prepare("SELECT id FROM expenses WHERE event_id = ? AND expense_number = ? LIMIT 1").bind(evento, numero).first();
    if (!atual) return resposta({ sucesso: false, mensagem: "Despesa não encontrada." }, 404);
    await env.DB.prepare("DELETE FROM expenses WHERE event_id = ? AND expense_number = ?").bind(evento, numero).run();
    return resposta({ sucesso: true, mensagem: "Despesa excluída com sucesso.", dados: { numero, evento } });
  } catch (erro) {
    console.error("ERRO AO EXCLUIR DESPESA:", erro?.message || String(erro));
    return resposta({ sucesso: false, mensagem: "Não foi possível excluir a despesa no D1." }, 500);
  }
}

async function listarDespesasD1(request, env, body = null) {
  body = body || await request.json();
  const admin = await validarSessao(body.token, env);
  if (!admin) return resposta({ sucesso: false, mensagem: "Sessão inválida ou expirada." }, 401);

  const evento = String(body.evento || "MTB2026").trim().toUpperCase();
  if (!evento || evento.length > 100) {
    return resposta({ sucesso: false, mensagem: "Evento inválido." }, 400);
  }

  const eventoExiste = await env.DB.prepare("SELECT id FROM events WHERE id = ? LIMIT 1").bind(evento).first();
  if (!eventoExiste) return resposta({ sucesso: false, mensagem: "Evento não encontrado." }, 404);

  try {
    const result = await env.DB.prepare(`
      SELECT id, expense_number, name, supplier_company, amount_cents,
             responsible, supplier_contact, status, due_date, payment_date, payment_method,
             payment_observation, notes, created_at,
             (SELECT COALESCE(SUM(ep.amount_cents),0) FROM expense_payments ep WHERE ep.expense_id=expenses.id) AS paid_cents
      FROM expenses
      WHERE event_id = ?
      ORDER BY expense_number DESC
    `).bind(evento).all();

    const despesas = await Promise.all((result.results || []).map(async item => {
      const historico = await env.DB.prepare(`
        SELECT p.id, p.amount_cents, p.payment_date, p.payment_method, p.observation, p.created_at
        FROM expense_payments p WHERE p.expense_id=? ORDER BY p.payment_date, p.created_at
      `).bind(item.id).all();
      const pagamentos = await Promise.all((historico.results||[]).map(async pay => {
        const anexos = await env.DB.prepare(`SELECT drive_file_id,file_name,description,drive_url,created_at FROM expense_payment_attachments WHERE payment_id=? ORDER BY created_at`).bind(pay.id).all();
        return { id:pay.id, valor:Number(pay.amount_cents||0)/100, data:pay.payment_date||"", forma:pay.payment_method||"", observacao:pay.observation||"", anexos:(anexos.results||[]).map(a=>({fileId:a.drive_file_id,nome:a.file_name,descricao:a.description,url:a.drive_url||"",criadoEm:a.created_at||""})) };
      }));
      const pago = Number(item.paid_cents||0) || (String(item.status||"").toUpperCase()==="PAGO" ? Number(item.amount_cents||0) : 0);
      return {
        id: item.id,
        numero: Number(item.expense_number || 0),
        evento,
        nome: item.name || "",
        valor: Number(item.amount_cents || 0) / 100,
        fornecedorEmpresa: item.supplier_company || "",
        responsavel: item.responsible || "",
        contatoFornecedor: item.supplier_contact || "",
        status: pago >= Number(item.amount_cents||0) && Number(item.amount_cents||0)>0 ? "Pago" : pago>0 ? "Parcialmente pago" : "Pendente",
        valorPago: pago/100,
        saldoRestante: Math.max(0,Number(item.amount_cents||0)-pago)/100,
        observacao: item.notes || "",
        criadoEm: item.created_at || "",
        dataPagamento: pagamentos.length ? pagamentos[pagamentos.length-1].data : item.payment_date || "",
        formaPagamento: pagamentos.length ? pagamentos[pagamentos.length-1].forma : item.payment_method || "",
        observacaoPagamento: pagamentos.length ? pagamentos[pagamentos.length-1].observacao : item.payment_observation || "",
        comprovantePagamento: "",
        pagamentos
      };
    }));

    return resposta({ sucesso: true, dados: { evento, despesas } });
  } catch (erro) {
    console.error("ERRO AO LISTAR DESPESAS:", erro?.message || String(erro));
    return resposta({ sucesso: false, mensagem: "Não foi possível consultar as despesas no D1." }, 500);
  }
}

async function obterArquivoDocumentoInscricao(request, env) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token") || "";
  const fileId = url.searchParams.get("fileId") || "";
  const evento = String(url.searchParams.get("evento") || "").toUpperCase();
  const admin = await validarSessao(token, env);
  if (!admin) return resposta({sucesso:false,mensagem:"Sessão inválida ou expirada."},401);
  if (!fileId || !evento) return resposta({sucesso:false,mensagem:"Documento inválido."},400);
  if (!(await acessoEventoPermitido(admin, evento, env))) return resposta({sucesso:false,mensagem:"Você não possui acesso a este evento."},403);
  const vinculo = await env.DB.prepare(`SELECT d.object_key FROM registration_documents d JOIN registrations r ON r.id=d.registration_id WHERE d.object_key=? AND r.event_id=? LIMIT 1`).bind(`drive:${fileId}`,evento).first();
  if (!vinculo) return resposta({sucesso:false,mensagem:"Documento não encontrado ou sem permissão."},404);
  if (!env.GAS_WEBAPP_URL || !env.GAS_UPLOAD_SECRET) return resposta({sucesso:false,mensagem:"Integração com Google Drive não configurada."},500);
  try {
    const upstream = await fetch(env.GAS_WEBAPP_URL,{method:"POST",headers:{"Content-Type":"text/plain;charset=utf-8"},body:JSON.stringify({action:"getExpenseFileWorker",internalSecret:env.GAS_UPLOAD_SECRET,fileId}),redirect:"follow"});
    const raw=await upstream.text(); let result; try{result=JSON.parse(raw);}catch(_){return resposta({sucesso:false,mensagem:"O Google Drive retornou uma resposta inválida."},502);}
    if(!upstream.ok||!result.sucesso||!result.dados?.base64) return resposta({sucesso:false,mensagem:result.mensagem||"Não foi possível obter o documento."},502);
    const dados=result.dados, binary=atob(dados.base64), bytes=new Uint8Array(binary.length); for(let i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);
    const mime=String(dados.mimeType||"application/octet-stream").toLowerCase(), inline=mime==="application/pdf"||mime.startsWith("image/"), nome=String(dados.nome||"documento").replace(/[\r\n"\\]/g,"_");
    const headers=new Headers(CORS_HEADERS); headers.set("Content-Type",mime); headers.set("Content-Disposition",`${inline?"inline":"attachment"}; filename="${nome}"; filename*=UTF-8''${encodeURIComponent(nome)}`); headers.set("Cache-Control","private, no-store, max-age=0"); headers.set("X-Content-Type-Options","nosniff");
    return new Response(bytes,{status:200,headers});
  } catch(error){ console.error("ERRO AO OBTER DOCUMENTO DA INSCRIÇÃO:",error?.message||String(error)); return resposta({sucesso:false,mensagem:"Falha ao carregar o documento do Google Drive."},502); }
}

async function gerenciarCatalogo(request, env) {
  const body = await request.json();
  const admin = await validarSessao(body.token, env);
  if (!admin) return resposta({ sucesso: false, mensagem: "Sessão inválida ou expirada." }, 401);

  const acao = String(body.action || "").trim();
  const evento = String(body.evento || "MTB2026").trim().toUpperCase();
  if (!evento || evento.length > 100) return resposta({ sucesso: false, mensagem: "Evento inválido." }, 400);

  const eventoExiste = await env.DB.prepare("SELECT id FROM events WHERE id = ? LIMIT 1").bind(evento).first();
  if (!eventoExiste) return resposta({ sucesso: false, mensagem: "Evento não encontrado." }, 404);

  try {
    if (acao === "adminCategorias" || acao === "listarCategorias") {
      const result = await env.DB.prepare(`
        SELECT id, name, max_age, required_documents, is_local, participation_type, composition, active, created_at
        FROM categories WHERE event_id = ? ORDER BY name COLLATE NOCASE
      `).bind(evento).all();
      const categorias = (result.results || []).map(x => ({
        id: x.id, nome: x.name, idadeMaxima: x.max_age == null ? null : Number(x.max_age),
        ativo: Number(x.active) === 1, local: Number(x.is_local) === 1,
        tipoParticipacao: x.participation_type || "INDIVIDUAL", composicao: x.composition || "LIVRE",
        criadoEm: x.created_at || "", evento,
        documentosObrigatorios: documentosCategoria(x.required_documents)
      }));
      return resposta({ sucesso: true, dados: { evento, categorias } });
    }

    if (acao === "lotes") {
      const result = await env.DB.prepare(`
        SELECT id, name, start_date, end_date, amount_cents,
               general_amount_cents, local_amount_cents, double_amount_cents, active, created_at
        FROM batches WHERE event_id = ? ORDER BY start_date, created_at
      `).bind(evento).all();
      const lotes = (result.results || []).map(x => ({
        id: x.id, nome: x.name, dataInicio: x.start_date || "", dataFim: x.end_date || "",
        valor: Number(x.general_amount_cents ?? x.amount_cents ?? 0) / 100,
        valorGeral: Number(x.general_amount_cents ?? x.amount_cents ?? 0) / 100,
        valorLocal: Number(x.local_amount_cents ?? x.general_amount_cents ?? x.amount_cents ?? 0) / 100,
        valorDupla: Number(x.double_amount_cents ?? x.general_amount_cents ?? x.amount_cents ?? 0) / 100,
        ativo: Number(x.active) === 1,
        criadoEm: x.created_at || "", evento
      }));
      return resposta({ sucesso: true, dados: { evento, lotes } });
    }

    if (acao === "criarCategoria" || acao === "editarCategoria") {
      const nome = String(body.nome || "").trim();
      const id = String(body.id || "").trim();
      const idadeRaw = body.idadeMaxima;
      const idade = idadeRaw === "" || idadeRaw == null ? null : Number(idadeRaw);
      const local = body.local === true || Number(body.local) === 1;
      const tipoParticipacao = String(body.tipoParticipacao || "INDIVIDUAL").toUpperCase();
      const composicao = String(body.composicao || "LIVRE").toUpperCase();
      const composicoesValidas = tipoParticipacao === "DUPLA" ? ["MASCULINA", "FEMININA", "MISTA"] : ["LIVRE", "MASCULINA", "FEMININA"];
      if (!["INDIVIDUAL", "DUPLA"].includes(tipoParticipacao) || !composicoesValidas.includes(composicao)) {
        return resposta({ sucesso: false, mensagem: "Tipo de participação ou composição inválida." }, 400);
      }
      const docs = documentosCategoria(body.documentosObrigatorios);
      if (local && !docs.includes("COMPROVANTE_RESIDENCIA")) docs.push("COMPROVANTE_RESIDENCIA");
      if (!nome) return resposta({ sucesso: false, mensagem: "Informe o nome da categoria." }, 400);
      if (idade !== null && (!Number.isFinite(idade) || idade <= 0 || idade > 120)) return resposta({ sucesso: false, mensagem: "Informe uma idade máxima válida." }, 400);
      const duplicada = await env.DB.prepare(`
        SELECT id FROM categories WHERE event_id = ? AND lower(name) = lower(?) AND (? = '' OR id <> ?) LIMIT 1
      `).bind(evento, nome, id, id).first();
      if (duplicada) return resposta({ sucesso: false, mensagem: "Já existe uma categoria com este nome neste evento." }, 409);
      if (acao === "criarCategoria") {
        const novoId = `CAT-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
        await env.DB.prepare(`INSERT INTO categories (id,event_id,name,max_age,required_documents,is_local,participation_type,composition,active) VALUES (?,?,?,?,?,?,?,?,1)`)
          .bind(novoId, evento, nome, idade, JSON.stringify(docs), local ? 1 : 0, tipoParticipacao, composicao).run();
        return resposta({ sucesso: true, dados: { criado: true, id: novoId, nome, idadeMaxima: idade, local, tipoParticipacao, composicao, ativo: true, evento, documentosObrigatorios: docs } });
      }
      if (!id) return resposta({ sucesso: false, mensagem: "Categoria não informada." }, 400);
      const result = await env.DB.prepare(`UPDATE categories SET name=?, max_age=?, required_documents=?, is_local=?, participation_type=?, composition=? WHERE id=? AND event_id=?`)
        .bind(nome, idade, JSON.stringify(docs), local ? 1 : 0, tipoParticipacao, composicao, id, evento).run();
      if (!result.meta?.changes) return resposta({ sucesso: false, mensagem: "Categoria não encontrada para o evento selecionado." }, 404);
      return resposta({ sucesso: true, dados: { atualizado: true, id, nome, idadeMaxima: idade, local, tipoParticipacao, composicao, evento, documentosObrigatorios: docs } });
    }

    if (acao === "alterarStatusCategoria" || acao === "alterarStatusLote") {
      const tabela = acao === "alterarStatusCategoria" ? "categories" : "batches";
      const id = String(body.id || "").trim();
      if (!id) return resposta({ sucesso: false, mensagem: "Registro não informado." }, 400);
      const ativo = catalogoAtivo(body.ativo) ? 1 : 0;
      const result = await env.DB.prepare(`UPDATE ${tabela} SET active=? WHERE id=? AND event_id=?`).bind(ativo, id, evento).run();
      if (!result.meta?.changes) return resposta({ sucesso: false, mensagem: "Registro não encontrado para o evento selecionado." }, 404);
      return resposta({ sucesso: true, dados: { atualizado: true, id, ativo: ativo === 1, evento } });
    }

    if (acao === "excluirCategoria" || acao === "excluirLote") {
      const tabela = acao === "excluirCategoria" ? "categories" : "batches";
      const id = String(body.id || "").trim();
      if (!id) return resposta({ sucesso: false, mensagem: "Registro não informado." }, 400);
      const result = await env.DB.prepare(`DELETE FROM ${tabela} WHERE id=? AND event_id=?`).bind(id, evento).run();
      if (!result.meta?.changes) return resposta({ sucesso: false, mensagem: "Registro não encontrado para o evento selecionado." }, 404);
      return resposta({ sucesso: true, dados: { excluido: true, id, evento } });
    }

    if (acao === "criarLote" || acao === "editarLote") {
      const nome = String(body.nome || "").trim();
      const id = String(body.id || "").trim();
      const inicio = dataCatalogo(body.dataInicio);
      const fim = dataCatalogo(body.dataFim);
      // Compatibilidade: chamadas antigas que enviam apenas "valor" usam o mesmo preço nos dois campos.
      const valorGeral = Number(body.valorGeral ?? body.valor);
      const valorLocal = Number(body.valorLocal ?? body.valorGeral ?? body.valor);
      const valorDupla = Number(body.valorDupla ?? body.valorGeral ?? body.valor);
      if (!nome) return resposta({ sucesso: false, mensagem: "Informe o nome do lote." }, 400);
      if (!inicio || !fim) return resposta({ sucesso: false, mensagem: "Informe a vigência do lote." }, 400);
      if (inicio > fim) return resposta({ sucesso: false, mensagem: "A data inicial não pode ser maior que a data final." }, 400);
      if (!Number.isFinite(valorGeral) || valorGeral <= 0) return resposta({ sucesso: false, mensagem: "Informe um valor válido para a inscrição geral." }, 400);
      if (!Number.isFinite(valorLocal) || valorLocal <= 0) return resposta({ sucesso: false, mensagem: "Informe um valor válido para a inscrição local." }, 400);
      if (!Number.isFinite(valorDupla) || valorDupla <= 0) return resposta({ sucesso: false, mensagem: "Informe um valor válido para a inscrição de dupla." }, 400);
      const geralCentavos = Math.round(valorGeral * 100);
      const localCentavos = Math.round(valorLocal * 100);
      const duplaCentavos = Math.round(valorDupla * 100);
      if (acao === "criarLote") {
        const novoId = `LOTE-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
        await env.DB.prepare(`INSERT INTO batches (id,event_id,name,start_date,end_date,amount_cents,general_amount_cents,local_amount_cents,double_amount_cents,active) VALUES (?,?,?,?,?,?,?,?,?,1)`)
          .bind(novoId, evento, nome, inicio, fim, geralCentavos, geralCentavos, localCentavos, duplaCentavos).run();
        return resposta({ sucesso: true, dados: { criado: true, id: novoId, nome, dataInicio: inicio, dataFim: fim, valor: valorGeral, valorGeral, valorLocal, valorDupla, ativo: true, evento } });
      }
      if (!id) return resposta({ sucesso: false, mensagem: "Lote não informado." }, 400);
      const result = await env.DB.prepare(`UPDATE batches SET name=?, start_date=?, end_date=?, amount_cents=?, general_amount_cents=?, local_amount_cents=?, double_amount_cents=? WHERE id=? AND event_id=?`)
        .bind(nome, inicio, fim, geralCentavos, geralCentavos, localCentavos, duplaCentavos, id, evento).run();
      if (!result.meta?.changes) return resposta({ sucesso: false, mensagem: "Lote não encontrado para o evento selecionado." }, 404);
      return resposta({ sucesso: true, dados: { atualizado: true, id, nome, dataInicio: inicio, dataFim: fim, valor: valorGeral, valorGeral, valorLocal, valorDupla, evento } });
    }

    return resposta({ sucesso: false, mensagem: "Ação de cadastro não reconhecida." }, 400);
  } catch (erro) {
    console.error("ERRO AO GERENCIAR CATEGORIAS/LOTES:", erro?.message || String(erro));
    const mensagem = String(erro?.message || "Erro ao salvar cadastro.");
    if (/FOREIGN KEY constraint failed/i.test(mensagem)) {
      return resposta({ sucesso: false, mensagem: "Não é possível excluir este registro porque ele está vinculado a inscrições." }, 409);
    }
    return resposta({ sucesso: false, mensagem }, 500);
  }
}




async function uploadAnexoDespesaViaDrive(env, body) {
  const admin = await validarSessao(body.token, env);
  if (!admin) return resposta({ sucesso:false, mensagem:"Sessão inválida ou expirada." },401);
  if (!env.GAS_WEBAPP_URL || !env.GAS_UPLOAD_SECRET) return resposta({ sucesso:false, mensagem:"Integração segura com Google Drive não configurada no Worker." },500);
  const payload = { action:"uploadAnexoDespesaWorker", internalSecret:env.GAS_UPLOAD_SECRET, evento:body.evento, numero:body.numero, nome:body.nome, mimeType:body.mimeType, arquivoBase64:body.arquivoBase64 };
  try {
    const upstream = await fetch(env.GAS_WEBAPP_URL, { method:"POST", headers:{"Content-Type":"text/plain;charset=utf-8"}, body:JSON.stringify(payload), redirect:"follow" });
    const raw = await upstream.text();
    let result;
    try { result = JSON.parse(raw); } catch (_) { return resposta({sucesso:false,mensagem:"O Google Apps Script retornou uma resposta inválida."},502); }
    if (!upstream.ok || !result.sucesso) return resposta({sucesso:false,mensagem:result.mensagem||"Não foi possível enviar o arquivo ao Google Drive."},502);
    return resposta({sucesso:true,dados:result.dados});
  } catch (error) {
    console.error("ERRO NO PROXY DE UPLOAD DRIVE:",error?.message||String(error));
    return resposta({sucesso:false,mensagem:"Falha na comunicação com o Google Drive."},502);
  }
}

async function obterArquivoAnexoDespesa(request, env) {
  const body = await request.json();
  const admin = await validarSessao(body.token, env);
  if (!admin) return resposta({ sucesso:false, mensagem:"Sessão inválida ou expirada." },401);

  const fileId = String(body.fileId || "").trim();
  const evento = String(body.evento || "").trim().toUpperCase();
  if (!fileId || !["MTB2026", "TRAIL2026"].includes(evento)) {
    return resposta({ sucesso:false, mensagem:"Comprovante inválido." },400);
  }

  // Autoriza somente arquivos realmente vinculados a uma parcela de despesa do evento.
  const vinculo = await env.DB.prepare(`
    SELECT a.drive_file_id
    FROM expense_payment_attachments a
    JOIN expense_payments p ON p.id=a.payment_id
    JOIN expenses e ON e.id=p.expense_id
    WHERE a.drive_file_id=? AND e.event_id=?
    LIMIT 1
  `).bind(fileId, evento).first();
  if (!vinculo) return resposta({ sucesso:false, mensagem:"Comprovante não encontrado ou sem permissão." },404);

  if (!env.GAS_WEBAPP_URL || !env.GAS_UPLOAD_SECRET) {
    return resposta({ sucesso:false, mensagem:"Integração com Google Drive não configurada." },500);
  }

  try {
    const upstream = await fetch(env.GAS_WEBAPP_URL, {
      method:"POST",
      headers:{"Content-Type":"text/plain;charset=utf-8"},
      body:JSON.stringify({action:"getExpenseFileWorker", internalSecret:env.GAS_UPLOAD_SECRET, fileId}),
      redirect:"follow"
    });
    const raw = await upstream.text();
    let result;
    try { result = JSON.parse(raw); } catch (_) {
      return resposta({sucesso:false,mensagem:"O Google Drive retornou uma resposta inválida."},502);
    }
    if (!upstream.ok || !result.sucesso || !result.dados?.base64) {
      return resposta({sucesso:false,mensagem:result.mensagem||"Não foi possível obter o comprovante."},502);
    }

    const dados = result.dados;
    const binary = atob(dados.base64);
    const bytes = new Uint8Array(binary.length);
    for (let i=0; i<binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const mime = String(dados.mimeType || "application/octet-stream").toLowerCase();
    const inline = mime === "application/pdf" || mime.startsWith("image/");
    const nome = String(dados.nome || "comprovante").replace(/[\r\n"\\]/g, "_");
    const headers = new Headers(CORS_HEADERS);
    headers.set("Content-Type", mime);
    headers.set("Content-Disposition", `${inline ? "inline" : "attachment"}; filename="${nome}"; filename*=UTF-8''${encodeURIComponent(nome)}`);
    headers.set("Cache-Control", "private, no-store, max-age=0");
    headers.set("X-Content-Type-Options", "nosniff");
    return new Response(bytes, {status:200, headers});
  } catch (error) {
    console.error("ERRO AO OBTER COMPROVANTE:", error?.message || String(error));
    return resposta({sucesso:false,mensagem:"Falha ao carregar o comprovante do Google Drive."},502);
  }
}

async function registrarPagamentoDespesa(env, body) {
  const admin = await validarSessao(body.token, env);
  if (!admin) return resposta({ sucesso:false, mensagem:"Sessão inválida ou expirada." },401);
  const evento=String(body.evento||"").trim().toUpperCase();
  const numero=Number(body.numero);
  const valor=Number(body.valor);
  const data=String(body.dataPagamento||"").trim();
  const forma=String(body.formaPagamento||"").trim();
  const observacao=String(body.observacaoPagamento||"").trim();
  if (!["MTB2026","TRAIL2026"].includes(evento) || !Number.isInteger(numero) || numero<1) return resposta({sucesso:false,mensagem:"Despesa inválida."},400);
  if (!Number.isFinite(valor)||valor<=0||valor>999999999) return resposta({sucesso:false,mensagem:"Informe um valor válido para a parcela."},400);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data) || !forma) return resposta({sucesso:false,mensagem:"Informe a data e a forma de pagamento."},400);
  try {
    const despesa=await env.DB.prepare(`SELECT id,amount_cents,status FROM expenses WHERE event_id=? AND expense_number=?`).bind(evento,numero).first();
    if(!despesa) return resposta({sucesso:false,mensagem:"Despesa não encontrada."},404);
    const soma=await env.DB.prepare(`SELECT COALESCE(SUM(amount_cents),0) AS total FROM expense_payments WHERE expense_id=?`).bind(despesa.id).first();
    const legado=String(despesa.status||"").toUpperCase()==="PAGO" && Number(soma.total||0)===0 ? Number(despesa.amount_cents||0) : 0;
    const pago=Number(soma.total||0)+legado;
    const parcela=Math.round(valor*100);
    const saldo=Number(despesa.amount_cents||0)-pago;
    if(parcela>saldo) return resposta({sucesso:false,mensagem:`O valor excede o saldo restante de R$ ${(Math.max(0,saldo)/100).toFixed(2).replace(".",",")}.`},400);
    const id=crypto.randomUUID();
    await env.DB.prepare(`INSERT INTO expense_payments (id,expense_id,amount_cents,payment_date,payment_method,observation,created_by) VALUES (?,?,?,?,?,?,?)`).bind(id,despesa.id,parcela,data,forma,observacao,admin.id||null).run();
    const totalPago=pago+parcela;
    const status=totalPago>=Number(despesa.amount_cents) ? "PAGO" : "PARCIAL";
    await env.DB.prepare(`UPDATE expenses SET status=?,payment_date=?,payment_method=?,payment_observation=?,updated_at=CURRENT_TIMESTAMP WHERE id=?`).bind(status,data,forma,observacao,despesa.id).run();
    return resposta({sucesso:true,dados:{paymentId:id,valor:parcela/100,totalPago:totalPago/100,saldoRestante:Math.max(0,Number(despesa.amount_cents)-totalPago)/100,status}});
  } catch(e) {
    console.error("ERRO AO REGISTRAR PAGAMENTO PARCIAL:",e?.message||String(e));
    return resposta({sucesso:false,mensagem:"Não foi possível registrar a parcela. Verifique se a atualização do banco foi aplicada."},500);
  }
}

async function vincularAnexoPagamento(env, body) {
  const admin=await validarSessao(body.token,env);
  if(!admin) return resposta({sucesso:false,mensagem:"Sessão inválida ou expirada."},401);
  const paymentId=String(body.paymentId||"").trim();
  const fileId=String(body.fileId||"").trim();
  const fileName=String(body.nome||"").trim();
  const description=String(body.descricao||"").trim();
  const url=String(body.url||"").trim();
  if(!paymentId||!fileId||!fileName||!description) return resposta({sucesso:false,mensagem:"Informe o arquivo e sua descrição."},400);
  try {
    const pagamento=await env.DB.prepare(`SELECT p.id FROM expense_payments p JOIN expenses e ON e.id=p.expense_id WHERE p.id=? AND e.event_id=?`).bind(paymentId,String(body.evento||"").toUpperCase()).first();
    if(!pagamento) return resposta({sucesso:false,mensagem:"Parcela não encontrada."},404);
    const id=crypto.randomUUID();
    await env.DB.prepare(`INSERT INTO expense_payment_attachments (id,payment_id,drive_file_id,file_name,description,drive_url) VALUES (?,?,?,?,?,?)`).bind(id,paymentId,fileId,fileName,description,url||null).run();
    return resposta({sucesso:true,dados:{id,paymentId,fileId,nome:fileName,descricao:description,url}});
  } catch(e) {
    console.error("ERRO AO VINCULAR ANEXO:",e?.message||String(e));
    return resposta({sucesso:false,mensagem:"Arquivo foi enviado ao Drive, mas não foi possível registrar sua descrição no banco."},500);
  }
}


async function uploadAnexoPatrocinioViaDrive(env, body) {
  const admin = await validarSessao(body.token, env);
  if (!admin) return resposta({sucesso:false,mensagem:"Sessão inválida ou expirada."},401);
  if (!env.GAS_WEBAPP_URL || !env.GAS_UPLOAD_SECRET) return resposta({sucesso:false,mensagem:"Integração segura com Google Drive não configurada no Worker."},500);
  const evento = String(body.evento || "").trim().toUpperCase();
  const nome = String(body.nome || "").trim();
  const mimeType = String(body.mimeType || "").trim().toLowerCase();
  const arquivoBase64 = String(body.arquivoBase64 || "").trim();
  if (!evento || !nome || !arquivoBase64) return resposta({sucesso:false,mensagem:"Informe o evento e o arquivo."},400);
  if (!["application/pdf","image/jpeg","image/png"].includes(mimeType)) return resposta({sucesso:false,mensagem:"Formato não permitido. Envie PDF, JPG ou PNG."},400);
  if (arquivoBase64.length > 7 * 1024 * 1024) return resposta({sucesso:false,mensagem:"Arquivo muito grande. O limite é de 5 MB."},400);
  const payload = {action:"uploadAnexoPatrocinioWorker",internalSecret:env.GAS_UPLOAD_SECRET,evento,nome,mimeType,arquivoBase64};
  try {
    const upstream = await fetch(env.GAS_WEBAPP_URL,{method:"POST",headers:{"Content-Type":"text/plain;charset=utf-8"},body:JSON.stringify(payload),redirect:"follow"});
    const raw = await upstream.text(); let result;
    try { result = JSON.parse(raw); } catch (_) { return resposta({sucesso:false,mensagem:"O Google Apps Script retornou uma resposta inválida."},502); }
    if (!upstream.ok || !result.sucesso) return resposta({sucesso:false,mensagem:result.mensagem||"Não foi possível enviar o comprovante ao Google Drive."},502);
    return resposta({sucesso:true,dados:result.dados});
  } catch(error) {
    console.error("ERRO NO UPLOAD DO COMPROVANTE DE PATROCÍNIO:",error?.message||String(error));
    return resposta({sucesso:false,mensagem:"Falha na comunicação com o Google Drive."},502);
  }
}


async function obterArquivoComprovantePatrocinio(request, env) {
  const body = await request.json().catch(() => ({}));
  const admin = await validarSessao(body.token, env);
  if (!admin) return resposta({sucesso:false,mensagem:"Sessão inválida ou expirada."},401);
  const evento = String(body.evento || "").trim().toUpperCase();
  const fileId = String(body.fileId || "").trim();
  if (!evento || !fileId) return resposta({sucesso:false,mensagem:"Comprovante inválido."},400);
  if (!(await acessoEventoPermitido(admin, evento, env))) {
    return resposta({sucesso:false,mensagem:"Você não possui acesso a este evento."},403);
  }
  const vinculo = await env.DB.prepare(`
    SELECT id FROM sponsorship_receipts
    WHERE proof_file_id=? AND event_id=? LIMIT 1
  `).bind(fileId,evento).first();
  if (!vinculo) return resposta({sucesso:false,mensagem:"Comprovante não encontrado ou sem permissão."},404);
  if (!env.GAS_WEBAPP_URL || !env.GAS_UPLOAD_SECRET) {
    return resposta({sucesso:false,mensagem:"Integração com Google Drive não configurada."},500);
  }
  try {
    const upstream = await fetch(env.GAS_WEBAPP_URL,{
      method:"POST",
      headers:{"Content-Type":"text/plain;charset=utf-8"},
      body:JSON.stringify({action:"getExpenseFileWorker",internalSecret:env.GAS_UPLOAD_SECRET,fileId}),
      redirect:"follow"
    });
    const raw = await upstream.text();
    let result;
    try { result = JSON.parse(raw); } catch (_) {
      return resposta({sucesso:false,mensagem:"O Google Drive retornou uma resposta inválida."},502);
    }
    if (!upstream.ok || !result.sucesso || !result.dados?.base64) {
      return resposta({sucesso:false,mensagem:result.mensagem||"Não foi possível obter o comprovante."},502);
    }
    const dados=result.dados;
    const binary=atob(dados.base64);
    const bytes=new Uint8Array(binary.length);
    for(let i=0;i<binary.length;i++) bytes[i]=binary.charCodeAt(i);
    const mime=String(dados.mimeType||"application/octet-stream").toLowerCase();
    const inline=mime==="application/pdf"||mime.startsWith("image/");
    const nome=String(dados.nome||"comprovante").replace(/[\r\n"\\]/g,"_");
    const headers=new Headers(CORS_HEADERS);
    headers.set("Content-Type",mime);
    headers.set("Content-Disposition",`${inline?"inline":"attachment"}; filename="${nome}"; filename*=UTF-8''${encodeURIComponent(nome)}`);
    headers.set("Cache-Control","private, no-store, max-age=0");
    headers.set("X-Content-Type-Options","nosniff");
    return new Response(bytes,{status:200,headers});
  } catch(error) {
    console.error("ERRO AO OBTER COMPROVANTE DE PATROCÍNIO:",error?.message||String(error));
    return resposta({sucesso:false,mensagem:"Falha ao carregar o comprovante do Google Drive."},502);
  }
}

async function gerenciarPatrocinios(request, env) {
  const body = await request.json();
  const admin = await validarSessao(body.token, env);
  if (!admin) return resposta({ sucesso: false, mensagem: "Sessão inválida ou expirada." }, 401);
  const evento = String(body.evento || "").trim().toUpperCase();
  if (!evento || evento.length > 100) return resposta({ sucesso: false, mensagem: "Evento inválido." }, 400);
  const existe = await env.DB.prepare("SELECT id FROM events WHERE id=? LIMIT 1").bind(evento).first();
  if (!existe) return resposta({ sucesso: false, mensagem: "Evento não encontrado." }, 404);
  try {
    if (body.action === "uploadAnexoPatrocinio") return await uploadAnexoPatrocinioViaDrive(env, body);
    if (body.action === "criarPatrocinio" || body.action === "editarPatrocinio") {
      const patrocinador = String(body.patrocinador || "").trim();
      const valor = Number(body.valor);
      const data = String(body.dataRecebimento || "").trim();
      const forma = String(body.formaPagamento || "").trim();
      const observacoes = String(body.observacoes || "").trim();
      const proofFileId = String(body.proofFileId || "").trim();
      const proofFileName = String(body.proofFileName || "").trim();
      const proofUrl = String(body.proofUrl || "").trim();
      if (!patrocinador || patrocinador.length > 150) return resposta({sucesso:false,mensagem:"Informe um nome de patrocinador válido."},400);
      if (!Number.isFinite(valor) || valor <= 0 || valor > 999999999) return resposta({sucesso:false,mensagem:"Informe um valor válido."},400);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(data) || Number.isNaN(Date.parse(data + "T00:00:00Z"))) return resposta({sucesso:false,mensagem:"Informe uma data válida."},400);
      if (!forma || forma.length > 40) return resposta({sucesso:false,mensagem:"Selecione a forma de pagamento."},400);
      const cents = Math.round(valor * 100);
      if (body.action === "criarPatrocinio") {
        const id = crypto.randomUUID();
        await env.DB.prepare(`INSERT INTO sponsorship_receipts (id,event_id,sponsor_name,amount_cents,received_date,payment_method,notes,created_by,proof_file_id,proof_file_name,proof_url) VALUES (?,?,?,?,?,?,?,?,?,?,?)`).bind(id,evento,patrocinador,cents,data,forma,observacoes,admin.id||null,proofFileId||null,proofFileName||null,proofUrl||null).run();
        return resposta({sucesso:true,mensagem:"Recebimento de patrocínio registrado.",dados:{id}});
      }
      const id = String(body.id || "");
      if (!id) return resposta({sucesso:false,mensagem:"Identificador do recebimento inválido."},400);
      const atual = await env.DB.prepare("SELECT id,proof_file_id,proof_file_name,proof_url FROM sponsorship_receipts WHERE id=? AND event_id=?").bind(id,evento).first();
      if (!atual) return resposta({sucesso:false,mensagem:"Recebimento não encontrado."},404);
      await env.DB.prepare(`UPDATE sponsorship_receipts SET sponsor_name=?,amount_cents=?,received_date=?,payment_method=?,notes=?,proof_file_id=?,proof_file_name=?,proof_url=?,updated_at=CURRENT_TIMESTAMP WHERE id=? AND event_id=?`).bind(patrocinador,cents,data,forma,observacoes,proofFileId||atual.proof_file_id,proofFileName||atual.proof_file_name,proofUrl||atual.proof_url,id,evento).run();
      return resposta({sucesso:true,mensagem:"Recebimento atualizado.",dados:{id}});
    }
    if (body.action === "excluirPatrocinio") {
      const id = String(body.id || "");
      if (!id) return resposta({sucesso:false,mensagem:"Identificador do recebimento inválido."},400);
      const result = await env.DB.prepare("DELETE FROM sponsorship_receipts WHERE id=? AND event_id=?").bind(id,evento).run();
      if (!Number(result.meta?.changes || 0)) return resposta({sucesso:false,mensagem:"Recebimento não encontrado."},404);
      return resposta({sucesso:true,mensagem:"Recebimento excluído.",dados:{id}});
    }
    const result = await env.DB.prepare(`SELECT id,sponsor_name,amount_cents,received_date,payment_method,notes,proof_file_id,proof_file_name,proof_url,created_at FROM sponsorship_receipts WHERE event_id=? ORDER BY received_date DESC,created_at DESC`).bind(evento).all();
    const patrocinios = (result.results || []).map(x => ({id:x.id,patrocinador:x.sponsor_name||"",valor:Number(x.amount_cents||0)/100,dataRecebimento:x.received_date||"",formaPagamento:x.payment_method||"",observacoes:x.notes||"",proofFileId:x.proof_file_id||"",proofFileName:x.proof_file_name||"",proofUrl:x.proof_url||"",criadoEm:x.created_at||""}));
    return resposta({sucesso:true,dados:{evento,patrocinios,totalRecebido:patrocinios.reduce((s,x)=>s+Math.round(x.valor*100),0)/100}});
  } catch (erro) {
    console.error("ERRO AO GERENCIAR PATROCÍNIOS:",erro?.message||String(erro));
    return resposta({sucesso:false,mensagem:"Não foi possível processar os patrocínios no D1."},500);
  }
}

export default {

  async fetch(request, env) {

    if (request.method === "OPTIONS") {

      return new Response(null, {

        status: 204,

        headers: CORS_HEADERS

      });

    }



    const url = new URL(request.url);



    try {

      if (url.pathname === "/health" && request.method === "GET") {

        const resultado = await env.DB.prepare(`

          SELECT COUNT(*) AS total FROM events

        `).first();



        return resposta({

          sucesso: true,

          mensagem: "API conectada ao Cloudflare D1",

          banco: "conectado",

          eventos_cadastrados: resultado.total

        });

      }



      if (url.pathname === "/admin/login" && request.method === "POST") {

        return await fazerLogin(request, env);

      }



      if (url.pathname === "/admin/logout" && request.method === "POST") {

        return await fazerLogout(request, env);

      }



      if (url.pathname === "/admin/me" && request.method === "POST") {

        return await verificarSessao(request, env);

      }

      if (url.pathname === "/admin/users" && request.method === "POST") {
        return await gerenciarUsuarios(request, env);
      }
      if (url.pathname === "/admin/checklists" && request.method === "POST") {
        const acessoNegado = await validarAcessoEventoRequisicao(request, env);
        if (acessoNegado) return acessoNegado;
        return await gerenciarChecklists(request, env);
      }
      if (url.pathname === "/checklist/api" && request.method === "POST") {
        return await gerenciarExecucaoChecklist(request, env);
      }
      if (url.pathname === "/checklist/file" && request.method === "POST") {
        return await obterAnexoChecklist(request, env);
      }

      if (url.pathname === "/admin/events" && request.method === "POST") {
        return await gerenciarEventos(request, env);
      }



      if (url.pathname === "/admin/dashboard" && request.method === "POST") {

        const acessoNegado = await validarAcessoEventoRequisicao(request, env);
        if (acessoNegado) return acessoNegado;
        return await obterDashboard(request, env);

      }



      if (url.pathname === "/admin/registrations" && request.method === "POST") {
        const acessoNegado = await validarAcessoEventoRequisicao(request, env);
        if (acessoNegado) return acessoNegado;
        const body = await request.clone().json();
        if (body.action === "cadastrarInscricao") return await cadastrarInscricaoD1(request, env);
        return await obterInscricoes(request, env);
      }

      if (url.pathname === "/admin/registration-file" && request.method === "GET") {
        return await obterArquivoDocumentoInscricao(request, env);
      }

      if (url.pathname === "/admin/registration-detail" && request.method === "POST") {
        const acessoNegado = await validarAcessoEventoRequisicao(request, env);
        if (acessoNegado) return acessoNegado;
        return await obterDetalheInscricao(request, env);
      }
      if (url.pathname === "/admin/registration-checkout" && request.method === "POST") {
        const acessoNegado = await validarAcessoEventoRequisicao(request, env);
        if (acessoNegado) return acessoNegado;
        return await gerarCheckoutInscricao(request, env);
      }
      if (url.pathname === "/webhooks/infinitepay" && request.method === "POST") {
        return await processarWebhookInfinitePayWorker(request, env);
      }

      if (url.pathname === "/admin/catalog" && request.method === "POST") {
        const acessoNegado = await validarAcessoEventoRequisicao(request, env);
        if (acessoNegado) return acessoNegado;
        return await gerenciarCatalogo(request, env);
      }


      if (url.pathname === "/admin/sponsorship-file" && request.method === "POST") {
        const acessoNegado = await validarAcessoEventoRequisicao(request, env);
        if (acessoNegado) return acessoNegado;
        return await obterArquivoComprovantePatrocinio(request, env);
      }

      if (url.pathname === "/admin/sponsorships" && request.method === "POST") {
        const acessoNegado = await validarAcessoEventoRequisicao(request, env);
        if (acessoNegado) return acessoNegado;
        return await gerenciarPatrocinios(request, env);
      }

      if (url.pathname === "/admin/expense-file" && request.method === "POST") {
        return await obterArquivoAnexoDespesa(request, env);
      }

      if (url.pathname === "/admin/expenses" && request.method === "POST") {
        const acessoNegado = await validarAcessoEventoRequisicao(request, env);
        if (acessoNegado) return acessoNegado;
        const body = await request.json();
        if (body.action === "criarDespesa") return await criarDespesaD1(request, env, body);
        if (body.action === "editarDespesa") return await editarDespesaD1(env, body);
        if (body.action === "excluirDespesa") return await excluirDespesaD1(env, body);
        if (body.action === "registrarPagamento") return await registrarPagamentoDespesa(env, body);
        if (body.action === "vincularAnexoPagamento") return await vincularAnexoPagamento(env, body);
        if (body.action === "uploadAnexoDespesa") return await uploadAnexoDespesaViaDrive(env, body);
        return await listarDespesasD1(null, env, body);
      }



      return resposta({

        sucesso: false,

        mensagem: "Rota não encontrada."

      }, 404);



    } catch (erro) {

      console.error(

        "ERRO NA API:",

        erro?.message || String(erro),

        erro?.stack || ""

      );



      return resposta({

        sucesso: false,

        mensagem: "Erro interno na API."

      }, 500);

    }

  }

};