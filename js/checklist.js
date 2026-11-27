(() => {
  const API = "https://itaitinga-mtb-api.caio-ti.workers.dev";
  const SESSION_KEY = "mtbChecklistSession";
  const checklistId = Number((location.pathname.match(/\/checklist\/(\d+)/i) || [])[1]);
  const $ = id => document.getElementById(id);
  let session = null, checklist = null, items = [], activeItem = null, filter = "all", previewBlobUrl = null, previewName = "anexo";
  const statusLabels = {pending:"Pendente",in_progress:"Em andamento",resolved:"Resolvido"};
  const actionLabels = {status_changed:"Status alterado",observation_added:"Observação adicionada",attachment_added:"Anexo adicionado",item_created:"Item criado no Admin",item_description_changed:"Descrição do item alterada",item_inactivated:"Item inativado no Admin",item_reactivated:"Item reativado no Admin"};
  const show = (el, yes=true) => { if (el) el.hidden = !yes; };
  const escapeHtml = value => String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const readSession = () => { try { return JSON.parse(sessionStorage.getItem(SESSION_KEY) || "null"); } catch { return null; } };
  const saveSession = value => { session=value; sessionStorage.setItem(SESSION_KEY,JSON.stringify(value)); };
  const clearSession = () => { session=null; sessionStorage.removeItem(SESSION_KEY); };
  async function post(path, payload) {
    const response = await fetch(API + path,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});
    const data = await response.json().catch(()=>({sucesso:false,mensagem:"Resposta inválida do servidor."}));
    if (!response.ok || data.sucesso === false) throw new Error(data.mensagem || "Não foi possível concluir a operação.");
    return data.dados || {};
  }
  async function api(action, extra={}) { return post("/checklist/api",{token:session.token,checklist_id:checklistId,action,...extra}); }
  function showLogin(message="") { show($("loginView")); show($("appView"),false); if(message){$("loginError").textContent=message;show($("loginError"));} }
  function showApp() { show($("loginView"),false); show($("appView")); $("userName").textContent=session?.administrador?.nome || "Usuário"; }
  async function verifySession() {
    const result = await post("/admin/me",{token:session.token});
    session.administrador = result.administrador;
    saveSession(session);
  }
  async function login(email,senha) {
    const data = await post("/admin/login",{email,senha});
    saveSession(data);
    await verifySession();
    showApp();
    try { await loadChecklist(); show($("pageError"),false); }
    catch (error) { $("pageError").textContent=error.message; show($("pageError")); }
  }
  async function loadChecklist() {
    if (!checklistId) throw new Error("Link de checklist inválido. Confira o endereço enviado.");
    const data = await api("carregar");
    checklist=data.checklist; items=data.items || [];
    $("eventName").textContent=checklist.event_name || checklist.event_id;
    $("checklistTitle").textContent=checklist.title;
    $("checklistDescription").textContent=checklist.description || "Acompanhe as atividades e registre cada atualização.";
    const archived=checklist.status!=="active";
    $("checklistState").textContent=archived?"Arquivado":"Checklist ativo";
    $("checklistState").classList.toggle("archived",archived);
    show($("archivedNote"),archived);
    renderItems(data.counts || {});
  }
  function renderItems(counts={}) {
    const active=items.filter(i=>Number(i.active)===1);
    const resolved=active.filter(i=>i.execution_status==="resolved").length;
    const progress=active.filter(i=>i.execution_status==="in_progress").length;
    const pending=active.length-resolved-progress;
    const pct=active.length?Math.round(resolved/active.length*100):0;
    $("progressPercent").textContent=pct+"%"; $("progressText").textContent=`${resolved} de ${active.length} itens resolvidos`;
    $("progressBar").style.width=pct+"%"; $("countPending").textContent=pending; $("countProgress").textContent=progress; $("countResolved").textContent=resolved;
    const visible=active.filter(i=>filter==="all" || i.execution_status===filter);
    if(!visible.length){$("itemsList").innerHTML='<div class="empty-card">Nenhum item encontrado neste filtro.</div>';return;}
    $("itemsList").innerHTML=visible.map((item,index)=>{
      const status=item.execution_status||"pending"; const resolvedBy=item.resolved_by_name?`Resolvido por ${escapeHtml(item.resolved_by_name)}`:"";
      let action="";
      if(checklist.status==="active") {
        if(status==="pending") action=`<button class="btn btn-start" data-quick="in_progress" data-id="${item.checklist_item_id}">Iniciar</button>`;
        else if(status==="in_progress") action=`<button class="btn btn-resolve" data-quick="resolved" data-id="${item.checklist_item_id}">Resolver</button>`;
        else action=`<button class="btn btn-detail" data-open="${item.checklist_item_id}">Reabrir / detalhes</button>`;
      }
      return `<article class="item-card"><div class="item-number">${String(index+1).padStart(2,"0")}</div><div class="item-main"><h3>${escapeHtml(item.description)}</h3><div class="item-meta"><span class="status-pill ${status}">${statusLabels[status]||status}</span>${status==="resolved"&&resolvedBy?`<small>${resolvedBy}</small>`:""}</div></div><div class="item-actions">${action}<button class="btn btn-detail" data-open="${item.checklist_item_id}">Detalhes</button></div></article>`;
    }).join("");
  }
  function setFilter(value) { filter=value; document.querySelectorAll(".filter").forEach(b=>b.classList.toggle("active",b.dataset.filter===filter)); renderItems(); }
  async function quickStatus(itemId,status) {
    const item=items.find(i=>Number(i.checklist_item_id)===Number(itemId)); if(!item)return;
    let justification="";
    if(item.execution_status==="resolved" && status!=="resolved") { justification=prompt("Informe a justificativa para reabrir este item:")||""; if(justification.trim().length<5){alert("A justificativa deve ter pelo menos 5 caracteres.");return;} }
    try { await api("status",{checklist_item_id:itemId,status,justification}); await loadChecklist(); if(activeItem?.checklist_item_id===Number(itemId)) await openItem(itemId); }
    catch(e){alert(e.message);}
  }
  async function openItem(id) {
    activeItem=items.find(i=>Number(i.checklist_item_id)===Number(id)); if(!activeItem)return;
    $("modalItemTitle").textContent=activeItem.description;
    const locked=checklist.status!=="active";
    show($("statusActions"),!locked); show($("observationForm"),!locked); show($("uploadForm"),!locked);
    show($("reopenWrap"),false); $("reopenReason").value=""; $("observationText").value=""; $("attachmentFile").value="";
    show($("itemModal"));
    await loadItemHistory();
  }
  async function loadItemHistory() {
    const data=await api("historico",{checklist_item_id:activeItem.checklist_item_id});
    const history=data.history||[], attachments=data.attachments||[];
    $("historyList").innerHTML=history.length?history.map(h=>`<div class="history-entry"><b>${escapeHtml(actionLabels[h.action]||h.action)} · ${escapeHtml(h.actor_name)}</b><p>${escapeHtml(h.details)}</p><small>${escapeHtml(h.actor_email)} · ${new Date(h.created_at.replace(" ","T")+"Z").toLocaleString("pt-BR")}${h.previous_status?` · ${statusLabels[h.previous_status]||h.previous_status} → ${statusLabels[h.new_status]||h.new_status}`:""}</small></div>`).join(""):'<p class="muted">Nenhuma movimentação registrada ainda.</p>';
    $("attachmentsList").innerHTML=attachments.length?attachments.map(a=>`<div class="attachment-row"><span>📎 ${escapeHtml(a.file_name)} <small>· ${formatBytes(a.file_size)} · ${escapeHtml(a.uploaded_by_name)}</small></span><div class="attachment-actions"><button data-preview="${escapeHtml(a.attachment_id)}">Visualizar</button><button data-download="${escapeHtml(a.attachment_id)}">Baixar</button></div></div>`).join(""):'<p class="muted">Nenhum anexo adicionado.</p>';
  }
  function formatBytes(n){const v=Number(n)||0;return v<1024?v+" B":(v/1024).toFixed(0)+" KB";}
  async function fetchAttachment(id,download=false) {
    const response=await fetch(API+"/checklist/file",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({token:session.token,attachment_id:id,download})});
    if(!response.ok){const j=await response.json().catch(()=>({}));throw new Error(j.mensagem||"Não foi possível abrir o anexo.");}
    const disposition=response.headers.get("Content-Disposition")||"";
    const match=disposition.match(/filename="?([^";]+)"?/i);
    return {blob:await response.blob(),filename:match?match[1]:"anexo-checklist"};
  }
  async function previewAttachment(id,download=false) {
    try {
      const result=await fetchAttachment(id,download); const blob=result.blob;
      if(download){const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download=result.filename;a.click();setTimeout(()=>URL.revokeObjectURL(url),1500);return;}
      if(previewBlobUrl)URL.revokeObjectURL(previewBlobUrl); previewBlobUrl=URL.createObjectURL(blob); previewName=result.filename;
      $("previewBody").innerHTML=blob.type==="application/pdf"?`<iframe title="Visualização do anexo" src="${previewBlobUrl}"></iframe>`:`<img alt="Anexo do checklist" src="${previewBlobUrl}">`;
      $("previewTitle").textContent=previewName; show($("previewModal"));
    } catch(e){alert(e.message);}
  }
  $("loginForm").addEventListener("submit",async e=>{e.preventDefault();show($("loginError"),false);const btn=e.submitter;btn.disabled=true;btn.textContent="Entrando...";try{await login($("email").value.trim(),$("password").value);}catch(err){clearSession();$("loginError").textContent=err.message;show($("loginError"));}finally{btn.disabled=false;btn.textContent="Entrar no checklist";}});
  $("logoutBtn").addEventListener("click",async()=>{try{if(session?.token)await post("/admin/logout",{token:session.token});}catch{}clearSession();showLogin();});
  $("refreshBtn").addEventListener("click",async()=>{try{await loadChecklist();}catch(e){show($("pageError"));$("pageError").textContent=e.message;}});
  document.querySelectorAll(".filter").forEach(b=>b.addEventListener("click",()=>setFilter(b.dataset.filter)));
  $("itemsList").addEventListener("click",async e=>{const quick=e.target.closest("[data-quick]");const open=e.target.closest("[data-open]");if(quick)await quickStatus(quick.dataset.id,quick.dataset.quick);else if(open)await openItem(open.dataset.open);});
  $("statusActions").addEventListener("click",async e=>{const b=e.target.closest("[data-status]");if(!b||!activeItem)return;const next=b.dataset.status;let justification="";if(activeItem.execution_status==="resolved"&&next!=="resolved"){justification=$("reopenReason").value.trim();show($("reopenWrap"));if(justification.length<5){$("reopenReason").focus();return;}}try{await api("status",{checklist_item_id:activeItem.checklist_item_id,status:next,justification});await loadChecklist();await openItem(activeItem.checklist_item_id);}catch(err){alert(err.message);}});
  $("observationForm").addEventListener("submit",async e=>{e.preventDefault();const text=$("observationText").value.trim();if(!text)return;const btn=e.submitter;btn.disabled=true;try{await api("observar",{checklist_item_id:activeItem.checklist_item_id,observation:text});$("observationText").value="";await loadItemHistory();}catch(err){alert(err.message);}finally{btn.disabled=false;}});
  $("uploadForm").addEventListener("submit",async e=>{e.preventDefault();const file=$("attachmentFile").files[0];if(!file){alert("Selecione um arquivo.");return;}if(file.size>5*1024*1024){alert("O arquivo deve ter no máximo 5 MB.");return;}const allowed=["application/pdf","image/jpeg","image/png"];if(!allowed.includes(file.type)){alert("Formato não permitido. Use PDF, JPG ou PNG.");return;}const btn=e.submitter;btn.disabled=true;btn.textContent="Enviando...";try{const base64=await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(String(r.result).split(",")[1]);r.onerror=reject;r.readAsDataURL(file);});await api("upload",{checklist_item_id:activeItem.checklist_item_id,file_name:file.name,mime_type:file.type,file_base64:base64});$("attachmentFile").value="";await loadItemHistory();}catch(err){alert(err.message);}finally{btn.disabled=false;btn.textContent="Enviar anexo";}});
  $("attachmentsList").addEventListener("click",e=>{const p=e.target.closest("[data-preview]");const d=e.target.closest("[data-download]");if(p)previewAttachment(p.dataset.preview);if(d)previewAttachment(d.dataset.download,true);});
  $("closeItemModal").addEventListener("click",()=>show($("itemModal"),false));
  $("itemModal").addEventListener("click",e=>{if(e.target===$("itemModal"))show($("itemModal"),false);});
  $("closePreview").addEventListener("click",()=>{show($("previewModal"),false);if(previewBlobUrl){URL.revokeObjectURL(previewBlobUrl);previewBlobUrl=null;}});
  $("downloadPreview").addEventListener("click",()=>{if(!previewBlobUrl)return;const a=document.createElement("a");a.href=previewBlobUrl;a.download=previewName;a.click();});
  async function init(){
    if(!checklistId){showLogin("Link de checklist inválido.");return;}
    session=readSession();
    if(!session?.token){showLogin();return;}
    try{
      await verifySession();
      showApp();
      try { await loadChecklist(); }
      catch (error) { $("pageError").textContent=error.message; show($("pageError")); }
    } catch(e){clearSession();showLogin(e.message);}
  }
  init();
})();
