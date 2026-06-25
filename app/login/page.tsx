'use client';

import './login.css';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { jwtDecode } from 'jwt-decode';
import {
  Shield, User, Lock, Eye, EyeOff,
  RefreshCw, Clock, ArrowRight, ShieldCheck, BarChart3,
} from 'lucide-react';

/* ─────────────────────────────────────────────────────
   Premium SVG Background
   – Sparse, elegant 45-degree angled PCB circuit traces (ultra-thin, subtle)
   – Ambient traveling signal pulse animations along paths
   – Drifting space-dust particles (parallax starry space effect, micro-scale)
   – Soft glow blobs behind hologram and card
   – CAD design details (via pads, monospace label text)
───────────────────────────────────────────────────── */
function PremiumBackground() {
  return (
    <svg
      viewBox="0 0 1440 900"
      preserveAspectRatio="xMidYMid slice"
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 0 }}
    >
      <defs>
        {/* Glow blobs */}
        <radialGradient id="blob1" cx="30%" cy="55%" r="50%">
          <stop offset="0%" stopColor="rgba(0,229,200,0.07)" />
          <stop offset="100%" stopColor="transparent" />
        </radialGradient>
        <radialGradient id="blob2" cx="75%" cy="35%" r="40%">
          <stop offset="0%" stopColor="rgba(0,180,255,0.04)" />
          <stop offset="100%" stopColor="transparent" />
        </radialGradient>
        <radialGradient id="blob3" cx="55%" cy="80%" r="35%">
          <stop offset="0%" stopColor="rgba(0,229,200,0.04)" />
          <stop offset="100%" stopColor="transparent" />
        </radialGradient>

        <filter id="trace-blur">
          <feGaussianBlur stdDeviation="0.4" />
        </filter>
        <filter id="dot-glow">
          <feGaussianBlur stdDeviation="0.8" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      {/* Ambient color blobs */}
      <rect width="1440" height="900" fill="url(#blob1)" />
      <rect width="1440" height="900" fill="url(#blob2)" />
      <rect width="1440" height="900" fill="url(#blob3)" />

      {/* ── Drifting Space Stars/Particles (Space-wise animation, extremely slow & micro) ── */}
      <g fill="rgba(33,243,214,0.18)">
        {[
          { x: 120,  y: 130, r: 0.8, tx: 10, ty: -15, d: '38s', delay: '0s' },
          { x: 280,  y: 70,  r: 0.6, tx: 8,  ty: -12, d: '48s', delay: '-6s' },
          { x: 490,  y: 220, r: 0.9, tx: 14, ty: -20, d: '54s', delay: '-14s' },
          { x: 680,  y: 100, r: 0.7, tx: 7,  ty: -13, d: '42s', delay: '-2s' },
          { x: 890,  y: 180, r: 0.8, tx: 12, ty: -18, d: '50s', delay: '-10s' },
          { x: 1150, y: 60,  r: 0.5, tx: 6,  ty: -9,  d: '64s', delay: '-18s' },
          { x: 190,  y: 380, r: 0.9, tx: 11, ty: -16, d: '49s', delay: '-4s' },
          { x: 430,  y: 450, r: 0.6, tx: 8,  ty: -12, d: '53s', delay: '-25s' },
          { x: 620,  y: 350, r: 1.0, tx: 16, ty: -24, d: '58s', delay: '-9s' },
          { x: 820,  y: 470, r: 0.7, tx: 9,  ty: -14, d: '45s', delay: '-29s' },
          { x: 1020, y: 390, r: 0.5, tx: 7,  ty: -10, d: '57s', delay: '-13s' },
          { x: 1280, y: 430, r: 0.9, tx: 13, ty: -19, d: '52s', delay: '-21s' },
          { x: 140,  y: 690, r: 0.7, tx: 8,  ty: -13, d: '41s', delay: '-27s' },
          { x: 380,  y: 750, r: 0.8, tx: 12, ty: -17, d: '55s', delay: '-17s' },
          { x: 570,  y: 720, r: 0.5, tx: 5,  ty: -10, d: '67s', delay: '-31s' },
          { x: 770,  y: 760, r: 1.0, tx: 17, ty: -22, d: '46s', delay: '-7s' },
          { x: 970,  y: 680, r: 0.7, tx: 10, ty: -15, d: '53s', delay: '-33s' },
          { x: 1220, y: 700, r: 0.6, tx: 8,  ty: -12, d: '61s', delay: '-3s' },
        ].map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={p.r}>
            <animateTransform
              attributeName="transform"
              type="translate"
              values={`0,0; ${p.tx},${p.ty}; 0,0`}
              dur={p.d}
              begin={p.delay}
              repeatCount="indefinite"
            />
            <animate
              attributeName="opacity"
              values="0.05;0.35;0.05"
              dur={p.d}
              begin={p.delay}
              repeatCount="indefinite"
            />
          </circle>
        ))}
      </g>

      {/* ── PCB Circuit traces (diagonal 45-deg angles, ultra-thin & elegant) ── */}
      <g stroke="rgba(0,229,200,0.045)" strokeWidth="0.9" fill="none" filter="url(#trace-blur)" strokeLinecap="round" strokeLinejoin="round">
        {/* Group 1: Left Top & Welcome Copy */}
        <path d="M 0,220 H 160 L 210,270 H 340 L 370,240 H 450" />
        <path d="M 0,230 H 156 L 206,280 H 336 L 366,250 H 450" />
        <path d="M 0,240 H 152 L 202,290 H 332 L 362,260 H 450" />
        
        <path d="M 120,0 V 120 L 160,160 H 300" />
        <path d="M 132,0 V 115 L 170,153 H 300" />
        
        <path d="M 0,380 H 220 L 260,420 H 440 L 470,390 H 550" />

        {/* Group 2: Radiating from Pedestal area (centered around x: 350, y: 600) */}
        <path d="M 220,610 L 170,660 H 40" />
        <path d="M 225,622 L 177,670 H 40" />
        
        <path d="M 200,560 L 150,510 H 60" />
        <path d="M 205,548 L 157,500 H 60" />
        
        <path d="M 480,610 L 530,660 H 680" />
        <path d="M 475,622 L 523,670 H 680" />
        
        <path d="M 500,560 L 550,510 H 650 L 690,550 H 780" />
        <path d="M 495,548 L 543,500 H 645 L 685,540 H 780" />
        
        <path d="M 300,640 V 670 L 260,710 H 100" />
        <path d="M 400,640 V 670 L 440,710 H 600" />

        {/* Group 3: Card area (x: 850-1350, y: 150-750) */}
        <path d="M 820,320 L 760,260 H 650" />
        <path d="M 820,332 L 765,277 H 650" />
        
        <path d="M 980,100 H 1100 L 1150,150 H 1320 L 1350,120 H 1440" />
        <path d="M 980,112 H 1095 L 1145,162 H 1315 L 1345,132 H 1440" />
        
        <path d="M 780,720 H 880 L 930,770 H 1120 L 1150,740 H 1440" />
        <path d="M 780,732 H 875 L 925,782 H 1115 L 1145,752 H 1440" />
        
        <path d="M 1250,0 L 1320,70 V 220 H 1440" />
        <path d="M 1262,0 L 1332,70 V 220 H 1440" />
      </g>

      {/* ── Active Traveling Signal Pulses (stroke-dashoffset animations, extremely thin & slow) ── */}
      <g stroke="rgba(33,243,214,0.4)" strokeWidth="0.9" fill="none" opacity="0.45" filter="url(#dot-glow)" strokeLinecap="round">
        <path d="M 0,220 H 160 L 210,270 H 340 L 370,240 H 450" strokeDasharray="10 320" className="anim-signal-flow-1" />
        <path d="M 0,380 H 220 L 260,420 H 440 L 470,390 H 550" strokeDasharray="12 400" className="anim-signal-flow-2" />
        <path d="M 480,610 L 530,660 H 680" strokeDasharray="8 250" className="anim-signal-flow-3" />
        <path d="M 980,100 H 1100 L 1150,150 H 1320 L 1350,120 H 1440" strokeDasharray="11 300" className="anim-signal-flow-4" />
      </g>

      {/* ── Junction pads / Vias (very subtle) ── */}
      <g fill="rgba(0,229,200,0.12)" filter="url(#dot-glow)">
        {/* Terminals */}
        <circle cx="450" cy="240" r="1.8" /><circle cx="450" cy="240" r="3.5" fill="none" stroke="rgba(0,229,200,0.08)" strokeWidth="0.6" />
        <circle cx="450" cy="250" r="1.8" />
        <circle cx="450" cy="260" r="1.8" />
        
        <circle cx="300" cy="160" r="1.8" />
        <circle cx="300" cy="153" r="1.8" />
        
        <circle cx="40" cy="660" r="1.8" /><circle cx="40" cy="660" r="3.5" fill="none" stroke="rgba(0,229,200,0.08)" strokeWidth="0.6" />
        <circle cx="40" cy="670" r="1.8" />
        
        <circle cx="60" cy="510" r="1.8" />
        <circle cx="60" cy="500" r="1.8" />
        
        <circle cx="680" cy="660" r="1.8" />
        <circle cx="680" cy="670" r="1.8" />
        
        <circle cx="780" cy="550" r="1.8" /><circle cx="780" cy="550" r="3.5" fill="none" stroke="rgba(0,229,200,0.08)" strokeWidth="0.6" />
        <circle cx="780" cy="540" r="1.8" />
        
        <circle cx="650" cy="260" r="1.8" />
        <circle cx="650" cy="277" r="1.8" />

        {/* Bends */}
        <circle cx="210" cy="270" r="1.4" fill="rgba(0,229,200,0.08)" />
        <circle cx="206" cy="280" r="1.4" fill="rgba(0,229,200,0.08)" />
        <circle cx="202" cy="290" r="1.4" fill="rgba(0,229,200,0.08)" />
        
        <circle cx="340" cy="270" r="1.4" fill="rgba(0,229,200,0.08)" />
        <circle cx="336" cy="280" r="1.4" fill="rgba(0,229,200,0.08)" />
        <circle cx="332" cy="290" r="1.4" fill="rgba(0,229,200,0.08)" />

        <circle cx="760" cy="260" r="1.4" fill="rgba(0,229,200,0.08)" />
        <circle cx="765" cy="277" r="1.4" fill="rgba(0,229,200,0.08)" />

        <circle cx="1150" cy="150" r="1.4" fill="rgba(0,229,200,0.08)" />
        <circle cx="1145" cy="162" r="1.4" fill="rgba(0,229,200,0.08)" />

        <circle cx="930" cy="770" r="1.4" fill="rgba(0,229,200,0.08)" />
        <circle cx="925" cy="782" r="1.4" fill="rgba(0,229,200,0.08)" />
      </g>

      {/* ── Monospace CAD Labels ── */}
      <g fill="rgba(0,229,200,0.08)" fontSize="6" fontFamily="monospace" letterSpacing="0.1em">
        <text x="10" y="214">TX_BUS_P[0..2]</text>
        <text x="140" y="145">CLK_SYS_100M</text>
        <text x="60" y="488">HOLO_SENSE_A</text>
        <text x="695" y="655">GND_PLANE_02</text>
        <text x="990" y="85">M_RF_PAIR</text>
        <text x="790" y="714">PWR_SYS_3.3V</text>
      </g>

      {/* ── Animated pulsing dots on paths (reduced and dimmed) ── */}
      {[
        { cx: 210, cy: 270, d: '3.1s' },
        { cx: 336, cy: 280, d: '2.5s' },
        { cx: 450, cy: 240, d: '4.2s' },
        { cx: 40,  cy: 660, d: '3.6s' },
        { cx: 680, cy: 670, d: '2.9s' },
        { cx: 780, cy: 550, d: '4.5s' },
        { cx: 760, cy: 260, d: '3.8s' },
        { cx: 1145, cy: 162, d: '2.2s' },
        { cx: 930, cy: 770, d: '3.3s' },
      ].map((dot, i) => (
        <circle key={i} cx={dot.cx} cy={dot.cy} r="1.6" fill="rgba(33,243,214,0.22)">
          <animate attributeName="opacity" values="0.6;0.1;0.6" dur={dot.d} repeatCount="indefinite" />
          <animate attributeName="r" values="1.6;1.1;1.6" dur={dot.d} repeatCount="indefinite" />
        </circle>
      ))}

      {/* ── Subtle horizontal scan line ── */}
      <rect x="0" y="0" width="1440" height="1" fill="rgba(0,229,200,0.03)" opacity="0.3">
        <animate attributeName="y" values="-1;901" dur="20s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0;0.3;0" dur="20s" repeatCount="indefinite" />
      </rect>
    </svg>
  );
}

