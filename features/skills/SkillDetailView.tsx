'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  ArrowLeft,
  FileText,
  Folder,
  FolderOpen,
  ChevronDown,
  ChevronRight,
  Eye,
  Code as CodeIcon,
  Copy,
  Check,
  RotateCcw,
  Download,
  Edit3,
  Trash2,
  MoreVertical,
  Sparkles,
  User,
  Info,
  Database,
  Plug,
  Layers,
  CheckCircle2,
  ExternalLink,
  ArrowRight,
  Terminal,
} from 'lucide-react';
import {
  SkillDetail,
  SkillVersionItem,
  fetchSkillVersions,
  rollbackSkillVersion,
  exportSkillMd,
  exportSkillZip,
} from '@/shared/api/skills-api';
import { useToast } from '@/shared/contexts/ToastContext';
import { useConnections } from '@/shared/contexts/ConnectionsContext';
import './skills-premium.css';

interface SkillDetailViewProps {
  skill: SkillDetail;
  isAdmin: boolean;
  activeConnectionId?: number | null;
  initialTab?: 'apercu' | 'contenu' | 'skills' | 'connecteurs';
  onBack: () => void;
  onToggle: (slug: string, enabled: boolean) => Promise<void>;
  onEdit: (skill: SkillDetail) => void;
  onCustomize: (skill: SkillDetail) => void;
  onDelete: (skill: SkillDetail) => void;
  onSkillUpdated: () => Promise<void>;
}

interface TreeNode {
  name: string;
  path: string;
  type: 'file' | 'folder';
  children?: TreeNode[];
}

