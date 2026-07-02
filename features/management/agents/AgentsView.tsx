'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  getAgents,
  pauseAgent,
  resumeAgent,
  deleteAgent,
  runAgentNow,
} from '@/shared/api/n8n-api';
import { useRouter } from 'next/navigation';

interface AgentsViewProps {
  onNavigate: (view: string) => void;
  onConfigure: (templateId: string) => void;
}

type AgentStatus = 'running' | 'paused' | 'stopped';

interface LiveAgent {
  agent_name: string;
  run_mode: string;
  workflow_timezone: string;
  recovery_config: any;
  trigger_rules: any[];
  session_id: string;
  lastExecuted: number;
  deployed_at?: number;
  status?: AgentStatus;
  schedule_id?: string;
}

function deriveStatus(agent: LiveAgent): AgentStatus {
  if (agent.status === 'paused') return 'paused';
  if (agent.schedule_id) return 'running';
  return 'stopped';
}

function formatDate(ts?: number) {
  if (!ts) return '—';
  return new Date(ts).toLocaleString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function triggerRuleSummary(rules: any[]): string {
  if (!rules || rules.length === 0) return 'Aucune règle';
  const r = rules[0];
  const interval = r.interval;
  if (interval === 'Minutes') return `Toutes les ${r.minutesBetween || '?'} min`;
  if (interval === 'Hours') return `Toutes les ${r.hoursBetween || '?'} h`;
  if (interval === 'Days') return `Chaque ${r.daysBetween > 1 ? r.daysBetween + ' jours' : 'jour'} à ${r.triggerAtHour || '08'}h`;
  if (interval === 'Weeks') return `Hebdo (${(r.triggerOnWeekdays || []).join(', ')}) à ${r.triggerAtHour || '08'}h`;
  if (interval === 'Months') return `Mensuel le ${r.triggerAtDayOfMonth || 1} à ${r.triggerAtHour || '08'}h`;
  return interval;
}

export function AgentsView({ onNavigate, onConfigure }: AgentsViewProps) {
  const router = useRouter();
  const [agents, setAgents] = useState<LiveAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<LiveAgent | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null); // agent_name being actioned
  const [toast, setToast] = useState<{ msg: string; type: 'ok' | 'err' } | null>(null);

  const showToast = (msg: string, type: 'ok' | 'err' = 'ok') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getAgents();
      setAgents(data);
      // Keep selected in sync
      if (selected) {
        const updated = data.find((a: LiveAgent) => a.agent_name === selected.agent_name);
        setSelected(updated || null);
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [selected]);

  useEffect(() => {
    refresh();
  }, []);

  const handlePause = async (agent: LiveAgent) => {
    setActionLoading(agent.agent_name);
    try {
      await pauseAgent(agent.agent_name);
      showToast(`Agent "${agent.agent_name}" mis en pause.`);
      await refresh();
    } catch (e: any) {
      showToast(e.message, 'err');
    } finally {
      setActionLoading(null);
    }
  };

  const handleResume = async (agent: LiveAgent) => {
    setActionLoading(agent.agent_name);
    try {
      await resumeAgent(agent.agent_name);
      showToast(`Agent "${agent.agent_name}" relancé.`);
      await refresh();
    } catch (e: any) {
      showToast(e.message, 'err');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (agent: LiveAgent) => {
    if (!window.confirm(`Supprimer définitivement "${agent.agent_name}" ?`)) return;
    setActionLoading(agent.agent_name);
    try {
      await deleteAgent(agent.agent_name);
      showToast(`Agent "${agent.agent_name}" supprimé.`);
      if (selected?.agent_name === agent.agent_name) setSelected(null);
      await refresh();
    } catch (e: any) {
      showToast(e.message, 'err');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRunNow = async (agent: LiveAgent) => {
    setActionLoading(agent.agent_name);
    try {
      await runAgentNow(agent.agent_name);
      showToast(`Exécution immédiate lancée pour "${agent.agent_name}" !`);
    } catch (e: any) {
      showToast(e.message, 'err');
    } finally {
      setActionLoading(null);
    }
  };

  const statusMeta: Record<AgentStatus, { label: string; dot: string; pill: string }> = {
    running: { label: 'Actif', dot: '#00E5A0', pill: 'sp-running' },
    paused: { label: 'En pause', dot: '#FFB800', pill: 'sp-pending' },
    stopped: { label: 'Arrêté', dot: '#FF4757', pill: 'sp-stopped' },
  };

  return (
    <div id="view-agents" className="anim" style={{ position: 'relative' }}>

      {/* ── Toast ── */}
      {toast && (
        <div style={{
          position: 'fixed', top: '24px', right: '24px', zIndex: 9999,
          padding: '12px 20px', borderRadius: '10px', fontWeight: 600,
          background: toast.type === 'ok' ? 'rgba(0,229,160,0.15)' : 'rgba(255,71,87,0.15)',
          border: `1px solid ${toast.type === 'ok' ? '#00E5A0' : '#FF4757'}`,
          color: toast.type === 'ok' ? '#00E5A0' : '#FF4757',
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          animation: 'fadeIn .2s ease',
        }}>
          {toast.type === 'ok' ? '✅' : '❌'} {toast.msg}
        </div>
      )}

      {/* ── Header ── */}
      <div className="page-head">
        <div>
          <div className="page-title">Mes Agents Actifs</div>
          <div className="page-sub">Gérez et surveillez vos employés virtuels en temps réel</div>
        </div>
        <div className="page-actions">
          <button className="btn" onClick={refresh} style={{ marginRight: 8 }}>🔄 Rafraîchir</button>
          <button className="btn" onClick={() => onNavigate('reports')}>📊 Rapports consolidés</button>
        </div>
      </div>

      <div className="scroll" style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>

        {/* ── Table ── */}
        <div className="agents-table-wrap" style={{ flex: 1, minWidth: 0 }}>
          {loading && (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--muted)' }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>⏳</div>
              Chargement des agents…
            </div>
          )}

          {error && (
            <div style={{
              padding: '16px 20px', borderRadius: 10, marginBottom: 16,
              background: 'rgba(255,71,87,0.1)', border: '1px solid rgba(255,71,87,0.3)',
              color: '#FF4757',
            }}>
              ❌ Erreur : {error}
            </div>
          )}

          {!loading && !error && agents.length === 0 && (
            <div style={{
              textAlign: 'center', padding: '60px 20px',
              color: 'var(--muted)', fontSize: 14,
            }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>🤖</div>
              <div style={{ fontWeight: 600, marginBottom: 6, color: 'var(--text)' }}>Aucun agent déployé</div>
              <div>Déployez un agent depuis la <button className="row-btn" onClick={() => onNavigate('deploy')}>page de déploiement</button></div>
            </div>
          )}

          {!loading && agents.length > 0 && (
            <table className="agents-table">
              <thead>
                <tr>
                  <th>Agent</th>
                  <th>Planification</th>
                  <th>Statut</th>
                  <th>Dernière exéc.</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {agents.map((agent) => {
                  const status = deriveStatus(agent);
                  const meta = statusMeta[status];
                  const busy = actionLoading === agent.agent_name;
                  const isSelected = selected?.agent_name === agent.agent_name;

                  return (
                    <tr
                      key={agent.agent_name}
                      onClick={() => setSelected(isSelected ? null : agent)}
                      style={{
                        cursor: 'pointer',
                        background: isSelected ? 'rgba(0,229,160,0.06)' : undefined,
                        borderLeft: isSelected ? '3px solid #00E5A0' : '3px solid transparent',
                        transition: 'all .15s',
                      }}
                    >
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{
                            width: 36, height: 36, borderRadius: 8, display: 'flex',
                            alignItems: 'center', justifyContent: 'center', fontSize: 18,
                            background: 'rgba(255,71,87,0.12)',
                          }}>💳</div>
                          <div>
                            <div className="agent-row-name">{agent.agent_name}</div>
                            <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{agent.run_mode}</div>
                          </div>
                        </div>
                      </td>

                      <td>
                        <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                          {triggerRuleSummary(agent.trigger_rules)}
                        </div>
                      </td>

                      <td>
                        <span className={`status-pill ${meta.pill}`} style={{ display: 'flex', alignItems: 'center', gap: 6, width: 'fit-content' }}>
                          <span style={{
                            width: 7, height: 7, borderRadius: '50%',
                            background: meta.dot,
                            boxShadow: status === 'running' ? `0 0 6px ${meta.dot}` : 'none',
                            animation: status === 'running' ? 'pulse 1.8s infinite' : 'none',
                          }} />
                          {meta.label}
                        </span>
                      </td>

                      <td style={{ fontSize: 12, color: 'var(--muted)' }}>
                        {formatDate(agent.lastExecuted || undefined)}
                      </td>

                      <td onClick={e => e.stopPropagation()}>
                        <div className="row-actions">
                          {/* Run Now */}
                          <button
                            className="row-btn"
                            disabled={busy}
                            onClick={() => handleRunNow(agent)}
                            title="Exécuter maintenant"
                          >
                            {busy ? '…' : '▶ Run'}
                          </button>

                          {/* Stop / Start */}
                          {status === 'running' ? (
                            <button
                              className="row-btn danger"
                              disabled={busy}
                              onClick={() => handlePause(agent)}
                              title="Mettre en pause"
                            >
                              {busy ? '…' : '⏸ Stop'}
                            </button>
                          ) : (
                            <button
                              className="row-btn"
                              disabled={busy}
                              onClick={() => handleResume(agent)}
                              title="Reprendre"
                              style={{ color: '#00E5A0', borderColor: 'rgba(0,229,160,0.3)' }}
                            >
                              {busy ? '…' : '▶ Start'}
                            </button>
                          )}

                          {/* Config */}
                          <button
                            className="row-btn"
                            onClick={() => onConfigure(agent.run_mode === 'prospection' ? 'prospection' : 'recouvrement')}
                            title="Modifier la configuration"
                          >
                            ⚙️
                          </button>

                          {/* Open Workspace (Only for Prospect Agents) */}
                          {agent.run_mode === 'prospection' && (
                            <button
                              className="row-btn"
                              onClick={() => router.push(`/prospect-agent-workspace/${agent.agent_id || 1}`)}
                              title="Ouvrir l'espace de travail"
                              style={{ color: '#00E5C8', borderColor: 'rgba(0,229,200,0.3)' }}
                            >
                              🚀 Espace
                            </button>
                          )}

                          {/* Delete */}
                          <button
                            className="row-btn danger"
                            disabled={busy}
                            onClick={() => handleDelete(agent)}
                            title="Supprimer l'agent"
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* ── Detail Panel ── */}
        {selected && (
          <div style={{
            width: 340, flexShrink: 0,
            background: 'var(--card-bg)',
            border: '1px solid var(--border)',
            borderRadius: 16,
            padding: 24,
            position: 'sticky', top: 0,
            animation: 'fadeIn .2s ease',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>{selected.agent_name}</div>
                <span className={`status-pill ${statusMeta[deriveStatus(selected)].pill}`}>
                  {statusMeta[deriveStatus(selected)].label}
                </span>
              </div>
              <button
                onClick={() => setSelected(null)}
                style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: 18 }}
              >✕</button>
            </div>

            {/* Info rows */}
            {[
              { label: '📋 Mode', value: selected.run_mode },
              { label: '🌍 Timezone', value: selected.workflow_timezone },
              { label: '⏰ Planification', value: triggerRuleSummary(selected.trigger_rules) },
              { label: '🔑 Schedule ID', value: selected.schedule_id || 'Aucun (en pause)' },
              { label: '🏷️ Session', value: selected.session_id },
              { label: '🕓 Dernière exéc.', value: formatDate(selected.lastExecuted || undefined) },
            ].map(row => (
              <div key={row.label} style={{
                display: 'flex', justifyContent: 'space-between', gap: 8,
                padding: '8px 0', borderBottom: '1px solid var(--border)',
                fontSize: 12,
              }}>
                <span style={{ color: 'var(--muted)', flexShrink: 0 }}>{row.label}</span>
                <span style={{
                  color: 'var(--text)', textAlign: 'right', wordBreak: 'break-all',
                  fontFamily: row.label.includes('ID') || row.label.includes('Session') ? 'monospace' : 'inherit',
                  fontSize: row.label.includes('ID') || row.label.includes('Session') ? 10 : 12,
                }}>{row.value}</span>
              </div>
            ))}

            {/* recovery_config section */}
            <div style={{ marginTop: 16 }}>
              <div style={{ fontWeight: 600, fontSize: 12, color: 'var(--muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: .5 }}>
                Recovery Config
              </div>
              {selected.recovery_config && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {selected.recovery_config.tone && (
                    <div style={{ fontSize: 12, display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--muted)' }}>Ton</span>
                      <span style={{ textTransform: 'capitalize' }}>{selected.recovery_config.tone}</span>
                    </div>
                  )}
                  {selected.recovery_config.thresholds && (
                    <>
                      <div style={{ fontSize: 12, display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--muted)' }}>Montant min.</span>
                        <span>{selected.recovery_config.thresholds.minimum_amount} {selected.recovery_config.thresholds.currency || 'TND'}</span>
                      </div>
                      <div style={{ fontSize: 12, display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--muted)' }}>Max relances</span>
                        <span>{selected.recovery_config.thresholds.max_reminders}</span>
                      </div>
                    </>
                  )}
                  {selected.recovery_config.channels && (
                    <div style={{ fontSize: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: 'var(--muted)' }}>Canaux</span>
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                        {Object.entries(selected.recovery_config.channels)
                          .filter(([, v]) => v === true)
                          .map(([k]) => (
                            <span key={k} style={{
                              background: 'rgba(0,229,160,0.12)',
                              color: '#00E5A0',
                              padding: '2px 8px',
                              borderRadius: 20,
                              fontSize: 11,
                              fontWeight: 600,
                            }}>{k}</span>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Instructions */}
            {selected.recovery_config?.instructions && (
              <div style={{ marginTop: 16 }}>
                <div style={{ fontWeight: 600, fontSize: 12, color: 'var(--muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: .5 }}>
                  Instructions
                </div>
                <div style={{
                  fontSize: 11, color: 'var(--text)', lineHeight: 1.6,
                  background: 'rgba(255,255,255,0.03)', borderRadius: 8,
                  padding: '10px 12px', border: '1px solid var(--border)',
                  maxHeight: 120, overflowY: 'auto',
                }}>
                  {selected.recovery_config.instructions}
                </div>
              </div>
            )}

            {/* Quick actions */}
            <div style={{ marginTop: 20, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button
                className="btn"
                style={{ flex: 1, fontSize: 12 }}
                onClick={() => handleRunNow(selected)}
                disabled={actionLoading === selected.agent_name}
              >
                ▶ Exécuter maintenant
              </button>
              <button
                className="row-btn"
                style={{ fontSize: 12 }}
                onClick={() => onConfigure('recouvrement')}
              >
                ⚙️ Modifier config
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
