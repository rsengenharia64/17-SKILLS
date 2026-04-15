/**
 * Funções utilitárias de tempo usadas nos cálculos de produtividade.
 * Horários são strings HH:mm. Total/diferença são strings HH:mm (horas podem
 * passar de 24 em desvios somados).
 */

export type HM = string; // "HH:mm"

export function isValidHM(v: string): boolean {
  return /^([0-1]\d|2[0-3]|\d{1,3}):[0-5]\d$/.test(v);
}

export function parseHMToMinutes(v: string | undefined | null): number {
  if (!v) return 0;
  const m = /^(\d{1,3}):([0-5]\d)$/.exec(v);
  if (!m) return 0;
  return Number(m[1]) * 60 + Number(m[2]);
}

export function minutesToHM(total: number): HM {
  if (!Number.isFinite(total) || total < 0) return '00:00';
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function diffHM(fim: HM, inicio: HM): HM {
  const delta = parseHMToMinutes(fim) - parseHMToMinutes(inicio);
  return minutesToHM(Math.max(0, delta));
}

export function sumHM(values: Array<HM | undefined | null>): HM {
  const total = values.reduce((acc, v) => acc + parseHMToMinutes(v ?? ''), 0);
  return minutesToHM(total);
}

export function maskHMInput(raw: string): HM {
  const digits = raw.replace(/\D/g, '').slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}:${digits.slice(2)}`;
}

/** Semana no padrão "Sem NN" baseado em ISO week. */
export function weekLabel(iso: string): string {
  const d = new Date(iso + 'T00:00:00');
  const target = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = (target.getUTCDay() + 6) % 7;
  target.setUTCDate(target.getUTCDate() - dayNum + 3);
  const firstThursday = new Date(Date.UTC(target.getUTCFullYear(), 0, 4));
  const week =
    1 +
    Math.round(
      ((target.getTime() - firstThursday.getTime()) / 86400000 -
        3 +
        ((firstThursday.getUTCDay() + 6) % 7)) /
        7,
    );
  return `Sem ${String(week).padStart(2, '0')}`;
}

export function todayIso(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function formatBr(iso: string | null | undefined): string {
  if (!iso) return '-';
  const [y, m, d] = iso.split('-');
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}
