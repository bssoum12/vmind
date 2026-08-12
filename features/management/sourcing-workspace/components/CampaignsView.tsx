'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'next/navigation';

interface EmailCampaign {
  id: number;
  lead_id: number;
  sujet: string;
  corps: string;
  date_envoi: string;
  statut: string;
  erreur?: string | null;
  nom: string;
  prenom: string;
  email: string;
  entreprise?: string | null;
  cc?: string | null;
  mode_envoi?: string;
}

interface CampaignsViewProps {
  campaigns: EmailCampaign[];
  onRefresh: () => void;
  defaultCc: string;
  onOpenLeadById: (id: number) => void;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function CampaignsView({ campaigns, onRefresh, defaultCc, onOpenLeadById }: CampaignsViewProps) {
  const params = useParams();
  const agentId = params.agentId;
  const [selectedEmail, setSelectedEmail] = useState<EmailCampaign | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sujet, setSujet] = useState('');
  const [corps, setCorps] = useState('');
  const [cc, setCc] = useState('');
  const [isSending, setIsSending] = useState(false);
  
  // Filters and Pagination
  const [statusFilter, setStatusFilter] = useState('All');
  const [modeFilter, setModeFilter] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Sync input fields when a new email is selected
  useEffect(() => {
    if (selectedEmail) {
      setSujet(selectedEmail.sujet || '');
      setCorps(selectedEmail.corps || '');
      setCc(selectedEmail.cc !== undefined && selectedEmail.cc !== null ? selectedEmail.cc : (defaultCc || ''));
    }
  }, [selectedEmail, defaultCc]);

  // Filter campaigns by search query
  const filteredCampaigns = useMemo(() => {
    return campaigns.filter((email) => {
      // Status filter
      if (statusFilter !== 'All') {
        if (statusFilter === 'Succès' && !['Succès', 'Envoyé'].includes(email.statut)) return false;
        else if (statusFilter === 'Erreur' && !['Erreur', 'Echec'].includes(email.statut)) return false;
        else if (!['Succès', 'Erreur'].includes(statusFilter) && email.statut !== statusFilter) return false;
      }
      
      // Mode filter
      const mode = email.mode_envoi || 'Manuel';
      if (modeFilter !== 'All' && mode !== modeFilter) return false;

      // Text search
      const term = searchQuery.toLowerCase();
      if (!term) return true;
      
      return (
        `${email.prenom} ${email.nom}`.toLowerCase().includes(term) ||
        email.email.toLowerCase().includes(term) ||
        (email.sujet || '').toLowerCase().includes(term) ||
        (email.corps || '').toLowerCase().includes(term) ||
        (email.entreprise || '').toLowerCase().includes(term)
      );
    });
  }, [campaigns, searchQuery, statusFilter, modeFilter]);

  const totalPages = Math.ceil(filteredCampaigns.length / itemsPerPage);
  const paginatedCampaigns = filteredCampaigns.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Calculate statistics
  const totalEmailed = campaigns.length;
  const totalSuccess = campaigns.filter(c => c.statut === 'Envoyé' || c.statut === 'Succès').length;
  const totalFailed = campaigns.filter(c => c.statut === 'Erreur' || c.statut === 'Echec').length;
  const totalDrafts = campaigns.filter(c => c.statut === 'Brouillon').length;
  
  // Deliverability rate calculated on actual sent attempts (excluding drafts)
  const totalSentAttempts = totalSuccess + totalFailed;
  const successRate = totalSentAttempts > 0 ? Math.round((totalSuccess / totalSentAttempts) * 100) : 0;