/* ─────────────────────────────────────────────────────
   Holographic V Platform
───────────────────────────────────────────────────── */
function HologramV() {
  const C = '#00E5C8';
  const C2 = '#21F3D6';
  return (
    <div style={{ position: 'relative', width: '480px', height: '215px', marginBottom: '40px' }}>

      {/* The V — levitates, stylized premium SVG Chevron */}
      <div className="anim-levitate" style={{
        position: 'absolute', top: '10px', left: '50%',
        transform: 'translateX(-50%)',
        width: '100px', height: '100px',
        zIndex: 22, userSelect: 'none',
      }}>
        <svg width="100" height="100" viewBox="0 0 100 100" style={{ filter: 'drop-shadow(0 0 16px rgba(0,229,200,0.65))' }}>
          {/* Outer glow line */}
          <path d="M22 24 L50 76 L78 24" fill="none" stroke="rgba(33,243,214,0.35)" strokeWidth="12" strokeLinecap="round" strokeLinejoin="round" />
          {/* Main neon line */}
          <path d="M22 24 L50 76 L78 24" fill="none" stroke="#00E5C8" strokeWidth="5.5" strokeLinecap="round" strokeLinejoin="round" />
          {/* White core light */}
          <path d="M22 24 L50 76 L78 24" fill="none" stroke="#FFFFFF" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>

      {/* Vertical beam */}
      <div className="anim-beam" style={{
        position: 'absolute', bottom: '57px', left: '50%', transform: 'translateX(-50%)',
        width: '1px', borderRadius: '1px',
        background: `linear-gradient(to bottom, ${C}, rgba(0,229,200,0))`,
        boxShadow: `0 0 6px 1px rgba(0,229,200,0.35)`,
        zIndex: 19,
      }} />

      {/* Light cone — breathing pulse animation (more subtle) */}
      <div className="anim-cone" style={{
        position: 'absolute', bottom: '50px', left: '50%',
        width: '200px', height: '90px',
        background: 'linear-gradient(to bottom, rgba(0,229,200,0.015) 0%, rgba(0,229,200,0.08) 100%)',
        clipPath: 'polygon(30% 0%, 70% 0%, 100% 100%, 0% 100%)',
        zIndex: 14,
      }} />

      {/* Rising hologram particles inside the cone (fainter & smaller) */}
      <svg width="200" height="150" viewBox="0 0 200 150" style={{ position: 'absolute', bottom: '45px', left: '50%', transform: 'translateX(-50%)', zIndex: 15, pointerEvents: 'none' }}>
        {[
          { x: 80,  y: 130, r: 0.9, delay: '0s',  speed: '5s' },
          { x: 120, y: 120, r: 1.2, delay: '0.8s', speed: '4.5s' },
          { x: 95,  y: 140, r: 0.7, delay: '1.5s', speed: '5.5s' },
          { x: 105, y: 110, r: 1.0, delay: '2.2s', speed: '4.8s' },
          { x: 70,  y: 135, r: 0.6, delay: '0.4s', speed: '5.2s' },
          { x: 130, y: 125, r: 0.9, delay: '1.2s', speed: '4.7s' },
        ].map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={p.r} fill="rgba(33,243,214,0.3)">
            <animate attributeName="cy" from="130" to="10" dur={p.speed} begin={p.delay} repeatCount="indefinite" />
            <animate attributeName="opacity" values="0;0.55;0" dur={p.speed} begin={p.delay} repeatCount="indefinite" />
          </circle>
        ))}
      </svg>

      {/* Polar Grid Pedestal — Concentric rings & radial perspective spokes (more subtle) */}
      <svg width="480" height="215" viewBox="0 0 480 215" style={{ position: 'absolute', bottom: '-20px', left: '50%', transform: 'translateX(-50%)', zIndex: 11, pointerEvents: 'none' }}>
        {/* Concentric rings */}
        <ellipse cx="240" cy="180" rx="100" ry="16" stroke="rgba(0,229,200,0.06)" strokeWidth="1" fill="none" />
        <ellipse cx="240" cy="180" rx="160" ry="26" stroke="rgba(0,229,200,0.04)" strokeWidth="1" fill="none" />
        <ellipse cx="240" cy="180" rx="220" ry="35" stroke="rgba(0,229,200,0.025)" strokeWidth="1" fill="none" />
        
        {/* Radial perspective spokes */}
        {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map(angle => {
          const rad = (angle * Math.PI) / 180;
          const x1 = 240 + 40 * Math.cos(rad);
          const y1 = 180 + 6 * Math.sin(rad);
          const x2 = 240 + 220 * Math.cos(rad);
          const y2 = 180 + 35 * Math.sin(rad);
          return (
            <line key={angle} x1={x1} y1={y1} x2={x2} y2={y2} stroke="rgba(0,229,200,0.03)" strokeWidth="1" />
          );
        })}
      </svg>

      {/* Core ring — brightest, pulses */}
      <div className="anim-core" style={{
        position: 'absolute', bottom: '40px', left: '50%', transform: 'translateX(-50%)',
        width: '150px', height: '24px', borderRadius: '50%',
        background: `radial-gradient(ellipse, rgba(0,229,200,0.75) 0%, rgba(0,229,200,0.08) 70%, transparent 100%)`,
        border: `2px solid rgba(0,229,200,0.95)`,
        zIndex: 18,
      }} />

      {/* Ring 2 */}
      <div style={{
        position: 'absolute', bottom: '30px', left: '50%', transform: 'translateX(-50%)',
        width: '240px', height: '38px', borderRadius: '50%',
        border: `1.5px solid rgba(0,229,200,0.45)`,
        boxShadow: '0 0 8px rgba(0,229,200,0.12)',
        zIndex: 16,
      }} />

      {/* Ring 3 */}
      <div style={{
        position: 'absolute', bottom: '18px', left: '50%', transform: 'translateX(-50%)',
        width: '340px', height: '55px', borderRadius: '50%',
        border: `1px solid rgba(0,229,200,0.28)`,
        zIndex: 14,
      }} />

      {/* Ring 4 — spinning CW */}
      <div className="anim-cw" style={{
        position: 'absolute', bottom: '4px', left: '50%',
        transform: 'translateX(-50%) perspective(900px) rotateX(76deg)',
        width: '445px', height: '72px', borderRadius: '50%',
        border: `1px dashed rgba(0,229,200,0.20)`,
        zIndex: 12,
      }} />

      {/* Ring 5 — spinning CCW, outermost */}
      <div className="anim-ccw" style={{
        position: 'absolute', bottom: '-10px', left: '50%',
        transform: 'translateX(-50%) perspective(900px) rotateX(76deg)',
        width: '560px', height: '90px', borderRadius: '50%',
        border: `1px dashed rgba(0,229,200,0.10)`,
        zIndex: 10,
      }} />
    </div>
  );
}

