import { db } from '@/db/database';
import type { BackupFile, User } from '@/types';
import { getDeviceId } from '@/lib/uuid';
import { downloadText } from './exportService';

export async function exportFullBackup(user: User): Promise<BackupFile> {
  const [
    users,
    leaders,
    locations,
    operation_standards,
    deviation_types,
    daily_entries,
    entry_deviations,
    app_settings,
  ] = await Promise.all([
    user.perfil === 'admin' ? db.users.toArray() : [sanitizeUser(user)],
    db.leaders.toArray(),
    db.locations.toArray(),
    db.operation_standards.toArray(),
    db.deviation_types.toArray(),
    user.perfil === 'admin'
      ? db.daily_entries.toArray()
      : db.daily_entries.where('owner_user_id').equals(user.id).toArray(),
    db.entry_deviations.toArray(),
    db.app_settings.toArray(),
  ]);

  // Líder só leva os próprios registros filhos.
  const entryIds = new Set(daily_entries.map(e => e.id));
  const filteredDeviations =
    user.perfil === 'admin'
      ? entry_deviations
      : entry_deviations.filter(d => entryIds.has(d.daily_entry_id));

  return {
    meta: {
      app: 'cbsi-produtividade',
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      deviceId: getDeviceId(),
    },
    data: {
      users,
      leaders,
      locations,
      operation_standards,
      deviation_types,
      daily_entries,
      entry_deviations: filteredDeviations,
      app_settings,
    },
  };
}

export async function downloadBackup(user: User) {
  const backup = await exportFullBackup(user);
  const name = `cbsi-backup-${new Date().toISOString().slice(0, 10)}.json`;
  downloadText(JSON.stringify(backup, null, 2), name, 'application/json');
}

export async function restoreBackup(
  jsonText: string,
  opts: { replaceAll: boolean } = { replaceAll: false },
): Promise<{ ok: true; counts: Record<string, number> } | { ok: false; error: string }> {
  try {
    const parsed = JSON.parse(jsonText) as BackupFile;
    if (parsed.meta?.app !== 'cbsi-produtividade') {
      return { ok: false, error: 'Arquivo de backup inválido.' };
    }
    const d = parsed.data;
    await db.transaction(
      'rw',
      [
        db.users,
        db.leaders,
        db.locations,
        db.operation_standards,
        db.deviation_types,
        db.daily_entries,
        db.entry_deviations,
        db.app_settings,
      ],
      async () => {
        if (opts.replaceAll) {
          await db.daily_entries.clear();
          await db.entry_deviations.clear();
        }
        if (d.users) {
          // Não sobrescreve pin_hash '***' (sanitizado em backup de líder).
          // Mantém o pin atual do usuário local se existir.
          for (const u of d.users) {
            if (u.pin_hash === '***') {
              const cur = await db.users.get(u.id);
              if (cur) {
                await db.users.put({ ...u, pin_hash: cur.pin_hash });
              }
              // Se não existe localmente, ignora — não é possível logar sem hash.
              continue;
            }
            await db.users.put(u);
          }
        }
        if (d.leaders) await db.leaders.bulkPut(d.leaders);
        if (d.locations) await db.locations.bulkPut(d.locations);
        if (d.operation_standards) await db.operation_standards.bulkPut(d.operation_standards);
        if (d.deviation_types) await db.deviation_types.bulkPut(d.deviation_types);
        if (d.daily_entries) await db.daily_entries.bulkPut(d.daily_entries);
        if (d.entry_deviations) await db.entry_deviations.bulkPut(d.entry_deviations);
        if (d.app_settings) await db.app_settings.bulkPut(d.app_settings);
      },
    );

    return {
      ok: true,
      counts: {
        users: d.users?.length ?? 0,
        leaders: d.leaders?.length ?? 0,
        locations: d.locations?.length ?? 0,
        operation_standards: d.operation_standards?.length ?? 0,
        deviation_types: d.deviation_types?.length ?? 0,
        daily_entries: d.daily_entries?.length ?? 0,
        entry_deviations: d.entry_deviations?.length ?? 0,
      },
    };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? 'Falha ao restaurar.' };
  }
}

function sanitizeUser(u: User): User {
  return { ...u, pin_hash: '***' };
}
