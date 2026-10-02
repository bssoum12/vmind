'use client';

import React, { useEffect, useState } from 'react';
import { AGENT_TEMPLATES } from '@/shared/management/constants/data';
import { getAgents, getMarketplaceStats } from '@/shared/api/n8n-api';

interface SidebarProps {
  currentView: string;
  onNavigate: (view: string) => void;
  activeCategory: string;
  onSelectCategory: (category: string) => void;
  isAdmin?: boolean;
}

export const ManagementSidebar: React.FC<SidebarProps> = ({ currentView, onNavigate, activeCategory, onSelectCategory, isAdmin: isAdminProp }) => {
  const [agentCount, setAgentCount] = useState<number | null>(null);
  const [executionsToday, setExecutionsToday] = useState<number | null>(null);
  const [activeAgentsCount, setActiveAgentsCount] = useState<number | null>(null);
  const [successRate, setSuccessRate] = useState<number | null>(null);
  const [isAdmin, setIsAdmin] = useState(Boolean(isAdminProp));

  useEffect(() => {
    if (isAdminProp !== undefined) {
      setIsAdmin(isAdminProp);
    }
  }, [isAdminProp]);

  useEffect(() => {
    const checkAdmin = (e?: any) => {
      const user = e?.detail?.user || e?.detail;
      if (user) {
        const roles = Array.isArray(user.roles) ? user.roles : [user.roles || ''];
        setIsAdmin(roles.some((r: string) => ['Administrator', 'Administrators', 'Admin', 'Superusers', 'SuperAdmin'].includes(r)));
      }
    };
    window.addEventListener('mcp-session-updated', checkAdmin);

    // Initialisation proactive du rôle admin depuis le backend si le prop n'est pas fourni
    if (isAdminProp === undefined) {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL;
      fetch(`${baseUrl}/api/auth/vmind/me`, { credentials: 'include' })
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          if (data?.ok && data.user) {
            const roles = Array.isArray(data.user.roles) ? data.user.roles : [data.user.roles || ''];
            setIsAdmin(roles.some((r: string) => ['Administrator', 'Administrators', 'Admin', 'Superusers', 'SuperAdmin'].includes(r)));
          }
        })
        .catch(() => {});
    }

    const refreshData = () => {
      getAgents()
        .then(agents => setAgentCount(agents.length))
        .catch(() => setAgentCount(0));

      getMarketplaceStats()
        .then(res => {
          if (res.ok && res.sidebarStats) {
            setExecutionsToday(res.sidebarStats.executionsToday);
            setActiveAgentsCount(res.sidebarStats.activeAgentsCount);
            setSuccessRate(res.sidebarStats.successRate);
          }
        })
        .catch(() => { });
    };

    refreshData();

    const handleAgentUpdate = () => refreshData();
    if (typeof window !== 'undefined') {
      window.addEventListener('vmind_agent_updated', handleAgentUpdate);
    }

    const interval = setInterval(refreshData, 4000);

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('vmind_agent_updated', handleAgentUpdate);
        window.removeEventListener('mcp-session-updated', checkAdmin);
      }
      clearInterval(interval);
    };
  }, [currentView]); // re-fetch when navigating back to agents view

  const handleCategoryClick = (cat: string) => {
    onSelectCategory(cat);
    onNavigate('market');
  };

  // Build hierarchical category map: { "Commercial": ["Ventes", "Sourcing", "CRM"], ... }
  const categoryMap: Record<string, string[]> = {};
  AGENT_TEMPLATES.forEach(a => {
    const parts = a.category.split(' · ');
    const parent = parts[0];
    const sub = parts[1] || null;
    if (!categoryMap[parent]) categoryMap[parent] = [];
    if (sub && !categoryMap[parent].includes(sub)) {
      categoryMap[parent].push(sub);
    }
  });

  const parentIcons: Record<string, string> = {
    Finance: '💰',
    Operations: '🚚',
    Commercial: '📞',
    Reporting: '📊',
    RH: '👥',
    Achats: '🛒',
  };

  // Track which parent groups are expanded
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    Object.keys(categoryMap).forEach(parent => { initial[parent] = false; });
    return initial;
  });

  const toggleGroup = (parent: string) => {
    setExpandedGroups(prev => ({ ...prev, [parent]: !prev[parent] }));
  };

  return (
    <div className="sidebar">
      <div className="nav-section">Navigation</div>
      <div
        className={`nav-item ${currentView === 'market' && activeCategory === 'all' ? 'active' : ''}`}
        onClick={() => { onSelectCategory('all'); onNavigate('market'); }}
      >
        <div className="nav-icon">🏪</div>
        <span>Marketplace</span>
      </div>
      <div
        className={`nav-item ${currentView === 'agents' ? 'active' : ''}`}
        onClick={() => onNavigate('agents')}
      >
        <div className="nav-icon">🤖</div>
        <span>Mes Agents</span>
        {agentCount !== null && agentCount > 0 && (
          <span className="nav-badge">{agentCount}</span>
        )}
        {agentCount === 0 && (
          <span className="nav-badge" style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--muted)' }}>0</span>
        )}
      </div>

      {isAdmin && (
        <div
          className={`nav-item ${currentView === 'journal' ? 'active' : ''}`}
          onClick={() => onNavigate('journal')}
        >
          <div className="nav-icon">📋</div>
          <span>Journal</span>
        </div>
      )}

      <div className="nav-section">Catégories</div>

      {Object.entries(categoryMap).map(([parent, subs]) => {
        const isExpanded = expandedGroups[parent];
        const parentCount = AGENT_TEMPLATES.filter(a => a.category.startsWith(parent)).length;
        const isParentActive = activeCategory === parent;

        return (
          <div key={parent}>
            {/* Parent row */}
            <div
              className={`nav-item ${isParentActive ? 'active' : ''}`}
              style={{ justifyContent: 'space-between', cursor: 'pointer' }}
              onClick={() => {
                toggleGroup(parent);
                handleCategoryClick(parent);
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
                <div className="nav-icon">{parentIcons[parent] || '📁'}</div>
                <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{parent}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                <div className="nav-badge">{parentCount}</div>
                {subs.length > 0 && (
                  <span style={{ fontSize: '8.5px', color: 'var(--muted)', transition: 'transform 0.2s', display: 'inline-block', transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}>▶</span>
                )}
              </div>
            </div>

            {/* Subcategory rows with matching agent icons */}
            {isExpanded && subs.map(sub => {
              const fullCat = `${parent} · ${sub}`;
              const subTemplate = AGENT_TEMPLATES.find(a => a.category === fullCat);
              const subIcon = subTemplate?.icon || '📁';
              const subCount = AGENT_TEMPLATES.filter(a => a.category === fullCat).length;
              const isSubActive = activeCategory === fullCat;

              return (
                <div
                  key={fullCat}
                  className={`nav-item ${isSubActive ? 'active' : ''}`}
                  style={{ paddingLeft: '32px' }}
                  onClick={() => handleCategoryClick(fullCat)}
                >
                  <div className="nav-icon" style={{ fontSize: '14px' }}>{subIcon}</div>
                  <span style={{ fontSize: '13px' }}>{sub}</span>
                  <div className="nav-badge" style={{ marginLeft: 'auto' }}>{subCount}</div>
                </div>
              );
            })}
          </div>
        );
      })}

      <div className="sidebar-footer">
        <div className="stats-row">
          <span className="stats-label">Exécutions aujourd&apos;hui</span>
          <span className="stats-val">{executionsToday !== null ? executionsToday : '…'}</span>
        </div>
        <div className="stats-row">
          <span className="stats-label">Agents actifs</span>
          <span className="stats-val">
            {activeAgentsCount !== null ? activeAgentsCount : (agentCount !== null ? agentCount : '…')}
          </span>
        </div>
        <div className="stats-row">
          <span className="stats-label">Taux de succès</span>
          <span className="stats-val">
            {executionsToday && executionsToday > 0 && successRate !== null ? `${successRate}%` : '-'}
          </span>
        </div>
      </div>
    </div>
  );
};
