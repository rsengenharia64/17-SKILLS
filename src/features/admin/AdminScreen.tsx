import { useState } from 'react';
import { Card, CardBody } from '@/components/ui/Card';
import { LeadersAdmin } from './LeadersAdmin';
import { DeviationTypesAdmin } from './DeviationTypesAdmin';
import { LocationsAdmin } from './LocationsAdmin';
import { StandardsAdmin } from './StandardsAdmin';
import { BackupAdmin } from './BackupAdmin';
import { SyncAdmin } from './SyncAdmin';
import { cn } from '@/lib/cn';

const TABS = [
  { id: 'lideres', label: 'Líderes', icon: '👥' },
  { id: 'locais', label: 'Locais', icon: '📍' },
  { id: 'desvios', label: 'Tipos de desvio', icon: '🚧' },
  { id: 'padroes', label: 'Padrões operacionais', icon: '⏱️' },
  { id: 'sync', label: 'Sincronização', icon: '🔄' },
  { id: 'backup', label: 'Backup / Restauração', icon: '💾' },
] as const;

type TabId = (typeof TABS)[number]['id'];

export function AdminScreen() {
  const [tab, setTab] = useState<TabId>('lideres');

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              'px-3 py-2 rounded-lg text-sm border transition',
              tab === t.id
                ? 'bg-brand-500/15 border-brand-500/40 text-brand-200'
                : 'bg-surface-soft border-surface-border text-white/75 hover:bg-white/5',
            )}
          >
            <span className="mr-1">{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      <Card>
        <CardBody>
          {tab === 'lideres' && <LeadersAdmin />}
          {tab === 'locais' && <LocationsAdmin />}
          {tab === 'desvios' && <DeviationTypesAdmin />}
          {tab === 'padroes' && <StandardsAdmin />}
          {tab === 'sync' && <SyncAdmin />}
          {tab === 'backup' && <BackupAdmin />}
        </CardBody>
      </Card>
    </div>
  );
}
