/**
 * Tipos de domínio.
 * Estrutura relacional local-first. IDs são UUIDs (exceto enums / settings).
 */

export type UserProfile = 'admin' | 'leader';

export type SyncStatus = 'pending' | 'syncing' | 'synced' | 'error' | 'local_only';

export interface User {
  id: string;
  nome: string;
  slug: string;
  perfil: UserProfile;
  pin_hash: string;
  pin_temporario: boolean;
  ativo: boolean;
  ultimo_login_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Leader {
  id: string;
  user_id: string;
  nome_exibicao: string;
  equipe?: string;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export interface Location {
  id: string;
  nome: string;
  codigo: string;
  tipo_operacao?: string;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export interface OperationStandard {
  id: string;
  nome: string;
  local_id?: string | null;
  turno: TurnoType;
  dss_canteiro: string;
  chegada_frente_trabalho: string;
  abertura_pts: string;
  inicio_atividade: string;
  almoco_janta_ida: string;
  reinicio_atividade: string;
  termino_atividade: string;
  carga_horaria_padrao: string;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export interface DeviationType {
  id: string;
  codigo: string;
  nome: string;
  descricao?: string;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export type TurnoType = 'Dia' | 'Noite';

export interface DailyEntry {
  id: string;
  leader_id: string;
  owner_user_id: string;
  data: string; // ISO yyyy-mm-dd
  semana: string; // e.g. "Sem 16"
  turno: TurnoType;
  local_id: string | null;
  efetivo: number;
  dss_canteiro: string;
  chegada_frente_trabalho: string;
  abertura_pts: string;
  inicio_atividade: string;
  almoco_janta_ida: string;
  reinicio_atividade: string;
  termino_atividade: string;
  carga_horaria_trabalhada: string;
  desvio_total: string;
  percentual_produtivo: number;
  percentual_improdutivo: number;
  observacoes: string;
  sync_status: SyncStatus;
  version: number;
  device_id: string;
  deleted_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface EntryDeviation {
  id: string;
  daily_entry_id: string;
  sequencia: number; // 1..10
  horas: string; // HH:mm
  deviation_type_id: string | null;
  observacao?: string;
  sync_status: SyncStatus;
  version: number;
  device_id: string;
  created_at: string;
  updated_at: string;
}

export interface SyncQueueItem {
  id?: number;
  entity_name: string;
  entity_id: string;
  acao: 'create' | 'update' | 'delete';
  payload: string; // JSON
  status: 'pending' | 'in_progress' | 'done' | 'error';
  tentativas: number;
  ultima_tentativa_at?: string | null;
  erro?: string | null;
  created_at: string;
  updated_at: string;
}

export interface AuditLog {
  id?: number;
  user_id: string;
  entidade: string;
  entidade_id: string;
  acao: string;
  valor_anterior?: string | null;
  valor_novo?: string | null;
  device_id: string;
  created_at: string;
}

export interface AppSetting {
  id?: number;
  chave: string;
  valor: string;
  created_at: string;
  updated_at: string;
}

export interface SessionData {
  user: User;
  leader?: Leader | null;
  loggedInAt: string;
}

export interface BackupFile {
  meta: {
    app: 'cbsi-produtividade';
    version: string;
    exportedAt: string;
    deviceId: string;
  };
  data: {
    users: User[];
    leaders: Leader[];
    locations: Location[];
    operation_standards: OperationStandard[];
    deviation_types: DeviationType[];
    daily_entries: DailyEntry[];
    entry_deviations: EntryDeviation[];
    app_settings: AppSetting[];
  };
}
