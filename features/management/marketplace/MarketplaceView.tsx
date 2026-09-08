'use client';

import React from 'react';
import { Button } from '@/shared/management/components/Button';
import { AGENT_TEMPLATES } from '@/shared/management/constants/data';
import { VMindGuide, VMindGuideArrow } from '@/shared/management/components/VMindGuide';
import { CyberIcon } from '@/shared/management/components/CyberIcon';
import { getMarketplaceStats } from '@/shared/api/n8n-api';

interface MarketplaceViewProps {
  onDeploy: (templateId: string) => void;
  activeCategory: string;
  onSelectCategory: (category: string) => void;
}

export const MarketplaceView: React.FC<MarketplaceViewProps> = ({ onDeploy, activeCategory, onSelectCategory }) => {
  const [activeTab, setActiveTab] = React.useState('all');
  const [searchQuery, setSearchQuery] = React.useState('');
  const [highlightedTemplateId, setHighlightedTemplateId] = React.useState<string | null>(null);
  const [linkedProspectUuid, setLinkedProspectUuid] = React.useState<string | null>(null);
  const [templateDeployments, setTemplateDeployments] = React.useState<Record<string, number>>({});
  const parentCategories = Array.from(new Set(AGENT_TEMPLATES.map(a => a.category.split(' · ')[0]))).sort();
  const allCategories = ['all', ...parentCategories];

  React.useEffect(() => {
    getMarketplaceStats()
      .then(res => {
        if (res.ok && res.templateDeployments) {
          setTemplateDeployments(res.templateDeployments);
        }
      })
      .catch(() => {});

    if (typeof window !== 'undefined') {
      const targetTemplate = sessionStorage.getItem('vmind_guide_target_marketplace');
      const prospectUuid = sessionStorage.getItem('vmind_guide_link_prospect_uuid');
      if (targetTemplate) {
        sessionStorage.removeItem('vmind_guide_target_marketplace');
        setHighlightedTemplateId(targetTemplate);
        if (prospectUuid) {
          setLinkedProspectUuid(prospectUuid);
        }
      }
    }
  }, []);

  const getDynamicDeployments = (agentId: string, baseDeployments: number) => {
    return templateDeployments[agentId] || 0;
  };

  const handleDeployTarget = (templateId: string) => {
    if (linkedProspectUuid && typeof window !== 'undefined') {
      sessionStorage.setItem('vmind_editing_agent', JSON.stringify({
        run_mode: templateId,
        target_agent_ids: [linkedProspectUuid],
        config: {
          target_agent_ids: [linkedProspectUuid]
        }
      }));
      sessionStorage.removeItem('vmind_guide_link_prospect_uuid');
    }
    setHighlightedTemplateId(null);
    onDeploy(templateId);
  };
  
  let filteredAgents = AGENT_TEMPLATES;

  // Category filter: supports "Commercial" (parent) and "Commercial · Ventes" (full subcategory)
  if (activeCategory !== 'all') {
    filteredAgents = filteredAgents.filter(a =>
      a.category === activeCategory ||
      a.category.startsWith(activeCategory + ' ·') ||
      a.category.includes(activeCategory)
    );
  }

  // Tab filter / sort
  if (activeTab === 'new') {
    filteredAgents = filteredAgents.filter(a => a.tag === 'new');
  } else if (activeTab === 'pop') {
    filteredAgents = filteredAgents.filter(a => a.tag === 'pop');
  } else if (activeTab === 'used') {
    filteredAgents = [...filteredAgents].sort((a, b) => b.deployments - a.deployments);
  }

  // Search filter (dynamic)
  if (searchQuery.trim() !== '') {
    const q = searchQuery.toLowerCase();
    filteredAgents = filteredAgents.filter(a => 
      a.name.toLowerCase().includes(q) ||
      a.category.toLowerCase().includes(q) ||
      a.description.toLowerCase().includes(q) ||
      a.connections.some(c => c.toLowerCase().includes(q))
    );
  }

  const popularAgents = filteredAgents.slice(0, 6);
  const otherAgents = filteredAgents.slice(6);

  return (
    <div id="view-market" className="anim" style={{ position: 'relative' }}>
      {/* ── Guided Focus Backdrop Overlay ── */}
      {highlightedTemplateId && (
        <div
          onClick={() => setHighlightedTemplateId(null)}
          style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0, 0, 0, 0.82)',
            backdropFilter: 'blur(3px)',
            zIndex: 10000,
            cursor: 'pointer'
          }}
        />
      )}

      {/* ── Guided Assistant Popup in Marketplace ── */}
      {highlightedTemplateId && (
        <VMindGuide
          isOpen={!!highlightedTemplateId}
          title="Modèle : Agent de Sourcing"
          message="Voici l'Agent de Sourcing dans votre Marketplace ! Cliquez directement sur cette carte ou sur 'Déployer' pour le configurer et l'associer à votre agent de prospection pour un autopilot 100% autonome."
          mood="convinced"
          showBackdrop={true}
          onClose={() => setHighlightedTemplateId(null)}
        >
          <div className="vmind-guide-actions">
            <button
              type="button"
              className="vmind-guide-btn-primary"
              onClick={() => handleDeployTarget(highlightedTemplateId)}
            >
              <CyberIcon name="zap" size={13} color="currentColor" />
              <span>Déployer & Lier Maintenant</span>
              <CyberIcon name="arrow-right" size={13} color="currentColor" />
            </button>
            <button
              type="button"
              className="vmind-guide-btn-secondary"
              onClick={() => setHighlightedTemplateId(null)}
            >
              Fermer
            </button>
          </div>
        </VMindGuide>
      )}

      <div className="page-head">
        <div>
          <div className="page-title">Marketplace d&apos;Agents {activeCategory !== 'all' && `· ${activeCategory}`}</div>
          <div className="page-sub">Choisissez un modèle, configurez-le et déployez votre employé virtuel en minutes</div>
        </div>
      </div>
      <div className="tabs-bar">
        <div className={`tab ${activeTab === 'all' ? 'active' : ''}`} onClick={() => setActiveTab('all')}>Tous les modèles</div>
        <div className={`tab ${activeTab === 'new' ? 'active' : ''}`} onClick={() => setActiveTab('new')}>Nouveautés</div>
        <div className={`tab ${activeTab === 'used' ? 'active' : ''}`} onClick={() => setActiveTab('used')}>Plus utilisés</div>
        <div className={`tab ${activeTab === 'pop' ? 'active' : ''}`} onClick={() => setActiveTab('pop')}>Recommandés</div>
      </div>
      <div className="scroll">
        <div className="market-search">
          <span style={{ color: 'var(--muted)', display: 'inline-flex', alignItems: 'center' }}>
            <CyberIcon name="search" size={15} color="var(--muted)" />
          </span>
          <input 
            type="text" 
            placeholder="Rechercher par nom, description, ERP (Sage, Odoo...), canal (WhatsApp, Email)..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderLeft: '1px solid var(--border)', paddingLeft: '16px' }}>
            <span style={{ fontSize: '11px', color: 'var(--muted)', whiteSpace: 'nowrap' }}>Filtrer par :</span>
            <select 
              className="form-input" 
              style={{ width: 'auto', padding: '4px 10px', height: '32px', fontSize: '12px' }}
              value={activeCategory}
              onChange={(e) => onSelectCategory(e.target.value)}
            >
              {allCategories.map(cat => (
                <option key={cat} value={cat}>{cat === 'all' ? 'Toutes les catégories' : cat}</option>
              ))}
            </select>
          </div>
        </div>

        {popularAgents.length > 0 && (
          <>
            <div className="section-title" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <CyberIcon name="flame" size={16} color="#FF6B00" />
              <span>Agents Populaires</span>
            </div>
            <div className="agent-grid">
              {popularAgents.map((agent) => {
                const isHighlighted = highlightedTemplateId === agent.id;
                return (
                  <div 
                    key={agent.id} 
                    className="atcard" 
                    style={{
                      '--card-accent': agent.accent,
                      '--card-iconbg': agent.iconBg,
                      position: isHighlighted ? 'relative' : undefined,
                      zIndex: isHighlighted ? 10001 : undefined,
                      boxShadow: isHighlighted ? '0 0 0 4px rgba(0, 229, 200, 0.95), 0 16px 48px rgba(0, 229, 200, 0.35)' : undefined,
                      background: isHighlighted ? 'linear-gradient(165deg, rgba(8, 24, 44, 0.98) 0%, rgba(4, 14, 28, 0.99) 100%)' : undefined,
                      transform: isHighlighted ? 'scale(1.03)' : undefined,
                      transition: 'all 0.25s ease',
                      cursor: 'pointer',
                    } as React.CSSProperties}
                    onClick={() => handleDeployTarget(agent.id)}
                  >
                    {isHighlighted && (
                      <VMindGuideArrow
                        direction="down"
                        color="#00E5C8"
                        style={{
                          position: 'absolute',
                          top: '-48px',
                          left: '50%',
                          transform: 'translateX(-50%)',
                          zIndex: 10002
                        }}
                      />
                    )}
                    <div className="atcard-head">
                      <div className="atcard-icon">{agent.icon}</div>
                      <div className="atcard-badges">
                        {isHighlighted && (
                          <span className="atcard-tag new" style={{ background: '#00E5C8', color: '#04101E', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            <CyberIcon name="zap" size={10} color="#04101E" />
                            CLIQUEZ ICI
                          </span>
                        )}
                        {agent.tag === 'pop' && (
                          <span className="atcard-tag pop" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            <CyberIcon name="star" size={9} color="#FFB800" />
                            POPULAIRE
                          </span>
                        )}
                        {agent.tag === 'new' && !isHighlighted && <span className="atcard-tag new">NOUVEAU</span>}
                        {agent.tag === 'beta' && <span className="atcard-tag beta">BÊTA</span>}
                      </div>
                    </div>
                    <div className="atcard-name">{agent.name}</div>
                    <div className="atcard-desc">{agent.description}</div>
                    <div className="atcard-meta">
                      <span className="atcard-cat">{agent.category}</span>
                      <button 
                        className="atcard-deploy"
                        style={isHighlighted ? {
                          background: 'linear-gradient(135deg, #00E5C8 0%, #00B4D8 100%)',
                          color: '#04101E',
                          fontWeight: 800,
                          boxShadow: '0 0 14px rgba(0, 229, 200, 0.6)'
                        } : undefined}
                      >
                        {isHighlighted ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                            <CyberIcon name="zap" size={12} color="#04101E" />
                            Déployer & Lier
                            <CyberIcon name="arrow-right" size={12} color="#04101E" />
                          </span>
                        ) : (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            Déployer
                            <CyberIcon name="arrow-right" size={12} color="currentColor" />
                          </span>
                        )}
                      </button>
                    </div>
                    <div style={{ marginTop: '10px', fontSize: '9px', color: 'var(--muted)', fontFamily: 'var(--FM)', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <CyberIcon name="link" size={10} color="var(--muted)" />
                        {agent.connections.join(' · ')}
                      </span>
                      <span>·</span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <CyberIcon name="zap" size={10} color="#00E5C8" />
                        {getDynamicDeployments(agent.id, agent.deployments)} déploiements
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {otherAgents.length > 0 && (
          <>
            <div className="section-title" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <CyberIcon name="sparkles" size={16} color="#00E5C8" />
              <span>Autres Modèles Disponibles</span>
            </div>
            <div className="agent-grid">
              {otherAgents.map((agent) => {
                const isHighlighted = highlightedTemplateId === agent.id;
                return (
                  <div 
                    key={agent.id} 
                    className="atcard" 
                    style={{
                      '--card-accent': agent.accent,
                      '--card-iconbg': agent.iconBg,
                      position: isHighlighted ? 'relative' : undefined,
                      zIndex: isHighlighted ? 10001 : undefined,
                      boxShadow: isHighlighted ? '0 0 0 4px rgba(0, 229, 200, 0.95), 0 16px 48px rgba(0, 229, 200, 0.35)' : undefined,
                      background: isHighlighted ? 'linear-gradient(165deg, rgba(8, 24, 44, 0.98) 0%, rgba(4, 14, 28, 0.99) 100%)' : undefined,
                      transform: isHighlighted ? 'scale(1.03)' : undefined,
                      transition: 'all 0.25s ease',
                      cursor: 'pointer',
                    } as React.CSSProperties}
                    onClick={() => handleDeployTarget(agent.id)}
                  >
                    {isHighlighted && (
                      <VMindGuideArrow
                        direction="down"
                        color="#00E5C8"
                        style={{
                          position: 'absolute',
                          top: '-48px',
                          left: '50%',
                          transform: 'translateX(-50%)',
                          zIndex: 10002
                        }}
                      />
                    )}
                    <div className="atcard-head">
                      <div className="atcard-icon">{agent.icon}</div>
                      <div className="atcard-badges">
                        {isHighlighted && (
                          <span className="atcard-tag new" style={{ background: '#00E5C8', color: '#04101E', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            <CyberIcon name="zap" size={10} color="#04101E" />
                            CLIQUEZ ICI
                          </span>
                        )}
                        {agent.tag === 'pop' && (
                          <span className="atcard-tag pop" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            <CyberIcon name="star" size={9} color="#FFB800" />
                            POPULAIRE
                          </span>
                        )}
                        {agent.tag === 'new' && !isHighlighted && <span className="atcard-tag new">NOUVEAU</span>}
                        {agent.tag === 'beta' && <span className="atcard-tag beta">BÊTA</span>}
                      </div>
                    </div>
                    <div className="atcard-name">{agent.name}</div>
                    <div className="atcard-desc">{agent.description}</div>
                    <div className="atcard-meta">
                      <span className="atcard-cat">{agent.category}</span>
                      <button 
                        className="atcard-deploy"
                        style={isHighlighted ? {
                          background: 'linear-gradient(135deg, #00E5C8 0%, #00B4D8 100%)',
                          color: '#04101E',
                          fontWeight: 800,
                          boxShadow: '0 0 14px rgba(0, 229, 200, 0.6)'
                        } : undefined}
                      >
                        {isHighlighted ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                            <CyberIcon name="zap" size={12} color="#04101E" />
                            Déployer & Lier
                            <CyberIcon name="arrow-right" size={12} color="#04101E" />
                          </span>
                        ) : (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            Déployer
                            <CyberIcon name="arrow-right" size={12} color="currentColor" />
                          </span>
                        )}
                      </button>
                    </div>
                    <div style={{ marginTop: '10px', fontSize: '9px', color: 'var(--muted)', fontFamily: 'var(--FM)', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <CyberIcon name="link" size={10} color="var(--muted)" />
                        {agent.connections.join(' · ')}
                      </span>
                      <span>·</span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <CyberIcon name="zap" size={10} color="#00E5C8" />
                        {getDynamicDeployments(agent.id, agent.deployments)} déploiements
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {filteredAgents.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--muted)' }}>
            Aucun modèle d&apos;agent trouvé dans cette catégorie.
          </div>
        )}
      </div>
    </div>
  );
};
