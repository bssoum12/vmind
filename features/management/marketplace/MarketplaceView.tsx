'use client';

import React from 'react';
import { Button } from '@/shared/management/components/Button';
import { AGENT_TEMPLATES } from '@/shared/management/constants/data';

interface MarketplaceViewProps {
  onDeploy: (templateId: string) => void;
  activeCategory: string;
  onSelectCategory: (category: string) => void;
}

export const MarketplaceView: React.FC<MarketplaceViewProps> = ({ onDeploy, activeCategory, onSelectCategory }) => {
  const [activeTab, setActiveTab] = React.useState('all');
  const [searchQuery, setSearchQuery] = React.useState('');
  const allCategories = ['all', ...Array.from(new Set(AGENT_TEMPLATES.flatMap(a => a.category.split(' · '))))].sort();

  let filteredAgents = AGENT_TEMPLATES;

  // Category filter
  if (activeCategory !== 'all') {
    filteredAgents = filteredAgents.filter(a => a.category.includes(activeCategory));
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
    <div id="view-market" className="anim">
      <div className="page-head">
        <div>
          <div className="page-title">Marketplace d&apos;Agents {activeCategory !== 'all' && `· ${activeCategory}`}</div>
          <div className="page-sub">Choisissez un modèle, configurez-le et déployez votre employé virtuel en minutes</div>
        </div>
        <div className="page-actions">
          <input 
            type="file" 
            id="import-model" 
            style={{ display: 'none' }} 
            accept=".json,.vmind"
            onChange={(e) => alert('Modèle sélectionné : ' + e.target.files?.[0].name)} 
          />
          <Button onClick={() => document.getElementById('import-model')?.click()}>
            📤 Importer un modèle
          </Button>
          <Button variant="primary" onClick={() => onDeploy('custom')}>
            ＋ Créer sur mesure
          </Button>
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
          <span style={{ color: 'var(--muted)', fontSize: '14px' }}>🔍</span>
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
            <div className="section-title">🔥 Agents Populaires</div>
            <div className="agent-grid">
              {popularAgents.map((agent) => (
                <div 
                  key={agent.id} 
                  className="atcard" 
                  style={{ '--card-accent': agent.accent, '--card-iconbg': agent.iconBg } as React.CSSProperties}
                  onClick={() => onDeploy(agent.id)}
                >
                  <div className="atcard-head">
                    <div className="atcard-icon">{agent.icon}</div>
                    <div className="atcard-badges">
                      {agent.tag === 'pop' && <span className="atcard-tag pop">★ POPULAIRE</span>}
                      {agent.tag === 'new' && <span className="atcard-tag new">NOUVEAU</span>}
                      {agent.tag === 'beta' && <span className="atcard-tag beta">BÊTA</span>}
                    </div>
                  </div>
                  <div className="atcard-name">{agent.name}</div>
                  <div className="atcard-desc">{agent.description}</div>
                  <div className="atcard-meta">
                    <span className="atcard-cat">{agent.category}</span>
                    <button className="atcard-deploy">Déployer →</button>
                  </div>
                  <div style={{ marginTop: '10px', fontSize: '9px', color: 'var(--muted)', fontFamily: 'var(--FM)' }}>
                    🔗 {agent.connections.join(' · ')} &nbsp;·&nbsp; ⚡ {agent.deployments} déploiements
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {otherAgents.length > 0 && (
          <>
            <div className="section-title">📋 Autres Modèles Disponibles</div>
            <div className="agent-grid">
              {otherAgents.map((agent) => (
                <div 
                  key={agent.id} 
                  className="atcard" 
                  style={{ '--card-accent': agent.accent, '--card-iconbg': agent.iconBg } as React.CSSProperties}
                  onClick={() => onDeploy(agent.id)}
                >
                  <div className="atcard-head">
                    <div className="atcard-icon">{agent.icon}</div>
                    <div className="atcard-badges">
                      {agent.tag === 'pop' && <span className="atcard-tag pop">★ POPULAIRE</span>}
                      {agent.tag === 'new' && <span className="atcard-tag new">NOUVEAU</span>}
                      {agent.tag === 'beta' && <span className="atcard-tag beta">BÊTA</span>}
                    </div>
                  </div>
                  <div className="atcard-name">{agent.name}</div>
                  <div className="atcard-desc">{agent.description}</div>
                  <div className="atcard-meta">
                    <span className="atcard-cat">{agent.category}</span>
                    <button className="atcard-deploy">Déployer →</button>
                  </div>
                  <div style={{ marginTop: '10px', fontSize: '9px', color: 'var(--muted)', fontFamily: 'var(--FM)' }}>
                    🔗 {agent.connections.join(' · ')} &nbsp;·&nbsp; ⚡ {agent.deployments} déploiements
                  </div>
                </div>
              ))}
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
