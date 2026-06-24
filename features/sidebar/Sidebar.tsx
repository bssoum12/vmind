"use client";

import React, { useState, useEffect } from 'react';
import { IconBox } from '../../components/ui/IconBox';
import { AGENTS } from '../../shared/constants/data';
import { jwtDecode } from 'jwt-decode';

interface SidebarProps {
  onInsertPrompt: (text: string) => void;
  activeAgentId?: string;
  onAgentClick?: (agentId: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ onInsertPrompt, activeAgentId, onAgentClick }) => {
  const [activeNav, setActiveNav] = useState('dashboard');
  const [allowedAgents, setAllowedAgents] = useState<string[]>([]);
  const [username, setUsername] = useState<string>('');

  useEffect(() => {
    try {
      const token = localStorage.getItem('vmind_session');
      if (token) {
        const decoded: any = jwtDecode(token);
        if (decoded.allowedAgents) {
          setAllowedAgents(decoded.allowedAgents);
        }
        if (decoded.username) {
          setUsername(decoded.username);
        }
      } else {
        // Optionnel : rediriger vers /login si aucun token
        window.location.href = '/login';
      }
    } catch (e) {
      console.error("Erreur de décodage du token", e);
      window.location.href = '/login';
    }
  }, []);

  const visibleAgents = Object.values(AGENTS).filter(agent => 
    // Toujours afficher le dashboard principal ou filtrer selon la liste
    allowedAgents.includes(agent.id) || agent.id === 'VMIND'
  );

  return (
    <div className="sidebar">
      <div className="nav-section">
        Navigation
        {username && <div style={{fontSize: '9px', color: 'var(--muted)', marginTop: '4px'}}>Connecté: {username}</div>}
      </div>

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

      <div className="nav-section">Agents IA ({visibleAgents.length})</div>

      {visibleAgents.map((agent) => (
        <div
          key={agent.id}
          className={`nav-item ${activeAgentId === agent.id ? 'agent-card-active' : ''}`}
          onClick={() => {
            if (onAgentClick) onAgentClick(agent.id);
          }}
        >
          <IconBox style={{
            background: agent.bgColor,
            border: activeAgentId === agent.id ? `1px solid ${agent.color}` : 'none',
            boxShadow: activeAgentId === agent.id ? `0 0 10px ${agent.color}40` : 'none'
          }}>
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
            background: activeAgentId === agent.id ? 'var(--green)' : 'var(--muted)',
            boxShadow: activeAgentId === agent.id ? '0 0 6px var(--green)' : 'none'
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
