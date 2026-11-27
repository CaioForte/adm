# Itaitinga MTB Race Admin — pacote atualizado

O pacote preserva o layout e os arquivos do projeto recebido. O `index.html` continua carregando `js/main-v62.js?v=640`.

## Integração Cloudflare presente
- `cloudflare/worker.js`: login, logout, validação de sessão, dashboard, listagem e detalhe individual de inscrição.
- `js/main-v62.js`: login/logout, dashboard, listagem e detalhe individual direcionados ao Worker.
- `cloudflare/schema-d1-referencia.sql`: referência do schema usado na configuração inicial do D1.

## Limite importante desta versão
A migração ainda não está concluída. Despesas, usuários, categorias/lotes, configurações do site, cadastro/edição de inscrições e upload/visualização de arquivos continuam usando o Apps Script para não quebrar módulos sem rotas D1 equivalentes implementadas e testadas. Os anexos ainda não foram migrados para R2; por isso o detalhe consultado no D1 retorna `arquivos: []` e não converte `payment_proof_key` em URL.

**Não desative o Apps Script ainda.** A migração só estará completa depois de implementar e testar cada ação restante no Worker/D1 e migrar os arquivos para R2.

## Publicação
1. Publique `cloudflare/worker.js` no Worker `itaitinga-mtb-api`.
2. Mantenha o binding D1 chamado `DB`.
3. Publique os arquivos do painel no Pages/servidor atual.
4. Teste login, dashboard, listagem e detalhe de inscrição.

O SQL é uma referência do schema já aplicado. Não execute novamente sem revisar: há `ALTER TABLE` que não são idempotentes.


## Pagamentos parciais de despesas

Antes de publicar a versão que habilita parcelas, execute uma única vez no console SQL do D1 o arquivo `migracao-pagamentos-parciais.sql`. Os comprovantes continuam sendo enviados ao Google Drive pelo Apps Script; o D1 guarda o identificador do arquivo, nome e descrição associados à parcela.
