const API_URL =
  "https://script.google.com/macros/s/AKfycbzBL3zWUZLpSDvR_Oomuk50_3YkfEWb_WlwhALZAO1d3BbXOvPAE64gHwZ8SiTVAyHf/exec";

// Alias de compatibilidade para rotinas públicas ainda ligadas ao Apps Script.
const GOOGLE_SCRIPT_URL = API_URL;
  
  const WORKER_API_URL =
  "https://itaitinga-mtb-api.caio-ti.workers.dev";

const SESSION_KEY = "mtbAdminSession";

/* =====================================================
   EVENTO ATUAL
   ===================================================== */

const EVENTO_KEY = "adminEventoAtual";

let EVENTO_ATUAL =
  localStorage.getItem(EVENTO_KEY) ||
  "MTB2026";


function aplicarEventoSelecionado_() {
  const select =
    document.getElementById("eventoAtual");

  if (!select) return;

  EVENTO_ATUAL =
    String(
      localStorage.getItem(EVENTO_KEY) ||
      EVENTO_ATUAL ||
      "MTB2026"
    )
      .trim()
      .toUpperCase();

  select.value = EVENTO_ATUAL;
}


function nome_() {

  return EVENTO_ATUAL === "TRAIL2026"
    ? "Itaitinga Trail Run"
    : "Itaitinga MTB Race";
}
/* =====================================================
   ELEMENTOS
   ===================================================== */

const login =
  document.getElementById("login");

const app =
  document.getElementById("app");

const form =
  document.getElementById("loginForm");

const error =
  document.getElementById("error");

const email =
  document.getElementById("email");

const password =
  document.getElementById("password");


/* =====================================================
   NOTIFICAÇÕES V4
   ===================================================== */

function garantirContainerNotificacao() {

  let container =
    document.getElementById("mtbNotifications");

  if (container) {
    return container;
  }

  container =
    document.createElement("div");

  container.id =
    "mtbNotifications";

  Object.assign(
    container.style,
    {
      position: "fixed",
      top: "24px",
      right: "24px",
      zIndex: "99999",
      display: "flex",
      flexDirection: "column",
      gap: "10px",
      width: "min(390px, calc(100vw - 32px))",
      pointerEvents: "none"
    }
  );

  document.body.appendChild(container);

  return container;
}


function notificar(
  tipo,
  titulo,
  mensagem,
  tempo = 4500
) {

  const container =
    garantirContainerNotificacao();

  const notification =
    document.createElement("div");

  const sucesso =
    tipo === "success";

  const cor =
    sucesso
      ? "#a8ff00"
      : tipo === "warning"
        ? "#ffcf5c"
        : "#ff6b6b";

  const fundo =
    sucesso
      ? "#102006"
      : tipo === "warning"
        ? "#241b05"
        : "#260b0b";

  const icone =
    sucesso
      ? "✓"
      : tipo === "warning"
        ? "!"
        : "×";

  Object.assign(
    notification.style,
    {
      pointerEvents: "auto",
      background: fundo,
      border: `1px solid ${cor}`,
      borderLeft: `5px solid ${cor}`,
      color: "#f5f5f5",
      borderRadius: "10px",
      padding: "16px 18px",
      boxShadow: "0 12px 35px rgba(0,0,0,.35)",
      display: "flex",
      alignItems: "flex-start",
      gap: "12px",
      opacity: "0",
      transform: "translateX(30px)",
      transition: "opacity .25s ease, transform .25s ease",
      fontFamily: "inherit"
    }
  );

  notification.innerHTML = `
    <div style="
      width:28px;
      height:28px;
      min-width:28px;
      border-radius:50%;
      display:flex;
      align-items:center;
      justify-content:center;
      background:${cor};
      color:#111;
      font-weight:900;
      font-size:17px;
    ">${icone}</div>

    <div style="flex:1;min-width:0">
      <strong style="
        display:block;
        color:${cor};
        font-size:13px;
        letter-spacing:.4px;
        margin-bottom:4px;
      ">${esc(titulo)}</strong>

      <span style="
        color:#d5d5d5;
        font-size:13px;
        line-height:1.45;
      ">${esc(mensagem)}</span>
    </div>

    <button type="button" style="
      border:0;
      background:transparent;
      color:#aaa;
      cursor:pointer;
      font-size:20px;
      line-height:20px;
      padding:0;
    ">×</button>
  `;

  const close =
    notification.querySelector("button");

  const remover = () => {

    notification.style.opacity = "0";
    notification.style.transform =
      "translateX(30px)";

    setTimeout(
      () => notification.remove(),
      250
    );
  };

  close.onclick = remover;

  container.appendChild(notification);

  requestAnimationFrame(() => {

    notification.style.opacity = "1";
    notification.style.transform =
      "translateX(0)";
  });

  if (tempo > 0) {

    setTimeout(
      remover,
      tempo
    );
  }
}


/* =====================================================
   SENHA
   ===================================================== */

document
  .getElementById("showPass")
  .onclick = () => {

    password.type =
      password.type === "password"
        ? "text"
        : "password";

    document
      .getElementById("showPass")
      .textContent =
        password.type === "password"
          ? "Mostrar"
          : "Ocultar";
  };


/* =====================================================
   SESSÃO
   ===================================================== */

const getSession = () => {

  try {

    return JSON.parse(
      sessionStorage.getItem(
        SESSION_KEY
      ) || "null"
    );

  } catch (e) {

    return null;
  }
};


const setSession = x =>
  sessionStorage.setItem(
    SESSION_KEY,
    JSON.stringify(x)
  );


const clearSession = () =>
  sessionStorage.removeItem(
    SESSION_KEY
  );


/* =====================================================
   API
   ===================================================== */

async function apiPost(
  action,
  payload = {}
) {
	 if (action === "login") {
    const r = await fetch(
      `${WORKER_API_URL}/admin/login`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      }
    );

    const j = await r.json();

    if (!r.ok || !j.sucesso) {
      throw Error(j.mensagem || "Falha no login.");
    }

    return j.dados;
  }
	if (action === "logout") {
    const r = await fetch(
      `${WORKER_API_URL}/admin/logout`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      }
    );

    const j = await r.json();

    if (!r.ok || !j.sucesso) {
      throw Error(j.mensagem || "Falha no logout.");
    }

    return j.dados;
  }

  if (action === "cadastrarInscricao") {
    const r = await fetch(`${WORKER_API_URL}/admin/registrations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...payload })
    });
    const j = await r.json();
    if (!r.ok || !j.sucesso) throw Error(j.mensagem || "Não foi possível cadastrar a inscrição.");
    return j.dados;
  }

  if (["criarChecklist", "alterarChecklist", "statusChecklist"].includes(action)) {
    const acoes = { criarChecklist: "criar", alterarChecklist: "alterar", statusChecklist: "status" };
    const r = await fetch(`${WORKER_API_URL}/admin/checklists`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: acoes[action], ...payload })
    });
    const j = await r.json();
    if (!r.ok || !j.sucesso) throw Error(j.mensagem || "Não foi possível salvar o checklist.");
    return j.dados;
  }

  if (["criarPatrocinio", "editarPatrocinio", "excluirPatrocinio", "uploadAnexoPatrocinio"].includes(action)) {
    const r = await fetch(`${WORKER_API_URL}/admin/sponsorships`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...payload })
    });
    const j = await r.json();
    if (!r.ok || !j.sucesso) throw Error(j.mensagem || "Não foi possível salvar o patrocínio.");
    return j.dados;
  }

  if (["criarDespesa", "editarDespesa", "excluirDespesa", "registrarPagamento", "vincularAnexoPagamento", "uploadAnexoDespesa"].includes(action)) {
    const r = await fetch(`${WORKER_API_URL}/admin/expenses`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...payload })
    });
    const j = await r.json();
    if (!r.ok || !j.sucesso) throw Error(j.mensagem || "Não foi possível salvar a despesa.");
    return j.dados;
  }

  if (["criarEvento", "alterarEvento", "statusEvento"].includes(action)) {
    const acoes = { criarEvento: "criar", alterarEvento: "alterar", statusEvento: "status" };
    const r = await fetch(`${WORKER_API_URL}/admin/events`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: acoes[action], ...payload }) });
    const j = await r.json();
    if (!r.ok || !j.sucesso) throw Error(j.mensagem || "Não foi possível salvar o evento.");
    return j.dados;
  }

  // Gerenciamento de usuários migrado para Cloudflare Worker/D1.
  // Não enviar estas ações ao Google Apps Script: o token de sessão é do Worker.
  const userActions = {
    criarUsuario: "criar",
    alterarSenhaUsuario: "alterarSenha"
  };
  if (Object.prototype.hasOwnProperty.call(userActions, action)) {
    const r = await fetch(`${WORKER_API_URL}/admin/users`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: userActions[action], ...payload })
    });
    const j = await r.json();
    if (!r.ok || !j.sucesso) {
      throw Error(j.mensagem || "Não foi possível salvar o usuário.");
    }
    return j.dados;
  }

  const catalogActions = [
    "criarCategoria", "editarCategoria", "excluirCategoria", "alterarStatusCategoria",
    "criarLote", "editarLote", "excluirLote", "alterarStatusLote"
  ];
  if (catalogActions.includes(action)) {
    const r = await fetch(`${WORKER_API_URL}/admin/catalog`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...payload })
    });
    const j = await r.json();
    if (!r.ok || !j.sucesso) throw Error(j.mensagem || "Não foi possível salvar o cadastro.");
    return j.dados;
  }

  const r =
    await fetch(
      API_URL,
      {
        method: "POST",

        headers: {
          "Content-Type":
            "text/plain;charset=utf-8"
        },

        body: JSON.stringify({
          action,
          ...payload
        })
      }
    );

  if (!r.ok) {

    throw Error(
      "Não foi possível comunicar com o servidor."
    );
  }

  const j =
    await r.json();

  if (!j.sucesso) {

    throw Error(
      j.mensagem ||
      "Ocorreu um erro."
    );
  }

  return j.dados;
}


async function gerarCheckoutInscricao_(id, evento) {
  try {
    const sessao = getSession() || {};
    const r = await fetch(`${WORKER_API_URL}/admin/registration-checkout`, {method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({id,evento,token:sessao.token})});
    const j = await r.json();
    if (!r.ok || !j.sucesso) throw new Error(j.mensagem || "Não foi possível gerar o checkout.");
    const url = j.dados.checkoutUrl;
    const el = document.getElementById("dCheckoutUrl");
    if (el) el.innerHTML = `<a href="${esc(url)}" target="_blank" rel="noopener noreferrer">ABRIR CHECKOUT</a> <button type="button" class="action" onclick="copiarCheckoutInscricao_('${esc(url)}')">COPIAR LINK</button>`;
    notificar("success", "CHECKOUT GERADO", "O link de pagamento está disponível no detalhe da inscrição.");
  } catch(e) { notificar("error", "ERRO NO CHECKOUT", e.message || "Erro ao gerar checkout."); }
}

async function copiarCheckoutInscricao_(url) {
  try { await navigator.clipboard.writeText(url); notificar("success", "LINK COPIADO", "O link do checkout foi copiado."); }
  catch(_) { window.prompt("Copie o link do checkout:",url); }
}
window.gerarCheckoutInscricao_ = gerarCheckoutInscricao_;
window.copiarCheckoutInscricao_ = copiarCheckoutInscricao_;

async function apiGet(
  action,
  payload = {}
) {

  // Listagem de inscrições migrada para Cloudflare D1.
  // O token de login é emitido pelo Worker e não é válido no Apps Script.
  if (action === "inscricoes") {
    const r = await fetch(`${WORKER_API_URL}/admin/registrations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const j = await r.json();
    if (!r.ok || !j.sucesso) {
      throw Error(j.mensagem || "Não foi possível carregar as inscrições.");
    }
    return j.dados;
  }

  // Consulta individual de inscrição migrada para Cloudflare D1.
  if (action === "inscricao") {
    const r = await fetch(`${WORKER_API_URL}/admin/registration-detail`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const j = await r.json();
    if (!r.ok || !j.sucesso) {
      throw Error(j.mensagem || "Não foi possível consultar a inscrição.");
    }
    return j.dados;
  }

  if (action === "eventos") {
    const r = await fetch(`${WORKER_API_URL}/admin/events`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "listar", ...payload }) });
    const j = await r.json();
    if (!r.ok || !j.sucesso) throw Error(j.mensagem || "Não foi possível carregar os eventos.");
    return j.dados;
  }

  if (action === "usuarios") {
    const r = await fetch(`${WORKER_API_URL}/admin/users`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "listar", ...payload })
    });
    const j = await r.json();
    if (!r.ok || !j.sucesso) throw Error(j.mensagem || "Não foi possível carregar os usuários.");
    return j.dados;
  }

  if (action === "checklists" || action === "checklistItens") {
    const r = await fetch(`${WORKER_API_URL}/admin/checklists`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: action === "checklistItens" ? "itens" : "listar", ...payload })
    });
    const j = await r.json();
    if (!r.ok || !j.sucesso) throw Error(j.mensagem || "Não foi possível carregar os checklists.");
    return j.dados;
  }

  if (action === "patrocinios") {
    const r = await fetch(`${WORKER_API_URL}/admin/sponsorships`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const j = await r.json();
    if (!r.ok || !j.sucesso) throw Error(j.mensagem || "Não foi possível carregar os patrocínios.");
    return j.dados;
  }

  if (action === "despesas") {
    const r = await fetch(`${WORKER_API_URL}/admin/expenses`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const j = await r.json();
    if (!r.ok || !j.sucesso) throw Error(j.mensagem || "Não foi possível carregar as despesas.");
    return j.dados;
  }

  if (action === "adminCategorias" || action === "lotes") {
    const r = await fetch(`${WORKER_API_URL}/admin/catalog`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...payload })
    });
    const j = await r.json();
    if (!r.ok || !j.sucesso) throw Error(j.mensagem || "Não foi possível carregar os cadastros.");
    return j.dados;
  }

  const q =
    new URLSearchParams({
      action,
      ...payload
    });

  const r =
    await fetch(
      `${API_URL}?${q}`
    );

  if (!r.ok) {

    throw Error(
      "Não foi possível comunicar com o servidor."
    );
  }

  const j =
    await r.json();

  if (!j.sucesso) {

    throw Error(
      j.mensagem ||
      "Ocorreu um erro."
    );
  }

  return j.dados;
}


/* =====================================================
   LOGIN / APP
   ===================================================== */

function showApp(s) {
  login.hidden = true;
  app.hidden = false;

  document.getElementById("userEmail").textContent = s?.administrador?.email || "";
  const podeGerenciarUsuarios = s?.administrador?.isSuperadmin === true;
  const navUsuarios = document.querySelector('.nav[data-page="usuarios"]');
  if (navUsuarios) navUsuarios.style.display = podeGerenciarUsuarios ? "" : "none";
  const navEventos = document.querySelector('.nav[data-page="eventos"]');
  if (navEventos) navEventos.style.display = podeGerenciarUsuarios ? "" : "none";
  const paginaUsuarios = document.getElementById("usuarios");
  if (paginaUsuarios && !podeGerenciarUsuarios) paginaUsuarios.classList.remove("active");
  const paginaEventos = document.getElementById("eventos");
  if (paginaEventos && !podeGerenciarUsuarios) paginaEventos.classList.remove("active");

  const selectEvento = document.getElementById("eventoAtual");
  const eventosPermitidos = s?.administrador?.eventos || [];
  if (selectEvento && eventosPermitidos.length) {
    selectEvento.innerHTML = eventosPermitidos.map(ev =>
      `<option value="${escUser(ev.id)}">${escUser(ev.name)}</option>`
    ).join("");
    const salvo = String(localStorage.getItem(EVENTO_KEY) || "").toUpperCase();
    EVENTO_ATUAL = eventosPermitidos.some(ev => ev.id === salvo) ? salvo : eventosPermitidos[0].id;
    localStorage.setItem(EVENTO_KEY, EVENTO_ATUAL);
    selectEvento.value = EVENTO_ATUAL;
  }
  aplicarEventoSelecionado_();
}

document
  .getElementById("eventoAtual")
  ?.addEventListener(
    "change",
    async e => {

      EVENTO_ATUAL =
        String(
          e.target.value ||
          "MTB2026"
        )
          .trim()
          .toUpperCase();

      localStorage.setItem(
        EVENTO_KEY,
        EVENTO_ATUAL
      );

      const paginaAtiva =
        document.querySelector(".page.active");

      if (paginaAtiva?.id === "inscricoes") {
        await carregarInscricoes();
      }
      if (paginaAtiva?.id === "dashboard") {
  await carregarDashboard();
}
      if (paginaAtiva?.id === "pagamentos") {
  await carregarPagamentos();
}
if (paginaAtiva?.id === "despesas") {
  await carregarDespesas();
}
if (paginaAtiva?.id === "patrocinios") {
  await carregarPatrocinios_();
}
      if (paginaAtiva?.id === "checklists") {
        await carregarChecklistsAdmin_();
      }
      if (paginaAtiva?.id === "configuracoes") {
  await carregarConfiguracoes_();
}
      if (paginaAtiva?.id === "conteudo") {
  await carregarConteudoSite_();
}

      notificar(
        "success",
        "EVENTO ALTERADO",
        `Evento atual: ${nomeEventoAtual_()}`
      );

    }
  );
function showLogin() {

  app.hidden = true;
  login.hidden = false;
}


form.onsubmit =
  async e => {

    e.preventDefault();

    error.hidden = true;

    const b =
      form.querySelector(".primary");

    const old =
      b.innerHTML;

    b.disabled = true;
    b.innerHTML =
      "VALIDANDO...";

    try {

      const d =
        await apiPost(
          "login",
          {
            email:
              email.value.trim(),

            senha:
              password.value
          }
        );

      setSession(d);

      showApp(d);

      await carregarDashboard();
      await carregarConfiguracoes_();

    } catch (err) {

      error.textContent =
        err.message ||
        "E-mail ou senha inválidos.";

      error.hidden = false;

    } finally {

      b.disabled = false;
      b.innerHTML = old;
    }
  };


document
  .getElementById("logout")
  .onclick =
  async () => {

    const s =
      getSession();

    try {

      if (s?.token) {

        await apiPost(
          "logout",
          {
            token: s.token
          }
        );
      }

    } catch (e) {
    }

    clearSession();

    form.reset();

    showLogin();
  };


/* =====================================================
   NAVEGAÇÃO
   ===================================================== */

const titles = {

  dashboard:
    ["VISÃO GERAL", "Dashboard"],

  inscricoes:
    ["GESTÃO", "Inscrições"],

  pagamentos:
    ["FINANCEIRO", "Financeiro"],
	
	despesas: [
  "FINANCEIRO",
  "Despesas"
],

  patrocinios:
    ["FINANCEIRO", "Patrocínios"],

  checklists:
    ["ORGANIZAÇÃO DO EVENTO", "Checklists"],

  conteudo:
    ["SITE", "Conteúdo"],

  configuracoes:
    ["SISTEMA", "Configurações"],

  usuarios:
    ["ADMINISTRAÇÃO", "Usuários"],

  eventos:
    ["ADMINISTRAÇÃO", "Eventos"]
};

function go(
  page,
  filter
) {

  if (["usuarios", "eventos"].includes(page) && getSession()?.administrador?.isSuperadmin !== true) {
    notificar("error", "ACESSO RESTRITO", "Somente o administrador principal pode acessar esta área.");
    return;
  }

  document
    .querySelectorAll(".page")
    .forEach(
      x => x.classList.remove("active")
    );

  document
    .getElementById(page)
    .classList.add("active");

  document
    .querySelectorAll(".nav")
    .forEach(
      x =>
        x.classList.toggle(
          "active",
          x.dataset.page === page
        )
    );

  document
    .getElementById("eyebrow")
    .textContent =
      titles[page][0];

 document
  .getElementById("title")
  .textContent =
    titles[page][1];

if (
  filter &&
  document.getElementById("filter")
) {

  document
    .getElementById("filter")
    .value = filter;
}

if (page === "dashboard") {
  carregarDashboard();
}

if (page === "inscricoes") {
  carregarInscricoes();
}

if (page === "pagamentos") {
  carregarPagamentos();
}

if (page === "despesas") {
  carregarDespesas();
}
if (page === "patrocinios") {
  carregarPatrocinios_();
}

if (page === "checklists") {
  carregarChecklistsAdmin_();
}

if (page === "checklists") {
  carregarChecklistsAdmin_();
}

if (page === "conteudo") {
  carregarConteudoSite_();
}

if (page === "configuracoes") {
  carregarConfiguracoes_();
}

if (page === "usuarios") {
  carregarUsuarios();
}

if (page === "eventos") {
  carregarEventosAdmin_();
}

}


document
  .querySelectorAll(".nav")
  .forEach(
    b =>
      b.onclick =
        () => go(b.dataset.page)
  );


document
  .querySelectorAll(".stat")
  .forEach(
    b =>
      b.onclick =
        () =>
          go(
            "inscricoes",
            b.dataset.filter
          )
  );


document
  .querySelectorAll("[data-go]")
  .forEach(
    b =>
      b.onclick =
        () =>
          go(
            b.dataset.go,
            b.dataset.filter
          )
  );

  async function carregarConfiguracaoSitePublico_() {

  try {

    const url =
      GOOGLE_SCRIPT_URL +
      "?action=publicSiteConfig";

    const response =
      await fetch(url);

    const json =
      await response.json();

    if (!json.sucesso) {
      throw new Error(
        json.mensagem ||
        "Erro ao carregar informações."
      );
    }

    const dados =
      json.dados || {};


    function preencherTexto(id, valor) {

      const el =
        document.getElementById(id);

      if (
        el &&
        valor !== undefined &&
        valor !== null &&
        valor !== ""
      ) {

        el.textContent = valor;

      }

    }


    preencherTexto(
      "siteNomeEvento",
      dados.nomeEvento
    );

    preencherTexto(
      "siteModalidade",
      dados.modalidade
    );

    preencherTexto(
      "siteCidade",
      dados.cidade
    );

    preencherTexto(
      "siteEstado",
      dados.estado
    );

    preencherTexto(
      "siteDistancia",
      dados.distancia
    );

    preencherTexto(
      "siteAltimetria",
      dados.altimetria
    );

    preencherTexto(
      "siteHorario",
      dados.horario
    );


    if (dados.dataEvento) {

      const partes =
        dados.dataEvento.split("-");

      if (partes.length === 3) {

        const dataFormatada =
          `${partes[2]}/${partes[1]}/${partes[0]}`;

        preencherTexto(
          "siteDataEvento",
          dataFormatada
        );

      }

    }


  } catch (err) {

    console.warn(
      "Erro ao carregar configurações do site:",
      err
    );

  }

}


/* =====================================================
   CARREGAR CONFIGURAÇÕES DO SITE AO ABRIR A PÁGINA
   ===================================================== */

if (document.readyState === "loading") {

  document.addEventListener(
    "DOMContentLoaded",
    carregarConfiguracaoSitePublico_
  );

} else {

  carregarConfiguracaoSitePublico_();

}


/* =====================================================
   DASHBOARD
   ===================================================== */


async function carregarDashboard() {

  const s = getSession();

  if (!s?.token) {
    return;
  }

  try {

    const r = await fetch(
      `${WORKER_API_URL}/admin/dashboard`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          token: s.token,
          evento: EVENTO_ATUAL
        })
      }
    );

    const j = await r.json();

    if (!r.ok || !j.sucesso) {
      throw Error(
        j.mensagem ||
        "Não foi possível carregar o dashboard."
      );
    }

    atualizarDashboard(j.dados);

  } catch (e) {

    console.error(e);

    if (/sessão/i.test(e.message)) {

      clearSession();

      showLogin();

      error.textContent = e.message;
      error.hidden = false;

    } else {

      notificar(
        "error",
        "ERRO AO CARREGAR DASHBOARD",
        e.message
      );
    }
  }
}

function atualizarDashboard(d) {

  const vals = [

    d.totalInscritos || 0,

    d.pagamentos?.pendentes || 0,

    d.pagamentos?.pagos || 0,

    d.inscricoes?.pendentes || 0,

    d.inscricoes?.confirmadas || 0,

    d.canceladas || 0
  ];

  document
    .querySelectorAll(".stat b")
    .forEach(
      (x, i) =>
        x.textContent = vals[i]
    );

  const m =
    document.querySelectorAll(".money b");

  if (m.length >= 3) {

    m[0].textContent =
      moeda(
        d.financeiro?.arrecadado
      );

    m[1].textContent =
      moeda(
        d.financeiro?.aReceber
      );

    m[2].textContent =
      moeda(
        d.financeiro?.totalPotencial
      );
  }

  const mark =
    document.querySelector(".ph mark");

  if (mark && d.financeiro) {

    mark.textContent = categoriasConfig.length
      ? `${categoriasConfig.length} categorias configuradas`
      : "Valores por categoria";
  }
}


const moeda =
  v =>
    Number(v || 0)
      .toLocaleString(
        "pt-BR",
        {
          style: "currency",
          currency: "BRL"
        }
      );


/* =====================================================
   INSCRIÇÕES
   ===================================================== */

let inscricoes = [];



async function carregarInscricoes() {

  const s = getSession();

  if (!s?.token) {
    return;
  }

  try {

    const r = await fetch(
      `${WORKER_API_URL}/admin/registrations`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          token: s.token,
          evento: EVENTO_ATUAL
        })
      }
    );

    const j = await r.json();

    if (!r.ok || !j.sucesso) {
      throw Error(
        j.mensagem ||
        "Não foi possível carregar as inscrições."
      );
    }

    const d = j.dados;

    inscricoes = d.inscricoes || [];

    render();

  } catch (e) {

    console.error(e);

    notificar(
      "error",
      "ERRO AO CARREGAR",
      e.message ||
        "Não foi possível carregar as inscrições."
    );
  }
}


function render() {

  const body =
    document.getElementById("rows");

  if (!body) {
    return;
  }

  const q =
    (
      document
        .getElementById("search")
        ?.value || ""
    )
      .toLowerCase();

  const f =
    document
      .getElementById("filter")
      ?.value ||
    "todos";

  const cat =
    document
      .getElementById("categoryFilter")
      ?.value ||
    "todas";

  const rows =
    inscricoes.filter(x => {

      const t = [
        x.numeroInscricao,
        x.nome,
        x.cpf,
        x.email,
        x.telefone,
        x.categoria
      ]
        .join(" ")
        .toLowerCase();

      if (
        q &&
        !t.includes(q)
      ) {
        return false;
      }

      if (
        cat !== "todas" &&
        String(x.categoria || "") !== cat
      ) {
        return false;
      }

      const p =
        String(
          x.pagamento || ""
        ).toLowerCase();

      const st =
        String(
          x.statusInscricao || ""
        ).toLowerCase();

      return (

        f === "todos" ||

        (
          f === "pagamento-pendente" &&
          p === "pendente"
        ) ||

        (
          f === "pago" &&
          p === "pago"
        ) ||

        (
          f === "inscricao-pendente" &&
          st === "pendente"
        ) ||

        (
          f === "confirmado" &&
          st === "confirmado"
        ) ||

        (
          f === "cancelado" &&
          (
            p === "cancelado" ||
            st === "cancelado"
          )
        )
      );
    });


  body.innerHTML =
    rows.map(x => `

      <tr>

        <td>
          <b>#${esc(x.numeroInscricao)}</b>
        </td>

        <td>
          <b>${esc(x.numeroPlaca || "—")}</b>
        </td>

        <td>
          <b>${esc(x.nome)}</b>
        </td>

        <td>${esc(x.cpf)}</td>

        <td>
          ${esc(x.categoria)}
        </td>

        <td>
          <b>${moeda(x.valor)}</b>
        </td>

        <td>
          <span class="pill ${classe(x.pagamento)}">
            ${esc(x.pagamento)}
          </span>
        </td>

        <td>
          <span class="pill ${classe(x.statusInscricao)}">
            ${esc(x.statusInscricao)}
          </span>
        </td>

        <td>${esc(x.dataInscricao || "—")}</td>

        <td>
          <button
            class="action"
            data-id="${esc(x.numeroInscricao)}"
          >
            VER DETALHES
          </button>
        </td>

      </tr>

    `).join("")
    ||
    `
      <tr>
        <td
          colspan="10"
          style="
            text-align:center;
            padding:30px
          "
        >
          Nenhuma inscrição encontrada.
        </td>
      </tr>
    `;


  body
    .querySelectorAll(".action")
    .forEach(
      b =>
        b.onclick =
          () =>
            detalhes(b.dataset.id)
    );
}
/* =====================================================
   INSCRIÇÕES FILTRADAS PARA EXPORTAÇÃO
   ===================================================== */

