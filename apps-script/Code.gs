/**
 * CBSI · Controle de Produtividade — Web App Google Apps Script.
 *
 * Recebe payloads enviados pelo PWA e persiste na planilha informada
 * (SHEET_ID) em duas abas:
 *   - "entries"    : um registro por lançamento diário (chave: UUID)
 *   - "deviations" : um registro por desvio do lançamento
 *
 * Fluxo:
 *   1. PWA chama este endpoint via POST JSON
 *   2. Validação opcional de token compartilhado
 *   3. Localiza linha existente por UUID ou cria nova
 *   4. Preenche/atualiza colunas e retorna status
 *
 * A estratégia de isolamento está no PWA: um líder só envia seus próprios
 * registros. Este script apenas recebe e grava. O cabeçalho é criado
 * automaticamente na primeira chamada. Alterações manuais na planilha são
 * preservadas fora das colunas mapeadas.
 */

// ====== CONFIGURAÇÃO ======
// Preencha com o ID da planilha (na URL: /spreadsheets/d/<ID>/edit).
var SHEET_ID = 'COLOQUE_AQUI_O_ID_DA_PLANILHA';

// Token compartilhado (opcional). Se definido, o PWA precisa enviar o mesmo.
var EXPECTED_TOKEN = '';

// Nomes das abas
var ENTRIES_SHEET = 'entries';
var DEVIATIONS_SHEET = 'deviations';

var ENTRY_COLUMNS = [
  'id',
  'leader_id',
  'owner_user_id',
  'data',
  'semana',
  'turno',
  'local_id',
  'efetivo',
  'dss_canteiro',
  'chegada_frente_trabalho',
  'abertura_pts',
  'inicio_atividade',
  'almoco_janta_ida',
  'reinicio_atividade',
  'termino_atividade',
  'carga_horaria_trabalhada',
  'desvio_total',
  'percentual_produtivo',
  'percentual_improdutivo',
  'observacoes',
  'sync_status',
  'version',
  'device_id',
  'created_at',
  'updated_at',
  'actor_nome',
  'synced_at',
];

var DEVIATION_COLUMNS = [
  'id',
  'daily_entry_id',
  'sequencia',
  'horas',
  'deviation_type_id',
  'observacao',
  'device_id',
  'created_at',
  'updated_at',
  'synced_at',
];

// ====== ENDPOINTS ======
function doGet(e) {
  return json({ ok: true, service: 'cbsi-produtividade', now: new Date().toISOString() });
}

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return json({ ok: false, error: 'empty body' }, 400);
    }
    var body = JSON.parse(e.postData.contents);

    if (EXPECTED_TOKEN && body.token !== EXPECTED_TOKEN) {
      return json({ ok: false, error: 'invalid token' }, 401);
    }

    if (body.entity === 'daily_entries') {
      return handleDailyEntry(body);
    }
    return json({ ok: false, error: 'unsupported entity: ' + body.entity }, 400);
  } catch (err) {
    return json({ ok: false, error: String(err && err.message ? err.message : err) }, 500);
  }
}

function handleDailyEntry(body) {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var entriesSheet = ensureSheet(ss, ENTRIES_SHEET, ENTRY_COLUMNS);
  var deviationsSheet = ensureSheet(ss, DEVIATIONS_SHEET, DEVIATION_COLUMNS);

  if (body.action === 'delete') {
    return softDeleteEntry(entriesSheet, body.entity_id, body.actor_nome);
  }

  var payload = body.payload || {};
  var entry = payload.entry;
  if (!entry || !entry.id) {
    return json({ ok: false, error: 'missing entry payload' }, 400);
  }

  // Upsert entry
  var rowIdx = findRowById(entriesSheet, entry.id);
  var entryRow = buildRow(ENTRY_COLUMNS, Object.assign({}, entry, {
    actor_nome: body.actor_nome || '',
    synced_at: new Date().toISOString(),
  }));
  if (rowIdx === -1) {
    entriesSheet.appendRow(entryRow);
  } else {
    entriesSheet.getRange(rowIdx, 1, 1, ENTRY_COLUMNS.length).setValues([entryRow]);
  }

  // Deviations: remove todas do entry e regrava (estratégia alinhada ao PWA)
  var deviations = payload.deviations || [];
  removeDeviationsByEntry(deviationsSheet, entry.id);
  if (deviations.length > 0) {
    var rows = deviations.map(function (d) {
      return buildRow(DEVIATION_COLUMNS, Object.assign({}, d, {
        daily_entry_id: entry.id,
        device_id: entry.device_id || '',
        created_at: d.created_at || new Date().toISOString(),
        updated_at: d.updated_at || new Date().toISOString(),
        synced_at: new Date().toISOString(),
      }));
    });
    deviationsSheet
      .getRange(deviationsSheet.getLastRow() + 1, 1, rows.length, DEVIATION_COLUMNS.length)
      .setValues(rows);
  }

  return json({ ok: true, id: entry.id, deviations: deviations.length });
}

