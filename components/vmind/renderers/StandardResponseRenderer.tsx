import React from 'react';
import { VmindMessage } from '@/shared/types/vmind';
import { AGENTS } from '@/shared/constants/data';
import { KpiRenderer } from './KpiRenderer';
import { TableRenderer } from './TableRenderer';
import { ChartRenderer } from './ChartRenderer';
import { GenericDetailRenderer } from './GenericDetailRenderer';
import { MonthlyReportResultRenderer } from './MonthlyReportResultRenderer';

interface StandardResponseRendererProps {
  message: VmindMessage;
  onAgentClick?: (agentId: string) => void;
}

const renderTextWithAgentLinks = (text?: string, onAgentClick?: (agentId: string) => void) => {
  if (!text) return null;

  // Regex matches markdown links of type [Label](agent:AGENT_ID)
  const regex = /\[(.*?)\]\(agent:([A-Za-z0-9_-]+)\)/g;
  const elements: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    const [fullMatch, label, agentId] = match;
    const matchIndex = match.index;

    // Push text before match
    if (matchIndex > lastIndex) {
      elements.push(text.slice(lastIndex, matchIndex));
    }

    const agentKey = agentId.toUpperCase() as keyof typeof AGENTS;
    const agentConfig = AGENTS[agentKey];
    const color = agentConfig?.color || '#00f0ff';
    const bgColor = agentConfig?.bgColor || 'rgba(0, 240, 255, 0.12)';

    elements.push(
      <button
        key={`${agentId}-${matchIndex}`}
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onAgentClick?.(agentId.toUpperCase());
        }}
        className="agent-referral-link inline-flex items-center gap-1 font-semibold transition-all duration-200"
        style={{
          color: color,
          textDecoration: 'underline',
          textDecorationColor: `${color}80`,
          textUnderlineOffset: '3px',
          cursor: 'pointer',
          background: 'transparent',
          border: 'none',
          padding: '1px 4px',
          borderRadius: '4px',
          fontSize: 'inherit',
          lineHeight: 'inherit',
          display: 'inline',
          fontWeight: 600,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = '#ffffff';
          e.currentTarget.style.backgroundColor = bgColor;
          e.currentTarget.style.textDecorationColor = color;
          e.currentTarget.style.boxShadow = `0 0 8px ${color}60`;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = color;
          e.currentTarget.style.backgroundColor = 'transparent';
          e.currentTarget.style.textDecorationColor = `${color}80`;
          e.currentTarget.style.boxShadow = 'none';
        }}
        title={`Ouvrir une nouvelle conversation avec ${label}`}
      >
        {label}
      </button>
    );

    lastIndex = matchIndex + fullMatch.length;
  }

  if (lastIndex < text.length) {
    elements.push(text.slice(lastIndex));
  }

  return elements.length > 0 ? elements : text;
};

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

export const StandardResponseRenderer: React.FC<StandardResponseRendererProps> = ({ message, onAgentClick }) => {
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
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 6px' }}>
        <style dangerouslySetInnerHTML={{__html: `
          @keyframes vmind-bounce {
            0%, 100% { transform: translateY(0); opacity: 0.4; }
            50% { transform: translateY(-5px); opacity: 1; }
          }
        `}} />
        <div style={{ width: '6px', height: '6px', backgroundColor: '#00E5C8', borderRadius: '50%', animation: 'vmind-bounce 1.2s infinite ease-in-out', animationDelay: '-0.32s' }} />
        <div style={{ width: '6px', height: '6px', backgroundColor: '#00E5C8', borderRadius: '50%', animation: 'vmind-bounce 1.2s infinite ease-in-out', animationDelay: '-0.16s' }} />
        <div style={{ width: '6px', height: '6px', backgroundColor: '#00E5C8', borderRadius: '50%', animation: 'vmind-bounce 1.2s infinite ease-in-out' }} />
      </div>
    );
  }

  if (response_type === 'error') {
    return (
      <div className="text-rose-400 p-3 border border-rose-500/20 rounded-lg bg-rose-500/5">
        <div className="font-bold flex items-center gap-2 mb-2">
          <span className="text-rose-500">!</span> {title || 'Erreur Systeme'}
        </div>
        <div className="text-sm opacity-90 leading-relaxed">{renderTextWithAgentLinks(text, onAgentClick) || 'Une erreur inconnue est survenue.'}</div>
        {error && (
          <div className="mt-2 pt-2 border-t border-rose-500/10 text-[10px] opacity-60 font-mono break-all">
            Code: {typeof error === 'object' ? JSON.stringify(error) : String(error)}
          </div>
        )}
      </div>
    );
  }

  const detailsStr = typeof details === 'string' ? details : JSON.stringify(details || '');
  const textStr = typeof text === 'string' ? text : '';
  const isForbidden =
    error === 'FORBIDDEN' ||
    error === 'FORBIDDEN_TOOL_EXECUTION' ||
    error === 'UNAUTHORIZED_TOOL_EXECUTION' ||
    detailsStr.includes('FORBIDDEN_TOOL_EXECUTION') ||
    detailsStr.includes('UNAUTHORIZED_TOOL_EXECUTION') ||
    detailsStr.includes('status": "unauthorized') ||
    detailsStr.includes('status":"unauthorized') ||
    detailsStr.includes("Vous n'avez pas les permissions nécessaires") ||
    textStr.includes('FORBIDDEN_TOOL_EXECUTION');

  if (isForbidden) {
    return (
      <div style={{
        padding: '12px 14px',
        backgroundColor: 'rgba(255, 170, 0, 0.06)',
        border: '1px solid rgba(255, 170, 0, 0.25)',
        borderRadius: '8px',
        color: '#ffdd88',
        fontSize: '13px',
        lineHeight: 1.5,
        display: 'flex',
        alignItems: 'flex-start',
        gap: '8px'
      }}>
        <span style={{ fontSize: '15px' }}>ℹ️</span>
        <div>
          Vous n'avez pas l'autorisation d'accéder aux données Erp en direct pour cet agent. Je reste à votre disposition pour toute question méthodologique ou conseil métier dans ce domaine.
        </div>
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
          {renderTextWithAgentLinks(text, onAgentClick)}
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
          {renderTextWithAgentLinks(text, onAgentClick)}
        </div>
      )}
    </div>
  );
};
