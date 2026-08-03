import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Check, Search, Target, Database, Info } from 'lucide-react';
import { LiveAgent } from '../AgentsView';
import { OnboardingChat } from '../../wizard/components/OnboardingChat';
import { VMindGuide } from '@/shared/management/components/VMindGuide';
import { triggerSourcingRun } from '@/shared/api/n8n-api';

interface SourcingAgentExecutionModalProps {
  agent: LiveAgent;
  onClose: () => void;
  onToast: (msg: string, type?: 'ok' | 'err') => void;
}

export function SourcingAgentExecutionModal({ agent, onClose, onToast }: SourcingAgentExecutionModalProps) {
  const [step, setStep] = useState<'chat' | 'config'>('chat');
  const [sourcingSummary, setSourcingSummary] = useState('');
  
  // Sourcing Execution Parameters
  const [allowExistingCompanies, setAllowExistingCompanies] = useState(false);
  const [leadsToFind, setLeadsToFind] = useState<number>(50);
  const [leadsPerCompany, setLeadsPerCompany] = useState<number>(2);
  const [isExecuting, setIsExecuting] = useState(false);

  const handleChatConfirm = (summary: string) => {
    setSourcingSummary(summary);
    setStep('config');
  };

  const handleExecute = async () => {
    // Validate inputs
    if (leadsToFind <= 0 || leadsToFind > 100) {
      onToast("Le nombre de leads doit être entre 1 et 100", "err");
      return;
    }
    if (leadsPerCompany < 1 || leadsPerCompany > 10) {
      onToast("Le nombre de leads par entreprise doit être entre 1 et 10", "err");
      return;
    }

    setIsExecuting(true);
    
    try {
      const publicId = agent.uuid || agent.agent_id?.toString() || agent.session_id;
      await triggerSourcingRun(publicId, {
        sourcingSummary,
        totalLeads: leadsToFind,
        leadsPerCompany,
        ignoreDuplicates: allowExistingCompanies
      });
      onToast(`La campagne de Sourcing a été lancée pour "${agent.agent_name}" !`, "ok");
      onClose();
    } catch (err: any) {
      onToast(err.message || "Erreur lors du lancement de la campagne", "err");
    } finally {
      setIsExecuting(false);
    }
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
          mood={step === 'chat' ? 'focused' : 'convinced'}
          title="Guide de Sourcing"
          message={
            step === 'chat' 
              ? "Étape 1 : Définition de la Cible. Discutez avec moi pour définir le profil exact de votre candidat idéal et les industries ciblées. Je me chargerai ensuite de trouver les meilleurs profils correspondants."
              : "Étape 2 : Configuration. Vérifiez le résumé de notre échange et ajustez les paramètres avant que je ne lance la recherche de leads."
          }
        />

        <motion.div
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, y: 20 }}
          style={{
            background: 'rgba(15, 20, 25, 0.8)', width: 850, borderRadius: 24,
            padding: 32, boxShadow: '0 30px 60px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.1)',
            border: '1px solid rgba(255,255,255,0.05)',
            position: 'relative', zIndex: 100000, overflow: 'hidden',
            maxHeight: '90vh', display: 'flex', flexDirection: 'column'
          }}
        >
          {/* Subtle background glow */}
          <div style={{ position: 'absolute', top: -100, left: '50%', transform: 'translateX(-50%)', width: 300, height: 150, background: 'var(--cyan)', filter: 'blur(100px)', opacity: 0.15, borderRadius: '50%' }} />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
            <div>
              <h3 style={{ marginTop: 0, marginBottom: 8, fontSize: 24, fontWeight: 700, color: 'var(--text)' }}>
                Exécution & Recherche de Profils
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

          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 24, paddingRight: 4 }}>
            
            {step === 'chat' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 20, height: 20, background: 'rgba(255,255,255,0.1)', borderRadius: '50%', color: '#fff', fontSize: 10 }}>1</span>
                    Étape 1 : Ciblage & Stratégie
                  </div>
                  {/* TODO: TO BE REMOVED LATER - Temporary skip button for testing */}
                  <button
                    onClick={() => handleChatConfirm("COMPANY_TARGET: Companies in Europe in the Tech Industry\nLEAD_TARGET: Chief Technology Officers in executive department with a executive seniority & he is a decision_maker")}
                    style={{ background: 'rgba(255, 71, 87, 0.1)', border: '1px solid rgba(255, 71, 87, 0.3)', color: '#FF4757', padding: '4px 12px', borderRadius: 6, fontSize: 11, cursor: 'pointer', fontWeight: 600 }}
                  >
                    Skip (Test Only)
                  </button>
                </div>

                <div style={{ height: '480px', flex: 1 }}>
                  <OnboardingChat 
                    initialMission="" 
                    onConfirm={handleChatConfirm} 
                    apiEndpoint="/api/sourcing-agent/execution-chat" 
                  />
                </div>
              </motion.div>
            )}

            {step === 'config' && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, color: '#00E5C8', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 20, height: 20, background: 'rgba(0,229,200,0.2)', borderRadius: '50%', color: '#00E5C8', fontSize: 10 }}>2</span>
                  Étape 2 : Paramétrage & Lancement
                </div>

                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 24, flexWrap: 'wrap' }}>
                  
                  {/* Left Column: Summary */}
                  <div style={{ flex: 1, minWidth: 300 }}>
                    <div style={{ padding: '16px 20px', background: 'rgba(0, 229, 200, 0.05)', border: '1px solid rgba(0, 229, 200, 0.2)', borderRadius: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                        <Target size={18} color="#00E5C8" />
                        <span style={{ fontSize: 14, fontWeight: 600, color: '#00E5C8' }}>Ciblage Défini</span>
                      </div>
                      <div style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                        {sourcingSummary}
                      </div>
                      <button 
                        onClick={() => setStep('chat')} 
                        style={{ background: 'none', border: 'none', color: 'var(--muted)', fontSize: 12, textDecoration: 'underline', marginTop: 16, cursor: 'pointer', padding: 0 }}
                      >
                        Modifier le ciblage
                      </button>
                    </div>
                  </div>

                  {/* Right Column: Parameters */}
                  <div style={{ flex: 1, minWidth: 300, display: 'flex', flexDirection: 'column', gap: 16 }}>
                    
                    <div style={{ display: 'flex', gap: 12 }}>
                      <div style={{ flex: 1, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', padding: 16, borderRadius: 12 }}>
                        <label style={{ display: 'block', fontSize: 11, color: 'var(--muted)', marginBottom: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                          Total Leads
                        </label>
                        <input 
                          type="number" 
                          min={1} max={100} 
                          value={leadsToFind}
                          onChange={(e) => setLeadsToFind(Number(e.target.value))}
                          style={{ width: '100%', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', padding: '10px 14px', borderRadius: 8, color: '#fff', outline: 'none', fontSize: 14 }}
                        />
                        <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 6 }}>Max 100 leads par exécution</div>
                      </div>

                      <div style={{ flex: 1, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', padding: 16, borderRadius: 12 }}>
                        <label style={{ display: 'block', fontSize: 11, color: 'var(--muted)', marginBottom: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                          Leads / Entreprise
                        </label>
                        <input 
                          type="number" 
                          min={1} max={10} 
                          value={leadsPerCompany}
                          onChange={(e) => setLeadsPerCompany(Number(e.target.value))}
                          style={{ width: '100%', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', padding: '10px 14px', borderRadius: 8, color: '#fff', outline: 'none', fontSize: 14 }}
                        />
                        <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 6 }}>Max 10 leads/entreprise</div>
                      </div>
                    </div>

                    <label style={{ display: 'flex', alignItems: 'flex-start', gap: 12, cursor: 'pointer', background: 'rgba(255,255,255,0.02)', padding: 16, borderRadius: 12, border: '1px solid rgba(255,255,255,0.05)', transition: 'background 0.2s' }} onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'} onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}>
                      <div style={{ paddingTop: 2 }}>
                        <input 
                          type="checkbox" 
                          checked={allowExistingCompanies}
                          onChange={(e) => setAllowExistingCompanies(e.target.checked)}
                          style={{ width: 16, height: 16, accentColor: 'var(--cyan)', cursor: 'pointer' }}
                        />
                      </div>
                      <div>
                        <div style={{ fontSize: 13, color: '#fff', fontWeight: 500 }}>Ignorer les doublons d'entreprises</div>
                        <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4, lineHeight: 1.4 }}>
                          Autorise l'IA à rechercher de nouveaux leads dans des entreprises déjà prospectées.
                        </div>
                      </div>
                    </label>

                  </div>
                </div>

                <div style={{ marginTop: 24 }}>
                  <button
                    onClick={handleExecute}
                    disabled={isExecuting}
                    className="btn"
                    style={{
                      width: '100%',
                      background: 'var(--cyan)',
                      color: '#000',
                      border: 'none',
                      padding: '16px',
                      borderRadius: 12,
                      fontSize: 15,
                      fontWeight: 600,
                      cursor: isExecuting ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 12,
                      transition: 'all 0.2s',
                      opacity: isExecuting ? 0.7 : 1,
                      boxShadow: '0 4px 12px rgba(0, 229, 200, 0.2)'
                    }}
                  >
                    {isExecuting ? (
                      <>
                        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}>
                          <Database size={20} />
                        </motion.div>
                        Lancement de la recherche...
                      </>
                    ) : (
                      <>
                        <Play size={18} fill="#000" />
                        Lancer l'extraction de Leads
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
