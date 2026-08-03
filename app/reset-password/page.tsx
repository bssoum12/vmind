'use client';

import '../login/login.css';
import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ShieldCheck, Mail, Lock, Eye, EyeOff, Key, Check, Loader2, ArrowRight } from 'lucide-react';
import { Turnstile } from '@marsidev/react-turnstile';

const cyan = '#00E5C8';
const cyan2 = '#00ffd5';
const white = '#FFFFFF';
const muted = '#8FA3B8';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Form Fields
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Password Visibility
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Status & Validation
  const [isValidatingCode, setIsValidatingCode] = useState(false);
  const [isCodeValid, setIsCodeValid] = useState(false);
  const [codeError, setCodeError] = useState('');
  
  // Submit Status
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [countdown, setCountdown] = useState(3);

  // Turnstile State
  const [turnstileToken, setTurnstileToken] = useState('');
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const isTurnstileConfigured = !!(siteKey && siteKey !== 'your_cloudflare_site_key');

  // Pre-populate from query parameters
  useEffect(() => {
    const emailParam = searchParams.get('email');
    const codeParam = searchParams.get('code');
    if (emailParam) setEmail(emailParam);
    if (codeParam) setCode(codeParam);
  }, [searchParams]);

  // Background instant validation of code as user types
  useEffect(() => {
    if (!email || !code || code.length < 16) {
      setIsCodeValid(false);
      setCodeError('');
      return;
    }

    const verifyCode = async () => {
      try {
        setIsValidatingCode(true);
        setCodeError('');
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'https://localhost:3001'}/api/auth/vmind/verify-code`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, code })
        });
        const data = await res.json();
        if (data.ok) {
          setIsCodeValid(true);
        } else {
          setIsCodeValid(false);
          setCodeError(data.error || 'Code invalide.');
        }
      } catch (err) {
        setIsCodeValid(false);
        setCodeError('Erreur de connexion serveur.');
      } finally {
        setIsValidatingCode(false);
      }
    };

    // Debounce verify check (300ms)
    const timer = setTimeout(verifyCode, 300);
    return () => clearTimeout(timer);

  }, [email, code]);

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
    if (!isCodeValid) return;

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
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'https://localhost:3001'}/api/auth/vmind/activate-account`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code, password, turnstileToken })
      });
      const data = await res.json();
      if (data.ok) {
        setSuccess('Votre compte a été activé avec succès !');
      } else {
        setError(data.error || 'Erreur lors de l\'activation.');
      }
    } catch (err) {
      setError('Erreur réseau. Impossible d\'activer le compte.');
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
      
      {/* Visual background matching login design */}
      <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 0 }}>
        <div style={{ position: 'absolute', top: '10%', left: '15%', width: '380px', height: '380px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(0,229,200,0.06) 0%, transparent 70%)', filter: 'blur(30px)' }} />
        <div style={{ position: 'absolute', bottom: '15%', right: '10%', width: '420px', height: '420px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(0,ffd5,213,0.05) 0%, transparent 70%)', filter: 'blur(40px)' }} />
      </div>

      <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10, padding: '40px 20px' }}>
        <div className="anim-card" style={{
          width: '100%', maxWidth: '500px',
          background: 'linear-gradient(160deg, rgba(8,20,38,0.98) 0%, rgba(4,12,24,0.99) 100%)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: `1px solid rgba(0,229,200,0.48)`,
          borderRadius: '22px',
          padding: '40px 42px 34px',
          position: 'relative', overflow: 'hidden',
          boxShadow: `0 0 40px rgba(0,229,200,0.18)`
        }}>
          {/* Card neon borders */}
          <div style={{ position: 'absolute', top: 0, left: 0, width: '60px', height: '60px', borderTop: `2px solid ${cyan}`, borderLeft: `2px solid ${cyan}`, borderRadius: '22px 0 0 0', opacity: 0.6 }} />
          <div style={{ position: 'absolute', top: 0, right: 0, width: '60px', height: '60px', borderTop: `2px solid ${cyan}`, borderRight: `2px solid ${cyan}`, borderRadius: '0 22px 0 0', opacity: 0.6 }} />

          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: '30px' }}>
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
              Veuillez saisir votre email et le code d&apos;activation reçu pour définir votre mot de passe.
            </p>
          </div>

          {success ? (
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
          ) : (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              {error && (
                <div style={{ padding: '11px 14px', background: 'rgba(255,71,87,0.08)', border: '1px solid rgba(255,71,87,0.4)', color: '#ff6b7a', borderRadius: '10px', fontSize: '13px', textAlign: 'center' }}>
                  {error}
                </div>
              )}

              {/* Email */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                <label style={{ fontSize: '10px', fontWeight: 700, color: cyan, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Adresse Email</label>
                <div style={{ position: 'relative' }}>
                  <Mail size={16} color={muted} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                  <input type="email" className="vmind-input" value={email} onChange={e => setEmail(e.target.value)}
                    placeholder="Saisissez votre e-mail" required disabled={isCodeValid} />
                </div>
              </div>

              {/* Code */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label style={{ fontSize: '10px', fontWeight: 700, color: cyan, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Code d&apos;activation (16 caractères)</label>
                  {email.trim().length > 0 && code.trim().length >= 16 && (
                    <span style={{ fontSize: '10px', color: isValidatingCode ? muted : isCodeValid ? '#00e676' : '#ff4757', fontWeight: 600 }}>
                      {isValidatingCode ? 'Vérification...' : isCodeValid ? '✓ Code validé' : `✗ ${codeError || 'Invalide'}`}
                    </span>
                  )}
                </div>
                <div style={{ position: 'relative' }}>
                  <Key size={16} color={muted} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                  <input type="text" className="vmind-input" value={code} onChange={e => setCode(e.target.value.replace(/\s+/g, ''))}
                    placeholder="Entrez votre code d'activation" required disabled={isCodeValid} />
                  {isCodeValid && (
                    <span onClick={() => { setIsCodeValid(false); setCode(''); }} style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', color: cyan, fontSize: '11px', fontWeight: 700, cursor: 'pointer', textDecoration: 'underline' }}>
                      Modifier
                    </span>
                  )}
                </div>
              </div>

              {/* Dynamic revealed password fields */}
              {isCodeValid && (
                <div className="slide-right" style={{ display: 'flex', flexDirection: 'column', gap: '18px', borderTop: '1px solid rgba(0,229,200,0.12)', paddingTop: '18px' }}>
                  {/* New Password */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                    <label style={{ fontSize: '10px', fontWeight: 700, color: cyan, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Nouveau mot de passe</label>
                    <div style={{ position: 'relative' }}>
                      <Lock size={16} color={muted} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                      <input type={showPassword ? 'text' : 'password'} className="vmind-input" style={{ paddingRight: '48px' }}
                        value={password} onChange={e => setPassword(e.target.value)}
                        placeholder="Définir un mot de passe robuste" required />
                      <div onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: '15px', top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', color: muted }}>
                        {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                      </div>
                    </div>
                  </div>

                  {/* Confirm Password */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <label style={{ fontSize: '10px', fontWeight: 700, color: cyan, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Confirmer le mot de passe</label>
                      {password.length > 0 && confirmPassword.length > 0 && (
                        <span style={{ fontSize: '10px', color: password === confirmPassword ? '#00e676' : '#ff4757', fontWeight: 600 }}>
                          {password === confirmPassword ? '✓ Mots de passe conformes' : '✗ Mots de passe non correspondants'}
                        </span>
                      )}
                    </div>
                    <div style={{ position: 'relative' }}>
                      <Lock size={16} color={muted} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                      <input type={showConfirmPassword ? 'text' : 'password'} className="vmind-input" style={{ paddingRight: '48px' }}
                        value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                        placeholder="Confirmez votre saisie" required />
                      <div onClick={() => setShowConfirmPassword(!showConfirmPassword)} style={{ position: 'absolute', right: '15px', top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', color: muted }}>
                        {showConfirmPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                      </div>
                    </div>
                  </div>

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
                      width: '100%', height: '58px', borderRadius: '12px', marginTop: '6px',
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
