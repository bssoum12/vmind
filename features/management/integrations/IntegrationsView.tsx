'use client';

import React from 'react';

export const IntegrationsView: React.FC = () => {
  const integrations = [
    { name: 'TraLIS', category: 'ERP', status: 'Connected', icon: '/logo-tralis-mcp.png' },
    { name: 'Sage 100', category: 'ERP', status: 'Available', icon: '🌿' },
    { name: 'Odoo', category: 'ERP', status: 'Available', icon: '/odoo-logo.png' },
    { name: 'WhatsApp Business', category: 'Messaging', status: 'Connected', icon: '💬' },
    { name: 'Email (SMTP/IMAP)', category: 'Messaging', status: 'Connected', icon: '📧' },
    { name: 'Slack', category: 'Collaboration', status: 'Available', icon: '🎬' },
  ];

  return (
    <div id="view-integrations" className="anim">
      <div className="page-head">
        <div>
          <div className="page-title">Centre d&apos;Intégrations</div>
          <div className="page-sub">Connectez VMIND à vos outils et données existantes</div>
        </div>
      </div>
      <div className="scroll">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px', padding: '20px' }}>
          {integrations.map((int, i) => (
            <div key={i} className="wcard" style={{ display: 'flex', alignItems: 'center', gap: '16px', background: 'var(--navy3)' }}>
              <div style={{ fontSize: '24px', width: '48px', height: '48px', background: 'var(--navy4)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: int.icon.startsWith('/') ? '8px' : '0' }}>
                {int.icon.startsWith('/') ? (
                  <img src={int.icon} alt={int.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                ) : (
                  int.icon
                )}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: '600', color: 'var(--white)' }}>{int.name}</div>
                <div style={{ fontSize: '11px', color: 'var(--muted)' }}>{int.category}</div>
              </div>
              <div style={{ 
                fontSize: '10px', 
                padding: '4px 8px', 
                borderRadius: '4px', 
                background: int.status === 'Connected' ? 'rgba(0, 230, 118, 0.1)' : 'rgba(255, 255, 255, 0.05)',
                color: int.status === 'Connected' ? 'var(--green)' : 'var(--muted)',
                fontWeight: '600'
              }}>
                {int.status.toUpperCase()}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
