import { z } from 'zod';

/** Relógio HH:mm (00:00 – 23:59). */
const clockRe = /^([0-1]\d|2[0-3]):[0-5]\d$/;
/** Duração HH:mm (h pode ser 0..999, cobre somas de desvio que passam de 24h). */
const durationRe = /^\d{1,3}:[0-5]\d$/;

const clockHM = z
  .string()
  .refine(v => v === '' || clockRe.test(v), 'Horário inválido (HH:mm 00–23)');

const durationHM = z
  .string()
  .refine(v => v === '' || durationRe.test(v), 'Duração inválida (HH:mm)');

export const deviationSchema = z.object({
  id: z.string().optional(),
  sequencia: z.number().int().min(1).max(10),
  horas: durationHM.default(''),
  deviation_type_id: z.string().nullable().default(null),
  observacao: z.string().default(''),
});

export const entryFormSchema = z.object({
  id: z.string().optional(),
  leader_id: z.string().min(1, 'Selecione o líder'),
  data: z.string().min(1, 'Informe a data'),
  turno: z.enum(['Dia', 'Noite']),
  local_id: z.string().nullable().default(null),
  efetivo: z.coerce.number().int().min(0).max(999).default(0),
  dss_canteiro: clockHM.default(''),
  chegada_frente_trabalho: clockHM.default(''),
  abertura_pts: clockHM.default(''),
  inicio_atividade: clockHM.default(''),
  almoco_janta_ida: clockHM.default(''),
  reinicio_atividade: clockHM.default(''),
  termino_atividade: clockHM.default(''),
  observacoes: z.string().max(1000).default(''),
  deviations: z.array(deviationSchema).max(10).default([]),
});

export type EntryFormValues = z.infer<typeof entryFormSchema>;
