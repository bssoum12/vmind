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
  apiEndpoint?: string;
  onModify?: () => void;
}

/**
 * Parses COMPANY_TARGET and LEAD_TARGET from the raw summary text.
 */
function parseMissionTargets(text: string): { company?: string; lead?: string; isStructured: boolean } {
  if (!text) return { isStructured: false };
  const hasCompany = text.includes('COMPANY_TARGET:');
  const hasLead = text.includes('LEAD_TARGET:');
  if (!hasCompany && !hasLead) return { isStructured: false };

  let company: string | undefined;
  let lead: string | undefined;

  if (hasCompany && hasLead) {
    const compPart = text.substring(text.indexOf('COMPANY_TARGET:') + 'COMPANY_TARGET:'.length, text.indexOf('LEAD_TARGET:')).trim();
    const leadPart = text.substring(text.indexOf('LEAD_TARGET:') + 'LEAD_TARGET:'.length).trim();
    company = compPart;
    lead = leadPart;
  } else if (hasCompany) {
    company = text.substring(text.indexOf('COMPANY_TARGET:') + 'COMPANY_TARGET:'.length).trim();
  } else if (hasLead) {
    lead = text.substring(text.indexOf('LEAD_TARGET:') + 'LEAD_TARGET:'.length).trim();
  }

  return { company, lead, isStructured: Boolean(company || lead) };
}

/**
 * Formats structured targets into a single fluid, natural sentence for the user.
 * Example: "Recherche de Directeurs Logistiques, Responsables Supply Chain, CEO au sein d'entreprises du secteur logistique et transport basées en France et Tunisie."
 */
function buildNaturalSentence(company?: string, lead?: string): string {
  if (!company && !lead) return '';

  let cleanCompany = (company || '').trim().replace(/\.+$/, '');
  let cleanLead = (lead || '').trim().replace(/\.+$/, '');

  // Lowercase "Entreprises" if it starts the company string
  cleanCompany = cleanCompany.replace(/^entreprises\s+/i, '');

  if (cleanLead && cleanCompany) {
    // E.g. "Recherche de [Profils] au sein d'entreprises de [Secteur / Pays]"
    return `Recherche de ${cleanLead} au sein d'entreprises ${cleanCompany.startsWith('du ') || cleanCompany.startsWith('de ') || cleanCompany.startsWith('en ') ? cleanCompany : `du secteur ${cleanCompany}`}.`;
  }

  if (cleanLead) {
    return `Recherche de ${cleanLead}.`;
  }

  return `Recherche au sein d'entreprises ${cleanCompany}.`;
}

/**
 * Formats structured targets into a clean natural presentation for the user.
 */
function FormattedTargetView({ content }: { content: string; isDark?: boolean }) {
  const { company, lead, isStructured } = parseMissionTargets(content);

  if (!isStructured) {
    return <span style={{ whiteSpace: 'pre-wrap' }}>{content}</span>;
  }

  const naturalText = buildNaturalSentence(company, lead);

  return (
    <div style={{
      fontSize: '0.95rem',
      lineHeight: 1.6,
      color: 'var(--text, #F0F4F8)'
    }}>
      {naturalText}
    </div>
  );
}

