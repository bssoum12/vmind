import React from 'react';
import { DocumentDetailRenderer } from './DocumentDetailRenderer';

interface GenericDetailRendererProps {
  data: any;
  responseType?: string;
}

export const GenericDetailRenderer: React.FC<GenericDetailRendererProps> = ({ data, responseType }) => {
  if (!data) return null;

  // 1. Si c'est un format structuré connu (ex: Facture, Dossier avec header/lines/summary)
  const hasHeader = !!(data.header || data.invoice || data.facture || data.invoice_reference);
  
  if (hasHeader) {
    return <DocumentDetailRenderer data={data} />;
  }

  // 2. Si c'est un simple objet plat ou une liste de clés/valeurs
  if (typeof data === 'object' && !Array.isArray(data)) {
    return (
      <div className="bg-[#111827] rounded-xl border border-[#2a3441] p-5 shadow-lg animate-in fade-in duration-500">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
          {Object.entries(data).map(([key, value]) => {
            if (value === null || value === undefined) return null;
            if (typeof value === 'object') return null; // On ignore les objets imbriqués pour la vue simplifiée

            return (
              <div key={key} className="group border-b border-[#1c2538] pb-3 last:border-0 transition-colors hover:border-cyan-500/30">
                <div className="text-[9px] text-gray-500 uppercase font-bold tracking-widest mb-1 opacity-70 group-hover:opacity-100">
                  {key.replace(/_/g, ' ')}
                </div>
                <div className="text-sm text-gray-200 font-medium break-words">
                  {String(value)}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // 3. Fallback : JSON stringify propre
  return (
    <pre className="text-[10px] text-gray-400 p-3 bg-black/30 rounded border border-[#1c2538] overflow-x-auto">
      {JSON.stringify(data, null, 2)}
    </pre>
  );
};
