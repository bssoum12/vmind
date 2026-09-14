'use client';

import '../login/login.css';
import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ShieldCheck, Mail, Lock, Eye, EyeOff, Key, Check, Loader2, ArrowRight, ShieldAlert } from 'lucide-react';
import { Turnstile } from '@marsidev/react-turnstile';

const cyan = '#00E5C8';
const cyan2 = '#00ffd5';
const white = '#FFFFFF';
const muted = '#8FA3B8';

function PremiumBackground() {
  return (
    <svg
      viewBox="0 0 1440 900"
      preserveAspectRatio="xMidYMid slice"
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 0 }}
    >
      <defs>
        <radialGradient id="reset-blob1" cx="30%" cy="55%" r="50%">
          <stop offset="0%" stopColor="rgba(0,229,200,0.07)" />
          <stop offset="100%" stopColor="transparent" />
        </radialGradient>
        <radialGradient id="reset-blob2" cx="75%" cy="35%" r="40%">
          <stop offset="0%" stopColor="rgba(0,180,255,0.04)" />
          <stop offset="100%" stopColor="transparent" />
        </radialGradient>
        <radialGradient id="reset-blob3" cx="55%" cy="80%" r="35%">
          <stop offset="0%" stopColor="rgba(0,229,200,0.04)" />
          <stop offset="100%" stopColor="transparent" />
        </radialGradient>

        <filter id="trace-blur-reset">
          <feGaussianBlur stdDeviation="0.4" />
        </filter>
        <filter id="dot-glow-reset">
          <feGaussianBlur stdDeviation="0.8" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      <rect width="1440" height="900" fill="url(#reset-blob1)" />
      <rect width="1440" height="900" fill="url(#reset-blob2)" />
      <rect width="1440" height="900" fill="url(#reset-blob3)" />

      {/* Floating particles */}
      <g fill="rgba(33,243,214,0.18)">
        {[
          { x: 120, y: 130, r: 0.8 }, { x: 280, y: 70, r: 0.6 },
          { x: 490, y: 220, r: 0.9 }, { x: 680, y: 100, r: 0.7 },
          { x: 890, y: 180, r: 0.8 }, { x: 1150, y: 60, r: 0.5 },
          { x: 190, y: 380, r: 0.9 }, { x: 430, y: 450, r: 0.6 },
          { x: 620, y: 350, r: 1.0 }, { x: 820, y: 470, r: 0.7 },
          { x: 1020, y: 390, r: 0.5 }, { x: 1280, y: 430, r: 0.9 },
        ].map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={p.r} />
        ))}
      </g>

      {/* Subtle circuit traces */}
      <g stroke="rgba(0,229,200,0.045)" strokeWidth="0.9" fill="none" filter="url(#trace-blur-reset)" strokeLinecap="round" strokeLinejoin="round">
        <path d="M 0,220 H 160 L 210,270 H 340 L 370,240 H 450" />
        <path d="M 120,0 V 120 L 160,160 H 300" />
        <path d="M 0,380 H 220 L 260,420 H 440 L 470,390 H 550" />
        <path d="M 820,320 L 760,260 H 650" />
        <path d="M 980,100 H 1100 L 1150,150 H 1320 L 1350,120 H 1440" />
        <path d="M 780,720 H 880 L 930,770 H 1120 L 1150,740 H 1440" />
      </g>
    </svg>
  );
}

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Secure token or legacy parameters
  const [tokenParam, setTokenParam] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Password Visibility
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Status & Validation
  const [isValidatingToken, setIsValidatingToken] = useState(false);
  const [isTokenValid, setIsTokenValid] = useState(false);
  const [validationError, setValidationError] = useState('');
  
  // Submit Status
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [countdown, setCountdown] = useState(3);

  // Turnstile State
  const [turnstileToken, setTurnstileToken] = useState('');
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const isTurnstileConfigured = !!(siteKey && siteKey !== 'your_cloudflare_site_key');

  // Pre-populate & verify from query parameters on mount, then clean URL immediately
  useEffect(() => {
    if (!searchParams) return;
    const rawToken = searchParams.get('token') || searchParams.get('t');
    const emailParam = searchParams.get('email');
    const codeParam = searchParams.get('code');

    if (rawToken) {
      setTokenParam(rawToken);
      verifySecurityToken({ token: rawToken });
      if (typeof window !== 'undefined') {
        window.history.replaceState({}, '', '/reset-password');
      }
    } else if (emailParam && codeParam) {
      setEmail(emailParam);
      setCode(codeParam);
      verifySecurityToken({ email: emailParam, code: codeParam });
      if (typeof window !== 'undefined') {
        window.history.replaceState({}, '', '/reset-password');
      }
    } else if (emailParam) {
      setEmail(emailParam);
    }
  }, [searchParams]);

  const verifySecurityToken = async (payload: { token?: string; email?: string; code?: string }) => {
    try {
      setIsValidatingToken(true);
      setValidationError('');
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'https://localhost:3001';
      const res = await fetch(`${baseUrl}/api/auth/vmind/verify-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      const data = await res.json();
      if (res.ok && data.ok) {
        setIsTokenValid(true);
        if (data.email) setEmail(data.email);
      } else {
        setIsTokenValid(false);
        setValidationError(data.error || "Lien ou code d'activation invalide.");
      }
    } catch (err: any) {
      setIsTokenValid(false);
      if (err.name === 'AbortError') {
        setValidationError('Le serveur met du temps à répondre. Vérifiez votre connexion.');
      } else {
        setValidationError('Impossible de joindre le serveur de sécurité.');
      }
    } finally {
      setIsValidatingToken(false);
    }
  };

  // Live validation if email and code are entered manually
  useEffect(() => {
    if (tokenParam || isTokenValid) return;
    if (!email || !code || code.length < 16) {
      return;
    }

    const timer = setTimeout(() => {
      verifySecurityToken({ email, code });
    }, 400);

    return () => clearTimeout(timer);
  }, [email, code, tokenParam, isTokenValid]);

  // Handle countdown and redirect on success
  useEffect(() => {
    if (!success) return;
    if (countdown === 0) {
      router.push('/login');
      return;
    }
    const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    return () => clearTimeout(timer);
  }, [success, countdown, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isTokenValid) {
      setError("Veuillez d'abord valider votre lien ou code d'activation.");
      return;
    }

    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }

    if (password.length < 6) {
      setError('Le mot de passe doit faire au moins 6 caractères.');
      return;
    }

    try {
      setLoading(true);
      setError('');
      const payload: any = {
        password,
        turnstileToken
      };

      if (tokenParam) {
        payload.token = tokenParam;
      } else {
        payload.email = email;
        payload.code = code;
      }

      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'https://localhost:3001';
      const res = await fetch(`${baseUrl}/api/auth/vmind/activate-account`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setSuccess('Votre compte a été activé avec succès !');
      } else {
        setError(data.error || "Erreur lors de l'activation.");
      }
    } catch (err) {
      setError("Erreur réseau. Impossible d'activer le compte.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-wrapper" style={{
      position: 'relative', width: '100%', minHeight: '100vh',
      background: '#020813', display: 'flex', flexDirection: 'column',
      fontFamily: "'Inter', sans-serif", overflowX: 'hidden'
    }}>
      <PremiumBackground />

      <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10, padding: '40px 20px' }}>
        <div className="anim-card" style={{
          width: '100%', maxWidth: '480px',
          background: 'linear-gradient(160deg, rgba(8,20,38,0.98) 0%, rgba(4,12,24,0.99) 100%)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: `1px solid rgba(0,229,200,0.48)`,
          borderRadius: '22px',
          padding: '40px 42px 34px',
          position: 'relative', overflow: 'hidden',
          boxShadow: `0 0 40px rgba(0,229,200,0.18)`
        }}>
          {/* Neon Corner Accents */}
          <div style={{ position: 'absolute', top: 0, left: 0, width: '40px', height: '40px', borderTop: `2px solid ${cyan}`, borderLeft: `2px solid ${cyan}`, borderRadius: '22px 0 0 0', opacity: 0.8 }} />
          <div style={{ position: 'absolute', top: 0, right: 0, width: '40px', height: '40px', borderTop: `2px solid ${cyan}`, borderRight: `2px solid ${cyan}`, borderRadius: '0 22px 0 0', opacity: 0.8 }} />
          <div style={{ position: 'absolute', bottom: 0, left: 0, width: '40px', height: '40px', borderBottom: `2px solid ${cyan}`, borderLeft: `2px solid ${cyan}`, borderRadius: '0 0 0 22px', opacity: 0.4 }} />
          <div style={{ position: 'absolute', bottom: 0, right: 0, width: '40px', height: '40px', borderBottom: `2px solid ${cyan}`, borderRight: `2px solid ${cyan}`, borderRadius: '0 0 22px 0', opacity: 0.4 }} />

          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: '28px' }}>
            <div style={{ marginBottom: '14px' }}>
              <span style={{ fontSize: '26px', fontWeight: 900, color: cyan, letterSpacing: '0.14em', textShadow: `0 0 18px rgba(0,229,200,0.4)` }}>VMIND</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', marginBottom: '14px' }}>
              <div style={{ height: '1px', width: '40px', background: `linear-gradient(90deg, transparent, rgba(0,229,200,0.4))` }} />
              <ShieldCheck size={17} color={cyan} />
              <div style={{ height: '1px', width: '40px', background: `linear-gradient(90deg, rgba(0,229,200,0.4), transparent)` }} />
            </div>
            <h2 style={{ fontSize: '13.5px', fontWeight: 700, color: white, letterSpacing: '0.1em', marginBottom: '8px', textTransform: 'uppercase' }}>
              Activation du Compte
            </h2>
            <p style={{ fontSize: '12.5px', color: muted, lineHeight: 1.5 }}>
              Définition sécurisée du mot de passe utilisateur
            </p>
          </div>

          {/* Loading validation indicator if auto-validating token in background */}
          {isValidatingToken && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px', padding: '24px 0' }}>
              <Loader2 size={36} className="anim-spin" style={{ color: cyan }} />
              <p style={{ fontSize: '13px', color: muted }}>Vérification du lien de sécurité...</p>
            </div>
          )}

          {/* Success state */}
          {success && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', alignItems: 'center', textAlign: 'center', padding: '20px 0' }}>
              <div style={{ width: '54px', height: '54px', borderRadius: '50%', background: 'rgba(0,229,200,0.1)', border: `2px solid ${cyan}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Check size={30} color={cyan} />
              </div>
              <p style={{ fontSize: '14px', color: white, fontWeight: 600 }}>{success}</p>
              <p style={{ fontSize: '12.5px', color: muted }}>
                Redirection automatique vers l&apos;écran de connexion dans {countdown} secondes...
              </p>
              <button onClick={() => router.push('/login')} className="cta-btn" style={{ width: '100%', height: '48px', borderRadius: '12px', border: 'none', background: `linear-gradient(90deg, ${cyan} 0%, ${cyan2} 100%)`, color: '#021010', fontSize: '13px', fontWeight: 800, cursor: 'pointer', boxShadow: `0 0 20px rgba(0,229,200,0.3)` }}>
                Se connecter maintenant
              </button>
            </div>
          )}

          {/* Main Form */}
          {!isValidatingToken && !success && (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {error && (
                <div style={{ padding: '11px 14px', background: 'rgba(255,71,87,0.08)', border: '1px solid rgba(255,71,87,0.4)', color: '#ff6b7a', borderRadius: '10px', fontSize: '13px', textAlign: 'center' }}>
                  {error}
                </div>
              )}

              {validationError && !isTokenValid && (
                <div style={{ padding: '11px 14px', background: 'rgba(255,71,87,0.08)', border: '1px solid rgba(255,71,87,0.4)', color: '#ff6b7a', borderRadius: '10px', fontSize: '13px', textAlign: 'center' }}>
                  {validationError}
                </div>
              )}

              {/* Verified account badge (when validated via secure token) */}
              {isTokenValid && email && (
                <div style={{
                  padding: '12px 16px',
                  background: 'rgba(0, 229, 200, 0.05)',
                  border: '1px solid rgba(0, 229, 200, 0.25)',
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '10px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <ShieldCheck size={18} color={cyan} />
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: '10px', color: muted, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>Compte vérifié</span>
                      <span style={{ fontSize: '13px', color: white, fontWeight: 600 }}>{email}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Email & Code fields (displayed when not yet validated or in manual mode) */}
              {!isTokenValid && (
                <>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                    <label style={{ fontSize: '10px', fontWeight: 700, color: cyan, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Adresse Email</label>
                    <div style={{ position: 'relative' }}>
                      <Mail size={16} color={muted} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                      <input
                        type="email"
                        className="vmind-input"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        placeholder="Saisissez votre e-mail"
                        required
                      />
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <label style={{ fontSize: '10px', fontWeight: 700, color: cyan, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Code d&apos;activation</label>
                      {email.trim().length > 0 && code.trim().length >= 10 && (
                        <span style={{ fontSize: '10px', color: isValidatingToken ? muted : isTokenValid ? '#00e676' : '#ff4757', fontWeight: 600 }}>
                          {isValidatingToken ? 'Vérification...' : isTokenValid ? '✓ Code validé' : '✗ Code invalide'}
                        </span>
                      )}
                    </div>
                    <div style={{ position: 'relative' }}>
                      <Key size={16} color={muted} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                      <input
                        type="text"
                        className="vmind-input"
                        value={code}
                        onChange={e => setCode(e.target.value.replace(/\s+/g, ''))}
                        placeholder="Entrez votre code d'activation (16 car.)"
                        required
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => verifySecurityToken({ email, code })}
                    disabled={isValidatingToken || !email || !code}
                    className="cta-btn"
                    style={{
                      width: '100%', height: '48px', borderRadius: '12px', marginTop: '4px',
                      background: (isValidatingToken || !email || !code) ? 'rgba(143,163,184,0.12)' : `linear-gradient(90deg, ${cyan} 0%, ${cyan2} 100%)`,
                      color: (isValidatingToken || !email || !code) ? muted : '#021010',
                      border: 'none', cursor: (isValidatingToken || !email || !code) ? 'not-allowed' : 'pointer',
                      fontSize: '13px', fontWeight: 800, letterSpacing: '0.06em'
                    }}
                  >
                    {isValidatingToken ? 'VÉRIFICATION EN COURS...' : 'VALIDER LE CODE'}
                  </button>
                </>
              )}

              {/* Password fields revealed once code/token is validated */}
              {isTokenValid && (
                <div className="slide-right" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {/* Nouveau mot de passe */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                    <label style={{ fontSize: '10px', fontWeight: 700, color: cyan, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Nouveau mot de passe</label>
                    <div style={{ position: 'relative' }}>
                      <Lock size={16} color={muted} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        className="vmind-input"
                        style={{ paddingRight: '48px' }}
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        placeholder="Définir un mot de passe robuste"
                        required
                        minLength={6}
                      />
                      <div onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: '15px', top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', color: muted }}>
                        {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                      </div>
                    </div>
                  </div>

                  {/* Confirmer le mot de passe */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <label style={{ fontSize: '10px', fontWeight: 700, color: cyan, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Confirmer le mot de passe</label>
                      {password.length > 0 && confirmPassword.length > 0 && (
                        <span style={{ fontSize: '10px', color: password === confirmPassword ? '#00e676' : '#ff4757', fontWeight: 600 }}>
                          {password === confirmPassword ? '✓ Mots de passe conformes' : '✗ Non correspondants'}
                        </span>
                      )}
                    </div>
                    <div style={{ position: 'relative' }}>
                      <Lock size={16} color={muted} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        className="vmind-input"
                        style={{ paddingRight: '48px' }}
                        value={confirmPassword}
                        onChange={e => setConfirmPassword(e.target.value)}
                        placeholder="Confirmez votre saisie"
                        required
                      />
                      <div onClick={() => setShowConfirmPassword(!showConfirmPassword)} style={{ position: 'absolute', right: '15px', top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', color: muted }}>
                        {showConfirmPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                      </div>
                    </div>
                  </div>

                  {/* Cloudflare Turnstile */}
                  {isTurnstileConfigured && (
                    <div style={{ display: 'flex', justifyContent: 'center', marginTop: '4px' }}>
                      <Turnstile
                        siteKey={siteKey}
                        options={{ theme: 'dark', size: 'normal' }}
                        onSuccess={(token) => setTurnstileToken(token)}
                        onExpire={() => setTurnstileToken('')}
                        onError={() => setTurnstileToken('')}
                      />
                    </div>
                  )}

                  {/* Submit button */}
                  <button
                    type="submit"
                    className="cta-btn"
                    disabled={loading || password !== confirmPassword || password.length < 6 || (isTurnstileConfigured && !turnstileToken)}
                    style={{
                      width: '100%', height: '54px', borderRadius: '12px', marginTop: '6px',
                      background: (loading || password !== confirmPassword || password.length < 6 || (isTurnstileConfigured && !turnstileToken))
                        ? 'rgba(143,163,184,0.12)'
                        : `linear-gradient(90deg, ${cyan} 0%, ${cyan2} 100%)`,
                      color: (loading || password !== confirmPassword || password.length < 6 || (isTurnstileConfigured && !turnstileToken)) ? muted : '#021010',
                      border: 'none', cursor: (loading || password !== confirmPassword || password.length < 6 || (isTurnstileConfigured && !turnstileToken)) ? 'not-allowed' : 'pointer',
                      fontSize: '13.5px', fontWeight: 800, letterSpacing: '0.08em',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                      boxShadow: (loading || password !== confirmPassword || password.length < 6 || (isTurnstileConfigured && !turnstileToken)) ? 'none' : `0 0 28px rgba(0,229,200,0.42), 0 8px 24px rgba(0,0,0,0.4)`,
                      fontFamily: 'inherit',
                    }}
                  >
                    {loading ? 'ACTIVATION EN COURS...' : 'ACTIVER MON COMPTE'}
                    {!loading && <ArrowRight size={17} strokeWidth={2.5} />}
                  </button>
                </div>
              )}
            </form>
          )}

          {/* Card footer */}
          <div style={{ textAlign: 'center', marginTop: '26px', fontSize: '12px', color: muted }}>
            <span onClick={() => router.push('/login')} style={{ color: cyan, cursor: 'pointer', fontWeight: 600, textDecoration: 'underline' }}>
              Retourner à l&apos;écran de connexion
            </span>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer style={{
        position: 'relative', zIndex: 20,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 36px', fontSize: '10.5px', color: muted,
        borderTop: '1px solid rgba(0,229,200,0.05)',
      }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <ShieldCheck size={12} color={cyan} /> Infrastructure sécurisée par VirtualDev
        </span>
        <span>© 2026 VMIND • Tous droits réservés</span>
      </footer>

      <style jsx global>{`
        .vmind-input {
          width: 100%;
          height: 46px;
          background: rgba(14, 28, 48, 0.6);
          border: 1px solid rgba(0, 229, 200, 0.22);
          border-radius: 10px;
          color: #ffffff;
          font-size: 13px;
          padding: 0 16px 0 44px;
          outline: none;
          transition: all 0.2s ease;
          font-family: inherit;
        }
        .vmind-input:focus {
          border-color: #00E5C8;
          box-shadow: 0 0 12px rgba(0, 229, 200, 0.25);
          background: rgba(14, 28, 48, 0.9);
        }
        .vmind-input::placeholder {
          color: rgba(143, 163, 184, 0.5);
        }
      `}</style>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div style={{ width: '100%', minHeight: '100vh', background: '#020813', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8FA3B8' }}>
        <Loader2 size={32} className="anim-spin" style={{ color: '#00E5C8' }} />
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  );
}
