function criarAbaDespesas_(ss) {

  let sheet =
    ss.getSheetByName("Despesas");

  if (!sheet) {

    sheet =
      ss.insertSheet("Despesas");

  }

  const headers = [
    "Numero",
    "Evento",
    "Nome",
    "Valor",
    "FornecedorEmpresa",
    "Responsavel",
    "ContatoFornecedor",
    "Status",
    "Observacao",
    "CriadoEm",
    "DataPagamento",
    "FormaPagamento",
    "ComprovantePagamento"
  ];

  const range =
    sheet.getRange(
      1,
      1,
      1,
      headers.length
    );

  range.setValues([
    headers
  ]);

  range.setFontWeight("bold");

  sheet.setFrozenRows(1);

}

/* =====================================================
   CADASTRAR DESPESA
   ===================================================== */

function criarDespesa_(
  token,
  dados
) {

  /* VALIDA SESSÃO ADMIN */
  validarSessao_(token);


  const ss =
    SpreadsheetApp
      .getActiveSpreadsheet();

  const sheet =
    ss.getSheetByName(
      "Despesas"
    );

  if (!sheet) {
    throw new Error(
      "A aba Despesas não existe."
    );
  }


  /* =====================================================
     EVENTO
     ===================================================== */

  const evento =
    String(
      dados?.evento ||
      "MTB2026"
    )
      .trim()
      .toUpperCase();


  if (
    evento !== "MTB2026" &&
    evento !== "TRAIL2026"
  ) {
    throw new Error(
      "Evento inválido."
    );
  }


  /* =====================================================
     DADOS
     ===================================================== */

  const nome =
    String(
      dados?.nome || ""
    ).trim();

  const valor =
    Number(
      dados?.valor || 0
    );

  const fornecedor =
    String(
      dados?.fornecedorEmpresa || ""
    ).trim();

  const responsavel =
    String(
      dados?.responsavel || ""
    ).trim();

  const contato =
    String(
      dados?.contatoFornecedor || ""
    ).trim();

  const observacao =
    String(
      dados?.observacao || ""
    ).trim();


  if (!nome) {
    throw new Error(
      "Informe o nome da despesa."
    );
  }


  if (
    !Number.isFinite(valor) ||
    valor <= 0
  ) {
    throw new Error(
      "Informe um valor válido para a despesa."
    );
  }


  /* =====================================================
     NÚMERO GLOBAL
     ===================================================== */

  const ultimaLinha =
    sheet.getLastRow();

  let maiorNumero = 0;


  if (ultimaLinha >= 2) {

    const numeros =
      sheet
        .getRange(
          2,
          1,
          ultimaLinha - 1,
          1
        )
        .getValues();


    numeros.forEach(linha => {

      const numero =
        Number(
          String(linha[0] || "")
            .replace(/\D/g, "")
        );

      if (
        Number.isFinite(numero) &&
        numero > maiorNumero
      ) {
        maiorNumero = numero;
      }

    });

  }


  const numero =
    maiorNumero + 1;


  /* =====================================================
     GRAVAR
     ===================================================== */

  const agora =
    new Date();


  sheet.appendRow([
    numero,       // A Numero
    evento,       // B Evento
    nome,         // C Nome
    valor,        // D Valor
    fornecedor,   // E FornecedorEmpresa
    responsavel,  // F Responsavel
    contato,      // G ContatoFornecedor
    "Pendente",   // H Status
    observacao,   // I Observacao
    agora,        // J CriadoEm
    "",           // K DataPagamento
    "",           // L FormaPagamento
    ""            // M ComprovantePagamento
  ]);


  return {
    numero,
    evento,
    nome,
    valor,
    status: "Pendente"
  };

}

/* =====================================================
   LISTAR DESPESAS
   ===================================================== */

