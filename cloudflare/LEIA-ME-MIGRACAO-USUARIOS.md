# Migração do gerenciamento de usuários para Cloudflare Worker / D1

Esta atualização transfere para o Worker as operações de listar usuários, criar administrador e alterar senha. Também inclui a seleção de eventos permitidos para cada novo usuário e validação dessa permissão nas rotas operacionais do Worker.

## Ordem obrigatória

1. Faça backup do banco D1 antes de qualquer alteração.
2. No painel Cloudflare, abra o D1 utilizado pelo Worker `itaitinga-mtb-api`.
3. Execute **uma única vez** o arquivo `migracao-usuarios-worker.sql`.
4. Publique o arquivo atualizado `cloudflare/worker.js` no Worker.
5. Publique os arquivos atualizados do frontend (`index.html`, `js/main-v62.js` e `css/styles.css`) no Pages.
6. Entre com o usuário administrador que já existia e valide a tela de usuários.

## O que a migração faz

- Adiciona `admins.is_superadmin` sem apagar ou recriar a tabela de administradores.
- Promove o primeiro administrador existente a administrador principal. No ambiente atual, há apenas a conta original.
- Cria `admin_event_access`, que guarda os eventos liberados para cada usuário.
- Não cria uma nova conta para o administrador atual e não altera sua senha.
- Usuários novos recebem acesso somente aos eventos ativos selecionados no cadastro.
- A lista de eventos após o login é filtrada pelas permissões do usuário.
- O Worker valida o acesso ao evento nas rotas operacionais e nas rotas de arquivos de inscrição/despesa.
- A alteração de senha invalida as sessões ativas daquele usuário.

## Atenção

- Não execute o SQL de migração novamente: `ALTER TABLE ... ADD COLUMN` é uma operação de execução única.
- Não execute `schema-d1-referencia.sql` sobre o banco em produção. Ele é uma referência histórica e não substitui a migração incremental.
- Não apague nem recrie o banco D1.
- Faça primeiro a migração SQL, depois publique o Worker. O código novo depende das colunas e da tabela criadas pela migração.
- Esta etapa migra o gerenciamento de usuários e o controle de acesso. O CRUD de eventos, a numeração independente de placas por evento e a inclusão do número da placa na exportação ainda precisam ser concluídos em uma etapa seguinte antes de considerar todo o escopo finalizado.
