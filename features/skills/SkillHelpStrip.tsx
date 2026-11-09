'use client';

import React from 'react';
import { FIELD_HELP } from './skill-guided-form';

interface SkillHelpStripProps {
  fieldKey: string | null;
}

/**
 * The single help area of the editor: it always speaks about the selected field.
 * Its height stays fixed so the fields never move when the text changes.
 */
export const SkillHelpStrip: React.FC<SkillHelpStripProps> = ({ fieldKey }) => {
  const help = fieldKey ? FIELD_HELP[fieldKey] : null;

  return (
    <div
      aria-live="polite"
      style={{
        flexShrink: 0,
        height: '78px',
        overflow: 'hidden',
        padding: '10px 24px',
        borderTop: '1px solid rgba(255,255,255,0.08)',
        background: 'rgba(0, 229, 200, 0.04)',
        fontSize: '12px',
        lineHeight: 1.5,
      }}
    >
      <div style={{ color: '#e2e8f0' }}>{help ? help.what : 'Cliquez sur un champ pour voir à quoi il sert.'}</div>
      {help?.good && <div style={{ color: '#00E5C8' }}>Bon exemple : {help.good}</div>}
      {help?.avoid && <div style={{ color: '#8FA3B8' }}>À éviter : {help.avoid}</div>}
    </div>
  );
};
