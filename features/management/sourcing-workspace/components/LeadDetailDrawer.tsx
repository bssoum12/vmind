'use client';

import React, { useState, useEffect } from 'react';
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
  Layers 
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
  raison?: string;
  potentiel?: string;
  est_qualifie?: boolean;
  department?: string;
  seniority?: string;
  decision_maker?: boolean;
}

interface LeadDetailDrawerProps {
  lead: Lead | null;
  isOpen: boolean;
  onClose: () => void;
  onRefresh: () => void;
  signature?: string;
  defaultCc?: string;
}

export default function LeadDetailDrawer({ lead, isOpen, onClose }: LeadDetailDrawerProps) {
  const { showToast } = useToast();
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [copiedProfile, setCopiedProfile] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!lead) return null;

  const initials = `${(lead.prenom || '')[0] || ''}${(lead.nom || '')[0] || ''}`.toUpperCase() || 'L';
  const isDecMaker = lead.decision_maker === true || /ceo|cto|cfo|coo|cmo|cro|founder|fondateur|director|directeur|vp|president|head|leader/i.test(lead.poste || '');

  const handleCopyEmail = () => {
    navigator.clipboard.writeText(lead.email);
    setCopiedEmail(true);
    showToast('Email copié dans le presse-papiers !', 'info');
    setTimeout(() => setCopiedEmail(false), 2000);
  };

  const handleCopyProfile = () => {
    const profileText = [
      `CANDIDAT SOURCÉ: ${lead.prenom} ${lead.nom}`,
      `Poste: ${lead.poste || 'Non spécifié'}`,
      `Entreprise: ${lead.entreprise || 'Non spécifiée'}`,
      `Secteur: ${lead.secteur || 'N/A'} | Pays: ${lead.pays || 'N/A'}`,
      `Email: ${lead.email}`,
      `Décideur: ${isDecMaker ? 'Oui' : 'Non'}`,
      `Source: ${lead.source || 'Sourcing Engine'}`,
      `Date de collecte: ${new Date(lead.date_collecte).toLocaleDateString('fr-FR')}`
    ].join('\n');

    navigator.clipboard.writeText(profileText);
    setCopiedProfile(true);
    showToast('Fiche du candidat copiée !', 'success');
    setTimeout(() => setCopiedProfile(false), 2000);
  };

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div 
          onClick={onClose}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(3, 8, 16, 0.75)',
            backdropFilter: 'blur(6px)',
            zIndex: 9998,
            transition: 'opacity 0.25s ease'
          }}
        />
      )}

      {/* Drawer Panel */}
      <div 
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: '520px',
          maxWidth: '92vw',
          backgroundColor: '#071324',
          backgroundImage: 'radial-gradient(ellipse at top right, rgba(0, 229, 200, 0.08) 0%, transparent 60%)',
          borderLeft: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: '-12px 0 40px rgba(0, 0, 0, 0.6)',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
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
          background: 'linear-gradient(90deg, transparent, #00E5C8, #38BDF8, transparent)'
        }} />

        {/* 1. DRAWER HEADER */}
        <div style={{
          padding: '24px 28px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: '16px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{
              width: '52px',
              height: '52px',
              borderRadius: '14px',
              background: 'linear-gradient(135deg, rgba(0, 229, 200, 0.25), rgba(6, 17, 31, 0.9))',
              border: '1px solid rgba(0, 229, 200, 0.4)',
              boxShadow: '0 0 16px rgba(0, 229, 200, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#00E5C8',
              fontSize: '1.2rem',
              fontWeight: 700,
              flexShrink: 0
            }}>
              {initials}
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: '#F0F4F8' }}>
                  {lead.prenom} {lead.nom}
                </h2>
                {isDecMaker && (
                  <span style={{
                    background: 'rgba(0, 229, 160, 0.12)',
                    border: '1px solid rgba(0, 229, 160, 0.3)',
                    color: '#00E5A0',
                    fontSize: '0.72rem',
                    fontWeight: 600,
                    padding: '2px 7px',
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
                {lead.entreprise && <span style={{ color: '#38BDF8' }}>@{lead.entreprise}</span>}
              </p>
            </div>
          </div>

          <button 
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '8px',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#94A3B8',
              cursor: 'pointer',
              transition: 'all 0.2s'
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

        {/* 2. DRAWER CONTENT */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '24px 28px',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px'
        }}>

          {/* SOURCING STATUS CARD */}
          <div style={{
            background: 'linear-gradient(145deg, rgba(8, 20, 38, 0.9) 0%, rgba(12, 28, 52, 0.7) 100%)',
            border: '1px solid rgba(0, 229, 200, 0.25)',
            borderRadius: '14px',
            padding: '16px 18px',
            boxShadow: '0 4px 20px rgba(0, 229, 200, 0.08)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <span style={{ 
                display: 'inline-flex', 
                alignItems: 'center', 
                gap: '6px', 
                color: '#00E5C8', 
                fontSize: '0.82rem', 
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.04em'
              }}>
                <Sparkles size={13} /> Sourcing Intelligence
              </span>
              <span style={{
                background: 'rgba(0, 229, 160, 0.15)',
                border: '1px solid rgba(0, 229, 160, 0.3)',
                color: '#00E5A0',
                fontSize: '0.75rem',
                fontWeight: 600,
                padding: '2px 8px',
                borderRadius: '8px'
              }}>
                ⚡ Pré-qualifié ({lead.score ?? 90}%)
              </span>
            </div>
            <p style={{ margin: 0, fontSize: '0.85rem', color: '#CBD5E1', lineHeight: 1.5 }}>
              {lead.raison || "Candidat identifié et vérifié selon vos critères de ciblage (titre, entreprise et géographie)."}
            </p>
          </div>

          {/* CONTACT & COORDINATES SECTION */}
          <div style={{
            background: 'rgba(8, 20, 38, 0.6)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '14px',
            padding: '18px'
          }}>
            <h3 style={{ 
              fontSize: '0.8rem', 
              fontWeight: 600, 
              color: '#94A3B8', 
              textTransform: 'uppercase', 
              letterSpacing: '0.05em', 
              margin: '0 0 14px 0',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <Mail size={14} style={{ color: '#00E5C8' }} /> Coordonnées de Contact
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              {/* Email */}
              <div style={{ gridColumn: '1 / -1' }}>
                <div style={{ fontSize: '0.75rem', color: '#64748B', marginBottom: '4px' }}>Email Professionnel</div>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between',
                  background: 'rgba(6, 17, 31, 0.8)',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: '1px solid rgba(255, 255, 255, 0.08)'
                }}>
                  <span style={{ fontSize: '0.9rem', color: '#F0F4F8', fontWeight: 500, wordBreak: 'break-all' }}>
                    {lead.email}
                  </span>
                  <button
                    onClick={handleCopyEmail}
                    style={{
                      background: copiedEmail ? 'rgba(0, 229, 160, 0.2)' : 'rgba(255, 255, 255, 0.06)',
                      border: copiedEmail ? '1px solid #00E5A0' : '1px solid rgba(255, 255, 255, 0.1)',
                      color: copiedEmail ? '#00E5A0' : '#94A3B8',
                      padding: '4px 8px',
                      borderRadius: '6px',
                      fontSize: '0.75rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      transition: 'all 0.2s',
                      flexShrink: 0
                    }}
                  >
                    {copiedEmail ? <Check size={12} /> : <Copy size={12} />}
                    <span>{copiedEmail ? 'Copié' : 'Copier'}</span>
                  </button>
                </div>
              </div>

              {/* Pays */}
              <div>
                <div style={{ fontSize: '0.75rem', color: '#64748B', marginBottom: '2px' }}>Localisation / Pays</div>
                <div style={{ fontSize: '0.88rem', color: '#F0F4F8', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <MapPin size={13} style={{ color: '#94A3B8' }} /> {lead.pays || 'Non spécifié'}
                </div>
              </div>

              {/* Source */}
              <div>
                <div style={{ fontSize: '0.75rem', color: '#64748B', marginBottom: '2px' }}>Moteur Source</div>
                <div style={{ fontSize: '0.88rem', color: '#00E5C8', fontWeight: 500, textTransform: 'capitalize' }}>
                  {lead.source || 'Sourcing Engine'}
                </div>
              </div>

              {/* Date Collecte */}
              <div style={{ gridColumn: '1 / -1' }}>
                <div style={{ fontSize: '0.75rem', color: '#64748B', marginBottom: '2px' }}>Date d'extraction</div>
                <div style={{ fontSize: '0.85rem', color: '#CBD5E1', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <Calendar size={13} style={{ color: '#94A3B8' }} />
                  {lead.date_collecte ? new Date(lead.date_collecte).toLocaleString('fr-FR') : '-'}
                </div>
              </div>
            </div>
          </div>

          {/* PROFESSIONAL & COMPANY SECTION */}
          <div style={{
            background: 'rgba(8, 20, 38, 0.6)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '14px',
            padding: '18px'
          }}>
            <h3 style={{ 
              fontSize: '0.8rem', 
              fontWeight: 600, 
              color: '#94A3B8', 
              textTransform: 'uppercase', 
              letterSpacing: '0.05em', 
              margin: '0 0 14px 0',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <Building size={14} style={{ color: '#38BDF8' }} /> Profil Professionnel
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              {/* Entreprise */}
              <div style={{ gridColumn: '1 / -1' }}>
                <div style={{ fontSize: '0.75rem', color: '#64748B', marginBottom: '2px' }}>Entreprise</div>
                <div style={{ fontSize: '0.95rem', color: '#F0F4F8', fontWeight: 600 }}>
                  {lead.entreprise || 'Non spécifiée'}
                </div>
              </div>

              {/* Poste */}
              <div>
                <div style={{ fontSize: '0.75rem', color: '#64748B', marginBottom: '2px' }}>Intitulé du Poste</div>
                <div style={{ fontSize: '0.88rem', color: '#F0F4F8', fontWeight: 500 }}>
                  {lead.poste || 'Non spécifié'}
                </div>
              </div>

              {/* Seniority */}
              <div>
                <div style={{ fontSize: '0.75rem', color: '#64748B', marginBottom: '2px' }}>Niveau d'ancienneté</div>
                <div style={{ fontSize: '0.88rem', color: '#CBD5E1' }}>
                  {lead.seniority || (isDecMaker ? 'Executive / C-Level' : 'Senior')}
                </div>
              </div>

              {/* Secteur */}
              <div style={{ gridColumn: '1 / -1' }}>
                <div style={{ fontSize: '0.75rem', color: '#64748B', marginBottom: '2px' }}>Secteur d'Activité</div>
                <div style={{ fontSize: '0.85rem', color: '#CBD5E1' }}>
                  {lead.secteur || 'Industrie & Services'}
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* 3. DRAWER FOOTER & ACTIONS */}
        <div style={{
          padding: '18px 28px',
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          backgroundColor: 'rgba(6, 17, 31, 0.9)',
          display: 'flex',
          gap: '12px',
          justifyContent: 'flex-end',
          alignItems: 'center'
        }}>
          <button
            onClick={handleCopyProfile}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '10px 16px',
              borderRadius: '8px',
              background: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              color: '#F0F4F8',
              fontSize: '0.85rem',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)'}
          >
            {copiedProfile ? <Check size={14} style={{ color: '#00E5A0' }} /> : <Copy size={14} />}
            {copiedProfile ? 'Fiche Copiée !' : 'Copier Fiche'}
          </button>

          <button
            onClick={onClose}
            style={{
              padding: '10px 24px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #00E5C8, #00B4D8)',
              border: 'none',
              color: '#06111F',
              fontSize: '0.85rem',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 2px 12px rgba(0, 229, 200, 0.25)',
              transition: 'all 0.2s'
            }}
            onMouseEnter={e => {
              e.currentTarget.style.transform = 'translateY(-1px)';
              e.currentTarget.style.boxShadow = '0 4px 18px rgba(0, 229, 200, 0.4)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 2px 12px rgba(0, 229, 200, 0.25)';
            }}
          >
            Fermer
          </button>
        </div>
      </div>
    </>
  );
}
