'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { 
  X, 
  Mail, 
  Building, 
  Briefcase, 
  Calendar, 
  Target, 
  Copy, 
  Check, 
  Sparkles, 
  MapPin, 
  Layers,
  Phone,
  Smartphone,
  Linkedin,
  ExternalLink,
  Globe,
  History,
  CheckCircle2,
  Users,
  AlertCircle,
  Lock,
  Eye,
  Loader2
} from 'lucide-react';
import { useToast } from '@/shared/contexts/ToastContext';
import { extractLeadMobile, extractCompanyPhone, extractJobHistory, maskCompanyLogoUrl } from '@/shared/utils/phoneExtractor';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ;

interface JobHistoryItem {
  company_name?: string;
  company?: string;
  companyName?: string;
  entreprise?: string;
  title?: string;
  position?: string;
  role?: string;
  current?: boolean;
  start_year?: number | string;
  end_year?: number | string;
  start_date?: string;
  end_date?: string;
  starts_at?: string;
  ends_at?: string;
  duration_in_months?: number;
  description?: string;
}

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
  raison?: string;
  potentiel?: string;
  est_qualifie?: boolean;
  department?: string;
  seniority?: string;
  decision_maker?: boolean;
  // Enriched fields
  mobile?: string;
  phone_hq?: string;
  linkedin_url?: string;
  company_logo_url?: string;
  headline?: string;
  city?: string;
  country_code?: string;
  industry?: string;
  employee_count?: number;
  job_history?: JobHistoryItem[] | string;
  sourcing_provider?: string;
  person_raw?: any;
  company_raw?: any;
  domain?: string;
  verification_status?: string;
}

interface LeadDetailDrawerProps {
  lead: Lead | null;
  isOpen: boolean;
  onClose: () => void;
  onRefresh: () => void;
  agentId?: string;
  signature?: string;
  defaultCc?: string;
}

