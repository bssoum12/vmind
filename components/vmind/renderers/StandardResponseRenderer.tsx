import React from 'react';
import { VmindMessage } from '@/shared/types/vmind';
import { KpiRenderer } from './KpiRenderer';
import { TableRenderer } from './TableRenderer';
import { ChartRenderer } from './ChartRenderer';
import { GenericDetailRenderer } from './GenericDetailRenderer';

interface StandardResponseRendererProps {
  message: VmindMessage;
}

export const StandardResponseRenderer: React.FC<StandardResponseRendererProps> = ({ message }) => {
  const { 
    text, 
    kpis, 
    table, 
    chart, 
    details, 
    response_type, 
    title,
    error,
    isThinking 
  } = message;

  if (isThinking) {
    return (
      <div className="flex items-center gap-1.5 p-2">
        <div className="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
        <div className="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
        <div className="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-bounce"></div>
      </div>
    );
  }

  if (response_type === 'error') {
    return (
      <div className="text-rose-400 p-3 border border-rose-500/20 rounded-lg bg-rose-500/5">
        <div className="font-bold flex items-center gap-2 mb-2">
          <span className="text-rose-500">⚠️</span> {title || 'Erreur Système'}
        </div>
        <div className="text-sm opacity-90 leading-relaxed">{text || 'Une erreur inconnue est survenue.'}</div>
        {error && (
          <div className="mt-2 pt-2 border-t border-rose-500/10 text-[10px] opacity-60 font-mono break-all">
            Code: {typeof error === 'object' ? JSON.stringify(error) : String(error)}
          </div>
        )}
      </div>
    );
  }

  // On affiche tout ce qui est présent, mais on peut filtrer selon response_type si nécessaire
  // Ici on choisit d'afficher tout ce qui contient des données
  return (
    <div className="flex flex-col gap-2 w-full">
      {/* 1. Message Texte principal */}
      {text && (
        <div className="text-gray-200 text-sm whitespace-pre-wrap leading-relaxed">
          {text}
        </div>
      )}

      {/* 2. KPIs (Indicateurs) */}
      {kpis && kpis.length > 0 && (
        <KpiRenderer kpis={kpis} />
      )}

      {/* 3. Graphique */}
      {chart && chart.data && chart.data.length > 0 && (
        <ChartRenderer chart={chart} />
      )}

      {/* 4. Tableau */}
      {table && table.rows && table.rows.length > 0 && (
        <TableRenderer table={table} />
      )}

      {/* 5. Détails (Générique) */}
      {details && (response_type === 'detail' || response_type === 'full') && (
        <div className="mt-2 pt-2 border-t border-[#1c2538]/50">
          <GenericDetailRenderer data={details} responseType={response_type} />
        </div>
      )}

      {/* 6. Clarification */}
      {response_type === 'clarification' && (
        <div className="mt-2 p-3 bg-amber-500/10 border border-amber-500/30 rounded text-amber-200 text-xs italic">
          💡 {text}
        </div>
      )}
    </div>
  );
};
