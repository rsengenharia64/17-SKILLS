import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/database';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

export function StandardsAdmin() {
  const list = useLiveQuery(() => db.operation_standards.toArray(), []);
  const locations = useLiveQuery(() => db.locations.toArray(), []);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">
          Padrões operacionais ({list?.length ?? 0})
        </h3>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-surface-soft text-white/70 text-xs">
            <tr>
              <th className="text-left px-3 py-2">Nome</th>
              <th className="text-left px-3 py-2">Local</th>
              <th className="text-left px-3 py-2">Turno</th>
              <th className="text-left px-3 py-2">DSS</th>
              <th className="text-left px-3 py-2">Chegada</th>
              <th className="text-left px-3 py-2">PTS</th>
              <th className="text-left px-3 py-2">Início</th>
              <th className="text-left px-3 py-2">Almoço</th>
              <th className="text-left px-3 py-2">Reinício</th>
              <th className="text-left px-3 py-2">Término</th>
              <th className="text-left px-3 py-2">Carga</th>
              <th className="text-left px-3 py-2">Ativo</th>
              <th className="text-right px-3 py-2">Ações</th>
            </tr>
          </thead>
          <tbody>
            {list?.map(s => {
              const loc = locations?.find(l => l.id === s.local_id);
              return (
                <tr key={s.id} className="border-t border-surface-border">
                  <td className="px-3 py-2">{s.nome}</td>
                  <td className="px-3 py-2">{loc?.nome || '—'}</td>
                  <td className="px-3 py-2">{s.turno}</td>
                  <td className="px-3 py-2 font-mono text-[11px]">{s.dss_canteiro}</td>
                  <td className="px-3 py-2 font-mono text-[11px]">{s.chegada_frente_trabalho}</td>
                  <td className="px-3 py-2 font-mono text-[11px]">{s.abertura_pts}</td>
                  <td className="px-3 py-2 font-mono text-[11px]">{s.inicio_atividade}</td>
                  <td className="px-3 py-2 font-mono text-[11px]">{s.almoco_janta_ida}</td>
                  <td className="px-3 py-2 font-mono text-[11px]">{s.reinicio_atividade}</td>
                  <td className="px-3 py-2 font-mono text-[11px]">{s.termino_atividade}</td>
                  <td className="px-3 py-2 font-mono text-[11px]">{s.carga_horaria_padrao}</td>
                  <td className="px-3 py-2">
                    <Badge tone={s.ativo ? 'success' : 'neutral'}>
                      {s.ativo ? 'sim' : 'não'}
                    </Badge>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <Button
                      size="sm"
                      variant={s.ativo ? 'danger' : 'secondary'}
                      onClick={() =>
                        db.operation_standards.update(s.id, {
                          ativo: !s.ativo,
                          updated_at: new Date().toISOString(),
                        })
                      }
                    >
                      {s.ativo ? 'Inativar' : 'Ativar'}
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="text-[11px] text-white/50">
        A edição detalhada dos padrões pode ser feita via backup/restauração
        ou adicionando novos. Os padrões seedados atendem CBSI/VALE/TPM e MFE.
      </p>
    </div>
  );
}
