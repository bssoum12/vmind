'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { CyberIcon } from '@/shared/management/components/CyberIcon';
import { Building2, User, BarChart2, Globe, FileText, Target } from 'lucide-react';

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
  agent?: any;
  onConfigure?: (agent: any) => void;
}

const DashboardView = React.memo(function DashboardView({ leads, campaigns, threshold, agent, onConfigure }: DashboardViewProps) {
  const router = useRouter();

  const handleModifyConfig = () => {
    if (onConfigure) {
      onConfigure(agent);
      return;
    }
    if (agent) {
      sessionStorage.setItem('vmind_editing_agent', JSON.stringify(agent));
    }
    sessionStorage.setItem('vmind_current_view', 'wizard');
    router.push('/');
  };
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
        </div>

        <div className="card metric-card warning">
          <span className="metric-title">Leads Écartés</span>
          <div className="metric-value-container">
            <span className="metric-value">{totalDiscarded}</span>
            <span className="metric-change down">
              ({totalLeads > 0 ? Math.round((totalDiscarded / totalLeads) * 100) : 0}%)
            </span>
          </div>
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

      {/* Full Width ICP Configuration Card */}
      <div className="icp-config-container">
        {(() => {
          const agentConfig = agent?.config || {};
          const icp = agentConfig.icp || {};
          const mission = agentConfig.agent_mission || '';

          const parseList = (val: any): string[] => {
            if (!val) return [];
            if (Array.isArray(val)) return val.filter(Boolean).map(String);
            if (typeof val === 'string') {
              try {
                const parsed = JSON.parse(val);
                if (Array.isArray(parsed)) return parsed.filter(Boolean).map(String);
              } catch (_) { }
              return val.split(',').map((s: string) => s.trim()).filter(Boolean);
            }
            return [];
          };

          const postesList = parseList(icp.poste_contact);
          const secteursList = parseList(icp.secteur_activite);
          const zonesList = parseList(icp.zone_geo);

          const poids = [
            { label: 'Secteur d\'Activité', value: icp.poids_secteur || 25, color: '#3B82F6', icon: <Building2 size={16} color="#3B82F6" /> },
            { label: 'Poste du Contact', value: icp.poids_poste || 25, color: '#10B981', icon: <User size={16} color="#10B981" /> },
            { label: 'Taille d\'Entreprise', value: icp.poids_taille || 25, color: '#F59E0B', icon: <BarChart2 size={16} color="#F59E0B" /> },
            { label: 'Zone Géographique', value: icp.poids_pays || 25, color: '#8B5CF6', icon: <Globe size={16} color="#8B5CF6" /> }
          ];

          return (
            <div className="icp-card">
              {/* Header */}
              <div className="icp-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
                <div className="icp-header-title" style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div className="icp-icon" style={{ background: 'transparent', padding: 0 }}>
                    <div style={{
                      width: 42,
                      height: 42,
                      borderRadius: 10,
                      background: 'rgba(255, 71, 87, 0.12)',
                      border: '1px solid rgba(255, 71, 87, 0.3)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#FF4757',
                      flexShrink: 0
                    }}>
                      <Target size={22} />
                    </div>
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: '#F0F4F8' }}>Configuration & Algorithme de Ciblage (ICP)</h3>
                    <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#94A3B8' }}>Règles et pondérations utilisées par l'intelligence artificielle pour évaluer les prospects</p>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <button
                    onClick={handleModifyConfig}
                    className="btn"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      background: 'rgba(0, 229, 200, 0.12)',
                      color: '#00E5C8',
                      border: '1px solid rgba(0, 229, 200, 0.35)',
                      padding: '8px 16px',
                      borderRadius: '8px',
                      fontWeight: 600,
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      boxShadow: '0 2px 10px rgba(0, 229, 200, 0.15)'
                    }}
                    title="Modifier la configuration et l'algorithme ICP de cet agent"
                  >
                    <CyberIcon name="settings" size={14} color="#00E5C8" />
                    <span>Modifier la configuration</span>
                  </button>
                </div>
              </div>

              {/* Top Key Metrics Row */}
              <div className="icp-metrics-grid">
                {/* Metric 1: Threshold */}
                <div className="icp-metric-box">
                  <div className="label">Seuil d'Exigence Minimum</div>
                  <div className="value-container">
                    <span className="value-cyan">{agentConfig.seuil_qualification || threshold}</span>
                    <span className="unit">/ 100 pts</span>
                  </div>
                  <div className="desc">Score minimal pour qu'un prospect soit qualifié par l'IA</div>
                </div>

                {/* Metric 2: Company Size */}
                <div className="icp-metric-box">
                  <div className="label">Taille d'Entreprise Cible</div>
                  <div className="value-container">
                    {(!icp.taille_min && !icp.taille_max) ? (
                      <span className="value-cyan" style={{ fontSize: '18px' }}>Toutes tailles</span>
                    ) : (
                      <>
                        <span className="value-white">
                          {icp.taille_min ? (icp.taille_max ? `${icp.taille_min} - ${icp.taille_max}` : `${icp.taille_min}+`) : `≤ ${icp.taille_max}`}
                        </span>
                        <span className="unit">employés</span>
                      </>
                    )}
                  </div>
                  <div className="desc">
                    {(!icp.taille_min && !icp.taille_max) ? "Aucune restriction d'effectif" : "Tranche d'effectifs priorisée pour l'analyse"}
                  </div>
                </div>

                {/* Metric 3: Total Criteria Evaluated */}
                <div className="icp-metric-box">
                  <div className="label">Filtres Spécifiques Actifs</div>
                  <div className="value-container">
                    <span className="value-blue">
                      {postesList.length + secteursList.length + zonesList.length}
                    </span>
                    <span className="unit">règles de ciblage</span>
                  </div>
                  <div className="desc">Postes, secteurs et zones géographiques configurés</div>
                </div>
              </div>

              {/* Criteria Weights Section */}
              <div>
                <div className="icp-section-title">Pondération des Critères de Qualification</div>
                <div className="icp-weights-grid">
                  {poids.map(p => (
                    <div key={p.label} className="icp-weight-card">
                      <div className="weight-header">
                        <div className="weight-label">
                          <span>{p.icon}</span>
                          <span>{p.label}</span>
                        </div>
                        <span className="weight-val" style={{ color: p.color }}>{p.value}%</span>
                      </div>
                      <div className="bar-bg">
                        <div className="bar-fill" style={{ width: `${p.value}%`, backgroundColor: p.color }}></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Targeting Details & Mission Grid */}
              <div className="icp-targets-grid">
                {/* Postes */}
                <div className="icp-target-box">
                  <div className="target-title green" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <User size={15} color="#10B981" /> Postes Ciblés
                  </div>
                  {postesList.length > 0 ? (
                    <div className="tags-wrapper">
                      {postesList.map((p: string, i: number) => (
                        <span key={i} className="tag tag-green">{p}</span>
                      ))}
                    </div>
                  ) : (
                    <div className="empty-fallback">Tous les postes</div>
                  )}
                </div>

                {/* Secteurs */}
                <div className="icp-target-box">
                  <div className="target-title blue" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Building2 size={15} color="#3B82F6" /> Secteurs d'Activité
                  </div>
                  {secteursList.length > 0 ? (
                    <div className="tags-wrapper">
                      {secteursList.map((s: string, i: number) => (
                        <span key={i} className="tag tag-blue">{s}</span>
                      ))}
                    </div>
                  ) : (
                    <div className="empty-fallback">Tous les secteurs d'activité</div>
                  )}
                </div>

                {/* Zones Geo */}
                <div className="icp-target-box">
                  <div className="target-title purple" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Globe size={15} color="#8B5CF6" /> Zones Géographiques
                  </div>
                  {zonesList.length > 0 ? (
                    <div className="tags-wrapper">
                      {zonesList.map((z: string, i: number) => (
                        <span key={i} className="tag tag-purple">{z}</span>
                      ))}
                    </div>
                  ) : (
                    <div className="empty-fallback">Toutes les zones géographiques</div>
                  )}
                </div>
              </div>

              {/* Agent Mission Box if present */}
              {mission && (
                <div className="icp-mission-box">
                  <div className="mission-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <CyberIcon name="file" size={15} color="#00E5C8" /> Mission Spécifique & Directive du Prompt
                  </div>
                  <div className="mission-text">"{mission}"</div>
                </div>
              )}
            </div>
          );
        })()}
      </div>
    </div>
  );
});

export default DashboardView;
