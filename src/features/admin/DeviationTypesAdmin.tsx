import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/database';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { uuid } from '@/lib/uuid';

export function DeviationTypesAdmin() {
  const list = useLiveQuery(() => db.deviation_types.toArray(), []);
  const [open, setOpen] = useState(false);
  const [codigo, setCodigo] = useState('');
  const [nome, setNome] = useState('');
  const [desc, setDesc] = useState('');
  const [filter, setFilter] = useState('');

  const save = async () => {
    const now = new Date().toISOString();
    await db.deviation_types.add({
      id: uuid(),
      codigo: codigo.toUpperCase(),
      nome,
      descricao: desc,
      ativo: true,
      created_at: now,
      updated_at: now,
    });
    setCodigo('');
    setNome('');
    setDesc('');
    setOpen(false);
  };

  const filtered = (list ?? []).filter(t => {
    if (!filter.trim()) return true;
    const q = filter.toLowerCase();
    return t.codigo.toLowerCase().includes(q) || t.nome.toLowerCase().includes(q);
  });

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">Tipos de desvio ({list?.length ?? 0})</h3>
        <div className="flex gap-2 items-end">
          <Input placeholder="filtrar..." value={filter} onChange={e => setFilter(e.target.value)} />
          <Button size="sm" onClick={() => setOpen(true)}>+ Novo</Button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-surface-soft text-white/70 text-xs">
            <tr>
              <th className="text-left px-3 py-2 w-20">Código</th>
              <th className="text-left px-3 py-2">Nome</th>
              <th className="text-left px-3 py-2">Descrição</th>
              <th className="text-left px-3 py-2">Ativo</th>
              <th className="text-right px-3 py-2">Ações</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(t => (
              <tr key={t.id} className="border-t border-surface-border">
                <td className="px-3 py-2 font-mono">{t.codigo}</td>
                <td className="px-3 py-2">{t.nome}</td>
                <td className="px-3 py-2 text-white/60 text-[12px]">{t.descricao || '—'}</td>
                <td className="px-3 py-2">
                  <Badge tone={t.ativo ? 'success' : 'neutral'}>{t.ativo ? 'sim' : 'não'}</Badge>
                </td>
                <td className="px-3 py-2 text-right">
                  <Button
                    size="sm"
                    variant={t.ativo ? 'danger' : 'secondary'}
                    onClick={() =>
                      db.deviation_types.update(t.id, {
                        ativo: !t.ativo,
                        updated_at: new Date().toISOString(),
                      })
                    }
                  >
                    {t.ativo ? 'Inativar' : 'Ativar'}
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
        title="Novo tipo de desvio"
        footer={
          <>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={save} disabled={!codigo || !nome}>Salvar</Button>
          </>
        }
      >
        <div className="flex flex-col gap-2">
          <Input label="Código" value={codigo} onChange={e => setCodigo(e.target.value)} placeholder="Ex: AE" />
          <Input label="Nome" value={nome} onChange={e => setNome(e.target.value)} />
          <Input label="Descrição" value={desc} onChange={e => setDesc(e.target.value)} />
        </div>
      </Modal>
    </div>
  );
}