export const SkillDetailView: React.FC<SkillDetailViewProps> = ({
  skill,
  isAdmin,
  activeConnectionId,
  initialTab = 'apercu',
  onBack,
  onToggle,
  onEdit,
  onCustomize,
  onDelete,
  onSkillUpdated,
}) => {
  const { showToast } = useToast();
  const { activeConnection } = useConnections();

  const [activeTab, setActiveTab] = useState<'apercu' | 'contenu' | 'skills' | 'connecteurs'>(initialTab);
  const [selectedFilePath, setSelectedFilePath] = useState<string>('/SKILL.md');
  const [viewMode, setViewMode] = useState<'preview' | 'code'>('preview');
  const [copied, setCopied] = useState(false);
  const [copiedQueryIdx, setCopiedQueryIdx] = useState<number | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  // Version management
  const [versions, setVersions] = useState<SkillVersionItem[]>([]);
  const [loadingVersions, setLoadingVersions] = useState(false);
  const [selectedVersionNumber, setSelectedVersionNumber] = useState<number>(skill.version);
  const [versionDropdownOpen, setVersionDropdownOpen] = useState(false);

  // Collapsed folders in the file tree
  const [collapsedFolders, setCollapsedFolders] = useState<Record<string, boolean>>({});
  const [selectedSubSkillId, setSelectedSubSkillId] = useState<string | null>(null);

  // Fetch version history on mount
  useEffect(() => {
    let isMounted = true;
    setLoadingVersions(true);
    fetchSkillVersions(skill.id)
      .then((vList) => {
        if (isMounted) {
          setVersions(vList);
        }
      })
      .catch(() => {
        if (isMounted) setVersions([]);
      })
      .finally(() => {
        if (isMounted) setLoadingVersions(false);
      });
    return () => {
      isMounted = false;
    };
  }, [skill.id]);

  // Determine current active skill snapshot based on selected version
  const currentSnapshot = useMemo(() => {
    if (selectedVersionNumber === skill.version) {
      return {
        body_md: skill.body_md,
        references_json: skill.references_json || {},
        version: skill.version,
      };
    }
    const found = versions.find((v) => v.version === selectedVersionNumber);
    if (found) {
      return {
        body_md: found.body_md,
        references_json: found.references_json || {},
        version: found.version,
      };
    }
    return {
      body_md: skill.body_md,
      references_json: skill.references_json || {},
      version: skill.version,
    };
  }, [selectedVersionNumber, skill, versions]);

  const totalFilesCount = useMemo(() => {
    return 1 + Object.keys(currentSnapshot.references_json).length;
  }, [currentSnapshot]);

  // Helper to extract bulleted sample queries from any markdown content
  const extractQueriesFromMarkdown = (content: string): string[] => {
    if (!content) return [];
    const queries: string[] = [];
    const querySection = content.match(
      /##\s*(?:Exemples de requêtes|Requêtes types|Questions types|Exemples d'utilisation|Prompts types|Exemples de questions|Cas d'usage|Exemples)[^\n]*\n([\s\S]*?)(?=\n##|$)/i
    );
    if (querySection) {
      const lines = querySection[1].split('\n');
      for (const l of lines) {
        const qMatch = l.match(/(?:[-*]|\d+\.)\s*["'“]?([^"'”\n]+)["'”]?/);
        if (qMatch) {
          const cleaned = qMatch[1].trim();
          if (cleaned.length >= 8 && !cleaned.startsWith('#') && !cleaned.startsWith('`')) {
            queries.push(cleaned);
          }
        }
      }
    }
    return queries;
  };

  // Helper to parse sub-skill / modular capability metadata
  const parseSubSkillMeta = (key: string, content: string) => {
    // Extract slug from key, e.g. "skills/creances-impayes/SKILL.md" => "creances-impayes"
    const match = key.match(/(?:skills\/)?([^/]+)(?:\/SKILL|\/skill)?\.md$/i);
    const slug = match ? match[1] : key.replace(/\.md$/, '').replace(/.*\//, '');

    let title = '';
    let description = '';
    let category = '';

    // Check YAML frontmatter if present
    const fmMatch = content.match(/^---\n([\s\S]*?)\n---/);
    if (fmMatch) {
      const fmText = fmMatch[1];
      const titleMatch = fmText.match(/title:\s*["']?([^"'\n]+)["']?/);
      if (titleMatch) title = titleMatch[1].trim();
      const descMatch = fmText.match(/description:\s*(?:>|\|)?\s*\n?([^-\n][\s\S]*?)(?=\n[a-z_]+:|$)/i);
      if (descMatch) description = descMatch[1].replace(/\n\s+/g, ' ').trim();
      const catMatch = fmText.match(/category:\s*["']?([^"'\n]+)["']?/);
      if (catMatch) category = catMatch[1].trim();
    }

    // Fallback title from markdown heading
    if (!title) {
      const h1Match = content.match(/^#\s+(?:Capacité Métier\s*:\s*|Compétence Métier\s*:\s*)?([^\n]+)/m);
      if (h1Match) {
        title = h1Match[1].trim();
      } else {
        title = slug
          .split('-')
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(' ');
      }
    }

    // Fallback description from first paragraph
    if (!description) {
      const cleanBody = content.replace(/^---[\s\S]*?---/, '').trim();
      const pMatch = cleanBody.match(/(?:^|\n\n)(?:##\s*1\.[^\n]*\n+)?([^#\n][^\n]+)/);
      if (pMatch) {
        description = pMatch[1].trim();
      } else {
        description = `Compétence métier ${title} intégrée dans le pack ${skill.title}.`;
      }
    }

    // Category and color mapping
    let categoryColor = '#38bdf8';
    let categoryLabel = 'Finance & Gestion';
    const lowerSlug = slug.toLowerCase();
    const lowerCat = category.toLowerCase();

    if (lowerSlug.includes('creance') || lowerSlug.includes('impaye') || lowerCat === 'recouvrement') {
      categoryLabel = 'Finance & Recouvrement';
      categoryColor = '#38bdf8';
    } else if (lowerSlug.includes('tresorerie') || lowerCat === 'tresorerie') {
      categoryLabel = 'Finance & Trésorerie';
      categoryColor = '#38bdf8';
    } else if (lowerSlug.includes('vente') || lowerSlug.includes('commercial') || lowerCat === 'commercial') {
      categoryLabel = 'Commercial & Ventes';
      categoryColor = '#22c55e';
    } else if (lowerSlug.includes('achat') || lowerSlug.includes('fournisseur') || lowerCat === 'achats') {
      categoryLabel = 'Achats & Approvisionnement';
      categoryColor = '#f59e0b';
    } else if (lowerSlug.includes('logistique') || lowerSlug.includes('exploitation') || lowerCat === 'logistique') {
      categoryLabel = 'Opérations & Logistique';
      categoryColor = '#a855f7';
    } else if (category) {
      categoryLabel = category.charAt(0).toUpperCase() + category.slice(1);
      categoryColor = '#00E5C8';
    }

    // Extract sample queries from markdown
    const queries = extractQueriesFromMarkdown(content);

    // Default queries if none extracted from markdown
    if (queries.length === 0) {
      queries.push(
        `Activer la compétence /${slug} pour cette analyse`,
        `Générer le rapport et les indicateurs pour ${title}`
      );
    }

    const filePath = key.startsWith('/') ? key : `/${key}`;

    return {
      id: slug,
      slug,
      title,
      category: categoryLabel,
      categoryColor,
      description,
      queries,
      filePath,
    };
  };

  // Generalized Sub-skills detection: any folder containing a SKILL.md
  const subSkills = useMemo(() => {
    const refKeys = Object.keys(currentSnapshot.references_json);

    // Any folder containing a SKILL.md (Claude standard specification)
    const subSkillKeys = refKeys.filter((k) => /(?:^|\/)[^/]+\/(?:SKILL|skill)\.md$/i.test(k));
    if (subSkillKeys.length > 0) {
      return subSkillKeys.map((key) =>
        parseSubSkillMeta(key, currentSnapshot.references_json[key] || '')
      );
    }

    // Single skill fallback (self)
    return [
      {
        id: skill.slug,
        title: skill.title,
        slug: skill.slug,
        category: skill.category,
        categoryColor: '#00E5C8',
        description: skill.description,
        queries: [
          `Activer et utiliser le skill /${skill.slug}`,
          `Appliquer la méthodologie ${skill.title}`,
        ],
        filePath: '/SKILL.md',
      },
    ];
  }, [currentSnapshot, skill]);

  // Connecteurs ERP & Adaptateurs MCP
  const connectors = useMemo(() => {
    const activeErp = activeConnection?.connector_type?.toLowerCase() || '';
    const refKeys = Object.keys(currentSnapshot.references_json);
    const hasAdapters = refKeys.some((k) => k.includes('adaptateurs/'));

    if (hasAdapters || skill.slug === 'vmind-erp') {
      return [
        {
          id: 'tralis',
          name: 'TraLIS ERP (MCP)',
          type: 'tralis',
          logoColor: '#00E5C8',
          description:
            'Connecteur ERP TraLIS dédié à la logistique, transit, gestion commerciale et facturation.',
          adapterFile: '/references/adaptateurs/tralis.md',
          tools: [
            'get_kpi_dashboard',
            'get_factures_vente',
            'get_dossiers',
            'get_overdue_alerts',
            'get_aged_balance',
            'get_customer_profile',
            'get_delivery_rate',
          ],
          isConnected: activeErp === 'tralis' && activeConnection?.status === 'connected',
        },
        {
          id: 'odoo',
          name: 'Odoo ERP (MCP)',
          type: 'odoo',
          logoColor: '#a855f7',
          description:
            'Connecteur ERP Odoo pour la comptabilité générale, CRM, gestion des stocks et facturation.',
          adapterFile: '/references/adaptateurs/odoo.md',
          tools: [
            'odoo_execute_kw',
            'odoo_search_read',
            'odoo_create_record',
            'odoo_write_record',
            'odoo_read_group',
          ],
          isConnected: activeErp === 'odoo' && activeConnection?.status === 'connected',
        },
        {
          id: 'sage',
          name: 'Sage 100 / Cloud (MCP)',
          type: 'sage',
          logoColor: '#38bdf8',
          description:
            'Connecteur ERP Sage spécialisé dans la gestion financière, balances comptables et trésorerie.',
          adapterFile: '/references/adaptateurs/sage.md',
          tools: [
            'sage_export_balances',
            'sage_tiers',
            'sage_ecritures',
            'sage_reglements',
            'sage_lettrage',
          ],
          isConnected: activeErp === 'sage' && activeConnection?.status === 'connected',
        },
      ];
    }

    if (skill.erp_type) {
      return [
        {
          id: skill.erp_type,
          name: `${skill.erp_type.toUpperCase()} ERP (MCP)`,
          type: skill.erp_type,
          logoColor: '#00E5C8',
          description: `Connecteur ERP ${skill.erp_type.toUpperCase()} associé à ce skill.`,
          adapterFile: '/SKILL.md',
          tools: skill.mapped_tools || [],
          isConnected: activeErp === skill.erp_type.toLowerCase() && activeConnection?.status === 'connected',
        },
      ];
    }

    if (skill.mapped_tools && skill.mapped_tools.length > 0) {
      return [
        {
          id: 'active-connector',
          name: 'Connecteur ERP Actif (MCP)',
          type: activeErp || 'erp',
          logoColor: '#00E5C8',
          description: 'Outils MCP configurés pour le déclenchement automatique de ce skill.',
          adapterFile: '/SKILL.md',
          tools: skill.mapped_tools,
          isConnected: Boolean(activeConnection && activeConnection.status === 'connected'),
        },
      ];
    }

    return [
      {
        id: 'universal',
        name: 'Universel (Tous connecteurs)',
        type: 'global',
        logoColor: '#94a3b8',
        description: 'Ce skill de style et de mise en page fonctionne avec tous les connecteurs et sans ERP.',
        adapterFile: '/SKILL.md',
        tools: [],
        isConnected: true,
      },
    ];
  }, [currentSnapshot, skill, activeConnection]);

  // Build generalized hierarchical file tree
  const fileTree = useMemo<TreeNode[]>(() => {
    const rootNodes: TreeNode[] = [
      {
        name: 'SKILL.md',
        path: '/SKILL.md',
        type: 'file',
      },
    ];

    const refKeys = Object.keys(currentSnapshot.references_json).sort();
    if (refKeys.length === 0) {
      // If vmind-erp and references_json is empty, provide default expected tree
      if (skill.slug === 'vmind-erp') {
        const defaultTree: TreeNode[] = [
          { name: 'SKILL.md', path: '/SKILL.md', type: 'file' },
          {
            name: 'skills',
            path: '/skills',
            type: 'folder',
            children: [
              'creances-impayes',
              'tresorerie',
              'ventes-commercial',
              'achats-fournisseurs',
              'exploitation-logistique',
            ].map((slug) => ({
              name: slug,
              path: `/skills/${slug}`,
              type: 'folder' as const,
              children: [
                {
                  name: 'SKILL.md',
                  path: `/skills/${slug}/SKILL.md`,
                  type: 'file' as const,
                },
              ],
            })),
          },
          {
            name: 'references',
            path: '/references',
            type: 'folder',
            children: [
              {
                name: 'adaptateurs',
                path: '/references/adaptateurs',
                type: 'folder',
                children: ['tralis.md', 'odoo.md', 'sage.md'].map((file) => ({
                  name: file,
                  path: `/references/adaptateurs/${file}`,
                  type: 'file' as const,
                })),
              },
            ],
          },
        ];
        return defaultTree;
      }
      return rootNodes;
    }

    // Build true recursive tree from all paths
    for (const rawKey of refKeys) {
      const clean = rawKey.replace(/^\/+/, '');
      const parts = clean.split('/');

      let currentChildren = rootNodes;
      let currentPath = '';

      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        const isFile = i === parts.length - 1;
        currentPath = currentPath ? `${currentPath}/${part}` : `/${part}`;

        if (isFile) {
          if (!currentChildren.some((c) => c.path === currentPath)) {
            currentChildren.push({
              name: part,
              path: currentPath,
              type: 'file',
            });
          }
        } else {
          let folder = currentChildren.find(
            (n) => n.type === 'folder' && n.name === part
          );
          if (!folder) {
            folder = {
              name: part,
              path: currentPath,
              type: 'folder',
              children: [],
            };
            currentChildren.push(folder);
          }
          currentChildren = folder.children!;
        }
      }
    }

    // Sort nodes: folders first, then files alphabetically
    const sortNodes = (nodes: TreeNode[]) => {
      nodes.sort((a, b) => {
        if (a.type !== b.type) {
          return a.type === 'folder' ? -1 : 1;
        }
        return a.name.localeCompare(b.name);
      });
      for (const n of nodes) {
        if (n.children) sortNodes(n.children);
      }
    };

    sortNodes(rootNodes);
    return rootNodes;
  }, [currentSnapshot, skill]);

  // Resolve content of selected file
  const currentFileContent = useMemo(() => {
    if (selectedFilePath === '/SKILL.md') {
      return currentSnapshot.body_md || '';
    }
    const cleanKey = selectedFilePath.replace(/^\/+/, '');
    if (currentSnapshot.references_json[cleanKey]) {
      return currentSnapshot.references_json[cleanKey];
    }
    // Fallback checks
    if (cleanKey.startsWith('references/')) {
      const without = cleanKey.replace(/^references\//, '');
      if (currentSnapshot.references_json[without]) return currentSnapshot.references_json[without];
    } else {
      const withRef = `references/${cleanKey}`;
      if (currentSnapshot.references_json[withRef]) return currentSnapshot.references_json[withRef];
    }
    return '';
  }, [selectedFilePath, currentSnapshot]);

  const toggleFolder = (path: string) => {
    setCollapsedFolders((prev) => ({
      ...prev,
      [path]: !prev[path],
    }));
  };

  const handleCopyContent = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(currentFileContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      showToast('Contenu copié dans le presse-papier.', 'info');
    }
  };

  const handleExportZip = async () => {
    try {
      await exportSkillZip(skill.id, skill.slug);
      showToast(`Export ZIP de "${skill.slug}" démarré.`, 'success');
    } catch (err: any) {
      showToast(err.message || "Échec de l'export ZIP.", 'error');
    }
  };

  const handleExportMd = async () => {
    try {
      await exportSkillMd(skill.id, skill.slug);
      showToast(`Export Markdown de "${skill.slug}" démarré.`, 'success');
    } catch (err: any) {
      showToast(err.message || "Échec de l'export Markdown.", 'error');
    }
  };

  const handleRollback = async (targetVersion: number) => {
    try {
      await rollbackSkillVersion(
        skill.id,
        targetVersion,
        `Restauration de la version v${targetVersion}`
      );
      await onSkillUpdated();
      setSelectedVersionNumber(targetVersion);
      showToast(`Skill restauré vers la version v${targetVersion}.`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Impossible de restaurer cette version.', 'error');
    }
  };

  const canEditDirectly = skill.is_personal_owner || isAdmin;
  const canCustomizeForSelf = !skill.is_personal_owner;
  const canDelete = skill.is_personal_owner || isAdmin;

  // Author label
  const authorLabel = useMemo(() => {
    if (skill.scope === 'GLOBAL') return 'VMIND Core';
    if (skill.scope === 'ERP') return `ERP ${skill.erp_type ? skill.erp_type.toUpperCase() : 'Connecté'}`;
    if (skill.scope === 'TENANT') return `Organisation ${skill.tenant_key || ''}`;
    return 'Skill Personnel';
  }, [skill]);

  // Sample queries extracted from:
  // 1. The main /SKILL.md (currentSnapshot.body_md)
  // 2. Modular sub-skills (subSkills.flatMap(s => s.queries))
  // 3. Smart dynamic fallback templates
  const sampleQueries = useMemo(() => {
    // 1. Check main /SKILL.md
    const fromMainBody = extractQueriesFromMarkdown(currentSnapshot.body_md || '');
    if (fromMainBody.length > 0) return fromMainBody.slice(0, 6);

    // 2. Check modular sub-skills
    const fromSubSkills = subSkills.flatMap((s) => s.queries);
    if (fromSubSkills.length > 0) return fromSubSkills.slice(0, 6);

    // 3. Smart fallback queries
    return [
      `Activer le skill /${skill.slug} et analyser la situation globale`,
      `Générer le rapport synthétique selon la méthodologie /${skill.slug}`,
      `Quelles sont les alertes et recommandations clés identifiées par /${skill.slug} ?`,
    ];
  }, [currentSnapshot.body_md, subSkills, skill.slug]);

  const handleCopyQuery = (query: string, qIdx: number) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(query);
      setCopiedQueryIdx(qIdx);
      setTimeout(() => setCopiedQueryIdx(null), 2000);
      showToast('Requête copiée ! Prête à coller dans le chat VMIND.', 'info');
    }
  };

  // Simple, robust Markdown renderer supporting headers, tables, lists, bold, blockquotes, and code badges
  const renderMarkdown = (content: string) => {
    if (!content.trim()) {
      return (
        <div style={{ color: '#64748b', fontStyle: 'italic', padding: '24px 0' }}>
          Ce fichier est actuellement vide.
        </div>
      );
    }

    const lines = content.split('\n');
    const elements: React.ReactNode[] = [];
    let inTable = false;
    let tableRows: string[][] = [];
    let tableHeaders: string[] = [];
    let inCodeBlock = false;
    let codeBlockLines: string[] = [];
    let codeBlockLang = '';

    const flushTable = (keyIndex: number) => {
      if (tableHeaders.length > 0 || tableRows.length > 0) {
        elements.push(
          <div
            key={`table-${keyIndex}`}
            style={{
              overflowX: 'auto',
              margin: '18px 0',
              borderRadius: '8px',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              background: 'rgba(255, 255, 255, 0.01)',
            }}
          >
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: '13px',
                lineHeight: '1.5',
                textAlign: 'left',
              }}
            >
              {tableHeaders.length > 0 && (
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.12)', background: 'rgba(255,255,255,0.03)' }}>
                    {tableHeaders.map((th, hIdx) => (
                      <th
                        key={hIdx}
                        style={{
                          padding: '10px 14px',
                          fontWeight: 700,
                          color: '#f1f5f9',
                          letterSpacing: '0.01em',
                        }}
                      >
                        {formatInlineMarkdown(th)}
                      </th>
                    ))}
                  </tr>
                </thead>
              )}
              <tbody>
                {tableRows.map((row, rIdx) => (
                  <tr
                    key={rIdx}
                    style={{
                      borderBottom:
                        rIdx === tableRows.length - 1
                          ? 'none'
                          : '1px solid rgba(255, 255, 255, 0.05)',
                      background: rIdx % 2 === 1 ? 'rgba(255, 255, 255, 0.01)' : 'transparent',
                    }}
                  >
                    {row.map((cell, cIdx) => (
                      <td
                        key={cIdx}
                        style={{
                          padding: '10px 14px',
                          color: '#cbd5e1',
                          verticalAlign: 'top',
                        }}
                      >
                        {formatInlineMarkdown(cell)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      }
      tableHeaders = [];
      tableRows = [];
      inTable = false;
    };

    const flushCodeBlock = (keyIndex: number) => {
      elements.push(
        <div
          key={`code-${keyIndex}`}
          style={{
            margin: '14px 0',
            borderRadius: '8px',
            background: '#0a0f1d',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            overflow: 'hidden',
          }}
        >
          {codeBlockLang && (
            <div
              style={{
                padding: '4px 12px',
                fontSize: '11px',
                fontFamily: 'monospace',
                color: '#64748b',
                background: 'rgba(255, 255, 255, 0.02)',
                borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
              }}
            >
              {codeBlockLang}
            </div>
          )}
          <pre
            style={{
              padding: '12px 16px',
              margin: 0,
              fontSize: '12.5px',
              fontFamily: 'Consolas, Monaco, "Courier New", monospace',
              color: '#38bdf8',
              overflowX: 'auto',
              lineHeight: '1.5',
            }}
          >
            {codeBlockLines.join('\n')}
          </pre>
        </div>
      );
      codeBlockLines = [];
      codeBlockLang = '';
      inCodeBlock = false;
    };

    lines.forEach((line, index) => {
      const trimmed = line.trim();

      // Fenced code blocks
      if (trimmed.startsWith('```')) {
        if (inCodeBlock) {
          flushCodeBlock(index);
        } else {
          if (inTable) flushTable(index);
          inCodeBlock = true;
          codeBlockLang = trimmed.slice(3).trim();
        }
        return;
      }

      if (inCodeBlock) {
        codeBlockLines.push(line);
        return;
      }

      // Markdown Tables
      if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
        const cells = trimmed
          .slice(1, -1)
          .split('|')
          .map((c) => c.trim());

        // Check if separator line (| --- | --- |)
        const isSeparator = cells.every((c) => /^:?-+:?$/.test(c));
        if (isSeparator) {
          inTable = true;
          return;
        }

        if (!inTable) {
          tableHeaders = cells;
          inTable = true;
        } else {
          tableRows.push(cells);
        }
        return;
      } else if (inTable) {
        flushTable(index);
      }

      // Headings
      if (trimmed.startsWith('# ')) {
        elements.push(
          <h1
            key={index}
            style={{
              fontSize: '22px',
              fontWeight: 800,
              color: '#ffffff',
              margin: '24px 0 12px 0',
              letterSpacing: '-0.02em',
            }}
          >
            {formatInlineMarkdown(trimmed.slice(2))}
          </h1>
        );
        return;
      }
      if (trimmed.startsWith('## ')) {
        elements.push(
          <h2
            key={index}
            style={{
              fontSize: '18px',
              fontWeight: 700,
              color: '#f8fafc',
              margin: '20px 0 10px 0',
              letterSpacing: '-0.01em',
            }}
          >
            {formatInlineMarkdown(trimmed.slice(3))}
          </h2>
        );
        return;
      }
      if (trimmed.startsWith('### ')) {
        elements.push(
          <h3
            key={index}
            style={{
              fontSize: '15px',
              fontWeight: 700,
              color: '#e2e8f0',
              margin: '16px 0 8px 0',
            }}
          >
            {formatInlineMarkdown(trimmed.slice(4))}
          </h3>
        );
        return;
      }

      // Horizontal rule
      if (trimmed === '---' || trimmed === '***') {
        elements.push(
          <hr
            key={index}
            style={{
              border: 'none',
              borderTop: '1px solid rgba(255, 255, 255, 0.08)',
              margin: '20px 0',
            }}
          />
        );
        return;
      }

      // Blockquotes
      if (trimmed.startsWith('>')) {
        elements.push(
          <blockquote
            key={index}
            style={{
              margin: '12px 0',
              padding: '10px 14px',
              borderLeft: '3px solid #00E5C8',
              background: 'rgba(0, 229, 200, 0.04)',
              borderRadius: '0 8px 8px 0',
              color: '#cbd5e1',
              fontSize: '13px',
              fontStyle: 'normal',
            }}
          >
            {formatInlineMarkdown(trimmed.replace(/^>\s*/, ''))}
          </blockquote>
        );
        return;
      }

      // Bullet lists
      if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        elements.push(
          <div
            key={index}
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '8px',
              margin: '4px 0',
              fontSize: '13.5px',
              lineHeight: '1.6',
              color: '#cbd5e1',
            }}
          >
            <span style={{ color: '#00E5C8', fontWeight: 'bold' }}>•</span>
            <span>{formatInlineMarkdown(trimmed.slice(2))}</span>
          </div>
        );
        return;
      }

      // Numbered lists
      const numMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);
      if (numMatch) {
        elements.push(
          <div
            key={index}
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '8px',
              margin: '4px 0',
              fontSize: '13.5px',
              lineHeight: '1.6',
              color: '#cbd5e1',
            }}
          >
            <span
              style={{
                color: '#94a3b8',
                fontFamily: 'monospace',
                fontSize: '12px',
                minWidth: '18px',
              }}
            >
              {numMatch[1]}.
            </span>
            <span>{formatInlineMarkdown(numMatch[2])}</span>
          </div>
        );
        return;
      }

      // Empty line
      if (!trimmed) {
        elements.push(<div key={index} style={{ height: '8px' }} />);
        return;
      }

      // Regular paragraph
      elements.push(
        <p
          key={index}
          style={{
            margin: '6px 0',
            fontSize: '13.5px',
            lineHeight: '1.65',
            color: '#cbd5e1',
          }}
        >
          {formatInlineMarkdown(line)}
        </p>
      );
    });

    if (inTable) flushTable(lines.length);
    if (inCodeBlock) flushCodeBlock(lines.length);

    return elements;
  };

  // Helper to parse bold, inline code, and links
  const formatInlineMarkdown = (text: string): React.ReactNode => {
    // Regex matches inline code `code`
    const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*)/g);
    return parts.map((part, pIdx) => {
      if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
        const codeText = part.slice(1, -1);
        const isRef = codeText.startsWith('references/') || codeText.endsWith('.md');
        return (
          <code
            key={pIdx}
            style={{
              fontSize: '12px',
              fontFamily: 'Consolas, Monaco, "Courier New", monospace',
              padding: '2px 6px',
              borderRadius: '4px',
              background: isRef ? 'rgba(244, 63, 94, 0.12)' : 'rgba(255, 255, 255, 0.08)',
              color: isRef ? '#fb7185' : '#38bdf8',
              border: isRef
                ? '1px solid rgba(244, 63, 94, 0.25)'
                : '1px solid rgba(255, 255, 255, 0.12)',
            }}
          >
            {codeText}
          </code>
        );
      }
      if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
        return (
          <strong key={pIdx} style={{ color: '#ffffff', fontWeight: 700 }}>
            {part.slice(2, -2)}
          </strong>
        );
      }
      return part;
    });
  };

  // Recursive tree renderer
  const renderTreeNodes = (nodes: TreeNode[], depth: number = 0) => {
    return nodes.map((node) => {
      if (node.type === 'folder') {
        const isCollapsed = Boolean(collapsedFolders[node.path]);
        return (
          <div key={node.path}>
            <button
              type="button"
              onClick={() => toggleFolder(node.path)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 10px',
                paddingLeft: `${10 + depth * 14}px`,
                background: 'transparent',
                border: 'none',
                color: '#94a3b8',
                fontSize: '12.5px',
                cursor: 'pointer',
                textAlign: 'left',
                borderRadius: '6px',
                transition: 'background 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
              }}
            >
              {isCollapsed ? (
                <ChevronRight size={13} color="#64748b" />
              ) : (
                <ChevronDown size={13} color="#64748b" />
              )}
              {isCollapsed ? (
                <Folder size={14} color="#00E5C8" />
              ) : (
                <FolderOpen size={14} color="#00E5C8" />
              )}
              <span style={{ fontWeight: 600, color: '#e2e8f0' }}>{node.name}</span>
            </button>
            {!isCollapsed && node.children && (
              <div>{renderTreeNodes(node.children, depth + 1)}</div>
            )}
          </div>
        );
      }

      // File entry
      const isSelected = selectedFilePath === node.path;
      return (
        <button
          key={node.path}
          type="button"
          onClick={() => setSelectedFilePath(node.path)}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: '7px',
            padding: '6px 10px',
            paddingLeft: `${14 + depth * 14}px`,
            background: isSelected ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
            border: 'none',
            color: isSelected ? '#ffffff' : '#cbd5e1',
            fontSize: '12.5px',
            fontFamily: node.name.endsWith('.md') ? 'inherit' : 'monospace',
            cursor: 'pointer',
            textAlign: 'left',
            borderRadius: '6px',
            fontWeight: isSelected ? 600 : 400,
            transition: 'background 0.15s ease',
          }}
          onMouseEnter={(e) => {
            if (!isSelected) {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
            }
          }}
          onMouseLeave={(e) => {
            if (!isSelected) {
              e.currentTarget.style.background = 'transparent';
            }
          }}
        >
          <FileText size={13} color={isSelected ? '#00E5C8' : '#64748b'} />
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {node.name}
          </span>
        </button>
      );
    });
  };

  return (
    <div
      className="sk-page"
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      <div className="sk-ambient" />
      <div className="sk-grid-bg" />
      {/* Top Header Bar */}
      <div
        style={{
          padding: '18px 32px',
          borderBottom: '1px solid var(--sk-line)',
          background: 'rgba(8, 14, 26, 0.85)',
          backdropFilter: 'blur(20px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '20px',
          flexShrink: 0,
          position: 'relative',
          zIndex: 10,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', minWidth: 0 }}>
          {/* Back button */}
          <button
            type="button"
            onClick={onBack}
            className="sk-btn sk-btn-glass sk-btn-sm"
            style={{
              flexShrink: 0,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '7px 14px',
              borderRadius: '9px',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(148, 163, 184, 0.2)',
              color: '#cbd5e1',
              fontSize: '12.5px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <ArrowLeft size={14} />
            <span>Vos Skills</span>
          </button>

          {/* Skill Monogram & Meta */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: 0 }}>
            <div
              className="sk-monogram"
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '12px',
                fontSize: '18px',
                display: 'grid',
                placeItems: 'center',
                background: 'linear-gradient(145deg, rgba(0, 229, 200, 0.16), rgba(0, 229, 200, 0.04))',
                border: '1px solid rgba(0, 229, 200, 0.35)',
                boxShadow: '0 8px 24px -10px rgba(0, 229, 200, 0.5)',
                color: skill.scope === 'USER' ? '#a855f7' : '#00e5c8',
              }}
            >
              {skill.kind === 'method' ? '⚡' : '✨'}
            </div>

            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <h1
                  style={{
                    fontSize: '18px',
                    fontWeight: 800,
                    color: '#ffffff',
                    margin: 0,
                    letterSpacing: '-0.02em',
                  }}
                >
                  /{skill.slug}
                </h1>
                <span
                  className="sk-badge"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    padding: '2px 8px',
                    borderRadius: '99px',
                    fontSize: '11px',
                    fontWeight: 700,
                    color: '#00e5c8',
                    border: '1px solid rgba(0, 229, 200, 0.35)',
                    background: 'rgba(0, 229, 200, 0.1)',
                  }}
                >
                  v{skill.version}
                </span>
                <span
                  className="sk-badge"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    padding: '2px 8px',
                    borderRadius: '99px',
                    fontSize: '11px',
                    fontWeight: 600,
                    color: '#cbd5e1',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                  }}
                >
                  {skill.kind === 'method' ? 'Méthode' : 'Style'}
                </span>
                <span
                  className="sk-badge"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    padding: '2px 8px',
                    borderRadius: '99px',
                    fontSize: '11px',
                    fontWeight: 600,
                    color: '#94a3b8',
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    textTransform: 'capitalize',
                  }}
                >
                  {skill.category}
                </span>
              </div>
              <div
                style={{
                  fontSize: '12px',
                  color: '#94a3b8',
                  marginTop: '3px',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {skill.title} · par {authorLabel} · {subSkills.length} capacité{subSkills.length > 1 ? 's' : ''} · {connectors.length} connecteur{connectors.length > 1 ? 's' : ''}
              </div>
            </div>
          </div>
        </div>

        {/* Right actions: Toggle Switch + Menu */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexShrink: 0 }}>
          <label className="sk-switch" title={skill.enabled ? 'Désactiver pour moi' : 'Activer pour moi'}>
            <input
              type="checkbox"
              checked={skill.enabled}
              onChange={() => onToggle(skill.slug, !skill.enabled)}
            />
            <span className="sk-switch-track" />
            <span className="sk-switch-label">{skill.enabled ? 'Actif' : 'Inactif'}</span>
          </label>

          <div className="sk-menu-wrap" style={{ position: 'relative' }}>
            <button
              type="button"
              className={`sk-icon-btn ${menuOpen ? 'is-active' : ''}`}
              onClick={() => setMenuOpen(!menuOpen)}
              title="Plus d'actions"
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '9px',
                background: menuOpen ? 'rgba(0, 229, 200, 0.14)' : 'rgba(255, 255, 255, 0.04)',
                border: menuOpen ? '1px solid rgba(0, 229, 200, 0.5)' : '1px solid rgba(148, 163, 184, 0.18)',
                color: menuOpen ? '#00e5c8' : '#cbd5e1',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.18s ease',
              }}
            >
              <MoreVertical size={16} />
            </button>

            {menuOpen && (
              <>
                {/* Backdrop invisible pour fermer en cliquant à l'extérieur */}
                <div
                  style={{
                    position: 'fixed',
                    inset: 0,
                    zIndex: 89,
                    cursor: 'default',
                  }}
                  onClick={() => setMenuOpen(false)}
                />

                <div
                  className="sk-menu"
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 8px)',
                    bottom: 'auto',
                    right: 0,
                    width: '240px',
                    borderRadius: '14px',
                    background: 'linear-gradient(165deg, rgba(13, 21, 39, 0.98), rgba(6, 11, 22, 0.99))',
                    backdropFilter: 'blur(20px)',
                    border: '1px solid rgba(0, 229, 200, 0.28)',
                    boxShadow: '0 20px 50px rgba(0, 0, 0, 0.85), 0 0 25px rgba(0, 229, 200, 0.12)',
                    zIndex: 90,
                    padding: '6px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '3px',
                  }}
                >
                  <div
                    style={{
                      padding: '6px 10px 4px',
                      fontSize: '10px',
                      fontWeight: 800,
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      color: '#64748b',
                    }}
                  >
                    Actions sur le Skill
                  </div>

                  {canEditDirectly && (
                    <button
                      type="button"
                      className="sk-menu-item"
                      onClick={() => {
                        setMenuOpen(false);
                        onEdit(skill);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '9px 12px',
                        borderRadius: '8px',
                        background: 'transparent',
                        border: 'none',
                        color: '#f1f5f9',
                        fontSize: '13px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'all 0.15s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(0, 229, 200, 0.12)';
                        e.currentTarget.style.color = '#00e5c8';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'transparent';
                        e.currentTarget.style.color = '#f1f5f9';
                      }}
                    >
                      <Edit3 size={15} style={{ color: '#00e5c8', flexShrink: 0 }} />
                      <span>Modifier ce skill</span>
                    </button>
                  )}

                  {canCustomizeForSelf && (
                    <button
                      type="button"
                      className="sk-menu-item"
                      onClick={() => {
                        setMenuOpen(false);
                        onCustomize(skill);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '9px 12px',
                        borderRadius: '8px',
                        background: 'transparent',
                        border: 'none',
                        color: '#f1f5f9',
                        fontSize: '13px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'all 0.15s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(192, 132, 252, 0.14)';
                        e.currentTarget.style.color = '#c084fc';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'transparent';
                        e.currentTarget.style.color = '#f1f5f9';
                      }}
                    >
                      <Sparkles size={15} style={{ color: '#c084fc', flexShrink: 0 }} />
                      <span>Personnaliser pour moi</span>
                    </button>
                  )}

                  <div style={{ height: '1px', margin: '4px 6px', background: 'rgba(255, 255, 255, 0.08)' }} />

                  <div
                    style={{
                      padding: '4px 10px',
                      fontSize: '10px',
                      fontWeight: 800,
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      color: '#64748b',
                    }}
                  >
                    Exportations
                  </div>

                  <button
                    type="button"
                    className="sk-menu-item"
                    onClick={() => {
                      setMenuOpen(false);
                      handleExportZip();
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '9px 12px',
                      borderRadius: '8px',
                      background: 'transparent',
                      border: 'none',
                      color: '#f1f5f9',
                      fontSize: '13px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.15s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(56, 189, 248, 0.12)';
                      e.currentTarget.style.color = '#38bdf8';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.color = '#f1f5f9';
                    }}
                  >
                    <Download size={15} style={{ color: '#38bdf8', flexShrink: 0 }} />
                    <span>Exporter l&apos;archive .zip</span>
                  </button>

                  <button
                    type="button"
                    className="sk-menu-item"
                    onClick={() => {
                      setMenuOpen(false);
                      handleExportMd();
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '9px 12px',
                      borderRadius: '8px',
                      background: 'transparent',
                      border: 'none',
                      color: '#f1f5f9',
                      fontSize: '13px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.15s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                      e.currentTarget.style.color = '#ffffff';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.color = '#f1f5f9';
                    }}
                  >
                    <FileText size={15} style={{ color: '#94a3b8', flexShrink: 0 }} />
                    <span>Exporter Markdown (.md)</span>
                  </button>

                  {canDelete && (
                    <>
                      <div style={{ height: '1px', margin: '4px 6px', background: 'rgba(255, 255, 255, 0.08)' }} />
                      <button
                        type="button"
                        className="sk-menu-item is-danger"
                        onClick={() => {
                          setMenuOpen(false);
                          onDelete(skill);
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          padding: '9px 12px',
                          borderRadius: '8px',
                          background: 'rgba(239, 68, 68, 0.05)',
                          border: 'none',
                          color: '#f87171',
                          fontSize: '13px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          textAlign: 'left',
                          transition: 'all 0.15s ease',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'rgba(239, 68, 68, 0.16)';
                          e.currentTarget.style.color = '#fecaca';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'rgba(239, 68, 68, 0.05)';
                          e.currentTarget.style.color = '#f87171';
                        }}
                      >
                        <Trash2 size={15} style={{ color: '#f87171', flexShrink: 0 }} />
                        <span>
                          {skill.is_personal_owner
                            ? 'Supprimer ce skill personnel'
                            : 'Supprimer définitivement'}
                        </span>
                      </button>
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Tabs navigation: [Aperçu] | [Contenu · N] | [Skills · X] | [Connecteurs · Y] */}
      <div
        className="sk-tabs"
        style={{
          padding: '0 32px',
          background: 'rgba(8, 14, 26, 0.65)',
          borderBottom: '1px solid rgba(148, 163, 184, 0.12)',
          display: 'flex',
          gap: '8px',
          flexShrink: 0,
        }}
      >
        <button
          type="button"
          onClick={() => setActiveTab('apercu')}
          className={`sk-tab ${activeTab === 'apercu' ? 'is-active' : ''}`}
          style={{
            position: 'relative',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 18px',
            border: 'none',
            borderBottom: activeTab === 'apercu' ? '2px solid #00E5C8' : '2px solid transparent',
            background: 'transparent',
            color: activeTab === 'apercu' ? '#ffffff' : '#94a3b8',
            fontSize: '13px',
            fontWeight: activeTab === 'apercu' ? 700 : 500,
            cursor: 'pointer',
            transition: 'color 0.15s ease',
          }}
        >
          <span>Aperçu</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('contenu')}
          className={`sk-tab ${activeTab === 'contenu' ? 'is-active' : ''}`}
          style={{
            position: 'relative',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 18px',
            border: 'none',
            borderBottom: activeTab === 'contenu' ? '2px solid #00E5C8' : '2px solid transparent',
            background: 'transparent',
            color: activeTab === 'contenu' ? '#ffffff' : '#94a3b8',
            fontSize: '13px',
            fontWeight: activeTab === 'contenu' ? 700 : 500,
            cursor: 'pointer',
            transition: 'color 0.15s ease',
          }}
        >
          <span>Contenu</span>
          <span
            className="sk-badge"
            style={{
              height: '18px',
              padding: '0 6px',
              borderRadius: '99px',
              fontSize: '10.5px',
              fontWeight: 700,
              background: activeTab === 'contenu' ? 'rgba(0, 229, 200, 0.18)' : 'rgba(255, 255, 255, 0.05)',
              color: activeTab === 'contenu' ? '#00e5c8' : '#94a3b8',
              border: '1px solid rgba(148, 163, 184, 0.15)',
            }}
          >
            {totalFilesCount}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('skills')}
          className={`sk-tab ${activeTab === 'skills' ? 'is-active' : ''}`}
          style={{
            position: 'relative',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 18px',
            border: 'none',
            borderBottom: activeTab === 'skills' ? '2px solid #00E5C8' : '2px solid transparent',
            background: 'transparent',
            color: activeTab === 'skills' ? '#ffffff' : '#94a3b8',
            fontSize: '13px',
            fontWeight: activeTab === 'skills' ? 700 : 500,
            cursor: 'pointer',
            transition: 'color 0.15s ease',
          }}
        >
          <span>Skills Métier</span>
          <span
            className="sk-badge"
            style={{
              height: '18px',
              padding: '0 6px',
              borderRadius: '99px',
              fontSize: '10.5px',
              fontWeight: 700,
              background: activeTab === 'skills' ? 'rgba(0, 229, 200, 0.18)' : 'rgba(255, 255, 255, 0.05)',
              color: activeTab === 'skills' ? '#00e5c8' : '#94a3b8',
              border: '1px solid rgba(148, 163, 184, 0.15)',
            }}
          >
            {subSkills.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('connecteurs')}
          className={`sk-tab ${activeTab === 'connecteurs' ? 'is-active' : ''}`}
          style={{
            position: 'relative',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 18px',
            border: 'none',
            borderBottom: activeTab === 'connecteurs' ? '2px solid #00E5C8' : '2px solid transparent',
            background: 'transparent',
            color: activeTab === 'connecteurs' ? '#ffffff' : '#94a3b8',
            fontSize: '13px',
            fontWeight: activeTab === 'connecteurs' ? 700 : 500,
            cursor: 'pointer',
            transition: 'color 0.15s ease',
          }}
        >
          <span>Connecteurs ERP</span>
          <span
            className="sk-badge"
            style={{
              height: '18px',
              padding: '0 6px',
              borderRadius: '99px',
              fontSize: '10.5px',
              fontWeight: 700,
              background: activeTab === 'connecteurs' ? 'rgba(0, 229, 200, 0.18)' : 'rgba(255, 255, 255, 0.05)',
              color: activeTab === 'connecteurs' ? '#00e5c8' : '#94a3b8',
              border: '1px solid rgba(148, 163, 184, 0.15)',
            }}
          >
            {connectors.length}
          </span>
        </button>
      </div>

      {/* Main Tab Content */}
      <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex' }}>
        {activeTab === 'apercu' ? (
          /* Mission Control 2-Column Wide Cockpit */
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '28px 36px 48px',
              boxSizing: 'border-box',
              width: '100%',
            }}
          >
            <div
              style={{
                maxWidth: '1560px',
                margin: '0 auto',
                display: 'grid',
                gridTemplateColumns: 'minmax(0, 1.42fr) minmax(380px, 1fr)',
                gap: '28px',
                alignItems: 'start',
              }}
            >
              {/* ============================================================== */}
              {/* COLONNE GAUCHE (1.42fr) : Vision Métier, Capacités & ERP Connectors */}
              {/* ============================================================== */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', minWidth: 0 }}>
                {/* 1. Carte Hero Vision */}
                <div
                  style={{
                    padding: '24px 28px',
                    borderRadius: '16px',
                    background: 'linear-gradient(165deg, rgba(17, 26, 46, 0.75) 0%, rgba(8, 14, 26, 0.85) 100%)',
                    border: '1px solid rgba(0, 229, 200, 0.22)',
                    boxShadow: '0 16px 40px -15px rgba(0, 0, 0, 0.6)',
                    backdropFilter: 'blur(16px)',
                    position: 'relative',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      position: 'absolute',
                      top: 0,
                      right: 0,
                      width: '280px',
                      height: '280px',
                      background: 'radial-gradient(circle, rgba(0, 229, 200, 0.08), transparent 70%)',
                      pointerEvents: 'none',
                    }}
                  />

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', marginBottom: '14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '4px 10px',
                          borderRadius: '8px',
                          background: 'rgba(0, 229, 200, 0.12)',
                          border: '1px solid rgba(0, 229, 200, 0.3)',
                          color: '#00E5C8',
                          fontFamily: 'monospace',
                          fontSize: '12px',
                          fontWeight: 750,
                        }}
                      >
                        <Terminal size={12} />
                        /{skill.slug}
                      </span>

                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          padding: '4px 9px',
                          borderRadius: '8px',
                          background: 'rgba(255, 255, 255, 0.04)',
                          border: '1px solid rgba(148, 163, 184, 0.18)',
                          color: '#cbd5e1',
                          textTransform: 'uppercase',
                          letterSpacing: '0.04em',
                        }}
                      >
                        {skill.kind === 'method' ? 'Méthode Métier' : 'Style & Restitution'}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          fontSize: '11px',
                          fontWeight: 650,
                          color: skill.enabled ? '#34d399' : '#94a3b8',
                          background: skill.enabled ? 'rgba(16, 185, 129, 0.12)' : 'rgba(148, 163, 184, 0.08)',
                          border: skill.enabled ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(148, 163, 184, 0.14)',
                          padding: '3px 9px',
                          borderRadius: '99px',
                        }}
                      >
                        <span
                          style={{
                            width: '6px',
                            height: '6px',
                            borderRadius: '50%',
                            background: skill.enabled ? '#34d399' : '#64748b',
                            boxShadow: skill.enabled ? '0 0 8px #34d399' : 'none',
                          }}
                        />
                        {skill.enabled ? 'Actif sur mon profil' : 'Inactif'}
                      </span>
                    </div>
                  </div>

                  <h2
                    style={{
                      margin: '0 0 12px',
                      fontSize: '22px',
                      fontWeight: 800,
                      color: '#ffffff',
                      letterSpacing: '-0.02em',
                      lineHeight: 1.3,
                    }}
                  >
                    {skill.title}
                  </h2>

                  <p
                    style={{
                      margin: 0,
                      fontSize: '14.5px',
                      lineHeight: '1.75',
                      color: '#cbd5e1',
                      fontWeight: 400,
                    }}
                  >
                    {skill.description || 'Méthodologie standardisée de guidage et d\'automatisation pour ce flux métier.'}
                  </p>
                </div>

                {/* 2. Capacités Métier & Sous-Skills */}
                {subSkills.length > 0 && (
                  <div
                    style={{
                      padding: '22px 24px',
                      borderRadius: '16px',
                      background: 'rgba(13, 21, 39, 0.65)',
                      border: '1px solid rgba(148, 163, 184, 0.12)',
                      boxShadow: '0 10px 30px -10px rgba(0, 0, 0, 0.4)',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: '16px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div
                          style={{
                            width: '30px',
                            height: '30px',
                            borderRadius: '8px',
                            background: 'rgba(0, 229, 200, 0.12)',
                            border: '1px solid rgba(0, 229, 200, 0.25)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Layers size={16} color="#00E5C8" />
                        </div>
                        <div>
                          <h3
                            style={{
                              fontSize: '13px',
                              textTransform: 'uppercase',
                              letterSpacing: '0.06em',
                              fontWeight: 800,
                              color: '#f8fafc',
                              margin: 0,
                            }}
                          >
                            Capacités Métier & Sous-Skills ({subSkills.length})
                          </h3>
                          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                            Modules d&apos;expertise et règles d&apos;analyse embarqués
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setActiveTab('skills')}
                        style={{
                          background: 'rgba(0, 229, 200, 0.06)',
                          border: '1px solid rgba(0, 229, 200, 0.25)',
                          color: '#00E5C8',
                          fontSize: '12px',
                          fontWeight: 700,
                          padding: '6px 12px',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          transition: 'all 0.15s ease',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'rgba(0, 229, 200, 0.14)';
                          e.currentTarget.style.transform = 'translateX(2px)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'rgba(0, 229, 200, 0.06)';
                          e.currentTarget.style.transform = 'none';
                        }}
                      >
                        <span>Tout explorer</span>
                        <ArrowRight size={13} />
                      </button>
                    </div>

                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
                        gap: '12px',
                      }}
                    >
                      {subSkills.map((sub) => (
                        <div
                          key={sub.id}
                          onClick={() => {
                            setSelectedSubSkillId(sub.id);
                            setActiveTab('skills');
                          }}
                          style={{
                            padding: '14px 16px',
                            borderRadius: '12px',
                            background: 'linear-gradient(160deg, rgba(255, 255, 255, 0.03) 0%, rgba(255, 255, 255, 0.01) 100%)',
                            border: '1px solid rgba(148, 163, 184, 0.12)',
                            cursor: 'pointer',
                            transition: 'all 0.2s cubic-bezier(0.2, 0, 0, 1)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '8px',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = 'rgba(0, 229, 200, 0.45)';
                            e.currentTarget.style.background = 'linear-gradient(160deg, rgba(0, 229, 200, 0.08) 0%, rgba(13, 21, 39, 0.8) 100%)';
                            e.currentTarget.style.transform = 'translateY(-2px)';
                            e.currentTarget.style.boxShadow = '0 8px 24px -6px rgba(0, 229, 200, 0.2)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = 'rgba(148, 163, 184, 0.12)';
                            e.currentTarget.style.background = 'linear-gradient(160deg, rgba(255, 255, 255, 0.03) 0%, rgba(255, 255, 255, 0.01) 100%)';
                            e.currentTarget.style.transform = 'none';
                            e.currentTarget.style.boxShadow = 'none';
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                            <span
                              style={{
                                fontSize: '10.5px',
                                fontFamily: 'monospace',
                                fontWeight: 750,
                                color: '#00E5C8',
                                background: 'rgba(0, 229, 200, 0.1)',
                                border: '1px solid rgba(0, 229, 200, 0.22)',
                                padding: '2px 7px',
                                borderRadius: '5px',
                              }}
                            >
                              /{sub.slug}
                            </span>
                            <span
                              style={{
                                fontSize: '10px',
                                fontWeight: 700,
                                color: sub.categoryColor || '#94a3b8',
                                textTransform: 'uppercase',
                                letterSpacing: '0.03em',
                              }}
                            >
                              {sub.category}
                            </span>
                          </div>

                          <div style={{ fontSize: '13.5px', fontWeight: 750, color: '#ffffff', lineHeight: 1.35 }}>
                            {sub.title}
                          </div>

                          <div
                            style={{
                              fontSize: '12px',
                              color: '#94a3b8',
                              lineHeight: '1.45',
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden',
                            }}
                          >
                            {sub.description}
                          </div>

                          <div
                            style={{
                              marginTop: 'auto',
                              paddingTop: '6px',
                              fontSize: '11px',
                              fontWeight: 700,
                              color: '#00E5C8',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            <span>Consulter la compétence</span>
                            <ArrowRight size={11} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 3. Connecteurs ERP & MCP */}
                {connectors.length > 0 && (
                  <div
                    style={{
                      padding: '22px 24px',
                      borderRadius: '16px',
                      background: 'rgba(13, 21, 39, 0.65)',
                      border: '1px solid rgba(148, 163, 184, 0.12)',
                      boxShadow: '0 10px 30px -10px rgba(0, 0, 0, 0.4)',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: '16px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div
                          style={{
                            width: '30px',
                            height: '30px',
                            borderRadius: '8px',
                            background: 'rgba(56, 189, 248, 0.12)',
                            border: '1px solid rgba(56, 189, 248, 0.25)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Plug size={16} color="#38bdf8" />
                        </div>
                        <div>
                          <h3
                            style={{
                              fontSize: '13px',
                              textTransform: 'uppercase',
                              letterSpacing: '0.06em',
                              fontWeight: 800,
                              color: '#f8fafc',
                              margin: 0,
                            }}
                          >
                            Connecteurs ERP & Protocoles MCP ({connectors.length})
                          </h3>
                          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                            Interconnexion native et extraction sécurisée des données
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setActiveTab('connecteurs')}
                        style={{
                          background: 'rgba(56, 189, 248, 0.06)',
                          border: '1px solid rgba(56, 189, 248, 0.25)',
                          color: '#38bdf8',
                          fontSize: '12px',
                          fontWeight: 700,
                          padding: '6px 12px',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          transition: 'all 0.15s ease',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'rgba(56, 189, 248, 0.14)';
                          e.currentTarget.style.transform = 'translateX(2px)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'rgba(56, 189, 248, 0.06)';
                          e.currentTarget.style.transform = 'none';
                        }}
                      >
                        <span>Détails connecteurs</span>
                        <ArrowRight size={13} />
                      </button>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
                      {connectors.map((conn) => (
                        <div
                          key={conn.id}
                          style={{
                            padding: '14px 16px',
                            borderRadius: '12px',
                            background: 'rgba(255, 255, 255, 0.025)',
                            border: '1px solid rgba(148, 163, 184, 0.14)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '10px',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
                              <div
                                style={{
                                  width: '9px',
                                  height: '9px',
                                  borderRadius: '50%',
                                  background: conn.isConnected ? '#22c55e' : '#64748b',
                                  boxShadow: conn.isConnected ? '0 0 10px #22c55e' : 'none',
                                }}
                              />
                              <span style={{ fontSize: '13px', fontWeight: 750, color: '#ffffff' }}>
                                {conn.name}
                              </span>
                            </div>
                            <span
                              style={{
                                fontSize: '10px',
                                fontWeight: 700,
                                padding: '2px 8px',
                                borderRadius: '99px',
                                background: conn.isConnected ? 'rgba(34, 197, 94, 0.14)' : 'rgba(148, 163, 184, 0.1)',
                                border: conn.isConnected ? '1px solid rgba(34, 197, 94, 0.3)' : '1px solid rgba(148, 163, 184, 0.16)',
                                color: conn.isConnected ? '#4ade80' : '#94a3b8',
                              }}
                            >
                              {conn.isConnected ? 'Actif & Connecté' : 'Compatible'}
                            </span>
                          </div>

                          <div style={{ fontSize: '11.5px', color: '#94a3b8', lineHeight: 1.45 }}>
                            {conn.description}
                          </div>

                          {conn.tools && conn.tools.length > 0 && (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginTop: '2px' }}>
                              {conn.tools.slice(0, 4).map((t) => (
                                <span
                                  key={t}
                                  style={{
                                    fontSize: '10px',
                                    fontFamily: 'monospace',
                                    padding: '2px 6px',
                                    borderRadius: '4px',
                                    background: 'rgba(56, 189, 248, 0.08)',
                                    color: '#7dd3fc',
                                    border: '1px solid rgba(56, 189, 248, 0.18)',
                                  }}
                                >
                                  {t}
                                </span>
                              ))}
                              {conn.tools.length > 4 && (
                                <span style={{ fontSize: '10px', color: '#64748b', alignSelf: 'center', padding: '0 4px' }}>
                                  +{conn.tools.length - 4} autres
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* ============================================================== */}
              {/* COLONNE DROITE (1fr) : Studio Requêtes, Fiche Gouvernance & Manifeste */}
              {/* ============================================================== */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', minWidth: 0 }}>
                {/* 1. Studio des Requêtes Types (Prompt Launcher) */}
                <div
                  style={{
                    padding: '22px 24px',
                    borderRadius: '16px',
                    background: 'linear-gradient(165deg, rgba(26, 18, 48, 0.65) 0%, rgba(13, 21, 39, 0.75) 100%)',
                    border: '1px solid rgba(192, 132, 252, 0.25)',
                    boxShadow: '0 12px 35px -10px rgba(192, 132, 252, 0.15)',
                    backdropFilter: 'blur(16px)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                    <div
                      style={{
                        width: '30px',
                        height: '30px',
                        borderRadius: '8px',
                        background: 'rgba(192, 132, 252, 0.15)',
                        border: '1px solid rgba(192, 132, 252, 0.3)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Sparkles size={16} color="#c084fc" />
                    </div>
                    <div>
                      <h3
                        style={{
                          fontSize: '13px',
                          textTransform: 'uppercase',
                          letterSpacing: '0.06em',
                          fontWeight: 800,
                          color: '#f8fafc',
                          margin: 0,
                        }}
                      >
                        Studio des Requêtes Types
                      </h3>
                      <div style={{ fontSize: '11px', color: '#a78bfa', marginTop: '2px' }}>
                        Cliquez sur &ldquo;Copier&rdquo; pour injecter dans le chat VMIND
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '9px', marginTop: '16px' }}>
                    {sampleQueries.map((query, qIdx) => {
                      const isJustCopied = copiedQueryIdx === qIdx;
                      return (
                        <div
                          key={qIdx}
                          style={{
                            padding: '12px 14px',
                            borderRadius: '10px',
                            background: 'rgba(192, 132, 252, 0.05)',
                            border: '1px solid rgba(192, 132, 252, 0.18)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '12px',
                            transition: 'all 0.18s ease',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = 'rgba(192, 132, 252, 0.45)';
                            e.currentTarget.style.background = 'rgba(192, 132, 252, 0.1)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = 'rgba(192, 132, 252, 0.18)';
                            e.currentTarget.style.background = 'rgba(192, 132, 252, 0.05)';
                          }}
                        >
                          <div style={{ fontSize: '12.5px', color: '#e2e8f0', lineHeight: 1.45, flex: 1 }}>
                            <span style={{ color: '#c084fc', fontWeight: 800, marginRight: '4px' }}>&ldquo;</span>
                            {query}
                            <span style={{ color: '#c084fc', fontWeight: 800, marginLeft: '4px' }}>&rdquo;</span>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleCopyQuery(query, qIdx)}
                            title="Copier cette requête"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px',
                              height: '28px',
                              padding: '0 10px',
                              borderRadius: '7px',
                              border: isJustCopied ? '1px solid rgba(34, 197, 94, 0.6)' : '1px solid rgba(192, 132, 252, 0.35)',
                              background: isJustCopied ? 'rgba(34, 197, 94, 0.2)' : 'rgba(192, 132, 252, 0.15)',
                              color: isJustCopied ? '#4ade80' : '#ddd6fe',
                              fontSize: '11px',
                              fontWeight: 700,
                              cursor: 'pointer',
                              flexShrink: 0,
                              transition: 'all 0.15s ease',
                            }}
                            onMouseEnter={(e) => {
                              if (!isJustCopied) {
                                e.currentTarget.style.background = 'rgba(192, 132, 252, 0.3)';
                                e.currentTarget.style.color = '#ffffff';
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (!isJustCopied) {
                                e.currentTarget.style.background = 'rgba(192, 132, 252, 0.15)';
                                e.currentTarget.style.color = '#ddd6fe';
                              }
                            }}
                          >
                            {isJustCopied ? <Check size={12} /> : <Copy size={12} />}
                            <span>{isJustCopied ? 'Copié' : 'Copier'}</span>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 2. Fiche Gouvernance & Technique */}
                <div
                  style={{
                    padding: '22px 24px',
                    borderRadius: '16px',
                    background: 'rgba(13, 21, 39, 0.65)',
                    border: '1px solid rgba(148, 163, 184, 0.12)',
                    boxShadow: '0 10px 30px -10px rgba(0, 0, 0, 0.4)',
                  }}
                >
                  <div
                    style={{
                      fontSize: '11.5px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.07em',
                      fontWeight: 800,
                      color: '#64748b',
                      marginBottom: '14px',
                    }}
                  >
                    Gouvernance & Métadonnées
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '18px' }}>
                    <div
                      style={{
                        width: '38px',
                        height: '38px',
                        borderRadius: '10px',
                        background: 'linear-gradient(135deg, rgba(0, 229, 200, 0.15), rgba(56, 189, 248, 0.1))',
                        border: '1px solid rgba(0, 229, 200, 0.25)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#00E5C8',
                      }}
                    >
                      <User size={18} />
                    </div>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 750, color: '#ffffff' }}>
                        {authorLabel}
                      </div>
                      <div style={{ fontSize: '11.5px', color: '#94a3b8', marginTop: '2px' }}>
                        Portée d&apos;accès : <span style={{ color: '#00E5C8', fontWeight: 700 }}>{skill.scope}</span>
                      </div>
                    </div>
                  </div>

                  <div
                    style={{
                      borderTop: '1px solid rgba(148, 163, 184, 0.12)',
                      paddingTop: '14px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px',
                      fontSize: '12.5px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: '#94a3b8' }}>Version active</span>
                      <span
                        style={{
                          color: '#00E5C8',
                          fontWeight: 750,
                          fontFamily: 'monospace',
                          background: 'rgba(0, 229, 200, 0.1)',
                          padding: '2px 8px',
                          borderRadius: '6px',
                          border: '1px solid rgba(0, 229, 200, 0.25)',
                        }}
                      >
                        v{skill.version}
                      </span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: '#94a3b8' }}>Nature opératoire</span>
                      <span style={{ color: '#e2e8f0', fontWeight: 650 }}>
                        {skill.kind === 'method' ? 'Méthode d\'analyse' : 'Restitution visuelle'}
                      </span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: '#94a3b8' }}>Catégorie métier</span>
                      <span style={{ color: '#e2e8f0', fontWeight: 650, textTransform: 'capitalize' }}>
                        {skill.category || 'Général'}
                      </span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: '#94a3b8' }}>Fichiers packagés</span>
                      <span style={{ color: '#e2e8f0', fontWeight: 650 }}>
                        {totalFilesCount} fichier{totalFilesCount > 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 3. Manifeste des Fichiers Inclus & Explorateur Rapide */}
                <div
                  style={{
                    padding: '22px 24px',
                    borderRadius: '16px',
                    background: 'rgba(13, 21, 39, 0.65)',
                    border: '1px solid rgba(148, 163, 184, 0.12)',
                    boxShadow: '0 10px 30px -10px rgba(0, 0, 0, 0.4)',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: '14px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <FileText size={15} color="#00E5C8" />
                      <h3
                        style={{
                          fontSize: '12.5px',
                          textTransform: 'uppercase',
                          letterSpacing: '0.06em',
                          fontWeight: 800,
                          color: '#f8fafc',
                          margin: 0,
                        }}
                      >
                        Manifeste ({totalFilesCount})
                      </h3>
                    </div>

                    <button
                      type="button"
                      onClick={() => setActiveTab('contenu')}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#00E5C8',
                        fontSize: '11.5px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <span>Ouvrir l&apos;éditeur</span>
                      <ArrowRight size={12} />
                    </button>
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px',
                      maxHeight: '280px',
                      overflowY: 'auto',
                    }}
                  >
                    {/* SKILL.md */}
                    <div
                      onClick={() => {
                        setSelectedFilePath('/SKILL.md');
                        setActiveTab('contenu');
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '8px 12px',
                        borderRadius: '8px',
                        background: 'rgba(0, 229, 200, 0.05)',
                        border: '1px solid rgba(0, 229, 200, 0.2)',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(0, 229, 200, 0.12)';
                        e.currentTarget.style.borderColor = 'rgba(0, 229, 200, 0.45)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'rgba(0, 229, 200, 0.05)';
                        e.currentTarget.style.borderColor = 'rgba(0, 229, 200, 0.2)';
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                        <FileText size={13} color="#00E5C8" style={{ flexShrink: 0 }} />
                        <span style={{ fontSize: '12px', fontFamily: 'monospace', fontWeight: 700, color: '#00E5C8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          /SKILL.md
                        </span>
                      </div>
                      <span style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                        Principal
                      </span>
                    </div>

                    {/* Reference files */}
                    {Object.keys(currentSnapshot.references_json).map((ref) => {
                      const cleanPath = `/${ref.startsWith('references/') || ref.startsWith('skills/') ? ref : `references/${ref}`}`;
                      return (
                        <div
                          key={ref}
                          onClick={() => {
                            setSelectedFilePath(cleanPath);
                            setActiveTab('contenu');
                          }}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '8px 12px',
                            borderRadius: '8px',
                            background: 'rgba(255, 255, 255, 0.02)',
                            border: '1px solid rgba(148, 163, 184, 0.1)',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)';
                            e.currentTarget.style.borderColor = 'rgba(148, 163, 184, 0.25)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)';
                            e.currentTarget.style.borderColor = 'rgba(148, 163, 184, 0.1)';
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                            <FileText size={13} color="#94a3b8" style={{ flexShrink: 0 }} />
                            <span style={{ fontSize: '11.5px', fontFamily: 'monospace', color: '#cbd5e1', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {cleanPath}
                            </span>
                          </div>
                          <ArrowRight size={11} color="#64748b" style={{ flexShrink: 0 }} />
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : activeTab === 'contenu' ? (
          /* Tab Contenu · N (like Claude Image 3) */
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            {/* Version Bar */}
            <div
              style={{
                padding: '10px 24px',
                borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
                background: 'rgba(8, 14, 25, 0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                position: 'relative',
                flexShrink: 0,
              }}
            >
              {/* Version dropdown button */}
              <div style={{ position: 'relative' }}>
                <button
                  type="button"
                  onClick={() => setVersionDropdownOpen(!versionDropdownOpen)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '6px 12px',
                    borderRadius: '8px',
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: '#e2e8f0',
                    fontSize: '12.5px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  <span>
                    {skill.slug} · v{selectedVersionNumber}{' '}
                    {selectedVersionNumber === skill.version ? '(actuelle)' : ''}
                  </span>
                  <ChevronDown size={14} color="#94a3b8" />
                </button>

                {versionDropdownOpen && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '36px',
                      left: '0',
                      width: '280px',
                      maxHeight: '260px',
                      overflowY: 'auto',
                      borderRadius: '10px',
                      background: '#0d1527',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      boxShadow: '0 8px 30px rgba(0, 0, 0, 0.6)',
                      zIndex: 60,
                      padding: '6px',
                    }}
                  >
                    <div
                      style={{
                        padding: '6px 8px',
                        fontSize: '10.5px',
                        textTransform: 'uppercase',
                        color: '#64748b',
                        fontWeight: 700,
                      }}
                    >
                      Historique des versions
                    </div>
                    {/* Current version */}
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedVersionNumber(skill.version);
                        setVersionDropdownOpen(false);
                      }}
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '8px 10px',
                        borderRadius: '6px',
                        background:
                          selectedVersionNumber === skill.version
                            ? 'rgba(0, 229, 200, 0.1)'
                            : 'transparent',
                        border: 'none',
                        color: selectedVersionNumber === skill.version ? '#00E5C8' : '#e2e8f0',
                        fontSize: '12px',
                        cursor: 'pointer',
                        textAlign: 'left',
                      }}
                    >
                      <span style={{ fontWeight: 600 }}>v{skill.version} (actuelle)</span>
                      {selectedVersionNumber === skill.version && <Check size={13} />}
                    </button>

                    {/* Past versions */}
                    {versions
                      .filter((v) => v.version !== skill.version)
                      .map((v) => (
                        <div
                          key={v.version}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '4px 6px',
                          }}
                        >
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedVersionNumber(v.version);
                              setVersionDropdownOpen(false);
                            }}
                            style={{
                              flex: 1,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '6px 8px',
                              borderRadius: '6px',
                              background:
                                selectedVersionNumber === v.version
                                  ? 'rgba(0, 229, 200, 0.1)'
                                  : 'transparent',
                              border: 'none',
                              color: selectedVersionNumber === v.version ? '#00E5C8' : '#cbd5e1',
                              fontSize: '12px',
                              cursor: 'pointer',
                              textAlign: 'left',
                            }}
                          >
                            <div>
                              <div style={{ fontWeight: 600 }}>v{v.version}</div>
                              {v.comment && (
                                <div style={{ fontSize: '10.5px', color: '#64748b' }}>
                                  {v.comment}
                                </div>
                              )}
                            </div>
                            {selectedVersionNumber === v.version && <Check size={13} />}
                          </button>

                          {canEditDirectly && (
                            <button
                              type="button"
                              title="Restaurer cette version"
                              onClick={() => {
                                setVersionDropdownOpen(false);
                                handleRollback(v.version);
                              }}
                              style={{
                                padding: '4px 6px',
                                borderRadius: '4px',
                                background: 'transparent',
                                border: '1px solid rgba(255, 255, 255, 0.08)',
                                color: '#94a3b8',
                                cursor: 'pointer',
                                fontSize: '11px',
                                marginLeft: '4px',
                              }}
                            >
                              <RotateCcw size={12} />
                            </button>
                          )}
                        </div>
                      ))}
                  </div>
                )}
              </div>

              {selectedVersionNumber !== skill.version && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '12px',
                    color: '#fbbf24',
                    background: 'rgba(251, 191, 36, 0.08)',
                    padding: '4px 10px',
                    borderRadius: '6px',
                    border: '1px solid rgba(251, 191, 36, 0.2)',
                  }}
                >
                  <Info size={13} />
                  <span>Affichage de l&apos;archive v{selectedVersionNumber} (lecture seule)</span>
                  {canEditDirectly && (
                    <button
                      type="button"
                      onClick={() => handleRollback(selectedVersionNumber)}
                      style={{
                        padding: '2px 8px',
                        borderRadius: '4px',
                        background: '#fbbf24',
                        color: '#000',
                        fontWeight: 700,
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '11px',
                        marginLeft: '4px',
                      }}
                    >
                      Restaurer v{selectedVersionNumber}
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Two-Pane File Explorer + Viewer (like Claude Image 3) */}
            <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
              {/* Left Pane: File Tree Explorer */}
              <div
                style={{
                  width: '240px',
                  borderRight: '1px solid rgba(255, 255, 255, 0.07)',
                  background: 'rgba(8, 14, 25, 0.4)',
                  overflowY: 'auto',
                  padding: '12px 8px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '2px',
                  flexShrink: 0,
                }}
              >
                {renderTreeNodes(fileTree)}
              </div>

              {/* Right Pane: File Content View */}
              <div
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  minWidth: 0,
                  background: '#070c17',
                }}
              >
                {/* File Header Bar: Path breadcrumb + View toggles */}
                <div
                  style={{
                    padding: '8px 20px',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
                    background: 'rgba(10, 16, 29, 0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexShrink: 0,
                  }}
                >
                  {/* Path breadcrumb */}
                  <div
                    style={{
                      fontSize: '12.5px',
                      fontFamily: 'Consolas, Monaco, "Courier New", monospace',
                      color: '#94a3b8',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <span style={{ color: '#00E5C8' }}>{selectedFilePath}</span>
                  </div>

                  {/* Right toggles: Preview / Code + Copy button */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        background: 'rgba(255, 255, 255, 0.04)',
                        borderRadius: '6px',
                        padding: '2px',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                      }}
                    >
                      <button
                        type="button"
                        title="Aperçu Markdown formaté"
                        onClick={() => setViewMode('preview')}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '4px 8px',
                          borderRadius: '4px',
                          border: 'none',
                          background: viewMode === 'preview' ? 'rgba(0, 229, 200, 0.2)' : 'transparent',
                          color: viewMode === 'preview' ? '#00E5C8' : '#64748b',
                          fontSize: '11.5px',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        <Eye size={13} />
                        <span>Aperçu</span>
                      </button>

                      <button
                        type="button"
                        title="Code source brut"
                        onClick={() => setViewMode('code')}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '4px 8px',
                          borderRadius: '4px',
                          border: 'none',
                          background: viewMode === 'code' ? 'rgba(0, 229, 200, 0.2)' : 'transparent',
                          color: viewMode === 'code' ? '#00E5C8' : '#64748b',
                          fontSize: '11.5px',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        <CodeIcon size={13} />
                        <span>Code</span>
                      </button>
                    </div>

                    <button
                      type="button"
                      title="Copier le contenu du fichier"
                      onClick={handleCopyContent}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '5px 8px',
                        borderRadius: '6px',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        background: 'rgba(255, 255, 255, 0.02)',
                        color: copied ? '#00E5C8' : '#94a3b8',
                        fontSize: '11.5px',
                        cursor: 'pointer',
                      }}
                    >
                      {copied ? <Check size={12} /> : <Copy size={12} />}
                      <span>{copied ? 'Copié' : 'Copier'}</span>
                    </button>
                  </div>
                </div>

                {/* File Body Content */}
                <div
                  style={{
                    flex: 1,
                    overflowY: 'auto',
                    padding: '24px 28px',
                  }}
                >
                  {viewMode === 'preview' ? (
                    <div style={{ maxWidth: '820px', margin: '0 auto' }}>
                      {renderMarkdown(currentFileContent)}
                    </div>
                  ) : (
                    <pre
                      style={{
                        margin: 0,
                        padding: '16px 20px',
                        borderRadius: '8px',
                        background: '#090f1d',
                        border: '1px solid rgba(255, 255, 255, 0.06)',
                        color: '#93c5fd',
                        fontFamily: 'Consolas, Monaco, "Courier New", monospace',
                        fontSize: '12.5px',
                        lineHeight: '1.6',
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                        overflowX: 'auto',
                      }}
                    >
                      {currentFileContent || '# Fichier vide'}
                    </pre>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : activeTab === 'skills' ? (
          /* Tab Skills · X (Modular Business Capabilities) */
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '32px 36px',
              maxWidth: '1200px',
              margin: '0 auto',
              width: '100%',
            }}
          >
            <div style={{ marginBottom: '28px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                <Layers size={20} color="#00E5C8" />
                <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#ffffff', margin: 0 }}>
                  Compétences & Capacités Métier ({subSkills.length})
                </h2>
              </div>
              <p style={{ fontSize: '13.5px', color: '#94a3b8', margin: 0, lineHeight: 1.6 }}>
                Ce pack regroupe l&apos;ensemble des compétences métier transversales.
                Chaque capacité encapsule ses règles d&apos;analyse, KPIs et formules de calcul métier,
                tout en étant totalement agnostique du système ERP sous-jacent.
              </p>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(460px, 1fr))',
                gap: '20px',
              }}
            >
              {subSkills.map((sub) => (
                <div
                  key={sub.id}
                  style={{
                    background: 'rgba(10, 16, 29, 0.6)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '12px',
                    padding: '22px 24px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '16px',
                    transition: 'border-color 0.15s ease, transform 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(0, 229, 200, 0.35)';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  <div>
                    {/* Header: Title + Category */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        justifyContent: 'space-between',
                        gap: '12px',
                        marginBottom: '10px',
                      }}
                    >
                      <h3
                        style={{
                          fontSize: '15.5px',
                          fontWeight: 700,
                          color: '#ffffff',
                          margin: 0,
                          letterSpacing: '-0.01em',
                        }}
                      >
                        {sub.title}
                      </h3>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 600,
                          padding: '3px 8px',
                          borderRadius: '6px',
                          background: `${sub.categoryColor}18`,
                          color: sub.categoryColor,
                          border: `1px solid ${sub.categoryColor}33`,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {sub.category}
                      </span>
                    </div>

                    {/* Description */}
                    <p
                      style={{
                        fontSize: '13px',
                        lineHeight: '1.6',
                        color: '#cbd5e1',
                        margin: '0 0 16px 0',
                      }}
                    >
                      {sub.description}
                    </p>

                    {/* Trigger Queries */}
                    {sub.queries && sub.queries.length > 0 && (
                      <div>
                        <div
                          style={{
                            fontSize: '11px',
                            textTransform: 'uppercase',
                            letterSpacing: '0.04em',
                            fontWeight: 700,
                            color: '#64748b',
                            marginBottom: '8px',
                          }}
                        >
                          Exemples de requêtes utilisateur :
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          {sub.queries.map((q, qIdx) => (
                            <div
                              key={qIdx}
                              style={{
                                fontSize: '12px',
                                color: '#93c5fd',
                                background: 'rgba(59, 130, 246, 0.08)',
                                border: '1px solid rgba(59, 130, 246, 0.18)',
                                borderRadius: '6px',
                                padding: '6px 10px',
                                fontFamily: 'inherit',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                              }}
                            >
                              <span style={{ color: '#38bdf8', fontWeight: 700 }}>“</span>
                              <span>{q}</span>
                              <span style={{ color: '#38bdf8', fontWeight: 700 }}>”</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Footer link to Contenu tab */}
                  <div
                    style={{
                      paddingTop: '14px',
                      borderTop: '1px solid rgba(255, 255, 255, 0.06)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <span
                      style={{
                        fontSize: '11.5px',
                        color: '#64748b',
                        fontFamily: 'monospace',
                      }}
                    >
                      {sub.filePath}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedFilePath(sub.filePath);
                        setActiveTab('contenu');
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '6px 12px',
                        borderRadius: '6px',
                        background: 'rgba(0, 229, 200, 0.08)',
                        border: '1px solid rgba(0, 229, 200, 0.25)',
                        color: '#00E5C8',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(0, 229, 200, 0.18)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'rgba(0, 229, 200, 0.08)';
                      }}
                    >
                      <FileText size={13} />
                      <span>Consulter la règle</span>
                      <ArrowRight size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* Tab Connecteurs · Y (ERP & MCP Connectors) */
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '32px 36px',
              maxWidth: '1200px',
              margin: '0 auto',
              width: '100%',
            }}
          >
            <div style={{ marginBottom: '28px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                <Plug size={20} color="#00E5C8" />
                <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#ffffff', margin: 0 }}>
                  Connecteurs ERP & Adaptateurs MCP ({connectors.length})
                </h2>
              </div>
              <p style={{ fontSize: '13.5px', color: '#94a3b8', margin: 0, lineHeight: 1.6 }}>
                Architecture métier + adaptateurs : les règles métier restent universelles tandis que chaque adaptateur
                traduit les intentions de l&apos;agent en appels d&apos;outils MCP spécialisés pour l&apos;ERP ciblé.
              </p>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(460px, 1fr))',
                gap: '20px',
              }}
            >
              {connectors.map((conn) => (
                <div
                  key={conn.id}
                  style={{
                    background: 'rgba(10, 16, 29, 0.6)',
                    border: conn.isConnected
                      ? '1px solid rgba(34, 197, 94, 0.4)'
                      : '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '12px',
                    padding: '22px 24px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '16px',
                    boxShadow: conn.isConnected
                      ? '0 0 20px rgba(34, 197, 94, 0.08)'
                      : 'none',
                    transition: 'border-color 0.15s ease, transform 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    if (!conn.isConnected) {
                      e.currentTarget.style.borderColor = 'rgba(0, 229, 200, 0.35)';
                    }
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={(e) => {
                    if (!conn.isConnected) {
                      e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                    }
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  <div>
                    {/* Header: Name + Badge */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '12px',
                        marginBottom: '10px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div
                          style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '8px',
                            background: `${conn.logoColor}1a`,
                            border: `1px solid ${conn.logoColor}40`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: conn.logoColor,
                          }}
                        >
                          <Database size={16} />
                        </div>
                        <h3
                          style={{
                            fontSize: '15.5px',
                            fontWeight: 700,
                            color: '#ffffff',
                            margin: 0,
                          }}
                        >
                          {conn.name}
                        </h3>
                      </div>

                      {conn.isConnected ? (
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '4px 9px',
                            borderRadius: '99px',
                            background: 'rgba(34, 197, 94, 0.15)',
                            border: '1px solid rgba(34, 197, 94, 0.35)',
                            color: '#4ade80',
                            fontSize: '11px',
                            fontWeight: 600,
                          }}
                        >
                          <span
                            style={{
                              width: '7px',
                              height: '7px',
                              borderRadius: '50%',
                              background: '#22c55e',
                              boxShadow: '0 0 8px #22c55e',
                            }}
                          />
                          <span>Connecté à votre session</span>
                        </div>
                      ) : (
                        <span
                          style={{
                            fontSize: '11px',
                            color: '#64748b',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            background: 'rgba(255, 255, 255, 0.04)',
                            border: '1px solid rgba(255, 255, 255, 0.06)',
                          }}
                        >
                          Non connecté
                        </span>
                      )}
                    </div>

                    {/* Description */}
                    <p
                      style={{
                        fontSize: '13px',
                        lineHeight: '1.6',
                        color: '#cbd5e1',
                        margin: '0 0 16px 0',
                      }}
                    >
                      {conn.description}
                    </p>

                    {/* Tools mapped */}
                    {conn.tools && conn.tools.length > 0 && (
                      <div>
                        <div
                          style={{
                            fontSize: '11px',
                            textTransform: 'uppercase',
                            letterSpacing: '0.04em',
                            fontWeight: 700,
                            color: '#64748b',
                            marginBottom: '8px',
                          }}
                        >
                          Outils MCP ({conn.tools.length}) :
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                          {conn.tools.map((t) => (
                            <span
                              key={t}
                              style={{
                                fontSize: '11.5px',
                                fontFamily: 'Consolas, Monaco, "Courier New", monospace',
                                padding: '3px 8px',
                                borderRadius: '6px',
                                background: 'rgba(255, 255, 255, 0.04)',
                                border: '1px solid rgba(255, 255, 255, 0.08)',
                                color: conn.isConnected ? '#86efac' : '#cbd5e1',
                              }}
                            >
                              {t}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Footer link to Contenu tab */}
                  <div
                    style={{
                      paddingTop: '14px',
                      borderTop: '1px solid rgba(255, 255, 255, 0.06)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <span
                      style={{
                        fontSize: '11.5px',
                        color: '#64748b',
                        fontFamily: 'monospace',
                      }}
                    >
                      {conn.adapterFile}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedFilePath(conn.adapterFile);
                        setActiveTab('contenu');
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '6px 12px',
                        borderRadius: '6px',
                        background: 'rgba(0, 229, 200, 0.08)',
                        border: '1px solid rgba(0, 229, 200, 0.25)',
                        color: '#00E5C8',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(0, 229, 200, 0.18)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'rgba(0, 229, 200, 0.08)';
                      }}
                    >
                      <FileText size={13} />
                      <span>Consulter l&apos;adaptateur</span>
                      <ArrowRight size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
