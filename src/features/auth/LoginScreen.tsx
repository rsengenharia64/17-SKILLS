import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/database';
import { useAuthStore } from '@/store/authStore';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { Card, CardBody } from '@/components/ui/Card';
import { isValidPinFormat } from '@/lib/pin';

export function LoginScreen() {
  const nav = useNavigate();
  const login = useAuthStore(s => s.login);
  const users = useLiveQuery(
    () => db.users.filter(u => u.ativo).sortBy('nome'),
    [],
  );
  const [userId, setUserId] = useState<string>('');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (users && users.length > 0 && !userId) {
      const firstLeader = users.find(u => u.perfil === 'leader');
      setUserId((firstLeader ?? users[0]).id);
    }
  }, [users, userId]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!userId) return setError('Selecione um usuário.');
    if (!isValidPinFormat(pin)) return setError('PIN deve ter 4 a 8 dígitos.');
    setLoading(true);
    try {
      const { mustChangePin } = await login(userId, pin);
      nav(mustChangePin ? '/trocar-pin' : '/app', { replace: true });
    } catch (err: any) {
      setError(err?.message ?? 'Falha no login.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface text-white p-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <div className="mx-auto h-14 w-14 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-800 flex items-center justify-center text-white text-2xl font-bold">
            ✓
          </div>
          <h1 className="mt-3 text-xl font-semibold">
            Controle de Produtividade
          </h1>
          <p className="text-white/60 text-xs">CBSI · Local & Offline</p>
        </div>
        <Card>
          <CardBody>
            <form onSubmit={submit} className="flex flex-col gap-3">
              <Select
                label="Usuário"
                value={userId}
                onChange={e => setUserId(e.target.value)}
                required
              >
                {!users && <option>Carregando…</option>}
                {users && users.length === 0 && (
                  <option value="">Nenhum usuário cadastrado</option>
                )}
                {users?.map(u => (
                  <option key={u.id} value={u.id}>
                    {u.perfil === 'admin' ? '👤 ' : ''}
                    {u.nome}
                  </option>
                ))}
              </Select>
              <Input
                label="PIN"
                inputMode="numeric"
                maxLength={8}
                pattern="\d*"
                value={pin}
                autoFocus
                onChange={e => setPin(e.target.value.replace(/\D/g, ''))}
                placeholder="••••"
              />
              {error && (
                <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/30 rounded-md p-2">
                  {error}
                </div>
              )}
              <Button
                type="submit"
                size="lg"
                loading={loading}
                disabled={!userId || pin.length < 4}
              >
                Entrar
              </Button>
              <div className="text-[11px] text-white/50 text-center mt-1">
                PIN padrão líderes: <span className="font-mono">1234</span> ·
                Admin: <span className="font-mono">0000</span>
                <br />
                (Troca obrigatória no primeiro acesso)
              </div>
            </form>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
