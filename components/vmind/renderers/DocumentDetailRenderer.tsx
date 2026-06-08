import React from 'react';
import { VmindMessage } from '@/shared/types/vmind';

interface DocumentDetailRendererProps {
  details: NonNullable<VmindMessage['details']>;
  title?: string;
}

export const DocumentDetailRenderer: React.FC<DocumentDetailRendererProps> = ({ details, title }) => {
  if (!details || typeof details !== 'object' || Array.isArray(details)) return null;

  const titleKey = Object.keys(details).find((k) =>
    k.toLowerCase().match(/^(reference|ref|numero|no|code|id|titre|nom)/)
  );
  
  const statusKey = Object.keys(details).find((k) =>
    k.toLowerCase().match(/^(statut|status|etat|state)/)
  );

  const displayTitle = title || (titleKey ? String(details[titleKey]) : 'Détails du Document');
  const status = statusKey ? String(details[statusKey]) : undefined;

  const propertyEntries = Object.entries(details).filter(
    ([key]) => key !== titleKey && key !== statusKey && key !== 'rows_count' && key !== 'lignes' && typeof details[key] !== 'object'
  );

  const formatKey = (k: string) => {
    return k.replace(/_/g, ' ').replace(/^@/, '').toUpperCase();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%', margin: '16px 0' }}>
      {/* 1. Header Card - Affichage Premium */}
      <div className="premium-header-card" style={{ padding: '20px', borderRadius: '12px', borderStyle: 'solid', borderWidth: '1px' }}>

        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', marginBottom: '24px' }}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '10px', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '4px' }}>
              Détails
            </span>
            <span style={{ fontSize: '20px', fontWeight: 900, color: 'white', letterSpacing: '0.05em' }}>
              {displayTitle}
            </span>
          </div>

          {status && (
            <div style={{ 
              padding: '6px 12px', 
              borderRadius: '9999px', 
              fontSize: '11px', 
              fontWeight: 'bold', 
              textTransform: 'uppercase', 
              letterSpacing: '0.05em',
              border: '1px solid rgba(0, 229, 200, 0.3)',
              backgroundColor: 'rgba(0, 229, 200, 0.1)',
              color: 'var(--cyan)'
            }}>
              {status}
            </div>
          )}
        </div>

        {/* 2. Content Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
          {propertyEntries.map(([key, value]) => (
            <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontSize: '10px', color: 'var(--cyan)', opacity: 0.8, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
                {formatKey(key)}
              </span>
              <span style={{ fontSize: '13px', color: 'var(--white)', fontWeight: 500, overflowWrap: 'break-word' }}>
                {String(value ?? '-')}
              </span>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
};
