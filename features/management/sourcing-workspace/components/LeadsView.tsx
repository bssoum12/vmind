'use client';

import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Building, 
  Briefcase, 
  Calendar, 
  ChevronLeft, 
  ChevronRight, 
  Users, 
  Download, 
  RefreshCw, 
  Sparkles, 
  Target, 
  Copy, 
  Check, 
  ArrowUpRight,
  MapPin,
  X
} from 'lucide-react';
import { useToast } from '@/shared/contexts/ToastContext';

interface Lead {
  id: number;
  nom: string;
  prenom: string;
  email: string;
  poste?: string;
  entreprise?: string;
  secteur?: string;
  pays?: string;
  source: string;
  date_collecte: string;
  statut?: string;
  score?: number;
  est_qualifie?: boolean;
  department?: string;
  seniority?: string;
  decision_maker?: boolean;
}

interface LeadsViewProps {
  leads: Lead[];
  onOpenLead: (lead: Lead) => void;
  onRefresh: () => void;
}

export default function LeadsView({ leads, onOpenLead, onRefresh }: LeadsViewProps) {
  const { showToast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [decisionMakerOnly, setDecisionMakerOnly] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const itemsPerPage = 20;


  const filteredLeads = useMemo(() => {
    return leads.filter(lead => {
      const q = searchTerm.toLowerCase();
      const matchSearch = 
        (lead.nom || '').toLowerCase().includes(q) ||
        (lead.prenom || '').toLowerCase().includes(q) ||
        (lead.email || '').toLowerCase().includes(q) ||
        (lead.entreprise || '').toLowerCase().includes(q) ||
        (lead.poste || '').toLowerCase().includes(q) ||
        (lead.secteur || '').toLowerCase().includes(q) ||
        (lead.pays || '').toLowerCase().includes(q);

      const isDecMaker = lead.decision_maker === true || /ceo|cto|cfo|coo|cmo|founder|fondateur|director|vp|president|head/i.test(lead.poste || '');
      if (decisionMakerOnly && !isDecMaker) return false;

      return matchSearch;
    }).sort((a, b) => new Date(b.date_collecte).getTime() - new Date(a.date_collecte).getTime());
  }, [leads, searchTerm, decisionMakerOnly]);

  const totalPages = Math.max(1, Math.ceil(filteredLeads.length / itemsPerPage));
  const paginatedLeads = filteredLeads.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleCopyEmail = (e: React.MouseEvent, lead: Lead) => {
    e.stopPropagation();
    navigator.clipboard.writeText(lead.email);
    setCopiedId(lead.id);
    showToast(`Email de ${lead.prenom} ${lead.nom} copié !`, 'info');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleRefreshClick = () => {
    setIsRefreshing(true);
    onRefresh();
    setTimeout(() => setIsRefreshing(false), 600);
  };

  const exportCsv = () => {
    const headers = ['Nom', 'Prénom', 'Email', 'Poste', 'Entreprise', 'Secteur', 'Pays', 'Source', 'Date de collecte', 'Décideur'];
    const rows = filteredLeads.map(l => [
      `"${(l.nom || '').replace(/"/g, '""')}"`,
      `"${(l.prenom || '').replace(/"/g, '""')}"`,
      `"${(l.email || '').replace(/"/g, '""')}"`,
      `"${(l.poste || '').replace(/"/g, '""')}"`,
      `"${(l.entreprise || '').replace(/"/g, '""')}"`,
      `"${(l.secteur || '').replace(/"/g, '""')}"`,
      `"${(l.pays || '').replace(/"/g, '""')}"`,
      `"${(l.source || 'Sourcing').replace(/"/g, '""')}"`,
      `"${new Date(l.date_collecte).toLocaleDateString('fr-FR')}"`,
      `"${l.decision_maker ? 'Oui' : 'Non'}"`
    ]);

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `sourcing_candidats_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Export CSV téléchargé avec succès', 'success');
  };

  return (
    <div className="sourcing-leads-view">
      
      {/* 1. TOP HEADER & ACTIONS */}
      <div className="leads-view-header">
        <div className="header-title-group">
          <div className="title-badge-row">
            <h2>
              Base de Candidats & Leads
            </h2>
            <span className="intelligence-badge">
              <Sparkles size={11} /> Sourcing Intelligence
            </span>
          </div>
          <p>
            Profils qualifiés extraits par l'IA et disponibles pour vos campagnes de prospection.
          </p>
        </div>

        <div className="header-actions-group">
          <button 
            onClick={handleRefreshClick}
            className="btn-refresh"
          >
            <RefreshCw size={14} className={isRefreshing ? 'spin-anim' : ''} />
            Actualiser
          </button>

          <button 
            onClick={exportCsv}
            className="btn-export"
          >
            <Download size={14} />
            Exporter CSV
          </button>
        </div>
      </div>


      {/* 3. CLEAN SEARCH & TOGGLE BAR */}
      <div className="leads-filters-bar">
        {/* Search Input */}
        <div className="search-box">
          <Search size={16} className="search-icon" />
          <input 
            type="text" 
            placeholder="Rechercher un candidat, entreprise, poste, secteur, email..." 
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="search-input"
          />
        </div>

        {/* Action Controls */}
        <div className="filter-actions">
          {/* Decision Maker Toggle Button */}
          <button
            onClick={() => {
              setDecisionMakerOnly(!decisionMakerOnly);
              setCurrentPage(1);
            }}
            className={`decision-maker-toggle ${decisionMakerOnly ? 'active' : ''}`}
          >
            <Target size={14} />
            Décideurs uniquement
          </button>

          {/* Reset Filters */}
          {(searchTerm || decisionMakerOnly) && (
            <button
              onClick={() => {
                setSearchTerm('');
                setDecisionMakerOnly(false);
                setCurrentPage(1);
              }}
              className="btn-reset-filters"
            >
              <X size={13} />
              Effacer
            </button>
          )}
        </div>
      </div>

      {/* 4. SOURCING CANDIDATES TABLE */}
      <div className="sourcing-table-wrapper">
        <div className="sourcing-table-scroll" style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', width: '100%' }}>
          <table className="sourcing-table">
            <thead>
              <tr>
                <th className="col-candidate">Candidat & Contact</th>
                <th className="col-job">Poste & Responsabilité</th>
                <th className="col-company">Entreprise & Secteur</th>
                <th className="col-source">Source</th>
                <th className="col-date">Date de collecte</th>
                <th className="col-action text-right">Dossier</th>
              </tr>
            </thead>
            <tbody>
              {paginatedLeads.length === 0 ? (
                <tr>
                  <td colSpan={6} className="table-empty-state">
                    <div className="empty-icon-circle">
                      <Users size={28} />
                    </div>
                    <div className="empty-title">
                      Aucun candidat ne correspond à vos critères
                    </div>
                    <p className="empty-subtitle">
                      {leads.length === 0 
                        ? "Lancez une session de sourcing ou activez l'autopilot pour extraire vos premiers candidats." 
                        : "Essayez de modifier vos termes de recherche ou de réinitialiser les filtres."}
                    </p>
                  </td>
                </tr>
              ) : (
                paginatedLeads.map(lead => {
                  const initials = `${(lead.prenom || '')[0] || ''}${(lead.nom || '')[0] || ''}`.toUpperCase() || 'L';
                  const isDecMaker = lead.decision_maker === true || /ceo|cto|cfo|coo|cmo|founder|fondateur|director|vp|president|head/i.test(lead.poste || '');

                  return (
                    <tr 
                      key={lead.id} 
                      onClick={() => onOpenLead(lead)}
                    >
                      {/* 1. CANDIDAT */}
                      <td className="col-candidate">
                        <div className="candidate-cell">
                          <div className="candidate-avatar">
                            {initials}
                          </div>
                          <div className="candidate-info">
                            <div className="candidate-name">
                              {lead.prenom} {lead.nom}
                            </div>
                            {lead.poste && (
                              <div className="candidate-job-mobile">
                                <Briefcase size={11} />
                                <span>{lead.poste}</span>
                              </div>
                            )}
                            <div className="candidate-email-row">
                              <span className="candidate-email">
                                {lead.email}
                              </span>
                              <button
                                onClick={(e) => handleCopyEmail(e, lead)}
                                title="Copier l'email"
                                className={`copy-email-btn ${copiedId === lead.id ? 'copied' : ''}`}
                              >
                                {copiedId === lead.id ? <Check size={12} /> : <Copy size={12} />}
                              </button>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* 2. POSTE & SENIORITY */}
                      <td className="col-job">
                        <div className="job-cell">
                          <div className="job-title">
                            <Briefcase size={13} />
                            <span>{lead.poste || 'Poste non spécifié'}</span>
                          </div>
                          <div className="job-tags">
                            {isDecMaker && (
                              <span className="decision-maker-pill">
                                <Target size={10} /> Décideur
                              </span>
                            )}
                            {lead.seniority && (
                              <span className="seniority-tag">
                                {lead.seniority}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* 3. ENTREPRISE & SECTEUR */}
                      <td className="col-company">
                        <div className="company-cell">
                          <div className="company-name">
                            <Building size={14} />
                            <span>{lead.entreprise || 'Entreprise non spécifiée'}</span>
                          </div>
                          {isDecMaker && (
                            <span className="decision-maker-pill company-dec-mobile">
                              <Target size={10} /> Décideur
                            </span>
                          )}
                          <div className="company-meta">
                            {lead.secteur && (
                              <span className="sector-tag">
                                {lead.secteur}
                              </span>
                            )}
                            {lead.pays && (
                              <span className="country-tag">
                                <MapPin size={10} /> {lead.pays}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* 4. SOURCE */}
                      <td className="col-source">
                        <span className="source-tag">
                          {lead.source || 'Sourcing Engine'}
                        </span>
                      </td>

                      {/* 5. DATE DE COLLECTE */}
                      <td className="col-date">
                        <div className="date-cell">
                          <Calendar size={13} />
                          {lead.date_collecte ? new Date(lead.date_collecte).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}
                        </div>
                      </td>

                      {/* 6. DOSSIER ACTION */}
                      <td className="col-action text-right">
                        <div className="dossier-action-btn">
                          <span>Dossier</span>
                          <ArrowUpRight size={13} />
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* 5. PAGINATION BAR */}
        {filteredLeads.length > 0 && (
          <div className="sourcing-pagination-bar">
            <div className="pagination-info">
              Affichage de <span>{(currentPage - 1) * itemsPerPage + 1}</span> à <span>{Math.min(currentPage * itemsPerPage, filteredLeads.length)}</span> sur <span>{filteredLeads.length}</span> candidats
            </div>

            <div className="pagination-controls">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="pagination-btn"
              >
                <ChevronLeft size={14} /> Précédent
              </button>

              <span className="pagination-counter">
                Page <strong>{currentPage}</strong> / {totalPages}
              </span>

              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="pagination-btn"
              >
                Suivant <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
