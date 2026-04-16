import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { useAuthStore } from '@/store/authStore';
import {
  countPendingSync,
  getSyncConfig,
  runSync,
  saveSyncConfig,
} from '@/services/syncService';
import { db } from '@/db/database';

export function SyncAdmin() {
  const user = useAuthStore(s => s.session!.user);
  const [endpoint, setEndpoint] = useState('');
  const [token, setToken] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const pending = useLiveQuery(() => countPendingSync(), []);
  const queueItems = useLiveQuery(
    () => db.sync_queue.orderBy('created_at').reverse().limit(20).toArray(),
    [],
  );

  useEffect(() => {
    (async () => {
      const cfg = await getSyncConfig();
      setEndpoint(cfg.endpoint ?? '');
      setToken(cfg.token ?? '');
    })();
  }, []);

  const save = async () => {
    await saveSyncConfig({ endpoint, token });
    setStatus('Configuração salva.');
  };

  const sync = async () => {
    setBusy(true);
    setStatus('Sincronizando…');
    const r = await runSync(user);
    setStatus(
      `Enviados: ${r.sent} · Falhas: ${r.failed}${r.errors.length ? ` · ${r.errors.join('; ')}` : ''}`,
    );
    setBusy(false);
  };

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h3 className="text-sm font-semibold">
          Sincronização opcional (Google Apps Script)
        </h3>
        <p className="text-xs text-white/70 mt-1">
          O sistema é 100% funcional offline. Quando houver internet, a fila
          pendente pode ser enviada para uma planilha Google via Apps Script.
          Líderes só sincronizam seus próprios registros.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <Input
          label="Endpoint Web App"
          value={endpoint}
          onChange={e => setEndpoint(e.target.value)}
          placeholder="https://script.google.com/macros/s/..../exec"
        />
        <Input
          label="Token (opcional)"
          value={token}
          onChange={e => setToken(e.target.value)}
          placeholder="segredo compartilhado"
        />
      </div>
      <div className="flex flex-wrap gap-2">
        <Button onClick={save}>Salvar configuração</Button>
        <Button variant="primary" loading={busy} onClick={sync}>
          Sincronizar agora ({pending ?? 0} pendente{(pending ?? 0) === 1 ? '' : 's'})
        </Button>
      </div>
      {status && (
        <div className="rounded-lg border border-surface-border bg-surface-soft p-2 text-xs">
          {status}
        </div>
      )}

      <div>
        <h4 className="text-xs font-semibold text-white/70 uppercase tracking-wide mb-2">
          Últimas entradas da fila
        </h4>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-surface-soft text-white/60">
              <tr>
                <th className="text-left px-3 py-2">Entidade</th>
                <th className="text-left px-3 py-2">Ação</th>
                <th className="text-left px-3 py-2">Status</th>
                <th className="text-right px-3 py-2">Tentativas</th>
                <th className="text-left px-3 py-2">Última</th>
              </tr>
            </thead>
            <tbody>
              {queueItems?.map(q => (
                <tr key={q.id} className="border-t border-surface-border">
                  <td className="px-3 py-2">{q.entity_name}</td>
                  <td className="px-3 py-2">{q.acao}</td>
                  <td className="px-3 py-2">
                    <Badge
                      tone={
                        q.status === 'done'
                          ? 'success'
                          : q.status === 'error'
                            ? 'danger'
                            : 'warning'
                      }
                    >
                      {q.status}
                    </Badge>
                  </td>
                  <td className="px-3 py-2 text-right">{q.tentativas}</td>
                  <td className="px-3 py-2 text-white/60">
                    {q.ultima_tentativa_at
                      ? new Date(q.ultima_tentativa_at).toLocaleString('pt-BR')
                      : '—'}
                  </td>
                </tr>
              ))}
              {(!queueItems || queueItems.length === 0) && (
                <tr>
                  <td colSpan={5} className="px-3 py-4 text-center text-white/50">
                    Fila vazia.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
