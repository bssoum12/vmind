'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Globe,
  ArrowRight,
  ArrowLeft,
  Check
} from 'lucide-react';
import { CompanyContext, CompanyContextModalProps } from '../types/company-context.types';
import { saveCompanyContext, researchCompanyWebsite } from '../api/companyContextApi';
import { useToast } from '@/shared/contexts/ToastContext';
import '../company-context.scss';

export const CompanyContextModal: React.FC<CompanyContextModalProps> = ({
  isOpen = true,
  context,
  onClose,
  onSaveContext
}) => {
  const { showToast } = useToast();

  // Stepper state: 1 = Website question, 2 = Information & Synthesis
  const [step, setStep] = useState<1 | 2>(1);
  const [hasWebsite, setHasWebsite] = useState<boolean>(true);

  // Form fields
  const [websiteUrl, setWebsiteUrl] = useState<string>('');
  const [aiSummary, setAiSummary] = useState<string>('');
  const [additionalInfo, setAdditionalInfo] = useState<string>('');
  const [manualDescription, setManualDescription] = useState<string>('');
  const [rawSearchData, setRawSearchData] = useState<any>(context?.raw_search_data || {});

  // Async states
  const [isResearching, setIsResearching] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isSaved, setIsSaved] = useState<boolean>(false);

  // Initialize from existing context
  useEffect(() => {
    if (context) {
      if (context.website) {
        setWebsiteUrl(context.website);
        setHasWebsite(true);
      }
      if (context.summary) {
        setAiSummary(context.summary);
      }
      if (context.additional_info) {
        setAdditionalInfo(context.additional_info);
      }
      if (context.raw_search_data) {
        setRawSearchData(context.raw_search_data);
      }
      if (!context.website && context.summary) {
        setManualDescription(context.summary);
        setHasWebsite(false);
      }
      // If a summary is already present, open directly to Step 2
      if (context.summary && context.summary.trim().length > 0) {
        setStep(2);
      }
    }
  }, [context]);

  // Validation: minimum 200 characters required when no website is provided
  const manualCharCount = useMemo(() => {
    return manualDescription.trim().length;
  }, [manualDescription]);

  const isStep2Valid = useMemo(() => {
    if (hasWebsite) {
      return (
        aiSummary.trim().length > 0 ||
        additionalInfo.trim().length > 0 ||
        websiteUrl.trim().length > 0
      );
    }
    return manualCharCount >= 200;
  }, [hasWebsite, aiSummary, additionalInfo, websiteUrl, manualCharCount]);

  // Action: Launch AI Web Research
  const handleAnalyzeWebsite = async () => {
    const trimmed = websiteUrl.trim();
    if (!trimmed) {
      showToast('Veuillez saisir l\'adresse de votre site web', 'err');
      return;
    }

    let formattedUrl = trimmed;
    if (!/^https?:\/\//i.test(formattedUrl)) {
      formattedUrl = `https://${formattedUrl}`;
      setWebsiteUrl(formattedUrl);
    }

    setIsResearching(true);
    try {
      const result = await researchCompanyWebsite(formattedUrl);
      if (result && result.summary) {
        setAiSummary(result.summary);
        if (result.raw_search_data) {
          setRawSearchData(result.raw_search_data);
        }
        setHasWebsite(true);
        setStep(2);
        showToast('Synthèse générée avec succès', 'ok');
      } else {
        throw new Error('Aucune information exploitable trouvée sur ce site');
      }
    } catch (err: any) {
      console.warn('[CompanyContextModal] Web research warning:', err);
      showToast(err.message || 'Échec de l\'analyse du site. Vérifiez l\'adresse ou saisissez vos informations manuellement.', 'err');
    } finally {
      setIsResearching(false);
    }
  };

  // Action: Skip website and enter manual description
  const handleSkipWebsite = () => {
    setHasWebsite(false);
    setWebsiteUrl('');
    setStep(2);
  };

  // Action: Final Save
  const handleFinalSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isStep2Valid || isSaving) return;

    setIsSaving(true);
    try {
      const payloadToSave: Partial<CompanyContext> = {
        website: hasWebsite ? websiteUrl.trim() : '',
        summary: hasWebsite ? aiSummary.trim() : manualDescription.trim(),
        additional_info: hasWebsite ? additionalInfo.trim() : '',
        value_proposition: hasWebsite ? aiSummary.trim() : manualDescription.trim(),
        raw_search_data: hasWebsite ? rawSearchData : { manual: true, submitted_at: new Date().toISOString() }
      };

      const savedData = await saveCompanyContext(payloadToSave);

      if (onSaveContext) {
        await onSaveContext(savedData);
      }

      setIsSaved(true);
      showToast('Contexte enregistré', 'ok');

      setTimeout(() => {
        onClose();
      }, 400);
    } catch (err: any) {
      console.error('[CompanyContextModal] Save error:', err);
      showToast(err.message || 'Erreur lors de la sauvegarde du contexte', 'err');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="company-context-modal-backdrop" onClick={onClose}>
      <div className="company-context-modal-box" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="cc-header">
          <div className="cc-header-left">
            <h2 className="cc-title">Contexte Entreprise</h2>
          </div>
          <button className="cc-close-btn" onClick={onClose} title="Fermer">
            <X size={15} />
          </button>
        </div>

        {/* Minimal Stepper */}
        <div className="cc-stepper-minimal">
          <div className={`cc-pill-step ${step === 1 ? 'active' : 'completed'}`} />
          <div className={`cc-pill-step ${step === 2 ? 'active' : ''}`} />
        </div>

        {/* Body */}
        <div className="cc-body">
          {step === 1 ? (
            /* STEP 1: Website Input */
            <div className="cc-pane">
              <div className="cc-hero">
                <h3 className="cc-hero-title">Avez-vous un site web ?</h3>
                <p className="cc-hero-desc">
                  Renseignez votre adresse pour générer automatiquement la synthèse de votre offre et de vos cibles.
                </p>
              </div>

              {!isResearching ? (
                <div className="cc-field">
                  <div className="cc-field-top">
                    <label>Site web</label>
                  </div>
                  <div className="cc-input-wrap">
                    <Globe size={15} className="cc-input-icon" />
                    <input
                      type="url"
                      value={websiteUrl}
                      onChange={e => setWebsiteUrl(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAnalyzeWebsite();
                        }
                      }}
                      placeholder="https://votre-entreprise.com"
                      autoFocus
                    />
                  </div>
                </div>
              ) : (
                /* Minimal Loader */
                <div className="cc-loader-minimal">
                  <div className="cc-spinner-ring" />
                  <p className="cc-loader-label">Analyse en cours...</p>
                </div>
              )}
            </div>
          ) : (
            /* STEP 2: Synthesis & Information */
            <div className="cc-pane">
              {hasWebsite ? (
                /* Path A: Website Analyzed */
                <>
                  <div className="cc-hero">
                    <h3 className="cc-hero-title">Synthèse de votre activité</h3>
                    <p className="cc-hero-desc">
                      Vérifiez ou complétez ces informations pour orienter vos agents.
                    </p>
                  </div>

                  <div className="cc-field">
                    <div className="cc-field-top">
                      <label>Présentation & Offre</label>
                    </div>
                    <textarea
                      rows={6}
                      value={aiSummary}
                      onChange={e => setAiSummary(e.target.value)}
                      placeholder="Offre, solutions clés, cibles et positionnement..."
                    />
                  </div>

                  <div className="cc-field">
                    <div className="cc-field-top">
                      <label>Informations complémentaires (optionnel)</label>
                    </div>
                    <textarea
                      rows={3}
                      value={additionalInfo}
                      onChange={e => setAdditionalInfo(e.target.value)}
                      placeholder="Cibles prioritaires, contraintes ou précisions..."
                    />
                  </div>
                </>
              ) : (
                /* Path B: Manual Entry (200 chars minimum) */
                <>
                  <div className="cc-hero">
                    <h3 className="cc-hero-title">Présentation de l'entreprise</h3>
                    <p className="cc-hero-desc">
                      Décrivez vos solutions, vos clients cibles et vos points forts.
                    </p>
                  </div>

                  <div className="cc-field">
                    <div className="cc-field-top">
                      <label>Description de l'activité</label>
                      <span className={`cc-counter ${manualCharCount >= 200 ? 'valid' : 'pending'}`}>
                        {manualCharCount} / 200 caractères {manualCharCount >= 200 ? '✓' : ''}
                      </span>
                    </div>
                    <textarea
                      rows={7}
                      value={manualDescription}
                      onChange={e => setManualDescription(e.target.value)}
                      placeholder="Décrivez votre activité, ce que vous vendez, vos clients types et vos points forts..."
                      autoFocus
                    />
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="cc-footer">
          {step === 1 ? (
            <>
              <button
                type="button"
                className="cc-btn cc-btn-ghost"
                onClick={handleSkipWebsite}
                disabled={isResearching}
              >
                Passer cette étape
              </button>
              <button
                type="button"
                className="cc-btn cc-btn-primary"
                onClick={handleAnalyzeWebsite}
                disabled={isResearching || !websiteUrl.trim()}
              >
                {isResearching ? (
                  'Analyse...'
                ) : (
                  <>
                    <span>Analyser le site</span>
                    <ArrowRight size={13} />
                  </>
                )}
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                className="cc-btn cc-btn-secondary"
                onClick={() => setStep(1)}
                disabled={isSaving}
              >
                <ArrowLeft size={13} />
                <span>Retour</span>
              </button>
              <button
                type="button"
                className="cc-btn cc-btn-primary"
                onClick={handleFinalSave}
                disabled={!isStep2Valid || isSaving}
              >
                {isSaving ? (
                  'Enregistrement...'
                ) : isSaved ? (
                  <>
                    <Check size={13} />
                    <span>Enregistré</span>
                  </>
                ) : (
                  'Confirmer et Enregistrer'
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default CompanyContextModal;
