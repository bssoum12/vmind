'use client';

import React, { useState } from 'react';
import { X, Building2, Globe, Target, Shield, Check } from 'lucide-react';
import { CompanyContext } from '../types/supervisor.types';

interface CompanyContextModalProps {
  context: CompanyContext;
  onClose: () => void;
  onSaveContext: (updatedContext: CompanyContext) => void | Promise<void>;
}

export const CompanyContextModal: React.FC<CompanyContextModalProps> = ({
  context,
  onClose,
  onSaveContext
}) => {
  const [formData, setFormData] = useState<CompanyContext>({ ...context });
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onSaveContext(formData);
      setIsSaved(true);
      setTimeout(() => {
        onClose();
      }, 600);
    } catch {
      // error handled by caller toast
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="supervisor-modal-backdrop" onClick={onClose}>
      <div className="supervisor-modal-box" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">
            <Building2 size={18} />
            <span>Contexte Entreprise (Données Métier Optionnelles)</span>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <p style={{ margin: 0, fontSize: '12px', color: '#94A3B8', lineHeight: 1.5 }}>
              Ces informations permettent à l'Agent Superviseur de contextualiser ses diagnostics et d'émettre des recommandations commerciales ultra-pertinentes.
            </p>

            <div className="form-group">
              <label>Site Web Principal</label>
              <input
                type="url"
                value={formData.website}
                onChange={e => setFormData({ ...formData, website: e.target.value })}
                placeholder="https://votre-entreprise.com"
              />
            </div>

            <div className="form-group">
              <label>Proposition de Valeur & Offre Principale</label>
              <textarea
                value={formData.valueProposition}
                onChange={e => setFormData({ ...formData, valueProposition: e.target.value })}
                placeholder="Décrivez votre produit/service et le problème majeur que vous résolvez..."
              />
            </div>

            <div className="form-group">
              <label>Profil des Clients Idéaux (ICP & Signaux Métier)</label>
              <textarea
                value={formData.targetCustomers}
                onChange={e => setFormData({ ...formData, targetCustomers: e.target.value })}
                placeholder="Taille d'entreprise, titres de poste des décideurs, budget moyen..."
              />
            </div>

            <div className="form-group">
              <label>Principaux Concurrents & Différenciateurs</label>
              <input
                type="text"
                value={formData.competitors}
                onChange={e => setFormData({ ...formData, competitors: e.target.value })}
                placeholder="Ex: Concurrent A, Concurrent B..."
              />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose} disabled={isSaving}>
              Fermer
            </button>
            <button type="submit" className="btn-primary" disabled={isSaving}>
              {isSaving ? 'Enregistrement...' : isSaved ? 'Enregistré ✓' : 'Enregistrer le Contexte'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
