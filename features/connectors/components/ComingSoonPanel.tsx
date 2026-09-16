'use client';

import React from 'react';
import { Clock } from 'lucide-react';

export const ComingSoonPanel: React.FC<{ name: string; logo?: string; description?: string }> = ({ name, logo, description }) => {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      height: '100%', color: '#8FA3B8'
    }}>
      <div style={{
        width: '72px', height: '72px', borderRadius: '16px',
        background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: '24px', padding: '12px'
      }}>
        {logo ? (
          <img src={logo} alt={name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
        ) : (
          <Clock size={32} opacity={0.5} />
        )}
      </div>
      <h2 style={{ fontSize: '24px', fontWeight: 700, color: '#fff', marginBottom: '12px' }}>{name}</h2>
      <p style={{ maxWidth: '400px', textAlign: 'center', lineHeight: 1.6 }}>
        {description || 'Ce connecteur sera bientôt disponible dans une prochaine mise à jour de VMIND.'}
      </p>
    </div>
  );
};