function listarDespesas_(
  token,
  evento
) {

  validarSessao_(token);

  const ss =
    SpreadsheetApp
      .getActiveSpreadsheet();

  const sheet =
    ss.getSheetByName(
      "Despesas"
    );

  if (!sheet) {
    throw new Error(
      "A aba Despesas não existe."
    );
  }


  const eventoAtual =
    String(
      evento ||
      "MTB2026"
    )
      .trim()
      .toUpperCase();


  if (
    eventoAtual !== "MTB2026" &&
    eventoAtual !== "TRAIL2026"
  ) {
    throw new Error(
      "Evento inválido."
    );
  }


  const ultimaLinha =
    sheet.getLastRow();


  if (ultimaLinha < 2) {

    return {
      despesas: []
    };

  }


  const dados =
    sheet
      .getRange(
        2,
        1,
        ultimaLinha - 1,
        13
      )
      .getValues();


  const despesas =
    dados
      .filter(linha => {

        const eventoLinha =
          String(
            linha[1] || ""
          )
            .trim()
            .toUpperCase();

        return (
          eventoLinha ===
          eventoAtual
        );

      })
      .map(linha => {

        return {

          numero:
            linha[0],

          evento:
            linha[1],

          nome:
            linha[2],

          valor:
            Number(
              linha[3] || 0
            ),

          fornecedorEmpresa:
            linha[4],

          responsavel:
            linha[5],

          contatoFornecedor:
            linha[6],

          status:
            linha[7],

          observacao:
            linha[8],

          criadoEm:
            linha[9],

          dataPagamento:
            linha[10],

          formaPagamento:
            linha[11],

          comprovantePagamento:
            linha[12]

        };

      })
      .sort(
        (a, b) =>
          Number(b.numero || 0) -
          Number(a.numero || 0)
      );


  return {
    despesas
  };

}
/* =====================================================
   EDITAR DESPESA
   ===================================================== */

function editarDespesa_(
  token,
  dados
) {

  validarSessao_(token);

  const ss =
    SpreadsheetApp
      .getActiveSpreadsheet();

  const sheet =
    ss.getSheetByName("Despesas");

  if (!sheet) {
    throw new Error(
      "A aba Despesas não existe."
    );
  }


  /* =====================================================
     IDENTIFICAÇÃO
     ===================================================== */

  const numero =
    Number(dados?.numero || 0);

  const evento =
    String(
      dados?.evento || ""
    )
      .trim()
      .toUpperCase();


  if (!numero) {
    throw new Error(
      "Número da despesa inválido."
    );
  }


  if (
    evento !== "MTB2026" &&
    evento !== "TRAIL2026"
  ) {
    throw new Error(
      "Evento inválido."
    );
  }


  /* =====================================================
     NOVOS DADOS
     ===================================================== */

  const nome =
    String(
      dados?.nome || ""
    ).trim();

  const valor =
    Number(
      dados?.valor || 0
    );

  const fornecedor =
    String(
      dados?.fornecedorEmpresa || ""
    ).trim();

  const responsavel =
    String(
      dados?.responsavel || ""
    ).trim();

  const contato =
    String(
      dados?.contatoFornecedor || ""
    ).trim();

  const observacao =
    String(
      dados?.observacao || ""
    ).trim();


  if (!nome) {
    throw new Error(
      "Informe o nome da despesa."
    );
  }


  if (
    !Number.isFinite(valor) ||
    valor <= 0
  ) {
    throw new Error(
      "Informe um valor válido."
    );
  }


  /* =====================================================
     LOCALIZAR DESPESA
     ===================================================== */

  const ultimaLinha =
    sheet.getLastRow();


  if (ultimaLinha < 2) {
    throw new Error(
      "Despesa não encontrada."
    );
  }


  const registros =
    sheet
      .getRange(
        2,
        1,
        ultimaLinha - 1,
        13
      )
      .getValues();


  let linhaPlanilha = 0;


  for (
    let i = 0;
    i < registros.length;
    i++
  ) {

    const numeroLinha =
      Number(
        registros[i][0] || 0
      );

    const eventoLinha =
      String(
        registros[i][1] || ""
      )
        .trim()
        .toUpperCase();


    if (
      numeroLinha === numero &&
      eventoLinha === evento
    ) {

      linhaPlanilha =
        i + 2;

      break;
    }

  }


  if (!linhaPlanilha) {
    throw new Error(
      "Despesa não encontrada."
    );
  }


  /* =====================================================
     ATUALIZAR
     ===================================================== */

  sheet
    .getRange(
      linhaPlanilha,
      3,
      1,
      7
    )
    .setValues([
      [
        nome,          // C Nome
        valor,         // D Valor
        fornecedor,    // E FornecedorEmpresa
        responsavel,   // F Responsavel
        contato,       // G ContatoFornecedor

        // H Status - preserva o atual
        sheet
          .getRange(
            linhaPlanilha,
            8
          )
          .getValue(),

        observacao     // I Observacao
      ]
    ]);


  return {
    numero,
    evento,
    nome,
    valor,
    mensagem:
      "Despesa atualizada com sucesso."
  };

}