function obterInscricoesFiltradas_() {

  const q =
    (
      document
        .getElementById("search")
        ?.value || ""
    )
      .toLowerCase();

  const f =
    document
      .getElementById("filter")
      ?.value ||
    "todos";

  const cat =
    document
      .getElementById("categoryFilter")
      ?.value ||
    "todas";


  return inscricoes.filter(x => {

    const texto = [
      x.numeroInscricao,
      x.nome,
      x.cpf,
      x.email,
      x.telefone,
      x.categoria
    ]
      .join(" ")
      .toLowerCase();


    if (
      q &&
      !texto.includes(q)
    ) {
      return false;
    }


    if (
      cat !== "todas" &&
      String(
        x.categoria || ""
      ) !== cat
    ) {
      return false;
    }


    const pagamento =
      String(
        x.pagamento || ""
      )
        .toLowerCase();


    const status =
      String(
        x.statusInscricao || ""
      )
        .toLowerCase();


    return (

      f === "todos" ||

      (
        f === "pagamento-pendente" &&
        pagamento === "pendente"
      ) ||

      (
        f === "pago" &&
        pagamento === "pago"
      ) ||

      (
        f === "inscricao-pendente" &&
        status === "pendente"
      ) ||

      (
        f === "confirmado" &&
        status === "confirmado"
      ) ||

      (
        f === "cancelado" &&
        (
          pagamento === "cancelado" ||
          status === "cancelado"
        )
      )

    );

  });

}


/* =====================================================
   EXPORTAR INSCRIÇÕES - CSV
   ===================================================== */

function exportarInscricoes_() {

  const registros =
    obterInscricoesFiltradas_();


  if (!registros.length) {

    notificar(
      "warning",
      "NADA PARA EXPORTAR",
      "Nenhuma inscrição corresponde aos filtros atuais."
    );

    return;
  }


  const selecionados =
    [
      ...document.querySelectorAll(
        "#exportFields input[type='checkbox']:checked"
      )
    ];


  if (!selecionados.length) {

    notificar(
      "warning",
      "SELECIONE OS CAMPOS",
      "Escolha pelo menos uma informação para exportar."
    );

    return;
  }


  const campos = {

    numeroInscricao: {
      titulo: "Número da inscrição"
    },

    numeroPlaca: {
      titulo: "Número da placa"
    },

    nome: {
      titulo: "Nome"
    },

    cpf: {
      titulo: "CPF"
    },

    email: {
      titulo: "E-mail"
    },

    telefone: {
      titulo: "Telefone"
    },

    categoria: {
      titulo: "Categoria"
    },

    valor: {
      titulo: "Valor"
    },

    pagamento: {
      titulo: "Pagamento"
    },

    statusInscricao: {
      titulo: "Status da inscrição"
    },

    dataInscricao: {
      titulo: "Data da inscrição"
    }

  };


  const chaves =
    selecionados.map(
      checkbox => checkbox.value
    );


  const cabecalho =
    chaves.map(
      chave =>
        campos[chave]?.titulo ||
        chave
    );


  const linhas =
    registros.map(registro =>

      chaves.map(chave => {

        let valor =
          registro[chave] ?? "";


        if (chave === "valor") {

          valor =
            Number(valor || 0)
              .toFixed(2)
              .replace(".", ",");

        }


        return valor;

      })

    );


  const escaparCsv = valor => {

    const texto =
      String(valor ?? "")
        .replaceAll('"', '""');

    return `"${texto}"`;

  };


  const csv =
    [
      cabecalho,
      ...linhas
    ]
      .map(
        linha =>
          linha
            .map(escaparCsv)
            .join(";")
      )
      .join("\r\n");


  const blob =
    new Blob(
      [
        "\uFEFF" +
        csv
      ],
      {
        type:
          "text/csv;charset=utf-8;"
      }
    );


  const url =
    URL.createObjectURL(blob);


  const link =
    document.createElement("a");


  const evento =
    EVENTO_ATUAL === "TRAIL2026"
      ? "TRAIL"
      : "MTB";


  const hoje =
    new Date()
      .toLocaleDateString("pt-BR")
      .replaceAll("/", "-");


  link.href = url;

  link.download =
    `INSCRICOES_${evento}_2026_${hoje}.csv`;


  document.body.appendChild(link);

  link.click();

  link.remove();

  URL.revokeObjectURL(url);


  fecharModalExportacao_();


  notificar(
    "success",
    "EXPORTAÇÃO CONCLUÍDA",
    `${registros.length} inscrição(ões) exportada(s).`
  );

}

/* =====================================================
   MODAL - NOVA DESPESA
   ===================================================== */

const expenseModal =
  document.getElementById(
    "expenseModal"
  );


function abrirModalDespesa_() {

  if (!expenseModal) {
    return;
  }

  expenseModal.hidden = false;

  document.body.classList.add(
    "modal-open"
  );

}


function fecharModalDespesa_() {

  if (!expenseModal) {
    return;
  }

  expenseModal.hidden = true;

  document.body.classList.remove(
    "modal-open"
  );

}


document
  .getElementById("newExpenseBtn")
  ?.addEventListener(
    "click",
    () => {

      DESPESA_EDITANDO = null;

      document
        .getElementById("expenseName")
        .value = "";

      document
        .getElementById("expenseValue")
        .value = "";

      document
        .getElementById("expenseSupplier")
        .value = "";

      document
        .getElementById("expenseResponsible")
        .value = "";

      document
        .getElementById("expenseContact")
        .value = "";

      document
        .getElementById("expenseObservation")
        .value = "";


      const anexos =
        document.getElementById(
          "expenseAttachments"
        );

      if (anexos) {
        anexos.value = "";
      }


      const titulo =
        document.getElementById(
          "expenseModalTitle"
        );

      if (titulo) {
        titulo.textContent =
          "Nova despesa";
      }


      const botao =
        document.getElementById(
          "saveExpense"
        );

      if (botao) {
        botao.textContent =
          "CADASTRAR DESPESA";
      }


      abrirModalDespesa_();

    }
  );


document
  .getElementById("closeExpenseModal")
  ?.addEventListener(
    "click",
    fecharModalDespesa_
  );


document
  .getElementById("cancelExpense")
  ?.addEventListener(
    "click",
    fecharModalDespesa_
  );


expenseModal
  ?.addEventListener(
    "click",
    e => {

      if (
        e.target === expenseModal
      ) {
        fecharModalDespesa_();
      }

    }
  );
  /* =====================================================
   CADASTRAR DESPESA
   ===================================================== */

document
  .getElementById("saveExpense")
  ?.addEventListener(
    "click",
    async () => {

      const session =
        getSession();

      if (!session?.token) {

        notificar(
          "warning",
          "SESSÃO EXPIRADA",
          "Faça login novamente."
        );

        return;
      }


      const nome =
        document
          .getElementById("expenseName")
          ?.value
          .trim() || "";


      const valor =
        Number(
          document
            .getElementById("expenseValue")
            ?.value || 0
        );


      const fornecedorEmpresa =
        document
          .getElementById("expenseSupplier")
          ?.value
          .trim() || "";


      const responsavel =
        document
          .getElementById("expenseResponsible")
          ?.value
          .trim() || "";


      const contatoFornecedor =
        document
          .getElementById("expenseContact")
          ?.value
          .trim() || "";


      const observacao =
        document
          .getElementById("expenseObservation")
          ?.value
          .trim() || "";


      if (!nome) {

        notificar(
          "warning",
          "INFORME O NOME",
          "Informe o nome da despesa."
        );

        return;
      }


      if (
        !Number.isFinite(valor) ||
        valor <= 0
      ) {

        notificar(
          "warning",
          "VALOR INVÁLIDO",
          "Informe um valor válido."
        );

        return;
      }


      const botao =
        document.getElementById(
          "saveExpense"
        );


      try {

        if (botao) {

          botao.disabled = true;

          botao.textContent =
            "CADASTRANDO...";

        }


        const editando =
  DESPESA_EDITANDO !== null;


const resultado =
  await apiPost(
    editando
      ? "editarDespesa"
      : "criarDespesa",
    {
      token: session.token,
      evento: EVENTO_ATUAL,

      numero:
        editando
          ? DESPESA_EDITANDO
          : undefined,

      nome,
      valor,
      fornecedorEmpresa,
      responsavel,
      contatoFornecedor,
      observacao
    }
  );


/* =====================================================
   ENVIA ANEXOS
   ===================================================== */

const inputAnexos =
  document.getElementById(
    "expenseAttachments"
  );


const arquivos =
  inputAnexos
    ? [...inputAnexos.files]
    : [];


const numeroDespesa =
  editando
    ? DESPESA_EDITANDO
    : resultado.numero;


for (const file of arquivos) {

  const base64 =
    await bytesToBase64(
      file
    );


  await apiPost(
    "uploadAnexoDespesa",
    {
      token:
        session.token,

      evento:
        EVENTO_ATUAL,

      numero:
        numeroDespesa,

      nome:
        file.name,

      mimeType:
        file.type ||
        "application/octet-stream",

      arquivoBase64:
        base64
    }
  );

}


        fecharModalDespesa_();
		
	
		/* ATUALIZA A LISTA */

await carregarDespesas();
		
     notificar(
  "success",
  editando
    ? "DESPESA ATUALIZADA"
    : "DESPESA CADASTRADA",
  editando
    ? "As alterações foram salvas com sucesso."
    : "A despesa foi cadastrada com sucesso."
);

DESPESA_EDITANDO = null;


      } catch (erro) {

        console.error(
          "Erro ao cadastrar despesa:",
          erro
        );


        notificar(
          "error",
          "ERRO AO CADASTRAR",
          erro?.message ||
          "Não foi possível cadastrar a despesa."
        );


      } finally {

        if (botao) {

          botao.disabled = false;

          botao.textContent =
            "CADASTRAR DESPESA";

        }

      }

    }
  );
  
  
  /* =====================================================
   DESPESAS
   ===================================================== */

let despesas = [];
let DESPESA_EDITANDO = null;
let DESPESA_EXCLUIR = null;
let DESPESA_PAGAR = null;

async function carregarDespesas() {

  const session =
    getSession();

  if (!session?.token) {
    return;
  }


  const tbody =
    document.getElementById(
      "expensesTableBody"
    );


  if (tbody) {

    tbody.innerHTML = `
      <tr>
        <td colspan="6"
            style="padding:40px;text-align:center;color:#888;">
          Carregando despesas...
        </td>
      </tr>
    `;

  }


  try {

    const resposta =
      await apiGet(
        "despesas",
        {
          token: session.token,
          evento: EVENTO_ATUAL
        }
      );


    despesas =
      resposta.despesas || [];


    renderizarDespesas_();


  } catch (erro) {

    console.error(
      "Erro ao carregar despesas:",
      erro
    );


    if (tbody) {

      tbody.innerHTML = `
        <tr>
          <td colspan="6"
              style="padding:40px;text-align:center;color:#c66;">
            Não foi possível carregar as despesas.
          </td>
        </tr>
      `;

    }

  }

}

function renderizarDespesas_() {

  const tbody =
    document.getElementById(
      "expensesTableBody"
    );

  if (!tbody) {
    return;
  }

  if (!despesas.length) {

    tbody.innerHTML = `
      <tr>
        <td colspan="6"
            style="padding:40px;text-align:center;color:#888;">
          Nenhuma despesa cadastrada para este evento.
        </td>
      </tr>
    `;

    return;
  }

  tbody.innerHTML =
    despesas
      .map(despesa => {

        const numero =
          String(
            despesa.numero || ""
          )
            .padStart(3, "0");

        const valor =
          Number(
            despesa.valor || 0
          )
            .toLocaleString(
              "pt-BR",
              {
                style: "currency",
                currency: "BRL"
              }
            );

        const status =
          String(
            despesa.status ||
            "Pendente"
          );

        return `
          <tr>

            <td>
              <strong>
                #${numero}
              </strong>
            </td>

            <td>
              ${esc(
                despesa.nome || "-"
              )}
            </td>

            <td>
              ${esc(
                despesa.fornecedorEmpresa ||
                "-"
              )}
            </td>

            <td>
              <strong>
                ${valor}
              </strong>
              ${Number(despesa.valorPago||0)>0 ? `<br><small style="color:#68736c;">Pago: ${moeda(Number(despesa.valorPago))} · Saldo: ${moeda(Number(despesa.saldoRestante))}</small>` : ""}
            </td>

            <td>
              <span class="
                ${status.toLowerCase() === "pago"
                  ? "badge success"
                  : "badge warning"}
              ">
                ${esc(status)}
              </span>
            </td>

            <td>

              <div style="
                display:flex;
                gap:6px;
                flex-wrap:wrap;
              ">

                <button
                  type="button"
                  class="secondary small"
                  data-expense-details="${despesa.numero}"
                >
                  DETALHES
                </button>

                <button
                  type="button"
                  class="secondary small"
                  data-expense-edit="${despesa.numero}"
                >
                  EDITAR
                </button>

                <button
                  type="button"
                  class="secondary small"
                  data-expense-delete="${despesa.numero}"
                >
                  EXCLUIR
                </button>

              </div>

            </td>

          </tr>
        `;

      })
      .join("");

}

  
 /* =====================================================
   EXCLUSÃO DE DESPESA
   ===================================================== */

function abrirModalExcluirDespesa_(despesa) {

  DESPESA_EXCLUIR = despesa;

  const modal =
    document.getElementById(
      "deleteExpenseModal"
    );

  const mensagem =
    document.getElementById(
      "deleteExpenseMessage"
    );

  if (mensagem) {

    mensagem.textContent =
      `Deseja realmente excluir a despesa #${String(
        despesa.numero
      ).padStart(
        3,
        "0"
      )} - ${despesa.nome}?`;

  }

  if (modal) {

    modal.hidden = false;

    document.body.classList.add(
      "modal-open"
    );

  }

}


function fecharModalExcluirDespesa_() {

  const modal =
    document.getElementById(
      "deleteExpenseModal"
    );

  if (modal) {

    modal.hidden = true;

    document.body.classList.remove(
      "modal-open"
    );

  }

  DESPESA_EXCLUIR = null;

}


/* ABRIR MODAL AO CLICAR EM EXCLUIR */

document
  .getElementById("expensesTableBody")
  ?.addEventListener(
    "click",
    e => {

      const botao =
        e.target.closest(
          "[data-expense-delete]"
        );

      if (!botao) {
        return;
      }

      const numero =
        Number(
          botao.dataset.expenseDelete
        );

      const despesa =
        despesas.find(
          item =>
            Number(item.numero) ===
            numero
        );

      if (!despesa) {

        notificar(
          "warning",
          "DESPESA NÃO ENCONTRADA",
          "Não foi possível localizar a despesa."
        );

        return;
      }

      abrirModalExcluirDespesa_(
        despesa
      );

    }
  );


/* CONFIRMAR EXCLUSÃO */

document
  .getElementById("confirmDeleteExpense")
  ?.addEventListener(
    "click",
    async () => {

      if (!DESPESA_EXCLUIR) {
        return;
      }

      const session =
        getSession();

      if (!session?.token) {

        notificar(
          "warning",
          "SESSÃO EXPIRADA",
          "Faça login novamente."
        );

        return;
      }

      const botao =
        document.getElementById(
          "confirmDeleteExpense"
        );

      try {

        if (botao) {

          botao.disabled = true;

          botao.textContent =
            "EXCLUINDO...";

        }

        const numero =
          DESPESA_EXCLUIR.numero;

        await apiPost(
          "excluirDespesa",
          {
            token:
              session.token,

            evento:
              EVENTO_ATUAL,

            numero
          }
        );

        fecharModalExcluirDespesa_();

        await carregarDespesas();

        notificar(
          "success",
          "DESPESA EXCLUÍDA",
          "A despesa foi excluída com sucesso."
        );

      } catch (erro) {

        console.error(
          "Erro ao excluir despesa:",
          erro
        );

        notificar(
          "error",
          "ERRO AO EXCLUIR",
          erro?.message ||
          "Não foi possível excluir a despesa."
        );

      } finally {

        if (botao) {

          botao.disabled = false;

          botao.textContent =
            "EXCLUIR DESPESA";

        }

      }

    }
  );


/* CANCELAR */

document
  .getElementById("cancelDeleteExpense")
  ?.addEventListener(
    "click",
    fecharModalExcluirDespesa_
  );


/* X DO MODAL */

document
  .getElementById("closeDeleteExpenseModal")
  ?.addEventListener(
    "click",
    fecharModalExcluirDespesa_
  );


/* CLICAR FORA */

document
  .getElementById("deleteExpenseModal")
  ?.addEventListener(
    "click",
    e => {

      if (
        e.target.id ===
        "deleteExpenseModal"
      ) {

        fecharModalExcluirDespesa_();

      }

    }
  );

/* =====================================================
   ABRIR DESPESA PARA EDIÇÃO
   ===================================================== */

function editarDespesaModal_(numero) {

  const despesa =
    despesas.find(
      item =>
        Number(item.numero) ===
        Number(numero)
    );

  if (!despesa) {

    notificar(
      "warning",
      "DESPESA NÃO ENCONTRADA",
      "Não foi possível localizar a despesa."
    );

    return;
  }


  DESPESA_EDITANDO =
    Number(despesa.numero);


  /* PREENCHE OS CAMPOS */

  document
    .getElementById("expenseName")
    .value =
      despesa.nome || "";


  document
    .getElementById("expenseValue")
    .value =
      Number(
        despesa.valor || 0
      );


  document
    .getElementById("expenseSupplier")
    .value =
      despesa.fornecedorEmpresa || "";


  document
    .getElementById("expenseResponsible")
    .value =
      despesa.responsavel || "";


  document
    .getElementById("expenseContact")
    .value =
      despesa.contatoFornecedor || "";


  document
    .getElementById("expenseObservation")
    .value =
      despesa.observacao || "";


  /* ALTERA O TÍTULO */

  const titulo =
    document.getElementById(
      "expenseModalTitle"
    );

  if (titulo) {

    titulo.textContent =
      `Editar despesa #${String(
        despesa.numero
      ).padStart(3, "0")}`;

  }


  /* ALTERA O BOTÃO */

  const botao =
    document.getElementById(
      "saveExpense"
    );

  if (botao) {

    botao.textContent =
      "SALVAR ALTERAÇÕES";

  }


  abrirModalDespesa_();

}

document
  .getElementById("expensesTableBody")
  ?.addEventListener(
    "click",
    e => {

      const botao =
        e.target.closest(
          "[data-expense-edit]"
        );

      if (!botao) {
        return;
      }

      editarDespesaModal_(
        botao.dataset.expenseEdit
      );

    }
  );
/* =====================================================
   MODAL DE EXPORTAÇÃO
   ===================================================== */

const exportModal =
  document.getElementById("exportModal");


function abrirModalExportacao_() {

  if (!exportModal) {
    return;
  }


  const registros =
    obterInscricoesFiltradas_();


  const total =
    document.getElementById(
      "exportTotal"
    );


  if (total) {

    total.textContent =
      registros.length;

  }


  exportModal.hidden = false;


  document.body.classList.add(
    "modal-open"
  );

}


function fecharModalExportacao_() {

  if (!exportModal) {
    return;
  }

  exportModal.hidden = true;

  document.body.classList.remove(
    "modal-open"
  );
}


document
  .getElementById("exportRegistrationsBtn")
  ?.addEventListener(
    "click",
    abrirModalExportacao_
  );


document
  .getElementById("closeExportModal")
  ?.addEventListener(
    "click",
    fecharModalExportacao_
  );


document
  .getElementById("cancelExport")
  ?.addEventListener(
    "click",
    fecharModalExportacao_
  );


exportModal
  ?.addEventListener(
    "click",
    e => {

      if (e.target === exportModal) {
        fecharModalExportacao_();
      }

    }
  );
  
  
  /* =====================================================
   CONTROLES DO MODAL DE EXPORTAÇÃO
   ===================================================== */

document
  .getElementById("selectAllExportFields")
  ?.addEventListener(
    "click",
    () => {

      document
        .querySelectorAll(
          "#exportFields input[type='checkbox']"
        )
        .forEach(
          checkbox =>
            checkbox.checked = true
        );

    }
  );


document
  .getElementById("clearExportFields")
  ?.addEventListener(
    "click",
    () => {

      document
        .querySelectorAll(
          "#exportFields input[type='checkbox']"
        )
        .forEach(
          checkbox =>
            checkbox.checked = false
        );

    }
  );


document
  .getElementById("confirmExport")
  ?.addEventListener(
    "click",
    exportarInscricoes_
  );

/* =====================================================
   UTILITÁRIOS FRONT-END
   ===================================================== */

