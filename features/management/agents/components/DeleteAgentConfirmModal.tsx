import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Trash2, AlertTriangle, X, Loader2 } from 'lucide-react';
import { LiveAgent } from '../AgentsView';

interface DeleteAgentConfirmModalProps {
  isOpen: boolean;
  agent: LiveAgent | null;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
  isDeleting?: boolean;
}

export function DeleteAgentConfirmModal({
  isOpen,
  agent,
  onClose,
  onConfirm,
  isDeleting = false,
}: DeleteAgentConfirmModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isDeleting) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isDeleting, onClose]);

  if (typeof window === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && agent && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(2, 6, 18, 0.78)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            zIndex: 999999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.5rem',
          }}
          onClick={() => {
            if (!isDeleting) onClose();
          }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 16 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: '480px',
              background: 'linear-gradient(160deg, rgba(14, 23, 42, 0.97) 0%, rgba(6, 14, 26, 0.99) 100%)',
              border: '1px solid rgba(255, 71, 87, 0.35)',
              boxShadow: '0 30px 70px rgba(0, 0, 0, 0.8), 0 0 35px rgba(255, 71, 87, 0.14)',
              borderRadius: '20px',
              padding: '1.75rem',
              position: 'relative',
              overflow: 'hidden',
              color: '#F0F4F8',
            }}
          >
            {/* Top decorative ambient glow */}
            <div
              style={{
                position: 'absolute',
                top: '-50px',
                left: '50%',
                transform: 'translateX(-50%)',
                width: '240px',
                height: '100px',
                background: 'radial-gradient(ellipse, rgba(255, 71, 87, 0.25) 0%, transparent 70%)',
                pointerEvents: 'none',
              }}
            />

            {/* Close button */}
            <button
              type="button"
              onClick={onClose}
              disabled={isDeleting}
              aria-label="Fermer"
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                width: '32px',
                height: '32px',
                borderRadius: '10px',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                background: 'rgba(255, 255, 255, 0.03)',
                color: '#94A3B8',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: isDeleting ? 'not-allowed' : 'pointer',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                if (!isDeleting) {
                  e.currentTarget.style.color = '#F0F4F8';
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = '#94A3B8';
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
              }}
            >
              <X size={16} />
            </button>

            {/* Header with Icon & Title */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '1.25rem' }}>
              <div
                style={{
                  width: '52px',
                  height: '52px',
                  borderRadius: '16px',
                  background: 'rgba(255, 71, 87, 0.12)',
                  border: '1px solid rgba(255, 71, 87, 0.35)',
                  boxShadow: '0 0 20px rgba(255, 71, 87, 0.22)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Trash2 size={24} color="#FF4757" />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: '#F0F4F8' }}>
                    Supprimer l&apos;Agent
                  </h3>
                  <span
                    style={{
                      fontSize: '0.65rem',
                      padding: '2px 8px',
                      borderRadius: '6px',
                      background: 'rgba(255, 71, 87, 0.15)',
                      color: '#FF4757',
                      border: '1px solid rgba(255, 71, 87, 0.3)',
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                    }}
                  >
                    Action irréversible
                  </span>
                </div>
                <div style={{ fontSize: '0.8rem', color: '#94A3B8', marginTop: '2px' }}>
                  Confirmation requise
                </div>
              </div>
            </div>

            {/* Content Message */}
            <div style={{ fontSize: '0.9rem', color: '#CBD5E1', lineHeight: '1.55', marginBottom: '1.25rem' }}>
              Êtes-vous sûr de vouloir supprimer définitivement l&apos;agent{' '}
              <span
                style={{
                  color: '#00E5C8',
                  fontWeight: 600,
                  background: 'rgba(0, 229, 200, 0.08)',
                  padding: '2px 6px',
                  borderRadius: '5px',
                  border: '1px solid rgba(0, 229, 200, 0.2)',
                  wordBreak: 'break-word',
                }}
              >
                &ldquo;{agent.agent_name}&rdquo;
              </span>{' '}
              ?
            </div>

            {/* Warning Callout Box */}
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '10px',
                padding: '12px 14px',
                borderRadius: '12px',
                background: 'rgba(255, 71, 87, 0.06)',
                border: '1px solid rgba(255, 71, 87, 0.18)',
                marginBottom: '1.5rem',
              }}
            >
              <AlertTriangle size={17} color="#FF4757" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div style={{ fontSize: '0.78rem', color: '#E2E8F0', lineHeight: '1.45' }}>
                Toutes les configurations associées, règles d&apos;automatisation et historiques d&apos;exécution seront immédiatement effacés.
              </div>
            </div>

            {/* Footer Buttons */}
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={onClose}
                disabled={isDeleting}
                style={{
                  padding: '0.65rem 1.15rem',
                  borderRadius: '11px',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  background: 'rgba(255, 255, 255, 0.05)',
                  color: '#F0F4F8',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: isDeleting ? 'not-allowed' : 'pointer',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  if (!isDeleting) {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.12)';
                }}
              >
                Annuler
              </button>

              <button
                type="button"
                onClick={onConfirm}
                disabled={isDeleting}
                style={{
                  padding: '0.65rem 1.25rem',
                  borderRadius: '11px',
                  border: '1px solid rgba(255, 71, 87, 0.5)',
                  background: 'linear-gradient(135deg, #FF4757 0%, #D63031 100%)',
                  color: '#FFFFFF',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: isDeleting ? 'not-allowed' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 16px rgba(255, 71, 87, 0.35)',
                  opacity: isDeleting ? 0.7 : 1,
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  if (!isDeleting) {
                    e.currentTarget.style.boxShadow = '0 6px 22px rgba(255, 71, 87, 0.55)';
                    e.currentTarget.style.transform = 'translateY(-1px)';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = '0 4px 16px rgba(255, 71, 87, 0.35)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                {isDeleting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Suppression...</span>
                  </>
                ) : (
                  <>
                    <Trash2 size={15} />
                    <span>Supprimer définitivement</span>
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
