'use client';

import React, { useEffect, useRef } from 'react';
import { BookOpen, X } from 'lucide-react';
import type { SkillIssue } from '@/shared/api/skills-api';

export type GuideSectionId = 'quand' | 'pasPour' | 'contenu' | 'erp' | 'nom' | 'portee' | 'expert';

interface GuideSection {
  id: GuideSectionId;
  title: string;
  paragraphs: string[];
  example?: string;
}

const GUIDE_SECTIONS: GuideSection[] = [
  {
    id: 'quand',
    title: '« Quand on demande »',
    paragraphs: [
      "C'est la phrase qui permet à l'assistant de savoir quand utiliser la compétence. Écrivez-la avec les mots qu'un utilisateur emploierait vraiment dans sa question.",
      'Citez deux ou trois façons de demander la même chose, sans aller au-delà de quelques lignes.',
    ],
    example: "Quand on demande le chiffre d'affaires du mois, les ventes par client ou l'évolution des ventes.",
  },
  {
    id: 'pasPour',
    title: '« Pas pour »',
    paragraphs: [
      "Indiquez les demandes qui ressemblent à celle-ci mais qui relèvent d'une autre compétence. L'assistant évite ainsi de choisir la mauvaise.",
    ],
    example: "Pas pour les factures impayées ni les relances clients.",
  },
  {
    id: 'contenu',
    title: "« Ce que l'assistant doit faire »",
    paragraphs: [
      "Pour une compétence de type Méthode, décrivez la Démarche étape par étape. Ajoutez si besoin les Définitions des termes métier, les Règles de vérité (ce qui doit toujours être vrai dans la réponse) et la Restitution (la forme de la réponse).",
      "Pour une compétence de type Style, donnez l'Objectif, puis la Structure de la réponse et les Règles à respecter.",
      "Restez précis et concret : quelques phrases claires valent mieux qu'un long texte. Un texte trop court laisse l'assistant deviner.",
    ],
  },
  {
    id: 'erp',
    title: "Choisir l'ERP",
    paragraphs: [
      "Une compétence liée à un ERP peut citer les noms exacts de ses outils et de ses colonnes : elle ne servira qu'aux clients connectés à cet ERP, et reste cachée pour les autres.",
      "Une compétence pour tous les ERP doit décrire des idées (« le montant validé », « la date de facture ») et non des noms techniques, car chaque ERP les nomme différemment.",
      "Si vous citez un nom d'outil ou de colonne, vérifiez qu'il est bien écrit et choisissez l'ERP concerné.",
    ],
  },
  {
    id: 'nom',
    title: 'Noms courts et noms proches',
    paragraphs: [
      'Donnez un nom court qui dit ce que fait la compétence, en quelques mots.',
      "Évitez un nom presque identique à celui d'une compétence existante : l'assistant et les utilisateurs risquent de les confondre. Si deux compétences se ressemblent, regroupez-les ou précisez la différence dans le nom.",
    ],
    example: 'Analyse des ventes mensuelles',
  },
  {
    id: 'portee',
    title: 'Qui voit la compétence',
    paragraphs: [
      'La portée choisit qui peut utiliser la compétence : vous seul (Personnel), votre organisation, les clients d’un ERP précis (Spécifique ERP) ou tous les utilisateurs (Plateforme Globale).',
      "Commencez par Personnel pour tester, puis élargissez quand le résultat vous convient.",
    ],
  },
  {
    id: 'expert',
    title: 'Quand passer en Mode expert',
    paragraphs: [
      "Le mode simple suffit pour la plupart des compétences. Passez en Mode expert si vous devez joindre des fichiers de référence (par exemple une liste de codes ou un tableau de règles), ou écrire le texte complet vous-même.",
      'Le Mode expert reste activé pour votre compte tant que vous ne le désactivez pas.',
    ],
  },
];

// Which guide section speaks about each field of the form; codes listed below take precedence
const FIELD_SECTIONS: Record<string, GuideSectionId> = {
  description: 'quand',
  exclusion: 'pasPour',
  body_md: 'contenu',
  erp_types: 'erp',
  mapped_tools: 'erp',
  title: 'nom',
  slug: 'nom',
  scope: 'portee',
  tenant_key: 'portee',
  category: 'portee',
  kind: 'portee',
  references: 'expert',
};

const CODE_SECTIONS: Record<string, GuideSectionId> = {
  no_exclusion: 'pasPour',
  short_body: 'contenu',
  tool_name_no_erp: 'erp',
  technical_name_no_erp: 'erp',
  tool_typo: 'erp',
  similar_name: 'nom',
};

/** The guide section to open for an issue; null opens the guide at the top. */
export const guideSectionFor = (issue: SkillIssue): GuideSectionId | null =>
  CODE_SECTIONS[issue.code] ?? FIELD_SECTIONS[issue.field] ?? null;

interface SkillGuidePanelProps {
  section: GuideSectionId | null;
  onClose: () => void;
}

/** The short best practices guide, opened at a given section. */
export const SkillGuidePanel: React.FC<SkillGuidePanelProps> = ({ section, onClose }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const target = section ? container.querySelector<HTMLElement>(`[data-guide="${section}"]`) : null;
    container.scrollTop = target ? target.offsetTop - 8 : 0;
  }, [section]);

  return (
    <div
      ref={containerRef}
      role="dialog"
      aria-label="Guide des bonnes pratiques"
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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 700, color: '#fff' }}>
          <BookOpen size={14} color="#00E5C8" />
          Guide des bonnes pratiques
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Fermer le guide"
          style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '2px' }}
        >
          <X size={16} />
        </button>
      </div>

      {GUIDE_SECTIONS.map((s) => (
        <section
          key={s.id}
          data-guide={s.id}
          style={{
            padding: '8px 0 8px 10px',
            borderLeft: `3px solid ${s.id === section ? '#00E5C8' : 'transparent'}`,
            fontSize: '12.5px',
            lineHeight: 1.55,
          }}
        >
          <div style={{ color: '#00E5C8', fontWeight: 700, marginBottom: '2px' }}>{s.title}</div>
          {s.paragraphs.map((p) => (
            <p key={p} style={{ margin: '0 0 4px', color: '#cbd5e1' }}>
              {p}
            </p>
          ))}
          {s.example && (
            <div style={{ color: '#e2e8f0' }}>
              <span style={{ color: '#8FA3B8' }}>Exemple : </span>
              {s.example}
            </div>
          )}
        </section>
      ))}
    </div>
  );
};