const esc =
  v =>
    String(v ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");


// Alias usado pelos modais de seleção.
// Corrige o erro que interrompia a abertura do modal de pagamento/status.
const escapeHtml_ = esc;


const classe =
  v => {

    v =
      String(v || "")
        .toLowerCase();

    return (
      v === "pago" ||
      v === "confirmado"
    )
      ? "paid"
      : v === "cancelado"
        ? "cancelled"
        : "pending";
  };


let inscricaoAtual = null;



/* =====================================================
   NOVA INSCRIÇÃO
   ===================================================== */

const registrationModal =
  document.getElementById("registrationModal");

const registrationForm =
  document.getElementById("registrationForm");

const registrationError =
  document.getElementById("registrationError");

function atualizarDocumentosCadastro_() {
  const area = document.getElementById("registrationDocuments");
  const categoriaNome = document.getElementById("newCategoria")?.value || "";
  if (!area) return;
  const categoria = categoriasConfig.find(c => c.nome === categoriaNome);
  const docs = Array.isArray(categoria?.documentosObrigatorios) ? categoria.documentosObrigatorios : [];
  if (!docs.length) { area.hidden = true; area.innerHTML = ""; return; }
  const rotulos = { RG: "RG", CPF: "CPF", CERTIDAO: "Certidão", COMPROVANTE_RESIDENCIA: "Comprovante de residência" };
  area.hidden = false;
  area.innerHTML = `<div class="registration-documents-box"><h3>DOCUMENTOS OBRIGATÓRIOS</h3>${docs.map(tipo => `<label class="registration-document-item"><small>${esc(rotulos[tipo] || tipo)} *</small><input type="file" id="registrationDoc-${esc(tipo)}" data-registration-document="${esc(tipo)}" accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp" required><span class="registration-document-help">PDF, JPG, PNG ou WEBP — até 5 MB</span></label>`).join("")}</div>`;
}

document.getElementById("newCategoria")?.addEventListener("change", () => {
  atualizarDocumentosCadastro_();
  atualizarValorCadastroAdmin_();
});

function atualizarValorCadastroAdmin_() {
  const campo = document.getElementById("newValor");
  if (!campo) return;
  if (document.getElementById("newCortesia")?.checked) {
    campo.value = "0.00";
    campo.readOnly = true;
    return;
  }
  const categoriaNome = document.getElementById("newCategoria")?.value || "";
  const categoria = categoriasConfig.find(c => c.nome === categoriaNome);
  const lote = obterLoteVigente_();
  if (!lote) {
    campo.value = "";
    campo.placeholder = "Nenhum lote vigente";
    campo.readOnly = true;
    return;
  }
  const valor = categoria?.local ? lote.valorLocal : lote.valorGeral;
  campo.value = Number(valor || 0).toFixed(2);
  campo.placeholder = "";
  campo.readOnly = true;
}

async function abrirModalCadastro() {

  if (!registrationModal) return;

  registrationForm.reset();

  const valorInput =
    document.getElementById("newValor");

  const categoriaSelect =
    document.getElementById("newCategoria");

  if (
    categoriaSelect &&
    categoriasConfig.length
  ) {
    categoriaSelect.value =
      categoriasConfig[0].nome;
  }

  atualizarDocumentosCadastro_();

  if (valorInput) {
    valorInput.value = "";
    valorInput.placeholder =
      "Carregando lote vigente...";
  }

  if (registrationError) {
    registrationError.hidden = true;
    registrationError.textContent = "";
  }

  registrationModal.hidden = false;

  document.body.classList.add(
    "modal-open"
  );

  atualizarValorCadastroAdmin_();

  setTimeout(() => {
    document
      .getElementById("newNome")
      ?.focus();
  }, 50);
}

function fecharModalCadastro() {
  if (!registrationModal) return;

  registrationModal.hidden = true;
  document.body.classList.remove("modal-open");

  if (registrationForm) {
    registrationForm.reset();
  }
  const docsArea = document.getElementById("registrationDocuments");
  if (docsArea) { docsArea.hidden = true; docsArea.innerHTML = ""; }

  if (registrationError) {
    registrationError.hidden = true;
    registrationError.textContent = "";
  }
}

document
  .getElementById("newRegistrationBtn")
  ?.addEventListener("click", abrirModalCadastro);

document
  .getElementById("closeRegistration")
  ?.addEventListener("click", fecharModalCadastro);

document
  .getElementById("cancelRegistration")
  ?.addEventListener("click", fecharModalCadastro);

registrationModal?.addEventListener("click", e => {
  if (e.target === registrationModal) {
    fecharModalCadastro();
  }
});

document.addEventListener("keydown", e => {
  if (e.key === "Escape" && registrationModal && !registrationModal.hidden) {
    fecharModalCadastro();
  }
});

function validarCpfCadastro_(cpf) {
  const digits = String(cpf || "").replace(/\D/g, "");

  if (digits.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(digits)) return false;

  let soma = 0;
  for (let i = 0; i < 9; i++) soma += Number(digits[i]) * (10 - i);
  let resto = soma % 11;
  const digito1 = resto < 2 ? 0 : 11 - resto;
  if (digito1 !== Number(digits[9])) return false;

  soma = 0;
  for (let i = 0; i < 10; i++) soma += Number(digits[i]) * (11 - i);
  resto = soma % 11;
  const digito2 = resto < 2 ? 0 : 11 - resto;

  return digito2 === Number(digits[10]);
}

function formatarCpfCadastro_(value) {
  const digits = String(value || "").replace(/\D/g, "").slice(0, 11);

  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return digits.replace(/^(\d{3})(\d+)/, "$1.$2");
  if (digits.length <= 9) return digits.replace(/^(\d{3})(\d{3})(\d+)/, "$1.$2.$3");
  return digits.replace(/^(\d{3})(\d{3})(\d{3})(\d{0,2})$/, "$1.$2.$3-$4");
}

document
  .getElementById("newCpf")
  ?.addEventListener("input", e => {
    e.target.value = formatarCpfCadastro_(e.target.value);
  });

let categoriasConfig = [];
let lotesConfig = [];

let loteEditandoId = null;


function normalizarCategorias_(valor) {
  const arr = Array.isArray(valor) ? valor : [];
  return arr.map(x => ({
    id: String(x.id || "").trim(),
    nome: String(x.nome || "").trim(),
    idadeMaxima: x.idadeMaxima === null || x.idadeMaxima === undefined || x.idadeMaxima === ""
      ? null
      : Number(x.idadeMaxima),
    ativo: x.ativo === true || String(x.ativo || "").toUpperCase() === "SIM",
    local: x.local === true || Number(x.local) === 1,
    documentosObrigatorios: Array.isArray(x.documentosObrigatorios)
      ? x.documentosObrigatorios.map(v => String(v || "").trim()).filter(Boolean)
      : String(x.documentosObrigatorios || "").split("|").map(v => v.trim()).filter(Boolean)
  })).filter(x => x.nome);
}

function rotuloDocumentoCategoria_(codigo) {
  const rotulos = {
    RG: "RG",
    CPF: "CPF",
    CERTIDAO: "Certidão",
    COMPROVANTE_RESIDENCIA: "Comprovante de residência"
  };
  return rotulos[String(codigo || "").trim()] || String(codigo || "").trim();
}

function documentosCategoriaSelecionados_() {
  return Array.from(document.querySelectorAll('input[name="categoryDocumento"]:checked'))
    .map(input => input.value);
}

function preencherDocumentosCategoria_(documentos) {
  const selecionados = new Set(Array.isArray(documentos) ? documentos : []);
  document.querySelectorAll('input[name="categoryDocumento"]').forEach(input => {
    input.checked = selecionados.has(input.value);
  });
  sincronizarComprovanteCategoriaLocal_();
}

function sincronizarComprovanteCategoriaLocal_() {
  const local = document.getElementById("categoryLocal")?.checked === true;
  const comprovante = document.querySelector('input[name="categoryDocumento"][value="COMPROVANTE_RESIDENCIA"]');
  if (comprovante && local) comprovante.checked = true;
  if (comprovante) comprovante.disabled = local;
}

function normalizarLotes_(valor) {
  const arr = Array.isArray(valor) ? valor : [];
  return arr.map(x => ({
    id: String(x.id || "").trim(),
    nome: String(x.nome || "").trim(),
    dataInicio: String(x.dataInicio || "").trim(),
    dataFim: String(x.dataFim || "").trim(),
    valor: Number(x.valorGeral ?? x.valor ?? 0),
    valorGeral: Number(x.valorGeral ?? x.valor ?? 0),
    valorLocal: Number(x.valorLocal ?? x.valorGeral ?? x.valor ?? 0),
    ativo: x.ativo === true || String(x.ativo || "").toUpperCase() === "SIM"
  })).filter(x => x.nome);
}

function preencherSelectCategorias_(id, selecionada = "") {
  const select = document.getElementById(id);
  if (!select) return;
  const atual = selecionada || select.value;
  const disponiveis = categoriasConfig.filter(c => c.ativo);
  select.innerHTML = '<option value="">Selecione a categoria</option>' +
    disponiveis.map(c => `<option value="${esc(c.nome)}">${esc(c.nome)}</option>`).join("");
  if (disponiveis.some(c => c.nome === atual)) select.value = atual;
}

function atualizarValorPorCategoria_(categoriaId, valorId) {
  const campo = document.getElementById(valorId);
  if (!campo) return;
  const lote = obterLoteVigente_();
  campo.value = lote ? Number(lote.valor).toFixed(2) : "";
}

function obterLoteVigente_() {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  return lotesConfig.find(l => {
    if (!l.ativo) return false;
    const inicio = parseDataLocal_(l.dataInicio);
    const fim = parseDataLocal_(l.dataFim);
    return inicio && fim && hoje >= inicio && hoje <= fim;
  }) || null;
}

function parseDataLocal_(value) {

  const s =
    String(value || '')
      .trim();

  if (!s) {
    return null;
  }

  let dia;
  let mes;
  let ano;

  /* ---------------------------------------------
     Formato: DD/MM/YYYY
     Aceita também DD/MM/YYYY HH:mm:ss
     --------------------------------------------- */

  let match =
    s.match(
      /^(\d{2})\/(\d{2})\/(\d{4})/
    );

  if (match) {

    dia = Number(match[1]);
    mes = Number(match[2]);
    ano = Number(match[3]);

  } else {

    /* -------------------------------------------
       Formato: YYYY-MM-DD
       Aceita também YYYY-MM-DDTHH:mm:ss
       ------------------------------------------- */

    match =
      s.match(
        /^(\d{4})-(\d{2})-(\d{2})/
      );

    if (!match) {
      return null;
    }

    ano = Number(match[1]);
    mes = Number(match[2]);
    dia = Number(match[3]);
  }

  const d =
    new Date(
      ano,
      mes - 1,
      dia
    );

  d.setHours(
    0,
    0,
    0,
    0
  );

  return d;
}

function formatarDataInput_(value) {
  const d = parseDataLocal_(value);
  if (!d) return "";
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatarDataHoraInput_(value) {
  const d = parseDataLocal_(value);

  if (!d) return "";

  const ano = d.getFullYear();
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  const dia = String(d.getDate()).padStart(2, "0");
  const hora = String(d.getHours()).padStart(2, "0");
  const minuto = String(d.getMinutes()).padStart(2, "0");

  return `${ano}-${mes}-${dia}T${hora}:${minuto}`;
}

function formatarDataCurta_(value) {
  const d = parseDataLocal_(value);
  if (!d) return "—";
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

async function carregarConfiguracoes_() {
  const s = getSession();
  if (!s?.token) return;
  try {
    const [categorias, lotes] = await Promise.all([
  apiGet("adminCategorias", {
    token: s.token,
    evento: EVENTO_ATUAL
  }),

  apiGet("lotes", {
    token: s.token,
    evento: EVENTO_ATUAL
  })
]);

    categoriasConfig = normalizarCategorias_(categorias?.categorias);
    lotesConfig = normalizarLotes_(lotes?.lotes);

    preencherSelectCategorias_("newCategoria");
    preencherSelectCategorias_("editCategoria");
    atualizarValorCadastroAdmin_();
    //atualizarValorPorCategoria_("newCategoria", "newValor");
    renderCategoriasConfig_();
    renderLotesConfig_();
    renderCategoryFilter_();
  } catch (e) {
    console.warn("Não foi possível carregar categorias/lotes", e);
    notificar("error", "ERRO NAS CONFIGURAÇÕES", e.message || "Não foi possível carregar os cadastros.");
  }
}

function renderCategoryFilter_() {
  const select = document.getElementById("categoryFilter");
  if (!select) return;
  const atual = select.value || "todas";
  const categorias = categoriasConfig.filter(c => c.ativo);
  select.innerHTML = '<option value="todas">Todas as categorias</option>' + categorias.map(c => `<option value="${esc(c.nome)}">${esc(c.nome)}</option>`).join("");
  if (categorias.some(c => c.nome === atual)) select.value = atual;
}

function renderCategoriasConfig_() {

  const box =
    document.getElementById(
      "categoriesList"
    );

  const empty =
    document.getElementById(
      "categoriesEmpty"
    );

  if (!box || !empty) {
    return;
  }

  empty.hidden =
    categoriasConfig.length > 0;

  box.innerHTML =
    categoriasConfig
      .map(c => `

        <div
          class="management-row ${c.ativo ? "is-active" : "is-inactive"}"
          data-id="${esc(c.id)}"
        >

          <div class="management-main">

            <small>
              CATEGORIA
            </small>

            <b>
              ${esc(c.nome)}
            </b>

            <span>
              ${
                c.idadeMaxima
                  ? `Idade máxima: ${c.idadeMaxima} anos`
                  : "Sem idade máxima definida"
              }
            </span>

            ${c.local ? '<span class="category-documents-summary"><b>Categoria local — exclusiva para residentes</b></span>' : ''}
            <span class="category-documents-summary">
              ${c.documentosObrigatorios.length
                ? `Documentos: ${c.documentosObrigatorios.map(rotuloDocumentoCategoria_).map(esc).join(", ")}`
                : "Documentos: nenhum obrigatório"}
            </span>

          </div>


          <span
            class="status-badge ${
              c.ativo
                ? "status-active"
                : "status-inactive"
            }"
          >
            ${
              c.ativo
                ? "ATIVA"
                : "INATIVA"
            }
          </span>


          <div class="management-actions">

            <button
              type="button"
              class="management-edit category-edit"
              data-id="${esc(c.id)}"
            >
              EDITAR
            </button>


            <button
              type="button"
              class="management-toggle category-toggle"
              data-id="${esc(c.id)}"
              data-active="${c.ativo}"
            >
              ${
                c.ativo
                  ? "DESATIVAR"
                  : "ATIVAR"
              }
            </button>


            <button
              type="button"
              class="management-delete category-delete"
              data-id="${esc(c.id)}"
            >
              EXCLUIR
            </button>

          </div>

        </div>

      `)
      .join("");
}

function renderLotesConfig_() {

  const box =
    document.getElementById(
      "lotsList"
    );

  const empty =
    document.getElementById(
      "lotsEmpty"
    );

  if (!box || !empty) {
    return;
  }

  empty.hidden =
    lotesConfig.length > 0;

  const vigente =
    obterLoteVigente_();

  box.innerHTML =
    lotesConfig
      .map(l => `

        <div
          class="management-row ${l.ativo ? "is-active" : "is-inactive"}"
          data-id="${esc(l.id)}"
        >

          <div class="management-main">

            <small>LOTE</small>

            <b>
              ${esc(l.nome)}
            </b>

            <span>
              Vigência:
              ${formatarDataCurta_(l.dataInicio)}
              →
              ${formatarDataCurta_(l.dataFim)}
            </span>

          </div>


          <div class="management-price">

            <small>GERAL / LOCAL</small>

            <b>
              R$ ${Number(l.valorGeral).toFixed(2).replace(".", ",")}
              <span class="management-price-secondary">Local: R$ ${Number(l.valorLocal).toFixed(2).replace(".", ",")}</span>
            </b>

          </div>


          <span
            class="status-badge ${
              l.ativo
                ? "status-active"
                : "status-inactive"
            }"
          >

            ${
              l.ativo
                ? (
                    vigente &&
                    vigente.id === l.id
                      ? "VIGENTE"
                      : "ATIVO"
                  )
                : "INATIVO"
            }

          </span>

<div class="management-actions">

  <button
    type="button"
    class="management-edit lot-edit"
    data-id="${esc(l.id)}"
  >
    EDITAR
  </button>

  <button
    type="button"
    class="management-toggle lot-toggle"
    data-id="${esc(l.id)}"
    data-active="${l.ativo}"
  >
    ${
      l.ativo
        ? "DESATIVAR"
        : "ATIVAR"
    }
  </button>

  <button
    type="button"
    class="management-delete lot-delete"
    data-id="${esc(l.id)}"
  >
    EXCLUIR
  </button>

</div>

        </div>

      `)
      .join("");
}

function abrirModal_(id) {
  const el = document.getElementById(id);
  if (el) el.hidden = false;
}
function fecharModal_(id) {
  const el = document.getElementById(id);
  if (el) el.hidden = true;
}

function mostrarErroConfig_(id, mensagem) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = mensagem;
  el.hidden = false;
}
function limparErroConfig_(id) {
  const el = document.getElementById(id);
  if (el) { el.textContent = ""; el.hidden = true; }
}

/* =====================================================
   CONTEÚDO DO SITE
   ===================================================== */

document
  .getElementById("saveSiteConfig")
  ?.addEventListener(
    "click",
    async () => {

      const s = getSession();

      if (!s?.token) {
        showLogin();
        return;
      }


      const btn =
        document.getElementById(
          "saveSiteConfig"
        );

      const textoOriginal =
        btn.textContent;


      const dados = {

        token:
          s.token,

        evento:
          EVENTO_ATUAL,

        nomeEvento:
          document
            .getElementById(
              "siteNomeEvento"
            )
            ?.value
            .trim() || "",

        modalidade:
          document
            .getElementById(
              "siteModalidade"
            )
            ?.value
            .trim() || "",

        dataEvento:
          document
            .getElementById(
              "siteDataEvento"
            )
            ?.value || "",

        horario:
          document
            .getElementById(
              "siteHorario"
            )
            ?.value || "",

        cidade:
          document
            .getElementById(
              "siteCidade"
            )
            ?.value
            .trim() || "",

        estado:
          document
            .getElementById(
              "siteEstado"
            )
            ?.value
            .trim()
            .toUpperCase() || "",

        distancia:
          document
            .getElementById(
              "siteDistancia"
            )
            ?.value || "",

        altimetria:
          document
            .getElementById(
              "siteAltimetria"
            )
            ?.value || "",

        heroLinhaSuperior:
          document.getElementById("siteHeroLinhaSuperior")?.value.trim() || "",

        heroTitulo:
          document.getElementById("siteHeroTitulo")?.value.trim() || "",

        heroDestaque:
          document.getElementById("siteHeroDestaque")?.value.trim() || "",

        localExtenso:
          document.getElementById("siteLocalExtenso")?.value.trim() || "",

        heroDescricao:
          document.getElementById("siteHeroDescricao")?.value.trim() || "",

        regulamento:
          document
            .getElementById(
              "siteRegulamento"
            )
            ?.value
            .trim() || ""

      };


      if (!dados.nomeEvento) {

        notificar(
          "error",
          "CAMPO OBRIGATÓRIO",
          "Informe o nome do evento."
        );

        return;
      }


      btn.disabled = true;

      btn.textContent =
        "SALVANDO...";


      try {

        await apiPost(
          "salvarSiteConfigArquivo",
          dados
        );


        notificar(
          "success",
          "INFORMAÇÕES SALVAS",
          "O conteúdo do site foi atualizado com sucesso."
        );


      } catch (err) {

        notificar(
          "error",
          "ERRO AO SALVAR",
          err.message ||
            "Não foi possível salvar as informações."
        );


      } finally {

        btn.disabled = false;

        btn.textContent =
          textoOriginal;

      }

    }
  );
  

  async function carregarConteudoSite_() {

  const s =
    getSession();

  if (!s?.token) {
    return;
  }


  try {

    const dados =
      await apiGet(
        "siteConfigArquivo",
        {
          token: s.token,
          evento: EVENTO_ATUAL
        }
      );


    const preencher = (
      id,
      valor
    ) => {

      const campo =
        document.getElementById(id);

      if (campo) {
        campo.value =
          valor ?? "";
      }

    };


    preencher(
      "siteNomeEvento",
      dados.nomeEvento
    );

    preencher(
      "siteModalidade",
      dados.modalidade
    );

    preencher(
      "siteDataEvento",
      dados.dataEvento
    );

    preencher(
      "siteHorario",
      dados.horario
    );

    preencher(
      "siteCidade",
      dados.cidade
    );

    preencher(
      "siteEstado",
      dados.estado
    );

    preencher(
      "siteDistancia",
      dados.distancia
    );

    preencher(
      "siteAltimetria",
      dados.altimetria
    );

    preencher("siteHeroLinhaSuperior", dados.heroLinhaSuperior);
    preencher("siteHeroTitulo", dados.heroTitulo);
    preencher("siteHeroDestaque", dados.heroDestaque);
    preencher("siteLocalExtenso", dados.localExtenso);
    preencher("siteHeroDescricao", dados.heroDescricao);

    preencher(
      "siteRegulamento",
      dados.regulamento
    );


  } catch (err) {

    console.warn(
      "Não foi possível carregar o conteúdo do site:",
      err
    );

    notificar(
      "error",
      "ERRO AO CARREGAR",
      err.message ||
        "Não foi possível carregar as informações do site."
    );

  }

}

function abrirEdicaoLote_(id) {

  const lote =
    lotesConfig.find(
      l =>
        String(l.id) ===
        String(id)
    );

  if (!lote) {

    notificar(
      "error",
      "LOTE NÃO ENCONTRADO",
      "Não foi possível localizar o lote."
    );

    return;
  }

  loteEditandoId =
    lote.id;

  document.getElementById(
    "lotModalTitle"
  ).textContent =
    "Editar lote";

  document.getElementById(
    "lotNome"
  ).value =
    lote.nome || "";

  document.getElementById(
    "lotDataInicio"
  ).value =
   formatarDataHoraInput_(
  lote.dataInicio
);
  document.getElementById(
    "lotDataFim"
  ).value =
formatarDataHoraInput_(
  lote.dataFim
);

  document.getElementById("lotValorGeral").value = Number(lote.valorGeral ?? lote.valor ?? 0).toFixed(2);
  document.getElementById("lotValorLocal").value = Number(lote.valorLocal ?? lote.valorGeral ?? lote.valor ?? 0).toFixed(2);

  document.getElementById(
    "saveLot"
  ).textContent =
    "SALVAR ALTERAÇÕES";

  limparErroConfig_(
    "lotError"
  );

  abrirModal_(
    "lotModal"
  );
}

document.getElementById("addLotBtn")?.addEventListener("click", () => {
  loteEditandoId = null;
  document.getElementById("lotForm")?.reset();
  document.getElementById("lotModalTitle").textContent = "Novo lote";
  document.getElementById("saveLot").textContent = "CRIAR LOTE";
  limparErroConfig_("lotError");
  abrirModal_("lotModal");
  document.getElementById("lotNome")?.focus();
});
document.getElementById("closeLotModal")?.addEventListener("click", () => fecharModal_("lotModal"));
document.getElementById("cancelLot")?.addEventListener("click", () => fecharModal_("lotModal"));

document.getElementById("lotForm")?.addEventListener("submit", async e => {

  e.preventDefault();

  const s = getSession();

  if (!s?.token) {
    return showLogin();
  }

  limparErroConfig_("lotError");

  const nome =
    document.getElementById("lotNome")
      .value
      .trim();

  const dataInicio =
    document.getElementById("lotDataInicio")
      .value;

  const dataFim =
    document.getElementById("lotDataFim")
      .value;

  const valorGeral = Number(document.getElementById("lotValorGeral").value);
  const valorLocal = Number(document.getElementById("lotValorLocal").value);

  if (!nome || !dataInicio || !dataFim || !Number.isFinite(valorGeral) || valorGeral <= 0 || !Number.isFinite(valorLocal) || valorLocal <= 0) {
    return mostrarErroConfig_("lotError", "Preencha os dados do lote e informe os dois valores corretamente.");
  }

  if (dataInicio > dataFim) {

    return mostrarErroConfig_(
      "lotError",
      "A data inicial não pode ser maior que a data final."
    );
  }

  const btn =
    document.getElementById("saveLot");

  btn.disabled = true;


  /* =================================================
     MODO EDIÇÃO
     ================================================= */

  if (loteEditandoId) {

    btn.textContent =
      "SALVANDO...";
      
console.log(
  "EDITANDO LOTE - ID:",
  loteEditandoId
);
    try {

      await apiPost(
  "editarLote",
  {
    token: s.token,
    id: loteEditandoId,
    nome: nome,
    dataInicio: dataInicio,
    dataFim: dataFim,
    valorGeral,
    valorLocal,
    evento: EVENTO_ATUAL
  }
);

      loteEditandoId =
        null;

      fecharModal_(
        "lotModal"
      );

      await carregarConfiguracoes_();

      notificar(
        "success",
        "LOTE ATUALIZADO",
        "As alterações do lote foram salvas com sucesso."
      );

    } catch (err) {

      mostrarErroConfig_(
        "lotError",
        err.message
      );

    } finally {

      btn.disabled = false;

      btn.textContent =
        "CRIAR LOTE";
    }

    return;
  }

document
  .getElementById("cancelDeleteExpense")
  ?.addEventListener(
    "click",
    fecharModalExcluirDespesa_
  );


document
  .getElementById("closeDeleteExpenseModal")
  ?.addEventListener(
    "click",
    fecharModalExcluirDespesa_
  );


document
  .getElementById("deleteExpenseModal")
  ?.addEventListener(
    "click",
    e => {

      if (
        e.target.id ===
        "deleteExpenseModal"
      ) {
        fecharModalExcluirDespesa_();
      }

    }
  );


  /* =================================================
     MODO NOVO LOTE
     ================================================= */

  btn.textContent =
    "CRIANDO...";

  try {

    await apiPost(
      "criarLote",
      {
       token: s.token,
  nome,
  dataInicio,
  dataFim,
  valorGeral,
  valorLocal,
  evento: EVENTO_ATUAL
      }
    );

    fecharModal_(
      "lotModal"
    );

    await carregarConfiguracoes_();

    notificar(
      "success",
      "LOTE CRIADO",
      "O lote foi cadastrado com sucesso."
    );

  } catch (err) {

    mostrarErroConfig_(
      "lotError",
      err.message
    );

  } finally {

    btn.disabled = false;

    btn.textContent =
      "CRIAR LOTE";
  }

});

document.getElementById("addCategoryBtn")?.addEventListener("click", () => {
  document.getElementById("categoryForm")?.reset();
  window.categoriaEditandoId = null;
  preencherDocumentosCategoria_([]);
  const categoriaLocal = document.getElementById("categoryLocal");
  if (categoriaLocal) categoriaLocal.checked = false;
  sincronizarComprovanteCategoriaLocal_();
  const titulo = document.getElementById("categoryModalTitle");
  if (titulo) titulo.textContent = "Nova categoria";
  const salvar = document.getElementById("saveCategory");
  if (salvar) salvar.textContent = "CRIAR CATEGORIA";
  limparErroConfig_("categoryError");
  abrirModal_("categoryModal");
  document.getElementById("categoryNome")?.focus();
});
document.getElementById("closeCategoryModal")?.addEventListener("click", () => fecharModal_("categoryModal"));
document.getElementById("categoryLocal")?.addEventListener("change", sincronizarComprovanteCategoriaLocal_);
document.getElementById("cancelCategory")?.addEventListener("click", () => fecharModal_("categoryModal"));

document.getElementById("categoryForm")?.addEventListener("submit", async e => {

  e.preventDefault();

  const s = getSession();

  if (!s?.token) {
    return showLogin();
  }

  limparErroConfig_("categoryError");

  const nome =
    document
      .getElementById("categoryNome")
      .value
      .trim();

  const idadeMaxima =
    document
      .getElementById("categoryIdadeMaxima")
      .value;

  const categoriaLocal = document.getElementById("categoryLocal")?.checked === true;
  if (categoriaLocal) {
    const comprovante = document.querySelector('input[name="categoryDocumento"][value="COMPROVANTE_RESIDENCIA"]');
    if (comprovante) comprovante.checked = true;
  }
  const documentosObrigatorios = documentosCategoriaSelecionados_();

  if (!nome) {

    return mostrarErroConfig_(
      "categoryError",
      "Informe o nome da categoria."
    );
  }


  /* =================================================
     VERIFICA SE É EDIÇÃO
     ================================================= */

  const categoriaEditandoId =
    window.categoriaEditandoId;


  /* =================================================
     VERIFICA CATEGORIA DUPLICADA
     ================================================= */

  const duplicada =
    categoriasConfig.some(c => {

      if (
        categoriaEditandoId &&
        String(c.id) ===
        String(categoriaEditandoId)
      ) {
        return false;
      }

      return (
        String(c.nome || "")
          .trim()
          .toLowerCase() ===
        nome.toLowerCase()
      );

    });


  if (duplicada) {

    return mostrarErroConfig_(
      "categoryError",
      "Já existe uma categoria com este nome."
    );
  }


  const btn =
    document.getElementById(
      "saveCategory"
    );

  btn.disabled = true;

  btn.textContent =
    categoriaEditandoId
      ? "SALVANDO..."
      : "CRIANDO...";


  try {

    /* =================================================
       EDITAR
       ================================================= */

    if (categoriaEditandoId) {

      await apiPost(
        "editarCategoria",
        {
         token: s.token,
    id: categoriaEditandoId,
    nome: nome,
    idadeMaxima: idadeMaxima,
    documentosObrigatorios: documentosObrigatorios,
    local: categoriaLocal,
    evento: EVENTO_ATUAL
  }
      );


      fecharModal_(
        "categoryModal"
      );

      window.categoriaEditandoId =
        null;

      await carregarConfiguracoes_();

      notificar(
        "success",
        "CATEGORIA ATUALIZADA",
        "A categoria foi alterada com sucesso."
      );

    }


    /* =================================================
       CRIAR
       ================================================= */

    else {

    await apiPost(
  "criarCategoria",
  {
    token: s.token,
    nome: nome,
    idadeMaxima: idadeMaxima,
    documentosObrigatorios: documentosObrigatorios,
    local: categoriaLocal,
    evento: EVENTO_ATUAL
  }
);


      fecharModal_(
        "categoryModal"
      );

      await carregarConfiguracoes_();

      notificar(
        "success",
        "CATEGORIA CRIADA",
        "A categoria foi cadastrada com sucesso."
      );

    }

  } catch (err) {

    mostrarErroConfig_(
      "categoryError",
      err.message
    );

  } finally {

    btn.disabled = false;

    btn.textContent =
      categoriaEditandoId
        ? "SALVAR ALTERAÇÕES"
        : "CRIAR CATEGORIA";
  }

});

async function alterarStatusCadastro_(tipo, id, ativo) {
  const s = getSession();
  if (!s?.token) return showLogin();
  try {
    if (tipo === "categoria") {
await apiPost(
  "alterarStatusCategoria",
  {
    token: s.token,
    id,
    ativo,
    evento: EVENTO_ATUAL
  }
);
    } else {
      await apiPost("alterarStatusLote", {
  token: s.token,
  id,
  ativo,
  evento: EVENTO_ATUAL
});
    }
    await carregarConfiguracoes_();
    notificar("success", "STATUS ATUALIZADO", `${tipo === "categoria" ? "Categoria" : "Lote"} ${ativo ? "ativado" : "desativado"} com sucesso.`);
  } catch (err) {
    notificar("error", "ERRO AO ALTERAR STATUS", err.message);
  }
}
/* =====================================================
   ABRIR EDIÇÃO DE CATEGORIA
   ===================================================== */

function abrirEdicaoCategoria_(id) {

  const categoria =
    categoriasConfig.find(
      c =>
        String(c.id) ===
        String(id)
    );

  if (!categoria) {

    notificar(
      "error",
      "CATEGORIA NÃO ENCONTRADA",
      "Não foi possível localizar a categoria."
    );

    return;
  }

  /* Guarda o ID que está sendo editado */

  window.categoriaEditandoId =
    categoria.id;


  /* Preenche os campos */

  const nome =
    document.getElementById(
      "categoryNome"
    );

  const idade =
    document.getElementById(
      "categoryIdadeMaxima"
    );

  if (nome) {

    nome.value =
      categoria.nome || "";

  }

  if (idade) {

    idade.value =
      categoria.idadeMaxima ?? "";

  }

  preencherDocumentosCategoria_(
    categoria.documentosObrigatorios || []
  );
  const categoriaLocal = document.getElementById("categoryLocal");
  if (categoriaLocal) categoriaLocal.checked = categoria.local === true;
  sincronizarComprovanteCategoriaLocal_();


  /* Altera o título */

  const titulo =
    document.getElementById(
      "categoryModalTitle"
    );

  if (titulo) {

    titulo.textContent =
      "Editar categoria";

  }


  /* Altera o botão */

  const salvar =
    document.getElementById(
      "saveCategory"
    );

  if (salvar) {

    salvar.textContent =
      "SALVAR ALTERAÇÕES";

  }


  /* Limpa mensagem anterior */

  const erro =
    document.getElementById(
      "categoryError"
    );

  if (erro) {

    erro.hidden =
      true;

    erro.textContent =
      "";

  }


  /* Abre o mesmo modal */

  abrirModal_(
    "categoryModal"
  );
}

/* =====================================================
   ABRIR EXCLUSÃO DE CATEGORIA
   ===================================================== */

function abrirExclusaoCategoria_(id) {

  const categoria =
    categoriasConfig.find(
      c =>
        String(c.id) ===
        String(id)
    );

  if (!categoria) {

    notificar(
      "error",
      "CATEGORIA NÃO ENCONTRADA",
      "Não foi possível localizar a categoria."
    );

    return;
  }


  window.categoriaExcluindoId =
    categoria.id;


  const mensagem =
    document.getElementById(
      "deleteCategoryMessage"
    );

  if (mensagem) {

    mensagem.innerHTML =
      `Você está prestes a excluir a categoria <strong>${esc(categoria.nome)}</strong>.<br>` +
      `<strong>Esta ação não poderá ser desfeita.</strong>`;

  }


  abrirModal_(
    "deleteCategoryModal"
  );
}
/* =====================================================
   FECHAR MODAL DE EXCLUSÃO DE CATEGORIA
   ===================================================== */

document
  .getElementById("closeDeleteCategoryModal")
  ?.addEventListener("click", () => {

    fecharModal_(
      "deleteCategoryModal"
    );

    window.categoriaExcluindoId =
      null;
  });


document
  .getElementById("cancelDeleteCategory")
  ?.addEventListener("click", () => {

    fecharModal_(
      "deleteCategoryModal"
    );

    window.categoriaExcluindoId =
      null;
  });

document.getElementById("categoriesList")?.addEventListener("click", e => {

  /* =============================================
     EDITAR CATEGORIA
     ============================================= */

  const btnEditar =
    e.target.closest(
      ".category-edit"
    );

  if (btnEditar) {

    abrirEdicaoCategoria_(
      btnEditar.dataset.id
    );

    return;
  }


  /* =============================================
     EXCLUIR CATEGORIA
     ============================================= */

  const btnExcluir =
    e.target.closest(
      ".category-delete"
    );

  if (btnExcluir) {

    abrirExclusaoCategoria_(
      btnExcluir.dataset.id
    );

    return;
  }


  /* =============================================
     ATIVAR / DESATIVAR CATEGORIA
     ============================================= */

  const btn =
    e.target.closest(
      ".category-toggle"
    );

  if (!btn) {
    return;
  }

  alterarStatusCadastro_(
    "categoria",
    btn.dataset.id,
    btn.dataset.active !== "true"
  );

});
document.getElementById("lotsList")?.addEventListener("click", e => {
  const btn = e.target.closest(".lot-toggle");
  if (!btn) return;
  alterarStatusCadastro_("lote", btn.dataset.id, btn.dataset.active !== "true");
});

/* =====================================================
   CONFIRMAR EXCLUSÃO DE CATEGORIA
   ===================================================== */

document
  .getElementById("confirmDeleteCategory")
  ?.addEventListener("click", async () => {

    const id =
      window.categoriaExcluindoId;

    if (!id) {

      notificar(
        "error",
        "CATEGORIA NÃO INFORMADA",
        "Não foi possível identificar a categoria."
      );

      return;
    }

    const s =
      getSession();

    if (!s?.token) {

      fecharModal_(
        "deleteCategoryModal"
      );

      return showLogin();
    }


    const btn =
      document.getElementById(
        "confirmDeleteCategory"
      );

    btn.disabled = true;

    btn.textContent =
      "EXCLUINDO...";


    try {

      await apiPost(
  "excluirCategoria",
  {
    token: s.token,
    id: id,
    evento: EVENTO_ATUAL
  }
);


      fecharModal_(
        "deleteCategoryModal"
      );

      window.categoriaExcluindoId =
        null;


      await carregarConfiguracoes_();


      notificar(
        "success",
        "CATEGORIA EXCLUÍDA",
        "A categoria foi excluída com sucesso."
      );


    } catch (err) {

      console.error(
        err
      );

      notificar(
        "error",
        "ERRO AO EXCLUIR CATEGORIA",
        err.message ||
        "Não foi possível excluir a categoria."
      );

    } finally {

      btn.disabled = false;

      btn.textContent =
        "EXCLUIR CATEGORIA";
    }

  });


document.getElementById("lotsList")?.addEventListener("click", async e => {

  /* =============================================
     EDITAR LOTE
     ============================================= */

  const btnEditar =
    e.target.closest(
      ".lot-edit"
    );

  if (btnEditar) {

    abrirEdicaoLote_(
      btnEditar.dataset.id
    );

    return;
  }


  /* =============================================
     EXCLUIR LOTE
     ============================================= */

  const btnExcluir =
    e.target.closest(
      ".lot-delete"
    );

  if (!btnExcluir) {
    return;
  }

  const loteId =
    btnExcluir.dataset.id;

  const lote =
    lotesConfig.find(
      l =>
        String(l.id) ===
        String(loteId)
    );

  const mensagem =
    document.getElementById(
      "deleteLotMessage"
    );

  if (mensagem) {

    mensagem.innerHTML =
      lote
        ? `Você está prestes a excluir o lote <strong>${esc(lote.nome)}</strong>.<br><strong>Esta ação não poderá ser desfeita.</strong>`
        : "Esta ação não poderá ser desfeita.";
  }

  window.loteExclusaoId =
    loteId;

  abrirModal_(
    "deleteLotModal"
  );

  return;
});

document
  .getElementById("confirmDeleteLot")
  ?.addEventListener(
    "click",
    async () => {

      const loteId =
        window.loteExclusaoId;

      if (!loteId) {
        return;
      }

      const btn =
        document.getElementById(
          "confirmDeleteLot"
        );

      const erro =
        document.getElementById(
          "deleteLotError"
        );

      try {

        const s =
          getSession();

        if (!s?.token) {

          throw new Error(
            "Sessão não encontrada."
          );
        }

        btn.disabled = true;
        btn.textContent =
          "EXCLUINDO...";

        if (erro) {
          erro.hidden = true;
        }

        await apiPost(
          "excluirLote",
          {
            token: s.token,
  id: loteId,
  evento: EVENTO_ATUAL
          }
        );

        fecharModal_(
          "deleteLotModal"
        );

        window.loteExclusaoId =
          null;

        renderLotesConfig_();

        notificar(
          "success",
          "LOTE EXCLUÍDO",
          "O lote foi excluído com sucesso."
        );

      } catch (err) {

        console.error(err);

        if (erro) {

          erro.textContent =
            err.message ||
            "Erro ao excluir o lote.";

          erro.hidden = false;

        } else {

          notificar(
            "error",
            "ERRO AO EXCLUIR",
            err.message ||
            "Erro ao excluir o lote."
          );
        }

      } finally {

        btn.disabled = false;
        btn.textContent =
          "EXCLUIR LOTE";
      }

    }
  );

  document
  .getElementById("cancelDeleteLot")
  ?.addEventListener(
    "click",
    () => {

      window.loteExclusaoId =
        null;

      fecharModal_(
        "deleteLotModal"
      );

    }
  );

  document
  .getElementById("closeDeleteLotModal")
  ?.addEventListener(
    "click",
    () => {

      window.loteExclusaoId =
        null;

      fecharModal_(
        "deleteLotModal"
      );

    }
  );
// =====================================================
// CORTESIA E PREÇO AUTOMÁTICO - NOVA INSCRIÇÃO
// =====================================================
const newCortesia = document.getElementById("newCortesia");
const newValor = document.getElementById("newValor");
newCortesia?.addEventListener("change", atualizarValorCadastroAdmin_);

// ============================================================
// CADASTRO ADMINISTRATIVO: ESTADO → CIDADE (cidades.json)
// Mantém o mesmo comportamento do formulário público.
// ============================================================
async function inicializarEstadoCidadeCadastroAdmin_() {
  const estadoSelect = document.getElementById("newEstado");
  const cidadeSelect = document.getElementById("newCidade");
  if (!estadoSelect || !cidadeSelect) return;

  const listaEstadosAdmin = {
    AC: "Acre", AL: "Alagoas", AP: "Amapá", AM: "Amazonas", BA: "Bahia",
    CE: "Ceará", DF: "Distrito Federal", ES: "Espírito Santo", GO: "Goiás",
    MA: "Maranhão", MT: "Mato Grosso", MS: "Mato Grosso do Sul", MG: "Minas Gerais",
    PA: "Pará", PB: "Paraíba", PR: "Paraná", PE: "Pernambuco", PI: "Piauí",
    RJ: "Rio de Janeiro", RN: "Rio Grande do Norte", RS: "Rio Grande do Sul",
    RO: "Rondônia", RR: "Roraima", SC: "Santa Catarina", SP: "São Paulo",
    SE: "Sergipe", TO: "Tocantins"
  };

  estadoSelect.innerHTML = '<option value="">Selecione o estado</option>';
  Object.entries(listaEstadosAdmin)
    .sort((a, b) => a[1].localeCompare(b[1], "pt-BR"))
    .forEach(([uf, nome]) => {
      const option = document.createElement("option");
      option.value = uf;
      option.textContent = `${uf} - ${nome}`;
      estadoSelect.appendChild(option);
    });

  cidadeSelect.disabled = true;
  cidadeSelect.innerHTML = '<option value="">Selecione primeiro o estado</option>';
  let cidadesPorEstado = null;

  estadoSelect.addEventListener("change", async () => {
    const uf = estadoSelect.value;
    cidadeSelect.disabled = true;
    cidadeSelect.innerHTML = '<option value="">Carregando cidades...</option>';
    if (!uf) {
      cidadeSelect.innerHTML = '<option value="">Selecione primeiro o estado</option>';
      return;
    }
    try {
      if (!cidadesPorEstado) {
        const resposta = await fetch("cidades.json");
        if (!resposta.ok) throw new Error("Não foi possível carregar cidades.json");
        cidadesPorEstado = await resposta.json();
      }
      cidadeSelect.innerHTML = '<option value="">Selecione a cidade</option>';
      (cidadesPorEstado[uf] || [])
        .slice()
        .sort((a, b) => a.localeCompare(b, "pt-BR"))
        .forEach(nomeCidade => {
          const option = document.createElement("option");
          option.value = nomeCidade;
          option.textContent = nomeCidade;
          cidadeSelect.appendChild(option);
        });
      cidadeSelect.disabled = false;
    } catch (erro) {
      console.error("Erro ao carregar cidades do cadastro administrativo:", erro);
      cidadeSelect.innerHTML = '<option value="">Erro ao carregar cidades</option>';
    }
  });
}

inicializarEstadoCidadeCadastroAdmin_();

registrationForm?.addEventListener("submit", async e => {
  e.preventDefault();

  const s = getSession();

  if (!s?.token) {
    showLogin();
    return;
  }

  const saveBtn = document.getElementById("saveRegistration");

const payload = {
  token: s.token,
  nome: document.getElementById("newNome").value.trim(),
  cpf: document.getElementById("newCpf").value.trim(),
  email: document.getElementById("newEmail").value.trim(),
  telefone: document.getElementById("newTelefone").value.trim(),
  dataNascimento: document.getElementById("newDataNascimento")?.value || "",
  cidade: document.getElementById("newCidade")?.value.trim() || "",
  estado: document.getElementById("newEstado")?.value.trim().toUpperCase() || "",
  categoria: document.getElementById("newCategoria").value,
  valor: document.getElementById("newValor").value,
  observacao: document.getElementById("newObservacao").value.trim(),
  evento: EVENTO_ATUAL,
  cortesia:
    document.getElementById("newCortesia")?.checked || false
};

  const categoriaSelecionada = categoriasConfig.find(c => c.nome === payload.categoria);
  const documentosObrigatorios = Array.isArray(categoriaSelecionada?.documentosObrigatorios) ? categoriaSelecionada.documentosObrigatorios : [];
  payload.documentos = [];
  for (const tipo of documentosObrigatorios) {
    const input = document.getElementById(`registrationDoc-${tipo}`);
    const file = input?.files?.[0];
    if (!file) {
      registrationError.textContent = `Anexe o documento obrigatório: ${{RG:"RG",CPF:"CPF",CERTIDAO:"Certidão",COMPROVANTE_RESIDENCIA:"Comprovante de residência"}[tipo] || tipo}.`;
      registrationError.hidden = false;
      input?.focus();
      return;
    }
    const permitidos = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
    if (file.size > 5 * 1024 * 1024 || (file.type && !permitidos.includes(file.type))) {
      registrationError.textContent = `O arquivo de ${tipo} deve ser PDF, JPG, PNG ou WEBP e ter até 5 MB.`;
      registrationError.hidden = false;
      input?.focus();
      return;
    }
    payload.documentos.push({ tipo, nome: file.name, mimeType: file.type || "application/octet-stream", arquivoBase64: await bytesToBase64(file) });
  }

  if (!payload.nome || !payload.cpf || !payload.email || !payload.categoria) {
    registrationError.textContent = "Preencha os campos obrigatórios.";
    registrationError.hidden = false;
    return;
  }

  if (!validarCpfCadastro_(payload.cpf)) {
    registrationError.textContent = "CPF inválido. Informe um CPF válido com 11 dígitos.";
    registrationError.hidden = false;
    document.getElementById("newCpf")?.focus();
    return;
  }

  saveBtn.disabled = true;
  saveBtn.textContent = "CADASTRANDO...";
  registrationError.hidden = true;

  try {
    const criada = await apiPost("cadastrarInscricao", payload);

    fecharModalCadastro();

    notificar(
      "success",
      "INSCRIÇÃO CADASTRADA",
      `Inscrição #${String(criada.numeroInscricao).padStart(3, "0")} criada com sucesso.${criada.checkoutUrl ? " Checkout InfinitePay gerado." : (criada.avisoCheckout ? " Atenção: não foi possível gerar o checkout; gere pelo modal Ver detalhes." : "")}`
    );

    await carregarInscricoes();
    await carregarDashboard();

  } catch (err) {
    registrationError.textContent =
      err.message || "Não foi possível cadastrar a inscrição.";
    registrationError.hidden = false;

    notificar(
      "error",
      "ERRO AO CADASTRAR",
      err.message || "Não foi possível cadastrar a inscrição."
    );
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = "CADASTRAR INSCRIÇÃO";
  }
});


/* =====================================================
   MODAL DE DETALHES
   ===================================================== */

const detailModal =
  document.getElementById("detailModal");

const detailLoading =
  document.getElementById("detailLoading");

const detailContent =
  document.getElementById("detailContent");

const fileUpload =
  document.getElementById("fileUpload");


function abrirModalDetalhes() {

  detailModal.hidden = false;

  document.body.classList.add(
    "modal-open"
  );
}


function fecharModalDetalhes() {

  detailModal.hidden = true;

  document.body.classList.remove(
    "modal-open"
  );

  if (fileUpload) {
    fileUpload.value = "";
  }
}


document
  .getElementById("closeDetail")
  .onclick =
    fecharModalDetalhes;


detailModal.addEventListener(
  "click",
  e => {

    if (e.target === detailModal) {
      fecharModalDetalhes();
    }
  }
);


document.addEventListener(
  "keydown",
  e => {

    if (
      e.key === "Escape" &&
      !detailModal.hidden
    ) {
      fecharModalDetalhes();
    }
  }
);


/* =====================================================
   ABRIR DETALHES
   ===================================================== */

async function detalhes(id) {

  const s =
    getSession();

  if (!s?.token) {
    return;
  }

  abrirModalDetalhes();

  detailLoading.hidden = false;

  detailContent.hidden = true;

  document
    .getElementById("detailTitle")
    .textContent =
      "#" +
      String(id).padStart(3, "0");

  try {

   const x =
  await apiGet(
    "inscricao",
    {
      token: s.token,
      id,
      evento: EVENTO_ATUAL
    }
  );

    inscricaoAtual = x;

    preencherDetalhes(x);

    detailLoading.hidden = true;

    detailContent.hidden = false;

  } catch (e) {

    detailLoading.textContent =
      e.message ||
      "Não foi possível carregar a inscrição.";
  }
}


function valor(
  x,
  ...keys
) {

  for (const k of keys) {

    if (
      x?.[k] !== undefined &&
      x?.[k] !== null &&
      String(x[k]).trim() !== ""
    ) {
      return x[k];
    }
  }

  return "—";
}
function formatarDataNascimento_(data) {

  if (!data) {
    return "—";
  }

  const texto =
    String(data).trim();

  // Data ISO: 1993-12-17T02:00:00.000Z
  if (
    /^\d{4}-\d{2}-\d{2}T/.test(texto)
  ) {

    const partes =
      texto.substring(0, 10).split("-");

    return (
      partes[2] +
      "/" +
      partes[1] +
      "/" +
      partes[0]
    );
  }

  // Data simples: 1993-12-17
  if (
    /^\d{4}-\d{2}-\d{2}$/.test(texto)
  ) {

    const partes =
      texto.split("-");

    return (
      partes[2] +
      "/" +
      partes[1] +
      "/" +
      partes[0]
    );
  }

  // Já está em DD/MM/AAAA
  if (
    /^\d{2}\/\d{2}\/\d{4}$/.test(texto)
  ) {
    return texto;
  }

  return texto;
}
function preencherDetalhes(x) {

  const n =
    valor(
      x,
      "numeroInscricao",
      "numero"
    );

  document
    .getElementById("detailTitle")
    .textContent =
      "#" +
      String(n).padStart(3, "0");

  document
    .getElementById("dNome")
    .textContent =
      valor(x, "nome", "atleta");

  document
    .getElementById("dCpf")
    .textContent =
      valor(x, "cpf");

  document
    .getElementById("dCategoria")
    .textContent =
      valor(x, "categoria");

 const nascimento =
  valor(
    x,
    "dataNascimento",
    "nascimento"
  );

document
  .getElementById("dNascimento")
  .textContent =
    nascimento !== "—"
      ? nascimento.substring(0, 10).split("-").reverse().join("/")
      : "—";

  const cidadeDetalhe = valor(x, "cidade");
  const estadoDetalhe = valor(x, "estado");
  document
    .getElementById("dCidade")
    .textContent =
      cidadeDetalhe !== "—" && estadoDetalhe !== "—"
        ? `${cidadeDetalhe} - ${estadoDetalhe}`
        : cidadeDetalhe;

  document
    .getElementById("dEmail")
    .textContent =
      valor(x, "email");

  document
    .getElementById("dTelefone")
    .textContent =
      valor(
        x,
        "telefone",
        "whatsapp"
      );

  document
    .getElementById("dEmergencia")
    .textContent =
      valor(
        x,
        "contatoEmergencia",
        "emergencia"
      );

  const pag =
    valor(x, "pagamento") ||
    "Pendente";

  const stat =
    valor(
      x,
      "statusInscricao",
      "status"
    ) ||
    "Pendente";

  const p =
    document.getElementById(
      "dPagamento"
    );

  const st =
    document.getElementById(
      "dStatus"
    );

  p.textContent = pag;
  p.className =
    "pill " +
    classe(pag);

  st.textContent = stat;
  st.className =
    "pill " +
    classe(stat);

  const setDetail = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.textContent = value == null || String(value).trim() === "" ? "—" : String(value);
  };

  setDetail("dValor", moeda(Number(x.valor || 0)));
  setDetail("dDataInscricao", valor(x, "dataInscricao"));
  setDetail("dOrderNsu", valor(x, "orderNsu", "order_nsu"));
  setDetail("dFormaPagamento", valor(x, "formaPagamento", "forma_pagamento"));
  setDetail("dTransactionNsu", valor(x, "transactionNsu", "transaction_nsu"));
  setDetail("dDataPagamento", valor(x, "dataPagamento", "data_pagamento"));
  setDetail("dObservacao", valor(x, "observacao"));

  const checkoutUrl = valor(x, "checkoutUrl", "checkout_url");
  const checkoutEl = document.getElementById("dCheckoutUrl");
  if (checkoutEl) {
    checkoutEl.innerHTML = checkoutUrl !== "—"
      ? `<a href="${esc(checkoutUrl)}" target="_blank" rel="noopener noreferrer">ABRIR CHECKOUT</a> <button type="button" class="action" onclick="copiarCheckoutInscricao_('${esc(checkoutUrl)}')">COPIAR LINK</button>`
      : (String(valor(x,"pagamento")).toUpperCase() !== "PAGO" && Number(x.valor || 0) > 0
          ? `<button type="button" class="action" onclick="gerarCheckoutInscricao_('${esc(valor(x,"id"))}','${esc(valor(x,"evento") || EVENTO_ATUAL)}')">GERAR CHECKOUT</button>`
          : "—");
  }

  const receiptUrl = valor(x, "comprovanteUrl", "receiptUrl", "receipt_url");
  const receiptEl = document.getElementById("dComprovante");
  if (receiptEl) {
    receiptEl.innerHTML = receiptUrl !== "—"
      ? `<a href="${esc(receiptUrl)}" target="_blank" rel="noopener noreferrer" class="action">🧾 VER COMPROVANTE</a>`
      : "—";
  }

  const validateBtn =
    document.getElementById("validateAction");

  if (validateBtn) {
    const pago =
      String(pag).trim().toLowerCase() === "pago";

    const confirmado =
      String(stat).trim().toLowerCase() === "confirmado";

    const arquivos =
      Array.isArray(x.arquivos)
        ? x.arquivos
        : (Array.isArray(x.documentos) ? x.documentos : []);

    const temComprovante = arquivos.length > 0;

    validateBtn.disabled =
      confirmado || !pago || !temComprovante;

    validateBtn.textContent =
      confirmado
        ? "INSCRIÇÃO VALIDADA ✓"
        : "VALIDAR INSCRIÇÃO";

    validateBtn.title =
      confirmado
        ? "Esta inscrição já está confirmada."
        : !pago
          ? "A inscrição só pode ser validada quando o pagamento estiver como Pago."
          : !temComprovante
            ? "Anexe pelo menos um comprovante antes de validar a inscrição."
            : "Pagamento e comprovante identificados. Clique para confirmar a inscrição.";
  }

  // ALTERAR STATUS só fica disponível para inscrições já
  // Confirmadas ou Canceladas. Inscrições Pendentes seguem
  // o fluxo de pagamento + comprovante + validação.
  const statusBtn = document.getElementById("statusAction");
  if (statusBtn) {
    const statusNormalizado = String(stat).trim().toLowerCase();
    const podeAlterarStatus =
      statusNormalizado === "confirmado" ||
      statusNormalizado === "cancelado";

    statusBtn.disabled = !podeAlterarStatus;
    statusBtn.title = podeAlterarStatus
      ? "Alterar o status entre Confirmado e Cancelado."
      : "O status só pode ser alterado depois que a inscrição for Confirmada ou Cancelada.";
  }

  renderFiles(
    x.arquivos ||
    x.documentos ||
    []
  );
}


/* =====================================================
   LISTA DE ARQUIVOS
   ===================================================== */

function renderFiles(files) {

  const list =
    document.getElementById("fileList");

  if (
    !Array.isArray(files) ||
    !files.length
  ) {

    list.innerHTML =
      `
        <div class="empty-files">
          Nenhum arquivo vinculado.
        </div>
      `;

    return;
  }

  const sessao = getSession();
  const token = sessao?.token || "";
  const inscricaoId =
    inscricaoAtual
      ? valor(
          inscricaoAtual,
          "numeroInscricao",
          "numero"
        )
      : "";

  list.innerHTML =
    files.map(f => {

      const nome =
        esc(
          f.nome ||
          f.name ||
          "Arquivo"
        );

      const fileId =
        f.fileId ||
        f.id ||
        "";

      const tipo =
        String(
          f.tipo ||
          f.mimeType ||
          ""
        )
          .split("/")
          .pop()
          .toUpperCase();

      const urlBase = f.url || (!f.viaWorker && fileId && token && inscricaoId
        ? API_URL + "?action=arquivo&token=" + encodeURIComponent(token) + "&fileId=" + encodeURIComponent(fileId) + "&inscricaoId=" + encodeURIComponent(inscricaoId)
        : "");
      const viaWorker = Boolean(f.viaWorker && fileId && token);

      // O mesmo número pode existir nos dois eventos; a rota deve saber qual consultar.
      const urlArquivo = urlBase
        ? (() => {
            const u = new URL(urlBase);
            u.searchParams.set("evento", EVENTO_ATUAL);
            return u.href;
          })()
        : "";

      const urlVisualizar = urlArquivo ? urlArquivo + "&modo=visualizar" : "";
      const urlBaixar = urlArquivo ? urlArquivo + "&modo=baixar" : "";

      return `

        <div class="file-item">

          <div class="file-meta">

            <div class="file-icon">
              ${esc(tipo || "DOC")}
            </div>

            <div>

              <b title="${nome}">
                ${nome}
              </b>

              <small>
                Documento da inscrição
              </small>

            </div>

          </div>

          ${
            viaWorker
              ? `<div class="file-actions"><button type="button" class="file-open registration-file-open" data-file-id="${esc(fileId)}" data-file-action="view">VISUALIZAR</button><button type="button" class="file-open registration-file-open" data-file-id="${esc(fileId)}" data-file-action="download">BAIXAR ↓</button></div>`
              : urlBase
                ? `<div class="file-actions"><a class="file-open file-view" href="${esc(urlVisualizar)}">VISUALIZAR</a><a class="file-open file-download" href="${esc(urlBaixar)}" target="_blank" rel="noopener noreferrer">BAIXAR ↓</a></div>`
                : `<span class="file-open">SEM LINK</span>`
          }

        </div>

      `;

    }).join("");
}

/* Visualização/Download de documentos novos via Worker, com sessão Cloudflare. */
document.addEventListener("click", async function (event) {
  const button = event.target.closest(".registration-file-open");
  if (!button) return;
  const session = getSession();
  if (!session?.token || !inscricaoAtual) return;
  const fileId = button.dataset.fileId;
  const action = button.dataset.fileAction;
  const oldText = button.textContent;
  button.disabled = true; button.textContent = "CARREGANDO...";
  try {
    const params = new URLSearchParams({ token: session.token, fileId, evento: EVENTO_ATUAL });
    const response = await fetch(`${WORKER_API_URL}/admin/registration-file?${params.toString()}`);
    if (!response.ok) { let msg = "Não foi possível obter o documento."; try { msg = (await response.json()).mensagem || msg; } catch (_) {} throw new Error(msg); }
    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    if (action === "download") {
      const a = document.createElement("a"); a.href = objectUrl; a.download = button.closest(".file-item")?.querySelector("b")?.textContent || "documento"; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(objectUrl), 1500);
    } else {
      let modal = document.getElementById("filePreviewModal");
      if (!modal) {
        modal = document.createElement("div"); modal.id = "filePreviewModal"; modal.className = "file-preview-modal";
        modal.setAttribute("role", "dialog"); modal.setAttribute("aria-modal", "true");
        modal.innerHTML = '<div class="file-preview-panel"><button type="button" class="file-preview-close" aria-label="Fechar visualização">FECHAR ×</button><div class="file-preview-content"></div></div>';
        document.body.appendChild(modal);
        modal.addEventListener("click", e => { if (e.target === modal || e.target.closest(".file-preview-close")) fecharVisualizacaoArquivo_(); });
      }
      const content = modal.querySelector(".file-preview-content");
      if (modal.dataset.objectUrl) URL.revokeObjectURL(modal.dataset.objectUrl);
      modal.dataset.objectUrl = objectUrl; content.replaceChildren();
      const preview = document.createElement(blob.type.startsWith("image/") ? "img" : "iframe"); preview.className = "file-preview-frame"; preview.src = objectUrl; preview.title = "Documento da inscrição"; content.appendChild(preview); modal.hidden = false;
    }
  } catch (error) { notificar("error", "ERRO NO DOCUMENTO", error.message || "Não foi possível abrir o arquivo."); }
  finally { button.disabled = false; button.textContent = oldText; }
});

