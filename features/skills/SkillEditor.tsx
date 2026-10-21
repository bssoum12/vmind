'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Save,
  Plus,
  Trash2,
  History,
  FileText,
  Wrench,
  RotateCcw,
  AlertCircle,
  ChevronDown,
  Check,
} from 'lucide-react';
import {
  SkillCategory,
  SkillKind,
  SkillScope,
  SkillDetail,
  SkillToolOption,
  SkillVersionItem,
  createSkill,
  updateSkill,
  fetchSkillToolOptions,
  fetchSkillVersions,
  rollbackSkillVersion,
  fetchAvailableTenantsForAdmin,
} from '@/shared/api/skills-api';
import { useToast } from '@/shared/contexts/ToastContext';
import './skills-premium.css';

interface SkillEditorProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => Promise<void> | void;
  initialSkill?: SkillDetail | null;
  mode: 'create' | 'edit' | 'customize';
  isAdmin: boolean;
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

export const SkillEditor: React.FC<SkillEditorProps> = ({
  isOpen,
  onClose,
  onSaved,
  initialSkill,
  mode,
  isAdmin,
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
  const [erpType, setErpType] = useState<string>(activeErpType || 'tralis');
  const [tenantKey, setTenantKey] = useState<string>(activeClientId || 'DEMO');
  const [description, setDescription] = useState('');
  const [bodyMd, setBodyMd] = useState('');
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

  useEffect(() => {
    if (!isOpen) return;
    setErrorMsg(null);
    setActiveTab('general');
    setToolsDropdownOpen(false);
    setToolSearchQuery('');

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

      setErpType(initialSkill.erp_type || activeErpType || 'tralis');
      setTenantKey(initialSkill.tenant_key || activeClientId || 'DEMO');
      setDescription(initialSkill.description || '');
      setBodyMd(initialSkill.body_md || '');
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
      setErpType(activeErpType || 'tralis');
      setTenantKey(activeClientId || 'DEMO');
      setDescription('');
      setBodyMd('# Objectif\n\nDécrivez ici la procédure ou le format attendu...\n');
      setReferencesJson({});
      setSelectedRefKey(null);
      setMappedTools([]);
      setVersionComment('');
    }
  }, [isOpen, initialSkill, mode, isAdmin, activeErpType, activeClientId]);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    setLoadingTools(true);
    fetchSkillToolOptions(activeConnectionId)
      .then((res) => {
        if (cancelled) return;
        setIsErpConnected(res.connected || Boolean(activeConnectionId));
        if (res.erpType && !initialSkill?.erp_type) {
          setErpType(res.erpType);
        }
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
  }, [isOpen, activeConnectionId, isAdmin, initialSkill?.erp_type, initialSkill?.tenant_key]);

  useEffect(() => {
    if (!isOpen || activeTab !== 'history' || !initialSkill?.id) return;
    setLoadingVersions(true);
    fetchSkillVersions(initialSkill.id)
      .then((v) => setVersions(v))
      .catch(() => setVersions([]))
      .finally(() => setLoadingVersions(false));
  }, [isOpen, activeTab, initialSkill?.id]);

  if (!isOpen) return null;

  const descChars = description.trim().length;
  const descWords = description.trim() ? description.trim().split(/\s+/).length : 0;
  const hasForbiddenAngles = description.includes('<') || description.includes('>');
  const bodyLines = bodyMd.split(/\r?\n/).length;
  const bodyChars = bodyMd.length;

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

    try {
      setSaving(true);
      const payload = {
        slug: slug.trim().toLowerCase(),
        title: title.trim(),
        description: description.trim(),
        category,
        kind: !isAdmin ? ('style' as SkillKind) : kind,
        scope: !isAdmin ? ('USER' as SkillScope) : scope,
        erp_type: scope === 'ERP' || scope === 'TENANT' ? erpType.trim().toLowerCase() : null,
        tenant_key: scope === 'TENANT' ? tenantKey.trim().toUpperCase() : null,
        body_md: bodyMd,
        references_json: referencesJson,
        mapped_tools: finalTools,
        comment: versionComment.trim() || undefined,
      };

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
        onClick={(e) => e.stopPropagation()}
        style={{
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
                : 'Format standardisé SKILL.md (niveau 1 : index, niveau 2 : instructions, niveau 3 : références).'}
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
            <Wrench size={14} /> Instructions & Outils
          </button>

          <button
            type="button"
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
        </div>

        {/* Body */}
        <form
          id="skill-editor-form"
          onSubmit={handleSave}
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
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
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

                <div>
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

              {/* Category, Kind, Scope */}
              <div style={{ display: 'grid', gridTemplateColumns: isAdmin ? '1fr 1fr 1fr' : '1fr 1fr', gap: '14px' }}>
                <div>
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

                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#00E5C8', marginBottom: '6px' }}>
                    Type de compétence
                  </label>
                  <select
                    value={!isAdmin ? 'style' : kind}
                    disabled={!isAdmin}
                    onChange={(e) => setKind(e.target.value as SkillKind)}
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

                {isAdmin && (
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#00E5C8', marginBottom: '6px' }}>
                      Portée
                    </label>
                    <select
                      value={scope}
                      onChange={(e) => setScope(e.target.value as SkillScope)}
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
                      <option value="TENANT" disabled={!activeClientId}>
                        Organisation {activeClientId ? `(${activeClientId})` : '(Connexion ERP requise)'}
                      </option>
                      <option value="ERP" disabled={!activeErpType}>
                        ERP {activeErpType ? `(${activeErpType.toUpperCase()})` : '(Connexion ERP requise)'}
                      </option>
                      <option value="GLOBAL">Plateforme Globale (Tous les utilisateurs)</option>
                    </select>
                  </div>
                )}
              </div>

              {/* Admin extra selectors for TENANT / ERP */}
              {isAdmin && (scope === 'TENANT' || scope === 'ERP') && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  {scope === 'TENANT' && (
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#00E5C8', marginBottom: '6px' }}>
                        Organisation active *
                      </label>
                      <input
                        type="text"
                        value={activeClientId || tenantKey}
                        readOnly
                        style={{
                          width: '100%',
                          padding: '9px 12px',
                          borderRadius: '8px',
                          background: 'rgba(255,255,255,0.04)',
                          border: '1px solid rgba(0, 229, 200, 0.35)',
                          color: '#94a3b8',
                          fontSize: '13px',
                        }}
                      />
                    </div>
                  )}

                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#00E5C8', marginBottom: '6px' }}>
                      ERP connecté
                    </label>
                    <input
                      type="text"
                      value={(activeErpType || erpType).toLowerCase()}
                      readOnly
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        borderRadius: '8px',
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid rgba(255,255,255,0.12)',
                        color: '#94a3b8',
                        fontSize: '13px',
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Description with counters */}
              <div>
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
              <div>
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

              {/* Version comment input for shared scopes */}
              {scope !== 'USER' && (
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#00E5C8', marginBottom: '6px' }}>
                    Commentaire de version *
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
                ? `Nouveau skill personnel (${slug ? `/${slug}` : 'invoquable via /'})`
                : mode === 'customize'
                ? 'Copie personnelle isolée prioritaire sur la version globale'
                : `Incrémente automatiquement vers la version v${(initialSkill?.version || 1) + 1}`}
            </span>
          </div>

          {/* Right actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
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
                disabled={saving || descChars < 20 || descChars > 1024 || hasForbiddenAngles || bodyLines > 500}
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
                  opacity:
                    saving || descChars < 20 || descChars > 1024 || hasForbiddenAngles || bodyLines > 500
                      ? 0.5
                      : 1,
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