  const handleSendEmail = async () => {
    if (!selectedEmail) return;
    setIsSending(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/agent-leads/${agentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('vmind_session')}` },
        body: JSON.stringify({
          id: selectedEmail.lead_id,
          action: 'send_email',
          sujet,
          corps,
          cc,
          emailStatut: 'Succès',
          errorMsg: null
        }),
      });

      if (res.ok) {
        setSelectedEmail(null);
        onRefresh();
      }
    } catch (error) {
      console.error('Email sending error:', error);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fade-in">
      <div className="view-header">
        <div className="view-title">
          <h1>Suivi des Campagnes</h1>
          <p>Historique et taux de délivrabilité des emails de sourcing personnalisés</p>
        </div>
      </div>

      {/* Campaign Stats */}
      <div className="metrics-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
        <div className="card metric-card secondary">
          <span className="metric-title">Emails Total</span>
          <div className="metric-value-container">
            <span className="metric-value">{totalEmailed}</span>
            <span className="metric-subtext">générés</span>
          </div>
        </div>

        <div className="card metric-card success">
          <span className="metric-title">Taux de Délivrabilité</span>
          <div className="metric-value-container">
            <span className="metric-value">{successRate}%</span>
            <span className="metric-subtext">d'envois réussis</span>
          </div>
        </div>

        <div className="card metric-card warning" style={{ borderColor: totalFailed > 0 ? 'var(--danger)' : 'var(--border-color)' }}>
          <span className="metric-title">Mails en Échec</span>
          <div className="metric-value-container">
            <span className="metric-value" style={{ color: totalFailed > 0 ? 'var(--danger)' : 'var(--text-primary)' }}>
              {totalFailed}
            </span>
            <span className="metric-subtext">erreurs SMTP</span>
          </div>
        </div>

        <div className="card metric-card" style={{ borderColor: totalDrafts > 0 ? 'rgba(245, 158, 11, 0.3)' : 'var(--border-color)', backgroundColor: totalDrafts > 0 ? 'rgba(245, 158, 11, 0.03)' : 'inherit' }}>
          <span className="metric-title">Brouillons</span>
          <div className="metric-value-container">
            <span className="metric-value" style={{ color: totalDrafts > 0 ? '#f59e0b' : 'var(--text-primary)' }}>
              {totalDrafts}
            </span>
            <span className="metric-subtext">à finaliser</span>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="filters-bar" style={{ marginBottom: '1.5rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
        <div className="search-input-wrapper" style={{ flex: 1, minWidth: '300px' }}>
          <span className="search-icon">🔍</span>
          <input
            type="text"
            placeholder="Rechercher par destinataire, entreprise, sujet ou contenu..."
            className="search-input"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
          />
        </div>

        {/* Status Filter */}
        <select
          className="filter-select"
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setCurrentPage(1);
          }}
        >
          <option value="All">Tous les statuts</option>
          <option value="Succès">Succès / Délivré</option>
          <option value="Erreur">Erreur</option>
          <option value="Brouillon">Brouillon</option>
          {Array.from(new Set(campaigns.map(c => c.statut).filter(Boolean))).filter(s => !['Succès', 'Erreur', 'Brouillon', 'Envoyé', 'Echec'].includes(s)).map(st => (
            <option key={st} value={st}>{st}</option>
          ))}
        </select>

        {/* Mode Filter */}
        <select
          className="filter-select"
          value={modeFilter}
          onChange={(e) => {
            setModeFilter(e.target.value);
            setCurrentPage(1);
          }}
        >
          <option value="All">Tous les modes</option>
          <option value="Auto">🤖 Automatique</option>
          <option value="Manuel">👤 Manuel</option>
          {Array.from(new Set(campaigns.map(c => c.mode_envoi).filter(Boolean))).filter(m => m !== 'Auto' && m !== 'Manuel').map(mode => (
            <option key={mode} value={mode}>{mode}</option>
          ))}
        </select>
      </div>

      {/* Emailed Leads Table & Detail */}
      <div style={{ display: 'grid', gridTemplateColumns: selectedEmail ? '3fr 2fr' : '1fr', gap: '1.5rem', alignItems: 'start' }}>
        {/* Table List */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-color)', fontWeight: 600 }}>
            Historique des Envois
          </div>
          <div className="table-container" style={{ border: 'none', margin: 0, borderRadius: 0, boxShadow: 'none' }}>
            <table className="leads-table">
              <thead>
                <tr>
                  <th>Destinataire</th>
                  <th>Sujet</th>
                  <th>Date Envoi</th>
                  <th>Statut</th>
                  <th>Mode</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedCampaigns.length > 0 ? (
                  paginatedCampaigns.map((email) => (
                    <tr key={email.id} className={selectedEmail?.id === email.id ? 'active' : ''} style={{ cursor: 'pointer' }} onClick={() => setSelectedEmail(email)}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{email.prenom} {email.nom}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{email.email}</div>
                      </td>
                      <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {email.sujet}
                      </td>
                      <td style={{ fontSize: '0.85rem' }}>
                        {email.date_envoi 
                          ? new Date(email.date_envoi).toLocaleString('fr-FR', {
                              day: 'numeric',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit'
                            })
                          : 'Non renseigné'}
                      </td>
                      <td>
                        <span className={`badge badge-${
                          email.statut === 'Succès' 
                            ? 'sent' 
                            : email.statut === 'Brouillon' 
                              ? 'draft' 
                              : 'error'
                        }`}>
                          {email.statut === 'Succès' ? 'Délivré' : email.statut === 'Brouillon' ? 'Brouillon' : 'Erreur'}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontSize: '0.8rem', padding: '0.25rem 0.5rem', borderRadius: '4px', backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)', fontWeight: 600 }}>
                          {email.mode_envoi || 'Manuel'}
                        </span>
                      </td>
                      <td>
                        <button className="btn btn-secondary" style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }} onClick={(e) => {
                          e.stopPropagation();
                          setSelectedEmail(email);
                        }}>
                          Prévisualiser 👁️
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                      Aucun email ne correspond aux critères de recherche.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="pagination" style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--border-color)' }}>
              <span className="pagination-text">
                Affichage de {Math.min(filteredCampaigns.length, (currentPage - 1) * itemsPerPage + 1)} à{' '}
                {Math.min(filteredCampaigns.length, currentPage * itemsPerPage)} sur {filteredCampaigns.length} envois
              </span>
              <div className="pagination-buttons">
                <button
                  className="btn btn-secondary"
                  style={{ padding: '0.4rem 0.8rem' }}
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(currentPage - 1)}
                >
                  Précédent
                </button>
                <span className="pagination-text" style={{ margin: '0 0.5rem', fontWeight: 600 }}>
                  {currentPage} / {totalPages}
                </span>
                <button
                  className="btn btn-secondary"
                  style={{ padding: '0.4rem 0.8rem' }}
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(currentPage + 1)}
                >
                  Suivant
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Selected Email Preview Panel */}
        {selectedEmail && (
          <div className="card fade-in" style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '1.25rem',
            position: 'sticky',
            top: '2rem'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
              <span style={{ fontWeight: 'bold' }}>Aperçu & Édition du Message</span>
              <button 
                onClick={() => setSelectedEmail(null)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1rem' }}
              >
                ✕
              </button>
            </div>

            <div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Destinataire</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontWeight: 600 }}>{selectedEmail.prenom} {selectedEmail.nom} ({selectedEmail.email})</div>
                <button 
                  className="btn btn-secondary" 
                  style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}
                  onClick={() => onOpenLeadById(selectedEmail.lead_id)}
                >
                  Voir Prospect 👁️
                </button>
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Sujet</div>
              <input 
                type="text" 
                className="email-input" 
                style={{ width: '100%', padding: '0.5rem', borderRadius: 'var(--border-radius-sm)', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                value={sujet}
                onChange={(e) => setSujet(e.target.value)}
              />
            </div>

            <div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Copie conforme (CC)</div>
              <input 
                type="text" 
                className="email-input" 
                style={{ width: '100%', padding: '0.5rem', borderRadius: 'var(--border-radius-sm)', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                value={cc}
                onChange={(e) => setCc(e.target.value)}
                placeholder="exemple@ent.com"
              />
            </div>

            <div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Corps du message</div>
              <textarea 
                className="email-textarea" 
                style={{ width: '100%', minHeight: '200px', fontSize: '0.9rem', lineHeight: '1.5' }}
                value={corps}
                onChange={(e) => setCorps(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button 
                className="btn btn-primary" 
                style={{ flex: 1 }}
                onClick={handleSendEmail}
                disabled={isSending}
              >
                {isSending ? 'Envoi...' : '✉ Ouvrir & Envoyer'}
              </button>
            </div>

            {selectedEmail.statut === 'Erreur' && (
              <div 
                style={{ 
                  backgroundColor: 'var(--danger-glow)', 
                  border: '1px solid rgba(239, 68, 68, 0.2)', 
                  borderRadius: 'var(--border-radius-md)', 
                  padding: '0.75rem',
                  fontSize: '0.85rem',
                  color: '#fca5a5'
                }}
              >
                <strong>Détail de l'erreur précédente :</strong> {selectedEmail.erreur}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
