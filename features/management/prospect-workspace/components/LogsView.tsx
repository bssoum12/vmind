'use client';

import React, { useState, useEffect, useRef } from 'react';

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

  // Filter and prepare logs
  const terminalLogs = logs
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
        <div className="view-title">
          <h1>Journaux d&apos;Exécution</h1>
          <p>Suivi en temps réel des actions menées par les agents VMIND (Collecte, Qualification, Prospection)</p>
        </div>
        <button className="btn btn-secondary" onClick={() => { }}>
          🔄 Actualiser les Logs
        </button>
      </div>

      {/* Filters */}
      <div className="filters-bar">
        <div className="search-input-wrapper" style={{ flex: 2 }}>
          <span className="search-icon">🔍</span>
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