/* =====================================================
   EXCLUIR DESPESA
   ===================================================== */

function excluirDespesa_(
  token,
  dados
) {

  validarSessao_(token);

  const ss =
    SpreadsheetApp
      .getActiveSpreadsheet();

  const sheet =
    ss.getSheetByName("Despesas");

  if (!sheet) {
    throw new Error(
      "A aba Despesas não existe."
    );
  }


  /* =====================================================
     IDENTIFICAÇÃO
     ===================================================== */

  const numero =
    Number(
      dados?.numero || 0
    );

  const evento =
    String(
      dados?.evento || ""
    )
      .trim()
      .toUpperCase();


  if (!numero) {
    throw new Error(
      "Número da despesa inválido."
    );
  }


  if (
    evento !== "MTB2026" &&
    evento !== "TRAIL2026"
  ) {
    throw new Error(
      "Evento inválido."
    );
  }


  /* =====================================================
     LOCALIZAR DESPESA
     ===================================================== */

  const ultimaLinha =
    sheet.getLastRow();


  if (ultimaLinha < 2) {
    throw new Error(
      "Despesa não encontrada."
    );
  }


  const registros =
    sheet
      .getRange(
        2,
        1,
        ultimaLinha - 1,
        2
      )
      .getValues();


  let linhaPlanilha = 0;


  for (
    let i = 0;
    i < registros.length;
    i++
  ) {

    const numeroLinha =
      Number(
        registros[i][0] || 0
      );

    const eventoLinha =
      String(
        registros[i][1] || ""
      )
        .trim()
        .toUpperCase();


    if (
      numeroLinha === numero &&
      eventoLinha === evento
    ) {

      linhaPlanilha =
        i + 2;

      break;
    }

  }


  if (!linhaPlanilha) {
    throw new Error(
      "Despesa não encontrada."
    );
  }


  /* =====================================================
     EXCLUIR
     ===================================================== */

  sheet.deleteRow(
    linhaPlanilha
  );


  return {
    numero,
    evento,
    mensagem:
      "Despesa excluída com sucesso."
  };

}

/* =====================================================
   UPLOAD DE ANEXO - DESPESA
   ===================================================== */

