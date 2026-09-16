'use client';

import React, { useState } from 'react';
import { AlertTriangle, Link2, Shield, ShieldCheck, X, Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import { Turnstile } from '@marsidev/react-turnstile';

export const OdooConnectorPanel: React.FC = () => {
  const [status, setStatus] = useState<'idle' | 'connected'>('idle');
  const [showModal, setShowModal] = useState(false);
  const [odooUrl, setOdooUrl] = useState('');
  const [odooDb, setOdooDb] = useState('');
  const [odooUser, setOdooUser] = useState('');
  const [odooApiKey, setOdooApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [turnstileToken, setTurnstileToken] = useState('');

  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || '1x00000000000000000000AA';

  const handleConnect = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError('');

    setTimeout(() => {
      setLoginLoading(false);
      setShowModal(false);
      setStatus('connected');
    }, 1200);
  };

  const handleDisconnect = () => {
    setStatus('idle');
  };

  return (
    <div className="connector-panel-inner">
      {/* ── HEADER ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            width: 48, height: 48, borderRadius: '12px',
            background: 'rgba(0, 229, 200, 0.08)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '1px solid rgba(0, 229, 200, 0.15)',
            padding: '6px',
          }}>
            <img src="/odoo-logo.png" alt="Odoo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          </div>
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: 800, margin: '0 0 4px 0' }}>Odoo MCP</h1>
            <div style={{ fontSize: '13px', color: '#8FA3B8', display: 'flex', alignItems: 'center', gap: '6px' }}>
              {status === 'idle' ? (
                <span style={{ color: '#ffc107', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <AlertTriangle size={13} /> Connecteur non activé
                </span>
              ) : (
                <span style={{ color: '#00E5C8', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <CheckCircle2 size={13} /> Connecté — {odooUser || 'admin'}&nbsp;·&nbsp;{odooDb || 'odoo_prod'}
                </span>
              )}
            </div>
          </div>
        </div>

        {status === 'connected' ? (
          <button onClick={handleDisconnect} style={{
            background: 'transparent', color: '#8FA3B8',
            border: '1px solid rgba(255,255,255,0.1)',
            padding: '8px 16px', borderRadius: '8px',
            fontSize: '13px', fontWeight: 600, cursor: 'pointer',
            transition: 'color 0.2s',
          }}
            onMouseOver={e => e.currentTarget.style.color = '#fff'}
            onMouseOut={e => e.currentTarget.style.color = '#8FA3B8'}
          >
            Déconnecter
          </button>
        ) : (
          <button onClick={() => setShowModal(true)} style={{
            background: 'linear-gradient(90deg, #00E5C8 0%, #21F3D6 100%)',
            color: '#021010', border: 'none',
            padding: '8px 16px', borderRadius: '8px',
            fontSize: '13px', fontWeight: 700, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: '6px',
            boxShadow: '0 0 10px rgba(0, 229, 200, 0.2)',
          }}>
            <Link2 size={14} /> Connecter
          </button>
        )}
      </div>

      <p style={{ color: '#8FA3B8', fontSize: '13px', lineHeight: 1.65, marginBottom: '36px', maxWidth: '680px' }}>
        Le connecteur Odoo MCP permet à VMIND d'exécuter des outils directement sur votre ERP Odoo, en respectant vos rôles et permissions Odoo.
        Une fois activé, l'IA consulte ces autorisations en temps réel et adapte ses réponses à votre profil.
      </p>

      {/* ── IDLE / DISCONNECTED STATE ── */}
      {status === 'idle' && (
        <div style={{
          padding: '32px', textAlign: 'center',
          background: 'rgba(5, 12, 24, 0.3)',
          border: '1px dashed rgba(255,255,255,0.08)',
          borderRadius: '12px', color: '#6A7E95',
        }}>
          <Shield size={32} style={{ marginBottom: '16px', opacity: 0.4 }} />
          <p style={{ margin: '0 0 4px 0', fontSize: '14px', fontWeight: 600, color: '#8FA3B8' }}>
            Connecteur non activé
          </p>
        </div>
      )}

      {/* ── CONNECTED STATE ── */}
      {status === 'connected' && (
        <div style={{
          display: 'flex', gap: '24px', flexWrap: 'wrap',
          padding: '16px 20px',
          background: 'rgba(5, 12, 24, 0.4)',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: '12px', marginBottom: '28px',
        }}>
          {[
            { label: 'Serveur Odoo', value: odooUrl || 'https://odoo.local' },
            { label: 'Base de données', value: odooDb || 'odoo_db' },
            { label: 'Utilisateur', value: odooUser || 'admin' },
            { label: 'Statut', value: 'Connecté (MCP Actif)' },
          ].map(({ label, value }) => (
            <div key={label}>
              <div style={{ fontSize: '11px', color: '#6A7E95', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>{label}</div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#fff' }}>{value}</div>
            </div>
          ))}
        </div>
      )}

      {/* ── LOGIN MODAL ── */}
      {showModal && (
        <div style={{
          position: 'fixed', inset: 0,
          background: 'rgba(2, 6, 14, 0.85)',
          backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 9999,
        }}>
          <div style={{
            background: 'linear-gradient(160deg, rgba(12, 28, 52, 1) 0%, rgba(6, 15, 30, 1) 100%)',
            border: '1px solid rgba(0, 229, 200, 0.35)',
            borderRadius: '24px',
            width: '100%', maxWidth: '440px',
            padding: '32px',
            boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
            position: 'relative',
          }}>
            <button onClick={() => setShowModal(false)} style={{
              position: 'absolute', top: 20, right: 20,
              background: 'transparent', border: 'none', color: '#6A7E95', cursor: 'pointer',
            }}>
              <X size={20} />
            </button>

            <h2 style={{ fontSize: '20px', fontWeight: 700, margin: '0 0 6px 0' }}>Connexion au connecteur Odoo MCP</h2>
            <p style={{ color: '#8FA3B8', fontSize: '13px', marginBottom: '28px', lineHeight: 1.55 }}>
              Configurez l'accès sécurisé de l'IA à votre instance ERP Odoo.
            </p>

            <form onSubmit={handleConnect} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#8FA3B8', marginBottom: '6px', fontWeight: 600 }}>
                  URL du serveur Odoo
                </label>
                <input
                  type="url"
                  value={odooUrl}
                  onChange={e => setOdooUrl(e.target.value)}
                  placeholder="https://mon-instance.odoo.com"
                  required
                  style={{
                    width: '100%', padding: '11px 14px', boxSizing: 'border-box',
                    background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '10px', color: '#fff', fontSize: '14px', outline: 'none',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#8FA3B8', marginBottom: '6px', fontWeight: 600 }}>
                  Base de données (Database)
                </label>
                <input
                  type="text"
                  value={odooDb}
                  onChange={e => setOdooDb(e.target.value)}
                  placeholder="ex: odoo_prod"
                  required
                  style={{
                    width: '100%', padding: '11px 14px', boxSizing: 'border-box',
                    background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '10px', color: '#fff', fontSize: '14px', outline: 'none',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#8FA3B8', marginBottom: '6px', fontWeight: 600 }}>
                  Email / Utilisateur Odoo
                </label>
                <input
                  type="text"
                  value={odooUser}
                  onChange={e => setOdooUser(e.target.value)}
                  placeholder="admin@entreprise.com"
                  required
                  style={{
                    width: '100%', padding: '11px 14px', boxSizing: 'border-box',
                    background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '10px', color: '#fff', fontSize: '14px', outline: 'none',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#8FA3B8', marginBottom: '6px', fontWeight: 600 }}>
                  Clé d'API / Mot de passe
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showApiKey ? 'text' : 'password'}
                    value={odooApiKey}
                    onChange={e => setOdooApiKey(e.target.value)}
                    placeholder="••••••••"
                    required
                    style={{
                      width: '100%', padding: '11px 14px', boxSizing: 'border-box',
                      background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '10px', color: '#fff', fontSize: '14px', outline: 'none',
                      paddingRight: '40px'
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    style={{
                      position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                      background: 'none', border: 'none', color: '#6A7E95', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0
                    }}
                  >
                    {showApiKey ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* ── CLOUDFLARE TURNSTILE ── */}
              <div style={{
                padding: '12px 14px',
                background: 'rgba(5, 15, 30, 0.75)',
                border: '1px solid rgba(0, 229, 200, 0.22)',
                borderRadius: '14px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                boxShadow: 'inset 0 0 16px rgba(0, 229, 200, 0.04)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
                      <path d="M18.5 19H6.5C4.01 19 2 16.99 2 14.5c0-2.22 1.6-4.07 3.73-4.43C6.35 6.54 9.38 4 13 4c3.95 0 7.23 2.96 7.74 6.84C22.28 11.41 23.5 12.82 23.5 14.5c0 2.49-2.01 4.5-5 4.5z" fill="url(#cf-grad-modal-odoo)" />
                      <defs>
                        <linearGradient id="cf-grad-modal-odoo" x1="2" y1="4" x2="23.5" y2="19" gradientUnits="userSpaceOnUse">
                          <stop stopColor="#F6821F" />
                          <stop offset="1" stopColor="#FAAE40" />
                        </linearGradient>
                      </defs>
                    </svg>
                    <div>
                      <div style={{ fontSize: '12px', fontWeight: 700, color: '#FFFFFF', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>Cloudflare Turnstile</span>
                        <span style={{ fontSize: '9px', background: 'rgba(246, 130, 31, 0.15)', color: '#F6821F', padding: '1px 5px', borderRadius: '4px', border: '1px solid rgba(246, 130, 31, 0.3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Zero Trust</span>
                      </div>
                      <div style={{ fontSize: '10.5px', color: '#6A7E95' }}>
                        Sécurisation de la passerelle connecteur ERP
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <ShieldCheck size={14} color={turnstileToken ? '#00E5C8' : '#6A7E95'} />
                    <span style={{ fontSize: '10.5px', fontWeight: 600, color: turnstileToken ? '#00E5C8' : '#8FA3B8' }}>
                      {turnstileToken ? 'Vérifié' : 'Requis'}
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'center', minHeight: '65px', alignItems: 'center' }}>
                  <Turnstile
                    key={showModal ? 'modal-odoo-open' : 'modal-odoo-closed'}
                    siteKey={siteKey}
                    options={{ theme: 'dark', size: 'normal' }}
                    onSuccess={(token) => setTurnstileToken(token)}
                    onExpire={() => setTurnstileToken('')}
                    onError={() => setTurnstileToken('')}
                  />
                </div>
              </div>

              {loginError && (
                <div style={{
                  color: '#ff4757', fontSize: '13px',
                  background: 'rgba(255, 71, 87, 0.08)', border: '1px solid rgba(255, 71, 87, 0.2)',
                  padding: '10px 14px', borderRadius: '8px',
                  display: 'flex', alignItems: 'flex-start', gap: '8px',
                }}>
                  <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: '1px' }} />
                  <span>{loginError}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loginLoading || !turnstileToken}
                style={{
                  width: '100%',
                  background: (!turnstileToken || loginLoading)
                    ? 'rgba(255,255,255,0.05)'
                    : 'linear-gradient(90deg, #00E5C8 0%, #21F3D6 100%)',
                  color: (!turnstileToken || loginLoading) ? '#8FA3B8' : '#021010',
                  border: (!turnstileToken || loginLoading) ? '1px solid rgba(255,255,255,0.12)' : 'none',
                  padding: '13px', borderRadius: '12px',
                  fontSize: '14px', fontWeight: 700,
                  cursor: (!turnstileToken || loginLoading) ? 'not-allowed' : 'pointer',
                  marginTop: '4px', transition: 'all 0.2s',
                  opacity: loginLoading ? 0.7 : 1,
                  boxShadow: (turnstileToken && !loginLoading) ? '0 0 18px rgba(0, 229, 200, 0.25)' : 'none',
                }}
              >
                {loginLoading ? 'Connexion…' : 'Se connecter'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
