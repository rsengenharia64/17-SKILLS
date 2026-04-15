import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/database';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { uuid } from '@/lib/uuid';

export function LocationsAdmin() {
  const list = useLiveQuery(() => db.locations.toArray(), []);
  const [open, setOpen] = useState(false);
  const [nome, setNome] = useState('');
  const [codigo, setCodigo] = useState('');
  const [tipo, setTipo] = useState('');

  const save = async () => {
    const now = new Date().toISOString();
    await db.locations.add({
      id: uuid(),
      nome,
      codigo,
      tipo_operacao: tipo,
      ativo: true,
      created_at: now,
      updated_at: now,
    });
    setNome('');
    setCodigo('');
    setTipo('');
    setOpen(false);
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Locais ({list?.length ?? 0})</h3>
        <Button size="sm" onClick={() => setOpen(true)}>+ Novo local</Button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-surface-soft text-white/70 text-xs">
            <tr>
              <th className="text-left px-3 py-2">Nome</th>
              <th className="text-left px-3 py-2">Código</th>
              <th className="text-left px-3 py-2">Tipo</th>
              <th className="text-left px-3 py-2">Ativo</th>
              <th className="text-right px-3 py-2">Ações</th>
            </tr>
          </thead>
          <tbody>
            {list?.map(l => (
              <tr key={l.id} className="border-t border-surface-border">
                <td className="px-3 py-2">{l.nome}</td>
                <td className="px-3 py-2 font-mono text-[11px]">{l.codigo}</td>
                <td className="px-3 py-2">{l.tipo_operacao || '—'}</td>
                <td className="px-3 py-2">
                  <Badge tone={l.ativo ? 'success' : 'neutral'}>
                    {l.ativo ? 'sim' : 'não'}
                  </Badge>
                </td>
                <td className="px-3 py-2 text-right">
                  <Button
                    size="sm"
                    variant={l.ativo ? 'danger' : 'secondary'}
                    onClick={() =>
                      db.locations.update(l.id, {
                        ativo: !l.ativo,
                        updated_at: new Date().toISOString(),
                      })
                    }
                  >
                    {l.ativo ? 'Inativar' : 'Ativar'}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Novo local"
        footer={
          <>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={save} disabled={!nome || !codigo}>Salvar</Button>
          </>
        }
      >
        <div className="flex flex-col gap-2">
          <Input label="Nome" value={nome} onChange={e => setNome(e.target.value)} />
          <Input label="Código" value={codigo} onChange={e => setCodigo(e.target.value)} />
          <Input label="Tipo operação" value={tipo} onChange={e => setTipo(e.target.value)} />
        </div>
      </Modal>
    </div>
  );
}
