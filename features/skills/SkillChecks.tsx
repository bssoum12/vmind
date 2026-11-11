'use client';

import React from 'react';
import { AlertCircle, AlertTriangle, CheckCircle2, Info, Loader2, X } from 'lucide-react';
import type { SkillIssue } from '@/shared/api/skills-api';

export const issueKey = (issue: SkillIssue) =>
  `${issue.code}:${issue.term || ''}${issue.path && issue.path !== issue.term ? `@${issue.path}` : ''}`;

// Which parts of the form each issue concerns: matched against the `data-check` attribute of the fields
export const issueTarget = (issue: SkillIssue) => (issue.code === 'no_exclusion' ? 'exclusion' : issue.field);

// Which issue targets each help key of the strip speaks about
export const HELP_KEY_TARGETS: Record<string, string[]> = {
  quand: ['description'],
  pasPour: ['exclusion'],
  description: ['description', 'exclusion'],
  nom: ['title', 'slug'],
  erp: ['erp_types'],
  categorie: ['category'],
  type: ['kind'],
  portee: ['scope'],
  organisation: ['tenant_key'],
  referenceName: ['references'],
  referenceDoc: ['references'],
  referenceSubSkill: ['references'],
};

export const issuesForHelpKey = (issues: SkillIssue[], helpKey: string | null, sectionKeys: string[]): SkillIssue[] => {
  if (!helpKey) return [];
  const targets = HELP_KEY_TARGETS[helpKey] ?? (sectionKeys.includes(helpKey) || helpKey === 'sectionLibre' ? ['body_md'] : []);
  return issues.filter((i) => targets.includes(issueTarget(i)));
};

const LEVEL_STYLE: Record<SkillIssue['level'], { color: string; icon: React.ReactNode; label: string }> = {
  blocking: { color: '#f87171', icon: <AlertCircle size={14} />, label: 'Bloquant' },
  warning: { color: '#fbbf24', icon: <AlertTriangle size={14} />, label: 'Avertissement' },
  info: { color: '#8FA3B8', icon: <Info size={14} />, label: 'Information' },
};

interface SkillChecksSummaryProps {
  issues: SkillIssue[];
  checking: boolean;
  unavailable: boolean;
  onOpen: () => void;
}

/** The one-line result shown in the footer; clicking it opens the full list. */
export const SkillChecksSummary: React.FC<SkillChecksSummaryProps> = ({ issues, checking, unavailable, onOpen }) => {
  const blocking = issues.filter((i) => i.level === 'blocking').length;
  const warnings = issues.filter((i) => i.level === 'warning').length;
  const infos = issues.filter((i) => i.level === 'info').length;

  let color = '#00E5C8';
  let icon: React.ReactNode = <CheckCircle2 size={14} />;
  let text = 'Prêt à enregistrer';
  if (checking) {
    color = '#8FA3B8';
    icon = <Loader2 size={14} className="skill-check-spin" />;
    text = 'Vérification…';
  } else if (unavailable) {
    color = '#8FA3B8';
    icon = <Info size={14} />;
    text = 'Vérification indisponible';
  } else if (blocking > 0 || warnings > 0) {
    color = blocking > 0 ? '#f87171' : '#fbbf24';
    icon = blocking > 0 ? <AlertCircle size={14} /> : <AlertTriangle size={14} />;
    const parts = [];
    if (blocking > 0) parts.push(`${blocking} point${blocking > 1 ? 's' : ''} bloquant${blocking > 1 ? 's' : ''}`);
    if (warnings > 0) parts.push(`${warnings} avertissement${warnings > 1 ? 's' : ''}`);
    text = parts.join(' · ');
  } else if (infos > 0) {
    icon = <Info size={14} />;
  }

  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`${text}. Voir le détail des vérifications`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '6px 10px',
        borderRadius: '8px',
        border: `1px solid ${color}55`,
        background: `${color}14`,
        color,
        fontSize: '12px',
        fontWeight: 600,
        cursor: 'pointer',
      }}
    >
      {icon}
      {text}
    </button>
  );
};

interface SkillChecksPanelProps {
  issues: SkillIssue[];
  dismissedCount: number;
  unavailable: boolean;
  onDismiss: (issue: SkillIssue) => void;
  onRestoreDismissed: () => void;
  onLearnMore: (issue: SkillIssue) => void;
  onOpenIssue: (issue: SkillIssue) => void;
  onClose: () => void;
}

