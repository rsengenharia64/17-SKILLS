import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { Card, CardBody } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { isValidPinFormat } from '@/lib/pin';

/** PINs considerados fracos (sequência/repetição). */
const WEAK_PINS = new Set([
  '0000', '1111', '2222', '3333', '4444', '5555', '6666', '7777', '8888', '9999',
  '1234', '2345', '3456', '4567', '5678', '6789', '0123',
  '9876', '8765', '7654', '6543', '5432', '4321', '3210',
]);

function isWeakPin(pin: string): boolean {
  if (WEAK_PINS.has(pin)) return true;
  // Repetição total
  if (/^(\d)\1+$/.test(pin)) return true;
  return false;
}

export function ChangePinScreen() {
  const nav = useNavigate();
  const session = useAuthStore(s => s.session);
  const changePin = useAuthStore(s => s.changePin);
  const logout = useAuthStore(s => s.logout);
  const [current, setCurrent] = useState('');
  const [pin1, setPin1] = useState('');
  const [pin2, setPin2] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!isValidPinFormat(current)) {
      return setError('Informe o PIN atual (4 a 8 dígitos).');
    }
    if (!isValidPinFormat(pin1)) {
      return setError('Novo PIN deve ter 4 a 8 dígitos.');
    }
    if (pin1 !== pin2) return setError('Os novos PINs não conferem.');
    if (pin1 === current) return setError('Escolha um PIN diferente do atual.');
    if (isWeakPin(pin1)) {
      return setError(
        'PIN muito simples. Evite sequências (1234) ou dígitos repetidos (1111).',
      );
    }
    setLoading(true);
    try {
      await changePin(current, pin1);
      setSuccess(true);
      setTimeout(() => nav('/app', { replace: true }), 600);
    } catch (err: any) {
      setError(err?.message ?? 'Falha ao trocar PIN.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface text-white p-4">
      <div className="w-full max-w-sm">
        <h1 className="text-lg font-semibold mb-1">Defina um novo PIN</h1>
        <p className="text-xs text-white/60 mb-4">
          {session?.user.pin_temporario
            ? 'Você está usando um PIN temporário. Crie um PIN pessoal antes de continuar.'
            : 'Atualize seu PIN de acesso.'}
        </p>
        <Card>
          <CardBody>
            <form onSubmit={submit} className="flex flex-col gap-3" autoComplete="off">
              <Input
                label="PIN atual"
                type="password"
                inputMode="numeric"
                value={current}
                onChange={e => setCurrent(e.target.value.replace(/\D/g, ''))}
                maxLength={8}
                autoFocus
              />
              <Input
                label="Novo PIN"
                type="password"
                inputMode="numeric"
                value={pin1}
                onChange={e => setPin1(e.target.value.replace(/\D/g, ''))}
                maxLength={8}
                hint="Evite sequências (1234) ou dígitos repetidos (1111)."
              />
              <Input
                label="Confirmar novo PIN"
                type="password"
                inputMode="numeric"
                value={pin2}
                onChange={e => setPin2(e.target.value.replace(/\D/g, ''))}
                maxLength={8}
              />
              {error && (
                <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/30 rounded-md p-2">
                  {error}
                </div>
              )}
              {success && (
                <div className="text-xs text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 rounded-md p-2">
                  ✓ PIN atualizado com sucesso.
                </div>
              )}
              <Button
                type="submit"
                size="lg"
                loading={loading}
                disabled={!current || !pin1 || !pin2 || success}
              >
                Atualizar PIN
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  logout();
                  nav('/login', { replace: true });
                }}
              >
                Sair sem alterar
              </Button>
            </form>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
