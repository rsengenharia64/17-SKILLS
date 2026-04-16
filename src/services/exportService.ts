import type {
  DailyEntry,
  DeviationType,
  EntryDeviation,
  Leader,
  Location,
} from '@/types';

export function toCSV(rows: Array<Record<string, unknown>>): string {
  if (rows.length === 0) return '';
  const headers = Object.keys(rows[0]);
  const escape = (v: unknown) => {
    if (v === null || v === undefined) return '';
    const s = String(v);
    if (/[",;\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const lines = [headers.join(';')];
  for (const r of rows) {
    lines.push(headers.map(h => escape(r[h])).join(';'));
  }
  return lines.join('\n');
}

export function downloadText(
  text: string,
  filename: string,
  mime = 'text/plain;charset=utf-8',
) {
  const blob = new Blob(['\uFEFF' + text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export function entriesToCsv(
  entries: DailyEntry[],
  deviations: EntryDeviation[],
  leaders: Leader[],
  locations: Location[],
  deviationTypes: DeviationType[],
): string {
  const rows = entries.map(e => {
    const leader = leaders.find(l => l.id === e.leader_id)?.nome_exibicao ?? '';
    const local = locations.find(l => l.id === e.local_id)?.nome ?? '';
    const desvios = deviations
      .filter(d => d.daily_entry_id === e.id)
      .sort((a, b) => a.sequencia - b.sequencia);
    const desvStr = desvios
      .map(d => {
        const t = deviationTypes.find(x => x.id === d.deviation_type_id);
        return `${t?.codigo ?? '?'}:${d.horas}`;
      })
      .join(' | ');
    return {
      data: e.data,
      semana: e.semana,
      lider: leader,
      local,
      turno: e.turno,
      efetivo: e.efetivo,
      dss_canteiro: e.dss_canteiro,
      chegada_frente_trabalho: e.chegada_frente_trabalho,
      abertura_pts: e.abertura_pts,
      inicio_atividade: e.inicio_atividade,
      almoco_janta_ida: e.almoco_janta_ida,
      reinicio_atividade: e.reinicio_atividade,
      termino_atividade: e.termino_atividade,
      carga_horaria_trabalhada: e.carga_horaria_trabalhada,
      desvio_total: e.desvio_total,
      percentual_produtivo: e.percentual_produtivo,
      percentual_improdutivo: e.percentual_improdutivo,
      desvios: desvStr,
      observacoes: e.observacoes,
      sync_status: e.sync_status,
    };
  });
  return toCSV(rows);
}