/* ══════════════════════════════════════════════════
   Main Page
══════════════════════════════════════════════════ */
export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [time, setTime] = useState('');
  const router = useRouter();

  useEffect(() => {
    try {
      const token = localStorage.getItem('vmind_session');
      if (token) {
        const decoded: any = jwtDecode(token);
        if (decoded.exp && decoded.exp * 1000 > Date.now()) {
          router.push('/');
        } else {
          localStorage.removeItem('vmind_session');
        }
      }
    } catch (e) {
      localStorage.removeItem('vmind_session');
    }
  }, [router]);

  useEffect(() => {
    const t = setInterval(() => {
      setTime(new Date().toLocaleTimeString('fr-FR', { hour12: false }) + ' TND');
    }, 1000);
    setTime(new Date().toLocaleTimeString('fr-FR', { hour12: false }) + ' TND');
    return () => clearInterval(t);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const res = await fetch('http://localhost:3001/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || 'Identifiants invalides');
      localStorage.setItem('vmind_session', data.token);
      window.location.href = '/';
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  /* Design tokens */
  const bg      = '#050B16';
  const cyan    = '#00E5C8';
  const cyan2   = '#21F3D6';
  const white   = '#FFFFFF';
  const muted   = '#8FA3B8';
  const body    = '#D8E3F0';

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: `radial-gradient(ellipse 120% 80% at 28% 60%, #071424 0%, ${bg} 55%, #03080f 100%)`,
      display: 'flex', flexDirection: 'column',
      fontFamily: "'Inter', -apple-system, sans-serif",
      color: white, overflow: 'hidden',
    }}>
      <PremiumBackground />

      {/* ═══ HEADER ═══ */}
      <header style={{
        position: 'relative', zIndex: 20,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        height: '48px', padding: '0 36px',
        borderBottom: '1px solid rgba(0,229,200,0.08)',
        backdropFilter: 'blur(4px)',
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={cyan} strokeWidth="2.8" strokeLinecap="round"><path d="M4 4l8 16 8-16" /></svg>
          <span style={{ fontSize: '13px', fontWeight: 900, letterSpacing: '0.14em', color: white }}>VMIND</span>
        </div>

        {/* Center */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', fontSize: '10.5px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: muted }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: cyan }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: cyan, boxShadow: `0 0 8px ${cyan}`, display: 'inline-block' }} />
            ERP Connecté
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '5px', color: cyan, border: '1px solid rgba(0,229,200,0.3)', padding: '2px 9px', borderRadius: '4px' }}>
            <span style={{ width: '5px', height: '5px', borderRadius: '50%', border: `1px solid ${cyan}`, display: 'inline-block' }} />
            TraLIS v3.2
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <Shield size={10} /> Accès Sécurisé
          </span>
        </div>

        {/* Time */}
        <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: muted, fontWeight: 500 }}>
          <Clock size={11} /> {time}
        </span>
      </header>

      {/* ═══ MAIN ═══ */}
      <main style={{ position: 'relative', zIndex: 10, display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* ── LEFT (58%) ── */}
        <div style={{ width: '58%', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '32px 2% 32px 8%' }}>

          {/* Brand headline */}
          <div style={{ marginBottom: '6px' }}>
            <h1 style={{
              fontSize: '62px', fontWeight: 900, color: cyan,
              letterSpacing: '0.03em', lineHeight: 1, margin: 0,
              textShadow: `0 0 28px rgba(0,229,200,0.42), 0 0 60px rgba(0,229,200,0.16)`,
            }}>VMIND</h1>
            <p style={{ fontSize: '10px', color: muted, letterSpacing: '0.35em', fontWeight: 600, marginTop: '8px', textTransform: 'uppercase' }}>
              Intelligence d&apos;entreprise
            </p>
          </div>

          {/* Divider */}
          <div style={{ width: '48px', height: '2px', background: `linear-gradient(90deg, ${cyan}, transparent)`, margin: '18px 0 20px', borderRadius: '1px' }} />

          {/* Welcome copy */}
          <h2 style={{ fontSize: '32px', fontWeight: 400, lineHeight: 1.35, color: white, marginBottom: '18px', maxWidth: '580px', letterSpacing: '-0.01em' }}>
            Bienvenue sur votre espace intelligent connecté à <span style={{ color: cyan, fontWeight: 700 }}>TraLis</span>
          </h2>
          <p style={{ fontSize: '14px', color: muted, lineHeight: 1.7, maxWidth: '540px', marginBottom: '38px' }}>
            Accédez à vos données, analyses, pilotes et anticipations. VMIND connecte votre entreprise à la puissance de <span style={{ color: cyan, fontWeight: 600 }}>TraLis ERP</span> en temps réel.
          </p>

          {/* Holographic V */}
          <HologramV />

          {/* Feature cards */}
          <div style={{ display: 'flex', gap: '28px', maxWidth: '540px' }}>
            {[
              { Icon: Lock,       title: 'Accès sécurisé',          desc: 'Authentification avancée et chiffrement des données' },
              { Icon: RefreshCw,  title: 'Rôles synchronisés',       desc: 'Profils et permissions alignés avec TraLis ERP' },
              { Icon: BarChart3,  title: 'ERP connecté\nen temps réel', desc: 'Données, KPI et décisions toujours à jour' },
            ].map(({ Icon, title, desc }) => (
              <div key={title} style={{ flex: 1 }}>
                <div className="feat-icon"><Icon size={19} color={cyan} /></div>
                <h3 style={{ fontSize: '13px', fontWeight: 700, color: white, marginBottom: '6px', whiteSpace: 'pre-line', lineHeight: 1.35 }}>{title}</h3>
                <p style={{ fontSize: '11.5px', color: muted, lineHeight: 1.55 }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── RIGHT (42%) — Card ── */}
        <div style={{ width: '42%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px 6% 32px 2%' }}>
          <div className="anim-card" style={{
            width: '100%', maxWidth: '590px',
            background: 'linear-gradient(160deg, rgba(8,20,38,0.98) 0%, rgba(4,12,24,0.99) 100%)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: `1px solid rgba(0,229,200,0.48)`,
            borderRadius: '22px',
            padding: '40px 42px 34px',
            position: 'relative', overflow: 'hidden',
          }}>
            <div style={{ position: 'absolute', top: 0, left: 0, width: '60px', height: '60px', borderTop: `2px solid ${cyan}`, borderLeft: `2px solid ${cyan}`, borderRadius: '22px 0 0 0', opacity: 0.6 }} />
            <div style={{ position: 'absolute', top: 0, right: 0, width: '60px', height: '60px', borderTop: `2px solid ${cyan}`, borderRight: `2px solid ${cyan}`, borderRadius: '0 22px 0 0', opacity: 0.6 }} />
            <div style={{ position: 'absolute', bottom: 0, left: 0, width: '60px', height: '60px', borderBottom: `2px solid ${cyan}`, borderLeft: `2px solid ${cyan}`, borderRadius: '0 0 0 22px', opacity: 0.3 }} />
            <div style={{ position: 'absolute', bottom: 0, right: 0, width: '60px', height: '60px', borderBottom: `2px solid ${cyan}`, borderRight: `2px solid ${cyan}`, borderRadius: '0 0 22px 0', opacity: 0.3 }} />

            {/* Top shimmer */}
            <div style={{ position: 'absolute', top: 0, left: '12%', right: '12%', height: '1px', background: `linear-gradient(90deg, transparent, ${cyan}, transparent)`, opacity: 0.65 }} />

            {/* Subtle inner glow */}
            <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 70% 40% at 50% 0%, rgba(0,229,200,0.05) 0%, transparent 70%)', pointerEvents: 'none', borderRadius: '22px' }} />

            {/* Header */}
            <div style={{ textAlign: 'center', marginBottom: '34px' }}>
              <div style={{ marginBottom: '14px' }}>
                <span style={{
                  fontSize: '26px', fontWeight: 900, color: cyan,
                  letterSpacing: '0.14em',
                  textShadow: `0 0 18px rgba(0,229,200,0.4)`,
                }}>VMIND</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', marginBottom: '14px' }}>
                <div style={{ height: '1px', width: '40px', background: `linear-gradient(90deg, transparent, rgba(0,229,200,0.4))` }} />
                <ShieldCheck size={17} color={cyan} />
                <div style={{ height: '1px', width: '40px', background: `linear-gradient(90deg, rgba(0,229,200,0.4), transparent)` }} />
              </div>
              <h2 style={{ fontSize: '13.5px', fontWeight: 700, color: white, letterSpacing: '0.1em', marginBottom: '8px' }}>CONNEXION SÉCURISÉE</h2>
              <p style={{ fontSize: '12.5px', color: muted, lineHeight: 1.5 }}>Veuillez vous authentifier pour accéder à votre espace VMIND.</p>
            </div>

            {/* Form */}
            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              {error && (
                <div style={{ padding: '11px 14px', background: 'rgba(255,71,87,0.08)', border: '1px solid rgba(255,71,87,0.4)', color: '#ff6b7a', borderRadius: '10px', fontSize: '13px', textAlign: 'center' }}>
                  {error}
                </div>
              )}

              {/* Email */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                <label style={{ fontSize: '10px', fontWeight: 700, color: cyan, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Email ou Identifiant TraLis</label>
                <div style={{ position: 'relative' }}>
                  <User size={16} color={muted} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                  <input type="text" className="vmind-input" value={username} onChange={e => setUsername(e.target.value)}
                    placeholder="Saisissez votre email ou identifiant TraLis" required />
                </div>
              </div>

              {/* Password */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                <label style={{ fontSize: '10px', fontWeight: 700, color: cyan, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Mot de passe</label>
                <div style={{ position: 'relative' }}>
                  <Lock size={16} color={muted} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                  <input type={showPassword ? 'text' : 'password'} className="vmind-input" style={{ paddingRight: '48px' }}
                    value={password} onChange={e => setPassword(e.target.value)}
                    placeholder="Veuillez entrer ce champ" required />
                  <div onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: '15px', top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', color: muted, transition: 'color .2s' }}>
                    {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                  </div>
                </div>
              </div>

              {/* Remember / Forgot */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12.5px', paddingTop: '2px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: muted, cursor: 'pointer', userSelect: 'none' }} onClick={() => setRememberMe(!rememberMe)}>
                  <div style={{
                    width: '16px', height: '16px', border: '1px solid rgba(0,229,200,0.32)', borderRadius: '4px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    background: rememberMe ? 'rgba(0,229,200,0.12)' : 'rgba(255,255,255,0.02)',
                    transition: 'background .2s',
                  }}>
                    {rememberMe && <svg width="10" height="7" viewBox="0 0 10 7" fill="none"><path d="M1 3.5L3.5 6L9 1" stroke={cyan} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                  </div>
                  Se souvenir de moi
                </label>
                <a href="#" style={{ color: cyan, textDecoration: 'none', fontWeight: 500 }}>Mot de passe oublié ?</a>
              </div>

              {/* CTA */}
              <button
                type="submit"
                className="cta-btn"
                disabled={loading}
                style={{
                  width: '100%', height: '58px', borderRadius: '12px', marginTop: '6px',
                  background: loading
                    ? 'rgba(143,163,184,0.12)'
                    : `linear-gradient(90deg, ${cyan} 0%, ${cyan2} 100%)`,
                  color: loading ? muted : '#021010',
                  border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
                  fontSize: '13.5px', fontWeight: 800, letterSpacing: '0.08em',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                  boxShadow: loading ? 'none' : `0 0 28px rgba(0,229,200,0.42), 0 8px 24px rgba(0,0,0,0.4)`,
                  fontFamily: 'inherit',
                }}
              >
                {loading ? 'CONNEXION EN COURS...' : 'SE CONNECTER À VMIND'}
                {!loading && <ArrowRight size={17} strokeWidth={2.5} />}
              </button>
            </form>

            {/* Card footer */}
            <div style={{ marginTop: '26px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '11px', color: 'rgba(143,163,184,0.55)' }}>
              <Lock size={11} /> Authentification sécurisée par TraLis ERP
            </div>
          </div>
        </div>
      </main>

      {/* ═══ FOOTER ═══ */}
      <footer style={{
        position: 'relative', zIndex: 20,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 36px', fontSize: '10.5px', color: muted,
        borderTop: '1px solid rgba(0,229,200,0.05)',
      }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <ShieldCheck size={12} color={cyan} /> Infrastructure sécurisée par TraLis ERP
        </span>
        <span>© 2026 VMIND • Tous droits réservés</span>
        <span style={{ display: 'flex', gap: '20px' }}>
          <a href="#" className="footer-link" style={{ color: muted, textDecoration: 'none' }}>Confidentialité</a>
          <a href="#" className="footer-link" style={{ color: muted, textDecoration: 'none' }}>Support</a>
        </span>
      </footer>
    </div>
  );
}
