# Migração Cloudflare — Itaitinga MTB Race

## Estrutura
- `index.html` carrega `js/main-v62.js`.
- `cloudflare/worker.js` é o Worker da API.
- `cloudflare/schema-d1-referencia.sql` documenta o schema do D1.

## Rotas atualmente integradas ao Worker/D1
- `POST /admin/login`
- `POST /admin/logout`
- `POST /admin/me`
- `POST /admin/dashboard`
- `POST /admin/registrations`
- `POST /admin/registration-detail`
- `POST /admin/catalog` — listagem e CRUD de categorias e lotes.
- `POST /admin/expenses` — listagem de despesas por evento no D1.

## Módulos migrados no frontend ativo (`js/main-v62.js`)
- Login e logout.
- Dashboard.
- Listagem e detalhe de inscrições.
- Listagem, criação, edição, ativação/desativação e exclusão de categorias.
- Listagem, criação, edição, ativação/desativação e exclusão de lotes.
- Consulta/listagem de despesas no D1 (CRUD financeiro ainda não migrado).

## Ainda dependem do Apps Script ou precisam de migração
- Cadastro público e checkout/webhook InfinitePay.
- Alteração de status/pagamento e edição/cadastro administrativo de inscrições.
- Financeiro/despesas e anexos.
- Usuários e alteração de senha.
- Configurações gerais e conteúdo do site.
- Uploads/arquivos (planejar R2; não tratar `object_key` como URL pública).
- Consulta pública de inscrição e status de pagamento.

## Atenção
Este pacote é uma etapa intermediária da migração. Não desative o Apps Script nem considere todos os módulos migrados. O Worker deve ser publicado e testado com o binding D1 `DB` antes de usar os novos cadastros em produção.


### Financeiro — cadastro de despesas (etapa atual)
- `POST /admin/expenses` com `action: "criarDespesa"` cadastra uma despesa no D1.
- Valida sessão administrativa e evento (`MTB2026` ou `TRAIL2026`).
- Gera número sequencial por evento e grava valor em centavos.
- Persiste fornecedor, responsável, contato e observação.
- A listagem consulta também responsável e contato.
- Edição, exclusão, pagamento e anexos continuam no backend legado nesta etapa. Para o primeiro teste, cadastrar sem anexar arquivos.

## Financeiro — edição e exclusão de despesas (D1)

As ações `editarDespesa` e `excluirDespesa` agora são encaminhadas para `POST /admin/expenses` no Worker, junto com o cadastro. Ambas validam a sessão administrativa e localizam a despesa pelo par evento/número. A edição preserva o status e os dados de pagamento; a exclusão remove somente a despesa correspondente. A listagem também passa a retornar responsável e contato do fornecedor.
