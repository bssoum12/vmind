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
  pays?: string;
  source: string;
  date_collecte: string;
  statut: string;
  sujet?: string | null;
  corps?: string | null;
  email_cc?: string | null;
  email_statut?: string | null;
  email_erreur?: string | null;
  emails_count?: number;
  agent_emails_count?: number;
  date_envoi?: string | null;
}

interface LeadDetailDrawerProps {
  lead: Lead | null;
  isOpen: boolean;
  onClose: () => void;
  onRefresh: () => void;
  signature: string;
  defaultCc: string;
}

export default function LeadDetailDrawer({ lead, isOpen, onClose, onRefresh, signature, defaultCc }: LeadDetailDrawerProps) {
  const [sujet, setSujet] = useState('');
  const [corps, setCorps] = useState('');
  const [cc, setCc] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isGeneratingEmail, setIsGeneratingEmail] = useState(false);

  const params = useParams();
  const agentId = params.agentId;

  useEffect(() => {
    if (lead) {
      setSujet(lead.sujet || '');
      setCorps(lead.corps || '');
      setCc(lead.email_cc !== undefined && lead.email_cc !== null ? lead.email_cc : (defaultCc || ''));
      setIsSending(false);
      setIsGeneratingEmail(false);
    }
  }, [lead, defaultCc]);

  if (!lead) return null;

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
      const ccPart = cc ? `&cc=${encodeURIComponent(cc)}` : '';
      const mailtoUrl = `mailto:${encodeURIComponent(lead.email)}?subject=${encodeURIComponent(sujet)}&body=${encodeURIComponent(corps)}${ccPart}`;
      window.location.href = mailtoUrl;

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

  return (
    <>
      <div className={`drawer ${isOpen ? 'open' : ''}`}>
        <div className="drawer-header">
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>
              {lead.prenom} {lead.nom}
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '4px' }}>
              {lead.poste} chez {lead.entreprise}
            </p>
          </div>
          <button onClick={onClose} className="drawer-close">×</button>
        </div>

        <div className="drawer-content">
          <div className="drawer-section">
            <h3 className="drawer-section-title">Coordonnées</h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
              <div className="detail-item">
                <div className="detail-item-label">Email</div>
                <div className="detail-item-value">{lead.email}</div>
              </div>
              <div className="detail-item">
                <div className="detail-item-label">Secteur</div>
                <div className="detail-item-value">{lead.secteur || '-'}</div>
              </div>
              <div className="detail-item">
                <div className="detail-item-label">Pays</div>
                <div className="detail-item-value">{lead.pays || '-'}</div>
              </div>
              <div className="detail-item">
                <div className="detail-item-label">Source</div>
                <div className="detail-item-value" style={{ textTransform: 'capitalize' }}>{lead.source}</div>
              </div>
              <div className="detail-item">
                <div className="detail-item-label">Date Collecte</div>
                <div className="detail-item-value">{new Date(lead.date_collecte).toLocaleString()}</div>
              </div>
            </div>
          </div>

          <div className="drawer-section">
            <h3 className="drawer-section-title">Historique de Communication</h3>
            <div className="lead-detail-grid">
              <div>
                <div className="detail-item-label">Emails Envoyés (Succès)</div>
                <div className="detail-item-value" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {(lead.agent_emails_count ?? lead.emails_count ?? 0) > 0 ? (
                    <span className="badge badge-sent">📧 {(lead.agent_emails_count ?? lead.emails_count)}</span>
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

          <div className="drawer-section">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 className="drawer-section-title" style={{ margin: 0 }}>Action d'Emailing</h3>
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
        </div>
      </div>
      {isOpen && <div className="drawer-overlay" onClick={onClose} />}
    </>
  );
}
