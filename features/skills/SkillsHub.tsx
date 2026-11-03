'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Sparkles,
  Plus,
  Search,
  Edit3,
  RotateCcw,
  Trash2,
  Download,
  Upload,
  CheckCircle2,
  SlidersHorizontal,
  FileText,
  FileArchive,
  Link as LinkIcon,
  Code,
  X,
  AlertCircle,
  FileUp,
  Copy,
  ArrowRight,
  Terminal,
} from 'lucide-react';
import {
  InstalledSkillItem,
  DiscoverSkillItem,
  SkillDetail,
  SkillScope,
  fetchDiscoverSkills,
  fetchSkillDetail,
  toggleSkill,
  deleteSkill,
  removeSkillFromSpace,
  exportSkillMd,
  exportSkillZip,
  importSkillMd,
} from '@/shared/api/skills-api';
import { useSkills } from '@/shared/contexts/SkillsContext';
import { useConnections } from '@/shared/contexts/ConnectionsContext';
import { useToast } from '@/shared/contexts/ToastContext';
import { isVmindAdmin } from '@/shared/utils/isAdmin';
import { SkillEditor } from './SkillEditor';
import { SkillDetailView } from './SkillDetailView';
import './skills-premium.css';

const SCOPE_BADGE_META: Record<
  SkillScope,
  { label: string; color: string; bg: string; border: string }
> = {
  USER: {
    label: 'Personnel (Moi)',
    color: '#c084fc',
    bg: 'rgba(192, 132, 252, 0.12)',
    border: 'rgba(192, 132, 252, 0.35)',
  },
  TENANT: {
    label: 'Organisation',
    color: '#38bdf8',
    bg: 'rgba(56, 189, 248, 0.12)',
    border: 'rgba(56, 189, 248, 0.35)',
  },
  ERP: {
    label: 'ERP',
    color: '#00E5C8',
    bg: 'rgba(0, 229, 200, 0.12)',
    border: 'rgba(0, 229, 200, 0.35)',
  },
  GLOBAL: {
    label: 'Plateforme',
    color: '#94a3b8',
    bg: 'rgba(148, 163, 184, 0.12)',
    border: 'rgba(148, 163, 184, 0.3)',
  },
};

const CATEGORY_OPTIONS = [
  { value: 'all', label: 'Toutes les catégories' },
  { value: 'finance', label: 'Finance & Comptabilité' },
  { value: 'commercial', label: 'Commercial & Ventes' },
  { value: 'operations', label: 'Opérations & Exploitation' },
  { value: 'achats', label: 'Achats & Fournisseurs' },
  { value: 'logistique', label: 'Logistique & Transport' },
  { value: 'productivite', label: 'Productivité & Style' },
  { value: 'autre', label: 'Autre' },
];

