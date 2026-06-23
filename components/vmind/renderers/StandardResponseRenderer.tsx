import React from 'react';
import { VmindMessage } from '@/shared/types/vmind';
import { KpiRenderer } from './KpiRenderer';
import { TableRenderer } from './TableRenderer';
import { ChartRenderer } from './ChartRenderer';
import { GenericDetailRenderer } from './GenericDetailRenderer';
import { MonthlyReportResultRenderer } from './MonthlyReportResultRenderer';

interface StandardResponseRendererProps {
  message: VmindMessage;
}

const GENERIC_TEXTS = new Set([
  'Voici le resultat demande.',
  'Voici le résultat demandé.',
]);

const TOOL_DISPLAY_NAMES: Record<string, string> = {
  'compare_agency_performance_jan_apr': 'Analyse par agence',
  'analyze_delay_by_client_type': 'Retards par type de client',
  'generate_monthly_activity_report': 'Rapport mensuel',
};

const getToolDisplayName = (tool?: string | null) => {
  if (!tool) return '';
  return TOOL_DISPLAY_NAMES[tool] || tool.replace(/_/g, ' ');
};

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
    alerts,
    report_url,
    report_filename,
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
  const shouldShowDetails = Boolean(
    hasDetails && (response_type === 'detail' || response_type === 'full')
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%', animation: 'fadeIn 0.5s' }}>
      {(message.tool_used || message.source) && (
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          {message.tool_used && (
            <span className="premium-badge">
              <span className="status-dot" style={{ display: 'inline-block', width: '6px', height: '6px', background: 'var(--cyan)', borderRadius: '50%', boxShadow: '0 0 8px var(--cyan)' }}></span>
              {getToolDisplayName(message.tool_used)}
            </span>
          )}
          {message.source && message.source !== 'memory' && (
            <span className="premium-badge premium-badge-source">
              {message.source}
            </span>
          )}
        </div>
      )}
      
      {shouldShowText && (
        <div style={{ color: '#e5e7eb', fontSize: '14px', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
          {text}
        </div>
      )}

      {hasKpis && kpis && kpis.length > 0 ? (
        <KpiRenderer kpis={kpis} />
      ) : null}

      {message.tool_used === 'generate_monthly_activity_report' && (
        <MonthlyReportResultRenderer
          alerts={alerts}
          reportUrl={report_url}
          reportFilename={report_filename}
        />
      )}

      {hasChart && chart && (
        <ChartRenderer chart={chart} />
      )}

      {hasTable && table && (
        <TableRenderer table={table} />
      )}

      {shouldShowDetails && (
        <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid rgba(28, 37, 56, 0.5)' }}>
          <GenericDetailRenderer data={details} responseType={response_type} />
        </div>
      )}

      {response_type === 'clarification' && (
        <div style={{ marginTop: '8px', padding: '12px', backgroundColor: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: '4px', color: '#fde68a', fontSize: '12px', fontStyle: 'italic' }}>
          {text}
        </div>
      )}
    </div>
  );
};
