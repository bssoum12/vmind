/**
 * @file SupervisorHistoryView.tsx
 * @description Masterpiece chronological fleet audit & agent progression journal.
 * Strictly adheres to:
 * - 100% direct DB facts from supervisor_fleet_audits & supervisor_agent_evaluations (zero synthetic baselines).
 * - Compact Dropdown Selector replacing wide pill bars (supports 3 to 100+ agents cleanly).
 * - Long-term time horizon optimization (smart 5-tick axis throttling, range presets 7J/30J/90J/Tout, and 60 FPS bucketing for multi-year histories).
 * - Scalable high-density Agents Performance Matrix.
 * - Chronological audit sessions log with link handoffs and failure recovery.
 * - Apple Pro / Linear minimalist design: calm typography, generous spacing, zero fluff.
 */

'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  RotateCw,
  Zap,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  Mail,
  Users,
  Layers,
  Sparkles,
  TrendingUp,
  TrendingDown,
  Minus,
  Search,
  Activity,
  ArrowUpRight,
  Globe,
  Bot,
  Check,
  Filter,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from 'recharts';
import {
  FleetHistoryData,
  FleetAuditHistoryItem,
  AuditNodeSnapshot,
  AuditLinkSnapshot,
  AgentHistoryTrack,
  AgentHistoricalPoint,
} from '../types/supervisor.types';
import { VMindGuideArrow } from '@/shared/management/components/VMindGuide';

interface SupervisorHistoryViewProps {
  historyData: FleetHistoryData;
  isLoading: boolean;
  onRefresh: () => void;
  onRunAuditNow?: () => void;
  isRunningAudit?: boolean;
  tutorialStep?: number;
}

type TimeRangePreset = '7d' | '30d' | '90d' | 'all';

interface ChartPointItem {
  id: string | number;
  pointIndex: number;
  label: string;
  fullDate: string;
  score: number;
  delta?: number | null;
  triggerType?: 'MANUAL' | 'AUTOPILOT';
  summary: string;
  type: 'fleet' | 'agent';
  agentName?: string;
  pointsInBucket?: number;
}