export function OnboardingChat({ initialMission, onConfirm, apiEndpoint, onModify }: OnboardingChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [summary, setSummary] = useState<string | null>(initialMission || null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, summary, isLoading]);

  useEffect(() => {
    if (!isLoading && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isLoading]);

  const hasInitialized = useRef(false);

  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    // Start conversation if empty
    if (messages.length === 0 && !initialMission) {
      handleSend('Bonjour ! Je suis prêt à configurer mon agent.');
    } else if (initialMission && messages.length === 0) {
      setSummary(initialMission);
      setMessages([
        {
          role: 'assistant',
          content: initialMission
        }
      ]);
    }
  }, []);

  useEffect(() => {
    if (initialMission && summary !== initialMission) {
      setSummary(initialMission);
      setMessages([
        {
          role: 'assistant',
          content: initialMission
        }
      ]);
    }
  }, [initialMission]);

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
      const endpoint = apiEndpoint || '/api/prospect-agent/onboarding-chat';
      const res = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        },
        body: JSON.stringify({ messages: newMessages.filter(m => m.role !== 'system') })
      });

      if (!res.ok) throw new Error('Erreur de communication avec le service d\'assistance');
      const data = await res.json();
      const assistantMessage = data.choices[0].message.content;

      // Check if it's the final summary
      if (assistantMessage.includes('[SUMMARY_COMPLETE]')) {
        let cleanSummary = assistantMessage.replace('[SUMMARY_COMPLETE]', '').trim();
        if (cleanSummary.includes('COMPANY_TARGET:')) {
          cleanSummary = cleanSummary.substring(cleanSummary.indexOf('COMPANY_TARGET:')).trim();
        }
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

  const handleModifyClick = () => {
    setSummary(null);
    onModify?.();
    const modifyPrompt = "Bien sûr ! Quels éléments souhaitez-vous modifier ou affiner dans ce ciblage ? (Ex : pays/région, secteur d'activité, intitulé du poste, département, seniorité ou rôle de décideur)";
    setMessages(prev => [
      ...prev,
      {
        role: 'assistant',
        content: modifyPrompt
      }
    ]);
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '500px', height: '100%', maxHeight: '620px', backgroundColor: 'var(--navy2)', borderRadius: '12px', border: '1px solid var(--border)', overflow: 'hidden' }}>
      <style>{`
        .onboarding-chat-scroll {
          scrollbar-width: thin;
          scrollbar-color: rgba(0, 229, 200, 0.4) rgba(6, 17, 31, 0.4);
          scroll-behavior: smooth;
        }
        .onboarding-chat-scroll::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        .onboarding-chat-scroll::-webkit-scrollbar-track {
          background: rgba(6, 17, 31, 0.4);
          border-radius: 8px;
        }
        .onboarding-chat-scroll::-webkit-scrollbar-thumb {
          background: linear-gradient(180deg, rgba(0, 229, 200, 0.4) 0%, rgba(0, 168, 255, 0.3) 100%);
          border-radius: 8px;
          border: 1px solid rgba(0, 229, 200, 0.2);
          transition: all 0.2s ease;
        }
        .onboarding-chat-scroll::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(180deg, rgba(0, 229, 200, 0.8) 0%, rgba(0, 168, 255, 0.7) 100%);
          border: 1px solid rgba(0, 229, 200, 0.4);
          box-shadow: 0 0 10px rgba(0, 229, 200, 0.5);
        }
      `}</style>
      <div
        className="onboarding-chat-scroll"
        style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}
      >
        {messages.filter(m => m.role !== 'system').map((msg, idx) => (
          <div key={idx} style={{ display: 'flex', gap: '12px', alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: msg.role === 'user' ? '80%' : '90%' }}>
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
              {msg.role === 'assistant' ? (
                <FormattedTargetView content={msg.content} />
              ) : (
                <span style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</span>
              )}
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
        <div style={{ padding: '1.25rem 1.5rem', borderTop: '1px solid var(--border)', background: 'rgba(0, 229, 200, 0.04)' }}>
          <h4 style={{ color: 'var(--cyan)', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.95rem', fontWeight: 600 }}>
            <Check size={18} /> Résumé du ciblage validé
          </h4>
          <div style={{ marginBottom: '14px' }}>
            <FormattedTargetView content={summary} isDark={true} />
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <Button variant="primary" onClick={() => onConfirm(summary)} style={{ flex: 1 }}>
              Confirmer & Continuer
            </Button>
            <Button variant="secondary" onClick={handleModifyClick} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Edit2 size={16} /> Modifier
            </Button>
          </div>
        </div>
      ) : (
        <div style={{ padding: '1.2rem', borderTop: '1px solid var(--border)', background: 'rgba(0,0,0,0.2)', display: 'flex', gap: '12px' }}>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Répondre à VMind..."
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