/* Visualização dos documentos sem sair da inscrição. */
document.addEventListener("click", function (event) {
  const link = event.target.closest(".file-view");
  if (!link) return;
  event.preventDefault();

  let modal = document.getElementById("filePreviewModal");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "filePreviewModal";
    modal.className = "file-preview-modal";
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    modal.setAttribute("aria-label", "Visualização do documento");
    modal.innerHTML = '<div class="file-preview-panel"><button type="button" class="file-preview-close" aria-label="Fechar visualização">FECHAR ×</button><div class="file-preview-content">Carregando documento...</div></div>';
    document.body.appendChild(modal);
    modal.addEventListener("click", function (e) {
      if (e.target === modal || e.target.closest(".file-preview-close")) {
        fecharVisualizacaoArquivo_();
      }
    });
  }
  const content = modal.querySelector(".file-preview-content");
  if (modal.dataset.objectUrl) URL.revokeObjectURL(modal.dataset.objectUrl);
  delete modal.dataset.objectUrl;
  content.textContent = "Carregando documento...";
  modal.hidden = false;
  modal.querySelector("button").focus();

  const callbackName = "filePreviewCallback_" + Date.now() + "_" + Math.random().toString(36).slice(2);
  const script = document.createElement("script");
  const timer = setTimeout(function () {
    if (modal.dataset.callback === callbackName) content.textContent = "Não foi possível carregar o documento.";
    cleanup();
  }, 30000);
  function cleanup() {
    clearTimeout(timer);
    script.remove();
    delete window[callbackName];
  }
  modal.dataset.callback = callbackName;
  window[callbackName] = function (data) {
    cleanup();
    if (modal.hidden || modal.dataset.callback !== callbackName) return;
    try {
      const bytes = Uint8Array.from(atob(data.base64), c => c.charCodeAt(0));
      const objectUrl = URL.createObjectURL(new Blob([bytes], { type: data.mimeType }));
      modal.dataset.objectUrl = objectUrl;
      content.replaceChildren();
      const preview = document.createElement(data.mimeType.startsWith("image/") ? "img" : "iframe");
      preview.className = "file-preview-frame";
      preview.title = data.nome || "Documento da inscrição";
      preview.src = objectUrl;
      content.appendChild(preview);
    } catch (error) {
      content.textContent = "Não foi possível exibir o documento.";
    }
  };
  script.onerror = function () {
    if (modal.dataset.callback === callbackName) content.textContent = "Falha ao acessar o comprovante. Confira a sessão e a implantação do Apps Script.";
    cleanup();
  };
  script.onload = function () {
    if (window[callbackName] && modal.dataset.callback === callbackName) {
      content.textContent = "O Apps Script não retornou o arquivo. Publique a versão atualizada do backend e tente novamente.";
      cleanup();
    }
  };
  const url = new URL(link.href);
  url.searchParams.set("modo", "dados");
  url.searchParams.set("callback", callbackName);
  script.src = url.href;
  document.head.appendChild(script);
});

