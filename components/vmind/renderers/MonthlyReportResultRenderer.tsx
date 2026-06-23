import React from 'react';
import { AlertTriangle, CheckCircle2, Download, FileText } from 'lucide-react';
import { VmindAlert } from '@/shared/types/vmind';

interface MonthlyReportResultRendererProps {
  alerts?: VmindAlert[];
  reportUrl?: string | null;
  reportFilename?: string | null;
}

export const MonthlyReportResultRenderer: React.FC<MonthlyReportResultRendererProps> = ({
  alerts = [],
  reportUrl,
  reportFilename,
}) => {
  if (!reportUrl) return null;

  return (
    <section style={{ margin: '16px 0', overflow: 'hidden', borderRadius: '8px', border: '1px solid rgba(34, 211, 238, 0.28)', background: '#0d1724', boxShadow: '0 12px 30px rgba(0, 0, 0, 0.18)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', borderBottom: '1px solid rgba(34, 211, 238, 0.15)', padding: '12px 16px' }}>
        <div style={{ display: 'grid', width: '36px', height: '36px', flex: '0 0 auto', placeItems: 'center', borderRadius: '6px', background: 'rgba(34, 211, 238, 0.10)', color: '#67e8f9' }}>
          <FileText size={18} aria-hidden="true" />
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ color: '#f3f4f6', fontSize: '14px', fontWeight: 700 }}>Rapport prêt à être consulté</div>
          <div style={{ marginTop: '2px', overflow: 'hidden', color: '#9ca3af', fontSize: '11px', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{reportFilename || 'Rapport mensuel PDF'}</div>
        </div>
      </div>

      <div style={{ padding: '12px 16px' }}>
        <div style={{ marginBottom: '8px', color: '#9ca3af', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase' }}>Points à surveiller</div>
        {alerts.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {alerts.slice(0, 3).map((alert, index) => (
              <div key={`${alert.title}-${index}`} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', color: '#e5e7eb', fontSize: '12px', lineHeight: 1.55 }}>
                <AlertTriangle
                  size={14}
                  color={alert.level === 'danger' ? '#fb7185' : '#fbbf24'}
                  style={{ marginTop: '2px', flex: '0 0 auto' }}
                  aria-hidden="true"
                />
                <div>
                  <span style={{ fontWeight: 700 }}>{alert.title}</span>
                  <span style={{ color: '#9ca3af' }}> — {alert.explanation}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#6ee7b7', fontSize: '12px' }}>
            <CheckCircle2 size={14} aria-hidden="true" style={{ flex: '0 0 auto' }} />
            Aucun point de vigilance majeur détecté.
          </div>
        )}
      </div>

      <div style={{ borderTop: '1px solid rgba(34, 211, 238, 0.15)', background: 'rgba(0, 0, 0, 0.10)', padding: '12px 16px' }}>
        <a
          href={reportUrl}
          download={reportFilename || undefined}
          target="_blank"
          rel="noopener noreferrer"
          style={{ display: 'inline-flex', width: '100%', minHeight: '40px', alignItems: 'center', justifyContent: 'center', gap: '8px', borderRadius: '6px', background: '#22d3ee', padding: '8px 16px', color: '#05262b', fontSize: '12px', fontWeight: 800, textDecoration: 'none', boxShadow: '0 8px 20px rgba(34, 211, 238, 0.16)' }}
        >
          <Download size={16} aria-hidden="true" />
          Télécharger le rapport PDF
        </a>
      </div>
    </section>
  );
};
