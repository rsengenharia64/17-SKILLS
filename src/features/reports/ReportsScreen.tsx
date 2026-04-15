import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/database';
import { useAuthStore } from '@/store/authStore';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { downloadText, entriesToCsv } from '@/services/exportService';
import { generateReportPdf } from '@/services/pdfService';
import type { DailyEntry, EntryDeviation } from '@/types';
import { parseHMToMinutes } from '@/lib/time';

type Agrupador = 'dia' | 'semana' | 'mes' | 'lider' | 'local' | 'turno' | 'tipo';

export function ReportsScreen() {
  const user = useAuthStore(s => s.session!.user);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [leaderId, setLeaderId] = useState('');
  const [locationId, setLocationId] = useState('');
  const [turno, setTurno] = useState('');
  const [groupBy, setGroupBy] = useState<Agrupador>('dia');

  const leaders = useLiveQuery(() => db.leaders.toArray(), []);
  const locations = useLiveQuery(() => db.locations.toArray(), []);
  const devTypes = useLiveQuery(() => db.deviation_types.toArray(), []);

  const entries = useLiveQuery(async () => {
    let arr = await db.daily_entries.toArray();
    arr = arr.filter(e => !e.deleted_at);
    if (user.perfil !== 'admin') arr = arr.filter(e => e.owner_user_id === user.id);
    if (from) arr = arr.filter(e => e.data >= from);
    if (to) arr = arr.filter(e => e.data <= to);
    if (leaderId) arr = arr.filter(e => e.leader_id === leaderId);
    if (locationId) arr = arr.filter(e => e.local_id === locationId);
    if (turno) arr = arr.filter(e => e.turno === turno);
    return arr;
  }, [user.id, user.perfil, from, to, leaderId, locationId, turno]);

  const deviations = useLiveQuery(async () => {
    if (!entries || entries.length === 0) return [] as EntryDeviation[];
    return db.entry_deviations
      .where('daily_entry_id')
      .anyOf(entries.map(e => e.id))
      .toArray();
  }, [entries]);

  const grouped = groupRows(entries ?? [], deviations ?? [], groupBy, {
    leaders: leaders ?? [],
    locations: locations ?? [],
    deviationTypes: devTypes ?? [],
  });

  const onCsv = () => {
    if (!entries || !deviations || !leaders || !locations || !devTypes) return;
    const csv = entriesToCsv(entries, deviations, leaders, locations, devTypes);
    downloadText(
      csv,
      `cbsi-lancamentos-${new Date().toISOString().slice(0, 10)}.csv`,
      'text/csv;charset=utf-8',
    );
  };
  const onJson = () => {
    if (!entries || !deviations) return;
    downloadText(
      JSON.stringify({ entries, deviations }, null, 2),
      `cbsi-lancamentos-${new Date().toISOString().slice(0, 10)}.json`,
      'application/json',
    );
  };
  const onPdf = () => {
    if (!entries || !deviations || !leaders || !locations || !devTypes) return;
    const doc = generateReportPdf({
      entries,
      deviations,
      leaders,
      locations,
      deviationTypes: devTypes,
      title: 'Relatório de Produtividade',
      subtitle: `Período ${from || '—'} até ${to || '—'} · ${entries.length} registros`,
    });
    doc.save(`cbsi-relatorio-${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardBody className="grid grid-cols-2 sm:grid-cols-6 gap-2">
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
          <Select label="Local" value={locationId} onChange={e => setLocationId(e.target.value)}>
            <option value="">Todos</option>
            {locations?.map(l => (
              <option key={l.id} value={l.id}>{l.nome}</option>
            ))}
          </Select>
          <Select label="Turno" value={turno} onChange={e => setTurno(e.target.value)}>
            <option value="">Todos</option>
            <option value="Dia">Dia</option>
            <option value="Noite">Noite</option>
          </Select>
          <Select label="Agrupar por" value={groupBy} onChange={e => setGroupBy(e.target.value as Agrupador)}>
            <option value="dia">Dia</option>
            <option value="semana">Semana</option>
            <option value="mes">Mês</option>
            <option value="lider">Líder</option>
            <option value="local">Local</option>
            <option value="turno">Turno</option>
            <option value="tipo">Tipo de desvio</option>
          </Select>
        </CardBody>
      </Card>

      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" onClick={onCsv}>⬇ CSV</Button>
        <Button variant="secondary" onClick={onJson}>⬇ JSON</Button>
        <Button variant="primary" onClick={onPdf}>⬇ PDF</Button>
      </div>

      <Card>
        <CardHeader
          title="Consolidado"
          subtitle={`${entries?.length ?? 0} registros · agrupado por ${groupBy}`}
        />
        <CardBody className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface-soft text-white/70 text-xs">
                <tr>
                  <th className="text-left px-3 py-2">Grupo</th>
                  <th className="text-right px-3 py-2">Registros</th>
                  <th className="text-right px-3 py-2">Horas trab.</th>
                  <th className="text-right px-3 py-2">Desvio</th>
                  <th className="text-right px-3 py-2">% Prod médio</th>
                </tr>
              </thead>
              <tbody>
                {grouped.map(g => (
                  <tr key={g.key} className="border-t border-surface-border">
                    <td className="px-3 py-2">{g.label}</td>
                    <td className="px-3 py-2 text-right">{g.count}</td>
                    <td className="px-3 py-2 text-right font-mono">{g.trabHoras}h</td>
                    <td className="px-3 py-2 text-right font-mono">{g.desvioHoras}h</td>
                    <td className="px-3 py-2 text-right">{g.pct}%</td>
                  </tr>
                ))}
                {grouped.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-3 py-6 text-center text-white/50 text-sm">
                      Sem dados para o filtro atual.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

interface GroupRow {
  key: string;
  label: string;
  count: number;
  trabHoras: number;
  desvioHoras: number;
  pct: number;
}

function groupRows(
  entries: DailyEntry[],
  deviations: EntryDeviation[],
  groupBy: Agrupador,
  helpers: {
    leaders: Array<{ id: string; nome_exibicao: string }>;
    locations: Array<{ id: string; nome: string }>;
    deviationTypes: Array<{ id: string; codigo: string; nome: string }>;
  },
): GroupRow[] {
  const map = new Map<string, GroupRow>();

  const addRow = (key: string, label: string) => {
    if (!map.has(key)) {
      map.set(key, { key, label, count: 0, trabHoras: 0, desvioHoras: 0, pct: 0 });
    }
    return map.get(key)!;
  };

  if (groupBy === 'tipo') {
    for (const d of deviations) {
      const t = helpers.deviationTypes.find(x => x.id === d.deviation_type_id);
      const label = t ? `${t.codigo} · ${t.nome}` : 'Sem tipo';
      const key = t?.id ?? 'none';
      const row = addRow(key, label);
      row.count += 1;
      row.desvioHoras += parseHMToMinutes(d.horas) / 60;
    }
    return Array.from(map.values())
      .map(r => ({ ...r, desvioHoras: round1(r.desvioHoras) }))
      .sort((a, b) => b.desvioHoras - a.desvioHoras);
  }

  for (const e of entries) {
    let key = '';
    let label = '';
    if (groupBy === 'dia') { key = e.data; label = e.data; }
    else if (groupBy === 'semana') { key = e.semana; label = e.semana; }
    else if (groupBy === 'mes') { key = e.data.slice(0, 7); label = key; }
    else if (groupBy === 'lider') {
      key = e.leader_id;
      label = helpers.leaders.find(x => x.id === e.leader_id)?.nome_exibicao ?? '—';
    }
    else if (groupBy === 'local') {
      key = e.local_id ?? 'none';
      label = helpers.locations.find(x => x.id === e.local_id)?.nome ?? '—';
    }
    else if (groupBy === 'turno') { key = e.turno; label = e.turno; }
    const row = addRow(key, label);
    row.count += 1;
    row.trabHoras += parseHMToMinutes(e.carga_horaria_trabalhada) / 60;
    row.desvioHoras += parseHMToMinutes(e.desvio_total) / 60;
    row.pct += e.percentual_produtivo;
  }
  return Array.from(map.values())
    .map(r => ({
      ...r,
      trabHoras: round1(r.trabHoras),
      desvioHoras: round1(r.desvioHoras),
      pct: r.count > 0 ? Math.round((r.pct / r.count) * 10) / 10 : 0,
    }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
