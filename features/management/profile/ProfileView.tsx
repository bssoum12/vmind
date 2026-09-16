'use client';

import React, { useState, useEffect } from 'react';
import { jwtDecode } from 'jwt-decode';
import {
  User, Mail, Phone, Lock, LogOut, CheckCircle2, AlertCircle,
  Shield, Eye, EyeOff, Server, Cpu
} from 'lucide-react';

interface ConnectorInfo {
  connector_type: string;
  client_id: string;
  is_default?: boolean;
  is_active?: boolean;
}

function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem('vmind_session') || localStorage.getItem('vmind_mcp_token');
  if (!raw) return null;
  if (raw.startsWith('eyJ')) return raw;
  try {
    const parsed = JSON.parse(raw);
    return parsed?.token || parsed?.access_token || parsed?.user?.token || raw;
  } catch (e) {
    return raw;
  }
}

export const ProfileView: React.FC = () => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [roleLabel, setRoleLabel] = useState('');
  const [avatarInitials, setAvatarInitials] = useState('HA');
  const [connectors, setConnectors] = useState<ConnectorInfo[]>([]);
  const [allowedAgents, setAllowedAgents] = useState<string[]>([]);
  const [mobileTab, setMobileTab] = useState<'form' | 'hud' | 'erp' | 'all'>('form');

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [currentPasswordValid, setCurrentPasswordValid] = useState<boolean | null>(null);
  const [verifyingCurrentPassword, setVerifyingCurrentPassword] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setIsLoading(true);
        const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'https://localhost:3001';
        const token = getAuthToken();
        if (!token) return;

        try {
          const decoded: any = jwtDecode(token);
          if (decoded.username) setUsername(decoded.username);
          if (decoded.first_name) setFirstName(decoded.first_name);
          if (decoded.last_name) setLastName(decoded.last_name);
          if (decoded.email) setEmail(decoded.email);
          if (decoded.phone_number) setPhone(decoded.phone_number);
          if (decoded.roles) setRoleLabel(Array.isArray(decoded.roles) ? decoded.roles[0] : decoded.roles);
          if (Array.isArray(decoded.allowedAgents)) {
            setAllowedAgents(decoded.allowedAgents.map((a: string) => a.toUpperCase()));
          }
          if (decoded.connector_type && decoded.client_id) {
            setConnectors([{
              connector_type: decoded.connector_type,
              client_id: decoded.client_id,
              is_active: true,
              is_default: true
            }]);
          }
        } catch (e) {}

        const res = await fetch(`${baseUrl}/api/auth/vmind/profile`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();

        if (data.ok && data.user) {
          setUsername(data.user.username || '');
          setFirstName(data.user.first_name || '');
          setLastName(data.user.last_name || '');
          setEmail(data.user.email || '');
          setPhone(data.user.phone_number || '');
          setRoleLabel(data.user.role || 'Administrateur');
          if (Array.isArray(data.user.allowed_agents)) {
            setAllowedAgents(data.user.allowed_agents.map((a: string) => a.toUpperCase()));
          }
          if (Array.isArray(data.user.connectors) && data.user.connectors.length > 0) {
            setConnectors(data.user.connectors);
          }
          const fn = data.user.first_name || '';
          const ln = data.user.last_name || '';
          if (fn || ln) {
            setAvatarInitials(((fn[0] || '') + (ln[0] || '')).toUpperCase() || 'HA');
          } else if (data.user.username) {
            setAvatarInitials(data.user.username.substring(0, 2).toUpperCase());
          }
        }
      } catch (err) {
        console.error('Failed to load profile', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchProfile();
  }, []);

  useEffect(() => {
    if (!currentPassword || currentPassword.trim().length === 0) {
      setCurrentPasswordValid(null);
      setVerifyingCurrentPassword(false);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        setVerifyingCurrentPassword(true);
        const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'https://localhost:3001';
        const token = getAuthToken();
        const res = await fetch(`${baseUrl}/api/auth/vmind/verify-current-password`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ current_password: currentPassword })
        });
        const data = await res.json();
        setCurrentPasswordValid(data.ok && data.valid === true);
      } catch {
        setCurrentPasswordValid(false);
      } finally {
        setVerifyingCurrentPassword(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [currentPassword]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!email.trim() || !firstName.trim() || !lastName.trim()) {
      setErrorMessage('Prénom, Nom et Email sont obligatoires.');
      return;
    }

    const isUpdatingPassword = currentPassword || newPassword || confirmPassword;
    if (isUpdatingPassword) {
      if (!currentPassword) { setErrorMessage('Veuillez saisir votre mot de passe actuel.'); return; }
      if (currentPasswordValid === false) { setErrorMessage('Mot de passe actuel incorrect.'); return; }
      if (!newPassword || newPassword.length < 6) { setErrorMessage('Le nouveau mot de passe doit contenir au moins 6 caractères.'); return; }
      if (newPassword !== confirmPassword) { setErrorMessage('Les nouveaux mots de passe ne correspondent pas.'); return; }
    }

    try {
      setIsSaving(true);
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'https://localhost:3001';
      const token = getAuthToken();

      const res = await fetch(`${baseUrl}/api/auth/vmind/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          first_name: firstName.trim(), last_name: lastName.trim(),
          email: email.trim(), phone_number: phone.trim(),
          password: isUpdatingPassword ? newPassword.trim() : undefined,
          current_password: isUpdatingPassword ? currentPassword.trim() : undefined
        })
      });

      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || 'Impossible de mettre à jour le profil.');
      if (data.token) localStorage.setItem('vmind_session', data.token);

      setSuccessMessage('Profil mis à jour avec succès !');
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
      setCurrentPasswordValid(null);
      if (firstName || lastName) setAvatarInitials(((firstName[0] || '') + (lastName[0] || '')).toUpperCase());
    } catch (err: any) {
      setErrorMessage(err.message || 'Une erreur est survenue.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = () => {
    localStorage.clear(); sessionStorage.clear();
    window.location.href = '/login';
  };

  const isPasswordFormBlocked = (currentPassword || newPassword || confirmPassword)
    ? (!currentPassword || currentPasswordValid !== true || !newPassword || newPassword.length < 6 || newPassword !== confirmPassword)
    : false;

  const cyan = '#00E5C8';

  const inputStyle = (borderOverride?: string): React.CSSProperties => ({
    width: '100%', height: '46px',
    background: 'rgba(3, 10, 22, 0.9)',
    border: borderOverride || '1px solid rgba(0, 229, 200, 0.3)',
    borderRadius: '10px',
    paddingLeft: '44px', paddingRight: '14px',
    color: '#E8F4F8', fontSize: '13.5px', outline: 'none',
    transition: 'border-color 0.2s, box-shadow 0.2s',
    boxSizing: 'border-box',
  });

  const labelStyle: React.CSSProperties = {
    fontSize: '10px', fontWeight: 800, color: cyan,
    textTransform: 'uppercase', letterSpacing: '0.14em',
    display: 'flex', alignItems: 'center', gap: '5px'
  };

  return (
    <div
      id="view-profile"
      className="anim"
      style={{
        height: '100%', display: 'flex', flexDirection: 'column',
        background: 'radial-gradient(ellipse 130% 90% at 50% 20%, #071322 0%, #030a14 60%, #020509 100%)',
        position: 'relative', overflow: 'hidden'
      }}
    >
      {/* ── Subtle grid overlay ── */}
      <svg width="100%" height="100%" style={{ position: 'absolute', inset: 0, opacity: 0.07, pointerEvents: 'none', zIndex: 0 }}>
        <defs>
          <pattern id="pg" width="50" height="50" patternUnits="userSpaceOnUse">
            <path d="M 50 0 L 0 0 0 50" fill="none" stroke={cyan} strokeWidth="0.6" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#pg)" />
      </svg>

      {/* ── Ambient glow blobs ── */}
      <div style={{ position: 'absolute', top: '-120px', left: '-100px', width: '500px', height: '500px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(0,229,200,0.07) 0%, transparent 70%)', pointerEvents: 'none', zIndex: 0 }} />
      <div style={{ position: 'absolute', bottom: '-150px', right: '-80px', width: '600px', height: '600px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(0,100,180,0.06) 0%, transparent 70%)', pointerEvents: 'none', zIndex: 0 }} />

      {/* ══════════════════════════════════════════════
          PAGE HEADER
      ══════════════════════════════════════════════ */}
      <div
        className="page-head"
        style={{
          padding: '18px 36px', flexShrink: 0, zIndex: 10,
          borderBottom: '1px solid rgba(0,229,200,0.12)',
          background: 'rgba(3,8,18,0.85)', backdropFilter: 'blur(14px)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between'
        }}
      >
        <div>
          <div className="page-title" style={{ fontSize: '19px', fontWeight: 800, color: cyan, display: 'flex', alignItems: 'center', gap: '9px' }}>
            <User size={21} color={cyan} />
            Mon Profil & Paramètres
          </div>
          <div className="page-sub" style={{ fontSize: '11.5px', color: '#6B85A0', marginTop: '3px' }}>
            Gérez vos informations personnelles et la sécurité du compte
          </div>
        </div>
      </div>

      {/* ── RESPONSIVE SUB-TAB SWITCHER (Visible on screens <= 1150px) ── */}
      <div className="profile-mobile-nav" style={{
        gap: '8px',
        padding: '12px 16px',
        background: 'rgba(5, 14, 28, 0.95)',
        borderBottom: '1px solid rgba(0, 229, 200, 0.15)',
        overflowX: 'auto',
        WebkitOverflowScrolling: 'touch',
        justifyContent: 'center',
        flexWrap: 'wrap',
        zIndex: 20
      }}>
        {[
          { id: 'form', label: 'Informations & Sécurité', icon: <User size={14} /> },
          { id: 'hud', label: 'Identité HUD', icon: <Shield size={14} /> },
          { id: 'erp', label: 'Connecteur & Agents', icon: <Server size={14} /> },
          { id: 'all', label: 'Vue Complète', icon: <Cpu size={14} /> },
        ].map(tab => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setMobileTab(tab.id as any)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '7px 14px',
              borderRadius: '8px',
              fontSize: '11.5px',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.2s',
              fontFamily: 'inherit',
              border: mobileTab === tab.id ? '1px solid #00E5C8' : '1px solid rgba(0, 229, 200, 0.18)',
              background: mobileTab === tab.id ? 'rgba(0, 229, 200, 0.15)' : 'rgba(3, 10, 22, 0.8)',
              color: mobileTab === tab.id ? '#00E5C8' : '#8FA3B8',
              boxShadow: mobileTab === tab.id ? '0 0 12px rgba(0, 229, 200, 0.25)' : 'none',
              whiteSpace: 'nowrap'
            }}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════
          MAIN LAYOUT
      ══════════════════════════════════════════════ */}
      <div
        className="scroll profile-scroll-wrap"
        style={{
          flex: 1, overflowY: 'auto', zIndex: 10,
          padding: '24px',
          display: 'flex', gap: '24px',
          alignItems: 'flex-start', justifyContent: 'center'
        }}
      >

        {/* ───────────────────────────────────────────
            LEFT — HOLOGRAPHIC IDENTITY HUD
        ─────────────────────────────────────────── */}
        <div className={`profile-hud-column ${mobileTab !== 'hud' && mobileTab !== 'all' ? 'profile-hide-mobile' : ''}`} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', gap: '20px', alignSelf: 'flex-start', minWidth: '240px' }}>

          {/* Hologram orb */}
          <div style={{ position: 'relative', width: '220px', height: '220px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>

            {/* Ring 1 – slow CW */}
            <svg width="220" height="220" viewBox="0 0 220 220" style={{ position: 'absolute', inset: 0, animation: 'ring-cw 60s linear infinite' }}>
              <circle cx="110" cy="110" r="106" fill="none" stroke="rgba(0,229,200,0.15)" strokeWidth="1" strokeDasharray="5 8" />
            </svg>
            {/* Ring 2 – med CW */}
            <svg width="200" height="200" viewBox="0 0 200 200" style={{ position: 'absolute', animation: 'ring-cw 30s linear infinite' }}>
              <circle cx="100" cy="100" r="96" fill="none" stroke="rgba(0,229,200,0.28)" strokeWidth="1.2" strokeDasharray="12 9" />
              <circle cx="100" cy="100" r="86" fill="none" stroke="rgba(0,229,200,0.18)" strokeWidth="0.8" strokeDasharray="4 16" />
            </svg>
            {/* Ring 3 – CCW */}
            <svg width="168" height="168" viewBox="0 0 200 200" style={{ position: 'absolute', animation: 'ring-ccw 20s linear infinite' }}>
              <circle cx="100" cy="100" r="96" fill="none" stroke="rgba(0,229,200,0.5)" strokeWidth="1.4" strokeDasharray="20 6" />
            </svg>
            {/* Ring 4 – fast CW accent */}
            <svg width="138" height="138" viewBox="0 0 200 200" style={{ position: 'absolute', animation: 'ring-cw 14s linear infinite' }}>
              <circle cx="100" cy="100" r="90" fill="none" stroke="rgba(0,229,200,0.35)" strokeWidth="1" strokeDasharray="6 20" />
            </svg>

            {/* Centre orb */}
            <div style={{
              width: '108px', height: '108px', borderRadius: '50%',
              border: '2px solid rgba(0,229,200,0.75)',
              boxShadow: '0 0 40px rgba(0,229,200,0.5), inset 0 0 28px rgba(0,229,200,0.25), 0 0 80px rgba(0,229,200,0.15)',
              background: 'radial-gradient(circle at 40% 38%, rgba(0,229,200,0.22) 0%, rgba(2,8,20,0.97) 70%)',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              zIndex: 5, gap: '2px'
            }}>
              <span style={{ fontSize: '26px', fontWeight: 900, color: '#fff', lineHeight: 1, textShadow: `0 0 18px ${cyan}, 0 0 40px rgba(0,229,200,0.5)` }}>
                {avatarInitials}
              </span>
              <span style={{ fontSize: '8.5px', color: 'rgba(0,229,200,0.7)', letterSpacing: '0.16em', fontWeight: 700 }}>ID VÉRIFIÉ</span>
            </div>

            {/* Orbiting dots */}
            <div style={{ position: 'absolute', top: '12px', right: '34px', width: '7px', height: '7px', borderRadius: '50%', background: cyan, boxShadow: `0 0 12px ${cyan}, 0 0 24px rgba(0,229,200,0.4)` }} />
            <div style={{ position: 'absolute', bottom: '18px', left: '28px', width: '5px', height: '5px', borderRadius: '50%', background: cyan, boxShadow: `0 0 9px ${cyan}` }} />
            <div style={{ position: 'absolute', top: '50%', right: '8px', width: '4px', height: '4px', borderRadius: '50%', background: 'rgba(0,229,200,0.6)', boxShadow: `0 0 7px ${cyan}` }} />

            {/* Scan line */}
            <div style={{
              position: 'absolute', left: '10%', right: '10%', height: '1px',
              background: 'linear-gradient(90deg, transparent, rgba(0,229,200,0.7), transparent)',
              animation: 'scan-line 3s ease-in-out infinite',
              zIndex: 4
            }} />
          </div>

          {/* Identity readout cards */}
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '10px' }}>

            {/* Name block */}
            <div style={{
              background: 'rgba(5,14,28,0.85)', border: '1px solid rgba(0,229,200,0.22)',
              borderRadius: '12px', padding: '12px 16px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
            }}>
              <div style={{ fontSize: '9px', fontWeight: 800, color: 'rgba(0,229,200,0.6)', letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: '4px' }}>
                IDENTITÉ
              </div>
              <div style={{ fontSize: '14px', fontWeight: 800, color: '#FFFFFF', lineHeight: 1.2 }}>
                {firstName || lastName ? `${firstName} ${lastName}`.trim() : username || '—'}
              </div>
              <div style={{ fontSize: '11px', color: 'rgba(0,229,200,0.65)', marginTop: '2px' }}>
                @{username || 'user'}
              </div>
            </div>

            {/* Role + ERP block */}
            <div style={{
              background: 'rgba(5,14,28,0.85)', border: '1px solid rgba(0,229,200,0.22)',
              borderRadius: '12px', padding: '12px 16px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
              display: 'flex', flexDirection: 'column', gap: '8px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Shield size={12} color={cyan} />
                  <span style={{ fontSize: '10px', fontWeight: 700, color: '#FFFFFF' }}>{roleLabel || 'Administrateur'}</span>
                </div>
                <span style={{ fontSize: '9px', background: 'rgba(0,229,200,0.12)', color: cyan, padding: '2px 6px', borderRadius: '5px', fontWeight: 700, border: '1px solid rgba(0,229,200,0.25)' }}>
                  ACTIF
                </span>
              </div>
              <div style={{ height: '1px', background: 'rgba(0,229,200,0.1)' }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Server size={12} color={connectors.length > 0 ? cyan : '#6B85A0'} />
                <span style={{ fontSize: '10px', color: '#8FA3B8' }}>
                  {connectors.length > 0
                    ? `${connectors[0].connector_type.toUpperCase()} (${connectors[0].client_id})`
                    : 'Aucun ERP'}
                </span>
                <span style={{ fontSize: '9px', color: connectors.length > 0 ? '#00E676' : '#6B85A0', marginLeft: 'auto', fontWeight: 700 }}>
                  {connectors.length > 0 ? 'ACTIF' : 'INACTIF'}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Cpu size={12} color={cyan} />
                <span style={{ fontSize: '10px', color: '#8FA3B8' }}>{allowedAgents.length} Agents</span>
                <div style={{ marginLeft: 'auto', display: 'flex', gap: '3px' }}>
                  {allowedAgents.map((ag, i) => (
                    <div key={i} title={ag} style={{ width: '6px', height: '6px', borderRadius: '50%', background: cyan, opacity: 0.6 + (i % 6) * 0.07, boxShadow: `0 0 4px ${cyan}` }} />
                  ))}
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* ───────────────────────────────────────────
            CENTER — PROFILE FORM CARD
        ─────────────────────────────────────────── */}
        <div className={`profile-form-column ${mobileTab !== 'form' && mobileTab !== 'all' ? 'profile-hide-mobile' : ''}`} style={{
          flex: 1.2, marginBottom: '32px',
          background: 'linear-gradient(155deg, rgba(7,18,36,0.95) 0%, rgba(3,10,22,0.98) 100%)',
          border: '1px solid rgba(0,229,200,0.32)',
          borderRadius: '16px', padding: '28px 32px',
          position: 'relative',
          boxShadow: '0 0 50px rgba(0,229,200,0.12), 0 24px 60px rgba(0,0,0,0.9)',
          backdropFilter: 'blur(18px)',
          minWidth: '280px'
        }}>
          {/* Corner brackets */}
          {[
            { top: 0, left: 0, borderTop: `2px solid ${cyan}`, borderLeft: `2px solid ${cyan}`, borderRadius: '16px 0 0 0' },
            { top: 0, right: 0, borderTop: `2px solid ${cyan}`, borderRight: `2px solid ${cyan}`, borderRadius: '0 16px 0 0' },
            { bottom: 0, left: 0, borderBottom: `2px solid ${cyan}`, borderLeft: `2px solid ${cyan}`, borderRadius: '0 0 0 16px', opacity: 0.45 },
            { bottom: 0, right: 0, borderBottom: `2px solid ${cyan}`, borderRight: `2px solid ${cyan}`, borderRadius: '0 0 16px 0', opacity: 0.45 },
          ].map((s, i) => (
            <div key={i} style={{ position: 'absolute', width: '36px', height: '36px', opacity: s.opacity ?? 0.8, ...s }} />
          ))}

          {/* Top shimmer */}
          <div style={{ position: 'absolute', top: 0, left: '18%', right: '18%', height: '1px', background: `linear-gradient(90deg, transparent, ${cyan}, transparent)`, opacity: 0.65 }} />

          {/* User badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '26px', paddingBottom: '20px', borderBottom: '1px solid rgba(0,229,200,0.12)', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', width: '66px', height: '66px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="66" height="66" viewBox="0 0 100 100" style={{ position: 'absolute', inset: 0 }}>
                <polygon points="50 3,93 25,93 75,50 97,7 75,7 25" fill="rgba(0,229,200,0.07)" stroke={cyan} strokeWidth="2.5" />
              </svg>
              <span style={{ fontSize: '21px', fontWeight: 900, color: cyan, zIndex: 2, textShadow: `0 0 12px rgba(0,229,200,0.6)` }}>
                {avatarInitials}
              </span>
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <h2 style={{ margin: 0, fontSize: '21px', fontWeight: 800, color: '#FFFFFF' }}>
                  {firstName || lastName ? `${firstName} ${lastName}`.trim() : username || 'Utilisateur'}
                </h2>
                <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 9px', borderRadius: '10px', background: 'rgba(0,229,200,0.1)', color: cyan, border: '1px solid rgba(0,229,200,0.3)' }}>
                  @{username || 'user'}
                </span>
              </div>
              <div style={{ fontSize: '12px', color: '#7A96AE', marginTop: '5px', display: 'flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap' }}>
                <Shield size={13} color={cyan} />
                Rôle : <span style={{ color: '#FFFFFF', fontWeight: 700 }}>{roleLabel || 'Administrateur'}</span>
              </div>
            </div>
          </div>

          {/* Alerts */}
          {successMessage && (
            <div style={{ padding: '11px 15px', background: 'rgba(0,229,200,0.09)', border: '1px solid rgba(0,229,200,0.38)', color: cyan, borderRadius: '10px', fontSize: '12.5px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckCircle2 size={15} />{successMessage}
            </div>
          )}
          {errorMessage && (
            <div style={{ padding: '11px 15px', background: 'rgba(255,71,87,0.09)', border: '1px solid rgba(255,71,87,0.38)', color: '#FF6B7A', borderRadius: '10px', fontSize: '12.5px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertCircle size={15} />{errorMessage}
            </div>
          )}

          {/* Form */}
          <form id="profile-form" onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

            {/* Row: Prénom + Nom */}
            <div className="profile-name-row" style={{ display: 'flex', gap: '16px' }}>
              {[
                { lbl: 'PRÉNOM', val: firstName, set: setFirstName, type: 'text' },
                { lbl: 'NOM',    val: lastName,  set: setLastName,  type: 'text' },
              ].map(({ lbl, val, set, type }) => (
                <div key={lbl} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={labelStyle}><User size={11} color={cyan} /> {lbl}</label>
                  <div style={{ position: 'relative' }}>
                    <User size={15} color={cyan} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', opacity: 0.75, pointerEvents: 'none' }} />
                    <input type={type} style={inputStyle()} value={val} onChange={e => set(e.target.value)} required />
                  </div>
                </div>
              ))}
            </div>

            {/* Email */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={labelStyle}><Mail size={11} color={cyan} /> ADRESSE EMAIL</label>
              <div style={{ position: 'relative' }}>
                <Mail size={15} color={cyan} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', opacity: 0.75, pointerEvents: 'none' }} />
                <input type="email" style={inputStyle()} value={email} onChange={e => setEmail(e.target.value)} required />
              </div>
            </div>

            {/* Phone */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={labelStyle}><Phone size={11} color={cyan} /> NUMÉRO DE TÉLÉPHONE</label>
              <div style={{ position: 'relative' }}>
                <Phone size={15} color={cyan} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', opacity: 0.75, pointerEvents: 'none' }} />
                <input type="text" style={inputStyle()} value={phone} onChange={e => setPhone(e.target.value)} />
              </div>
            </div>

            {/* Password section */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', paddingTop: '18px', borderTop: '1px solid rgba(0,229,200,0.13)' }}>
              <div style={{ fontSize: '10.5px', fontWeight: 800, color: cyan, textTransform: 'uppercase', letterSpacing: '0.13em', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Lock size={13} color={cyan} />
                CHANGEMENT DE MOT DE PASSE (OPTIONNEL)
              </div>

              {/* Current password */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label style={labelStyle}><Lock size={11} color={cyan} /> MOT DE PASSE ACTUEL</label>
                  {currentPassword.length > 0 && (
                    verifyingCurrentPassword ? (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '10px', fontWeight: 700, color: '#6B85A0' }}>
                        <span style={{ display: 'inline-flex', gap: '3px', alignItems: 'center' }}>
                          <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: cyan, display: 'inline-block', animation: 'dot-blink 1.2s 0.0s ease-in-out infinite', opacity: 0.3 }} />
                          <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: cyan, display: 'inline-block', animation: 'dot-blink 1.2s 0.2s ease-in-out infinite', opacity: 0.3 }} />
                          <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: cyan, display: 'inline-block', animation: 'dot-blink 1.2s 0.4s ease-in-out infinite', opacity: 0.3 }} />
                        </span>
                        Vérification
                      </span>
                    ) : (
                      <span style={{ fontSize: '10px', fontWeight: 800, color: currentPasswordValid ? '#00E676' : '#FF4757' }}>
                        {currentPasswordValid ? '✓ Correct' : '✗ Incorrect'}
                      </span>
                    )
                  )}
                </div>
                <div style={{ position: 'relative' }}>
                  <Lock size={15} color={currentPassword.length > 0 && currentPasswordValid === false ? '#FF4757' : cyan} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', opacity: 0.75, pointerEvents: 'none' }} />
                  <input
                    type={showCurrentPassword ? 'text' : 'password'}
                    style={{
                      ...inputStyle(currentPassword.length > 0 ? (currentPasswordValid ? '1px solid #00E676' : '1px solid #FF4757') : undefined),
                      paddingRight: '44px',
                      boxShadow: currentPassword.length > 0 && currentPasswordValid === false ? '0 0 14px rgba(255,71,87,0.22)' : undefined
                    }}
                    value={currentPassword}
                    onChange={e => setCurrentPassword(e.target.value)}
                  />
                  <div onClick={() => setShowCurrentPassword(!showCurrentPassword)} style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', color: cyan, opacity: 0.7 }}>
                    {showCurrentPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </div>
                </div>
              </div>

              {/* New password */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={labelStyle}><Lock size={11} color={cyan} /> NOUVEAU MOT DE PASSE</label>
                <div style={{ position: 'relative' }}>
                  <Lock size={15} color={cyan} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', opacity: 0.75, pointerEvents: 'none' }} />
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    style={{ ...inputStyle(), paddingRight: '44px' }}
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    minLength={6}
                  />
                  <div onClick={() => setShowNewPassword(!showNewPassword)} style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', color: cyan, opacity: 0.7 }}>
                    {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </div>
                </div>
              </div>

              {/* Confirm password */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label style={labelStyle}><Lock size={11} color={cyan} /> CONFIRMER LE MOT DE PASSE</label>
                  {confirmPassword.length > 0 && (
                    <span style={{ fontSize: '10px', fontWeight: 800, color: (newPassword === confirmPassword && newPassword.length >= 6) ? '#00E676' : '#FF4757' }}>
                      {newPassword.length < 6 ? '✗ Trop court' : newPassword === confirmPassword ? '✓ Conformes' : '✗ Différents'}
                    </span>
                  )}
                </div>
                <div style={{ position: 'relative' }}>
                  <Lock size={15}
                    color={confirmPassword.length > 0 ? ((newPassword === confirmPassword && newPassword.length >= 6) ? '#00E676' : '#FF4757') : cyan}
                    style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', opacity: 0.75, pointerEvents: 'none' }}
                  />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    style={{
                      ...inputStyle(confirmPassword.length > 0 ? ((newPassword === confirmPassword && newPassword.length >= 6) ? '1px solid #00E676' : '1px solid #FF4757') : undefined),
                      paddingRight: '44px',
                      boxShadow: confirmPassword.length > 0 && (newPassword === confirmPassword && newPassword.length >= 6) ? '0 0 14px rgba(0,230,118,0.2)' : undefined
                    }}
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                  />
                  <div onClick={() => setShowConfirmPassword(!showConfirmPassword)} style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', color: cyan, opacity: 0.7 }}>
                    {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '20px', borderTop: '1px solid rgba(0,229,200,0.12)', marginTop: '6px', flexWrap: 'wrap', gap: '12px' }}>
              <button
                type="button"
                onClick={handleLogout}
                style={{ display: 'flex', alignItems: 'center', gap: '7px', background: 'transparent', border: 'none', color: '#FF4757', fontWeight: 800, fontSize: '12px', letterSpacing: '0.1em', cursor: 'pointer', textTransform: 'uppercase' }}
              >
                <LogOut size={15} color="#FF4757" />
                DÉCONNEXION
              </button>

              <button
                type="submit"
                disabled={isSaving || isLoading || isPasswordFormBlocked}
                style={{
                  background: (isSaving || isLoading || isPasswordFormBlocked) ? 'rgba(80,100,120,0.1)' : 'linear-gradient(90deg, rgba(0,229,200,0.16) 0%, rgba(0,229,200,0.06) 100%)',
                  color: (isSaving || isLoading || isPasswordFormBlocked) ? '#4A6070' : cyan,
                  border: `1px solid ${(isSaving || isLoading || isPasswordFormBlocked) ? 'rgba(80,100,120,0.25)' : cyan}`,
                  padding: '12px 30px', borderRadius: '10px',
                  fontWeight: 800, fontSize: '12.5px', letterSpacing: '0.12em', textTransform: 'uppercase',
                  cursor: (isSaving || isLoading || isPasswordFormBlocked) ? 'not-allowed' : 'pointer',
                  boxShadow: (isSaving || isLoading || isPasswordFormBlocked) ? 'none' : '0 0 22px rgba(0,229,200,0.28)',
                  transition: 'all 0.2s ease'
                }}
              >
                {isSaving ? 'ENREGISTREMENT...' : 'SAUVEGARDER'}
              </button>
            </div>

          </form>
        </div>

        {/* ───────────────────────────────────────────
            RIGHT — LIVE METRICS (without STATUT SESSION card)
        ─────────────────────────────────────────── */}
        <div className={`profile-metrics-column ${mobileTab !== 'erp' && mobileTab !== 'all' ? 'profile-hide-mobile' : ''}`} style={{ display: 'flex', flexDirection: 'column', gap: '14px', paddingTop: '4px', minWidth: '240px' }}>

          {/* ERP Connector */}
          <div style={{
            background: 'rgba(5,14,28,0.88)', border: '1px solid rgba(0,229,200,0.26)',
            borderRadius: '14px', padding: '18px 20px',
            backdropFilter: 'blur(12px)', boxShadow: '0 8px 30px rgba(0,0,0,0.45)',
            display: 'flex', flexDirection: 'column', gap: '12px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '9.5px', fontWeight: 800, color: cyan, letterSpacing: '0.14em', textTransform: 'uppercase' }}>
                CONNECTEUR ERP ({connectors.length})
              </span>
              <span style={{
                fontSize: '9.5px', fontWeight: 800,
                color: connectors.length > 0 ? '#00E676' : '#6B85A0',
                background: connectors.length > 0 ? 'rgba(0,230,118,0.1)' : 'rgba(107,133,160,0.1)',
                border: `1px solid ${connectors.length > 0 ? 'rgba(0,230,118,0.25)' : 'rgba(107,133,160,0.25)'}`,
                padding: '2px 7px', borderRadius: '5px'
              }}>
                {connectors.length > 0 ? 'CONNECTÉ' : 'AUCUN'}
              </span>
            </div>

            {connectors.length > 0 ? (
              connectors.map((c, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', borderTop: i > 0 ? '1px solid rgba(0,229,200,0.1)' : 'none', paddingTop: i > 0 ? '10px' : '0' }}>
                  <Server size={16} color={cyan} />
                  <div style={{ fontSize: '13px', fontWeight: 800, color: '#FFFFFF' }}>
                    {c.connector_type.toUpperCase()}
                  </div>
                </div>
              ))
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Server size={16} color="#6B85A0" />
                <div style={{ fontSize: '13px', fontWeight: 800, color: '#8FA3B8' }}>Aucun connecteur ERP</div>
              </div>
            )}
          </div>

          {/* Agents autorisés */}
          <div style={{
            background: 'rgba(5,14,28,0.88)', border: '1px solid rgba(0,229,200,0.26)',
            borderRadius: '14px', padding: '18px 20px',
            backdropFilter: 'blur(12px)', boxShadow: '0 8px 30px rgba(0,0,0,0.45)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <span style={{ fontSize: '9.5px', fontWeight: 800, color: cyan, letterSpacing: '0.14em', textTransform: 'uppercase' }}>
                AGENTS AUTORISÉS
              </span>
              <span style={{
                fontSize: '9.5px', fontWeight: 800,
                color: allowedAgents.length > 0 ? cyan : '#6B85A0',
                background: allowedAgents.length > 0 ? 'rgba(0,229,200,0.1)' : 'rgba(107,133,160,0.1)',
                border: `1px solid ${allowedAgents.length > 0 ? 'rgba(0,229,200,0.25)' : 'rgba(107,133,160,0.25)'}`,
                padding: '2px 7px', borderRadius: '5px'
              }}>
                {allowedAgents.length} {allowedAgents.length === 1 ? 'ACTIF' : 'ACTIFS'}
              </span>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {allowedAgents.length > 0 ? (
                allowedAgents.map(ag => (
                  <span key={ag} style={{
                    fontSize: '9.5px', fontWeight: 800, color: cyan,
                    background: 'rgba(0,229,200,0.09)', border: '1px solid rgba(0,229,200,0.28)',
                    padding: '3px 8px', borderRadius: '6px'
                  }}>
                    {ag}
                  </span>
                ))
              ) : (
                <span style={{ fontSize: '11px', color: '#6B85A0', fontStyle: 'italic' }}>
                  Aucun agent autorisé
                </span>
              )}
            </div>
          </div>

        </div>

      </div>

      {/* Keyframe animations and responsive styles injected */}
      <style>{`
        @keyframes ring-cw  { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes ring-ccw { from { transform: rotate(0deg); } to { transform: rotate(-360deg); } }
        @keyframes scan-line {
          0%   { top: 20%; opacity: 0; }
          20%  { opacity: 1; }
          80%  { opacity: 1; }
          100% { top: 80%; opacity: 0; }
        }
        @keyframes dot-blink {
          0%, 80%, 100% { opacity: 0.2; transform: scale(0.8); }
          40%            { opacity: 1;   transform: scale(1.3); }
        }

        @media (max-width: 1150px) {
          .profile-mobile-nav {
            display: flex !important;
          }
          .profile-scroll-wrap {
            flex-direction: column !important;
            align-items: center !important;
            justify-content: flex-start !important;
            padding: 16px 12px 40px !important;
          }
          .profile-hud-column {
            width: 100% !important;
            max-width: 480px !important;
            margin: 0 auto 24px !important;
          }
          .profile-form-column {
            width: 100% !important;
            max-width: 680px !important;
            margin: 0 auto !important;
            padding: 24px 18px !important;
          }
          .profile-metrics-column {
            width: 100% !important;
            max-width: 480px !important;
            margin: 0 auto !important;
          }
          .profile-hide-mobile {
            display: none !important;
          }
        }

        @media (min-width: 1151px) {
          .profile-mobile-nav {
            display: none !important;
          }
          .profile-hud-column,
          .profile-form-column,
          .profile-metrics-column {
            display: flex !important;
          }
          .profile-hide-mobile {
            display: flex !important;
          }
        }

        @media (max-width: 600px) {
          .profile-name-row {
            flex-direction: column !important;
            gap: 16px !important;
          }
        }
      `}</style>
    </div>
  );
};
