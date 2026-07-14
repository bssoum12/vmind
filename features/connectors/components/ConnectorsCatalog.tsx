'use client';

import React from 'react';
import { Database, Layout, Globe, Search, Plus } from 'lucide-react';

interface ConnectorsCatalogProps {
  activeConnector: string;
  onSelectConnector: (connector: string) => void;
  tralisConnected?: boolean;
}

export const ConnectorsCatalog: React.FC<ConnectorsCatalogProps> = ({ activeConnector, onSelectConnector, tralisConnected = false }) => {
  const [filter, setFilter] = React.useState<'all' | 'connected' | 'disconnected'>('all');

  const categories = [
    {
      title: 'ERP & Métiers',
      items: [
        { id: 'tralis', name: 'TraLIS MCP', icon: <Database size={16} />, connected: tralisConnected },
        { id: 'odoo', name: 'Odoo MCP', icon: <Layout size={16} />, connected: false },
      ]
    },
    {
      title: 'Web & Recherche',
      items: [
        { id: 'web', name: 'Recherche Web', icon: <Globe size={16} />, connected: false },
      ]
    }
  ];

  const filteredCategories = categories.map(cat => {
    const items = cat.items.filter(item => {
      if (filter === 'connected') return item.connected;
      if (filter === 'disconnected') return !item.connected;
      return true;
    });
    return { ...cat, items };
  }).filter(cat => cat.items.length > 0);

  return (
    <div style={{
      width: '280px',
      borderRight: '1px solid rgba(255,255,255,0.05)',
      background: 'rgba(5, 12, 24, 0.4)',
      display: 'flex',
      flexDirection: 'column',
      padding: '24px 16px'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px', padding: '0 8px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: '#fff' }}>Connecteurs</h2>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button style={{ background: 'transparent', border: 'none', color: '#8FA3B8', cursor: 'pointer' }}><Search size={16} /></button>
          <button style={{ background: 'transparent', border: 'none', color: '#8FA3B8', cursor: 'pointer' }}><Plus size={16} /></button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '16px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '12px', marginBottom: '24px', padding: '0 8px' }}>
        {[
          { id: 'all', label: 'Tous' },
          { id: 'connected', label: 'Connecté' },
          { id: 'disconnected', label: 'Non connecté' }
        ].map(tab => (
          <span
            key={tab.id}
            onClick={() => setFilter(tab.id as any)}
            style={{
              fontSize: '12px',
              fontWeight: filter === tab.id ? 700 : 500,
              color: filter === tab.id ? '#00E5C8' : '#6A7E95',
              cursor: 'pointer',
              position: 'relative',
              paddingBottom: '14px',
              transition: 'color 0.2s',
            }}
          >
            {tab.label}
            {filter === tab.id && (
              <span style={{
                position: 'absolute',
                bottom: '-13px',
                left: 0,
                right: 0,
                height: '2px',
                background: '#00E5C8',
                boxShadow: '0 0 8px #00E5C8',
                borderRadius: '2px'
              }} />
            )}
          </span>
        ))}
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {filteredCategories.map((category) => (
          <div key={category.title} style={{ marginBottom: '24px' }}>
            <h3 style={{ fontSize: '11px', textTransform: 'uppercase', color: '#6A7E95', fontWeight: 700, letterSpacing: '0.05em', marginBottom: '12px', padding: '0 8px' }}>
              {category.title}
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {category.items.map(item => (
                <div
                  key={item.id}
                  onClick={() => onSelectConnector(item.id)}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    background: activeConnector === item.id ? 'rgba(0, 229, 200, 0.1)' : 'transparent',
                    border: activeConnector === item.id ? '1px solid rgba(0, 229, 200, 0.2)' : '1px solid transparent',
                    color: activeConnector === item.id ? '#00E5C8' : '#8FA3B8',
                    transition: 'all 0.2s'
                  }}
                  onMouseOver={e => { if (activeConnector !== item.id) e.currentTarget.style.background = 'rgba(255,255,255,0.03)' }}
                  onMouseOut={e => { if (activeConnector !== item.id) e.currentTarget.style.background = 'transparent' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ 
                       display: 'flex', alignItems: 'center', justifyContent: 'center',
                       width: '24px', height: '24px', borderRadius: '6px',
                       background: 'rgba(255,255,255,0.05)'
                    }}>
                      {item.icon}
                    </div>
                    <span style={{ fontSize: '13px', fontWeight: activeConnector === item.id ? 700 : 500 }}>
                      {item.name}
                    </span>
                  </div>
                  
                  {item.connected && (
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#00E5C8', boxShadow: '0 0 5px #00E5C8' }} />
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
