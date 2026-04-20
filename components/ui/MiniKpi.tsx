import React from 'react';

interface MiniKpiProps {
  label: string;
  dotColor: string;
  val: string;
  delta: string;
  deltaType: 'up' | 'down' | 'warning';
}

export const MiniKpi: React.FC<MiniKpiProps> = ({ label, dotColor, val, delta, deltaType }) => {
  return (
    <div className="mini-kpi">
      <div className="mini-label">
        <span className="mini-dot" style={{ background: dotColor }}></span>
        {label}
      </div>
      <div>
        <div className="mini-val">{val}</div>
        <div className={`mini-delta-${deltaType === 'warning' ? 'down' : deltaType}`}>{delta}</div>
      </div>
    </div>
  );
};
