import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CalendarClock, Settings, Play, Users, Info, UploadCloud, ExternalLink, Brain, CheckSquare, ListChecks, SkipForward } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { LiveAgent } from '../AgentsView';
import { VMindGuide } from '@/shared/management/components/VMindGuide';
import { getProspectAgentStats, triggerAIQualificationAllPending, qualifyManualProspects } from '@/shared/api/n8n-api';
import { useProspectSocket } from '../../prospect-workspace/hooks/useProspectSocket';

interface ProspectAgentScheduleModalProps {
  agent: LiveAgent;
  onClose: () => void;
  onConfirm: () => void;
  onEditSchedule: () => void;
  onToast: (msg: string, type?: 'ok' | 'err') => void;
}

export function ProspectAgentScheduleModal({ agent, onClose, onConfirm, onEditSchedule, onToast }: ProspectAgentScheduleModalProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [step, setStep] = useState<'loading' | 'no_leads' | 'qualify' | 'schedule'>('loading');
  const [stats, setStats] = useState<any>(null);
  const [isAIEvaluating, setIsAIEvaluating] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const publicId = agent.uuid || (agent as any).agent_id;

  const fetchStats = async () => {
    try {
      const data = await getProspectAgentStats(publicId);
      setStats(data);
      if (data.total_leads === 0) {
        setStep('no_leads');
      } else if (step === 'loading') {
        setStep('qualify');
      }
    } catch (e: any) {
      if (onToast) onToast(e.message, 'err');
      onClose();
    }
  };

  useEffect(() => {
    fetchStats();
  }, [publicId]);

  useProspectSocket((payload) => {
    getProspectAgentStats(publicId).then(newStats => {
      setStats(newStats);
      setStep(currentStep => {
        if (newStats.pending_leads === 0 && currentStep === 'qualify') {
          setIsAIEvaluating(false);
          return 'schedule';
        }
        return currentStep;
      });
    });
  });

  const executeAIQualify = async () => {
    setActionLoading(true);
    try {
      const res = await triggerAIQualificationAllPending(publicId);
      if (onToast) onToast(res.message || "Évaluation IA lancée !", 'ok');
      setIsAIEvaluating(true);
    } catch (e: any) {
      if (onToast) onToast(e.message, 'err');
    } finally {
      setActionLoading(false);
    }
  };

  const executeManualQualify = async (mode: 'pending_only' | 'all') => {
    setActionLoading(true);
    try {
      const res = await qualifyManualProspects(publicId, mode);
      if (onToast) onToast(`Succès : ${res.count} prospects qualifiés manuellement !`, 'ok');
      const newStats = await getProspectAgentStats(publicId);
      setStats(newStats);
      if (newStats.pending_leads === 0 && mode === 'pending_only') {
        setStep('schedule');
      }
    } catch (e: any) {
      if (onToast) onToast(e.message, 'err');
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirm = async () => {
    setIsSubmitting(true);
    try {
      await onConfirm();
    } finally {
      setIsSubmitting(false);
      onClose();
    }
  };

  const getReadableCron = () => {
    if (!agent.trigger_rules || agent.trigger_rules.length === 0) return 'Aucune planification définie';
    const r = agent.trigger_rules[0];
    const interval = r.interval;
    const minPad = String(r.triggerAtMinute ?? 0).padStart(2, '0');
    
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
      const hour = r.triggerAtHour || '08';
      return step <= 1 ? `Chaque jour à ${hour}h${minPad}` : `Tous les ${step} jours à ${hour}h${minPad}`;
    }
    if (interval === 'Weeks') {
      const days = (r.triggerOnWeekdays || ['Monday']).join(', ');
      const hour = r.triggerAtHour || '08';
      return `Hebdo (${days}) à ${hour}h${minPad}`;
    }
    if (interval === 'Months') {
      const dom = r.triggerAtDayOfMonth || 1;
      const hour = r.triggerAtHour || '08';
      return `Mensuel (le ${dom}) à ${hour}h${minPad}`;
    }
    return interval;
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)',
          zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}
      >
        <VMindGuide 
          isOpen={true}
          mood={step === 'no_leads' ? 'curious' : step === 'qualify' ? 'focused' : 'convinced'}
          title={step === 'no_leads' ? "Guide d'Exécution" : "Mode Autopilote"}
          message={
            step === 'no_leads'
              ? "Le processus d'exécution requiert une base de données. Veuillez importer des prospects depuis l'espace de travail pour initier la phase de qualification."
              : step === 'qualify'
              ? `Étape 1 : Phase de Qualification. L'IA va analyser individuellement les profils de vos ${stats?.pending_leads || 0} prospects en attente par rapport à vos critères stricts. Seuls les prospects pertinents seront retenus pour la campagne.`
              : "Étape 2 : Activation de la Planification. En activant la planification, vous confiez à l'IA la tâche d'envoyer les emails en toute autonomie. L'agent se réveillera automatiquement aux horaires prévus pour exécuter sa mission sans aucune intervention de votre part."
          }
        />

        <motion.div
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, y: 20 }}
          style={{
            background: 'rgba(15, 20, 25, 0.8)', width: 650, borderRadius: 24,
            padding: 32, boxShadow: '0 30px 60px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.1)',
            border: '1px solid rgba(255,255,255,0.05)',
            position: 'relative', zIndex: 100000, overflow: 'hidden'
          }}
        >
          <div style={{ position: 'absolute', top: -100, left: '50%', transform: 'translateX(-50%)', width: 300, height: 150, background: 'var(--cyan)', filter: 'blur(100px)', opacity: 0.15, borderRadius: '50%' }} />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
            <div>
              <h3 style={{ marginTop: 0, marginBottom: 8, fontSize: 24, fontWeight: 700, color: 'var(--text)' }}>
                Activation Automatique
              </h3>
              <p style={{ color: 'var(--muted)', fontSize: 14, margin: 0 }}>
                Agent ciblé : <strong style={{ color: 'var(--cyan)' }}>{agent.agent_name}</strong>
              </p>
            </div>
            <button
              onClick={onClose}
              style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: 'var(--text)', width: 32, height: 32, borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}
              onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
              onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
            >
              ✕
            </button>
          </div>

          {step === 'loading' ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--muted)' }}>
              <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 2, ease: 'linear' }} style={{ display: 'inline-block', marginBottom: 16 }}>
                <Play size={32} color="var(--cyan)" opacity={0.5} />
              </motion.div>
              <div style={{ fontSize: 16 }}>Analyse de la base de prospects en cours...</div>
            </div>
          ) : stats ? (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12, marginBottom: 32 }}>
                <div style={{ padding: '16px', background: 'rgba(255,255,255,0.02)', borderRadius: 16, textAlign: 'center', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <Users size={18} color="var(--muted)" style={{ marginBottom: 8 }} />
                  <div style={{ fontWeight: 700, fontSize: 28 }}>{stats.total_leads}</div>
                  <div style={{ color: 'var(--muted)', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 4 }}>Total Contacts</div>
                  <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 4 }}>Ensemble de la base importée</div>
                </div>
                <div style={{ padding: '16px', background: 'rgba(255,255,255,0.02)', borderRadius: 16, textAlign: 'center', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#FFB800', margin: '0 auto 12px auto' }} />
                  <div style={{ fontWeight: 700, fontSize: 28 }}>{stats.pending_leads}</div>
                  <div style={{ color: 'var(--muted)', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 4 }}>En Attente</div>
                  <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 4 }}>À évaluer par l'intelligence artificielle</div>
                </div>
                <div style={{ padding: '16px', background: 'rgba(0, 229, 200, 0.05)', borderRadius: 16, textAlign: 'center', border: '1px solid rgba(0, 229, 200, 0.2)' }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#00E5C8', margin: '0 auto 12px auto', boxShadow: '0 0 10px #00E5C8' }} />
                  <div style={{ fontWeight: 700, fontSize: 28, color: '#00E5C8' }}>{stats.qualified_leads}</div>
                  <div style={{ color: '#00E5C8', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 4 }}>Qualifiés</div>
                  <div style={{ fontSize: 10, color: '#00E5C8', marginTop: 4, opacity: 0.8 }}>Correspondent à votre client idéal</div>
                </div>
                <div style={{ padding: '16px', background: 'rgba(255, 71, 87, 0.05)', borderRadius: 16, textAlign: 'center', border: '1px solid rgba(255, 71, 87, 0.2)' }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#FF4757', margin: '0 auto 12px auto' }} />
                  <div style={{ fontWeight: 700, fontSize: 28, color: '#FF4757' }}>{stats.discarded_leads}</div>
                  <div style={{ color: '#FF4757', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 4 }}>Écartés</div>
                  <div style={{ fontSize: 10, color: '#FF4757', marginTop: 4, opacity: 0.8 }}>Filtrés selon vos critères stricts</div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', background: 'rgba(0, 229, 200, 0.05)', border: '1px solid rgba(0, 229, 200, 0.2)', borderRadius: 12, marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <Info size={20} color="#00E5C8" style={{ marginTop: 2 }} />
                  <div style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.5, flex: 1 }}>
                    <strong style={{ color: '#00E5C8', display: 'block', marginBottom: 4 }}>Contrôle & Flexibilité Totale</strong>
                    La campagne ciblera exclusivement les prospects "Qualifiés". Gardez à l'esprit que cet agent dispose de son propre <strong>Espace de Travail complet</strong>. Vous avez une flexibilité absolue pour y importer de nouveaux fichiers, modifier manuellement les statuts, ou inspecter les logs d'exécution à tout moment.
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button
                    onClick={() => router.push(`/prospect-agent-workspace/${publicId}?tab=leads&action=import`)}
                    style={{ background: 'rgba(0, 229, 200, 0.1)', border: '1px solid rgba(0, 229, 200, 0.4)', padding: '8px 16px', borderRadius: 8, color: '#00E5C8', fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: 8 }}
                    onMouseOver={(e) => e.currentTarget.style.background = 'rgba(0, 229, 200, 0.2)'}
                    onMouseOut={(e) => e.currentTarget.style.background = 'rgba(0, 229, 200, 0.1)'}
                  >
                    <UploadCloud size={14} /> Importer des prospects
                  </button>
                  <button
                    onClick={() => router.push(`/prospect-agent-workspace/${publicId}?tab=leads`)}
                    style={{ background: 'transparent', border: '1px solid rgba(0, 229, 200, 0.3)', padding: '8px 16px', borderRadius: 8, color: '#00E5C8', fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: 8 }}
                    onMouseOver={(e) => e.currentTarget.style.background = 'rgba(0, 229, 200, 0.1)'}
                    onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    Gérer les statuts <ExternalLink size={14} />
                  </button>
                </div>
              </div>

              {step === 'no_leads' ? (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ textAlign: 'center', padding: '20px 0' }}>
                  <p style={{ color: 'var(--muted)', marginBottom: 24, fontSize: 15 }}>Vous n'avez aucun prospect. Importez-en depuis l'espace de travail avant d'activer la planification.</p>
                  <button
                    onClick={() => router.push(`/prospect-agent-workspace/${publicId || 1}?tab=leads`)}
                    className="btn"
                    style={{ background: 'var(--cyan)', color: '#000', padding: '14px 24px', fontSize: 16, fontWeight: 600, borderRadius: 12, display: 'inline-flex', alignItems: 'center', gap: 8, border: 'none', cursor: 'pointer' }}
                  >
                    Aller à l'espace de travail
                  </button>
                </motion.div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                  {step === 'qualify' && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                      <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--muted)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 20, height: 20, background: 'rgba(255,255,255,0.1)', borderRadius: '50%', color: '#fff', fontSize: 10 }}>1</span>
                        Étape 1 : Qualification
                      </div>
                      {isAIEvaluating ? (
                        <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--muted)', background: 'rgba(255,255,255,0.02)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.05)' }}>
                          <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 2, ease: 'linear' }} style={{ display: 'inline-block', marginBottom: 16 }}>
                            <Brain size={32} color="#b19cd9" opacity={0.8} />
                          </motion.div>
                          <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)' }}>Évaluation IA en cours...</div>
                          <div style={{ fontSize: 13, marginTop: 8 }}>Veuillez patienter pendant que l'IA analyse les profils en attente.</div>
                          <div style={{ marginTop: 20 }}>
                            <div style={{ height: 4, width: '60%', margin: '0 auto', background: 'rgba(255,255,255,0.1)', borderRadius: 2, overflow: 'hidden', position: 'relative' }}>
                              <motion.div
                                initial={{ left: '-100%' }}
                                animate={{ left: '100%' }}
                                transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}
                                style={{ position: 'absolute', top: 0, bottom: 0, width: '50%', background: '#b19cd9', borderRadius: 2 }}
                              />
                            </div>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                            <button title={stats.pending_leads === 0 ? "Aucun prospect en attente d'évaluation" : "Lancer l'évaluation IA"} onClick={executeAIQualify} disabled={!!actionLoading || stats.pending_leads === 0} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', padding: 16, borderRadius: 12, textAlign: 'left', cursor: stats.pending_leads === 0 ? 'not-allowed' : 'pointer', display: 'flex', flexDirection: 'column', gap: 8, transition: 'all 0.2s', opacity: stats.pending_leads === 0 ? 0.5 : 1 }} onMouseOver={(e) => { if (stats.pending_leads > 0) e.currentTarget.style.background = 'rgba(255,255,255,0.06)' }} onMouseOut={(e) => { if (stats.pending_leads > 0) e.currentTarget.style.background = 'rgba(255,255,255,0.03)' }}>
                              <Brain size={20} color="#b19cd9" />
                              <div style={{ fontWeight: 600, color: '#fff' }}>Évaluer les "En Attente" avec l'IA</div>
                              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>Analyse les prospects en attente (processus asynchrone long).</div>
                            </button>
                            <button title={stats.pending_leads === 0 ? "Aucun prospect en attente d'évaluation" : "Valider manuellement"} onClick={() => executeManualQualify('pending_only')} disabled={!!actionLoading || stats.pending_leads === 0} style={{ background: 'rgba(0,229,200,0.05)', border: '1px solid rgba(0,229,200,0.2)', padding: 16, borderRadius: 12, textAlign: 'left', cursor: stats.pending_leads === 0 ? 'not-allowed' : 'pointer', display: 'flex', flexDirection: 'column', gap: 8, transition: 'all 0.2s', opacity: stats.pending_leads === 0 ? 0.5 : 1 }} onMouseOver={(e) => { if (stats.pending_leads > 0) e.currentTarget.style.background = 'rgba(0,229,200,0.1)' }} onMouseOut={(e) => { if (stats.pending_leads > 0) e.currentTarget.style.background = 'rgba(0,229,200,0.05)' }}>
                              <CheckSquare size={20} color="#00E5C8" />
                              <div style={{ fontWeight: 600, color: '#00E5C8' }}>Qualifier les "En Attente"</div>
                              <div style={{ fontSize: 12, color: 'var(--muted)' }}>Valide instantanément les prospects non évalués.</div>
                            </button>
                          </div>

                          <div style={{ marginTop: 12, display: 'flex', gap: 12 }}>
                            <button onClick={() => executeManualQualify('all')} disabled={!!actionLoading} style={{ flex: 1, background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', padding: '12px', borderRadius: 12, color: 'var(--text)', fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'background 0.2s' }} onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'} onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}>
                              <ListChecks size={16} color="var(--muted)" />
                              Forcer la qualification de TOUS (y compris écartés)
                            </button>
                            <button onClick={() => setStep('schedule')} disabled={!!actionLoading} style={{ flex: 1, background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', padding: '12px', borderRadius: 12, color: 'var(--text)', fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'background 0.2s' }} onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'} onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}>
                              Ignorer et passer à la planification
                              <SkipForward size={16} color="var(--muted)" />
                            </button>
                          </div>
                        </>
                      )}
                    </motion.div>
                  )}

                  {step === 'schedule' && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                      <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, color: '#00E5C8', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 20, height: 20, background: 'rgba(0,229,200,0.2)', borderRadius: '50%', color: '#00E5C8', fontSize: 10 }}>2</span>
                        Étape 2 : Planification
                      </div>
                      <div style={{ padding: 20, background: 'rgba(0,229,200,0.03)', border: '1px solid rgba(0,229,200,0.1)', borderRadius: 16, marginBottom: 24 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                          <CalendarClock size={24} color="var(--cyan)" />
                          <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--cyan)' }}>
                            {getReadableCron()}
                          </div>
                        </div>
                        <p style={{ margin: 0, color: 'var(--muted)', fontSize: 13, lineHeight: 1.5 }}>
                          L'intelligence artificielle va prendre le relais et exécuter votre campagne automatiquement selon la fréquence affichée ci-dessus. 
                          Vous gardez le contrôle total. mettez l'agent en pause à tout moment via le bouton "⏸ Stop".
                        </p>
                      </div>

                      <div style={{ display: 'flex', gap: 12 }}>
                        <button
                          onClick={() => setStep('qualify')}
                          disabled={isSubmitting}
                          style={{
                            background: 'transparent', color: 'var(--text)', padding: '16px', fontSize: 15, fontWeight: 600,
                            borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer',
                            transition: 'all 0.2s', flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8
                          }}
                          onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                          onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                        >
                          Retour
                        </button>
                        <button
                          onClick={() => { onClose(); onEditSchedule(); }}
                          disabled={isSubmitting}
                          style={{
                            background: 'transparent', color: 'var(--text)', padding: '16px', fontSize: 15, fontWeight: 600,
                            borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer',
                            transition: 'all 0.2s', flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8
                          }}
                          onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                          onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                        >
                          <Settings size={18} /> Modifier
                        </button>
                        <button
                          onClick={handleConfirm}
                          disabled={isSubmitting}
                          style={{
                            background: 'var(--cyan)', color: '#000', padding: '16px', fontSize: 15, fontWeight: 700,
                            flex: 2, borderRadius: 12, border: 'none',
                            cursor: isSubmitting ? 'not-allowed' : 'pointer',
                            boxShadow: isSubmitting ? 'none' : '0 0 20px rgba(0, 229, 200, 0.4)',
                            display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8,
                            opacity: isSubmitting ? 0.7 : 1, transition: 'all 0.2s'
                          }}
                          onMouseOver={(e) => { if (!isSubmitting) e.currentTarget.style.boxShadow = '0 0 30px rgba(0, 229, 200, 0.6)' }}
                          onMouseOut={(e) => { if (!isSubmitting) e.currentTarget.style.boxShadow = '0 0 20px rgba(0, 229, 200, 0.4)' }}
                        >
                          <CalendarClock size={20} fill="transparent" />
                          {isSubmitting ? 'Activation en cours...' : 'Activer la Planification'}
                        </button>
                      </div>
                    </motion.div>
                  )}
                </div>
              )}
            </>
          ) : null}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
