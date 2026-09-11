'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useSearchParams } from 'next/navigation';
import GlobalLeadsModal from './GlobalLeadsModal';
import { LeadsEmptyState } from './LeadsEmptyState';
import { SourcingAgentExecutionModal } from '../../agents/components/SourcingAgentExecutionModal';
import { SourcingLauncherModal } from './SourcingLauncherModal';
import { VMindGuide, VMindGuideArrow, GuideMood } from '@/shared/management/components/VMindGuide';
import { CyberIcon } from '@/shared/management/components/CyberIcon';
import { Database, FileSpreadsheet, ScanLine, UserPlus, Zap, Globe, Sparkles, UploadCloud, Target, CheckCircle2, X } from 'lucide-react';
import { useProspectSocket } from '../hooks/useProspectSocket';
import { getAgents } from '@/shared/api/n8n-api';
import { useToast } from '@/shared/contexts/ToastContext';
import { LiveAgent } from '../../agents/AgentsView';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://localhost:3001';

interface QualifyProgressState {
  active: boolean;
  total: number;
  completedIds: number[];
  targetIds: number[];
  latestMessage?: string;
  isDone: boolean;
}

interface Lead {
  id: number;
  nom: string;
  prenom: string;
  email: string;
  poste?: string;
  entreprise?: string;
  secteur?: string;
  taille_ent?: number;
  pays?: string;
  source: string;
  date_collecte: string;
  statut: string;
  score: number | null;
  raison: string | null;
  potentiel: string | null;
  est_qualifie?: boolean;
  date_derniere_qualification?: string | null;
  email_statut?: string | null;
  email_erreur?: string | null;
  emails_count?: number;
  agent_emails_count?: number;
  date_envoi?: string | null;
}

interface LeadsViewProps {
  leads: Lead[];
  threshold: number;
  onOpenLead: (lead: Lead) => void;
  onRefresh: () => void;
  isNavTutorialActive?: boolean;
  agent?: any;
}

const StyledCheckbox = ({ checked, onChange, isIndeterminate }: { checked: boolean, onChange: (e: any) => void, isIndeterminate?: boolean }) => (
  <div
    onClick={(e) => { e.stopPropagation(); onChange({ target: { checked: !checked } }); }}
    style={{
      width: '18px',
      height: '18px',
      borderRadius: '4px',
      border: `2px solid ${checked || isIndeterminate ? 'var(--accent-secondary, #00E5C8)' : 'var(--border-color, #444)'}`,
      backgroundColor: checked || isIndeterminate ? 'var(--accent-secondary, #00E5C8)' : 'transparent',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      margin: '0 auto',
      boxShadow: checked || isIndeterminate ? '0 0 8px rgba(0,229,200,0.3)' : 'none'
    }}
  >
    {checked && !isIndeterminate && (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#0F172A" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12"></polyline>
      </svg>
    )}
    {isIndeterminate && (
      <div style={{ width: '8px', height: '2px', backgroundColor: '#0F172A', borderRadius: '1px' }}></div>
    )}
  </div>
);

// Zero Technical Jargon policy: sanitize and translate raw backend logs for the end user
function formatUserFacingMessage(raw?: string): string {
  if (!raw) return "Initialisation de l'évaluation IA...";
  const lower = raw.toLowerCase();
  if (lower.includes('lancée') || lower.includes('initialisation') || lower.includes('démarrage') || (lower.includes('qualification de') && lower.includes('prospect'))) {
    return "Initialisation et analyse des profils par l'IA...";
  }
  // Strip out any technical middleware names or API artifacts
  const clean = raw
    .replace(/\s*via\s+n8n\.?/gi, '')
    .replace(/\s*\(n8n\)/gi, '')
    .replace(/\bn8n\b/gi, '')
    .replace(/\bqstash\b/gi, '')
    .replace(/\bworkflow\b/gi, 'processus')
    .replace(/\bpayload\b/gi, 'données')
    .trim();

  return clean || "Analyse du prospect en cours...";
}

