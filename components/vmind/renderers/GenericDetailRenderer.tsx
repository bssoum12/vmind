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

  // 2. Format générique v2 : sections (Spec v2 Section 5.10b / 7.10)
  if (Array.isArray(data.sections)) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {data.title && (
          <h4 style={{ fontSize: '14px', fontWeight: 600, color: '#f3f4f6', margin: 0 }}>
            {data.title}
          </h4>
        )}
        {data.sections.map((section: any, idx: number) => (
          <div
            key={idx}
            style={{
              padding: '12px 14px',
              backgroundColor: 'rgba(255, 255, 255, 0.03)',
              borderRadius: '8px',
              border: '1px solid rgba(255, 255, 255, 0.08)'
            }}
          >
            {section.title && (
              <div
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  color: 'var(--cyan, #38bdf8)',
                  textTransform: 'uppercase',
                  marginBottom: '10px',
                  letterSpacing: '0.05em'
                }}
              >
                {section.title}
              </div>
            )}
            {Array.isArray(section.fields) ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '10px 16px' }}>
                {section.fields.map((field: any, fIdx: number) => {
                  const label = field.label || field.name || '';
                  const value = field.value !== undefined && field.value !== null ? String(field.value) : '-';
                  const status = field.status;
                  const statusColor =
                    status === 'danger' ? '#f43f5e' :
                    status === 'warning' ? '#f59e0b' :
                    status === 'success' ? '#10b981' :
                    '#f9fafb';

                  return (
                    <div key={fIdx} style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <span style={{ fontSize: '11px', color: '#9ca3af' }}>{label}</span>
                      <span style={{ fontSize: '13px', color: statusColor, fontWeight: 500 }}>{value}</span>
                    </div>
                  );
                })}
              </div>
            ) : null}
          </div>
        ))}
      </div>
    );
  }

  // 3. Si c'est un tableau, on tente de le formater proprement
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

  // 4. Si c'est un objet simple (clé-valeur), on l'affiche en liste structurée
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

  // 5. Ne JAMAIS afficher les données brutes JSON dans l'interface
  return null;
};
