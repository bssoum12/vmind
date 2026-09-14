'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
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
import { VMindGuide, VMindGuideArrow, GuideMood } from '@/shared/management/components/VMindGuide';
import { CyberIcon } from '@/shared/management/components/CyberIcon';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Brain, CheckSquare, ListChecks, SkipForward, Users, Info, ExternalLink, UploadCloud, RefreshCw, LayoutDashboard } from 'lucide-react';
import { ProspectAgentExecutionModal } from './components/ProspectAgentExecutionModal';
import { SourcingAgentExecutionModal } from './components/SourcingAgentExecutionModal';
import { ProspectAgentScheduleModal } from './components/ProspectAgentScheduleModal';
import { SourcingAgentScheduleModal } from './components/SourcingAgentScheduleModal';
import { DeleteAgentConfirmModal } from './components/DeleteAgentConfirmModal';
import { AGENT_TEMPLATES } from '@/shared/management/constants/data';
import { useToast } from '@/shared/contexts/ToastContext';

interface AgentsViewProps {
  onNavigate: (view: string) => void;
  onConfigure: (templateId: string, agent?: any, initialStep?: number) => void;
}

type AgentStatus = 'running' | 'paused' | 'stopped';

export interface LiveAgent {
  agent_name: string;
  nom?: string;
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
  config?: any;
  target_agent_ids?: (number | string)[];
  is_executing?: boolean;
}

function deriveStatus(agent: LiveAgent): AgentStatus {
  if (agent.status === 'paused') return 'paused';
  if (agent.schedule_id) return 'running';
  return 'stopped';
}

