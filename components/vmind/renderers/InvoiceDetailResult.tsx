import React from 'react';

interface InvoiceDetailResultProps {
  data: any;
}

export const InvoiceDetailResult: React.FC<InvoiceDetailResultProps> = ({ data }) => {
  if (!data || !data.invoice) {
    return <div className="text-red-400">Données de facture invalides ou manquantes.</div>;
  }

  const { invoice, lines, summary } = data;
  const dateStr = invoice.date_facture ? new Date(invoice.date_facture).toLocaleDateString() : 'N/A';
  const echeanceStr = invoice.date_echeance ? new Date(invoice.date_echeance).toLocaleDateString() : 'N/A';

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* Header Card */}
      <div className="bg-[#1a2235] p-4 rounded-lg border-l-4 border-cyan-500 border-y border-r border-[#2a3441]">
        <div className="flex justify-between items-center mb-3">
          <div className="flex items-center gap-2">
            <strong className="text-cyan-400 text-lg">{invoice.reference || 'N/A'}</strong>
          </div>
          <span className="text-xs bg-cyan-900/40 text-cyan-400 px-3 py-1 rounded border border-cyan-500/40 font-bold">
            {invoice.statut || 'N/A'}
          </span>
        </div>
        
        <div className="grid grid-cols-2 gap-4 text-sm mt-2">
          <div>
            <div className="text-gray-400 text-xs uppercase mb-1">Client</div>
            <div className="font-semibold text-gray-100">{invoice.client || 'N/A'}</div>
          </div>
          <div>
            <div className="text-gray-400 text-xs uppercase mb-1">Dossier Lié</div>
            <div className="font-semibold text-gray-100">{invoice.dossier_ref || 'N/A'}</div>
          </div>
          <div>
            <div className="text-gray-400 text-xs uppercase mb-1">Date Facture</div>
            <div className="text-gray-200">{dateStr}</div>
          </div>
          <div>
            <div className="text-gray-400 text-xs uppercase mb-1">Échéance</div>
            <div className="text-amber-400">{echeanceStr}</div>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-[#151b2b] p-3 rounded-lg border border-[#2a3441] text-center">
          <div className="text-xl font-bold text-gray-100">{invoice.total_ht || '0'} <span className="text-xs text-gray-400">{invoice.devise || ''}</span></div>
          <div className="text-[10px] text-gray-400 uppercase mt-1">TOTAL HT</div>
        </div>
        <div className="bg-[#151b2b] p-3 rounded-lg border border-[#2a3441] text-center">
          <div className="text-xl font-bold text-gray-100">{invoice.total_tva || '0'} <span className="text-xs text-gray-400">{invoice.devise || ''}</span></div>
          <div className="text-[10px] text-gray-400 uppercase mt-1">TVA</div>
        </div>
        <div className="bg-gradient-to-r from-cyan-900/30 to-transparent p-3 rounded-lg border border-cyan-500/50 text-center">
          <div className="text-xl font-bold text-cyan-400">{invoice.total_ttc || '0'} <span className="text-xs text-cyan-600">{invoice.devise || ''}</span></div>
          <div className="text-[10px] text-cyan-400 uppercase mt-1 font-bold">TOTAL TTC</div>
        </div>
      </div>

      {/* Lines Table */}
      {lines && lines.length > 0 ? (
        <div className="mt-2 overflow-x-auto rounded border border-[#2a3441]">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-[#151b2b] text-gray-400 border-b border-[#2a3441]">
              <tr>
                <th className="p-2 font-semibold">Désignation</th>
                <th className="p-2 font-semibold text-right">Qté</th>
                <th className="p-2 font-semibold text-right">P.U HT</th>
                <th className="p-2 font-semibold text-right">TVA</th>
                <th className="p-2 font-semibold text-right">TTC</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2a3441]">
              {lines.map((line: any, idx: number) => (
                <tr key={idx} className="hover:bg-[#1a2235]/50 transition-colors">
                  <td className="p-2 text-gray-300">{line.article_nom || line.designation || 'N/A'}</td>
                  <td className="p-2 text-right">{line.quantite || 0}</td>
                  <td className="p-2 text-right">{line.prix_unitaire_ht || 0}</td>
                  <td className="p-2 text-right">{line.taux_tva || 0}%</td>
                  <td className="p-2 text-right font-medium text-cyan-400">{line.montant_ttc || 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-xs italic text-cyan-500 mt-2">
          Aucune ligne détaillée n'a été retournée pour cette facture.
        </div>
      )}
    </div>
  );
};
