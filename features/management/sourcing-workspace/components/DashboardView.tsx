'use client';

import React from 'react';
import { Users, TrendingUp, Building2, Calendar, PauseCircle, Search, CheckCircle2, Activity, Clock, Zap, Bot, ExternalLink, Target, AlertTriangle } from 'lucide-react';

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
}

function parseHourString(rawHour: any): string {
  if (rawHour === undefined || rawHour === null || rawHour === '') return '08';
  const str = String(rawHour).trim().toLowerCase();
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
  threshold = 60
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
      return {
        uuid: t,
        name: String(t),
        status: 'stopped',
        is_executing: false,
        schedule_id: null
      };
    });
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
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>

        {/* KPI 1 */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(8, 20, 38, 0.7) 0%, rgba(15, 30, 55, 0.5) 100%)',
          border: '1px solid rgba(0, 229, 200, 0.2)',
          borderRadius: '16px',
          padding: '20px 24px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.2)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Candidats Sourcés
            </span>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(0, 229, 200, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#00E5C8' }}>
              <Users size={18} />
            </div>
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#F0F4F8', lineHeight: 1.2 }}>
            {totalLeads}
          </div>
          <div style={{ fontSize: '12px', color: '#00E5C8', marginTop: '6px', fontWeight: 500 }}>
            Total des leads trouvés
          </div>
        </div>

        {/* KPI 2 */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(8, 20, 38, 0.7) 0%, rgba(15, 30, 55, 0.5) 100%)',
          border: '1px solid rgba(0, 229, 200, 0.15)',
          borderRadius: '16px',
          padding: '20px 24px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.2)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Leads ce Mois
            </span>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(0, 184, 217, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#00B8D9' }}>
              <TrendingUp size={18} />
            </div>
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#F0F4F8', lineHeight: 1.2 }}>
            {leadsThisMonth}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '6px' }}>
            Extaits au cours des 30 derniers jours
          </div>
        </div>

        {/* KPI 3 */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(8, 20, 38, 0.7) 0%, rgba(15, 30, 55, 0.5) 100%)',
          border: '1px solid rgba(0, 229, 200, 0.15)',
          borderRadius: '16px',
          padding: '20px 24px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.2)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Leads Aujourd'hui
            </span>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(54, 179, 126, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#36B37E' }}>
              <Calendar size={18} />
            </div>
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#F0F4F8', lineHeight: 1.2 }}>
            {leadsToday}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '6px' }}>
            Dernières extractions du jour
          </div>
        </div>

        {/* KPI 4 */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(8, 20, 38, 0.7) 0%, rgba(15, 30, 55, 0.5) 100%)',
          border: '1px solid rgba(0, 229, 200, 0.15)',
          borderRadius: '16px',
          padding: '20px 24px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.2)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Entreprises Ciblées
            </span>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(101, 84, 192, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6554C0' }}>
              <Building2 size={18} />
            </div>
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#F0F4F8', lineHeight: 1.2 }}>
            {uniqueCompaniesCount}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '6px' }}>
            Entreprises uniques prospectées
          </div>
        </div>

      </div>

      {/* Agent Performance Section: 30-Day Line/Area Chart */}
      <div style={{
        background: 'rgba(8, 20, 38, 0.6)',
        border: '1px solid var(--border)',
        borderRadius: '18px',
        padding: '24px',
        boxShadow: '0 12px 32px rgba(0,0,0,0.2)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#F0F4F8', margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
              <TrendingUp size={20} color="#00E5C8" />
              <span>Performance de l'Agent — Leads Trouvés par Jour (30 Derniers Jours)</span>
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--muted)', margin: '4px 0 0 0' }}>
              Évolution quotidienne des profils sourcés et extraits par l'IA
            </p>
          </div>
          <div style={{ padding: '6px 14px', borderRadius: '20px', background: 'rgba(0, 229, 200, 0.1)', border: '1px solid rgba(0, 229, 200, 0.3)', color: '#00E5C8', fontSize: '12px', fontWeight: 600 }}>
            {leadsThisMonth} leads ce mois
          </div>
        </div>

        {/* Chart Container */}
        <div style={{ height: '260px', width: '100%', position: 'relative' }}>
          <svg width="100%" height="100%" viewBox="0 0 1000 240" preserveAspectRatio="none">
            <defs>
              <linearGradient id="sourcingAreaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#00E5C8" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#00E5C8" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Grid lines */}
            <line x1="30" y1="30" x2="970" y2="30" stroke="rgba(255, 255, 255, 0.05)" strokeWidth="1" />
            <line x1="30" y1="80" x2="970" y2="80" stroke="rgba(255, 255, 255, 0.05)" strokeWidth="1" />
            <line x1="30" y1="130" x2="970" y2="130" stroke="rgba(255, 255, 255, 0.05)" strokeWidth="1" />
            <line x1="30" y1="180" x2="970" y2="180" stroke="rgba(255, 255, 255, 0.1)" strokeWidth="1.5" />

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
      <div style={{
        background: 'linear-gradient(145deg, rgba(6, 17, 31, 0.85) 0%, rgba(10, 25, 46, 0.65) 100%)',
        border: '1px solid rgba(0, 229, 200, 0.22)',
        borderRadius: '20px',
        padding: '24px 28px',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.35)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Subtle Ambient Top Border Beam */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: '10%',
          right: '10%',
          height: '1px',
          background: 'linear-gradient(90deg, transparent, #00E5C8, transparent)',
          opacity: 0.6
        }} />

        {/* Section Header & Flow Indicator */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{
              width: 38,
              height: 38,
              borderRadius: 10,
              background: 'rgba(0, 229, 200, 0.12)',
              border: '1px solid rgba(0, 229, 200, 0.35)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#00E5C8',
              boxShadow: '0 0 16px rgba(0, 229, 200, 0.15)'
            }}>
              <Target size={20} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#F0F4F8', margin: 0, letterSpacing: '-0.2px' }}>
                  Target Agents (Destinataires des Leads)
                </h3>
                <span style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  padding: '2px 10px',
                  borderRadius: '12px',
                  background: targetAgentList.length > 0 ? 'rgba(0, 229, 200, 0.12)' : 'rgba(255, 184, 0, 0.12)',
                  color: targetAgentList.length > 0 ? '#00E5C8' : '#FFB800',
                  border: targetAgentList.length > 0 ? '1px solid rgba(0, 229, 200, 0.3)' : '1px solid rgba(255, 184, 0, 0.3)'
                }}>
                  {targetAgentList.length} {targetAgentList.length > 1 ? 'Agents Assignés' : 'Agent Assigné'}
                </span>
              </div>
              <p style={{ fontSize: '13px', color: 'var(--muted)', margin: '3px 0 0 0', lineHeight: 1.4 }}>
                Pipeline de synchronisation automatique : les leads extraits sont instantanément injectés dans ces agents pour qualification IA et prospection.
              </p>
            </div>
          </div>
        </div>

        {/* Empty State vs. Interactive Cards Grid */}
        {targetAgentList.length === 0 ? (
          <div style={{
            padding: '28px',
            borderRadius: '14px',
            background: 'rgba(255, 184, 0, 0.03)',
            border: '1px dashed rgba(255, 184, 0, 0.3)',
            display: 'flex',
            alignItems: 'center',
            gap: 18
          }}>
            <div style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: 'rgba(255, 184, 0, 0.1)',
              border: '1px solid rgba(255, 184, 0, 0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFB800',
              fontSize: 22,
              flexShrink: 0
            }}>
              ⚠️
            </div>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 600, color: '#FFB800' }}>
                Aucun Target Agent configuré
              </div>
              <div style={{ fontSize: '13px', color: 'var(--muted)', marginTop: 4, lineHeight: 1.4 }}>
                Les leads sourcés sont conservés dans votre base centrale mais ne sont pas encore transmis automatiquement à un agent de prospection. Vous pouvez en sélectionner lors du prochain lancement ou dans la planification.
              </div>
            </div>
          </div>
        ) : (
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '16px'
          }}>
            {targetAgentList.map((target, idx) => {
              const isExec = target.is_executing;
              const isPaused = target.status === 'paused';
              const isScheduled = target.schedule_id || target.status === 'running';

              return (
                <div
                  key={idx}
                  style={{
                    flex: '1 1 360px',
                    minWidth: '320px',
                    background: 'linear-gradient(135deg, rgba(8, 20, 38, 0.6) 0%, rgba(13, 27, 48, 0.45) 100%)',
                    border: isExec 
                      ? '1px solid rgba(0, 229, 200, 0.5)' 
                      : '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '14px',
                    padding: '16px 20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '16px',
                    transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                    position: 'relative',
                    backdropFilter: 'blur(12px)',
                    boxShadow: isExec ? '0 0 20px rgba(0, 229, 200, 0.12)' : 'none'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(0, 229, 200, 0.45)';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 8px 24px rgba(0, 229, 200, 0.1)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = isExec ? 'rgba(0, 229, 200, 0.5)' : 'rgba(255, 255, 255, 0.08)';
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = isExec ? '0 0 20px rgba(0, 229, 200, 0.12)' : 'none';
                  }}
                >
                  {/* Left Side: Cyber Avatar + Name + Telemetry */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: 1, minWidth: 0 }}>
                    <div style={{
                      width: 44,
                      height: 44,
                      borderRadius: '11px',
                      background: 'linear-gradient(135deg, rgba(0, 229, 200, 0.15) 0%, rgba(0, 120, 220, 0.15) 100%)',
                      border: '1px solid rgba(0, 229, 200, 0.35)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#00E5C8',
                      fontSize: '20px',
                      flexShrink: 0,
                      boxShadow: 'inset 0 0 12px rgba(0, 229, 200, 0.1)'
                    }}>
                      🤖
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: '14px',
                        fontWeight: 700,
                        color: '#F0F4F8',
                        lineHeight: 1.3
                      }}>
                        {target.name}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
                        <span style={{
                          fontSize: '10px',
                          padding: '2px 7px',
                          borderRadius: 4,
                          background: 'rgba(0, 229, 200, 0.08)',
                          color: '#00E5C8',
                          fontWeight: 600,
                          letterSpacing: '0.4px',
                          textTransform: 'uppercase',
                          border: '1px solid rgba(0, 229, 200, 0.2)'
                        }}>
                          Prospection
                        </span>

                        {/* Status Indicator Pill */}
                        {isExec ? (
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: 5,
                            fontSize: '11px', color: '#00E5C8', fontWeight: 600,
                            animation: 'pulse 1.5s infinite'
                          }}>
                            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#00E5C8', boxShadow: '0 0 6px #00E5C8' }} />
                            En cours
                          </span>
                        ) : isPaused ? (
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: 5,
                            fontSize: '11px', color: '#FFB800', fontWeight: 500
                          }}>
                            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#FFB800' }} />
                            En pause
                          </span>
                        ) : isScheduled ? (
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: 5,
                            fontSize: '11px', color: '#00E5A0', fontWeight: 500
                          }}>
                            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#00E5A0', boxShadow: '0 0 6px #00E5A0' }} />
                            Programmé
                          </span>
                        ) : (
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: 5,
                            fontSize: '11px', color: '#FF4757', fontWeight: 500
                          }}>
                            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#FF4757' }} />
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
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        fontSize: '12px',
                        padding: '8px 14px',
                        borderRadius: '8px',
                        background: 'rgba(255, 255, 255, 0.04)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        color: '#F0F4F8',
                        textDecoration: 'none',
                        fontWeight: 500,
                        transition: 'all 0.2s ease',
                        flexShrink: 0
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'var(--cyan)';
                        e.currentTarget.style.color = '#000';
                        e.currentTarget.style.borderColor = 'var(--cyan)';
                        e.currentTarget.style.boxShadow = '0 0 12px rgba(0, 229, 200, 0.3)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
                        e.currentTarget.style.color = '#F0F4F8';
                        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
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
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '24px' }}>

        {/* Activity Feed */}
        <div style={{
          background: 'rgba(8, 20, 38, 0.6)',
          border: '1px solid var(--border)',
          borderRadius: '18px',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#F0F4F8', margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
              <Activity size={20} color="#00E5C8" />
              <span>Activity Feed</span>
            </h3>
            <span style={{ fontSize: '11px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Temps Réel
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {activityItems.length === 0 ? (
              <div style={{
                padding: '32px 16px',
                textAlign: 'center',
                borderRadius: '14px',
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid var(--border)',
                color: 'var(--muted)',
                fontSize: '13px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px'
              }}>
                <Activity size={28} style={{ opacity: 0.4, color: 'var(--cyan)' }} />
                <span>Aucune activité récente enregistrée pour cet agent.</span>
              </div>
            ) : (
              activityItems.map((item) => {
                const IconComp = item.icon;
                return (
                  <div
                    key={item.id}
                    style={{
                      padding: '16px',
                      borderRadius: '14px',
                      background: 'rgba(255, 255, 255, 0.02)',
                      border: `1px solid ${item.borderColor}`,
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '14px',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <div style={{
                      width: 36,
                      height: 36,
                      borderRadius: '10px',
                      background: item.bgColor,
                      color: item.color,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      <IconComp size={20} color={item.color} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                        <div style={{ fontSize: '14px', fontWeight: 700, color: item.color }}>
                          {item.title}
                        </div>
                        <div
                          title={item.fullTime || item.time}
                          style={{ fontSize: '12px', color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 5, cursor: 'default' }}
                        >
                          <Clock size={12} style={{ opacity: 0.8 }} />
                          <span>{item.time}</span>
                        </div>
                      </div>
                      <div style={{ fontSize: '13px', color: '#F0F4F8', lineHeight: 1.4 }}>
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
        <div style={{
          background: 'linear-gradient(145deg, rgba(8, 20, 38, 0.8) 0%, rgba(15, 30, 55, 0.6) 100%)',
          border: '1px solid rgba(0, 229, 200, 0.15)',
          borderRadius: '18px',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          gap: '20px'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', borderBottom: '1px solid var(--border)', paddingBottom: '16px', marginBottom: '16px' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(0, 229, 200, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(0, 229, 200, 0.25)', color: '#00E5C8' }}>
                <Bot size={24} color="#00E5C8" />
              </div>
              <div>
                <h3 style={{ fontSize: '16px', color: '#F0F4F8', margin: 0, fontWeight: 700 }}>Cerveau Sourcing IA</h3>
                <span style={{ fontSize: '12px', color: 'var(--muted)' }}>Agent de Sourcing Autonome</span>
              </div>
            </div>

            <div>
              <span style={{ fontSize: '11px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>
                Mission Configurée
              </span>
              <p style={{ fontSize: '13px', color: '#F0F4F8', lineHeight: 1.5, marginTop: '8px', fontStyle: 'italic', background: 'rgba(0, 0, 0, 0.25)', padding: '14px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.05)' }}>
                "{agent?.config?.agent_mission || 'Recherche de candidats pertinents et extraction autonome selon les règles définies.'}"
              </p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
            <div style={{ background: 'rgba(0,0,0,0.2)', padding: '14px', borderRadius: '10px', border: '1px solid var(--border)' }}>
              <span style={{ fontSize: '10px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Planification</span>
              <div style={{ fontSize: '13px', color: '#F0F4F8', fontWeight: 600, marginTop: '4px' }}>
                {agent?.schedule_id ? (
                  triggerRuleSummary(agent.trigger_rules || agent.config?.trigger_rules || agent.parameters?.trigger_rules)
                ) : (
                  <span style={{ color: 'var(--muted)', fontWeight: 500 }}>
                    Aucune règle
                  </span>
                )}
              </div>
            </div>

            <div style={{ background: 'rgba(0,0,0,0.2)', padding: '14px', borderRadius: '10px', border: '1px solid var(--border)' }}>
              <span style={{ fontSize: '10px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Statut Autopilote</span>
              <div style={{ fontSize: '13px', fontWeight: 600, marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                {agent?.is_executing ? (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#00E5C8', animation: 'pulse 1.5s infinite' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#00E5C8', boxShadow: '0 0 8px #00E5C8' }}></span>
                    ⚡ En cours...
                  </span>
                ) : agent?.status === 'paused' ? (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#FFB800' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#FFB800' }}></span>
                    En pause
                  </span>
                ) : agent?.schedule_id ? (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#00E5A0' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#00E5A0', boxShadow: '0 0 8px #00E5A0' }}></span>
                    Programmé
                  </span>
                ) : (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#FF4757' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#FF4757' }}></span>
                    Arrêté
                  </span>
                )}
              </div>
            </div>

            <div style={{ background: 'rgba(0,0,0,0.2)', padding: '14px', borderRadius: '10px', border: '1px solid var(--border)' }}>
              <span style={{ fontSize: '10px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Dernière exéc.</span>
              <div style={{ fontSize: '13px', color: '#F0F4F8', fontWeight: 600, marginTop: '4px' }}>
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
