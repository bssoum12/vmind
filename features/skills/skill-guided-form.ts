import type { SkillCitations, SkillKind, SkillLimits } from '@/shared/api/skills-api';

export const EXPERT_MODE_STORAGE_KEY = 'vmind.skills.editor.expertMode';

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

export function slugifyTitle(title: string, maxLength?: number): string {
  return title
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .slice(0, maxLength)
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
export function parseBody(kind: SkillKind, title: string, body: string, starterBody?: string): SectionValues | null {
  const normalized = body.replace(/\r\n/g, '\n').trim();
  // The untouched starting text of the expert mode counts as empty
  if (!normalized || (starterBody && normalized === starterBody.trim())) return {};

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
export function loadGuidedBody(
  kind: SkillKind,
  title: string,
  body: string,
  starterBody?: string
): { values: SectionValues; custom: CustomBody | null } {
  const values = parseBody(kind, title, body, starterBody);
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
  referenceName: {
    what: "Un nom simple crée une documentation, reçue par l'assistant avec les instructions. Un nom en dossier/SKILL.md crée une sous-compétence que l'assistant trouve seule.",
    good: 'regles/relances.md · codes/statuts-factures.md · relances-clients/SKILL.md',
    avoid: 'Mes règles.md (espaces, accents) · notes (sans .md)',
  },
  referenceDoc: {
    what: 'Une documentation : du texte simple et des tableaux Markdown, un seul sujet par fichier. Citez-la dans les instructions.',
    good: '| Type de client | Délai de relance | puis une ligne par type',
    avoid: 'Répéter la méthode déjà écrite dans les instructions.',
  },
  referenceSubSkill: {
    what: "Une sous-compétence : l'en-tête name et description décide quand l'assistant l'ouvre ; elle ne reçoit que son propre texte.",
    good: 'description: Quand on demande les relances à envoyer. Pas pour la liste des factures.',
    avoid: "Laisser la description d'exemple ou citer un autre fichier de référence.",
  },
};

// A reference file named folder/SKILL.md is a sub-skill; any other .md file is a documentation file
const SUB_SKILL_FILE = /(?:^|\/)([^/]+)\/skill\.md$/i;
export const REFERENCE_NAME_PATTERN = /^(?:[a-z0-9_-]+\/)*(?:SKILL|[a-z0-9._-]+)\.md$/;
// The folder of a SKILL.md becomes a skill name: same rule as skill short names
const SUB_SKILL_FOLDER_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export type ReferenceKind = 'documentation' | 'subSkill';

/** What the name field keeps while typing: lower case, no accents, spaces as dashes, only allowed characters. */
export function sanitizeReferenceInput(raw: string): string {
  return raw
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9._/-]/g, '')
    .replace(/\/{2,}/g, '/')
    .replace(/^\//, '')
    .replace(/(^|\/)skill\.md$/, '$1SKILL.md');
}

/** The file name as it will be saved: ending with .md, SKILL.md keeping its standard upper case. */
export function normalizeReferenceName(raw: string): string {
  const clean = sanitizeReferenceInput(raw.trim());
  if (!clean) return '';
  const withExtension = clean.endsWith('.md') ? clean : `${clean}.md`;
  return withExtension.replace(/(^|\/)skill\.md$/i, '$1SKILL.md');
}

export function referenceKind(fileName: string): ReferenceKind {
  return SUB_SKILL_FILE.test(fileName) ? 'subSkill' : 'documentation';
}

/** Why a typed name cannot be used yet; null when it can. `incomplete` means the user is still typing a folder. */
export function referenceNameProblem(raw: string, maxSlugLength?: number): { incomplete: boolean; text: string } | null {
  const typed = raw.trim();
  if (!typed) return null;
  if (typed.endsWith('/') || /\/\.md$/.test(normalizeReferenceName(typed))) {
    return { incomplete: true, text: 'Ajoutez le nom du fichier après le dossier.' };
  }
  const fileName = normalizeReferenceName(typed);
  if (!REFERENCE_NAME_PATTERN.test(fileName) || fileName.includes('..')) {
    return { incomplete: false, text: 'Nom invalide : lettres minuscules, chiffres, tirets (-), tirets bas (_) et points, dossiers séparés par /.' };
  }
  if (fileName === 'SKILL.md') {
    return { incomplete: false, text: 'Un SKILL.md doit être rangé dans un dossier, par exemple relances-clients/SKILL.md.' };
  }
  const folder = fileName.match(SUB_SKILL_FILE)?.[1];
  if (folder && (!SUB_SKILL_FOLDER_PATTERN.test(folder) || (maxSlugLength !== undefined && folder.length > maxSlugLength))) {
    return {
      incomplete: false,
      text: `Le dossier d'un SKILL.md devient le nom de la sous-compétence : lettres minuscules, chiffres et tirets seulement${
        maxSlugLength ? `, ${maxSlugLength} caractères au maximum` : ''
      }.`,
    };
  }
  return null;
}

/** What a valid name will create, shown under the field. */
export function describeReferenceKind(fileName: string): string {
  return referenceKind(fileName) === 'subSkill'
    ? `Sous-compétence « ${fileName} » : une compétence à part, avec son propre en-tête (name, description). Elle ne reçoit que son propre texte.`
    : `Documentation « ${fileName} » : citez ce fichier dans les instructions et dites quand l'utiliser.`;
}

function subSkillHeaderName(content: string): string | undefined {
  const header = content.replace(/\r\n/g, '\n').match(/^---\n([\s\S]*?)\n---/)?.[1];
  const name = header?.match(/^name:\s*["']?(.+?)["']?\s*$/m)?.[1];
  return name?.trim() || undefined;
}

/**
 * The name a reference file is known by, unique within a skill whatever its folder:
 * a document's file name without .md, a sub-skill's header name or else its folder (same rule as the backend).
 */
export function referenceShortName(fileName: string, content: string): string {
  const folder = fileName.match(SUB_SKILL_FILE)?.[1];
  if (folder) return (subSkillHeaderName(content) || folder).toLowerCase();
  return (fileName.split('/').pop() || fileName).replace(/\.md$/i, '').toLowerCase();
}

/** The other file already using the same short name, if any. */
export function findShortNameConflict(
  fileName: string,
  content: string,
  references: Record<string, string>,
  ignoreKey?: string | null
): string | null {
  const shortName = referenceShortName(fileName, content);
  return (
    Object.keys(references).find(
      (key) => key !== ignoreKey && referenceShortName(key, references[key]) === shortName
    ) ?? null
  );
}

/** The content of a renamed file: a sub-skill whose header name followed its folder keeps following it. */
export function renamedReferenceContent(oldName: string, newName: string, content: string): string {
  const oldFolder = oldName.match(SUB_SKILL_FILE)?.[1];
  const newFolder = newName.match(SUB_SKILL_FILE)?.[1];
  if (!oldFolder || !newFolder || subSkillHeaderName(content)?.toLowerCase() !== oldFolder.toLowerCase()) return content;
  return content.replace(/^(---\r?\n[\s\S]*?^name:\s*["']?)[^"'\r\n]+/m, `$1${newFolder}`);
}

/** The places citing a file, as the backend found them (see SkillCitations), in words for the user. */
export function citationPlaces(fileName: string, citations: SkillCitations): string[] {
  const places = (citations[fileName] || []).map((c) => c.place);
  return places
    .filter((place, index) => places.indexOf(place) === index)
    .map((place) => (place === 'body' ? 'les instructions' : place));
}

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Replaces, in one place, the exact citations the backend found for a renamed file. Each keeps its form:
 * a bare file name stays bare, a path gets the new path (with the `references/` prefix kept when it had one).
 */
export function replaceCitations(text: string, place: string, oldName: string, newName: string, citations: SkillCitations): string {
  const newBase = newName.split('/').pop() || newName;
  let result = text;
  for (const { token } of (citations[oldName] || []).filter((c) => c.place === place)) {
    const replacement = !token.includes('/') ? newBase : /^references\//i.test(token) ? `references/${newName}` : newName;
    result = result.replace(new RegExp(`(?<![\\w./-])${escapeRegex(token)}(?![\\w-])`, 'g'), replacement);
  }
  return result;
}

/** The first content of a new reference file, from the backend's starting texts; a bare skeleton without them. */
export function referenceStarter(fileName: string, starters?: SkillLimits['starters'] | null): string {
  if (referenceKind(fileName) === 'subSkill') {
    const folder = fileName.match(SUB_SKILL_FILE)?.[1] ?? 'sous-competence';
    return starters ? starters.subSkill.split('{name}').join(folder) : `---\nname: ${folder}\ndescription: \n---\n`;
  }
  const baseName = fileName.split('/').pop()?.replace(/\.md$/, '') ?? fileName;
  return starters ? starters.document.split('{name}').join(baseName) : `# ${baseName}\n`;
}
