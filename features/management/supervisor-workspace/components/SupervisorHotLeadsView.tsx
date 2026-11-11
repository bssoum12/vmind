'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Copy,
  Check,
  Search,
  ExternalLink,
  CheckCircle2,
  Bot,
  ArrowRight,
  ChevronDown,
  ChevronsUpDown,
  AlertTriangle,
  RotateCw,
} from 'lucide-react';
import { FleetAlertsData, HotLeadAlertItem } from '../types/supervisor.types';
import { useToast } from '@/shared/contexts/ToastContext';

interface SupervisorHotLeadsViewProps {
  alertsData: FleetAlertsData;
  onRefresh?: () => void;
  isLoading?: boolean;
  hasError?: boolean;
}

interface AgentLeadGroup {
  agentId: number;
  agentUuid: string;
  agentName: string;
  leads: HotLeadAlertItem[];
}

const formatUnattendedDelay = (hours: number): string => {
  if (!hours || hours < 24) {
    return `${hours || 0}h sans contact`;
  }
  const days = Math.floor(hours / 24);
  return `${days} jour${days > 1 ? 's' : ''} sans contact`;
};

export const SupervisorHotLeadsView: React.FC<SupervisorHotLeadsViewProps> = ({
  alertsData,
  onRefresh,
  isLoading = false,
  hasError = false,
}) => {
  const router = useRouter();
  const { showToast } = useToast();

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'critical' | 'draft' | 'never'>('all');
  const [selectedAgentFilter, setSelectedAgentFilter] = useState<string>('all');
  const [collapsedAgentKeys, setCollapsedAgentKeys] = useState<Record<string, boolean>>({});
  const [copiedEmailId, setCopiedEmailId] = useState<number | null>(null);

  const hotLeads = alertsData?.hotLeads || [];
  const totalCount = alertsData?.unattendedHotLeadsCount ?? hotLeads.length;
  const criticalCount = alertsData?.criticalCount ?? hotLeads.filter((l) => l.urgency === 'CRITICAL').length;
  const draftReadyCount = alertsData?.draftReadyCount ?? hotLeads.filter((l) => l.contactStatus === 'DRAFT_READY').length;
  const neverContactedCount = alertsData?.neverContactedCount ?? hotLeads.filter((l) => l.contactStatus === 'NEVER_CONTACTED').length;

  // List of all unique prospect agents in alertsData (for the dropdown selector)
  const allUniqueAgents = useMemo(() => {
    const map = new Map<string, { key: string; name: string; count: number }>();
    hotLeads.forEach((lead) => {
      const key = lead.agentUuid || String(lead.agentId);
      if (!map.has(key)) {
        map.set(key, {
          key,
          name: lead.agentName || 'Agent de Prospection',
          count: 0
        });
      }
      map.get(key)!.count += 1;
    });
    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }, [hotLeads]);

  // Filter leads based on search query and status
  const filteredLeads = useMemo(() => {
    let result = hotLeads;

    if (filterStatus === 'critical') {
      result = result.filter((l) => l.urgency === 'CRITICAL');
    } else if (filterStatus === 'draft') {
      result = result.filter((l) => l.contactStatus === 'DRAFT_READY');
    } else if (filterStatus === 'never') {
      result = result.filter((l) => l.contactStatus === 'NEVER_CONTACTED');
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter((l) => {
        const name = `${l.prenom || ''} ${l.nom || ''}`.toLowerCase();
        const company = (l.entreprise || '').toLowerCase();
        const email = (l.email || '').toLowerCase();
        const agent = (l.agentName || '').toLowerCase();
        const title = (l.poste || '').toLowerCase();
        return (
          name.includes(q) ||
          company.includes(q) ||
          email.includes(q) ||
          agent.includes(q) ||
          title.includes(q)
        );
      });
    }

    return result;
  }, [hotLeads, filterStatus, searchQuery]);

  // Group filtered leads by Prospect Agent
  const agentGroups: AgentLeadGroup[] = useMemo(() => {
    const map = new Map<string, AgentLeadGroup>();

    filteredLeads.forEach((lead) => {
      const key = lead.agentUuid || String(lead.agentId);
      if (!map.has(key)) {
        map.set(key, {
          agentId: lead.agentId,
          agentUuid: lead.agentUuid,
          agentName: lead.agentName || 'Agent de Prospection',
          leads: [],
        });
      }
      map.get(key)!.leads.push(lead);
    });

    return Array.from(map.values()).sort((a, b) => b.leads.length - a.leads.length);
  }, [filteredLeads]);

  // Filter groups according to selected agent dropdown
  const displayedAgentGroups = useMemo(() => {
    if (selectedAgentFilter === 'all') {
      return agentGroups;
    }
    return agentGroups.filter(
      (g) => (g.agentUuid || String(g.agentId)) === selectedAgentFilter
    );
  }, [agentGroups, selectedAgentFilter]);

  // Accordion toggle helpers
  const toggleAgentCollapse = (key: string) => {
    setCollapsedAgentKeys((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const areAllCollapsed = useMemo(() => {
    if (displayedAgentGroups.length === 0) return false;
    return displayedAgentGroups.every((g) => {
      const key = g.agentUuid || String(g.agentId);
      return Boolean(collapsedAgentKeys[key]);
    });
  }, [displayedAgentGroups, collapsedAgentKeys]);

  const handleToggleAllCollapse = () => {
    const nextState = !areAllCollapsed;
    const updated: Record<string, boolean> = {};
    displayedAgentGroups.forEach((g) => {
      const key = g.agentUuid || String(g.agentId);
      updated[key] = nextState;
    });
    setCollapsedAgentKeys(updated);
  };

  const handleCopyEmail = (email: string, leadId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!email) return;
    navigator.clipboard.writeText(email);
    setCopiedEmailId(leadId);
    showToast(`E-mail copié : ${email}`, 'ok');
    setTimeout(() => setCopiedEmailId(null), 1800);
  };

  const handleOpenAgentWorkspace = (agentUuid: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!agentUuid) return;
    const currentPath = typeof window !== 'undefined' ? (window.location.pathname + (window.location.search || '?tab=alerts')) : '';
    router.push(`/prospect-agent-workspace/${agentUuid}?tab=leads&from=${encodeURIComponent(currentPath)}`);
  };

  const handleOpenLeadDrawer = (agentUuid: string, leadId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!agentUuid || !leadId) return;
    const currentPath = typeof window !== 'undefined' ? (window.location.pathname + (window.location.search || '?tab=alerts')) : '';
    router.push(`/prospect-agent-workspace/${agentUuid}?tab=leads&leadId=${leadId}&from=${encodeURIComponent(currentPath)}`);
  };

  return (
    <div className="supervisor-hot-leads-view">
      {/* 1. Header with Controls & Agent Dropdown Filter */}
      <header className="hot-leads-header">
        <div className="header-title-group">
          <h1 className="view-title">Hot Leads non contactés</h1>
          <p className="view-subtitle">
            {totalCount > 0
              ? `${totalCount} prospect${totalCount > 1 ? 's' : ''} qualifié${totalCount > 1 ? 's' : ''} en attente de premier contact`
              : 'Tous les prospects qualifiés ont été contactés dans les délais impartis'}
          </p>
        </div>

        {/* Filter Controls, Agent Dropdown & Search */}
        <div className="header-controls">
          {/* Status Tabs */}
          <div className="segmented-tabs" role="tablist">
            <button
              type="button"
              className={`segmented-tab ${filterStatus === 'all' ? 'active' : ''}`}
              onClick={() => setFilterStatus('all')}
            >
              Tous ({totalCount})
            </button>
            <button
              type="button"
              className={`segmented-tab ${filterStatus === 'critical' ? 'active' : ''}`}
              onClick={() => setFilterStatus('critical')}
            >
              Critiques &gt;72h ({criticalCount})
            </button>
            <button
              type="button"
              className={`segmented-tab ${filterStatus === 'draft' ? 'active' : ''}`}
              onClick={() => setFilterStatus('draft')}
            >
              Brouillons prêts ({draftReadyCount})
            </button>
            <button
              type="button"
              className={`segmented-tab ${filterStatus === 'never' ? 'active' : ''}`}
              onClick={() => setFilterStatus('never')}
            >
              Non initiés ({neverContactedCount})
            </button>
          </div>

          {/* Agent Dropdown Selector */}
          {allUniqueAgents.length > 1 && (
            <div className="agent-select-wrap" title="Filtrer par agent de prospection">
              <Bot size={13} className="select-icon" />
              <select
                value={selectedAgentFilter}
                onChange={(e) => setSelectedAgentFilter(e.target.value)}
                className="agent-select-dropdown"
              >
                <option value="all">Tous les agents ({allUniqueAgents.length})</option>
                {allUniqueAgents.map((a) => (
                  <option key={a.key} value={a.key}>
                    {a.name} ({a.count})
                  </option>
                ))}
              </select>
              <ChevronDown size={12} className="select-arrow" />
            </div>
          )}

          {/* Quick Collapse / Expand Toggle */}
          {displayedAgentGroups.length > 1 && (
            <button
              type="button"
              className="toggle-all-collapse-btn"
              onClick={handleToggleAllCollapse}
              title={areAllCollapsed ? 'Déplier tous les agents' : 'Replier tous les agents'}
            >
              <ChevronsUpDown size={13} />
              <span>{areAllCollapsed ? 'Déplier tout' : 'Replier tout'}</span>
            </button>
          )}

          {/* Search Input */}
          <div className="search-wrap">
            <Search size={14} className="search-icon" />
            <input
              type="text"
              placeholder="Rechercher prospect, agent…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
          </div>
        </div>
      </header>

      {/* 2. Content: Collapsible Prospect Agent Groups */}
      <div className="hot-leads-content">
        {displayedAgentGroups.length > 0 ? (
          displayedAgentGroups.map((group) => {
            const groupKey = group.agentUuid || String(group.agentId);
            const isCollapsed = Boolean(collapsedAgentKeys[groupKey]);

            return (
              <section key={groupKey} className={`agent-lead-group ${isCollapsed ? 'collapsed' : ''}`}>
                {/* Agent Header Bar (Clickable Accordion) */}
                <div
                  className="agent-group-header"
                  onClick={() => toggleAgentCollapse(groupKey)}
                  title={isCollapsed ? 'Cliquer pour déplier le tableau' : 'Cliquer pour replier le tableau'}
                >
                  <div className="agent-title-left">
                    <ChevronDown
                      size={15}
                      className={`accordion-chevron ${isCollapsed ? 'rotated' : ''}`}
                    />
                    <Bot size={15} className="agent-icon" />
                    <span className="agent-name">{group.agentName}</span>
                    <span className="agent-count">({group.leads.length})</span>
                  </div>
                  <button
                    type="button"
                    className="agent-open-btn"
                    onClick={(e) => handleOpenAgentWorkspace(group.agentUuid, e)}
                    title="Ouvrir l'espace de cet agent"
                  >
                    <span>Ouvrir l&apos;agent</span>
                    <ExternalLink size={12} />
                  </button>
                </div>

                {/* High-density Clean Data Table (Collapsible) */}
                {!isCollapsed && (
                  <div className="leads-table-wrapper">
                    <table className="leads-table">
                      <thead>
                        <tr>
                          <th style={{ width: '30%' }}>PROSPECT</th>
                          <th style={{ width: '28%' }}>E-MAIL</th>
                          <th style={{ width: '16%' }}>ATTENTE</th>
                          <th style={{ width: '14%' }}>STATUT</th>
                          <th style={{ width: '12%', textAlign: 'right' }}>ACTION</th>
                        </tr>
                      </thead>
                      <tbody>
                        {group.leads.map((lead) => {
                          const fullName = `${lead.prenom || ''} ${lead.nom || ''}`.trim() || 'Prospect';
                          const isCritical = lead.urgency === 'CRITICAL';
                          const isWarning = lead.urgency === 'WARNING';
                          const isDraft = lead.contactStatus === 'DRAFT_READY';
                          const targetAgentUuid = lead.agentUuid || group.agentUuid;

                          return (
                            <tr
                              key={`${lead.agentId}-${lead.leadId}`}
                              className="lead-row"
                            >
                              {/* Prospect Name & Role */}
                              <td className="cell-prospect">
                                <div className="prospect-name">{fullName}</div>
                                <div className="prospect-role">
                                  {lead.poste && <span className="role-title">{lead.poste}</span>}
                                  {lead.poste && lead.entreprise && <span className="sep">·</span>}
                                  {lead.entreprise && <span className="company-title">{lead.entreprise}</span>}
                                </div>
                              </td>

                              {/* Email & One-click Copy */}
                              <td className="cell-email">
                                <div className="email-row">
                                  <span className="email-text">{lead.email || '—'}</span>
                                  {lead.email && (
                                    <button
                                      type="button"
                                      className={`copy-btn ${copiedEmailId === lead.leadId ? 'copied' : ''}`}
                                      onClick={(e) => handleCopyEmail(lead.email, lead.leadId, e)}
                                      title="Copier l'adresse e-mail"
                                    >
                                      {copiedEmailId === lead.leadId ? (
                                        <Check size={12} color="#00E5C8" />
                                      ) : (
                                        <Copy size={12} />
                                      )}
                                    </button>
                                  )}
                                </div>
                              </td>

                              {/* Attente: Pure colored typography in days when >= 48h, NO dots, NO badges */}
                              <td className="cell-attente">
                                <span
                                  className={isCritical ? 'text-critical' : isWarning ? 'text-warning' : 'text-cyan'}
                                  title={`${lead.hoursUnattended}h sans contact`}
                                >
                                  {formatUnattendedDelay(lead.hoursUnattended)}
                                </span>
                              </td>

                              {/* Contact Status: Clean text, NO bullet dots */}
                              <td className="cell-status">
                                <span className={isDraft ? 'text-cyan' : 'text-muted'}>
                                  {isDraft ? 'Brouillon prêt' : 'Non contacté'}
                                </span>
                              </td>

                              {/* Action Button: Opens the lead's email drawer directly */}
                              <td className="cell-action">
                                {isDraft ? (
                                  <button
                                    type="button"
                                    className="action-btn-draft"
                                    onClick={(e) => handleOpenLeadDrawer(targetAgentUuid, lead.leadId, e)}
                                    title="Ouvrir le brouillon préparé par l'IA dans l'espace agent"
                                  >
                                    <span>Voir le brouillon</span>
                                    <ArrowRight size={11} />
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    className="action-btn-generate"
                                    onClick={(e) => handleOpenLeadDrawer(targetAgentUuid, lead.leadId, e)}
                                    title="Générer un e-mail avec l'IA dans l'espace agent"
                                  >
                                    <span>Générer l&apos;e-mail</span>
                                    <ArrowRight size={11} />
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            );
          })
        ) : hasError ? (
          /* Error State */
          <div className="hot-leads-empty error" style={{ borderColor: 'rgba(255, 71, 87, 0.3)' }}>
            <AlertTriangle size={32} color="#FF4757" className="empty-icon" />
            <h3 style={{ color: '#F0F4F8' }}>Erreur de chargement des alertes</h3>
            <p style={{ color: '#94A3B8' }}>
              Impossible de récupérer la liste des prospects en attente. Veuillez vérifier votre connexion ou réactualiser.
            </p>
            {onRefresh && (
              <button
                type="button"
                onClick={onRefresh}
                disabled={isLoading}
                style={{
                  marginTop: '12px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '7px 16px',
                  borderRadius: '6px',
                  background: 'rgba(255, 71, 87, 0.15)',
                  border: '1px solid rgba(255, 71, 87, 0.4)',
                  color: '#FF6B7A',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                <RotateCw size={12} className={isLoading ? 'spin-icon' : ''} />
                <span>Réessayer</span>
              </button>
            )}
          </div>
        ) : (
          /* Clean Empty State */
          <div className="hot-leads-empty">
            <CheckCircle2 size={32} color="#00E5C8" className="empty-icon" />
            <h3>Aucun Hot Lead en attente</h3>
            <p>
              Tous les prospects qualifiés ont été pris en charge et contactés dans les délais impartis. Votre pipeline commercial est fluide.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
