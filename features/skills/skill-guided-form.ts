import type { SkillKind } from '@/shared/api/skills-api';

export const EXPERT_MODE_STORAGE_KEY = 'vmind.skills.editor.expertMode';
export const NEW_SKILL_BODY_TEMPLATE = '# Objectif\n\nDécrivez ici la procédure ou le format attendu...\n';

const DESCRIPTION_PATTERN = /^Quand on demande ([\s\S]+?)\.(?: Pas pour ([\s\S]+)\.)?$/;

const cleanSentencePart = (value: string) => value.trim().replace(/[.\s]+$/, '');

export function composeDescription(quand: string, pasPour: string): string {
  const trigger = cleanSentencePart(quand);
  const exclusion = cleanSentencePart(pasPour);
  if (!trigger) return '';
  return exclusion ? `Quand on demande ${trigger}. Pas pour ${exclusion}.` : `Quand on demande ${trigger}.`;
}

export function parseDescription(description: string): { quand: string; pasPour: string } | null {
  const match = description.trim().match(DESCRIPTION_PATTERN);
  return match ? { quand: match[1], pasPour: match[2] ?? '' } : null;
}

export function slugifyTitle(title: string): string {
  return title
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .slice(0, 64)
    .replace(/^-+|-+$/g, '');
}

export interface GuidedSection {
  key: string;
  title: string;
  required?: boolean;
}

// The sections used by the skills of the catalog
export const GUIDED_SECTIONS: Record<SkillKind, GuidedSection[]> = {
  style: [
    { key: 'objectif', title: 'Objectif', required: true },
    { key: 'structure', title: 'Structure de la réponse' },
    { key: 'regles', title: 'Règles' },
  ],
  method: [
    { key: 'demarche', title: 'Démarche', required: true },
    { key: 'definitions', title: 'Définitions' },
    { key: 'reglesVerite', title: 'Règles de vérité' },
    { key: 'restitution', title: 'Restitution' },
  ],
};

export type SectionValues = Record<string, string>;

/**
 * Writes the sections as Markdown. Only headings are added, and empty sections are left out.
 */
export function composeBody(kind: SkillKind, title: string, values: SectionValues): string {
  const sections = GUIDED_SECTIONS[kind]
    .map((section) => ({ title: section.title, text: (values[section.key] || '').trim() }))
    .filter((section) => section.text)
    .map((section) => `## ${section.title}\n${section.text}`);
  if (sections.length === 0) return '';
  const heading = title.trim() ? [`# ${title.trim()}`] : [];
  return [...heading, ...sections].join('\n\n');
}

/**
 * Reads Markdown back into the sections, or returns null if the sections can't show it exactly.
 * The body must come back identical, so no text gets rewritten or lost.
 */