function formatDate(ts?: number | string) {
  if (!ts) return '—';
  let num: number;
  if (typeof ts === 'number') {
    num = ts;
  } else if (!isNaN(Number(ts))) {
    num = Number(ts);
  } else {
    num = new Date(ts).getTime();
  }
  if (isNaN(num) || num <= 0) return '—';
  return new Date(num).toLocaleString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function parseHourString(rawHour: any): string {
  if (rawHour === undefined || rawHour === null || rawHour === '') return '08';
  const str = String(rawHour).trim().toLowerCase();
  if (str.endsWith('am')) {
    const val = parseInt(str.replace('am', ''), 10);
    return String(isNaN(val) ? 8 : (val === 12 ? 0 : val)).padStart(2, '0');
  }
  if (str.endsWith('pm')) {
    const val = parseInt(str.replace('pm', ''), 10);
    return String(isNaN(val) ? 20 : (val === 12 ? 12 : val + 12)).padStart(2, '0');
  }
  const val = parseInt(str, 10);
  return String(isNaN(val) ? 8 : val).padStart(2, '0');
}

function triggerRuleSummary(rules: any[]): string {
  if (!rules || rules.length === 0) return 'Aucune règle';
  const r = rules[0];
  const interval = r.interval;
  const minPad = String(r.triggerAtMinute ?? 0).padStart(2, '0');
  const hourPad = parseHourString(r.triggerAtHour);
  const timeStr = `${hourPad}h${minPad}`;

  const dayNamesFr: Record<string, string> = {
    'Monday': 'Lun', 'Tuesday': 'Mar', 'Wednesday': 'Mer',
    'Thursday': 'Jeu', 'Friday': 'Ven', 'Saturday': 'Sam', 'Sunday': 'Dim',
    'Lundi': 'Lun', 'Mardi': 'Mar', 'Mercredi': 'Mer',
    'Jeudi': 'Jeu', 'Vendredi': 'Ven', 'Samedi': 'Sam', 'Dimanche': 'Dim'
  };

  if (interval === 'Seconds') {
    const step = Number(r.secondsBetween) || 30;
    return step <= 1 ? 'Toutes les secondes' : `Toutes les ${step} s`;
  }
  if (interval === 'Minutes') {
    const step = Number(r.minutesBetween) || 5;
    return step <= 1 ? 'Toutes les minutes' : `Toutes les ${step} min`;
  }
  if (interval === 'Hours') {
    const step = Number(r.hoursBetween) || 1;
    const minInfo = r.triggerAtMinute !== undefined && r.triggerAtMinute !== null ? ` (à min ${minPad})` : '';
    return step <= 1 ? `Chaque heure${minInfo}` : `Toutes les ${step} h${minInfo}`;
  }
  if (interval === 'Days') {
    const step = Number(r.daysBetween) || 1;
    return step <= 1 ? `Chaque jour à ${timeStr}` : `Tous les ${step} jours à ${timeStr}`;
  }
  if (interval === 'Weeks') {
    const step = Number(r.weeksBetween) || 1;
    const rawDays = Array.isArray(r.triggerOnWeekdays) && r.triggerOnWeekdays.length > 0 ? r.triggerOnWeekdays : ['Monday'];
    const days = rawDays.map((d: string) => dayNamesFr[d] || d).join(', ');
    return step <= 1 ? `Hebdo (${days}) à ${timeStr}` : `Toutes les ${step} sem. (${days}) à ${timeStr}`;
  }
  if (interval === 'Months') {
    const step = Number(r.monthsBetween) || 1;
    const dom = r.triggerAtDayOfMonth || 1;
    return step <= 1 ? `Mensuel (le ${dom}) à ${timeStr}` : `Tous les ${step} mois (le ${dom}) à ${timeStr}`;
  }
  return interval || 'Aucune règle';
}

function TargetAgentsBadge({ targets }: { targets: string[] }) {
  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState<{ top?: number; bottom?: number; left: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  if (!targets || targets.length === 0) {
    return (
      <span
        style={{
          fontSize: 10,
          padding: '2px 8px',
          borderRadius: 6,
          background: 'rgba(56, 189, 248, 0.1)',
          color: '#38BDF8',
          border: '1px solid rgba(56, 189, 248, 0.25)',
          fontWeight: 500,
          display: 'inline-flex',
          alignItems: 'center',
          gap: 5
        }}
        title="Agent opérant en mode autonome (aucun agent de prospection cible assigné)."
      >
        <CyberIcon name="zap" size={10} color="#38BDF8" />
        <span>Mode Autonome</span>
      </span>
    );
  }

  const firstTarget = targets[0];
  const remainingTargets = targets.slice(1);

  const updatePosition = () => {
    if (btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      if (spaceBelow < 220 && rect.top > 220) {
        // Open upwards if not enough space below
        setCoords({
          bottom: window.innerHeight - rect.top + 6,
          left: Math.max(12, Math.min(rect.left, window.innerWidth - 300))
        });
      } else {
        // Open downwards by default
        setCoords({
          top: rect.bottom + 6,
          left: Math.max(12, Math.min(rect.left, window.innerWidth - 300))
        });
      }
    }
  };

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isOpen) {
      updatePosition();
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    const handleScrollOrResize = () => {
      if (btnRef.current) updatePosition();
    };
    const handleClickOutside = (e: MouseEvent) => {
      if (btnRef.current && !btnRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div
      style={{ display: 'inline-flex', alignItems: 'center', gap: 4, position: 'relative' }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* 1st Agent Badge (Capped at 1) */}
      <span
        style={{
          fontSize: 10,
          padding: '2px 8px',
          borderRadius: 6,
          background: 'rgba(0, 229, 200, 0.1)',
          color: '#00E5C8',
          border: '1px solid rgba(0, 229, 200, 0.25)',
          fontWeight: 500,
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          whiteSpace: 'nowrap'
        }}
        title={`Agent Prospect Cible: ${firstTarget}`}
      >
        🎯 {firstTarget}
      </span>

      {/* +N autres Badge with Hover / Click Popover */}
      {remainingTargets.length > 0 && (
        <>
          <button
            ref={btnRef}
            type="button"
            onClick={handleToggle}
            onMouseEnter={() => {
              updatePosition();
              setIsOpen(true);
            }}
            style={{
              fontSize: 10,
              padding: '2px 7px',
              borderRadius: 6,
              background: isOpen ? 'rgba(0, 229, 200, 0.25)' : 'rgba(0, 229, 200, 0.12)',
              color: '#00E5C8',
              border: '1px solid rgba(0, 229, 200, 0.35)',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 2,
              transition: 'all 0.15s ease'
            }}
            title="Voir tous les agents prospect cibles"
          >
            +{remainingTargets.length} autre{remainingTargets.length > 1 ? 's' : ''} ▾
          </button>

          {isOpen && coords && typeof document !== 'undefined' && createPortal(
            <div
              style={{
                position: 'fixed',
                ...(coords.top !== undefined ? { top: coords.top } : {}),
                ...(coords.bottom !== undefined ? { bottom: coords.bottom } : {}),
                left: coords.left,
                zIndex: 999999,
                minWidth: 230,
                width: 'max-content',
                maxWidth: '90vw',
                background: 'rgba(6, 17, 31, 0.98)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(0, 229, 200, 0.3)',
                boxShadow: '0 12px 30px rgba(0, 0, 0, 0.7), 0 0 15px rgba(0, 229, 200, 0.15)',
                borderRadius: 10,
                padding: '10px 12px',
                pointerEvents: 'auto'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{
                fontSize: 11,
                fontWeight: 700,
                color: '#00E5C8',
                marginBottom: 8,
                paddingBottom: 6,
                borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12
              }}>
                <span>🎯 Prospects Cibles</span>
                <span style={{ fontSize: 10, opacity: 0.8, color: '#F0F4F8' }}>{targets.length} agents</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 200, overflowY: 'auto' }}>
                {targets.map((name, i) => (
                  <div
                    key={i}
                    style={{
                      fontSize: 11,
                      color: '#F0F4F8',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '6px 8px',
                      borderRadius: 6,
                      background: 'rgba(255, 255, 255, 0.03)',
                      border: '1px solid rgba(255, 255, 255, 0.05)',
                      transition: 'all 0.15s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(0, 229, 200, 0.08)';
                      e.currentTarget.style.borderColor = 'rgba(0, 229, 200, 0.2)';
                      e.currentTarget.style.color = '#00E5C8';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                      e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.05)';
                      e.currentTarget.style.color = '#F0F4F8';
                    }}
                  >
                    <span style={{ fontSize: 11, flexShrink: 0 }}>🎯</span>
                    <span style={{ whiteSpace: 'nowrap', fontWeight: 500 }}>
                      {name}
                    </span>
                  </div>
                ))}
              </div>
            </div>,
            document.body
          )}
        </>
      )}
    </div>
  );
}

export const resolveAgentType = (agent: LiveAgent): string => {
  const rm = (agent.run_mode || '').toLowerCase().trim();
  if (rm === 'prospection') return 'prospection';
  if (rm === 'sourcing') return 'sourcing';
  if (rm === 'recouvrement') return 'recouvrement';
  const name = (agent.agent_name || (agent as any).nom || '').toLowerCase();
  if (name.includes('source') || name.includes('sourcing')) return 'sourcing';
  if (name.includes('prospect')) return 'prospection';
  return 'recouvrement';
};

export function AgentsView({ onNavigate, onConfigure }: AgentsViewProps) {
  const router = useRouter();
  const { showToast: globalShowToast } = useToast();
  const [agents, setAgents] = useState<LiveAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<LiveAgent | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null); // agent_name being actioned
  const [navigatingTo, setNavigatingTo] = useState<string | null>(null);

  const showToast = useCallback((msg: string, type: 'ok' | 'err' | 'success' | 'error' = 'ok') => {
    const normalizedType = type === 'ok' ? 'success' : type === 'err' ? 'error' : type;
    globalShowToast(msg, normalizedType);
  }, [globalShowToast]);

  // Auto Mode Modal State
  const [runModalAgent, setRunModalAgent] = useState<LiveAgent | null>(null);
  const [scheduleModalAgent, setScheduleModalAgent] = useState<LiveAgent | null>(null);
  const [deleteModalAgent, setDeleteModalAgent] = useState<LiveAgent | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

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

  const nextTutorialStep = useCallback(() => {
    setTutorialStep(s => {
      if (s >= 5) {
        setTutorialAgent(null);
        return 0;
      }
      return s + 1;
    });
  }, []);

  // Keyboard navigation for VMindGuide Tutorial: Space / ArrowRight = Next, Escape = Dismiss
  useEffect(() => {
    if (tutorialStep <= 0) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Guard: Never intercept when user is typing in form controls
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }

      if (e.code === 'Space' || e.key === ' ' || e.key === 'Spacebar') {
        e.preventDefault();
        e.stopPropagation();
        nextTutorialStep();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        e.stopPropagation();
        nextTutorialStep();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        setTutorialStep(0);
        setTutorialAgent(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [tutorialStep, nextTutorialStep]);

  const agentHasTargetProspects = (agent: LiveAgent | null): boolean => {
    if (!agent) return false;
    const raw = agent.config?.target_agent_ids || 
                (agent as any)?.target_agent_ids || 
                (agent as any)?.parameters?.target_agent_ids ||
                (agent as any)?.parameters?.sourcing_config?.target_agent_ids;
    return Array.isArray(raw) && raw.length > 0;
  };

  const getTutorialContent = () => {
    if (!tutorialAgent) return null;
    const isProspection = tutorialAgent.run_mode === 'prospection';
    const isSourcing = tutorialAgent.run_mode === 'sourcing';
    const currentStatus = deriveStatus(tutorialAgent);
    const isExecuting = !!tutorialAgent.is_executing;

    switch (tutorialStep) {
      case 1: {
        let statusPhrase = "déployé et prêt à l'emploi";
        let statusAdvice = "Son autopilot est actuellement arrêté. Vous pouvez lancer une exécution ponctuelle (▶ Run) ou programmer son automatisation continue (▶ Start).";
        let guideMood: GuideMood = 'curious';

        if (isExecuting) {
          statusPhrase = "actuellement en cours d'exécution ⚡";
          statusAdvice = "Il traite activement vos données en tâche de fond.";
          guideMood = 'focused';
        } else if (currentStatus === 'running') {
          statusPhrase = "actif et programmé 🟢";
          statusAdvice = "Ses tâches automatisées sont enclenchées et s'exécutent selon les plages programmées.";
          guideMood = 'focused';
        } else if (currentStatus === 'paused') {
          statusPhrase = "en pause 🟡";
          statusAdvice = "Ses déclenchements automatiques sont temporairement suspendus. Vous pouvez le relancer à tout moment.";
          guideMood = 'curious';
        } else {
          // stopped (Arrêté)
          statusPhrase = "prêt mais actuellement arrêté 🔴";
          statusAdvice = "Son autopilot est inactif. Vous pouvez cliquer sur '▶ Run' pour un lancement immédiat ou '▶ Start' pour programmer son exécution automatique.";
          guideMood = 'curious';
        }

        return {
          title: "1. Votre Agent dans le Dashboard",
          message: `Votre agent "${tutorialAgent.agent_name}" est ${statusPhrase}. ${statusAdvice} Vous pouvez retrouver toutes ses métriques et actions ici en temps réel.`,
          mood: guideMood
        };
      }
      case 2:
        return {
          title: "2. Espace de Travail & Données",
          message: isProspection
            ? "Cliquez sur 'Espace' pour ouvrir son interface dédiée. C'est ici que vous déposez vos contacts (fichiers CSV, Excel, XML... ou URL web), vérifiez les qualifications de l'IA et supervisez l'envoi de vos campagnes d'emails."
            : isSourcing
              ? "Cliquez sur 'Espace' pour ouvrir son interface dédiée. C'est ici que vous retrouvez tous les leads sourcés depuis le web, suivez les statistiques d'extraction et supervisez le journal d'activité."
              : "Ouvrez l'Espace de Travail pour suivre vos données et superviser l'agent.",
          mood: 'focused' as GuideMood
        };
      case 3:
        return {
          title: "3. Lancement Immédiat & Planification",
          message: isProspection
            ? "Le bouton 'Run' lance une qualification immédiate de vos contacts. Le bouton 'Start' (ou 'Pause') active ou suspend la planification automatique selon les plages configurées."
            : isSourcing
              ? "Le bouton 'Run' lance une recherche immédiate de leads selon vos critères. Le bouton 'Start' (ou 'Pause') active la recherche continue pour alimenter votre pipeline en continu."
              : "Le bouton 'Run' lance une tâche immédiate et 'Start' / 'Pause' gère la planification.",
          mood: 'focused' as GuideMood
        };
      case 4: {
        const hasTargets = agentHasTargetProspects(tutorialAgent);
        const shouldGuideProspectDuo = isSourcing && !hasTargets;

        return {
          title: isProspection
            ? "4. Associer un Sourcing Agent (Duo Autopilot)"
            : shouldGuideProspectDuo
              ? "4. Associer un Agent de Prospection (Duo Autopilot)"
              : "4. Configuration de l'Agent",
          message: isProspection
            ? "Pourquoi ce 2ème agent est important ? Cet Agent de Prospection est votre closer : il qualifie et contacte vos leads, mais NE cherche PAS de prospects tout seul. Le Sourcing Agent est le chasseur qui explore le web et lui injecte des décideurs B2B en continu. Sans lui, vous devez importer vos fichiers manuellement. Avec lui, votre prospection tourne en 100% pilote automatique !"
            : shouldGuideProspectDuo
              ? "Pourquoi ce 2ème agent est recommandé ? Votre Agent de Sourcing est le chasseur : il découvre et extrait des profils B2B ciblés sur le web. L'Agent de Prospection (Closer) prend automatiquement le relais pour les qualifier et leur envoyer des campagnes d'emails personnalisées. Sans lui, vous devrez exporter et contacter vos leads manuellement. Avec lui, votre prospection tourne en 100% pilote automatique !"
              : "Votre Agent de Sourcing est déjà configuré pour alimenter votre Agent de Prospection cible. Vous pouvez ajuster vos critères de recherche et paramètres d'extraction à tout moment.",
          mood: shouldGuideProspectDuo || isProspection ? ('convinced' as GuideMood) : ('focused' as GuideMood)
        };
      }
      case 5:
        return {
          title: "5. Configuration & Gestion",
          message: "Modifiez la configuration de cet agent (⚙️) ou supprimez-le définitivement (🗑️) selon vos besoins.",
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
    return tutorialStep > 0 ? { pointerEvents: 'none' as any } : {};
  };

  const renderTutorialArrow = (agent: LiveAgent, step: number) => {
    if (tutorialStep === step && tutorialAgent?.agent_name === agent.agent_name) {
      return (
        <VMindGuideArrow
          direction="down"
          color="#00E5C8"
          style={{
            position: 'absolute',
            top: '-45px',
            left: '50%',
            transform: 'translateX(-50%)'
          }}
        />
      );
    }
    return null;
  };

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getAgents();
      const sortedData = data.sort((a: LiveAgent, b: LiveAgent) => {
        const timeA = a.deployed_at || 0;
        const timeB = b.deployed_at || 0;
        if (timeA !== timeB) return timeB - timeA;
        return a.agent_name.localeCompare(b.agent_name);
      });
      setAgents(sortedData);
      if (typeof window !== 'undefined') {
        const postDeployName = sessionStorage.getItem('vmind_post_deploy_tutorial_agent');
        if (postDeployName) {
          sessionStorage.removeItem('vmind_post_deploy_tutorial_agent');
          const target = sortedData.find(a => a.agent_name.toLowerCase() === postDeployName.toLowerCase()) || sortedData[0];
          if (target) {
            setTutorialAgent(target);
            setTutorialStep(1);
          }
        }
      }
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

  useProspectSocket((payload) => {
    if (typeof payload.is_executing === 'boolean' && (payload.agent_id || payload.uuid)) {
      const targetId = String(payload.uuid || payload.agent_id || '').toLowerCase();
      setAgents((prev) => prev.map(a => {
        const aUuid = String(a.uuid || '').toLowerCase();
        const aAgentId = String(a.agent_id || '').toLowerCase();
        const aName = String(a.agent_name || a.nom || '').toLowerCase();

        if (
          targetId === aUuid ||
          targetId === aAgentId ||
          targetId === aName
        ) {
          return { ...a, is_executing: payload.is_executing };
        }
        return a;
      }));
    }
  });

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

  const handleResume = async (agent: LiveAgent, params?: any) => {
    setActionLoading(agent.agent_name);
    try {
      await resumeAgent(agent.agent_name, params);
      showToast(`Agent "${agent.agent_name}" relancé.`);
      await refresh();
    } catch (e: any) {
      showToast(e.message, 'err');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = (agent: LiveAgent) => {
    setDeleteModalAgent(agent);
  };

  const handleConfirmDelete = async () => {
    if (!deleteModalAgent) return;
    setIsDeleting(true);
    setActionLoading(deleteModalAgent.agent_name);
    try {
      await deleteAgent(deleteModalAgent.agent_name);
      showToast(`Agent "${deleteModalAgent.agent_name}" supprimé avec succès.`);
      if (selected?.agent_name === deleteModalAgent.agent_name) setSelected(null);
      setDeleteModalAgent(null);
      await refresh();
    } catch (e: any) {
      showToast(e.message, 'err');
    } finally {
      setIsDeleting(false);
      setActionLoading(null);
    }
  };

  const handleRunNow = async (agent: LiveAgent) => {
    if (agent.is_executing) {
      showToast("Cet agent est déjà en cours d'exécution.", 'err');
      return;
    }

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

  const getTargetAgentNames = (agent: LiveAgent) => {
    const rawIds = Array.isArray(agent?.config?.target_agent_ids)
      ? agent.config.target_agent_ids
      : (Array.isArray((agent as any)?.target_agent_ids) ? (agent as any).target_agent_ids : []);

    const targetIds = Array.isArray(rawIds) ? rawIds : [];
    if (!targetIds || targetIds.length === 0) return [];

    return targetIds.map(id => {
      const found = agents.find(a => (a.uuid === String(id) || a.agent_id === String(id) || a.agent_name.toLowerCase() === String(id).toLowerCase()));
      return found ? found.agent_name : null;
    }).filter(Boolean) as string[];
  };

  const statusMeta: Record<AgentStatus, { label: string; dot: string; pill: string }> = {
    running: { label: 'Programmé', dot: '#00E5A0', pill: 'sp-running' },
    paused: { label: 'En pause', dot: '#FFB800', pill: 'sp-pending' },
    stopped: { label: 'Arrêté', dot: '#FF4757', pill: 'sp-stopped' },
  };

  return (
    <div id="view-agents" className="anim" style={{ position: 'relative' }}>

      {/* ── Fullscreen Tutorial Blocker Overlay ── */}
      {tutorialStep > 0 && (
        <div
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(2, 6, 14, 0.78)',
            backdropFilter: 'blur(3px)',
            WebkitBackdropFilter: 'blur(3px)',
            zIndex: 10000,
            cursor: 'default',
            pointerEvents: 'all'
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
          showBackdrop={false}
          onClose={() => {
            setTutorialStep(0);
            setTutorialAgent(null);
          }}
        >
          <div className="vmind-guide-actions">
            {tutorialStep < 4 && (
              <button
                type="button"
                className="vmind-guide-btn-primary"
                onClick={nextTutorialStep}
              >
                <span>Suivant</span>
                <CyberIcon name="arrow-right" size={13} color="currentColor" />
              </button>
            )}

            {tutorialStep === 4 && tutorialAgent.run_mode === 'prospection' && (
              <>
                <button
                  type="button"
                  className="vmind-guide-btn-primary"
                  onClick={() => {
                    setTutorialStep(0);
                    setTutorialAgent(null);
                    if (typeof window !== 'undefined') {
                      sessionStorage.setItem('vmind_guide_target_marketplace', 'sourcing');
                      const linkId = tutorialAgent.uuid || (tutorialAgent as any).agent_id;
                      if (linkId) {
                        sessionStorage.setItem('vmind_guide_link_prospect_uuid', String(linkId));
                      }
                      const linkName = tutorialAgent.agent_name || (tutorialAgent as any).nom;
                      if (linkName) {
                        sessionStorage.setItem('vmind_guide_link_prospect_name', String(linkName));
                      }
                    }
                    onNavigate('market');
                  }}
                >
                  <CyberIcon name="zap" size={13} color="currentColor" />
                  <span>Trouver dans le Marketplace</span>
                  <CyberIcon name="arrow-right" size={13} color="currentColor" />
                </button>
                <button
                  type="button"
                  className="vmind-guide-btn-secondary"
                  onClick={nextTutorialStep}
                >
                  <span>Passer cette étape</span>
                </button>
              </>
            )}

            {tutorialStep === 4 && tutorialAgent.run_mode === 'sourcing' && !agentHasTargetProspects(tutorialAgent) && (
              <>
                <button
                  type="button"
                  className="vmind-guide-btn-primary"
                  onClick={() => {
                    setTutorialStep(0);
                    setTutorialAgent(null);
                    if (typeof window !== 'undefined') {
                      sessionStorage.setItem('vmind_guide_target_marketplace', 'prospection');
                      const linkId = tutorialAgent.uuid || (tutorialAgent as any).agent_id;
                      if (linkId) {
                        sessionStorage.setItem('vmind_guide_origin_sourcing_uuid', String(linkId));
                      }
                      const linkName = tutorialAgent.agent_name || (tutorialAgent as any).nom;
                      if (linkName) {
                        sessionStorage.setItem('vmind_guide_origin_sourcing_name', String(linkName));
                      }
                    }
                    onNavigate('market');
                  }}
                >
                  <CyberIcon name="zap" size={13} color="currentColor" />
                  <span>Trouver dans le Marketplace</span>
                  <CyberIcon name="arrow-right" size={13} color="currentColor" />
                </button>
                <button
                  type="button"
                  className="vmind-guide-btn-secondary"
                  onClick={nextTutorialStep}
                >
                  <span>Passer cette étape</span>
                </button>
              </>
            )}

            {tutorialStep === 4 && (
              (tutorialAgent.run_mode === 'sourcing' && agentHasTargetProspects(tutorialAgent)) ||
              (tutorialAgent.run_mode !== 'prospection' && tutorialAgent.run_mode !== 'sourcing')
            ) && (
              <button
                type="button"
                className="vmind-guide-btn-primary"
                onClick={nextTutorialStep}
              >
                <span>Suivant</span>
                <CyberIcon name="arrow-right" size={13} color="currentColor" />
              </button>
            )}

            {tutorialStep >= 5 && (
              <button
                type="button"
                className="vmind-guide-btn-primary"
                onClick={() => {
                  setTutorialStep(0);
                  setTutorialAgent(null);
                }}
              >
                <span>Terminer la Visite</span>
                <CyberIcon name="check" size={14} color="currentColor" />
              </button>
            )}

            <button
              type="button"
              className="vmind-guide-btn-ghost"
              onClick={() => {
                setTutorialStep(0);
                setTutorialAgent(null);
              }}
            >
              <span>Fermer</span>
            </button>
          </div>
        </VMindGuide>
      )}

      {/* ── Header ── */}
      <div className="page-head">
        <div>
          <div className="page-title">Mes Agents Actifs</div>
          <div className="page-sub">Gérez et surveillez vos employés virtuels en temps réel</div>
        </div>
        <div className="page-actions" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button className="btn" onClick={restartTutorial} style={{ background: 'rgba(0, 229, 200, 0.1)', color: '#00E5C8', border: '1px solid rgba(0, 229, 200, 0.3)', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <Info size={13} />
            Relancer le tutoriel
          </button>
          <button className="btn" onClick={refresh} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <RefreshCw size={13} />
            Rafraîchir
          </button>
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
              <div>Déployez un agent depuis la <button className="row-btn" onClick={() => onNavigate('market')}>page de déploiement</button></div>
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
                  const isTutorialActive = tutorialStep > 0 && tutorialAgent?.agent_name === agent.agent_name;

                  return (
                    <tr
                      key={agent.agent_name}
                      onMouseEnter={() => {
                        if (tutorialStep > 0) return;
                        startTutorial(agent);
                      }}
                      onClick={() => {
                        if (tutorialStep > 0) return;
                        setSelected(isSelected ? null : agent);
                      }}
                      style={{
                        cursor: tutorialStep > 0 ? 'default' : 'pointer',
                        pointerEvents: tutorialStep > 0 ? 'none' : undefined,
                        background: isTutorialActive && tutorialStep === 1 ? 'rgba(0, 229, 200, 0.12)' : isSelected ? 'rgba(0,229,160,0.06)' : undefined,
                        borderLeft: isSelected ? '3px solid #00E5A0' : '3px solid transparent',
                        transition: 'all .15s',
                        position: isTutorialActive ? 'relative' : undefined,
                        zIndex: isTutorialActive ? 10001 : undefined,
                        boxShadow: isTutorialActive && tutorialStep === 1 ? '0 0 0 4px rgba(0, 229, 200, 0.85)' : undefined,
                      }}
                    >
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, position: 'relative' }}>
                          {isTutorialActive && tutorialStep === 1 && (
                            <VMindGuideArrow
                              direction="down"
                              color="#00E5C8"
                              style={{
                                position: 'absolute',
                                top: '-42px',
                                left: '16px',
                                zIndex: 10002
                              }}
                            />
                          )}
                          <div style={{
                            width: 32, height: 32, borderRadius: 8, display: 'flex',
                            alignItems: 'center', justifyContent: 'center', fontSize: 16,
                            background: AGENT_TEMPLATES.find(t => t.id === agent.run_mode)?.iconBg || 'rgba(255,255,255,0.05)',
                            flexShrink: 0
                          }}>
                            {AGENT_TEMPLATES.find(t => t.id === agent.run_mode)?.icon || '🤖'}
                          </div>
                          <div>
                            <div className="agent-row-name">{agent.agent_name}</div>
                            <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                              <span>{agent.run_mode || resolveAgentType(agent)}</span>
                              {agent.run_mode === 'sourcing' && (
                                <TargetAgentsBadge targets={getTargetAgentNames(agent)} />
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td>
                        <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                          {agent.schedule_id ? triggerRuleSummary(agent.trigger_rules) : 'Aucune règle'}
                        </div>
                      </td>

                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          {agent.is_executing ? (
                            <span style={{
                              display: 'inline-flex', alignItems: 'center', gap: 6,
                              fontSize: 11, padding: '4px 10px', borderRadius: 20,
                              background: 'rgba(0, 229, 200, 0.15)', color: '#00E5C8',
                              border: '1px solid rgba(0, 229, 200, 0.4)',
                              fontWeight: 600, animation: 'pulse 1.5s infinite',
                              boxShadow: '0 0 10px rgba(0, 229, 200, 0.2)',
                              width: 'fit-content', whiteSpace: 'nowrap'
                            }}>
                              <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#00E5C8', boxShadow: '0 0 6px #00E5C8' }} />
                              ⚡ En cours...
                            </span>
                          ) : (
                            <span className={`status-pill ${meta.pill}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, width: 'fit-content' }}>
                              <span style={{
                                width: 7, height: 7, borderRadius: '50%',
                                background: meta.dot,
                                boxShadow: status === 'running' ? `0 0 6px ${meta.dot}` : 'none',
                                animation: status === 'running' ? 'pulse 1.8s infinite' : 'none',
                              }} />
                              {meta.label}
                            </span>
                          )}
                        </div>
                      </td>

                      <td style={{ fontSize: 12, color: 'var(--muted)' }}>
                        {formatDate(agent.lastExecuted)}
                      </td>

                      <td onClick={e => e.stopPropagation()}>
                        <div className="row-actions">
                          {/* Run Now - Tutorial Step 3 */}
                          <button
                            className="row-btn"
                            disabled={busy || agent.is_executing}
                            onClick={() => handleRunNow(agent)}
                            title="Exécuter maintenant"
                            style={{
                              ...getBtnStyle(agent, 3),
                              opacity: agent.is_executing ? 0.5 : 1,
                              cursor: agent.is_executing ? 'not-allowed' : 'pointer'
                            }}
                          >
                            {renderTutorialArrow(agent, 3)}
                            {busy ? '…' : '▶ Run'}
                          </button>

                          {/* Stop / Start - Tutorial Step 3 */}
                          {status === 'running' ? (
                            <button
                              className="row-btn danger"
                              disabled={busy || agent.is_executing}
                              onClick={() => handlePause(agent)}
                              title="Mettre en pause"
                              style={{
                                ...getBtnStyle(agent, 3),
                                opacity: agent.is_executing ? 0.5 : 1,
                                cursor: agent.is_executing ? 'not-allowed' : 'pointer'
                              }}
                            >
                              {busy ? '…' : '⏸ Stop'}
                            </button>
                          ) : (
                            <button
                              className="row-btn"
                              disabled={busy || agent.is_executing}
                              onClick={() => {
                                if (agent.run_mode === 'prospection' || agent.run_mode === 'sourcing') {
                                  setScheduleModalAgent(agent);
                                } else {
                                  handleResume(agent);
                                }
                              }}
                              title="Reprendre"
                              style={{
                                color: '#00E5A0', borderColor: 'rgba(0,229,160,0.3)', ...getBtnStyle(agent, 3),
                                opacity: agent.is_executing ? 0.5 : 1,
                                cursor: agent.is_executing ? 'not-allowed' : 'pointer'
                              }}
                            >
                              {busy ? '…' : '▶ Start'}
                            </button>
                          )}

                          {/* Config - Tutorial Step 5 */}
                          <button
                            className="row-btn"
                            onClick={() => onConfigure(agent.run_mode || 'recouvrement', agent)}
                            title="Modifier la configuration"
                            style={{ ...getBtnStyle(agent, 5) }}
                          >
                            {renderTutorialArrow(agent, 5)}
                            ⚙️
                          </button>

                          {/* Open Workspace (Prospect and Sourcing) - Tutorial Step 2 */}
                          {(agent.run_mode === 'prospection' || agent.run_mode === 'sourcing') && (
                            <button
                              className="row-btn"
                              onClick={() => {
                                setNavigatingTo(agent.agent_name);
                                const route = agent.run_mode === 'sourcing'
                                  ? `/sourcing-agent-workspace/${agent.uuid || (agent as any).agent_id}`
                                  : `/prospect-agent-workspace/${agent.uuid || (agent as any).agent_id || 1}`;
                                router.push(route);
                              }}
                              title="Ouvrir l'espace de travail"
                              style={{
                                color: '#00E5C8',
                                borderColor: 'rgba(0,229,200,0.3)',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 6,
                                ...getBtnStyle(agent, 2)
                              }}
                            >
                              {renderTutorialArrow(agent, 2)}
                              {navigatingTo === agent.agent_name ? (
                                <span>⏳ Ouverture...</span>
                              ) : (
                                <>
                                  <LayoutDashboard size={13} style={{ flexShrink: 0 }} />
                                  <span>Espace</span>
                                </>
                              )}
                            </button>
                          )}

                          {/* Delete - Tutorial Step 5 */}
                          <button
                            className="row-btn danger"
                            disabled={busy}
                            onClick={() => handleDelete(agent)}
                            title="Supprimer l'agent"
                            style={{ ...getBtnStyle(agent, 5) }}
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
              { label: '⏰ Planification', value: selected.schedule_id ? triggerRuleSummary(selected.trigger_rules) : 'Aucune règle' },
              selected.run_mode === 'sourcing' && getTargetAgentNames(selected).length > 0 ? {
                label: '🎯 Prospects Cibles',
                value: getTargetAgentNames(selected).join(', ')
              } : null,
              { label: '🔑 Schedule ID', value: selected.schedule_id || 'Aucun (en pause)' },
              { label: '🏷️ Session', value: selected.session_id },
              { label: '🕓 Dernière exéc.', value: formatDate(selected.lastExecuted || undefined) },
            ].filter(Boolean).map((row: any) => (
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
                style={{
                  flex: 1,
                  fontSize: 12,
                  opacity: selected.is_executing ? 0.5 : 1,
                  cursor: selected.is_executing ? 'not-allowed' : 'pointer'
                }}
                onClick={() => handleRunNow(selected)}
                disabled={actionLoading === selected.agent_name || !!selected.is_executing}
              >
                {selected.is_executing ? '⚡ En cours...' : '▶ Exécuter maintenant'}
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
      {runModalAgent && runModalAgent.run_mode === 'prospection' && (
        <ProspectAgentExecutionModal
          agent={runModalAgent}
          onClose={() => {
            setRunModalAgent(null);
            refresh();
          }}
          onToast={showToast}
        />
      )}
      {runModalAgent && runModalAgent.run_mode === 'sourcing' && (
        <SourcingAgentExecutionModal
          agent={runModalAgent}
          onClose={() => {
            setRunModalAgent(null);
            refresh();
          }}
          onSuccess={() => refresh()}
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
          onConfirm={async (params?: any) => {
            if (params?.trigger_rules) {
              try {
                const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
                const tokenStr = localStorage.getItem('vmind_session');
                let token = tokenStr;
                if (tokenStr?.trim().startsWith("{")) {
                  try { token = JSON.parse(tokenStr).token; } catch (e) { }
                }
                const publicId = scheduleModalAgent.uuid || scheduleModalAgent.agent_id;
                const updateBody: any = {
                  agent_name: scheduleModalAgent.agent_name,
                  trigger_rules: params.trigger_rules,
                  agent_mission: params.sourcingSummary,
                  sourcing_config: {
                    agent_mission: params.sourcingSummary,
                    sourcingSummary: params.sourcingSummary,
                    totalLeads: params.totalLeads,
                    leadsPerCompany: params.leadsPerCompany,
                    ignoreDuplicates: params.ignoreDuplicates
                  }
                };

                if (params.update_defaults) {
                  updateBody.target_agent_ids = params.target_agent_ids;
                }

                await fetch(`${baseUrl}/api/sourcing-agent/update/${publicId}`, {
                  method: "PUT",
                  headers: {
                    "Content-Type": "application/json",
                    ...(token && { 'Authorization': `Bearer ${token}` })
                  },
                  body: JSON.stringify(updateBody)
                });

                const startRes = await fetch(`${baseUrl}/api/sourcing-agent/start/${publicId}`, {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    ...(token && { 'Authorization': `Bearer ${token}` })
                  },
                  body: JSON.stringify({
                    target_agent_ids: params.target_agent_ids || scheduleModalAgent.target_agent_ids,
                    update_defaults: params.update_defaults
                  })
                });

                if (!startRes.ok) {
                  const errData = await startRes.json().catch(() => ({}));
                  throw new Error(errData.error || "Échec du démarrage de l'agent.");
                }

                showToast(`Sourcing continu activé pour "${scheduleModalAgent.agent_name}" !`);
                await refresh();
              } catch (err: any) {
                showToast(err.message || "Erreur lors de l'activation du schedule", 'err');
              }
            } else {
              await handleResume(scheduleModalAgent, params);
            }
            setScheduleModalAgent(null);
          }}
          onEditSchedule={() => {
            setScheduleModalAgent(null);
          }}
        />
      )}

      {/* ── DELETE CONFIRMATION MODAL ── */}
      <DeleteAgentConfirmModal
        isOpen={!!deleteModalAgent}
        agent={deleteModalAgent}
        onClose={() => setDeleteModalAgent(null)}
        onConfirm={handleConfirmDelete}
        isDeleting={isDeleting}
      />

    </div>
  );
};
