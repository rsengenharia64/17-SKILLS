import type { DailyEntry, EntryDeviation } from '@/types';
import { diffHM, parseHMToMinutes, sumHM } from './time';

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
 *  janela1 = início → almoço/janta ida
 *  janela2 = reinício → término
 *  carga trabalhada = (janela1 + janela2) - soma desvios
 *  % produtivo = carga_trabalhada / (janela1+janela2)
 */
export function computeEntry(
  e: Pick<
    DailyEntry,
    | 'inicio_atividade'
    | 'almoco_janta_ida'
    | 'reinicio_atividade'
    | 'termino_atividade'
  >,
  deviations: Array<Pick<EntryDeviation, 'horas'>>,
): EntryComputed {
  const janela1 = diffHM(e.almoco_janta_ida, e.inicio_atividade);
  const janela2 = diffHM(e.termino_atividade, e.reinicio_atividade);

  const totalBrutoMin =
    parseHMToMinutes(janela1) + parseHMToMinutes(janela2);

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

function minutesToHMLocal(total: number): string {
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}
