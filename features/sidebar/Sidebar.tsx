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

  const updatePermissions = () => {
    try {
      // Prioritize MCP Token if it exists, otherwise fall back to VMIND Session
      const mcpToken = localStorage.getItem('vmind_mcp_token');
      const sessionToken = localStorage.getItem('vmind_session');
      
      let tokenToUse = null;
      if (mcpToken) {
        tokenToUse = mcpToken;
      } else if (sessionToken) {
        // Handle both raw JWT or JSON format in vmind_session
        if (sessionToken.startsWith('eyJ')) {
          tokenToUse = sessionToken;
        } else {
          try {
            const parsed = JSON.parse(sessionToken);
            tokenToUse = parsed.token || parsed.access_token || parsed.user?.token;
          } catch (e) {
            tokenToUse = null;
          }
        }
      }

      if (tokenToUse) {
        const decoded: any = jwtDecode(tokenToUse);
        if (decoded.allowedAgents) {
          setAllowedAgents(decoded.allowedAgents);
        } else {
          setAllowedAgents([]);
        }
        if (decoded.username) {
          setUsername(decoded.username);
        }
      } else {
        // Optionnel : rediriger vers /login si aucun token
        window.location.href = '/login';
      }
    } catch (e) {
      console.error("Erreur de décodage du token dans la sidebar", e);
      window.location.href = '/login';
    }
  };

  useEffect(() => {
    updatePermissions();
    window.addEventListener('mcp-session-updated', updatePermissions);
    return () => window.removeEventListener('mcp-session-updated', updatePermissions);
  }, []);

  const visibleAgents = Object.values(AGENTS).filter(agent => 
    allowedAgents.includes(agent.id)
  );

  return (
    <div className="sidebar">
      <div className="nav-section">Navigation</div>

      <div
        className={`nav-item ${activeNav === 'dashboard' ? 'active' : ''}`}
        onClick={() => {
          setActiveNav('dashboard');
          window.dispatchEvent(new CustomEvent('switch-assistant-view', { detail: 'chat' }));
        }}
      >
        <div className="nav-icon">🏠</div>
        <span>Dashboard</span>
      </div>

      <div
        className={`nav-item ${activeNav === 'history' ? 'active' : ''}`}
        onClick={() => {
          setActiveNav('history');
          window.dispatchEvent(new CustomEvent('switch-assistant-view', { detail: 'chat' }));
        }}
      >
        <div className="nav-icon">💬</div>
        <span>Conversations</span>
        <span className="nav-badge">12</span>
      </div>

      <div
        className={`nav-item ${activeNav === 'connectors' ? 'active' : ''}`}
        onClick={() => {
          setActiveNav('connectors');
          // Dispatch a custom event to notify page.tsx to switch view
          window.dispatchEvent(new CustomEvent('switch-assistant-view', { detail: 'connectors' }));
        }}
      >
        <div className="nav-icon">🔌</div>
        <span>Connecteurs</span>
      </div>

      <div className="nav-section">Agents IA ({visibleAgents.length})</div>

      {visibleAgents.length === 0 ? (
        <div style={{
          padding: '12px 14px',
          fontSize: '11px',
          color: 'var(--muted)',
          fontStyle: 'italic',
          lineHeight: 1.45,
          border: '1px dashed rgba(255,255,255,0.06)',
          borderRadius: '8px',
          margin: '6px 14px',
          textAlign: 'center',
          background: 'rgba(255,255,255,0.01)',
        }}>
          Aucun agent autorisé pour votre profil.
        </div>
      ) : (
        visibleAgents.map((agent) => (
          <div
            key={agent.id}
            className={`nav-item ${activeAgentId === agent.id ? 'agent-card-active' : ''}`}
            style={activeAgentId === agent.id ? {
              '--agent-color': agent.color,
              '--agent-bg': agent.bgColor,
              '--agent-border': agent.borderColor,
            } as React.CSSProperties : {}}
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
              background: activeAgentId === agent.id ? agent.color : 'var(--muted)',
              boxShadow: activeAgentId === agent.id ? `0 0 6px ${agent.color}` : 'none'
            }}></div>
          </div>
        ))
      )}

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
