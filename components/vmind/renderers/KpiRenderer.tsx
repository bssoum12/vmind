import React from 'react';
import { VmindKpi } from '@/shared/types/vmind';
import { Info, AlertTriangle, CheckCircle, AlertCircle } from 'lucide-react';

interface KpiRendererProps {
  kpis: VmindKpi[];
}

export const KpiRenderer: React.FC<KpiRendererProps> = ({ kpis }) => {
  if (!kpis || kpis.length === 0) return null;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400';
      case 'warning': return 'border-amber-500/50 bg-amber-500/10 text-amber-400';
      case 'danger': return 'border-rose-500/50 bg-rose-500/10 text-rose-400';
      default: return 'border-cyan-500/50 bg-cyan-500/10 text-cyan-400';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return <CheckCircle size={14} />;
      case 'warning': return <AlertTriangle size={14} />;
      case 'danger': return <AlertCircle size={14} />;
      default: return <Info size={14} />;
    }
  };

  const getTrendIcon = (trend?: 'up' | 'down' | 'neutral') => {
    if (trend === 'up') return <span className="text-emerald-400">↑</span>;
    if (trend === 'down') return <span className="text-rose-400">↓</span>;
    return null;
  };

  return (
    <div className="grid grid-cols-2 gap-2 my-4">
      {kpis.map((kpi, index) => (
        <div 
          key={index} 
          className={`flex flex-col p-3 rounded-xl border ${getStatusColor(kpi.status)} bg-opacity-5 backdrop-blur-md shadow-lg transition-all hover:translate-y-[-2px]`}
        >
          <div className="flex items-center justify-between mb-2 border-b border-white/5 pb-1">
            <div className="flex items-center gap-1.5 opacity-80">
              {getStatusIcon(kpi.status)}
              <span className="text-[9px] font-black uppercase tracking-wider truncate max-w-[70px]">{kpi.label}</span>
            </div>
            <div className="flex items-center">
              {getTrendIcon(kpi.trend)}
            </div>
          </div>
          <div className="text-lg font-black tracking-tight leading-none pt-1">
            {kpi.display || kpi.value}
            {kpi.unit && <span className="text-[10px] ml-0.5 opacity-60 font-medium">{kpi.unit}</span>}
          </div>
        </div>
      ))}
    </div>
  );
};
