"use client";

import React, { useState, useEffect } from 'react';
import { ShieldAlert, AlertTriangle, X, Terminal, Info } from 'lucide-react';

interface CriticalIssue {
  id: string;
  severity: 'CRITICAL' | 'WARNING';
  title: string;
  feature: string;
  description: string;
  guidance: string;
}

export const AdminCriticalAlertBadge: React.FC = () => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [issues, setIssues] = useState<CriticalIssue[]>([]);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    const fetchHealth = (user?: any) => {
      try {
        if (user) {
          const roles = Array.isArray(user.roles)
            ? user.roles
            : typeof user.roles === 'string'
              ? [user.roles]
              : [];
          const adminRole = roles.some((r: string) =>
            ['Administrators', 'Administrator', 'Superusers', 'Admin', 'SuperAdmin'].includes(r)
          );
          if (!adminRole) {
            setIsAdmin(false);
            setIssues([]);
            return;
          }
        }

        const apiUrl = (process.env.NEXT_PUBLIC_API_URL || 'https://localhost:3001').trim();
        if (!apiUrl) return;

        fetch(`${apiUrl}/api/admin/config-health`, {
          credentials: 'include'
        })
          .then((res) => {
            if (res.status === 401 || res.status === 403) {
              setIsAdmin(false);
              setIssues([]);
              return null;
            }
            return res.ok ? res.json() : null;
          })
          .then((data) => {
            if (data && data.ok) {
              setIsAdmin(true);
              if (Array.isArray(data.issues)) {
                setIssues(data.issues);
              } else {
                setIssues([]);
              }
            }
          })
          .catch((err) => {
            console.debug('[ADMIN HEALTH] Diagnostic passif :', err?.message || err);
          });
      } catch {
        // Échec silencieux non bloquant
      }
    };

    fetchHealth();
    const handleSessionUpdated = (e: any) => {
      const user = e?.detail?.user || e?.detail;
      fetchHealth(user);
    };

    window.addEventListener('mcp-session-updated', handleSessionUpdated);
    return () => window.removeEventListener('mcp-session-updated', handleSessionUpdated);
  }, []);

  // Si l'utilisateur n'est pas Admin OU qu'aucune configuration critique ne manque : 100% INVISIBLE
  if (!isAdmin || issues.length === 0) {
    return null;
  }

  const criticalCount = issues.filter(i => i.severity === 'CRITICAL').length;
  const warningCount = issues.filter(i => i.severity === 'WARNING').length;
  const hasCritical = criticalCount > 0;
  const accentColor = hasCritical ? '#FF4757' : '#FFB800';

  const sortedIssues = [...issues].sort((a, b) => {
    if (a.severity === 'CRITICAL' && b.severity !== 'CRITICAL') return -1;
    if (a.severity !== 'CRITICAL' && b.severity === 'CRITICAL') return 1;
    return 0;
  });

  return (
    <>
      {/* Pastille Premium dans la TopBar */}
      <button
        onClick={() => setModalOpen(true)}
        title={hasCritical ? "Diagnostic Système : Action critique requise" : "Diagnostic Système : Configurations recommandées"}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '7px',
          padding: '5px 12px',
          background: hasCritical
            ? 'linear-gradient(135deg, rgba(255, 71, 87, 0.14) 0%, rgba(255, 184, 0, 0.08) 100%)'
            : 'linear-gradient(135deg, rgba(255, 184, 0, 0.12) 0%, rgba(0, 229, 200, 0.06) 100%)',
          border: `1px solid ${hasCritical ? 'rgba(255, 71, 87, 0.4)' : 'rgba(255, 184, 0, 0.35)'}`,
          borderRadius: '20px',
          color: accentColor,
          fontSize: '11px',
          fontWeight: 700,
          cursor: 'pointer',
          letterSpacing: '0.5px',
          boxShadow: `0 0 14px ${hasCritical ? 'rgba(255, 71, 87, 0.18)' : 'rgba(255, 184, 0, 0.15)'}`,
          transition: 'all 0.2s ease',
          marginRight: '6px'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.boxShadow = `0 0 20px ${hasCritical ? 'rgba(255, 71, 87, 0.35)' : 'rgba(255, 184, 0, 0.3)'}`;
          e.currentTarget.style.borderColor = accentColor;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.boxShadow = `0 0 14px ${hasCritical ? 'rgba(255, 71, 87, 0.18)' : 'rgba(255, 184, 0, 0.15)'}`;
          e.currentTarget.style.borderColor = hasCritical ? 'rgba(255, 71, 87, 0.4)' : 'rgba(255, 184, 0, 0.35)';
        }}
      >
        <span
          style={{
            width: '7px',
            height: '7px',
            borderRadius: '50%',
            backgroundColor: accentColor,
            boxShadow: `0 0 8px ${accentColor}`,
            display: 'inline-block'
          }}
        />
        <ShieldAlert size={13} style={{ color: accentColor }} />
        <span>{hasCritical ? `Config requise (${issues.length})` : `Diagnostic (${issues.length})`}</span>
      </button>

      {/* Modal Cyberpunk Haute Définition VMIND */}
      {modalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(3, 11, 24, 0.78)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '20px'
          }}
          onClick={() => setModalOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: '620px',
              background: 'linear-gradient(165deg, rgba(10, 24, 40, 0.98) 0%, rgba(6, 17, 31, 0.99) 100%)',
              border: '1px solid rgba(255, 184, 0, 0.35)',
              borderRadius: '14px',
              boxShadow: '0 10px 40px rgba(0, 0, 0, 0.6), 0 0 30px rgba(255, 184, 0, 0.12)',
              overflow: 'hidden',
              animation: 'fadeIn 0.2s ease-out'
            }}
          >
            {/* Header Modal */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '16px 22px',
                borderBottom: '1px solid rgba(255, 184, 0, 0.15)',
                background: 'rgba(255, 184, 0, 0.04)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    background: 'rgba(255, 184, 0, 0.12)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '1px solid rgba(255, 184, 0, 0.3)'
                  }}
                >
                  <AlertTriangle size={18} style={{ color: '#FFB800' }} />
                </div>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 800, color: '#F0F4F8', letterSpacing: '0.8px', textTransform: 'uppercase' }}>
                    Diagnostic Système & Configuration
                  </div>
                  <div style={{ fontSize: '11px', color: '#94A3B8' }}>
                    {issues.length} {issues.length > 1 ? 'actions requises' : 'action requise'} ({criticalCount} {criticalCount > 1 ? 'bloquants' : 'bloquant'}, {warningCount} {warningCount > 1 ? 'recommandations' : 'recommandation'})
                  </div>
                </div>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#94A3B8',
                  cursor: 'pointer',
                  padding: '6px',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = '#F0F4F8')}
                onMouseLeave={(e) => (e.currentTarget.style.color = '#94A3B8')}
              >
                <X size={18} />
              </button>
            </div>

            {/* Contenu Modal */}
            <div style={{ padding: '22px', maxHeight: '70vh', overflowY: 'auto' }}>
              <div
                style={{
                  fontSize: '12px',
                  color: '#CBD5E1',
                  marginBottom: '18px',
                  lineHeight: '1.5'
                }}
              >
                {issues.length > 1
                  ? `${issues.length} configurations nécessitent une intervention. Elles sont listées ci-dessous par ordre de priorité :`
                  : 'Une configuration essentielle nécessite votre attention. Les détails et consignes sont indiqués ci-dessous :'}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {sortedIssues.map((issue) => (
                  <div
                    key={issue.id}
                    style={{
                      background: issue.severity === 'CRITICAL' ? 'rgba(255, 71, 87, 0.05)' : 'rgba(15, 32, 53, 0.55)',
                      border: `1px solid ${issue.severity === 'CRITICAL' ? 'rgba(255, 71, 87, 0.35)' : 'rgba(0, 229, 200, 0.2)'}`,
                      borderRadius: '10px',
                      padding: '16px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span
                        style={{
                          fontSize: '10px',
                          fontWeight: 800,
                          textTransform: 'uppercase',
                          color: issue.severity === 'CRITICAL' ? '#FF4757' : '#00E5C8',
                          background: issue.severity === 'CRITICAL' ? 'rgba(255, 71, 87, 0.12)' : 'rgba(0, 229, 200, 0.1)',
                          padding: '3px 8px',
                          borderRadius: '4px',
                          border: `1px solid ${issue.severity === 'CRITICAL' ? 'rgba(255, 71, 87, 0.3)' : 'rgba(0, 229, 200, 0.25)'}`,
                          letterSpacing: '0.6px'
                        }}
                      >
                        {issue.feature}
                      </span>
                      <span
                        style={{
                          fontSize: '11px',
                          color: issue.severity === 'CRITICAL' ? '#FF4757' : '#FFB800',
                          fontWeight: 700
                        }}
                      >
                        {issue.severity === 'CRITICAL' ? '● Bloquant critique' : '○ Avertissement recommandé'}
                      </span>
                    </div>

                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#F0F4F8', marginBottom: '6px' }}>
                      {issue.title}
                    </div>

                    <div style={{ fontSize: '12px', color: '#94A3B8', marginBottom: '12px', lineHeight: '1.4' }}>
                      {issue.description}
                    </div>

                    {/* Bloc Directive Professionnelle */}
                    <div
                      style={{
                        background: 'rgba(3, 11, 24, 0.75)',
                        border: '1px solid rgba(0, 229, 200, 0.18)',
                        borderRadius: '8px',
                        padding: '12px 14px',
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '10px'
                      }}
                    >
                      <Terminal size={15} style={{ color: '#00E5C8', marginTop: '2px', flexShrink: 0 }} />
                      <div>
                        <div style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.6px', color: '#94A3B8', marginBottom: '3px', fontWeight: 700 }}>
                          Action requise
                        </div>
                        <div style={{ fontSize: '12px', color: '#E2E8F0', lineHeight: '1.45', fontWeight: 500 }}>
                          {issue.guidance}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer Modal */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '14px 22px',
                borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                background: 'rgba(6, 17, 31, 0.95)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#94A3B8' }}>
                <Info size={13} style={{ color: '#00E5C8' }} />
                <span>Le reste de l’ERP et la base de données continuent de fonctionner sans coupure.</span>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                style={{
                  background: 'linear-gradient(135deg, #00E5C8 0%, #00BFA8 100%)',
                  border: 'none',
                  borderRadius: '6px',
                  color: '#030B18',
                  padding: '7px 18px',
                  fontSize: '12px',
                  fontWeight: 800,
                  cursor: 'pointer'
                }}
              >
                Compris
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
