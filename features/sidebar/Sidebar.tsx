"use client";

import React, { useState, useEffect } from 'react';
import { IconBox } from '../../components/ui/IconBox';
import { AGENTS } from '../../shared/constants/data';
import { jwtDecode } from 'jwt-decode';
import { useConversations } from '../../shared/contexts/ConversationsContext';
import { Edit2, Trash2, Plus, MessageSquare } from 'lucide-react';

interface SidebarProps {
  onInsertPrompt: (text: string) => void;
  activeAgentId?: string;
  onAgentClick?: (agentId: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ onInsertPrompt, activeAgentId, onAgentClick }) => {
  const [activeNav, setActiveNav] = useState('dashboard');
  const [allowedAgents, setAllowedAgents] = useState<string[]>([]);
  const [username, setUsername] = useState<string>('');
  const { conversations, activeConversationId, setActiveConversationId, createNewConversation, renameConversation, deleteConversation } = useConversations();
  const [editingConvId, setEditingConvId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');

  const updatePermissions = () => {
    try {
      // 1. Read live allowed agents from ConnectorsHub synchronization if available
      const storedAllowedAgents = localStorage.getItem('vmind_allowed_agents');

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
        if (decoded.username) {
          setUsername(decoded.username);
        }

        // If we have live database allowed agents, use them directly (respecting PostgreSQL)
        if (storedAllowedAgents) {
          try {
            setAllowedAgents(JSON.parse(storedAllowedAgents));
            return;
          } catch (e) {
            // fallback
          }
        }

        if (decoded.allowedAgents) {
          setAllowedAgents(decoded.allowedAgents);
        } else {
          setAllowedAgents([]);
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
        
        visibleAgents.map((agent) => {
          const agentConvs = conversations.filter(c => c.agent_id === agent.id);
          const isActiveAgent = activeAgentId === agent.id;
          return (
          <div key={agent.id} style={{ display: 'flex', flexDirection: 'column' }}>
            <div
              className={`nav-item ${isActiveAgent ? 'agent-card-active' : ''}`}
              style={isActiveAgent ? {
                '--agent-color': agent.color,
                '--agent-bg': agent.bgColor,
                '--agent-border': agent.borderColor,
              } as React.CSSProperties : {}}
              onClick={() => {
                setActiveNav('dashboard');
                window.dispatchEvent(new CustomEvent('switch-assistant-view', { detail: 'chat' }));
                if (onAgentClick) onAgentClick(agent.id);
              }}
            >
              <IconBox style={{
                background: agent.bgColor,
                border: isActiveAgent ? `1px solid ${agent.color}` : 'none',
                boxShadow: isActiveAgent ? `0 0 10px ${agent.color}40` : 'none'
              }}>
                <span style={{ fontFamily: 'var(--font-title)', fontSize: '9px', fontWeight: 700, color: agent.color }}>
                  {agent.icon}
                </span>
              </IconBox>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '12px', color: 'var(--white)', fontWeight: 600 }}>{agent.name}</div>
                <div style={{ fontSize: '9px', color: 'var(--muted)' }}>{agent.desc}</div>
              </div>
              <div style={{
                width: '6px', height: '6px', borderRadius: '50%',
                background: isActiveAgent ? agent.color : 'var(--muted)',
                boxShadow: isActiveAgent ? `0 0 6px ${agent.color}` : 'none'
              }}></div>
            </div>

            {/* Sub-menu (Conversations) */}
            {isActiveAgent && (
              <div style={{ padding: '4px 10px 10px 42px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <button
                  onClick={async (e) => {
                    e.stopPropagation();
                    const newId = await createNewConversation(agent.id, "Nouvelle discussion");
                    setActiveConversationId(newId);
                    if (onAgentClick) onAgentClick(agent.id);
                    window.dispatchEvent(new CustomEvent('switch-assistant-view', { detail: 'chat' }));
                  }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '6px',
                    padding: '6px 10px', borderRadius: '6px',
                    background: 'rgba(255,255,255,0.03)', color: agent.color,
                    border: `1px dashed ${agent.borderColor}`,
                    fontSize: '11px', fontWeight: 600, cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
                  onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                >
                  <Plus size={12} /> Nouvelle discussion
                </button>
                
                <div style={{ maxHeight: '180px', overflowY: 'auto', paddingRight: '4px', marginTop: '4px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  {agentConvs.map(conv => {
                    const isConvActive = activeConversationId === conv.conversation_id;
                    const isEditing = editingConvId === conv.conversation_id;

                    return (
                      <div
                        key={conv.conversation_id}
                        onClick={() => {
                          if (!isEditing) {
                            setActiveConversationId(conv.conversation_id);
                            window.dispatchEvent(new CustomEvent('switch-assistant-view', { detail: 'chat' }));
                          }
                        }}
                        style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          padding: '6px 8px', borderRadius: '6px',
                          background: isConvActive ? 'rgba(255,255,255,0.08)' : 'transparent',
                          color: isConvActive ? '#fff' : 'rgba(255,255,255,0.5)',
                          cursor: 'pointer', fontSize: '11px', transition: 'all 0.2s',
                          border: isConvActive ? `1px solid rgba(255,255,255,0.1)` : '1px solid transparent'
                        }}
                        onMouseOver={(e) => {
                          if (!isConvActive) e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                        }}
                        onMouseOut={(e) => {
                          if (!isConvActive) e.currentTarget.style.background = 'transparent';
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden', flex: 1 }}>
                          <MessageSquare size={10} style={{ opacity: isConvActive ? 1 : 0.5, flexShrink: 0 }} />
                          {isEditing ? (
                            <input
                              autoFocus
                              value={editTitle}
                              onChange={e => setEditTitle(e.target.value)}
                              onBlur={() => {
                                if (editTitle.trim() && editTitle !== conv.title) {
                                  renameConversation(conv.conversation_id, editTitle);
                                }
                                setEditingConvId(null);
                              }}
                              onKeyDown={e => {
                                if (e.key === 'Enter') {
                                  if (editTitle.trim() && editTitle !== conv.title) {
                                    renameConversation(conv.conversation_id, editTitle);
                                  }
                                  setEditingConvId(null);
                                }
                                if (e.key === 'Escape') setEditingConvId(null);
                              }}
                              style={{
                                background: 'rgba(0,0,0,0.3)', border: `1px solid ${agent.color}`,
                                color: '#fff', fontSize: '11px', outline: 'none',
                                borderRadius: '4px', padding: '2px 4px', width: '100%'
                              }}
                              onClick={e => e.stopPropagation()}
                            />
                          ) : (
                            <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {conv.title}
                            </span>
                          )}
                        </div>
                        
                        {!isEditing && (
                          <div style={{ display: 'flex', gap: '4px', opacity: isConvActive ? 0.8 : 0 }}>
                            <Edit2 
                              size={10} 
                              className="hover:text-white" 
                              onClick={(e) => { e.stopPropagation(); setEditTitle(conv.title); setEditingConvId(conv.conversation_id); }} 
                            />
                            <Trash2 
                              size={10} 
                              className="hover:text-red-400" 
                              onClick={(e) => { e.stopPropagation(); deleteConversation(conv.conversation_id); }} 
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {agentConvs.length === 0 && (
                    <div style={{ fontSize: '10px', color: 'var(--muted)', fontStyle: 'italic', padding: '4px 8px' }}>
                      Aucune conversation
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        );
        })

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
