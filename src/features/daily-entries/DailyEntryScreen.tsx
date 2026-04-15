import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from './zodResolver';
import { entryFormSchema, type EntryFormValues } from './entrySchema';
import { useAuthStore } from '@/store/authStore';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/database';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { TimeInput } from './TimeInput';
import { useAutosave } from '@/hooks/useAutosave';
import {
  getEntryWithDeviations,
  softDeleteEntry,
  upsertEntry,
} from '@/db/repositories';
import { computeEntry } from '@/lib/calculations';
import { todayIso, weekLabel } from '@/lib/time';
import { Badge } from '@/components/ui/Badge';

const DRAFT_KEY = (userId: string) => `cbsi.draft.${userId}`;

export function DailyEntryScreen() {
  const nav = useNavigate();
  const { id } = useParams();
  const [sp] = useSearchParams();
  const session = useAuthStore(s => s.session);
  const user = session!.user;

  const leaders = useLiveQuery(
    async () => {
      if (user.perfil === 'admin') {
        return db.leaders.filter(l => l.ativo).sortBy('nome_exibicao');
      }
      const mine = await db.leaders.where('user_id').equals(user.id).toArray();
      return mine.filter(l => l.ativo);
    },
    [user.id, user.perfil],
  );
  const locations = useLiveQuery(
    () => db.locations.filter(l => l.ativo).sortBy('nome'),
    [],
  );
  const deviationTypes = useLiveQuery(
    () => db.deviation_types.filter(d => d.ativo).sortBy('codigo'),
    [],
  );
  const standards = useLiveQuery(
    () => db.operation_standards.filter(s => s.ativo).sortBy('nome'),
    [],
  );

  const defaultLeaderId = useMemo(() => {
    if (!leaders || leaders.length === 0) return '';
    return leaders[0].id;
  }, [leaders]);

  const {
    control,
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<EntryFormValues>({
    resolver: zodResolver(entryFormSchema),
    defaultValues: {
      leader_id: '',
      data: sp.get('data') ?? todayIso(),
      turno: 'Dia',
      local_id: null,
      efetivo: 0,
      dss_canteiro: '',
      chegada_frente_trabalho: '',
      abertura_pts: '',
      inicio_atividade: '',
      almoco_janta_ida: '',
      reinicio_atividade: '',
      termino_atividade: '',
      observacoes: '',
      deviations: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'deviations',
  });

  const [loadedOnce, setLoadedOnce] = useState(false);

  // Carrega registro existente (edição).
  useEffect(() => {
    if (!id) return;
    (async () => {
      const res = await getEntryWithDeviations(id, user);
      if (!res) return;
      const { entry, deviations } = res;
      reset({
        id: entry.id,
        leader_id: entry.leader_id,
        data: entry.data,
        turno: entry.turno,
        local_id: entry.local_id,
        efetivo: entry.efetivo,
        dss_canteiro: entry.dss_canteiro,
        chegada_frente_trabalho: entry.chegada_frente_trabalho,
        abertura_pts: entry.abertura_pts,
        inicio_atividade: entry.inicio_atividade,
        almoco_janta_ida: entry.almoco_janta_ida,
        reinicio_atividade: entry.reinicio_atividade,
        termino_atividade: entry.termino_atividade,
        observacoes: entry.observacoes,
        deviations: deviations.map(d => ({
          id: d.id,
          sequencia: d.sequencia,
          horas: d.horas,
          deviation_type_id: d.deviation_type_id,
          observacao: d.observacao ?? '',
        })),
      });
      setLoadedOnce(true);
    })();
  }, [id, user, reset]);

  // Define líder default para criar novo.
  useEffect(() => {
    if (id) return;
    if (!defaultLeaderId) return;
    setValue('leader_id', defaultLeaderId);
    setLoadedOnce(true);
  }, [defaultLeaderId, id, setValue]);

  // Carrega rascunho (novo registro, líder não-admin).
  useEffect(() => {
    if (id) return;
    if (!loadedOnce) return;
    const raw = localStorage.getItem(DRAFT_KEY(user.id));
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as EntryFormValues;
        reset(parsed);
      } catch {
        /* ignore */
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadedOnce]);

  const values = watch();
  const computed = computeEntry(values, values.deviations ?? []);

  // Autosave do rascunho em localStorage (não gera registro oficial).
  useAutosave(
    values,
    v => {
      if (id) return; // em edição já persiste via submit
      localStorage.setItem(DRAFT_KEY(user.id), JSON.stringify(v));
    },
    { delay: 600, enabled: !id && loadedOnce },
  );

  // Autosave real no IndexedDB em edição.
  useAutosave(
    values,
    async v => {
      if (!id) return;
      if (!v.leader_id) return;
      await upsertEntry(
        {
          id,
          leader_id: v.leader_id,
          data: v.data,
          turno: v.turno,
          local_id: v.local_id,
          efetivo: Number(v.efetivo) || 0,
          dss_canteiro: v.dss_canteiro,
          chegada_frente_trabalho: v.chegada_frente_trabalho,
          abertura_pts: v.abertura_pts,
          inicio_atividade: v.inicio_atividade,
          almoco_janta_ida: v.almoco_janta_ida,
          reinicio_atividade: v.reinicio_atividade,
          termino_atividade: v.termino_atividade,
          observacoes: v.observacoes,
          deviations: (v.deviations ?? []).map((d, idx) => ({
            id: d.id,
            sequencia: idx + 1,
            horas: d.horas,
            deviation_type_id: d.deviation_type_id,
            observacao: d.observacao,
          })),
        },
        user,
      );
    },
    { delay: 900, enabled: !!id && loadedOnce },
  );

  const onSubmit = handleSubmit(async v => {
    if (!v.leader_id) return;
    const saved = await upsertEntry(
      {
        id: v.id,
        leader_id: v.leader_id,
        data: v.data,
        turno: v.turno,
        local_id: v.local_id,
        efetivo: Number(v.efetivo) || 0,
        dss_canteiro: v.dss_canteiro,
        chegada_frente_trabalho: v.chegada_frente_trabalho,
        abertura_pts: v.abertura_pts,
        inicio_atividade: v.inicio_atividade,
        almoco_janta_ida: v.almoco_janta_ida,
        reinicio_atividade: v.reinicio_atividade,
        termino_atividade: v.termino_atividade,
        observacoes: v.observacoes,
        deviations: (v.deviations ?? []).map((d, idx) => ({
          id: d.id,
          sequencia: idx + 1,
          horas: d.horas,
          deviation_type_id: d.deviation_type_id,
          observacao: d.observacao,
        })),
      },
      user,
    );
    localStorage.removeItem(DRAFT_KEY(user.id));
    nav(`/app/historico?foco=${saved.id}`);
  });

  const applyStandard = (standardId: string) => {
    const s = standards?.find(x => x.id === standardId);
    if (!s) return;
    setValue('dss_canteiro', s.dss_canteiro);
    setValue('chegada_frente_trabalho', s.chegada_frente_trabalho);
    setValue('abertura_pts', s.abertura_pts);
    setValue('inicio_atividade', s.inicio_atividade);
    setValue('almoco_janta_ida', s.almoco_janta_ida);
    setValue('reinicio_atividade', s.reinicio_atividade);
    setValue('termino_atividade', s.termino_atividade);
    setValue('turno', s.turno);
  };

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4 max-w-3xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">
            {id ? 'Editar lançamento' : 'Novo lançamento'}
          </h2>
          <p className="text-xs text-white/60">
            Semana {weekLabel(values.data)} · Autosave ativo
          </p>
        </div>
        <div className="flex items-center gap-2">
          {computed.inconsistente && (
            <Badge tone="danger">⚠ desvios &gt; jornada</Badge>
          )}
          <Badge tone="brand">
            {computed.percentual_produtivo}% produtivo
          </Badge>
        </div>
      </div>

      <Card>
        <CardHeader title="Identificação" />
        <CardBody className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Controller
            control={control}
            name="leader_id"
            render={({ field }) => (
              <Select
                label="Líder"
                value={field.value}
                onChange={field.onChange}
                disabled={user.perfil !== 'admin' && !!id}
                error={errors.leader_id?.message}
              >
                {leaders?.map(l => (
                  <option key={l.id} value={l.id}>
                    {l.nome_exibicao}
                  </option>
                ))}
              </Select>
            )}
          />
          <Input
            type="date"
            label="Data"
            {...register('data')}
            error={errors.data?.message}
          />
          <Controller
            control={control}
            name="turno"
            render={({ field }) => (
              <Select
                label="Turno"
                value={field.value}
                onChange={field.onChange}
              >
                <option value="Dia">Dia</option>
                <option value="Noite">Noite</option>
              </Select>
            )}
          />
          <Controller
            control={control}
            name="local_id"
            render={({ field }) => (
              <Select
                label="Local"
                value={field.value ?? ''}
                onChange={e =>
                  field.onChange(e.target.value === '' ? null : e.target.value)
                }
              >
                <option value="">—</option>
                {locations?.map(l => (
                  <option key={l.id} value={l.id}>
                    {l.nome}
                  </option>
                ))}
              </Select>
            )}
          />
          <Input
            type="number"
            label="Efetivo"
            min={0}
            {...register('efetivo', { valueAsNumber: true })}
          />
          <Select
            label="Aplicar padrão"
            defaultValue=""
            onChange={e => {
              if (e.target.value) applyStandard(e.target.value);
              e.target.value = '';
            }}
          >
            <option value="">— escolher um padrão —</option>
            {standards?.map(s => (
              <option key={s.id} value={s.id}>
                {s.nome}
              </option>
            ))}
          </Select>
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="Horários operacionais"
          subtitle="Marque os horários realizados no dia"
        />
        <CardBody className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <Controller
            control={control}
            name="dss_canteiro"
            render={({ field }) => (
              <TimeInput
                label="DSS canteiro"
                value={field.value ?? ''}
                onChange={field.onChange}
              />
            )}
          />
          <Controller
            control={control}
            name="chegada_frente_trabalho"
            render={({ field }) => (
              <TimeInput
                label="Chegada frente"
                value={field.value ?? ''}
                onChange={field.onChange}
              />
            )}
          />
          <Controller
            control={control}
            name="abertura_pts"
            render={({ field }) => (
              <TimeInput
                label="Abertura PTS"
                value={field.value ?? ''}
                onChange={field.onChange}
              />
            )}
          />
          <Controller
            control={control}
            name="inicio_atividade"
            render={({ field }) => (
              <TimeInput
                label="Início atividade"
                value={field.value ?? ''}
                onChange={field.onChange}
              />
            )}
          />
          <Controller
            control={control}
            name="almoco_janta_ida"
            render={({ field }) => (
              <TimeInput
                label="Almoço / Janta (ida)"
                value={field.value ?? ''}
                onChange={field.onChange}
              />
            )}
          />
          <Controller
            control={control}
            name="reinicio_atividade"
            render={({ field }) => (
              <TimeInput
                label="Reinício"
                value={field.value ?? ''}
                onChange={field.onChange}
              />
            )}
          />
          <Controller
            control={control}
            name="termino_atividade"
            render={({ field }) => (
              <TimeInput
                label="Término"
                value={field.value ?? ''}
                onChange={field.onChange}
              />
            )}
          />
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-white/70">
              Carga horária trabalhada
            </span>
            <div className="h-11 rounded-lg bg-surface-soft border border-surface-border px-3 flex items-center text-sm font-mono">
              {computed.carga_horaria_trabalhada}
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-white/70">
              Desvio total
            </span>
            <div className="h-11 rounded-lg bg-surface-soft border border-surface-border px-3 flex items-center text-sm font-mono">
              {computed.desvio_total}
            </div>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="Desvios"
          subtitle={`${fields.length}/10 · soma ${computed.desvio_total}`}
          right={
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={fields.length >= 10}
              onClick={() =>
                append({
                  sequencia: fields.length + 1,
                  horas: '',
                  deviation_type_id: null,
                  observacao: '',
                })
              }
            >
              + Adicionar
            </Button>
          }
        />
        <CardBody className="flex flex-col gap-3">
          {fields.length === 0 && (
            <p className="text-xs text-white/50">
              Nenhum desvio adicionado. Use o botão acima para registrar até 10.
            </p>
          )}
          {fields.map((f, idx) => (
            <div
              key={f.id}
              className="grid grid-cols-12 gap-2 items-end border border-surface-border rounded-lg p-2"
            >
              <div className="col-span-1 text-xs text-white/60 pb-3 text-center">
                #{idx + 1}
              </div>
              <div className="col-span-4">
                <Controller
                  control={control}
                  name={`deviations.${idx}.horas`}
                  render={({ field }) => (
                    <TimeInput
                      label="Horas"
                      value={field.value ?? ''}
                      onChange={field.onChange}
                    />
                  )}
                />
              </div>
              <div className="col-span-5">
                <Controller
                  control={control}
                  name={`deviations.${idx}.deviation_type_id`}
                  render={({ field }) => (
                    <Select
                      label="Tipo"
                      value={field.value ?? ''}
                      onChange={e =>
                        field.onChange(
                          e.target.value === '' ? null : e.target.value,
                        )
                      }
                    >
                      <option value="">—</option>
                      {deviationTypes?.map(dt => (
                        <option key={dt.id} value={dt.id}>
                          {dt.codigo} · {dt.nome}
                        </option>
                      ))}
                    </Select>
                  )}
                />
              </div>
              <div className="col-span-2 pb-0.5">
                <Button
                  type="button"
                  size="sm"
                  variant="danger"
                  className="w-full"
                  onClick={() => remove(idx)}
                >
                  Remover
                </Button>
              </div>
              <div className="col-span-12">
                <Input
                  label="Observação"
                  {...register(`deviations.${idx}.observacao` as const)}
                  placeholder="Opcional"
                />
              </div>
            </div>
          ))}
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Observações gerais" />
        <CardBody>
          <textarea
            {...register('observacoes')}
            rows={3}
            className="w-full rounded-lg bg-surface-soft border border-surface-border px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-brand-500"
            placeholder="Comentários operacionais do dia"
          />
        </CardBody>
      </Card>

      <div className="flex flex-col sm:flex-row gap-2 justify-end">
        {id && user && (
          <Button
            type="button"
            variant="danger"
            onClick={async () => {
              if (!confirm('Remover este lançamento?')) return;
              await softDeleteEntry(id, user);
              nav('/app/historico', { replace: true });
            }}
          >
            Excluir
          </Button>
        )}
        <Button type="button" variant="outline" onClick={() => nav(-1)}>
          Cancelar
        </Button>
        <Button type="submit">
          {id ? 'Salvar alterações' : 'Salvar lançamento'}
        </Button>
      </div>
    </form>
  );
}
