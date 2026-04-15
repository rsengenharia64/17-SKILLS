import { useUIStore } from '@/store/uiStore';
import { Badge } from '@/components/ui/Badge';

export function SaveStatus() {
  const s = useUIStore(v => v.saveState);
  const online = useUIStore(v => v.online);
  const last = useUIStore(v => v.lastSavedAt);

  if (s === 'saving')
    return <Badge tone="info">● salvando…</Badge>;
  if (s === 'saved')
    return (
      <Badge tone="success">
        ● salvo localmente {last ? `(${new Date(last).toLocaleTimeString()})` : ''}
      </Badge>
    );
  if (s === 'pending') return <Badge tone="warning">● pendente sync</Badge>;
  if (s === 'synced') return <Badge tone="brand">● sincronizado</Badge>;
  if (s === 'error') return <Badge tone="danger">● erro ao salvar</Badge>;
  return (
    <Badge tone={online ? 'neutral' : 'warning'}>
      {online ? 'online' : 'offline'}
    </Badge>
  );
}
