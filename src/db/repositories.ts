import { db } from './database';
import type {
  DailyEntry,
  EntryDeviation,
  SyncStatus,
  User,
} from '@/types';
import { getDeviceId, uuid } from '@/lib/uuid';
import { computeEntry } from '@/lib/calculations';
import { weekLabel } from '@/lib/time';

function nowIso() {
  return new Date().toISOString();
}

/** Garante que só o dono (owner_user_id) ou um admin acessem. */
export function assertCanAccess(entry: DailyEntry, user: User): void {
  if (user.perfil === 'admin') return;
  if (entry.owner_user_id !== user.id) {
    throw new Error('Acesso negado: esse lançamento pertence a outro líder.');
  }
}

export async function listEntriesForUser(user: User) {
  const arr =
    user.perfil === 'admin'
      ? await db.daily_entries.toArray()
      : await db.daily_entries
          .where('owner_user_id')
          .equals(user.id)
          .toArray();
  return arr
    .filter(e => !e.deleted_at)
    .sort((a, b) => b.data.localeCompare(a.data));
}

export async function getEntryWithDeviations(
  id: string,
  user: User,
): Promise<{ entry: DailyEntry; deviations: EntryDeviation[] } | null> {
  const entry = await db.daily_entries.get(id);
  if (!entry) return null;
  assertCanAccess(entry, user);
  const deviations = await db.entry_deviations
    .where('daily_entry_id')
    .equals(id)
    .sortBy('sequencia');
  return { entry, deviations };
}

export interface UpsertEntryPayload {
  id?: string;
  leader_id: string;
  data: string;
  turno: DailyEntry['turno'];
  local_id: string | null;
  efetivo: number;
  dss_canteiro: string;
  chegada_frente_trabalho: string;
  abertura_pts: string;
  inicio_atividade: string;
  almoco_janta_ida: string;
  reinicio_atividade: string;
  termino_atividade: string;
  observacoes: string;
  deviations: Array<{
    id?: string;
    sequencia: number;
    horas: string;
    deviation_type_id: string | null;
    observacao?: string;
  }>;
}

export interface UpsertOptions {
  /** Não cria item de sync_queue nem audit_log (usado por autosave). */
  skipQueue?: boolean;
}

