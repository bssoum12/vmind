'use client';

import React, { useEffect, useState } from 'react';
import { AGENT_TEMPLATES } from '@/shared/management/constants/data';
import { getAgents } from '@/shared/api/n8n-api';

interface SidebarProps {
  currentView: string;
  onNavigate: (view: string) => void;
  activeCategory: string;
  onSelectCategory: (category: string) => void;
}

export const ManagementSidebar: React.FC<SidebarProps> = ({ currentView, onNavigate, activeCategory, onSelectCategory }) => {
  const [agentCount, setAgentCount] = useState<number | null>(null);

  useEffect(() => {
    // Fetch real agent count from backend
    getAgents()
      .then(agents => setAgentCount(agents.length))
      .catch(() => setAgentCount(0));
  }, [currentView]); // re-fetch when navigating back to agents view

  const handleCategoryClick = (cat: string) => {
    onSelectCategory(cat);
    onNavigate('market');
  };

  const dynamicCategories = Array.from(new Set(AGENT_TEMPLATES.flatMap(a => a.category.split(' · '))))
    .sort()
    .map(cat => ({
      id: cat,
      name: cat,
      icon: cat === 'Finance' ? '💰' : cat === 'Operations' ? '🚚' : cat === 'Commercial' ? '📞' : cat === 'Reporting' ? '📊' : cat === 'RH' ? '👥' : '📁',
      count: AGENT_TEMPLATES.filter(a => a.category.includes(cat)).length
    }));

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
        {/* Dynamic badge — null while loading so it doesn't flash "0" */}
        {agentCount !== null && agentCount > 0 && (
          <span className="nav-badge">{agentCount}</span>
        )}
        {agentCount === 0 && (
          <span className="nav-badge" style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--muted)' }}>0</span>
        )}
      </div>
      <div 
        className={`nav-item ${currentView === 'journal' ? 'active' : ''}`}
        onClick={() => onNavigate('journal')}
      >
        <div className="nav-icon">📋</div>
        <span>Journal</span>
      </div>

      <div className="nav-section">Catégories</div>
      {dynamicCategories.map((cat) => (
        <div 
          key={cat.id}
          className={`nav-item ${activeCategory === cat.id ? 'active' : ''}`}
          onClick={() => handleCategoryClick(cat.id)}
        >
          <div className="nav-icon">{cat.icon}</div>
          <span>{cat.name}</span>
          <div className="nav-badge">{cat.count}</div>
        </div>
      ))}

      <div className="sidebar-footer">
        <div className="stats-row">
          <span className="stats-label">Exécutions aujourd&apos;hui</span>
          <span className="stats-val">24</span>
        </div>
        <div className="stats-row">
          <span className="stats-label">Agents actifs</span>
          <span className="stats-val">
            {agentCount !== null ? agentCount : '…'}
          </span>
        </div>
        <div className="stats-row">
          <span className="stats-label">Taux de succès</span>
          <span className="stats-val">97%</span>
        </div>
        <div className="stats-row">
          <span className="stats-label">Connexion ERP</span>
          <span className="stats-val" style={{ color: 'var(--green)' }}>● TraLIS</span>
        </div>
      </div>
    </div>
  );
};
