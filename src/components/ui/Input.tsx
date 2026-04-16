import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, Props>(
  ({ label, hint, error, className, id, ...rest }, ref) => {
    const inputId = id ?? rest.name ?? Math.random().toString(36).slice(2);
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="text-xs font-medium text-white/70">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            'h-11 rounded-lg bg-surface-soft border border-surface-border px-3 text-sm text-white placeholder:text-white/30',
            'focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition',
            error && 'border-red-500 focus:ring-red-500',
            className,
          )}
          {...rest}
        />
        {hint && !error && (
          <span className="text-[11px] text-white/40">{hint}</span>
        )}
        {error && <span className="text-[11px] text-red-400">{error}</span>}
      </div>
    );
  },
);
Input.displayName = 'Input';