function uploadAnexoDespesa_(body, sessaoValidadaPeloWorker) {
  if (!sessaoValidadaPeloWorker) {
    if (!body || !body.token) throw new Error("Sessão não informada.");
    validarSessao_(body.token);
  }

  const numero =
    Number(
      body.numero || 0
    );

  const evento =
    String(
      body.evento || ""
    )
      .trim()
      .toUpperCase();

  const nomeOriginal =
    String(
      body.nome || "arquivo"
    ).trim();

  const mimeType =
    String(
      body.mimeType ||
      "application/octet-stream"
    ).trim();

  const base64 =
    String(
      body.arquivoBase64 || ""
    ).trim();


  if (!numero) {
    throw new Error(
      "Número da despesa não informado."
    );
  }


  if (
    evento !== "MTB2026" &&
    evento !== "TRAIL2026"
  ) {
    throw new Error(
      "Evento inválido."
    );
  }


  if (!base64) {
    throw new Error(
      "Arquivo não informado."
    );
  }


  /* LIMITE APROXIMADO DE 5 MB */

  if (
    base64.length >
    7 * 1024 * 1024
  ) {
    throw new Error(
      "Arquivo muito grande. O limite é de 5 MB."
    );
  }


  /* =====================================================
     CONFIRMA SE A DESPESA EXISTE
     ===================================================== */

  const ss =
    SpreadsheetApp
      .getActiveSpreadsheet();

  const sheet =
    ss.getSheetByName(
      "Despesas"
    );

  if (!sheet) {
    throw new Error(
      "A aba Despesas não existe."
    );
  }


  const ultimaLinha =
    sheet.getLastRow();

  let despesa = null;


  if (ultimaLinha >= 2) {

    const dados =
      sheet
        .getRange(
          2,
          1,
          ultimaLinha - 1,
          13
        )
        .getValues();


    for (
      let i = 0;
      i < dados.length;
      i++
    ) {

      if (
        Number(dados[i][0]) === numero &&
        String(
          dados[i][1] || ""
        )
          .trim()
          .toUpperCase() === evento
      ) {

        despesa = {
          numero:
            dados[i][0],

          evento:
            dados[i][1],

          nome:
            dados[i][2]
        };

        break;
      }

    }

  }


  if (!despesa) {
    throw new Error(
      "Despesa não encontrada."
    );
  }


  /* =====================================================
     GOOGLE DRIVE
     ===================================================== */

  try {

    const root =
      DriveApp.getFolderById(
        DRIVE_ROOT_FOLDER_ID
      );


    const folderName =
      "DESPESA-" +
      String(numero)
        .padStart(
          3,
          "0"
        );


    const folders =
      root.getFoldersByName(
        folderName
      );


    const folder =
      folders.hasNext()
        ? folders.next()
        : root.createFolder(
            folderName
          );


    const nomeLimpo =
      sanitizarNomeArquivo_(
        despesa.nome ||
        "Despesa"
      );


    const extensao =
      obterExtensao_(
        nomeOriginal,
        mimeType
      );


    const ehComprovantePagamento =
  nomeOriginal
    .toUpperCase()
    .startsWith(
      "COMPROVANTE-PAGAMENTO-DESPESA-"
    );


const nomeFinal =
  ehComprovantePagamento
    ? "COMPROVANTE-PAGAMENTO-DESPESA-" +
      String(numero).padStart(3, "0") +
      "-" +
      Date.now() +
      extensao

    : String(numero)
        .padStart(3, "0") +
      " - " +
      nomeLimpo +
      " - " +
      Date.now() +
      extensao;


    const bytes =
      Utilities.base64Decode(
        base64
      );


    const blob =
      Utilities.newBlob(
        bytes,
        mimeType,
        nomeFinal
      );


    const file =
      folder.createFile(
        blob
      );


    return {

      numero:
        numero,

      evento:
        evento,

      nome:
        file.getName(),

      fileId:
        file.getId(),

      mimeType:
        file.getMimeType(),

      tamanho:
        file.getSize()

    };


  } catch (erro) {

    throw new Error(
      "Erro ao salvar anexo no Google Drive: " +
      erro.message
    );

  }

}

/* =====================================================
   LISTAR ANEXOS DA DESPESA
   ===================================================== */

