import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/database';
import type { User, DailyEntry, EntryDeviation, Leader, Location, DeviationType } from '@/types';
import { parseHMToMinutes } from '@/lib/time';

export interface DashboardFilters {
  from?: string;
  to?: string;
  leaderId?: string;
  locationId?: string;
  turno?: 'Dia' | 'Noite' | '';
}

export interface DashboardData {
  entries: DailyEntry[];
  deviations: EntryDeviation[];
  leaders: Leader[];
  locations: Location[];
  deviationTypes: DeviationType[];
  kpis: {
    totalEntries: number;
    horasProdutivas: number;
    horasDesviadas: number;
    mediaProdutividade: number;
    melhorLider?: { nome: string; pct: number };
    localMaisDesvio?: { nome: string; min: number };
    desvioRecorrente?: { codigo: string; nome: string; min: number };
  };
}

export function useDashboardData(
  user: User,
  filters: DashboardFilters,
): DashboardData | undefined {
  return useLiveQuery(async () => {
    const leaders = await db.leaders.toArray();
    const locations = await db.locations.toArray();
    const deviationTypes = await db.deviation_types.toArray();

    let entries = await db.daily_entries.toArray();
    entries = entries.filter(e => !e.deleted_at);

    if (user.perfil !== 'admin') {
      entries = entries.filter(e => e.owner_user_id === user.id);
    }
    if (filters.from) entries = entries.filter(e => e.data >= filters.from!);
    if (filters.to) entries = entries.filter(e => e.data <= filters.to!);
    if (filters.leaderId)
      entries = entries.filter(e => e.leader_id === filters.leaderId);
    if (filters.locationId)
      entries = entries.filter(e => e.local_id === filters.locationId);
    if (filters.turno) entries = entries.filter(e => e.turno === filters.turno);

    const entryIds = entries.map(e => e.id);
    const deviations =
      entryIds.length === 0
        ? []
        : await db.entry_deviations
            .where('daily_entry_id')
            .anyOf(entryIds)
            .toArray();

    // KPIs
    const horasProdutivas =
      entries.reduce(
        (a, e) => a + parseHMToMinutes(e.carga_horaria_trabalhada),
        0,
      ) / 60;
    const horasDesviadas =
      deviations.reduce((a, d) => a + parseHMToMinutes(d.horas), 0) / 60;
    const mediaProdutividade =
      entries.length === 0
        ? 0
        : Math.round(
            (entries.reduce((a, e) => a + (e.percentual_produtivo ?? 0), 0) /
              entries.length) *
              10,
          ) / 10;

    // Melhor líder
    const perLeader = new Map<string, { sum: number; count: number }>();
    for (const e of entries) {
      const p = perLeader.get(e.leader_id) ?? { sum: 0, count: 0 };
      p.sum += e.percentual_produtivo ?? 0;
      p.count += 1;
      perLeader.set(e.leader_id, p);
    }
    let melhorLider: DashboardData['kpis']['melhorLider'];
    for (const [lid, p] of perLeader) {
      const avg = p.sum / p.count;
      if (!melhorLider || avg > melhorLider.pct) {
        const l = leaders.find(x => x.id === lid);
        melhorLider = { nome: l?.nome_exibicao ?? '—', pct: Math.round(avg * 10) / 10 };
      }
    }

    // Local com maior desvio (em minutos)
    const perLocation = new Map<string, number>();
    for (const e of entries) {
      if (!e.local_id) continue;
      perLocation.set(
        e.local_id,
        (perLocation.get(e.local_id) ?? 0) + parseHMToMinutes(e.desvio_total),
      );
    }
    let localMaisDesvio: DashboardData['kpis']['localMaisDesvio'];
    for (const [lid, min] of perLocation) {
      if (!localMaisDesvio || min > localMaisDesvio.min) {
        const loc = locations.find(x => x.id === lid);
        localMaisDesvio = { nome: loc?.nome ?? '—', min };
      }
    }

    // Desvio mais recorrente
    const perType = new Map<string, number>();
    for (const d of deviations) {
      if (!d.deviation_type_id) continue;
      perType.set(
        d.deviation_type_id,
        (perType.get(d.deviation_type_id) ?? 0) + parseHMToMinutes(d.horas),
      );
    }
    let desvioRecorrente: DashboardData['kpis']['desvioRecorrente'];
    for (const [tid, min] of perType) {
      if (!desvioRecorrente || min > desvioRecorrente.min) {
        const t = deviationTypes.find(x => x.id === tid);
        desvioRecorrente = {
          codigo: t?.codigo ?? '—',
          nome: t?.nome ?? '—',
          min,
        };
      }
    }

    return {
      entries,
      deviations,
      leaders,
      locations,
      deviationTypes,
      kpis: {
        totalEntries: entries.length,
        horasProdutivas: Math.round(horasProdutivas * 10) / 10,
        horasDesviadas: Math.round(horasDesviadas * 10) / 10,
        mediaProdutividade,
        melhorLider,
        localMaisDesvio,
        desvioRecorrente,
      },
    };
  }, [user.id, user.perfil, JSON.stringify(filters)]);
}
