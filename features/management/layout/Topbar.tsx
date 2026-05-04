'use client';

import React from 'react';

interface TopbarProps {
  onNavigate: (view: string) => void;
  currentView: string;
}

export const Topbar: React.FC<TopbarProps> = ({ onNavigate, currentView }) => {
  return (
    <div className="topbar">
      <div className="tb-brand">
        <div>
          <div className="logo">VMIND</div>
          <div className="logo-sub">Employés Virtuels IA</div>
        </div>
      </div>
      <div className="tb-nav">
        <div 
          className={`tb-navitem ${currentView === 'market' ? 'active' : ''}`} 
          onClick={() => onNavigate('market')}
        >
          Marketplace
        </div>
        <div 
          className={`tb-navitem ${currentView === 'agents' ? 'active' : ''}`} 
          onClick={() => onNavigate('agents')}
        >
          Mes Agents
        </div>
        <div 
          className={`tb-navitem ${currentView === 'reports' ? 'active' : ''}`} 
          onClick={() => onNavigate('reports')}
        >
          Rapports
        </div>
        <div 
          className={`tb-navitem ${currentView === 'integrations' ? 'active' : ''}`} 
          onClick={() => onNavigate('integrations')}
        >
          Intégrations
        </div>
      </div>
      <div className="tb-right">
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }} onClick={() => onNavigate('agents')}>
          <span style={{ fontSize: '11px', color: 'var(--muted)' }}>Actifs</span>
          <span className="badge-count">3</span>
        </div>
        <div 
          className={`user-chip ${currentView === 'profile' ? 'active' : ''}`} 
          style={{ cursor: 'pointer' }}
          onClick={() => onNavigate('profile')}
        >
          <div className="user-av">AB</div>
          <div>
            <div className="user-nm">Ahmed B.</div>
            <div className="user-rl">DG · TraLIS</div>
          </div>
        </div>
      </div>
    </div>
  );
};
