import React from 'react';
import { DocumentDetailRenderer } from './DocumentDetailRenderer';

interface GenericDetailRendererProps {
  data: any;
  responseType?: string;
}

export const GenericDetailRenderer: React.FC<GenericDetailRendererProps> = ({ data, responseType }) => {
  if (!data || typeof data !== 'object') return null;

  // 1. Si c'est un format structuré connu (ex: Facture, Dossier avec header/lines/summary)
  const hasHeader = !!(data.header || data.invoice || data.facture || data.invoice_reference);
  
  if (hasHeader) {
    return <DocumentDetailRenderer details={data.header || data.invoice || data} />;
  }

  // 2. Si c'est un tableau, on tente de le formater proprement
  if (Array.isArray(data)) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {data.map((item, i) => (
          <div key={i} style={{ padding: '8px', backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: '4px', border: '1px solid rgba(28,37,56,0.5)' }}>
            <GenericDetailRenderer data={item} />
          </div>
        ))}
      </div>
    );
  }

  // 3. Si c'est un objet simple (clé-valeur), on l'affiche en liste structurée
  const entries = Object.entries(data).filter(([k, v]) => 
    v !== null && 
    v !== undefined && 
    !['rows_count', 'ok', 'tool_used', 'response_type', 'message', 'text', 'title', 'kpis', 'table', 'chart', 'details', 'error'].includes(k)
  );

  if (entries.length > 0 && entries.every(([_, v]) => typeof v !== 'object')) {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px' }}>
        {entries.map(([key, value]) => (
          <div key={key} style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '10px', color: 'var(--muted)', textTransform: 'uppercase', fontWeight: 'bold' }}>{key.replace(/_/g, ' ')}</span>
            <span style={{ fontSize: '13px', color: 'var(--white)' }}>{String(value)}</span>
          </div>
        ))}
      </div>
    );
  }

  // 4. Ne JAMAIS afficher les données brutes JSON dans l'interface
  return null;
};