function listarAnexosDespesa_(
  token,
  numero,
  evento
) {

  validarSessao_(token);


  numero =
    Number(
      numero || 0
    );


  evento =
    String(
      evento || ""
    )
      .trim()
      .toUpperCase();


  if (!numero) {
    throw new Error(
      "Número da despesa não informado."
    );
  }


  if (
    evento !== "MTB2026" &&
    evento !== "TRAIL2026"
  ) {
    throw new Error(
      "Evento inválido."
    );
  }


  /* =====================================================
     CONFIRMA SE A DESPESA EXISTE
     ===================================================== */

  const ss =
    SpreadsheetApp
      .getActiveSpreadsheet();


  const sheet =
    ss.getSheetByName(
      "Despesas"
    );


  if (!sheet) {
    throw new Error(
      "A aba Despesas não existe."
    );
  }


  const ultimaLinha =
    sheet.getLastRow();


  let encontrada = false;


  if (ultimaLinha >= 2) {

    const dados =
      sheet
        .getRange(
          2,
          1,
          ultimaLinha - 1,
          13
        )
        .getValues();


    for (
      let i = 0;
      i < dados.length;
      i++
    ) {

      if (
        Number(dados[i][0]) === numero &&
        String(
          dados[i][1] || ""
        )
          .trim()
          .toUpperCase() === evento
      ) {

        encontrada = true;

        break;
      }

    }

  }


  if (!encontrada) {
    throw new Error(
      "Despesa não encontrada."
    );
  }


  /* =====================================================
     LOCALIZA A PASTA
     ===================================================== */

  const root =
    DriveApp.getFolderById(
      DRIVE_ROOT_FOLDER_ID
    );


  const folderName =
    "DESPESA-" +
    String(numero)
      .padStart(
        3,
        "0"
      );


  const folders =
    root.getFoldersByName(
      folderName
    );


  /*
   * Despesa pode existir sem anexos.
   */

  if (!folders.hasNext()) {

    return {
      anexos: []
    };

  }


  const folder =
    folders.next();


  const files =
    folder.getFiles();


  const anexos = [];


  while (files.hasNext()) {

    const file =
      files.next();


    anexos.push({

      fileId:
        file.getId(),

      nome:
        file.getName(),

      mimeType:
        file.getMimeType(),

      tamanho:
        file.getSize(),

      criadoEm:
        file.getDateCreated()

    });

  }


  return {
    anexos
  };

}

/* =====================================================
   VISUALIZAR ANEXO DA DESPESA
   ===================================================== */

