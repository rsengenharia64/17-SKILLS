import { z } from 'zod';
import { isValidHM } from '@/lib/time';

const hmRe = /^\d{1,3}:[0-5]\d$/;
const timeHM = z
  .string()
  .refine(v => v === '' || hmRe.test(v), 'Formato HH:mm');

export const deviationSchema = z.object({
  id: z.string().optional(),
  sequencia: z.number().int().min(1).max(10),
  horas: timeHM.default(''),
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
  dss_canteiro: timeHM.default(''),
  chegada_frente_trabalho: timeHM.default(''),
  abertura_pts: timeHM.default(''),
  inicio_atividade: timeHM.default(''),
  almoco_janta_ida: timeHM.default(''),
  reinicio_atividade: timeHM.default(''),
  termino_atividade: timeHM.default(''),
  observacoes: z.string().max(1000).default(''),
  deviations: z.array(deviationSchema).max(10).default([]),
});

export type EntryFormValues = z.infer<typeof entryFormSchema>;

export function validateHM(value: string): boolean {
  return value === '' || isValidHM(value);
}
