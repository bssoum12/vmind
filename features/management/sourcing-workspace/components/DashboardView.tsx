'use client';

import React from 'react';
import { MiniKpi } from '../../../../components/ui/MiniKpi';

interface Lead {
  id: number;
  date_collecte: string;
  date_granted?: string;
  statut: string;
  est_qualifie?: boolean;
}

interface DashboardViewProps {
  leads: Lead[];
  campaigns: any[];
  logs?: any[];
  agent?: any;
  threshold: number;
}

const DashboardView = React.memo(function DashboardView({ leads, campaigns, logs = [], agent }: DashboardViewProps) {
  // Calculations
  const totalLeads = leads.length;

  const totalEmailsSent = campaigns.filter(c => c.statut === 'Succès' || c.statut === 'Envoyé').length;
  const totalEmailsFailed = campaigns.filter(c => c.statut === 'Erreur').length;

  // Timeline of leads collected over last 7 days
  const last7Days = Array(7).fill(0).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - i);
    return d.toISOString().split('T')[0];
  }).reverse();

  const dailyCounts = last7Days.map(day => {
    return leads.filter(l => {
      const targetDate = l.date_granted ? l.date_granted.split('T')[0] : l.date_collecte.split('T')[0];
      return targetDate === day;
    }).length;
  });

  const maxDailyVal = Math.max(...dailyCounts, 1);


  const formatDate = (ts?: number | string) => {
    if (!ts) return 'Jamais';
    return new Date(ts).toLocaleString('fr-FR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  };

  const triggerRuleSummary = (rules: any[]) => {
    if (!rules || rules.length === 0) return 'Aucune (Manuel)';
    const r = rules[0];
    const interval = r.interval;
    const hour = r.triggerAtHour ? r.triggerAtHour.toString().replace(/am|pm/gi, (match: string) => match.toLowerCase() === 'am' ? 'h00' : 'h00 (soir)') : '08h00';
    
    if (interval === 'Minutes') return `Toutes les ${r.minutesBetween || '?'} min`;
    if (interval === 'Hours') return `Toutes les ${r.hoursBetween || '?'} h`;
    if (interval === 'Days') return `Chaque jour à ${hour}`;
    if (interval === 'Weeks') return `Hebdo à ${hour}`;
    if (interval === 'Months') return `Mensuel le ${r.triggerAtDayOfMonth || 1}`;
    return interval;
  };

  // Find last run from logs
  const lastRunLog = logs.find(l => l.step_name === 'Envoi Email Automatique' || l.step_name?.toLowerCase().includes('envoi'));
  const hasEverRun = !!lastRunLog || !!agent?.lastExecuted;
  const lastRunDate = lastRunLog ? formatDate(lastRunLog.timestamp) : (agent?.lastExecuted ? formatDate(agent.lastExecuted) : 'Jamais');


  return (
    <div className="fade-in">
      <div className="view-header">
        <div className="view-title">
          <h1>Tableau de Bord</h1>
          <p>Vue d'ensemble et performance de l'agent en temps réel</p>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="metrics-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <div className="card metric-card primary">
          <span className="metric-title">Candidats Sourcés</span>
          <div className="metric-value-container">
            <span className="metric-value">{totalLeads}</span>
            <span className="metric-subtext">depuis le début</span>
          </div>
        </div>

        <div className="card metric-card secondary">
          <span className="metric-title">Emails Envoyés</span>
          <div className="metric-value-container">
            <span className="metric-value">{totalEmailsSent}</span>
            <span className="metric-subtext">contacts réussis</span>
          </div>
        </div>

        <div className="card metric-card warning">
          <span className="metric-title">Erreurs d'Envoi</span>
          <div className="metric-value-container">
            <span className="metric-value">{totalEmailsFailed}</span>
            <span className="metric-subtext" style={{ color: 'var(--accent-danger)' }}>
              {totalEmailsSent + totalEmailsFailed > 0 ? Math.round((totalEmailsFailed / (totalEmailsSent + totalEmailsFailed)) * 100) : 0}% d'échec
            </span>
          </div>
        </div>
      </div>

      {/* Charts & Settings Section */}
      <div className="charts-grid" style={{ gridTemplateColumns: '2fr 1fr', gap: '24px', marginTop: '24px' }}>
        
        {/* Line Chart: Ingestion Volume */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="chart-header">
            <span className="chart-title">Nouveaux Candidats Assignés (7 derniers jours)</span>
            <span className="badge badge-sent">Volume quotidien</span>
          </div>
          <div style={{ height: '240px', width: '100%', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="100%" height="100%" viewBox="0 0 800 220" preserveAspectRatio="none">
              <defs>
                <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--accent-secondary)" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="var(--accent-secondary)" stopOpacity="0" />
                </linearGradient>
              </defs>
              {/* Horizontal Grid lines */}
              <line x1="20" y1="30" x2="780" y2="30" stroke="rgba(36, 47, 76, 0.3)" strokeWidth="1" />
              <line x1="20" y1="80" x2="780" y2="80" stroke="rgba(36, 47, 76, 0.3)" strokeWidth="1" />
              <line x1="20" y1="130" x2="780" y2="130" stroke="rgba(36, 47, 76, 0.3)" strokeWidth="1" />
              <line x1="20" y1="180" x2="780" y2="180" stroke="var(--border-color)" strokeWidth="1.5" />

              {/* Draw area under line */}
              <path
                d={`M 20 180 
                    L 20 ${180 - (dailyCounts[0] / maxDailyVal) * 130} 
                    L 146 ${180 - (dailyCounts[1] / maxDailyVal) * 130} 
                    L 272 ${180 - (dailyCounts[2] / maxDailyVal) * 130} 
                    L 398 ${180 - (dailyCounts[3] / maxDailyVal) * 130} 
                    L 524 ${180 - (dailyCounts[4] / maxDailyVal) * 130} 
                    L 650 ${180 - (dailyCounts[5] / maxDailyVal) * 130} 
                    L 780 ${180 - (dailyCounts[6] / maxDailyVal) * 130} 
                    L 780 180 Z`}
                fill="url(#lineGrad)"
              />

              {/* Draw Line */}
              <path
                d={`M 20 ${180 - (dailyCounts[0] / maxDailyVal) * 130} 
                    L 146 ${180 - (dailyCounts[1] / maxDailyVal) * 130} 
                    L 272 ${180 - (dailyCounts[2] / maxDailyVal) * 130} 
                    L 398 ${180 - (dailyCounts[3] / maxDailyVal) * 130} 
                    L 524 ${180 - (dailyCounts[4] / maxDailyVal) * 130} 
                    L 650 ${180 - (dailyCounts[5] / maxDailyVal) * 130} 
                    L 780 ${180 - (dailyCounts[6] / maxDailyVal) * 130}`}
                fill="none"
                stroke="var(--accent-secondary)"
                strokeWidth="3"
                strokeLinecap="round"
              />

              {/* Dots */}
              {dailyCounts.map((val, idx) => {
                const cx = 20 + idx * 126.6;
                const cy = 180 - (val / maxDailyVal) * 130;
                return (
                  <g key={idx}>
                    <circle cx={cx} cy={cy} r="6" fill="var(--bg-secondary)" stroke="var(--accent-secondary)" strokeWidth="3" />
                    <text x={cx} y={cy - 12} fill="var(--text-primary)" fontSize="10" textAnchor="middle" fontWeight="bold">
                      {val}
                    </text>
                  </g>
                );
              })}

              {/* Day Labels */}
              {last7Days.map((day, idx) => {
                const dateObj = new Date(day);
                const formattedDay = dateObj.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' });
                return (
                  <text key={idx} x={20 + idx * 126.6} y="200" fill="var(--text-muted)" fontSize="11" textAnchor="middle">
                    {formattedDay}
                  </text>
                );
              })}
            </svg>
          </div>
        </div>
        
        {/* AI Profile Card */}
        <div className="card" style={{ width: '100%', background: 'linear-gradient(145deg, var(--navy2) 0%, rgba(8, 20, 38, 0.8) 100%)', border: '1px solid rgba(0, 229, 200, 0.1)', borderRadius: '16px', padding: '24px', margin: 0, boxShadow: '0 8px 32px rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', borderBottom: '1px solid var(--border)', paddingBottom: '16px' }}>
             <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(0, 229, 200, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(0, 229, 200, 0.2)' }}>
                <span style={{ fontSize: '24px' }}>🤖</span>
             </div>
             <div>
                <h3 style={{ fontSize: '15px', color: 'var(--text)', margin: 0, fontWeight: 600 }}>Cerveau Sourcing IA</h3>
             </div>
          </div>

          <div>
             <span style={{ fontSize: '11px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Mission Configurée</span>
             <p style={{ fontSize: '13px', color: 'var(--text)', lineHeight: 1.5, marginTop: '8px', fontStyle: 'italic', background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '8px' }}>
                "{agent?.config?.agent_mission || 'Recherche de candidats pertinents selon les critères ICP définis dans la configuration.'}"
             </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: 'auto' }}>
             <div style={{ background: 'var(--bg-secondary)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                <span style={{ fontSize: '10px', color: 'var(--muted)', textTransform: 'uppercase' }}>Planification</span>
                <div style={{ fontSize: '12px', color: 'var(--text)', fontWeight: 600, marginTop: '4px' }}>{agent ? triggerRuleSummary(agent.trigger_rules) : 'Manuel'}</div>
             </div>
             <div style={{ background: 'var(--bg-secondary)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                <span style={{ fontSize: '10px', color: 'var(--muted)', textTransform: 'uppercase' }}>Statut</span>
                <div style={{ fontSize: '12px', color: agent?.schedule_id ? 'var(--green)' : 'var(--amber)', fontWeight: 600, marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                   <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: agent?.schedule_id ? 'var(--green)' : 'var(--amber)' }}></span>
                   {agent?.schedule_id ? 'Actif' : 'En pause'}
                </div>
             </div>
          </div>
        </div>

      </div>


    </div>
  );
});

export default DashboardView;
