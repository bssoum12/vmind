'use client';

import React from 'react';
import type { SkillIssue } from '@/shared/api/skills-api';
import { FIELD_HELP } from './skill-guided-form';

interface SkillHelpStripProps {
  fieldKey: string | null;
  // Problems found on the selected field, most serious first
  issues?: SkillIssue[];
}

const ISSUE_COLOR: Record<SkillIssue['level'], string> = {
  blocking: '#f87171',
  warning: '#fbbf24',
  info: '#8FA3B8',
};

/**
 * The single help area of the editor: it always speaks about the selected field.
 * When that field has a problem, the problem and how to fix it replace the examples.
 * Its height stays fixed so the fields never move when the text changes.
 */
export const SkillHelpStrip: React.FC<SkillHelpStripProps> = ({ fieldKey, issues = [] }) => {
  const help = fieldKey ? FIELD_HELP[fieldKey] : null;
  const issue = [...issues].sort(
    (a, b) => ['blocking', 'warning', 'info'].indexOf(a.level) - ['blocking', 'warning', 'info'].indexOf(b.level)
  )[0];

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
      {issue ? (
        <>
          <div style={{ color: ISSUE_COLOR[issue.level] }}>
            {issue.title}
            {issues.length > 1 ? ` (+${issues.length - 1})` : ''}
          </div>
          <div style={{ color: '#cbd5e1' }}>Comment corriger : {issue.fix}</div>
        </>
      ) : (
        <>
          {help?.good && <div style={{ color: '#00E5C8' }}>Bon exemple : {help.good}</div>}
          {help?.avoid && <div style={{ color: '#8FA3B8' }}>À éviter : {help.avoid}</div>}
        </>
      )}
    </div>
  );
};
