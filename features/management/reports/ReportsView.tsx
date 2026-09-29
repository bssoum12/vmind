'use client';

import React from 'react';

export const ReportsView: React.FC = () => {
  return (
    <div id="view-reports" className="anim">
      <div className="page-head">
        <div>
          <div className="page-title">Rapports & Analytics</div>
          <div className="page-sub">Suivez la performance et le ROI de vos employés virtuels</div>
        </div>
      </div>
      <div className="scroll">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px', padding: '20px' }}>
          <div className="wcard" style={{ background: 'var(--navy3)' }}>
            <div className="wcard-title">Taux de succès global</div>
            <div style={{ fontSize: '32px', fontWeight: 'bold', color: 'var(--cyan)', marginTop: '10px' }}>97.4%</div>
            <div style={{ color: 'var(--muted)', fontSize: '12px' }}>+2.1% par rapport au mois dernier</div>
          </div>
          <div className="wcard" style={{ background: 'var(--navy3)' }}>
            <div className="wcard-title">Temps humain économisé</div>
            <div style={{ fontSize: '32px', fontWeight: 'bold', color: 'var(--green)', marginTop: '10px' }}>142 Heures</div>
            <div style={{ color: 'var(--muted)', fontSize: '12px' }}>Basé sur 1,240 exécutions d&apos;agents</div>
          </div>
          <div className="wcard" style={{ background: 'var(--navy3)' }}>
            <div className="wcard-title">ROI Estimé</div>
            <div style={{ fontSize: '32px', fontWeight: 'bold', color: 'var(--amber)', marginTop: '10px' }}>4,200 TND</div>
            <div style={{ color: 'var(--muted)', fontSize: '12px' }}>Économies sur les coûts opérationnels</div>
          </div>
        </div>
        <div className="info-box" style={{ margin: '20px' }}>
          📊 Les graphiques détaillés de performance seront disponibles après la configuration de votre pool de données BI.
        </div>
      </div>
    </div>
  );
};
