import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CalendarClock, Settings } from 'lucide-react';
import { LiveAgent } from '../AgentsView';
import { VMindGuide } from '@/shared/management/components/VMindGuide';

interface ProspectAgentScheduleModalProps {
  agent: LiveAgent;
  onClose: () => void;
  onConfirm: () => void;
  onEditSchedule: () => void;
}

export function ProspectAgentScheduleModal({ agent, onClose, onConfirm, onEditSchedule }: ProspectAgentScheduleModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    if (interval === 'Minutes') return `Toutes les ${r.minutesBetween || '?'} min`;
    if (interval === 'Hours') return `Toutes les ${r.hoursBetween || '?'} h`;
    if (interval === 'Days') return `Chaque ${r.daysBetween > 1 ? r.daysBetween + ' jours' : 'jour'} à ${r.triggerAtHour || '08'}h`;
    if (interval === 'Weeks') return `Hebdo (${(r.triggerOnWeekdays || []).join(', ')}) à ${r.triggerAtHour || '08'}h`;
    if (interval === 'Months') return `Mensuel le ${r.triggerAtDayOfMonth || 1} à ${r.triggerAtHour || '08'}h`;
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
          mood="focused"
          title="Mode Autopilote"
          message="En activant la planification, vous confiez à l'IA la tâche d'analyser vos prospects et d'envoyer les emails en toute autonomie. L'agent se réveillera automatiquement aux horaires prévus pour exécuter sa mission sans aucune intervention de votre part."
        />

        <motion.div
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, y: 20 }}
          style={{
            background: 'rgba(15, 20, 25, 0.8)', width: 600, borderRadius: 24,
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

          <div style={{ padding: 20, background: 'rgba(0,229,200,0.03)', border: '1px solid rgba(0,229,200,0.1)', borderRadius: 16, marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <CalendarClock size={24} color="var(--cyan)" />
              <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--cyan)' }}>
                {getReadableCron()}
              </div>
            </div>
            <p style={{ margin: 0, color: 'var(--muted)', fontSize: 13, lineHeight: 1.5 }}>
              L'intelligence artificielle va prendre le relais et exécuter votre campagne automatiquement selon la fréquence affichée ci-dessus. 
              Vous gardez le contrôle total. 
               mettez l'agent en pause à tout moment via le bouton "⏸ Stop".
            </p>
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
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
      </motion.div>
    </AnimatePresence>
  );
}
