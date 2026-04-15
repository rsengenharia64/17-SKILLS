import { useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { useAuthStore } from '@/store/authStore';
import { downloadBackup, restoreBackup } from '@/services/backupService';

export function BackupAdmin() {
  const user = useAuthStore(s => s.session!.user);
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<string | null>(null);

  const onExport = async () => {
    setStatus('Gerando backup…');
    await downloadBackup(user);
    setStatus('Backup gerado.');
  };

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const replace = confirm(
      'Substituir os lançamentos locais atuais pelos do backup? (Cancelar = apenas mesclar)',
    );
    const text = await f.text();
    setStatus('Restaurando…');
    const r = await restoreBackup(text, { replaceAll: replace });
    if (r.ok) {
      setStatus(
        `Restauração concluída: ${Object.entries(r.counts)
          .map(([k, v]) => `${k}:${v}`)
          .join(' · ')}`,
      );
    } else {
      setStatus(`Erro: ${r.error}`);
    }
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-sm font-semibold">Backup e Restauração</h3>
      <p className="text-xs text-white/70">
        O backup exporta todas as entidades locais (configurações + registros).
        Líderes exportam apenas seus dados; administrador exporta tudo.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button onClick={onExport}>⬇ Exportar backup (.json)</Button>
        <input
          ref={inputRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={onFile}
        />
        <Button variant="secondary" onClick={() => inputRef.current?.click()}>
          ⬆ Restaurar backup
        </Button>
      </div>
      {status && (
        <div className="rounded-lg border border-surface-border bg-surface-soft p-2 text-xs">
          {status}
        </div>
      )}
    </div>
  );
}
