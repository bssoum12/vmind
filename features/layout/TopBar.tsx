"use client";

import React, { useState, useEffect } from 'react';
import { StatusDot } from '../../components/ui/StatusDot';
import { useClock } from '../../shared/hooks/useClock';
import { useMode } from '@/shared/contexts/ModeContext';
import { jwtDecode } from 'jwt-decode';
import { LogOut } from 'lucide-react';

export const TopBar: React.FC = () => {
  const clock = useClock();
  const { mode, setMode } = useMode();
  const [menuOpen, setMenuOpen] = useState(false);
  const [username, setUsername] = useState('');
  const [roleLabel, setRoleLabel] = useState('');
  const [avatarInitials, setAvatarInitials] = useState('VM');

  useEffect(() => {
    try {
      const token = localStorage.getItem('vmind_session');
      if (token) {
        const decoded: any = jwtDecode(token);
        if (decoded.username) {
          setUsername(decoded.username);
          
          // Get initials
          const parts = decoded.username.trim().split(/\s+/);
          if (parts.length >= 2) {
            setAvatarInitials((parts[0][0] + parts[1][0]).toUpperCase());
          } else if (parts[0]) {
            setAvatarInitials(parts[0].substring(0, 2).toUpperCase());
          }
        }
        
        if (decoded.roles && Array.isArray(decoded.roles)) {
          const roles = decoded.roles;
          // Mapping exact des noms de rôles DNN → label français affiché
          if (roles.includes('Administrators') || roles.includes('Superusers')) {
            setRoleLabel('Administrateur');
          } else if (roles.some((r: string) => ['usersFinances','Service Comptabilité','usersCompta','usersDecaissement','usersEncaissements','usersReglementDivers'].includes(r))) {
            setRoleLabel('Finance & Comptabilité');
          } else if (roles.some((r: string) => ['usersVentes','UsersCRM','GestionnaireVente','usersClaims'].includes(r))) {
            setRoleLabel('Commercial');
          } else if (roles.some((r: string) => ['usersAchats'].includes(r))) {
            setRoleLabel('Achats');
          } else if (roles.some((r: string) => ['usersStock','usersArticles','usersStore'].includes(r))) {
            setRoleLabel('Stock & Magasin');
          } else if (roles.some((r: string) => ['usersExploitation','usersOMC','usersEDI'].includes(r))) {
            setRoleLabel('Exploitation');
          } else if (roles.some((r: string) => ['usersTiers','usersSettings'].includes(r))) {
            setRoleLabel('Paramétrage');
          } else if (roles.some((r: string) => ['LecteurSeulement','Extranet'].includes(r))) {
            setRoleLabel('Lecture seule');
          } else {
            setRoleLabel(roles[0] || 'Utilisateur');
          }
        }
      }
    } catch (e) {
      console.error("Erreur de lecture du token dans TopBar", e);
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('vmind_session');
    window.location.href = '/login';
  };

  return (
    <div className="topbar">
      <div className="topbar-brand">
        <div>
          <div className="brand-logo">VMIND</div>
          <div className="brand-tag">Intelligence Entreprise</div>
        </div>
      </div>
      <div className="topbar-center">
        <div className="topbar-status">
          <StatusDot />
          <span>ERP CONNECTÉ</span>
          <span style={{ color: 'var(--border2)', margin: '0 6px' }}>|</span>
          <span>TraLIS v3.2</span>
          <span style={{ color: 'var(--border2)', margin: '0 6px' }}>|</span>
          <span>{clock}</span>
        </div>

        <div className="mode-switcher">
          <button 
            className={`mode-btn ${mode === 'ASSISTANT' ? 'active' : ''}`}
            onClick={() => setMode('ASSISTANT')}
          >
            Assistant
          </button>
          <button 
            className={`mode-btn ${mode === 'MANAGEMENT' ? 'active' : ''}`}
            onClick={() => setMode('MANAGEMENT')}
          >
            Management
          </button>
        </div>
      </div>
      <div className="topbar-right">
        <div className="tb-btn" title="Notifications">🔔</div>
        <div className="tb-btn" title="Paramètres">⚙</div>
        <div style={{ position: 'relative' }}>
          <div 
            className="user-badge" 
            onClick={() => setMenuOpen(!menuOpen)} 
            style={{ cursor: 'pointer', userSelect: 'none' }}
          >
            <div className="user-avatar">{avatarInitials}</div>
            <div>
              <div className="user-name">{username || 'Utilisateur'}</div>
              <div className="user-role">{roleLabel || 'Visiteur'}</div>
            </div>
          </div>
          {menuOpen && (
            <div style={{
              position: 'absolute',
              top: '100%',
              right: 0,
              marginTop: '8px',
              background: 'linear-gradient(160deg, rgba(8,20,38,0.98) 0%, rgba(4,12,24,0.99) 100%)',
              border: '1px solid rgba(0, 229, 200, 0.25)',
              borderRadius: '8px',
              boxShadow: '0 4px 20px rgba(0, 229, 200, 0.15)',
              padding: '6px 0',
              zIndex: 1000,
              minWidth: '150px',
            }}>
              <div 
                onClick={handleLogout}
                style={{
                  padding: '8px 16px',
                  fontSize: '12px',
                  color: '#ff4757',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontWeight: 600,
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 71, 87, 0.08)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <LogOut size={13} />
                Déconnexion
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