export const SupervisorHistoryView: React.FC<SupervisorHistoryViewProps> = ({
  historyData,
  isLoading,
  onRefresh,
  onRunAuditNow,
  isRunningAudit = false,
  tutorialStep = 0,
}) => {
  const audits = historyData?.audits || [];
  const agentHistories = historyData?.agentHistories || [];
  const rawOptimalThreshold = historyData?.optimalThreshold ?? 75;
  const showOptimalLine = rawOptimalThreshold > 0;
  const optimalThreshold = rawOptimalThreshold > 0 ? rawOptimalThreshold : 75;
  const criticalThreshold = Math.min(50, Math.max(1, optimalThreshold - 1));

  // Tutorial Target Refs & Smooth Auto-Scroll
  const chartCardRef = useRef<HTMLDivElement>(null);
  const matrixCardRef = useRef<HTMLDivElement>(null);
  const sessionsCardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (tutorialStep === 6 && chartCardRef.current) {
      chartCardRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else if (tutorialStep === 7 && matrixCardRef.current) {
      matrixCardRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else if (tutorialStep === 8 && sessionsCardRef.current) {
      sessionsCardRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [tutorialStep]);

  // Track selection: 'fleet' or an agent's string uuid (Default: 'fleet')
  const [selectedTrack, setSelectedTrack] = useState<'fleet' | string>('fleet');

  // Custom Apple Dropdown Open State
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsDropdownOpen(false);
      }
    };
    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isDropdownOpen]);

  // Time range preset: '7d', '30d', '90d', 'all' (Default: 'all')
  const [timeRange, setTimeRange] = useState<TimeRangePreset>('all');

  // Agent search filter for large fleets
  const [searchQuery, setSearchQuery] = useState('');

  // Expandable audit sessions (default: latest audit open)
  const [expandedIds, setExpandedIds] = useState<Record<string | number, boolean>>(() => {
    if (audits.length > 0) {
      return { [audits[0].id]: true };
    }
    return {};
  });

  const toggleExpand = (id: string | number) => {
    setExpandedIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  // Progressive DOM Slicing & Pagination (guarantees buttery 60 FPS even across thousands of audits)
  const INITIAL_VISIBLE_COUNT = 15;
  const [visibleCount, setVisibleCount] = useState<number>(INITIAL_VISIBLE_COUNT);
  const [sessionStatusFilter, setSessionStatusFilter] = useState<'ALL' | 'SUCCESS' | 'FAIL'>('ALL');
  const [sessionTriggerFilter, setSessionTriggerFilter] = useState<'ALL' | 'AUTOPILOT' | 'MANUAL'>('ALL');

  // Filtered session list
  const filteredAudits = useMemo(() => {
    return audits.filter((audit) => {
      if (sessionStatusFilter !== 'ALL' && audit.status !== sessionStatusFilter) return false;
      if (sessionTriggerFilter !== 'ALL' && audit.triggerType !== sessionTriggerFilter) return false;
      return true;
    });
  }, [audits, sessionStatusFilter, sessionTriggerFilter]);

  // Dynamic filter counter statistics
  const sessionStats = useMemo(() => {
    const total = audits.length;
    const success = audits.filter((a) => a.status === 'SUCCESS').length;
    const fail = audits.filter((a) => a.status === 'FAIL').length;
    const autopilot = audits.filter((a) => a.triggerType === 'AUTOPILOT').length;
    const manual = audits.filter((a) => a.triggerType === 'MANUAL').length;
    return { total, success, fail, autopilot, manual };
  }, [audits]);

  // Bounded visible slice for DOM rendering
  const visibleAudits = useMemo(() => {
    return filteredAudits.slice(0, visibleCount);
  }, [filteredAudits, visibleCount]);

  // Date formatters
  const formatDateFull = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return new Intl.DateTimeFormat('fr-FR', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(d);
    } catch {
      return isoString;
    }
  };

  const formatRelativeTime = (isoString: string) => {
    try {
      const diffMs = Date.now() - new Date(isoString).getTime();
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffHours / 24);

      if (diffHours < 1) return "À l'instant";
      if (diffHours < 24) return `Il y a ${diffHours}h`;
      if (diffDays === 1) return 'Hier';
      return `Il y a ${diffDays} jours`;
    } catch {
      return '';
    }
  };

  // Categorized agents for the dropdown
  const sourcingAgents = useMemo(
    () => agentHistories.filter((a) => a.role === 'sourcing'),
    [agentHistories]
  );
  const prospectAgents = useMemo(
    () => agentHistories.filter((a) => a.role === 'prospect'),
    [agentHistories]
  );

  const currentAgentName = useMemo(() => {
    if (selectedTrack === 'fleet') return 'Flotte Globale';
    const found = agentHistories.find(
      (a) => a.agentUuid === selectedTrack || a.agentId === selectedTrack
    );
    return found ? found.agentName : 'Agent';
  }, [selectedTrack, agentHistories]);

  // Long-term scaling & smart downsampling data calculation
  const { chartData, rangeSpanDays, isDownsampled, totalRawCount } = useMemo(() => {
    let rawPoints: Array<{
      id: string | number;
      timestamp: number;
      score: number;
      delta?: number | null;
      triggerType?: 'MANUAL' | 'AUTOPILOT';
      summary: string;
      type: 'fleet' | 'agent';
      agentName?: string;
    }> = [];

    if (selectedTrack === 'fleet') {
      const chronological = audits
        .filter((a) => a.status === 'SUCCESS' && typeof a.overallScore === 'number')
        .slice()
        .reverse();

      rawPoints = chronological.map((a) => ({
        id: a.id,
        timestamp: new Date(a.timestamp).getTime(),
        score: a.overallScore as number,
        delta: a.scoreDelta,
        triggerType: a.triggerType,
        summary: a.summaryMessage || 'Audit de conformité de flotte',
        type: 'fleet',
      }));
    } else {
      const agentTrack = agentHistories.find(
        (t) => t.agentUuid === selectedTrack || t.agentId === selectedTrack
      );

      if (agentTrack && agentTrack.history) {
        rawPoints = agentTrack.history.map((h, idx) => {
          const prevPt = idx > 0 ? agentTrack.history[idx - 1] : null;
          const delta = prevPt ? h.score - prevPt.score : null;
          return {
            id: h.id,
            timestamp: new Date(h.date).getTime(),
            score: h.score,
            delta,
            summary: h.summary || 'Diagnostic de performance unitaire',
            type: 'agent',
            agentName: agentTrack.agentName,
          };
        });
      }
    }

    if (rawPoints.length === 0) {
      return { chartData: [], rangeSpanDays: 0, isDownsampled: false, totalRawCount: 0 };
    }

    // Sort strictly chronological
    rawPoints.sort((a, b) => a.timestamp - b.timestamp);

    // Apply time range filter
    const maxTs = rawPoints[rawPoints.length - 1].timestamp;
    let cutoff = 0;
    if (timeRange === '7d') cutoff = maxTs - 7 * 86400000;
    else if (timeRange === '30d') cutoff = maxTs - 30 * 86400000;
    else if (timeRange === '90d') cutoff = maxTs - 90 * 86400000;

    let inRange = rawPoints.filter((p) => p.timestamp >= cutoff);
    if (inRange.length === 0) {
      inRange = rawPoints; // graceful fallback if chosen preset has no points
    }

    const firstTs = inRange[0].timestamp;
    const lastTs = inRange[inRange.length - 1].timestamp;
    const spanDays = Math.max(1, Math.round((lastTs - firstTs) / 86400000));

    // Downsample if dataset exceeds 40 points to guarantee 60 FPS across multi-year histories
    let processedPoints = inRange;
    let downsampled = false;

    if (inRange.length > 40) {
      downsampled = true;
      const groupMap = new Map<string, typeof inRange>();

      inRange.forEach((pt) => {
        const d = new Date(pt.timestamp);
        // Multi-year (> 180 days): group by week. Medium (> 30 days): group by day.
        const key =
          spanDays > 180
            ? `${d.getFullYear()}-W${Math.ceil((d.getDate() + 6) / 7)}-M${d.getMonth() + 1}`
            : `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;

        if (!groupMap.has(key)) groupMap.set(key, []);
        groupMap.get(key)!.push(pt);
      });

      processedPoints = Array.from(groupMap.values()).map((pts, idx) => {
        const avgScore = Math.round(
          pts.reduce((acc, p) => acc + p.score, 0) / pts.length
        );
        const latestPt = pts[pts.length - 1];
        return {
          id: `bucket-${idx}`,
          timestamp: latestPt.timestamp,
          score: avgScore,
          delta: pts.length === 1 ? latestPt.delta : null,
          triggerType: latestPt.triggerType,
          summary:
            pts.length > 1
              ? `Moyenne consolidée sur ${pts.length} analyses : ${avgScore}%`
              : latestPt.summary,
          type: latestPt.type,
          agentName: latestPt.agentName,
          pointsInBucket: pts.length,
        };
      });
    }

    // Format tick labels smartly according to the span
    const points: ChartPointItem[] = processedPoints.map((p, idx) => {
      const d = new Date(p.timestamp);
      let label = '';
      if (spanDays <= 7) {
        label = new Intl.DateTimeFormat('fr-FR', {
          day: 'numeric',
          month: 'short',
          hour: '2-digit',
          minute: '2-digit',
        }).format(d);
      } else if (spanDays <= 90) {
        label = new Intl.DateTimeFormat('fr-FR', {
          day: 'numeric',
          month: 'short',
        }).format(d);
      } else {
        // Multi-month / multi-year: Month + 2-digit Year (e.g. "nov. 26")
        label = new Intl.DateTimeFormat('fr-FR', {
          month: 'short',
          year: '2-digit',
        }).format(d);
      }

      return {
        id: p.id,
        pointIndex: idx + 1,
        label,
        fullDate: formatDateFull(new Date(p.timestamp).toISOString()),
        score: p.score,
        delta: p.delta,
        triggerType: p.triggerType,
        summary: p.summary,
        type: p.type,
        agentName: p.agentName,
        pointsInBucket: (p as any).pointsInBucket,
      };
    });

    return {
      chartData: points,
      rangeSpanDays: spanDays,
      isDownsampled: downsampled,
      totalRawCount: inRange.length,
    };
  }, [selectedTrack, audits, agentHistories, timeRange]);

  // Current track metadata for header
  const currentTrackMeta = useMemo(() => {
    if (selectedTrack === 'fleet') {
      const latestAudit = audits.find(
        (a) => a.status === 'SUCCESS' && typeof a.overallScore === 'number'
      );
      return {
        title: 'Conformité Globale de la Flotte',
        subtitle: `${historyData.totalAuditsCount} session${historyData.totalAuditsCount > 1 ? 's' : ''} d'audit enregistrée${historyData.totalAuditsCount > 1 ? 's' : ''}`,
        currentScore: historyData.latestScore,
        scoreDelta: latestAudit?.scoreDelta ?? null,
      };
    }

    const agentTrack = agentHistories.find(
      (t) => t.agentUuid === selectedTrack || t.agentId === selectedTrack
    );

    if (agentTrack) {
      return {
        title: agentTrack.agentName,
        subtitle: `${agentTrack.role === 'sourcing' ? 'Agent de Sourcing' : 'Agent de Prospection'} • ${agentTrack.evaluationsCount} diagnostic${agentTrack.evaluationsCount > 1 ? 's' : ''} enregistrés`,
        currentScore: agentTrack.currentScore,
        scoreDelta: agentTrack.scoreDelta,
      };
    }

    return {
      title: 'Progression',
      subtitle: '',
      currentScore: null,
      scoreDelta: null,
    };
  }, [selectedTrack, historyData, audits, agentHistories]);

  // Filtered agents for table
  const filteredAgents = useMemo(() => {
    if (!searchQuery.trim()) return agentHistories;
    const q = searchQuery.toLowerCase();
    return agentHistories.filter(
      (a) => a.agentName.toLowerCase().includes(q) || a.role.toLowerCase().includes(q)
    );
  }, [agentHistories, searchQuery]);

  // Mini-trend bar helper for table
  const renderMiniTrend = (history: AgentHistoricalPoint[]) => {
    if (!history || history.length === 0) {
      return <span className="no-trend">—</span>;
    }
    const lastPoints = history.slice(-5);
    return (
      <div
        className="agent-mini-trend"
        title={`Historique récent : ${lastPoints.map((p) => `${p.score}%`).join(' → ')}`}
      >
        {lastPoints.map((pt, idx) => {
          const height = Math.max(4, Math.round((pt.score / 100) * 16));
          const color = pt.score >= optimalThreshold ? '#00E5C8' : pt.score >= criticalThreshold ? '#FFA502' : '#FF4757';
          return (
            <div
              key={idx}
              className="trend-bar"
              style={{ height: `${height}px`, backgroundColor: color }}
            />
          );
        })}
      </div>
    );
  };

  // Custom Apple-style Recharts Tooltip
  const CustomChartTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null;
    const pt = payload[0].payload as ChartPointItem;
    const scoreVal = pt.score;
    const isOptimal = scoreVal >= optimalThreshold;
    const isWarning = scoreVal >= criticalThreshold && scoreVal < optimalThreshold;

    return (
      <div className="chart-apple-tooltip">
        <div className="tooltip-top-row">
          <span className="tooltip-date font-mono">{pt.fullDate || pt.label}</span>
          <span
            className={`tooltip-status-pill ${isOptimal ? 'optimal' : isWarning ? 'warning' : 'critical'}`}
          >
            {isOptimal ? 'Optimal' : isWarning ? 'À surveiller' : 'Critique'}
          </span>
        </div>

        <div className="tooltip-score-row">
          <span className="tooltip-score font-mono">{scoreVal}%</span>
          {pt.delta !== undefined && pt.delta !== null && pt.delta !== 0 && (
            <span
              className={`tooltip-delta font-mono ${pt.delta > 0 ? 'pos' : 'neg'}`}
            >
              {pt.delta > 0 ? `+${pt.delta}%` : `${pt.delta}%`}
            </span>
          )}
        </div>

        {pt.triggerType && (
          <div className="tooltip-trigger-row">
            <span className="label">Type :</span>
            <span className="val">
              {pt.triggerType === 'AUTOPILOT' ? 'Autopilot (Planifié)' : 'Audit Flash'}
            </span>
          </div>
        )}

        {pt.summary && <p className="tooltip-summary">{pt.summary}</p>}
      </div>
    );
  };

  // Empty state if zero audits and zero agent histories
  if (audits.length === 0 && agentHistories.length === 0) {
    return (
      <div className="supervisor-history-journal">
        <div className="journal-header">
          <div className="header-text">
            <h2 className="journal-title">Historique & Progression</h2>
            <p className="journal-subtitle">
              Traçabilité et journal chronologique des audits de conformité de votre flotte commerciale.
            </p>
          </div>
          <div className="header-actions">
            {onRunAuditNow && (
              <button
                className="journal-primary-btn"
                onClick={onRunAuditNow}
                disabled={isRunningAudit || isLoading}
              >
                <Zap size={14} className={isRunningAudit ? 'spin-icon' : ''} />
                <span>{isRunningAudit ? 'Audit en cours…' : 'Lancer un audit flash'}</span>
              </button>
            )}
            <button
              className="journal-icon-btn"
              onClick={onRefresh}
              disabled={isLoading}
              title="Actualiser"
            >
              <RotateCw size={14} className={isLoading ? 'spin-icon' : ''} />
            </button>
          </div>
        </div>

        <div
          className="journal-empty-card"
          style={
            tutorialStep >= 6 && tutorialStep <= 8
              ? {
                  position: 'relative',
                  zIndex: 10003,
                  boxShadow: '0 0 0 2px #00E5C8, 0 0 35px rgba(0, 229, 200, 0.45)',
                  borderRadius: '16px',
                }
              : undefined
          }
        >
          {tutorialStep >= 6 && tutorialStep <= 8 && (
            <div
              style={{
                position: 'absolute',
                top: '-44px',
                left: '50%',
                marginLeft: '-8px',
                zIndex: 10004,
              }}
            >
              <VMindGuideArrow direction="down" color="#00E5C8" />
            </div>
          )}
          <Calendar size={28} className="empty-icon" />
          <h3 className="empty-title">Aucun audit enregistré</h3>
          <p className="empty-desc">
            Lancez un audit flash ou activez l'autopilot pour enregistrer des sessions de contrôle de conformité.
          </p>
          {onRunAuditNow && (
            <button
              className="journal-primary-btn"
              onClick={onRunAuditNow}
              disabled={isRunningAudit || isLoading}
            >
              <Zap size={14} />
              <span>Démarrer le premier audit</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  // Summary counts
  const successfulCount = audits.filter((a) => a.status === 'SUCCESS').length;
  const failCount = audits.filter((a) => a.status === 'FAIL').length;
  const latestAudit = audits[0];

  return (
    <div className="supervisor-history-journal">
      {/* ── 1. Header ── */}
      <div className="journal-header">
        <div className="header-text">
          <h2 className="journal-title">Historique & Progression</h2>
          <p className="journal-subtitle">
            Évolution chronologique et impact des recommandations sur la conformité de la flotte.
          </p>
        </div>

        <div className="header-actions">
          {historyData.latestScore !== null && (
            <div className="latest-score-capsule">
              <span className="dot" />
              <span className="score font-mono">{historyData.latestScore}%</span>
              <span className="label">Conformité Actuelle</span>
            </div>
          )}

          {onRunAuditNow && (
            <button
              className="journal-primary-btn"
              onClick={onRunAuditNow}
              disabled={isRunningAudit || isLoading}
            >
              <Zap size={14} className={isRunningAudit ? 'spin-icon' : ''} />
              <span>{isRunningAudit ? 'Audit en cours…' : 'Lancer un audit flash'}</span>
            </button>
          )}

          <button
            className="journal-icon-btn"
            onClick={onRefresh}
            disabled={isLoading}
            title="Actualiser les données"
          >
            <RotateCw size={14} className={isLoading ? 'spin-icon' : ''} />
          </button>
        </div>
      </div>

      {/* ── 2. Top Summary Ribbon ── */}
      <div className="journal-summary-ribbon">
        <div className="summary-item">
          <span className="summary-label">Dernier Audit</span>
          <span className="summary-value font-mono">
            {latestAudit ? formatRelativeTime(latestAudit.timestamp) : '—'}
          </span>
          <span className="summary-sub">
            {latestAudit ? formatDateFull(latestAudit.timestamp) : ''}
          </span>
        </div>

        <div className="summary-item">
          <span className="summary-label">Conformité Actuelle</span>
          <span className="summary-value font-mono text-cyan">
            {historyData.latestScore !== null ? `${historyData.latestScore}%` : '—'}
          </span>
          <span className="summary-sub">
            {latestAudit?.healthyCount !== undefined
              ? `${latestAudit.healthyCount} optimaux • ${latestAudit.warningCount || 0} à surveiller`
              : 'Flotte supervisée'}
          </span>
        </div>

        <div className="summary-item">
          <span className="summary-label">Sessions Enregistrées</span>
          <span className="summary-value font-mono">{audits.length}</span>
          <span className="summary-sub">
            {successfulCount} validées{failCount > 0 ? ` • ${failCount} échec` : ''}
          </span>
        </div>

        <div className="summary-item">
          <span className="summary-label">Agents Supervisés</span>
          <span className="summary-value font-mono">{agentHistories.length}</span>
          <span className="summary-sub">
            {agentHistories.filter((a) => a.currentScore >= optimalThreshold).length} alignés
          </span>
        </div>
      </div>

      {/* ── 3. Interactive Progression Chart Card ── */}
      <div
        ref={chartCardRef}
        className="progression-chart-card"
        style={
          tutorialStep === 6
            ? {
                position: 'relative',
                zIndex: 10003,
                boxShadow: '0 0 0 1px rgba(0, 229, 200, 0.35), 0 0 35px rgba(0, 229, 200, 0.25)',
                borderRadius: '16px',
              }
            : undefined
        }
      >
        <div className="chart-card-top-bar">
          {/* Apple Pro Custom Glass Dropdown */}
          <div
            className="track-dropdown-wrapper"
            ref={dropdownRef}
            style={{ position: 'relative' }}
          >
            {tutorialStep === 6 && (
              <div
                style={{
                  position: 'absolute',
                  top: '-44px',
                  left: '50%',
                  marginLeft: '-8px',
                  zIndex: 10006,
                }}
              >
                <VMindGuideArrow direction="down" color="#00E5C8" />
              </div>
            )}
            <button
              type="button"
              className={`track-dropdown-trigger ${isDropdownOpen ? 'is-open' : ''}`}
              onClick={() => setIsDropdownOpen((prev) => !prev)}
              aria-haspopup="listbox"
              aria-expanded={isDropdownOpen}
              title={
                selectedTrack === 'fleet'
                  ? "Affichage actuel : Flotte Consolidée (moyenne globale). Cliquez pour filtrer par agent spécifique."
                  : `Affichage actuel : ${currentAgentName}. Cliquez pour basculer vers un autre agent ou revenir à la flotte globale.`
              }
              style={
                tutorialStep === 6
                  ? {
                      position: 'relative',
                      zIndex: 10005,
                      boxShadow: '0 0 0 2px #00E5C8, 0 0 22px rgba(0, 229, 200, 0.75)',
                      borderColor: '#00E5C8',
                      background: 'rgba(6, 17, 31, 0.95)',
                    }
                  : undefined
              }
            >
              <div className="trigger-left">
                {selectedTrack === 'fleet' ? (
                  <Globe size={15} className="trigger-icon text-cyan" />
                ) : (
                  <Bot size={15} className="trigger-icon text-indigo" />
                )}
                <span className="trigger-label">{currentAgentName}</span>
                {currentTrackMeta.currentScore !== null && (
                  <span className="trigger-score-pill font-mono">
                    {currentTrackMeta.currentScore}%
                  </span>
                )}
              </div>

              <ChevronDown
                size={14}
                className={`trigger-chevron ${isDropdownOpen ? 'rotate-180' : ''}`}
              />
            </button>

            {isDropdownOpen && (
              <div className="apple-dropdown-menu" role="listbox">
                {/* Global Fleet Option */}
                <div
                  className={`apple-menu-item ${selectedTrack === 'fleet' ? 'is-selected' : ''}`}
                  onClick={() => {
                    setSelectedTrack('fleet');
                    setIsDropdownOpen(false);
                  }}
                  role="option"
                  aria-selected={selectedTrack === 'fleet'}
                >
                  <div className="item-left">
                    <Globe size={14} className="item-icon text-cyan" />
                    <div className="item-text">
                      <span className="item-title">Conformité Globale de la Flotte</span>
                      <span className="item-sub">Vue synthétique de tous les audits</span>
                    </div>
                  </div>

                  <div className="item-right">
                    {historyData.latestScore !== null && (
                      <span className="item-score font-mono">{historyData.latestScore}%</span>
                    )}
                    {selectedTrack === 'fleet' && <Check size={14} className="item-check" />}
                  </div>
                </div>

                {/* Sourcing Agents Group */}
                {sourcingAgents.length > 0 && (
                  <>
                    <div className="apple-menu-section-header">
                      <span>Agents de Sourcing ({sourcingAgents.length})</span>
                    </div>
                    {sourcingAgents.map((agent) => {
                      const isSelected = selectedTrack === agent.agentUuid || selectedTrack === agent.agentId;
                      return (
                        <div
                          key={agent.agentUuid}
                          className={`apple-menu-item ${isSelected ? 'is-selected' : ''}`}
                          onClick={() => {
                            setSelectedTrack(agent.agentUuid);
                            setIsDropdownOpen(false);
                          }}
                          role="option"
                          aria-selected={isSelected}
                        >
                          <div className="item-left">
                            <span className="role-dot sourcing" />
                            <div className="item-text">
                              <span className="item-title">{agent.agentName}</span>
                              <span className="item-sub font-mono">{agent.evaluationsCount} analyses</span>
                            </div>
                          </div>

                          <div className="item-right">
                            <span className="item-score font-mono">{agent.currentScore}%</span>
                            {isSelected && <Check size={14} className="item-check" />}
                          </div>
                        </div>
                      );
                    })}
                  </>
                )}

                {/* Prospect Agents Group */}
                {prospectAgents.length > 0 && (
                  <>
                    <div className="apple-menu-section-header">
                      <span>Agents de Prospection ({prospectAgents.length})</span>
                    </div>
                    {prospectAgents.map((agent) => {
                      const isSelected = selectedTrack === agent.agentUuid || selectedTrack === agent.agentId;
                      return (
                        <div
                          key={agent.agentUuid}
                          className={`apple-menu-item ${isSelected ? 'is-selected' : ''}`}
                          onClick={() => {
                            setSelectedTrack(agent.agentUuid);
                            setIsDropdownOpen(false);
                          }}
                          role="option"
                          aria-selected={isSelected}
                        >
                          <div className="item-left">
                            <span className="role-dot prospect" />
                            <div className="item-text">
                              <span className="item-title">{agent.agentName}</span>
                              <span className="item-sub font-mono">{agent.evaluationsCount} analyses</span>
                            </div>
                          </div>

                          <div className="item-right">
                            <span className="item-score font-mono">{agent.currentScore}%</span>
                            {isSelected && <Check size={14} className="item-check" />}
                          </div>
                        </div>
                      );
                    })}
                  </>
                )}
              </div>
            )}
          </div>

          {/* Right Controls: Time Range Presets + Live Score Badge */}
          <div className="chart-controls-right">
            {/* Time range presets: 7J | 30J | 90J | Tout */}
            <div className="time-range-segmented-control">
              {(['7d', '30d', '90d', 'all'] as const).map((preset) => (
                <button
                  key={preset}
                  type="button"
                  className={`range-btn ${timeRange === preset ? 'active' : ''}`}
                  onClick={() => setTimeRange(preset)}
                >
                  {preset === '7d' ? '7J' : preset === '30d' ? '30J' : preset === '90d' ? '90J' : 'Tout'}
                </button>
              ))}
            </div>

            {/* Current Track Stat Badge */}
            {currentTrackMeta.currentScore !== null && (
              <div className="track-score-badge">
                <span className="score-num font-mono">{currentTrackMeta.currentScore}%</span>
                {currentTrackMeta.scoreDelta !== null && currentTrackMeta.scoreDelta !== undefined && (
                  <span
                    className={`delta-tag font-mono ${
                      currentTrackMeta.scoreDelta > 0
                        ? 'pos'
                        : currentTrackMeta.scoreDelta < 0
                        ? 'neg'
                        : 'neu'
                    }`}
                  >
                    {currentTrackMeta.scoreDelta > 0
                      ? `+${currentTrackMeta.scoreDelta}%`
                      : `${currentTrackMeta.scoreDelta}%`}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Recharts Area Container with Smart Axis Throttling */}
        <div className="chart-render-wrapper">
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart
                data={chartData}
                margin={{ top: 14, right: 20, bottom: 6, left: -20 }}
              >
                <defs>
                  <linearGradient id="scoreAreaGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#00E5C8" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="#00E5C8" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  stroke="rgba(255, 255, 255, 0.05)"
                  vertical={false}
                  strokeDasharray="3 3"
                />
                <XAxis
                  dataKey="label"
                  stroke="#64748B"
                  fontSize={11}
                  tickLine={false}
                  axisLine={{ stroke: 'rgba(255, 255, 255, 0.08)' }}
                  interval={Math.max(0, Math.floor(chartData.length / 5))}
                  minTickGap={30}
                />
                <YAxis
                  domain={[0, 100]}
                  ticks={[0, 25, 50, 75, 100]}
                  stroke="#64748B"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `${v}%`}
                />
                <Tooltip content={<CustomChartTooltip />} />
                {showOptimalLine && (
                  <ReferenceLine
                    y={optimalThreshold}
                    stroke="rgba(0, 229, 200, 0.3)"
                    strokeDasharray="4 4"
                    label={{
                      value: `Seuil optimal (${optimalThreshold}%)`,
                      fill: '#00E5C8',
                      fontSize: 10,
                      position: 'insideTopRight',
                    }}
                  />
                )}
                <Area
                  type="monotone"
                  dataKey="score"
                  stroke="#00E5C8"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#scoreAreaGradient)"
                  dot={{ r: 3.5, fill: '#00E5C8', stroke: '#080E18', strokeWidth: 1.5 }}
                  activeDot={{ r: 5.5, fill: '#00E5C8', stroke: '#06111F', strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="chart-empty-placeholder">
              <Activity size={24} className="placeholder-icon" />
              <span>Aucune donnée chronologique enregistrée pour cette sélection</span>
            </div>
          )}
        </div>

        {/* Subtle long-term bucketing footnote when downsampling is active */}
        {isDownsampled && (
          <div className="chart-footnote">
            <span>
              * Données consolidées pour optimiser la lisibilité ({totalRawCount} évaluations sur {rangeSpanDays} jours)
            </span>
          </div>
        )}
      </div>

      {/* ── 4. Scalable Agents Performance Matrix (Scales for 3 to 50+ agents) ── */}
      <div
        ref={matrixCardRef}
        className="agents-matrix-card"
        style={
          tutorialStep === 7
            ? {
                position: 'relative',
                zIndex: 10003,
                boxShadow: '0 0 0 2px #00E5C8, 0 0 35px rgba(0, 229, 200, 0.45)',
                borderRadius: '16px',
              }
            : undefined
        }
      >
        {tutorialStep === 7 && (
          <div
            style={{
              position: 'absolute',
              top: '-44px',
              left: '50%',
              marginLeft: '-8px',
              zIndex: 10004,
            }}
          >
            <VMindGuideArrow direction="down" color="#00E5C8" />
          </div>
        )}
        <div className="matrix-card-header">
          <div className="matrix-header-left">
            <Users size={16} className="section-icon" />
            <div className="titles">
              <h3 className="matrix-title">Évolution Individuelle des Agents</h3>
              <span className="matrix-sub">
                {agentHistories.length} agent{agentHistories.length > 1 ? 's' : ''} dans la flotte
                commerciale
              </span>
            </div>
          </div>

          {agentHistories.length > 4 && (
            <div className="matrix-search-box">
              <Search size={14} className="search-icon" />
              <input
                type="text"
                placeholder="Filtrer un agent…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="matrix-search-input"
              />
            </div>
          )}
        </div>

        <div className="matrix-table-container">
          <table className="matrix-table">
            <thead>
              <tr>
                <th style={{ width: '34%' }}>Agent</th>
                <th style={{ width: '14%' }}>Score Actuel</th>
                <th style={{ width: '14%' }}>Évolution</th>
                <th style={{ width: '16%' }}>Tendance Récente</th>
                <th style={{ width: '12%' }}>Volume</th>
                <th style={{ width: '10%', textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredAgents.map((agent: AgentHistoryTrack) => {
                const isSelected = selectedTrack === agent.agentUuid;
                const isSourcing = agent.role === 'sourcing';
                const score = agent.currentScore;
                const isOptimal = score >= optimalThreshold;
                const isWarning = score >= criticalThreshold && score < optimalThreshold;

                return (
                  <tr
                    key={agent.agentUuid}
                    className={`matrix-row ${isSelected ? 'is-selected' : ''}`}
                    onClick={() => setSelectedTrack(agent.agentUuid)}
                  >
                    {/* Agent Name & Role */}
                    <td className="agent-identity-cell">
                      <div className="name-wrapper">
                        <span className="agent-name-text">{agent.agentName}</span>
                        <span className={`role-tag ${isSourcing ? 'sourcing' : 'prospect'}`}>
                          {isSourcing ? 'Sourcing' : 'Prospection'}
                        </span>
                      </div>
                    </td>

                    {/* Current Score */}
                    <td className="score-cell">
                      <div className="score-val-block">
                        <span
                          className={`score-dot ${isOptimal ? 'optimal' : isWarning ? 'warning' : 'critical'}`}
                        />
                        <span className="score-num font-mono">{score}%</span>
                      </div>
                    </td>

                    {/* Score Evolution / Delta */}
                    <td className="delta-cell">
                      {agent.scoreDelta !== null && agent.scoreDelta !== undefined ? (
                        <div
                          className={`delta-badge font-mono ${
                            agent.scoreDelta > 0 ? 'pos' : agent.scoreDelta < 0 ? 'neg' : 'neu'
                          }`}
                        >
                          {agent.scoreDelta > 0 ? (
                            <TrendingUp size={12} />
                          ) : agent.scoreDelta < 0 ? (
                            <TrendingDown size={12} />
                          ) : (
                            <Minus size={12} />
                          )}
                          <span>
                            {agent.scoreDelta > 0
                              ? `+${agent.scoreDelta}%`
                              : `${agent.scoreDelta}%`}
                          </span>
                        </div>
                      ) : (
                        <span className="delta-neu font-mono">—</span>
                      )}
                    </td>

                    {/* Mini Sparkline / Trend */}
                    <td className="trend-cell">{renderMiniTrend(agent.history)}</td>

                    {/* Evaluations Count */}
                    <td className="volume-cell">
                      <span className="volume-badge font-mono">
                        {agent.evaluationsCount} analyse{agent.evaluationsCount > 1 ? 's' : ''}
                      </span>
                    </td>

                    {/* Action */}
                    <td className="action-cell">
                      <button
                        className={`inspect-btn ${isSelected ? 'active' : ''}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedTrack(agent.agentUuid);
                        }}
                        title="Voir la courbe dans le graphique"
                      >
                        <span>{isSelected ? 'Affiché' : 'Inspecter'}</span>
                        <ArrowUpRight size={13} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── 5. Chronological Audit Sessions Timeline ── */}
      <div
        ref={sessionsCardRef}
        className="sessions-section-container"
        style={
          tutorialStep === 8
            ? {
                position: 'relative',
                zIndex: 10003,
                boxShadow: '0 0 0 2px #00E5C8, 0 0 35px rgba(0, 229, 200, 0.45)',
                borderRadius: '16px',
              }
            : undefined
        }
      >
        {tutorialStep === 8 && (
          <div
            style={{
              position: 'absolute',
              top: '-44px',
              left: '50%',
              marginLeft: '-8px',
              zIndex: 10004,
            }}
          >
            <VMindGuideArrow direction="down" color="#00E5C8" />
          </div>
        )}
        <div className="sessions-section-header">
          <div className="left">
            <Calendar size={16} className="section-icon" />
            <h3 className="sessions-title">Journal des Sessions d'Audit</h3>
            <span className="sessions-count font-mono">
              {filteredAudits.length} session{filteredAudits.length > 1 ? 's' : ''}
              {filteredAudits.length !== audits.length && ` (sur ${audits.length})`}
            </span>
          </div>

          {/* Scalable Interactive Filter Group */}
          <div className="sessions-filter-toolbar">
            <div className="filter-pill-group">
              <button
                type="button"
                className={`filter-pill-btn ${sessionStatusFilter === 'ALL' ? 'active' : ''}`}
                onClick={() => setSessionStatusFilter('ALL')}
              >
                Tous ({sessionStats.total})
              </button>
              <button
                type="button"
                className={`filter-pill-btn is-success ${sessionStatusFilter === 'SUCCESS' ? 'active' : ''}`}
                onClick={() => setSessionStatusFilter('SUCCESS')}
              >
                <span className="filter-dot dot-success" />
                Succès ({sessionStats.success})
              </button>
              {sessionStats.fail > 0 && (
                <button
                  type="button"
                  className={`filter-pill-btn is-fail ${sessionStatusFilter === 'FAIL' ? 'active' : ''}`}
                  onClick={() => setSessionStatusFilter('FAIL')}
                >
                  <span className="filter-dot dot-fail" />
                  Échecs ({sessionStats.fail})
                </button>
              )}
            </div>

            <div className="filter-pill-group">
              <button
                type="button"
                className={`filter-pill-btn ${sessionTriggerFilter === 'ALL' ? 'active' : ''}`}
                onClick={() => setSessionTriggerFilter('ALL')}
              >
                Tous types
              </button>
              <button
                type="button"
                className={`filter-pill-btn ${sessionTriggerFilter === 'AUTOPILOT' ? 'active' : ''}`}
                onClick={() => setSessionTriggerFilter('AUTOPILOT')}
              >
                Autopilot ({sessionStats.autopilot})
              </button>
              <button
                type="button"
                className={`filter-pill-btn ${sessionTriggerFilter === 'MANUAL' ? 'active' : ''}`}
                onClick={() => setSessionTriggerFilter('MANUAL')}
              >
                Flash ({sessionStats.manual})
              </button>
            </div>
          </div>
        </div>

        <div className="timeline-container">
          {filteredAudits.length === 0 ? (
            <div className="empty-filtered-sessions">
              <div className="empty-filter-icon">
                <Filter size={18} />
              </div>
              <p className="empty-filter-title">Aucune session d'audit ne correspond à vos filtres</p>
              <button
                type="button"
                className="reset-filters-btn"
                onClick={() => {
                  setSessionStatusFilter('ALL');
                  setSessionTriggerFilter('ALL');
                }}
              >
                Réinitialiser les filtres
              </button>
            </div>
          ) : (
            visibleAudits.map((audit) => {
              const isExpanded = Boolean(expandedIds[audit.id]);
              const isSuccess = audit.status === 'SUCCESS';
              const isAutopilot = audit.triggerType === 'AUTOPILOT';

              return (
                <div
                  key={String(audit.id)}
                  className={`audit-session-card ${isSuccess ? 'is-success' : 'is-fail'} ${
                    isExpanded ? 'is-expanded' : ''
                  }`}
                >
                  {/* Clickable Header Row */}
                  <div
                    className="session-header-row"
                    onClick={() => toggleExpand(audit.id)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        toggleExpand(audit.id);
                      }
                    }}
                  >
                    <div className="session-left">
                      <div className="status-indicator">
                        {isSuccess ? (
                          <CheckCircle2 size={18} className="icon-success" />
                        ) : (
                          <AlertTriangle size={18} className="icon-fail" />
                        )}
                      </div>

                      <div className="session-meta">
                        <span className="session-date">{formatDateFull(audit.timestamp)}</span>
                        <span className="session-relative">({formatRelativeTime(audit.timestamp)})</span>
                      </div>

                      <span className={`trigger-badge ${isAutopilot ? 'autopilot' : 'manual'}`}>
                        {isAutopilot ? 'Autopilot (Planifié)' : 'Flash'}
                      </span>
                    </div>

                    <div className="session-right">
                      {isSuccess ? (
                        <div className="session-score-block">
                          <span className="score-pill font-mono">{audit.overallScore}%</span>
                          {audit.scoreDelta !== null &&
                            audit.scoreDelta !== undefined &&
                            audit.scoreDelta !== 0 && (
                              <span
                                className={`delta-tag font-mono ${audit.scoreDelta > 0 ? 'pos' : 'neg'}`}
                              >
                                {audit.scoreDelta > 0
                                  ? `+${audit.scoreDelta}%`
                                  : `${audit.scoreDelta}%`}
                              </span>
                            )}
                        </div>
                      ) : (
                        <span className="fail-pill">Échec</span>
                      )}

                      {audit.nodeSnapshots && audit.nodeSnapshots.length > 0 && (
                        <span className="nodes-count-tag">
                          {audit.nodeSnapshots.length} agents audités
                        </span>
                      )}

                      <div
                        className="chevron-toggle"
                        aria-label={isExpanded ? 'Réduire' : 'Développer'}
                      >
                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </div>
                    </div>
                  </div>

                  {/* Expanded Session Snapshot */}
                  {isExpanded && (
                    <div className="session-body-content">
                      {isSuccess ? (
                        <>
                          {/* 1. Fleet Composition at Audit Time */}
                          {audit.nodeSnapshots && audit.nodeSnapshots.length > 0 && (
                            <div className="snapshot-section">
                              <div className="section-title-row">
                                <Users size={14} className="section-icon" />
                                <h4>État des Agents lors de la Session</h4>
                              </div>

                              <div className="agents-grid">
                                {audit.nodeSnapshots.map((node: AuditNodeSnapshot) => {
                                  const isSourcing = node.agentRole === 'sourcing';
                                  const scoreVal = node.score ?? 0;
                                  const isOptimal = scoreVal >= optimalThreshold;
                                  const isWarning = scoreVal >= criticalThreshold && scoreVal < optimalThreshold;

                                  return (
                                    <div key={node.agentUuid} className="agent-snapshot-card">
                                      <div className="agent-card-header">
                                        <div className="agent-identity">
                                          <span className="agent-name">{node.agentName}</span>
                                          <span
                                            className={`role-pill ${
                                              isSourcing ? 'sourcing' : 'prospect'
                                            }`}
                                          >
                                            {isSourcing ? 'Sourcing' : 'Prospection'}
                                          </span>
                                        </div>

                                        <div className="agent-score-block">
                                          <span className="agent-score font-mono">{scoreVal}%</span>
                                          <span
                                            className={`health-pill ${
                                              isOptimal
                                                ? 'optimal'
                                                : isWarning
                                                ? 'warning'
                                                : 'critical'
                                            }`}
                                          >
                                            {isOptimal
                                              ? 'Optimal'
                                              : isWarning
                                              ? 'À surveiller'
                                              : 'Critique'}
                                          </span>
                                        </div>
                                      </div>

                                      <div className="score-progress-bar">
                                        <div
                                          className="fill"
                                          style={{
                                            width: `${scoreVal}%`,
                                            background: isOptimal
                                              ? '#00E5C8'
                                              : isWarning
                                              ? '#FFA502'
                                              : '#FF4757',
                                          }}
                                        />
                                      </div>

                                      {node.summary && (
                                        <p className="agent-summary-text">{node.summary}</p>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {/* 2. Pipeline Inter-Agent Links */}
                          {audit.linkSnapshots && audit.linkSnapshots.length > 0 && (
                            <div className="snapshot-section">
                              <div className="section-title-row">
                                <Layers size={14} className="section-icon" />
                                <h4>Liaisons et Transferts Inter-Agents</h4>
                              </div>

                              <div className="links-grid">
                                {audit.linkSnapshots.map(
                                  (link: AuditLinkSnapshot, lIdx: number) => (
                                    <div key={lIdx} className="link-snapshot-card">
                                      <div className="link-header">
                                        <div className="link-pipeline-names">
                                          <span className="src">{link.sourceName}</span>
                                          <ArrowRight size={13} className="arrow-icon" />
                                          <span className="tgt">{link.targetName}</span>
                                        </div>
                                        <span className="link-score-pill font-mono">
                                          {link.score}% alignement
                                        </span>
                                      </div>

                                      {link.summary && (
                                        <p className="link-summary-text">{link.summary}</p>
                                      )}
                                    </div>
                                  )
                                )}
                              </div>
                            </div>
                          )}

                          {/* 3. Strategic Recommendations */}
                          {audit.recommendations && audit.recommendations.length > 0 && (
                            <div className="snapshot-section">
                              <div className="section-title-row">
                                <Sparkles size={14} className="section-icon text-cyan" />
                                <h4>Recommandations Stratégiques</h4>
                              </div>

                              <ul className="recommendations-list">
                                {audit.recommendations.map((rec, rIdx) => (
                                  <li key={rIdx} className="rec-item">
                                    <span className="rec-bullet">•</span>
                                    <span className="rec-text">{rec}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {/* 4. Email Digest Status */}
                          {audit.reportSent && (
                            <div className="audit-footer-row">
                              <Mail size={13} className="mail-icon" />
                              <span>Rapport de synthèse envoyé par e-mail</span>
                              {audit.recipientEmail && (
                                <span className="recipient-pill font-mono">
                                  à {audit.recipientEmail}
                                </span>
                              )}
                            </div>
                          )}
                        </>
                      ) : (
                        /* Failure Recovery Box */
                        <div className="failure-diagnostic-box">
                          <div className="failure-header">
                            <AlertTriangle size={18} className="icon-fail" />
                            <h5>L'audit programmé n'a pas pu être finalisé</h5>
                          </div>
                          <p className="failure-message">
                            {audit.errorMessage ||
                              audit.summaryMessage ||
                              "Une indisponibilité temporaire est survenue lors de l'exécution automatique."}
                          </p>
                          {onRunAuditNow && (
                            <button
                              type="button"
                              className="retry-audit-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                onRunAuditNow();
                              }}
                              disabled={isRunningAudit || isLoading}
                            >
                              <Zap size={13} />
                              <span>Relancer l'audit manuellement</span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* ── Scalable Progressive Pagination Controller ── */}
        {filteredAudits.length > INITIAL_VISIBLE_COUNT && (
          <div className="sessions-pagination-controller">
            <div className="pagination-count-label">
              Affichage de <span className="count-num font-mono">{visibleAudits.length}</span> sur{' '}
              <span className="count-num font-mono">{filteredAudits.length}</span> sessions
            </div>

            <div className="pagination-button-group">
              {visibleCount < filteredAudits.length && (
                <button
                  type="button"
                  className="pagination-btn load-more-btn"
                  onClick={() => setVisibleCount((prev) => Math.min(prev + 15, filteredAudits.length))}
                >
                  Afficher 15 sessions de plus
                </button>
              )}

              {visibleCount < filteredAudits.length && filteredAudits.length - visibleCount <= 60 && (
                <button
                  type="button"
                  className="pagination-btn show-all-btn"
                  onClick={() => setVisibleCount(filteredAudits.length)}
                >
                  Tout afficher ({filteredAudits.length})
                </button>
              )}

              {visibleCount > INITIAL_VISIBLE_COUNT && (
                <button
                  type="button"
                  className="pagination-btn collapse-btn"
                  onClick={() => setVisibleCount(INITIAL_VISIBLE_COUNT)}
                >
                  Réduire aux 15 plus récentes
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
