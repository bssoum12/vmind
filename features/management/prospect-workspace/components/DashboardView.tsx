'use client';

import React from 'react';

interface Lead {
  id: number;
  nom: string;
  prenom: string;
  email: string;
  poste?: string;
  entreprise?: string;
  secteur?: string;
  taille_ent?: number;
  pays?: string;
  source: string;
  date_collecte: string;
  date_granted?: string;
  statut: string;
  score: number | null;
  raison: string | null;
  potentiel: string | null;
  est_qualifie?: boolean;
  date_derniere_qualification?: string | null;
  emails_count?: number;
  agent_emails_count?: number;
  date_envoi?: string | null;
}

interface DashboardViewProps {
  leads: Lead[];
  campaigns: any[];
  threshold: number;
}

const DashboardView = React.memo(function DashboardView({ leads, campaigns, threshold }: DashboardViewProps) {
  // Calculations
  const totalLeads = leads.length;

  const qualifiedLeadsList = leads.filter(l => l.est_qualifie === true);
  const totalQualified = qualifiedLeadsList.length;
  const percentQualified = totalLeads > 0 ? Math.round((totalQualified / totalLeads) * 100) : 0;

  const totalDiscarded = leads.filter(l => l.est_qualifie === false && l.score !== null).length;

  const totalEmailsSent = campaigns.filter(c => c.statut === 'Succès' || c.statut === 'Envoyé').length;

  // 1. Histogram distribution (10-point buckets)
  const buckets = Array(10).fill(0);
  leads.forEach(l => {
    if (l.score !== null) {
      const idx = Math.min(Math.floor(l.score / 10), 9);
      buckets[idx]++;
    }
  });

  const maxBucketVal = Math.max(...buckets, 1); // Avoid division by zero

  // 2. Timeline of leads collected over last 7 days (for simplicity and neat display)
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

  // SVG Chart Dimensions
  const histogramWidth = 400;
  const histogramHeight = 200;
  const lineWidth = 400;
  const lineHeight = 200;

  return (
    <div className="fade-in">
      <div className="view-header">
        <div className="view-title">
          <h1>Tableau de Bord</h1>
          <p>Vue d'ensemble et performance de l'agent en temps réel</p>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="metrics-grid">
        <div className="card metric-card primary">
          <span className="metric-title">Total Leads Collectés</span>
          <div className="metric-value-container">
            <span className="metric-value">{totalLeads}</span>
            <span className="metric-subtext">depuis le début</span>
          </div>
        </div>

        <div className="card metric-card success">
          <span className="metric-title">Leads Qualifiés</span>
          <div className="metric-value-container">
            <span className="metric-value">{totalQualified}</span>
            <span className="metric-change up">({percentQualified}%)</span>
          </div>
          <span className="metric-subtext" style={{ marginTop: '0.25rem', display: 'block' }}>Basé sur la décision de l'IA</span>
        </div>

        <div className="card metric-card warning">
          <span className="metric-title">Leads Écartés</span>
          <div className="metric-value-container">
            <span className="metric-value">{totalDiscarded}</span>
            <span className="metric-change down">
              ({totalLeads > 0 ? Math.round((totalDiscarded / totalLeads) * 100) : 0}%)
            </span>
          </div>
          <span className="metric-subtext" style={{ marginTop: '0.25rem', display: 'block' }}>Basé sur la décision de l'IA</span>
        </div>

        <div className="card metric-card secondary">
          <span className="metric-title">Emails Envoyés</span>
          <div className="metric-value-container">
            <span className="metric-value">{totalEmailsSent}</span>
            <span className="metric-subtext">contacts réussis</span>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="charts-grid">
        {/* Line Chart: Ingestion Volume */}
        <div className="card">
          <div className="chart-header">
            <span className="chart-title">Nouveaux Prospects Assignés (7 derniers jours)</span>
            <span className="badge badge-sent">Volume quotidien</span>
          </div>
          <div style={{ height: '240px', width: '100%', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="100%" height="100%" viewBox="0 0 420 220" preserveAspectRatio="none">
              <defs>
                <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--accent-secondary)" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="var(--accent-secondary)" stopOpacity="0" />
                </linearGradient>
              </defs>
              {/* Horizontal Grid lines */}
              <line x1="20" y1="30" x2="400" y2="30" stroke="rgba(36, 47, 76, 0.3)" strokeWidth="1" />
              <line x1="20" y1="80" x2="400" y2="80" stroke="rgba(36, 47, 76, 0.3)" strokeWidth="1" />
              <line x1="20" y1="130" x2="400" y2="130" stroke="rgba(36, 47, 76, 0.3)" strokeWidth="1" />
              <line x1="20" y1="180" x2="400" y2="180" stroke="var(--border-color)" strokeWidth="1.5" />

              {/* Draw area under line */}
              <path
                d={`M 20 180 
                    L 20 ${180 - (dailyCounts[0] / maxDailyVal) * 130} 
                    L 83 ${180 - (dailyCounts[1] / maxDailyVal) * 130} 
                    L 146 ${180 - (dailyCounts[2] / maxDailyVal) * 130} 
                    L 210 ${180 - (dailyCounts[3] / maxDailyVal) * 130} 
                    L 273 ${180 - (dailyCounts[4] / maxDailyVal) * 130} 
                    L 336 ${180 - (dailyCounts[5] / maxDailyVal) * 130} 
                    L 400 ${180 - (dailyCounts[6] / maxDailyVal) * 130} 
                    L 400 180 Z`}
                fill="url(#lineGrad)"
              />

              {/* Draw Line */}
              <path
                d={`M 20 ${180 - (dailyCounts[0] / maxDailyVal) * 130} 
                    L 83 ${180 - (dailyCounts[1] / maxDailyVal) * 130} 
                    L 146 ${180 - (dailyCounts[2] / maxDailyVal) * 130} 
                    L 210 ${180 - (dailyCounts[3] / maxDailyVal) * 130} 
                    L 273 ${180 - (dailyCounts[4] / maxDailyVal) * 130} 
                    L 336 ${180 - (dailyCounts[5] / maxDailyVal) * 130} 
                    L 400 ${180 - (dailyCounts[6] / maxDailyVal) * 130}`}
                fill="none"
                stroke="var(--accent-secondary)"
                strokeWidth="3"
                strokeLinecap="round"
              />

              {/* Dots */}
              {dailyCounts.map((val, idx) => {
                const cx = 20 + idx * 63.3;
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
                  <text key={idx} x={20 + idx * 63.3} y="200" fill="var(--text-muted)" fontSize="9" textAnchor="middle">
                    {formattedDay}
                  </text>
                );
              })}
            </svg>
          </div>
        </div>

        {/* Bar Chart: Score Distribution */}
        <div className="card">
          <div className="chart-header">
            <span className="chart-title">Distribution des Scores ICP</span>
            <span className="badge badge-qualified">Par tranches de 10 pts</span>
          </div>
          <div className="chart-body" style={{ gap: '4px', paddingBottom: '1.5rem' }}>
            {/* Grid lines behind */}
            <div className="chart-grid-line" style={{ bottom: '50px' }}></div>
            <div className="chart-grid-line" style={{ bottom: '100px' }}></div>
            <div className="chart-grid-line" style={{ bottom: '150px' }}></div>
            <div className="chart-grid-line" style={{ bottom: '200px' }}></div>

            {buckets.map((count, idx) => {
              const heightPercent = `${(count / maxBucketVal) * 85}%`;
              const label = `${idx * 10}-${(idx + 1) * 10}`;
              return (
                <div key={idx} className="chart-bar">
                  <div className="chart-bar-fill" style={{ height: heightPercent }}>
                    <div className="chart-tooltip">
                      {count} lead{count > 1 ? 's' : ''} ({label})
                    </div>
                  </div>
                  <span className="chart-bar-label">{label}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Recents Leads Section */}
      <div className="card">
        <h3 style={{ marginBottom: '1.25rem', fontSize: '1.1rem', fontWeight: 600 }}>Dernières Activités & Leads Reçus</h3>
        <div className="table-container" style={{ margin: 0, boxShadow: 'none', border: 'none' }}>
          <table className="leads-table">
            <thead>
              <tr>
                <th>Contact</th>
                <th>Entreprise</th>
                <th>Score</th>
                <th>Statut</th>
                <th>Source</th>
              </tr>
            </thead>
            <tbody>
              {leads.slice(0, 5).map((lead) => {
                const isQualified = lead.score !== null && lead.score >= threshold;
                return (
                  <tr key={lead.id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{lead.prenom} {lead.nom}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{lead.email}</div>
                    </td>
                    <td>
                      <div>{lead.entreprise}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{lead.secteur} • {lead.pays}</div>
                    </td>
                    <td>
                      {lead.score !== null ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ fontWeight: 'bold', color: isQualified ? 'var(--success)' : 'var(--danger)' }}>
                            {lead.score}
                          </span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>/100</span>
                        </div>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Non qualifié</span>
                      )}
                    </td>
                    <td>
                      <span className={`badge badge-${lead.statut === 'Qualifié' ? 'qualified' : lead.statut === 'Écarté' ? 'discarded' : lead.statut === 'Erreur' ? 'error' : 'new'}`}>
                        {lead.statut}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontSize: '0.85rem' }}>
                        {lead.source === 'CSV' ? '📁 CSV' : lead.source === 'Webhook' ? '⚡ Webhook' : '🔗 API'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
});

export default DashboardView;