function fecharVisualizacaoArquivo_() {
  const modal = document.getElementById("filePreviewModal");
  if (!modal || modal.hidden) return;
  modal.hidden = true;
  modal.querySelector(".file-preview-content").replaceChildren();
  if (modal.dataset.objectUrl) URL.revokeObjectURL(modal.dataset.objectUrl);
  delete modal.dataset.objectUrl;
  delete modal.dataset.callback;
}

document.addEventListener("keydown", function (event) {
  if (event.key === "Escape") fecharVisualizacaoArquivo_();
});

/* =====================================================
   CONVERTER ARQUIVO PARA BASE64
   ===================================================== */

function bytesToBase64(file) {

  return new Promise(
    (resolve, reject) => {

      const reader =
        new FileReader();

      reader.onload =
        () =>
          resolve(
            String(reader.result)
              .split(",")[1]
          );

      reader.onerror = reject;

      reader.readAsDataURL(file);
    }
  );
}


/* =====================================================
   UPLOAD DE ARQUIVO - V4
   ===================================================== */

fileUpload?.addEventListener(
  "change",
  async () => {

    const file =
      fileUpload.files?.[0];

    const s =
      getSession();

    if (
      !file ||
      !s?.token ||
      !inscricaoAtual
    ) {
      return;
    }


    /* -------------------------------
       VALIDAÇÃO DE TAMANHO
       ------------------------------- */

    if (
      file.size >
      5 * 1024 * 1024
    ) {

      notificar(
        "warning",
        "ARQUIVO MUITO GRANDE",
        "Envie um arquivo de até 5 MB."
      );

      fileUpload.value = "";

      return;
    }


    /* -------------------------------
       VALIDAÇÃO DE FORMATO
       ------------------------------- */

    const allowed = [

      "application/pdf",

      "image/jpeg",

      "image/png",

      "image/webp"

    ];

    if (
      file.type &&
      !allowed.includes(file.type)
    ) {

      notificar(
        "warning",
        "FORMATO NÃO PERMITIDO",
        "Use PDF, JPG, PNG ou WEBP."
      );

      fileUpload.value = "";

      return;
    }


    const btn =
      document.querySelector(
        ".upload-btn"
      );

    const old =
      btn.textContent;


    btn.textContent =
      "ENVIANDO...";

    btn.style.pointerEvents =
      "none";


    try {

      const base64 =
        await bytesToBase64(file);

      const id =
        valor(
          inscricaoAtual,
          "numeroInscricao",
          "numero"
        );


      await apiPost(
        "uploadArquivo",
        {

          token: s.token,

          id: id,

          nome: file.name,

          mimeType:
            file.type ||
            "application/octet-stream",

          arquivoBase64:
            base64
        }
      );

      // Regra de negócio: comprovante anexado = pagamento Pago.
      // Fazemos a chamada também no frontend para manter o comportamento
      // correto mesmo se o Web App publicado ainda estiver com a versão
      // anterior do endpoint de upload. O backend atualizado continua
      // validando que existe comprovante antes de aceitar Pago.
      await apiPost(
        "alterarPagamento",
        {
          token: s.token,
          id: id,
          pagamento: "Pago"
        }
      );


      /* -----------------------------
         ATUALIZA DETALHES
         ----------------------------- */

      const refreshed =
        await apiGet(
          "inscricao",
          {
            token: s.token,
            id
          }
        );

      inscricaoAtual =
        refreshed;

      preencherDetalhes(
        refreshed
      );


      const numero =
        "#" +
        String(id).padStart(3, "0");

      const atleta =
        valor(
          refreshed,
          "nome",
          "atleta"
        );


      /* -----------------------------
         NOTIFICAÇÃO BONITA
         ----------------------------- */

      notificar(
        "success",
        "ARQUIVO ENVIADO ✓",
        `Comprovante salvo com sucesso na inscrição ${numero} de ${atleta}.`
      );


    } catch (e) {

      console.error(e);

      notificar(
        "error",
        "ERRO NO ENVIO",
        e.message ||
        "Não foi possível enviar o arquivo. Tente novamente."
      );

    } finally {

      btn.textContent = old;

      btn.style.pointerEvents = "";

      fileUpload.value = "";
    }
  }
);


/* =====================================================
   AÇÕES DO MODAL
   ===================================================== */

// ALTERAR PAGAMENTO no modal de detalhes.
// Usa onclick direto e uma função global para evitar perda do handler
// em recarregamentos/versões antigas do DOM.
async function abrirAlteracaoPagamento() {
  try {
    if (!inscricaoAtual) {
      notificar('warning', 'INSCRIÇÃO NÃO CARREGADA', 'Abra os detalhes da inscrição novamente.');
      return;
    }

    const id = valor(inscricaoAtual, 'numeroInscricao', 'numero');
    if (!id) {
      notificar('error', 'INSCRIÇÃO INVÁLIDA', 'Não foi possível identificar o número da inscrição.');
      return;
    }

    const atual = String(inscricaoAtual.pagamento || 'Pendente');

  abrirSeletorStatus_(
    'Alterar pagamento',
    atual,
    ['Pendente', 'Cancelado'],
    async novoPagamento => {
      const s = getSession();
      if (!s?.token) {
        showLogin();
        throw new Error('Sessão expirada.');
      }

      await apiPost('alterarPagamento', {
        token: s.token,
        id,
        pagamento: novoPagamento
      });

      const refreshed = await apiGet('inscricao', { token: s.token, id });
      inscricaoAtual = refreshed;
      preencherDetalhes(refreshed);

      notificar(
        'success',
        'PAGAMENTO ATUALIZADO',
        `Pagamento da inscrição #${String(id).padStart(3, '0')} alterado para ${novoPagamento}.`
      );

      await carregarInscricoes();
      atualizarCardsPagamentos(inscricoes);
      renderPagamentos();
      await carregarDashboard();
    }
  );
  } catch (e) {
    console.error('Erro ao abrir alteração de pagamento:', e);
    notificar('error', 'ERRO AO ABRIR PAGAMENTO', e.message || 'Não foi possível abrir a alteração de pagamento.');
  }
}

window.abrirAlteracaoPagamento = abrirAlteracaoPagamento;

// Fallback de eventos para os botões do modal.
// O botão ALTERAR PAGAMENTO também possui onclick inline no HTML para
// garantir funcionamento mesmo quando o conteúdo do modal for recriado.
document.addEventListener('click', async (event) => {
  const target = event.target;
  const paymentButton = target && target.closest ? target.closest('#paymentAction') : null;
  const statusButton = target && target.closest ? target.closest('#statusAction') : null;

  if (paymentButton) {
    event.preventDefault();
    event.stopPropagation();
    // O onclick inline já chama a função; não executamos novamente.
    return;
  }

  if (statusButton) {
    event.preventDefault();
    event.stopPropagation();
    await abrirAlteracaoStatusDetalhes();
  }
});

async function abrirAlteracaoStatusDetalhes() {
  if (!inscricaoAtual) {
    notificar('warning', 'INSCRIÇÃO NÃO CARREGADA', 'Abra os detalhes da inscrição novamente.');
    return;
  }

  const atual = String(inscricaoAtual.statusInscricao || inscricaoAtual.status || 'Pendente');
  const normalizado = atual.trim().toLowerCase();

  if (normalizado !== 'confirmado' && normalizado !== 'cancelado') {
    notificar('warning', 'STATUS NÃO DISPONÍVEL', 'O status só pode ser alterado quando a inscrição estiver Confirmada ou Cancelada.');
    return;
  }

  const id = valor(inscricaoAtual, 'numeroInscricao', 'numero');
  abrirSeletorStatus_('Alterar status', atual, ['Confirmado', 'Cancelado'], async novoStatus => {
    const s = getSession();
    if (!s?.token) {
      showLogin();
      throw new Error('Sessão expirada.');
    }

    const atualizado = await apiPost('alterarStatus', {
      token: s.token,
      id,
      status: novoStatus
    });

    // O backend pode retornar apenas o resultado da alteração;
    // por isso recarregamos a inscrição para manter todos os dados corretos.
    const refreshed = await apiGet('inscricao', { token: s.token, id });
    inscricaoAtual = refreshed;
    preencherDetalhes(refreshed);

    notificar('success', 'STATUS ATUALIZADO', `Inscrição #${String(id).padStart(3, '0')} alterada para ${novoStatus}.`);
    await carregarInscricoes();
    await carregarDashboard();
  });
}

window.abrirAlteracaoStatusDetalhes = abrirAlteracaoStatusDetalhes;

/* =====================================================
   DETALHES DA DESPESA
   ===================================================== */

async function abrirDetalhesDespesa_(numero) {

  const despesa =
    despesas.find(
      item =>
        Number(item.numero) ===
        Number(numero)
    );

  if (!despesa) {

    notificar(
      "warning",
      "DESPESA NÃO ENCONTRADA",
      "Não foi possível localizar a despesa."
    );

    return;
  }


  const moedaDespesa =
    Number(
      despesa.valor || 0
    )
      .toLocaleString(
        "pt-BR",
        {
          style: "currency",
          currency: "BRL"
        }
      );


  const numeroFormatado =
    String(
      despesa.numero || ""
    )
      .padStart(3, "0");


  document
    .getElementById("detailExpenseNumber")
    .textContent =
      `#${numeroFormatado}`;


  document
    .getElementById("detailExpenseName")
    .textContent =
      despesa.nome || "-";


  document
    .getElementById("detailExpenseValue")
    .textContent =
      moedaDespesa;


  document
    .getElementById("detailExpenseSupplier")
    .textContent =
      despesa.fornecedorEmpresa || "-";


  document
    .getElementById("detailExpenseResponsible")
    .textContent =
      despesa.responsavel || "-";


  document
    .getElementById("detailExpenseContact")
    .textContent =
      despesa.contatoFornecedor || "-";


  document
    .getElementById("detailExpenseObservation")
    .textContent =
      despesa.observacao || "-";


  const status =
    document.getElementById(
      "detailExpenseStatus"
    );

  if (status) {

    status.textContent =
      despesa.status || "Pendente";

  }
  
  /* =====================================================
   DADOS DO PAGAMENTO
   ===================================================== */

const statusPagamento =
  document.getElementById(
    "detailExpensePaymentStatus"
  );

if (statusPagamento) {

  statusPagamento.textContent =
    `${despesa.status || "Pendente"} · Pago: ${Number(despesa.valorPago||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"})} · Saldo: ${Number(despesa.saldoRestante ?? despesa.valor ?? 0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"})}`;

}

const dataPagamento =
  document.getElementById(
    "detailExpensePaymentDate"
  );

if (dataPagamento) {

  let dataFormatada = "-";

  const valorData =
    String(
      despesa.dataPagamento || ""
    );

  const match =
    valorData.match(
      /^(\d{4})-(\d{2})-(\d{2})/
    );

  if (match) {

    dataFormatada =
      `${match[3]}/${match[2]}/${match[1]}`;

  } else if (valorData) {

    dataFormatada =
      valorData;

  }

  dataPagamento.textContent =
    dataFormatada;

}


const formaPagamento =
  document.getElementById(
    "detailExpensePaymentMethod"
  );

if (formaPagamento) {

  formaPagamento.textContent =
    despesa.formaPagamento || "-";

}


const observacaoPagamento =
  document.getElementById(
    "detailExpensePaymentObservation"
  );

if (observacaoPagamento) {

  observacaoPagamento.textContent =
    despesa.observacaoPagamento || "-";

}


const areaComprovante =
  document.getElementById(
    "detailExpensePaymentReceipt"
  );
document
  .getElementById(
    "detailExpensePaymentReceipt"
  )
  ?.addEventListener(
    "click",
    e => {

      const botao =
        e.target.closest(
          "[data-expense-file]"
        );

      if (!botao) {
        return;
      }


      const session =
        getSession();

      if (!session?.token) {

        notificar(
          "warning",
          "SESSÃO EXPIRADA",
          "Faça login novamente."
        );

        return;
      }


      const params =
        new URLSearchParams({
          action:
            "arquivoDespesa",

          token:
            session.token,

          numero:
            botao.dataset.expenseNumber,

          evento:
            EVENTO_ATUAL,

          fileId:
            botao.dataset.expenseFile
        });


      const iframe =
        document.createElement(
          "iframe"
        );

      iframe.style.display =
        "none";

      iframe.src =
        `${API_URL}?${params}`;

      document.body.appendChild(
        iframe
      );


      setTimeout(
        () => {
          iframe.remove();
        },
        10000
      );

    }
  );
  
if (areaComprovante) {

  areaComprovante.innerHTML =
    `<span style="color:#888;">-</span>`;

}
  
    /* =====================================================
     CARREGAR ANEXOS DA DESPESA
     ===================================================== */
	 
	   const historicoEl = document.getElementById("detailExpensePaymentHistory");
  if (historicoEl) {
    const pagamentos = Array.isArray(despesa.pagamentos) ? despesa.pagamentos : [];
    historicoEl.innerHTML = pagamentos.length ? pagamentos.map((pag, idx) => `
      <div style="border:1px solid #e4e9e5;border-radius:10px;padding:12px;">
        <div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;">
          <strong>Parcela ${idx+1} · ${moedaDespesa && Number(pag.valor||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"})}</strong>
          <span>${esc(pag.data||"-")} · ${esc(pag.forma||"-")}</span>
        </div>
        ${pag.observacao ? `<p style="margin:8px 0;">${esc(pag.observacao)}</p>` : ""}
        ${(pag.anexos||[]).length ? (pag.anexos||[]).map(a => `<div style="margin-top:7px;padding-top:7px;border-top:1px solid #edf0ed;"><strong style="font-size:12px;">${esc(a.descricao)}</strong><br><small>${esc(a.nome)} · Arquivo salvo no Google Drive</small></div>`).join("") : `<small style="color:#78827c;">Sem anexos nesta parcela.</small>`}
      </div>`).join("") : "Nenhuma parcela registrada.";
  }

  const modal =
    document.getElementById(
      "expenseDetailsModal"
    );

  if (modal) {

    modal.hidden = false;

    document.body.classList.add(
      "modal-open"
    );

  }

  const areaAnexos =
    document.getElementById(
      "detailExpenseAttachments"
    );


  if (areaAnexos) {
    // Os comprovantes das parcelas são consultados pelo Worker/D1 junto
    // com a despesa. Não consultar anexosDespesa no Apps Script, pois a
    // sessão atual é emitida pelo Cloudflare e não é válida no Apps Script.
    const pagamentosDespesa = Array.isArray(despesa.pagamentos)
      ? despesa.pagamentos
      : [];

    const anexosPagamento = pagamentosDespesa.flatMap((pag, indice) =>
      (Array.isArray(pag.anexos) ? pag.anexos : []).map(anexo => ({
        ...anexo,
        parcela: indice + 1,
        dataParcela: pag.data || ""
      }))
    );

    if (!anexosPagamento.length) {
      areaAnexos.innerHTML = `
        <span style="color:#78827c;">Nenhum comprovante vinculado às parcelas.</span>
      `;
    } else {
      areaAnexos.innerHTML = anexosPagamento.map(anexo => {
        const fileId = String(anexo.fileId || "").trim();
        const urlDrive = String(anexo.url || "").trim() ||
          (fileId ? `https://drive.google.com/file/d/${encodeURIComponent(fileId)}/view` : "");
        const nomeArquivo = esc(anexo.nome || "Comprovante");
        const descricao = esc(anexo.descricao || "Comprovante de pagamento");
        const parcelaLabel = `Parcela ${anexo.parcela}`;

        return `
          <div class="expense-attachment-item" style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;">
            <div class="expense-attachment-info" style="min-width:0;">
              <strong>${descricao}</strong>
              <small style="display:block;">${parcelaLabel}${anexo.dataParcela ? ` · ${esc(anexo.dataParcela)}` : ""}</small>
              <small style="display:block;">${nomeArquivo}</small>
            </div>
            ${fileId ? `<button type="button" class="secondary small" data-expense-file="${esc(fileId)}" data-expense-event="${esc(EVENTO_ATUAL)}" style="display:inline-flex;align-items:center;">VER COMPROVANTE</button>` : `<small style="color:#c66;">Identificador do arquivo indisponível</small>`}
          </div>
        `;
      }).join("");
    }
  }

const modalDetalhes =
  document.getElementById(
    "expenseDetailsModal"
  );

if (modalDetalhes) {
  modalDetalhes.hidden = false;

  document.body.classList.add(
    "modal-open"
  );
}

}

/* =====================================================
   VISUALIZAR COMPROVANTE EM MODAL (PROXY AUTENTICADO)
   ===================================================== */

let expenseFileObjectUrl_ = null;

function fecharModalComprovanteDespesa_() {
  const modal = document.getElementById("expenseFileViewerModal");
  if (modal) modal.remove();
  if (expenseFileObjectUrl_) {
    URL.revokeObjectURL(expenseFileObjectUrl_);
    expenseFileObjectUrl_ = null;
  }
}

async function visualizarComprovanteDespesa_(botao) {
  const session = getSession();
  if (!session?.token) {
    notificar("warning", "SESSÃO EXPIRADA", "Faça login novamente.");
    return;
  }
  const fileId = String(botao.dataset.expenseFile || "").trim();
  const evento = String(botao.dataset.expenseEvent || EVENTO_ATUAL || "").trim();
  if (!fileId) return;

  fecharModalComprovanteDespesa_();
  const modal = document.createElement("div");
  modal.id = "expenseFileViewerModal";
  modal.style.cssText = "position:fixed;inset:0;z-index:10050;background:rgba(10,18,20,.78);display:flex;align-items:center;justify-content:center;padding:18px;";
  modal.innerHTML = `
    <section role="dialog" aria-modal="true" aria-label="Visualização do comprovante" style="width:min(100%,1000px);height:min(92vh,820px);background:#fff;border-radius:16px;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 20px 70px rgba(0,0,0,.35);">
      <header style="display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px 18px;border-bottom:1px solid #e5e9e6;">
        <strong style="font-size:15px;color:#172126;">Comprovante da despesa</strong>
        <div style="display:flex;align-items:center;gap:8px;">
          <a data-download-expense-file aria-disabled="true" style="display:inline-flex;align-items:center;gap:6px;border-radius:8px;background:#1d292d;color:#fff;padding:9px 13px;font-weight:800;text-decoration:none;opacity:.55;pointer-events:none;cursor:not-allowed;">↓ BAIXAR</a>
          <button type="button" data-close-expense-viewer style="border:0;border-radius:8px;background:#f1f4f2;padding:8px 13px;font-weight:800;cursor:pointer;">FECHAR ×</button>
        </div>
      </header>
      <div data-expense-viewer-content style="flex:1;min-height:0;display:flex;align-items:center;justify-content:center;padding:16px;color:#59645f;text-align:center;">Carregando comprovante...</div>
    </section>`;
  document.body.appendChild(modal);
  modal.addEventListener("click", ev => {
    if (ev.target === modal || ev.target.closest("[data-close-expense-viewer]")) fecharModalComprovanteDespesa_();
  });

  try {
    const response = await fetch(`${WORKER_API_URL}/admin/expense-file`, {
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({token:session.token, fileId, evento})
    });
    if (!response.ok) {
      let mensagem = "Não foi possível carregar o comprovante.";
      const tipo = response.headers.get("content-type") || "";
      if (tipo.includes("application/json")) {
        const erro = await response.json();
        mensagem = erro.mensagem || mensagem;
      }
      throw new Error(mensagem);
    }
    const blob = await response.blob();
    const mime = (blob.type || response.headers.get("content-type") || "").toLowerCase();
    expenseFileObjectUrl_ = URL.createObjectURL(blob);
    const contentDisposition = response.headers.get("content-disposition") || "";
    const encodedName = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i)?.[1];
    const plainName = contentDisposition.match(/filename="?([^";]+)"?/i)?.[1];
    let nomeArquivo = "comprovante";
    try {
      if (encodedName) nomeArquivo = decodeURIComponent(encodedName);
      else if (plainName) nomeArquivo = plainName;
    } catch (_) {
      nomeArquivo = plainName || "comprovante";
    }
    const downloadLink = modal.querySelector("[data-download-expense-file]");
    downloadLink.href = expenseFileObjectUrl_;
    downloadLink.download = nomeArquivo;
    downloadLink.setAttribute("aria-disabled", "false");
    downloadLink.style.opacity = "1";
    downloadLink.style.pointerEvents = "auto";
    downloadLink.style.cursor = "pointer";
    const content = modal.querySelector("[data-expense-viewer-content]");
    if (mime.startsWith("image/")) {
      content.innerHTML = `<img alt="Comprovante" style="max-width:100%;max-height:100%;object-fit:contain;" />`;
      content.querySelector("img").src = expenseFileObjectUrl_;
    } else if (mime.includes("pdf")) {
      content.innerHTML = `<iframe title="Comprovante em PDF" style="width:100%;height:100%;border:0;background:#f4f5f4;"></iframe>`;
      content.querySelector("iframe").src = expenseFileObjectUrl_;
    } else {
      content.innerHTML = `<div><p>Este formato não possui visualização integrada.</p><p>Use o botão <strong>BAIXAR</strong> no topo do modal.</p></div>`;
    }
  } catch (error) {
    const content = modal.querySelector("[data-expense-viewer-content]");
    if (content) content.textContent = error.message || "Erro ao carregar comprovante.";
  }
}

document.getElementById("detailExpenseAttachments")?.addEventListener("click", event => {
  const botao = event.target.closest("[data-expense-file]");
  if (!botao) return;
  visualizarComprovanteDespesa_(botao);
});

document.addEventListener("keydown", event => {
  if (event.key === "Escape") fecharModalComprovanteDespesa_();
});

function fecharDetalhesDespesa_() {

  const modal =
    document.getElementById(
      "expenseDetailsModal"
    );

  if (modal) {

    modal.hidden = true;

    document.body.classList.remove(
      "modal-open"
    );

  }

}

function abrirEdicao() {

  if (!inscricaoAtual) return;

  document.getElementById("editNome").value =
    valor(inscricaoAtual, "nome", "atleta") === "—"
      ? ""
      : valor(inscricaoAtual, "nome", "atleta");

  document.getElementById("editCpf").value =
    valor(inscricaoAtual, "cpf") === "—"
      ? ""
      : valor(inscricaoAtual, "cpf");

  document.getElementById("editEmail").value =
    valor(inscricaoAtual, "email") === "—"
      ? ""
      : valor(inscricaoAtual, "email");

  document.getElementById("editTelefone").value =
    valor(inscricaoAtual, "telefone", "whatsapp") === "—"
      ? ""
      : valor(inscricaoAtual, "telefone", "whatsapp");

  const categoria = valor(inscricaoAtual, "categoria");
  preencherSelectCategorias_("editCategoria", categoria === "—" ? "" : categoria);
  const categoriaAtual = document.getElementById("editCategoria").value;
  const categoriaConfig = categoriasConfig.find(c => c.nome === categoriaAtual);
  const valorInscricao = categoriaConfig ? Number(categoriaConfig.valor) : Number(inscricaoAtual.valor || 0);
  document.getElementById("editValor").value =
    Number.isFinite(valorInscricao) ? valorInscricao.toFixed(2) : "0.00";

  document.getElementById("editObservacao").value =
    inscricaoAtual.observacao || "";

  document.getElementById("editPanel").hidden = false;
  document.getElementById("editAction").disabled = true;

  document.getElementById("editPanel").scrollIntoView({
    behavior: "smooth",
    block: "nearest"
  });
}


document
  .getElementById("editAction")
  .onclick = abrirEdicao;


document
  .getElementById("cancelEditAction")
  .onclick = () => {
    document.getElementById("editPanel").hidden = true;
    document.getElementById("editAction").disabled = false;
  };


document
  .getElementById("saveEditAction")
  .onclick = async () => {

    if (!inscricaoAtual) return;

    const s = getSession();
    if (!s?.token) {
      showLogin();
      return;
    }

    const btn = document.getElementById("saveEditAction");
    const old = btn.textContent;
    btn.disabled = true;
    btn.textContent = "SALVANDO...";

    try {

      const id = valor(
        inscricaoAtual,
        "numeroInscricao",
        "numero"
      );

      const atualizado = await apiPost(
        "editarInscricao",
        {
          token: s.token,
          id,
          nome: document.getElementById("editNome").value.trim(),
          cpf: document.getElementById("editCpf").value.trim(),
          email: document.getElementById("editEmail").value.trim(),
          telefone: document.getElementById("editTelefone").value.trim(),
          categoria: document.getElementById("editCategoria").value,
          valor: document.getElementById("editValor").value,
          observacao: document.getElementById("editObservacao").value.trim()
        }
      );

      inscricaoAtual = atualizado;
      preencherDetalhes(atualizado);

      document.getElementById("editPanel").hidden = true;
      document.getElementById("editAction").disabled = false;

      notificar(
        "success",
        "INSCRIÇÃO ATUALIZADA",
        "Os dados da inscrição foram salvos com sucesso."
      );

      await carregarInscricoes();
      await carregarDashboard();

    } catch (e) {

      notificar(
        "error",
        "ERRO AO SALVAR",
        e.message || "Não foi possível salvar as alterações."
      );

    } finally {
      btn.disabled = false;
      btn.textContent = old;
    }
  };


