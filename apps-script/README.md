# Integração opcional — Google Apps Script

Este módulo é uma contingência. O PWA funciona 100% offline; o Apps Script
serve apenas para consolidar dados na nuvem quando existe internet.

## Visão geral

```
PWA (IndexedDB local) ──► fila pendente ──► POST JSON ──► Apps Script ──► Google Sheets
```

- Cada líder só envia seus próprios registros (imposto no PWA).
- O Apps Script é idempotente: chave primária `UUID` evita duplicação.
- Linhas existentes são **atualizadas**, novas são **inseridas**.
- Timestamp de sincronização é carimbado automaticamente.

## 1. Criar a planilha mestre

1. Crie uma planilha em [sheets.google.com](https://sheets.google.com) (ou reutilize uma).
2. Copie o ID da URL, ex: `https://docs.google.com/spreadsheets/d/ABC1234xyz/edit#gid=0` → `ABC1234xyz`.
3. Não precisa criar abas manualmente — o script cria `entries` e `deviations`.

## 2. Criar o projeto Apps Script

1. Acesse [script.google.com](https://script.google.com) → **Novo projeto**.
2. Renomeie para `cbsi-produtividade-sync`.
3. Cole o conteúdo de [`Code.gs`](./Code.gs) no arquivo `Código.gs`.
4. No topo do arquivo, ajuste:

   ```javascript
   var SHEET_ID = 'COLOQUE_AQUI_O_ID_DA_PLANILHA';
   var EXPECTED_TOKEN = ''; // opcional, token compartilhado com o PWA
   ```

5. Salve.

## 3. Publicar como Web App

1. **Implantar → Nova implantação → Tipo: App da Web**.
2. Descrição: `cbsi-produtividade-sync v1`.
3. Executar como: **Eu** (seu e-mail).
4. Quem pode acessar: **Qualquer pessoa** (necessário para o PWA chamar sem OAuth).
5. Clique em **Implantar** e **autorize** o app quando o Google pedir (permissões para Planilhas).
6. Copie a URL retornada (termina em `/exec`).

> Se preferir, restrinja a "Qualquer pessoa com a conta Google" e configure um
> proxy — ou use o `EXPECTED_TOKEN` para mitigar.

## 4. Configurar o PWA

1. Entre no app como administrador.
2. Vá em **Administração → Sincronização**.
3. Cole a URL `/exec` no campo **Endpoint** e o token (se definido) no campo **Token**.
4. Clique em **Salvar configuração**.
5. Com conexão ativa, clique em **Sincronizar agora**. A fila pendente será enviada.

## 5. Payload esperado

Chamada POST com corpo JSON:

```json
{
  "token": "opcional",
  "actor_user_id": "uuid-do-usuario-logado",
  "actor_nome": "Nome do líder ou admin",
  "entity": "daily_entries",
  "entity_id": "uuid-do-registro",
  "action": "create | update | delete",
  "payload": {
    "entry": { "...": "objeto DailyEntry" },
    "deviations": [{ "sequencia": 1, "horas": "00:30", "...": "..." }]
  }
}
```

Resposta (200):

```json
{ "ok": true, "id": "uuid-do-registro", "deviations": 2 }
```

Erros retornam `{ "ok": false, "error": "..." }`.

## 6. Teste manual no editor

No editor do Apps Script selecione a função `testSync` e clique em **Executar**.
Autorize se necessário — será inserido um registro de demonstração nas abas
`entries` e `deviations`. Útil para validar permissões e estrutura sem sair
do editor.

## 7. Contingência extrema (sem PWA)

Se em algum momento o PWA estiver indisponível (dispositivo defeituoso,
instalação bloqueada), duas alternativas:

1. **CSV por líder**: cada líder exporta CSV do próprio tablet (tela
   *Relatórios* → `⬇ CSV`) e envia por e-mail/WhatsApp para o administrador.
2. **Formulário Google por líder**: crie um Google Form individual, com
   **link personalizado por líder** (campo `líder` pré-preenchido e oculto).
   As respostas caem em uma aba nesta mesma planilha. Modelo recomendado:
   - 1 formulário × 1 líder → garante isolamento.
   - Campos idênticos ao formulário do PWA.
   - Reforce com instruções: "Não compartilhe este link com outros líderes".

Ambas as rotas consolidam na mesma planilha, que o administrador pode
reimportar no PWA via **Backup/Restauração**.

## 8. Segurança operacional

- O endpoint é público por padrão — use `EXPECTED_TOKEN` para filtrar chamadas
  válidas.
- O Apps Script roda como o proprietário; isso significa que apenas quem
  publicou o script consegue alterar o código (e os dados ficam na Planilha
  dessa conta).
- Monitore as execuções em *Apps Script → Execuções*.
- Em caso de token comprometido, basta alterar a constante e **republicar a
  nova versão**; atualize também no PWA.
