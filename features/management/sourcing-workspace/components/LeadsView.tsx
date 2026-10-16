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
  X,
  Phone,
  Smartphone,
  Linkedin,
  Globe,
  Lock
} from 'lucide-react';
import { useToast } from '@/shared/contexts/ToastContext';
import { extractLeadMobile, extractCompanyPhone, maskCompanyLogoUrl } from '@/shared/utils/phoneExtractor';

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
  // Extra enrichments
  mobile?: string;
  phone_hq?: string;
  linkedin_url?: string;
  headline?: string;
  city?: string;
  country_code?: string;
  company_logo_url?: string;
  industry?: string;
  employee_count?: number;
  domain?: string;
  job_history?: any;
  sourcing_provider?: string;
  person_raw?: any;
  company_raw?: any;
  verification_status?: string;
  enriched_at?: string;
}

interface LeadsViewProps {
  leads: Lead[];
  onOpenLead: (lead: Lead) => void;
  onRefresh: () => void;
}

function LeadCompanyAvatar({ lead, initials }: { lead: Lead; initials: string }) {
  const [imgError, setImgError] = useState(false);
  const logoUrl = maskCompanyLogoUrl(lead.company_logo_url);

  if (logoUrl && !imgError) {
    return (
      <div 
        className="candidate-avatar candidate-avatar--logo"
        title={lead.entreprise ? `${lead.entreprise} (Entreprise)` : undefined}
      >
        <img
          src={logoUrl}
          alt={lead.entreprise || ''}
          onError={() => setImgError(true)}
        />
      </div>
    );
  }

  return (
    <div className="candidate-avatar">
      {initials}
    </div>
  );
}

