'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('http://localhost:3001/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data.error || 'Identifiants invalides');
      }

      localStorage.setItem('vmind_session', data.token);
      router.push('/');
      
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      background: 'var(--navy)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999, // Couvre la TopBar
      fontFamily: 'var(--font-body)',
      color: 'var(--white)'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '420px',
        padding: '40px',
        background: 'var(--navy2)',
        border: '1px solid var(--border)',
        borderRadius: '16px',
        boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Decorative Top Line */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: '4px',
          background: 'linear-gradient(90deg, var(--cyan), var(--blue))'
        }} />

        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <h1 style={{
            fontFamily: 'var(--font-title)',
            fontSize: '32px',
            fontWeight: 900,
            color: 'var(--cyan)',
            letterSpacing: '2px',
            margin: '0 0 10px 0'
          }}>VMIND</h1>
          <p style={{ fontSize: '12px', color: 'var(--muted)' }}>Intelligence d'Entreprise Sécurisée</p>
        </div>

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {error && (
            <div style={{
              padding: '12px',
              background: 'rgba(255, 71, 87, 0.1)',
              border: '1px solid var(--red)',
              color: 'var(--red)',
              borderRadius: '8px',
              fontSize: '13px',
              textAlign: 'center'
            }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '11px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>
              Email ou Identifiant TraLIS
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Saisissez votre identifiant"
              required
              style={{
                width: '100%', padding: '14px',
                background: 'var(--navy3)',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                color: 'var(--white)',
                fontSize: '14px',
                outline: 'none',
                fontFamily: 'var(--font-body)'
              }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '11px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>
              Mot de passe
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              style={{
                width: '100%', padding: '14px',
                background: 'var(--navy3)',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                color: 'var(--white)',
                fontSize: '14px',
                outline: 'none',
                fontFamily: 'var(--font-body)'
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%', padding: '14px', marginTop: '10px',
              background: loading ? 'var(--muted)' : 'var(--cyan)',
              color: 'var(--navy)',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: 700,
              fontFamily: 'var(--font-title)',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s'
            }}
          >
            {loading ? 'Connexion en cours...' : 'SE CONNECTER À VMIND'}
          </button>
        </form>

        <div style={{ marginTop: '24px', textAlign: 'center', fontSize: '11px', color: 'var(--muted)' }}>
          Authentification sécurisée par TraLIS ERP
        </div>
      </div>
    </div>
  );
}
