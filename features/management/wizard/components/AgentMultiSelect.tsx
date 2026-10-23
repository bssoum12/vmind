'use client';

import React, { useState, useMemo } from 'react';
import { Bot, Check, Search, ShieldCheck, Zap } from 'lucide-react';
import { AGENT_TEMPLATES } from '@/shared/management/constants/data';

export interface AgentMultiSelectProps {
  selectedAgentIds: (string | number)[];
  onChange: (selectedIds: string[]) => void;
  availableAgents: any[];
  isLoading?: boolean;
}

export const AgentMultiSelect: React.FC<AgentMultiSelectProps> = ({
  selectedAgentIds,
  onChange,
  availableAgents,
  isLoading = false,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  // Normalize selected IDs set for fast and case-insensitive matching
  const selectedSet = useMemo(() => {
    return new Set(
      selectedAgentIds
        .filter(id => id !== null && id !== undefined && id !== '')
        .map(id => String(id).trim().toLowerCase())
    );
  }, [selectedAgentIds]);

  const isAgentSelected = (agent: any): boolean => {
    const keys = [
      agent.uuid,
      agent.agent_id,
      agent.id,
      agent.nom,
      agent.agent_name,
      agent.internal_agent_id,
      agent.sql_agent_id
    ].filter(Boolean).map(k => String(k).trim().toLowerCase());

    return keys.some(k => selectedSet.has(k));
  };

  const toggleAgent = (agent: any) => {
    const agentPublicUuid = agent.uuid || agent.agent_id || agent.id || agent.agent_name;
    const isSelected = isAgentSelected(agent);

    if (isSelected) {
      const keysToRemove = new Set(
        [agent.uuid, agent.agent_id, agent.id, agent.nom, agent.agent_name]
          .filter(Boolean)
          .map(k => String(k).trim().toLowerCase())
      );
      const next = selectedAgentIds
        .map(id => String(id))
        .filter(id => !keysToRemove.has(id.trim().toLowerCase()));
      onChange(next);
    } else {
      const next = [...selectedAgentIds.map(id => String(id)), String(agentPublicUuid)];
      onChange(Array.from(new Set(next)));
    }
  };

  const handleSelectAll = () => {
    const allUuids = availableAgents
      .map(a => a.uuid || a.agent_id || a.id || a.agent_name)
      .filter(Boolean)
      .map(id => String(id));
    onChange(Array.from(new Set(allUuids)));
  };

  const handleDeselectAll = () => {
    onChange([]);
  };

  const filteredAgents = useMemo(() => {
    if (!searchQuery.trim()) return availableAgents;
    const q = searchQuery.toLowerCase().trim();
    return availableAgents.filter(a => {
      const name = (a.agent_name || a.nom || '').toLowerCase();
      const mode = (a.run_mode || '').toLowerCase();
      return name.includes(q) || mode.includes(q);
    });
  }, [availableAgents, searchQuery]);

  if (isLoading) {
    return (
      <div style={{
        padding: '32px',
        textAlign: 'center',
        background: 'rgba(5, 16, 30, 0.4)',
        borderRadius: '12px',
        border: '1px solid rgba(255, 255, 255, 0.05)',
        color: '#8FA3B8',
        fontSize: '13px'
      }}>
        <div className="spinner" style={{
          width: '28px', height: '28px',
          border: '2px solid rgba(0, 229, 200, 0.2)',
          borderTopColor: '#00E5C8',
          borderRadius: '50%',
          animation: 'spinRing 1s linear infinite',
          margin: '0 auto 12px'
        }} />
        Chargement de vos agents disponibles...
      </div>
    );
  }

  if (availableAgents.length === 0) {
    return (
      <div style={{
        padding: '24px',
        background: 'rgba(5, 16, 30, 0.5)',
        borderRadius: '12px',
        border: '1px dashed rgba(255, 255, 255, 0.12)',
        textAlign: 'center'
      }}>
        <Bot size={32} color="#8FA3B8" style={{ margin: '0 auto 12px', opacity: 0.6 }} />
        <div style={{ fontSize: '14px', fontWeight: 600, color: '#F0F4F8', marginBottom: '6px' }}>
          Aucun agent commercial actif détecté
        </div>
        <div style={{ fontSize: '12px', color: '#8FA3B8', maxWidth: '420px', margin: '0 auto', lineHeight: 1.5 }}>
          Déployez d&apos;abord un ou plusieurs agents de Prospection ou de Sourcing depuis la Marketplace afin que le Superviseur puisse les auditer et les coordonner.
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* Header controls: Search & Quick Actions */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
        <div style={{
          position: 'relative',
          flex: '1 1 240px',
          maxWidth: '380px'
        }}>
          <Search size={14} color="#8FA3B8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filtrer par nom ou rôle..."
            style={{
              width: '100%',
              padding: '8px 12px 8px 34px',
              borderRadius: '8px',
              background: 'rgba(6, 17, 31, 0.7)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: '#F0F4F8',
              fontSize: '12.5px',
              outline: 'none',
              transition: 'border-color 0.2s',
            }}
            onFocus={(e) => (e.target.style.borderColor = '#00E5C8')}
            onBlur={(e) => (e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)')}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            onClick={handleSelectAll}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              background: 'rgba(0, 229, 200, 0.08)',
              border: '1px solid rgba(0, 229, 200, 0.25)',
              color: '#00E5C8',
              fontSize: '11.5px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              transition: 'all 0.15s'
            }}
          >
            <Check size={12} />
            Tout sélectionner ({availableAgents.length})
          </button>
          {selectedAgentIds.length > 0 && (
            <button
              type="button"
              onClick={handleDeselectAll}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: '#8FA3B8',
                fontSize: '11.5px',
                cursor: 'pointer',
                transition: 'all 0.15s'
              }}
            >
              Désélectionner
            </button>
          )}
        </div>
      </div>

      {/* Grid of selectable agent cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
        gap: '12px',
        maxHeight: '340px',
        overflowY: 'auto',
        paddingRight: '4px'
      }}>
        {filteredAgents.map((agent: any) => {
          const isSelected = isAgentSelected(agent);
          const isSourcing = agent.run_mode === 'sourcing' || agent.run_mode === 'sourcing_agent';
          const icon = isSourcing ? '🕵️' : '🎯';
          const accent = isSourcing ? '#00D1B2' : '#E01A59';
          const iconBg = isSourcing ? 'rgba(0, 209, 178, 0.14)' : 'rgba(224, 26, 89, 0.14)';
          const roleLabel = isSourcing ? 'Agent de Sourcing' : 'Agent de Prospection';

          return (
            <div
              key={agent.uuid || agent.agent_id || agent.agent_name}
              onClick={() => toggleAgent(agent)}
              style={{
                padding: '12px 14px',
                borderRadius: '10px',
                background: isSelected ? 'rgba(0, 229, 200, 0.08)' : 'rgba(6, 17, 31, 0.65)',
                border: `1.5px solid ${isSelected ? '#00E5C8' : 'rgba(255, 255, 255, 0.08)'}`,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                transition: 'all 0.18s ease',
                boxShadow: isSelected ? '0 0 16px rgba(0, 229, 200, 0.15)' : 'none'
              }}
            >
              {/* Checkbox */}
              <div
                style={{
                  width: '20px',
                  height: '20px',
                  borderRadius: '5px',
                  border: `1.5px solid ${isSelected ? '#00E5C8' : 'rgba(255,255,255,0.3)'}`,
                  background: isSelected ? '#00E5C8' : 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  transition: 'all 0.15s ease'
                }}
              >
                {isSelected && <Check size={14} color="#06111F" strokeWidth={3} />}
              </div>

              {/* Agent Icon */}
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  background: iconBg,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '15px',
                  flexShrink: 0
                }}
              >
                {icon}
              </div>

              {/* Agent Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontWeight: 600,
                  color: isSelected ? '#FFFFFF' : '#F0F4F8',
                  fontSize: '13px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}>
                  {agent.agent_name || agent.nom}
                </div>
                <div style={{
                  fontSize: '11px',
                  color: isSelected ? '#00E5C8' : '#8FA3B8',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  marginTop: '2px',
                  fontWeight: 500
                }}>
                  <span style={{
                    width: 5, height: 5, borderRadius: '50%',
                    background: accent,
                    display: 'inline-block'
                  }} />
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {roleLabel}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Counter summary */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '8px 12px',
        borderRadius: '8px',
        background: 'rgba(255, 255, 255, 0.02)',
        border: '1px solid rgba(255, 255, 255, 0.05)',
        fontSize: '12px',
        color: '#8FA3B8'
      }}>
        <span>
          <strong style={{ color: selectedAgentIds.length > 0 ? '#00E5C8' : '#F0F4F8' }}>{selectedAgentIds.length}</strong> agent(s) sélectionné(s) pour la supervision
        </span>
        {selectedAgentIds.length === 0 && (
          <span style={{ color: '#FFB800', fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <span>⚠</span> Aucun agent sélectionné (supervision globale vide)
          </span>
        )}
      </div>
    </div>
  );
};
