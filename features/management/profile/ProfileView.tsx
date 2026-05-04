'use client';

import React from 'react';

export const ProfileView: React.FC = () => {
  return (
    <div id="view-profile" className="anim">
      <div className="page-head">
        <div>
          <div className="page-title">Mon Profil & Paramètres</div>
          <div className="page-sub">Gérez vos informations personnelles et préférences de compte</div>
        </div>
        <div className="page-actions">
          <button className="btn primary">Enregistrer les modifications</button>
        </div>
      </div>
      <div className="scroll">
         <div className="wcard" style={{ maxWidth: '600px', margin: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '30px', paddingBottom: '20px', borderBottom: '1px solid var(--border)' }}>
              <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'linear-gradient(135deg, #00D2FF 0%, #3A7BD5 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px', fontWeight: 'bold', color: 'white' }}>AB</div>
              <div>
                <div style={{ fontSize: '20px', fontWeight: 'bold', color: 'var(--white)' }}>Ahmed B.</div>
                <div style={{ color: 'var(--muted)' }}>Directeur Général · TraLIS</div>
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: '20px' }}>
              <label className="form-label">Nom complet</label>
              <input type="text" className="form-input" defaultValue="Ahmed B." />
            </div>

            <div className="form-group" style={{ marginBottom: '20px' }}>
              <label className="form-label">Email Professionnel</label>
              <input type="email" className="form-input" defaultValue="ahmed.b@tralis.com" />
            </div>

            <div className="form-group" style={{ marginBottom: '20px' }}>
              <label className="form-label">Entreprise (ERP Connecté)</label>
              <input type="text" className="form-input" defaultValue="TraLIS" disabled />
            </div>

            <div style={{ marginTop: '40px' }}>
               <div style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--red)', cursor: 'pointer' }}>Déconnexion du compte</div>
            </div>
         </div>
      </div>
    </div>
  );
};
