'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';

export type ToastType = 'success' | 'error' | 'info' | 'warning' | 'ok' | 'err';

export interface ToastItem {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  duration?: number;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType, duration?: number) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const showToast = useCallback((message: string, type: ToastType = 'info', duration = 4000) => {
    if (!message) return;

    // Normalize type strings ('ok' -> 'success', 'err' -> 'error')
    const normalizedType: 'success' | 'error' | 'info' | 'warning' =
      type === 'ok' ? 'success' : type === 'err' ? 'error' : type;

    const id = Date.now().toString() + Math.random().toString(36).substring(2, 6);
    const newToast: ToastItem = { id, message, type: normalizedType, duration };

    setToasts((prev) => [...prev.slice(-4), newToast]); // Keep max 5 active toasts

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration);
  }, []);

  // Intercept window.alert globally to replace browser popups with VMIND toasts
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const originalAlert = window.alert;
      window.alert = (msg?: any) => {
        if (msg) {
          const str = typeof msg === 'object' ? JSON.stringify(msg) : String(msg);
          const isError = str.toLowerCase().includes('erreur') || str.toLowerCase().includes('error') || str.toLowerCase().includes('fail');
          showToast(str, isError ? 'error' : 'info', 5000);
        }
      };
      return () => {
        window.alert = originalAlert;
      };
    }
  }, [showToast]);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const getStyleProps = (type: ToastItem['type']) => {
    switch (type) {
      case 'success':
        return {
          bg: 'linear-gradient(135deg, rgba(0, 229, 200, 0.08) 0%, rgba(6, 17, 31, 0.95) 100%)',
          border: '1px solid rgba(0, 229, 200, 0.35)',
          borderLeft: '5px solid #00E5C8',
          accent: '#00E5C8',
          iconBg: 'rgba(0, 229, 200, 0.15)',
          icon: '✅',
          boxShadow: '0 16px 40px rgba(0, 0, 0, 0.8), 0 0 25px rgba(0, 229, 200, 0.15)'
        };
      case 'error':
        return {
          bg: 'linear-gradient(135deg, rgba(255, 71, 87, 0.08) 0%, rgba(6, 17, 31, 0.85) 100%)',
          border: '1px solid rgba(255, 71, 87, 0.35)',
          borderLeft: '5px solid #FF4757',
          accent: '#FF4757',
          iconBg: 'rgba(255, 71, 87, 0.15)',
          icon: '❌',
          boxShadow: '0 16px 40px rgba(0, 0, 0, 0.8), 0 0 25px rgba(255, 71, 87, 0.15)'
        };
      case 'warning':
        return {
          bg: 'linear-gradient(135deg, rgba(255, 184, 0, 0.08) 0%, rgba(6, 17, 31, 0.95) 100%)',
          border: '1px solid rgba(255, 184, 0, 0.35)',
          borderLeft: '5px solid #FFB800',
          accent: '#FFB800',
          iconBg: 'rgba(255, 184, 0, 0.15)',
          icon: '⚠️',
          boxShadow: '0 16px 40px rgba(0, 0, 0, 0.8), 0 0 25px rgba(255, 184, 0, 0.15)'
        };
      default:
        return {
          bg: 'linear-gradient(135deg, rgba(0, 229, 200, 0.08) 0%, rgba(6, 17, 31, 0.95) 100%)',
          border: '1px solid rgba(0, 229, 200, 0.35)',
          borderLeft: '5px solid #00E5C8',
          accent: '#00E5C8',
          iconBg: 'rgba(0, 229, 200, 0.15)',
          icon: 'ℹ️',
          boxShadow: '0 16px 40px rgba(0, 0, 0, 0.8), 0 0 25px rgba(0, 229, 200, 0.12)'
        };
    }
  };

  const toastContainer = mounted && typeof document !== 'undefined' ? createPortal(
    <div
      style={{
        position: 'fixed',
        top: '24px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 999999, // Highest possible z-index to stay above popups and modals
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '10px',
        pointerEvents: 'none',
        maxWidth: '90vw',
        width: '580px'
      }}
    >
      <AnimatePresence>
        {toasts.map((toast) => {
          const style = getStyleProps(toast.type);
          return (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -15, scale: 0.95 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              style={{
                pointerEvents: 'auto',
                width: '100%',
                background: style.bg,
                border: style.border,
                borderLeft: style.borderLeft,
                boxShadow: style.boxShadow,
                borderRadius: '10px',
                padding: '12px 18px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '14px',
                fontSize: '0.92rem',
                fontWeight: 600,
                lineHeight: 1.5,
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    background: style.iconBg,
                    border: `1px solid ${style.accent}40`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1rem',
                    flexShrink: 0
                  }}
                >
                  {style.icon}
                </div>
                <span style={{ color: '#F0F4F8', wordBreak: 'break-word', fontWeight: 600 }}>{toast.message}</span>
              </div>
              <button
                onClick={() => removeToast(toast.id)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  fontSize: '1.1rem',
                  cursor: 'pointer',
                  padding: '4px 8px',
                  borderRadius: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'color 0.2s ease'
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = '#ffffff')}
                onMouseLeave={(e) => (e.currentTarget.style.color = '#94a3b8')}
                title="Fermer"
              >
                ✕
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>,
    document.body
  ) : null;

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {toastContainer}
    </ToastContext.Provider>
  );
};

export const useToast = (): ToastContextType => {
  const context = useContext(ToastContext);
  if (!context) {
    // Return a safe fallback if used outside Provider
    return {
      showToast: (msg, type = 'info') => {
        console.log(`[TOAST FALLBACK (${type})]: ${msg}`);
      }
    };
  }
  return context;
};
