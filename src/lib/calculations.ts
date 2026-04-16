import type { DailyEntry, EntryDeviation, TurnoType } from '@/types';
import { parseHMToMinutes, sumHM } from './time';

export interface EntryComputed {
  carga_horaria_trabalhada: string;
  desvio_total: string;
  percentual_produtivo: number;
  percentual_improdutivo: number;
  inconsistente: boolean;
  mensagem_inconsistencia?: string;
}

/**
 * Calcula carga horária trabalhada, total de desvios e %.
 *
 * Regra:
 *   janela1 = almoço/janta_ida − início
 *   janela2 = término − reinício
 *   bruto   = janela1 + janela2
 *   desvio  = Σ desvios
 *   trab.   = max(0, bruto − desvio)
 *   % prod  = trab / bruto
 *
 * Em turnos noturnos (ou quando o fim é numericamente menor que o início
 * porque passa pela meia-noite), somamos 24h para fechar a janela
 * corretamente. `diffWithWrap` encapsula essa regra.
 */
export function computeEntry(
  e: Pick<
    DailyEntry,
    | 'inicio_atividade'
    | 'almoco_janta_ida'
    | 'reinicio_atividade'
    | 'termino_atividade'
  > & Partial<Pick<DailyEntry, 'turno'>>,
  deviations: Array<Pick<EntryDeviation, 'horas'>>,
): EntryComputed {
  const turno: TurnoType | undefined = e.turno;
  const janela1 = diffWithWrap(e.almoco_janta_ida, e.inicio_atividade, turno);
  const janela2 = diffWithWrap(e.termino_atividade, e.reinicio_atividade, turno);

  const totalBrutoMin = janela1 + janela2;

  const desvioMin = deviations.reduce(
    (a, d) => a + parseHMToMinutes(d.horas),
    0,
  );
  const desvio_total = sumHM(deviations.map(d => d.horas));

  const trabalhadoMin = Math.max(0, totalBrutoMin - desvioMin);
  const carga_horaria_trabalhada = minutesToHMLocal(trabalhadoMin);

  const percentual_produtivo =
    totalBrutoMin === 0
      ? 0
      : Math.round((trabalhadoMin / totalBrutoMin) * 1000) / 10;
  const percentual_improdutivo =
    totalBrutoMin === 0
      ? 0
      : Math.round((desvioMin / totalBrutoMin) * 1000) / 10;

  const inconsistente = desvioMin > totalBrutoMin;
  const mensagem_inconsistencia = inconsistente
    ? 'A soma dos desvios é maior que a jornada produtiva disponível.'
    : undefined;

  return {
    carga_horaria_trabalhada,
    desvio_total,
    percentual_produtivo,
    percentual_improdutivo,
    inconsistente,
    mensagem_inconsistencia,
  };
}

/**
 * Diferença em minutos entre dois horários HH:mm. Se o fim é menor que o
 * início, assume que cruzou a meia-noite (típico do turno noite) e soma 24h.
 * Retorna 0 quando algum campo é inválido ou a janela "saltaria" mais de 24h.
 */
function diffWithWrap(
  fim: string,
  inicio: string,
  turno: TurnoType | undefined,
): number {
  const a = parseHMToMinutes(fim);
  const b = parseHMToMinutes(inicio);
  if (!fim || !inicio) return 0;
  let delta = a - b;
  if (delta < 0) {
    // Se for turno noite, a janela atravessa a meia-noite. Se não, 0.
    if (turno === 'Noite') {
      delta += 24 * 60;
    } else {
      delta = 0;
    }
  }
  // Proteção contra entradas absurdas (>24h em uma única janela).
  if (delta > 24 * 60) return 0;
  return delta;
}

function minutesToHMLocal(total: number): string {
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}
