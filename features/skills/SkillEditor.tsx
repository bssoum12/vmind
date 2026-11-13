'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Save,
  Plus,
  Trash2,
  History,
  FileText,
  Pencil,
  RotateCcw,
  AlertCircle,
  ChevronDown,
  Check,
  BookOpen,
} from 'lucide-react';
import {
  SkillCategory,
  SkillKind,
  SkillScope,
  SkillDetail,
  SkillVersionItem,
  SkillIssue,
  SkillCitations,
  SkillSaveError,
  checkSkill,
  createSkill,
  updateSkill,
  fetchSkillConnection,
  fetchSkillVersions,
  rollbackSkillVersion,
  fetchAvailableTenantsForAdmin,
} from '@/shared/api/skills-api';
import { useToast } from '@/shared/contexts/ToastContext';
import { SkillErpSelector } from './SkillErpSelector';
import { SkillGuidedFields } from './SkillGuidedFields';
import { SkillHelpStrip } from './SkillHelpStrip';
import { SkillChecksPanel, SkillChecksSummary, issueKey, issueTarget, issuesForHelpKey } from './SkillChecks';
import { SkillGuidePanel, guideSectionFor, type GuideSectionId } from './SkillGuide';
import { useSkillLimits } from './useSkillLimits';
import {
  EXPERT_MODE_STORAGE_KEY,
  GUIDED_SECTIONS,
  type CustomBody,
  type SectionValues,
  assembleCustomBody,
  composeBody,
  composeDescription,
  convertSections,
  fitsGuidedForm,
  loadGuidedBody,
  parseDescription,
  slugifyTitle,
  usesFreeDescription,
  describeReferenceKind,
  citationPlaces,
  findShortNameConflict,
  normalizeReferenceName,
  referenceKind,
  referenceNameProblem,
  referenceShortName,
  referenceStarter,
  renamedReferenceContent,
  replaceCitations,
  sanitizeReferenceInput,
} from './skill-guided-form';
import './skills-premium.css';

interface SkillEditorProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => Promise<void> | void;
  initialSkill?: SkillDetail | null;
  mode: 'create' | 'edit' | 'customize';
  isAdmin: boolean;
  accountName: string;
  activeConnectionId?: number | null;
  activeErpType?: string | null;
  activeClientId?: string | null;
}

const CATEGORIES: Array<{ value: SkillCategory; label: string }> = [
  { value: 'finance', label: 'Finance & Comptabilité' },
  { value: 'commercial', label: 'Commercial & Ventes' },
  { value: 'operations', label: 'Opérations & Exploitation' },
  { value: 'achats', label: 'Achats & Fournisseurs' },
  { value: 'logistique', label: 'Logistique & Transport' },
  { value: 'productivite', label: 'Productivité & Style' },
  { value: 'autre', label: 'Autre' },
];

// Counter suffix "/max" once the backend limits are loaded
const outOf = (max?: number) => (max ? `/${max.toLocaleString('fr-FR')}` : '');
const isOver = (value: number, max?: number) => max !== undefined && value > max;
// Dismissals of a skill not created yet: kept while the editor is open, never stored (no '|' in a slug)
const NEW_SKILL_DISMISS_SCOPE = '(nouveau)';
// A counter turns orange from 90 % of its limit and red past it
const COUNTER_NEAR = '#fbbf24';
const COUNTER_OVER = '#f87171';
const counterColor = (counts: Array<[number, number | undefined]>, base: string) => {
  if (counts.some(([value, max]) => isOver(value, max))) return COUNTER_OVER;
  if (counts.some(([value, max]) => max !== undefined && value >= max * 0.9)) return COUNTER_NEAR;
  return base;
};

function readStoredExpertMode(accountName: string): boolean {
  try {
    return window.localStorage.getItem(`${EXPERT_MODE_STORAGE_KEY}.${accountName}`) === 'true';
  } catch {
    return false;
  }
}

function storeExpertMode(accountName: string, value: boolean) {
  try {
    window.localStorage.setItem(`${EXPERT_MODE_STORAGE_KEY}.${accountName}`, String(value));
  } catch {
    // The choice simply isn't remembered
  }
}