/* =====================================================
   VALIDAR INSCRIÇÃO
   ===================================================== */

document
  .getElementById("validateAction")
  .onclick = async () => {

    if (!inscricaoAtual) return;

    const s = getSession();
    if (!s?.token) {
      showLogin();
      return;
    }

    const pagamento = String(
      inscricaoAtual.pagamento || ""
    ).trim().toLowerCase();

    if (pagamento !== "pago") {
      notificar(
        "warning",
        "PAGAMENTO PENDENTE",
        "A inscrição só pode ser validada quando o pagamento estiver como Pago."
      );
      return;
    }

    const arquivos =
      Array.isArray(inscricaoAtual.arquivos)
        ? inscricaoAtual.arquivos
        : (Array.isArray(inscricaoAtual.documentos) ? inscricaoAtual.documentos : []);

    if (!arquivos.length) {
      notificar(
        "warning",
        "COMPROVANTE NECESSÁRIO",
        "Anexe pelo menos um comprovante antes de validar a inscrição."
      );
      return;
    }

    const btn = document.getElementById("validateAction");
    const old = btn.textContent;
    btn.disabled = true;
    btn.textContent = "VALIDANDO...";

    try {

      const id = valor(
        inscricaoAtual,
        "numeroInscricao",
        "numero"
      );

      const resultado = await apiPost(
        "validarInscricao",
        {
          token: s.token,
          id
        }
      );

      inscricaoAtual = resultado;
      preencherDetalhes(resultado);

      notificar(
        "success",
        "INSCRIÇÃO VALIDADA ✓",
        `A inscrição #${String(id).padStart(3, "0")} foi confirmada porque o pagamento está como Pago.`
      );

      await carregarInscricoes();
      await carregarDashboard();

    } catch (e) {

      notificar(
        "error",
        "ERRO NA VALIDAÇÃO",
        e.message || "Não foi possível validar a inscrição."
      );

    } finally {
      btn.disabled = false;
      btn.textContent = old;
    }
  };


/* =====================================================
   ENVIO DE COMPROVANTE PELO MODAL DE PAGAMENTOS
   ===================================================== */

async function enviarComprovantePeloPagamento_(file, id, overlay) {
  const s = getSession();
  if (!s?.token) {
    showLogin();
    throw new Error('Sessão expirada.');
  }

  if (!file) throw new Error('Arquivo não informado.');
  if (file.size > 5 * 1024 * 1024) {
    throw new Error('Arquivo muito grande. Envie um arquivo de até 5 MB.');
  }

  const allowed = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
  if (file.type && !allowed.includes(file.type)) {
    throw new Error('Formato não permitido. Use PDF, JPG, PNG ou WEBP.');
  }

  const uploadBtn = overlay?.querySelector('.payment-upload-comprovante');
  const oldText = uploadBtn?.textContent || '+ INSERIR COMPROVANTE';
  if (uploadBtn) {
    uploadBtn.textContent = 'ENVIANDO...';
    uploadBtn.style.pointerEvents = 'none';
  }

  try {
    const base64 = await bytesToBase64(file);
    await apiPost('uploadArquivo', {
      token: s.token,
      id,
      nome: file.name,
      mimeType: file.type || 'application/octet-stream',
      arquivoBase64: base64
    });

    // Regra: comprovante enviado => pagamento Pago.
    // Fazemos a atualização também pelo endpoint de pagamento para
    // garantir o comportamento mesmo quando o Web App ainda estiver
    // usando uma versão anterior do backend. O backend novo valida
    // novamente que existe comprovante antes de aceitar Pago.
    await apiPost('alterarPagamento', {
      token: s.token,
      id,
      pagamento: 'Pago'
    });

    const refreshed = await apiGet('inscricao', { token: s.token, id });
    inscricaoAtual = refreshed;
    preencherDetalhes(refreshed);

    notificar('success', 'PAGAMENTO CONFIRMADO', 'Comprovante enviado. O pagamento foi alterado automaticamente para Pago.');

    await carregarInscricoes();
    if (typeof atualizarCardsPagamentos === 'function') atualizarCardsPagamentos(inscricoes);
    if (typeof renderPagamentos === 'function') renderPagamentos();
    await carregarDashboard();

    overlay?.remove();
    document.body.classList.remove('modal-open');
  } finally {
    if (uploadBtn) {
      uploadBtn.textContent = oldText;
      uploadBtn.style.pointerEvents = '';
    }
  }
}

/* =====================================================
   SELETOR DE STATUS
   ===================================================== */

function abrirSeletorStatus_(titulo, atual, opcoes, onConfirmar) {
  const antigo = document.getElementById("statusChoiceModal");
  if (antigo) antigo.remove();

  const overlay = document.createElement("div");
  overlay.id = "statusChoiceModal";
  overlay.className = "choice-backdrop";
  const isPagamento = /pagamento/i.test(titulo);
  const idAtual = inscricaoAtual ? valor(inscricaoAtual, "numeroInscricao", "numero") : "";

  overlay.innerHTML = `
    <div class="choice-modal" role="dialog" aria-modal="true">
      <div class="choice-head">
        <div>
          <span>ALTERAÇÃO</span>
          <h3>${escapeHtml_(titulo)}</h3>
        </div>
        <button type="button" class="choice-close" aria-label="Fechar">×</button>
      </div>
      <div class="choice-body">
        <small>STATUS ATUAL</small>
        <strong class="choice-current">${escapeHtml_(atual)}</strong>
        <div class="choice-options">
          ${opcoes.map(op => `
            <button type="button" class="choice-option ${String(op).toLowerCase() === String(atual).toLowerCase() ? 'selected' : ''}" data-value="${escapeHtml_(op)}">
              <i class="choice-dot"></i>
              <strong>${escapeHtml_(op)}</strong>
              ${String(op).toLowerCase() === String(atual).toLowerCase() ? '<em>ATUAL</em>' : ''}
            </button>
          `).join('')}
        </div>

        ${isPagamento ? `
          <div class="payment-proof-box">
            <div>
              <small>COMPROVANTE</small>
              <p>Anexe o comprovante para registrar o pagamento. Ao enviar por aqui, o pagamento será marcado automaticamente como <b>Pago</b>.</p>
            </div>
            <label class="payment-upload-comprovante" role="button">
              + INSERIR COMPROVANTE
              <input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" hidden>
            </label>
          </div>
        ` : ''}
      </div>
      <div class="choice-actions">
        <button type="button" class="modal-secondary choice-cancel">CANCELAR</button>
        <button type="button" class="modal-primary choice-confirm">CONFIRMAR</button>
      </div>
    </div>`;

  document.body.appendChild(overlay);

  let selecionado = atual;
  const confirmBtn = overlay.querySelector('.choice-confirm');
  const uploadLabel = overlay.querySelector('.payment-upload-comprovante');
  const uploadInput = uploadLabel?.querySelector('input');

  overlay.querySelectorAll('.choice-option').forEach(btn => {
    btn.onclick = () => {
      selecionado = btn.dataset.value;
      overlay.querySelectorAll('.choice-option').forEach(x => x.classList.remove('selected'));
      btn.classList.add('selected');
    };
  });

  overlay.querySelector('.choice-close').onclick = () => overlay.remove();
  overlay.querySelector('.choice-cancel').onclick = () => overlay.remove();

  uploadLabel?.addEventListener('click', e => {
    if (e.target === uploadInput) return;
    uploadInput.click();
  });

  uploadInput?.addEventListener('change', async () => {
    const file = uploadInput.files?.[0];
    if (!file) return;
    try {
      await enviarComprovantePeloPagamento_(file, idAtual, overlay);
    } catch (e) {
      notificar('error', 'ERRO NO COMPROVANTE', e.message || 'Não foi possível enviar o comprovante.');
      uploadInput.value = '';
    }
  });

  confirmBtn.onclick = async () => {
    if (!selecionado) return;

    // Nunca permite marcar como Pago sem comprovante.
    if (isPagamento && String(selecionado).toLowerCase() === 'pago') {
      const arquivos = Array.isArray(inscricaoAtual?.arquivos)
        ? inscricaoAtual.arquivos
        : (Array.isArray(inscricaoAtual?.documentos) ? inscricaoAtual.documentos : []);
      if (!arquivos.length) {
        notificar('warning', 'COMPROVANTE NECESSÁRIO', 'Para marcar o pagamento como Pago, anexe um comprovante primeiro.');
        return;
      }
    }

    confirmBtn.disabled = true;
    confirmBtn.textContent = "SALVANDO...";
    try {
      await onConfirmar(selecionado);
      overlay.remove();
    } catch (e) {
      confirmBtn.disabled = false;
      confirmBtn.textContent = "CONFIRMAR";
    }
  };
}


/* =====================================================
   PAGAMENTOS
   ===================================================== */

function atualizarCardsPagamentos(lista) {
  const pendentes = lista.filter(x => String(x.pagamento || "Pendente").toLowerCase() === "pendente");
  const pagos = lista.filter(x => String(x.pagamento || "Pendente").toLowerCase() === "pago");
  const valor = lista.length && Number(lista.find(x => Number(x.valor || 0) > 0)?.valor || 0) || 0;

  const total = arr => arr.reduce((s, x) => s + Number(x.valor || 0), 0);

  const set = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  };

  set("paymentPendingCount", pendentes.length);
  set("paymentPendingValue", moeda(total(pendentes)));
  set("paymentPaidCount", pagos.length);
  set("paymentPaidValue", moeda(total(pagos)));
  set("paymentUnitValue", moeda(valor));
}

function renderPagamentos() {
  const body = document.getElementById("paymentRows");
  if (!body) return;

  const q = (document.getElementById("paymentSearch")?.value || "").toLowerCase().trim();
  const filtro = document.getElementById("paymentFilter")?.value || "todos";

  const rows = inscricoes.filter(x => {
    const texto = [x.numeroInscricao, x.nome, x.cpf, x.categoria].join(" ").toLowerCase();
    const pagamento = String(x.pagamento || "Pendente").toLowerCase();
    return (!q || texto.includes(q)) && (filtro === "todos" || pagamento === filtro);
  });

  body.innerHTML = rows.map(x => {
    const id = esc(x.numeroInscricao);
    const pagamento = String(x.pagamento || "Pendente");
    return `
      <tr>
        <td><b>#${id}</b></td>
        <td><b>${esc(x.nome)}</b><br><small>${esc(x.cpf)}</small></td>
        <td>${esc(x.categoria)}</td>
        <td><b>${moeda(x.valor)}</b></td>
        <td><span class="pill ${classe(pagamento)}">${esc(pagamento)}</span></td>
        <td>${esc(x.formaPagamento || "—")}</td>
        <td>${esc(x.dataPagamento || "—")}</td>
        <td>${(x.receiptUrl || x.comprovanteUrl) ? `<a href="${esc(x.receiptUrl || x.comprovanteUrl)}" target="_blank" rel="noopener noreferrer" class="action">🧾 VER</a>` : "—"}</td>
        <td class="payment-actions">
          <button class="action payment-details" data-id="${id}">DETALHES</button>
          <button class="action payment-change" data-id="${id}">ALTERAR</button>
        </td>
      </tr>`;
  }).join("") || `
    <tr><td colspan="9" style="text-align:center;padding:30px">Nenhum pagamento encontrado.</td></tr>`;

  body.querySelectorAll(".payment-details").forEach(b => {
    b.onclick = () => detalhes(b.dataset.id);
  });

  body.querySelectorAll(".payment-change").forEach(b => {
    b.onclick = () => alterarPagamentoDireto(b.dataset.id);
  });
}

async function alterarPagamentoDireto(id) {
  const item = inscricoes.find(x => String(x.numeroInscricao) === String(id));
  if (!item) return;

  const atual = String(item.pagamento || "Pendente");

  abrirSeletorStatus_(
    "Alterar pagamento",
    atual,
    ["Pendente", "Cancelado"],
    async novoPagamento => {
      const s = getSession();
      if (!s?.token) {
        showLogin();
        throw new Error("Sessão expirada.");
      }

      try {
        await apiPost("alterarPagamento", {
          token: s.token,
          id,
          pagamento: novoPagamento
        });

        notificar(
          "success",
          "PAGAMENTO ATUALIZADO",
          `Pagamento da inscrição #${String(id).padStart(3, "0")} alterado para ${novoPagamento}.`
        );

        await carregarInscricoes();
        atualizarCardsPagamentos(inscricoes);
        renderPagamentos();
        await carregarDashboard();
      } catch (e) {
        notificar("error", "ERRO NO PAGAMENTO", e.message || "Não foi possível alterar o pagamento.");
        throw e;
      }
    }
  );
}

async function carregarPagamentos() {

  const session =
    getSession();

  if (!session?.token) {
    showLogin();
    return;
  }


  /* =====================================================
     FORMATADOR
     ===================================================== */

  const moeda = valor =>
    Number(valor || 0)
      .toLocaleString(
        "pt-BR",
        {
          style: "currency",
          currency: "BRL"
        }
      );


  try {

    /* =====================================================
       BUSCA INSCRIÇÕES + DESPESAS
       ===================================================== */

    const [
      respostaInscricoes,
      respostaDespesas,
      respostaPatrocinios
    ] =
      await Promise.all([

        apiGet(
          "inscricoes",
          {
            token: session.token,
            evento: EVENTO_ATUAL
          }
        ),

        apiGet(
          "despesas",
          {
            token: session.token,
            evento: EVENTO_ATUAL
          }
        ),
        apiGet(
          "patrocinios",
          {
            token: session.token,
            evento: EVENTO_ATUAL
          }
        )

      ]);


    inscricoes =
  respostaInscricoes.inscricoes ||
  [];

despesas =
  respostaDespesas.despesas ||
  [];

const patrociniosFinanceiro = respostaPatrocinios.patrocinios || [];
const totalPatrociniosFinanceiro = patrociniosFinanceiro.reduce((total, item) => total + Number(item.valor || 0), 0);

/* =====================================================
   ÚLTIMOS LANÇAMENTOS
   ===================================================== */

renderizarUltimosLancamentos_(
  inscricoes,
  despesas,
  patrociniosFinanceiro
);


/* =====================================================
   RECEITAS
   ===================================================== */


    /* =====================================================
       RECEITAS
       ===================================================== */

    const inscricoesPagas =
      inscricoes.filter(item => {

        const pagamento =
          String(
            item.pagamento || ""
          )
            .trim()
            .toLowerCase();

        return pagamento === "pago";

      });


    const inscricoesPendentes =
      inscricoes.filter(item => {

        const pagamento =
          String(
            item.pagamento || ""
          )
            .trim()
            .toLowerCase();

        return pagamento === "pendente";

      });


    const receitaInscricoes =
      inscricoesPagas.reduce(
        (total, item) => total + Number(item.valor || 0),
        0
      );

    const receitaBruta = receitaInscricoes + totalPatrociniosFinanceiro;


    const aReceber =
      inscricoesPendentes.reduce(
        (total, item) =>
          total +
          Number(
            item.valor || 0
          ),
        0
      );


    /* =====================================================
       DESPESAS
       ===================================================== */

    const despesasPagas =
      despesas.filter(item => {

        const status =
          String(
            item.status || ""
          )
            .trim()
            .toLowerCase();

        return status === "pago";

      });


    const despesasPendentes =
      despesas.filter(item => {

        const status =
          String(
            item.status ||
            "Pendente"
          )
            .trim()
            .toLowerCase();

        return status === "pendente" || status === "parcialmente pago";

      });


    const totalDespesasPagas =
      despesas.reduce(
        (total, item) =>
          total + Number(item.valorPago ?? (String(item.status||"").toLowerCase()==="pago" ? item.valor||0 : 0)),
        0
      );


    const totalDespesasPendentes =
      despesasPendentes.reduce(
        (total, item) =>
          total +
          Number(
            item.saldoRestante ?? item.valor ?? 0
          ),
        0
      );


    /* =====================================================
       CÁLCULOS
       ===================================================== */

    const saldoLiquido =
      receitaBruta -
      totalDespesasPagas;


    const totalReceitasPrevistas =
      receitaBruta +
      aReceber;


    const totalDespesasPrevistas =
      totalDespesasPagas +
      totalDespesasPendentes;


    const resultadoProjetado =
      totalReceitasPrevistas -
      totalDespesasPrevistas;


    /* =====================================================
       ATUALIZA ELEMENTO
       ===================================================== */

    const atualizar =
      (id, valor) => {

        const elemento =
          document.getElementById(id);

        if (elemento) {
          elemento.textContent =
            moeda(valor);
        }

      };


    /* =====================================================
       CARDS
       ===================================================== */

    atualizar(
      "financeGrossRevenue",
      receitaBruta
    );

    atualizar(
      "financeNetBalance",
      saldoLiquido
    );

    atualizar(
      "financeReceivable",
      aReceber
    );

    atualizar(
      "financePaidExpenses",
      totalDespesasPagas
    );

    atualizar(
      "financePendingExpenses",
      totalDespesasPendentes
    );

    atualizar(
      "financeProjectedResult",
      resultadoProjetado
    );


    /* =====================================================
       RESUMO
       ===================================================== */

    atualizar(
      "financeResumeReceived",
      receitaBruta
    );

    atualizar(
      "financeResumeSponsors",
      totalPatrociniosFinanceiro
    );

    atualizar(
      "financeResumeReceivable",
      aReceber
    );

    atualizar(
      "financeResumeRevenueTotal",
      totalReceitasPrevistas
    );

    atualizar(
      "financeResumePaidExpenses",
      totalDespesasPagas
    );

    atualizar(
      "financeResumePendingExpenses",
      totalDespesasPendentes
    );

    atualizar(
      "financeResumeExpenseTotal",
      totalDespesasPrevistas
    );


    /* =====================================================
       TOTAL CONTAS A PAGAR
       ===================================================== */

    atualizar(
      "financePayablesTotal",
      totalDespesasPendentes
    );


    /* =====================================================
       TABELA - DESPESAS PENDENTES
       ===================================================== */

    const tbody =
      document.getElementById(
        "financePayablesBody"
      );


    if (tbody) {

      if (
        !despesasPendentes.length
      ) {

        tbody.innerHTML = `
          <tr>
            <td colspan="6">
              <div class="finance-empty">
                Nenhuma despesa pendente.
              </div>
            </td>
          </tr>
        `;

      } else {

        tbody.innerHTML =
          despesasPendentes
            .map(despesa => {

              const numero =
                String(
                  despesa.numero || ""
                )
                  .padStart(
                    3,
                    "0"
                  );

              return `
                <tr>

                  <td>
                    <strong>
                      #${numero}
                    </strong>
                  </td>

                  <td>
                    ${esc(
                      despesa.nome ||
                      "-"
                    )}
                  </td>

                  <td>
                    ${esc(
                      despesa.fornecedorEmpresa ||
                      "-"
                    )}
                  </td>

                  <td>
                    <strong>
                      ${moeda(
                        despesa.saldoRestante ?? despesa.valor
                      )}
                    </strong>
                  </td>

                  <td>
                    <span class="badge warning">
                      ${String(despesa.status||"Pendente").toUpperCase() === "PARCIALMENTE PAGO" ? "PARCIALMENTE PAGA" : "PENDENTE"}
                    </span>
                  </td>

                  <td>
                    <button
                      type="button"
                      class="finance-pay-button"
                      data-finance-pay="${despesa.numero}"
                    >
                      PAGAR
                    </button>
                  </td>

                </tr>
              `;

            })
            .join("");

      }

    }


  } catch (erro) {

    console.error(
      "Erro ao carregar financeiro:",
      erro
    );

    if (
      /sessão/i.test(
        erro.message || ""
      )
    ) {

      clearSession();
      showLogin();
      return;

    }

    notificar(
      "error",
      "ERRO NO FINANCEIRO",
      erro.message ||
      "Não foi possível carregar os dados financeiros."
    );

  }

}

/* =====================================================
   MODAL - DESPESAS PAGAS
   ===================================================== */

function abrirDespesasPagas_() {

  const modal =
    document.getElementById(
      "paidExpensesModal"
    );

  const lista =
    document.getElementById(
      "paidExpensesList"
    );

  const totalEl =
    document.getElementById(
      "paidExpensesModalTotal"
    );

  if (!modal || !lista || !totalEl) {
    return;
  }


  const pagas =
    despesas.filter(
      despesa =>
        String(
          despesa.status || ""
        )
          .trim()
          .toLowerCase() ===
        "pago"
    );


  const total =
    pagas.reduce(
      (soma, despesa) =>
        soma +
        Number(
          despesa.valor || 0
        ),
      0
    );


  totalEl.textContent =
    moeda(total);


  if (!pagas.length) {

    lista.innerHTML = `
      <div
        style="
          padding:35px 20px;
          text-align:center;
          color:#888;
        "
      >
        Nenhuma despesa paga para este evento.
      </div>
    `;

  } else {

    lista.innerHTML =
      pagas
        .map(despesa => {

          const numero =
            String(
              despesa.numero || ""
            )
              .padStart(
                3,
                "0"
              );


          const valor =
            moeda(
              despesa.valor
            );


          let dataFormatada =
            "-";

          const valorData =
            String(
              despesa.dataPagamento || ""
            );

          const match =
            valorData.match(
              /^(\d{4})-(\d{2})-(\d{2})/
            );

          if (match) {

            dataFormatada =
              `${match[3]}/${match[2]}/${match[1]}`;

          }


          return `
            <div
              style="
                padding:16px 18px;
                border:1px solid #e1e5e2;
                border-radius:12px;
                background:#fafbfa;
                display:flex;
                justify-content:space-between;
                gap:16px;
                align-items:center;
                flex-wrap:wrap;
              "
            >

              <div style="min-width:0;">

                <strong
                  style="
                    display:block;
                    margin-bottom:5px;
                    font-size:14px;
                  "
                >
                  #${numero}
                  ·
                  ${esc(
                    despesa.nome || "-"
                  )}
                </strong>

                <span
                  style="
                    display:block;
                    font-size:12px;
                    color:#7c8781;
                  "
                >
                  ${esc(
                    despesa.fornecedorEmpresa ||
                    "-"
                  )}
                </span>

                <span
                  style="
                    display:block;
                    margin-top:4px;
                    font-size:11px;
                    color:#8a929d;
                  "
                >
                  ${esc(
                    despesa.formaPagamento ||
                    "-"
                  )}
                  ·
                  ${esc(
                    dataFormatada
                  )}
                </span>

              </div>


              <strong
                style="
                  font-size:16px;
                  white-space:nowrap;
                  color:#348c2f;
                "
              >
                ${valor}
              </strong>

            </div>
          `;

        })
        .join("");

  }


  modal.hidden = false;

  document.body.classList.add(
    "modal-open"
  );

}


function fecharDespesasPagas_() {

  const modal =
    document.getElementById(
      "paidExpensesModal"
    );

  if (modal) {
    modal.hidden = true;
  }

  document.body.classList.remove(
    "modal-open"
  );

}

document
  .querySelector(
    '[data-finance-expenses="paid"]'
  )
  ?.addEventListener(
    "click",
    abrirDespesasPagas_
  );


document
  .getElementById(
    "closePaidExpensesModal"
  )
  ?.addEventListener(
    "click",
    fecharDespesasPagas_
  );


document
  .getElementById(
    "closePaidExpensesButton"
  )
  ?.addEventListener(
    "click",
    fecharDespesasPagas_
  );


document
  .getElementById(
    "paidExpensesModal"
  )
  ?.addEventListener(
    "click",
    e => {

      if (
        e.target.id ===
        "paidExpensesModal"
      ) {

        fecharDespesasPagas_();

      }

    }
  );


/* =====================================================
   FINANCEIRO - ÚLTIMOS LANÇAMENTOS
   ===================================================== */

function renderizarUltimosLancamentos_(
  inscricoes,
  despesas,
  patrocinios = []
) {

  const area =
    document.getElementById(
      "financeMovements"
    );

  if (!area) return;


  const movimentos = [];


  /* ===================================================
     ENTRADAS - INSCRIÇÕES PAGAS
     =================================================== */

  (inscricoes || []).forEach(
    inscricao => {

      const pagamento =
        String(
          inscricao.pagamento || ""
        )
          .trim()
          .toLowerCase();

      if (pagamento !== "pago") {
        return;
      }


      const valor =
        Number(
          inscricao.valor || 0
        );

      // Cortesia / inscrição zerada
      if (valor <= 0) {
        return;
      }


      movimentos.push({

        tipo: "entrada",

        numero:
          inscricao.numeroInscricao ||
          inscricao.numero ||
          "",

        descricao:
          inscricao.nome ||
          "Inscrição",

        forma:
          inscricao.formaPagamento ||
          "Pagamento",

        valor: valor,

        data:
          inscricao.dataPagamento ||
          ""

      });

    }
  );


  /* ===================================================
     ENTRADAS - PATROCÍNIOS RECEBIDOS
     =================================================== */

  (patrocinios || []).forEach(item => {
    movimentos.push({
      tipo: "entrada",
      numero: "",
      descricao: "Patrocínio - " + (item.patrocinador || "Patrocinador"),
      forma: item.formaPagamento || "Recebimento",
      valor: Number(item.valor || 0),
      data: item.dataRecebimento || ""
    });
  });

  /* ===================================================
     SAÍDAS - DESPESAS PAGAS
     =================================================== */

  (despesas || []).forEach(
    despesa => {

      const status =
        String(
          despesa.status || ""
        )
          .trim()
          .toLowerCase();

      if (status !== "pago") {
        return;
      }


      movimentos.push({

        tipo: "saida",

        numero:
          despesa.numero ||
          "",

        descricao:
          despesa.nome ||
          "Despesa",

        forma:
          despesa.formaPagamento ||
          "Pagamento",

        valor:
          Number(
            despesa.valor || 0
          ),

        data:
          despesa.dataPagamento ||
          ""

      });

    }
  );


  /* ===================================================
     ORDENAÇÃO - MAIS RECENTE PRIMEIRO
     =================================================== */

  movimentos.sort(
    (a, b) => {

      const dataA =
        new Date(
          a.data || 0
        ).getTime();

      const dataB =
        new Date(
          b.data || 0
        ).getTime();

      return dataB - dataA;

    }
  );


  const ultimos =
    movimentos.slice(
      0,
      6
    );


  /* ===================================================
     SEM MOVIMENTAÇÃO
     =================================================== */

  if (!ultimos.length) {

    area.innerHTML = `
      <div
        style="
          padding:30px 15px;
          text-align:center;
          color:#8a929d;
          font-size:13px;
        "
      >
        Nenhum lançamento financeiro registrado.
      </div>
    `;

    return;

  }


  /* ===================================================
     RENDERIZAÇÃO
     =================================================== */

  area.innerHTML =
    ultimos
      .map(
        movimento => {

          const entrada =
            movimento.tipo ===
            "entrada";


          const sinal =
            entrada
              ? "+"
              : "-";


          const seta =
            entrada
              ? "↑"
              : "↓";


          let dataFormatada =
            "-";

          const valorData =
            String(
              movimento.data || ""
            );


          const match =
            valorData.match(
              /^(\d{4})-(\d{2})-(\d{2})/
            );


          if (match) {

            dataFormatada =
              `${match[3]}/${match[2]}/${match[1]}`;

          }


          const identificacao =
            entrada &&
            movimento.numero
              ? `Inscrição #${esc(
                  movimento.numero
                )} · `
              : "";


          return `
            <div
              style="
                display:flex;
                align-items:center;
                justify-content:space-between;
                gap:16px;
                padding:14px 4px;
                border-bottom:1px solid #edf0ee;
              "
            >

              <div
                style="
                  display:flex;
                  align-items:center;
                  gap:12px;
                  min-width:0;
                "
              >

                <div
                  style="
                    width:34px;
                    height:34px;
                    border-radius:50%;
                    display:flex;
                    align-items:center;
                    justify-content:center;
                    flex:0 0 auto;
                    font-size:17px;
                    font-weight:900;
                    background:${
                      entrada
                        ? "#edf8ed"
                        : "#fff1f1"
                    };
                    color:${
                      entrada
                        ? "#348c2f"
                        : "#c74b4b"
                    };
                  "
                >
                  ${seta}
                </div>


                <div
                  style="
                    min-width:0;
                  "
                >

                  <strong
                    style="
                      display:block;
                      font-size:13px;
                      white-space:nowrap;
                      overflow:hidden;
                      text-overflow:ellipsis;
                    "
                  >
                    ${identificacao}${esc(
                      movimento.descricao
                    )}
                  </strong>


                  <span
                    style="
                      display:block;
                      margin-top:3px;
                      font-size:11px;
                      color:#8a929d;
                    "
                  >
                    ${esc(
                      movimento.forma
                    )}
                    ·
                    ${dataFormatada}
                  </span>

                </div>

              </div>


              <strong
                style="
                  flex:0 0 auto;
                  white-space:nowrap;
                  font-size:14px;
                  color:${
                    entrada
                      ? "#348c2f"
                      : "#c74b4b"
                  };
                "
              >
                ${sinal}
                ${moeda(
                  movimento.valor
                )}
              </strong>

            </div>
          `;

        }
      )
      .join("") +

    `
      <div
        style="
          padding-top:12px;
          text-align:center;
          font-size:10px;
          font-weight:800;
          color:#9aa29e;
          text-transform:uppercase;
          letter-spacing:.4px;
        "
      >
        Mostrando os ${ultimos.length}
        lançamentos mais recentes
      </div>
    `;

}

