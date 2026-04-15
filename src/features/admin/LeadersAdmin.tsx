import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/database';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { useAuthStore } from '@/store/authStore';
import { generateTempPin, hashPin } from '@/lib/pin';
import { slugify } from '@/lib/slug';
import { uuid } from '@/lib/uuid';
import type { Leader, User } from '@/types';

export function LeadersAdmin() {
  const session = useAuthStore(s => s.session)!;
  const resetPin = useAuthStore(s => s.resetPin);
  const users = useLiveQuery(() => db.users.toArray(), []);
  const leaders = useLiveQuery(() => db.leaders.toArray(), []);
  const [resetFor, setResetFor] = useState<User | null>(null);
  const [lastPin, setLastPin] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [newNome, setNewNome] = useState('');

  const toggleAtivo = async (user: User, leader?: Leader) => {
    const now = new Date().toISOString();
    await db.users.update(user.id, { ativo: !user.ativo, updated_at: now });
    if (leader) {
      await db.leaders.update(leader.id, { ativo: !leader.ativo, updated_at: now });
    }
  };

  const handleReset = async () => {
    if (!resetFor) return;
    const newPin = generateTempPin();
    await resetPin(resetFor.id, newPin);
    setLastPin(newPin);
  };

  const handleCreate = async () => {
    const nome = newNome.trim();
    if (!nome) return;
    const slug = slugify(nome);
    const tempPin = generateTempPin();
    const now = new Date().toISOString();
    const user: User = {
      id: uuid(),
      nome,
      slug,
      perfil: 'leader',
      pin_hash: await hashPin(tempPin, slug),
      pin_temporario: true,
      ativo: true,
      created_at: now,
      updated_at: now,
    };
    const leader: Leader = {
      id: uuid(),
      user_id: user.id,
      nome_exibicao: nome,
      equipe: 'Operacional',
      ativo: true,
      created_at: now,
      updated_at: now,
    };
    await db.transaction('rw', db.users, db.leaders, async () => {
      await db.users.add(user);
      await db.leaders.add(leader);
    });
    setLastPin(tempPin);
    setNewNome('');
    setShowNew(false);
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">
          Líderes e administradores ({users?.length ?? 0})
        </h3>
        <Button size="sm" onClick={() => setShowNew(true)}>
          + Novo líder
        </Button>
      </div>

      {lastPin && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm">
          PIN temporário gerado: <span className="font-mono font-bold">{lastPin}</span>
          <div className="text-[11px] text-white/70">Informe ao usuário — a troca será obrigatória no próximo acesso.</div>
          <Button variant="ghost" size="sm" className="mt-2" onClick={() => setLastPin(null)}>
            Ocultar
          </Button>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-surface-soft text-white/70 text-xs">
            <tr>
              <th className="text-left px-3 py-2">Nome</th>
              <th className="text-left px-3 py-2">Slug</th>
              <th className="text-left px-3 py-2">Perfil</th>
              <th className="text-left px-3 py-2">PIN</th>
              <th className="text-left px-3 py-2">Ativo</th>
              <th className="text-right px-3 py-2">Ações</th>
            </tr>
          </thead>
          <tbody>
            {users?.map(u => {
              const lead = leaders?.find(l => l.user_id === u.id);
              return (
                <tr key={u.id} className="border-t border-surface-border">
                  <td className="px-3 py-2">{u.nome}</td>
                  <td className="px-3 py-2 font-mono text-[11px]">{u.slug}</td>
                  <td className="px-3 py-2">
                    <Badge tone={u.perfil === 'admin' ? 'brand' : 'info'}>
                      {u.perfil}
                    </Badge>
                  </td>
                  <td className="px-3 py-2">
                    {u.pin_temporario ? (
                      <Badge tone="warning">temporário</Badge>
                    ) : (
                      <Badge tone="success">definido</Badge>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <Badge tone={u.ativo ? 'success' : 'neutral'}>
                      {u.ativo ? 'sim' : 'não'}
                    </Badge>
                  </td>
                  <td className="px-3 py-2 text-right flex gap-1 justify-end">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setResetFor(u)}
                    >
                      Reset PIN
                    </Button>
                    {u.id !== session.user.id && (
                      <Button
                        size="sm"
                        variant={u.ativo ? 'danger' : 'secondary'}
                        onClick={() => toggleAtivo(u, lead)}
                      >
                        {u.ativo ? 'Inativar' : 'Ativar'}
                      </Button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Modal
        open={!!resetFor}
        onClose={() => setResetFor(null)}
        title="Redefinir PIN"
        footer={
          <>
            <Button variant="outline" onClick={() => setResetFor(null)}>
              Cancelar
            </Button>
            <Button variant="danger" onClick={handleReset}>
              Gerar novo PIN temporário
            </Button>
          </>
        }
      >
        <p className="text-sm text-white/80">
          Um novo PIN temporário de 4 dígitos será gerado para <strong>{resetFor?.nome}</strong>.
          Ele será forçado a trocá-lo no próximo acesso.
        </p>
      </Modal>

      <Modal
        open={showNew}
        onClose={() => setShowNew(false)}
        title="Novo líder"
        footer={
          <>
            <Button variant="outline" onClick={() => setShowNew(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreate} disabled={!newNome.trim()}>
              Criar
            </Button>
          </>
        }
      >
        <Input
          label="Nome completo"
          value={newNome}
          onChange={e => setNewNome(e.target.value)}
          placeholder="Ex: JOÃO DA SILVA"
          autoFocus
        />
        <p className="text-[11px] text-white/60 mt-2">
          Será gerado slug, PIN temporário e registro em <code>leaders</code>.
        </p>
      </Modal>
    </div>
  );
}
