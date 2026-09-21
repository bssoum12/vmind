'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useParams } from 'next/navigation';
import { 
  X, 
  Mail, 
  Building2, 
  Briefcase, 
  Calendar, 
  Target, 
  Copy, 
  Check, 
  Sparkles, 
  MapPin, 
  Users, 
  Layers, 
  CheckCircle2, 
  XCircle, 
  Send, 
  Clock, 
  AlertCircle,
  ExternalLink,
  ScanLine,
  FileSpreadsheet,
  Globe,
  Zap
} from 'lucide-react';
import { useToast } from '@/shared/contexts/ToastContext';
import { useProspectSocket } from '../hooks/useProspectSocket';

// Zero Technical Jargon policy: sanitize and translate raw backend logs for the end user
function formatUserFacingMessage(raw?: string): string {
  if (!raw) return "Initialisation de l'évaluation IA...";
  const lower = raw.toLowerCase();
  if (lower.includes('lancée') || lower.includes('initialisation') || lower.includes('démarrage') || (lower.includes('qualification de') && lower.includes('prospect'))) {
    return "Initialisation et analyse du profil par l'IA...";
  }
  const clean = raw
    .replace(/\s*via\s+n8n\.?/gi, '')
    .replace(/\s*\(n8n\)/gi, '')
    .replace(/\bn8n\b/gi, '')
    .replace(/\bqstash\b/gi, '')
    .replace(/\bworkflow\b/gi, 'processus')
    .replace(/\bpayload\b/gi, 'données')
    .trim();

  return clean || "Analyse du profil en cours...";
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://localhost:3001';

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
  decision_maker?: boolean;
}

interface LeadDetailDrawerProps {
  lead: Lead | null;
  isOpen: boolean;
  onClose: () => void;
  onRefresh: () => void;
  threshold: number;
  signature?: string;
  defaultCc?: string;
}