document.getElementById("paymentSearch")?.addEventListener("input", renderPagamentos);
document.getElementById("paymentFilter")?.addEventListener("change", renderPagamentos);

/* =====================================================
   FILTROS
   ===================================================== */

document
  .getElementById("search")
  .oninput =
    render;


document
  .getElementById("filter")
  .onchange =
    render;


document
  .getElementById("categoryFilter")
  .onchange =
    render;


async function validarSessaoWorker(token) {

  const r = await fetch(
    `${WORKER_API_URL}/admin/me`,
    {
      method: "POST",
      headers: {
        "Content-Type": "text/plain;charset=utf-8"
      },
      body: JSON.stringify({ token })
    }
  );

  const j = await r.json();

  if (!r.ok || !j.sucesso) {
    throw new Error(
      j.mensagem || "Não foi possível validar a sessão."
    );
  }

  return j.dados;
}

/* =====================================================
   INICIALIZAÇÃO
   ===================================================== */

(async () => {

  const s = getSession();

  if (!s?.token) {
    showLogin();
    return;
  }

  try {

    const d = await validarSessaoWorker(s.token);

    const sessaoAtual = {
      ...s,
      administrador: d.administrador
    };

    setSession(sessaoAtual);
    showApp(sessaoAtual);
    await carregarDashboard();
    await carregarConfiguracoes_();

  } catch (e) {

    clearSession();
    showLogin();

    error.textContent = e.message;
    error.hidden = false;

  }

})();

/* =====================================================
   CADASTRO DE EVENTOS (ADMINISTRADOR PRINCIPAL)
   ===================================================== */
let eventosGerenciados_ = [];
let eventoEmEdicao_ = null;
const eventModal_ = document.getElementById("eventModal");
const eventForm_ = document.getElementById("eventForm");

