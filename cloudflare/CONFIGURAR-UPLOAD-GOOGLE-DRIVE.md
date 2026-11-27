# Configuração segura do upload de comprovantes

Esta versão faz o upload passar pelo Cloudflare Worker. O Worker valida a sessão administrativa e encaminha o arquivo ao Apps Script usando um segredo interno. Os arquivos continuam no Google Drive; parcelas, vínculos e descrições continuam no D1.

## 1. Configurar o Cloudflare Worker

Configure no Worker `itaitinga-mtb-api`:
- `GAS_WEBAPP_URL` (variável): URL `/exec` atual do Web App do Apps Script.
- `GAS_UPLOAD_SECRET` (secret): valor abaixo, sem aspas.

```text
IBfIBBZ9tDt9bPfnba-AS1xOAnObLRaA51Eehri7pYJCV37BpztYnpO0q5gerNkU
```

## 2. Configurar o Apps Script

Em **Configurações do projeto > Propriedades do script**, adicione:
- Propriedade: `CLOUDFLARE_UPLOAD_SECRET`
- Valor: o mesmo segredo acima.

Salve e publique uma nova versão da implantação do Web App.

## 3. Publicar

1. Atualize o Worker com `cloudflare/worker.js`.
2. Atualize o Apps Script com `backend/Codigo.gs` e `backend/Despesas.gs` e publique nova versão.
3. Atualize o Pages com os arquivos deste ZIP.

Não execute SQL novamente. Não altera tabelas D1 e mantém os arquivos no Google Drive.

O token administrativo não é enviado ao Apps Script: o Worker valida a sessão e usa o segredo interno servidor-a-servidor. Não coloque o segredo no JavaScript do Pages.
