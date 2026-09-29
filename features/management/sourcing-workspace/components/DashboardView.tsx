'use client';

import React from 'react';
import { Users, TrendingUp, Building2, Calendar, PauseCircle, Search, CheckCircle2, Activity, Clock, Zap, Bot, ExternalLink, Target, AlertTriangle } from 'lucide-react';
import { CyberIcon } from '@/shared/management/components/CyberIcon';

interface Lead {
  id: number;
  date_collecte: string;
  date_granted?: string;
  statut?: string;
  entreprise?: string;
  company?: string;
}

interface DashboardViewProps {
  leads: Lead[];
  logs?: any[];
  agent?: any;
  allAgents?: any[];
  threshold?: number;
  onConnectProspect?: () => void;
}

function parseHourString(rawHour: any): string {
  if (rawHour === undefined || rawHour === null || rawHour === '') return '08';
  const str = String(rawHour).trim().toLowerCase();
  if (str === 'noon') return '12';
  if (str === 'midnight') return '00';
  if (str.endsWith('am')) {
    const val = parseInt(str.replace('am', ''), 10);
    return String(isNaN(val) ? 8 : (val === 12 ? 0 : val)).padStart(2, '0');
  }
  if (str.endsWith('pm')) {
    const val = parseInt(str.replace('pm', ''), 10);
    return String(isNaN(val) ? 20 : (val === 12 ? 12 : val + 12)).padStart(2, '0');
  }
  const val = parseInt(str, 10);
  return String(isNaN(val) ? 8 : val).padStart(2, '0');
}

function formatDate(ts?: number | string) {
  if (!ts) return '—';
  let num: number;
  if (typeof ts === 'number') {
    num = ts;
  } else if (!isNaN(Number(ts))) {
    num = Number(ts);
  } else {
    num = new Date(ts).getTime();
  }
  if (isNaN(num) || num <= 0) return '—';
  return new Date(num).toLocaleString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function formatActivityTime(ts?: number | string): { label: string; full: string } {
  if (!ts) return { label: 'Récemment', full: '—' };
  let time: number;
  if (typeof ts === 'number') {
    time = ts;
  } else if (!isNaN(Number(ts))) {
    time = Number(ts);
  } else {
    time = new Date(ts).getTime();
  }
  if (isNaN(time) || time <= 0) return { label: 'Récemment', full: '—' };

  const d = new Date(time);
  const now = new Date();
  const diffMs = Date.now() - time;
  const diffMin = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);

  const exactTime = d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  const full = d.toLocaleString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  });

  const isToday = d.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = d.toDateString() === yesterday.toDateString();

  let relative = '';
  if (diffMin < 1) {
    relative = "À l'instant";
  } else if (diffMin < 60) {
    relative = `Il y a ${diffMin} min`;
  } else if (diffHours < 24 && isToday) {
    relative = `Il y a ${diffHours} h`;
  } else if (isYesterday) {
    relative = 'Hier';
  } else {
    relative = d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
  }

  let label = '';
  if (isToday) {
    label = `${exactTime} (${relative})`;
  } else if (isYesterday) {
    label = `Hier à ${exactTime}`;
  } else {
    label = `${d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })} à ${exactTime}`;
  }

  return { label, full };
}

