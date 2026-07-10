"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';

export interface Conversation {
  conversation_id: string;
  agent_id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

interface ConversationsContextType {
  conversations: Conversation[];
  activeConversationId: string | null;
  setActiveConversationId: (id: string | null) => void;
  createNewConversation: (agentId: string, firstMessageText: string) => Promise<string>;
  renameConversation: (conversationId: string, newTitle: string) => Promise<void>;
  deleteConversation: (conversationId: string) => Promise<void>;
  refreshConversations: () => Promise<void>;
  bumpConversation: (conversationId: string) => void;
  updateConversationTitle: (conversationId: string, newTitle: string) => void;
  isLoading: boolean;
}

const ConversationsContext = createContext<ConversationsContextType | undefined>(undefined);

export function ConversationsProvider({ children }: { children: React.ReactNode }) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchConversations = async () => {
    try {
      setIsLoading(true);
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
      let token = localStorage.getItem("vmind_mcp_token") || localStorage.getItem("vmind_session");
      if (token && token.startsWith("{")) token = JSON.parse(token).token;

      if (!token) return;

      const res = await fetch(`${baseUrl}/api/conversations`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.ok) {
        setConversations(data.conversations || []);
      }
    } catch (err) {
      console.error("Error fetching global conversations", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchConversations();
  }, []);

  const createNewConversation = async (agentId: string, firstMessageText: string): Promise<string> => {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
      let token = localStorage.getItem("vmind_mcp_token") || localStorage.getItem("vmind_session");
      if (token && token.startsWith("{")) token = JSON.parse(token).token;
      
      const newId = `conv-${Date.now()}`;
      const title = firstMessageText.substring(0, 30) + "...";
      const res = await fetch(`${baseUrl}/api/conversations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ conversation_id: newId, agent_id: agentId, title })
      });
      const data = await res.json();
      if (data.ok) {
        setConversations(prev => [data.conversation, ...prev]);
        setActiveConversationId(newId);
        return newId;
      }
    } catch (err) {
      console.error("Error creating conversation", err);
    }
    const fallbackId = `conv-${Date.now()}`;
    setActiveConversationId(fallbackId);
    return fallbackId;
  };

  
  const bumpConversation = (conversationId: string) => {
    setConversations(prev => {
      const idx = prev.findIndex(c => c.conversation_id === conversationId);
      if (idx <= 0) return prev; // already at top or not found
      const copy = [...prev];
      const [item] = copy.splice(idx, 1);
      item.updated_at = new Date().toISOString();
      return [item, ...copy];
    });
  };

  const updateConversationTitle = (conversationId: string, newTitle: string) => {
    setConversations(prev => 
      prev.map(c => c.conversation_id === conversationId ? { ...c, title: newTitle } : c)
    );
  };

  const renameConversation = async (conversationId: string, newTitle: string) => {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
      let token = localStorage.getItem("vmind_mcp_token") || localStorage.getItem("vmind_session");
      if (token && token.startsWith("{")) token = JSON.parse(token).token;

      const res = await fetch(`${baseUrl}/api/conversations/${conversationId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ title: newTitle })
      });
      const data = await res.json();
      if (data.ok) {
        setConversations(prev => prev.map(c => c.conversation_id === conversationId ? { ...c, title: newTitle } : c));
      }
    } catch (err) {
      console.error("Error renaming conversation", err);
    }
  };

  const deleteConversation = async (conversationId: string) => {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
      let token = localStorage.getItem("vmind_mcp_token") || localStorage.getItem("vmind_session");
      if (token && token.startsWith("{")) token = JSON.parse(token).token;

      const res = await fetch(`${baseUrl}/api/conversations/${conversationId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.ok) {
        setConversations(prev => prev.filter(c => c.conversation_id !== conversationId));
        if (activeConversationId === conversationId) {
          setActiveConversationId(null);
        }
      }
    } catch (err) {
      console.error("Error deleting conversation", err);
    }
  };

  return (
    <ConversationsContext.Provider value={{
      conversations,
      activeConversationId,
      setActiveConversationId,
      createNewConversation,
      renameConversation,
      deleteConversation,
      refreshConversations: fetchConversations,
      bumpConversation,
      updateConversationTitle,
      isLoading
    }}>
      {children}
    </ConversationsContext.Provider>
  );
}

export function useConversations() {
  const context = useContext(ConversationsContext);
  if (context === undefined) {
    throw new Error('useConversations must be used within a ConversationsProvider');
  }
  return context;
}