function softDeleteEntry(sheet, id, actor) {
  var rowIdx = findRowById(sheet, id);
  if (rowIdx === -1) return json({ ok: true, id: id, noop: true });
  var col = columnIndex(sheet, 'sync_status');
  if (col !== -1) sheet.getRange(rowIdx, col + 1).setValue('deleted');
  var colObs = columnIndex(sheet, 'observacoes');
  if (colObs !== -1) {
    var cur = sheet.getRange(rowIdx, colObs + 1).getValue();
    sheet.getRange(rowIdx, colObs + 1).setValue(
      (cur ? cur + ' | ' : '') + '[deletado por ' + (actor || '?') + ' em ' + new Date().toISOString() + ']',
    );
  }
  return json({ ok: true, id: id, deleted: true });
}

// ====== UTIL ======
function ensureSheet(ss, name, columns) {
  var sheet = ss.getSheetByName(name);
  if (!sheet) sheet = ss.insertSheet(name);
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, columns.length).setValues([columns]);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function findRowById(sheet, id) {
  var data = sheet.getRange(2, 1, Math.max(0, sheet.getLastRow() - 1), 1).getValues();
  for (var i = 0; i < data.length; i++) {
    if (String(data[i][0]) === String(id)) return i + 2;
  }
  return -1;
}

function columnIndex(sheet, name) {
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  for (var i = 0; i < headers.length; i++) {
    if (headers[i] === name) return i;
  }
  return -1;
}

function buildRow(columns, obj) {
  return columns.map(function (c) {
    var v = obj[c];
    if (v === undefined || v === null) return '';
    if (typeof v === 'object') return JSON.stringify(v);
    return v;
  });
}

function removeDeviationsByEntry(sheet, entryId) {
  var last = sheet.getLastRow();
  if (last < 2) return;
  var data = sheet.getRange(2, 1, last - 1, sheet.getLastColumn()).getValues();
  var kept = data.filter(function (row) { return String(row[1]) !== String(entryId); });
  sheet.getRange(2, 1, data.length, sheet.getLastColumn()).clearContent();
  if (kept.length > 0) {
    sheet.getRange(2, 1, kept.length, sheet.getLastColumn()).setValues(kept);
  }
}

function json(obj, status) {
  var output = ContentService.createTextOutput(JSON.stringify(obj));
  output.setMimeType(ContentService.MimeType.JSON);
  return output;
}

// ====== TESTE MANUAL ======
// Selecione a função `testSync` no editor e rode uma vez para validar
// a estrutura (cria abas/cabeçalhos se preciso).
function testSync() {
  var fake = {
    postData: {
      contents: JSON.stringify({
        token: EXPECTED_TOKEN,
        actor_user_id: 'admin',
        actor_nome: 'Teste',
        entity: 'daily_entries',
        entity_id: 'demo-uuid-0001',
        action: 'create',
        payload: {
          entry: {
            id: 'demo-uuid-0001',
            leader_id: 'leader-x',
            owner_user_id: 'user-x',
            data: '2026-04-15',
            semana: 'Sem 16',
            turno: 'Dia',
            local_id: '',
            efetivo: 5,
            dss_canteiro: '07:40',
            chegada_frente_trabalho: '08:00',
            abertura_pts: '08:20',
            inicio_atividade: '08:30',
            almoco_janta_ida: '11:00',
            reinicio_atividade: '12:15',
            termino_atividade: '16:15',
            carga_horaria_trabalhada: '06:30',
            desvio_total: '00:10',
            percentual_produtivo: 97.4,
            percentual_improdutivo: 2.6,
            observacoes: 'Teste manual',
            sync_status: 'pending',
            version: 1,
            device_id: 'demo-device',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          deviations: [
            { id: 'dev-1', sequencia: 1, horas: '00:10', deviation_type_id: 'K', observacao: '' },
          ],
        },
      }),
    },
  };
  var out = doPost(fake);
  Logger.log(out.getContent());
}
