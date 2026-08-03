'use client';


import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const getAuthHeaders = () => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('vmind_session') : '';
  return {
    'Content-Type': 'application/json',
    'Authorization': token ? `Bearer ${token}` : ''
  };
};

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
  statut: string;
  score: number | null;
  raison: string | null;
  potentiel: string | null;
  email_statut?: string | null;
  email_erreur?: string | null;
  sujet?: string | null;
  corps?: string | null;
  modele_utilise?: string | null;
  date_analyse?: string | null;
  email_cc?: string | null;
  emails_count?: number;
  agent_emails_count?: number;
  date_envoi?: string | null;
}

interface LeadDetailDrawerProps {
  lead: Lead | null;
  isOpen: boolean;
  onClose: () => void;
  onRefresh: () => void;
  threshold: number;
  signature: string;
  defaultCc: string;
}

export default function LeadDetailDrawer({ lead, isOpen, onClose, onRefresh, threshold, signature, defaultCc }: LeadDetailDrawerProps) {
  const [sujet, setSujet] = useState('');
  const [corps, setCorps] = useState('');
  const [cc, setCc] = useState('');
  const [statut, setStatut] = useState('');
  const [isQualifying, setIsQualifying] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isSavingEmail, setIsSavingEmail] = useState(false);
  const [isGeneratingEmail, setIsGeneratingEmail] = useState(false);

  const params = useParams();
  const agentId = params.agentId;

  useEffect(() => {
    if (lead) {
      setSujet(lead.sujet || '');
      setStatut(lead.statut || '');
      setCorps(lead.corps || '');
      setCc(lead.email_cc !== undefined && lead.email_cc !== null ? lead.email_cc : (defaultCc || ''));

      // Reset loading states when switching leads
      setIsQualifying(false);
      setIsSending(false);
      setIsGeneratingEmail(false);
      setIsSavingEmail(false);
    }
  }, [lead, defaultCc]);

  if (!lead) return null;

  const handleManualStatusChange = async (newStatus: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/agent-leads/${agentId}`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          id: lead.id,
          action: 'update_status',
          status: newStatus
        }),
      });
      if (res.ok) {
        setStatut(newStatus);
        onRefresh();
      }
    } catch (error) {
      console.error('Error changing status:', error);
    }
  };

  const handleQualifyIA = async () => {
    setIsQualifying(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/prospect-agent/qualify`, {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'Idempotency-Key': crypto.randomUUID()
        },
        body: JSON.stringify({ lead_ids: [lead.id], agentId }),
      });

      if (res.ok) {
        onRefresh();
      } else {
        console.error('Erreur lors de la qualification par IA');
      }
    } catch (error) {
      console.error('IA Qualification error:', error);
    } finally {
      setIsQualifying(false);
    }
  };

  const handleGenerateEmail = async () => {
    setIsGeneratingEmail(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/agent-leads/${agentId}`, {
        method: 'PATCH',
        headers: {
          ...getAuthHeaders(),
          'Idempotency-Key': crypto.randomUUID()
        },
        body: JSON.stringify({
          id: lead.id,
          action: 'generate_email'
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.email) {
          setSujet(data.email.sujet || '');
          setCorps(data.email.corps || '');
        }
        onRefresh();
      }
    } catch (error) {
      console.error('Email generation error:', error);
    } finally {
      setIsGeneratingEmail(false);
    }
  };

  const handleSendEmail = async () => {
    setIsSending(true);
    try {
      // Construct mailto link and redirect to open client (Outlook/Mail)
      const ccPart = cc ? `&cc=${encodeURIComponent(cc)}` : '';
      const mailtoUrl = `mailto:${encodeURIComponent(lead.email)}?subject=${encodeURIComponent(sujet)}&body=${encodeURIComponent(corps)}${ccPart}`;
      window.location.href = mailtoUrl;

      // Record in DB with Success status (statut of lead remains unchanged)
      const res = await fetch(`${API_BASE_URL}/api/agent-leads/${agentId}`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          id: lead.id,
          action: 'send_email',
          sujet,
          corps,
          cc,
          emailStatut: 'Succès',
          errorMsg: null
        }),
      });

      if (res.ok) {
        onRefresh();
        onClose();
      }
    } catch (error) {
      console.error('Email sending error:', error);
    } finally {
      setIsSending(false);
    }
  };

  const isQualified = statut.includes('Qualifi') ? true : statut.includes('cart') ? false : ((lead as any).est_qualifie === true || (lead.score !== null && lead.score >= threshold));

  return (
    <>
      <div className={`drawer ${isOpen ? 'open' : ''}`}>
        <div className="drawer-header">
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>
              {lead.prenom} {lead.nom}
            </h2>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>ID: {lead.id}</span>
          </div>
          <button className="drawer-close" onClick={onClose}>✕</button>
        </div>

        <div className="drawer-content">
          {/* Main Info */}
          <div className="drawer-section">
            <h3 className="drawer-section-title">Informations de Contact</h3>
            <div className="lead-detail-grid">
              <div>
                <span className="detail-item-label">Email</span>
                <div className="detail-item-value" style={{ wordBreak: 'break-all' }}>{lead.email}</div>
              </div>
              <div>
                <span className="detail-item-label">Entreprise</span>
                <div className="detail-item-value">{lead.entreprise || 'Non renseigné'}</div>
              </div>
              <div>
                <span className="detail-item-label">Poste</span>
                <div className="detail-item-value">{lead.poste || 'Non renseigné'}</div>
              </div>
              <div>
                <span className="detail-item-label">Secteur</span>
                <div className="detail-item-value">{lead.secteur || 'Non renseigné'}</div>
              </div>
              <div>
                <span className="detail-item-label">Taille</span>
                <div className="detail-item-value">
                  {lead.taille_ent ? `${lead.taille_ent} employés` : 'Non renseigné'}
                </div>
              </div>
              <div>
                <span className="detail-item-label">Pays</span>
                <div className="detail-item-value">{lead.pays || 'Non renseigné'}</div>
              </div>
              <div>
                <span className="detail-item-label">Source Ingestion</span>
                <div className="detail-item-value">
                  {lead.source === 'CSV' ? '📁 CSV' : lead.source === 'Webhook' ? '⚡ Webhook' : '🔗 API'}
                </div>
              </div>
              <div>
                <span className="detail-item-label">Date Collecte</span>
                <div className="detail-item-value">
                  {new Date(lead.date_collecte).toLocaleString('fr-FR', {
                    day: 'numeric',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </div>
              </div>
            </div>
          </div>

          <div className="drawer-section">
            <h3 className="drawer-section-title">Historique de Communication</h3>
            <div className="lead-detail-grid">
              <div>
                <div className="detail-item-label">Emails Envoyés (Succès)</div>
                <div className="detail-item-value" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {lead.emails_count && lead.emails_count > 0 ? (
                    <span className="badge badge-sent">📧 {lead.emails_count}</span>
                  ) : (
                    <span className="badge badge-new">0</span>
                  )}
                </div>
              </div>
              <div>
                <div className="detail-item-label">Dernier Envoi</div>
                <div className="detail-item-value">
                  {lead.email_statut === 'Succès' && lead.date_envoi ? new Date(lead.date_envoi).toLocaleString('fr-FR') : 'Aucun'}
                </div>
              </div>
            </div>
          </div>


          {/* AI Scoring */}
          <div className="drawer-section">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 className="drawer-section-title" style={{ margin: 0 }}>Qualification IA</h3>
              <button
                className="btn btn-secondary"
                style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}
                onClick={handleQualifyIA}
                disabled={isQualifying}
              >
                {isQualifying ? 'Qualification...' : '🤖 Qualifier IA'}
              </button>
            </div>

            {lead.score !== null ? (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.75rem' }}>
                  <div style={{ fontSize: '2.5rem', fontWeight: 800, color: isQualified ? 'var(--success)' : 'var(--danger)' }}>
                    {lead.score}
                    <span style={{ fontSize: '1rem', color: 'var(--text-muted)', fontWeight: 400 }}>/100</span>
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, textTransform: 'capitalize' }}>
                      Potentiel : {lead.potentiel}
                    </div>
                    <span className={`badge badge-${isQualified ? 'qualified' : 'discarded'}`}>
                      {isQualified ? 'Qualifié (ICP Cible)' : 'Écarté (ICP Hors Cible)'}
                    </span>
                  </div>
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                  <strong>Raisonnement :</strong> {lead.raison}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                  Modèle : {lead.modele_utilise}
                </div>
              </div>
            ) : (
              <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center', padding: '1rem 0' }}>
                Ce prospect n'a pas encore été qualifié par l'agent.
              </div>
            )}
          </div>

          {/* Action Log / Statut */}
          <div className="drawer-section">
            <h3 className="drawer-section-title">Contrôle Manuel & Statut</h3>
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
              <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Statut Actuel:</span>
              <select
                className="filter-select"
                style={{ padding: '0.4rem 1.5rem 0.4rem 0.75rem', fontSize: '0.85rem' }}
                value={statut}
                onChange={(e) => handleManualStatusChange(e.target.value)}
              >
                <option value="Qualifié">Qualifié</option>
                <option value="Écarté">Écarté</option>
              </select>
            </div>
          </div>

          {/* Cold Email Editor */}
          {isQualified && (
            <div className="drawer-section">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 className="drawer-section-title" style={{ margin: 0 }}>Email de Prospection</h3>
                <button
                  className="btn btn-secondary"
                  style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}
                  onClick={handleGenerateEmail}
                  disabled={isGeneratingEmail}
                >
                  {isGeneratingEmail ? 'Génération...' : '✉ Générer'}
                </button>
              </div>
              <div className="email-editor">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <span className="detail-item-label">Sujet de l'email</span>
                  <input
                    type="text"
                    className="email-input"
                    value={sujet}
                    onChange={(e) => setSujet(e.target.value)}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <span className="detail-item-label">Copie conforme (CC)</span>
                  <input
                    type="text"
                    className="email-input"
                    value={cc}
                    onChange={(e) => setCc(e.target.value)}
                    placeholder="exemple@ent.com"
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <span className="detail-item-label">Corps du message</span>
                  <textarea
                    className="email-textarea"
                    value={corps}
                    onChange={(e) => setCorps(e.target.value)}
                  />
                </div>

                {/* Email Sent details if status sent or error */}
                {lead.email_statut && lead.email_statut !== 'Brouillon' && (
                  <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: lead.email_statut === 'Succès' ? 'var(--success)' : 'var(--danger)' }}>
                    {lead.email_statut === 'Succès'
                      ? '✓ Envoyé avec succès'
                      : `✗ Échec d'envoi: ${lead.email_erreur}`}
                  </div>
                )}

                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                  <button
                    className="btn btn-primary"
                    style={{ flex: 1 }}
                    onClick={handleSendEmail}
                    disabled={isSending}
                  >
                    {isSending ? 'Envoi...' : '✉ Ouvrir & Envoyer'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

