'use client';

import React, { useEffect, useState } from 'react';
import { AGENT_TEMPLATES } from '@/shared/management/constants/data';
import { getAgents, getMarketplaceStats } from '@/shared/api/n8n-api';

interface SidebarProps {
  currentView: string;
  onNavigate: (view: string) => void;
  activeCategory: string;
  onSelectCategory: (category: string) => void;
}

export const ManagementSidebar: React.FC<SidebarProps> = ({ currentView, onNavigate, activeCategory, onSelectCategory }) => {
  const [agentCount, setAgentCount] = useState<number | null>(null);
  const [pendingRequestsCount, setPendingRequestsCount] = useState<number | null>(null);
  const [executionsToday, setExecutionsToday] = useState<number | null>(null);
  const [activeAgentsCount, setActiveAgentsCount] = useState<number | null>(null);
  const [successRate, setSuccessRate] = useState<number | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let currentUserIsAdmin = false;
    try {
      const raw = localStorage.getItem('vmind_session') || localStorage.getItem('vmind_mcp_token');
      if (raw) {
        let tokenStr = raw;
        if (!raw.startsWith('eyJ')) {
          try {
            const parsed = JSON.parse(raw);
            tokenStr = parsed?.token || parsed?.access_token || parsed?.user?.token || raw;
          } catch (e) {}
        }
        if (tokenStr.startsWith('eyJ')) {
          const payload = JSON.parse(atob(tokenStr.split('.')[1]));
          const roles = payload.roles || payload.role;
          const roleStr = Array.isArray(roles) ? roles[0] : roles;
          currentUserIsAdmin = (roleStr === 'Administrator' || roleStr === 'admin' || roleStr === 'Admin');
        }
      }
    } catch (e) {}
    setIsAdmin(currentUserIsAdmin);

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
        .catch(() => {});

      if (currentUserIsAdmin) {
        fetch(`${process.env.NEXT_PUBLIC_API_URL || 'https://localhost:3001'}/api/auth/vmind/signup-requests`)
          .then(res => res.json())
          .then(data => {
            if (data.ok) {
              const pending = data.requests.filter((r: any) => r.status === 'pending');
              setPendingRequestsCount(pending.length);
            } else {
              setPendingRequestsCount(0);
            }
          })
          .catch(() => setPendingRequestsCount(0));
      }
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
        <>
          <div 
            className={`nav-item ${currentView === 'signup-requests' ? 'active' : ''}`} 
            onClick={() => onNavigate('signup-requests')}
          >
            <div className="nav-icon">📩</div>
            <span>Demandes d&apos;inscription</span>
            {pendingRequestsCount !== null && pendingRequestsCount > 0 && (
              <span className="nav-badge" style={{ background: 'rgba(255, 179, 0, 0.15)', color: '#FFB300', border: '1px solid rgba(255, 179, 0, 0.3)' }}>
                {pendingRequestsCount}
              </span>
            )}
          </div>
          <div 
            className={`nav-item ${currentView === 'journal' ? 'active' : ''}`}
            onClick={() => onNavigate('journal')}
          >
            <div className="nav-icon">📋</div>
            <span>Journal</span>
          </div>
        </>
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
                  <span style={{ fontSize: '9px', color: 'var(--muted)', transition: 'transform 0.2s', display: 'inline-block', transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}>▶</span>
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
                  style={{ paddingLeft: '32px', opacity: 0.9 }}
                  onClick={() => handleCategoryClick(fullCat)}
                >
                  <div className="nav-icon" style={{ fontSize: '13px' }}>{subIcon}</div>
                  <span style={{ fontSize: '12px' }}>{sub}</span>
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