function visualizarAnexoDespesa_(
  token,
  numero,
  evento,
  fileId
) {

  validarSessao_(token);

  numero =
    Number(numero || 0);

  evento =
    String(evento || "")
      .trim()
      .toUpperCase();

  fileId =
    String(fileId || "")
      .trim();


  if (!numero) {
    throw new Error(
      "Número da despesa não informado."
    );
  }


  if (
    evento !== "MTB2026" &&
    evento !== "TRAIL2026"
  ) {
    throw new Error(
      "Evento inválido."
    );
  }


  if (!fileId) {
    throw new Error(
      "Arquivo não informado."
    );
  }


  /* =====================================================
     CONFIRMA SE A DESPESA EXISTE
     ===================================================== */

  const ss =
    SpreadsheetApp
      .getActiveSpreadsheet();

  const sheet =
    ss.getSheetByName(
      "Despesas"
    );

  if (!sheet) {
    throw new Error(
      "A aba Despesas não existe."
    );
  }


  const ultimaLinha =
    sheet.getLastRow();

  let encontrada = false;


  if (ultimaLinha >= 2) {

    const dados =
      sheet
        .getRange(
          2,
          1,
          ultimaLinha - 1,
          13
        )
        .getValues();


    for (
      let i = 0;
      i < dados.length;
      i++
    ) {

      if (
        Number(dados[i][0]) === numero &&
        String(
          dados[i][1] || ""
        )
          .trim()
          .toUpperCase() === evento
      ) {

        encontrada = true;
        break;

      }

    }

  }


  if (!encontrada) {
    throw new Error(
      "Despesa não encontrada."
    );
  }


  /* =====================================================
     LOCALIZA A PASTA DA DESPESA
     ===================================================== */

  const root =
    DriveApp.getFolderById(
      DRIVE_ROOT_FOLDER_ID
    );


  const folderName =
    "DESPESA-" +
    String(numero)
      .padStart(3, "0");


  const folders =
    root.getFoldersByName(
      folderName
    );


  if (!folders.hasNext()) {
    throw new Error(
      "Pasta da despesa não encontrada."
    );
  }


  const folder =
    folders.next();


  /* =====================================================
     CONFIRMA QUE O ARQUIVO PERTENCE À PASTA
     ===================================================== */

  const files =
    folder.getFiles();

  let arquivo = null;


  while (files.hasNext()) {

    const file =
      files.next();

    if (
      file.getId() === fileId
    ) {

      arquivo = file;
      break;

    }

  }


  if (!arquivo) {
    throw new Error(
      "Arquivo não pertence a esta despesa."
    );
  }


  const mimeType =
    arquivo.getMimeType();


  const permitidos = [
    "application/pdf",
    "image/jpeg",
    "image/png",
    "image/webp"
  ];


  if (
    !permitidos.includes(mimeType)
  ) {
    throw new Error(
      "Tipo de arquivo não permitido para visualização."
    );
  }


   const blob =
    arquivo.getBlob();


  const nome =
    arquivo.getName();


  const base64 =
    Utilities.base64Encode(
      blob.getBytes()
    );


  const base64Js =
    JSON.stringify(
      base64
    );


  const mimeTypeJs =
    JSON.stringify(
      mimeType
    );


  const nomeArquivoJs =
    JSON.stringify(
      nome
    );


  const conteudo =
    '<div class="download-card">' +

    '<div class="download-icon">↓</div>' +

    '<h1>Anexo pronto</h1>' +

    '<p>O download do anexo será iniciado automaticamente.</p>' +

    '<button id="downloadBtn" class="download-btn">' +
    'BAIXAR ANEXO ↓' +
    '</button>' +

    '<p class="hint">' +
    'Se o download não iniciar, clique no botão acima.' +
    '</p>' +

    '</div>';


  const scriptDownload =
    '<script>' +

    '(function(){' +

    'var b64=' +
    base64Js +
    ';' +

    'var mime=' +
    mimeTypeJs +
    ';' +

    'var nome=' +
    nomeArquivoJs +
    ';' +


    'function baixar(){' +

    'try{' +

    'var bin=atob(b64);' +

    'var len=bin.length;' +

    'var bytes=new Uint8Array(len);' +

    'for(var i=0;i<len;i++){' +
    'bytes[i]=bin.charCodeAt(i);' +
    '}' +

    'var blob=new Blob([bytes],{type:mime});' +

    'var url=URL.createObjectURL(blob);' +

    'var a=document.createElement("a");' +

    'a.href=url;' +

    'a.download=nome;' +

    'a.style.display="none";' +

    'document.body.appendChild(a);' +

    'a.click();' +

    'setTimeout(function(){' +
    'URL.revokeObjectURL(url);' +
    'a.remove();' +
    '},3000);' +

    '}catch(e){' +
    'console.error(e);' +
    '}' +

    '}' +


    'var botao=' +
    'document.getElementById("downloadBtn");' +


    'if(botao){' +

    'botao.addEventListener(' +
    '"click",' +
    'function(){baixar();}' +
    ');' +

    '}' +


    'setTimeout(function(){' +
'baixar();' +
'setTimeout(function(){' +
'window.close();' +
'},1200);' +
'},350);' +

    '})();' +

    '</script>';


  const html =

    '<!DOCTYPE html>' +

    '<html lang="pt-BR">' +

    '<head>' +

    '<meta charset="UTF-8">' +

    '<meta name="viewport" ' +
    'content="width=device-width,initial-scale=1">' +

    '<title>' +
    escHtmlServer_(nome) +
    '</title>' +

    '<style>' +

    '*{box-sizing:border-box;}' +

    'html,body{' +
    'margin:0;' +
    'padding:0;' +
    'width:100%;' +
    'height:100%;' +
    'background:#111;' +
    'color:#fff;' +
    'font-family:Arial,Helvetica,sans-serif;' +
    '}' +

    '.viewer{' +
    'width:100%;' +
    'height:100%;' +
    'display:flex;' +
    'align-items:center;' +
    'justify-content:center;' +
    'padding:20px;' +
    '}' +

    '.download-card{' +
    'width:100%;' +
    'max-width:520px;' +
    'padding:38px 28px;' +
    'text-align:center;' +
    'background:#1b1b1b;' +
    'border:1px solid #303030;' +
    'border-radius:16px;' +
    'box-shadow:0 20px 60px rgba(0,0,0,.35);' +
    '}' +

    '.download-icon{' +
    'width:64px;' +
    'height:64px;' +
    'margin:0 auto 18px;' +
    'display:flex;' +
    'align-items:center;' +
    'justify-content:center;' +
    'border-radius:50%;' +
    'background:#a8ff00;' +
    'color:#111;' +
    'font-size:32px;' +
    'font-weight:900;' +
    '}' +

    '.download-card h1{' +
    'margin:0 0 10px;' +
    'font-size:24px;' +
    '}' +

    '.download-card p{' +
    'margin:0 auto 22px;' +
    'max-width:420px;' +
    'color:#aaa;' +
    'line-height:1.5;' +
    '}' +

    '.download-btn{' +
    'display:inline-flex;' +
    'align-items:center;' +
    'justify-content:center;' +
    'padding:13px 20px;' +
    'border:0;' +
    'border-radius:8px;' +
    'background:#a8ff00;' +
    'color:#111;' +
    'font-weight:900;' +
    'font-size:13px;' +
    'cursor:pointer;' +
    '}' +

    '.download-btn:hover{' +
    'filter:brightness(1.08);' +
    '}' +

    '.download-card .hint{' +
    'margin-top:16px;' +
    'margin-bottom:0;' +
    'font-size:12px;' +
    'color:#777;' +
    '}' +

    '</style>' +

    '</head>' +

    '<body>' +

    '<div class="viewer">' +

    conteudo +

    '</div>' +

    scriptDownload +

    '</body>' +

    '</html>';


  return HtmlService
    .createHtmlOutput(
      html
    )
    .setTitle(
      'Anexo - ' +
      nome
    )
    .setXFrameOptionsMode(
      HtmlService
        .XFrameOptionsMode
        .ALLOWALL
    );

}

