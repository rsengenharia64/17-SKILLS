import Dexie, { type Table } from 'dexie';
import type {
  AppSetting,
  AuditLog,
  DailyEntry,
  DeviationType,
  EntryDeviation,
  Leader,
  Location,
  OperationStandard,
  SyncQueueItem,
  User,
} from '@/types';

/**
 * Banco local IndexedDB via Dexie.
 *
 * Nome: cbsi-produtividade
 * Versão: 1
 *
 * Cada lançamento ("daily_entries") pertence a um líder e a um usuário dono
 * (owner_user_id). O filtro por owner_user_id garante isolamento de dados.
 */
export class AppDB extends Dexie {
  users!: Table<User, string>;
  leaders!: Table<Leader, string>;
  locations!: Table<Location, string>;
  operation_standards!: Table<OperationStandard, string>;
  deviation_types!: Table<DeviationType, string>;
  daily_entries!: Table<DailyEntry, string>;
  entry_deviations!: Table<EntryDeviation, string>;
  sync_queue!: Table<SyncQueueItem, number>;
  audit_logs!: Table<AuditLog, number>;
  app_settings!: Table<AppSetting, number>;

  constructor() {
    super('cbsi-produtividade');

    this.version(1).stores({
      users: 'id, slug, perfil, ativo',
      leaders: 'id, user_id, nome_exibicao, ativo',
      locations: 'id, codigo, ativo',
      operation_standards: 'id, local_id, turno, ativo',
      deviation_types: 'id, codigo, ativo',
      daily_entries:
        'id, leader_id, owner_user_id, data, semana, turno, local_id, sync_status, [owner_user_id+data], [leader_id+data]',
      entry_deviations:
        'id, daily_entry_id, sequencia, deviation_type_id, sync_status, [daily_entry_id+sequencia]',
      sync_queue: '++id, entity_name, entity_id, status, created_at',
      audit_logs: '++id, user_id, entidade, entidade_id, created_at',
      app_settings: '++id, &chave',
    });
  }
}

export const db = new AppDB();