export default function LeadDetailDrawer({ 
  lead, 
  isOpen, 
  onClose, 
  onRefresh, 
  threshold, 
  signature = '', 
  defaultCc = '' 
}: LeadDetailDrawerProps) {
  const { showToast } = useToast();
  const [sujet, setSujet] = useState('');
  const [corps, setCorps] = useState('');
  const [cc, setCc] = useState('');
  const [statut, setStatut] = useState('');
  const [isQualifying, setIsQualifying] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isGeneratingEmail, setIsGeneratingEmail] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [copiedProfile, setCopiedProfile] = useState(false);

  const params = useParams();
  const agentId = params.agentId;

  // Live Qualification Progress State (Tracked via WebSockets)
  interface DrawerQualifyProgress {
    active: boolean;
    isDone: boolean;
    message: string;
  }
  const [qualifyProgress, setQualifyProgress] = useState<DrawerQualifyProgress | null>(null);
  const qualifyProgressRef = useRef<DrawerQualifyProgress | null>(null);
  qualifyProgressRef.current = qualifyProgress;
  const [fakePercent, setFakePercent] = useState<number>(14);
  const dismissTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Clean up auto-dismiss timer on unmount
  useEffect(() => {
    return () => {
      if (dismissTimerRef.current) {
        clearTimeout(dismissTimerRef.current);
      }
    };
  }, []);

  // Synthetic progressive easing for percentage display (eliminates stagnant 0% sensation)
  useEffect(() => {
    if (!qualifyProgress || !qualifyProgress.active) return;

    if (qualifyProgress.isDone) {
      setFakePercent(100);
      return;
    }

    const interval = setInterval(() => {
      setFakePercent((prev) => {
        if (prev >= 94) return prev;
        const diff = 94 - prev;
        const step = diff > 30 ? Math.floor(Math.random() * 4 + 2) : diff > 10 ? Math.floor(Math.random() * 2 + 1) : 1;
        return Math.min(prev + step, 94);
      });
    }, 450);

    return () => clearInterval(interval);
  }, [qualifyProgress?.active, qualifyProgress?.isDone]);

  // Real-time WebSocket listener for qualification updates
  useProspectSocket((payload) => {
    const current = qualifyProgressRef.current;
    if (!current || !current.active || !lead) return;

    // 1. Logs
    if (payload.table === 'prospect_agent_logs_execution' && payload.new) {
      const message = (payload.new.message || '').toString();
      const statut = (payload.new.statut || payload.new.status || '').toString().toUpperCase();

      const isLaunchLog = message.includes('lancée via n8n') || (message.includes('Qualification de') && message.includes('prospect'));
      if (isLaunchLog) {
        setQualifyProgress((prev) => (prev ? { ...prev, message: "Initialisation et analyse du profil par l'IA..." } : null));
        return;
      }

      const isLeadEval = message.includes('Score ICP') || message.includes(`Lead #${lead.id}`) || (lead.nom && message.includes(lead.nom)) || (lead.entreprise && message.includes(lead.entreprise));
      if (isLeadEval) {
        setQualifyProgress((prev) => (prev ? { ...prev, message } : null));
      }

      if (statut === 'COMPLETED' || statut === 'SUCCESS') {
        if (payload.new.workflow_id && payload.new.workflow_id.toString().includes('qualif')) {
          setQualifyProgress((prev) => (prev ? { ...prev, isDone: true, message: "Évaluation terminée avec succès !" } : null));
          onRefresh();
          if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
          dismissTimerRef.current = setTimeout(() => {
            setQualifyProgress(null);
            qualifyProgressRef.current = null;
          }, 3500);
        }
      }
    }

    // 2. Qualifications table trigger
    if (payload.table === 'prospect_agent_qualifications' && payload.new) {
      if (payload.new.lead_id === lead.id) {
        setQualifyProgress((prev) => (prev ? { ...prev, isDone: true, message: "Évaluation terminée avec succès !" } : null));
        onRefresh();
        if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
        dismissTimerRef.current = setTimeout(() => {
          setQualifyProgress(null);
          qualifyProgressRef.current = null;
        }, 3500);
      }
    }

    // 3. Email sent trigger
    if (payload.table === 'prospect_agent_emails_envoyes') {
      const targetLeadId = payload.new?.lead_id || payload.old?.lead_id;
      if (!targetLeadId || targetLeadId === lead.id) {
        onRefresh();
      }
    }
  });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (lead) {
      setSujet(lead.sujet || '');
      setStatut(lead.statut || '');
      setCorps(lead.corps || '');
      setCc(lead.email_cc !== undefined && lead.email_cc !== null ? lead.email_cc : (defaultCc || ''));

      setIsQualifying(false);
      setIsSending(false);
      setIsGeneratingEmail(false);
    }
  }, [lead, defaultCc]);

  if (!lead || !isOpen) return null;

  const initials = `${(lead.prenom || '')[0] || ''}${(lead.nom || '')[0] || ''}`.toUpperCase() || 'P';
  const isDecMaker = lead.decision_maker === true || /ceo|cto|cfo|coo|cmo|cro|founder|fondateur|director|directeur|vp|president|head|leader|responsable/i.test(lead.poste || '');
  const isQualified = statut.includes('Qualifi') ? true : statut.includes('cart') ? false : ((lead as any).est_qualifie === true || (lead.score !== null && lead.score >= threshold));
  const scoreVal = typeof lead.score === 'number' ? Math.round(lead.score) : null;

  // Radial Score Math
  const radius = 34;
  const circumference = 2 * Math.PI * radius;
  const safeScore = scoreVal !== null ? Math.min(Math.max(scoreVal, 0), 100) : 0;
  const strokeDashoffset = circumference - (safeScore / 100) * circumference;
  const scoreColor = safeScore >= 70 ? '#00E5C8' : safeScore >= 40 ? '#FFB800' : '#FF4757';

  const handleCopyEmail = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(lead.email);
    setCopiedEmail(true);
    showToast('Email copié dans le presse-papiers !', 'info');
    setTimeout(() => setCopiedEmail(false), 2000);
  };

  const handleCopyProfile = () => {
    const profileText = [
      `FICHE PROSPECT: ${lead.prenom} ${lead.nom}`,
      `Entreprise: ${lead.entreprise || 'Non spécifiée'}`,
      `Poste: ${lead.poste || 'Non spécifié'}`,
      `Email: ${lead.email}`,
      `Secteur: ${lead.secteur || 'Non renseigné'}`,
      `Effectif: ${lead.taille_ent ? `${lead.taille_ent} employés` : 'Non renseigné'}`,
      `Pays: ${lead.pays || 'Non renseigné'}`,
      `Score IA: ${scoreVal !== null ? `${scoreVal}/100` : 'Non analysé'}`,
      `Statut: ${statut || 'En attente'}`
    ].join('\n');

    navigator.clipboard.writeText(profileText);
    setCopiedProfile(true);
    showToast('Fiche complète copiée !', 'success');
    setTimeout(() => setCopiedProfile(false), 2000);
  };

  const handleManualStatusChange = async (newStatus: string) => {
    setStatut(newStatus);
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
        showToast(`Statut mis à jour : ${newStatus}`, 'success');
        onRefresh();
      } else {
        throw new Error('Erreur lors de la mise à jour du statut');
      }
    } catch (error) {
      console.error('Error changing status:', error);
      showToast('Impossible de modifier le statut.', 'error');
    }
  };

  const handleQualifyIA = async () => {
    if (!lead || !agentId) return;
    setIsQualifying(true);
    if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
    setFakePercent(14);
    const newState: DrawerQualifyProgress = {
      active: true,
      isDone: false,
      message: "Initialisation et analyse du profil par l'IA..."
    };
    setQualifyProgress(newState);
    qualifyProgressRef.current = newState;

    // Dispatch global window event so LeadsView (and background) activates its cyber progress bar
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('vmind:qualify-start', {
        detail: {
          leadIds: [lead.id],
          total: 1,
          agentId
        }
      }));
    }

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
        showToast('Qualification IA lancée pour ce prospect !', 'info');
      } else {
        const errData = await res.json().catch(() => ({}));
        showToast(errData.error || 'Erreur lors du déclenchement de la qualification IA', 'error');
        setQualifyProgress(null);
        qualifyProgressRef.current = null;
      }
    } catch (error) {
      console.error('IA Qualification error:', error);
      showToast('Erreur de connexion au service de qualification', 'error');
      setQualifyProgress(null);
      qualifyProgressRef.current = null;
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
        showToast('Email personnalisé rédigé par l\'IA !', 'success');
        onRefresh();
      } else {
        showToast('Erreur lors de la génération de l\'email', 'error');
      }
    } catch (error) {
      console.error('Email generation error:', error);
      showToast('Erreur serveur lors de la génération de l\'email', 'error');
    } finally {
      setIsGeneratingEmail(false);
    }
  };

  const handleSendEmail = async () => {
    if (!sujet.trim() || !corps.trim()) {
      showToast('Veuillez renseigner le sujet et le corps du message.', 'warning');
      return;
    }

    setIsSending(true);
    try {
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
        const data = await res.json();
        if (data.success) {
          showToast('Email envoyé avec succès !', 'success');
          onRefresh();
          onClose();
        } else {
          showToast(`Erreur d'envoi: ${data.error || 'Erreur inconnue'}`, 'error');
        }
      } else {
        showToast('Erreur serveur lors de l\'envoi de l\'email.', 'error');
      }
    } catch (error) {
      console.error('Email sending error:', error);
      showToast('Erreur de communication avec le serveur SMTP', 'error');
    } finally {
      setIsSending(false);
    }
  };

  const drawerContent = (
    <>
      {/* Backdrop - Starts right below TopBar */}
      <div 
        onClick={onClose}
        className="prospect-lead-drawer-backdrop"
        style={{
          position: 'fixed',
          top: '52px',
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(3, 8, 16, 0.75)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          zIndex: 10015,
          transition: 'opacity 0.25s ease'
        }}
      />

      {/* Drawer Panel - Docked directly beneath TopBar */}
      <div 
        className="prospect-lead-drawer-panel"
        style={{
          position: 'fixed',
          top: '52px',
          right: 0,
          bottom: 0,
          height: 'calc(100vh - 52px)',
          width: '560px',
          maxWidth: '94vw',
          backgroundColor: '#071324',
          backgroundImage: 'radial-gradient(ellipse at top right, rgba(0, 229, 200, 0.09) 0%, transparent 60%)',
          borderLeft: '1px solid rgba(255, 255, 255, 0.1)',
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          boxShadow: '-16px 0 48px rgba(0, 0, 0, 0.75)',
          zIndex: 10020,
          display: 'flex',
          flexDirection: 'column',
          transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
          color: '#F0F4F8'
        }}
      >
        {/* Top Ambient Specular Line */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '2px',
          background: 'linear-gradient(90deg, transparent, #00E5C8, #38BDF8, transparent)',
          opacity: 0.8
        }} />

        {/* 1. HEADER */}
        <div 
          className="drawer-header-main"
          style={{
            padding: '22px 26px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: '14px',
            background: 'rgba(8, 20, 38, 0.6)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{
              width: '52px',
              height: '52px',
              borderRadius: '14px',
              background: 'linear-gradient(135deg, rgba(0, 229, 200, 0.25), rgba(6, 17, 31, 0.95))',
              border: '1px solid rgba(0, 229, 200, 0.45)',
              boxShadow: '0 0 16px rgba(0, 229, 200, 0.18)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#00E5C8',
              fontSize: '1.25rem',
              fontWeight: 800,
              flexShrink: 0
            }}>
              {initials}
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <h2 style={{ fontSize: '1.3rem', fontWeight: 800, margin: 0, color: '#F0F4F8', letterSpacing: '-0.01em' }}>
                  {lead.prenom} {lead.nom}
                </h2>
                {isDecMaker && (
                  <span style={{
                    background: 'rgba(0, 229, 160, 0.12)',
                    border: '1px solid rgba(0, 229, 160, 0.35)',
                    color: '#00E5A0',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '6px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                    <Target size={11} /> Décideur
                  </span>
                )}
              </div>
              <p style={{ margin: '4px 0 0', fontSize: '0.88rem', color: '#94A3B8', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>{lead.poste || 'Poste non spécifié'}</span>
                {lead.entreprise && <span style={{ color: '#38BDF8', fontWeight: 600 }}>@{lead.entreprise}</span>}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={handleCopyProfile}
              title="Copier la fiche complète"
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '8px',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: copiedProfile ? '#00E5A0' : '#94A3B8',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                e.currentTarget.style.color = '#F0F4F8';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                e.currentTarget.style.color = copiedProfile ? '#00E5A0' : '#94A3B8';
              }}
            >
              {copiedProfile ? <Check size={14} /> : <Copy size={14} />}
            </button>

            <button 
              onClick={onClose}
              title="Fermer (Échap)"
              aria-label="Fermer la vue détails"
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '8px',
                width: '36px',
                height: '36px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#94A3B8',
                cursor: 'pointer',
                transition: 'all 0.2s',
                flexShrink: 0
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'rgba(255, 71, 87, 0.15)';
                e.currentTarget.style.borderColor = 'rgba(255, 71, 87, 0.4)';
                e.currentTarget.style.color = '#FF4757';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                e.currentTarget.style.color = '#94A3B8';
              }}
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* 2. DRAWER SCROLL CONTENT */}
        <div 
          className="premium-scrollbar"
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '22px 26px',
            display: 'flex',
            flexDirection: 'column',
            gap: '18px',
            scrollbarWidth: 'thin',
            scrollbarColor: 'rgba(0, 229, 200, 0.35) rgba(6, 17, 31, 0.4)'
          }}
        >

          {/* SECTION A: QUALIFICATION IA & RADIAL GAUGE */}
          <div style={{
            background: 'linear-gradient(145deg, rgba(8, 20, 38, 0.95) 0%, rgba(12, 28, 52, 0.75) 100%)',
            border: '1px solid rgba(0, 229, 200, 0.22)',
            borderRadius: '16px',
            padding: '18px 20px',
            boxShadow: '0 8px 28px rgba(0, 0, 0, 0.3)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ScanLine size={16} color="#00E5C8" style={{ flexShrink: 0 }} />
                <span style={{ fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#00E5C8' }}>
                  Qualification & Alignement ICP
                </span>
              </div>
              <button
                onClick={handleQualifyIA}
                disabled={isQualifying || !!qualifyProgress?.active}
                style={{
                  background: (isQualifying || qualifyProgress?.active) ? 'rgba(0, 229, 200, 0.1)' : 'linear-gradient(135deg, rgba(0, 229, 200, 0.15), rgba(56, 189, 248, 0.15))',
                  border: '1px solid rgba(0, 229, 200, 0.35)',
                  borderRadius: '8px',
                  padding: '5px 12px',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  color: '#00E5C8',
                  cursor: (isQualifying || qualifyProgress?.active) ? 'not-allowed' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.2s'
                }}
              >
                <Sparkles size={12} style={{ flexShrink: 0 }} />
                <span>{(isQualifying || qualifyProgress?.active) ? 'Analyse en cours...' : 'Re-qualifier IA'}</span>
              </button>
            </div>

            {/* Live Cyber Qualification Progress Bar */}
            {qualifyProgress && (
              <div
                className="fade-in"
                style={{
                  marginBottom: '16px',
                  padding: '12px 14px',
                  position: 'relative',
                  overflow: 'hidden',
                  background: qualifyProgress.isDone
                    ? 'linear-gradient(145deg, rgba(6, 31, 22, 0.85) 0%, rgba(8, 20, 38, 0.85) 100%)'
                    : 'linear-gradient(145deg, rgba(8, 20, 38, 0.95) 0%, rgba(12, 28, 52, 0.85) 100%)',
                  backdropFilter: 'blur(16px)',
                  WebkitBackdropFilter: 'blur(16px)',
                  border: `1px solid ${qualifyProgress.isDone ? 'rgba(0, 229, 160, 0.4)' : 'rgba(0, 229, 200, 0.3)'}`,
                  borderRadius: '12px',
                  boxShadow: qualifyProgress.isDone
                    ? '0 6px 24px rgba(0, 229, 160, 0.15), inset 0 0 16px rgba(0, 229, 160, 0.05)'
                    : '0 6px 24px rgba(0, 229, 200, 0.12), inset 0 0 16px rgba(0, 229, 200, 0.04)',
                  transition: 'all 0.4s ease'
                }}
              >
                {/* Ambient Specular Top Line */}
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: '5%',
                    right: '5%',
                    height: '1px',
                    background: qualifyProgress.isDone
                      ? 'linear-gradient(90deg, transparent, #00E5A0, transparent)'
                      : 'linear-gradient(90deg, transparent, #00E5C8, transparent)',
                    opacity: 0.8
                  }}
                />

                {/* Progress Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {qualifyProgress.isDone ? (
                      <div
                        style={{
                          width: 20,
                          height: 20,
                          borderRadius: '50%',
                          background: 'rgba(0, 229, 160, 0.15)',
                          border: '1px solid rgba(0, 229, 160, 0.4)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#00E5A0'
                        }}
                      >
                        <CheckCircle2 size={13} />
                      </div>
                    ) : (
                      <div
                        style={{
                          width: 20,
                          height: 20,
                          borderRadius: '50%',
                          background: 'rgba(0, 229, 200, 0.12)',
                          border: '1px solid rgba(0, 229, 200, 0.35)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#00E5C8',
                          boxShadow: '0 0 10px rgba(0, 229, 200, 0.25)'
                        }}
                      >
                        <Sparkles size={12} className="animate-pulse" />
                      </div>
                    )}
                    <span
                      style={{
                        fontSize: '0.82rem',
                        fontWeight: 600,
                        color: qualifyProgress.isDone ? '#00E5A0' : '#F0F4F8'
                      }}
                    >
                      {qualifyProgress.isDone ? 'Qualification terminée avec succès' : 'Qualification IA en direct...'}
                    </span>
                  </div>

                  {/* Percentage badge */}
                  <div
                    style={{
                      fontFamily: 'monospace, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      color: qualifyProgress.isDone ? '#00E5A0' : '#00E5C8',
                      background: qualifyProgress.isDone ? 'rgba(0, 229, 160, 0.1)' : 'rgba(0, 229, 200, 0.08)',
                      border: `1px solid ${qualifyProgress.isDone ? 'rgba(0, 229, 160, 0.3)' : 'rgba(0, 229, 200, 0.25)'}`,
                      padding: '2px 8px',
                      borderRadius: '6px',
                      letterSpacing: '0.04em'
                    }}
                  >
                    {qualifyProgress.isDone ? 100 : fakePercent}%
                  </div>
                </div>

                {/* Progress Track */}
                <div
                  style={{
                    height: '6px',
                    backgroundColor: 'rgba(6, 17, 31, 0.8)',
                    borderRadius: '3px',
                    overflow: 'hidden',
                    position: 'relative',
                    border: '1px solid rgba(0, 229, 200, 0.25)',
                    boxShadow: 'inset 0 1px 3px rgba(0, 0, 0, 0.6)'
                  }}
                >
                  {qualifyProgress.isDone ? (
                    <div className="void-complete-bar" />
                  ) : (
                    <div className="void-stream-bar">
                      <div className="void-laser-gleam-effect" />
                    </div>
                  )}
                </div>

                {/* Sub-ticker */}
                <div
                  style={{
                    marginTop: '8px',
                    fontSize: '0.74rem',
                    color: 'var(--text-secondary, #94A3B8)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    overflow: 'hidden'
                  }}
                >
                  <Zap size={12} color={qualifyProgress.isDone ? '#00E5A0' : '#00E5C8'} style={{ flexShrink: 0 }} />
                  <span
                    style={{
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      opacity: 0.9,
                      fontFamily: (qualifyProgress.message || '').includes('Lead #') ? 'monospace, sans-serif' : 'inherit'
                    }}
                  >
                    {formatUserFacingMessage(qualifyProgress.message)}
                  </span>
                </div>
              </div>
            )}

            {scoreVal !== null ? (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '18px', marginBottom: '14px' }}>
                  {/* Radial SVG Gauge */}
                  <div style={{ position: 'relative', width: '84px', height: '84px', flexShrink: 0 }}>
                    <svg width="84" height="84" viewBox="0 0 84 84">
                      <circle cx="42" cy="42" r={radius} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="6" />
                      <circle
                        cx="42" cy="42" r={radius} fill="none"
                        stroke={scoreColor}
                        strokeWidth="6"
                        strokeDasharray={circumference}
                        strokeDashoffset={strokeDashoffset}
                        strokeLinecap="round"
                        transform="rotate(-90 42 42)"
                        style={{ transition: 'stroke-dashoffset 0.8s ease' }}
                      />
                    </svg>
                    <div style={{
                      position: 'absolute', inset: 0,
                      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
                    }}>
                      <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#F0F4F8', lineHeight: 1 }}>{scoreVal}</span>
                      <span style={{ fontSize: '0.62rem', color: '#94A3B8', fontWeight: 600 }}>/100</span>
                    </div>
                  </div>

                  {/* Badges & Potentiel */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{
                        background: isQualified ? 'rgba(0, 229, 160, 0.15)' : 'rgba(255, 71, 87, 0.15)',
                        border: `1px solid ${isQualified ? 'rgba(0, 229, 160, 0.4)' : 'rgba(255, 71, 87, 0.4)'}`,
                        color: isQualified ? '#00E5A0' : '#FF4757',
                        padding: '3px 10px',
                        borderRadius: '20px',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px'
                      }}>
                        {isQualified ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                        {isQualified ? 'Qualifié (ICP Cible)' : 'Écarté (Hors Cible)'}
                      </span>
                    </div>

                    <div style={{ fontSize: '0.85rem', color: '#94A3B8' }}>
                      Potentiel commercial : <strong style={{ color: '#F0F4F8', textTransform: 'capitalize' }}>{lead.potentiel || 'Non spécifié'}</strong>
                    </div>

                    {lead.modele_utilise && (
                      <div style={{ fontSize: '0.74rem', color: '#64748B' }}>
                        Moteur IA : <span style={{ color: '#38BDF8' }}>{lead.modele_utilise}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Reasoning Box */}
                {lead.raison && (
                  <div style={{
                    background: 'rgba(6, 17, 31, 0.6)',
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                    borderRadius: '10px',
                    padding: '12px 14px',
                    fontSize: '0.82rem',
                    color: '#CBD5E1',
                    lineHeight: 1.5
                  }}>
                    <strong style={{ color: '#38BDF8', display: 'block', marginBottom: '4px', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Évaluation de l&apos;Agent :
                    </strong>
                    {lead.raison}
                  </div>
                )}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '16px 0', color: '#94A3B8', fontSize: '0.85rem' }}>
                <p style={{ margin: '0 0 10px 0' }}>Ce prospect n&apos;a pas encore été analysé par l&apos;algorithme ICP.</p>
                <button
                  className="btn btn-secondary"
                  onClick={handleQualifyIA}
                  disabled={isQualifying || !!qualifyProgress?.active}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.82rem', padding: '0.45rem 0.9rem' }}
                >
                  <ScanLine size={14} style={{ flexShrink: 0 }} />
                  <span>{(isQualifying || qualifyProgress?.active) ? 'Qualification...' : 'Lancer la Qualification'}</span>
                </button>
              </div>
            )}
          </div>

          {/* SECTION B: CONTRÔLE STATUT COMMERCIAL (SEGMENTED SWITCHER) */}
          <div style={{
            background: 'linear-gradient(145deg, rgba(8, 20, 38, 0.7) 0%, rgba(12, 28, 52, 0.5) 100%)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '14px',
            padding: '14px 18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px'
          }}>
            <div>
              <span style={{ fontSize: '0.84rem', fontWeight: 600, color: '#F0F4F8', display: 'block' }}>
                Statut Commercial Manuel
              </span>
              <span style={{ fontSize: '0.74rem', color: '#94A3B8' }}>
                Ajustez manuellement l&apos;éligibilité à la prospection
              </span>
            </div>

            <div style={{
              display: 'inline-flex',
              background: 'rgba(6, 17, 31, 0.8)',
              padding: '3px',
              borderRadius: '10px',
              border: '1px solid rgba(255, 255, 255, 0.08)'
            }}>
              <button
                onClick={() => handleManualStatusChange('Qualifié')}
                style={{
                  background: statut === 'Qualifié' ? 'linear-gradient(135deg, rgba(0, 229, 160, 0.25), rgba(0, 229, 200, 0.25))' : 'transparent',
                  border: statut === 'Qualifié' ? '1px solid rgba(0, 229, 160, 0.4)' : '1px solid transparent',
                  color: statut === 'Qualifié' ? '#00E5A0' : '#94A3B8',
                  padding: '5px 12px',
                  borderRadius: '7px',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  transition: 'all 0.2s'
                }}
              >
                <CheckCircle2 size={13} />
                <span>Qualifié</span>
              </button>

              <button
                onClick={() => handleManualStatusChange('Écarté')}
                style={{
                  background: statut === 'Écarté' ? 'rgba(255, 71, 87, 0.2)' : 'transparent',
                  border: statut === 'Écarté' ? '1px solid rgba(255, 71, 87, 0.4)' : '1px solid transparent',
                  color: statut === 'Écarté' ? '#FF4757' : '#94A3B8',
                  padding: '5px 12px',
                  borderRadius: '7px',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  transition: 'all 0.2s'
                }}
              >
                <XCircle size={13} />
                <span>Écarté</span>
              </button>
            </div>
          </div>

          {/* SECTION C: COORDONNÉES & PROFIL ENTREPRISE */}
          <div style={{
            background: 'linear-gradient(145deg, rgba(8, 20, 38, 0.8) 0%, rgba(12, 28, 52, 0.5) 100%)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '16px',
            padding: '18px 20px'
          }}>
            <h3 style={{
              fontSize: '0.84rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              color: '#94A3B8',
              margin: '0 0 14px 0',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <Briefcase size={14} color="#38BDF8" />
              <span>Détails & Coordonnées</span>
            </h3>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '12px'
            }}>
              {/* Email */}
              <div style={{
                background: 'rgba(6, 17, 31, 0.6)',
                border: '1px solid rgba(255, 255, 255, 0.06)',
                borderRadius: '10px',
                padding: '10px 12px',
                gridColumn: 'span 2'
              }}>
                <span style={{ fontSize: '0.72rem', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: '4px' }}>
                  Adresse Email
                </span>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                  <span style={{ fontSize: '0.88rem', color: '#00E5C8', fontWeight: 600, wordBreak: 'break-all' }}>
                    {lead.email}
                  </span>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      onClick={handleCopyEmail}
                      title="Copier l'email"
                      style={{
                        background: 'rgba(255, 255, 255, 0.06)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '6px',
                        padding: '4px 8px',
                        fontSize: '0.72rem',
                        color: copiedEmail ? '#00E5A0' : '#94A3B8',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      {copiedEmail ? <Check size={12} /> : <Copy size={12} />}
                      <span>{copiedEmail ? 'Copié' : 'Copier'}</span>
                    </button>
                    <a
                      href={`mailto:${lead.email}`}
                      title="Ouvrir dans client mail"
                      style={{
                        background: 'rgba(255, 255, 255, 0.06)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '6px',
                        padding: '4px 8px',
                        fontSize: '0.72rem',
                        color: '#94A3B8',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        textDecoration: 'none'
                      }}
                    >
                      <ExternalLink size={12} />
                    </a>
                  </div>
                </div>
              </div>

              {/* Entreprise */}
              <div style={{
                background: 'rgba(6, 17, 31, 0.6)',
                border: '1px solid rgba(255, 255, 255, 0.06)',
                borderRadius: '10px',
                padding: '10px 12px'
              }}>
                <span style={{ fontSize: '0.72rem', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
                  <Building2 size={12} /> Entreprise
                </span>
                <span style={{ fontSize: '0.88rem', color: '#F0F4F8', fontWeight: 600 }}>
                  {lead.entreprise || 'Non renseigné'}
                </span>
              </div>

              {/* Secteur */}
              <div style={{
                background: 'rgba(6, 17, 31, 0.6)',
                border: '1px solid rgba(255, 255, 255, 0.06)',
                borderRadius: '10px',
                padding: '10px 12px'
              }}>
                <span style={{ fontSize: '0.72rem', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
                  <Layers size={12} /> Secteur
                </span>
                <span style={{ fontSize: '0.88rem', color: '#F0F4F8', fontWeight: 600 }}>
                  {lead.secteur || 'Non renseigné'}
                </span>
              </div>

              {/* Effectif */}
              <div style={{
                background: 'rgba(6, 17, 31, 0.6)',
                border: '1px solid rgba(255, 255, 255, 0.06)',
                borderRadius: '10px',
                padding: '10px 12px'
              }}>
                <span style={{ fontSize: '0.72rem', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
                  <Users size={12} /> Effectif
                </span>
                <span style={{ fontSize: '0.88rem', color: '#F0F4F8', fontWeight: 600 }}>
                  {lead.taille_ent ? `${lead.taille_ent} employés` : 'Non renseigné'}
                </span>
              </div>

              {/* Pays */}
              <div style={{
                background: 'rgba(6, 17, 31, 0.6)',
                border: '1px solid rgba(255, 255, 255, 0.06)',
                borderRadius: '10px',
                padding: '10px 12px'
              }}>
                <span style={{ fontSize: '0.72rem', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
                  <MapPin size={12} /> Pays / Zone
                </span>
                <span style={{ fontSize: '0.88rem', color: '#F0F4F8', fontWeight: 600 }}>
                  {lead.pays || 'Non renseigné'}
                </span>
              </div>

              {/* Source d'Ingestion */}
              <div style={{
                background: 'rgba(6, 17, 31, 0.6)',
                border: '1px solid rgba(255, 255, 255, 0.06)',
                borderRadius: '10px',
                padding: '10px 12px'
              }}>
                <span style={{ fontSize: '0.72rem', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: '4px' }}>
                  Source d&apos;Origine
                </span>
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  color: lead.source?.toLowerCase().includes('sourcing') ? '#00E5C8' : '#38BDF8'
                }}>
                  {lead.source?.toLowerCase().includes('sourcing') ? (
                    <Globe size={13} style={{ flexShrink: 0 }} />
                  ) : (
                    <FileSpreadsheet size={13} style={{ flexShrink: 0 }} />
                  )}
                  <span>{lead.source || 'Fichier CSV'}</span>
                </span>
              </div>

              {/* Date Collecte */}
              <div style={{
                background: 'rgba(6, 17, 31, 0.6)',
                border: '1px solid rgba(255, 255, 255, 0.06)',
                borderRadius: '10px',
                padding: '10px 12px'
              }}>
                <span style={{ fontSize: '0.72rem', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
                  <Calendar size={12} /> Date Découverte
                </span>
                <span style={{ fontSize: '0.82rem', color: '#CBD5E1', fontWeight: 500 }}>
                  {new Date(lead.date_collecte).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
              </div>
            </div>
          </div>

          {/* SECTION D: HISTORIQUE DE COMMUNICATION */}
          <div style={{
            background: 'linear-gradient(145deg, rgba(8, 20, 38, 0.75) 0%, rgba(12, 28, 52, 0.5) 100%)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '16px',
            padding: '16px 20px'
          }}>
            <h3 style={{
              fontSize: '0.84rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              color: '#94A3B8',
              margin: '0 0 12px 0',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <Mail size={14} color="#00E5C8" />
              <span>Historique d&apos;Envois</span>
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div style={{ background: 'rgba(6, 17, 31, 0.6)', padding: '10px 12px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)' }}>
                <span style={{ fontSize: '0.72rem', color: '#94A3B8', display: 'block', marginBottom: '4px' }}>Emails Déjà Envoyés</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {(() => {
                    const sentCount = lead.agent_emails_count ?? lead.emails_count ?? 0;
                    return (
                      <span style={{
                        background: sentCount > 0 ? 'rgba(0, 229, 200, 0.15)' : 'rgba(255,255,255,0.06)',
                        color: sentCount > 0 ? '#00E5C8' : '#94A3B8',
                        border: `1px solid ${sentCount > 0 ? 'rgba(0, 229, 200, 0.35)' : 'rgba(255,255,255,0.1)'}`,
                        padding: '2px 8px',
                        borderRadius: '12px',
                        fontWeight: 700,
                        fontSize: '0.8rem'
                      }}>
                        {sentCount}
                      </span>
                    );
                  })()}
                  <span style={{ fontSize: '0.78rem', color: '#94A3B8' }}>délivré(s)</span>
                </div>
              </div>

              <div style={{ background: 'rgba(6, 17, 31, 0.6)', padding: '10px 12px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)' }}>
                <span style={{ fontSize: '0.72rem', color: '#94A3B8', display: 'block', marginBottom: '4px' }}>Dernière Action</span>
                <span style={{ fontSize: '0.82rem', color: lead.date_envoi ? '#F0F4F8' : '#64748B', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Clock size={12} />
                  {lead.date_envoi ? new Date(lead.date_envoi).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'Aucun email'}
                </span>
              </div>
            </div>
          </div>

          {/* SECTION E: STUDIO DE PROSPECTION EMAIL (COLD OUTREACH) */}
          {isQualified && (
            <div style={{
              background: 'linear-gradient(145deg, rgba(8, 20, 38, 0.95) 0%, rgba(12, 28, 52, 0.75) 100%)',
              border: '1px solid rgba(0, 229, 200, 0.3)',
              borderRadius: '16px',
              padding: '20px',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Mail size={18} color="#C084FC" style={{ flexShrink: 0 }} />
                  <div>
                    <h3 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 700, color: '#F0F4F8' }}>
                      Campagne & Rédaction d&apos;Email
                    </h3>
                    <p style={{ margin: 0, fontSize: '0.74rem', color: '#94A3B8' }}>
                      Message hyper-personnalisé selon les données du profil
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleGenerateEmail}
                  disabled={isGeneratingEmail}
                  style={{
                    background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.2), rgba(0, 229, 200, 0.2))',
                    border: '1px solid rgba(168, 85, 247, 0.4)',
                    color: '#C084FC',
                    padding: '6px 12px',
                    borderRadius: '8px',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    cursor: isGeneratingEmail ? 'not-allowed' : 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={e => {
                    if (!isGeneratingEmail) e.currentTarget.style.borderColor = 'rgba(168, 85, 247, 0.7)';
                  }}
                  onMouseLeave={e => {
                    if (!isGeneratingEmail) e.currentTarget.style.borderColor = 'rgba(168, 85, 247, 0.4)';
                  }}
                >
                  <Sparkles size={13} style={{ flexShrink: 0 }} />
                  <span>{isGeneratingEmail ? 'Rédaction IA...' : 'Générer avec l\'IA'}</span>
                </button>
              </div>

              {/* Form Inputs */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: '5px' }}>
                    Objet du Mail
                  </label>
                  <input
                    type="text"
                    value={sujet}
                    onChange={e => setSujet(e.target.value)}
                    placeholder="Objet engageant et personnalisé..."
                    style={{
                      width: '100%',
                      background: 'rgba(6, 17, 31, 0.8)',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      borderRadius: '8px',
                      padding: '8px 12px',
                      color: '#F0F4F8',
                      fontSize: '0.85rem',
                      outline: 'none',
                      transition: 'border-color 0.2s'
                    }}
                    onFocus={e => e.currentTarget.style.borderColor = '#00E5C8'}
                    onBlur={e => e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.12)'}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: '5px' }}>
                     CC                  </label>
                  <input
                    type="text"
                    value={cc}
                    onChange={e => setCc(e.target.value)}
                    placeholder="commercial@entreprise.com"
                    style={{
                      width: '100%',
                      background: 'rgba(6, 17, 31, 0.8)',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      borderRadius: '8px',
                      padding: '8px 12px',
                      color: '#F0F4F8',
                      fontSize: '0.85rem',
                      outline: 'none',
                      transition: 'border-color 0.2s'
                    }}
                    onFocus={e => e.currentTarget.style.borderColor = '#00E5C8'}
                    onBlur={e => e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.12)'}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: '5px' }}>
                    Corps du Message
                  </label>
                  <textarea
                    rows={6}
                    value={corps}
                    onChange={e => setCorps(e.target.value)}
                    placeholder="Bonjour {{prenom}}, suite à votre activité chez {{entreprise}}..."
                    style={{
                      width: '100%',
                      background: 'rgba(6, 17, 31, 0.8)',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      borderRadius: '8px',
                      padding: '10px 12px',
                      color: '#F0F4F8',
                      fontSize: '0.85rem',
                      lineHeight: 1.5,
                      outline: 'none',
                      resize: 'vertical',
                      fontFamily: 'inherit',
                      transition: 'border-color 0.2s'
                    }}
                    onFocus={e => e.currentTarget.style.borderColor = '#00E5C8'}
                    onBlur={e => e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.12)'}
                  />
                </div>

                {/* Email Delivery Feedback */}
                {lead.email_statut && lead.email_statut !== 'Brouillon' && (
                  <div style={{
                    padding: '8px 12px',
                    borderRadius: '8px',
                    fontSize: '0.8rem',
                    background: lead.email_statut === 'Succès' ? 'rgba(0, 229, 160, 0.12)' : 'rgba(255, 71, 87, 0.12)',
                    border: `1px solid ${lead.email_statut === 'Succès' ? 'rgba(0, 229, 160, 0.3)' : 'rgba(255, 71, 87, 0.3)'}`,
                    color: lead.email_statut === 'Succès' ? '#00E5A0' : '#FF4757',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}>
                    {lead.email_statut === 'Succès' ? (
                      <>
                        <CheckCircle2 size={14} />
                        <span>Envoyé avec succès le {lead.date_envoi ? new Date(lead.date_envoi).toLocaleString('fr-FR') : ''}</span>
                      </>
                    ) : (
                      <>
                        <AlertCircle size={14} />
                        <span>Échec d&apos;envoi : {lead.email_erreur || 'Erreur SMTP'}</span>
                      </>
                    )}
                  </div>
                )}

                {/* Action CTA */}
                <button
                  onClick={handleSendEmail}
                  disabled={isSending}
                  style={{
                    marginTop: '4px',
                    background: 'linear-gradient(135deg, #00E5C8 0%, #00B4D8 100%)',
                    border: 'none',
                    borderRadius: '10px',
                    padding: '11px 18px',
                    color: '#06111F',
                    fontWeight: 700,
                    fontSize: '0.88rem',
                    cursor: isSending ? 'not-allowed' : 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    boxShadow: '0 4px 18px rgba(0, 229, 200, 0.25)',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={e => {
                    if (!isSending) e.currentTarget.style.transform = 'translateY(-1px)';
                  }}
                  onMouseLeave={e => {
                    if (!isSending) e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  <Send size={15} />
                  <span>{isSending ? 'Envoi en cours...' : 'Envoyer l\'Email Personnalisé'}</span>
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </>
  );

  return typeof document !== 'undefined' ? createPortal(drawerContent, document.body) : drawerContent;
}
