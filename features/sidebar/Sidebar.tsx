"use client";

import React, { useState } from 'react';
import { IconBox } from '../../components/ui/IconBox';
import { AGENTS } from '../../shared/constants/data';

interface SidebarProps {
  onInsertPrompt: (text: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ onInsertPrompt }) => {
  const [activeNav, setActiveNav] = useState('dashboard');

  return (
    <div className="sidebar">
      <div className="nav-section">Navigation</div>
      
      <div 
        className={`nav-item ${activeNav === 'dashboard' ? 'active' : ''}`} 
        onClick={() => setActiveNav('dashboard')}
      >
        <div className="nav-icon">🏠</div>
        <span>Dashboard</span>
      </div>
      
      <div 
        className={`nav-item ${activeNav === 'history' ? 'active' : ''}`} 
        onClick={() => setActiveNav('history')}
      >
        <div className="nav-icon">💬</div>
        <span>Conversations</span>
        <span className="nav-badge">12</span>
      </div>

      <div className="nav-section">Agents IA</div>
      
      {Object.values(AGENTS).map((agent) => (
        <div 
          key={agent.id}
          className="nav-item" 
          onClick={() => {
            onInsertPrompt(`Analyse ${agent.name}`);
          }}
        >
          <IconBox style={{ background: agent.bgColor }}>
            <span style={{ 
              fontFamily: 'var(--font-title)', 
              fontSize: '9px', 
              fontWeight: 700, 
              color: agent.color 
            }}>
              {agent.icon}
            </span>
          </IconBox>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '12px', color: 'var(--white)', fontWeight: 600 }}>{agent.name}</div>
            <div style={{ fontSize: '9px', color: 'var(--muted)' }}>{agent.desc}</div>
          </div>
          <div style={{ 
            width: '6px', 
            height: '6px', 
            borderRadius: '50%', 
            background: agent.status === 'ACTIF' ? 'var(--green)' : 'var(--muted)',
            boxShadow: agent.status === 'ACTIF' ? '0 0 6px var(--green)' : 'none'
          }}></div>
        </div>
      ))}

      <div className="sidebar-footer">
        <div className="erp-tag">
          <span style={{ fontSize: '10px' }}>🔗</span>
          <div className="erp-name">TraLIS ERP</div>
          <div className="erp-status">● LIVE</div>
        </div>
        <div className="erp-tag">
          <span style={{ fontSize: '10px' }}>🧠</span>
          <div className="erp-name">LLM Engine</div>
          <div className="erp-status">● OK</div>
        </div>
      </div>
    </div>
  );
};
