'use client';

import React, { useState, useMemo } from 'react';
import { Bot, Check, Search, ArrowRight } from 'lucide-react';

export interface AgentMultiSelectProps {
  selectedAgentIds: (string | number)[];
  onChange: (selectedIds: string[]) => void;
  availableAgents: any[];
  isLoading?: boolean;
}

const isSourcingAgent = (agent: any): boolean => {
  const mode = String(agent?.run_mode || '').trim().toLowerCase();
  return mode === 'sourcing' || mode === 'sourcing_agent';
};

const getAgentCanonicalId = (agent: any): string => {
  return String(agent?.uuid || agent?.agent_id || agent?.id || agent?.agent_name || agent?.nom || '').trim();
};

const getAgentMatchKeys = (agent: any): string[] => {
  return [
    agent?.uuid,
    agent?.agent_id,
    agent?.id,
    agent?.nom,
    agent?.agent_name,
    agent?.internal_agent_id,
    agent?.sql_agent_id,
  ]
    .filter(Boolean)
    .map((k) => String(k).trim().toLowerCase());
};

export const AgentMultiSelect: React.FC<AgentMultiSelectProps> = ({
  selectedAgentIds,
  onChange,
  availableAgents,
  isLoading = false,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [hoveredAgentKey, setHoveredAgentKey] = useState<string | null>(null);

  // Normalize selected IDs set for fast, case-insensitive matching
  const selectedSet = useMemo(() => {
    return new Set(
      selectedAgentIds
        .filter((id) => id !== null && id !== undefined && id !== '')
        .map((id) => String(id).trim().toLowerCase())
    );
  }, [selectedAgentIds]);

  const isAgentSelected = (agent: any): boolean => {
    const keys = getAgentMatchKeys(agent);
    return keys.some((k) => selectedSet.has(k));
  };

  const toggleSingleAgent = (agent: any) => {
    const canonicalId = getAgentCanonicalId(agent);
    const isSelected = isAgentSelected(agent);

    if (isSelected) {
      const keysToRemove = new Set(getAgentMatchKeys(agent));
      const next = selectedAgentIds
        .map((id) => String(id))
        .filter((id) => !keysToRemove.has(id.trim().toLowerCase()));
      onChange(next);
    } else {
      const next = [...selectedAgentIds.map((id) => String(id)), canonicalId];
      onChange(Array.from(new Set(next)));
    }
  };

  const selectSourcingAndTargets = (sourcingAgent: any, targets: any[], e: React.MouseEvent) => {
    e.stopPropagation();
    const idsToAdd = [sourcingAgent, ...targets].map((a) => getAgentCanonicalId(a)).filter(Boolean);
    const next = [...selectedAgentIds.map((id) => String(id)), ...idsToAdd];
    onChange(Array.from(new Set(next)));
  };

  const handleSelectAll = () => {
    const allUuids = availableAgents.map((a) => getAgentCanonicalId(a)).filter(Boolean);
    onChange(Array.from(new Set(allUuids)));
  };

  const handleDeselectAll = () => {
    onChange([]);
  };

  // Split into Sourcing (Left) and Prospect (Right), and compute dependency maps
  const {
    sourcingAgents,
    prospectAgents,
    targetsBySourcingKey,
    sourcesByProspectKey,
  } = useMemo(() => {
    const agentByKey = new Map<string, any>();
    availableAgents.forEach((a) => {
      getAgentMatchKeys(a).forEach((k) => {
        agentByKey.set(k, a);
      });
    });

    const tMap = new Map<string, any[]>(); // sourcingCanonicalKey -> prospect agents[]
    const sMap = new Map<string, any[]>(); // prospectCanonicalKey -> sourcing agents[]

    const rawSourcing = availableAgents.filter((a) => isSourcingAgent(a));
    const rawProspect = availableAgents.filter((a) => !isSourcingAgent(a));

    for (const src of rawSourcing) {
      const srcCanonical = getAgentCanonicalId(src).toLowerCase();
      const rawTargetIds: any[] = Array.isArray(src.target_agent_ids)
        ? src.target_agent_ids
        : Array.isArray(src.config?.target_agent_ids)
        ? src.config.target_agent_ids
        : [];

      const resolvedTargets: any[] = [];
      const seen = new Set<string>();

      for (const rawId of rawTargetIds) {
        if (!rawId) continue;
        const targetAgent = agentByKey.get(String(rawId).trim().toLowerCase());
        if (targetAgent && !isSourcingAgent(targetAgent)) {
          const tCanonical = getAgentCanonicalId(targetAgent).toLowerCase();
          if (!seen.has(tCanonical)) {
            seen.add(tCanonical);
            resolvedTargets.push(targetAgent);
            const existingSources = sMap.get(tCanonical) || [];
            existingSources.push(src);
            sMap.set(tCanonical, existingSources);
          }
        }
      }

      tMap.set(srcCanonical, resolvedTargets);
    }

    // Sort Sourcing agents: those with linked targets first
    const sortedSourcing = [...rawSourcing].sort((a, b) => {
      const aLen = (tMap.get(getAgentCanonicalId(a).toLowerCase()) || []).length;
      const bLen = (tMap.get(getAgentCanonicalId(b).toLowerCase()) || []).length;
      return bLen - aLen;
    });

    // Sort Prospect agents: those fed by a Sourcing agent first
    const sortedProspect = [...rawProspect].sort((a, b) => {
      const aLen = (sMap.get(getAgentCanonicalId(a).toLowerCase()) || []).length;
      const bLen = (sMap.get(getAgentCanonicalId(b).toLowerCase()) || []).length;
      return bLen - aLen;
    });

    const q = searchQuery.toLowerCase().trim();
    const filterFn = (agent: any) => {
      if (!q) return true;
      const name = String(agent?.agent_name || agent?.nom || '').toLowerCase();
      return name.includes(q);
    };

    return {
      sourcingAgents: sortedSourcing.filter(filterFn),
      prospectAgents: sortedProspect.filter(filterFn),
      targetsBySourcingKey: tMap,
      sourcesByProspectKey: sMap,
    };
  }, [availableAgents, searchQuery]);

  // Determine which agents are highlighted due to hovering on their counterpart
  const highlightedKeys = useMemo(() => {
    const set = new Set<string>();
    if (!hoveredAgentKey) return set;

    // If hovering a Sourcing agent, highlight its linked Prospect agents
    const linkedTargets = targetsBySourcingKey.get(hoveredAgentKey) || [];
    linkedTargets.forEach((t) => set.add(getAgentCanonicalId(t).toLowerCase()));

    // If hovering a Prospect agent, highlight the Sourcing agents feeding it
    const linkedSources = sourcesByProspectKey.get(hoveredAgentKey) || [];
    linkedSources.forEach((s) => set.add(getAgentCanonicalId(s).toLowerCase()));

    return set;
  }, [hoveredAgentKey, targetsBySourcingKey, sourcesByProspectKey]);

  if (isLoading) {
    return (
      <div
        style={{
          padding: '32px',
          textAlign: 'center',
          background: 'rgba(5, 16, 30, 0.4)',
          borderRadius: '12px',
          border: '1px solid rgba(255, 255, 255, 0.05)',
          color: '#8FA3B8',
          fontSize: '13px',
        }}
      >
        <div
          className="spinner"
          style={{
            width: '28px',
            height: '28px',
            border: '2px solid rgba(0, 229, 200, 0.2)',
            borderTopColor: '#00E5C8',
            borderRadius: '50%',
            animation: 'spinRing 1s linear infinite',
            margin: '0 auto 12px',
          }}
        />
        Chargement de vos agents disponibles...
      </div>
    );
  }

  if (availableAgents.length === 0) {
    return (
      <div
        style={{
          padding: '24px',
          background: 'rgba(5, 16, 30, 0.5)',
          borderRadius: '12px',
          border: '1px dashed rgba(255, 255, 255, 0.12)',
          textAlign: 'center',
        }}
      >
        <Bot size={32} color="#8FA3B8" style={{ margin: '0 auto 12px', opacity: 0.6 }} />
        <div style={{ fontSize: '14px', fontWeight: 600, color: '#F0F4F8', marginBottom: '6px' }}>
          Aucun agent commercial actif détecté
        </div>
        <div style={{ fontSize: '12px', color: '#8FA3B8', maxWidth: '420px', margin: '0 auto', lineHeight: 1.5 }}>
          Déployez d&apos;abord un ou plusieurs agents de Prospection ou de Sourcing depuis la Marketplace afin que le
          Superviseur puisse les auditer et les coordonner.
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* Header controls: Search & Quick Actions */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
        <div
          style={{
            position: 'relative',
            flex: '1 1 240px',
            maxWidth: '380px',
          }}
        >
          <Search
            size={14}
            color="#8FA3B8"
            style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }}
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher un agent par nom..."
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
              transition: 'all 0.15s',
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
                transition: 'all 0.15s',
              }}
            >
              Désélectionner
            </button>
          )}
        </div>
      </div>

      {/* Two Clean Side-by-Side Columns: Sourcing (Left) | Prospection (Right) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '16px',
          maxHeight: '420px',
          overflowY: 'auto',
          paddingRight: '4px',
        }}
      >
        {/* LEFT COLUMN: SOURCING AGENTS */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '9px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '4px 2px',
              borderBottom: '1px solid rgba(0, 209, 178, 0.18)',
              marginBottom: '2px',
            }}
          >
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#00E5C8', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <span>🕵️</span> Agents de Sourcing ({sourcingAgents.length})
            </span>
            <span style={{ fontSize: '10.5px', color: '#64748B' }}>Acquisition</span>
          </div>

          {sourcingAgents.length === 0 ? (
            <div style={{ padding: '18px', borderRadius: '9px', background: 'rgba(6, 17, 31, 0.4)', border: '1px dashed rgba(255,255,255,0.07)', color: '#64748B', fontSize: '12px', textAlign: 'center' }}>
              Aucun agent de Sourcing
            </div>
          ) : (
            sourcingAgents.map((agent) => {
              const canonicalKey = getAgentCanonicalId(agent).toLowerCase();
              const isSelected = isAgentSelected(agent);
              const isHighlighted = highlightedKeys.has(canonicalKey);
              const linkedTargets = targetsBySourcingKey.get(canonicalKey) || [];
              const unselectedTargetsCount = linkedTargets.filter((t) => !isAgentSelected(t)).length;
              const agentName = agent.agent_name || agent.nom || 'Agent de Sourcing';

              return (
                <div
                  key={canonicalKey}
                  onClick={() => toggleSingleAgent(agent)}
                  onMouseEnter={() => setHoveredAgentKey(canonicalKey)}
                  onMouseLeave={() => setHoveredAgentKey(null)}
                  title={agentName}
                  style={{
                    padding: '11px 13px',
                    borderRadius: '10px',
                    background: isHighlighted
                      ? 'rgba(0, 229, 200, 0.14)'
                      : isSelected
                      ? 'rgba(0, 229, 200, 0.08)'
                      : 'rgba(6, 17, 31, 0.65)',
                    border: `1.5px solid ${
                      isHighlighted || isSelected ? '#00E5C8' : 'rgba(255, 255, 255, 0.08)'
                    }`,
                    boxShadow: isHighlighted ? '0 0 14px rgba(0, 229, 200, 0.18)' : 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '10px',
                    transition: 'all 0.16s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>
                    {/* Checkbox */}
                    <div
                      style={{
                        width: '18px',
                        height: '18px',
                        borderRadius: '5px',
                        border: `1.5px solid ${isSelected ? '#00E5C8' : 'rgba(255,255,255,0.3)'}`,
                        background: isSelected ? '#00E5C8' : 'transparent',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      {isSelected && <Check size={12} color="#06111F" strokeWidth={3} />}
                    </div>

                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div
                        style={{
                          fontWeight: 600,
                          color: isSelected || isHighlighted ? '#FFFFFF' : '#F0F4F8',
                          fontSize: '13px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {agentName}
                      </div>
                      <div style={{ fontSize: '11px', color: '#8FA3B8', marginTop: '2px' }}>
                        {linkedTargets.length > 0
                          ? `Alimente ${linkedTargets.length} prospecteur${linkedTargets.length > 1 ? 's' : ''}`
                          : 'Aucune cible liée'}
                      </div>
                    </div>
                  </div>

                  {/* Quick 1-click button to also select linked Prospect targets */}
                  {linkedTargets.length > 0 && unselectedTargetsCount > 0 && (
                    <button
                      type="button"
                      onClick={(e) => selectSourcingAndTargets(agent, linkedTargets, e)}
                      title="Sélectionner cet agent ainsi que ses agents de prospection cibles"
                      style={{
                        padding: '4px 8px',
                        borderRadius: '6px',
                        background: 'rgba(0, 229, 200, 0.1)',
                        border: '1px solid rgba(0, 229, 200, 0.3)',
                        color: '#00E5C8',
                        fontSize: '10.5px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        whiteSpace: 'nowrap',
                        flexShrink: 0,
                      }}
                    >
                      + Ses {linkedTargets.length} cible{linkedTargets.length > 1 ? 's' : ''}
                      <ArrowRight size={10} />
                    </button>
                  )}

                  {linkedTargets.length > 0 && unselectedTargetsCount === 0 && (
                    <span
                      style={{
                        fontSize: '10.5px',
                        color: '#00E5C8',
                        fontWeight: 600,
                        padding: '3px 7px',
                        borderRadius: '5px',
                        background: 'rgba(0, 229, 200, 0.08)',
                        whiteSpace: 'nowrap',
                        flexShrink: 0,
                      }}
                    >
                      ✓ Cibles liées
                    </span>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* RIGHT COLUMN: PROSPECT AGENTS */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '9px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '4px 2px',
              borderBottom: '1px solid rgba(224, 26, 89, 0.22)',
              marginBottom: '2px',
            }}
          >
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#FF6B9D', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <span>🎯</span> Agents de Prospection ({prospectAgents.length})
            </span>
            <span style={{ fontSize: '10.5px', color: '#64748B' }}>Qualification & Approche</span>
          </div>

          {prospectAgents.length === 0 ? (
            <div style={{ padding: '18px', borderRadius: '9px', background: 'rgba(6, 17, 31, 0.4)', border: '1px dashed rgba(255,255,255,0.07)', color: '#64748B', fontSize: '12px', textAlign: 'center' }}>
              Aucun agent de Prospection
            </div>
          ) : (
            prospectAgents.map((agent) => {
              const canonicalKey = getAgentCanonicalId(agent).toLowerCase();
              const isSelected = isAgentSelected(agent);
              const isHighlighted = highlightedKeys.has(canonicalKey);
              const feedingSources = sourcesByProspectKey.get(canonicalKey) || [];
              const agentName = agent.agent_name || agent.nom || 'Agent de Prospection';

              return (
                <div
                  key={canonicalKey}
                  onClick={() => toggleSingleAgent(agent)}
                  onMouseEnter={() => setHoveredAgentKey(canonicalKey)}
                  onMouseLeave={() => setHoveredAgentKey(null)}
                  title={agentName}
                  style={{
                    padding: '11px 13px',
                    borderRadius: '10px',
                    background: isHighlighted
                      ? 'rgba(0, 229, 200, 0.14)'
                      : isSelected
                      ? 'rgba(0, 229, 200, 0.08)'
                      : 'rgba(6, 17, 31, 0.65)',
                    border: `1.5px solid ${
                      isHighlighted || isSelected ? '#00E5C8' : 'rgba(255, 255, 255, 0.08)'
                    }`,
                    boxShadow: isHighlighted ? '0 0 14px rgba(0, 229, 200, 0.18)' : 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '10px',
                    transition: 'all 0.16s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>
                    {/* Checkbox */}
                    <div
                      style={{
                        width: '18px',
                        height: '18px',
                        borderRadius: '5px',
                        border: `1.5px solid ${isSelected ? '#00E5C8' : 'rgba(255,255,255,0.3)'}`,
                        background: isSelected ? '#00E5C8' : 'transparent',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      {isSelected && <Check size={12} color="#06111F" strokeWidth={3} />}
                    </div>

                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div
                        style={{
                          fontWeight: 600,
                          color: isSelected || isHighlighted ? '#FFFFFF' : '#F0F4F8',
                          fontSize: '13px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {agentName}
                      </div>
                      <div
                        style={{
                          fontSize: '11px',
                          color: isHighlighted ? '#00E5C8' : '#8FA3B8',
                          marginTop: '2px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {feedingSources.length > 0
                          ? `Alimenté par ${feedingSources.map((s) => s.agent_name || s.nom).join(', ')}`
                          : 'Agent autonome'}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Counter summary */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 12px',
          borderRadius: '8px',
          background: 'rgba(255, 255, 255, 0.02)',
          border: '1px solid rgba(255, 255, 255, 0.05)',
          fontSize: '12px',
          color: '#8FA3B8',
        }}
      >
        <span>Agents supervisés sélectionnés :</span>
        <span style={{ fontWeight: 700, color: selectedAgentIds.length > 0 ? '#00E5C8' : '#FF4757' }}>
          {selectedAgentIds.length} / {availableAgents.length}
        </span>
      </div>
    </div>
  );
};