function triggerRuleSummary(rawRules: any): string {
  let rules = rawRules;
  if (typeof rules === 'string') {
    try { rules = JSON.parse(rules); } catch (e) { }
  }
  if (!rules || !Array.isArray(rules) || rules.length === 0) return 'Manuel / Aucune règle';
  const r = rules[0];
  if (!r || typeof r !== 'object') return 'Manuel / Aucune règle';
  const interval = r.interval;
  const minPad = String(r.triggerAtMinute ?? 0).padStart(2, '0');
  const hourPad = parseHourString(r.triggerAtHour);
  const timeStr = `${hourPad}h${minPad}`;

  const dayNamesFr: Record<string, string> = {
    'Monday': 'Lun', 'Tuesday': 'Mar', 'Wednesday': 'Mer',
    'Thursday': 'Jeu', 'Friday': 'Ven', 'Saturday': 'Sam', 'Sunday': 'Dim',
    'Lundi': 'Lun', 'Mardi': 'Mar', 'Mercredi': 'Mer',
    'Jeudi': 'Jeu', 'Vendredi': 'Ven', 'Samedi': 'Sam', 'Dimanche': 'Dim'
  };

  if (interval === 'Seconds') {
    const step = Number(r.secondsBetween) || 30;
    return step <= 1 ? 'Toutes les secondes' : `Toutes les ${step} s`;
  }
  if (interval === 'Minutes') {
    const step = Number(r.minutesBetween) || 5;
    return step <= 1 ? 'Toutes les minutes' : `Toutes les ${step} min`;
  }
  if (interval === 'Hours') {
    const step = Number(r.hoursBetween) || 1;
    const minInfo = r.triggerAtMinute !== undefined && r.triggerAtMinute !== null ? ` (à min ${minPad})` : '';
    return step <= 1 ? `Chaque heure${minInfo}` : `Toutes les ${step} h${minInfo}`;
  }
  if (interval === 'Days') {
    const step = Number(r.daysBetween) || 1;
    return step <= 1 ? `Chaque jour à ${timeStr}` : `Tous les ${step} jours à ${timeStr}`;
  }
  if (interval === 'Weeks') {
    const step = Number(r.weeksBetween) || 1;
    const rawDays = Array.isArray(r.triggerOnWeekdays) && r.triggerOnWeekdays.length > 0 ? r.triggerOnWeekdays : ['Monday'];
    const days = rawDays.map((d: string) => dayNamesFr[d] || d).join(', ');
    return step <= 1 ? `Hebdo (${days}) à ${timeStr}` : `Toutes les ${step} sem. (${days}) à ${timeStr}`;
  }
  if (interval === 'Months') {
    const step = Number(r.monthsBetween) || 1;
    const dom = r.triggerAtDayOfMonth || 1;
    return step <= 1 ? `Mensuel (le ${dom}) à ${timeStr}` : `Tous les ${step} mois (le ${dom}) à ${timeStr}`;
  }
  return interval || 'Manuel / Aucune règle';
}