export const SkillEditor: React.FC<SkillEditorProps> = ({
  isOpen,
  onClose,
  onSaved,
  initialSkill,
  mode,
  isAdmin,
  accountName,
  activeConnectionId,
  activeErpType,
  activeClientId,
}) => {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'general' | 'references' | 'history'>('general');

  const [slug, setSlug] = useState('');
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<SkillCategory>('productivite');
  const [kind, setKind] = useState<SkillKind>('style');
  const [scope, setScope] = useState<SkillScope>('USER');
  const [erpTypes, setErpTypes] = useState<string[]>([]);
  const [tenantKey, setTenantKey] = useState<string>(activeClientId || 'DEMO');
  const [description, setDescription] = useState('');
  const [bodyMd, setBodyMd] = useState('');
  const [expertMode, setExpertMode] = useState(false);
  const [quand, setQuand] = useState('');
  const [pasPour, setPasPour] = useState('');
  const [sectionValues, setSectionValues] = useState<SectionValues>({});
  const [customBody, setCustomBody] = useState<CustomBody | null>(null);
  const [freeDescription, setFreeDescription] = useState(false);
  const [activeSection, setActiveSection] = useState(GUIDED_SECTIONS.style[0].key);
  const [helpField, setHelpField] = useState<string | null>(null);
  const [referencesJson, setReferencesJson] = useState<Record<string, string>>({});
  const limits = useSkillLimits();
  const [newRefName, setNewRefName] = useState('');
  const [selectedRefKey, setSelectedRefKey] = useState<string | null>(null);
  // The name field drives the References tab: an existing name opens that file, and each button is only
  // enabled when its action is safe (no duplicate name, no hidden change to another file)
  const refFileName = normalizeReferenceName(newRefName);
  const refProblem = referenceNameProblem(newRefName, limits?.maxSlugLength);
  // Only the full name, .md included, opens a file: a name still being typed never switches the open file
  const existingRefKey =
    refFileName && !refProblem && newRefName.trim().toLowerCase().endsWith('.md')
      ? Object.keys(referencesJson).find((key) => key.toLowerCase() === refFileName.toLowerCase()) ?? null
      : null;
  const refLimitReached = Boolean(limits && Object.keys(referencesJson).length >= limits.maxReferenceFiles);
  const refNameUsable = Boolean(refFileName) && !refProblem && !existingRefKey;
  const addConflict = refNameUsable ? findShortNameConflict(refFileName, referenceStarter(refFileName), referencesJson) : null;
  const renameConflict =
    refNameUsable && selectedRefKey
      ? findShortNameConflict(
          refFileName,
          renamedReferenceContent(selectedRefKey, refFileName, referencesJson[selectedRefKey] ?? ''),
          referencesJson,
          selectedRefKey
        )
      : null;
  const canAddReference = refNameUsable && !addConflict && !refLimitReached;
  const canRenameReference = refNameUsable && Boolean(selectedRefKey) && !renameConflict;
  const showRenameButton = Boolean(selectedRefKey) && Boolean(newRefName.trim()) && !existingRefKey;
  const refHints = describeNewReference();

  // The lines under the name field: what the name will create, and why a button is disabled
  function describeNewReference(): Array<{ tone: 'ok' | 'error' | 'muted'; text: string }> {
    const limitHint = {
      tone: 'error' as const,
      text: `Limite de ${limits?.maxReferenceFiles} fichiers atteinte : supprimez un fichier pour en ajouter un.`,
    };
    if (!newRefName.trim()) return refLimitReached ? [limitHint] : [];
    if (refProblem) return [{ tone: refProblem.incomplete ? 'muted' : 'error', text: refProblem.text }];
    if (existingRefKey) {
      return [{
        tone: 'ok',
        text: `« ${existingRefKey} » existe déjà : il est ouvert. Modifiez le nom puis cliquez sur Renommer, ou tapez un autre nom pour ajouter un fichier.`,
      }];
    }
    const hints: Array<{ tone: 'ok' | 'error' | 'muted'; text: string }> = [
      { tone: 'ok', text: describeReferenceKind(refFileName) },
    ];
    const shortName = referenceShortName(refFileName, referenceStarter(refFileName));
    if (addConflict && (!selectedRefKey || renameConflict === addConflict)) {
      hints.push({ tone: 'error', text: `Le nom « ${shortName} » est déjà utilisé par ${addConflict}.` });
      return hints;
    }
    if (addConflict) {
      hints.push({ tone: 'error', text: `Ajouter : le nom « ${shortName} » est déjà utilisé par ${addConflict}.` });
    } else if (refLimitReached) {
      hints.push(limitHint);
    }
    if (selectedRefKey && renameConflict) {
      hints.push({ tone: 'error', text: `Renommer : le nom « ${shortName} » est déjà utilisé par ${renameConflict}.` });
    } else if (selectedRefKey) {
      const before = referenceKind(selectedRefKey);
      const after = referenceKind(refFileName);
      const label = { documentation: 'documentation', subSkill: 'sous-compétence' };
      hints.push({
        tone: 'ok',
        text: `Renommer changera le nom de « ${selectedRefKey} » (fichier ouvert)${
          before !== after ? ` et le fera passer de ${label[before]} à ${label[after]}` : ''
        }.`,
      });
    }
    return hints;
  }

  // Typing the name of an existing file opens it, so the field and the open file never disagree
  useEffect(() => {
    if (existingRefKey && existingRefKey !== selectedRefKey) setSelectedRefKey(existingRefKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existingRefKey]);

  // The help strip speaks about the References tab as soon as it opens, and forgets it when leaving
  useEffect(() => {
    setHelpField(activeTab === 'references' ? 'referenceName' : null);
  }, [activeTab]);
  const [versionComment, setVersionComment] = useState('');
  const [citations, setCitations] = useState<SkillCitations>({});

  const [tenants, setTenants] = useState<Array<{ client_id: string; display_name?: string }>>([]);
  const [versions, setVersions] = useState<SkillVersionItem[]>([]);
  const [loadingVersions, setLoadingVersions] = useState(false);
  const [previewVersion, setPreviewVersion] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Checks: the same backend rules as saving, run while typing
  const [checkIssues, setCheckIssues] = useState<SkillIssue[]>([]);
  const [checking, setChecking] = useState(false);
  const [checkUnavailable, setCheckUnavailable] = useState(false);
  const [checksPanelOpen, setChecksPanelOpen] = useState(false);
  // The guide shares the place of the checks panel: null when closed, else the section to show
  const [guide, setGuide] = useState<{ section: GuideSectionId | null } | null>(null);
  const [dismissedWarnings, setDismissedWarnings] = useState<string[]>([]);
  const checkRunRef = useRef(0);
  const modalRef = useRef<HTMLDivElement>(null);
  // What the form held once loaded, to ask before closing with unsaved changes
  const savedSnapshotRef = useRef<string | null>(null);
  // The form as of the last render, for callbacks that finish later
  const editorSnapshotRef = useRef<string | null>(null);
  const [snapshotTick, setSnapshotTick] = useState(0);
  const dismissedStorageKey = `vmind.skills.editor.dismissed.${accountName}`;

  // Only one of the checks panel and the guide is shown at a time
  useEffect(() => {
    if (checksPanelOpen) setGuide(null);
  }, [checksPanelOpen]);

  const openGuide = (section: GuideSectionId | null) => {
    setChecksPanelOpen(false);
    setGuide({ section });
  };

  useEffect(() => {
    if (!isOpen) return;
    setErrorMsg(null);
    setActiveTab('general');
    setHelpField(null);
    setCheckIssues([]);
    setCheckUnavailable(false);
    setChecksPanelOpen(false);
    setGuide(null);
    // The snapshot is taken on the next render, once the values below are in place
    savedSnapshotRef.current = null;
    setSnapshotTick((tick) => tick + 1);
    try {
      const stored = JSON.parse(window.localStorage.getItem(dismissedStorageKey) || '[]');
      setDismissedWarnings(Array.isArray(stored) ? stored : []);
    } catch {
      setDismissedWarnings([]);
    }

    if (initialSkill) {
      setSlug(initialSkill.slug);
      setTitle(initialSkill.title);
      setCategory(initialSkill.category || 'productivite');
      setKind(!isAdmin ? 'style' : initialSkill.kind || 'style');

      if (mode === 'customize') {
        // Copy-on-Write defaults to USER for regular users, or USER/TENANT for admins
        setScope('USER');
      } else {
        setScope(!isAdmin ? 'USER' : initialSkill.scope || 'USER');
      }

      setErpTypes(initialSkill.erp_types?.length ? initialSkill.erp_types : initialSkill.erp_type ? [initialSkill.erp_type] : []);
      setTenantKey(initialSkill.tenant_key || activeClientId || 'DEMO');
      setDescription(initialSkill.description || '');
      setBodyMd(initialSkill.body_md || '');
      const initialKind: SkillKind = !isAdmin ? 'style' : initialSkill.kind || 'style';
      const sentences = parseDescription(initialSkill.description || '');
      setQuand(sentences?.quand ?? '');
      setPasPour(sentences?.pasPour ?? '');
      setFreeDescription(usesFreeDescription(initialSkill.description || ''));
      const guided = loadGuidedBody(initialKind, initialSkill.title, initialSkill.body_md || '');
      setSectionValues(guided.values);
      setCustomBody(guided.custom);
      setActiveSection(guided.custom?.sections[0]?.key ?? GUIDED_SECTIONS[initialKind][0].key);
      setExpertMode(!fitsGuidedForm(initialSkill.references_json) || readStoredExpertMode(accountName));
      const refs = initialSkill.references_json || {};
      setReferencesJson({ ...refs });
      const refKeys = Object.keys(refs);
      setSelectedRefKey(refKeys.length > 0 ? refKeys[0] : null);
      setVersionComment('');
    } else {
      setSlug('');
      setTitle('');
      setCategory('productivite');
      setKind('style');
      setScope('USER');
      setErpTypes([]);
      setTenantKey(activeClientId || 'DEMO');
      setDescription('');
      setQuand('');
      setPasPour('');
      setSectionValues({});
      setCustomBody(null);
      setFreeDescription(false);
      setActiveSection(GUIDED_SECTIONS.style[0].key);
      const startsExpert = readStoredExpertMode(accountName);
      setExpertMode(startsExpert);
      setBodyMd(startsExpert ? limits?.starters.body ?? '' : '');
      setReferencesJson({});
      setSelectedRefKey(null);
      setVersionComment('');
    }
  }, [isOpen, initialSkill, mode, isAdmin, accountName, activeErpType, activeClientId]);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    fetchSkillConnection(activeConnectionId).then((res) => {
      if (cancelled || !res.clientId || initialSkill?.tenant_key) return;
      // A value filled in by the editor is not a change of the user's: retake the snapshot if nothing was touched
      const untouched = savedSnapshotRef.current === null || savedSnapshotRef.current === editorSnapshotRef.current;
      setTenantKey(res.clientId);
      if (untouched) {
        savedSnapshotRef.current = null;
        setSnapshotTick((tick) => tick + 1);
      }
    });

    if (isAdmin) {
      fetchAvailableTenantsForAdmin().then((list) => {
        if (!cancelled) setTenants(list);
      });
    }
    return () => {
      cancelled = true;
    };
  }, [isOpen, activeConnectionId, isAdmin, initialSkill?.tenant_key]);

  useEffect(() => {
    if (!isOpen || activeTab !== 'history' || !initialSkill?.id) return;
    setLoadingVersions(true);
    fetchSkillVersions(initialSkill.id)
      .then((v) => setVersions(v))
      .catch(() => setVersions([]))
      .finally(() => setLoadingVersions(false));
  }, [isOpen, activeTab, initialSkill?.id]);

  const effectiveDescription = expertMode || freeDescription ? description : composeDescription(quand, pasPour);
  const descChars = effectiveDescription.trim().length;
  const descWords = effectiveDescription.trim() ? effectiveDescription.trim().split(/\s+/).length : 0;
  const hasForbiddenAngles = effectiveDescription.includes('<') || effectiveDescription.includes('>');
  const effectiveKind: SkillKind = !isAdmin ? 'style' : kind;
  const effectiveBody = expertMode
    ? bodyMd
    : customBody
      ? assembleCustomBody(customBody)
      : composeBody(effectiveKind, title, sectionValues);
  const guidedTabs = customBody ? customBody.sections : GUIDED_SECTIONS[effectiveKind];
  const guidedValues = customBody
    ? Object.fromEntries(customBody.sections.map((s) => [s.key, s.text]))
    : sectionValues;
  const sectionHelpKey = customBody ? 'sectionLibre' : activeSection;
  const bodyLines = effectiveBody.split(/\r?\n/).length;
  const bodyChars = effectiveBody.length;
  // Problems are explained by the checks instead of silently disabling the button
  const saveDisabled = saving;
  const canUseGuidedForm = fitsGuidedForm(referencesJson);

  // Shared skills always need a version comment; personal skills from their first change on, for the history
  const commentRequired = scope !== 'USER' || mode !== 'create';
  const finalSlug = !expertMode && mode === 'create' ? slugifyTitle(title, limits?.maxSlugLength) : slug.trim().toLowerCase();
  const buildPayload = () => ({
    slug: finalSlug,
    title: title.trim(),
    description: effectiveDescription.trim(),
    category,
    kind: !isAdmin ? ('style' as SkillKind) : kind,
    scope: !isAdmin ? ('USER' as SkillScope) : scope,
    erp_types: erpTypes,
    tenant_key: scope === 'TENANT' ? tenantKey.trim().toUpperCase() : null,
    body_md: effectiveBody,
    references_json: referencesJson,
    comment: versionComment.trim() || undefined,
  });
  const checkPayload = () => ({
    ...buildPayload(),
    comment: undefined,
    skill_id: mode !== 'create' ? initialSkill?.id ?? null : null,
  });
  const checkPayloadJson = JSON.stringify(checkPayload());
  const editorSnapshot = JSON.stringify(buildPayload());
  editorSnapshotRef.current = editorSnapshot;

  useEffect(() => {
    if (isOpen) savedSnapshotRef.current = editorSnapshot;
    // Only right after the form is loaded, not on each change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snapshotTick]);

  const handleRequestClose = () => {
    const unsaved = savedSnapshotRef.current !== null && savedSnapshotRef.current !== editorSnapshot;
    if (unsaved && !window.confirm('Vos modifications ne sont pas enregistrées. Fermer quand même ?')) return;
    onClose();
  };

  // A warning marked « C'est voulu » stays hidden for this skill and this account only.
  // A new skill's name still changes while it is typed, so its choices hold for this editing only
  const dismissScope = mode === 'create' ? NEW_SKILL_DISMISS_SCOPE : finalSlug;
  const dismissKeyOf = (issue: SkillIssue) => `${dismissScope}|${issueKey(issue)}`;
  const isDismissed = (issue: SkillIssue) => issue.level === 'warning' && dismissedWarnings.includes(dismissKeyOf(issue));
  const visibleIssues = checkIssues.filter((issue) => !isDismissed(issue));
  const dismissedCount = checkIssues.length - visibleIssues.length;
  const blockingIssues = visibleIssues.filter((issue) => issue.level === 'blocking');

  const storeDismissed = (next: string[]) => {
    setDismissedWarnings(next);
    try {
      const kept = next.filter((key) => !key.startsWith(`${NEW_SKILL_DISMISS_SCOPE}|`));
      window.localStorage.setItem(dismissedStorageKey, JSON.stringify(kept));
    } catch {
      // The choice simply isn't remembered
    }
  };
  const handleDismissIssue = (issue: SkillIssue) => storeDismissed([...dismissedWarnings, dismissKeyOf(issue)]);
  const handleRestoreDismissed = () =>
    storeDismissed(dismissedWarnings.filter((key) => !key.startsWith(`${dismissScope}|`)));

  useEffect(() => {
    if (!isOpen || activeTab === 'history') return;
    const runId = ++checkRunRef.current;
    setChecking(true);
    const timer = setTimeout(async () => {
      try {
        const { issues, citations: found } = await checkSkill(JSON.parse(checkPayloadJson), activeConnectionId);
        if (runId !== checkRunRef.current) return;
        setCheckIssues(issues);
        setCitations(found);
        setCheckUnavailable(false);
      } catch {
        if (runId === checkRunRef.current) setCheckUnavailable(true);
      } finally {
        if (runId === checkRunRef.current) setChecking(false);
      }
    }, 800);
    return () => clearTimeout(timer);
  }, [isOpen, activeTab, checkPayloadJson, activeConnectionId]);

  // Outline each field concerned by a problem: red when blocking, amber for a warning
  useEffect(() => {
    const modal = modalRef.current;
    if (!modal) return;
    const levelByTarget = new Map<string, 'blocking' | 'warning'>();
    for (const issue of visibleIssues) {
      if (issue.level === 'info') continue;
      const target = issueTarget(issue);
      if (issue.level === 'blocking' || !levelByTarget.has(target)) levelByTarget.set(target, issue.level);
    }
    modal.querySelectorAll<HTMLElement>('[data-check]').forEach((element) => {
      const levels = (element.dataset.check || '').split(' ').map((target) => levelByTarget.get(target));
      const level = levels.includes('blocking') ? 'blocking' : levels.find(Boolean);
      if (level) element.dataset.issue = level;
      else delete element.dataset.issue;
    });
  });

  if (!isOpen) return null;

  const handleExpertToggle = () => {
    if (expertMode) {
      if (!canUseGuidedForm) return;
      const sentences = parseDescription(description);
      setQuand(sentences?.quand ?? '');
      setPasPour(sentences?.pasPour ?? '');
      setFreeDescription(usesFreeDescription(description));
      const guided = loadGuidedBody(effectiveKind, title, bodyMd, limits?.starters.body);
      setSectionValues(guided.values);
      setCustomBody(guided.custom);
      setActiveSection(guided.custom?.sections[0]?.key ?? GUIDED_SECTIONS[effectiveKind][0].key);
      if (activeTab === 'references') setActiveTab('general');
    } else {
      setDescription(effectiveDescription);
      setBodyMd(effectiveBody || limits?.starters.body || '');
    }
    setExpertMode(!expertMode);
    setErrorMsg(null);
    storeExpertMode(accountName, !expertMode);
  };

  const handleKindChange = (nextKind: SkillKind) => {
    if (!customBody) {
      setSectionValues((prev) => convertSections(kind, nextKind, prev));
      setActiveSection(GUIDED_SECTIONS[nextKind][0].key);
    }
    setKind(nextKind);
  };

  const handleSectionChange = (key: string, value: string) => {
    if (customBody) {
      setCustomBody({
        ...customBody,
        sections: customBody.sections.map((s) => (s.key === key ? { ...s, text: value } : s)),
      });
    } else {
      setSectionValues((prev) => ({ ...prev, [key]: value }));
    }
  };

  const handleScopeChange = (nextScope: SkillScope) => {
    setScope(nextScope);
    if (nextScope === 'ERP' && erpTypes.length === 0 && activeErpType) {
      setErpTypes([activeErpType.toLowerCase()]);
    }
  };

  const handleFieldFocus = (e: React.FocusEvent<HTMLFormElement>) => {
    const field = (e.target as HTMLElement).closest<HTMLElement>('[data-help]')?.dataset.help;
    if (field) setHelpField(field);
  };

  // Always creates a new file: never touches the open file's content
  const handleAddReference = () => {
    if (!canAddReference) return;
    const fileName = refFileName;
    setReferencesJson((prev) => ({ ...prev, [fileName]: referenceStarter(fileName, limits?.starters) }));
    setSelectedRefKey(fileName);
    setNewRefName('');
    setErrorMsg(null);
  };

  const handleSelectReference = (key: string) => {
    setSelectedRefKey(key);
    setNewRefName(key);
    setErrorMsg(null);
  };

  // Enter adds the file when Ajouter is enabled, and never saves the whole skill
  const handleRefNameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    handleAddReference();
  };

  // Renames the open file in place (same content, same position) and can update the places that cite it
  // The citations as the backend finds them now; the last known ones if it cannot be reached
  const currentCitations = async (): Promise<SkillCitations> => {
    try {
      return (await checkSkill(checkPayload(), activeConnectionId)).citations;
    } catch {
      return citations;
    }
  };

  const handleRenameReference = async () => {
    if (!canRenameReference || !selectedRefKey) return;
    const oldName = selectedRefKey;
    const newName = refFileName;
    const found = await currentCitations();
    const citedIn = citationPlaces(oldName, found);
    const updateCitations =
      citedIn.length > 0 &&
      window.confirm(`« ${oldName} » est cité dans : ${citedIn.join(', ')}.\nRemplacer ces mentions par « ${newName} » ?`);
    setReferencesJson((prev) =>
      Object.fromEntries(
        Object.entries(prev).map(([key, content]) =>
          key === oldName
            ? [newName, renamedReferenceContent(oldName, newName, content)]
            : [key, updateCitations ? replaceCitations(content, key, oldName, newName, found) : content]
        )
      )
    );
    if (updateCitations) setBodyMd((prev) => replaceCitations(prev, 'body', oldName, newName, found));
    setSelectedRefKey(newName);
    setNewRefName('');
    setErrorMsg(null);
  };

  // Opens the place of a problem: the reference file concerned, or the field, with the word selected when found
  const handleOpenIssue = (issue: SkillIssue) => {
    setChecksPanelOpen(false);
    if (issue.field === 'references') {
      setActiveTab('references');
      const file = issue.path ?? issue.term;
      if (file && file in referencesJson) handleSelectReference(file);
      return;
    }
    setActiveTab('general');
    const target = issueTarget(issue);
    setTimeout(() => {
      const area = modalRef.current?.querySelector<HTMLElement>(`[data-check~="${target}"]`);
      if (!area) return;
      area.scrollIntoView({ block: 'center', behavior: 'smooth' });
      const field = area.querySelector<HTMLTextAreaElement | HTMLInputElement>('textarea, input');
      field?.focus();
      const at = issue.term && field ? field.value.indexOf(issue.term) : -1;
      if (field && issue.term && at >= 0) field.setSelectionRange(at, at + issue.term.length);
    }, 50);
  };

  const handleDeleteReference = async (key: string) => {
    const citedIn = citationPlaces(key, await currentCitations());
    if (
      citedIn.length > 0 &&
      !window.confirm(`« ${key} » est encore cité dans : ${citedIn.join(', ')}.\nLe supprimer quand même ?`)
    ) {
      return;
    }
    if (newRefName.trim().toLowerCase() === key.toLowerCase()) setNewRefName('');
    setReferencesJson((prev) => {
      const copy = { ...prev };
      delete copy[key];
      const remaining = Object.keys(copy);
      setSelectedRefKey(remaining.length > 0 ? remaining[0] : null);
      return copy;
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (commentRequired && !versionComment.trim()) {
      setErrorMsg(
        scope !== 'USER'
          ? 'Un commentaire de version est obligatoire pour les portées partagées (TENANT, ERP, GLOBAL).'
          : "Indiquez ce qui a changé : c'est ce qui apparaît dans l'historique de la compétence."
      );
      return;
    }
    if (scope === 'ERP' && erpTypes.length === 0) {
      setErrorMsg('Choisissez au moins un ERP pour cette compétence.');
      return;
    }
    if (!expertMode) {
      // The standard sections are a form choice, so this rule stays in the editor
      const missingSection = customBody
        ? undefined
        : GUIDED_SECTIONS[effectiveKind].find((s) => s.required && !sectionValues[s.key]?.trim());
      if (missingSection) {
        setActiveSection(missingSection.key);
        setHelpField(missingSection.key);
        setErrorMsg(`Remplissez « ${missingSection.title} » : l’assistant en a besoin pour appliquer cette compétence.`);
        return;
      }
    }

    try {
      setSaving(true);
      const payload = buildPayload();

      // Same rules as the backend save: check first so every blocking problem is explained at once
      try {
        const { issues, citations: found } = await checkSkill(checkPayload(), activeConnectionId);
        setCheckIssues(issues);
        setCitations(found);
        setCheckUnavailable(false);
        if (issues.some((issue) => issue.level === 'blocking')) {
          setChecksPanelOpen(true);
          setErrorMsg('Corrigez les points bloquants avant d’enregistrer : ils sont détaillés dans la liste.');
          return;
        }
      } catch {
        // The save itself still applies the rules
      }

      if (mode === 'create' || !initialSkill) {
        await createSkill(payload);
        showToast(`Skill /${payload.slug} créé avec succès.`, 'success');
      } else {
        const res = await updateSkill(initialSkill.id, payload);
        showToast(
          res.mode === 'copy_on_write'
            ? `Copie personnalisée créée pour /${initialSkill.slug}.`
            : `Skill /${initialSkill.slug} mis à jour.`,
          'success'
        );
      }

      await onSaved();
      onClose();
    } catch (err: any) {
      if (err instanceof SkillSaveError && err.issues.length > 0) {
        setCheckIssues((prev) => [...err.issues, ...prev.filter((p) => !err.issues.some((i) => issueKey(i) === issueKey(p)))]);
        setChecksPanelOpen(true);
      }
      setErrorMsg(err.message || 'Erreur lors de la sauvegarde.');
    } finally {
      setSaving(false);
    }
  };

  const handleRollback = async (ver: number) => {
    if (!initialSkill?.id) return;
    try {
      setSaving(true);
      await rollbackSkillVersion(initialSkill.id, ver, `Restauration de la version v${ver}`);
      showToast(`Version v${ver} restaurée.`, 'success');
      await onSaved();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Impossible de restaurer cette version.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(3, 8, 18, 0.82)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
      onClick={handleRequestClose}
    >
      <div
        ref={modalRef}
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: '920px',
          height: 'auto',
          maxHeight: 'min(90vh, 880px)',
          background: 'linear-gradient(165deg, #0d1528 0%, #060b16 100%)',
          border: '1px solid rgba(0, 229, 200, 0.35)',
          borderRadius: '20px',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 30px 80px rgba(0, 0, 0, 0.8), 0 0 45px rgba(0, 229, 200, 0.12)',
          color: '#e2e8f0',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '18px 24px',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <h2 style={{ fontSize: '17px', fontWeight: 700, color: '#ffffff', margin: 0 }}>
              {mode === 'create'
                ? 'Nouveau Skill'
                : mode === 'customize'
                  ? `Personnaliser /${initialSkill?.slug}`
                  : `Modifier /${initialSkill?.slug}`}
            </h2>
            <p style={{ fontSize: '12px', color: '#8FA3B8', margin: '4px 0 0 0' }}>
              {mode === 'customize'
                ? 'Crée une copie personnelle isolée sans modifier la compétence par défaut.'
                : expertMode
                  ? 'Format standardisé SKILL.md (niveau 1 : index, niveau 2 : instructions, niveau 3 : références).'
                  : "Décrivez quand et comment l'assistant doit agir."}
            </p>
          </div>
          <button
            type="button"
            onClick={handleRequestClose}
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: '#94a3b8',
              borderRadius: '8px',
              padding: '6px',
              cursor: 'pointer',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Tabs */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 24px',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            background: 'rgba(0,0,0,0.2)',
          }}
        >
          <button
            type="button"
            onClick={() => setActiveTab('general')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              border: activeTab === 'general' ? '1px solid #00E5C8' : '1px solid transparent',
              background: activeTab === 'general' ? 'rgba(0, 229, 200, 0.12)' : 'transparent',
              color: activeTab === 'general' ? '#00E5C8' : '#94a3b8',
            }}
          >
            <Pencil size={14} /> Instructions
          </button>

          {expertMode && (
            <button
              type="button"
              data-check="references"
              onClick={() => setActiveTab('references')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 14px',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                border: activeTab === 'references' ? '1px solid #00E5C8' : '1px solid transparent',
                background: activeTab === 'references' ? 'rgba(0, 229, 200, 0.12)' : 'transparent',
                color: activeTab === 'references' ? '#00E5C8' : '#94a3b8',
              }}
            >
              <FileText size={14} /> Références
              <span style={{ color: counterColor([[Object.keys(referencesJson).length, limits?.maxReferenceFiles]], 'inherit') }}>
                ({Object.keys(referencesJson).length}{outOf(limits?.maxReferenceFiles)})
              </span>
            </button>
          )}

          {initialSkill?.id && mode !== 'create' && (
            <button
              type="button"
              onClick={() => setActiveTab('history')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 14px',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                border: activeTab === 'history' ? '1px solid #00E5C8' : '1px solid transparent',
                background: activeTab === 'history' ? 'rgba(0, 229, 200, 0.12)' : 'transparent',
                color: activeTab === 'history' ? '#00E5C8' : '#94a3b8',
              }}
            >
              <History size={14} /> Historique (v{initialSkill.version})
            </button>
          )}

          <button
            type="button"
            onClick={() => (guide ? setGuide(null) : openGuide(null))}
            aria-expanded={!!guide}
            style={{
              marginLeft: 'auto',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 6px',
              background: 'transparent',
              border: 'none',
              fontSize: '12px',
              fontWeight: 600,
              color: guide ? '#00E5C8' : '#94a3b8',
              cursor: 'pointer',
            }}
          >
            <BookOpen size={14} /> Guide
          </button>

          <button
            type="button"
            role="switch"
            aria-checked={expertMode}
            disabled={expertMode && !canUseGuidedForm}
            onClick={handleExpertToggle}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '4px 6px',
              background: 'transparent',
              border: 'none',
              fontSize: '12px',
              fontWeight: 600,
              color: expertMode ? '#00E5C8' : '#94a3b8',
              cursor: expertMode && !canUseGuidedForm ? 'not-allowed' : 'pointer',
            }}
          >
            Mode expert
            <span
              aria-hidden="true"
              style={{
                position: 'relative',
                width: '30px',
                height: '16px',
                borderRadius: '8px',
                background: expertMode ? 'rgba(0, 229, 200, 0.45)' : 'rgba(255,255,255,0.14)',
              }}
            >
              <span
                style={{
                  position: 'absolute',
                  top: '2px',
                  left: expertMode ? '16px' : '2px',
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  background: expertMode ? '#00E5C8' : '#cbd5e1',
                  transition: 'left 0.15s ease',
                }}
              />
            </span>
          </button>
        </div>

        {expertMode && !canUseGuidedForm && (
          <div
            style={{
              padding: '8px 24px',
              fontSize: '12px',
              color: '#8FA3B8',
              borderBottom: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            Cette compétence contient des fichiers de référence : elle se modifie en mode expert.
          </div>
        )}

        {/* Body */}
        <form
          id="skill-editor-form"
          onSubmit={handleSave}
          onFocus={handleFieldFocus}
          style={{
            flex: 1,
            minHeight: 0,
            overflowY: 'auto',
            padding: '24px 28px',
            display: 'flex',
            flexDirection: 'column',
            gap: '18px',
          }}
        >
          {errorMsg && (
            <div
              style={{
                padding: '10px 14px',
                borderRadius: '10px',
                background: 'rgba(239, 68, 68, 0.12)',
                border: '1px solid rgba(239, 68, 68, 0.4)',
                color: '#fca5a5',
                fontSize: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <AlertCircle size={16} />
              <span>{errorMsg}</span>
            </div>
          )}

          {activeTab === 'general' && (
            <>
              {!expertMode && (
                <SkillGuidedFields
                  tabs={guidedTabs}
                  helpKey={sectionHelpKey}
                  freeDescription={freeDescription}
                  description={description}
                  quand={quand}
                  pasPour={pasPour}
                  sections={guidedValues}
                  activeSection={activeSection}
                  title={title}
                  maxTitleLength={limits?.maxTitleLength}
                  onDescriptionChange={setDescription}
                  onQuandChange={setQuand}
                  onPasPourChange={setPasPour}
                  onSectionChange={handleSectionChange}
                  onActiveSectionChange={(key) => {
                    setActiveSection(key);
                    setHelpField(customBody ? 'sectionLibre' : key);
                  }}
                  onTitleChange={setTitle}
                />
              )}

              {expertMode && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div data-check="slug">
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#00E5C8', marginBottom: '6px' }}>
                    Identifiant (`/nom-avec-tirets` en minuscules) *
                  </label>
                  <input
                    type="text"
                    value={slug}
                    disabled={mode !== 'create'}
                    onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
                    placeholder="ex: synthese-comite-direction"
                    required
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: '8px',
                      background: mode !== 'create' ? 'rgba(255,255,255,0.03)' : '#111c30',
                      border: '1px solid rgba(255,255,255,0.12)',
                      color: '#fff',
                      fontSize: '13px',
                      fontFamily: 'monospace',
                    }}
                  />
                </div>

                <div data-check="title">
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#00E5C8', marginBottom: '6px' }}>
                    Titre de la Compétence *
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="ex: Synthèse Comité de Direction"
                    required
                    maxLength={limits?.maxTitleLength}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: '8px',
                      background: '#111c30',
                      border: '1px solid rgba(255,255,255,0.12)',
                      color: '#fff',
                      fontSize: '13px',
                    }}
                  />
                </div>
              </div>
              )}

              {/* Category, Kind, Scope */}
              <div style={{ display: 'grid', gridTemplateColumns: isAdmin ? '1fr 1fr 1fr' : expertMode ? '1fr 1fr' : '1fr', gap: '14px' }}>
                <div data-help="categorie" data-check="category">
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#00E5C8', marginBottom: '6px' }}>
                    Catégorie
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as SkillCategory)}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: '8px',
                      background: '#111c30',
                      border: '1px solid rgba(255,255,255,0.12)',
                      color: '#fff',
                      fontSize: '13px',
                    }}
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>

                {(expertMode || isAdmin) && (
                <div data-help="type" data-check="kind">
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#00E5C8', marginBottom: '6px' }}>
                    Type de compétence
                  </label>
                  <select
                    value={!isAdmin ? 'style' : kind}
                    disabled={!isAdmin}
                    onChange={(e) => handleKindChange(e.target.value as SkillKind)}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: '8px',
                      background: !isAdmin ? 'rgba(255,255,255,0.04)' : '#111c30',
                      border: '1px solid rgba(255,255,255,0.12)',
                      color: '#fff',
                      fontSize: '13px',
                    }}
                  >
                    <option value="style">Style / Formatage (Personnel ou Partagé)</option>
                    {isAdmin && <option value="method">Méthode Métier / ERP (Administrateur uniquement)</option>}
                  </select>
                </div>
                )}

                {isAdmin && (
                  <div data-help="portee" data-check="scope">
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#00E5C8', marginBottom: '6px' }}>
                      Portée
                    </label>
                    <select
                      value={scope}
                      onChange={(e) => handleScopeChange(e.target.value as SkillScope)}
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        borderRadius: '8px',
                        background: '#111c30',
                        border: '1px solid rgba(255,255,255,0.12)',
                        color: '#fff',
                        fontSize: '13px',
                      }}
                    >
                      <option value="USER">Personnel (Mon compte uniquement)</option>
                      <option value="TENANT" disabled={!isAdmin && !activeClientId}>
                        Organisation {activeClientId ? `(${activeClientId})` : ''}
                      </option>
                      <option value="ERP" disabled={!isAdmin && !activeErpType}>
                        Spécifique ERP
                      </option>
                      <option value="GLOBAL">Plateforme Globale (Tous les utilisateurs)</option>
                    </select>
                  </div>
                )}
              </div>

              {/* Admin extra selector for TENANT */}
              {isAdmin && scope === 'TENANT' && (
                <div data-help="organisation" data-check="tenant_key">
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#00E5C8', marginBottom: '6px' }}>
                    Organisation active *
                  </label>
                  <input
                    type="text"
                    value={tenantKey}
                    onChange={(e) => setTenantKey(e.target.value.toUpperCase())}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: '8px',
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(0, 229, 200, 0.35)',
                      color: '#fff',
                      fontSize: '13px',
                    }}
                  />
                </div>
              )}

              <SkillErpSelector
                isOpen={isOpen}
                isAdmin={isAdmin}
                activeErpType={activeErpType}
                selected={erpTypes}
                onChange={setErpTypes}
                requireErp={scope === 'ERP'}
              />

              {expertMode && (
              <>
              {/* Description with counters */}
              <div data-check="description exclusion">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 600, color: '#00E5C8' }}>
                    Description & Mots-clés de déclenchement *
                  </label>
                  <span
                    style={{
                      fontSize: '11px',
                      color:
                        (limits !== null && descChars < limits.minDescriptionLength) || hasForbiddenAngles
                          ? COUNTER_OVER
                          : counterColor([[descChars, limits?.maxDescriptionLength]], '#00E5C8'),
                    }}
                  >
                    {descWords} mots · {descChars}{outOf(limits?.maxDescriptionLength)} caractères {hasForbiddenAngles ? '(chevrons < > interdits)' : ''}
                  </span>
                </div>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Décrivez quand utiliser cette compétence (mots-clés métier) et les cas où ne pas l'utiliser (Ne pas utiliser pour...)."
                  required
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    background: '#111c30',
                    border: '1px solid rgba(255,255,255,0.12)',
                    color: '#fff',
                    fontSize: '13px',
                    resize: 'vertical',
                  }}
                />
              </div>

              {/* Markdown Body with line counter */}
              <div data-check="body_md">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 600, color: '#00E5C8' }}>
                    Instructions Markdown (`SKILL.md`) *
                  </label>
                  <span
                    style={{
                      fontSize: '11px',
                      color: counterColor(
                        [
                          [bodyLines, limits?.maxBodyLines],
                          [bodyChars, limits?.maxBodyChars],
                        ],
                        '#8FA3B8'
                      ),
                    }}
                  >
                    {bodyLines}{outOf(limits?.maxBodyLines)} lignes · {bodyChars}{outOf(limits?.maxBodyChars)} caractères
                  </span>
                </div>
                <textarea
                  rows={10}
                  value={bodyMd}
                  onChange={(e) => setBodyMd(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    background: '#09101d',
                    border: '1px solid rgba(255,255,255,0.14)',
                    color: '#e2e8f0',
                    fontSize: '12.5px',
                    fontFamily: 'monospace',
                    lineHeight: 1.5,
                    resize: 'vertical',
                  }}
                />
              </div>
              </>
              )}

              {/* Version comment input: shared scopes, and any change to an existing skill */}
              {commentRequired && (
                <div data-help="commentaire">
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#00E5C8', marginBottom: '6px' }}>
                    {expertMode ? 'Commentaire de version *' : 'Ce qui a changé *'}
                  </label>
                  <input
                    type="text"
                    value={versionComment}
                    onChange={(e) => setVersionComment(e.target.value)}
                    placeholder="ex: Mise à jour des règles d'impayés et relances"
                    required
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: '8px',
                      background: '#111c30',
                      border: '1px solid rgba(0, 229, 200, 0.35)',
                      color: '#fff',
                      fontSize: '13px',
                    }}
                  />
                </div>
              )}
            </>
          )}

          {activeTab === 'references' && (
            <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div data-help="referenceName" data-check="references">
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  value={newRefName}
                  onChange={(e) => setNewRefName(sanitizeReferenceInput(e.target.value))}
                  onKeyDown={handleRefNameKeyDown}
                  placeholder="regles/relances.md ou relances-clients/SKILL.md"
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    borderRadius: '8px',
                    background: '#111c30',
                    border: '1px solid rgba(255,255,255,0.12)',
                    color: '#fff',
                    fontSize: '12.5px',
                    fontFamily: 'monospace',
                  }}
                />
                <button
                  type="button"
                  onClick={handleAddReference}
                  disabled={!canAddReference}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 14px',
                    borderRadius: '8px',
                    background: 'rgba(0, 229, 200, 0.14)',
                    border: '1px solid #00E5C8',
                    color: '#00E5C8',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: canAddReference ? 'pointer' : 'not-allowed',
                    opacity: canAddReference ? 1 : 0.4,
                  }}
                >
                  <Plus size={14} /> Ajouter un fichier `.md`
                </button>
                {showRenameButton && (
                  <button
                    type="button"
                    onClick={handleRenameReference}
                    disabled={!canRenameReference}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '8px 14px',
                      borderRadius: '8px',
                      background: 'transparent',
                      border: '1px solid rgba(255,255,255,0.25)',
                      color: '#e2e8f0',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: canRenameReference ? 'pointer' : 'not-allowed',
                      opacity: canRenameReference ? 1 : 0.4,
                    }}
                  >
                    <Pencil size={13} /> Renommer
                  </button>
                )}
              </div>
              {refHints.map((hint) => (
                <div
                  key={hint.text}
                  style={{
                    marginTop: '6px',
                    fontSize: '11.5px',
                    color: hint.tone === 'error' ? '#f87171' : hint.tone === 'muted' ? '#8FA3B8' : '#00E5C8',
                  }}
                >
                  {hint.text}
                </div>
              ))}
              </div>

              {Object.keys(referencesJson).length === 0 ? (
                <div style={{ padding: '32px', textAlign: 'center', color: '#8FA3B8', fontSize: '12.5px' }}>
                  Aucun fichier de référence. Ajoutez une documentation (ex. regles/relances.md) ou une sous-compétence
                  (ex. relances-clients/SKILL.md).
                </div>
              ) : (
                <div style={{ flex: 1, minHeight: 0, height: '360px', display: 'grid', gridTemplateColumns: '220px 1fr', gap: '14px' }}>
                  <div style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '420px' }}>
                    {Object.keys(referencesJson).map((fileKey) => (
                      <div
                        key={fileKey}
                        onClick={() => handleSelectReference(fileKey)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '8px 10px',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          background:
                            selectedRefKey === fileKey ? 'rgba(0, 229, 200, 0.14)' : 'rgba(255,255,255,0.03)',
                          border:
                            selectedRefKey === fileKey
                              ? '1px solid rgba(0, 229, 200, 0.45)'
                              : '1px solid rgba(255,255,255,0.07)',
                          fontSize: '12px',
                          fontFamily: 'monospace',
                        }}
                      >
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {fileKey}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteReference(fileKey);
                          }}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#f87171',
                            cursor: 'pointer',
                            padding: '2px',
                          }}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ))}
                  </div>

                  <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
                    {selectedRefKey && referencesJson[selectedRefKey] !== undefined && (
                      <div
                        data-help={referenceKind(selectedRefKey) === 'subSkill' ? 'referenceSubSkill' : 'referenceDoc'}
                        data-check="references"
                        style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '11px', color: '#8FA3B8' }}>
                          <span>Contenu de `{selectedRefKey}`</span>
                          <span
                            style={{
                              color: counterColor([[referencesJson[selectedRefKey].length, limits?.maxReferenceFileChars]], '#8FA3B8'),
                            }}
                          >
                            {referencesJson[selectedRefKey].length}{outOf(limits?.maxReferenceFileChars)} caractères
                          </span>
                        </div>
                        <textarea
                          rows={15}
                          value={referencesJson[selectedRefKey]}
                          onChange={(e) =>
                            setReferencesJson((prev) => ({
                              ...prev,
                              [selectedRefKey]: e.target.value,
                            }))
                          }
                          style={{
                            width: '100%',
                            flex: 1,
                            minHeight: '360px',
                            padding: '10px 12px',
                            borderRadius: '8px',
                            background: '#09101d',
                            border: '1px solid rgba(255,255,255,0.14)',
                            color: '#e2e8f0',
                            fontSize: '12px',
                            fontFamily: 'monospace',
                            resize: 'none',
                          }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'history' && (
            <div style={{ minHeight: '480px', maxHeight: '560px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {loadingVersions ? (
                <div style={{ padding: '24px', textAlign: 'center', color: '#8FA3B8', fontSize: '12.5px' }}>
                  Chargement de l&apos;historique des versions...
                </div>
              ) : versions.length === 0 ? (
                <div style={{ padding: '24px', textAlign: 'center', color: '#8FA3B8', fontSize: '12.5px' }}>
                  Aucune version enregistrée.
                </div>
              ) : (
                versions.map((v) => {
                  const isExpanded = previewVersion === v.version;
                  const isCurrentVersion = v.version === initialSkill?.version;
                  const refCount = v.references_json ? Object.keys(v.references_json).length : 0;
                  return (
                    <div
                      key={v.version}
                      style={{
                        padding: '12px 14px',
                        borderRadius: '10px',
                        background: isExpanded
                          ? 'rgba(0, 229, 200, 0.05)'
                          : isCurrentVersion
                            ? 'rgba(0, 229, 200, 0.03)'
                            : 'rgba(255,255,255,0.03)',
                        border: isExpanded
                          ? '1px solid rgba(0, 229, 200, 0.35)'
                          : isCurrentVersion
                            ? '1px solid rgba(0, 229, 200, 0.25)'
                            : '1px solid rgba(255,255,255,0.08)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '10px',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '12px',
                        }}
                      >
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <span style={{ fontWeight: 700, color: '#00E5C8', fontSize: '12.5px' }}>
                              v{v.version}
                            </span>
                            {isCurrentVersion && (
                              <span
                                style={{
                                  fontSize: '10px',
                                  fontWeight: 700,
                                  padding: '2px 7px',
                                  borderRadius: '99px',
                                  background: 'rgba(0, 229, 200, 0.14)',
                                  border: '1px solid rgba(0, 229, 200, 0.4)',
                                  color: '#00E5C8',
                                }}
                              >
                                Version active
                              </span>
                            )}
                            <span style={{ fontWeight: 600, color: '#fff', fontSize: '12.5px' }}>
                              {v.title}
                            </span>
                            <span style={{ fontSize: '11px', color: '#8FA3B8' }}>
                              · {new Date(v.changed_at).toLocaleString('fr-FR')}
                            </span>
                            {refCount > 0 && (
                              <span style={{ fontSize: '10.5px', color: '#7dd3fc' }}>
                                · {refCount} réf.
                              </span>
                            )}
                          </div>
                          {v.comment && (
                            <div style={{ fontSize: '11.5px', color: '#cbd5e1', marginTop: '4px' }}>
                              {v.comment}
                            </div>
                          )}
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <button
                            type="button"
                            onClick={() => setPreviewVersion(isExpanded ? null : v.version)}
                            style={{
                              padding: '6px 10px',
                              borderRadius: '7px',
                              background: 'rgba(255,255,255,0.05)',
                              border: '1px solid rgba(255,255,255,0.12)',
                              color: '#cbd5e1',
                              fontSize: '11px',
                              fontWeight: 600,
                              cursor: 'pointer',
                            }}
                          >
                            {isExpanded ? 'Masquer' : 'Aperçu'}
                          </button>

                          {(initialSkill?.is_personal_owner || isAdmin) && !isCurrentVersion && (
                            <button
                              type="button"
                              onClick={() => handleRollback(v.version)}
                              disabled={saving}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '5px',
                                padding: '6px 10px',
                                borderRadius: '7px',
                                background: 'rgba(0, 229, 200, 0.1)',
                                border: '1px solid rgba(0, 229, 200, 0.35)',
                                color: '#00E5C8',
                                fontSize: '11px',
                                fontWeight: 600,
                                cursor: 'pointer',
                              }}
                            >
                              <RotateCcw size={12} /> Restaurer v{v.version}
                            </button>
                          )}
                        </div>
                      </div>

                      {isExpanded && (
                        <div
                          style={{
                            paddingTop: '10px',
                            borderTop: '1px solid rgba(255,255,255,0.08)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '8px',
                          }}
                        >
                          <div style={{ fontSize: '11.5px', color: '#94a3b8' }}>
                            <strong style={{ color: '#e2e8f0' }}>Description :</strong> {v.description}
                          </div>
                          <pre
                            style={{
                              margin: 0,
                              padding: '10px 12px',
                              borderRadius: '8px',
                              background: '#080e1a',
                              border: '1px solid rgba(255,255,255,0.08)',
                              color: '#cbd5e1',
                              fontSize: '11.5px',
                              fontFamily: 'monospace',
                              maxHeight: '180px',
                              overflowY: 'auto',
                              whiteSpace: 'pre-wrap',
                            }}
                          >
                            {v.body_md}
                          </pre>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}
        </form>

        {((!expertMode && activeTab === 'general') || activeTab === 'references') && (
          <SkillHelpStrip
            fieldKey={helpField}
            issues={issuesForHelpKey(visibleIssues, helpField, guidedTabs.map((t) => t.key))}
          />
        )}

        {checksPanelOpen && (
          <SkillChecksPanel
            issues={visibleIssues}
            dismissedCount={dismissedCount}
            unavailable={checkUnavailable}
            onDismiss={handleDismissIssue}
            onRestoreDismissed={handleRestoreDismissed}
            onLearnMore={(issue) => openGuide(guideSectionFor(issue))}
            onOpenIssue={handleOpenIssue}
            onClose={() => setChecksPanelOpen(false)}
          />
        )}

        {guide && <SkillGuidePanel section={guide.section} onClose={() => setGuide(null)} />}

        {/* Sticky Luxury Modal Footer — firmly anchored, zero dead space */}
        <div
          style={{
            padding: '16px 28px',
            borderTop: '1px solid rgba(148, 163, 184, 0.12)',
            background: 'rgba(6, 10, 20, 0.95)',
            backdropFilter: 'blur(12px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            flexShrink: 0,
          }}
        >
          {/* Left note */}
          <div style={{ fontSize: '12px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '7px' }}>
            <span
              style={{
                width: '7px',
                height: '7px',
                borderRadius: '50%',
                background: '#00E5C8',
                boxShadow: '0 0 8px rgba(0, 229, 200, 0.7)',
              }}
            />
            <span>
              {mode === 'create'
                ? !expertMode
                  ? scope === 'USER'
                    ? 'Nouvelle compétence personnelle'
                    : 'Nouvelle compétence partagée'
                  : `Nouveau skill personnel (${slug ? `/${slug}` : 'invoquable via /'})`
                : mode === 'customize'
                ? 'Copie personnelle isolée prioritaire sur la version globale'
                : `Incrémente automatiquement vers la version v${(initialSkill?.version || 1) + 1}`}
            </span>
          </div>

          {/* Right actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {activeTab !== 'history' && (
              <SkillChecksSummary
                issues={visibleIssues}
                checking={checking}
                unavailable={checkUnavailable}
                onOpen={() => setChecksPanelOpen((open) => !open)}
              />
            )}
            <button
              type="button"
              onClick={handleRequestClose}
              style={{
                padding: '9px 18px',
                borderRadius: '10px',
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(148, 163, 184, 0.18)',
                color: '#cbd5e1',
                fontSize: '12.5px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                e.currentTarget.style.color = '#fff';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
                e.currentTarget.style.color = '#cbd5e1';
              }}
            >
              Annuler
            </button>

            {activeTab !== 'history' && (
              <button
                type="submit"
                form="skill-editor-form"
                disabled={saveDisabled}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '7px',
                  padding: '9px 22px',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, #00E5C8 0%, #21F3D6 100%)',
                  border: 'none',
                  color: '#021010',
                  fontSize: '13px',
                  fontWeight: 800,
                  cursor: saving ? 'wait' : 'pointer',
                  boxShadow: '0 8px 24px -6px rgba(0, 229, 200, 0.75)',
                  opacity: saveDisabled ? 0.5 : 1,
                  transition: 'all 0.18s ease',
                }}
              >
                <Save size={15} />
                <span>
                  {saving
                    ? 'Enregistrement...'
                    : mode === 'customize'
                    ? 'Enregistrer ma copie'
                    : 'Enregistrer'}
                </span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
