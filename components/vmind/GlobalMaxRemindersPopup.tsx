'use client';

import React, { useEffect, useState } from 'react';
import { resetReminders } from '@/shared/api/n8n-api';

export const GlobalMaxRemindersPopup: React.FC = () => {
  const [invoices, setInvoices] = useState<string[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);

  useEffect(() => {
    const handleAlert = (event: Event) => {
      const customEvent = event as CustomEvent;
      const reachedInvoices = customEvent.detail || [];
      
      if (reachedInvoices.length > 0) {
        setInvoices(reachedInvoices);
        setIsOpen(true);
        setResetSuccess(false); // Reset success state for new alerts
      }
    };

    window.addEventListener('vmind-max-reminders', handleAlert);
    return () => window.removeEventListener('vmind-max-reminders', handleAlert);
  }, []);

  const handleReset = async () => {
    if (invoices.length === 0) return;
    setIsResetting(true);
    try {
      await resetReminders(invoices);
      setResetSuccess(true);
      
      // Auto-close after success
      setTimeout(() => {
        setIsOpen(false);
      }, 3000);
    } catch (err: any) {
      alert(`Erreur lors de la réinitialisation: ${err.message}`);
    } finally {
      setIsResetting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 anim">
      <div className="bg-[#0f172a] border border-orange-500/30 rounded-2xl p-6 max-w-md w-full shadow-2xl relative overflow-hidden flex flex-col gap-4">
        {/* Decorative background glow */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-orange-600 to-orange-400"></div>
        <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>

        <div className="flex justify-between items-start">
          <div className="font-bold text-orange-400 flex items-center gap-3 text-lg">
            <span className="text-2xl animate-pulse">⚠️</span> 
            Limite de Relances Atteinte ({invoices.length})
          </div>
          <button 
            onClick={() => setIsOpen(false)}
            className="text-gray-500 hover:text-white transition-colors p-1"
            title="Fermer"
          >
            ✕
          </button>
        </div>

        <div className="text-sm text-gray-300 leading-relaxed">
          Les factures suivantes ont atteint le nombre maximum de relances autorisées et ont été ignorées par le système IA.
        </div>

        <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-2 bg-black/20 rounded-lg border border-white/5">
          {invoices.map((ref, idx) => (
            <span key={idx} className="px-2.5 py-1 bg-orange-500/20 text-orange-300 rounded text-xs font-mono border border-orange-500/20">
              {ref}
            </span>
          ))}
        </div>
        
        <div className="mt-2 flex justify-end gap-3">
          <button
            onClick={() => setIsOpen(false)}
            className="px-4 py-2 text-xs font-medium text-gray-400 hover:text-white transition-colors"
          >
            Ignorer
          </button>
          
          <button
            onClick={handleReset}
            disabled={isResetting || resetSuccess}
            className={`px-5 py-2 text-xs font-bold rounded-lg flex items-center gap-2 transition-all duration-300 shadow-lg ${
              resetSuccess 
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-emerald-500/10'
                : 'bg-orange-500/20 text-orange-400 border border-orange-500/40 hover:bg-orange-500/30 hover:scale-105 shadow-orange-500/10'
            } disabled:opacity-50 disabled:hover:scale-100`}
          >
            {resetSuccess ? (
              <><span>✅</span> Réinitialisé</>
            ) : isResetting ? (
              <><span>⏳</span> En cours...</>
            ) : (
              <><span>🔄</span> Relancer la machine (Reset)</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
