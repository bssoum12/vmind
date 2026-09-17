"use client";

import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { ShieldAlert, Clock, LogOut, RefreshCw } from 'lucide-react';
import { jwtDecode } from 'jwt-decode';

// Définition des délais en millisecondes / secondes
const INACTIVITY_TIMEOUT = 14 * 60 * 1000; // 14 minutes d'inactivité avant l'alerte
const WARNING_DURATION = 60; // 60 secondes de compte à rebours de sécurité (sursis)

interface SessionTimeoutContextType {
  resetTimer: () => void;
}

const SessionTimeoutContext = createContext<SessionTimeoutContextType | undefined>(undefined);

export const SessionTimeoutProvider = ({ children }: { children: ReactNode }) => {
  const router = useRouter();
  const pathname = usePathname();

  const [showWarning, setShowWarning] = useState(false);
  const [countdown, setCountdown] = useState(WARNING_DURATION);
  const [isTabVisible, setIsTabVisible] = useState(true);

  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityRef = useRef<number>(Date.now());
  const showWarningRef = useRef(false);

  const isPublicPage = pathname === '/login' || pathname === '/reset-password';

  // Synchroniser l'état showWarning avec sa référence mutable pour éviter les closures périmées
  useEffect(() => {
    showWarningRef.current = showWarning;
  }, [showWarning]);

  // Fonction de déconnexion sécurisée
  const handleLogout = () => {
    try {
      localStorage.removeItem('vmind_session');
      localStorage.removeItem('vmind_mcp_token');
      localStorage.removeItem('vmind_allowed_agents');
      sessionStorage.clear();
      setShowWarning(false);
      
      // Nettoyage des timers
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
      
      // Redirection immédiate
      window.location.href = '/login?expired=true';
    } catch (err) {
      console.error("Error logging out automatically:", err);
    }
  };

  // Réinitialisation du minuteur d'inactivité
  const resetTimer = () => {
    lastActivityRef.current = Date.now();
    
    // Si la modale est affichée et qu'on détecte une activité, on prolonge automatiquement
    if (showWarningRef.current) {
      setShowWarning(false);
      setCountdown(WARNING_DURATION);
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
    }

    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
    }

    // Si on est sur une page publique, on ne démarre pas de timer
    if (isPublicPage) return;

    // Lancer le timer avant alerte
    inactivityTimerRef.current = setTimeout(() => {
      // Avant d'afficher l'alerte, on s'assure qu'un token valide existe toujours
      const token = localStorage.getItem('vmind_session');
      if (token) {
        setCountdown(WARNING_DURATION);
        setShowWarning(true);
      }
    }, INACTIVITY_TIMEOUT);
  };

  // 1. Suivi des événements d'interaction utilisateur
  useEffect(() => {
    if (isPublicPage) {
      // Nettoyage si on navigue vers une page publique
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
      setShowWarning(false);
      return;
    }

    const activityEvents = [
      'mousedown', 'mousemove', 'keydown',
      'scroll', 'touchstart', 'wheel', 'click'
    ];

    const handleUserActivity = () => {
      // Limiter la fréquence de réinitialisation pour la performance
      if (Date.now() - lastActivityRef.current > 1000) {
        resetTimer();
      }
    };

    // Attachement des écouteurs globaux
    activityEvents.forEach(event => {
      window.addEventListener(event, handleUserActivity, { passive: true });
    });

    // Démarrage initial du timer
    resetTimer();

    return () => {
      // Nettoyage au démontage ou changement de route
      activityEvents.forEach(event => {
        window.removeEventListener(event, handleUserActivity);
      });
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
    };
  }, [pathname, isPublicPage]);

  // 2. Gestion du compte à rebours de la modale de sécurité
  useEffect(() => {
    if (showWarning && isTabVisible) {
      countdownIntervalRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(countdownIntervalRef.current!);
            handleLogout();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
    }

    return () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
    };
  }, [showWarning, isTabVisible]);

  // 3. Détection du changement de visibilité (changement d'onglet / écran de veille)
  useEffect(() => {
    if (isPublicPage) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        setIsTabVisible(false);
        // L'onglet passe en arrière-plan : on suspend les timers pour éviter toute déconnexion
        if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
        if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
      } else {
        setIsTabVisible(true);
        // L'utilisateur revient sur l'onglet : on réinitialise simplement le minuteur d'inactivité à partir de cet instant
        const token = localStorage.getItem('vmind_session');
        if (!token) return;

        try {
          const decoded: any = jwtDecode(token);
          if (decoded.exp && decoded.exp * 1000 < Date.now()) {
            handleLogout();
            return;
          }
        } catch (e) {
          handleLogout();
          return;
        }

        // Calcul du temps d'inactivité cumulé réel (pendant que l'onglet était masqué)
        const idleTime = Date.now() - lastActivityRef.current;
        if (idleTime >= INACTIVITY_TIMEOUT) {
          // L'inactivité a dépassé le délai initial de 14 minutes : affichage direct de la modale avec 20 secondes
          setCountdown(20);
          setShowWarning(true);
        } else {
          // Moins de 14 minutes d'inactivité : on ne fait rien (pas de modale), on planifie le temps restant
          if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
          const remainingInactivityTime = INACTIVITY_TIMEOUT - idleTime;
          
          inactivityTimerRef.current = setTimeout(() => {
            const currentToken = localStorage.getItem('vmind_session');
            if (currentToken) {
              setShowWarning(true);
            }
          }, remainingInactivityTime);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isPublicPage]);

  // Couleurs de la charte VMIND
  const cyan = '#00E5C8';
  const cyan2 = '#00ffd5';
  const pink = '#ff4757';
  const white = '#FFFFFF';
  const muted = '#8FA3B8';

  return (
    <SessionTimeoutContext.Provider value={{ resetTimer }}>
      {children}

      {/* MODALE D'AVERTISSEMENT CYBERPUNK */}
      {showWarning && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(2, 8, 19, 0.82)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          zIndex: 99999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: "'Inter', -apple-system, sans-serif",
          color: white,
          padding: '20px',
        }}>
          <div className="anim-card" style={{
            position: 'relative',
            width: '100%',
            maxWidth: '460px',
            background: 'linear-gradient(160deg, rgba(8,20,38,0.98) 0%, rgba(4,12,24,0.99) 100%)',
            border: `1px solid ${countdown <= 10 ? pink : 'rgba(0, 229, 200, 0.48)'}`,
            borderRadius: '22px',
            padding: '38px 40px 32px',
            textAlign: 'center',
            boxShadow: countdown <= 10 
              ? '0 0 35px rgba(255, 71, 87, 0.28), 0 25px 60px rgba(0, 0, 0, 0.7)'
              : `0 0 35px rgba(0, 229, 200, 0.16), 0 25px 60px rgba(0, 0, 0, 0.7)`,
            transition: 'border-color 0.3s, box-shadow 0.3s',
          }}>
            {/* Decors de coins Cyberpunk */}
            <div style={{ position: 'absolute', top: 0, left: 0, width: '40px', height: '40px', borderTop: `2px solid ${countdown <= 10 ? pink : cyan}`, borderLeft: `2px solid ${countdown <= 10 ? pink : cyan}`, borderRadius: '22px 0 0 0', opacity: 0.8 }} />
            <div style={{ position: 'absolute', top: 0, right: 0, width: '40px', height: '40px', borderTop: `2px solid ${countdown <= 10 ? pink : cyan}`, borderRight: `2px solid ${countdown <= 10 ? pink : cyan}`, borderRadius: '0 22px 0 0', opacity: 0.8 }} />
            <div style={{ position: 'absolute', bottom: 0, left: 0, width: '40px', height: '40px', borderBottom: `2px solid ${countdown <= 10 ? pink : cyan}`, borderLeft: `2px solid ${countdown <= 10 ? pink : cyan}`, borderRadius: '0 0 0 22px', opacity: 0.4 }} />
            <div style={{ position: 'absolute', bottom: 0, right: 0, width: '40px', height: '40px', borderBottom: `2px solid ${countdown <= 10 ? pink : cyan}`, borderRight: `2px solid ${countdown <= 10 ? pink : cyan}`, borderRadius: '0 0 22px 0', opacity: 0.4 }} />

            {/* Glowing Icon */}
            <div style={{
              width: '74px',
              height: '74px',
              borderRadius: '50%',
              background: countdown <= 10 ? 'rgba(255, 71, 87, 0.1)' : 'rgba(0, 229, 200, 0.08)',
              border: `1px solid ${countdown <= 10 ? 'rgba(255, 71, 87, 0.3)' : 'rgba(0, 229, 200, 0.3)'}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px',
              boxShadow: countdown <= 10 ? '0 0 20px rgba(255, 71, 87, 0.2)' : `0 0 20px rgba(0, 229, 200, 0.15)`,
            }}>
              {countdown <= 10 ? (
                <ShieldAlert size={36} color={pink} className="animate-pulse" />
              ) : (
                <Clock size={36} color={cyan} />
              )}
            </div>

            {/* Title */}
            <h2 style={{
              fontSize: '18px',
              fontWeight: 800,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: countdown <= 10 ? pink : white,
              marginBottom: '10px',
            }}>
              {countdown <= 10 ? 'ATTENTION - DÉCONNEXION PROCHE' : 'SESSION INACTIVE'}
            </h2>

            {/* Description */}
            <p style={{
              fontSize: '13px',
              color: muted,
              lineHeight: 1.6,
              marginBottom: '26px',
            }}>
              Pour protéger l&apos;accès à vos données ERP TraLIS, vous serez déconnecté automatiquement dans :
            </p>

            {/* Glowing Big Countdown */}
            <div style={{
              fontSize: '48px',
              fontWeight: 900,
              fontFamily: "'JetBrains Mono', monospace",
              color: countdown <= 10 ? pink : cyan,
              textShadow: countdown <= 10 
                ? '0 0 15px rgba(255, 71, 87, 0.6)' 
                : `0 0 15px rgba(0, 229, 200, 0.5)`,
              marginBottom: '28px',
              transition: 'color 0.2s',
            }}>
              {countdown}s
            </div>

            {/* Actions Buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <button
                onClick={resetTimer}
                style={{
                  width: '100%',
                  height: '52px',
                  borderRadius: '12px',
                  background: `linear-gradient(90deg, ${cyan} 0%, ${cyan2} 100%)`,
                  color: '#021010',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '13.5px',
                  fontWeight: 800,
                  letterSpacing: '0.05em',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: `0 4px 15px rgba(0, 229, 200, 0.3)`,
                  fontFamily: 'inherit',
                }}
              >
                <RefreshCw size={15} />
                PROLONGER LA SESSION
              </button>

              <button
                onClick={handleLogout}
                style={{
                  width: '100%',
                  height: '48px',
                  borderRadius: '12px',
                  background: 'rgba(255, 255, 255, 0.02)',
                  color: muted,
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  cursor: 'pointer',
                  fontSize: '12.5px',
                  fontWeight: 600,
                  letterSpacing: '0.05em',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  transition: 'background 0.2s, color 0.2s',
                  fontFamily: 'inherit',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 71, 87, 0.08)';
                  e.currentTarget.style.color = pink;
                  e.currentTarget.style.borderColor = 'rgba(255, 71, 87, 0.3)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)';
                  e.currentTarget.style.color = muted;
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                }}
              >
                <LogOut size={14} />
                SE DÉCONNECTER MAINTENANT
              </button>
            </div>
          </div>
        </div>
      )}
    </SessionTimeoutContext.Provider>
  );
};

export const useSessionTimeout = () => {
  const context = useContext(SessionTimeoutContext);
  if (context === undefined) {
    throw new Error('useSessionTimeout must be used within a SessionTimeoutProvider');
  }
  return context;
};
