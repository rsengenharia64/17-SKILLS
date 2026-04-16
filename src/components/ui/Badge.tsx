import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

type Tone = 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'brand';

const TONE: Record<Tone, string> = {
  neutral: 'bg-white/10 text-white/80',
  success: 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30',
  warning: 'bg-amber-500/15 text-amber-300 border border-amber-500/30',
  danger: 'bg-red-500/15 text-red-300 border border-red-500/30',
  info: 'bg-sky-500/15 text-sky-300 border border-sky-500/30',
  brand: 'bg-brand-500/15 text-brand-300 border border-brand-500/30',
};

export function Badge({
  tone = 'neutral',
  children,
  className,
}: {
  tone?: Tone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium',
        TONE[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