const DashboardView: React.FC<DashboardViewProps> = React.memo(({
  leads = [],
  logs = [],
  agent,
  allAgents = [],
  threshold = 60,
  onConnectProspect
}) => {
  const targetAgentList = React.useMemo(() => {
    const rawTargets = agent?.target_agent_ids || agent?.config?.target_agent_ids || [];
    if (!Array.isArray(rawTargets) || rawTargets.length === 0) return [];

    return rawTargets.map(t => {
      const match = allAgents?.find(a => 
        (a.uuid && String(a.uuid).toLowerCase() === String(t).toLowerCase()) ||
        (a.agent_id && String(a.agent_id).toLowerCase() === String(t).toLowerCase()) ||
        (a.agent_name && a.agent_name.toLowerCase() === String(t).toLowerCase()) ||
        (a.nom && a.nom.toLowerCase() === String(t).toLowerCase())
      );
      if (match) {
        return {
          uuid: match.uuid || match.agent_id,
          name: match.agent_name || match.nom,
          status: match.status || (match.schedule_id ? 'running' : 'stopped'),
          is_executing: match.is_executing,
          schedule_id: match.schedule_id
        };
      }
      return null;
    }).filter(Boolean);
  }, [agent, allAgents]);
  // Calculations
  const totalLeads = leads.length;

  const todayStr = new Date().toISOString().split('T')[0];
  const currentMonthStr = new Date().toISOString().substring(0, 7);

  const leadsToday = leads.filter(l => {
    const d = l.date_granted ? l.date_granted.split('T')[0] : (l.date_collecte ? l.date_collecte.split('T')[0] : '');
    return d === todayStr;
  }).length;

  const leadsThisMonth = leads.filter(l => {
    const d = l.date_granted ? l.date_granted.substring(0, 7) : (l.date_collecte ? l.date_collecte.substring(0, 7) : '');
    return d === currentMonthStr;
  }).length;

  const uniqueCompaniesCount = new Set(
    leads.map(l => (l.entreprise || l.company || '').trim().toLowerCase()).filter(Boolean)
  ).size;

  // Timeline of leads collected over last 30 days
  const last30Days = Array(30).fill(0).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (29 - i));
    return d.toISOString().split('T')[0];
  });

  const dailyCounts = last30Days.map(day => {
    return leads.filter(l => {
      const targetDate = l.date_granted ? l.date_granted.split('T')[0] : (l.date_collecte ? l.date_collecte.split('T')[0] : '');
      return targetDate === day;
    }).length;
  });

  const maxDailyVal = Math.max(...dailyCounts, 1);

  // Dynamic Activity Feed State Machine - Shows up to 3 last states
  const activityItems = React.useMemo(() => {
    const items = [];

    // 1. Live State (Only if actively executing right now)
    if (agent?.is_executing) {
      items.push({
        id: 'act-exec',
        title: 'Recherche de Leads',
        time: "En direct...",
        message: 'Recherche et extraction de profils en cours…',
        icon: Zap,
        color: '#00E5C8',
        bgColor: 'rgba(0, 229, 200, 0.12)',
        borderColor: 'rgba(0, 229, 200, 0.3)'
      });
    }

    // 2. Historical States (from logs)
    if (logs && logs.length > 0) {
      // Filter to final states (completed/success/fail/exhausted)
      const completedLogs = logs.filter((l: any) => {
        const st = String(l.statut || l.status || l.type || '').toUpperCase();
        return st === 'COMPLETED' || st === 'SUCCESS' || st === 'FAIL' || st === 'EXHAUSTED';
      });

      for (let i = 0; i < completedLogs.length; i++) {
        if (items.length >= 3) break; // Strictly cap to 3 items max

        const log = completedLogs[i];
        const msg = log.message || log.details || '';
        const details = String(msg).toLowerCase();
        const st = String(log.statut || log.status || '').toUpperCase();

        const timeInfo = formatActivityTime(log.timestamp || log.created_at);

        if (st === 'FAIL') {
          items.push({
            id: `act-hist-${log.id || i}`,
            title: "Échec d'Exécution",
            time: timeInfo.label,
            fullTime: timeInfo.full,
            message: msg || 'Une erreur est survenue lors de l\'exécution du workflow.',
            icon: AlertTriangle,
            color: '#FF4757',
            bgColor: 'rgba(255, 71, 87, 0.12)',
            borderColor: 'rgba(255, 71, 87, 0.3)'
          });
        } else if (st === 'EXHAUSTED') {
          items.push({
            id: `act-hist-${log.id || i}`,
            title: 'Recherche Épuisée',
            time: timeInfo.label,
            fullTime: timeInfo.full,
            message: msg && !msg.toLowerCase().includes('terminé avec succès')
              ? msg
              : 'Ciblage principal épuisé pour les critères définis (0 profil trouvé).',
            icon: Search,
            color: '#FF4757',
            bgColor: 'rgba(255, 71, 87, 0.12)',
            borderColor: 'rgba(255, 71, 87, 0.3)'
          });
        } else {
          items.push({
            id: `act-hist-${log.id || i}`,
            title: 'Recherche de Leads',
            time: timeInfo.label,
            fullTime: timeInfo.full,
            message: msg || 'Recherche et extraction de profils réalisée avec succès.',
            icon: Zap,
            color: '#00E5C8',
            bgColor: 'rgba(0, 229, 200, 0.12)',
            borderColor: 'rgba(0, 229, 200, 0.3)'
          });
        }
      }
    }

    return items;
  }, [agent, logs, leads.length]);

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>

      {/* Header */}
      <div className="view-header" style={{ marginBottom: 0 }}>
        <div className="view-title">
          <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#F0F4F8', margin: 0 }}>
            Tableau de Bord Sourcing
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--muted)', marginTop: '4px' }}>
            Performance de l'agent de sourcing et flux d'activité en temps réel
          </p>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="sourcing-kpi-grid">

        {/* KPI 1 */}
        <div className="sourcing-kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">
              Candidats Sourcés
            </span>
            <div className="kpi-icon-wrapper cyan">
              <Users size={18} />
            </div>
          </div>
          <div className="kpi-value">
            {totalLeads}
          </div>
          <div className="kpi-subtext highlight">
            Total des leads trouvés
          </div>
        </div>

        {/* KPI 2 */}
        <div className="sourcing-kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">
              Leads ce Mois
            </span>
            <div className="kpi-icon-wrapper blue">
              <TrendingUp size={18} />
            </div>
          </div>
          <div className="kpi-value">
            {leadsThisMonth}
          </div>
          <div className="kpi-subtext">
            Extraits au cours des 30 derniers jours
          </div>
        </div>

        {/* KPI 3 */}
        <div className="sourcing-kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">
              Leads Aujourd'hui
            </span>
            <div className="kpi-icon-wrapper green">
              <Calendar size={18} />
            </div>
          </div>
          <div className="kpi-value">
            {leadsToday}
          </div>
          <div className="kpi-subtext">
            Dernières extractions du jour
          </div>
        </div>

        {/* KPI 4 */}
        <div className="sourcing-kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">
              Entreprises Ciblées
            </span>
            <div className="kpi-icon-wrapper purple">
              <Building2 size={18} />
            </div>
          </div>
          <div className="kpi-value">
            {uniqueCompaniesCount}
          </div>
          <div className="kpi-subtext">
            Entreprises uniques prospectées
          </div>
        </div>

      </div>

      {/* Agent Performance Section: 30-Day Line/Area Chart */}
      <div className="sourcing-chart-card">
        <div className="chart-card-header">
          <div className="chart-title-group">
            <h3>
              <TrendingUp size={20} color="#00E5C8" />
              <span>Performance de l'Agent — Leads Trouvés par Jour (30 Derniers Jours)</span>
            </h3>
            <p>
              Évolution quotidienne des profils sourcés et extraits par l'IA
            </p>
          </div>
          <div className="chart-badge">
            {leadsThisMonth} leads ce mois
          </div>
        </div>

        {/* Chart Container */}
        <div className="chart-canvas-container">
          <svg width="100%" height="100%" viewBox="0 0 1000 240" preserveAspectRatio="none">
            <defs>
              <linearGradient id="sourcingAreaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#00E5C8" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#00E5C8" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Grid lines */}
            <line x1="30" y1="30" x2="970" y2="30" stroke="rgba(255, 255, 255, 0.05)" strokeWidth="1" />
            <line x1="30" y1="85" x2="970" y2="85" stroke="rgba(255, 255, 255, 0.05)" strokeWidth="1" />
            <line x1="30" y1="140" x2="970" y2="140" stroke="rgba(255, 255, 255, 0.05)" strokeWidth="1" />
            <line x1="30" y1="195" x2="970" y2="195" stroke="rgba(255, 255, 255, 0.05)" strokeWidth="1" />

            {/* Compute SVG Path */}
            {(() => {
              const xStep = 940 / (dailyCounts.length - 1);
              const points = dailyCounts.map((val, idx) => {
                const x = 30 + idx * xStep;
                const y = 180 - (val / maxDailyVal) * 140;
                return { x, y, val };
              });

              const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
              const areaD = `${pathD} L 970 180 L 30 180 Z`;

              return (
                <>
                  {/* Area Fill */}
                  <path d={areaD} fill="url(#sourcingAreaGrad)" />

                  {/* Line */}
                  <path d={pathD} fill="none" stroke="#00E5C8" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />

                  {/* Highlight Dots for days with leads */}
                  {points.map((p, idx) => {
                    const showLabel = idx % 4 === 0 || p.val > 0 || idx === points.length - 1;
                    return (
                      <g key={idx}>
                        <circle
                          cx={p.x}
                          cy={p.y}
                          r={p.val > 0 ? 5 : 3}
                          fill={p.val > 0 ? '#00E5C8' : 'rgba(255,255,255,0.2)'}
                          stroke="#06111F"
                          strokeWidth="2"
                        />
                        {p.val > 0 && (
                          <text x={p.x} y={p.y - 10} fill="#00E5C8" fontSize="11" textAnchor="middle" fontWeight="bold">
                            {p.val}
                          </text>
                        )}
                        {showLabel && (
                          <text x={p.x} y="202" fill="var(--muted)" fontSize="10" textAnchor="middle">
                            {new Date(last30Days[idx]).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                          </text>
                        )}
                      </g>
                    );
                  })}
                </>
              );
            })()}
          </svg>
        </div>
      </div>

      {/* Target Agents (Lead Pipeline Flow) Section */}
      <div className="target-agents-section">
        {/* Subtle Ambient Top Border Beam */}
        <div className="top-ambient-beam" />

        {/* Section Header & Flow Indicator */}
        <div className="section-header-flow">
          <div className="header-title-flex">
            <div className="header-icon-box">
              <Target size={20} />
            </div>
            <div className="title-meta-group">
              <div className="title-row">
                <h3>
                  Target Agents (Destinataires des Leads)
                </h3>
                <span className={`mode-badge ${targetAgentList.length > 0 ? 'assigned' : 'autonomous'}`}>
                  {targetAgentList.length > 0 
                    ? `${targetAgentList.length} ${targetAgentList.length > 1 ? 'Agents Assignés' : 'Agent Assigné'}`
                    : 'Mode Autonome (0 Agent)'}
                </span>
              </div>
              <p>
                Pipeline de synchronisation automatique : les leads extraits sont instantanément injectés dans ces agents pour qualification IA et prospection.
              </p>
            </div>
          </div>
        </div>

        {/* Empty State vs. Interactive Cards Grid */}
        {targetAgentList.length === 0 ? (
          <div className="standalone-empty-box">
            <div className="empty-icon">
              <CyberIcon name="zap" size={20} color="#38BDF8" />
            </div>
            <div className="empty-content">
              <div className="empty-title">
                Mode Autonome Actif
              </div>
              <div className="empty-desc">
                Pour automatiser l&apos;envoi de vos campagnes d&apos;emails, vous pouvez associer un <strong>Agent de Prospection</strong> lors du prochain lancement ou dans la planification Autopilot.
              </div>
            </div>
            <button
              type="button"
              onClick={onConnectProspect || (() => {
                if (typeof window !== 'undefined') {
                  sessionStorage.setItem('vmind_guide_target_marketplace', 'prospection');
                  sessionStorage.setItem('vmind_current_view', 'market');
                  sessionStorage.setItem('vmind_mode', 'MANAGEMENT');
                }
                window.location.href = '/?view=market';
              })}
              className="connect-prospect-cta"
            >
              <span>Connecter un Agent de Prospection</span>
              <ExternalLink size={13} />
            </button>
          </div>
        ) : (
          <div className="target-agents-grid">
            {targetAgentList.map((target, idx) => {
              if (!target) return null;
              const isExec = target.is_executing;
              const isPaused = target.status === 'paused';
              const isScheduled = target.schedule_id || target.status === 'running';

              return (
                <div
                  key={idx}
                  className={`target-card ${isExec ? 'executing' : ''}`}
                >
                  {/* Left Side: Cyber Avatar + Name + Telemetry */}
                  <div className="target-card-left">
                    <div className="target-robot-avatar">
                      🤖
                    </div>

                    <div className="target-meta">
                      <div className="target-agent-name">
                        {target.name}
                      </div>

                      <div className="target-tag-row">
                        <span className="prospection-tag">
                          Prospection
                        </span>

                        {/* Status Indicator Pill */}
                        {isExec ? (
                          <span className="status-indicator-pill executing">
                            <span className="dot" />
                            En cours
                          </span>
                        ) : isPaused ? (
                          <span className="status-indicator-pill paused">
                            <span className="dot" />
                            En pause
                          </span>
                        ) : isScheduled ? (
                          <span className="status-indicator-pill scheduled">
                            <span className="dot" />
                            Programmé
                          </span>
                        ) : (
                          <span className="status-indicator-pill stopped">
                            <span className="dot" />
                            Arrêté
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right Side: Direct Action Button */}
                  {target.uuid && (
                    <a
                      href={`/prospect-agent-workspace/${target.uuid}`}
                      className="target-link-btn"
                    >
                      <span>Espace</span>
                      <ExternalLink size={13} />
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Bottom Grid: Activity Feed & AI Mission Card */}
      <div className="sourcing-bottom-grid">

        {/* Activity Feed */}
        <div className="activity-feed-card">
          <div className="activity-card-header">
            <h3>
              <Activity size={20} color="#00E5C8" />
              <span>Activity Feed</span>
            </h3>
            <span className="activity-realtime-badge">
              Temps Réel
            </span>
          </div>

          <div className="activity-items-list">
            {activityItems.length === 0 ? (
              <div className="activity-empty-box">
                <Activity size={28} className="empty-icon" />
                <span>Aucune activité récente enregistrée pour cet agent.</span>
              </div>
            ) : (
              activityItems.map((item) => {
                const IconComp = item.icon;
                return (
                  <div
                    key={item.id}
                    className="activity-item-row"
                    style={{ borderColor: item.borderColor }}
                  >
                    <div
                      className="activity-item-icon"
                      style={{ background: item.bgColor, color: item.color }}
                    >
                      <IconComp size={20} color={item.color} />
                    </div>
                    <div className="activity-item-content">
                      <div className="activity-item-title-row">
                        <div className="activity-item-title" style={{ color: item.color }}>
                          {item.title}
                        </div>
                        <div
                          title={item.fullTime || item.time}
                          className="activity-time-badge"
                        >
                          <Clock size={12} />
                          <span>{item.time}</span>
                        </div>
                      </div>
                      <div className="activity-item-msg">
                        {item.message}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* AI Mission & Schedule Card */}
        <div className="ai-mission-card">
          <div>
            <div className="ai-mission-header">
              <div className="ai-bot-avatar">
                <Bot size={24} color="#00E5C8" />
              </div>
              <div>
                <h3>Cerveau Sourcing IA</h3>
                <span>Agent de Sourcing Autonome</span>
              </div>
            </div>

            <div>
              <span className="mission-config-title">
                Mission Configurée
              </span>
              <p className="mission-quote-box">
                "{agent?.config?.agent_mission || 'Recherche de candidats pertinents et extraction autonome selon les règles définies.'}"
              </p>
            </div>
          </div>

          <div className="mission-metrics-row">
            <div className="mission-metric-box">
              <span className="metric-label">Planification</span>
              <div className="metric-val">
                {agent?.schedule_id ? (
                  triggerRuleSummary(agent.trigger_rules || agent.config?.trigger_rules || agent.parameters?.trigger_rules)
                ) : (
                  <span className="muted-text">
                    Aucune règle
                  </span>
                )}
              </div>
            </div>

            <div className="mission-metric-box">
              <span className="metric-label">Statut Autopilote</span>
              <div className="metric-val">
                {agent?.is_executing ? (
                  <span className="status-pill executing">
                    <span className="dot" />
                    ⚡ En cours...
                  </span>
                ) : agent?.status === 'paused' ? (
                  <span className="status-pill paused">
                    <span className="dot" />
                    En pause
                  </span>
                ) : agent?.schedule_id ? (
                  <span className="status-pill scheduled">
                    <span className="dot" />
                    Programmé
                  </span>
                ) : (
                  <span className="status-pill stopped">
                    <span className="dot" />
                    Arrêté
                  </span>
                )}
              </div>
            </div>

            <div className="mission-metric-box">
              <span className="metric-label">Dernière exéc.</span>
              <div className="metric-val">
                {formatDate(agent?.lastExecuted)}
              </div>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
});

export default DashboardView;
