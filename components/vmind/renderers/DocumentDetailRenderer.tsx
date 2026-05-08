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
    return <div className="text-amber-500 text-xs italic">Données de détail non structurées.</div>;
  }

  // On extrait les clés intéressantes pour le header (on exclut les objets/tableaux)
  const headerEntries = Object.entries(header).filter(
    ([_, v]) => v !== null && typeof v !== 'object'
  );

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* 1. Header Card - Affichage en grille des propriétés */}
      <div className="bg-[#1a2235] p-4 rounded-lg border-l-4 border-cyan-500 border-y border-r border-[#2a3441]">
        <div className="flex justify-between items-center mb-4">
          <strong className="text-cyan-400 text-lg uppercase tracking-tight">
            {header.reference || header.invoice_reference || header.numero || header.id || 'Détails'}
          </strong>
          {(header.statut || header.invoice_status) && (
            <span className="text-[10px] bg-cyan-900/40 text-cyan-400 px-2 py-0.5 rounded border border-cyan-500/40 font-bold uppercase">
              {header.statut || header.invoice_status}
            </span>
          )}
        </div>
        
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
          {headerEntries.slice(0, 12).map(([key, value]) => (
            <div key={key}>
              <div className="text-gray-500 text-[9px] uppercase mb-0.5 opacity-70">
                {key.replace(/_/g, ' ')}
              </div>
              <div className="font-medium text-gray-200 truncate">
                {String(value)}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 2. KPI Summary (si présent dans summary ou header) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {Object.entries(summary).slice(0, 4).map(([key, value]) => (
          <div key={key} className="bg-[#151b2b] p-2 rounded border border-[#2a3441] text-center">
            <div className="text-sm font-bold text-gray-100">{String(value)}</div>
            <div className="text-[9px] text-gray-500 uppercase mt-0.5">{key.replace(/_/g, ' ')}</div>
          </div>
        ))}
        {/* Fallback sur les totaux classiques si summary est vide */}
        {!Object.keys(summary).length && (header.total_ttc || header.total_including_tax) && (
           <div className="bg-[#151b2b] p-2 rounded border border-cyan-500/30 text-center col-span-2">
             <div className="text-sm font-bold text-cyan-400">{header.total_ttc || header.total_including_tax} {header.devise || header.currency || ''}</div>
             <div className="text-[9px] text-cyan-500 uppercase mt-0.5 font-bold">TOTAL TTC</div>
           </div>
        )}
      </div>

      {/* 3. Lines Table (Lignes de détail) */}
      {lines && lines.length > 0 && (
        <div className="mt-1 overflow-x-auto rounded border border-[#2a3441]">
          <table className="w-full text-[11px] text-left border-collapse">
            <thead className="bg-[#151b2b] text-gray-500 border-b border-[#2a3441]">
              <tr>
                {Object.keys(lines[0]).slice(0, 6).map(col => (
                  <th key={col} className="p-2 font-semibold uppercase tracking-tighter">
                    {col.replace(/_/g, ' ')}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2a3441]">
              {lines.slice(0, 30).map((line: any, idx: number) => (
                <tr key={idx} className="hover:bg-[#1a2235]/50 transition-colors">
                  {Object.keys(lines[0]).slice(0, 6).map(col => (
                    <td key={col} className="p-2 text-gray-300">
                      {String(line[col] ?? '-')}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {lines.length > 30 && (
            <div className="p-1 text-[9px] text-center text-gray-600 bg-black/10 italic">
              Affichage limité aux 30 premières lignes.
            </div>
          )}
        </div>
      )}
    </div>
  );
};