function formatarInicioEvento_(v) {
  if (!v) return "—";
  const d = new Date(String(v).replace(" ", "T"));
  return Number.isNaN(d.getTime()) ? String(v) : d.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

async function carregarEventosAdmin_() {
  if (getSession()?.administrador?.isSuperadmin !== true) return;
  const tbody = document.getElementById("eventsRows");
  if (tbody) tbody.innerHTML = '<tr><td colspan="6" class="table-empty">Carregando eventos...</td></tr>';
  try {
    const d = await apiGet("eventos", { token: getSession().token });
    eventosGerenciados_ = d.eventos || [];
    renderEventosAdmin_();
    const seletor = document.getElementById("eventoAtual");
    if (seletor && getSession()?.administrador?.isSuperadmin === true) {
      const ativos = eventosGerenciados_.filter(ev => Number(ev.active) === 1);
      const selecionado = seletor.value || EVENTO_ATUAL;
      seletor.innerHTML = ativos.map(ev => `<option value="${escUser(ev.id)}">${escUser(ev.name)}</option>`).join("");
      if (ativos.some(ev => ev.id === selecionado)) seletor.value = selecionado;
      else if (ativos.length) { seletor.value = ativos[0].id; EVENTO_ATUAL = ativos[0].id; localStorage.setItem(EVENTO_KEY, EVENTO_ATUAL); aplicarEventoSelecionado_(); }
    }
  } catch (e) {
    if (/sessão/i.test(e.message || "")) { clearSession(); showLogin(); return; }
    if (tbody) tbody.innerHTML = `<tr><td colspan="6" class="table-empty">${escUser(e.message)}</td></tr>`;
  }
}

function renderEventosAdmin_() {
  const tbody = document.getElementById("eventsRows");
  if (!tbody) return;
  if (!eventosGerenciados_.length) { tbody.innerHTML = '<tr><td colspan="6" class="table-empty">Nenhum evento cadastrado.</td></tr>'; return; }
  tbody.innerHTML = eventosGerenciados_.map(ev => `
    <tr>
      <td><strong>${escUser(ev.name)}</strong>${ev.maps_url ? `<div class="event-map-link"><a href="${escUser(ev.maps_url)}" target="_blank" rel="noopener noreferrer">Abrir localização</a></div>` : ""}</td>
      <td><code>${escUser(ev.id)}</code></td><td>${escUser(ev.type)}</td>
      <td>${escUser(formatarInicioEvento_(ev.start_date))}</td>
      <td><span class="user-status ${Number(ev.active) === 1 ? "active" : "inactive"}">${Number(ev.active) === 1 ? "ATIVO" : "INATIVO"}</span></td>
      <td class="user-row-actions"><button type="button" class="table-action" data-edit-event="${escUser(ev.id)}">EDITAR</button> <button type="button" class="table-action" data-toggle-event="${escUser(ev.id)}" data-active="${Number(ev.active) === 1 ? 1 : 0}">${Number(ev.active) === 1 ? "DESATIVAR" : "ATIVAR"}</button></td>
    </tr>`).join("");
  tbody.querySelectorAll("[data-edit-event]").forEach(b => b.addEventListener("click", () => abrirModalEvento_(b.dataset.editEvent)));
  tbody.querySelectorAll("[data-toggle-event]").forEach(b => b.addEventListener("click", () => alterarStatusEvento_(b.dataset.toggleEvent, Number(b.dataset.active) === 1 ? 0 : 1)));
}

function abrirModalEvento_(id = null) {
  eventoEmEdicao_ = eventosGerenciados_.find(e => e.id === id) || null;
  eventForm_?.reset();
  document.getElementById("eventError").hidden = true;
  document.getElementById("eventModalTitle").textContent = eventoEmEdicao_ ? "Editar evento" : "Cadastrar evento";
  document.getElementById("saveEvent").textContent = eventoEmEdicao_ ? "SALVAR ALTERAÇÕES" : "SALVAR EVENTO";
  const code = document.getElementById("eventCode");
  code.disabled = Boolean(eventoEmEdicao_);
  document.getElementById("eventName").value = eventoEmEdicao_?.name || "";
  code.value = eventoEmEdicao_?.id || "";
  document.getElementById("eventType").value = eventoEmEdicao_?.type || "";
  document.getElementById("eventStartDate").value = eventoEmEdicao_?.start_date ? String(eventoEmEdicao_.start_date).replace(" ", "T").slice(0,16) : "";
  const plateStart = document.getElementById("eventPlateStart");
  plateStart.value = eventoEmEdicao_?.plate_start_number ?? 1;
  const placaJaUtilizada = Boolean(eventoEmEdicao_ && Number(eventoEmEdicao_.last_plate_number) >= Number(eventoEmEdicao_.plate_start_number));
  plateStart.disabled = placaJaUtilizada;
  plateStart.required = !placaJaUtilizada;
  plateStart.title = placaJaUtilizada ? "A numeração já começou e não pode ser reiniciada." : "Pode ser alterado enquanto nenhuma placa tiver sido atribuída.";
  document.getElementById("eventMapsUrl").value = eventoEmEdicao_?.maps_url || "";
  eventModal_.hidden = false;
  document.body.classList.add("modal-open");
  setTimeout(() => document.getElementById("eventName")?.focus(), 40);
}

function fecharModalEvento_() {
  if (!eventModal_) return;
  eventModal_.hidden = true; eventoEmEdicao_ = null; document.body.classList.remove("modal-open");
}

async function alterarStatusEvento_(id, ativo) {
  const acao = ativo ? "ativar" : "desativar";
  if (!confirm(`Deseja ${acao} este evento? Isso não apaga inscrições nem dados.`)) return;
  try { await apiPost("statusEvento", { token: getSession().token, id, ativo }); await carregarEventosAdmin_(); notificar("success", "EVENTO ATUALIZADO", `Evento ${ativo ? "ativado" : "desativado"}.`); }
  catch (e) { notificar("error", "NÃO FOI POSSÍVEL ATUALIZAR", e.message); }
}

document.getElementById("newEventBtn")?.addEventListener("click", () => abrirModalEvento_());
document.getElementById("closeEventModal")?.addEventListener("click", fecharModalEvento_);
document.getElementById("cancelEvent")?.addEventListener("click", fecharModalEvento_);
eventModal_?.addEventListener("click", e => { if (e.target === eventModal_) fecharModalEvento_(); });
eventForm_?.addEventListener("submit", async e => {
  e.preventDefault();
  const err = document.getElementById("eventError"); err.hidden = true;
  const payload = {
    token: getSession()?.token,
    id: eventoEmEdicao_?.id || undefined,
    codigo: document.getElementById("eventCode").value.trim().toUpperCase(),
    nome: document.getElementById("eventName").value.trim(),
    tipo: document.getElementById("eventType").value,
    inicioInscricoes: document.getElementById("eventStartDate").value,
    mapsUrl: document.getElementById("eventMapsUrl").value.trim(),
    numeroInicialPlaca: Number(document.getElementById("eventPlateStart").value)
  };
  const botao = document.getElementById("saveEvent"); botao.disabled = true;
  try {
    await apiPost(eventoEmEdicao_ ? "alterarEvento" : "criarEvento", payload);
    fecharModalEvento_(); await carregarEventosAdmin_();
    notificar("success", "EVENTO SALVO", "Os dados do evento foram salvos no banco de dados.");
  } catch (ex) { err.textContent = ex.message || "Não foi possível salvar o evento."; err.hidden = false; }
  finally { botao.disabled = false; }
});

/* =====================================================
   USUÁRIOS ADMINISTRATIVOS
   ===================================================== */

let usuariosAdmin = [];
let eventosAdminDisponiveis = [];
let usuarioSenhaAtual = null;

const userModal = document.getElementById("userModal");
const passwordModal = document.getElementById("passwordModal");
const userForm = document.getElementById("userForm");
const passwordForm = document.getElementById("passwordForm");

function escUser(v) {
  return String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

async function carregarUsuarios() {
  const s = getSession();
  if (!s?.token) {
    showLogin();
    return;
  }

  const body = document.getElementById("usersRows");
  if (body) {
    body.innerHTML = '<tr><td colspan="6" class="table-empty">Carregando usuários...</td></tr>';
  }

  try {
    const d = await apiGet("usuarios", { token: s.token });
    usuariosAdmin = d.usuarios || [];
    eventosAdminDisponiveis = d.eventos || [];
    renderEventosAcessoUsuario();
    renderUsuarios();
  } catch (e) {
    if (/sessão/i.test(e.message || "")) {
      clearSession();
      showLogin();
      return;
    }
    notificar("error", "ERRO AO CARREGAR", e.message || "Não foi possível carregar os usuários.");
  }
}

function renderEventosAcessoUsuario() {
  const container = document.getElementById("userEventsAccess");
  if (!container) return;
  const ativos = eventosAdminDisponiveis.filter(e => Number(e.active) === 1);
  container.innerHTML = ativos.length ? ativos.map(e => `
    <label class="user-event-option"><input type="checkbox" name="userEventAccess" value="${escUser(e.id)}"> <span>${escUser(e.name)}</span></label>
  `).join("") : '<small>Nenhum evento ativo cadastrado.</small>';
}

function renderUsuarios() {
  const body = document.getElementById("usersRows");
  if (!body) return;

  if (!usuariosAdmin.length) {
    body.innerHTML = '<tr><td colspan="6" class="table-empty">Nenhum usuário cadastrado.</td></tr>';
    return;
  }

  body.innerHTML = usuariosAdmin.map(u => {
    const ativo = String(u.ativo || "").toUpperCase() === "SIM";
    return `
      <tr>
        <td><strong>${escUser(u.nome)}</strong></td>
        <td>${escUser(u.email)}</td>
        <td>${u.isSuperadmin ? "Todos os eventos" : escUser((u.eventos || []).map(id => eventosAdminDisponiveis.find(e => e.id === id)?.name || id).join(", "))}</td>
        <td><span class="user-status ${ativo ? "active" : "inactive"}">${ativo ? "ATIVO" : "INATIVO"}</span></td>
        <td>${escUser(u.criadoEm || "")}</td>
        <td class="user-row-actions">
          ${u.isSuperadmin ? '<span class="muted">Administrador principal</span>' : `<button type="button" class="table-action" data-password-user="${escUser(u.id)}">GERENCIAR ACESSO</button>`}
        </td>
      </tr>
    `;
  }).join("");

  body.querySelectorAll("[data-password-user]").forEach(btn => {
    btn.addEventListener("click", () => abrirModalSenha(btn.dataset.passwordUser));
  });
}

function abrirModalUsuario() {
  if (!userModal || !userForm) return;
  userForm.reset();
  document.getElementById("userError").hidden = true;
  document.getElementById("userModalEyebrow").textContent = "NOVO USUÁRIO";
  document.getElementById("userModalTitle").textContent = "Cadastrar administrador";
  document.getElementById("saveUser").textContent = "CRIAR USUÁRIO";
  userModal.hidden = false;
  document.body.classList.add("modal-open");
  setTimeout(() => document.getElementById("userNome")?.focus(), 50);
}

function fecharModalUsuario() {
  if (!userModal) return;
  userModal.hidden = true;
  document.body.classList.remove("modal-open");
}

function abrirModalSenha(id) {
  const u = usuariosAdmin.find(x => String(x.id) === String(id));
  if (!u || !passwordModal) return;

  usuarioSenhaAtual = u;
  passwordForm.reset();

  document.getElementById("passwordUserName").textContent = u.nome || "—";
  document.getElementById("passwordUserEmail").textContent = u.email || "—";
  document.getElementById("passwordError").hidden = true;
  const eventosContainer = document.getElementById("passwordUserEventsAccess");
  const eventosAtivos = eventosAdminDisponiveis.filter(e => Number(e.active) === 1);
  if (eventosContainer) {
    eventosContainer.innerHTML = eventosAtivos.length ? eventosAtivos.map(e => `
      <label class="user-event-option"><input type="checkbox" name="passwordUserEventAccess" value="${escUser(e.id)}" ${(u.eventos || []).includes(e.id) ? "checked" : ""}> <span>${escUser(e.name)}</span></label>
    `).join("") : '<small>Nenhum evento ativo cadastrado.</small>';
  }

  passwordModal.hidden = false;
  document.body.classList.add("modal-open");
  setTimeout(() => document.getElementById("newUserPassword")?.focus(), 50);
}

function fecharModalSenha() {
  if (!passwordModal) return;
  passwordModal.hidden = true;
  usuarioSenhaAtual = null;
  document.body.classList.remove("modal-open");
}

document.getElementById("newUserBtn")?.addEventListener("click", abrirModalUsuario);
document.getElementById("closeUserModal")?.addEventListener("click", fecharModalUsuario);
document.getElementById("cancelUser")?.addEventListener("click", fecharModalUsuario);
document.getElementById("closePasswordModal")?.addEventListener("click", fecharModalSenha);
document.getElementById("cancelPassword")?.addEventListener("click", fecharModalSenha);

userModal?.addEventListener("click", e => {
  if (e.target === userModal) fecharModalUsuario();
});
passwordModal?.addEventListener("click", e => {
  if (e.target === passwordModal) fecharModalSenha();
});

userForm?.addEventListener("submit", async e => {
  e.preventDefault();

  const s = getSession();
  if (!s?.token) {
    showLogin();
    return;
  }

  const senha = document.getElementById("userSenha").value;
  const confirm = document.getElementById("userSenhaConfirm").value;
  const err = document.getElementById("userError");

  if (senha.length < 6) {
    err.textContent = "A senha deve ter pelo menos 6 caracteres.";
    err.hidden = false;
    return;
  }

  if (senha !== confirm) {
    err.textContent = "As senhas não conferem.";
    err.hidden = false;
    return;
  }

  const eventosSelecionados = [...document.querySelectorAll('input[name="userEventAccess"]:checked')].map(el => el.value);
  if (!eventosSelecionados.length) {
    err.textContent = "Selecione ao menos um evento para esse usuário.";
    err.hidden = false;
    return;
  }

  const btn = document.getElementById("saveUser");
  const old = btn.textContent;
  btn.disabled = true;
  btn.textContent = "SALVANDO...";

  try {
    await apiPost("criarUsuario", {
      token: s.token,
      nome: document.getElementById("userNome").value.trim(),
      email: document.getElementById("userEmailInput").value.trim(),
      senha,
      eventos: [...document.querySelectorAll('input[name="userEventAccess"]:checked')].map(el => el.value)
    });

    fecharModalUsuario();
    await carregarUsuarios();

    notificar(
      "success",
      "USUÁRIO CRIADO",
      "O novo administrador já pode acessar o painel."
    );
  } catch (e) {
    err.textContent = e.message || "Não foi possível criar o usuário.";
    err.hidden = false;
  } finally {
    btn.disabled = false;
    btn.textContent = old;
  }
});

passwordForm?.addEventListener("submit", async e => {
  e.preventDefault();

  const s = getSession();
  if (!s?.token) {
    showLogin();
    return;
  }

  if (!usuarioSenhaAtual) return;

  const senha = document.getElementById("newUserPassword").value;
  const confirm = document.getElementById("newUserPasswordConfirm").value;
  const err = document.getElementById("passwordError");

  if (senha && senha.length < 6) {
    err.textContent = "A senha deve ter pelo menos 6 caracteres.";
    err.hidden = false;
    return;
  }

  if (senha !== confirm) {
    err.textContent = "As senhas não conferem.";
    err.hidden = false;
    return;
  }

  const eventosSelecionados = [...document.querySelectorAll('input[name="passwordUserEventAccess"]:checked')].map(el => el.value);
  if (!eventosSelecionados.length) {
    err.textContent = "Selecione ao menos um evento para esse usuário.";
    err.hidden = false;
    return;
  }

  const btn = document.getElementById("savePassword");
  const old = btn.textContent;
  btn.disabled = true;
  btn.textContent = "ALTERANDO...";

  try {
    await apiPost("alterarSenhaUsuario", {
      token: s.token,
      id: usuarioSenhaAtual.id,
      senha,
      eventos: eventosSelecionados
    });

    fecharModalSenha();

    notificar(
      "success",
      "USUÁRIO ATUALIZADO",
      senha ? "A senha e os eventos permitidos foram atualizados. O usuário precisará entrar novamente." : "Os eventos permitidos foram atualizados. O usuário precisará entrar novamente para carregar os novos acessos."
    );
  } catch (e) {
    err.textContent = e.message || "Não foi possível alterar a senha.";
    err.hidden = false;
  } finally {
    btn.disabled = false;
    btn.textContent = old;
  }
});

document.addEventListener("keydown", e => {
  if (e.key === "Escape") {
    if (userModal && !userModal.hidden) fecharModalUsuario();
    if (passwordModal && !passwordModal.hidden) fecharModalSenha();
  }
});


/* =====================================================
   CLIQUE NO BOTÃO DETALHES
   ===================================================== */

document
  .getElementById("expensesTableBody")
  ?.addEventListener(
    "click",
    e => {

      const botao =
        e.target.closest(
          "[data-expense-details]"
        );

      if (!botao) {
        return;
      }

      abrirDetalhesDespesa_(
        botao.dataset.expenseDetails
      );

    }
  );


/* =====================================================
   FECHAR MODAL DE DETALHES
   ===================================================== */

document
  .getElementById("closeExpenseDetailsModal")
  ?.addEventListener(
    "click",
    fecharDetalhesDespesa_
  );


document
  .getElementById("closeExpenseDetailsButton")
  ?.addEventListener(
    "click",
    fecharDetalhesDespesa_
  );


document
  .getElementById("expenseDetailsModal")
  ?.addEventListener(
    "click",
    e => {

      if (
        e.target.id ===
        "expenseDetailsModal"
      ) {

        fecharDetalhesDespesa_();

      }

    }
  );
  
  /* =====================================================
   MODAL - PAGAR DESPESA
   ===================================================== */

function atualizarDescricoesAnexosPagamento_() {
  const input = document.getElementById("payExpenseReceipt");
  const area = document.getElementById("payExpenseAttachmentDescriptions");
  if (!input || !area) return;
  area.innerHTML = [...(input.files || [])].map((file, i) => `
    <div style="border:1px solid #e2e7e3;border-radius:9px;padding:10px;display:grid;gap:6px;">
      <strong style="font-size:12px;overflow-wrap:anywhere;">${esc(file.name)}</strong>
      <label style="font-size:12px;">Descrição do anexo *</label>
      <input type="text" data-payment-attachment-description="${i}" placeholder="Ex.: Comprovante PIX da primeira parcela" maxlength="180">
    </div>`).join("");
}

document.getElementById("payExpenseReceipt")?.addEventListener("change", atualizarDescricoesAnexosPagamento_);

function abrirPagamentoDespesa_(numero) {

  const despesa =
    despesas.find(
      item =>
        String(item.numero) ===
        String(numero)
    );

  if (!despesa) {
    return;
  }


  DESPESA_PAGAR =
    despesa.numero;


  const valorFormatado = moeda(Number(despesa.valor || 0));

  const saldoAtual = Number(despesa.saldoRestante ?? (Number(despesa.valor||0)-Number(despesa.valorPago||0)));
  const campoValorParcela = document.getElementById("payExpenseAmount");
  if (campoValorParcela) campoValorParcela.value = saldoAtual.toFixed(2);
  const saldoLabel = document.getElementById("payExpenseBalance");
  if (saldoLabel) saldoLabel.textContent = `Total: ${valorFormatado} · Pago: ${moeda(Number(despesa.valorPago||0))} · Saldo: ${moeda(saldoAtual)}`;

  document
    .getElementById(
      "payExpenseNumber"
    )
    .textContent =
      "#" +
      String(
        despesa.numero
      )
        .padStart(
          3,
          "0"
        );


  document
    .getElementById(
      "payExpenseValue"
    )
    .textContent =
      valorFormatado;


  document
    .getElementById(
      "payExpenseName"
    )
    .textContent =
      despesa.nome || "-";


  document
    .getElementById(
      "payExpenseSupplier"
    )
    .textContent =
      despesa.fornecedorEmpresa ||
      "-";


  const data =
    document.getElementById(
      "payExpenseDate"
    );

  if (data) {

    const hoje =
      new Date();

    const ano =
      hoje.getFullYear();

    const mes =
      String(
        hoje.getMonth() + 1
      )
        .padStart(
          2,
          "0"
        );

    const dia =
      String(
        hoje.getDate()
      )
        .padStart(
          2,
          "0"
        );

    data.value =
      `${ano}-${mes}-${dia}`;

  }


  const forma =
    document.getElementById(
      "payExpenseMethod"
    );

  if (forma) {
    forma.value = "";
  }


  const observacao =
    document.getElementById(
      "payExpenseObservation"
    );

  if (observacao) {
    observacao.value = "";
  }
  
  const comprovante =
  document.getElementById(
    "payExpenseReceipt"
  );

if (comprovante) {
  comprovante.value = "";
}
const descricoesAnexos = document.getElementById("payExpenseAttachmentDescriptions");
if (descricoesAnexos) descricoesAnexos.innerHTML = "";


  const modal =
    document.getElementById(
      "payExpenseModal"
    );

  if (modal) {

    modal.hidden = false;

    document.body.classList.add(
      "modal-open"
    );

  }

}


function fecharPagamentoDespesa_() {

  const modal =
    document.getElementById(
      "payExpenseModal"
    );

  if (modal) {
    modal.hidden = true;
  }

  DESPESA_PAGAR = null;

  document.body.classList.remove(
    "modal-open"
  );

}


// Delegação no document para continuar funcionando mesmo quando
// o conteúdo da tabela de contas a pagar é reconstruído via innerHTML.
document.addEventListener("click", e => {
  const alvo = e.target;
  const botao = alvo && typeof alvo.closest === "function"
    ? alvo.closest("[data-finance-pay]")
    : null;

  if (!botao) return;

  e.preventDefault();
  const numero = botao.getAttribute("data-finance-pay");

  try {
    abrirPagamentoDespesa_(numero);
  } catch (erro) {
    console.error("Erro ao abrir pagamento da despesa:", erro);
    notificar("error", "ERRO AO ABRIR PAGAMENTO", erro?.message || "Não foi possível abrir o pagamento.");
  }
});


document
  .getElementById(
    "closePayExpenseModal"
  )
  ?.addEventListener(
    "click",
    fecharPagamentoDespesa_
  );


document
  .getElementById(
    "cancelPayExpense"
  )
  ?.addEventListener(
    "click",
    fecharPagamentoDespesa_
  );
  
  /* =====================================================
   CONFIRMIRMAR PAGAMENTO DA DESPESA
   ===================================================== */

document
  .getElementById(
    "confirmPayExpense"
  )
  ?.addEventListener(
    "click",
    async () => {

      if (!DESPESA_PAGAR) {
        return;
      }

      const session =
        getSession();

      if (!session?.token) {

        notificar(
          "warning",
          "SESSÃO EXPIRADA",
          "Faça login novamente."
        );

        return;
      }


      const dataPagamento =
        document
          .getElementById(
            "payExpenseDate"
          )
          ?.value || "";


      const formaPagamento =
        document
          .getElementById(
            "payExpenseMethod"
          )
          ?.value || "";


      const observacaoPagamento =
        document
          .getElementById(
            "payExpenseObservation"
          )
          ?.value
          .trim() || "";
      const valorParcela = Number(document.getElementById("payExpenseAmount")?.value || 0);
      const arquivosPagamento = [...(document.getElementById("payExpenseReceipt")?.files || [])];
      const descricoesPagamento = arquivosPagamento.map((file, i) => ({ file, descricao: document.querySelector(`[data-payment-attachment-description="${i}"]`)?.value.trim() || "" }));


      /* VALIDAÇÕES */

      if (!Number.isFinite(valorParcela) || valorParcela <= 0) {
        notificar("warning", "VALOR INVÁLIDO", "Informe o valor desta parcela.");
        return;
      }
      if (descricoesPagamento.some(x => !x.descricao)) {
        notificar("warning", "DESCRIÇÃO OBRIGATÓRIA", "Informe uma descrição para cada anexo selecionado.");
        return;
      }
      if (!dataPagamento) {

        notificar(
          "warning",
          "INFORME A DATA",
          "Informe a data do pagamento."
        );

        return;
      }


      if (!formaPagamento) {

        notificar(
          "warning",
          "INFORME A FORMA",
          "Selecione a forma de pagamento."
        );

        return;
      }


      const botao =
        document.getElementById(
          "confirmPayExpense"
        );


      try {

        if (botao) {

          botao.disabled = true;

          botao.textContent =
            "PROCESSANDO...";

        }


       /* =====================================================
   REGISTRA O PAGAMENTO
   ===================================================== */

const numeroDespesa =
  DESPESA_PAGAR;


/* Primeiro envia os arquivos ao Drive. Se algum upload falhar, não registra a parcela. */
const anexosDrive = [];
for (const item of descricoesPagamento) {
  const base64 = await bytesToBase64(item.file);
  const driveFile = await apiPost("uploadAnexoDespesa", {
    token: session.token, evento: EVENTO_ATUAL, numero: numeroDespesa,
    nome: item.file.name, mimeType: item.file.type || "application/octet-stream", arquivoBase64: base64
  });
  anexosDrive.push({ driveFile, descricao: item.descricao, nomeOriginal: item.file.name });
}

const pagamentoCriado = await apiPost("registrarPagamento", {
  token: session.token, evento: EVENTO_ATUAL, numero: numeroDespesa,
  valor: valorParcela, dataPagamento, formaPagamento, observacaoPagamento
});

/* Vincula cada arquivo do Drive à parcela e grava sua descrição no D1. */
for (const item of anexosDrive) {
  await apiPost("vincularAnexoPagamento", {
    token: session.token, evento: EVENTO_ATUAL, paymentId: pagamentoCriado.paymentId,
    fileId: item.driveFile.fileId, nome: item.driveFile.nome || item.nomeOriginal,
    descricao: item.descricao, url: item.driveFile.url || ""
  });
}



/* =====================================================
   FECHA O MODAL
   ===================================================== */

fecharPagamentoDespesa_();


       /* =====================================================
   ATUALIZA TODA A TELA FINANCEIRA
   ===================================================== */

await carregarPagamentos();


        notificar(
          "success",
          "PAGAMENTO REGISTRADO",
          `Parcela de ${valorParcela.toLocaleString("pt-BR",{style:"currency",currency:"BRL"})} registrada com sucesso.`
        );


      } catch (erro) {

        console.error(
          "Erro ao pagar despesa:",
          erro
        );


        notificar(
          "error",
          "ERRO NO PAGAMENTO",
          erro?.message ||
          "Não foi possível registrar o pagamento."
        );


      } finally {

        if (botao) {

          botao.disabled = false;

          botao.textContent =
            "CONFIRMAR PAGAMENTO";

        }

      }

    }
  );


/* =====================================================
   PATROCÍNIOS - RECEBIMENTOS POR EVENTO
   ===================================================== */
let patrocinios = [];
let PATROCINIO_EDITANDO = null;
const sponsorshipModal = document.getElementById("sponsorshipModal");

function abrirModalPatrocinio_() {
  if (!sponsorshipModal) return;
  sponsorshipModal.hidden = false;
  document.body.classList.add("modal-open");
}
function fecharModalPatrocinio_() {
  if (!sponsorshipModal) return;
  sponsorshipModal.hidden = true;
  document.body.classList.remove("modal-open");
}
function limparFormularioPatrocinio_() {
  ["sponsorshipName", "sponsorshipAmount", "sponsorshipDate", "sponsorshipMethod", "sponsorshipNotes", "sponsorshipProof"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = "";
  });
  const status = document.getElementById("sponsorshipProofStatus");
  if (status) status.textContent = "Nenhum arquivo selecionado.";
}
function renderizarPatrocinios_() {
  const tbody = document.getElementById("sponsorshipTableBody");
  const total = patrocinios.reduce((s, p) => s + Number(p.valor || 0), 0);
  const totalEl = document.getElementById("sponsorshipTotal");
  const countEl = document.getElementById("sponsorshipCount");
  if (totalEl) totalEl.textContent = moeda(total);
  if (countEl) countEl.textContent = `${patrocinios.length} recebimento(s) registrado(s)`;
  if (!tbody) return;
  if (!patrocinios.length) {
    tbody.innerHTML = '<tr><td colspan="7" style="padding:40px;text-align:center;color:#888;">Nenhum patrocínio registrado para este evento.</td></tr>';
    return;
  }
  tbody.innerHTML = patrocinios.map(p => `
    <tr>
      <td><strong>${esc(p.patrocinador || "-")}</strong></td>
      <td>${p.dataRecebimento ? new Date(p.dataRecebimento + "T00:00:00").toLocaleDateString("pt-BR") : "-"}</td>
      <td>${esc(p.formaPagamento || "-")}</td>
      <td><strong>${moeda(p.valor)}</strong></td>
      <td>${esc(p.observacoes || "-")}</td>
      <td>${p.proofFileId ? `<button type="button" class="action" data-sponsor-file="${esc(p.proofFileId)}" data-sponsor-event="${esc(EVENTO_ATUAL)}">🧾 VER</button>` : "—"}</td>
      <td><div style="display:flex;gap:6px;flex-wrap:wrap;">
        <button type="button" class="action" data-sponsor-edit="${esc(p.id)}">EDITAR</button>
        <button type="button" class="action danger" data-sponsor-delete="${esc(p.id)}">EXCLUIR</button>
      </div></td>
    </tr>`).join("");
}
async function carregarPatrocinios_() {
  const session = getSession();
  if (!session?.token) return;
  const tbody = document.getElementById("sponsorshipTableBody");
  if (tbody) tbody.innerHTML = '<tr><td colspan="7" style="padding:40px;text-align:center;color:#888;">Carregando patrocínios...</td></tr>';
  try {
    const result = await apiGet("patrocinios", {token:session.token, evento:EVENTO_ATUAL});
    patrocinios = result.patrocinios || [];
    renderizarPatrocinios_();
  } catch (e) {
    if (tbody) tbody.innerHTML = `<tr><td colspan="7" style="padding:40px;text-align:center;color:#b44;">${esc(e.message || "Não foi possível carregar os patrocínios.")}</td></tr>`;
    notificar("error", "ERRO AO CARREGAR PATROCÍNIOS", e.message || "Tente novamente.");
  }
}
document.getElementById("sponsorshipProof")?.addEventListener("change", () => {
  const input = document.getElementById("sponsorshipProof");
  const file = input?.files?.[0];
  const status = document.getElementById("sponsorshipProofStatus");
  if (!status) return;
  if (!file) { status.textContent = "Nenhum arquivo selecionado."; return; }
  const sizeMb = file.size / (1024 * 1024);
  if (sizeMb > 5) { input.value = ""; status.textContent = "Arquivo acima do limite de 5 MB."; notificar("warning", "ARQUIVO MUITO GRANDE", "O comprovante deve ter até 5 MB."); return; }
  if (!["application/pdf", "image/jpeg", "image/png"].includes(file.type)) { input.value = ""; status.textContent = "Formato não permitido."; notificar("warning", "FORMATO INVÁLIDO", "Envie um arquivo PDF, JPG ou PNG."); return; }
  status.textContent = `${file.name} · ${sizeMb.toFixed(2).replace(".", ",")} MB`;
});

document.getElementById("newSponsorshipBtn")?.addEventListener("click", () => {
  PATROCINIO_EDITANDO = null;
  limparFormularioPatrocinio_();
  const title = document.getElementById("sponsorshipModalTitle");
  const save = document.getElementById("saveSponsorship");
  if (title) title.textContent = "Novo recebimento";
  if (save) save.textContent = "REGISTRAR RECEBIMENTO";
  const date = document.getElementById("sponsorshipDate");
  if (date) { const now = new Date(); date.value = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-${String(now.getDate()).padStart(2,"0")}`; }
  abrirModalPatrocinio_();
});
document.getElementById("closeSponsorshipModal")?.addEventListener("click", fecharModalPatrocinio_);
document.getElementById("cancelSponsorship")?.addEventListener("click", fecharModalPatrocinio_);
sponsorshipModal?.addEventListener("click", e => { if (e.target === sponsorshipModal) fecharModalPatrocinio_(); });
document.getElementById("saveSponsorship")?.addEventListener("click", async () => {
  const session = getSession();
  if (!session?.token) return notificar("warning", "SESSÃO EXPIRADA", "Faça login novamente.");
  const patrocinador = document.getElementById("sponsorshipName")?.value.trim() || "";
  const valor = Number(document.getElementById("sponsorshipAmount")?.value || 0);
  const dataRecebimento = document.getElementById("sponsorshipDate")?.value || "";
  const formaPagamento = document.getElementById("sponsorshipMethod")?.value || "";
  const observacoes = document.getElementById("sponsorshipNotes")?.value.trim() || "";
  const arquivoComprovante = document.getElementById("sponsorshipProof")?.files?.[0] || null;
  if (!patrocinador) return notificar("warning", "INFORME O PATROCINADOR", "O nome do patrocinador é obrigatório.");
  if (!Number.isFinite(valor) || valor <= 0) return notificar("warning", "VALOR INVÁLIDO", "Informe um valor maior que zero.");
  if (!dataRecebimento) return notificar("warning", "INFORME A DATA", "A data do recebimento é obrigatória.");
  if (!formaPagamento) return notificar("warning", "FORMA DE PAGAMENTO", "Selecione a forma de pagamento.");
  const btn = document.getElementById("saveSponsorship");
  try {
    if (btn) { btn.disabled = true; btn.textContent = "SALVANDO..."; }
    let comprovante = null;
    if (arquivoComprovante) {
      const arquivoBase64 = await bytesToBase64(arquivoComprovante);
      comprovante = await apiPost("uploadAnexoPatrocinio", {
        token: session.token, evento: EVENTO_ATUAL, nome: arquivoComprovante.name,
        mimeType: arquivoComprovante.type, arquivoBase64
      });
    }
    await apiPost(PATROCINIO_EDITANDO ? "editarPatrocinio" : "criarPatrocinio", {
      token: session.token, evento: EVENTO_ATUAL, id: PATROCINIO_EDITANDO,
      patrocinador, valor, dataRecebimento, formaPagamento, observacoes,
      proofFileId: comprovante?.fileId || "", proofFileName: comprovante?.nome || "", proofUrl: comprovante?.url || ""
    });
    fecharModalPatrocinio_();
    await carregarPatrocinios_();
    notificar("success", "RECEBIMENTO SALVO", "O patrocínio foi registrado no evento selecionado.");
    if (document.getElementById("pagamentos")?.classList.contains("active")) await carregarPagamentos();
  } catch (e) {
    notificar("error", "ERRO AO SALVAR", e.message || "Não foi possível salvar o recebimento.");
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = PATROCINIO_EDITANDO ? "SALVAR ALTERAÇÕES" : "REGISTRAR RECEBIMENTO"; }
  }
});
document.getElementById("sponsorshipTableBody")?.addEventListener("click", async e => {
  const edit = e.target.closest("[data-sponsor-edit]");
  const del = e.target.closest("[data-sponsor-delete]");
  if (edit) {
    const p = patrocinios.find(x => x.id === edit.dataset.sponsorEdit);
    if (!p) return;
    PATROCINIO_EDITANDO = p.id;
    document.getElementById("sponsorshipName").value = p.patrocinador || "";
    document.getElementById("sponsorshipAmount").value = Number(p.valor || 0).toFixed(2);
    document.getElementById("sponsorshipDate").value = p.dataRecebimento || "";
    document.getElementById("sponsorshipMethod").value = p.formaPagamento || "";
    document.getElementById("sponsorshipNotes").value = p.observacoes || "";
    document.getElementById("sponsorshipProof").value = "";
    document.getElementById("sponsorshipProofStatus").textContent = p.proofUrl ? `Comprovante atual: ${p.proofFileName || "arquivo anexado"}. Envie outro arquivo para substituir.` : "Nenhum comprovante anexado. O envio é opcional.";
    document.getElementById("sponsorshipModalTitle").textContent = "Editar recebimento";
    document.getElementById("saveSponsorship").textContent = "SALVAR ALTERAÇÕES";
    abrirModalPatrocinio_();
  }
  if (del) {
    const p = patrocinios.find(x => x.id === del.dataset.sponsorDelete);
    if (!p || !confirm(`Excluir o recebimento de ${p.patrocinador} no valor de ${moeda(p.valor)}?`)) return;
    try {
      await apiPost("excluirPatrocinio", {token:getSession()?.token, evento:EVENTO_ATUAL, id:p.id});
      await carregarPatrocinios_();
      notificar("success", "RECEBIMENTO EXCLUÍDO", "O lançamento foi removido.");
      if (document.getElementById("pagamentos")?.classList.contains("active")) await carregarPagamentos();
    } catch (err) { notificar("error", "ERRO AO EXCLUIR", err.message || "Não foi possível excluir."); }
  }
});

/* =====================================================
   CHECKLISTS - CADASTRO E GERENCIAMENTO NO ADMIN
   ===================================================== */
let checklistsAdmin_ = [];
let checklistEditando_ = null;
let checklistItensForm_ = [];
const checklistModal_ = document.getElementById("checklistModal");

function formatarDataChecklist_(valor) {
  if (!valor) return "—";
  const data = new Date(String(valor).replace(" ", "T") + (String(valor).includes("Z") ? "" : "Z"));
  return Number.isNaN(data.getTime()) ? String(valor) : data.toLocaleString("pt-BR", {dateStyle:"short",timeStyle:"short"});
}

async function carregarChecklistsAdmin_() {
  const session = getSession();
  const tbody = document.getElementById("checklistsRows");
  if (!session?.token || !tbody) return;
  tbody.innerHTML = '<tr><td colspan="6" class="table-empty">Carregando checklists...</td></tr>';
  try {
    const result = await apiGet("checklists", {token:session.token,evento:EVENTO_ATUAL});
    checklistsAdmin_ = result.checklists || [];
    renderizarChecklistsAdmin_();
  } catch (e) {
    tbody.innerHTML = `<tr><td colspan="6" class="table-empty">${escUser(e.message || "Não foi possível carregar os checklists.")}</td></tr>`;
    if (/sessão/i.test(e.message || "")) { clearSession(); showLogin(); }
  }
}

function renderizarChecklistsAdmin_() {
  const tbody = document.getElementById("checklistsRows");
  if (!tbody) return;
  if (!checklistsAdmin_.length) {
    tbody.innerHTML = '<tr><td colspan="6" class="table-empty">Nenhum checklist cadastrado para este evento.</td></tr>';
    return;
  }
  tbody.innerHTML = checklistsAdmin_.map(c => {
    const arquivado = c.status === "archived";
    return `<tr>
      <td><code>#${Number(c.checklist_id)}</code></td>
      <td><strong>${escUser(c.title)}</strong>${c.description ? `<div style="font-size:10px;color:var(--muted);margin-top:4px;">${escUser(c.description)}</div>` : ""}</td>
      <td>${Number(c.active_items || 0)} ativo(s) <small style="color:var(--muted)">/ ${Number(c.total_items || 0)} total</small></td>
      <td><span class="checklist-status ${arquivado ? "checklist-status-archived" : "checklist-status-active"}">${arquivado ? "ARQUIVADO" : "ATIVO"}</span></td>
      <td>${formatarDataChecklist_(c.created_at)}</td>
      <td><div class="checklist-actions">
        <a class="action" href="/checklist/${Number(c.checklist_id)}" target="_blank" rel="noopener">ABRIR LINK</a>
        <button type="button" class="action" data-checklist-edit="${Number(c.checklist_id)}" ${arquivado ? "disabled" : ""}>EDITAR</button>
        <button type="button" class="action" data-checklist-status="${Number(c.checklist_id)}" data-status="${arquivado ? "active" : "archived"}">${arquivado ? "REATIVAR" : "ARQUIVAR"}</button>
      </div></td>
    </tr>`;
  }).join("");
}

function renderizarItensChecklistForm_() {
  const container = document.getElementById("checklistItemRows");
  if (!container) return;
  if (!checklistItensForm_.length) {
    container.innerHTML = '<div class="checklist-empty-items">Nenhum item adicionado. Use “Adicionar item”.</div>';
    return;
  }
  container.innerHTML = checklistItensForm_.map((item,index) => `
    <div class="checklist-item-row ${item.active ? "" : "is-inactive"}">
      <div class="checklist-item-number">${item.checklist_item_id ? `#${Number(item.checklist_item_id)}` : `Novo ${index+1}`}</div>
      <input type="text" maxlength="300" data-checklist-item-description="${index}" value="${escUser(item.description || "")}" placeholder="Descreva a tarefa..." aria-label="Descrição do item ${index+1}">
      <button type="button" class="action checklist-item-toggle" data-checklist-item-toggle="${index}">${item.active ? "INATIVAR" : "REATIVAR"}</button>
    </div>
  `).join("");
}

function abrirModalChecklist_(registro = null, itens = []) {
  checklistEditando_ = registro ? Number(registro.checklist_id) : null;
  checklistItensForm_ = itens.map(i => ({
    checklist_item_id: i.checklist_item_id ? Number(i.checklist_item_id) : null,
    description: i.description || "",
    active: Number(i.active) === 1
  }));
  document.getElementById("checklistModalTitle").textContent = registro ? "Editar checklist" : "Novo checklist";
  document.getElementById("checklistTitle").value = registro?.title || "";
  document.getElementById("checklistDescription").value = registro?.description || "";
  const select = document.getElementById("eventoAtual");
  document.getElementById("checklistEventName").textContent = select?.selectedOptions?.[0]?.textContent || EVENTO_ATUAL;
  document.getElementById("checklistError").hidden = true;
  document.getElementById("saveChecklist").textContent = registro ? "SALVAR ALTERAÇÕES" : "SALVAR CHECKLIST";
  document.getElementById("saveChecklist").disabled = false;
  renderizarItensChecklistForm_();
  checklistModal_.hidden = false;
  document.body.classList.add("modal-open");
  setTimeout(() => document.getElementById("checklistTitle")?.focus(), 40);
}

function fecharModalChecklist_() {
  if (!checklistModal_) return;
  checklistModal_.hidden = true;
  checklistEditando_ = null;
  checklistItensForm_ = [];
  document.body.classList.remove("modal-open");
}

document.getElementById("newChecklistBtn")?.addEventListener("click", () => abrirModalChecklist_());
document.getElementById("closeChecklistModal")?.addEventListener("click", fecharModalChecklist_);
document.getElementById("cancelChecklist")?.addEventListener("click", fecharModalChecklist_);
checklistModal_?.addEventListener("click", e => { if (e.target === checklistModal_) fecharModalChecklist_(); });
document.getElementById("addChecklistItemBtn")?.addEventListener("click", () => {
  checklistItensForm_.push({checklist_item_id:null,description:"",active:true});
  renderizarItensChecklistForm_();
  const inputs = document.querySelectorAll("[data-checklist-item-description]");
  inputs[inputs.length-1]?.focus();
});
document.getElementById("checklistItemRows")?.addEventListener("input", e => {
  const input = e.target.closest("[data-checklist-item-description]");
  if (!input) return;
  const index = Number(input.dataset.checklistItemDescription);
  if (checklistItensForm_[index]) checklistItensForm_[index].description = input.value;
});
document.getElementById("checklistItemRows")?.addEventListener("click", e => {
  const button = e.target.closest("[data-checklist-item-toggle]");
  if (!button) return;
  const index = Number(button.dataset.checklistItemToggle);
  if (!checklistItensForm_[index]) return;
  checklistItensForm_[index].active = !checklistItensForm_[index].active;
  renderizarItensChecklistForm_();
});
document.getElementById("checklistsRows")?.addEventListener("click", async e => {
  const edit = e.target.closest("[data-checklist-edit]");
  const status = e.target.closest("[data-checklist-status]");
  const session = getSession();
  if (edit) {
    const registro = checklistsAdmin_.find(c => Number(c.checklist_id) === Number(edit.dataset.checklistEdit));
    if (!registro) return;
    try {
      const result = await apiGet("checklistItens", {token:session.token,evento:EVENTO_ATUAL,checklist_id:registro.checklist_id});
      abrirModalChecklist_(registro,result.itens || []);
    } catch (err) { notificar("error","ERRO AO ABRIR CHECKLIST",err.message || "Tente novamente."); }
  }
  if (status) {
    const id = Number(status.dataset.checklistStatus);
    const novoStatus = status.dataset.status;
    const acao = novoStatus === "archived" ? "arquivar" : "reativar";
    if (!confirm(`Deseja ${acao} este checklist? ${novoStatus === "archived" ? "Ele ficará disponível somente para consulta futura." : "Ele voltará a ficar disponível para gerenciamento."}`)) return;
    try {
      await apiPost("statusChecklist",{token:session.token,evento:EVENTO_ATUAL,checklist_id:id,status:novoStatus});
      await carregarChecklistsAdmin_();
      notificar("success","CHECKLIST ATUALIZADO",novoStatus === "archived" ? "Checklist arquivado sem apagar seus dados." : "Checklist reativado.");
    } catch (err) { notificar("error","NÃO FOI POSSÍVEL ATUALIZAR",err.message || "Tente novamente."); }
  }
});
document.getElementById("saveChecklist")?.addEventListener("click", async () => {
  const session = getSession();
  const title = document.getElementById("checklistTitle").value.trim();
  const description = document.getElementById("checklistDescription").value.trim();
  const error = document.getElementById("checklistError");
  const btn = document.getElementById("saveChecklist");
  error.hidden = true;
  if (!session?.token) return notificar("warning","SESSÃO EXPIRADA","Faça login novamente.");
  if (!title) { error.textContent = "Informe o nome do checklist."; error.hidden = false; return; }
  if (checklistItensForm_.some(i => !String(i.description || "").trim())) {
    error.textContent = "Preencha a descrição de todos os itens adicionados.";
    error.hidden = false;
    return;
  }
  try {
    btn.disabled = true;
    btn.textContent = "SALVANDO...";
    const payload = {
      token:session.token,evento:EVENTO_ATUAL,checklist_id:checklistEditando_,
      title,description,
      items:checklistItensForm_.map(i => ({checklist_item_id:i.checklist_item_id,description:String(i.description).trim(),active:i.active}))
    };
    await apiPost(checklistEditando_ ? "alterarChecklist" : "criarChecklist",payload);
    fecharModalChecklist_();
    await carregarChecklistsAdmin_();
    notificar("success","CHECKLIST SALVO","Cadastro atualizado com sucesso.");
  } catch (err) {
    error.textContent = err.message || "Não foi possível salvar o checklist.";
    error.hidden = false;
  } finally {
    btn.disabled = false;
    btn.textContent = checklistEditando_ ? "SALVAR ALTERAÇÕES" : "SALVAR CHECKLIST";
  }
});

/* =====================================================
   VISUALIZAR COMPROVANTE DE PATROCÍNIO (PROXY AUTENTICADO)
   ===================================================== */
let sponsorshipFileObjectUrl_ = null;

function fecharModalComprovantePatrocinio_() {
  const modal = document.getElementById("sponsorshipFileViewerModal");
  if (modal) modal.remove();
  if (sponsorshipFileObjectUrl_) {
    URL.revokeObjectURL(sponsorshipFileObjectUrl_);
    sponsorshipFileObjectUrl_ = null;
  }
}

async function visualizarComprovantePatrocinio_(botao) {
  const session = getSession();
  if (!session?.token) {
    notificar("warning","SESSÃO EXPIRADA","Faça login novamente.");
    return;
  }
  const fileId = String(botao.dataset.sponsorFile || "").trim();
  const evento = String(botao.dataset.sponsorEvent || EVENTO_ATUAL || "").trim();
  if (!fileId) return;
  fecharModalComprovantePatrocinio_();
  const modal = document.createElement("div");
  modal.id = "sponsorshipFileViewerModal";
  modal.style.cssText = "position:fixed;inset:0;z-index:10050;background:rgba(10,18,20,.78);display:flex;align-items:center;justify-content:center;padding:18px;";
  modal.innerHTML = `
    <section role="dialog" aria-modal="true" aria-label="Visualização do comprovante de patrocínio" style="width:min(100%,1000px);height:min(92vh,820px);background:#fff;border-radius:16px;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 20px 70px rgba(0,0,0,.35);">
      <header style="display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px 18px;border-bottom:1px solid #e5e9e6;">
        <strong style="font-size:15px;color:#172126;">Comprovante do patrocínio</strong>
        <div style="display:flex;align-items:center;gap:8px;">
          <a data-download-sponsor-file aria-disabled="true" style="display:inline-flex;align-items:center;gap:6px;border-radius:8px;background:#1d292d;color:#fff;padding:9px 13px;font-weight:800;text-decoration:none;opacity:.55;pointer-events:none;cursor:not-allowed;">↓ BAIXAR</a>
          <button type="button" data-close-sponsor-viewer style="border:0;border-radius:8px;background:#f1f4f2;padding:8px 13px;font-weight:800;cursor:pointer;">FECHAR ×</button>
        </div>
      </header>
      <div data-sponsor-viewer-content style="flex:1;min-height:0;display:flex;align-items:center;justify-content:center;padding:16px;color:#59645f;text-align:center;">Carregando comprovante...</div>
    </section>`;
  document.body.appendChild(modal);
  modal.addEventListener("click",ev=>{
    if(ev.target===modal||ev.target.closest("[data-close-sponsor-viewer]")) fecharModalComprovantePatrocinio_();
  });
  try {
    const response=await fetch(`${WORKER_API_URL}/admin/sponsorship-file`,{
      method:"POST",headers:{"Content-Type":"application/json"},
      body:JSON.stringify({token:session.token,fileId,evento})
    });
    if(!response.ok){
      let mensagem="Não foi possível carregar o comprovante.";
      if((response.headers.get("content-type")||"").includes("application/json")){
        const erro=await response.json(); mensagem=erro.mensagem||mensagem;
      }
      throw new Error(mensagem);
    }
    const blob=await response.blob();
    const mime=(blob.type||response.headers.get("content-type")||"").toLowerCase();
    sponsorshipFileObjectUrl_=URL.createObjectURL(blob);
    const disposition=response.headers.get("content-disposition")||"";
    const encoded=disposition.match(/filename\*=UTF-8''([^;]+)/i)?.[1];
    const plain=disposition.match(/filename="?([^";]+)"?/i)?.[1];
    let nome="comprovante";
    try { if(encoded) nome=decodeURIComponent(encoded); else if(plain) nome=plain; } catch(_) { nome=plain||"comprovante"; }
    const download=modal.querySelector("[data-download-sponsor-file]");
    download.href=sponsorshipFileObjectUrl_; download.download=nome;
    download.setAttribute("aria-disabled","false");
    download.style.opacity="1"; download.style.pointerEvents="auto"; download.style.cursor="pointer";
    const content=modal.querySelector("[data-sponsor-viewer-content]");
    if(mime.startsWith("image/")){
      content.innerHTML='<img alt="Comprovante do patrocínio" style="max-width:100%;max-height:100%;object-fit:contain;">';
      content.querySelector("img").src=sponsorshipFileObjectUrl_;
    }else if(mime.includes("pdf")){
      content.innerHTML='<iframe title="Comprovante em PDF" style="width:100%;height:100%;border:0;background:#f4f5f4;"></iframe>';
      content.querySelector("iframe").src=sponsorshipFileObjectUrl_;
    }else{
      content.innerHTML='<div><p>Este formato não possui visualização integrada.</p><p>Use o botão <strong>BAIXAR</strong> no topo do modal.</p></div>';
    }
  }catch(error){
    const content=modal.querySelector("[data-sponsor-viewer-content]");
    if(content) content.textContent=error.message||"Erro ao carregar comprovante.";
  }
}

document.getElementById("sponsorshipTableBody")?.addEventListener("click",event=>{
  const button=event.target.closest("[data-sponsor-file]");
  if(button) visualizarComprovantePatrocinio_(button);
});
document.addEventListener("keydown",event=>{
  if(event.key==="Escape") fecharModalComprovantePatrocinio_();
});
