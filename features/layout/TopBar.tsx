"use client";

import React from 'react';
import { StatusDot } from '../../components/ui/StatusDot';
import { useClock } from '../../shared/hooks/useClock';

export const TopBar: React.FC = () => {
  const clock = useClock();

  return (
    <div className="topbar">
      <div className="topbar-brand">
        <div>
          <div className="brand-logo">VMIND</div>
          <div className="brand-tag">Intelligence Entreprise</div>
        </div>
      </div>
      <div className="topbar-center">
        <div className="topbar-status">
          <StatusDot />
          <span>ERP CONNECTÉ</span>
          <span style={{ color: 'var(--border2)', margin: '0 6px' }}>|</span>
          <span>TraLIS v3.2</span>
          <span style={{ color: 'var(--border2)', margin: '0 6px' }}>|</span>
          <span>{clock}</span>
        </div>
      </div>
      <div className="topbar-right">
        <div className="tb-btn" title="Notifications">🔔</div>
        <div className="tb-btn" title="Paramètres">⚙</div>
        <div className="user-badge">
          <div className="user-avatar">AB</div>
          <div>
            <div className="user-name">Ahmed Bensalem</div>
            <div className="user-role">Directeur Général</div>
          </div>
        </div>
      </div>
    </div>
  );
};
