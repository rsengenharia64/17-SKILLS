import { db } from '@/db/database';

export interface InitialPinsBootstrap {
  admin: { user_id: string; nome: string; pin: string };
  leaders: Array<{ user_id: string; slug: string; nome: string; pin: string }>;
  generated_at: string;
}

const KEY = 'initial_pins_bootstrap';

/**
 * Lê o pacote de PINs iniciais gerado no seed. Retorna null se já foi
 * distribuído (limpo).
 */
export async function getInitialPinsBootstrap(): Promise<InitialPinsBootstrap | null> {
  const row = await db.app_settings.where('chave').equals(KEY).first();
  if (!row?.valor) return null;
  try {
    return JSON.parse(row.valor) as InitialPinsBootstrap;
  } catch {
    return null;
  }
}

/** Retorna apenas o PIN do admin (caso ainda exista, pin_temporario=true). */
export async function getAdminBootstrapPin(): Promise<{ nome: string; pin: string } | null> {
  const pack = await getInitialPinsBootstrap();
  if (!pack) return null;
  const admin = await db.users.get(pack.admin.user_id);
  if (!admin || !admin.pin_temporario) return null;
  return { nome: pack.admin.nome, pin: pack.admin.pin };
}

/** Remove os PINs iniciais da base (chamado pelo admin após distribuir). */
export async function clearInitialPinsBootstrap(): Promise<void> {
  const row = await db.app_settings.where('chave').equals(KEY).first();
  if (row?.id) await db.app_settings.delete(row.id);
}

/**
 * Remove apenas o PIN do admin do pacote (chamado após admin trocar o PIN).
 * Mantém os dos líderes até que o admin distribua a todos.
 */
export async function clearAdminBootstrapPin(): Promise<void> {
  const row = await db.app_settings.where('chave').equals(KEY).first();
  if (!row?.id || !row.valor) return;
  try {
    const parsed = JSON.parse(row.valor) as InitialPinsBootstrap;
    parsed.admin = { user_id: '', nome: '', pin: '' };
    await db.app_settings.update(row.id, {
      valor: JSON.stringify(parsed),
      updated_at: new Date().toISOString(),
    });
  } catch {
    /* ignore */
  }
}
