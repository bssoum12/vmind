'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
  InstalledSkillItem,
  fetchInstalledSkills,
  toggleSkill,
} from '../api/skills-api';
import { useConnections } from './ConnectionsContext';
import { useToast } from './ToastContext';

interface SkillsContextType {
  installedSkills: InstalledSkillItem[];
  activeSkills: InstalledSkillItem[];
  loading: boolean;
  refreshSkills: () => Promise<void>;
  handleToggleSkillForMe: (slug: string, enabled: boolean) => Promise<void>;
}

const SkillsContext = createContext<SkillsContextType | undefined>(undefined);

export function SkillsProvider({ children }: { children: React.ReactNode }) {
  const { activeConnection } = useConnections();
  const { showToast } = useToast();
  const [installedSkills, setInstalledSkills] = useState<InstalledSkillItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const refreshSkills = useCallback(async () => {
    try {
      if (typeof window !== 'undefined' && (window.location.pathname === '/login' || window.location.pathname.startsWith('/login') || window.location.pathname.startsWith('/reset-password'))) { setLoading(false); return; }
      setLoading(true);
      const { skills } = await fetchInstalledSkills(activeConnection?.id ?? null);
      setInstalledSkills(skills);
    } catch {
      // Fail silently on unauthenticated initial load
      setInstalledSkills([]);
    } finally {
      setLoading(false);
    }
  }, [activeConnection?.id]);

  useEffect(() => {
    refreshSkills();

    const handleSessionUpdated = () => {
      refreshSkills();
    };

    window.addEventListener('mcp-session-updated', handleSessionUpdated);
    return () => window.removeEventListener('mcp-session-updated', handleSessionUpdated);
  }, [refreshSkills]);

  const handleToggleSkillForMe = async (slug: string, enabled: boolean) => {
    try {
      await toggleSkill(slug, { enabled, for: 'me' });
      await refreshSkills();
      showToast(
        enabled ? `Skill /${slug} activé.` : `Skill /${slug} désactivé.`,
        'info'
      );
    } catch (err: any) {
      showToast(err.message || 'Impossible de modifier ce skill.', 'error');
    }
  };

  const activeSkills = installedSkills.filter((s) => s.enabled);

  return (
    <SkillsContext.Provider
      value={{
        installedSkills,
        activeSkills,
        loading,
        refreshSkills,
        handleToggleSkillForMe,
      }}
    >
      {children}
    </SkillsContext.Provider>
  );
}

export function useSkills() {
  const ctx = useContext(SkillsContext);
  if (!ctx) {
    throw new Error('useSkills doit être utilisé au sein d\'un SkillsProvider');
  }
  return ctx;
}