/* =====================================================
   PAGAR DESPESA
   ===================================================== */

function pagarDespesa_(token, dados) {

  /* VALIDA SESSÃO */

  const sessao =
    validarSessao_(token);

  if (!sessao) {
    throw new Error(
      "Sessão inválida ou expirada."
    );
  }


  /* DADOS */

  const evento =
    String(
      dados.evento || ""
    )
      .trim()
      .toUpperCase();

  const numero =
    String(
      dados.numero || ""
    )
      .trim();

  const dataPagamento =
    String(
      dados.dataPagamento || ""
    )
      .trim();

  const formaPagamento =
    String(
      dados.formaPagamento || ""
    )
      .trim();

  const observacaoPagamento =
    String(
      dados.observacaoPagamento || ""
    )
      .trim();


  if (!evento) {
    throw new Error(
      "Evento não informado."
    );
  }

  if (!numero) {
    throw new Error(
      "Despesa não informada."
    );
  }

  if (!dataPagamento) {
    throw new Error(
      "Informe a data do pagamento."
    );
  }

  if (!formaPagamento) {
    throw new Error(
      "Informe a forma de pagamento."
    );
  }


  /* PLANILHA */

  const sheet =
    SpreadsheetApp
      .getActiveSpreadsheet()
      .getSheetByName(
        "Despesas"
      );

  if (!sheet) {
    throw new Error(
      "A aba Despesas não existe."
    );
  }


  /* GARANTE AS NOVAS COLUNAS */

  const cabecalhos =
    sheet
      .getRange(
        1,
        1,
        1,
        Math.max(
          sheet.getLastColumn(),
          1
        )
      )
      .getValues()[0];


  function localizarOuCriarColuna_(
    nome
  ) {

    const indice =
      cabecalhos.findIndex(
        item =>
          String(item || "")
            .trim()
            .toLowerCase() ===
          nome.toLowerCase()
      );

    if (indice >= 0) {
      return indice + 1;
    }

    const novaColuna =
      cabecalhos.length + 1;

    sheet
      .getRange(
        1,
        novaColuna
      )
      .setValue(nome);

    cabecalhos.push(nome);

    return novaColuna;
  }


  const colStatus =
    localizarOuCriarColuna_(
      "Status"
    );

  const colDataPagamento =
    localizarOuCriarColuna_(
      "DataPagamento"
    );

  const colFormaPagamento =
    localizarOuCriarColuna_(
      "FormaPagamento"
    );

  const colObservacaoPagamento =
    localizarOuCriarColuna_(
      "ObservacaoPagamento"
    );


  /* LOCALIZA DESPESA */

  const ultimaLinha =
    sheet.getLastRow();

  if (ultimaLinha < 2) {
    throw new Error(
      "Nenhuma despesa cadastrada."
    );
  }


  const dadosPlanilha =
    sheet
      .getRange(
        2,
        1,
        ultimaLinha - 1,
        sheet.getLastColumn()
      )
      .getValues();


  let linhaEncontrada = 0;


  for (
    let i = 0;
    i < dadosPlanilha.length;
    i++
  ) {

    const numeroLinha =
      String(
        dadosPlanilha[i][0] || ""
      )
        .trim();

    const eventoLinha =
      String(
        dadosPlanilha[i][1] || ""
      )
        .trim()
        .toUpperCase();


    if (
      numeroLinha === numero &&
      eventoLinha === evento
    ) {

      linhaEncontrada =
        i + 2;

      break;
    }

  }


  if (!linhaEncontrada) {
    throw new Error(
      "Despesa não encontrada."
    );
  }


  /* NÃO PERMITE PAGAR DUAS VEZES */

  const statusAtual =
    String(
      sheet
        .getRange(
          linhaEncontrada,
          colStatus
        )
        .getValue() || ""
    )
      .trim()
      .toLowerCase();


  if (statusAtual === "pago") {
    throw new Error(
      "Esta despesa já está paga."
    );
  }


  /* REALIZA A BAIXA */

  sheet
    .getRange(
      linhaEncontrada,
      colStatus
    )
    .setValue(
      "Pago"
    );


  sheet
    .getRange(
      linhaEncontrada,
      colDataPagamento
    )
    .setValue(
      dataPagamento
    );


  sheet
    .getRange(
      linhaEncontrada,
      colFormaPagamento
    )
    .setValue(
      formaPagamento
    );


  sheet
    .getRange(
      linhaEncontrada,
      colObservacaoPagamento
    )
    .setValue(
      observacaoPagamento
    );


  SpreadsheetApp.flush();


  return {
    numero:
      numero,

    evento:
      evento,

    status:
      "Pago",

    dataPagamento:
      dataPagamento,

    formaPagamento:
      formaPagamento,

    observacaoPagamento:
      observacaoPagamento
  };

}

