"use client";

import React, { createContext, useContext, useState, useCallback, useMemo, ReactNode } from 'react';

export type AppMode = 'ASSISTANT' | 'MANAGEMENT';

interface ModeContextType {
  mode: AppMode;
  setMode: (mode: AppMode) => void;
}

const ModeContext = createContext<ModeContextType | undefined>(undefined);

export const ModeProvider = ({ children }: { children: ReactNode }) => {
  const [mode, setModeState] = useState<AppMode>('ASSISTANT');

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('vmind_mode') || sessionStorage.getItem('vmind_mode');
      if (saved === 'MANAGEMENT' || saved === 'ASSISTANT') {
        setModeState(saved as AppMode);
      }
    }
  }, []);

  const setMode = useCallback((newMode: AppMode) => {
    setModeState(newMode);
    if (typeof window !== 'undefined') {
      localStorage.setItem('vmind_mode', newMode);
      sessionStorage.setItem('vmind_mode', newMode);
      window.dispatchEvent(new CustomEvent('vmind-mode-changed', { detail: newMode }));
    }
  }, []);

  const value = useMemo(() => ({ mode, setMode }), [mode, setMode]);

  return (
    <ModeContext.Provider value={value}>
      {children}
    </ModeContext.Provider>
  );
};

export const useMode = () => {
  const context = useContext(ModeContext);
  if (context === undefined) {
    throw new Error('useMode must be used within a ModeProvider');
  }
  return context;
};
