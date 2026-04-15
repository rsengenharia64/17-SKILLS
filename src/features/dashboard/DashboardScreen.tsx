import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Input } from '@/components/ui/Input';
import { EmptyState } from '@/components/ui/EmptyState';
import { useAuthStore } from '@/store/authStore';
import { useDashboardData, type DashboardFilters } from './useDashboardData';
import { parseHMToMinutes } from '@/lib/time';

const COLORS = [
  '#10b981',
  '#6366f1',
  '#f59e0b',
  '#ef4444',
  '#06b6d4',
  '#a855f7',
  '#f43f5e',
  '#22c55e',
  '#eab308',
  '#0ea5e9',
];

export function DashboardScreen() {
  const user = useAuthStore(s => s.session!.user);
  const [filters, setFilters] = useState<DashboardFilters>({});
  const data = useDashboardData(user, filters);

  if (!data) {
    return (
      <div className="text-sm text-white/60">Carregando dashboard…</div>
    );
  }

  const { entries, deviations, leaders, locations, deviationTypes, kpis } = data;

  // Série: produtividade por líder
  const perLeader = leaders
    .map(l => {
      const es = entries.filter(e => e.leader_id === l.id);
      const avg =
        es.length === 0
          ? 0
          : Math.round(
              (es.reduce((a, e) => a + e.percentual_produtivo, 0) / es.length) *
                10,
            ) / 10;
      const prodMin = es.reduce(
        (a, e) => a + parseHMToMinutes(e.carga_horaria_trabalhada),
        0,
      );
      const desvioMin = es.reduce(
        (a, e) => a + parseHMToMinutes(e.desvio_total),
        0,
      );
      return {
        leader: l.nome_exibicao.split(' ')[0],
        pct: avg,
        prod: Math.round((prodMin / 60) * 10) / 10,
        desvio: Math.round((desvioMin / 60) * 10) / 10,
      };
    })
    .filter(r => r.pct > 0 || r.prod > 0);

  // Evolução diária
  const byDay = new Map<string, { prod: number; desvio: number; n: number }>();
  for (const e of entries) {
    const p = byDay.get(e.data) ?? { prod: 0, desvio: 0, n: 0 };
    p.prod += parseHMToMinutes(e.carga_horaria_trabalhada);
    p.desvio += parseHMToMinutes(e.desvio_total);
    p.n += 1;
    byDay.set(e.data, p);
  }
  const evolDia = Array.from(byDay.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([data, v]) => ({
      data: data.slice(5),
      prod: Math.round((v.prod / 60) * 10) / 10,
      desvio: Math.round((v.desvio / 60) * 10) / 10,
    }));

  // Distribuição por tipo de desvio
  const porTipo = new Map<string, number>();
  for (const d of deviations) {
    if (!d.deviation_type_id) continue;
    porTipo.set(
      d.deviation_type_id,
      (porTipo.get(d.deviation_type_id) ?? 0) + parseHMToMinutes(d.horas),
    );
  }
  const pieTipo = Array.from(porTipo.entries())
    .map(([id, min]) => {
      const t = deviationTypes.find(x => x.id === id);
      return {
        name: t ? `${t.codigo} - ${t.nome}` : '—',
        value: Math.round((min / 60) * 10) / 10,
      };
    })
    .filter(r => r.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);

  // Por local
  const porLocal = locations
    .map(l => {
      const es = entries.filter(e => e.local_id === l.id);
      const prodMin = es.reduce(
        (a, e) => a + parseHMToMinutes(e.carga_horaria_trabalhada),
        0,
      );
      const desvioMin = es.reduce(
        (a, e) => a + parseHMToMinutes(e.desvio_total),
        0,
      );
      return {
        local: l.nome,
        prod: Math.round((prodMin / 60) * 10) / 10,
        desvio: Math.round((desvioMin / 60) * 10) / 10,
      };
    })
    .filter(r => r.prod > 0 || r.desvio > 0);

  return (
    <div className="flex flex-col gap-4">
      {/* Filtros */}
      <Card>
        <CardBody className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          <Input
            type="date"
            label="De"
            value={filters.from ?? ''}
            onChange={e =>
              setFilters(f => ({ ...f, from: e.target.value || undefined }))
            }
          />
          <Input
            type="date"
            label="Até"
            value={filters.to ?? ''}
            onChange={e =>
              setFilters(f => ({ ...f, to: e.target.value || undefined }))
            }
          />
          {user.perfil === 'admin' && (
            <Select
              label="Líder"
              value={filters.leaderId ?? ''}
              onChange={e =>
                setFilters(f => ({
                  ...f,
                  leaderId: e.target.value || undefined,
                }))
              }
            >
              <option value="">Todos</option>
              {leaders.map(l => (
                <option key={l.id} value={l.id}>
                  {l.nome_exibicao}
                </option>
              ))}
            </Select>
          )}
          <Select
            label="Local"
            value={filters.locationId ?? ''}
            onChange={e =>
              setFilters(f => ({
                ...f,
                locationId: e.target.value || undefined,
              }))
            }
          >
            <option value="">Todos</option>
            {locations.map(l => (
              <option key={l.id} value={l.id}>
                {l.nome}
              </option>
            ))}
          </Select>
          <Select
            label="Turno"
            value={filters.turno ?? ''}
            onChange={e =>
              setFilters(f => ({
                ...f,
                turno: (e.target.value as any) || undefined,
              }))
            }
          >
            <option value="">Todos</option>
            <option value="Dia">Dia</option>
            <option value="Noite">Noite</option>
          </Select>
        </CardBody>
      </Card>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Kpi label="Lançamentos" value={kpis.totalEntries} />
        <Kpi
          label="Horas produtivas"
          value={`${kpis.horasProdutivas}h`}
          tone="success"
        />
        <Kpi
          label="Horas desviadas"
          value={`${kpis.horasDesviadas}h`}
          tone="warn"
        />
        <Kpi
          label="Produtividade média"
          value={`${kpis.mediaProdutividade}%`}
          tone="brand"
        />
        <Kpi
          label="Melhor líder"
          value={kpis.melhorLider?.nome ?? '—'}
          hint={kpis.melhorLider ? `${kpis.melhorLider.pct}%` : undefined}
        />
        <Kpi
          label="Local com mais desvio"
          value={kpis.localMaisDesvio?.nome ?? '—'}
          hint={
            kpis.localMaisDesvio
              ? `${(kpis.localMaisDesvio.min / 60).toFixed(1)}h`
              : undefined
          }
        />
        <Kpi
          label="Desvio recorrente"
          value={
            kpis.desvioRecorrente
              ? `${kpis.desvioRecorrente.codigo}`
              : '—'
          }
          hint={kpis.desvioRecorrente?.nome}
        />
        <div className="flex">
          <Link to="/app/lancamento" className="flex-1">
            <Button className="w-full h-full min-h-[88px]" variant="primary">
              + Novo lançamento
            </Button>
          </Link>
        </div>
      </div>

      {entries.length === 0 && (
        <Card>
          <CardBody>
            <EmptyState
              icon="📭"
              title="Sem lançamentos no período"
              description="Crie um novo lançamento para alimentar os gráficos."
              action={
                <Link to="/app/lancamento">
                  <Button>Novo lançamento</Button>
                </Link>
              }
            />
          </CardBody>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader title="Produtividade por líder (%)" />
          <CardBody className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={perLeader}>
                <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" />
                <XAxis dataKey="leader" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={11} />
                <Tooltip
                  contentStyle={{
                    background: '#0f172a',
                    border: '1px solid #1e293b',
                    borderRadius: 8,
                  }}
                />
                <Bar dataKey="pct" fill="#10b981" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Evolução diária (horas)" />
          <CardBody className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={evolDia}>
                <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" />
                <XAxis dataKey="data" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={11} />
                <Tooltip
                  contentStyle={{
                    background: '#0f172a',
                    border: '1px solid #1e293b',
                    borderRadius: 8,
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line
                  type="monotone"
                  dataKey="prod"
                  stroke="#10b981"
                  name="Produtivas"
                  strokeWidth={2}
                />
                <Line
                  type="monotone"
                  dataKey="desvio"
                  stroke="#ef4444"
                  name="Desviadas"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Distribuição por tipo de desvio (horas)" />
          <CardBody className="h-72">
            {pieTipo.length === 0 ? (
              <EmptyState title="Sem desvios no período" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieTipo}
                    dataKey="value"
                    nameKey="name"
                    outerRadius={90}
                    innerRadius={40}
                    paddingAngle={2}
                  >
                    {pieTipo.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: '#0f172a',
                      border: '1px solid #1e293b',
                      borderRadius: 8,
                    }}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: 11 }}
                    verticalAlign="bottom"
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Produtivo x Improdutivo por local (horas)" />
          <CardBody className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={porLocal}>
                <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" />
                <XAxis dataKey="local" stroke="#94a3b8" fontSize={10} />
                <YAxis stroke="#94a3b8" fontSize={11} />
                <Tooltip
                  contentStyle={{
                    background: '#0f172a',
                    border: '1px solid #1e293b',
                    borderRadius: 8,
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar
                  dataKey="prod"
                  stackId="a"
                  fill="#10b981"
                  name="Produtivo"
                />
                <Bar
                  dataKey="desvio"
                  stackId="a"
                  fill="#ef4444"
                  name="Desvios"
                />
              </BarChart>
            </ResponsiveContainer>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

function Kpi({
  label,
  value,
  hint,
  tone = 'neutral',
}: {
  label: string;
  value: string | number;
  hint?: string;
  tone?: 'neutral' | 'success' | 'warn' | 'brand';
}) {
  const toneColor =
    tone === 'success'
      ? 'text-emerald-300'
      : tone === 'warn'
        ? 'text-amber-300'
        : tone === 'brand'
          ? 'text-brand-300'
          : 'text-white';
  return (
    <Card>
      <CardBody>
        <div className="text-[11px] uppercase tracking-wide text-white/50">
          {label}
        </div>
        <div className={`mt-1 text-xl font-semibold ${toneColor} truncate`}>
          {value}
        </div>
        {hint && <div className="text-[11px] text-white/50 mt-0.5">{hint}</div>}
      </CardBody>
    </Card>
  );
}
