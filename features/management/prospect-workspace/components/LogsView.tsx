'use client';

import React, { useState, useEffect, useRef } from 'react';
import { CyberIcon } from '@/shared/management/components/CyberIcon';
import { Terminal, RefreshCw } from 'lucide-react';

interface Log {
  id?: number;
  workflow_id: string;
  etape: string;
  statut: string; // 'INFO', 'WARNING', 'ERROR', etc.
  message: string;
  timestamp: string;
}

interface LogsViewProps {
  logs: Log[];
}

// Zero Technical Jargon Policy: strictly sanitize internal middleware, technical tools, and implementation details
function sanitizeLogEtape(raw?: string): string {
  if (!raw) return 'Système IA';
  const lower = raw.toLowerCase().trim();
  if (lower.includes('webhook') || lower.includes('n8n')) return 'Génération IA';
  if (lower.includes('auto mode') || lower.includes('cron') || lower.includes('autopilot')) return 'Mode Autonome';
  if (lower.includes('qstash') || lower.includes('redis')) return 'Planification IA';
  return raw;
}

function sanitizeLogMessage(raw?: string): string {
  if (!raw) return '';
  let msg = raw;

  // 1. Common exact patterns
  if (/webhook\s+n8n\s+générer\s+email\s+déclenché/i.test(msg)) {
    return "Génération de l'email personnalisé par l'IA";
  }
  if (/qualification de (\d+) prospect\(s\) lancée via n8n/i.test(msg)) {
    return msg.replace(/qualification de (\d+) prospect\(s\) lancée via n8n\.?/gi, "Qualification et analyse de $1 prospect(s) par l'IA.");
  }

  // 2. Lead item formatting (e.g. "Lead #triki (virtualdev) — Score ICP : 100/100 — Statut : élevé")
  msg = msg.replace(/\bLead #([a-zA-Z0-9_\-\.\+]+)/gi, 'Prospect #$1');

  // 3. Technical stack sanitation
  msg = msg
    .replace(/\s*via\s+n8n\.?/gi, " par l'IA.")
    .replace(/\s*\(n8n\)/gi, '')
    .replace(/\bn8n\b/gi, "l'IA")
    .replace(/\bwebhook\b/gi, 'processus')
    .replace(/\bqstash\b/gi, 'planificateur')
    .replace(/\bredis\b/gi, 'mémoire')
    .replace(/\bpostgres(ql)?\b/gi, 'base de données')
    .replace(/\(cron créé\)/gi, '(Planification activée)')
    .replace(/\bcron\b/gi, 'planification')
    .replace(/\bworkflow\b/gi, 'processus')
    .replace(/\bpayload\b/gi, 'données')
    .trim();

  return msg;
}

function sanitizeWorkflowId(wf?: string): string {
  if (!wf) return '';
  return wf
    .replace(/n8n-/gi, '')
    .replace(/-n8n/gi, '')
    .replace(/webhook-/gi, '')
    .replace(/qstash-/gi, '');
}

export default function LogsView({ logs }: LogsViewProps) {
  const [levelFilter, setLevelFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  const limit = 50;
  const [displayCount, setDisplayCount] = useState(limit);

  const terminalRef = useRef<HTMLDivElement>(null);
  const terminalEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Scroll to bottom whenever new logs arrive
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const handleScroll = () => {
    if (terminalRef.current) {
      const { scrollTop } = terminalRef.current;
      if (scrollTop === 0 && displayCount < logs.length) {
        // Load more older logs when scrolled to top
        setDisplayCount(prev => prev + limit);
      }
    }
  };

  // Filter and prepare logs with Zero Technical Jargon policy
  const terminalLogs = logs
    .map(log => ({
      ...log,
      etape: sanitizeLogEtape(log.etape),
      message: sanitizeLogMessage(log.message),
      workflow_id: sanitizeWorkflowId(log.workflow_id)
    }))
    .filter(log => levelFilter === 'All' || log.statut === levelFilter)
    .filter(log =>
      searchQuery === '' ||
      log.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.workflow_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.etape.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .slice(0, displayCount)
    .reverse();

  return (
    <div className="fade-in">
      <div className="view-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
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
            <Terminal size={22} />
          </div>
          <div className="view-title">
            <h1 style={{ margin: 0 }}>Journaux d&apos;Exécution</h1>
            <p style={{ margin: '0.25rem 0 0 0' }}>Suivi en temps réel des actions menées par les agents VMIND (Collecte, Qualification, Prospection)</p>
          </div>
        </div>
        <button className="btn btn-secondary" onClick={() => { }} style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <RefreshCw size={14} />
          <span>Actualiser les Logs</span>
        </button>
      </div>

      {/* Filters */}
      <div className="filters-bar">
        <div className="search-input-wrapper" style={{ flex: 2 }}>
          <span className="search-icon" style={{ display: 'flex', alignItems: 'center' }}>
            <CyberIcon name="search" size={14} color="var(--text-muted)" />
          </span>
          <input
            type="text"
            placeholder="Rechercher par message, étape, ID de workflow..."
            className="search-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <select
          className="filter-select"
          value={levelFilter}
          onChange={(e) => setLevelFilter(e.target.value)}
        >
          <option value="All">Toutes les sévérités</option>
          {Array.from(new Set(logs.map(log => log.statut).filter(Boolean))).map(st => (
            <option key={st} value={st}>{st}</option>
          ))}
        </select>
      </div>

      {/* Terminal emulator */}
      <div className="terminal" ref={terminalRef} onScroll={handleScroll}>

        {terminalLogs.length > 0 ? (
          terminalLogs.map((log) => {
            const formattedTime = new Date(log.timestamp).toLocaleString('fr-FR', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
              hour12: false,
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit'
            });
            return (
              <div key={log.id} className="terminal-line">
                <span className="terminal-time">[{formattedTime}]</span>
                <span className="terminal-step">{log.etape}</span>
                <span className={`terminal-level ${log.statut}`}>
                  {log.statut}
                </span>
                <span className="terminal-message">{log.message}</span>
              </div>
            );
          })
        ) : (
          <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '5rem 0', fontFamily: 'var(--font-sans)' }}>
            Aucun journal d&apos;exécution ne correspond aux critères.
          </div>
        )}
        <div ref={terminalEndRef} />
      </div>
    </div>
  );
}
