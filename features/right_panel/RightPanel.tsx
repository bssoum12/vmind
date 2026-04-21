"use client";

import React from 'react';
import { MiniKpi } from '../../components/ui/MiniKpi';
import { AGENTS } from '../../shared/constants/data';
import { LogEntry } from '../../shared/types';

interface RightPanelProps {
  logs: LogEntry[];
  onInsertPrompt: (text: string) => void;
  activeAgentId?: string;
}

export const RightPanel: React.FC<RightPanelProps> = ({ logs, onInsertPrompt, activeAgentId }) => {
  return (
    <div className="right-panel">
      {/* KPIs Live */}
      <div className="rp-section">
        <div className="rp-title">KPIs Temps Réel</div>
        <MiniKpi label="Trésorerie" dotColor="var(--green)" val="842K TND" delta="▲ +3.2%" deltaType="up" />
        <MiniKpi label="Impayés" dotColor="var(--red)" val="218K TND" delta="▲ +8 clients" deltaType="warning" />
        <MiniKpi label="Dossiers Ouverts" dotColor="var(--amber)" val="43" delta="⚠ 7 en retard" deltaType="warning" />
        <MiniKpi label="CA Mois" dotColor="var(--cyan)" val="1.847M" delta="▲ +12.3%" deltaType="up" />
        <MiniKpi label="BL Non Facturés" dotColor="var(--purple)" val="14" delta="▼ à traiter" deltaType="down" />

        <div style={{ marginTop: '12px', fontSize: '9px', color: 'var(--muted)', fontFamily: 'var(--font-mono)', marginBottom: '4px' }}>
          CA 6 DERNIERS MOIS (TND)
        </div>
        <div className="mini-chart">
          <div className="bar" style={{ height: '55%' }}></div>
          <div className="bar" style={{ height: '70%' }}></div>
          <div className="bar" style={{ height: '60%' }}></div>
          <div className="bar" style={{ height: '80%' }}></div>
          <div className="bar" style={{ height: '65%' }}></div>
          <div className="bar current" style={{ height: '100%' }}></div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '8px', color: 'var(--muted)', fontFamily: 'var(--font-mono)', marginTop: '3px' }}>
          <span>Nov</span><span>Déc</span><span>Jan</span><span>Fév</span><span>Mar</span><span>Avr ●</span>
        </div>
      </div>

      {/* Agents Status */}
      <div className="rp-section">
        <div className="rp-title">État des Agents</div>
        {Object.values(AGENTS).map((agent) => (
          <div key={agent.id} className="agent-row" onClick={() => onInsertPrompt(`Analyse situation ${agent.name}`)}>
            <div className="agent-ico" style={{
              background: agent.bgColor,
              color: agent.color,
              fontSize: '9px'
            }}>
              {agent.icon}
            </div>
            <div className="agent-info">
              <div className="agent-name-sm">{agent.name}</div>
              <div className="agent-desc">{agent.desc}</div>
            </div>
            <div className={`agent-state ${activeAgentId === agent.id ? 'on' : 'idle'}`}>
              {activeAgentId === agent.id ? '● ACTIF' : '◌ VEILLE'}
            </div>
          </div>
        ))}
      </div>

      {/* Activity Log */}
      <div className="rp-section">
        <div className="rp-title">Journal d'Activité</div>
        <div id="activity-log">
          {logs.map((log) => (
            <div key={log.id} className="log-item">
              <div className="log-time">{log.time}</div>
              <div className="log-text"><span>{log.agent}</span> — {log.action}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
