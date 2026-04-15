import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { db } from '@/db/database';
import { hashPin, verifyPin } from '@/lib/pin';
import type { Leader, SessionData, User } from '@/types';

const IDLE_MS = 15 * 60 * 1000; // 15 minutos

interface AuthState {
  session: SessionData | null;
  loading: boolean;
  error: string | null;
  lastActivity: number | null;

  login: (userId: string, pin: string) => Promise<{ mustChangePin: boolean }>;
  logout: () => void;
  changePin: (currentPin: string, newPin: string) => Promise<void>;
  resetPin: (targetUserId: string, newTempPin: string) => Promise<void>;
  touchActivity: () => void;
  isIdle: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      session: null,
      loading: false,
      error: null,
      lastActivity: null,

      async login(userId, pin) {
        set({ loading: true, error: null });
        try {
          const user = await db.users.get(userId);
          if (!user || !user.ativo) {
            throw new Error('Usuário não encontrado ou inativo.');
          }
          const ok = await verifyPin(pin, user.slug, user.pin_hash);
          if (!ok) {
            throw new Error('PIN incorreto.');
          }
          let leader: Leader | null = null;
          if (user.perfil === 'leader') {
            leader =
              (await db.leaders.where('user_id').equals(user.id).first()) ??
              null;
            if (!leader || !leader.ativo) {
              throw new Error('Líder não encontrado ou inativo.');
            }
          }
          const sess: SessionData = {
            user,
            leader,
            loggedInAt: new Date().toISOString(),
          };
          await db.users.update(user.id, {
            ultimo_login_at: sess.loggedInAt,
            updated_at: sess.loggedInAt,
          });
          set({
            session: sess,
            lastActivity: Date.now(),
            loading: false,
            error: null,
          });
          return { mustChangePin: !!user.pin_temporario };
        } catch (e: any) {
          set({ loading: false, error: e?.message ?? 'Falha no login.' });
          throw e;
        }
      },

      logout() {
        set({ session: null, lastActivity: null, error: null });
      },

      async changePin(currentPin, newPin) {
        const s = get().session;
        if (!s) throw new Error('Sem sessão ativa.');
        const user = await db.users.get(s.user.id);
        if (!user) throw new Error('Usuário não encontrado.');
        const ok = await verifyPin(currentPin, user.slug, user.pin_hash);
        if (!ok) throw new Error('PIN atual incorreto.');
        const newHash = await hashPin(newPin, user.slug);
        await db.users.update(user.id, {
          pin_hash: newHash,
          pin_temporario: false,
          updated_at: new Date().toISOString(),
        });
        const updated = await db.users.get(user.id);
        if (updated) {
          set({
            session: { ...s, user: updated },
          });
        }
      },

      async resetPin(targetUserId, newTempPin) {
        const s = get().session;
        if (!s || s.user.perfil !== 'admin') {
          throw new Error('Apenas administrador pode redefinir PIN.');
        }
        const target = await db.users.get(targetUserId);
        if (!target) throw new Error('Usuário não encontrado.');
        const newHash = await hashPin(newTempPin, target.slug);
        await db.users.update(target.id, {
          pin_hash: newHash,
          pin_temporario: true,
          updated_at: new Date().toISOString(),
        });
      },

      touchActivity() {
        if (get().session) {
          set({ lastActivity: Date.now() });
        }
      },

      isIdle() {
        const la = get().lastActivity;
        if (!la) return false;
        return Date.now() - la > IDLE_MS;
      },
    }),
    {
      name: 'cbsi.auth',
      storage: createJSONStorage(() => sessionStorage),
      partialize: state => ({
        // Mantém apenas info leve em sessionStorage; o usuário completo é
        // recarregado do banco local ao retomar.
        session: state.session,
        lastActivity: state.lastActivity,
      }),
    },
  ),
);
