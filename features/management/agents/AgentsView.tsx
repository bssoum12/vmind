'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  getAgents,
  pauseAgent,
  resumeAgent,
  deleteAgent,
  runAgentNow,
  getProspectAgentStats,
  qualifyManualProspects,
  triggerAIQualificationAllPending,
} from '@/shared/api/n8n-api';
import { useProspectSocket } from '../prospect-workspace/hooks/useProspectSocket';
import { useRouter } from 'next/navigation';
import { VMindGuide, GuideMood } from '@/shared/management/components/VMindGuide';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Brain, CheckSquare, ListChecks, SkipForward, Users, Info, ExternalLink, UploadCloud } from 'lucide-react';
import { ProspectAgentExecutionModal } from './components/ProspectAgentExecutionModal';
import { SourcingAgentExecutionModal } from './components/SourcingAgentExecutionModal';
import { ProspectAgentScheduleModal } from './components/ProspectAgentScheduleModal';
import { SourcingAgentScheduleModal } from './components/SourcingAgentScheduleModal';
interface AgentsViewProps {
  onNavigate: (view: string) => void;
  onConfigure: (templateId: string, agent?: any, initialStep?: number) => void;
}

type AgentStatus = 'running' | 'paused' | 'stopped';

export interface LiveAgent {
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
  agent_id?: number | string;
  uuid?: string;
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

  // Auto Mode Modal State
  const [runModalAgent, setRunModalAgent] = useState<LiveAgent | null>(null);
  const [scheduleModalAgent, setScheduleModalAgent] = useState<LiveAgent | null>(null);

  // Tutorial state
  const [tutorialStep, setTutorialStep] = useState<number>(0);
  const [tutorialAgent, setTutorialAgent] = useState<LiveAgent | null>(null);

  const startTutorial = (agent: LiveAgent) => {
    const storageKey = `vmind_tutorial_done_${agent.run_mode}`;
    if (localStorage.getItem(storageKey)) return;

    localStorage.setItem(storageKey, 'true');
    setTutorialAgent(agent);
    setTutorialStep(1);
  };

  const restartTutorial = () => {
    // Clear all tutorial keys
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('vmind_tutorial_done_')) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(k => localStorage.removeItem(k));

    // Also remove the old generic key just in case
    localStorage.removeItem('vmind_agent_tutorial_done');

