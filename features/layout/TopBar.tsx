"use client";

import React, { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { StatusDot } from '../../components/ui/StatusDot';
import { useClock } from '../../shared/hooks/useClock';
import { useMode } from '@/shared/contexts/ModeContext';
import { jwtDecode } from 'jwt-decode';
import { LogOut, User, Menu } from 'lucide-react';

export const TopBar: React.FC = () => {
  const pathname = usePathname();
  const clock = useClock();
  const { mode, setMode } = useMode();
  const [menuOpen, setMenuOpen] = useState(false);
  const [username, setUsername] = useState('');
  const [roleLabel, setRoleLabel] = useState('');
  const [avatarInitials, setAvatarInitials] = useState('VM');
  const [isErpConnected, setIsErpConnected] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const checkTokens = () => {
      try {
        let token = localStorage.getItem('vmind_session');
        const mcpToken = localStorage.getItem('vmind_mcp_token');
        
        if (mcpToken) {
          setIsErpConnected(true);
        } else {
          setIsErpConnected(false);
        }

        if (token) {
          if (token.startsWith('{')) {
            try {
              const parsed = JSON.parse(token);
              token = parsed.token || parsed.accessToken || token;
            } catch {}
          } else if (token.startsWith('"') && token.endsWith('"')) {
            token = token.slice(1, -1);
          }

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
            
            if (decoded.roles) {
              const roles = Array.isArray(decoded.roles)
                ? decoded.roles
                : typeof decoded.roles === 'string'
                  ? [decoded.roles]
                  : [];
              // Mapping exact des noms de rôles DNN → label français affiché
              if (roles.includes('Administrators') || roles.includes('Administrator') || roles.includes('Superusers')) {
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
        }
      } catch (e) {
        console.error("Erreur de lecture du token dans TopBar", e);
      }
    };

    checkTokens();
    window.addEventListener('mcp-session-updated', checkTokens);
    return () => window.removeEventListener('mcp-session-updated', checkTokens);
  }, []);

  const handleLogout = () => {
    localStorage.clear();
    sessionStorage.clear();
    window.location.href = '/login';
  };

  const handleGoToProfile = () => {
    setMenuOpen(false);
    setMode('MANAGEMENT');
    window.dispatchEvent(new CustomEvent('switch-management-view', { detail: 'profile' }));
  };

  // Hide TopBar on auth-related standalone pages
  if (pathname === '/login' || pathname === '/reset-password' || pathname?.startsWith('/login') || pathname?.startsWith('/reset-password')) {
    return null;
  }

  return (
    <div className="topbar">
      <div className="topbar-brand">
        <button 
          type="button" 
          className="mobile-menu-btn" 
          title="Ouvrir le menu" 
          onClick={() => window.dispatchEvent(new CustomEvent('toggle-mobile-sidebar'))}
        >
          <Menu size={18} />
        </button>
        <div>
          <div className="brand-logo">VMIND</div>
        </div>
      </div>
      <div className="topbar-center">
        <div className="topbar-status">
          <StatusDot style={{ backgroundColor: isErpConnected ? '#00e5c8' : '#8FA3B8' }} />
          <span style={{ color: isErpConnected ? '#fff' : '#8FA3B8' }}>
            {isErpConnected ? 'ERP CONNECTÉ' : 'ERP DÉCONNECTÉ'}
          </span>
          <span style={{ color: 'var(--border2)', margin: '0 6px' }}>|</span>
          <span>{clock}</span>
        </div>

        <div className="mode-switcher" style={{ position: 'relative', zIndex: 10 }}>
          <button 
            type="button"
            className={`mode-btn ${mounted && mode === 'ASSISTANT' ? 'active' : ''}`}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setMode('ASSISTANT');
              if (typeof window !== 'undefined') {
                const url = new URL(window.location.href);
                if (url.searchParams.has('view') || url.searchParams.has('mode')) {
                  url.searchParams.delete('view');
                  url.searchParams.delete('mode');
                  const newUrl = url.pathname + (url.search ? url.search : '');
                  window.history.replaceState({}, '', newUrl);
                }
              }
            }}
          >
            Assistant
          </button>
          <button 
            type="button"
            className={`mode-btn ${mounted && mode === 'MANAGEMENT' ? 'active' : ''}`}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setMode('MANAGEMENT');
            }}
          >
            Management
          </button>
        </div>
      </div>
      <div className="topbar-right">
        <div className="tb-btn" title="Paramètres du profil" onClick={handleGoToProfile} style={{ cursor: 'pointer' }}>⚙</div>
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
              minWidth: '165px',
            }}>
              <div 
                onClick={handleGoToProfile}
                style={{
                  padding: '8px 16px',
                  fontSize: '12px',
                  color: '#00E5C8',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontWeight: 600,
                  borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(0, 229, 200, 0.08)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <User size={13} />
                Modifier le profil
              </div>

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
