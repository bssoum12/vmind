'use client';

import React, { useState, useEffect, useCallback } from 'react';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://localhost:3001';

interface LogItem {
  id: number;
  workflow_id: string;
  etape: string;
  statut: string;
  message: string;
  timestamp: string;
  agent_name: string;
}

export const JournalView: React.FC = () => {
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [logs, setLogs] = useState<LogItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Pagination states
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const fetchJournalLogs = useCallback(async (targetPage = page, targetTab = activeTab, search = searchQuery, targetLimit = limit) => {
    setIsLoading(true);
    try {
      let headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (typeof window !== 'undefined') {
        const sessionStr = localStorage.getItem('vmind_session');
        if (sessionStr) {
          let token = sessionStr;
          if (sessionStr.trim().startsWith('{')) {
            try {
              token = JSON.parse(sessionStr).token || sessionStr;
            } catch (e) {}
          }
          headers['Authorization'] = `Bearer ${token}`;
        }
      }

      const queryParams = new URLSearchParams({
        page: targetPage.toString(),
        limit: targetLimit.toString(),
        category: targetTab,
        ...(search ? { search } : {})
      });

      const res = await fetch(`${API_BASE_URL}/api/journal-logs?${queryParams.toString()}`, { headers, cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data.logs)) {
          setLogs(data.logs);
          setTotal(data.total || 0);
          setTotalPages(data.totalPages || 1);
          setPage(data.page || targetPage);
        } else if (Array.isArray(data)) {
          // Fallback array format
          setLogs(data);
          setTotal(data.length);
          setTotalPages(1);
        }
      } else {
        console.error('Failed to fetch journal logs:', res.statusText);
      }
    } catch (err) {
      console.error('Error fetching journal logs:', err);
    } finally {
      setIsLoading(false);
    }
  }, [page, activeTab, searchQuery, limit]);

  useEffect(() => {
    fetchJournalLogs(page, activeTab, searchQuery, limit);
  }, [page, activeTab, limit]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchJournalLogs(1, activeTab, searchQuery, limit);
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setPage(1);
    fetchJournalLogs(1, tab, searchQuery, limit);
  };

  const getStatusBadge = (statut: string) => {
    const s = (statut || '').toUpperCase();
    if (s.includes('ERR') || s.includes('FAIL')) {
      return {
        bg: 'rgba(239, 68, 68, 0.12)',
        color: '#EF4444',
        border: '1px solid rgba(239, 68, 68, 0.3)',
        label: statut || 'ERREUR'
      };
    }
    if (s.includes('SKIP') || s.includes('WARN')) {
      return {
        bg: 'rgba(245, 158, 11, 0.12)',
        color: '#F59E0B',
        border: '1px solid rgba(245, 158, 11, 0.3)',
        label: statut || 'ATTENTION'
      };
    }
    if (s.includes('SUCC') || s.includes('OK')) {
      return {
        bg: 'rgba(16, 185, 129, 0.12)',
        color: '#10B981',
        border: '1px solid rgba(16, 185, 129, 0.3)',
        label: statut || 'SUCCÈS'
      };
    }
    return {
      bg: 'rgba(0, 229, 200, 0.1)',
      color: 'var(--cyan)',
      border: '1px solid rgba(0, 229, 200, 0.25)',
      label: statut || 'INFO'
    };
  };

  const getAgentBadgeStyle = (name: string) => {
    if (name === 'Système') {
      return {
        bg: 'rgba(255, 255, 255, 0.04)',
        color: 'var(--text-muted)',
        border: '1px solid rgba(255, 255, 255, 0.08)'
      };
    }
    if (name.toLowerCase().includes('sourcing')) {
      return {
        bg: 'rgba(59, 130, 246, 0.12)',
        color: '#3B82F6',
        border: '1px solid rgba(59, 130, 246, 0.25)'
      };
    }
    return {
      bg: 'rgba(0, 229, 200, 0.12)',
      color: 'var(--cyan)',
      border: '1px solid rgba(0, 229, 200, 0.3)'
    };
  };

  const startCount = (page - 1) * limit + (logs.length > 0 ? 1 : 0);
  const endCount = Math.min(page * limit, total);

  return (
    <div id="view-journal" className="anim">
      <div className="page-head">
        <div>
          <div className="page-title">Journal d&apos;Activité</div>
          <div className="page-sub">Historique complet des exécutions et événements système</div>
        </div>
        <div className="page-actions" style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          {/* Search Bar */}
          <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '0.5rem' }}>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <input
                type="text"
                placeholder="Rechercher message, agent..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  padding: '0.45rem 0.8rem',
                  paddingRight: '2rem',
                  borderRadius: '6px',
                  background: 'rgba(10, 15, 28, 0.8)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  color: 'var(--text-light)',
                  fontSize: '0.8rem',
                  width: '220px',
                  outline: 'none'
                }}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setPage(1);
                    fetchJournalLogs(1, activeTab, '', limit);
                  }}
                  style={{
                    position: 'absolute',
                    right: '8px',
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    fontSize: '0.85rem'
                  }}
                >
                  ✕
                </button>
              )}
            </div>
            <button type="submit" className="btn" style={{ padding: '0.45rem 0.75rem', fontSize: '0.8rem' }}>
              🔍
            </button>
          </form>

          <button className="btn primary" onClick={() => fetchJournalLogs(page, activeTab, searchQuery, limit)} disabled={isLoading}>
            {isLoading ? '⏳' : '🔄 Actualiser'}
          </button>
        </div>
      </div>
      
      {/* Category Tabs */}
      <div className="tabs-bar">
        <div className={`tab ${activeTab === 'all' ? 'active' : ''}`} onClick={() => handleTabChange('all')}>Tout l&apos;historique</div>
        <div className={`tab ${activeTab === 'error' ? 'active' : ''}`} onClick={() => handleTabChange('error')}>Erreurs</div>
        <div className={`tab ${activeTab === 'success' ? 'active' : ''}`} onClick={() => handleTabChange('success')}>Succès</div>
        <div className={`tab ${activeTab === 'system' ? 'active' : ''}`} onClick={() => handleTabChange('system')}>Système</div>
      </div>

      <div className="scroll">
         <div className="exec-panel" style={{ marginTop: 0, padding: 0, overflow: 'hidden', background: 'rgba(20, 27, 45, 0.7)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px' }}>
          <div style={{ width: '100%' }}>
            
            {/* Table Header */}
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: '160px 250px 1fr 110px', 
              gap: '1rem', 
              padding: '0.85rem 1.25rem', 
              background: 'rgba(10, 15, 28, 0.8)', 
              borderBottom: '1px solid rgba(255,255,255,0.08)',
              fontSize: '0.75rem',
              fontWeight: 700,
              color: 'var(--text-muted)',
              letterSpacing: '0.6px',
              textTransform: 'uppercase'
            }}>
              <div>HEURE</div>
              <div>AGENT</div>
              <div>ACTION EFFECTUÉE</div>
              <div style={{ textAlign: 'right' }}>RÉSULTAT</div>
            </div>

            {/* Table Body */}
            {isLoading ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--cyan)' }}>
                Chargement des journaux d&apos;exécution...
              </div>
            ) : logs.length > 0 ? (
              logs.map((log) => {
                const formattedTime = log.timestamp
                  ? new Date(log.timestamp).toLocaleString('fr-FR', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit'
                    })
                  : 'N/A';

                const badge = getStatusBadge(log.statut);
                const agentBadge = getAgentBadgeStyle(log.agent_name);

                return (
                  <div key={log.id} style={{ 
                    display: 'grid', 
                    gridTemplateColumns: '160px 250px 1fr 110px', 
                    gap: '1rem', 
                    alignItems: 'center',
                    padding: '0.75rem 1.25rem', 
                    borderBottom: '1px solid rgba(255,255,255,0.03)',
                    fontSize: '0.85rem',
                    transition: 'background 0.15s ease'
                  }}>
                    {/* Timestamp */}
                    <div style={{ color: 'var(--text-muted)', fontFamily: 'monospace', fontSize: '0.78rem', whiteSpace: 'nowrap' }}>
                      {formattedTime}
                    </div>

                    {/* Agent Badge */}
                    <div>
                      <span style={{ 
                        display: 'inline-block',
                        padding: '0.2rem 0.6rem', 
                        borderRadius: '6px', 
                        fontSize: '0.78rem', 
                        fontWeight: 600,
                        background: agentBadge.bg,
                        color: agentBadge.color,
                        border: agentBadge.border,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        maxWidth: '230px'
                      }}>
                        {log.agent_name}
                      </span>
                    </div>

                    {/* Action Effectuée */}
                    <div style={{ color: 'var(--text-light)', lineHeight: 1.4, display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                      {log.etape && (
                        <span style={{ 
                          padding: '0.1rem 0.4rem', 
                          background: 'rgba(255, 255, 255, 0.05)', 
                          border: '1px solid rgba(255, 255, 255, 0.08)', 
                          borderRadius: '4px', 
                          fontSize: '0.75rem', 
                          color: 'var(--text-muted)',
                          fontWeight: 500
                        }}>
                          [{log.etape}]
                        </span>
                      )}
                      <span>{log.message || 'Action exécutée'}</span>
                    </div>

                    {/* Résultat Badge */}
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ 
                        display: 'inline-block',
                        padding: '0.2rem 0.65rem', 
                        borderRadius: '12px', 
                        fontSize: '0.75rem', 
                        fontWeight: 700,
                        background: badge.bg,
                        color: badge.color,
                        border: badge.border
                      }}>
                        {badge.label}
                      </span>
                    </div>
                  </div>
                );
              })
            ) : (
              <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                Aucun événement d&apos;exécution trouvé.
              </div>
            )}

            {/* Pagination Controls Footer */}
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              padding: '0.85rem 1.25rem', 
              background: 'rgba(10, 15, 28, 0.8)', 
              borderTop: '1px solid rgba(255,255,255,0.08)',
              fontSize: '0.8rem',
              color: 'var(--text-muted)'
            }}>
              <div>
                Affichage <strong style={{ color: 'var(--text-light)' }}>{startCount}-{endCount}</strong> sur <strong style={{ color: 'var(--cyan)' }}>{total}</strong> logs
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span>Par page:</span>
                  <select
                    value={limit}
                    onChange={(e) => {
                      const newLimit = parseInt(e.target.value);
                      setLimit(newLimit);
                      setPage(1);
                    }}
                    style={{
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.12)',
                      color: 'var(--text-light)',
                      borderRadius: '4px',
                      padding: '0.2rem 0.4rem',
                      fontSize: '0.78rem',
                      outline: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    <option value={15} style={{ background: '#0a0f1c' }}>15</option>
                    <option value={25} style={{ background: '#0a0f1c' }}>25</option>
                    <option value={50} style={{ background: '#0a0f1c' }}>50</option>
                    <option value={100} style={{ background: '#0a0f1c' }}>100</option>
                  </select>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <button
                    className="btn"
                    style={{ padding: '0.35rem 0.75rem', fontSize: '0.78rem' }}
                    disabled={page <= 1 || isLoading}
                    onClick={() => setPage(prev => Math.max(prev - 1, 1))}
                  >
                    ◀ Précédent
                  </button>

                  <span style={{ color: 'var(--text-light)', fontWeight: 600 }}>
                    Page {page} / {totalPages}
                  </span>

                  <button
                    className="btn"
                    style={{ padding: '0.35rem 0.75rem', fontSize: '0.78rem' }}
                    disabled={page >= totalPages || isLoading}
                    onClick={() => setPage(prev => Math.min(prev + 1, totalPages))}
                  >
                    Suivant ▶
                  </button>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};
