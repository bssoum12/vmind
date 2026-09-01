"use client";

import React, { createContext, useContext, useState, ReactNode } from 'react';

export type AppMode = 'ASSISTANT' | 'MANAGEMENT';

interface ModeContextType {
  mode: AppMode;
  setMode: (mode: AppMode) => void;
}

const ModeContext = createContext<ModeContextType | undefined>(undefined);

export const ModeProvider = ({ children }: { children: ReactNode }) => {
  const [mode, setModeState] = useState<AppMode>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('vmind_mode') || sessionStorage.getItem('vmind_mode');
      if (saved === 'MANAGEMENT' || saved === 'ASSISTANT') return saved as AppMode;
    }
    return 'ASSISTANT';
  });

  const setMode = (newMode: AppMode) => {
    setModeState(newMode);
    if (typeof window !== 'undefined') {
      localStorage.setItem('vmind_mode', newMode);
      sessionStorage.setItem('vmind_mode', newMode);
    }
  };

  return (
    <ModeContext.Provider value={{ mode, setMode }}>
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