export default function LeadsView({ leads, onOpenLead, onRefresh }: LeadsViewProps) {
  const { showToast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [decisionMakerOnly, setDecisionMakerOnly] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [copiedPhoneId, setCopiedPhoneId] = useState<number | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const itemsPerPage = 20;

  const filteredLeads = useMemo(() => {
    return leads.filter(lead => {
      const q = searchTerm.toLowerCase();
      const directMobile = extractLeadMobile(lead.mobile, lead.person_raw);
      const companyPhone = extractCompanyPhone(lead.phone_hq, lead.company_raw);
      const matchSearch = 
        (lead.nom || '').toLowerCase().includes(q) ||
        (lead.prenom || '').toLowerCase().includes(q) ||
        (lead.email || '').toLowerCase().includes(q) ||
        (lead.entreprise || '').toLowerCase().includes(q) ||
        (lead.poste || '').toLowerCase().includes(q) ||
        (lead.secteur || '').toLowerCase().includes(q) ||
        (lead.pays || '').toLowerCase().includes(q) ||
        (lead.city || '').toLowerCase().includes(q) ||
        (lead.industry || '').toLowerCase().includes(q) ||
        (lead.headline || '').toLowerCase().includes(q) ||
        (directMobile || '').toLowerCase().includes(q) ||
        (companyPhone || '').toLowerCase().includes(q);

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

  const handleCopyPhone = (e: React.MouseEvent, lead: Lead, phoneNum: string, type: 'Mobile' | 'Standard') => {
    e.stopPropagation();
    navigator.clipboard.writeText(phoneNum);
    setCopiedPhoneId(lead.id);
    showToast(`${type} de ${lead.prenom} ${lead.nom} copié !`, 'info');
    setTimeout(() => setCopiedPhoneId(null), 2000);
  };

  const handleRefreshClick = () => {
    setIsRefreshing(true);
    onRefresh();
    setTimeout(() => setIsRefreshing(false), 600);
  };

  const exportCsv = () => {
    const headers = [
      'Nom', 'Prénom', 'Email', 'Mobile Direct', 'Standard Entreprise', 
      'Poste', 'Entreprise', 'Site Web', 'Secteur', 'Industrie', 
      'Ville', 'Pays', 'LinkedIn URL', 'Effectif', 'Statut Vérification', 
      'Source', 'Moteur', 'Date de collecte', 'Décideur'
    ];
    const rows = filteredLeads.map(l => {
      const directMobile = extractLeadMobile(l.mobile, l.person_raw) || '';
      const companyPhone = extractCompanyPhone(l.phone_hq, l.company_raw) || '';

      return [
        `"${(l.nom || '').replace(/"/g, '""')}"`,
        `"${(l.prenom || '').replace(/"/g, '""')}"`,
        `"${(l.email || '').replace(/"/g, '""')}"`,
        `"${(directMobile || '').replace(/"/g, '""')}"`,
        `"${(companyPhone || '').replace(/"/g, '""')}"`,
        `"${(l.poste || '').replace(/"/g, '""')}"`,
        `"${(l.entreprise || '').replace(/"/g, '""')}"`,
        `"${(l.domain || '').replace(/"/g, '""')}"`,
        `"${(l.secteur || '').replace(/"/g, '""')}"`,
        `"${(l.industry || l.secteur || '').replace(/"/g, '""')}"`,
        `"${(l.city || '').replace(/"/g, '""')}"`,
        `"${(l.pays || l.country_code || '').replace(/"/g, '""')}"`,
        `"${(l.linkedin_url || '').replace(/"/g, '""')}"`,
        `"${l.employee_count ? l.employee_count : ''}"`,
        `"${(l.verification_status || '').replace(/"/g, '""')}"`,
        `"Sourcing IA"`,
        `"Sourcing IA"`,
        `"${new Date(l.date_collecte).toLocaleDateString('fr-FR')}"`,
        `"${l.decision_maker ? 'Oui' : 'Non'}"`
      ];
    });

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `sourcing_candidats_enrichis_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Export CSV enrichi téléchargé avec succès', 'success');
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
                <th className="col-date">Date de collecte</th>
                <th className="col-action text-right">Dossier</th>
              </tr>
            </thead>
            <tbody>
              {paginatedLeads.length === 0 ? (
                <tr>
                  <td colSpan={5} className="table-empty-state">
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
                  const leadDirectPhone = extractLeadMobile(lead.mobile, lead.person_raw);
                  const companyPhone = extractCompanyPhone(lead.phone_hq, lead.company_raw);

                  return (
                    <tr 
                      key={lead.id} 
                      onClick={() => onOpenLead(lead)}
                    >
                      {/* 1. CANDIDAT */}
                      <td className="col-candidate">
                        <div className="candidate-cell">
                          <LeadCompanyAvatar lead={lead} initials={initials} />
                          <div className="candidate-info">
                            <div className="candidate-name" style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                              <span>{lead.prenom} {lead.nom}</span>
                              {lead.linkedin_url && (
                                <a
                                  href={lead.linkedin_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  title="Consulter le profil LinkedIn certifié"
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    width: 17,
                                    height: 17,
                                    borderRadius: 4,
                                    background: 'rgba(10, 102, 194, 0.18)',
                                    border: '1px solid rgba(56, 189, 248, 0.4)',
                                    color: '#38BDF8',
                                    textDecoration: 'none',
                                    transition: 'all 0.15s'
                                  }}
                                >
                                  <Linkedin size={10} />
                                </a>
                              )}
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
                                style={{
                                  background: 'transparent',
                                  border: 'none',
                                  padding: '2px',
                                  cursor: 'pointer',
                                  color: copiedId === lead.id ? '#00E5A0' : 'var(--text-muted)',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  transition: 'color 0.15s ease'
                                }}
                              >
                                {copiedId === lead.id ? <Check size={12} color="#00E5A0" /> : <Copy size={12} />}
                              </button>
                            </div>
                            {/* Lead Direct Mobile */}
                            {leadDirectPhone && (
                              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 4 }}>
                                {leadDirectPhone.includes('*') ? (
                                  <span
                                    title="Numéro direct disponible (masqué) — Passer à un forfait supérieur pour débloquer"
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: 4,
                                      fontSize: '0.73rem',
                                      fontWeight: 600,
                                      color: '#F59E0B',
                                      background: 'rgba(245, 158, 11, 0.1)',
                                      border: '1px solid rgba(245, 158, 11, 0.3)',
                                      padding: '2px 7px',
                                      borderRadius: 4,
                                      letterSpacing: '0.02em',
                                      cursor: 'default'
                                    }}
                                  >
                                    <Lock size={10} />
                                    <span>{leadDirectPhone}</span>
                                  </span>
                                ) : (
                                  <>
                                    <a
                                      href={`tel:${leadDirectPhone}`}
                                      onClick={(e) => e.stopPropagation()}
                                      title="Appeler sur mobile direct"
                                      style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: 4,
                                        fontSize: '0.73rem',
                                        fontWeight: 600,
                                        color: '#00E5C8',
                                        background: 'rgba(0, 229, 200, 0.1)',
                                        border: '1px solid rgba(0, 229, 200, 0.3)',
                                        padding: '2px 7px',
                                        borderRadius: 4,
                                        textDecoration: 'none'
                                      }}
                                    >
                                      <Smartphone size={10} />
                                      <span>{leadDirectPhone}</span>
                                    </a>
                                    <button
                                      onClick={(e) => handleCopyPhone(e, lead, leadDirectPhone, 'Mobile')}
                                      title="Copier le mobile direct"
                                      style={{
                                        background: 'transparent',
                                        border: 'none',
                                        padding: '2px 4px',
                                        cursor: 'pointer',
                                        color: copiedPhoneId === lead.id ? '#00E5A0' : 'var(--text-muted)',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        transition: 'color 0.15s ease'
                                      }}
                                    >
                                      {copiedPhoneId === lead.id ? <Check size={11} color="#00E5A0" /> : <Copy size={11} />}
                                    </button>
                                  </>
                                )}
                              </div>
                            )}
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
                          <div className="company-name" style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                            <Building size={14} style={{ flexShrink: 0, color: 'var(--accent-primary)' }} />
                            <span style={{ fontWeight: 600 }}>{lead.entreprise || 'Entreprise non spécifiée'}</span>
                          </div>
                          {isDecMaker && (
                            <span className="decision-maker-pill company-dec-mobile">
                              <Target size={10} /> Décideur
                            </span>
                          )}
                          <div 
                            className="company-meta"
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              flexWrap: 'wrap',
                              gap: '4px 7px',
                              maxWidth: 320
                            }}
                          >
                            {(lead.industry || lead.secteur) && (
                              <span className="sector-tag" title={lead.industry || lead.secteur} style={{ whiteSpace: 'nowrap' }}>
                                {lead.industry || lead.secteur}
                              </span>
                            )}
                            {(lead.city || lead.pays) && (
                              <span className="country-tag" style={{ whiteSpace: 'nowrap' }}>
                                <MapPin size={10} /> {lead.city ? `${lead.city}, ${lead.pays || lead.country_code || ''}` : lead.pays}
                              </span>
                            )}
                            {companyPhone && (
                              <span className="country-tag" title={`Standard Entreprise: ${companyPhone}`} style={{ color: '#38BDF8', borderColor: 'rgba(56, 189, 248, 0.25)', display: 'inline-flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap' }}>
                                <Phone size={10} /> {companyPhone}
                              </span>
                            )}
                            {lead.employee_count && (
                              <span className="sector-tag" style={{ background: 'rgba(56, 189, 248, 0.08)', color: '#38BDF8', borderColor: 'rgba(56, 189, 248, 0.25)', whiteSpace: 'nowrap' }}>
                                <Users size={10} style={{ marginRight: 3 }} />
                                {lead.employee_count} emp.
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* 4. DATE DE COLLECTE */}
                      <td className="col-date">
                        <div className="date-cell">
                          <Calendar size={13} />
                          {lead.date_collecte ? new Date(lead.date_collecte).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}
                        </div>
                      </td>

                      {/* 5. DOSSIER ACTION */}
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
