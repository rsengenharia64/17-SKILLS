import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/database';
import { useAuthStore } from '@/store/authStore';
import { Card, CardBody } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatBr } from '@/lib/time';

export function HistoryScreen() {
  const user = useAuthStore(s => s.session!.user);
  const [search, setSearch] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [leaderId, setLeaderId] = useState('');
  const [turno, setTurno] = useState('');

  const leaders = useLiveQuery(() => db.leaders.toArray(), []);
  const locations = useLiveQuery(() => db.locations.toArray(), []);
  const entries = useLiveQuery(async () => {
    let arr = await db.daily_entries.toArray();
    arr = arr.filter(e => !e.deleted_at);
    if (user.perfil !== 'admin') arr = arr.filter(e => e.owner_user_id === user.id);
    if (from) arr = arr.filter(e => e.data >= from);
    if (to) arr = arr.filter(e => e.data <= to);
    if (leaderId) arr = arr.filter(e => e.leader_id === leaderId);
    if (turno) arr = arr.filter(e => e.turno === turno);
    return arr.sort((a, b) => b.data.localeCompare(a.data));
  }, [user.id, user.perfil, from, to, leaderId, turno]);

  const filtered = useMemo(() => {
    if (!entries) return [];
    if (!search.trim()) return entries;
    const q = search.toLowerCase();
    return entries.filter(
      e =>
        e.observacoes?.toLowerCase().includes(q) ||
        e.semana?.toLowerCase().includes(q) ||
        e.data.includes(q),
    );
  }, [entries, search]);

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardBody className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          <Input label="Buscar" placeholder="texto livre..." value={search} onChange={e => setSearch(e.target.value)} />
          <Input type="date" label="De" value={from} onChange={e => setFrom(e.target.value)} />
          <Input type="date" label="Até" value={to} onChange={e => setTo(e.target.value)} />
          {user.perfil === 'admin' && (
            <Select label="Líder" value={leaderId} onChange={e => setLeaderId(e.target.value)}>
              <option value="">Todos</option>
              {leaders?.map(l => (
                <option key={l.id} value={l.id}>{l.nome_exibicao}</option>
              ))}
            </Select>
          )}
          <Select label="Turno" value={turno} onChange={e => setTurno(e.target.value)}>
            <option value="">Todos</option>
            <option value="Dia">Dia</option>
            <option value="Noite">Noite</option>
          </Select>
        </CardBody>
      </Card>

      <Card>
        <CardBody className="p-0">
          {!filtered || filtered.length === 0 ? (
            <EmptyState
              icon="🗂️"
              title="Sem lançamentos encontrados"
              description="Ajuste os filtros ou crie um novo registro."
              action={
                <Link to="/app/lancamento">
                  <Button>Novo lançamento</Button>
                </Link>
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-surface-soft text-white/70 text-xs">
                  <tr>
                    <th className="text-left px-3 py-2">Data</th>
                    <th className="text-left px-3 py-2">Líder</th>
                    <th className="text-left px-3 py-2">Local</th>
                    <th className="text-left px-3 py-2">Turno</th>
                    <th className="text-right px-3 py-2">Efetivo</th>
                    <th className="text-right px-3 py-2">Trabalhada</th>
                    <th className="text-right px-3 py-2">Desvio</th>
                    <th className="text-right px-3 py-2">% Prod</th>
                    <th className="text-left px-3 py-2">Status</th>
                    <th className="text-right px-3 py-2">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(e => {
                    const leader = leaders?.find(l => l.id === e.leader_id);
                    const local = locations?.find(l => l.id === e.local_id);
                    return (
                      <tr key={e.id} className="border-t border-surface-border hover:bg-white/5">
                        <td className="px-3 py-2 whitespace-nowrap">
                          <div className="font-medium">{formatBr(e.data)}</div>
                          <div className="text-[11px] text-white/50">{e.semana}</div>
                        </td>
                        <td className="px-3 py-2 truncate max-w-[180px]">{leader?.nome_exibicao ?? '—'}</td>
                        <td className="px-3 py-2">{local?.nome ?? '—'}</td>
                        <td className="px-3 py-2">{e.turno}</td>
                        <td className="px-3 py-2 text-right">{e.efetivo}</td>
                        <td className="px-3 py-2 text-right font-mono">{e.carga_horaria_trabalhada}</td>
                        <td className="px-3 py-2 text-right font-mono">{e.desvio_total}</td>
                        <td className="px-3 py-2 text-right">
                          <Badge tone={e.percentual_produtivo >= 80 ? 'success' : e.percentual_produtivo >= 50 ? 'warning' : 'danger'}>
                            {e.percentual_produtivo}%
                          </Badge>
                        </td>
                        <td className="px-3 py-2">
                          <Badge tone={e.sync_status === 'synced' ? 'success' : e.sync_status === 'pending' ? 'warning' : 'neutral'}>
                            {e.sync_status}
                          </Badge>
                        </td>
                        <td className="px-3 py-2 text-right">
                          <Link to={`/app/lancamento/${e.id}`}>
                            <Button size="sm" variant="outline">Abrir</Button>
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
