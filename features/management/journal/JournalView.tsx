'use client';

import React from 'react';

export const JournalView: React.FC = () => {
  const [activeTab, setActiveTab] = React.useState('all');

  const allLogs = [
    { time: '10:45:12', agent: 'Yasmine', action: 'Envoi email relance à <span>ABC Transport</span>', result: 'SUCCÈS', duration: '1.2s', statusClass: 'res-ok', agentColor: 'var(--red)', type: 'success' },
    { time: '10:44:05', agent: 'Khalil', action: 'Scan dossiers <span>Livraison Tunis</span>', result: 'PENDING', duration: '--', statusClass: 'res-skip', agentColor: 'var(--cyan)', type: 'other' },
    { time: '10:38:44', agent: 'Amira', action: 'Génération facture <span>FAC-2024-088</span>', result: 'SUCCÈS', duration: '2.4s', statusClass: 'res-ok', agentColor: 'var(--green)', type: 'success' },
    { time: '09:55:01', agent: 'System', action: 'Erreur de connexion API WhatsApp', result: 'ERREUR', duration: '0.0s', statusClass: 'res-ok', style: { color: 'var(--red)' }, agentColor: 'var(--muted)', type: 'error' },
    { time: '09:12:33', agent: 'Yasmine', action: 'Relance <span>Distribution SARL</span> via WhatsApp', result: 'SUCCÈS', duration: '0.8s', statusClass: 'res-ok', agentColor: 'var(--red)', type: 'success' },
    { time: '08:55:10', agent: 'System', action: 'Mise à jour pool de connexion SQL Server', result: 'INFO', duration: '0.1s', statusClass: 'res-ok', agentColor: 'var(--muted)', type: 'system' },
    { time: '08:45:00', agent: 'Khalil', action: 'Vérification retards journaliers', result: 'SKIP', duration: '0.5s', statusClass: 'res-skip', agentColor: 'var(--cyan)', type: 'other' },
  ];

  const filteredLogs = activeTab === 'all' 
    ? allLogs 
    : activeTab === 'system'
      ? allLogs.filter(log => log.type !== 'success' && log.type !== 'error')
      : allLogs.filter(log => log.type === activeTab);

  return (
    <div id="view-journal" className="anim">
      <div className="page-head">
        <div>
          <div className="page-title">Journal d&apos;Activité</div>
          <div className="page-sub">Historique complet des exécutions et événements système</div>
        </div>
        <div className="page-actions">
          <button className="btn">🧹 Effacer le log</button>
          <button className="btn primary">📥 Exporter CSV</button>
        </div>
      </div>
      
      <div className="tabs-bar">
        <div className={`tab ${activeTab === 'all' ? 'active' : ''}`} onClick={() => setActiveTab('all')}>Tout l&apos;historique</div>
        <div className={`tab ${activeTab === 'error' ? 'active' : ''}`} onClick={() => setActiveTab('error')}>Erreurs</div>
        <div className={`tab ${activeTab === 'success' ? 'active' : ''}`} onClick={() => setActiveTab('success')}>Succès</div>
        <div className={`tab ${activeTab === 'system' ? 'active' : ''}`} onClick={() => setActiveTab('system')}>Système</div>
      </div>

      <div className="scroll">
         <div className="exec-panel" style={{ marginTop: 0 }}>
          <div className="exec-log">
            <div className="log-row" style={{ background: 'var(--navy4)', fontWeight: 'bold', borderBottom: '1px solid var(--border)' }}>
              <div className="log-time">HEURE</div>
              <div className="log-agent">AGENT</div>
              <div className="log-action">ACTION EFFECTUÉE</div>
              <div className="log-result">RÉSULTAT</div>
              <div className="log-time">DURÉE</div>
            </div>
            {filteredLogs.map((log, i) => (
              <div key={i} className="log-row">
                <div className="log-time">{log.time}</div>
                <div className="log-agent" style={{ color: log.agentColor }}>{log.agent}</div>
                <div className="log-action" dangerouslySetInnerHTML={{ __html: log.action }} />
                <div className={`log-result ${log.statusClass}`} style={(log as any).style}>{log.result}</div>
                <div className="log-time">{log.duration}</div>
              </div>
            ))}
            {filteredLogs.length === 0 && (
              <div style={{ padding: '20px', textAlign: 'center', color: 'var(--muted)' }}>
                Aucun événement trouvé pour cette catégorie.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
