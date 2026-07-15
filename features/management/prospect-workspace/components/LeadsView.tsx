'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useParams } from 'next/navigation';
import GlobalLeadsModal from './GlobalLeadsModal';
import { VMindGuide, GuideMood } from '@/shared/management/components/VMindGuide';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

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
}

export default function LeadsView({ leads, threshold, onOpenLead, onRefresh }: LeadsViewProps) {
  const params = useParams();
  const agentId = params.agentId;

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [sourceFilter, setSourceFilter] = useState('All');
  const [scoreFilter, setScoreFilter] = useState('All'); // 'All', 'Qualified', 'Unqualified'
  const [sortBy, setSortBy] = useState('date_collecte'); // 'date_collecte', 'score', 'statut'
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 25;

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [csvUploading, setCsvUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const [isBulkQualifying, setIsBulkQualifying] = useState(false);
  const [qualifyingCount, setQualifyingCount] = useState(0);
  const [isGlobalModalOpen, setIsGlobalModalOpen] = useState(false);

  const [availableAgents, setAvailableAgents] = useState<any[]>([]);
  const [selectedAgentIds, setSelectedAgentIds] = useState<string[]>([agentId as string]);

  // Tutorial state
  const [leadsTutorialStep, setLeadsTutorialStep] = useState<number>(0);

  useEffect(() => {
    if (!localStorage.getItem('vmind_tutorial_workspace_prospects')) {
      localStorage.setItem('vmind_tutorial_workspace_prospects', 'true');
      setLeadsTutorialStep(1);
    }
  }, []);

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
    if (leadsTutorialStep === step) {
      return { 
        position: 'relative' as any, 
        zIndex: 10001, 
        boxShadow: '0 0 0 4px rgba(0,229,200,0.8)', 
        pointerEvents: 'none' as any,
        background: 'var(--card-bg)'
      };
    }
    return {};
  };

  const renderTutorialArrow = (step: number) => {
    if (leadsTutorialStep === step) {
      return (
        <div style={{
          position: 'absolute',
          top: '-45px',
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          animation: 'bounceArrow 1.5s infinite ease-in-out',
          pointerEvents: 'none',
          zIndex: 10002
        }}>
          {[0.2, 0.6, 1].map((opacity, i) => (
            <div key={i} style={{
              width: '16px',
              height: '16px',
              borderBottom: '4px solid #00E5C8',
              borderRight: '4px solid #00E5C8',
              transform: 'rotate(45deg)',
              opacity: opacity,
              filter: 'drop-shadow(2px 2px 4px rgba(0, 229, 200, 0.6))',
              borderRadius: '2px',
              marginBottom: '-8px'
            }} />
          ))}
        </div>
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
    const headers = ['Nom', 'Prénom', 'Email', 'Poste', 'Entreprise', 'Secteur', 'Taille', 'Pays', 'Source', 'Statut', 'Score', 'Potentiel', 'Date Collecte'];
    const rows = sortedLeads.map((lead) => [
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
  }, []);

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
        lastError = err.message || 'Network error';
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
            'Authorization': `Bearer ${localStorage.getItem('vmind_session')}`
          },
          body: JSON.stringify({
            fileContent: text,
            fileType: file.type || fileType,
            agentIds: selectedAgentIds
          })
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || 'Erreur lors de l\'envoi du fichier au workflow n8n.');
        }

        if (!data.leads || data.leads.length === 0) {
          throw new Error('Le workflow n8n n\'a retourné aucun prospect valide.');
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
          'Authorization': `Bearer ${localStorage.getItem('vmind_session')}`
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
    setIsBulkQualifying(true);
    setQualifyingCount(newlyImportedLeads.length);
    setUploadMessage(null);

    try {
      const lead_ids = newlyImportedLeads.map((l: Lead) => l.id);

      const res = await fetch(`${API_BASE_URL}/api/prospect-agent/qualify`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('vmind_session')}`
        },
        body: JSON.stringify({ lead_ids, agentId }),
      });

      if (res.ok) {
        setUploadMessage({
          text: `Qualification automatique lancée pour ${newlyImportedLeads.length} prospects. Les statuts se mettront à jour sous peu.`,
          type: 'success'
        });
      } else {
        throw new Error('Erreur API qualification');
      }
    } catch (err: unknown) {
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
    if (filteredLeads.length === 0) return;

    setIsBulkQualifying(true);
    setQualifyingCount(filteredLeads.length);
    setUploadMessage(null);

    try {
      const lead_ids = filteredLeads.map((l: Lead) => l.id);

      const res = await fetch(`${API_BASE_URL}/api/prospect-agent/qualify`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('vmind_session')}`
        },
        body: JSON.stringify({ lead_ids, agentId }),
      });

      if (res.ok) {
        setUploadMessage({
          text: `Qualification en masse lancée pour ${filteredLeads.length} prospects. Les statuts se mettront à jour sous peu.`,
          type: 'success'
        });
      } else {
        throw new Error('Erreur API qualification');
      }
    } catch (err: unknown) {
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
      {leadsTutorialStep > 0 && (
        <div 
          onClick={nextTutorialStep}
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.8)', zIndex: 10000,
            cursor: 'pointer'
          }} 
        />
      )}

      {/* ── VMind Guide for Tutorial ── */}
      {leadsTutorialStep > 0 && (
        <VMindGuide 
          isOpen={leadsTutorialStep > 0}
          title={getTutorialContent()?.title}
          message={getTutorialContent()?.message || null}
          mood={getTutorialContent()?.mood}
        />
      )}

      <div className="view-header" style={{ position: 'relative', zIndex: leadsTutorialStep > 0 && leadsTutorialStep < 5 ? 10001 : 1 }}>
        <div className="view-title">
          <h1>Liste des Prospects</h1>
          <p>Visualiser, filtrer et gérer vos leads qualifiés par l&apos;intelligence artificielle</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn btn-secondary" onClick={exportToCSV} style={{ ...getTabBtnStyle(1) }}>
            {renderTutorialArrow(1)}
            📥 Exporter CSV ({sortedLeads.length})
          </button>
          <button
            className="btn btn-secondary"
            onClick={handleBulkQualify}
            disabled={isBulkQualifying || csvUploading || filteredLeads.length === 0}
            style={{ borderColor: 'var(--accent-secondary)', ...getTabBtnStyle(2) }}
          >
            {renderTutorialArrow(2)}
            {isBulkQualifying ? '🤖 Qualification...' : `🤖 Qualifier la sélection (${filteredLeads.length})`}
          </button>
          <button className="btn btn-primary" onClick={() => setIsGlobalModalOpen(true)} style={{ ...getTabBtnStyle(3) }}>
              {renderTutorialArrow(3)}
              ✨ Assigner Prospect Existant
            </button>
            <button className="btn btn-primary" onClick={() => setShowImportConsole(!showImportConsole)} style={{ ...getTabBtnStyle(4) }}>
            {renderTutorialArrow(4)}
            ⚡ Ingestion Prospects {showImportConsole ? '▲' : '▼'}
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

      {/* Bulk Qualify Progress Bar */}
      {isBulkQualifying && (
        <div className="card fade-in" style={{ marginBottom: '1.5rem', padding: '1rem', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--accent-secondary)', marginBottom: '0.5rem', fontWeight: 600 }}>
            <span>Qualification de {qualifyingCount} prospects par l&apos;IA en cours...</span>
            <span style={{ opacity: 0.8 }}>Veuillez patienter 🤖</span>
          </div>
          <div style={{ height: '6px', backgroundColor: 'var(--bg-tertiary)', borderRadius: '3px', overflow: 'hidden' }}>
            <div
              style={{
                height: '100%',
                background: 'linear-gradient(90deg, var(--accent-primary) 0%, var(--accent-secondary) 50%, var(--accent-primary) 100%)',
                backgroundSize: '200% 100%',
                width: '100%',
                animation: 'gradient-shift 2s linear infinite'
              }}
            />
          </div>
          <style>{`
            @keyframes gradient-shift {
              0% { background-position: 100% 0; }
              100% { background-position: -100% 0; }
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
            style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontWeight: 'bold' }}
          >
            ✕
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
                transition: 'all var(--transition-fast)'
              }}
              onClick={() => setImportTab('file')}
            >
              📁 Fichier (CSV / JSON)
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
                transition: 'all var(--transition-fast)'
              }}
              onClick={() => setImportTab('url')}
            >
              🔗 Lien URL
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
                transition: 'all var(--transition-fast)'
              }}
              onClick={() => setImportTab('paste')}
            >
              ✍️ Saisie Manuelle
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
                <div className="upload-icon" style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>📁</div>
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

      {/* Filters Panel */}
      <div className="filters-bar" style={{ ...(leadsTutorialStep === 5 ? getTabBtnStyle(5) : {}) }}>
        {renderTutorialArrow(5)}
        {/* Search */}
        <div className="search-input-wrapper">
          <span className="search-icon">🔍</span>
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
                  <tr key={lead.id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{lead.prenom} {lead.nom}</div>
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
                      <span className={`badge ${(lead.agent_emails_count ?? lead.emails_count ?? 0) > 0 ? 'badge-sent' : 'badge-new'}`}>
                        {(lead.agent_emails_count ?? lead.emails_count ?? 0) > 0 ? `📧 ${(lead.agent_emails_count ?? lead.emails_count)}` : '0'}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontSize: '0.85rem' }}>
                        {lead.source.includes('CSV') ? '📁 CSV' : lead.source.includes('Webhook') ? '⚡ Webhook' : '🔗 API'}
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
                        style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem', ...(paginatedLeads.indexOf(lead) === 0 ? getTabBtnStyle(6) : {}) }}
                        onClick={() => onOpenLead(lead)}
                      >
                        {paginatedLeads.indexOf(lead) === 0 && renderTutorialArrow(6)}
                        👁️ Détail
                      </button>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                  Aucun prospect ne correspond aux filtres.
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
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🤖</div>
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
                  boxShadow: '0 4px 15px rgba(99, 102, 241, 0.3)'
                }}
                onClick={handleQualifyNewLeads}
              >
                🤖 Qualifier maintenant
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
    </div>
  );
}
