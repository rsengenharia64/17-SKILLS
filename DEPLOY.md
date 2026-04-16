# Publicação — CBSI Controle de Produtividade

Este projeto é 100% estático (PWA). Qualquer host com HTTPS + SPA fallback
serve. O repositório já vem com as configurações prontas para Vercel,
Netlify e Cloudflare Pages — escolha uma e clique.

---

## Opção A — Vercel (recomendado, 1 clique)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/rsengenharia64/17-SKILLS&project-name=cbsi-produtividade&repository-name=cbsi-produtividade)

Ou manualmente:

```bash
npm i -g vercel         # primeira vez só
vercel login            # autentica no navegador
vercel --prod           # publica (detecta vercel.json)
```

Saída típica:
```
✅  Production: https://cbsi-produtividade.vercel.app
```

Atualizações futuras:
```bash
vercel --prod
# ou simplesmente dê merge no PR e conecte o projeto ao repo: deploy automático em cada push.
```

Config já incluída em [`vercel.json`](./vercel.json):
- `framework: vite`, `outputDirectory: dist`
- SPA rewrite que **exclui** `sw.js`, `manifest.webmanifest`, `/assets/*`, `/icons/*`, `favicon.svg`, `robots.txt`
- `Service-Worker-Allowed: /` + cache imutável nos assets com hash

---

## Opção B — Netlify (1 clique)

[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/rsengenharia64/17-SKILLS)

Ou manualmente:

```bash
npm i -g netlify-cli    # primeira vez
netlify login
netlify deploy --prod --dir=dist   # após `npm run build`
```

Saída típica:
```
Website URL: https://cbsi-produtividade.netlify.app
```

Config já incluída em [`netlify.toml`](./netlify.toml) (build command, publish
dir, SPA redirect, headers do SW/manifest).

---

## Opção C — Cloudflare Pages

1. https://dash.cloudflare.com → Workers & Pages → Create → Pages → Connect to Git.
2. Selecionar o repositório `rsengenharia64/17-SKILLS` e branch `main` (ou
   `claude/build-os-system-fgOTP` enquanto o PR não for mergeado).
3. Framework preset: **None** (ou *Vite*).
4. Build command: `npm run build`
5. Build output directory: `dist`
6. Variáveis de ambiente: nenhuma.
7. Salvar → primeiro deploy roda em ~2 min.

SPA fallback e cabeçalhos já estão em [`public/_redirects`](./public/_redirects)
e [`public/_headers`](./public/_headers) — o Vite copia ambos para `dist/`
automaticamente, a Cloudflare detecta.

URL final fica em `https://cbsi-produtividade.pages.dev` (ou o slug que você
escolher).

---

## Opção D — GitHub Pages

GitHub Pages funciona, mas não suporta cabeçalhos customizados nem
redirects nativos de SPA sem hacks. Se for inevitável, dá pra usar com
`HashRouter` — mas não é o caminho recomendado. Use Pages só como último
recurso.

---

## Validações obrigatórias após publicar

Use o **DevTools → Application**:

- [ ] `https://<seu-dominio>/` abre a tela de login
- [ ] `/manifest.webmanifest` retorna JSON com `name: "CBSI - Controle de Produtividade"`
- [ ] `/sw.js` retorna JS (200 OK) com `Service-Worker-Allowed: /`
- [ ] Aba **Application → Service Workers** mostra o worker *activated and running*
- [ ] Aba **Application → Manifest** reconhece ícones e nome
- [ ] Botão **Instalar** aparece na barra do Chrome
- [ ] Navegar para `/app` pelo endereço (sem sessão) → redireciona para `/login` (não 404)
- [ ] DevTools **Network → Offline** → recarregar → app abre sem internet

---

## Atualização de versões futuras

Com **conexão Git ao projeto** (jeito certo):

1. Merge do PR em `main`.
2. Vercel/Netlify/Cloudflare detectam push → build automático → deploy.
3. Service worker do PWA detecta nova versão (`registerType: 'autoUpdate'` em
   `vite.config.ts`) e atualiza em background na próxima abertura.

Se quiser forçar invalidação imediata no dispositivo instalado:
- DevTools → Application → Service Workers → **Unregister**, depois F5.

Sem Git conectado (`vercel --prod` manual):
```bash
git pull
npm install
npm run build
vercel --prod     # ou  netlify deploy --prod --dir=dist
```

---

## Configurações / variáveis de ambiente

**Nenhuma** para a aplicação rodar.

A integração opcional com Google Apps Script é configurada *dentro do app*,
por usuário admin, em *Administração → Sincronização*. Nada precisa ser
definido no host.

Se futuramente você quiser colocar um endpoint padrão embutido no build:

```env
# .env.production (opcional)
VITE_DEFAULT_SYNC_ENDPOINT=https://script.google.com/macros/s/.../exec
VITE_DEFAULT_SYNC_TOKEN=seu_token
```

Hoje o código não lê essas variáveis — se precisar, é pequena alteração
no `src/services/syncService.ts` (fallback para `import.meta.env`).

---

## Domínio customizado

Em qualquer uma das 3 plataformas, o caminho é o mesmo:

1. Configurações do projeto → Domains → Add.
2. Inserir `produtividade.suaempresa.com.br`.
3. Criar o registro DNS informado (CNAME ou A).
4. HTTPS é provisionado automaticamente (Let's Encrypt).

---

## Checklist final de go-live

- [ ] Deploy em produção publicado
- [ ] Domínio customizado (opcional)
- [ ] HTTPS ativo (obrigatório — PWA não instala sem)
- [ ] Homologação dos 10 testes manuais (ver seção "Checklist final" no
      README/PR)
- [ ] Admin logou, trocou PIN, distribuiu PINs dos 13 líderes
- [ ] Primeiro líder conseguiu instalar o app no próprio dispositivo
- [ ] Ensaio de ≥ 3 dias com 2 líderes antes do rollout geral
