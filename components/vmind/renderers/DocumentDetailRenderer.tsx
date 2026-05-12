import React from 'react';

interface DocumentDetailRendererProps {
  data: any;
}

/**
 * Rendu générique pour un document structuré (Facture, Dossier, etc.)
 * Attend une structure { header, lines, summary }
 */
export const DocumentDetailRenderer: React.FC<DocumentDetailRendererProps> = ({ data }) => {
  if (!data) return null;

  const header = data.header || data.invoice || data.facture || data;
  const lines = data.lines || data.lignes || [];
  const summary = data.summary || data.totals || {};

  if (!header || typeof header !== 'object') {
    return <div className="text-amber-500 text-[10px] italic p-2 bg-amber-500/5 rounded border border-amber-500/10">Données de détail non structurées.</div>;
  }

  // On extrait les clés intéressantes pour le header (on exclut les objets/tableaux)
  const headerEntries = Object.entries(header).filter(
    ([k, v]) => v !== null && typeof v !== 'object' && !['id', 'reference', 'statut', 'invoice_reference', 'invoice_status'].includes(k)
  );

  const status = header.statut || header.invoice_status || header.status;
  const isValidated = status?.toLowerCase().includes('valid') || status?.toLowerCase().includes('pay');
  const isDraft = status?.toLowerCase().includes('brouillon') || status?.toLowerCase().includes('draft');

  return (
    <div className="flex flex-col gap-4 w-full animate-in fade-in slide-in-from-bottom-2 duration-500">
      {/* 1. Header Card - Affichage Premium */}
      <div className="bg-[#111827] p-5 rounded-xl border border-[#2a3441] shadow-xl overflow-hidden relative">
        <div className="absolute top-0 left-0 w-1 h-full bg-cyan-500"></div>

        <div className="flex flex-wrap justify-between items-start gap-4 mb-6">
          <div className="flex flex-col">
            <span className="text-[10px] text-gray-500 uppercase font-bold tracking-widest mb-1">Référence Document</span>
            <h3 className="text-xl font-black text-white tracking-tight">
              {header.reference || header.invoice_reference || header.numero || header.id || 'DÉTAILS'}
            </h3>
          </div>

          {status && (
            <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase border tracking-widest ${isValidated
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.1)]'
                : isDraft
                  ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                  : 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30'
              }`}>
              {status}
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-y-5 gap-x-8">
          {headerEntries.slice(0, 12).map(([key, value]) => (
            <div key={key} className="group">
              <div className="text-gray-500 text-[9px] uppercase font-bold mb-1 opacity-60 group-hover:opacity-100 transition-opacity">
                {key.replace(/_/g, ' ')}
              </div>
              <div className="text-sm font-medium text-gray-200 break-words">
                {String(value)}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 2. Highlights (Totaux / Summary) */}
      {(Object.keys(summary).length > 0 || header.total_ttc || summary.total_ttc) && (
        <div className="flex flex-wrap gap-3">
          {Object.entries(summary)
            .filter(([_, v]) => v !== null && v !== undefined)
            .slice(0, 4)
            .map(([key, value]) => (
              <div key={key} className="flex-1 min-w-[120px] bg-[#111827] p-3 rounded-lg border border-[#2a3441] flex flex-col items-center justify-center">
                <div className="text-base font-black text-white">{String(value)}</div>
                <div className="text-[9px] text-gray-500 uppercase font-bold mt-1 tracking-tighter">{key.replace(/_/g, ' ')}</div>
              </div>
            ))}

          {/* Main Total Highlight - Robust check */}
          {(header.total_ttc || summary.total_ttc || header.total_including_tax || summary.total_including_tax) && (
            <div className="flex-1 min-w-[180px] bg-cyan-500/5 p-3 rounded-lg border border-cyan-500/30 flex flex-col items-center justify-center shadow-inner">
              <div className="text-lg font-black text-cyan-400">
                {header.total_ttc || summary.total_ttc || header.total_including_tax || summary.total_including_tax} <span className="text-xs">{header.devise || header.currency || ''}</span>
              </div>
              <div className="text-[10px] text-cyan-500 uppercase font-black mt-1 tracking-wider">Montant Total TTC</div>
            </div>
          )}
        </div>
      )}

      {/* 3. Lines Table (Lignes de détail) */}
      {lines && lines.length > 0 && (
        <div className="mt-2 overflow-hidden rounded-xl border border-[#2a3441] bg-[#0b101e]">
          <div className="p-3 border-b border-[#2a3441] bg-[#111827]/50 flex items-center justify-between">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Détails des lignes</span>
            <span className="text-[10px] text-cyan-500 font-bold">{lines.length} ligne(s)</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#111827] text-[10px] text-gray-500 font-bold uppercase tracking-tighter">
                  {Object.keys(lines[0]).slice(0, 6).map(col => (
                    <th key={col} className="p-3 border-b border-[#2a3441]">
                      {col.replace(/_/g, ' ')}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1c2538]">
                {lines.slice(0, 30).map((line: any, idx: number) => (
                  <tr key={idx} className="hover:bg-cyan-500/[0.03] transition-colors">
                    {Object.keys(lines[0]).slice(0, 6).map(col => (
                      <td key={col} className="p-3 text-[11px] text-gray-300 font-medium">
                        {String(line[col] ?? '-')}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {lines.length > 30 && (
            <div className="p-2 text-[9px] text-center text-gray-600 bg-black/10 italic">
              Affichage limité aux 30 premières lignes.
            </div>
          )}
        </div>
      )}
    </div>
  );
};
