import { forwardRef, type SelectHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

interface Props extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
}

export const Select = forwardRef<HTMLSelectElement, Props>(
  ({ label, error, className, children, id, ...rest }, ref) => {
    const selectId = id ?? rest.name ?? Math.random().toString(36).slice(2);
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={selectId} className="text-xs font-medium text-white/70">
            {label}
          </label>
        )}
        <select
          ref={ref}
          id={selectId}
          className={cn(
            'h-11 rounded-lg bg-surface-soft border border-surface-border px-3 text-sm text-white',
            'focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition',
            error && 'border-red-500',
            className,
          )}
          {...rest}
        >
          {children}
        </select>
        {error && <span className="text-[11px] text-red-400">{error}</span>}
      </div>
    );
  },
);
Select.displayName = 'Select';
