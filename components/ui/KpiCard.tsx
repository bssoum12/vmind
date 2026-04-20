import React from 'react';
import { KPI } from '../../shared/types';

interface KpiCardProps {
  kpi: KPI;
}

export const KpiCard: React.FC<KpiCardProps> = ({ kpi }) => {
  return (
    <div className="kpi-card" style={kpi.color ? { borderColor: kpi.color } : {}}>
      <div className="kpi-label">{kpi.label}</div>
      <div className="kpi-value">{kpi.val}</div>
      <div className={`kpi-delta ${kpi.delta.includes('▲') ? 'up' : kpi.delta.includes('▼') ? 'down' : ''}`}>
        {kpi.delta}
      </div>
      <div className="kpi-source">{kpi.src}</div>
    </div>
  );
};
