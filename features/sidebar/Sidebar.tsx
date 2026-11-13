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
  const [username, setUsername] = useState<string>('');
  const { conversations, activeConversationId, setActiveConversationId, createNewConversation, resetToNewConversation, renameConversation, deleteConversation } = useConversations();
  const [editingConvId, setEditingConvId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');

  const updatePermissions = (event?: any) => {
    try {
      const sessionDetail = event?.detail;
      const user = sessionDetail?.user || (sessionDetail?.connected === true ? sessionDetail : null);
      if (user?.username) setUsername(user.username);
    } catch (e) {
      console.error("Erreur de synchronisation des permissions dans la sidebar", e);
    }
  };

  useEffect(() => {
    const fetchInitialUser = async () => {
      try {
        const baseUrl = process.env.NEXT_PUBLIC_API_URL;
        const res = await fetch(`${baseUrl}/api/auth/vmind/me`, { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          if (data?.ok && data.user) {
            if (data.user.username) setUsername(data.user.username);
          }
        }
      } catch {}
    };
    fetchInitialUser();

    updatePermissions();
    window.addEventListener('mcp-session-updated', updatePermissions);
    return () => window.removeEventListener('mcp-session-updated', updatePermissions);
  }, []);

  const visibleAgents = Object.values(AGENTS);

  return (
    <div className="sidebar">
      <div className="nav-section">Menu Principal</div>



      <div
        className={`nav-item ${activeNav === 'history' ? 'active' : ''}`}
        onClick={() => {
          setActiveNav('history');
          window.dispatchEvent(new CustomEvent('switch-assistant-view', { detail: 'chat' }));
        }}
      >
        <div className="nav-icon">💬</div>
        <span>Chat</span>
        {conversations.length > 0 && (
          <span className="nav-badge">{conversations.length}</span>
        )}
      </div>

      <div
        className={`nav-item ${activeNav === 'skills' ? 'active' : ''}`}
        onClick={() => {
          setActiveNav('skills');
          window.dispatchEvent(new CustomEvent('switch-assistant-view', { detail: 'skills' }));
        }}
      >
        <div className="nav-icon">✨</div>
        <span>Skills</span>
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

      {visibleAgents.map((agent) => {
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

                // Isoler la conversation par agent : vérifier si la conversation active appartient à cet agent
                const currentConv = conversations.find(c => c.conversation_id === activeConversationId);
                if (!currentConv || currentConv.agent_id !== agent.id) {
                  const matchingConvs = conversations.filter(c => c.agent_id === agent.id);
                  if (matchingConvs.length > 0) {
                    setActiveConversationId(matchingConvs[0].conversation_id);
                  } else {
                    resetToNewConversation();
                  }
                }
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
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '12px', color: 'var(--white)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {agent.name}
                  </span>
                </div>
                <div style={{ fontSize: '9px', color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{agent.desc}</div>
              </div>
              <div style={{
                width: '6px', height: '6px', borderRadius: '50%',
                background: isActiveAgent ? agent.color : 'var(--muted)',
                boxShadow: isActiveAgent ? `0 0 6px ${agent.color}` : 'none',
                flexShrink: 0
              }}></div>
            </div>

            {/* Sub-menu (Conversations) */}
            {isActiveAgent && (
              <div style={{ padding: '4px 10px 10px 42px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <button
                  onClick={async (e) => {
                    e.stopPropagation();
                    resetToNewConversation();
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
                
                <div 
                  className="sidebar-conversations-scroll"
                  style={{ 
                    maxHeight: '180px', 
                    overflowY: 'auto', 
                    paddingRight: '4px', 
                    marginTop: '4px', 
                    display: 'flex', 
                    flexDirection: 'column', 
                    gap: '2px',
                    '--agent-color': agent.color,
                  } as React.CSSProperties}
                >
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
      })}
    </div>
  );
};
