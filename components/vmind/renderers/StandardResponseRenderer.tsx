import React from 'react';
import { VmindMessage } from '@/shared/types/vmind';
import { KpiRenderer } from './KpiRenderer';
import { TableRenderer } from './TableRenderer';
import { ChartRenderer } from './ChartRenderer';
import { GenericDetailRenderer } from './GenericDetailRenderer';

interface StandardResponseRendererProps {
  message: VmindMessage;
}

const GENERIC_TEXTS = new Set([
  'Voici le resultat demande.',
  'Voici le résultat demandé.',
]);

const normalizeText = (value?: string) =>
  value
    ?.trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ');

const hasRows = (rows?: any[]) => Array.isArray(rows) && rows.length > 0;

const hasChartData = (data?: any[]) => Array.isArray(data) && data.length > 0;

const hasMeaningfulDetails = (details: any): boolean => {
  if (!details || typeof details !== 'object' || Array.isArray(details)) return Boolean(details);

  return Object.entries(details).some(([key, value]) => {
    if (key === 'rows_count') return false;
    if (value === null || value === undefined || value === '') return false;
    if (Array.isArray(value)) return value.length > 0;
    if (typeof value === 'object') return Object.keys(value).length > 0;
    return true;
  });
};

const formatKpiLabel = (label: string) => {
  const normalizedLabel = label.replace(/^@/, '').replace(/_/g, ' ').trim();

  return normalizedLabel
    .split(' ')
    .map((part) => {
      const lower = part.toLowerCase();
      if (['ttc', 'ht', 'tva', 'tnd', 'usd', 'eur'].includes(lower)) return lower.toUpperCase();
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(' ');
};

const KpiSentence: React.FC<{ kpi: NonNullable<VmindMessage['kpis']>[number] }> = ({ kpi }) => {
  const value = kpi.display || String(kpi.value);
  const unit = kpi.unit ? ` ${kpi.unit}` : '';

  return (
    <div className="text-gray-100 text-sm leading-relaxed">
      <span className="font-semibold text-cyan-300">{formatKpiLabel(kpi.label)}</span>
      {' : '}
      <span>{value}{unit}.</span>
    </div>
  );
};

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
    isThinking,
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
          <span className="text-rose-500">!</span> {title || 'Erreur Systeme'}
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

  const hasKpis = Boolean(kpis && kpis.length > 0);
  const hasTable = Boolean(table && hasRows(table.rows));
  const hasChart = Boolean(chart && hasChartData(chart.data));
  const hasDetails = hasMeaningfulDetails(details);
  const isGenericText = Boolean(text && GENERIC_TEXTS.has(normalizeText(text) || ''));
  const shouldShowText = Boolean(text && (!isGenericText || (!hasKpis && !hasTable && !hasChart && !hasDetails)));
  const shouldRenderSingleKpiSentence = Boolean(hasKpis && kpis?.length === 1 && !hasTable && !hasChart);
  const shouldShowDetails = Boolean(
    hasDetails && !shouldRenderSingleKpiSentence && (response_type === 'detail' || response_type === 'full')
  );

  return (
    <div className="flex flex-col gap-2 w-full">
      {shouldShowText && (
        <div className="text-gray-200 text-sm whitespace-pre-wrap leading-relaxed">
          {text}
        </div>
      )}

      {shouldRenderSingleKpiSentence && kpis ? (
        <KpiSentence kpi={kpis[0]} />
      ) : kpis && kpis.length > 0 ? (
        <KpiRenderer kpis={kpis} />
      ) : null}

      {hasChart && chart && (
        <ChartRenderer chart={chart} />
      )}

      {hasTable && table && (
        <TableRenderer table={table} />
      )}

      {shouldShowDetails && (
        <div className="mt-2 pt-2 border-t border-[#1c2538]/50">
          <GenericDetailRenderer data={details} responseType={response_type} />
        </div>
      )}

      {response_type === 'clarification' && (
        <div className="mt-2 p-3 bg-amber-500/10 border border-amber-500/30 rounded text-amber-200 text-xs italic">
          {text}
        </div>
      )}
    </div>
  );
};