export function parseBody(kind: SkillKind, title: string, body: string): SectionValues | null {
  const normalized = body.replace(/\r\n/g, '\n').trim();
  if (!normalized || normalized === NEW_SKILL_BODY_TEMPLATE.trim()) return {};

  const values: SectionValues = {};
  for (const part of normalized.split(/^## /m).slice(1)) {
    const lineEnd = part.indexOf('\n');
    const heading = (lineEnd === -1 ? part : part.slice(0, lineEnd)).trim();
    const section = GUIDED_SECTIONS[kind].find((s) => s.title === heading);
    if (!section || section.key in values) return null;
    values[section.key] = lineEnd === -1 ? '' : part.slice(lineEnd + 1).trim();
  }

  return normalized === composeBody(kind, title, values) ? values : null;
}

export interface CustomSection extends GuidedSection {
  prefix: string;
  text: string;
  suffix: string;
}

/**
 * A skill with its own headings. Each section keeps the exact text around it,
 * so anything that isn't edited is saved exactly as it was.
 */
export interface CustomBody {
  lead: string;
  sections: CustomSection[];
}

function splitSectionText(rest: string): { leading: string; text: string; trailing: string } {
  if (!rest.trim()) return { leading: rest, text: '', trailing: '' };
  const leading = rest.match(/^\s*/)?.[0] ?? '';
  const trimmedEnd = rest.trimEnd();
  return { leading, text: trimmedEnd.slice(leading.length), trailing: rest.slice(trimmedEnd.length) };
}

export function splitCustomBody(body: string): CustomBody {
  const parts = body.split(/^(?=## )/m);
  const preamble = parts[0].startsWith('## ') ? '' : parts.shift() ?? '';
  const sections: CustomSection[] = [];
  let lead = '';

  const heading = preamble.match(/^\s*# [^\n]*\n?/)?.[0] ?? '';
  const introduction = splitSectionText(preamble.slice(heading.length));
  if (introduction.text) {
    sections.push({
      key: 'section-0',
      title: parts.length > 0 ? 'Introduction' : 'Instructions',
      prefix: heading + introduction.leading,
      text: introduction.text,
      suffix: introduction.trailing,
    });
  } else {
    lead = preamble;
  }

  for (const part of parts) {
    const headingLine = part.match(/^## ([^\r\n]*)(\r?\n)?/);
    const prefixHead = headingLine?.[0] ?? '';
    const content = splitSectionText(part.slice(prefixHead.length));
    sections.push({
      key: `section-${sections.length}`,
      title: headingLine?.[1].trim() || 'Section',
      prefix: prefixHead + content.leading,
      text: content.text,
      suffix: content.trailing,
    });
  }

  return { lead, sections };
}

export function assembleCustomBody(custom: CustomBody): string {
  const parts = custom.sections.map((section, index) => {
    const headBreak = section.text && section.prefix && !section.prefix.endsWith('\n') ? '\n' : '';
    const isLast = index === custom.sections.length - 1;
    const tailBreak = section.text && !isLast && !section.suffix.includes('\n') ? '\n\n' : '';
    return `${section.prefix}${headBreak}${section.text}${section.suffix}${tailBreak}`;
  });
  return custom.lead + parts.join('');
}

/**
 * Reads a skill's body for the simple mode: the standard sections when it matches them exactly,
 * otherwise tabs built from the skill's own headings.
 */
export function loadGuidedBody(kind: SkillKind, title: string, body: string): { values: SectionValues; custom: CustomBody | null } {
  const values = parseBody(kind, title, body);
  return values ? { values, custom: null } : { values: {}, custom: splitCustomBody(body) };
}

/**
 * Moves the text to the matching sections when the skill type changes, so none of it is lost.
 */
export function convertSections(from: SkillKind, to: SkillKind, values: SectionValues): SectionValues {
  if (from === to) return values;
  const join = (...parts: Array<string | undefined>) => parts.filter((p) => p?.trim()).join('\n\n');
  return to === 'method'
    ? { demarche: values.objectif || '', restitution: values.structure || '', reglesVerite: values.regles || '' }
    : {
        objectif: values.demarche || '',
        structure: values.restitution || '',
        regles: join(values.definitions, values.reglesVerite),
      };
}

/**
 * A skill with reference files or sub-skills can only be edited in Mode expert.
 */
export function fitsGuidedForm(references?: Record<string, string> | null): boolean {
  return Object.keys(references || {}).length === 0;
}

/**
 * A description written another way stays in one box, so it is never rewritten into the sentences.
 */
export function usesFreeDescription(description: string): boolean {
  return Boolean(description.trim()) && parseDescription(description) === null;
}

export interface FieldHelp {
  what: string;
  good?: string;
  avoid?: string;
}

export const FIELD_HELP: Record<string, FieldHelp> = {
  quand: {
    what: "La phrase qui décide si l'assistant ouvre cette compétence.",
    good: 'les clients à risque de non-paiement',
    avoid: 'Ecrire "les clients"',
  },
  pasPour: {
    what: 'Évite que la compétence se lance au mauvais moment.',
    good: "la simple liste des factures d'un client",
    avoid: 'Ecrire "autre chose"',
  },
  description: {
    what: "La description que l'assistant lit pour décider d'ouvrir cette compétence.",
    good: "Indiquer quand l'utiliser et quand ne pas l'utiliser.",
    avoid: 'Une description vague, sans cas précis.',
  },
  sectionLibre: {
    what: 'Le texte de cette section, tel qu’il est enregistré.',
    good: 'Gardez les symboles comme ** ou ### : ils servent à la mise en forme.',
  },
  objectif: {
    what: 'Le résultat attendu quand cette compétence est utilisée.',
    good: 'Donner à la direction une synthèse courte, lisible en une minute.',
    avoid: 'Ecrire "Faire une bonne réponse."',
  },
  structure: {
    what: 'Les parties de la réponse, dans leur ordre.',
    good: "1. Le constat en une phrase. 2. Les trois chiffres clés. 3. L'action à mener.",
    avoid: 'Ecrire "Une réponse bien organisée."',
  },
  regles: {
    what: 'Ce que la réponse doit toujours faire ou ne jamais faire.',
    good: 'Toujours indiquer la période concernée. Pas plus de cinq lignes.',
    avoid: 'Ecrire "Être précis."',
  },
  demarche: {
    what: 'Les étapes à suivre pour répondre, dans leur ordre.',
    good: 'Repérer les factures échues, calculer le retard, puis classer du plus urgent au moins urgent.',
    avoid: 'Ecrire "Analyser correctement les données."',
  },
  definitions: {
    what: 'Le sens exact des termes métier utilisés par cette compétence.',
    good: 'Client à risque : au moins une facture impayée depuis plus de 60 jours.',
    avoid: 'Ecrire "Un client à risque est un client risqué."',
  },
  reglesVerite: {
    what: 'Ce qui garantit une réponse juste, et ce qui doit être signalé.',
    good: 'Signaler une période sans donnée au lieu de la remplacer par une autre.',
    avoid: 'Ecrire "Donner de bons chiffres."',
  },
  restitution: {
    what: 'La forme de la réponse finale : tableau, indicateurs, phrases.',
    good: 'Un tableau classé par retard, suivi du total en une phrase.',
    avoid: 'Ecrire "Une belle présentation."',
  },
  nom: {
    what: 'Le nom que vous verrez dans la liste de vos compétences.',
    good: 'Clients à risque',
    avoid: 'Compétence 1',
  },
  categorie: {
    what: 'Le domaine de la compétence, pour la retrouver plus facilement.',
  },
  type: {
    what: 'Style : la façon de présenter une réponse. Méthode : une règle métier à appliquer.',
  },
  portee: {
    what: 'Qui peut utiliser cette compétence : vous seul, votre organisation, un ERP ou toute la plateforme.',
  },
  organisation: {
    what: "L'organisation à laquelle cette compétence s'applique.",
  },
  erp: {
    what: 'Choisissez un ou plusieurs ERP si le texte cite leurs outils ou leurs colonnes.',
    good: 'Tous les ERP, si la règle est décrite par son sens',
    avoid: 'Tous les ERP, avec des noms de colonnes dans le texte',
  },
  commentaire: {
    what: 'Une phrase pour retrouver cette modification dans l’historique.',
    good: 'Délai de relance passé à 60 jours',
    avoid: 'Mise à jour',
  },
};
