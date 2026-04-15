import { db } from '@/db/database';
import type { User } from '@/types';

const SETTINGS_ENDPOINT = 'google_apps_script_endpoint';
const SETTINGS_TOKEN = 'google_apps_script_token';

export interface SyncConfig {
  endpoint?: string;
  token?: string;
}

export async function getSyncConfig(): Promise<SyncConfig> {
  const [ep, tk] = await Promise.all([
    db.app_settings.where('chave').equals(SETTINGS_ENDPOINT).first(),
    db.app_settings.where('chave').equals(SETTINGS_TOKEN).first(),
  ]);
  return { endpoint: ep?.valor, token: tk?.valor };
}

export async function saveSyncConfig(cfg: SyncConfig): Promise<void> {
  const now = new Date().toISOString();
  for (const [chave, valor] of [
    [SETTINGS_ENDPOINT, cfg.endpoint ?? ''],
    [SETTINGS_TOKEN, cfg.token ?? ''],
  ] as const) {
    const existing = await db.app_settings.where('chave').equals(chave).first();
    if (existing?.id) {
      await db.app_settings.update(existing.id, { valor, updated_at: now });
    } else {
      await db.app_settings.add({ chave, valor, created_at: now, updated_at: now });
    }
  }
}

export interface SyncReport {
  sent: number;
  failed: number;
  errors: string[];
}

/**
 * Processa a fila pendente enviando para o Google Apps Script.
 * Cada item só é enviado se pertence ao usuário autenticado.
 */
export async function runSync(user: User): Promise<SyncReport> {
  const cfg = await getSyncConfig();
  if (!cfg.endpoint) {
    return { sent: 0, failed: 0, errors: ['Endpoint não configurado.'] };
  }
  if (!navigator.onLine) {
    return { sent: 0, failed: 0, errors: ['Sem conexão.'] };
  }

  const items = await db.sync_queue
    .where('status')
    .equals('pending')
    .toArray();

  let sent = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const item of items) {
    try {
      const parsed = item.payload ? JSON.parse(item.payload) : null;
      const entry = parsed?.entry;

      // Isolamento duplo: confirma pelo banco (não apenas pelo payload).
      if (user.perfil !== 'admin') {
        const dbEntry = await db.daily_entries.get(item.entity_id);
        if (dbEntry && dbEntry.owner_user_id !== user.id) continue;
        if (entry && entry.owner_user_id !== user.id) continue;
      }

      await db.sync_queue.update(item.id!, {
        status: 'in_progress',
        tentativas: item.tentativas + 1,
        ultima_tentativa_at: new Date().toISOString(),
      });

      // Timeout defensivo de 15s por item.
      const ctrl = new AbortController();
      const timer = window.setTimeout(() => ctrl.abort(), 15_000);
      let res: Response;
      try {
        res = await fetch(cfg.endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            token: cfg.token ?? '',
            actor_user_id: user.id,
            actor_nome: user.nome,
            entity: item.entity_name,
            entity_id: item.entity_id,
            action: item.acao,
            payload: parsed,
          }),
          signal: ctrl.signal,
        });
      } finally {
        window.clearTimeout(timer);
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      // Tenta parsear a resposta para validar ok=true.
      try {
        const body = (await res.clone().json()) as { ok?: boolean; error?: string };
        if (body && body.ok === false) {
          throw new Error(body.error || 'remoto retornou ok=false');
        }
      } catch {
        // Ignora falha de parse — o Apps Script pode retornar texto.
      }

      await db.sync_queue.update(item.id!, {
        status: 'done',
        updated_at: new Date().toISOString(),
      });

      if (entry) {
        await db.daily_entries.update(entry.id, { sync_status: 'synced' });
      }
      sent += 1;
    } catch (e: any) {
      failed += 1;
      const msg = e?.name === 'AbortError' ? 'timeout' : e?.message ?? 'erro desconhecido';
      errors.push(msg);
      await db.sync_queue.update(item.id!, {
        status: 'error',
        erro: msg,
        updated_at: new Date().toISOString(),
      });
    }
  }

  return { sent, failed, errors };
}

export async function countPendingSync(): Promise<number> {
  return db.sync_queue.where('status').equals('pending').count();
}
