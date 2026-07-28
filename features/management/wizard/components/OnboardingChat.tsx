'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/shared/management/components/Button';
import { Send, Bot, User, Check, Edit2 } from 'lucide-react';

interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface OnboardingChatProps {
  initialMission: string;
  onConfirm: (mission: string) => void;
}

export function OnboardingChat({ initialMission, onConfirm }: OnboardingChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [summary, setSummary] = useState<string | null>(initialMission || null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, summary, isLoading]);

  const hasInitialized = useRef(false);

  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    // Start conversation if empty
    if (messages.length === 0 && !initialMission) {
      handleSend('Bonjour ! Je suis prêt à configurer mon agent.');
    } else if (initialMission && messages.length === 0) {
      setSummary(initialMission);
    }
  }, []);

  const handleSend = async (text: string = input) => {
    if (!text.trim() || isLoading) return;

    const userMsg: Message = { role: 'user', content: text };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    try {
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://localhost:3001';
      const token = localStorage.getItem('vmind_session');
      const res = await fetch(`${API_BASE_URL}/api/prospect-agent/onboarding-chat`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        },
        body: JSON.stringify({ messages: newMessages.filter(m => m.role !== 'system') })
      });

      if (!res.ok) throw new Error('API Error');
      const data = await res.json();
      const assistantMessage = data.choices[0].message.content;

      // Check if it's the final summary
      if (assistantMessage.includes('[SUMMARY_COMPLETE]')) {
        const cleanSummary = assistantMessage.replace('[SUMMARY_COMPLETE]', '').trim();
        setSummary(cleanSummary);
        setMessages(prev => [...prev, { role: 'assistant', content: cleanSummary }]);
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: assistantMessage }]);
      }
    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, { role: 'assistant', content: "Une erreur s'est produite lors de la connexion à l'IA. Veuillez réessayer." }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '500px', height: '100%', maxHeight: '650px', backgroundColor: 'var(--navy2)', borderRadius: '12px', border: '1px solid var(--border)', overflow: 'hidden' }}>
      <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {messages.filter(m => m.role !== 'system').map((msg, idx) => (
          <div key={idx} style={{ display: 'flex', gap: '12px', alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '80%' }}>
            {msg.role === 'assistant' && (
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(0, 229, 200, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--cyan)' }}>
                <Bot size={18} />
              </div>
            )}
            <div style={{ 
              padding: '12px 16px', 
              borderRadius: '12px', 
              background: msg.role === 'user' ? 'var(--cyan)' : 'rgba(255, 255, 255, 0.03)',
              color: msg.role === 'user' ? '#000' : 'var(--text)',
              border: msg.role === 'assistant' ? '1px solid var(--border)' : 'none',
              fontSize: '0.95rem',
              lineHeight: 1.5
            }}>
              {msg.content}
            </div>
          </div>
        ))}
        {isLoading && (
          <div style={{ display: 'flex', gap: '12px', alignSelf: 'flex-start' }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(0, 229, 200, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--cyan)' }}>
              <Bot size={18} />
            </div>
            <div style={{ padding: '12px 16px', borderRadius: '12px', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--border)', display: 'flex', gap: '4px', alignItems: 'center' }}>
              <span className="dot-typing"></span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {summary ? (
        <div style={{ padding: '1.5rem', borderTop: '1px solid var(--border)', background: 'rgba(0, 229, 200, 0.05)' }}>
          <h4 style={{ color: 'var(--cyan)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}><Check size={18} /> Résumé de la mission</h4>
          <p style={{ color: 'var(--text)', fontSize: '0.95rem', marginBottom: '16px', lineHeight: 1.5 }}>{summary}</p>
          <div style={{ display: 'flex', gap: '12px' }}>
            <Button variant="primary" onClick={() => onConfirm(summary)} style={{ flex: 1 }}>
              Confirmer & Continuer
            </Button>
            <Button variant="secondary" onClick={() => setSummary(null)} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Edit2 size={16} /> Modifier
            </Button>
          </div>
        </div>
      ) : (
        <div style={{ padding: '1.2rem', borderTop: '1px solid var(--border)', background: 'rgba(0,0,0,0.2)', display: 'flex', gap: '12px' }}>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Répondre à VirtualMind..."
            disabled={isLoading}
            style={{ flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', borderRadius: '8px', padding: '0 16px', color: '#fff', outline: 'none', height: '50px', fontSize: '1rem', opacity: isLoading ? 0.5 : 1 }}
          />
          <Button variant="primary" onClick={() => handleSend()} disabled={!input.trim() || isLoading} style={{ width: 54, height: 48, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Send size={18} />
          </Button>
        </div>
      )}
    </div>
  );
}
