import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type {
  DailyEntry,
  DeviationType,
  EntryDeviation,
  Leader,
  Location,
} from '@/types';
import { formatBr } from '@/lib/time';

interface PdfOpts {
  entries: DailyEntry[];
  deviations: EntryDeviation[];
  leaders: Leader[];
  locations: Location[];
  deviationTypes: DeviationType[];
  title?: string;
  subtitle?: string;
}

export function generateReportPdf({
  entries,
  deviations,
  leaders,
  locations,
  deviationTypes,
  title = 'Relatório de Produtividade',
  subtitle,
}: PdfOpts): jsPDF {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });

  doc.setFontSize(14);
  doc.text(title, 40, 40);
  if (subtitle) {
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(subtitle, 40, 58);
  }
  doc.setTextColor(0);

  autoTable(doc, {
    startY: 80,
    head: [[
      'Data',
      'Sem',
      'Líder',
      'Local',
      'Turno',
      'Ef.',
      'Trab.',
      'Desvio',
      '% Prod',
      '% Improd',
      'Desvios',
      'Obs',
    ]],
    body: entries.map(e => {
      const leader = leaders.find(l => l.id === e.leader_id)?.nome_exibicao ?? '';
      const local = locations.find(l => l.id === e.local_id)?.nome ?? '';
      const desv = deviations
        .filter(d => d.daily_entry_id === e.id)
        .sort((a, b) => a.sequencia - b.sequencia)
        .map(d => {
          const t = deviationTypes.find(x => x.id === d.deviation_type_id);
          return `${t?.codigo ?? '?'}:${d.horas}`;
        })
        .join(' | ');
      return [
        formatBr(e.data),
        e.semana,
        leader,
        local,
        e.turno,
        e.efetivo,
        e.carga_horaria_trabalhada,
        e.desvio_total,
        `${e.percentual_produtivo}%`,
        `${e.percentual_improdutivo}%`,
        desv,
        e.observacoes?.slice(0, 40) ?? '',
      ];
    }),
    styles: { fontSize: 8, cellPadding: 4 },
    headStyles: { fillColor: [16, 185, 129] },
    alternateRowStyles: { fillColor: [240, 253, 244] },
  });

  // Rodapé
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(130);
    doc.text(
      `Gerado em ${new Date().toLocaleString('pt-BR')} · página ${i}/${pages}`,
      40,
      doc.internal.pageSize.getHeight() - 20,
    );
  }

  return doc;
}
