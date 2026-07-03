'use client';

import React from 'react';
import { Clock } from 'lucide-react';

export const ComingSoonPanel: React.FC<{ name: string }> = ({ name }) => {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      height: '100%', color: '#8FA3B8'
    }}>
      <div style={{
        width: '64px', height: '64px', borderRadius: '50%',
        background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.1)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: '24px'
      }}>
        <Clock size={32} opacity={0.5} />
      </div>
      <h2 style={{ fontSize: '24px', fontWeight: 700, color: '#fff', marginBottom: '12px' }}>{name}</h2>
      <p style={{ maxWidth: '400px', textAlign: 'center', lineHeight: 1.6 }}>
        Ce connecteur sera bientôt disponible dans une prochaine mise à jour de VMIND.
      </p>
    </div>
  );
};
