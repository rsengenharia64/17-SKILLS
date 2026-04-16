/**
 * Resolver mínimo compatível com react-hook-form, usando Zod.
 * Evita adicionar a dependência extra `@hookform/resolvers`.
 */
import type { Resolver, FieldValues } from 'react-hook-form';
import type { ZodTypeAny, ZodError, z } from 'zod';

export function zodResolver<
  TSchema extends ZodTypeAny,
  TValues extends FieldValues = z.infer<TSchema>,
>(schema: TSchema): Resolver<TValues> {
  const resolver = async (values: TValues) => {
    const result = schema.safeParse(values);
    if (result.success) {
      return { values: result.data as TValues, errors: {} };
    }
    return {
      values: {} as TValues,
      errors: toHookFormErrors(result.error),
    };
  };
  return resolver as unknown as Resolver<TValues>;
}

function toHookFormErrors(error: ZodError): Record<string, unknown> {
  const errors: Record<string, unknown> = {};
  for (const issue of error.issues) {
    let target = errors as Record<string, any>;
    for (let i = 0; i < issue.path.length - 1; i++) {
      const key = String(issue.path[i]);
      target[key] = target[key] ?? {};
      target = target[key];
    }
    const last = String(issue.path[issue.path.length - 1] ?? '_');
    target[last] = { type: issue.code, message: issue.message };
  }
  return errors;
}
