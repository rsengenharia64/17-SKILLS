# CBSI · Controle de Produtividade (PWA local-first)

Sistema operacional para líderes de campo preencherem lançamentos diários de
produtividade, horários operacionais e desvios.

- **100% offline** — funciona sem servidor, sem internet, sem backend.
- **Instalável** como app no celular, tablet e computador (PWA).
- **Isolado por líder** — um líder não acessa os dados do outro.
- **Sincronização opcional** com Google Sheets via Google Apps Script.
- **Backup e restauração** completos em JSON.
- **Gráficos e relatórios** gerados localmente (CSV/JSON/PDF).

## Sumário

1. [Stack](#stack)
2. [Rodar localmente](#rodar-localmente)
3. [Build para produção](#build-para-produção)
4. [Instalar como app (PWA)](#instalar-como-app-pwa)
5. [Publicar em hospedagem estática](#publicar-em-hospedagem-estática)
6. [Credenciais iniciais](#credenciais-iniciais)
7. [Fluxo operacional](#fluxo-operacional)
8. [Modelo de dados local](#modelo-de-dados-local)
9. [Sincronização opcional com Google Sheets](#sincronização-opcional-com-google-sheets)
10. [Contingência extrema](#contingência-extrema)
11. [Backup e restauração](#backup-e-restauração)
12. [Estrutura do projeto](#estrutura-do-projeto)
13. [Decisões de arquitetura](#decisões-de-arquitetura)

## Stack

- **React 18 + TypeScript** — UI
- **Vite 5** — bundler
- **Tailwind CSS** — estilos
- **Dexie.js** — abstração sobre **IndexedDB**
- **Zustand** — estado global (auth, UI)
- **React Hook Form + Zod** — formulário e validação
- **Recharts** — gráficos
- **jsPDF + jspdf-autotable** — relatório PDF
- **vite-plugin-pwa** (Workbox) — service worker e manifesto

Toda a persistência principal é local (IndexedDB via Dexie). O
servidor é **opcional** (Google Apps Script) e usado apenas como
consolidador.

## Rodar localmente

```bash
# 1. instale dependências (precisa Node 18+)
npm install

# 2. suba o dev server
npm run dev
# → http://localhost:5173
```

> O service worker também roda em dev (`devOptions.enabled = true` no
> `vite.config.ts`) para facilitar testar o modo offline.

## Build para produção

```bash
npm run build
npm run preview   # serve o bundle final para validação local
```

Saída em `dist/`. Esse diretório é estático e pode ser servido por qualquer
CDN/hospedagem.

## Instalar como app (PWA)

Depois de abrir o app publicado no navegador:

- **Chrome / Edge (desktop e Android)**: ícone `⊕` na barra de endereço → "Instalar".
- **Safari iOS**: *Compartilhar → Adicionar à Tela de Início*.
- **Android**: a primeira visita já oferece "Adicionar à tela inicial".

Uma vez instalado, o app funciona sem internet. A primeira carga salva
assets + seeds em IndexedDB e Cache Storage.

## Publicar em hospedagem estática

Qualquer host que sirva arquivos estáticos serve. Exemplos:

| Opção | Comando |
| --- | --- |
| Netlify | `npx netlify deploy --dir=dist --prod` |
| Vercel | `npx vercel --prod` (framework: `vite`) |
| GitHub Pages | publicar `dist/` no branch `gh-pages` |
| Cloudflare Pages | conectar repo, build `npm run build`, output `dist` |
| Firebase Hosting | `firebase deploy` após `firebase init hosting` |

Requisitos do host:

- Servir `index.html` em rotas desconhecidas (SPA fallback).
- HTTPS (obrigatório para instalação PWA).
- Cabeçalho `Cache-Control: public, max-age=31536000, immutable` para
  arquivos com hash (padrão Vite).

## Credenciais iniciais

Na primeira abertura do app em um dispositivo **zerado**, o seed gera
automaticamente **PINs temporários aleatórios e individuais** (4 dígitos) para
cada usuário — administrador + 13 líderes. Não existe PIN padrão compartilhado
(nada de `1234` ou `0000` para todo mundo).

Fluxo de configuração inicial:

1. **Abrir o app pela primeira vez.** O login exibe um banner âmbar
   "🔐 Primeira configuração deste dispositivo" com o PIN do **Administrador**.
2. **Entrar como Administrador** com o PIN mostrado.
3. O sistema exige a **troca imediata do PIN** (tela `/trocar-pin`, não dá pra
   pular). PINs fracos (`1234`, `1111`, sequências, repetições) são rejeitados.
4. Após a troca, o banner do login some. Acesse **Administração → Líderes**.
5. No topo aparece o painel **"🔐 PINs iniciais — distribuir aos líderes"**
   com a lista de *(nome, PIN)* de cada líder. Copie individualmente e entregue
   **fora do app** (impresso, mensagem privada).
6. Cada líder recebe o seu PIN, entra, e o sistema força a troca no primeiro
   acesso. A linha some da lista automaticamente.
7. Quando todos tiverem trocado (ou o admin clicar "Já distribuí, limpar"), o
   painel desaparece permanentemente e a lista é removida do banco.

> **Em nenhum momento o PIN em claro é enviado para um servidor.** A base só
> guarda hashes SHA-256 com salt. Os PINs temporários ficam em IndexedDB
> local apenas até serem distribuídos — e são removidos depois.
>
> PINs fracos são bloqueados pela tela de troca.

Líderes habilitados (seeds):

1. DEIVID RODRIGUES DOS SANTOS
2. DIONES FERNANDO FERNANDES DE SOUZA
3. DIONLENO PANI BOONE
4. EZEQUIEL ROEDER DOS SANTOS
5. FLAVIO BRAULIO DA ROCHA
6. GEAN SANT ANA RAMOS
7. GUSTAVO SIMOES MIRANDA
8. JOSE JOAQUIM DE JESUS SANTANA
9. MARCOS PAULO FERREIRA
10. OSVALDO DE SOUZA PINTO
11. PABLO SANT ANA FELIX
12. RENATO TERRA
13. SEVERINO VANILDO DE SOUSA

O administrador pode, a qualquer momento, redefinir o PIN de um líder
(Administração → Líderes → Reset PIN). Um novo PIN temporário de 4 dígitos
é gerado e mostrado na tela.

## Fluxo operacional

```
Login por PIN  ──►  [trocar PIN se temporário]  ──►  Dashboard
                                                      │
     ┌────────────────┬────────────┬──────────────────┤
     ▼                ▼            ▼                  ▼
Lançamento diário   Histórico   Relatórios    Administração (admin)
 • autosave local   • filtros   • CSV/JSON/PDF  • usuários, locais,
 • cálculo auto     • edição    • agrupamento    desvios, padrões,
 • até 10 desvios                                  sync, backup
```

### Isolamento entre líderes

- Cada lançamento grava `owner_user_id = user.id` no momento do insert.
- Todas as leituras em `daily_entries` são filtradas por `owner_user_id`
  para usuários com perfil `leader`.
- Tentativa de abrir um registro de outro líder retorna erro de
  acesso no repositório (`assertCanAccess`).
- O backup de líder exporta somente os próprios registros.
- A sincronização filtra registros pertencentes ao usuário logado.
- **Bloqueio automático por inatividade** (15 min) e **logout manual**.

### Autosave

- **Rascunho** (novo registro): salvo em `localStorage` por `user.id` a cada
  alteração (debounce 600 ms).
- **Edição**: persiste direto no IndexedDB com debounce 900 ms.
- Indicador visual no cabeçalho: *salvando · salvo · pendente · sincronizado · erro*.

### Cálculos automáticos

Implementados em `src/lib/calculations.ts`:

```
janela1 = almoço_ida − início
janela2 = término − reinício
bruto   = janela1 + janela2
desvio  = Σ horas dos desvios
trab.   = max(0, bruto − desvio)
% prod  = trab / bruto
% impr  = desvio / bruto
```

- Recalculado a cada alteração do formulário.
- **Turno noturno**: quando o fim é menor que o início (ex.: reinício `00:15`
  após término `04:15`), soma automaticamente 24h para fechar a janela.
- Badge de **inconsistência** quando `desvio > bruto`.

## Modelo de dados local

Implementado em Dexie (`src/db/database.ts`):

| Tabela | Descrição |
| --- | --- |
| `users` | usuários (admin + líderes) com PIN hash + slug |
| `leaders` | metadados de líder (equipe, ativo) |
| `locations` | locais de operação |
| `operation_standards` | padrões de horário por local/turno |
| `deviation_types` | tipos de desvio (A..AD cadastrados como seed) |
| `daily_entries` | lançamento diário (1 por dia/turno/líder) |
| `entry_deviations` | desvios filhos do lançamento (até 10) |
| `sync_queue` | fila de itens a enviar para o Apps Script |
| `audit_logs` | histórico de alterações relevantes |
| `app_settings` | configurações gerais (endpoint de sync etc.) |

Todos os registros operacionais usam **UUID v4**, `version`, `device_id` e
`sync_status` para suportar sincronização incremental.

## Sincronização opcional com Google Sheets

Todo o pipeline vive em [`apps-script/`](./apps-script/):

- `Code.gs` — Web App Apps Script que recebe POST JSON e grava/atualiza.
- `README.md` — passo a passo para publicar o endpoint, configurar a
  planilha mestre, publicar como Web App, testar manualmente.

Fluxo resumido:

```
PWA  ──►  sync_queue  ──►  POST JSON  ──►  Apps Script  ──►  Google Sheets
                                             │
                                             └─ chave primária UUID
                                                (evita duplicação)
```

- Após salvar um lançamento, ele entra em `sync_queue` com `status=pending`.
- Em **Administração → Sincronização**, o administrador ou líder pode
  clicar em **Sincronizar agora**. Se houver internet, a fila é processada.
- O PWA filtra a fila para que um líder só envie registros próprios.

## Contingência extrema

Se por algum motivo o PWA não puder ser usado em um dispositivo, existe
uma rota de contingência documentada em [`apps-script/README.md`](./apps-script/README.md):

- Exportar CSV do dispositivo disponível e enviar ao administrador.
- Criar **um Google Form por líder**, com link individual (campo líder
  pré-preenchido e oculto). Respostas caem na mesma planilha consolidadora.
- O administrador importa os dados consolidados de volta no PWA via
  *Backup/Restauração*.

Essa estratégia preserva o isolamento (sem um único formulário compartilhado
onde líderes poderiam editar dados uns dos outros).

## Backup e restauração

- **Exportar backup** (Administração → Backup/Restauração): gera arquivo
  `cbsi-backup-YYYY-MM-DD.json` com todas as entidades locais.
- **Restaurar backup**: aceita o mesmo arquivo e insere/atualiza registros
  via `bulkPut`. Pergunta se deve substituir (`replaceAll`) os lançamentos
  existentes ou apenas mesclar.

> Líderes exportam apenas seus próprios lançamentos; administrador exporta
> a base inteira.

## Estrutura do projeto

```
apps-script/
  Code.gs                      # Web App endpoint
  README.md                    # publicação/instruções
public/
  favicon.svg
  icons/                       # icons do PWA
src/
  App.tsx                      # rotas
  main.tsx                     # bootstrap + SW
  index.css                    # base Tailwind
  components/
    common/
      ProtectedRoute.tsx       # guarda de rota (login + admin-only)
      SaveStatus.tsx           # badge de autosave
    layout/
      AppShell.tsx             # shell + tab bar mobile
    ui/                        # primitives: Button, Input, Select, Card, Modal, Badge...
  db/
    database.ts                # Dexie (esquema v1)
    seeds.ts                   # seeds de usuários/líderes/desvios/locais/padrões/demo
    repositories.ts            # upsertEntry, softDelete, assertCanAccess...
  features/
    auth/                      # LoginScreen, ChangePinScreen
    daily-entries/             # DailyEntryScreen, form + zod resolver
    dashboard/                 # DashboardScreen + useDashboardData
    history/                   # HistoryScreen
    reports/                   # ReportsScreen
    admin/                     # Leaders, Locations, DeviationTypes, Standards, Backup, Sync
  hooks/
    useAutosave.ts
    useIdleTimeout.ts
    useOnlineStatus.ts
  lib/
    calculations.ts            # cálculos de produtividade
    cn.ts
    pin.ts                     # hash SHA-256 + salt do PIN
    slug.ts
    time.ts                    # máscara HH:mm, soma, diff, semana ISO
    uuid.ts                    # uuid + device id
  services/
    backupService.ts           # export/import JSON
    exportService.ts           # CSV / download de texto
    pdfService.ts              # relatório PDF com autotable
    syncService.ts             # fila → Apps Script (opcional)
  store/
    authStore.ts               # login, logout, troca/reset PIN, idle
    uiStore.ts                 # saveState global + online
  types/
    index.ts                   # tipos de domínio
  vite-env.d.ts
index.html
package.json
postcss.config.js
tailwind.config.ts
tsconfig.json
tsconfig.node.json
vite.config.ts
```

## Decisões de arquitetura

### Local-first antes de tudo

A operação de campo não pode depender de internet. Tudo que o usuário digita
vai direto para IndexedDB. A sincronização é uma camada opcional acima.

### IndexedDB + Dexie

O `localStorage` é limitado a ~5 MB, síncrono e sem índice — impossível
para milhares de lançamentos. IndexedDB, via Dexie, oferece transações,
índices compostos (usado em `[owner_user_id+data]` e `[daily_entry_id+sequencia]`)
e queries reativas (`useLiveQuery`) que alimentam dashboards em tempo real.

### Isolamento por líder

Em vez de confiar na UI, aplicamos o filtro no repositório
(`listEntriesForUser`, `assertCanAccess`). Qualquer tentativa de carregar
registro alheio quebra de forma explícita. O backup respeita a mesma regra.

### Desvios como tabela filha

Os desvios são registros separados (`entry_deviations`) relacionados por
`daily_entry_id`. Permite até 10 desvios por lançamento, consultas do tipo
"qual o tipo de desvio mais recorrente" sem parsing de strings, e deixa
naturalmente o caminho aberto para adicionar campos como `duracao`, `anexo`
ou `validado` futuramente.

### Zod resolver caseiro

Para evitar adicionar `@hookform/resolvers` por um único adaptador mínimo,
`src/features/daily-entries/zodResolver.ts` implementa o contrato esperado
pelo react-hook-form.

### Autosave com dupla estratégia

- **Criação**: autosave no `localStorage` como rascunho — evita criar
  registro "vazio" no IndexedDB a cada keystroke.
- **Edição**: autosave direto no IndexedDB (com `sync_status=pending`
  alimentando a fila).

### Segurança do PIN

O PIN é hasheado com SHA-256 + salt do app + salt do usuário. É adequado
para **proteção operacional** contra troca de turno no mesmo tablet —
não substitui autenticação server-side. O modelo foi escolhido porque o
contexto é offline-first.

### Service Worker

`vite-plugin-pwa` (Workbox) com estratégia `NetworkFirst` para documentos e
`StaleWhileRevalidate` para assets. O `registerType: 'autoUpdate'` garante
que uma nova versão é baixada em background assim que o dispositivo volta a
ter internet.

## Limites conhecidos

- O service worker é registrado em produção pelo `registerSW`; em desenvolvimento
  ele também está habilitado, mas recomenda-se testar PWA via `npm run build && npm run preview`.
- Os ícones PNG não são commitados; gere a partir de `public/icons/icon.svg`
  (veja `public/icons/README.md`) para ter o botão "Instalar" mais bonito.
- A sincronização é *last-write-wins* (versão mais recente vence).
  Atende ao modelo ownership-por-líder previsto no escopo.

## Licença

Uso interno CBSI · VALE · parceiros.
