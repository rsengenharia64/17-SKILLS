import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { Card, CardBody } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { isValidPinFormat } from '@/lib/pin';

export function ChangePinScreen() {
  const nav = useNavigate();
  const session = useAuthStore(s => s.session);
  const changePin = useAuthStore(s => s.changePin);
  const [current, setCurrent] = useState('');
  const [pin1, setPin1] = useState('');
  const [pin2, setPin2] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!isValidPinFormat(pin1)) {
      return setError('Novo PIN deve ter 4 a 8 dígitos.');
    }
    if (pin1 !== pin2) return setError('Os novos PINs não conferem.');
    if (pin1 === current) return setError('Escolha um PIN diferente do atual.');
    setLoading(true);
    try {
      await changePin(current, pin1);
      nav('/app', { replace: true });
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
            <form onSubmit={submit} className="flex flex-col gap-3">
              <Input
                label="PIN atual"
                inputMode="numeric"
                value={current}
                onChange={e => setCurrent(e.target.value.replace(/\D/g, ''))}
                maxLength={8}
                autoFocus
              />
              <Input
                label="Novo PIN"
                inputMode="numeric"
                value={pin1}
                onChange={e => setPin1(e.target.value.replace(/\D/g, ''))}
                maxLength={8}
              />
              <Input
                label="Confirmar novo PIN"
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
              <Button type="submit" size="lg" loading={loading}>
                Atualizar PIN
              </Button>
            </form>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