    showToast('Tutoriels réinitialisés pour tous les types d\'agents. Survolez un agent pour commencer.', 'ok');
  };

  const nextTutorialStep = () => {
    if (tutorialStep === 3 && tutorialAgent?.run_mode !== 'prospection') {
      setTutorialStep(5);
    } else if (tutorialStep >= 5) {
      setTutorialStep(0);
      setTutorialAgent(null);
    } else {
      setTutorialStep(s => s + 1);
    }
  };

  const getTutorialContent = () => {
    if (!tutorialAgent) return null;
    switch (tutorialStep) {
      case 1:
        return {
          title: "Exécution Immédiate",
          message: "Exécutez l'agent immédiatement, indépendamment de sa planification.",
          mood: 'focused' as GuideMood
        };
      case 2:
        return {
          title: "Activer / Désactiver",
          message: tutorialAgent.run_mode === 'prospection'
            ? "Le bouton Start active le mode automatique. L'agent commencera à envoyer des emails de prospection selon vos limites."
            : "Le bouton Start active la planification cron pour relancer automatiquement les impayés.",
          mood: 'convinced' as GuideMood
        };
      case 3:
        return {
          title: "Configuration",
          message: "Modifiez la configuration de cet agent à tout moment.",
          mood: 'focused' as GuideMood
        };
      case 4:
        return {
          title: "Espace de Travail",
          message: "Ouvrez l'Espace de Travail pour suivre vos leads, valider les emails et superviser l'agent.",
          mood: 'curious' as GuideMood
        };
      case 5:
        return {
          title: "Suppression",
          message: "Supprimez définitivement cet agent. Soyez certain de votre choix.",
          mood: 'settled' as GuideMood
        };
      default:
        return null;
    }
  };

  const getBtnStyle = (agent: LiveAgent, step: number) => {
    if (tutorialStep === step && tutorialAgent?.agent_name === agent.agent_name) {
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

  const renderTutorialArrow = (agent: LiveAgent, step: number) => {
    if (tutorialStep === step && tutorialAgent?.agent_name === agent.agent_name) {
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
              marginBottom: '-8px' // overlaps them slightly
            }} />
          ))}
        </div>
      );
    }
    return null;
  };

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
    if (agent.run_mode === 'prospection' || agent.run_mode === 'sourcing') {
      const publicId = (agent as any).agent_id;
      if (!publicId) {
        showToast("Impossible de trouver l'ID public de cet agent", 'err');
        return;
      }
      setRunModalAgent(agent);
      return;
    }

    // Default behavior for recouvrement
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

      {/* ── Tutorial Overlay ── */}
      {tutorialStep > 0 && (
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
      {tutorialStep > 0 && tutorialAgent && (
        <VMindGuide
          isOpen={tutorialStep > 0}
          title={getTutorialContent()?.title}
          message={getTutorialContent()?.message || null}
          mood={getTutorialContent()?.mood}
        />
      )}

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
          <button className="btn" onClick={restartTutorial} style={{ marginRight: 8, background: 'rgba(0, 229, 200, 0.1)', color: '#00E5C8', border: '1px solid rgba(0, 229, 200, 0.3)' }}>ℹ️ Relancer le tutoriel</button>
          <button className="btn" onClick={refresh} style={{ marginRight: 8 }}>🔄 Rafraîchir</button>
          <button className="btn" onClick={() => onNavigate('reports')}>📊 Rapports consolidés</button>
        </div>
      </div>

      <div className="scroll" style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>

        {/* ── Table ── */}
        <div className="agents-table-wrap" style={{ flex: 1, minWidth: 0, overflow: tutorialStep > 0 ? 'visible' : 'hidden' }}>
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
                      onMouseEnter={() => startTutorial(agent)}
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
                            style={{ ...getBtnStyle(agent, 1) }}
                          >
                            {renderTutorialArrow(agent, 1)}
                            {busy ? '…' : '▶ Run'}
                          </button>

                          {/* Stop / Start */}
                          {status === 'running' ? (
                            <button
                              className="row-btn danger"
                              disabled={busy}
                              onClick={() => handlePause(agent)}
                              title="Mettre en pause"
                              style={{ ...getBtnStyle(agent, 2) }}
                            >
                              {renderTutorialArrow(agent, 2)}
                              {busy ? '…' : '⏸ Stop'}
                            </button>
                          ) : (
                            <button
                              className="row-btn"
                              disabled={busy}
                              onClick={() => {
                                if (agent.run_mode === 'prospection' || agent.run_mode === 'sourcing') {
                                  setScheduleModalAgent(agent);
                                } else {
                                  handleResume(agent);
                                }
                              }}
                              title="Reprendre"
                              style={{ color: '#00E5A0', borderColor: 'rgba(0,229,160,0.3)', ...getBtnStyle(agent, 2) }}
                            >
                              {renderTutorialArrow(agent, 2)}
                              {busy ? '…' : '▶ Start'}
                            </button>
                          )}

                          {/* Config */}
                          <button
                            className="row-btn"
                            onClick={() => onConfigure(agent.run_mode || 'recouvrement', agent)}
                            title="Modifier la configuration"
                            style={{ ...getBtnStyle(agent, 3) }}
                          >
                            {renderTutorialArrow(agent, 3)}
                            ⚙️
                          </button>

                          {/* Open Workspace (Prospect and Sourcing) */}
                          {(agent.run_mode === 'prospection' || agent.run_mode === 'sourcing') && (
                            <button
                              className="row-btn"
                              onClick={() => {
                                const route = agent.run_mode === 'sourcing' 
                                  ? `/sourcing-agent-workspace/${agent.uuid || (agent as any).agent_id}`
                                  : `/prospect-agent-workspace/${agent.uuid || (agent as any).agent_id || 1}`;
                                router.push(route);
                              }}
                              title="Ouvrir l'espace de travail"
                              style={{ color: '#00E5C8', borderColor: 'rgba(0,229,200,0.3)', ...getBtnStyle(agent, 4) }}
                            >
                              {renderTutorialArrow(agent, 4)}
                              🚀 Espace
                            </button>
                          )}

                          {/* Delete */}
                          <button
                            className="row-btn danger"
                            disabled={busy}
                            onClick={() => handleDelete(agent)}
                            title="Supprimer l'agent"
                            style={{ ...getBtnStyle(agent, 5) }}
                          >
                            {renderTutorialArrow(agent, 5)}
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
                onClick={() => onConfigure(selected.run_mode || 'recouvrement', selected)}
              >
                ⚙️ Modifier config
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── EXÉCUTION (AUTO MODE) MODAL ── */}
      {runModalAgent && (runModalAgent.run_mode !== 'sourcing') && (
        <ProspectAgentExecutionModal 
          agent={runModalAgent} 
          onClose={() => setRunModalAgent(null)} 
          onToast={showToast} 
        />
      )}
      {runModalAgent && runModalAgent.run_mode === 'sourcing' && (
        <SourcingAgentExecutionModal 
          agent={runModalAgent} 
          onClose={() => setRunModalAgent(null)} 
          onToast={showToast} 
        />
      )}
      {/* ── SCHEDULE MODAL ── */}
      {scheduleModalAgent && scheduleModalAgent.run_mode === 'prospection' && (
        <ProspectAgentScheduleModal
          agent={scheduleModalAgent}
          onClose={() => setScheduleModalAgent(null)}
          onToast={showToast}
          onConfirm={async () => {
            await handleResume(scheduleModalAgent);
            setScheduleModalAgent(null);
          }}
          onEditSchedule={() => {
            setScheduleModalAgent(null);
            onConfigure(scheduleModalAgent.run_mode || 'recouvrement', scheduleModalAgent, 5);
          }}
        />
      )}
      {scheduleModalAgent && scheduleModalAgent.run_mode === 'sourcing' && (
        <SourcingAgentScheduleModal
          agent={scheduleModalAgent}
          onClose={() => setScheduleModalAgent(null)}
          onToast={showToast}
          onConfirm={async () => {
            await handleResume(scheduleModalAgent);
            setScheduleModalAgent(null);
          }}
          onEditSchedule={() => {
            setScheduleModalAgent(null);
            onConfigure(scheduleModalAgent.run_mode || 'recouvrement', scheduleModalAgent, 4);
          }}
        />
      )}

    </div>
  );
};