export const SkillsHub: React.FC = () => {
  const { installedSkills, loading, refreshSkills, handleToggleSkillForMe } = useSkills();
  const { activeConnection } = useConnections();
  const { showToast } = useToast();

  const [tab, setTab] = useState<'installed' | 'discover'>('installed');
  const [scopeFilter, setScopeFilter] = useState<'all' | 'mine' | 'shared'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  const [discoverList, setDiscoverList] = useState<DiscoverSkillItem[]>([]);
  const [loadingDiscover, setLoadingDiscover] = useState(false);

  const [isAdmin, setIsAdmin] = useState(false);

  // Modal state
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorMode, setEditorMode] = useState<'create' | 'edit' | 'customize'>('create');
  const [editingSkill, setEditingSkill] = useState<SkillDetail | null>(null);
  const [inspectingSkill, setInspectingSkill] = useState<SkillDetail | null>(null);
  const [inspectingTab, setInspectingTab] = useState<'apercu' | 'contenu' | 'skills' | 'connecteurs'>('apercu');

  // Import Modal state (.md / .zip / https:// URL)
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importTab, setImportTab] = useState<'file' | 'url' | 'text'>('file');
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importUrl, setImportUrl] = useState('');
  const [importMarkdownText, setImportMarkdownText] = useState('');
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'https://localhost:3001';
    fetch(`${baseUrl}/api/auth/vmind/me`, { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.user) {
          setIsAdmin(isVmindAdmin(data.user));
        }
      })
      .catch(() => {});
  }, []);

  const loadDiscover = useCallback(async () => {
    try {
      setLoadingDiscover(true);
      const items = await fetchDiscoverSkills({
        q: searchQuery,
        category: categoryFilter,
        connectionId: activeConnection?.id ?? null,
      });
      setDiscoverList(items);
    } catch {
      setDiscoverList([]);
    } finally {
      setLoadingDiscover(false);
    }
  }, [searchQuery, categoryFilter, activeConnection?.id]);

  useEffect(() => {
    loadDiscover();
  }, [loadDiscover]);

  const handleOpenInspect = async (
    item: InstalledSkillItem | DiscoverSkillItem,
    targetTab: 'apercu' | 'contenu' | 'skills' | 'connecteurs' = 'apercu'
  ) => {
    try {
      const detail = await fetchSkillDetail(item.slug, activeConnection?.id ?? null);
      setInspectingTab(targetTab);
      setInspectingSkill(detail);
    } catch (err: any) {
      showToast(err.message || 'Impossible de charger les détails du skill.', 'error');
    }
  };

  const handleOpenCreate = () => {
    setEditingSkill(null);
    setEditorMode('create');
    setEditorOpen(true);
  };

  const handleOpenEditOrCustomize = async (
    item: InstalledSkillItem | DiscoverSkillItem,
    mode: 'edit' | 'customize'
  ) => {
    try {
      const detail = await fetchSkillDetail(item.slug, activeConnection?.id ?? null);
      setEditingSkill(detail);
      setEditorMode(mode);
      setEditorOpen(true);
    } catch (err: any) {
      showToast(err.message || 'Impossible de charger les détails du skill.', 'error');
    }
  };

  const handleAddToSpace = async (item: DiscoverSkillItem) => {
    try {
      await toggleSkill(item.slug, { enabled: true, for: 'me' });
      await Promise.all([refreshSkills(), loadDiscover()]);
      showToast(`Skill /${item.slug} ajouté à votre espace.`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Impossible d\'ajouter ce skill à votre espace.', 'error');
    }
  };

  const handleRemoveFromSpace = async (item: InstalledSkillItem) => {
    try {
      await removeSkillFromSpace(item.slug);
      await Promise.all([refreshSkills(), loadDiscover()]);
      showToast(`Skill /${item.slug} retiré de votre espace (disponible dans le Catalogue).`, 'info');
    } catch (err: any) {
      showToast(err.message || 'Impossible de retirer ce skill de votre espace.', 'error');
    }
  };

  const handleRestoreDefault = async (item: InstalledSkillItem) => {
    try {
      await deleteSkill(item.id);
      await Promise.all([refreshSkills(), loadDiscover()]);
      showToast(`Surcharge supprimée : /${item.slug} est revenu à la version par défaut.`, 'info');
    } catch (err: any) {
      showToast(err.message || 'Impossible de restaurer le skill par défaut.', 'error');
    }
  };

  const handleDeletePersonalSkill = async (item: InstalledSkillItem) => {
    try {
      await deleteSkill(item.id);
      await Promise.all([refreshSkills(), loadDiscover()]);
      showToast(`Skill /${item.slug} supprimé.`, 'info');
    } catch (err: any) {
      showToast(err.message || 'Impossible de supprimer ce skill.', 'error');
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} o`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} Mo`;
  };

  const validateAndStageFile = (file: File): boolean => {
    setImportErrors([]);
    if (file.size > 1_048_576) {
      const msg = 'Le fichier dépasse la taille maximale autorisée de 1 Mo.';
      setImportErrors([msg]);
      showToast(msg, 'error');
      return false;
    }

    const lowerName = file.name.toLowerCase();
    if (!lowerName.endsWith('.md') && !lowerName.endsWith('.zip')) {
      const msg = `Format de fichier refusé ("${file.name}"). Seuls les fichiers .md et .zip sont acceptés.`;
      setImportErrors([msg]);
      showToast(msg, 'error');
      return false;
    }

    setSelectedFile(file);
    return true;
  };

  const handleExecuteFileImport = async (fileToImport?: File) => {
    const targetFile = fileToImport || selectedFile;
    if (!targetFile) {
      setImportErrors(['Veuillez sélectionner ou glisser-déposer un fichier .md ou .zip.']);
      return;
    }

    setImportErrors([]);
    try {
      setImporting(true);
      const lowerName = targetFile.name.toLowerCase();
      let imported: any;
      if (lowerName.endsWith('.zip')) {
        const arrayBuffer = await targetFile.arrayBuffer();
        const bytes = new Uint8Array(arrayBuffer);
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        const zipBase64 = btoa(binary);
        imported = await importSkillMd({ zipBase64, scope: 'USER' });
      } else {
        const content = await targetFile.text();
        imported = await importSkillMd({ content, scope: 'USER' });
      }
      await refreshSkills();
      setImportModalOpen(false);
      setSelectedFile(null);
      setImportUrl('');
      setImportMarkdownText('');
      showToast(`Skill /${imported.slug} importé avec succès dans vos skills personnels !`, 'success');
    } catch (err: any) {
      const lines = String(err.message || 'Fichier invalide.').split('\n').filter(Boolean);
      setImportErrors(lines);
      showToast(lines[0] || 'Import refusé.', 'error');
    } finally {
      setImporting(false);
    }
  };

  const handleImportSubmitUrl = async () => {
    setImportErrors([]);
    if (!importUrl.trim()) {
      setImportErrors(['Veuillez saisir une URL sécurisée commençant par https://']);
      return;
    }

    try {
      setImporting(true);
      const imported = await importSkillMd({
        url: importUrl.trim(),
        scope: 'USER',
      });
      await refreshSkills();
      setImportModalOpen(false);
      setImportUrl('');
      setImportMarkdownText('');
      setSelectedFile(null);
      showToast(`Skill /${imported.slug} importé dans vos skills personnels !`, 'success');
    } catch (err: any) {
      const lines = String(err.message || 'Import refusé.').split('\n').filter(Boolean);
      setImportErrors(lines);
    } finally {
      setImporting(false);
    }
  };

  const handleImportSubmitText = async () => {
    setImportErrors([]);
    if (!importMarkdownText.trim()) {
      setImportErrors(['Veuillez coller le contenu Markdown (avec frontmatter YAML).']);
      return;
    }

    try {
      setImporting(true);
      const imported = await importSkillMd({
        content: importMarkdownText.trim(),
        scope: 'USER',
      });
      await refreshSkills();
      setImportModalOpen(false);
      setImportUrl('');
      setImportMarkdownText('');
      setSelectedFile(null);
      showToast(`Skill /${imported.slug} importé dans vos skills personnels !`, 'success');
    } catch (err: any) {
      const lines = String(err.message || 'Import refusé.').split('\n').filter(Boolean);
      setImportErrors(lines);
    } finally {
      setImporting(false);
    }
  };

  const handleInsertTemplate = () => {
    setImportMarkdownText(`---
name: mon-nouveau-skill
description: Description détaillée et claire du skill (minimum 20 caractères)
category: productivite
kind: style
---

# Objectif
Décrivez ici les instructions spécifiques pour ce skill...

## Directives
1. Analyser les données fournies
2. Structurer le résultat selon les règles métier
`);
  };

  const filteredInstalled = installedSkills.filter((s) => {
    if (scopeFilter === 'mine' && s.scope !== 'USER') return false;
    if (scopeFilter === 'shared' && s.scope === 'USER') return false;
    if (categoryFilter !== 'all' && s.category !== categoryFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      return (
        s.slug.toLowerCase().includes(q) ||
        s.title.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q)
      );
    }
    return true;
  });

  if (inspectingSkill) {
    return (
      <>
        <SkillDetailView
          skill={inspectingSkill}
          isAdmin={isAdmin}
          activeConnectionId={activeConnection?.id ?? null}
          initialTab={inspectingTab}
          onBack={() => setInspectingSkill(null)}
          onToggle={async (slug, enabled) => {
            await handleToggleSkillForMe(slug, enabled);
            setInspectingSkill((prev) => (prev ? { ...prev, enabled } : null));
          }}
          onEdit={(sk) => handleOpenEditOrCustomize(sk, 'edit')}
          onCustomize={(sk) => handleOpenEditOrCustomize(sk, 'customize')}
          onDelete={async (sk) => {
            if (sk.is_personal_owner && !sk.has_lower_scope_default) {
              await handleDeletePersonalSkill(sk as any);
            } else {
              await handleRemoveFromSpace(sk as any);
            }
            setInspectingSkill(null);
          }}
          onSkillUpdated={async () => {
            await Promise.all([refreshSkills(), loadDiscover()]);
            if (inspectingSkill) {
              try {
                const reloaded = await fetchSkillDetail(inspectingSkill.slug, activeConnection?.id ?? null);
                setInspectingSkill(reloaded);
              } catch {
                // ignore
              }
            }
          }}
        />

        <SkillEditor
          isOpen={editorOpen}
          onClose={() => setEditorOpen(false)}
          onSaved={async () => {
            await Promise.all([refreshSkills(), loadDiscover()]);
            if (inspectingSkill) {
              try {
                const reloaded = await fetchSkillDetail(inspectingSkill.slug, activeConnection?.id ?? null);
                setInspectingSkill(reloaded);
              } catch {}
            }
          }}
          initialSkill={editingSkill}
          mode={editorMode}
          isAdmin={isAdmin}
          activeConnectionId={activeConnection?.id ?? null}
          activeErpType={activeConnection?.connector_type ?? null}
          activeClientId={activeConnection?.client_id ?? null}
        />
      </>
    );
  }

  return (
    <div
      className="sk-page"
      style={{
        height: '100%',
        overflowY: 'auto',
        overflowX: 'hidden',
        background: '#04070F',
        color: '#e8eef7',
        position: 'relative',
      }}
    >
      <div className="sk-ambient" />
      <div className="sk-grid-bg" />

      <div
        className="sk-content"
        style={{
          position: 'relative',
          zIndex: 1,
          maxWidth: '1480px',
          margin: '0 auto',
          padding: '36px 40px 64px',
        }}
      >
        {/* Top Hero Header */}
        <div
          className="sk-hero"
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            gap: '24px',
            marginBottom: '28px',
          }}
        >
          <div>
            <div
              className="sk-eyebrow"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '5px 12px',
                borderRadius: '999px',
                border: '1px solid rgba(0, 229, 200, 0.25)',
                background: 'rgba(0, 229, 200, 0.08)',
                color: '#00E5C8',
                fontSize: '11px',
                fontWeight: 750,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                marginBottom: '12px',
              }}
            >
              <div
                className="sk-eyebrow-dot"
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: '#00E5C8',
                  boxShadow: '0 0 10px #00E5C8',
                }}
              />
              <Sparkles size={12} />
              <span>VMIND Intelligence Engine</span>
            </div>
            <h1
              className="sk-title"
              style={{
                margin: 0,
                fontSize: '32px',
                fontWeight: 800,
                letterSpacing: '-0.03em',
                color: '#ffffff',
              }}
            >
              Skills &amp;{' '}
              <span
                className="sk-title-accent"
                style={{
                  background: 'linear-gradient(90deg, #00E5C8 0%, #38bdf8 50%, #a855f7 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                Compétences IA
              </span>
            </h1>
            <p
              className="sk-subtitle"
              style={{
                margin: '8px 0 0',
                maxWidth: '640px',
                fontSize: '13.5px',
                lineHeight: 1.6,
                color: '#94a3b8',
              }}
            >
              Pilotez vos méthodologies métier augmentées et les connecteurs ERP actifs. Invoquez
              n&apos;importe quelle capacité instantanément en tapant{' '}
              <span
                className="sk-kbd"
                style={{
                  padding: '2px 6px',
                  borderRadius: '4px',
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  color: '#00E5C8',
                  fontFamily: 'monospace',
                  fontSize: '11.5px',
                  fontWeight: 700,
                }}
              >
                /
              </span>{' '}
              dans le chat.
            </p>
          </div>

          <div
            className="sk-hero-actions"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
            }}
          >
            <button
              type="button"
              onClick={() => {
                setImportErrors([]);
                setImportModalOpen(true);
              }}
              className="sk-btn sk-btn-glass"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                height: '40px',
                padding: '0 16px',
                borderRadius: '10px',
                border: '1px solid rgba(148, 163, 184, 0.2)',
                background: 'rgba(255, 255, 255, 0.04)',
                color: '#e2e8f0',
                fontSize: '13px',
                fontWeight: 650,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              <Upload size={14} color="#00E5C8" />
              <span>Importer un Skill</span>
            </button>

            <button
              type="button"
              onClick={handleOpenCreate}
              className="sk-btn sk-btn-primary"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                height: '40px',
                padding: '0 20px',
                borderRadius: '10px',
                border: 'none',
                background: 'linear-gradient(135deg, #00E5C8 0%, #21F3D6 100%)',
                color: '#021010',
                fontSize: '13px',
                fontWeight: 800,
                cursor: 'pointer',
                boxShadow: '0 10px 30px -10px rgba(0, 229, 200, 0.75)',
                transition: 'all 0.2s ease',
              }}
            >
              <Plus size={15} />
              <span>Nouveau Skill Personnel</span>
            </button>
          </div>
        </div>

        {/* KPI Stats Strip */}
        <div
          className="sk-stats"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '14px',
            marginBottom: '28px',
          }}
        >
          <div
            className="sk-stat"
            style={{
              padding: '16px 20px',
              borderRadius: '14px',
              background: 'linear-gradient(165deg, rgba(14, 22, 40, 0.8) 0%, rgba(8, 13, 25, 0.9) 100%)',
              border: '1px solid rgba(0, 229, 200, 0.25)',
              boxShadow: '0 10px 30px -10px rgba(0, 0, 0, 0.5)',
              backdropFilter: 'blur(10px)',
            }}
          >
            <div
              className="sk-stat-label"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '11.5px',
                fontWeight: 700,
                color: '#94a3b8',
                marginBottom: '8px',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
              }}
            >
              <Sparkles size={14} color="#00E5C8" />
              <span>Skills Installés</span>
            </div>
            <div
              className="sk-stat-value"
              style={{
                fontSize: '26px',
                fontWeight: 800,
                color: '#ffffff',
                display: 'flex',
                alignItems: 'baseline',
                gap: '6px',
              }}
            >
              {installedSkills.length}
              <span
                className="sk-stat-hint"
                style={{
                  fontSize: '12px',
                  fontWeight: 500,
                  color: '#64748b',
                }}
              >
                / {installedSkills.length + discoverList.length} au catalogue
              </span>
            </div>
          </div>

          <div
            className="sk-stat"
            style={{
              padding: '16px 20px',
              borderRadius: '14px',
              background: 'linear-gradient(165deg, rgba(14, 22, 40, 0.8) 0%, rgba(8, 13, 25, 0.9) 100%)',
              border: '1px solid rgba(33, 243, 214, 0.25)',
              boxShadow: '0 10px 30px -10px rgba(0, 0, 0, 0.5)',
              backdropFilter: 'blur(10px)',
            }}
          >
            <div
              className="sk-stat-label"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '11.5px',
                fontWeight: 700,
                color: '#94a3b8',
                marginBottom: '8px',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
              }}
            >
              <CheckCircle2 size={14} color="#21f3d6" />
              <span>Actifs en Session</span>
            </div>
            <div
              className="sk-stat-value"
              style={{
                fontSize: '26px',
                fontWeight: 800,
                color: '#21f3d6',
                display: 'flex',
                alignItems: 'baseline',
                gap: '6px',
              }}
            >
              {installedSkills.filter((s) => s.enabled).length}
              <span
                className="sk-stat-hint"
                style={{
                  fontSize: '12px',
                  fontWeight: 500,
                  color: '#64748b',
                }}
              >
                actifs
              </span>
            </div>
          </div>

          <div
            className="sk-stat"
            style={{
              padding: '16px 20px',
              borderRadius: '14px',
              background: 'linear-gradient(165deg, rgba(14, 22, 40, 0.8) 0%, rgba(8, 13, 25, 0.9) 100%)',
              border: '1px solid rgba(251, 191, 36, 0.25)',
              boxShadow: '0 10px 30px -10px rgba(0, 0, 0, 0.5)',
              backdropFilter: 'blur(10px)',
            }}
          >
            <div
              className="sk-stat-label"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '11.5px',
                fontWeight: 700,
                color: '#94a3b8',
                marginBottom: '8px',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
              }}
            >
              <SlidersHorizontal size={14} color="#fbbf24" />
              <span>Méthodes Métier ERP</span>
            </div>
            <div
              className="sk-stat-value"
              style={{
                fontSize: '26px',
                fontWeight: 800,
                color: '#fbbf24',
                display: 'flex',
                alignItems: 'baseline',
                gap: '6px',
              }}
            >
              {installedSkills.filter((s) => s.kind === 'method' || s.scope === 'ERP').length}
              <span
                className="sk-stat-hint"
                style={{
                  fontSize: '12px',
                  fontWeight: 500,
                  color: '#64748b',
                }}
              >
                connectées
              </span>
            </div>
          </div>

          <div
            className="sk-stat"
            style={{
              padding: '16px 20px',
              borderRadius: '14px',
              background: 'linear-gradient(165deg, rgba(14, 22, 40, 0.8) 0%, rgba(8, 13, 25, 0.9) 100%)',
              border: '1px solid rgba(192, 132, 252, 0.25)',
              boxShadow: '0 10px 30px -10px rgba(0, 0, 0, 0.5)',
              backdropFilter: 'blur(10px)',
            }}
          >
            <div
              className="sk-stat-label"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '11.5px',
                fontWeight: 700,
                color: '#94a3b8',
                marginBottom: '8px',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
              }}
            >
              <Code size={14} color="#c084fc" />
              <span>Skills Personnels</span>
            </div>
            <div
              className="sk-stat-value"
              style={{
                fontSize: '26px',
                fontWeight: 800,
                color: '#c084fc',
                display: 'flex',
                alignItems: 'baseline',
                gap: '6px',
              }}
            >
              {installedSkills.filter((s) => s.scope === 'USER').length}
              <span
                className="sk-stat-hint"
                style={{
                  fontSize: '12px',
                  fontWeight: 500,
                  color: '#64748b',
                }}
              >
                sur-mesure
              </span>
            </div>
          </div>
        </div>

        {/* Toolbar: Segmented Controls + Chips + Search */}
        <div
          className="sk-toolbar"
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
            marginBottom: '24px',
          }}
        >
          <div
            className="sk-toolbar-group"
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              gap: '12px',
            }}
          >
            {/* Main Tab Segment */}
            <div
              className="sk-segment"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '4px',
                borderRadius: '12px',
                background: 'rgba(8, 14, 26, 0.85)',
                border: '1px solid rgba(148, 163, 184, 0.16)',
              }}
            >
              <button
                type="button"
                onClick={() => setTab('installed')}
                className={`sk-segment-btn ${tab === 'installed' ? 'is-active' : ''}`}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  height: '34px',
                  padding: '0 15px',
                  borderRadius: '9px',
                  border: tab === 'installed' ? '1px solid rgba(0, 229, 200, 0.5)' : '1px solid transparent',
                  background: tab === 'installed' ? 'linear-gradient(135deg, rgba(0, 229, 200, 0.2) 0%, rgba(33, 243, 214, 0.08) 100%)' : 'transparent',
                  color: tab === 'installed' ? '#00E5C8' : '#94a3b8',
                  fontSize: '12.5px',
                  fontWeight: tab === 'installed' ? 700 : 500,
                  cursor: 'pointer',
                  boxShadow: tab === 'installed' ? '0 0 16px rgba(0, 229, 200, 0.32), inset 0 1px 0 rgba(255, 255, 255, 0.15)' : 'none',
                  transition: 'all 0.2s cubic-bezier(0.22, 1, 0.36, 1)',
                }}
                onMouseEnter={(e) => {
                  if (tab !== 'installed') {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)';
                    e.currentTarget.style.color = '#ffffff';
                    e.currentTarget.style.borderColor = 'rgba(148, 163, 184, 0.3)';
                    e.currentTarget.style.boxShadow = '0 0 12px rgba(255, 255, 255, 0.08)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (tab !== 'installed') {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color = '#94a3b8';
                    e.currentTarget.style.borderColor = 'transparent';
                    e.currentTarget.style.boxShadow = 'none';
                  }
                }}
              >
                <span>Installés</span>
                <span
                  className="sk-count"
                  style={{
                    padding: '1px 7px',
                    borderRadius: '99px',
                    fontSize: '11px',
                    fontWeight: 700,
                    background: tab === 'installed' ? 'rgba(0, 229, 200, 0.25)' : 'rgba(255, 255, 255, 0.08)',
                    color: tab === 'installed' ? '#00E5C8' : '#94a3b8',
                    border: tab === 'installed' ? '1px solid rgba(0, 229, 200, 0.45)' : '1px solid rgba(255, 255, 255, 0.1)',
                    boxShadow: tab === 'installed' ? '0 0 8px rgba(0, 229, 200, 0.35)' : 'none',
                  }}
                >
                  {installedSkills.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setTab('discover')}
                className={`sk-segment-btn ${tab === 'discover' ? 'is-active' : ''}`}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  height: '34px',
                  padding: '0 15px',
                  borderRadius: '9px',
                  border: tab === 'discover' ? '1px solid rgba(0, 229, 200, 0.5)' : '1px solid transparent',
                  background: tab === 'discover' ? 'linear-gradient(135deg, rgba(0, 229, 200, 0.2) 0%, rgba(33, 243, 214, 0.08) 100%)' : 'transparent',
                  color: tab === 'discover' ? '#00E5C8' : '#94a3b8',
                  fontSize: '12.5px',
                  fontWeight: tab === 'discover' ? 700 : 500,
                  cursor: 'pointer',
                  boxShadow: tab === 'discover' ? '0 0 16px rgba(0, 229, 200, 0.32), inset 0 1px 0 rgba(255, 255, 255, 0.15)' : 'none',
                  transition: 'all 0.2s cubic-bezier(0.22, 1, 0.36, 1)',
                }}
                onMouseEnter={(e) => {
                  if (tab !== 'discover') {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)';
                    e.currentTarget.style.color = '#ffffff';
                    e.currentTarget.style.borderColor = 'rgba(148, 163, 184, 0.3)';
                    e.currentTarget.style.boxShadow = '0 0 12px rgba(255, 255, 255, 0.08)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (tab !== 'discover') {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color = '#94a3b8';
                    e.currentTarget.style.borderColor = 'transparent';
                    e.currentTarget.style.boxShadow = 'none';
                  }
                }}
              >
                <span>Catalogue &amp; Découverte</span>
                {discoverList.length > 0 && (
                  <span
                    className="sk-count"
                    style={{
                      padding: '1px 7px',
                      borderRadius: '99px',
                      fontSize: '11px',
                      fontWeight: 700,
                      background: tab === 'discover' ? 'rgba(0, 229, 200, 0.25)' : 'rgba(255, 255, 255, 0.08)',
                      color: tab === 'discover' ? '#00E5C8' : '#94a3b8',
                      border: tab === 'discover' ? '1px solid rgba(0, 229, 200, 0.45)' : '1px solid rgba(255, 255, 255, 0.1)',
                      boxShadow: tab === 'discover' ? '0 0 8px rgba(0, 229, 200, 0.35)' : 'none',
                    }}
                  >
                    {discoverList.length}
                  </span>
                )}
              </button>
            </div>

            {/* Scope Filters (Installed only) */}
            {tab === 'installed' && (
              <div
                className="sk-chips"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '4px',
                  borderRadius: '12px',
                  background: 'rgba(8, 14, 26, 0.75)',
                  border: '1px solid rgba(148, 163, 184, 0.14)',
                }}
              >
                {[
                  { id: 'all', label: 'Tous', color: '#00E5C8' },
                  { id: 'mine', label: 'Mes Skills (Personnel)', color: '#c084fc' },
                  { id: 'shared', label: 'Partagés (ERP / Org / Global)', color: '#38bdf8' },
                ].map((opt) => {
                  const isActive = scopeFilter === opt.id;
                  const activeBg =
                    opt.id === 'mine'
                      ? 'linear-gradient(135deg, rgba(167, 139, 250, 0.22) 0%, rgba(124, 92, 255, 0.08) 100%)'
                      : opt.id === 'shared'
                      ? 'linear-gradient(135deg, rgba(56, 189, 248, 0.22) 0%, rgba(14, 165, 233, 0.08) 100%)'
                      : 'linear-gradient(135deg, rgba(0, 229, 200, 0.2) 0%, rgba(33, 243, 214, 0.08) 100%)';
                  const activeBorder =
                    opt.id === 'mine'
                      ? '1px solid rgba(167, 139, 250, 0.55)'
                      : opt.id === 'shared'
                      ? '1px solid rgba(56, 189, 248, 0.55)'
                      : '1px solid rgba(0, 229, 200, 0.5)';
                  const activeShadow =
                    opt.id === 'mine'
                      ? '0 0 14px rgba(167, 139, 250, 0.35)'
                      : opt.id === 'shared'
                      ? '0 0 14px rgba(56, 189, 248, 0.35)'
                      : '0 0 14px rgba(0, 229, 200, 0.35)';

                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setScopeFilter(opt.id as any)}
                      className={`sk-chip ${isActive ? 'is-active' : ''}`}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        height: '32px',
                        padding: '0 13px',
                        borderRadius: '8px',
                        border: isActive ? activeBorder : '1px solid transparent',
                        background: isActive ? activeBg : 'transparent',
                        color: isActive ? opt.color : '#94a3b8',
                        fontSize: '12px',
                        fontWeight: isActive ? 700 : 500,
                        cursor: 'pointer',
                        boxShadow: isActive ? activeShadow : 'none',
                        transition: 'all 0.18s cubic-bezier(0.22, 1, 0.36, 1)',
                      }}
                      onMouseEnter={(e) => {
                        if (!isActive) {
                          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)';
                          e.currentTarget.style.color = '#ffffff';
                          e.currentTarget.style.borderColor = 'rgba(148, 163, 184, 0.28)';
                          e.currentTarget.style.boxShadow = '0 0 10px rgba(255, 255, 255, 0.08)';
                          e.currentTarget.style.transform = 'translateY(-1px)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isActive) {
                          e.currentTarget.style.background = 'transparent';
                          e.currentTarget.style.color = '#94a3b8';
                          e.currentTarget.style.borderColor = 'transparent';
                          e.currentTarget.style.boxShadow = 'none';
                          e.currentTarget.style.transform = 'translateY(0)';
                        }
                      }}
                    >
                      <span>{opt.label}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Search & Category Filter */}
          <div
            className="sk-toolbar-group"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}
          >
            <div
              className="sk-search"
              style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <Search
                size={14}
                className="sk-search-icon"
                style={{
                  position: 'absolute',
                  left: '11px',
                  color: '#64748b',
                  pointerEvents: 'none',
                }}
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher un skill..."
                className="sk-input"
                style={{
                  width: '240px',
                  height: '36px',
                  padding: '0 32px 0 34px',
                  borderRadius: '10px',
                  border: '1px solid rgba(148, 163, 184, 0.2)',
                  background: 'rgba(8, 14, 26, 0.85)',
                  color: '#ffffff',
                  fontSize: '12.5px',
                  outline: 'none',
                }}
              />
              <span
                className="sk-kbd"
                style={{
                  position: 'absolute',
                  right: '9px',
                  padding: '2px 5px',
                  borderRadius: '4px',
                  background: 'rgba(255, 255, 255, 0.08)',
                  color: '#64748b',
                  fontSize: '10.5px',
                  fontFamily: 'monospace',
                  fontWeight: 700,
                  pointerEvents: 'none',
                }}
              >
                /
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <SlidersHorizontal size={14} color="#8FA3B8" />
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="sk-select"
                style={{
                  height: '36px',
                  padding: '0 14px',
                  borderRadius: '10px',
                  border: '1px solid rgba(148, 163, 184, 0.2)',
                  background: '#0b1426',
                  color: '#cbd5e1',
                  fontSize: '12.5px',
                  outline: 'none',
                  cursor: 'pointer',
                }}
              >
                {CATEGORY_OPTIONS.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

      {/* Content */}
      {tab === 'installed' ? (
        loading ? (
          <div style={{ padding: '48px', textAlign: 'center', color: '#8FA3B8' }}>
            Chargement de vos skills...
          </div>
        ) : filteredInstalled.length === 0 ? (
          <div
            style={{
              padding: '48px',
              textAlign: 'center',
              background: 'rgba(255,255,255,0.02)',
              borderRadius: '14px',
              border: '1px dashed rgba(255,255,255,0.1)',
              color: '#8FA3B8',
            }}
          >
            Aucun skill trouvé pour ce filtre. Créez un skill personnel avec le bouton &quot;Nouveau Skill Personnel&quot;.
          </div>
        ) : (
          <div className="sk-grid">
            {filteredInstalled.map((skill) => {
              const badge = SCOPE_BADGE_META[skill.scope] || SCOPE_BADGE_META.GLOBAL;
              const canEditDirectly = skill.is_personal_owner || isAdmin;
              const canCustomizeForSelf = !skill.is_personal_owner && (skill.kind === 'style' || isAdmin);

              const accentColor =
                skill.scope === 'USER'
                  ? '#c084fc'
                  : skill.scope === 'ERP'
                  ? '#00E5C8'
                  : skill.scope === 'TENANT'
                  ? '#38bdf8'
                  : '#94a3b8';

              const monogram =
                skill.kind === 'method'
                  ? '⚡'
                  : skill.category === 'finance'
                  ? '💰'
                  : skill.category === 'commercial'
                  ? '📈'
                  : skill.category === 'logistique'
                  ? '🚚'
                  : '✨';

              return (
                <div
                  key={`${skill.scope}-${skill.slug}-${skill.id}`}
                  className={`sk-card ${!skill.enabled ? 'is-disabled' : ''}`}
                  style={{ '--sk-accent': accentColor } as any}
                  onMouseMove={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    e.currentTarget.style.setProperty('--mx', `${e.clientX - rect.left}px`);
                    e.currentTarget.style.setProperty('--my', `${e.clientY - rect.top}px`);
                  }}
                >
                  {/* ÉTAGE 1 : TOP BAR (IMMOBILE & IMMÉDIATEMENT ACCESSIBLE) */}
                  <div className="sk-card-head">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                      <span
                        className="sk-badge"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          height: '24px',
                          padding: '0 10px',
                          borderRadius: '99px',
                          fontSize: '11px',
                          fontWeight: 700,
                          letterSpacing: '0.02em',
                          color: badge.color,
                          background: badge.bg,
                          border: `1px solid ${badge.border}`,
                        }}
                      >
                        <span
                          className="sk-badge-dot"
                          style={{
                            width: '6px',
                            height: '6px',
                            borderRadius: '50%',
                            background: badge.color,
                            boxShadow: `0 0 8px ${badge.color}`,
                          }}
                        />
                        {badge.label}
                        {skill.scope === 'ERP' && skill.erp_type ? ` (${skill.erp_type.toUpperCase()})` : ''}
                        {skill.scope === 'TENANT' && skill.tenant_key ? ` (${skill.tenant_key})` : ''}
                      </span>

                      <span
                        className="sk-badge"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          height: '24px',
                          padding: '0 9px',
                          borderRadius: '99px',
                          fontSize: '11px',
                          fontWeight: 600,
                          color: '#94a3b8',
                          background: 'rgba(255, 255, 255, 0.04)',
                          border: '1px solid rgba(148, 163, 184, 0.12)',
                        }}
                      >
                        {skill.kind === 'method' ? 'Méthode' : 'Style'} · v{skill.version}
                      </span>
                    </div>

                    {/* Luxury Switch (Rock Solid at top right) */}
                    <label
                      className="sk-switch"
                      title={skill.enabled ? 'Désactiver pour moi' : 'Activer pour moi'}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                        cursor: 'pointer',
                        userSelect: 'none',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={skill.enabled}
                        onChange={(e) => handleToggleSkillForMe(skill.slug, e.target.checked)}
                        style={{ display: 'none' }}
                      />
                      <span
                        className="sk-switch-track"
                        style={{
                          width: '38px',
                          height: '20px',
                          borderRadius: '99px',
                          background: skill.enabled
                            ? 'linear-gradient(135deg, #00E5C8 0%, #21F3D6 100%)'
                            : 'rgba(255, 255, 255, 0.12)',
                          boxShadow: skill.enabled ? '0 0 12px rgba(0, 229, 200, 0.5)' : 'none',
                          position: 'relative',
                          transition: 'all 0.2s ease',
                          display: 'inline-block',
                        }}
                      >
                        <span
                          style={{
                            position: 'absolute',
                            top: '2px',
                            left: skill.enabled ? '20px' : '2px',
                            width: '16px',
                            height: '16px',
                            borderRadius: '50%',
                            background: skill.enabled ? '#021010' : '#cbd5e1',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.4)',
                            transition: 'all 0.2s cubic-bezier(0.22, 1, 0.36, 1)',
                          }}
                        />
                      </span>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          color: skill.enabled ? '#00E5C8' : '#64748b',
                        }}
                      >
                        {skill.enabled ? 'Actif' : 'Inactif'}
                      </span>
                    </label>
                  </div>

                  {/* ÉTAGE 2 : CARTOUCHE CENTRALE (SEULE ZONE AVEC 3D FLIP) */}
                  <div className="sk-cartridge">
                    <div className="sk-cartridge-inner">
                      {/* Recto de la cartouche : Monogramme, Titre, Slug, Hint */}
                      <div
                        className="sk-cartridge-front"
                        onClick={() => handleOpenInspect(skill)}
                        title="Cliquer pour afficher les détails et le contenu"
                      >
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                          <div
                            className="sk-monogram"
                            style={{
                              width: '44px',
                              height: '44px',
                              borderRadius: '12px',
                              display: 'grid',
                              placeItems: 'center',
                              fontSize: '19px',
                              flexShrink: 0,
                              background: 'linear-gradient(145deg, rgba(0, 229, 200, 0.14), rgba(0, 229, 200, 0.03))',
                              border: '1px solid rgba(0, 229, 200, 0.28)',
                              boxShadow: '0 8px 20px -8px rgba(0, 229, 200, 0.45)',
                              color: accentColor,
                            }}
                          >
                            {monogram}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <h3
                              className="sk-card-title"
                              style={{
                                margin: 0,
                                fontSize: '15.5px',
                                fontWeight: 750,
                                color: '#ffffff',
                                letterSpacing: '-0.015em',
                                lineHeight: 1.3,
                              }}
                            >
                              {skill.title}
                            </h3>
                            <span
                              className="sk-slug"
                              style={{
                                display: 'inline-block',
                                marginTop: '4px',
                                fontFamily: 'monospace',
                                fontSize: '11.5px',
                                fontWeight: 700,
                                color: '#00E5C8',
                              }}
                            >
                              /{skill.slug}
                            </span>
                          </div>
                        </div>

                        {/* Invitation au survol 3D */}
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            marginTop: '10px',
                            color: '#64748b',
                            fontSize: '11px',
                            fontWeight: 600,
                            letterSpacing: '0.01em',
                          }}
                        >
                          <RotateCcw size={11} style={{ color: '#00E5C8' }} />
                          <span>Survoler pour voir la méthodologie</span>
                        </div>
                      </div>

                      {/* Verso de la cartouche : Méthodologie complète + Chat prompt pill */}
                      <div
                        className="sk-cartridge-back"
                        onClick={() => handleOpenInspect(skill)}
                        title="Cliquer pour afficher la documentation complète"
                        style={{ cursor: 'pointer' }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                          <span style={{ fontFamily: 'monospace', fontSize: '11.5px', fontWeight: 700, color: '#00E5C8' }}>
                            /{skill.slug}
                          </span>
                          <span
                            style={{
                              fontSize: '9.5px',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              background: 'rgba(0, 229, 200, 0.1)',
                              border: '1px solid rgba(0, 229, 200, 0.22)',
                              color: '#00E5C8',
                              fontWeight: 700,
                              textTransform: 'uppercase',
                              letterSpacing: '0.04em',
                            }}
                          >
                            {skill.category || 'GÉNÉRAL'}
                          </span>
                        </div>

                        <div className="sk-cartridge-desc">
                          <p style={{ margin: 0, fontSize: '12px', lineHeight: 1.55, color: '#e2e8f0', fontWeight: 400 }}>
                            {skill.description || 'Méthodologie standardisée de guidage et d\'automatisation pour ce flux métier.'}
                          </p>
                        </div>

                        <div
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            background: 'rgba(0, 229, 200, 0.08)',
                            border: '1px solid rgba(0, 229, 200, 0.22)',
                            color: '#00E5C8',
                            fontSize: '10.5px',
                            fontFamily: 'monospace',
                            fontWeight: 700,
                            alignSelf: 'flex-start',
                          }}
                        >
                          <Terminal size={10} />
                          <span>Tapez /{skill.slug}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* ÉTAGE 3 : COCKPIT DU BAS (IMMOBILE & IMMÉDIATEMENT ACCESSIBLE) */}
                  <div className="sk-card-footer">
                    {/* Left: Content file count button */}
                    <button
                      type="button"
                      onClick={() => handleOpenInspect(skill, 'contenu')}
                      title="Examiner les fichiers et instructions"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        height: '28px',
                        padding: '0 10px',
                        borderRadius: '8px',
                        border: '1px solid rgba(148, 163, 184, 0.16)',
                        background: 'rgba(255, 255, 255, 0.03)',
                        color: '#94a3b8',
                        fontSize: '11.5px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'all 0.18s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = 'rgba(0, 229, 200, 0.4)';
                        e.currentTarget.style.background = 'rgba(0, 229, 200, 0.08)';
                        e.currentTarget.style.color = '#00E5C8';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = 'rgba(148, 163, 184, 0.16)';
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                        e.currentTarget.style.color = '#94a3b8';
                      }}
                    >
                      <FileText size={12} color="#00E5C8" />
                      <span>{skill.references ? skill.references.length + 1 : 1} fichier{skill.references && skill.references.length > 0 ? 's' : ''}</span>
                    </button>

                    {/* Right: Actions Cluster */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {/* Edit or Customize button */}
                      {canEditDirectly ? (
                        <button
                          type="button"
                          onClick={() => handleOpenEditOrCustomize(skill, 'edit')}
                          title="Modifier ce skill"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            height: '28px',
                            padding: '0 11px',
                            borderRadius: '8px',
                            border: '1px solid rgba(148, 163, 184, 0.22)',
                            background: 'rgba(255, 255, 255, 0.04)',
                            color: '#e2e8f0',
                            fontSize: '11.5px',
                            fontWeight: 650,
                            cursor: 'pointer',
                            transition: 'all 0.18s ease',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = 'rgba(0, 229, 200, 0.5)';
                            e.currentTarget.style.background = 'rgba(0, 229, 200, 0.1)';
                            e.currentTarget.style.color = '#00E5C8';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = 'rgba(148, 163, 184, 0.22)';
                            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
                            e.currentTarget.style.color = '#e2e8f0';
                          }}
                        >
                          <Edit3 size={11} />
                          <span>Modifier</span>
                        </button>
                      ) : canCustomizeForSelf ? (
                        <button
                          type="button"
                          onClick={() => handleOpenEditOrCustomize(skill, 'customize')}
                          title="Personnaliser une copie pour moi"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            height: '28px',
                            padding: '0 11px',
                            borderRadius: '8px',
                            border: '1px solid rgba(167, 139, 250, 0.35)',
                            background: 'rgba(167, 139, 250, 0.1)',
                            color: '#ddd6fe',
                            fontSize: '11.5px',
                            fontWeight: 650,
                            cursor: 'pointer',
                            transition: 'all 0.18s ease',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = 'rgba(167, 139, 250, 0.7)';
                            e.currentTarget.style.background = 'rgba(167, 139, 250, 0.2)';
                            e.currentTarget.style.color = '#fff';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = 'rgba(167, 139, 250, 0.35)';
                            e.currentTarget.style.background = 'rgba(167, 139, 250, 0.1)';
                            e.currentTarget.style.color = '#ddd6fe';
                          }}
                        >
                          <Edit3 size={11} />
                          <span>Personnaliser</span>
                        </button>
                      ) : null}

                      {/* Reset override if personal has lower scope default */}
                      {skill.is_personal_owner && skill.has_lower_scope_default && (
                        <button
                          type="button"
                          onClick={() => handleRestoreDefault(skill)}
                          title="Restaurer la compétence globale par défaut"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '28px',
                            height: '28px',
                            borderRadius: '8px',
                            border: '1px solid rgba(251, 191, 36, 0.3)',
                            background: 'rgba(251, 191, 36, 0.08)',
                            color: '#fde68a',
                            cursor: 'pointer',
                            transition: 'all 0.18s ease',
                          }}
                        >
                          <RotateCcw size={12} />
                        </button>
                      )}

                      {/* Downloads Group: .md and .zip */}
                      <div
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          borderRadius: '8px',
                          border: '1px solid rgba(148, 163, 184, 0.16)',
                          background: 'rgba(255, 255, 255, 0.025)',
                          overflow: 'hidden',
                        }}
                      >
                        <button
                          type="button"
                          title="Télécharger Markdown (.md)"
                          onClick={() => exportSkillMd(skill.id, skill.slug)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '3px',
                            height: '28px',
                            padding: '0 8px',
                            border: 'none',
                            borderRight: '1px solid rgba(148, 163, 184, 0.14)',
                            background: 'transparent',
                            color: '#94a3b8',
                            fontSize: '11px',
                            fontWeight: 650,
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.color = '#38bdf8';
                            e.currentTarget.style.background = 'rgba(56, 189, 248, 0.1)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.color = '#94a3b8';
                            e.currentTarget.style.background = 'transparent';
                          }}
                        >
                          <Download size={10} />
                          <span>.md</span>
                        </button>

                        <button
                          type="button"
                          title="Télécharger Archive (.zip)"
                          onClick={() => exportSkillZip(skill.id, skill.slug)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '3px',
                            height: '28px',
                            padding: '0 8px',
                            border: 'none',
                            background: 'transparent',
                            color: '#94a3b8',
                            fontSize: '11px',
                            fontWeight: 650,
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.color = '#00E5C8';
                            e.currentTarget.style.background = 'rgba(0, 229, 200, 0.1)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.color = '#94a3b8';
                            e.currentTarget.style.background = 'transparent';
                          }}
                        >
                          <Download size={10} />
                          <span>.zip</span>
                        </button>
                      </div>

                      {/* Delete or Remove icon button */}
                      {skill.is_personal_owner && !skill.has_lower_scope_default ? (
                        <button
                          type="button"
                          title="Supprimer définitivement ce skill personnel"
                          onClick={() => handleDeletePersonalSkill(skill)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '28px',
                            height: '28px',
                            borderRadius: '8px',
                            border: '1px solid rgba(248, 113, 113, 0.22)',
                            background: 'rgba(239, 68, 68, 0.04)',
                            color: '#f87171',
                            cursor: 'pointer',
                            transition: 'all 0.18s ease',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = 'rgba(248, 113, 113, 0.6)';
                            e.currentTarget.style.background = 'rgba(239, 68, 68, 0.16)';
                            e.currentTarget.style.color = '#fff';
                            e.currentTarget.style.boxShadow = '0 0 12px rgba(239, 68, 68, 0.35)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = 'rgba(248, 113, 113, 0.22)';
                            e.currentTarget.style.background = 'rgba(239, 68, 68, 0.04)';
                            e.currentTarget.style.color = '#f87171';
                            e.currentTarget.style.boxShadow = 'none';
                          }}
                        >
                          <Trash2 size={12} />
                        </button>
                      ) : (!skill.is_personal_owner || skill.has_lower_scope_default) ? (
                        <button
                          type="button"
                          title="Retirer de mon espace (retour au catalogue)"
                          onClick={() => handleRemoveFromSpace(skill)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '28px',
                            height: '28px',
                            borderRadius: '8px',
                            border: '1px solid rgba(248, 113, 113, 0.22)',
                            background: 'rgba(239, 68, 68, 0.04)',
                            color: '#f87171',
                            cursor: 'pointer',
                            transition: 'all 0.18s ease',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = 'rgba(248, 113, 113, 0.6)';
                            e.currentTarget.style.background = 'rgba(239, 68, 68, 0.16)';
                            e.currentTarget.style.color = '#fff';
                            e.currentTarget.style.boxShadow = '0 0 12px rgba(239, 68, 68, 0.35)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = 'rgba(248, 113, 113, 0.22)';
                            e.currentTarget.style.background = 'rgba(239, 68, 68, 0.04)';
                            e.currentTarget.style.color = '#f87171';
                            e.currentTarget.style.boxShadow = 'none';
                          }}
                        >
                          <Trash2 size={12} />
                        </button>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : loadingDiscover ? (
        <div style={{ padding: '48px', textAlign: 'center', color: '#8FA3B8' }}>
          Chargement du catalogue...
        </div>
      ) : discoverList.length === 0 ? (
        <div
          style={{
            padding: '48px',
            textAlign: 'center',
            background: 'rgba(255,255,255,0.02)',
            borderRadius: '14px',
            border: '1px dashed rgba(255,255,255,0.1)',
            color: '#8FA3B8',
          }}
        >
          Tous les skills disponibles du catalogue sont déjà ajoutés dans votre espace &quot;Installés&quot;.
        </div>
      ) : (
        <div className="sk-grid">
          {discoverList.map((item) => {
            const badge = SCOPE_BADGE_META[item.scope] || SCOPE_BADGE_META.GLOBAL;
            const accentColor = item.scope === 'ERP' ? '#00E5C8' : '#38bdf8';
            const monogram = item.kind === 'method' ? '⚡' : '✨';

            return (
              <div
                key={`discover-${item.id}`}
                className="sk-card"
                style={{ '--sk-accent': accentColor } as any}
                onMouseMove={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  e.currentTarget.style.setProperty('--mx', `${e.clientX - rect.left}px`);
                  e.currentTarget.style.setProperty('--my', `${e.clientY - rect.top}px`);
                }}
              >
                {/* ÉTAGE 1 : TOP BAR (IMMOBILE & IMMÉDIATEMENT ACCESSIBLE) */}
                <div className="sk-card-head">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                    <span
                      className="sk-badge"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        height: '24px',
                        padding: '0 10px',
                        borderRadius: '99px',
                        fontSize: '11px',
                        fontWeight: 700,
                        letterSpacing: '0.02em',
                        color: badge.color,
                        background: badge.bg,
                        border: `1px solid ${badge.border}`,
                      }}
                    >
                      <span
                        className="sk-badge-dot"
                        style={{
                          width: '6px',
                          height: '6px',
                          borderRadius: '50%',
                          background: badge.color,
                          boxShadow: `0 0 8px ${badge.color}`,
                        }}
                      />
                      {badge.label}
                      {item.erp_type ? ` (${item.erp_type.toUpperCase()})` : ''}
                    </span>

                    <span
                      className="sk-badge"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        height: '24px',
                        padding: '0 9px',
                        borderRadius: '99px',
                        fontSize: '11px',
                        fontWeight: 600,
                        color: '#94a3b8',
                        background: 'rgba(255, 255, 255, 0.04)',
                        border: '1px solid rgba(148, 163, 184, 0.12)',
                      }}
                    >
                      {item.kind === 'method' ? 'Méthode' : 'Style'} · v{item.version}
                    </span>
                  </div>

                  <span
                    style={{
                      fontSize: '10px',
                      padding: '3px 8px',
                      borderRadius: '99px',
                      background: 'rgba(56, 189, 248, 0.12)',
                      border: '1px solid rgba(56, 189, 248, 0.3)',
                      color: '#38bdf8',
                      fontWeight: 700,
                      letterSpacing: '0.03em',
                    }}
                  >
                    CATALOGUE
                  </span>
                </div>

                {/* ÉTAGE 2 : CARTOUCHE CENTRALE (SEULE ZONE AVEC 3D FLIP) */}
                <div className="sk-cartridge">
                  <div className="sk-cartridge-inner">
                    {/* Recto de la cartouche : Monogramme, Titre, Slug, Hint */}
                    <div
                      className="sk-cartridge-front"
                      onClick={() => handleOpenInspect(item)}
                      title="Cliquer pour afficher les détails et le contenu"
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                        <div
                          className="sk-monogram"
                          style={{
                            width: '44px',
                            height: '44px',
                            borderRadius: '12px',
                            display: 'grid',
                            placeItems: 'center',
                            fontSize: '19px',
                            flexShrink: 0,
                            background: 'linear-gradient(145deg, rgba(0, 229, 200, 0.14), rgba(0, 229, 200, 0.03))',
                            border: '1px solid rgba(0, 229, 200, 0.28)',
                            boxShadow: '0 8px 20px -8px rgba(0, 229, 200, 0.45)',
                            color: accentColor,
                          }}
                        >
                          {monogram}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <h3
                            className="sk-card-title"
                            style={{
                              margin: 0,
                              fontSize: '15.5px',
                              fontWeight: 750,
                              color: '#ffffff',
                              letterSpacing: '-0.015em',
                              lineHeight: 1.3,
                            }}
                          >
                            {item.title}
                          </h3>
                          <span
                            className="sk-slug"
                            style={{
                              display: 'inline-block',
                              marginTop: '4px',
                              fontFamily: 'monospace',
                              fontSize: '11.5px',
                              fontWeight: 700,
                              color: '#00E5C8',
                            }}
                          >
                            /{item.slug}
                          </span>
                        </div>
                      </div>

                      {/* Invitation au survol 3D */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          marginTop: '10px',
                          color: '#64748b',
                          fontSize: '11px',
                          fontWeight: 600,
                          letterSpacing: '0.01em',
                        }}
                      >
                        <RotateCcw size={11} style={{ color: '#00E5C8' }} />
                        <span>Survoler pour voir la méthodologie</span>
                      </div>
                    </div>

                    {/* Verso de la cartouche : Méthodologie complète + Chat prompt pill */}
                    <div
                      className="sk-cartridge-back"
                      onClick={() => handleOpenInspect(item)}
                      title="Cliquer pour afficher la documentation complète"
                      style={{ cursor: 'pointer' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                        <span style={{ fontFamily: 'monospace', fontSize: '11.5px', fontWeight: 700, color: '#00E5C8' }}>
                          /{item.slug}
                        </span>
                        <span
                          style={{
                            fontSize: '9.5px',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            background: 'rgba(0, 229, 200, 0.1)',
                            border: '1px solid rgba(0, 229, 200, 0.22)',
                            color: '#00E5C8',
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            letterSpacing: '0.04em',
                          }}
                        >
                          {item.category || 'CATALOGUE'}
                        </span>
                      </div>

                      <div className="sk-cartridge-desc">
                        <p style={{ margin: 0, fontSize: '12px', lineHeight: 1.55, color: '#e2e8f0', fontWeight: 400 }}>
                          {item.description || 'Méthodologie standardisée de guidage et d\'automatisation pour ce flux métier.'}
                        </p>
                      </div>

                      <div
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          background: 'rgba(0, 229, 200, 0.08)',
                          border: '1px solid rgba(0, 229, 200, 0.22)',
                          color: '#00E5C8',
                          fontSize: '10.5px',
                          fontFamily: 'monospace',
                          fontWeight: 700,
                          alignSelf: 'flex-start',
                        }}
                      >
                        <Terminal size={10} />
                        <span>Tapez /{item.slug}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ÉTAGE 3 : COCKPIT DU BAS (IMMOBILE & IMMÉDIATEMENT ACCESSIBLE) */}
                <div className="sk-card-footer">
                  {/* Left: Content file count */}
                  <button
                    type="button"
                    onClick={() => handleOpenInspect(item, 'contenu')}
                    title="Examiner les fichiers et instructions"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      height: '28px',
                      padding: '0 10px',
                      borderRadius: '8px',
                      border: '1px solid rgba(148, 163, 184, 0.16)',
                      background: 'rgba(255, 255, 255, 0.03)',
                      color: '#94a3b8',
                      fontSize: '11.5px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all 0.18s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = 'rgba(0, 229, 200, 0.4)';
                      e.currentTarget.style.background = 'rgba(0, 229, 200, 0.08)';
                      e.currentTarget.style.color = '#00E5C8';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'rgba(148, 163, 184, 0.16)';
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                      e.currentTarget.style.color = '#94a3b8';
                    }}
                  >
                    <FileText size={12} color="#00E5C8" />
                    <span>{item.references ? item.references.length + 1 : 1} fichier{item.references && item.references.length > 0 ? 's' : ''}</span>
                  </button>

                  {/* Right: Actions */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <button
                      type="button"
                      onClick={() => handleAddToSpace(item)}
                      title="Installer dans mon espace de travail"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        height: '28px',
                        padding: '0 12px',
                        borderRadius: '8px',
                        border: 'none',
                        background: 'linear-gradient(135deg, #00E5C8 0%, #21F3D6 100%)',
                        color: '#021010',
                        fontSize: '11.5px',
                        fontWeight: 800,
                        cursor: 'pointer',
                        boxShadow: '0 6px 18px -4px rgba(0, 229, 200, 0.65)',
                        transition: 'all 0.18s ease',
                      }}
                    >
                      <Plus size={13} />
                      <span>Ajouter</span>
                    </button>

                    {(item.kind === 'style' || isAdmin) && (
                      <button
                        type="button"
                        title="Personnaliser une copie pour moi"
                        onClick={() => handleOpenEditOrCustomize(item, 'customize')}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          height: '28px',
                          padding: '0 9px',
                          borderRadius: '8px',
                          border: '1px solid rgba(167, 139, 250, 0.35)',
                          background: 'rgba(167, 139, 250, 0.1)',
                          color: '#ddd6fe',
                          fontSize: '11px',
                          fontWeight: 650,
                          cursor: 'pointer',
                        }}
                      >
                        <Copy size={11} />
                        <span>Copier</span>
                      </button>
                    )}

                    {/* Downloads Group */}
                    <div
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        borderRadius: '8px',
                        border: '1px solid rgba(148, 163, 184, 0.16)',
                        background: 'rgba(255, 255, 255, 0.025)',
                        overflow: 'hidden',
                      }}
                    >
                      <button
                        type="button"
                        title="Télécharger le fichier Markdown (.md)"
                        onClick={() => exportSkillMd(item.id, item.slug)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '3px',
                          height: '28px',
                          padding: '0 8px',
                          border: 'none',
                          borderRight: '1px solid rgba(148, 163, 184, 0.14)',
                          background: 'transparent',
                          color: '#94a3b8',
                          fontSize: '11px',
                          fontWeight: 650,
                          cursor: 'pointer',
                        }}
                      >
                        <Download size={10} />
                        <span>.md</span>
                      </button>

                      <button
                        type="button"
                        title="Télécharger l'archive (.zip)"
                        onClick={() => exportSkillZip(item.id, item.slug)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '3px',
                          height: '28px',
                          padding: '0 8px',
                          border: 'none',
                          background: 'transparent',
                          color: '#94a3b8',
                          fontSize: '11px',
                          fontWeight: 650,
                          cursor: 'pointer',
                        }}
                      >
                        <Download size={10} />
                        <span>.zip</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Import Modal (.md / .zip / https:// URL) with Drag & Drop */}
      {importModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: 'rgba(3, 7, 18, 0.82)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setImportModalOpen(false);
              setSelectedFile(null);
              setImportErrors([]);
            }
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '620px',
              background: 'linear-gradient(170deg, #0d1526 0%, #070d19 100%)',
              border: '1px solid rgba(0, 229, 200, 0.35)',
              borderRadius: '20px',
              padding: '26px 28px',
              boxShadow: '0 25px 70px rgba(0, 0, 0, 0.75), 0 0 35px rgba(0, 229, 200, 0.12)',
              position: 'relative',
              display: 'flex',
              flexDirection: 'column',
              gap: '18px',
            }}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '12px',
                    background: 'rgba(0, 229, 200, 0.12)',
                    border: '1px solid rgba(0, 229, 200, 0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#00E5C8',
                    boxShadow: '0 0 12px rgba(0, 229, 200, 0.2)',
                  }}
                >
                  <FileUp size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: '#ffffff', letterSpacing: '-0.01em' }}>
                    Importer un Skill
                  </h3>
                  <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#8fa3b8' }}>
                    Importez une procédure sous format <code>SKILL.md</code> ou une archive <code>.zip</code>
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setImportModalOpen(false);
                  setSelectedFile(null);
                  setImportErrors([]);
                }}
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  color: '#94a3b8',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                  e.currentTarget.style.color = '#fff';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                  e.currentTarget.style.color = '#94a3b8';
                }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Segmented Mode Selector */}
            <div
              style={{
                display: 'flex',
                gap: '6px',
                padding: '4px',
                background: 'rgba(15, 23, 42, 0.85)',
                borderRadius: '12px',
                border: '1px solid rgba(255, 255, 255, 0.08)',
              }}
            >
              {[
                { id: 'file', label: 'Fichier (.md, .zip)', icon: Upload },
                { id: 'url', label: 'Lien HTTPS', icon: LinkIcon },
                { id: 'text', label: 'Coller le Markdown', icon: Code },
              ].map((m) => {
                const IconComponent = m.icon;
                const active = importTab === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      setImportTab(m.id as any);
                      setImportErrors([]);
                    }}
                    style={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      fontSize: '12.5px',
                      fontWeight: active ? 700 : 500,
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      background: active ? 'rgba(0, 229, 200, 0.16)' : 'transparent',
                      color: active ? '#00E5C8' : '#94a3b8',
                      border: active ? '1px solid rgba(0, 229, 200, 0.45)' : '1px solid transparent',
                      boxShadow: active ? '0 0 12px rgba(0, 229, 200, 0.15)' : 'none',
                    }}
                  >
                    <IconComponent size={14} />
                    <span>{m.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Error Banner */}
            {importErrors.length > 0 && (
              <div
                style={{
                  padding: '12px 14px',
                  borderRadius: '10px',
                  background: 'rgba(239, 68, 68, 0.12)',
                  border: '1px solid rgba(239, 68, 68, 0.35)',
                  color: '#fca5a5',
                  fontSize: '12px',
                  display: 'flex',
                  gap: '10px',
                  alignItems: 'flex-start',
                }}
              >
                <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '2px', color: '#ef4444' }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, marginBottom: '2px' }}>Import refusé :</div>
                  <ul style={{ margin: 0, paddingLeft: '16px', lineHeight: 1.5 }}>
                    {importErrors.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* Tab 1: File Drag & Drop */}
            {importTab === 'file' && (
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".md,.zip,text/markdown,application/zip"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) validateAndStageFile(f);
                    e.target.value = '';
                  }}
                  disabled={importing}
                  style={{ display: 'none' }}
                />

                {!selectedFile ? (
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setIsDragging(true);
                    }}
                    onDragEnter={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setIsDragging(true);
                    }}
                    onDragLeave={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setIsDragging(false);
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setIsDragging(false);
                      const f = e.dataTransfer?.files?.[0];
                      if (f) validateAndStageFile(f);
                    }}
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      height: '190px',
                      borderRadius: '14px',
                      border: isDragging
                        ? '2px dashed #00E5C8'
                        : '2px dashed rgba(0, 229, 200, 0.35)',
                      background: isDragging
                        ? 'rgba(0, 229, 200, 0.12)'
                        : 'rgba(0, 229, 200, 0.03)',
                      boxShadow: isDragging
                        ? '0 0 25px rgba(0, 229, 200, 0.25), inset 0 0 15px rgba(0, 229, 200, 0.1)'
                        : 'none',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '10px',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      padding: '16px',
                      textAlign: 'center',
                    }}
                  >
                    <div
                      style={{
                        width: '52px',
                        height: '52px',
                        borderRadius: '50%',
                        background: isDragging
                          ? 'rgba(0, 229, 200, 0.25)'
                          : 'rgba(0, 229, 200, 0.08)',
                        border: '1px solid rgba(0, 229, 200, 0.4)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#00E5C8',
                        transform: isDragging ? 'scale(1.1)' : 'scale(1)',
                        transition: 'transform 0.2s ease',
                      }}
                    >
                      <Upload size={24} />
                    </div>

                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 700, color: '#f1f5f9' }}>
                        {isDragging ? 'Déposez votre fichier ici !' : 'Glissez-déposez votre fichier ici'}
                      </div>
                      <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '3px' }}>
                        ou <span style={{ color: '#00E5C8', textDecoration: 'underline' }}>parcourez vos fichiers</span>
                      </div>
                    </div>

                    <div
                      style={{
                        fontSize: '11px',
                        color: '#64748b',
                        padding: '4px 10px',
                        borderRadius: '99px',
                        background: 'rgba(255, 255, 255, 0.03)',
                        border: '1px solid rgba(255, 255, 255, 0.06)',
                      }}
                    >
                      Fichiers <strong>.md</strong> ou archives <strong>.zip</strong> avec références · Max 1 Mo
                    </div>
                  </div>
                ) : (
                  /* Staged File Card */
                  <div
                    style={{
                      height: '190px',
                      borderRadius: '14px',
                      border: '1px solid rgba(0, 229, 200, 0.4)',
                      background: 'rgba(0, 229, 200, 0.05)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '12px',
                      padding: '16px',
                      position: 'relative',
                    }}
                  >
                    <div
                      style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: '12px',
                        background: 'rgba(0, 229, 200, 0.15)',
                        border: '1px solid rgba(0, 229, 200, 0.4)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#00E5C8',
                      }}
                    >
                      {selectedFile.name.toLowerCase().endsWith('.zip') ? (
                        <FileArchive size={26} />
                      ) : (
                        <FileText size={26} />
                      )}
                    </div>

                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '14px', fontWeight: 700, color: '#ffffff' }}>
                        {selectedFile.name}
                      </div>
                      <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>
                        Taille : {formatFileSize(selectedFile.size)} · Prêt à être importé
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        style={{
                          padding: '5px 12px',
                          borderRadius: '6px',
                          background: 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          color: '#cbd5e1',
                          fontSize: '11.5px',
                          cursor: 'pointer',
                        }}
                      >
                        Changer de fichier
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedFile(null)}
                        style={{
                          padding: '5px 10px',
                          borderRadius: '6px',
                          background: 'rgba(239, 68, 68, 0.1)',
                          border: '1px solid rgba(239, 68, 68, 0.3)',
                          color: '#f87171',
                          fontSize: '11.5px',
                          cursor: 'pointer',
                        }}
                      >
                        Retirer
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Tab 2: URL */}
            {importTab === 'url' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <label style={{ fontSize: '12.5px', fontWeight: 600, color: '#cbd5e1' }}>
                  Adresse URL sécurisée du fichier (ex: raw.githubusercontent.com)
                </label>
                <div style={{ position: 'relative' }}>
                  <div
                    style={{
                      position: 'absolute',
                      left: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: '#00E5C8',
                    }}
                  >
                    <LinkIcon size={15} />
                  </div>
                  <input
                    type="url"
                    value={importUrl}
                    onChange={(e) => setImportUrl(e.target.value)}
                    placeholder="https://raw.githubusercontent.com/owner/repo/main/SKILL.md"
                    style={{
                      width: '100%',
                      padding: '11px 12px 11px 36px',
                      borderRadius: '10px',
                      background: '#111a2e',
                      border: '1px solid rgba(0, 229, 200, 0.25)',
                      color: '#fff',
                      fontSize: '13px',
                      outline: 'none',
                    }}
                  />
                </div>
                <div style={{ fontSize: '11.5px', color: '#64748b', lineHeight: 1.4 }}>
                  💡 L'URL doit pointer directement vers le contenu Markdown brut du fichier <code>SKILL.md</code>.
                </div>
              </div>
            )}

            {/* Tab 3: Paste Markdown */}
            {importTab === 'text' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <label style={{ fontSize: '12.5px', fontWeight: 600, color: '#cbd5e1' }}>
                    Contenu Markdown avec frontmatter YAML
                  </label>
                  <button
                    type="button"
                    onClick={handleInsertTemplate}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#00E5C8',
                      fontSize: '11.5px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      padding: 0,
                      textDecoration: 'underline',
                    }}
                  >
                    + Insérer un modèle d'exemple
                  </button>
                </div>
                <textarea
                  rows={8}
                  value={importMarkdownText}
                  onChange={(e) => setImportMarkdownText(e.target.value)}
                  placeholder={`---\nname: mon-skill\ndescription: Description claire du skill (minimum 20 caractères)...\ncategory: productivite\nkind: style\n---\n# Objectif\nInstructions...`}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '10px',
                    background: '#111a2e',
                    border: '1px solid rgba(0, 229, 200, 0.25)',
                    color: '#fff',
                    fontSize: '12px',
                    fontFamily: 'monospace',
                    resize: 'vertical',
                    outline: 'none',
                    lineHeight: 1.5,
                  }}
                />
              </div>
            )}

            {/* Footer with Destination Tag & Action Buttons */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingTop: '10px',
                borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                gap: '12px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11.5px', color: '#94a3b8' }}>
                <span
                  style={{
                    width: '7px',
                    height: '7px',
                    borderRadius: '50%',
                    background: '#c084fc',
                    boxShadow: '0 0 6px #c084fc',
                  }}
                />
                <span>
                  Destination : <strong style={{ color: '#c084fc' }}>Personnel (Moi)</strong>
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => {
                    setImportModalOpen(false);
                    setSelectedFile(null);
                    setImportErrors([]);
                  }}
                  style={{
                    padding: '9px 16px',
                    borderRadius: '10px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: '#cbd5e1',
                    fontSize: '12.5px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (importTab === 'file') {
                      handleExecuteFileImport();
                    } else if (importTab === 'url') {
                      handleImportSubmitUrl();
                    } else {
                      handleImportSubmitText();
                    }
                  }}
                  disabled={
                    importing ||
                    (importTab === 'file' && !selectedFile) ||
                    (importTab === 'url' && !importUrl.trim()) ||
                    (importTab === 'text' && !importMarkdownText.trim())
                  }
                  style={{
                    padding: '9px 20px',
                    borderRadius: '10px',
                    background:
                      importing ||
                      (importTab === 'file' && !selectedFile) ||
                      (importTab === 'url' && !importUrl.trim()) ||
                      (importTab === 'text' && !importMarkdownText.trim())
                        ? 'rgba(0, 229, 200, 0.25)'
                        : 'linear-gradient(90deg, #00E5C8 0%, #21F3D6 100%)',
                    border: 'none',
                    color:
                      importing ||
                      (importTab === 'file' && !selectedFile) ||
                      (importTab === 'url' && !importUrl.trim()) ||
                      (importTab === 'text' && !importMarkdownText.trim())
                        ? '#64748b'
                        : '#021010',
                    fontSize: '12.5px',
                    fontWeight: 800,
                    cursor:
                      importing ||
                      (importTab === 'file' && !selectedFile) ||
                      (importTab === 'url' && !importUrl.trim()) ||
                      (importTab === 'text' && !importMarkdownText.trim())
                        ? 'not-allowed'
                        : 'pointer',
                    boxShadow:
                      importing ||
                      (importTab === 'file' && !selectedFile) ||
                      (importTab === 'url' && !importUrl.trim()) ||
                      (importTab === 'text' && !importMarkdownText.trim())
                        ? 'none'
                        : '0 0 16px rgba(0, 229, 200, 0.35)',
                    transition: 'all 0.2s',
                  }}
                >
                  {importing
                    ? 'Import en cours...'
                    : importTab === 'file' && selectedFile
                    ? `Importer "${selectedFile.name.length > 20 ? selectedFile.name.slice(0, 18) + '...' : selectedFile.name}"`
                    : 'Importer le Skill'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <SkillEditor
        isOpen={editorOpen}
        onClose={() => setEditorOpen(false)}
        onSaved={async () => {
          await Promise.all([refreshSkills(), loadDiscover()]);
        }}
        initialSkill={editingSkill}
        mode={editorMode}
        isAdmin={isAdmin}
        activeConnectionId={activeConnection?.id ?? null}
        activeErpType={activeConnection?.connector_type ?? null}
        activeClientId={activeConnection?.client_id ?? null}
      />
      </div>
    </div>
  );
};
