'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CalendarClock, Settings, ShieldCheck, Mail, Users } from 'lucide-react';
import { LiveAgent } from '../AgentsView';
import { VMindGuide } from '@/shared/management/components/VMindGuide';
import { parseHourString } from '@/shared/utils/timezone';

interface SupervisorScheduleModalProps {
  agent: LiveAgent;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
  onEditSchedule?: () => void;
  onToast: (msg: string, type?: 'ok' | 'err') => void;
}

export function SupervisorScheduleModal({
  agent,
  onClose,
  onConfirm,
  onEditSchedule,
  onToast
}: SupervisorScheduleModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const supervisedIds = (agent as any)?.supervised_agent_ids || (agent as any)?.config?.supervised_agent_ids || [];
  const supervisedCount = Array.isArray(supervisedIds) ? supervisedIds.length : 0;
  const emailRecap = (agent as any)?.email_recap || (agent as any)?.config?.email_recap || '';

  const getReadableCron = () => {
    if (!agent.trigger_rules || agent.trigger_rules.length === 0) {
      return 'Chaque jour à 08:00';
    }
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
      const hour = parseHourString(r.triggerAtHour);
      return step <= 1 ? `Chaque jour à ${hour}h${minPad}` : `Tous les ${step} jours à ${hour}h${minPad}`;
    }
    if (interval === 'Weeks') {
      const days = (r.triggerOnWeekdays || ['Monday']).join(', ');
      const hour = parseHourString(r.triggerAtHour);
      return `Hebdo (${days}) à ${hour}h${minPad}`;
    }
    if (interval === 'Months') {
      const dom = r.triggerAtDayOfMonth || 1;
      const hour = parseHourString(r.triggerAtHour);
      return `Mensuel (le ${dom}) à ${hour}h${minPad}`;
    }
    if (interval === 'Seconds') {
      return `Toutes les ${r.secondsBetween || 30} secondes`;
    }
    return interval;
  };

  const handleConfirm = async () => {
    setIsSubmitting(true);
    try {
      await onConfirm();
    } catch (e: any) {
      if (onToast) onToast(e.message || "Erreur d'activation", 'err');
    } finally {
      setIsSubmitting(false);
      onClose();
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(8px)',
          zIndex: 99999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <VMindGuide
          isOpen={true}
          mood="convinced"
          title="Mode Autopilote"
          message="Activation de la Planification. En activant l'autopilot, vous confiez à l'IA la supervision continue de votre flotte commerciale. Le superviseur se réveillera automatiquement aux horaires prévus pour auditer l'alignement des agents et vous transmettre son bilan par email."
        />

        <motion.div
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, y: 20 }}
          style={{
            background: 'rgba(15, 20, 25, 0.85)',
            width: 650,
            borderRadius: 24,
            padding: 32,
            boxShadow: '0 30px 60px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.1)',
            border: '1px solid rgba(255,255,255,0.05)',
            position: 'relative',
            zIndex: 100000,
            overflow: 'hidden'
          }}
        >
          {/* Cyan Glow Accent */}
          <div
            style={{
              position: 'absolute',
              top: -100,
              left: '50%',
              transform: 'translateX(-50%)',
              width: 300,
              height: 150,
              background: 'var(--cyan)',
              filter: 'blur(100px)',
              opacity: 0.15,
              borderRadius: '50%'
            }}
          />

          {/* Header */}
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
              disabled={isSubmitting}
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: 'none',
                color: 'var(--text)',
                width: 32,
                height: 32,
                borderRadius: '50%',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s'
              }}
              onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
              onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
            >
              ✕
            </button>
          </div>

          {/* Quick Metrics Capsule */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
            <div style={{
              padding: '16px',
              background: 'rgba(255,255,255,0.02)',
              borderRadius: 16,
              textAlign: 'center',
              border: '1px solid rgba(255,255,255,0.05)'
            }}>
              <Users size={18} color="var(--muted)" style={{ marginBottom: 8 }} />
              <div style={{ fontWeight: 700, fontSize: 26, color: 'var(--text)' }}>{supervisedCount}</div>
              <div style={{ color: 'var(--muted)', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 4 }}>
                Agents Supervisés
              </div>
            </div>

            <div style={{
              padding: '16px',
              background: 'rgba(0, 229, 200, 0.05)',
              borderRadius: 16,
              textAlign: 'center',
              border: '1px solid rgba(0, 229, 200, 0.2)'
            }}>
              <Mail size={18} color="#00E5C8" style={{ marginBottom: 8 }} />
              <div style={{
                fontWeight: 700,
                fontSize: 14,
                color: '#00E5C8',
                textOverflow: 'ellipsis',
                overflow: 'hidden',
                whiteSpace: 'nowrap',
                padding: '0 8px',
                lineHeight: '26px'
              }}>
                {emailRecap || 'Email connecté'}
              </div>
              <div style={{ color: '#00E5C8', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 4 }}>
                Destinataire du Rapport
              </div>
            </div>
          </div>

          {/* Schedule Card (Exact ProspectAgentScheduleModal layout) */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, color: '#00E5C8', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 20, height: 20, background: 'rgba(0,229,200,0.2)', borderRadius: '50%', color: '#00E5C8', fontSize: 10 }}>⚡</span>
              Planification & Notifications
            </div>

            <div style={{ padding: 20, background: 'rgba(0,229,200,0.03)', border: '1px solid rgba(0,229,200,0.1)', borderRadius: 16, marginBottom: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <CalendarClock size={24} color="var(--cyan)" />
                <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--cyan)' }}>
                  {getReadableCron()}
                </div>
              </div>
              <p style={{ margin: 0, color: 'var(--muted)', fontSize: 13, lineHeight: 1.5 }}>
                L&apos;intelligence artificielle va prendre le relais et auditer votre flotte commerciale automatiquement selon la fréquence affichée ci-dessus.
                Un rapport consolidé de conformité globale et de recommandations vous sera envoyé à chaque exécution.
                Vous gardez le contrôle total : mettez l&apos;agent en pause à tout moment via le bouton &laquo;&nbsp;⏸ Stop&nbsp;&raquo;.
              </p>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: 12 }}>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  if (onEditSchedule) onEditSchedule();
                }}
                disabled={isSubmitting}
                style={{
                  background: 'transparent',
                  color: 'var(--text)',
                  padding: '16px',
                  fontSize: 15,
                  fontWeight: 600,
                  borderRadius: 12,
                  border: '1px solid rgba(255,255,255,0.1)',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  flex: 1,
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: 8
                }}
                onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
                onMouseOut={(e) => { e.currentTarget.style.background = 'transparent'; }}
              >
                <Settings size={18} /> Modifier
              </button>

              <button
                type="button"
                onClick={handleConfirm}
                disabled={isSubmitting}
                style={{
                  background: 'var(--cyan)',
                  color: '#000',
                  padding: '16px',
                  fontSize: 15,
                  fontWeight: 700,
                  flex: 2,
                  borderRadius: 12,
                  border: 'none',
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  boxShadow: isSubmitting ? 'none' : '0 0 20px rgba(0, 229, 200, 0.4)',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: 8,
                  opacity: isSubmitting ? 0.7 : 1,
                  transition: 'all 0.2s'
                }}
                onMouseOver={(e) => { if (!isSubmitting) e.currentTarget.style.boxShadow = '0 0 30px rgba(0, 229, 200, 0.6)'; }}
                onMouseOut={(e) => { if (!isSubmitting) e.currentTarget.style.boxShadow = '0 0 20px rgba(0, 229, 200, 0.4)'; }}
              >
                <CalendarClock size={20} fill="transparent" />
                {isSubmitting ? 'Activation en cours...' : 'Activer la Planification'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
