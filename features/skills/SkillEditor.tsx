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
  SkillToolOption,
  SkillVersionItem,
  SkillIssue,
  SkillSaveError,
  checkSkill,
  createSkill,
  updateSkill,
  fetchSkillToolOptions,
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
import {
  EXPERT_MODE_STORAGE_KEY,
  NEW_SKILL_BODY_TEMPLATE,
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

const MAX_REFERENCE_FILES = Number(process.env.NEXT_PUBLIC_MAX_REFERENCE_FILES) || 15;

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
  const [newRefName, setNewRefName] = useState('');
  const [selectedRefKey, setSelectedRefKey] = useState<string | null>(null);
  const [mappedTools, setMappedTools] = useState<string[]>([]);
  const [versionComment, setVersionComment] = useState('');

  const [isErpConnected, setIsErpConnected] = useState<boolean>(Boolean(activeConnectionId));
  const [toolOptions, setToolOptions] = useState<SkillToolOption[]>([]);
  const [toolsReauth, setToolsReauth] = useState(false);
  const [loadingTools, setLoadingTools] = useState(false);
  const [toolsDropdownOpen, setToolsDropdownOpen] = useState(false);
  const [toolSearchQuery, setToolSearchQuery] = useState('');

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
    setToolsDropdownOpen(false);
    setToolSearchQuery('');
    setHelpField(null);
    setCheckIssues([]);
    setCheckUnavailable(false);
    setChecksPanelOpen(false);
    setGuide(null);
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
      const tools = Array.isArray(initialSkill.mapped_tools) ? initialSkill.mapped_tools : [];
      setMappedTools(tools);
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
      setBodyMd(startsExpert ? NEW_SKILL_BODY_TEMPLATE : '');
      setReferencesJson({});
      setSelectedRefKey(null);
      setMappedTools([]);
      setVersionComment('');
    }
  }, [isOpen, initialSkill, mode, isAdmin, accountName, activeErpType, activeClientId]);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    setLoadingTools(true);
    fetchSkillToolOptions(activeConnectionId)
      .then((res) => {
        if (cancelled) return;
        setIsErpConnected(res.connected || Boolean(activeConnectionId));
        if (res.clientId && !initialSkill?.tenant_key) {
          setTenantKey(res.clientId);
        }
        setToolOptions(res.tools);
        setToolsReauth(res.reauth);
      })
      .finally(() => {
        if (!cancelled) setLoadingTools(false);
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

  const finalSlug = !expertMode && mode === 'create' ? slugifyTitle(title) : slug.trim().toLowerCase();
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
    mapped_tools: scope === 'GLOBAL' || !isErpConnected ? [] : mappedTools,
    comment: versionComment.trim() || undefined,
  });
  const checkPayload = () => ({
    ...buildPayload(),
    comment: undefined,
    skill_id: mode !== 'create' ? initialSkill?.id ?? null : null,
  });
  const checkPayloadJson = JSON.stringify(checkPayload());

  // A warning marked « C'est voulu » stays hidden for this skill and this account only
  const dismissKeyOf = (issue: SkillIssue) => `${finalSlug}|${issueKey(issue)}`;
  const isDismissed = (issue: SkillIssue) => issue.level === 'warning' && dismissedWarnings.includes(dismissKeyOf(issue));
  const visibleIssues = checkIssues.filter((issue) => !isDismissed(issue));
  const dismissedCount = checkIssues.length - visibleIssues.length;
  const blockingIssues = visibleIssues.filter((issue) => issue.level === 'blocking');

  const storeDismissed = (next: string[]) => {
    setDismissedWarnings(next);
    try {
      window.localStorage.setItem(dismissedStorageKey, JSON.stringify(next));
    } catch {
      // The choice simply isn't remembered
    }
  };
  const handleDismissIssue = (issue: SkillIssue) => storeDismissed([...dismissedWarnings, dismissKeyOf(issue)]);
  const handleRestoreDismissed = () =>
    storeDismissed(dismissedWarnings.filter((key) => !key.startsWith(`${finalSlug}|`)));

  useEffect(() => {
    if (!isOpen || activeTab === 'history') return;
    const runId = ++checkRunRef.current;
    setChecking(true);
    const timer = setTimeout(async () => {
      try {
        const issues = await checkSkill(JSON.parse(checkPayloadJson), activeConnectionId);
        if (runId !== checkRunRef.current) return;
        setCheckIssues(issues);
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
      const guided = loadGuidedBody(effectiveKind, title, bodyMd);
      setSectionValues(guided.values);
      setCustomBody(guided.custom);
      setActiveSection(guided.custom?.sections[0]?.key ?? GUIDED_SECTIONS[effectiveKind][0].key);
      if (activeTab === 'references') setActiveTab('general');
    } else {
      setDescription(effectiveDescription);
      setBodyMd(effectiveBody || NEW_SKILL_BODY_TEMPLATE);
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

  const toggleToolSelection = (toolName: string) => {
    setMappedTools((prev) => {
      if (prev.includes(toolName)) {
        return prev.filter((t) => t !== toolName);
      }
      if (prev.length >= 20) {
        return prev;
      }
      return [...prev, toolName];
    });
  };

  const handleAddReference = () => {
    const clean = newRefName.trim().toLowerCase();
    if (!clean) return;
    const fileName = clean.endsWith('.md') ? clean : `${clean}.md`;
    if (!/^(?:[a-z0-9_-]+\/)*[a-z0-9._-]+\.md$/.test(fileName) || fileName.includes('..')) {
      setErrorMsg('Nom de fichier de référence invalide (ex: capacites/creances.md ou guide.md).');
      return;
    }
    if (Object.keys(referencesJson).length >= MAX_REFERENCE_FILES && !referencesJson[fileName]) {
      setErrorMsg(`Maximum ${MAX_REFERENCE_FILES} fichiers de référence autorisés.`);
      return;
    }
    setReferencesJson((prev) => ({
      ...prev,
      [fileName]: prev[fileName] ?? `# ${fileName}\n\nContenu de référence...\n`,
    }));
    setSelectedRefKey(fileName);
    setNewRefName('');
    setErrorMsg(null);
  };

  const handleDeleteReference = (key: string) => {
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

    const finalTools = scope === 'GLOBAL' || !isErpConnected ? [] : mappedTools;
    if (scope !== 'USER' && !versionComment.trim()) {
      setErrorMsg('Un commentaire de version est obligatoire pour les portées partagées (TENANT, ERP, GLOBAL).');
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
      const payload = { ...buildPayload(), mapped_tools: finalTools };

      // Same rules as the backend save: check first so every blocking problem is explained at once
      try {
        const issues = await checkSkill(checkPayload(), activeConnectionId);
        setCheckIssues(issues);
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
      onClick={onClose}
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
            onClick={onClose}
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
              <FileText size={14} /> Références ({Object.keys(referencesJson).length}/{MAX_REFERENCE_FILES})
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
                    maxLength={200}
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
                        descChars < 20 || descChars > 1024 || hasForbiddenAngles
                          ? '#f87171'
                          : '#00E5C8',
                    }}
                  >
                    {descWords} mots · {descChars}/1024 caractères {hasForbiddenAngles ? '(chevrons < > interdits)' : ''}
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
                      color: bodyLines > 500 || bodyChars > 20000 ? '#f87171' : '#8FA3B8',
                    }}
                  >
                    {bodyLines}/500 lignes · {bodyChars}/20 000 caractères
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

              {/* Version comment input for shared scopes */}
              {scope !== 'USER' && (
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
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  value={newRefName}
                  onChange={(e) => setNewRefName(e.target.value)}
                  placeholder="nom-reference.md"
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
                    cursor: 'pointer',
                  }}
                >
                  <Plus size={14} /> Ajouter un fichier `.md`
                </button>
              </div>

              {Object.keys(referencesJson).length === 0 ? (
                <div style={{ padding: '32px', textAlign: 'center', color: '#8FA3B8', fontSize: '12.5px' }}>
                  Aucun fichier de référence (Niveau 3). Ajoutez des fichiers `.md` chargés à la demande par l&apos;agent.
                </div>
              ) : (
                <div style={{ flex: 1, minHeight: 0, height: '360px', display: 'grid', gridTemplateColumns: '220px 1fr', gap: '14px' }}>
                  <div style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '420px' }}>
                    {Object.keys(referencesJson).map((fileKey) => (
                      <div
                        key={fileKey}
                        onClick={() => setSelectedRefKey(fileKey)}
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
                      <>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '11px', color: '#8FA3B8' }}>
                          <span>Contenu de `{selectedRefKey}`</span>
                          <span>{referencesJson[selectedRefKey].length}/8 000 caractères</span>
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
                      </>
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
                          {Array.isArray(v.mapped_tools) && v.mapped_tools.length > 0 && (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                              {v.mapped_tools.map((t) => (
                                <span
                                  key={t}
                                  style={{
                                    fontSize: '10px',
                                    fontFamily: 'monospace',
                                    padding: '2px 6px',
                                    borderRadius: '4px',
                                    background: 'rgba(0, 240, 255, 0.08)',
                                    color: '#7dd3fc',
                                  }}
                                >
                                  {t}
                                </span>
                              ))}
                            </div>
                          )}
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

        {!expertMode && activeTab === 'general' && (
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
              onClick={onClose}
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