export default function LeadDetailDrawer({ lead, isOpen, onClose, onRefresh, agentId }: LeadDetailDrawerProps) {
  const { showToast } = useToast();
  const params = useParams();
  const activeAgentId = agentId || (params?.agentId as string);

  const [copiedEmail, setCopiedEmail] = useState(false);
  const [copiedMobile, setCopiedMobile] = useState(false);
  const [copiedPhoneHq, setCopiedPhoneHq] = useState(false);
  const [copiedProfile, setCopiedProfile] = useState(false);
  const [logoError, setLogoError] = useState(false);
  const [isRevealingPhone, setIsRevealingPhone] = useState(false);
  const [revealedPhone, setRevealedPhone] = useState<string | null>(null);

  useEffect(() => {
    setLogoError(false);
    setRevealedPhone(null);
  }, [lead?.id]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleRevealPhone = async () => {
    if (!lead || !activeAgentId || isRevealingPhone) return;

    setIsRevealingPhone(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/agent-leads/${activeAgentId}/reveal-phone`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': `phone-reveal:${activeAgentId}:${lead.id}`
        },
        credentials: 'include',
        body: JSON.stringify({
          leadId: lead.id,
          id: lead.id,
          agentUuid: activeAgentId
        })
      });

      const data = await res.json().catch(() => null);

      if (res.ok) {
        const newPhone = data?.phone || data?.mobile || data?.phone_number || data?.revealed_phone;
        if (newPhone && typeof newPhone === 'string' && !newPhone.includes('*')) {
          setRevealedPhone(newPhone);
        }
        showToast('Numéro direct débloqué avec succès !', 'success');
        onRefresh?.();
      } else {
        const errMsg = data?.error || 'Erreur lors du déblocage du numéro.';
        showToast(errMsg, 'error');
      }
    } catch (error) {
      console.error('Error revealing phone number:', error);
      showToast('Erreur serveur lors de la demande de déblocage.', 'error');
    } finally {
      setIsRevealingPhone(false);
    }
  };

  if (!lead) return null;

  // Extract validated personal mobile (Zod)
  const baseLeadPhone = extractLeadMobile(lead.mobile, lead.person_raw);
  const leadPhone = revealedPhone || baseLeadPhone;
  // Extract validated company HQ standard (Zod)
  const companyPhone = extractCompanyPhone(lead.phone_hq, lead.company_raw);

  const initials = `${(lead.prenom || '')[0] || ''}${(lead.nom || '')[0] || ''}`.toUpperCase() || 'L';
  const isDecMaker = lead.decision_maker === true || /ceo|cto|cfo|coo|cmo|cro|founder|fondateur|director|directeur|vp|president|head|leader/i.test(lead.poste || '');

  // Extract validated job history (Zod)
  const parsedJobHistory = extractJobHistory(lead.job_history, lead.person_raw);

  const handleCopyEmail = () => {
    navigator.clipboard.writeText(lead.email);
    setCopiedEmail(true);
    showToast('Email copié dans le presse-papiers !', 'info');
    setTimeout(() => setCopiedEmail(false), 2000);
  };

  const handleCopyMobile = () => {
    if (!leadPhone) return;
    navigator.clipboard.writeText(leadPhone);
    setCopiedMobile(true);
    showToast('Numéro mobile direct copié !', 'info');
    setTimeout(() => setCopiedMobile(false), 2000);
  };

  const handleCopyPhoneHq = () => {
    if (!companyPhone) return;
    navigator.clipboard.writeText(companyPhone);
    setCopiedPhoneHq(true);
    showToast('Standard entreprise copié !', 'info');
    setTimeout(() => setCopiedPhoneHq(false), 2000);
  };

  const handleCopyProfile = () => {
    const lines = [
      `CANDIDAT SOURCÉ: ${lead.prenom} ${lead.nom}`,
      `Poste: ${lead.poste || 'Non spécifié'}`,
      lead.headline ? `Bio / Titre: ${lead.headline}` : null,
      `Entreprise: ${lead.entreprise || 'Non spécifiée'}`,
      lead.domain ? `Site Web: ${lead.domain}` : null,
      companyPhone ? `Standard Entreprise: ${companyPhone}` : null,
      `Secteur / Industrie: ${lead.industry || lead.secteur || 'N/A'}`,
      lead.employee_count ? `Effectif: ${lead.employee_count} collaborateurs` : null,
      `Localisation: ${lead.city ? `${lead.city}, ` : ''}${lead.pays || 'N/A'}${lead.country_code ? ` (${lead.country_code.toUpperCase()})` : ''}`,
      `Email: ${lead.email}`,
      leadPhone ? `Mobile Direct: ${leadPhone}` : null,
      lead.linkedin_url ? `LinkedIn: ${lead.linkedin_url}` : null,
      `Décideur: ${isDecMaker ? 'Oui' : 'Non'}`,
      `Moteur: Sourcing IA`,
      `Date d'extraction: ${new Date(lead.date_collecte).toLocaleDateString('fr-FR')}`
    ].filter(Boolean).join('\n');

    navigator.clipboard.writeText(lines);
    setCopiedProfile(true);
    showToast('Fiche enrichie du candidat copiée !', 'success');
    setTimeout(() => setCopiedProfile(false), 2000);
  };

  const formattedLocation = [
    lead.city,
    lead.pays,
    lead.country_code ? `(${lead.country_code.toUpperCase()})` : null
  ].filter(Boolean).join(', ') || 'Non spécifié';

  const domainUrl = lead.domain ? (lead.domain.startsWith('http') ? lead.domain : `https://${lead.domain}`) : null;

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div 
          onClick={onClose}
          className="sourcing-drawer-backdrop"
        />
      )}

      {/* Drawer Panel */}
      <div 
        className="sourcing-drawer-panel"
        style={{
          transform: isOpen ? 'translateX(0)' : 'translateX(100%)'
        }}
      >
        {/* Top Ambient Specular Line */}
        <div className="drawer-top-beam" />

        {/* 1. DRAWER HEADER */}
        <div className="drawer-header-section">
          <div className="drawer-avatar-block">
            <div 
              className={`drawer-avatar ${lead.company_logo_url && !logoError ? 'drawer-avatar--logo' : ''}`}
              title={lead.entreprise ? `${lead.entreprise} (Entreprise)` : undefined}
            >
              {lead.company_logo_url && !logoError ? (
                <img
                  src={maskCompanyLogoUrl(lead.company_logo_url)}
                  alt={lead.entreprise || ''}
                  onError={() => setLogoError(true)}
                />
              ) : (
                initials
              )}
            </div>

            <div className="drawer-name-block">
              <div className="name-title-row">
                <h3>
                  {lead.prenom} {lead.nom}
                </h3>
                {isDecMaker && (
                  <span className="decision-maker-badge">
                    <Target size={11} /> Décideur
                  </span>
                )}
              </div>
              <p>
                <span>{lead.poste || 'Poste non spécifié'}</span>
                {lead.entreprise && (
                  <span className="company-handle">
                    @{lead.entreprise}
                  </span>
                )}
              </p>

              {lead.headline && (
                <div className="drawer-headline">
                  &ldquo;{lead.headline}&rdquo;
                </div>
              )}

              {lead.linkedin_url && (
                <div className="drawer-badges-row">
                  <a
                    href={lead.linkedin_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="drawer-linkedin-btn"
                  >
                    <Linkedin size={12} />
                    <span>LinkedIn</span>
                    <ExternalLink size={10} />
                  </a>
                </div>
              )}
            </div>
          </div>

          <button 
            onClick={onClose}
            className="drawer-close-btn"
          >
            <X size={16} />
          </button>
        </div>

        {/* 2. DRAWER CONTENT */}
        <div className="drawer-body-content">

          {/* SOURCING STATUS CARD */}
          <div className="drawer-intelligence-card">
            <div className="intelligence-header">
              <span className="intelligence-title">
                <Sparkles size={13} /> Ciblage IA
              </span>
              <span className="prequalified-badge">
                ⚡ Score {lead.score ?? 90}%
              </span>
            </div>
            {lead.raison && (
              <p className="intelligence-reason">
                {lead.raison}
              </p>
            )}
          </div>

          {/* CONTACT SECTION */}
          <div className="drawer-section-card">
            <h3 className="section-title">
              <Mail size={14} /> Contact
            </h3>

            <div className="section-grid">
              {/* Email */}
              <div className="full-width">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                  <div className="field-label" style={{ margin: 0 }}>Email</div>
                  {lead.verification_status && (() => {
                    const statusStr = lead.verification_status.toLowerCase();
                    const isInvalid = statusStr.includes('invalid') || statusStr.includes('bounc');
                    return (
                      <span 
                        className={`deliverability-badge ${isInvalid ? 'invalid' : ''}`}
                        title={isInvalid ? 'Email non distribuable' : 'Email certifié et vérifié'}
                        style={isInvalid ? { color: '#FF4757', background: 'rgba(255, 71, 87, 0.12)', borderColor: 'rgba(255, 71, 87, 0.3)' } : {}}
                      >
                        {isInvalid ? <AlertCircle size={10} /> : <CheckCircle2 size={10} />}
                        {isInvalid ? 'INVALIDE' : 'VÉRIFIÉ'}
                      </span>
                    );
                  })()}
                </div>
                <div className="email-copy-box">
                  <span className="email-text">
                    {lead.email}
                  </span>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <button
                      onClick={handleCopyEmail}
                      title={copiedEmail ? 'Email copié !' : "Copier l'email"}
                      style={{
                        background: copiedEmail ? 'rgba(0, 229, 160, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                        border: `1px solid ${copiedEmail ? 'rgba(0, 229, 160, 0.3)' : 'rgba(255, 255, 255, 0.1)'}`,
                        borderRadius: '6px',
                        width: 28,
                        height: 28,
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: copiedEmail ? '#00E5A0' : '#94A3B8',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {copiedEmail ? <Check size={13} /> : <Copy size={13} />}
                    </button>
                    <a
                      href={`mailto:${lead.email}`}
                      title="Envoyer un email"
                      style={{
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        color: '#94A3B8',
                        width: 28,
                        height: 28,
                        borderRadius: '6px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        textDecoration: 'none',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <ExternalLink size={12} />
                    </a>
                  </div>
                </div>
              </div>

              {/* Mobile Direct */}
              {leadPhone && (
                <div className="full-width">
                  <div className="field-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: leadPhone.includes('*') ? '#F59E0B' : '#00E5C8' }}>
                      {leadPhone.includes('*') ? <Lock size={12} /> : <Smartphone size={12} />} Mobile
                    </span>
                    {leadPhone.includes('*') && (
                      <span style={{ fontSize: '0.68rem', padding: '1px 6px', borderRadius: 4, background: 'rgba(245, 158, 11, 0.15)', color: '#F59E0B', border: '1px solid rgba(245, 158, 11, 0.3)', fontWeight: 600 }}>
                        Masqué
                      </span>
                    )}
                  </div>
                  <div className="email-copy-box">
                    {leadPhone.includes('*') ? (
                      <span className="contact-link" style={{ color: '#F0F4F8', letterSpacing: '0.03em' }}>
                        {leadPhone}
                      </span>
                    ) : (
                      <a href={`tel:${leadPhone}`} className="contact-link">
                        {leadPhone}
                      </a>
                    )}
                    {leadPhone.includes('*') ? (
                      <button
                        onClick={handleRevealPhone}
                        disabled={isRevealingPhone}
                        title="Révéler le numéro de téléphone direct"
                        style={{
                          background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.22) 0%, rgba(245, 158, 11, 0.08) 100%)',
                          border: '1px solid rgba(245, 158, 11, 0.4)',
                          borderRadius: '6px',
                          padding: '0 10px',
                          height: 28,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          color: '#FBBF24',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          cursor: isRevealingPhone ? 'not-allowed' : 'pointer',
                          opacity: isRevealingPhone ? 0.7 : 1,
                          transition: 'all 0.15s ease',
                          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)'
                        }}
                      >
                        {isRevealingPhone ? (
                          <>
                            <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} />
                            <span>Déblocage...</span>
                          </>
                        ) : (
                          <>
                            <Eye size={12} />
                            <span>Révéler</span>
                          </>
                        )}
                      </button>
                    ) : (
                      <button
                        onClick={handleCopyMobile}
                        title={copiedMobile ? 'Mobile copié !' : 'Copier le mobile'}
                        style={{
                          background: copiedMobile ? 'rgba(0, 229, 160, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                          border: `1px solid ${copiedMobile ? 'rgba(0, 229, 160, 0.3)' : 'rgba(255, 255, 255, 0.1)'}`,
                          borderRadius: '6px',
                          width: 28,
                          height: 28,
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: copiedMobile ? '#00E5A0' : '#94A3B8',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        {copiedMobile ? <Check size={13} /> : <Copy size={13} />}
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Localisation */}
              <div>
                <div className="field-label">Localisation</div>
                <div className="field-value">
                  <MapPin size={13} /> {formattedLocation}
                </div>
              </div>

              {/* Date Collecte */}
              <div>
                <div className="field-label">Ajouté le</div>
                <div className="field-value">
                  <Calendar size={13} />
                  {lead.date_collecte ? new Date(lead.date_collecte).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
                </div>
              </div>
            </div>
          </div>

          {/* PROFESSIONAL & COMPANY SECTION */}
          <div className="drawer-section-card">
            <h3 className="section-title company">
              <Building size={14} /> Entreprise & Poste
            </h3>

            <div className="section-grid">
              {/* Entreprise & Domain */}
              <div className="full-width">
                <div className="field-label">Entreprise</div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                  <div className="field-value bold" style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    {lead.company_logo_url && !logoError && (
                      <img 
                        src={maskCompanyLogoUrl(lead.company_logo_url)} 
                        alt="" 
                        onError={() => setLogoError(true)}
                        style={{ width: 18, height: 18, borderRadius: 4, objectFit: 'contain' }}
                      />
                    )}
                    {lead.entreprise || 'Non spécifiée'}
                  </div>
                  {domainUrl && (
                    <a 
                      href={domainUrl} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="company-domain-link"
                    >
                      <Globe size={11} />
                      <span>{lead.domain}</span>
                      <ExternalLink size={10} />
                    </a>
                  )}
                </div>
              </div>

              {/* Standard */}
              {companyPhone && (
                <div className="full-width">
                  <div className="field-label" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Building size={12} style={{ color: '#38BDF8' }} /> Standard
                  </div>
                  <div className="email-copy-box">
                    <a href={`tel:${companyPhone}`} className="contact-link" style={{ color: '#38BDF8' }}>
                      {companyPhone}
                    </a>
                    <button
                      onClick={handleCopyPhoneHq}
                      title={copiedPhoneHq ? 'Standard copié !' : 'Copier le standard'}
                      style={{
                        background: copiedPhoneHq ? 'rgba(0, 229, 160, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                        border: `1px solid ${copiedPhoneHq ? 'rgba(0, 229, 160, 0.3)' : 'rgba(255, 255, 255, 0.1)'}`,
                        borderRadius: '6px',
                        width: 28,
                        height: 28,
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: copiedPhoneHq ? '#00E5A0' : '#94A3B8',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {copiedPhoneHq ? <Check size={13} /> : <Copy size={13} />}
                    </button>
                  </div>
                </div>
              )}

              {/* Poste */}
              <div>
                <div className="field-label">Poste</div>
                <div className="field-value">
                  <Briefcase size={13} />
                  {lead.poste || 'Non spécifié'}
                </div>
              </div>

              {/* Niveau */}
              <div>
                <div className="field-label">Niveau</div>
                <div className="field-value">
                  {lead.seniority || (isDecMaker ? 'Executive / C-Level' : 'Senior')}
                </div>
              </div>

              {/* Secteur */}
              <div>
                <div className="field-label">Secteur</div>
                <div className="field-value">
                  <Layers size={13} />
                  {lead.industry || lead.secteur || 'Industrie & Services'}
                </div>
              </div>

              {/* Effectif */}
              <div>
                <div className="field-label">Effectif</div>
                <div className="field-value">
                  <Users size={13} />
                  {lead.employee_count ? `${lead.employee_count.toLocaleString()} collaborateurs` : 'Non renseigné'}
                </div>
              </div>

              {/* Département si disponible */}
              {lead.department && (
                <div className="full-width">
                  <div className="field-label">Département</div>
                  <div className="field-value">
                    {lead.department}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* PARCOURS PROFESSIONNEL (JOB HISTORY) */}
          {parsedJobHistory.length > 0 && (
            <div className="drawer-section-card">
              <h3 className="section-title">
                <History size={14} /> Expérience
              </h3>

              <div className="job-history-timeline">
                {parsedJobHistory.slice(0, 5).map((job, idx) => {
                  const jobTitle = job.title || job.position || job.role || 'Poste occupé';
                  const companyName = job.company_name || job.company || job.entreprise || job.companyName || (job.current ? lead.entreprise : null);
                  const start = job.start_year || job.start_date || job.starts_at || '';
                  const end = job.current ? 'Présent' : (job.end_year || job.end_date || job.ends_at || (start ? 'Présent' : ''));
                  const duration = job.duration_in_months ? `(${Math.floor(job.duration_in_months / 12) > 0 ? `${Math.floor(job.duration_in_months / 12)} an${Math.floor(job.duration_in_months / 12) > 1 ? 's' : ''} ` : ''}${job.duration_in_months % 12} mois)` : '';
                  const dateStr = start ? `${start} — ${end} ${duration}`.trim() : (job.current ? 'Poste Actuel' : '');

                  return (
                    <div key={idx} className="job-history-item">
                      <div className="job-node" />
                      <div className="job-details">
                        <div className="job-role" style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                          <span>{jobTitle}</span>
                          {job.current && (
                            <span style={{ fontSize: '0.68rem', padding: '1px 6px', borderRadius: 4, background: 'rgba(0, 229, 160, 0.15)', color: '#00E5A0', border: '1px solid rgba(0, 229, 160, 0.35)', fontWeight: 600 }}>
                              Poste Actuel
                            </span>
                          )}
                        </div>
                        {companyName && companyName.toLowerCase() !== 'entreprise' && (
                          <div className="job-company-row" style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                            <Building size={11} style={{ color: '#38BDF8', flexShrink: 0 }} />
                            <span style={{ color: '#38BDF8', fontWeight: 600 }}>{companyName}</span>
                          </div>
                        )}
                        {dateStr && (
                          <div className="job-duration" style={{ marginTop: 2 }}>
                            {dateStr}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </div>

        {/* 3. DRAWER FOOTER & ACTIONS */}
        <div className="drawer-footer-section">
          <button
            onClick={handleCopyProfile}
            className="drawer-copy-btn"
          >
            {copiedProfile ? <Check size={14} style={{ color: '#00E5A0' }} /> : <Copy size={14} />}
            {copiedProfile ? 'Fiche Copiée !' : 'Copier Fiche Complète'}
          </button>

          <button
            onClick={onClose}
            className="drawer-close-action"
          >
            Fermer
          </button>
        </div>
      </div>
    </>
  );
}
