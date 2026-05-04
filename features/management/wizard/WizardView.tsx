'use client';

import React, { useState } from 'react';
import { Button } from '@/shared/management/components/Button';
import { AGENT_TEMPLATES } from '@/shared/management/constants/data';

interface WizardViewProps {
  templateId: string;
  onCancel: () => void;
}

export const WizardView: React.FC<WizardViewProps> = ({ templateId, onCancel }) => {
  const [step, setStep] = useState(1);
  const template = AGENT_TEMPLATES.find(t => t.id === templateId);

  return (
    <div id="view-wizard" className="anim">
      <div className="page-head">
        <div>
          <div className="page-title" id="wiz-title">
            Configuration: {template ? template.name : 'Nouvel Agent sur mesure'}
          </div>
          <div className="page-sub">Configurez votre employé virtuel en 4 étapes</div>
        </div>
        <div className="page-actions">
          <Button onClick={onCancel}>← Retour Marketplace</Button>
        </div>
      </div>
      <div className="scroll">
        <div className="wizard-wrap">
          {/* STEPS */}
          <div className="wizard-steps" id="wiz-steps">
            <div className={`wstep ${step === 1 ? 'active' : step > 1 ? 'done' : ''}`}>
              <div className="wstep-inner">
                <div className="wstep-num">1</div>
                <div className="wstep-label">Identité</div>
              </div>
            </div>
            <div className={`wstep ${step === 2 ? 'active' : step > 2 ? 'done' : ''}`}>
              <div className="wstep-inner">
                <div className="wstep-num">2</div>
                <div className="wstep-label">Cibles</div>
              </div>
            </div>
            <div className={`wstep ${step === 3 ? 'active' : step > 3 ? 'done' : ''}`}>
              <div className="wstep-inner">
                <div className="wstep-num">3</div>
                <div className="wstep-label">Message</div>
              </div>
            </div>
            <div className={`wstep ${step === 4 ? 'active' : step > 4 ? 'done' : ''}`}>
              <div className="wstep-inner">
                <div className="wstep-num">4</div>
                <div className="wstep-label">Déploiement</div>
              </div>
            </div>
          </div>

          {/* STEP 1: Identité */}
          {step === 1 && (
            <div id="step1" className="anim">
              <div className="wcard">
                <div className="wcard-title"><span className="dot"></span>Identité de l&apos;Employé Virtuel</div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Nom de l&apos;agent <span className="req">*</span></label>
                    <input
                      type="text"
                      className="form-input"
                      key={template?.name || 'custom-name'}
                      defaultValue={template?.name || ''}
                      placeholder="Ex: Yasmine, Mohamed, Amira..."
                    />
                    <div className="form-hint">Ce nom sera affiché dans les communications envoyées aux clients</div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Titre / Poste</label>
                    <input
                      type="text"
                      className="form-input"
                      key={template?.category || 'custom-cat'}
                      defaultValue={template ? template.category.split(' · ')[0] : ''}
                      placeholder="Ex: Responsable Recouvrement"
                    />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Langue de communication <span className="req">*</span></label>
                    <select className="form-input" defaultValue="Français">
                      <option>Français</option>
                      <option>Arabe</option>
                      <option>Français + Arabe</option>
                      <option>Anglais</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Ton de communication</label>
                    <select className="form-input" defaultValue="Professionnel et ferme">
                      <option>Professionnel et ferme</option>
                      <option>Cordial</option>
                      <option>Formel strict</option>
                      <option>Amical</option>
                    </select>
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <Button variant="primary" onClick={() => setStep(2)}>Étape suivante →</Button>
              </div>
            </div>
          )}

          {/* STEP 2: Cibles */}
          {step === 2 && (
            <div id="step2" className="anim">
              <div className="wcard">
                <div className="wcard-title"><span className="dot"></span>Sélection des Cibles</div>
                <div className="form-group" style={{ marginBottom: '14px' }}>
                  <label className="form-label">Clients identifiés (extraits de TraLIS)</label>
                  <div className="form-hint" style={{ marginBottom: '10px' }}>6 clients correspondent aux critères · Sélectionnez ceux à inclure</div>
                  <div className="client-grid">
                    <div className="client-item sel">
                      <div className="client-check">✓</div>
                      <div style={{ flex: 1 }}>
                        <div className="client-name">Société ABC Transport</div>
                        <div className="client-debt">88 400 TND · 92 jours</div>
                      </div>
                      <span className="client-risk risk-h">ÉLEVÉ</span>
                    </div>
                    <div className="client-item sel">
                      <div className="client-check">✓</div>
                      <div style={{ flex: 1 }}>
                        <div className="client-name">Distribution SARL</div>
                        <div className="client-debt">45 200 TND · 64 jours</div>
                      </div>
                      <span className="client-risk risk-h">ÉLEVÉ</span>
                    </div>
                    <div className="client-item sel">
                      <div className="client-check">✓</div>
                      <div style={{ flex: 1 }}>
                        <div className="client-name">Industrie Meknès</div>
                        <div className="client-debt">31 500 TND · 47 jours</div>
                      </div>
                      <span className="client-risk risk-m">MOYEN</span>
                    </div>
                    <div className="client-item">
                      <div className="client-check"></div>
                      <div style={{ flex: 1 }}>
                        <div className="client-name">Agri-Sud Coopérative</div>
                        <div className="client-debt">8 700 TND · 31 jours</div>
                      </div>
                      <span className="client-risk risk-l">FAIBLE</span>
                    </div>
                  </div>
                </div>
                <div className="toggle-row">
                  <div className="toggle-info">
                    <div className="tl">Mise à jour automatique des cibles</div>
                    <div className="ts">Recalculer la liste à chaque exécution selon les critères</div>
                  </div>
                  <div className="toggle on"></div>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px' }}>
                <Button onClick={() => setStep(1)}>← Précédent</Button>
                <Button variant="primary" onClick={() => setStep(3)}>Étape suivante →</Button>
              </div>
            </div>
          )}

          {/* STEP 3: Message */}
          {step === 3 && (
            <div id="step3" className="anim">
              <div className="wcard">
                <div className="wcard-title"><span className="dot"></span>Message & Instructions</div>
                <div className="form-group" style={{ marginBottom: '16px' }}>
                  <label className="form-label">Objet du message (Email) <span className="req">*</span></label>
                  <input type="text" className="form-input" defaultValue="Rappel de paiement — Facture(s) en attente · {{NomEntreprise}}" />
                </div>
                <div className="form-group" style={{ marginBottom: '12px' }}>
                  <label className="form-label">Corps du message <span className="req">*</span></label>
                  <div className="msg-builder">
                    <div className="msg-toolbar">
                      <span className="msg-tool">G</span>
                      <span className="msg-tool"><em>I</em></span>
                      <span className="msg-tool">≡</span>
                    </div>
                    <div className="msg-vars">
                      <span className="var-chip">{'{{NomClient}}'}</span>
                      <span className="var-chip">{'{{MontantDû}}'}</span>
                      <span className="var-chip">{'{{DateLimite}}'}</span>
                    </div>
                    <textarea className="form-input" style={{ border: 'none', borderRadius: 0, minHeight: '140px' }} defaultValue={`Monsieur / Madame,\n\nNous nous permettons de vous rappeler que la facture d'un montant de {{MontantDû}} TND est arrivée à échéance.\n\nCordialement,\nL&apos;Agent VMIND`} />
                  </div>
                </div>
                <div className="preview-panel">
                  <div className="preview-head">
                    <span style={{ fontSize: '16px' }}>👁</span>
                    <span className="preview-label">Aperçu — Société ABC Transport</span>
                  </div>
                  <div className="preview-body" style={{ fontSize: '12px', lineHeight: '1.6' }}>
                    <strong style={{ color: 'var(--muted)', fontSize: '10px' }}>OBJET :</strong> Rappel de paiement — Facture(s) en attente · Société ABC Transport<br /><br />
                    Monsieur / Madame,<br /><br />
                    Nous nous permettons de vous rappeler que la facture <strong style={{ color: 'var(--cyan)' }}>FAC-2024-001</strong> d&apos;un montant de <strong style={{ color: 'var(--cyan)' }}>88 400 TND</strong> est arrivée à échéance.<br /><br />
                    Cordialement,<br />
                    <strong>{template?.name || 'L&apos;Agent VMIND'}</strong>
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px' }}>
                <Button onClick={() => setStep(2)}>← Précédent</Button>
                <Button variant="primary" onClick={() => setStep(4)}>Étape suivante →</Button>
              </div>
            </div>
          )}

          {/* STEP 4: Planification */}
          {step === 4 && (
            <div id="step4" className="anim">
              <div className="wcard">
                <div className="wcard-title"><span className="dot"></span>Planification & Déploiement</div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Fréquence d&apos;exécution</label>
                    <select className="form-input" defaultValue="Tous les lundis et jeudis">
                      <option>Tous les jours à 08h00</option>
                      <option>Tous les lundis et jeudis</option>
                      <option>Tous les 1er du mois</option>
                    </select>
                  </div>
                </div>
                <div className="info-box" style={{ marginTop: '20px' }}>
                  ⚡ <strong>L&apos;agent est prêt.</strong> En cliquant sur déployer, il commencera à s&apos;exécuter selon le planning défini.
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px' }}>
                <Button onClick={() => setStep(3)}>← Précédent</Button>
                <Button variant="primary" onClick={() => onCancel()}>⚡ Déployer l&apos;Agent</Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
