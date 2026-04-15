import type { ReactNode } from 'react';

export function EmptyState({
  title,
  description,
  action,
  icon = '📭',
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center text-center py-10 px-4">
      <div className="text-3xl mb-2">{icon}</div>
      <h4 className="text-sm font-semibold text-white">{title}</h4>
      {description && (
        <p className="mt-1 text-xs text-white/60 max-w-xs">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
