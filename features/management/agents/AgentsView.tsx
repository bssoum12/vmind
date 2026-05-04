'use client';

import React from 'react';
import { MY_AGENTS } from '@/shared/management/constants/data';

interface AgentsViewProps {
  onNavigate: (view: string) => void;
  onConfigure: (templateId: string) => void;
}

export const AgentsView: React.FC<AgentsViewProps> = ({ onNavigate, onConfigure }) => {
  return (
    <div id="view-agents" className="anim">
      <div className="page-head">
        <div>
          <div className="page-title">Mes Agents Actifs</div>
          <div className="page-sub">Gérez et surveillez vos employés virtuels en temps réel</div>
        </div>
        <div className="page-actions">
          <button className="btn" onClick={() => onNavigate('reports')}>📊 Rapports consolidés</button>
        </div>
      </div>
      <div className="scroll">
        <div className="agents-table-wrap">
          <table className="agents-table">
            <thead>
              <tr>
                <th>Agent</th>
                <th>Type</th>
                <th>Statut</th>
                <th>Progression</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {MY_AGENTS.map((agent) => (
                <tr key={agent.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div className="agent-row-icon" style={{ background: agent.iconBg }}>{agent.icon}</div>
                      <div className="agent-row-name">{agent.name}</div>
                    </div>
                  </td>
                  <td><div className="agent-row-type">{agent.type}</div></td>
                  <td>
                    <span className={`status-pill sp-${agent.status}`}>
                      {agent.status.toUpperCase()}
                    </span>
                  </td>
                  <td style={{ width: '120px' }}>
                    <div className="progress-bar">
                      <div className="progress-fill" style={{ width: `${agent.progress}%` }}></div>
                    </div>
                  </td>
                  <td>
                    <div className="row-actions">
                      <button className="row-btn" onClick={() => onNavigate('journal')}>👁 Log</button>
                      <button className="row-btn" onClick={() => onConfigure('recouvrement')}>⚙️ Config</button>
                      <button className="row-btn danger">{agent.status === 'running' ? '⏹ Stop' : '▶ Start'}</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="exec-panel">
          <div className="exec-head">
            <div className="exec-title">Journal d&apos;Exécution Global</div>
            <button className="row-btn" onClick={() => onNavigate('journal')}>Voir tout le journal →</button>
          </div>
          <div className="exec-log">
            <div className="log-row">
              <div className="log-time">10:45:12</div>
              <div className="log-agent" style={{ color: 'var(--red)' }}>Yasmine</div>
              <div className="log-action">Envoi email relance à <span>ABC Transport</span></div>
              <div className="log-result res-ok">SUCCÈS</div>
              <div className="log-time">1.2s</div>
            </div>
            <div className="log-row">
              <div className="log-time">10:44:05</div>
              <div className="log-agent" style={{ color: 'var(--cyan)' }}>Khalil</div>
              <div className="log-action">Scan dossiers <span>Livraison Tunis</span></div>
              <div className="log-result res-ok" style={{ color: 'var(--amber)' }}>PENDING</div>
              <div className="log-time">--</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