/* =====================================================
   UPLOAD DE COMPROVANTE DE PATROCÍNIO
   ===================================================== */
function uploadAnexoPatrocinio_(body) {
  const evento = String(body.evento || "").trim().toUpperCase();
  const nomeOriginal = String(body.nome || "comprovante").trim();
  const mimeType = String(body.mimeType || "application/octet-stream").trim().toLowerCase();
  const base64 = String(body.arquivoBase64 || "").trim();
  if (!evento || evento.length > 100) throw new Error("Evento inválido.");
  if (!base64) throw new Error("Arquivo não informado.");
  if (!["application/pdf", "image/jpeg", "image/png"].includes(mimeType)) throw new Error("Formato não permitido. Envie PDF, JPG ou PNG.");
  if (base64.length > 7 * 1024 * 1024) throw new Error("Arquivo muito grande. O limite é de 5 MB.");
  const root = DriveApp.getFolderById(DRIVE_ROOT_FOLDER_ID);
  const nomePasta = "PATROCINIOS-" + evento;
  const pastas = root.getFoldersByName(nomePasta);
  const pasta = pastas.hasNext() ? pastas.next() : root.createFolder(nomePasta);
  const extensao = obterExtensao_(nomeOriginal, mimeType);
  const nomeFinal = "COMPROVANTE-PATROCINIO-" + Date.now() + extensao;
  const blob = Utilities.newBlob(Utilities.base64Decode(base64), mimeType, nomeFinal);
  const file = pasta.createFile(blob);
  return { fileId:file.getId(), nome:file.getName(), mimeType:file.getMimeType(), tamanho:file.getSize(), url:"https://drive.google.com/file/d/" + file.getId() + "/view" };
}
