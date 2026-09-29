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
            <div className="drawer-avatar">
              {initials}
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
                {lead.entreprise && <span className="company-handle">@{lead.entreprise}</span>}
              </p>
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
                <Sparkles size={13} /> Sourcing Intelligence
              </span>
              <span className="prequalified-badge">
                ⚡ Pré-qualifié ({lead.score ?? 90}%)
              </span>
            </div>
            <p className="intelligence-reason">
              {lead.raison || "Candidat identifié et vérifié selon vos critères de ciblage (titre, entreprise et géographie)."}
            </p>
          </div>

          {/* CONTACT & COORDINATES SECTION */}
          <div className="drawer-section-card">
            <h3 className="section-title">
              <Mail size={14} /> Coordonnées de Contact
            </h3>

            <div className="section-grid">
              {/* Email */}
              <div className="full-width">
                <div className="field-label">Email Professionnel</div>
                <div className="email-copy-box">
                  <span className="email-text">
                    {lead.email}
                  </span>
                  <button
                    onClick={handleCopyEmail}
                    className={`copy-btn ${copiedEmail ? 'copied' : ''}`}
                  >
                    {copiedEmail ? <Check size={12} /> : <Copy size={12} />}
                    <span>{copiedEmail ? 'Copié' : 'Copier'}</span>
                  </button>
                </div>
              </div>

              {/* Pays */}
              <div>
                <div className="field-label">Localisation / Pays</div>
                <div className="field-value">
                  <MapPin size={13} /> {lead.pays || 'Non spécifié'}
                </div>
              </div>

              {/* Source */}
              <div>
                <div className="field-label">Moteur Source</div>
                <div className="field-value highlight">
                  {lead.source || 'Sourcing Engine'}
                </div>
              </div>

              {/* Date Collecte */}
              <div className="full-width">
                <div className="field-label">Date d'extraction</div>
                <div className="field-value">
                  <Calendar size={13} />
                  {lead.date_collecte ? new Date(lead.date_collecte).toLocaleString('fr-FR') : '-'}
                </div>
              </div>
            </div>
          </div>

          {/* PROFESSIONAL & COMPANY SECTION */}
          <div className="drawer-section-card">
            <h3 className="section-title company">
              <Building size={14} /> Profil Professionnel
            </h3>

            <div className="section-grid">
              {/* Entreprise */}
              <div className="full-width">
                <div className="field-label">Entreprise</div>
                <div className="field-value bold">
                  {lead.entreprise || 'Non spécifiée'}
                </div>
              </div>

              {/* Poste */}
              <div>
                <div className="field-label">Intitulé du Poste</div>
                <div className="field-value">
                  {lead.poste || 'Non spécifié'}
                </div>
              </div>

              {/* Seniority */}
              <div>
                <div className="field-label">Niveau d'ancienneté</div>
                <div className="field-value">
                  {lead.seniority || (isDecMaker ? 'Executive / C-Level' : 'Senior')}
                </div>
              </div>

              {/* Secteur */}
              <div className="full-width">
                <div className="field-label">Secteur d'Activité</div>
                <div className="field-value">
                  {lead.secteur || 'Industrie & Services'}
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* 3. DRAWER FOOTER & ACTIONS */}
        <div className="drawer-footer-section">
          <button
            onClick={handleCopyProfile}
            className="drawer-copy-btn"
          >
            {copiedProfile ? <Check size={14} style={{ color: '#00E5A0' }} /> : <Copy size={14} />}
            {copiedProfile ? 'Fiche Copiée !' : 'Copier Fiche'}
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
