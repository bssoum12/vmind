import React from 'react';
import { VmindMessage } from '@/shared/types/vmind';

interface KpiRendererProps {
  kpis: NonNullable<VmindMessage['kpis']>;
}

export const KpiRenderer: React.FC<KpiRendererProps> = ({ kpis }) => {
  if (!kpis || kpis.length === 0) return null;

  const getStatusColor = (status?: string) => {
    switch (status?.toLowerCase()) {
      case 'up': return 'border-green-500/30 bg-green-500/5 shadow-[0_0_15px_rgba(34,197,94,0.15)] text-green-400';
      case 'down': return 'border-red-500/30 bg-red-500/5 shadow-[0_0_15px_rgba(239,68,68,0.15)] text-red-400';
      default: return 'border-cyan-500/30 bg-cyan-500/5 shadow-[0_0_15px_rgba(6,182,212,0.1)] text-cyan-400';
    }
  };

  const getStatusIcon = (status?: string) => {
    switch (status?.toLowerCase()) {
      case 'up': return <span className="text-green-500 text-[10px]">▲</span>;
      case 'down': return <span className="text-red-500 text-[10px]">▼</span>;
      default: return <span className="text-cyan-500 text-[10px]">●</span>;
    }
  };

  const formatLabel = (label: string) => {
    return label.replace(/^@/, '').replace(/_/g, ' ').trim();
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px', margin: '16px 0' }}>
      {kpis.map((kpi, index) => (
        <div 
          key={index} 
          className={`premium-kpi-card ${getStatusColor(kpi.status)}`}
          style={{ display: 'flex', flexDirection: 'column', padding: '12px', borderRadius: '12px', borderStyle: 'solid', borderWidth: '1px' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', opacity: 0.9 }}>
              {getStatusIcon(kpi.status)}
              <span style={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.1em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100px', color: '#9ca3af' }}>
                {formatLabel(kpi.label)}
              </span>
            </div>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
            <span style={{ fontSize: '24px', fontWeight: 900, color: 'white', lineHeight: 1 }}>{kpi.display || kpi.value}</span>
            {kpi.unit && <span style={{ fontSize: '11px', color: '#a5f3fc', fontWeight: 600 }}>{kpi.unit}</span>}
          </div>
        </div>
      ))}
    </div>
  );
};