/** The full list of problems, each with why it matters and how to fix it. Clicking a problem opens its place. */
export const SkillChecksPanel: React.FC<SkillChecksPanelProps> = ({
  issues,
  dismissedCount,
  unavailable,
  onDismiss,
  onRestoreDismissed,
  onLearnMore,
  onOpenIssue,
  onClose,
}) => {
  const ordered = [...issues].sort(
    (a, b) => ['blocking', 'warning', 'info'].indexOf(a.level) - ['blocking', 'warning', 'info'].indexOf(b.level)
  );

  return (
    <div
      role="dialog"
      aria-label="Vérifications de la compétence"
      style={{
        position: 'absolute',
        left: '24px',
        right: '24px',
        bottom: '76px',
        maxHeight: '60%',
        overflowY: 'auto',
        zIndex: 5,
        background: '#0b1324',
        border: '1px solid rgba(0, 229, 200, 0.3)',
        borderRadius: '14px',
        boxShadow: '0 20px 50px rgba(0,0,0,0.6)',
        padding: '14px 16px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
        <div style={{ fontSize: '13px', fontWeight: 700, color: '#fff' }}>Vérifications</div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Fermer les vérifications"
          style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '2px' }}
        >
          <X size={16} />
        </button>
      </div>

      {unavailable && (
        <div style={{ fontSize: '12px', color: '#8FA3B8', marginBottom: '10px' }}>
          La vérification n&apos;a pas pu être faite pour le moment. Les règles seront tout de même appliquées à l&apos;enregistrement.
        </div>
      )}

      {ordered.length === 0 && !unavailable && (
        <div style={{ fontSize: '12.5px', color: '#00E5C8' }}>Aucun problème détecté : la compétence est prête à être enregistrée.</div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {ordered.map((issue) => {
          const style = LEVEL_STYLE[issue.level];
          return (
            <div
              key={issueKey(issue)}
              style={{
                borderLeft: `3px solid ${style.color}`,
                borderRadius: 0,
                padding: '6px 0 6px 10px',
                fontSize: '12.5px',
                lineHeight: 1.5,
              }}
            >
              <button
                type="button"
                onClick={() => onOpenIssue(issue)}
                title="Aller à l'endroit concerné"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  color: style.color,
                  fontWeight: 700,
                  fontSize: 'inherit',
                  background: 'transparent',
                  border: 'none',
                  padding: 0,
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                {style.icon}
                <span>{issue.title}</span>
              </button>
              <div style={{ color: '#cbd5e1' }}>
                <span style={{ color: '#8FA3B8' }}>Pourquoi : </span>
                {issue.why}
              </div>
              <div style={{ color: '#e2e8f0' }}>
                <span style={{ color: '#8FA3B8' }}>Comment corriger : </span>
                {issue.fix}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px' }}>
                <button
                  type="button"
                  onClick={() => onLearnMore(issue)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#00E5C8',
                    fontSize: '11.5px',
                    textDecoration: 'underline',
                    cursor: 'pointer',
                    padding: 0,
                  }}
                >
                  En savoir plus
                </button>
                {issue.level === 'warning' && (
                  <button
                    type="button"
                    onClick={() => onDismiss(issue)}
                    style={{
                      padding: '3px 9px',
                      borderRadius: '6px',
                      border: '1px solid rgba(255,255,255,0.15)',
                      background: 'transparent',
                      color: '#94a3b8',
                      fontSize: '11.5px',
                      cursor: 'pointer',
                    }}
                  >
                    C&apos;est voulu
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {dismissedCount > 0 && (
        <button
          type="button"
          onClick={onRestoreDismissed}
          style={{
            marginTop: '12px',
            background: 'transparent',
            border: 'none',
            color: '#8FA3B8',
            fontSize: '11.5px',
            textDecoration: 'underline',
            cursor: 'pointer',
            padding: 0,
          }}
        >
          Réafficher {dismissedCount} avertissement{dismissedCount > 1 ? 's' : ''} masqué{dismissedCount > 1 ? 's' : ''}
        </button>
      )}
    </div>
  );
};