export default function LeadsView({ leads, threshold, onOpenLead, onRefresh, isNavTutorialActive, agent }: LeadsViewProps) {
  const { agentId } = useParams();
  const searchParams = useSearchParams();
  const { showToast } = useToast();

  const [executingSourcingAgent, setExecutingSourcingAgent] = useState<LiveAgent | null>(null);
  const [isSourcingLauncherOpen, setIsSourcingLauncherOpen] = useState(false);
  const [allSourcingAgents, setAllSourcingAgents] = useState<any[]>([]);
  const [isLoadingSourcingCheck, setIsLoadingSourcingCheck] = useState(false);

  const handleOpenSourcing = async () => {
    setIsLoadingSourcingCheck(true);
    try {
      const agents = await getAgents();
      const sourcingAgents = (agents || []).filter(
        (a: any) => a.run_mode === 'sourcing'
      );
      setAllSourcingAgents(sourcingAgents);

      const currentId = String(agentId || agent?.uuid || agent?.agent_id || '').toLowerCase();
      const currentName = String(agent?.agent_name || agent?.nom || '').toLowerCase();

      // Find Sourcing agents that already target this Prospect agent
      const targetingAgents = sourcingAgents.filter((sa: any) => {
        const rawTargets = sa?.config?.target_agent_ids || sa?.target_agent_ids || [];
        if (!Array.isArray(rawTargets)) return false;
        return rawTargets.some((id: any) => {
          const sId = String(id).toLowerCase();
          return (currentId && sId === currentId) || (currentName && sId === currentName);
        });
      });

      if (targetingAgents.length === 1) {
        if (targetingAgents[0].is_executing) {
          showToast(`L'agent de sourcing "${targetingAgents[0].agent_name}" est déjà en cours d'exécution ⚡`, 'info');
        }
        setExecutingSourcingAgent(targetingAgents[0]);
      } else {
        setIsSourcingLauncherOpen(true);
      }
    } catch (err: any) {
      console.error("Failed to load sourcing agents:", err);
      setIsSourcingLauncherOpen(true);
    } finally {
      setIsLoadingSourcingCheck(false);
    }
  };

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [sourceFilter, setSourceFilter] = useState('All');
  const [scoreFilter, setScoreFilter] = useState('All'); // 'All', 'Qualified', 'Unqualified'
  const [sortBy, setSortBy] = useState('date_collecte'); // 'date_collecte', 'score', 'statut'
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 25;

  const [selectedLeadIds, setSelectedLeadIds] = useState<number[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [csvUploading, setCsvUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const [isBulkQualifying, setIsBulkQualifying] = useState(false);
  const [qualifyingCount, setQualifyingCount] = useState(0);
  const [isGlobalModalOpen, setIsGlobalModalOpen] = useState(false);

  // Live Qualification Progress (Tracked via WebSockets)
  const [qualifyProgress, setQualifyProgress] = useState<QualifyProgressState | null>(null);
  const qualifyProgressRef = useRef<QualifyProgressState | null>(null);
  qualifyProgressRef.current = qualifyProgress;
  const dismissTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [fakePercent, setFakePercent] = useState<number>(14);

  // Clean up auto-dismiss timer on unmount
  useEffect(() => {
    return () => {
      if (dismissTimerRef.current) {
        clearTimeout(dismissTimerRef.current);
      }
    };
  }, []);

  // Synthetic progressive easing for percentage display (eliminates stagnant 0% sensation while waiting for AI inference)
  useEffect(() => {
    if (!qualifyProgress || !qualifyProgress.active) return;

    if (qualifyProgress.isDone) {
      setFakePercent(100);
      return;
    }

    const completed = qualifyProgress.completedIds.length;
    const total = Math.max(qualifyProgress.total, 1);
    const completedFloor = Math.round((completed / total) * 100);
    const nextCap = Math.min(Math.round(((completed + 1) / total) * 100) - 3, 94);

    setFakePercent(prev => Math.max(prev, completedFloor > 0 ? completedFloor : 14));

    const interval = setInterval(() => {
      setFakePercent((prev) => {
        if (prev >= nextCap) return prev;
        const diff = nextCap - prev;
        const step = diff > 35 ? Math.floor(Math.random() * 5 + 3) : diff > 12 ? Math.floor(Math.random() * 3 + 1) : 1;
        return Math.min(prev + step, nextCap);
      });
    }, 450);

    return () => clearInterval(interval);
  }, [qualifyProgress?.active, qualifyProgress?.isDone, qualifyProgress?.completedIds.length, qualifyProgress?.total]);

  // Listen to qualify-start events dispatched from other components (e.g., LeadDetailDrawer)
  useEffect(() => {
    const handleQualifyStart = (e: CustomEvent) => {
      const { leadIds, total } = e.detail || {};
      const count = total || (leadIds ? leadIds.length : 1);
      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
      setFakePercent(14);
      const newState: QualifyProgressState = {
        active: true,
        total: count,
        completedIds: [],
        targetIds: leadIds || [],
        latestMessage: "Initialisation et analyse des profils par l'IA...",
        isDone: false
      };
      setQualifyProgress(newState);
      qualifyProgressRef.current = newState;
    };

    window.addEventListener('vmind:qualify-start' as any, handleQualifyStart as EventListener);
    return () => {
      window.removeEventListener('vmind:qualify-start' as any, handleQualifyStart as EventListener);
    };
  }, []);

  // Listen to real-time qualification updates from PostgreSQL execution logs & qualifications
  useProspectSocket((payload) => {
    const current = qualifyProgressRef.current;

    // 1. Process execution log entries inserted by n8n during qualification
    if (payload.table === 'prospect_agent_logs_execution' && payload.new) {
      const etape = (payload.new.etape || '').toString();
      const message = (payload.new.message || '').toString();
      const statut = (payload.new.statut || payload.new.status || '').toString().toUpperCase();

      console.log('[QUALIFY-SOCKET] Log execution received:', { etape, message, statut });

      // Check if it's the initial launch log from the backend route (e.g., "Qualification de X prospect(s) lancée via n8n.")
      const isLaunchLog = message.includes('lancée via n8n') || (message.includes('Qualification de') && message.includes('prospect'));
      if (isLaunchLog) {
        console.log('[QUALIFY-SOCKET] Launch log detected, keeping progress active...');
        const countMatch = message.match(/Qualification de\s*(\d+)\s*prospect/i);
        const parsedCount = countMatch ? parseInt(countMatch[1], 10) : (current?.total || 1);

        if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
        setFakePercent(14);
        const updated: QualifyProgressState = {
          active: true,
          total: current && current.total > 0 ? current.total : parsedCount,
          completedIds: current ? current.completedIds : [],
          targetIds: current ? current.targetIds : [],
          latestMessage: "Initialisation et analyse des profils par l'IA...",
          isDone: false
        };
        setQualifyProgress(updated);
        qualifyProgressRef.current = updated;
        return;
      }

      if (!current || !current.active) return;

      // Check if it's an actual lead evaluation log from n8n (contains Score ICP or Lead #ID)
      const isLeadEval = message.includes('Score ICP') || /Lead\s*#\d+/i.test(message);

      if (isLeadEval) {
        const match = message.match(/Lead\s*#(\d+)/i);
        let leadId = match ? parseInt(match[1], 10) : null;

        if (!leadId) {
          const nameMatch = message.match(/Lead\s*#([^\(—\-]+)/i);
          if (nameMatch) {
            const raw = nameMatch[1].trim().toLowerCase();
            const found = leads.find(l =>
              (l.nom && l.nom.toLowerCase().includes(raw)) ||
              (l.prenom && l.prenom.toLowerCase().includes(raw)) ||
              (l.entreprise && l.entreprise.toLowerCase().includes(raw))
            );
            if (found) {
              leadId = found.id;
            }
          }
        }

        const newCompleted = [...current.completedIds];
        if (leadId && !newCompleted.includes(leadId)) {
          newCompleted.push(leadId);
        }

        const isFinished = newCompleted.length >= current.total;
        console.log(`[QUALIFY-SOCKET] Lead evaluated (${newCompleted.length}/${current.total}), isFinished:`, isFinished);

        const updated: QualifyProgressState = {
          ...current,
          completedIds: newCompleted,
          latestMessage: message,
          isDone: isFinished,
        };

        setQualifyProgress(updated);
        qualifyProgressRef.current = updated;
        onRefresh();

        if (isFinished) {
          if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
          dismissTimerRef.current = setTimeout(() => {
            setQualifyProgress(null);
            qualifyProgressRef.current = null;
          }, 4000);
        }
      } else if (statut === 'COMPLETED' || statut === 'SUCCESS') {
        // Only mark finished on workflow completion if ALL leads were evaluated (or at least all expected)
        if (payload.new.workflow_id && payload.new.workflow_id.toString().includes('qualif') && current.completedIds.length >= current.total) {
          const updated: QualifyProgressState = {
            ...current,
            isDone: true,
          };
          setQualifyProgress(updated);
          qualifyProgressRef.current = updated;
          onRefresh();

          if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
          dismissTimerRef.current = setTimeout(() => {
            setQualifyProgress(null);
            qualifyProgressRef.current = null;
          }, 4000);
        }
      }
    }

    // 2. Also listen for prospect_agent_qualifications triggers as secondary confirmation
    if (payload.table === 'prospect_agent_qualifications' && payload.new) {
      const qualLeadId = payload.new.lead_id;
      if (qualLeadId) {
        const activeCurrent: QualifyProgressState = current && current.active ? current : {
          active: true,
          total: 1,
          completedIds: [],
          targetIds: [qualLeadId],
          latestMessage: "Évaluation enregistrée par l'IA...",
          isDone: false
        };

        if (activeCurrent.targetIds.length === 0 || activeCurrent.targetIds.includes(qualLeadId)) {
          if (!activeCurrent.completedIds.includes(qualLeadId)) {
            const newCompleted = [...activeCurrent.completedIds, qualLeadId];
            const isFinished = newCompleted.length >= activeCurrent.total;
            console.log(`[QUALIFY-SOCKET] Qualification DB row detected for lead #${qualLeadId} (${newCompleted.length}/${activeCurrent.total})`);

            const updated: QualifyProgressState = {
              ...activeCurrent,
              completedIds: newCompleted,
              isDone: isFinished,
            };
            setQualifyProgress(updated);
            qualifyProgressRef.current = updated;
            onRefresh();

            if (isFinished) {
              if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
              dismissTimerRef.current = setTimeout(() => {
                setQualifyProgress(null);
                qualifyProgressRef.current = null;
              }, 4000);
            }
          }
        }
      }
    }
  });

  const [availableAgents, setAvailableAgents] = useState<any[]>([]);
  const [selectedAgentIds, setSelectedAgentIds] = useState<string[]>([agentId as string]);

  // Tutorial state
  const [leadsTutorialStep, setLeadsTutorialStep] = useState<number>(0);

  useEffect(() => {
    if (isNavTutorialActive) {
      setLeadsTutorialStep(0);
      return;
    }
    if (!localStorage.getItem('vmind_tutorial_workspace_prospects')) {
      localStorage.setItem('vmind_tutorial_workspace_prospects', 'true');
      setLeadsTutorialStep(1);
    }
  }, [isNavTutorialActive]);

  const nextTutorialStep = () => {
    if (leadsTutorialStep === 5 && filteredLeads.length === 0) {
      setLeadsTutorialStep(0); // skip 6 if no rows
    } else if (leadsTutorialStep >= 6) {
      setLeadsTutorialStep(0);
    } else {
      setLeadsTutorialStep(s => s + 1);
    }
  };

  const getTutorialContent = () => {
    switch (leadsTutorialStep) {
      case 1:
        return {
          title: "Exportation",
          message: "Besoin de vos données en externe ? Exportez instantanément la vue filtrée en CSV.",
          mood: 'settled' as GuideMood
        };
      case 2:
        return {
          title: "Qualification en masse",
          message: "Demandez à l'IA de scanner et qualifier tous les prospects sélectionnés en temps réel.",
          mood: 'focused' as GuideMood
        };
      case 3:
        return {
          title: "Assignation",
          message: "Vous avez des leads globaux ? Cliquez ici pour les affecter directement à cet agent.",
          mood: 'curious' as GuideMood
        };
      case 4:
        return {
          title: "Ingestion Avancée",
          message: "Importez massivement via fichier, API, ou un simple copier-coller. Je m'occupe de la structure.",
          mood: 'convinced' as GuideMood
        };
      case 5:
        return {
          title: "Recherche & Filtres",
          message: "Filtrez vos prospects par recherche texte, statut IA, source, ou score ICP pour trouver l'aiguille dans la botte de foin.",
          mood: 'focused' as GuideMood
        };
      case 6:
        return {
          title: "Détails du Prospect",
          message: "Ouvrez ce panneau pour découvrir l'analyse complète de l'IA, ses recherches web sur l'entreprise, et les emails générés.",
          mood: 'curious' as GuideMood
        };
      default:
        return null;
    }
  };

  const getTabBtnStyle = (step: number) => {
    if (leadsTutorialStep === step && !isNavTutorialActive) {
      return {
        position: 'relative' as any,
        zIndex: 10003,
        background: '#00E5C8',
        color: '#04101E',
        fontWeight: 700,
        boxShadow: '0 0 0 3px #00E5C8, 0 0 25px rgba(0, 229, 200, 0.75)',
        pointerEvents: 'none' as any,
      };
    }
    return {};
  };

  const renderTutorialArrow = (step: number) => {
    if (leadsTutorialStep === step && !isNavTutorialActive) {
      return (
        <VMindGuideArrow
          direction="up"
          color="#00E5C8"
          style={{
            position: 'absolute',
            bottom: '-42px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 10004
          }}
        />
      );
    }
    return null;
  };

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/list-agents`, { headers: { 'Authorization': `Bearer ${localStorage.getItem('vmind_session')}` } })
      .then(res => res.json())
      .then(data => {
        let agents = [];
        if (Array.isArray(data)) {
          agents = data;
        } else if (data && Array.isArray(data.agents)) {
          agents = data.agents;
        }
        // Filter out agents that don't have an agent_id and ensure they are prospection agents
        const validProspectAgents = agents.filter((a: any) =>
          a && a.agent_id != null && a.run_mode === 'prospection'
        );
        setAvailableAgents(validProspectAgents);
      })
      .catch(err => console.error("Failed to load agents", err));
  }, []);

  const handleAgentToggle = (id: string) => {
    setSelectedAgentIds(prev =>
      prev.includes(id) && prev.length > 1 ? prev.filter(a => a !== id) :
        prev.includes(id) ? prev : [...prev, id]
    );
  };

  // Filter leads
  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      const matchesSearch =
        `${lead.prenom} ${lead.nom}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (lead.entreprise || '').toLowerCase().includes(searchTerm.toLowerCase());

      const displayedStatus = lead.est_qualifie === true ? 'Qualifié' : lead.est_qualifie === false ? 'Écarté' : lead.statut || 'Nouveau';
      const matchesStatus = statusFilter === 'All' || displayedStatus === statusFilter;

      const matchesSource = sourceFilter === 'All' || lead.source === sourceFilter;

      let matchesScore = true;
      if (scoreFilter === 'Qualified') {
        matchesScore = lead.est_qualifie === true;
      } else if (scoreFilter === 'Unqualified') {
        matchesScore = lead.est_qualifie === false && lead.score !== null;
      }

      return matchesSearch && matchesStatus && matchesSource && matchesScore;
    });
  }, [leads, searchTerm, statusFilter, sourceFilter, scoreFilter, threshold]);

  // Sort leads
  const sortedLeads = useMemo(() => {
    return [...filteredLeads].sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'date_collecte') {
        comparison = new Date(a.date_collecte).getTime() - new Date(b.date_collecte).getTime();
      } else if (sortBy === 'score') {
        comparison = (a.score ?? -1) - (b.score ?? -1);
      } else if (sortBy === 'statut') {
        const statusA = a.est_qualifie === true ? 'Qualifié' : a.est_qualifie === false ? 'Écarté' : a.statut || 'Nouveau';
        const statusB = b.est_qualifie === true ? 'Qualifié' : b.est_qualifie === false ? 'Écarté' : b.statut || 'Nouveau';
        comparison = statusA.localeCompare(statusB);
      } else if (sortBy === 'emails_count') {
        comparison = (a.emails_count || 0) - (b.emails_count || 0);
      }

      return sortOrder === 'desc' ? -comparison : comparison;
    });
  }, [filteredLeads, sortBy, sortOrder]);

  // Pagination
  const totalPages = Math.ceil(sortedLeads.length / itemsPerPage);
  const paginatedLeads = sortedLeads.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const toggleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  // Export CSV
  const exportToCSV = () => {
    const leadsToExport = selectedLeadIds.length > 0
      ? sortedLeads.filter(l => selectedLeadIds.includes(l.id))
      : sortedLeads;

    const headers = ['Nom', 'Prénom', 'Email', 'Poste', 'Entreprise', 'Secteur', 'Taille', 'Pays', 'Source', 'Statut', 'Score', 'Potentiel', 'Date Collecte'];
    const rows = leadsToExport.map((lead) => [
      lead.nom,
      lead.prenom,
      lead.email,
      lead.poste || '',
      lead.entreprise || '',
      lead.secteur || '',
      lead.taille_ent || '',
      lead.pays || '',
      lead.source,
      lead.statut,
      lead.score !== null ? lead.score : '',
      lead.potentiel || '',
      lead.date_collecte
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(','), ...rows.map(e => e.map(val => `"${val.toString().replace(/"/g, '""')}"`).join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `leads_export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Ingestion Console States
  const [showImportConsole, setShowImportConsole] = useState(false);
  const [importTab, setImportTab] = useState<'file' | 'url' | 'paste'>('file');
  const [importUrl, setImportUrl] = useState('');
  const [importPasteText, setImportPasteText] = useState('');
  const [importProgress, setImportProgress] = useState<{ current: number; total: number } | null>(null);
  const [newlyImportedLeads, setNewlyImportedLeads] = useState<Lead[]>([]);
  const [showQualifyPrompt, setShowQualifyPrompt] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    if (searchParams.get('action') === 'import') {
      setShowImportConsole(true);
    }
  }, [searchParams]);

  // Unified leads ingestion loop
  const importLeads = async (leadsData: any[]) => {
    if (leadsData.length === 0) {
      setUploadMessage({
        text: "Aucun prospect valide trouvé à importer.",
        type: 'error'
      });
      return;
    }

    setCsvUploading(true);
    setUploadMessage(null);
    setImportProgress({ current: 0, total: leadsData.length });
    let successCount = 0;
    let failCount = 0;
    let lastError = '';
    const imported: Lead[] = [];

    for (let i = 0; i < leadsData.length; i++) {
      const lead = leadsData[i];
      try {
        const res = await fetch(`${API_BASE_URL}/api/agent-leads`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('vmind_session')}`
          },
          body: JSON.stringify({ ...lead, agentIds: selectedAgentIds }),
        });
        if (res.ok) {
          const newLead = await res.json();
          imported.push(newLead);
          successCount++;
        } else {
          const errData = await res.json().catch(() => ({}));
          lastError = errData.error || `Erreur HTTP ${res.status}`;
          failCount++;
        }
      } catch (err: any) {
        lastError = err.message || 'Erreur réseau';
        failCount++;
      }
      setImportProgress({ current: i + 1, total: leadsData.length });
    }

    setUploadMessage({
      text: `Importation terminée : ${successCount} prospects importés avec succès, ${failCount} ignorés (doublons ou erreurs).`,
      type: 'success'
    });

    setImportProgress(null);
    setCsvUploading(false);
    setImportUrl('');
    setImportPasteText('');

    if (imported.length > 0) {
      setNewlyImportedLeads(imported);
      setShowQualifyPrompt(true);
    }

    onRefresh();
  };

  // File Upload (JSON or CSV) — forwarded to n8n webhook via /api/import-file
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCsvUploading(true);
    setUploadMessage(null);

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const text = evt.target?.result as string;
        const fileName = file.name.toLowerCase();
        const fileType = fileName.endsWith('.json') ? 'application/json' : 'text/csv';

        setUploadMessage(null);

        // Forward to backend which calls n8n and normalizes the response
        const res = await fetch(`${API_BASE_URL}/api/prospect-agent/import/file`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('vmind_session')}`,
            'Idempotency-Key': crypto.randomUUID()
          },
          body: JSON.stringify({
            fileContent: text,
            fileType: file.type || fileType,
            agentIds: selectedAgentIds
          })
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || 'Erreur lors de l\'envoi et du traitement du fichier.');
        }

        if (!data.leads || data.leads.length === 0) {
          throw new Error('Aucun prospect valide n\'a été extrait du fichier.');
        }

        await importLeads(data.leads);
      } catch (err: any) {
        setUploadMessage({ text: err.message || 'Erreur lors de la lecture du fichier.', type: 'error' });
        setCsvUploading(false);
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  // Fetch URL Ingest
  const handleUrlImport = async () => {
    if (!importUrl.trim()) return;
    setCsvUploading(true);
    setUploadMessage(null);

    try {
      const res = await fetch(`${API_BASE_URL}/api/prospect-agent/import/url`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('vmind_session')}`,
          'Idempotency-Key': crypto.randomUUID()
        },
        body: JSON.stringify({ url: importUrl.trim(), agentIds: selectedAgentIds })
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Erreur lors du téléchargement des prospects.");
      }

      await importLeads(data.leads || []);
    } catch (err: any) {
      setUploadMessage({ text: err.message || "Impossible d'importer depuis cette URL.", type: 'error' });
      setCsvUploading(false);
    }
  };

  // Text Paste Ingest
  const handlePasteImport = async () => {
    if (!importPasteText.trim()) return;
    setCsvUploading(true);
    setUploadMessage(null);

    try {
      const trimmed = importPasteText.trim();
      let leadsData: Record<string, unknown>[] = [];

      if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
        // Parse JSON
        const parsed = JSON.parse(trimmed);
        const rawList = Array.isArray(parsed) ? parsed : [parsed];
        leadsData = rawList.map((item: Record<string, unknown>) => ({
          nom: (item.nom || item.lastName || '') as string,
          prenom: (item.prenom || item.firstName || '') as string,
          email: (item.email || '') as string,
          poste: (item.poste || item.jobTitle || '') as string,
          entreprise: (item.entreprise || item.company || '') as string,
          secteur: (item.secteur || item.industry || '') as string,
          taille_ent: (item.taille_ent || item.companySize || item.employees || null) as number | null,
          pays: (item.pays || item.country || '') as string,
          source: 'API'
        })).filter(l => l.email && l.nom && l.prenom);
      } else {
        // Parse CSV
        const lines = trimmed.split('\n').map(l => l.trim()).filter(Boolean);
        if (lines.length > 0) {
          const delimiter = lines[0].includes(';') ? ';' : ',';
          const headers = lines[0].toLowerCase().split(delimiter).map(h => h.trim().replace(/^"|"$/g, ''));

          for (let i = 1; i < lines.length; i++) {
            const cols = lines[i].split(delimiter).map(c => c.trim().replace(/^"|"$/g, ''));
            if (cols.length < 3) continue;

            const leadObj: Record<string, unknown> = { source: 'CSV' };
            headers.forEach((header, index) => {
              if (cols[index] !== undefined && cols[index] !== '') {
                const cleanHeader = header.trim();
                if (cleanHeader === 'taille_ent') {
                  leadObj[cleanHeader] = parseInt(cols[index]) || null;
                } else {
                  leadObj[cleanHeader] = cols[index];
                }
              }
            });

            if (leadObj.email && leadObj.nom && leadObj.prenom) {
              leadsData.push(leadObj);
            }
          }
        }
      }

      if (leadsData.length === 0) {
        throw new Error("Aucun prospect valide trouvé. Veuillez vérifier le format de saisie.");
      }

      await importLeads(leadsData);
    } catch (err: unknown) {
      setUploadMessage({ text: err instanceof Error ? err.message : "Erreur de traitement des données collées.", type: 'error' });
      setCsvUploading(false);
    }
  };

  const handleQualifyNewLeads = async () => {
    if (newlyImportedLeads.length === 0) return;

    setShowQualifyPrompt(false);
    const lead_ids = newlyImportedLeads.map((l: Lead) => l.id);
    const count = lead_ids.length;

    setIsBulkQualifying(true);
    setQualifyingCount(count);
    setUploadMessage(null);

    if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
    setFakePercent(14);
    setQualifyProgress({
      active: true,
      total: count,
      completedIds: [],
      targetIds: lead_ids,
      latestMessage: "Initialisation et analyse des profils par l'IA...",
      isDone: false
    });

    try {
      const res = await fetch(`${API_BASE_URL}/api/prospect-agent/qualify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('vmind_session')}`,
          'Idempotency-Key': crypto.randomUUID()
        },
        body: JSON.stringify({ lead_ids, agentId }),
      });

      if (!res.ok) {
        throw new Error('Erreur API qualification');
      }
    } catch (err: unknown) {
      setQualifyProgress(null);
      setUploadMessage({
        text: `Erreur lors de la qualification automatique : ${err instanceof Error ? err.message : 'Erreur interne'}`,
        type: 'error'
      });
    } finally {
      setIsBulkQualifying(false);
      setNewlyImportedLeads([]);
      onRefresh();
    }
  };

  const handleBulkQualify = async () => {
    const leadsToQualify = selectedLeadIds.length > 0
      ? filteredLeads.filter(l => selectedLeadIds.includes(l.id))
      : filteredLeads;

    if (leadsToQualify.length === 0) return;

    const lead_ids = leadsToQualify.map((l: Lead) => l.id);
    const count = lead_ids.length;

    setIsBulkQualifying(true);
    setQualifyingCount(count);
    setUploadMessage(null);

    if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
    setFakePercent(14);
    setQualifyProgress({
      active: true,
      total: count,
      completedIds: [],
      targetIds: lead_ids,
      latestMessage: "Initialisation et analyse des profils par l'IA...",
      isDone: false
    });
    setSelectedLeadIds([]);

    try {
      const res = await fetch(`${API_BASE_URL}/api/prospect-agent/qualify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('vmind_session')}`,
          'Idempotency-Key': crypto.randomUUID()
        },
        body: JSON.stringify({ lead_ids, agentId }),
      });

      if (!res.ok) {
        throw new Error('Erreur API qualification');
      }
      // Live progress and dynamic increments are handled in real-time by qualifyProgress via WebSocket!
    } catch (err: unknown) {
      setQualifyProgress(null);
      setUploadMessage({
        text: `Erreur lors de la qualification : ${err instanceof Error ? err.message : 'Erreur interne'}`,
        type: 'error'
      });
    } finally {
      setIsBulkQualifying(false);
      onRefresh();
    }
  };

  return (
    <div className="fade-in">
      {/* ── Tutorial Overlay ── */}
      {leadsTutorialStep > 0 && !isNavTutorialActive && (
        <div
          onClick={nextTutorialStep}
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(3, 8, 16, 0.82)', zIndex: 10000,
            cursor: 'pointer'
          }}
        />
      )}

      {/* ── VMind Guide for Tutorial ── */}
      {leadsTutorialStep > 0 && !isNavTutorialActive && (
        <VMindGuide
          isOpen={leadsTutorialStep > 0 && !isNavTutorialActive}
          title={getTutorialContent()?.title}
          message={getTutorialContent()?.message || null}
          mood={getTutorialContent()?.mood}
          showBackdrop={false}
          onClose={() => setLeadsTutorialStep(0)}
        >
          <div className="vmind-guide-actions" style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px', marginTop: '14px' }}>
            <button
              type="button"
              className="vmind-guide-btn-primary"
              onClick={nextTutorialStep}
            >
              <span>{leadsTutorialStep < 6 ? 'Suivant' : 'Terminer'}</span>
              <CyberIcon name="arrow-right" size={13} color="currentColor" />
            </button>
          </div>
        </VMindGuide>
      )}

      <div className="view-header" style={{ position: 'relative', zIndex: leadsTutorialStep > 0 && leadsTutorialStep < 5 ? 10001 : 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            background: 'rgba(0, 229, 200, 0.1)',
            border: '1px solid rgba(0, 229, 200, 0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#00E5C8',
            flexShrink: 0
          }}>
            <Database size={22} />
          </div>
          <div className="view-title">
            <h1 style={{ margin: 0 }}>Liste des Prospects</h1>
            <p style={{ margin: '0.25rem 0 0 0' }}>Visualiser, filtrer et gérer vos leads qualifiés par l&apos;intelligence artificielle</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', flexShrink: 0 }}>
          <button
            className="btn btn-secondary"
            onClick={exportToCSV}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '0.45rem 0.85rem', fontSize: '0.85rem', whiteSpace: 'nowrap', ...getTabBtnStyle(1) }}
          >
            {renderTutorialArrow(1)}
            <FileSpreadsheet size={15} style={{ flexShrink: 0 }} />
            <span>Exporter CSV ({selectedLeadIds.length > 0 ? selectedLeadIds.length : sortedLeads.length})</span>
          </button>
          <button
            className="btn btn-secondary"
            onClick={handleBulkQualify}
            disabled={isBulkQualifying || csvUploading || filteredLeads.length === 0}
            style={{ borderColor: 'var(--accent-secondary)', display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '0.45rem 0.85rem', fontSize: '0.85rem', whiteSpace: 'nowrap', ...getTabBtnStyle(2) }}
          >
            {renderTutorialArrow(2)}
            <ScanLine size={15} style={{ flexShrink: 0 }} />
            <span>{isBulkQualifying ? 'Qualification...' : `Qualifier (${selectedLeadIds.length > 0 ? selectedLeadIds.length : filteredLeads.length})`}</span>
          </button>
          <button
            className="btn btn-primary"
            onClick={() => setIsGlobalModalOpen(true)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '0.45rem 0.85rem', fontSize: '0.85rem', whiteSpace: 'nowrap', ...getTabBtnStyle(3) }}
          >
            {renderTutorialArrow(3)}
            <UserPlus size={15} style={{ flexShrink: 0 }} />
            <span>Assigner Prospect</span>
          </button>
          <button
            className="btn btn-primary"
            onClick={() => setShowImportConsole(!showImportConsole)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '0.45rem 0.85rem', fontSize: '0.85rem', whiteSpace: 'nowrap', ...getTabBtnStyle(4) }}
          >
            {renderTutorialArrow(4)}
            <Zap size={15} style={{ flexShrink: 0 }} />
            <span>Ingestion {showImportConsole ? '▲' : '▼'}</span>
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".csv,.json"
            style={{ display: 'none' }}
          />
        </div>
      </div>

      {/* ── Live Qualification Cyber Progress Bar (WebSocket-tracked) ── */}
      {qualifyProgress && (
        <div
          className="card fade-in"
          style={{
            marginBottom: '1.5rem',
            padding: '1.25rem 1.5rem',
            position: 'relative',
            overflow: 'hidden',
            background: qualifyProgress.isDone
              ? 'linear-gradient(145deg, rgba(6, 31, 22, 0.85) 0%, rgba(8, 20, 38, 0.85) 100%)'
              : 'linear-gradient(145deg, rgba(8, 20, 38, 0.95) 0%, rgba(12, 28, 52, 0.85) 100%)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: `1px solid ${qualifyProgress.isDone ? 'rgba(0, 229, 160, 0.4)' : 'rgba(0, 229, 200, 0.3)'}`,
            borderRadius: '14px',
            boxShadow: qualifyProgress.isDone
              ? '0 8px 32px rgba(0, 229, 160, 0.15), inset 0 0 20px rgba(0, 229, 160, 0.05)'
              : '0 8px 32px rgba(0, 229, 200, 0.12), inset 0 0 20px rgba(0, 229, 200, 0.04)',
            transition: 'all 0.4s ease'
          }}
        >
          {/* Ambient Specular Top Line */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: '5%',
              right: '5%',
              height: '1px',
              background: qualifyProgress.isDone
                ? 'linear-gradient(90deg, transparent, #00E5A0, transparent)'
                : 'linear-gradient(90deg, transparent, #00E5C8, transparent)',
              opacity: 0.8
            }}
          />

          {/* Header Row: Telemetry Status & Monospace Counter */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '0.85rem'
            }}
          >
            {/* Left: Telemetry State */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              {qualifyProgress.isDone ? (
                <div
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: '50%',
                    background: 'rgba(0, 229, 160, 0.15)',
                    border: '1px solid rgba(0, 229, 160, 0.4)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#00E5A0'
                  }}
                >
                  <CheckCircle2 size={15} />
                </div>
              ) : (
                <div
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: '50%',
                    background: 'rgba(0, 229, 200, 0.12)',
                    border: '1px solid rgba(0, 229, 200, 0.35)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#00E5C8',
                    boxShadow: '0 0 12px rgba(0, 229, 200, 0.25)'
                  }}
                >
                  <Sparkles size={14} className="animate-pulse" />
                </div>
              )}

              <div>
                <span
                  style={{
                    fontSize: '0.9rem',
                    fontWeight: 600,
                    color: qualifyProgress.isDone ? '#00E5A0' : '#F0F4F8',
                    letterSpacing: '0.01em'
                  }}
                >
                  {qualifyProgress.isDone
                    ? `Qualification terminée avec succès (${qualifyProgress.completedIds.length}/${qualifyProgress.total})`
                    : `Qualification IA en direct...`}
                </span>
                {!qualifyProgress.isDone && (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      marginLeft: '0.6rem',
                      fontSize: '0.75rem',
                      color: 'var(--text-secondary, #94A3B8)',
                      fontWeight: 400
                    }}
                  >
                    <span
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        background: '#00E5C8',
                        boxShadow: '0 0 8px #00E5C8',
                        animation: 'cyber-ping 2s ease-in-out infinite'
                      }}
                    />
                    <span>
                      Analyse IA en cours (Lead #{Math.min(qualifyProgress.completedIds.length + 1, qualifyProgress.total)} sur {qualifyProgress.total})...
                    </span>
                  </span>
                )}
              </div>
            </div>

            {/* Right: Cyber Counter & Dismiss */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              {/* Monospace Badge Counter */}
              <div
                style={{
                  fontFamily: 'monospace, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  color: qualifyProgress.isDone ? '#00E5A0' : '#00E5C8',
                  background: qualifyProgress.isDone ? 'rgba(0, 229, 160, 0.1)' : 'rgba(0, 229, 200, 0.08)',
                  border: `1px solid ${qualifyProgress.isDone ? 'rgba(0, 229, 160, 0.3)' : 'rgba(0, 229, 200, 0.25)'}`,
                  padding: '3px 10px',
                  borderRadius: '6px',
                  letterSpacing: '0.04em',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <span>
                  {Math.min(qualifyProgress.completedIds.length, qualifyProgress.total)} / {qualifyProgress.total}
                </span>
                <span style={{ opacity: 0.6 }}>•</span>
                <span>
                  {qualifyProgress.isDone ? 100 : fakePercent}%
                </span>
              </div>

              {/* Close Button */}
              <button
                type="button"
                onClick={() => {
                  if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
                  setQualifyProgress(null);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-secondary, #94A3B8)',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  borderRadius: '4px',
                  transition: 'color 0.2s ease'
                }}
                title="Fermer"
                onMouseEnter={(e) => (e.currentTarget.style.color = '#F0F4F8')}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-secondary, #94A3B8)')}
              >
                <X size={15} />
              </button>
            </div>
          </div>

          {/* Progress Track with Infinite Void Loop */}
          <div
            style={{
              height: '8px',
              backgroundColor: 'rgba(6, 17, 31, 0.8)',
              borderRadius: '4px',
              overflow: 'hidden',
              position: 'relative',
              border: '1px solid rgba(0, 229, 200, 0.25)',
              boxShadow: 'inset 0 1px 3px rgba(0, 0, 0, 0.6)'
            }}
          >
            {qualifyProgress.isDone ? (
              /* Solid Emerald Full Bar when Complete */
              <div
                style={{
                  height: '100%',
                  width: '100%',
                  borderRadius: '4px',
                  background: 'linear-gradient(90deg, #00E5A0 0%, #00E5C8 100%)',
                  boxShadow: '0 0 16px rgba(0, 229, 160, 0.7)',
                  transition: 'all 0.5s ease'
                }}
              />
            ) : (
              /* Infinite Full Bar Looping in the Void */
              <div
                style={{
                  height: '100%',
                  width: '100%',
                  borderRadius: '4px',
                  background: 'linear-gradient(90deg, #06111F 0%, #00E5C8 25%, #3B82F6 50%, #00E5C8 75%, #06111F 100%)',
                  backgroundSize: '200% 100%',
                  animation: 'infinite-void-stream 3.2s linear infinite',
                  boxShadow: '0 0 16px rgba(0, 229, 200, 0.5), inset 0 0 6px rgba(255, 255, 255, 0.2)',
                  position: 'relative',
                  overflow: 'hidden'
                }}
              >
                {/* Secondary Laser Gleam sweeping through the void */}
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    bottom: 0,
                    width: '35%',
                    background: 'linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.75) 50%, transparent 100%)',
                    animation: 'void-laser-gleam 2.6s cubic-bezier(0.4, 0, 0.2, 1) infinite'
                  }}
                />
              </div>
            )}
          </div>

          {/* Live Sub-Ticker: latest evaluated lead (sanitized & jargon-free) */}
          <div
            style={{
              marginTop: '0.65rem',
              fontSize: '0.78rem',
              color: 'var(--text-secondary, #94A3B8)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              overflow: 'hidden'
            }}
          >
            <Zap size={13} color={qualifyProgress.isDone ? '#00E5A0' : '#00E5C8'} style={{ flexShrink: 0 }} />
            <span
              style={{
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                opacity: 0.85,
                fontFamily: (qualifyProgress.latestMessage || '').includes('Lead #') ? 'monospace, sans-serif' : 'inherit'
              }}
            >
              {formatUserFacingMessage(qualifyProgress.latestMessage)}
            </span>
          </div>

          <style>{`
            @keyframes infinite-void-stream {
              0% { background-position: 200% 0; }
              100% { background-position: -200% 0; }
            }
            @keyframes void-laser-gleam {
              0% { left: -35%; }
              100% { left: 115%; }
            }
            @keyframes cyber-ping {
              0% { transform: scale(0.9); opacity: 0.7; }
              50% { transform: scale(1.3); opacity: 1; }
              100% { transform: scale(0.9); opacity: 0.7; }
            }
          `}</style>
        </div>
      )}

      <GlobalLeadsModal
        isOpen={isGlobalModalOpen}
        agentId={agentId as string}
        onClose={() => setIsGlobalModalOpen(false)}
        onSuccess={onRefresh}
      />

      {/* Upload Status Alert */}
      {uploadMessage && (
        <div
          className="card fade-in"
          style={{
            marginBottom: '1.5rem',
            padding: '1rem',
            borderColor: uploadMessage.type === 'success' ? 'var(--success)' : 'var(--danger)',
            backgroundColor: uploadMessage.type === 'success' ? 'var(--success-glow)' : 'var(--danger-glow)',
            color: uploadMessage.type === 'success' ? '#6ee7b7' : '#fca5a5',
            fontWeight: 500,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          <span>{uploadMessage.text}</span>
          <button
            onClick={() => setUploadMessage(null)}
            style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
          >
            <CyberIcon name="close" size={13} />
          </button>
        </div>
      )}

      {/* Ingestion Console */}
      {showImportConsole && (
        <div className="card fade-in" style={{ marginBottom: '2rem', padding: '1.5rem', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)' }}>
          <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', marginBottom: '1.25rem', paddingBottom: '0.25rem', gap: '1.5rem' }}>
            <button
              type="button"
              style={{
                background: 'none',
                border: 'none',
                color: importTab === 'file' ? 'var(--accent-secondary)' : 'var(--text-secondary)',
                borderBottom: importTab === 'file' ? '2px solid var(--accent-secondary)' : '2px solid transparent',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '0.95rem',
                paddingBottom: '0.5rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all var(--transition-fast)'
              }}
              onClick={() => setImportTab('file')}
            >
              <FileSpreadsheet size={16} style={{ flexShrink: 0 }} />
              <span>Fichier (CSV / JSON)</span>
            </button>
            <button
              type="button"
              style={{
                background: 'none',
                border: 'none',
                color: importTab === 'url' ? 'var(--accent-secondary)' : 'var(--text-secondary)',
                borderBottom: importTab === 'url' ? '2px solid var(--accent-secondary)' : '2px solid transparent',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '0.95rem',
                paddingBottom: '0.5rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all var(--transition-fast)'
              }}
              onClick={() => setImportTab('url')}
            >
              <Globe size={16} style={{ flexShrink: 0 }} />
              <span>Lien URL</span>
            </button>
            <button
              type="button"
              style={{
                background: 'none',
                border: 'none',
                color: importTab === 'paste' ? 'var(--accent-secondary)' : 'var(--text-secondary)',
                borderBottom: importTab === 'paste' ? '2px solid var(--accent-secondary)' : '2px solid transparent',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '0.95rem',
                paddingBottom: '0.5rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all var(--transition-fast)'
              }}
              onClick={() => setImportTab('paste')}
            >
              <Sparkles size={16} style={{ flexShrink: 0 }} />
              <span>Saisie Manuelle</span>
            </button>
          </div>

          {/* Multi-Agent Selector */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
              Attribuer aux agents :
            </label>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {availableAgents.map((agent, index) => (
                <button
                  key={agent.agent_id || `agent-${index}`}
                  type="button"
                  onClick={() => handleAgentToggle(agent.agent_id)}
                  style={{
                    padding: '0.4rem 0.8rem',
                    borderRadius: '20px',
                    fontSize: '0.8rem',
                    fontWeight: 500,
                    cursor: 'pointer',
                    border: '1px solid',
                    backgroundColor: selectedAgentIds.includes(agent.agent_id) ? 'rgba(99, 102, 241, 0.1)' : 'transparent',
                    borderColor: selectedAgentIds.includes(agent.agent_id) ? 'var(--accent-primary)' : 'var(--border-color)',
                    color: selectedAgentIds.includes(agent.agent_id) ? 'var(--accent-primary)' : 'var(--text-secondary)',
                    transition: 'all 0.2s'
                  }}
                >
                  {agent.agent_name || agent.nom || 'Agent Inconnu'}
                </button>
              ))}
            </div>
          </div>

          <div style={{ minHeight: '120px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {importTab === 'file' && (
              <div
                className="upload-zone"
                style={{ width: '100%', marginBottom: 0, padding: '1.5rem 1rem' }}
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="upload-icon" style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.75rem' }}>
                  <UploadCloud size={44} color="#00E5C8" style={{ flexShrink: 0 }} />
                </div>
                <h4 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                  {csvUploading ? 'Importation en cours...' : 'Déposez votre fichier CSV ou JSON ici, ou cliquez pour parcourir'}
                </h4>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Colonnes : nom, prenom, email, poste, entreprise, secteur, pays, taille_ent
                </p>
              </div>
            )}

            {importTab === 'url' && (
              <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  Saisissez l&apos;URL d&apos;un fichier JSON ou CSV distant à importer :
                </div>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <input
                    type="text"
                    placeholder="https://example.com/prospects.json"
                    value={importUrl}
                    onChange={(e) => setImportUrl(e.target.value)}
                    className="search-input"
                    style={{ flex: 1 }}
                  />
                  <button
                    className="btn btn-primary"
                    onClick={handleUrlImport}
                    disabled={csvUploading || !importUrl.trim()}
                  >
                    {csvUploading ? 'Importation...' : 'Télécharger & Importer'}
                  </button>
                </div>
              </div>
            )}

            {importTab === 'paste' && (
              <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  Collez vos données brutes ci-dessous au format JSON (tableau d&apos;objets) ou CSV (première ligne pour les en-têtes) :
                </div>
                <textarea
                  placeholder={`EXEMPLE JSON :
[
  {"nom": "Dupont", "prenom": "Jean", "email": "jean.dupont@translog.be", "entreprise": "TransLogistics"}
]

EXEMPLE CSV :
nom,prenom,email,entreprise
Dupont,Jean,jean.dupont@translog.be,TransLogistics`}
                  value={importPasteText}
                  onChange={(e) => setImportPasteText(e.target.value)}
                  className="email-textarea"
                  style={{ height: '140px', fontSize: '0.8rem', fontFamily: 'monospace' }}
                />
                <button
                  className="btn btn-primary"
                  onClick={handlePasteImport}
                  disabled={csvUploading || !importPasteText.trim()}
                >
                  {csvUploading ? 'Importation...' : 'Analyser & Importer'}
                </button>
              </div>
            )}
          </div>

          {/* Import Progress Bar */}
          {importProgress && (
            <div style={{ marginTop: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                <span>Ingestion en cours...</span>
                <span>{importProgress.current} / {importProgress.total} ({Math.round((importProgress.current / importProgress.total) * 100)}%)</span>
              </div>
              <div style={{ height: '6px', backgroundColor: 'var(--bg-tertiary)', borderRadius: '3px', overflow: 'hidden' }}>
                <div
                  style={{
                    height: '100%',
                    backgroundColor: 'var(--accent-secondary)',
                    width: `${(importProgress.current / importProgress.total) * 100}%`,
                    transition: 'width 0.1s ease-out'
                  }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* If the agent has 0 leads in its pipeline, display the educational Hero Empty State */}
      {leads.length === 0 ? (
        <LeadsEmptyState
          onOpenImport={() => setShowImportConsole(true)}
          onOpenGlobalModal={() => setIsGlobalModalOpen(true)}
          onOpenSourcing={handleOpenSourcing}
        />
      ) : (
        <>
          {/* Filters Panel */}
          <div className="filters-bar" style={{ ...(leadsTutorialStep === 5 ? getTabBtnStyle(5) : {}) }}>
            {renderTutorialArrow(5)}
            {/* Search */}
            <div className="search-input-wrapper">
              <span className="search-icon" style={{ display: 'flex', alignItems: 'center' }}>
                <CyberIcon name="search" size={14} color="var(--text-muted)" />
              </span>
              <input
                type="text"
                placeholder="Rechercher par nom, email, entreprise..."
                className="search-input"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
              />
            </div>

            {/* Status Filter */}
            <select
              className="filter-select"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="All">Tous les statuts</option>
              <option value="Nouveau">Nouveau</option>
              <option value="Qualifié">Qualifié</option>
              <option value="Écarté">Écarté</option>
            </select>

            {/* Source Filter */}
            <select
              className="filter-select"
              value={sourceFilter}
              onChange={(e) => {
                setSourceFilter(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="All">Toutes les sources</option>
              {Array.from(new Set(leads.map(l => l.source).filter(Boolean))).map(src => (
                <option key={src} value={src}>{src}</option>
              ))}
            </select>

            {/* Score Filter */}
            <select
              className="filter-select"
              value={scoreFilter}
              onChange={(e) => {
                setScoreFilter(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="All">Tous les scores</option>
              <option value="Qualified">Qualifiés (Décision IA)</option>
              <option value="Unqualified">Écartés (Décision IA)</option>
            </select>
          </div>

          {/* Table */}
          <div className="table-container" style={{ overflowX: leadsTutorialStep === 6 ? 'visible' : 'auto' }}>
            <table className="leads-table">
              <thead>
                <tr>
                  <th style={{ width: '40px', textAlign: 'center', verticalAlign: 'middle' }}>
                    <StyledCheckbox
                      checked={paginatedLeads.length > 0 && selectedLeadIds.length === sortedLeads.length}
                      isIndeterminate={selectedLeadIds.length > 0 && selectedLeadIds.length < sortedLeads.length}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedLeadIds(sortedLeads.map(l => l.id));
                        } else {
                          setSelectedLeadIds([]);
                        }
                      }}
                    />
                  </th>
                  <th style={{ cursor: 'pointer', width: '20%' }} onClick={() => toggleSort('nom')}>
                    Contact {sortBy === 'nom' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
                  </th>
                  <th style={{ width: '16%' }}>Entreprise</th>
                  <th style={{ cursor: 'pointer', width: '12%' }} onClick={() => toggleSort('score')}>
                    Score ICP {sortBy === 'score' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
                  </th>
                  <th style={{ cursor: 'pointer', width: '10%', whiteSpace: 'nowrap', textAlign: 'center' }} onClick={() => toggleSort('statut')}>
                    Statut {sortBy === 'statut' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
                  </th>
                  <th style={{ cursor: 'pointer', width: '10%', textAlign: 'center' }} onClick={() => toggleSort('emails_count')}>
                    Emails {sortBy === 'emails_count' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
                  </th>
                  <th style={{ width: '10%' }}>Source</th>
                  <th style={{ cursor: 'pointer', width: '12%' }} onClick={() => toggleSort('date_collecte')}>
                    Collecté {sortBy === 'date_collecte' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
                  </th>
                  <th style={{ width: '10%', textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedLeads.length > 0 ? (
                  paginatedLeads.map((lead) => {
                    const isQualified = lead.score !== null && lead.score >= threshold;
                    const scoreColorClass = lead.score === null
                      ? ''
                      : isQualified
                        ? 'high'
                        : lead.score >= 40
                          ? 'medium'
                          : 'low';

                    return (
                      <tr key={lead.id} className={`lead-row ${selectedLeadIds.includes(lead.id) ? 'selected-row' : ''}`} style={{ cursor: 'pointer', ...(selectedLeadIds.includes(lead.id) ? { backgroundColor: 'rgba(99, 102, 241, 0.05)' } : {}) }} onDoubleClick={() => onOpenLead(lead)}>
                        <td style={{ textAlign: 'center', width: '40px', verticalAlign: 'middle' }}>
                          <StyledCheckbox
                            checked={selectedLeadIds.includes(lead.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedLeadIds(prev => [...prev, lead.id]);
                              } else {
                                setSelectedLeadIds(prev => prev.filter(id => id !== lead.id));
                              }
                            }}
                          />
                        </td>
                        <td>
                          <div className="lead-name">{lead.prenom} {lead.nom}</div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{lead.email}</div>
                        </td>
                        <td>
                          <div>{lead.entreprise}</div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                            {lead.poste} • {lead.secteur} • {lead.pays}
                          </div>
                        </td>
                        <td>
                          {lead.score !== null ? (
                            <div className="score-progress-container">
                              <div className="score-progress-bar">
                                <div
                                  className={`score-progress-fill ${scoreColorClass}`}
                                  style={{ width: `${lead.score}%` }}
                                ></div>
                              </div>
                              <span className="score-text">{lead.score}</span>
                            </div>
                          ) : (
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Non qualifié</span>
                          )}
                        </td>
                        <td style={{ whiteSpace: 'nowrap', textAlign: 'center' }}>
                          <span className={`badge badge-${lead.est_qualifie === true ? 'qualified' : lead.est_qualifie === false ? 'discarded' : lead.statut === 'Erreur' ? 'error' : 'new'}`}>
                            {lead.est_qualifie === true ? 'Qualifié' : lead.est_qualifie === false ? 'Écarté' : lead.statut || 'Nouveau'}
                          </span>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <span className={`badge ${(lead.agent_emails_count ?? lead.emails_count ?? 0) > 0 ? 'badge-sent' : 'badge-new'}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            {(lead.agent_emails_count ?? lead.emails_count ?? 0) > 0 ? (
                              <>
                                <CyberIcon name="mail" size={12} color="#00E5C8" />
                                <span>{lead.agent_emails_count ?? lead.emails_count}</span>
                              </>
                            ) : '0'}
                          </span>
                        </td>
                        <td>
                          <span style={{ fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                            {lead.source.includes('CSV') ? (
                              <>
                                <CyberIcon name="file" size={13} color="#38BDF8" /> CSV
                              </>
                            ) : lead.source.includes('Webhook') ? (
                              <>
                                <CyberIcon name="zap" size={13} color="#00E5C8" /> Webhook
                              </>
                            ) : (
                              <>
                                <CyberIcon name="link" size={13} color="#A855F7" /> API
                              </>
                            )}
                          </span>
                        </td>
                        <td>
                          <div style={{ fontSize: '0.85rem' }}>
                            {new Date(lead.date_collecte).toLocaleDateString('fr-FR', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric'
                            })}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            {new Date(lead.date_collecte).toLocaleTimeString('fr-FR', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </div>
                        </td>
                        <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                          <button
                            className="btn btn-secondary"
                            style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: 5, ...(paginatedLeads.indexOf(lead) === 0 ? getTabBtnStyle(6) : {}) }}
                            onClick={(e) => { e.stopPropagation(); onOpenLead(lead); }}
                          >
                            {paginatedLeads.indexOf(lead) === 0 && renderTutorialArrow(6)}
                            <CyberIcon name="eye" size={13} color="#00E5C8" />
                            <span>Détail</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                      Aucun prospect ne correspond aux filtres de recherche.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="pagination">
              <span className="pagination-text">
                Affichage de {Math.min(filteredLeads.length, (currentPage - 1) * itemsPerPage + 1)} à{' '}
                {Math.min(filteredLeads.length, currentPage * itemsPerPage)} sur {filteredLeads.length} prospects
              </span>
              <div className="pagination-buttons">
                <button
                  className="btn btn-secondary"
                  style={{ padding: '0.4rem 0.8rem' }}
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(currentPage - 1)}
                >
                  Précédent
                </button>
                <button
                  className="btn btn-secondary"
                  style={{ padding: '0.4rem 0.8rem' }}
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(currentPage + 1)}
                >
                  Suivant
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Qualification Prompt Modal */}
      {isMounted && showQualifyPrompt && newlyImportedLeads.length > 0 && createPortal(
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(11, 15, 25, 0.8)',
            backdropFilter: 'blur(8px)',
            zIndex: 2000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            animation: 'fadeIn 0.2s ease-out'
          }}
          onClick={() => {
            setShowQualifyPrompt(false);
            setNewlyImportedLeads([]);
          }}
        >
          <div
            style={{
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--border-radius-lg)',
              padding: '2.5rem',
              width: '90%',
              maxWidth: '500px',
              boxShadow: '0 10px 40px rgba(0, 0, 0, 0.5)',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.5rem',
              position: 'relative'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ textAlign: 'center' }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.25rem' }}>
                <div style={{
                  width: 56,
                  height: 56,
                  borderRadius: 16,
                  background: 'rgba(0, 229, 200, 0.1)',
                  border: '1px solid rgba(0, 229, 200, 0.25)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#00E5C8'
                }}>
                  <Target size={28} />
                </div>
              </div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
                Qualification IA Immédiate ?
              </h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: '1.5' }}>
                Vous venez d&apos;importer avec succès <strong>{newlyImportedLeads.length}</strong> prospect(s).
                <br />
                Souhaitez-vous exécuter immédiatement l&apos;algorithme de qualification IA sur ces nouveaux enregistrements ?
              </p>
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
              <button
                className="btn btn-secondary"
                style={{ flex: 1, padding: '0.75rem' }}
                onClick={() => {
                  setShowQualifyPrompt(false);
                  setNewlyImportedLeads([]);
                }}
              >
                Plus tard
              </button>
              <button
                className="btn btn-primary"
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  background: 'linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-secondary) 100%)',
                  border: 'none',
                  boxShadow: '0 4px 15px rgba(99, 102, 241, 0.3)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
                onClick={handleQualifyNewLeads}
              >
                <CyberIcon name="bot" size={16} color="#fff" />
                <span>Qualifier maintenant</span>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Global Leads Assignment Modal */}
      <GlobalLeadsModal
        isOpen={isGlobalModalOpen}
        agentId={agentId as string}
        onClose={() => setIsGlobalModalOpen(false)}
        onSuccess={onRefresh}
      />

      {/* Sourcing Agent Direct Execution Modal */}
      {executingSourcingAgent && (
        <SourcingAgentExecutionModal
          agent={executingSourcingAgent}
          onClose={() => setExecutingSourcingAgent(null)}
          onSuccess={() => {
            setExecutingSourcingAgent(null);
            onRefresh();
          }}
          onToast={(msg, type) => {
            showToast(msg, type === 'err' ? 'error' : 'success');
          }}
          hideTargetAgentsSelection={true}
        />
      )}

      {/* Sourcing Launcher / Connection Modal */}
      <SourcingLauncherModal
        isOpen={isSourcingLauncherOpen}
        onClose={() => setIsSourcingLauncherOpen(false)}
        prospectAgent={agent || { uuid: agentId, agent_id: agentId }}
        sourcingAgents={allSourcingAgents}
        onSelectAndRun={(selectedSourcingAgent) => {
          setExecutingSourcingAgent(selectedSourcingAgent);
        }}
      />
    </div>
  );
}