export async function upsertEntry(
  payload: UpsertEntryPayload,
  user: User,
  opts: UpsertOptions = {},
): Promise<DailyEntry> {
  const device = getDeviceId();
  const computed = computeEntry(
    { ...payload, turno: payload.turno },
    payload.deviations,
  );

  // Duplicidade: mesmo líder + data + turno não pode ter 2 lançamentos.
  if (!payload.id) {
    const dup = await db.daily_entries
      .where('[leader_id+data]')
      .equals([payload.leader_id, payload.data])
      .and(x => x.turno === payload.turno && !x.deleted_at)
      .first();
    if (dup) {
      throw new Error(
        `Já existe lançamento para este líder em ${payload.data} (${payload.turno}). Edite o registro existente.`,
      );
    }
  }

  // Admin criando lançamento vinculado a um líder: o owner é o USUÁRIO do líder.
  let ownerUserId = user.id;
  if (user.perfil === 'admin' && !payload.id) {
    const leader = await db.leaders.get(payload.leader_id);
    if (leader) ownerUserId = leader.user_id;
  }

  return db.transaction(
    'rw',
    [db.daily_entries, db.entry_deviations, db.sync_queue, db.audit_logs],
    async () => {
      let entry: DailyEntry;
      let isCreate = false;
      if (payload.id) {
        const existing = await db.daily_entries.get(payload.id);
        if (!existing) throw new Error('Lançamento não encontrado.');
        assertCanAccess(existing, user);
        entry = {
          ...existing,
          leader_id: payload.leader_id,
          data: payload.data,
          semana: weekLabel(payload.data),
          turno: payload.turno,
          local_id: payload.local_id,
          efetivo: payload.efetivo,
          dss_canteiro: payload.dss_canteiro,
          chegada_frente_trabalho: payload.chegada_frente_trabalho,
          abertura_pts: payload.abertura_pts,
          inicio_atividade: payload.inicio_atividade,
          almoco_janta_ida: payload.almoco_janta_ida,
          reinicio_atividade: payload.reinicio_atividade,
          termino_atividade: payload.termino_atividade,
          carga_horaria_trabalhada: computed.carga_horaria_trabalhada,
          desvio_total: computed.desvio_total,
          percentual_produtivo: computed.percentual_produtivo,
          percentual_improdutivo: computed.percentual_improdutivo,
          observacoes: payload.observacoes,
          sync_status: 'pending' as SyncStatus,
          version: existing.version + 1,
          device_id: device,
          updated_at: nowIso(),
        };
        await db.daily_entries.put(entry);
      } else {
        isCreate = true;
        entry = {
          id: uuid(),
          leader_id: payload.leader_id,
          owner_user_id: ownerUserId,
          data: payload.data,
          semana: weekLabel(payload.data),
          turno: payload.turno,
          local_id: payload.local_id,
          efetivo: payload.efetivo,
          dss_canteiro: payload.dss_canteiro,
          chegada_frente_trabalho: payload.chegada_frente_trabalho,
          abertura_pts: payload.abertura_pts,
          inicio_atividade: payload.inicio_atividade,
          almoco_janta_ida: payload.almoco_janta_ida,
          reinicio_atividade: payload.reinicio_atividade,
          termino_atividade: payload.termino_atividade,
          carga_horaria_trabalhada: computed.carga_horaria_trabalhada,
          desvio_total: computed.desvio_total,
          percentual_produtivo: computed.percentual_produtivo,
          percentual_improdutivo: computed.percentual_improdutivo,
          observacoes: payload.observacoes,
          sync_status: 'pending',
          version: 1,
          device_id: device,
          created_at: nowIso(),
          updated_at: nowIso(),
        };
        await db.daily_entries.add(entry);
      }

      // Substitui as filhas: estratégia simples (delete + insert).
      await db.entry_deviations
        .where('daily_entry_id')
        .equals(entry.id)
        .delete();

      for (const d of payload.deviations) {
        if (!d.horas || d.horas === '00:00') continue;
        await db.entry_deviations.add({
          id: d.id ?? uuid(),
          daily_entry_id: entry.id,
          sequencia: d.sequencia,
          horas: d.horas,
          deviation_type_id: d.deviation_type_id,
          observacao: d.observacao ?? '',
          sync_status: 'pending',
          version: 1,
          device_id: device,
          created_at: nowIso(),
          updated_at: nowIso(),
        });
      }

      if (!opts.skipQueue) {
        // Consolida fila: se já existe item pendente para essa entity, atualiza-o
        // em vez de empilhar vários. Evita explosão da sync_queue pelo autosave.
        const existingQ = await db.sync_queue
          .where('entity_id')
          .equals(entry.id)
          .and(q => q.status === 'pending')
          .first();
        const qPayload = JSON.stringify({
          entry,
          deviations: payload.deviations,
        });
        if (existingQ?.id) {
          await db.sync_queue.update(existingQ.id, {
            payload: qPayload,
            acao: existingQ.acao === 'create' ? 'create' : 'update',
            updated_at: nowIso(),
          });
        } else {
          await db.sync_queue.add({
            entity_name: 'daily_entries',
            entity_id: entry.id,
            acao: isCreate ? 'create' : 'update',
            payload: qPayload,
            status: 'pending',
            tentativas: 0,
            created_at: nowIso(),
            updated_at: nowIso(),
          });
        }

        await db.audit_logs.add({
          user_id: user.id,
          entidade: 'daily_entries',
          entidade_id: entry.id,
          acao: isCreate ? 'create' : 'update',
          valor_novo: JSON.stringify(entry),
          device_id: device,
          created_at: nowIso(),
        });
      }

      return entry;
    },
  );
}

export async function softDeleteEntry(id: string, user: User): Promise<void> {
  const existing = await db.daily_entries.get(id);
  if (!existing) return;
  assertCanAccess(existing, user);
  await db.daily_entries.update(id, {
    deleted_at: nowIso(),
    sync_status: 'pending',
    updated_at: nowIso(),
    version: existing.version + 1,
  });
  await db.sync_queue.add({
    entity_name: 'daily_entries',
    entity_id: id,
    acao: 'delete',
    payload: JSON.stringify({ id }),
    status: 'pending',
    tentativas: 0,
    created_at: nowIso(),
    updated_at: nowIso(),
  });
  await db.audit_logs.add({
    user_id: user.id,
    entidade: 'daily_entries',
    entidade_id: id,
    acao: 'delete',
    device_id: getDeviceId(),
    created_at: nowIso(),
  });
}
