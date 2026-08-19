'use client';

import './login.css';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { jwtDecode } from 'jwt-decode';
import {
  Shield, User, Lock, Eye, EyeOff,
  RefreshCw, Clock, ArrowRight, ShieldCheck, BarChart3,
  Mail, Key, ShieldAlert
} from 'lucide-react';
import { Turnstile } from '@marsidev/react-turnstile';

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
      </rect>
    </svg>
  );
}

function HologramV() {
  const C = '#00E5C8';
  const C2 = '#21F3D6';
  const pink = '#FF2E93';
  
  return (
    <div style={{
      width: '100%',
      maxWidth: '480px',
      margin: '0 auto 30px',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      position: 'relative'
    }}>
      <svg viewBox="0 0 480 280" style={{ width: '100%', height: 'auto', overflow: 'visible', pointerEvents: 'none' }}>
        <defs>
          <filter id="neon-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="6" result="blur1" />
            <feGaussianBlur stdDeviation="15" result="blur2" />
            <feMerge>
              <feMergeNode in="blur2" />
              <feMergeNode in="blur1" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="neon-glow-pink" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="neon-glow-cyan" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <linearGradient id="v-face-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(0, 229, 200, 0.35)" />
            <stop offset="50%" stopColor="rgba(0, 229, 200, 0.15)" />
            <stop offset="100%" stopColor="rgba(0, 229, 200, 0.05)" />
          </linearGradient>
          <linearGradient id="v-side-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="rgba(0, 229, 200, 0.22)" />
            <stop offset="100%" stopColor="rgba(33, 243, 214, 0.03)" />
          </linearGradient>
          <linearGradient id="v-cap-grad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="rgba(33, 243, 214, 0.6)" />
            <stop offset="100%" stopColor="rgba(0, 229, 200, 0.3)" />
          </linearGradient>
          
          <linearGradient id="cone-grad" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor="rgba(0,229,200,0.18)" />
            <stop offset="100%" stopColor="rgba(0,229,200,0.01)" />
          </linearGradient>
        </defs>

        {/* ── 1. Pedestal and Concentric Rings (drawn at the bottom) ── */}
        <ellipse cx="240" cy="230" rx="220" ry="25" fill="none" stroke="rgba(0, 229, 200, 0.02)" strokeWidth="0.5" />

        {/* 3D Base Step (centered at y=230) */}
        <ellipse cx="240" cy="240" rx="210" ry="24" fill="none" stroke="rgba(0, 229, 200, 0.08)" strokeWidth="1.5" />
        <path d="M 30 230 A 210 24 0 0 0 450 230 L 450 240 A 210 24 0 0 1 30 240 Z" fill="rgba(6, 15, 30, 0.85)" stroke="rgba(0, 229, 200, 0.25)" strokeWidth="1" />
        <ellipse cx="240" cy="230" rx="210" ry="24" fill="rgba(8, 20, 38, 0.95)" stroke="rgba(0, 229, 200, 0.15)" strokeWidth="1" />

        {/* 3D Middle Step (centered at y=212) */}
        <path d="M 68 212 A 172 20 0 0 0 412 212 L 412 222 A 172 20 0 0 1 68 222 Z" fill="rgba(4, 11, 22, 0.9)" stroke={pink} strokeWidth="1" strokeOpacity="0.4" />
        <ellipse cx="240" cy="212" rx="172" ry="20" fill="rgba(6, 16, 32, 0.95)" stroke={pink} strokeWidth="2.5" filter="url(#neon-glow-pink)" />
        
        {/* Rotating dashed ring inside middle step */}
        <g transform="translate(240, 212) scale(1, 0.116)">
          <g>
            <animateTransform 
              attributeName="transform" 
              type="rotate" 
              from="360" 
              to="0" 
              dur="20s" 
              repeatCount="indefinite" />
            <circle cx="0" cy="0" r="155" fill="none" stroke={pink} strokeWidth="1.5" strokeDasharray="25 15" strokeOpacity="0.4" />
          </g>
        </g>

        {/* 3D Top Step (centered at y=195) */}
        <path d="M 112 195 A 128 15 0 0 0 368 195 L 368 204 A 128 15 0 0 1 112 204 Z" fill="rgba(3, 8, 16, 0.95)" stroke={C} strokeWidth="1.5" />
        <ellipse cx="240" cy="195" rx="128" ry="15" fill="rgba(4, 12, 24, 0.98)" stroke={C2} strokeWidth="3" filter="url(#neon-glow-cyan)" />

        {/* Animated concentric dials inside top step */}
        <g transform="translate(240, 195) scale(1, 0.117)">
          {/* Clockwise dial */}
          <g>
            <animateTransform 
              attributeName="transform" 
              type="rotate" 
              from="0" 
              to="360" 
              dur="30s" 
              repeatCount="indefinite" />
            {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map(angle => {
              const rad = (angle * Math.PI) / 180;
              const x2 = (128 * Math.cos(rad)).toFixed(2);
              const y2 = (128 * Math.sin(rad)).toFixed(2);
              return (
                <line key={angle} x1="0" y1="0" x2={x2} y2={y2} stroke="rgba(0, 229, 200, 0.35)" strokeWidth="0.8" />
              );
            })}
            <circle cx="0" cy="0" r="128" fill="none" stroke={C2} strokeWidth="1.5" strokeDasharray="15 10" />
            <circle cx="0" cy="0" r="98" fill="none" stroke={C} strokeWidth="1.2" strokeDasharray="6 8" strokeOpacity="0.8" />
          </g>
          {/* Counter-Clockwise dial */}
          <g>
            <animateTransform 
              attributeName="transform" 
              type="rotate" 
              from="360" 
              to="0" 
              dur="18s" 
              repeatCount="indefinite" />
            <circle cx="0" cy="0" r="72" fill="none" stroke="#FFFFFF" strokeWidth="1" strokeDasharray="20 15" strokeOpacity="0.9" />
            <circle cx="0" cy="0" r="42" fill="none" stroke={C2} strokeWidth="1.5" strokeDasharray="4 4" />
          </g>
        </g>

        {/* Outer spinning CCW dashed ring */}
        <g transform="translate(240, 230) scale(1, 0.166)">
          <g>
            <animateTransform 
              attributeName="transform" 
              type="rotate" 
              from="360" 
              to="0" 
              dur="12s" 
              repeatCount="indefinite" />
            <circle cx="0" cy="0" r="270" fill="none" stroke="rgba(0, 229, 200, 0.15)" strokeWidth="1.5" strokeDasharray="15 12" />
          </g>
        </g>

        {/* ── 2. Beams & Cone ── */}
        {/* Light Cone */}
        <polygon points="180,230 300,230 245,150 235,150" fill="url(#cone-grad)" opacity="0.6" style={{ mixBlendMode: 'screen' }} />

        {/* Central bright laser ray */}
        <line x1="240" y1="230" x2="240" y2="135" stroke="#FFFFFF" strokeWidth="3" filter="url(#neon-glow)" />

        {/* ── 3. Rising Particles ── */}
        <g>
          {[
            { x: 230, r: 1.2, delay: '0s',   speed: '3s' },
            { x: 250, r: 1.0, delay: '0.5s', speed: '2.5s' },
            { x: 238, r: 1.5, delay: '1.2s', speed: '3.5s' },
            { x: 242, r: 0.8, delay: '1.8s', speed: '2.8s' }
          ].map((p, i) => (
            <circle key={i} cx={p.x} cy="230" r={p.r} fill={C2}>
              <animate attributeName="cy" from="230" to="120" dur={p.speed} begin={p.delay} repeatCount="indefinite" />
              <animate attributeName="opacity" values="0;0.8;0" dur={p.speed} begin={p.delay} repeatCount="indefinite" />
            </circle>
          ))}
        </g>

        {/* ── 4. 3D Levitating V (centered at x=240, shifted to right) ── */}
        <g>
          <animateTransform
            attributeName="transform"
            type="translate"
            values="0,0; 0,-15; 0,0"
            dur="4.5s"
            repeatCount="indefinite"
          />
          
          {/* Left Outer Wall */}
          <path d="M 185 60 L 232 150 L 244 140 L 197 50 Z" fill="url(#v-side-grad)" stroke={C} strokeWidth="1" strokeOpacity="0.4" />
          {/* Right Outer Wall */}
          <path d="M 295 60 L 248 150 L 260 140 L 307 50 Z" fill="url(#v-side-grad)" stroke={C} strokeWidth="1" strokeOpacity="0.4" />
          {/* Left Inner Wall */}
          <path d="M 210 60 L 240 115 L 252 105 L 222 50 Z" fill="url(#v-side-grad)" stroke={C} strokeWidth="1" strokeOpacity="0.25" />
          {/* Right Inner Wall */}
          <path d="M 270 60 L 240 115 L 252 105 L 282 50 Z" fill="url(#v-side-grad)" stroke={C} strokeWidth="1" strokeOpacity="0.25" />

          {/* Left Top Cap */}
          <polygon points="185,60 210,60 222,50 197,50" fill="url(#v-cap-grad)" stroke="none" />
          {/* Right Top Cap */}
          <polygon points="295,60 270,60 282,50 307,50" fill="url(#v-cap-grad)" stroke="none" />

          {/* Front Face */}
          <path d="M 185 60 L 232 150 L 248 150 L 295 60 L 270 60 L 240 115 L 210 60 Z" 
                fill="url(#v-face-grad)" stroke={C2} strokeWidth="3" filter="url(#neon-glow)" strokeLinejoin="round" />
          
          {/* Highlight Inner White Core */}
          <path d="M 185 60 L 232 150 L 248 150 L 295 60 L 270 60 L 240 115 L 210 60 Z" 
                fill="none" stroke="#FFFFFF" strokeWidth="1" strokeOpacity="0.8" strokeLinejoin="round" />
        </g>
      </svg>
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
  const [showDeactivatedPopup, setShowDeactivatedPopup] = useState(false);
  const [deactivatedMessage, setDeactivatedMessage] = useState('');
  const [time, setTime] = useState('');
  const router = useRouter();

  const formatUserFriendlyError = (err: any, fallbackMessage: string = "Une erreur est survenue."): string => {
    const rawMsg = (err?.message || "").toString();
    const lower = rawMsg.toLowerCase();
    
    if (lower.includes("failed to fetch") || lower.includes("fetch failed") || lower.includes("econnrefused") || lower.includes("networkerror")) {
      return "Impossible de contacter le serveur VMIND. Veuillez vérifier votre connexion ou que le serveur est démarré.";
    }
    if (lower.includes("invalid credentials") || lower.includes("identifiants invalides") || lower.includes("unauthorized")) {
      return "Identifiant ou mot de passe incorrect.";
    }
    if (lower.includes("jwt malformed") || lower.includes("invalid token")) {
      return "Session expirée ou invalide. Veuillez vous reconnecter.";
    }
    
    return rawMsg || fallbackMessage;
  };

  // Signup State
  const [showSignup, setShowSignup] = useState(false);
  const [signupFirstName, setSignupFirstName] = useState('');
  const [signupLastName, setSignupLastName] = useState('');
  const [signupUsername, setSignupUsername] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPhone, setSignupPhone] = useState('');
  const [isUsernameAvailable, setIsUsernameAvailable] = useState<boolean | null>(null);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [signupError, setSignupError] = useState('');
  const [signupSuccess, setSignupSuccess] = useState('');
  const [signupLoading, setSignupLoading] = useState(false);

  // Forgot Password Flow State
  const [forgotPasswordStep, setForgotPasswordStep] = useState<0 | 1 | 2 | 3>(0);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotCode, setForgotCode] = useState('');
  const [forgotPassword, setForgotPassword] = useState('');
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState('');
  const [forgotShowPassword, setForgotShowPassword] = useState(false);
  const [forgotShowConfirmPassword, setForgotShowConfirmPassword] = useState(false);
  const [forgotError, setForgotError] = useState('');
  const [forgotSuccess, setForgotSuccess] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotCodeValid, setForgotCodeValid] = useState(false);
  const [forgotValidatingCode, setForgotValidatingCode] = useState(false);
  const [forgotCodeError, setForgotCodeError] = useState('');

  // Turnstile State
  const [turnstileToken, setTurnstileToken] = useState('');
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const isTurnstileConfigured = !!(siteKey && siteKey !== 'your_cloudflare_site_key');

  // Reset turnstile token when form step or active form changes
  useEffect(() => {
    setTurnstileToken('');
  }, [showSignup, forgotPasswordStep]);

  // Debounced Username Check
  useEffect(() => {
    if (!signupUsername || signupUsername.trim().length < 3) {
      setIsUsernameAvailable(null);
      return;
    }
    setCheckingUsername(true);
    const delayDebounceFn = setTimeout(async () => {
      try {
        const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'https://localhost:3001';
        const res = await fetch(`${baseUrl}/api/auth/vmind/check-username`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: signupUsername }),
        });
        const data = await res.json();
        if (data.ok) {
          setIsUsernameAvailable(data.available);
        }
      } catch (err) {
        console.error("Error checking username availability:", err);
      } finally {
        setCheckingUsername(false);
      }
    }, 400);

    return () => clearTimeout(delayDebounceFn);
  }, [signupUsername]);

  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSignupError('');
    setSignupSuccess('');
    
    if (isUsernameAvailable === false) {
      setSignupError("Nom d'utilisateur déjà pris.");
      return;
    }
    
    setSignupLoading(true);
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'https://localhost:3001';
      const res = await fetch(`${baseUrl}/api/auth/vmind/signup-request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          first_name: signupFirstName,
          last_name: signupLastName,
          username: signupUsername,
          email: signupEmail,
          phone_number: signupPhone,
          turnstileToken
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "Une erreur s'est produite.");
      
      setSignupSuccess("Votre demande d'inscription a bien été enregistrée et est en attente de validation par un administrateur.");
      // Reset form fields
      setSignupFirstName('');
      setSignupLastName('');
      setSignupUsername('');
      setSignupEmail('');
      setSignupPhone('');
      setIsUsernameAvailable(null);
    } catch (err: any) {
      setSignupError(formatUserFriendlyError(err, "Une erreur s'est produite lors de l'inscription."));
    } finally {
      setSignupLoading(false);
    }
  };

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

  // Load remembered username on mount
  useEffect(() => {
    try {
      const remembered = localStorage.getItem('vmind_remembered_username');
      const shouldRemember = localStorage.getItem('vmind_remember_me') === 'true';
      if (shouldRemember && remembered) {
        setUsername(remembered);
        setRememberMe(true);
      }
    } catch (e) {
      console.error("Error reading rememberMe from localStorage:", e);
    }
  }, []);


  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'https://localhost:3001'}/api/auth/vmind/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, turnstileToken }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        if (data.error === 'deactivated') {
          setDeactivatedMessage(data.message || 'Veuillez régulariser votre situation en contactant l\'équipe VirtualDev.');
          setShowDeactivatedPopup(true);
          return;
        }
        throw new Error(data.error || 'Identifiants invalides');
      }
      localStorage.setItem('vmind_session', data.token);
      
      if (rememberMe) {
        localStorage.setItem('vmind_remembered_username', username);
        localStorage.setItem('vmind_remember_me', 'true');
      } else {
        localStorage.removeItem('vmind_remembered_username');
        localStorage.removeItem('vmind_remember_me');
      }

      window.location.href = '/';
    } catch (err: any) {
      setError(formatUserFriendlyError(err, "Identifiant ou mot de passe incorrect."));
    } finally {
      setLoading(false);
    }
  };
  // Background instant validation of forgot code as user types
  useEffect(() => {
    if (forgotPasswordStep !== 2 || !forgotEmail || !forgotCode || forgotCode.length < 6) {
      setForgotCodeValid(false);
      setForgotCodeError('');
      return;
    }

    const verifyForgotCode = async () => {
      try {
        setForgotValidatingCode(true);
        setForgotCodeError('');
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'https://localhost:3001'}/api/auth/vmind/verify-code`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: forgotEmail, code: forgotCode }),
        });
        const data = await res.json();
        if (data.ok) {
          setForgotCodeValid(true);
          setForgotPasswordStep(3); // Transition to step 3 when code is verified correct!
        } else {
          setForgotCodeValid(false);
          setForgotCodeError(data.error || 'Code incorrect.');
        }
      } catch (err) {
        setForgotCodeValid(false);
        setForgotCodeError('Erreur de connexion serveur.');
      } finally {
        setForgotValidatingCode(false);
      }
    };

    const timer = setTimeout(verifyForgotCode, 300);
    return () => clearTimeout(timer);
  }, [forgotEmail, forgotCode, forgotPasswordStep]);

  const handleRequestResetCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError('');
    setForgotSuccess('');
    setForgotLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'https://localhost:3001'}/api/auth/vmind/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail, turnstileToken }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || 'Erreur lors de l\'envoi.');
      setForgotSuccess(data.message);
      setForgotPasswordStep(2);
    } catch (err: any) {
      setForgotError(formatUserFriendlyError(err, "Erreur lors de l'envoi de la demande."));
    } finally {
      setForgotLoading(false);
    }
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (forgotPassword !== forgotConfirmPassword) {
      setForgotError('Les mots de passe ne correspondent pas.');
      return;
    }
    if (forgotPassword.length < 6) {
      setForgotError('Le mot de passe doit faire au moins 6 caractères.');
      return;
    }

    setForgotLoading(true);
    setForgotError('');
    setForgotSuccess('');
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'https://localhost:3001'}/api/auth/vmind/activate-account`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail, code: forgotCode, password: forgotPassword }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || 'Erreur de réinitialisation.');
      
      setForgotSuccess('Mot de passe configuré avec succès !');
      setTimeout(() => {
        setForgotPasswordStep(0);
        setForgotEmail('');
        setForgotCode('');
        setForgotPassword('');
        setForgotConfirmPassword('');
        setForgotSuccess('');
        setForgotError('');
      }, 2000);
    } catch (err: any) {
      setForgotError(formatUserFriendlyError(err, "Erreur de réinitialisation."));
    } finally {
      setForgotLoading(false);
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
            Bienvenue sur votre espace intelligent connecté à <span style={{ color: cyan, fontWeight: 700 }}>votre ERP</span>
          </h2>
          <p style={{ fontSize: '14px', color: muted, lineHeight: 1.7, maxWidth: '540px', marginBottom: '38px' }}>
            Accédez à vos données, analyses, pilotes et anticipations. VMIND se connecte à <span style={{ color: cyan, fontWeight: 600 }}>votre ERP</span> en temps réel.
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

            {/* Dynamic Card Content (Login vs Signup) */}
            {forgotPasswordStep > 0 ? (
              <div key="forgot-password" className="slide-left">
                {/* Header */}
                <div style={{ textAlign: 'center', marginBottom: '34px' }}>
                  <div style={{ marginBottom: '14px' }}>
                    <span style={{
                      fontSize: '26px', fontWeight: 900, color: cyan,
                      letterSpacing: '0.14em',
                      textShadow: `0 0 18px rgba(0, 229, 200, 0.4)`,
                    }}>VMIND</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', marginBottom: '14px' }}>
                    <div style={{ height: '1px', width: '40px', background: `linear-gradient(90deg, transparent, rgba(0, 229, 200, 0.4))` }} />
                    <ShieldCheck size={17} color={cyan} />
                    <div style={{ height: '1px', width: '40px', background: `linear-gradient(90deg, rgba(0, 229, 200, 0.4), transparent)` }} />
                  </div>
                  <h2 style={{ fontSize: '13.5px', fontWeight: 700, color: white, letterSpacing: '0.1em', marginBottom: '8px', textTransform: 'uppercase' }}>
                    {forgotPasswordStep === 1 && 'MOT DE PASSE OUBLIÉ'}
                    {forgotPasswordStep === 2 && 'VÉRIFICATION DU CODE'}
                    {forgotPasswordStep === 3 && 'NOUVEAU MOT DE PASSE'}
                  </h2>
                  <p style={{ fontSize: '12.5px', color: muted, lineHeight: 1.5 }}>
                    {forgotPasswordStep === 1 && 'Saisissez votre email pour recevoir un code de réinitialisation.'}
                    {forgotPasswordStep === 2 && 'Entrez le code alphanumérique de 6 caractères reçu par email.'}
                    {forgotPasswordStep === 3 && 'Configurez et confirmez votre nouveau mot de passe.'}
                  </p>
                </div>

                {/* Form fields depending on step */}
                {forgotPasswordStep === 1 && (
                  <form onSubmit={handleRequestResetCode} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                    {forgotError && (
                      <div style={{ padding: '11px 14px', background: 'rgba(255,71,87,0.08)', border: '1px solid rgba(255,71,87,0.4)', color: '#ff6b7a', borderRadius: '10px', fontSize: '13px', textAlign: 'center' }}>
                        {forgotError}
                      </div>
                    )}
                    {forgotSuccess && (
                      <div style={{ padding: '11px 14px', background: 'rgba(0,229,200,0.08)', border: '1px solid rgba(0,229,200,0.4)', color: cyan, borderRadius: '10px', fontSize: '13px', textAlign: 'center' }}>
                        {forgotSuccess}
                      </div>
                    )}

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                      <label style={{ fontSize: '10px', fontWeight: 700, color: cyan, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Adresse Email</label>
                      <div style={{ position: 'relative' }}>
                        <Mail size={16} color={muted} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                        <input type="email" className="vmind-input" value={forgotEmail} onChange={e => setForgotEmail(e.target.value)}
                          placeholder="Saisissez votre e-mail" required />
                      </div>
                    </div>

                    {isTurnstileConfigured && (
                      <div style={{ display: 'flex', justifyContent: 'center', marginTop: '4px' }}>
                        <Turnstile
                          key={`${showSignup}-${forgotPasswordStep}`}
                          siteKey={siteKey}
                          options={{ theme: 'dark', size: 'normal' }}
                          onSuccess={(token) => setTurnstileToken(token)}
                          onExpire={() => setTurnstileToken('')}
                          onError={() => setTurnstileToken('')}
                        />
                      </div>
                    )}

                    <button
                      type="submit"
                      className="cta-btn"
                      disabled={forgotLoading || (isTurnstileConfigured && !turnstileToken)}
                      style={{
                        width: '100%', height: '58px', borderRadius: '12px', marginTop: '6px',
                        background: (forgotLoading || (isTurnstileConfigured && !turnstileToken)) ? 'rgba(143,163,184,0.12)' : `linear-gradient(90deg, ${cyan} 0%, ${cyan2} 100%)`,
                        color: (forgotLoading || (isTurnstileConfigured && !turnstileToken)) ? muted : '#021010',
                        border: 'none', cursor: (forgotLoading || (isTurnstileConfigured && !turnstileToken)) ? 'not-allowed' : 'pointer',
                        fontSize: '13.5px', fontWeight: 800, letterSpacing: '0.08em',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                        boxShadow: (forgotLoading || (isTurnstileConfigured && !turnstileToken)) ? 'none' : `0 0 28px rgba(0,229,200,0.42), 0 8px 24px rgba(0,0,0,0.4)`,
                        fontFamily: 'inherit',
                      }}
                    >
                      {forgotLoading ? 'ENVOI EN COURS...' : 'ENVOYER LE CODE'}
                      {!forgotLoading && <ArrowRight size={17} strokeWidth={2.5} />}
                    </button>

                    <div style={{ textAlign: 'center', marginTop: '14px', fontSize: '12.5px', color: muted }}>
                      <span onClick={() => { setForgotPasswordStep(0); setForgotError(''); setForgotSuccess(''); }} style={{ color: cyan, cursor: 'pointer', fontWeight: 700, textDecoration: 'underline' }}>
                        Retourner à la connexion
                      </span>
                    </div>
                  </form>
                )}

                {forgotPasswordStep === 2 && (
                  <form onSubmit={e => e.preventDefault()} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                    {forgotError && (
                      <div style={{ padding: '11px 14px', background: 'rgba(255,71,87,0.08)', border: '1px solid rgba(255,71,87,0.4)', color: '#ff6b7a', borderRadius: '10px', fontSize: '13px', textAlign: 'center' }}>
                        {forgotError}
                      </div>
                    )}
                    {forgotSuccess && (
                      <div style={{ padding: '11px 14px', background: 'rgba(0,229,200,0.08)', border: '1px solid rgba(0,229,200,0.4)', color: cyan, borderRadius: '10px', fontSize: '13px', textAlign: 'center' }}>
                        {forgotSuccess}
                      </div>
                    )}

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                      <label style={{ fontSize: '10px', fontWeight: 700, color: cyan, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Adresse Email</label>
                      <div style={{ position: 'relative' }}>
                        <Mail size={16} color={muted} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                        <input type="email" className="vmind-input" value={forgotEmail} readOnly disabled
                          style={{ background: 'rgba(255,255,255,0.02)', color: muted, border: '1px solid rgba(255,255,255,0.05)', cursor: 'not-allowed' }} />
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <label style={{ fontSize: '10px', fontWeight: 700, color: cyan, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Code de réinitialisation (6 caractères)</label>
                        {forgotCode.trim().length >= 6 && (
                          <span style={{ fontSize: '10px', color: forgotValidatingCode ? muted : forgotCodeValid ? '#00e676' : '#ff4757', fontWeight: 600 }}>
                            {forgotValidatingCode ? 'Vérification...' : forgotCodeValid ? '✓ Valide' : `✗ ${forgotCodeError || 'Invalide'}`}
                          </span>
                        )}
                      </div>
                      <div style={{ position: 'relative' }}>
                        <Key size={16} color={muted} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                        <input type="text" className="vmind-input" value={forgotCode} onChange={e => setForgotCode(e.target.value.replace(/\s+/g, '').toUpperCase())}
                          placeholder="Saisissez le code reçu" required maxLength={6} />
                      </div>
                    </div>

                    <div style={{ textAlign: 'center', marginTop: '14px', fontSize: '12.5px', color: muted }}>
                      <span onClick={() => { setForgotPasswordStep(0); setForgotError(''); setForgotSuccess(''); setForgotCode(''); }} style={{ color: cyan, cursor: 'pointer', fontWeight: 700, textDecoration: 'underline' }}>
                        Retourner à la connexion
                      </span>
                    </div>
                  </form>
                )}

                {forgotPasswordStep === 3 && (
                  <form onSubmit={handleResetPasswordSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                    {forgotError && (
                      <div style={{ padding: '11px 14px', background: 'rgba(255,71,87,0.08)', border: '1px solid rgba(255,71,87,0.4)', color: '#ff6b7a', borderRadius: '10px', fontSize: '13px', textAlign: 'center' }}>
                        {forgotError}
                      </div>
                    )}
                    {forgotSuccess && (
                      <div style={{ padding: '11px 14px', background: 'rgba(0,229,200,0.08)', border: '1px solid rgba(0,229,200,0.4)', color: cyan, borderRadius: '10px', fontSize: '13px', textAlign: 'center' }}>
                        {forgotSuccess}
                      </div>
                    )}

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                      <label style={{ fontSize: '10px', fontWeight: 700, color: cyan, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Nouveau mot de passe</label>
                      <div style={{ position: 'relative' }}>
                        <Lock size={16} color={muted} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                        <input type={forgotShowPassword ? 'text' : 'password'} className="vmind-input" style={{ paddingRight: '48px' }}
                          value={forgotPassword} onChange={e => setForgotPassword(e.target.value)}
                          placeholder="Définir un mot de passe robuste" required minLength={6} />
                        <div onClick={() => setForgotShowPassword(!forgotShowPassword)} style={{ position: 'absolute', right: '15px', top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', color: muted }}>
                          {forgotShowPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <label style={{ fontSize: '10px', fontWeight: 700, color: cyan, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Confirmer le mot de passe</label>
                        {forgotPassword.length > 0 && forgotConfirmPassword.length > 0 && (
                          <span style={{ fontSize: '10px', color: forgotPassword === forgotConfirmPassword ? '#00e676' : '#ff4757', fontWeight: 600 }}>
                            {forgotPassword === forgotConfirmPassword ? '✓ Mots de passe conformes' : '✗ Mots de passe non correspondants'}
                          </span>
                        )}
                      </div>
                      <div style={{ position: 'relative' }}>
                        <Lock size={16} color={muted} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                        <input type={forgotShowConfirmPassword ? 'text' : 'password'} className="vmind-input" style={{ paddingRight: '48px' }}
                          value={forgotConfirmPassword} onChange={e => setForgotConfirmPassword(e.target.value)}
                          placeholder="Confirmez votre saisie" required />
                        <div onClick={() => setForgotShowConfirmPassword(!forgotShowConfirmPassword)} style={{ position: 'absolute', right: '15px', top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', color: muted }}>
                          {forgotShowConfirmPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                        </div>
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="cta-btn"
                      disabled={forgotLoading || forgotPassword !== forgotConfirmPassword || forgotPassword.length < 6}
                      style={{
                        width: '100%', height: '58px', borderRadius: '12px', marginTop: '6px',
                        background: (forgotLoading || forgotPassword !== forgotConfirmPassword || forgotPassword.length < 6)
                          ? 'rgba(143,163,184,0.12)'
                          : `linear-gradient(90deg, ${cyan} 0%, ${cyan2} 100%)`,
                        color: (forgotLoading || forgotPassword !== forgotConfirmPassword || forgotPassword.length < 6) ? muted : '#021010',
                        border: 'none', cursor: (forgotLoading || forgotPassword !== forgotConfirmPassword || forgotPassword.length < 6) ? 'not-allowed' : 'pointer',
                        fontSize: '13.5px', fontWeight: 800, letterSpacing: '0.08em',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                        boxShadow: (forgotLoading || forgotPassword !== forgotConfirmPassword || forgotPassword.length < 6) ? 'none' : `0 0 28px rgba(0,229,200,0.42), 0 8px 24px rgba(0,0,0,0.4)`,
                        fontFamily: 'inherit',
                      }}
                    >
                      {forgotLoading ? 'RÉINITIALISATION...' : 'RÉINITIALISER LE MOT DE PASSE'}
                      {!forgotLoading && <ArrowRight size={17} strokeWidth={2.5} />}
                    </button>
                  </form>
                )}
              </div>
            ) : !showSignup ? (
              <div key="login" className="slide-left">
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

                  {/* Username */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                    <label style={{ fontSize: '10px', fontWeight: 700, color: cyan, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Identifiant VMIND</label>
                    <div style={{ position: 'relative' }}>
                      <User size={16} color={muted} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                      <input type="text" className="vmind-input" value={username} onChange={e => setUsername(e.target.value)}
                        placeholder="Saisissez votre nom d'utilisateur" required suppressHydrationWarning={true} />
                    </div>
                  </div>

                  {/* Password */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                    <label style={{ fontSize: '10px', fontWeight: 700, color: cyan, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Mot de passe</label>
                    <div style={{ position: 'relative' }}>
                      <Lock size={16} color={muted} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                      <input type={showPassword ? 'text' : 'password'} className="vmind-input" style={{ paddingRight: '48px' }}
                        value={password} onChange={e => setPassword(e.target.value)}
                        placeholder="Veuillez entrer ce champ" required suppressHydrationWarning={true} />
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
                    <span onClick={() => { setForgotPasswordStep(1); setError(''); setForgotError(''); setForgotSuccess(''); }} style={{ color: cyan, textDecoration: 'none', fontWeight: 500, cursor: 'pointer' }}>Mot de passe oublié ?</span>
                  </div>

                   {isTurnstileConfigured && (
                      <div style={{ display: 'flex', justifyContent: 'center', marginTop: '4px' }}>
                        <Turnstile
                          key={`${showSignup}-${forgotPasswordStep}`}
                          siteKey={siteKey}
                          options={{ theme: 'dark', size: 'normal' }}
                          onSuccess={(token) => setTurnstileToken(token)}
                          onExpire={() => setTurnstileToken('')}
                          onError={() => setTurnstileToken('')}
                        />
                      </div>
                    )}

                    {/* CTA */}
                    <button
                      type="submit"
                      className="cta-btn"
                      disabled={loading || (isTurnstileConfigured && !turnstileToken)}
                      style={{
                        width: '100%', height: '58px', borderRadius: '12px', marginTop: '6px',
                        background: (loading || (isTurnstileConfigured && !turnstileToken))
                          ? 'rgba(143,163,184,0.12)'
                          : `linear-gradient(90deg, ${cyan} 0%, ${cyan2} 100%)`,
                        color: (loading || (isTurnstileConfigured && !turnstileToken)) ? muted : '#021010',
                        border: 'none', cursor: (loading || (isTurnstileConfigured && !turnstileToken)) ? 'not-allowed' : 'pointer',
                        fontSize: '13.5px', fontWeight: 800, letterSpacing: '0.08em',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                        boxShadow: (loading || (isTurnstileConfigured && !turnstileToken)) ? 'none' : `0 0 28px rgba(0,229,200,0.42), 0 8px 24px rgba(0,0,0,0.4)`,
                        fontFamily: 'inherit',
                      }}
                    >
                      {loading ? 'CONNEXION EN COURS...' : 'SE CONNECTER À VMIND'}
                      {!loading && <ArrowRight size={17} strokeWidth={2.5} />}
                    </button>

                  <div style={{ textAlign: 'center', marginTop: '14px', fontSize: '12.5px', color: muted }}>
                    Pas de compte ?{' '}
                    <span onClick={() => { setShowSignup(true); setSignupError(''); setSignupSuccess(''); }} style={{ color: cyan, cursor: 'pointer', fontWeight: 700, textDecoration: 'underline' }}>
                      Créer une demande d&apos;inscription
                    </span>
                  </div>
                </form>
              </div>
            ) : (
              <div key="signup" className="slide-right">
                {/* Header */}
                <div style={{ textAlign: 'center', marginBottom: '30px' }}>
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
                  <h2 style={{ fontSize: '13.5px', fontWeight: 700, color: white, letterSpacing: '0.1em', marginBottom: '8px' }}>DEMANDE D&apos;INSCRIPTION</h2>
                  <p style={{ fontSize: '12.5px', color: muted, lineHeight: 1.5 }}>Veuillez soumettre vos informations.</p>
                </div>

                {signupSuccess ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', alignItems: 'center', textAlign: 'center', padding: '20px 0' }}>
                    <div style={{ width: '50px', height: '50px', borderRadius: '50%', background: 'rgba(0,229,200,0.1)', border: `2px solid ${cyan}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <ShieldCheck size={28} color={cyan} />
                    </div>
                    <p style={{ fontSize: '13.5px', color: body, lineHeight: 1.6 }}>{signupSuccess}</p>
                    <button onClick={() => { setShowSignup(false); setSignupSuccess(''); }} className="cta-btn" style={{ width: '100%', height: '48px', borderRadius: '12px', border: 'none', background: `linear-gradient(90deg, ${cyan} 0%, ${cyan2} 100%)`, color: '#021010', fontSize: '13px', fontWeight: 800, cursor: 'pointer', boxShadow: `0 0 20px rgba(0,229,200,0.3)` }}>Retourner à la connexion</button>
                  </div>
                ) : (
                  <form onSubmit={handleSignupSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    {signupError && (
                      <div style={{ padding: '10px 14px', background: 'rgba(255,71,87,0.08)', border: '1px solid rgba(255,71,87,0.4)', color: '#ff6b7a', borderRadius: '8px', fontSize: '12.5px', textAlign: 'center' }}>
                        {signupError}
                      </div>
                    )}

                    {/* Nom & Prénom */}
                    <div style={{ display: 'flex', gap: '14px' }}>
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontSize: '9px', fontWeight: 700, color: cyan, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Prénom</label>
                        <input type="text" className="vmind-input" style={{ height: '44px', padding: '0 14px' }} value={signupFirstName} onChange={e => setSignupFirstName(e.target.value)} required />
                      </div>
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontSize: '9px', fontWeight: 700, color: cyan, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Nom</label>
                        <input type="text" className="vmind-input" style={{ height: '44px', padding: '0 14px' }} value={signupLastName} onChange={e => setSignupLastName(e.target.value)} required />
                      </div>
                    </div>

                    {/* Nom d'utilisateur */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <label style={{ fontSize: '9px', fontWeight: 700, color: cyan, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Nom d&apos;utilisateur</label>
                        {signupUsername.trim().length >= 3 && (
                          <span style={{ fontSize: '9.5px', color: checkingUsername ? muted : isUsernameAvailable ? '#00e676' : '#ff4757', fontWeight: 600 }}>
                            {checkingUsername ? 'Vérification...' : isUsernameAvailable ? '✓ Disponible' : '✗ Déjà utilisé'}
                          </span>
                        )}
                      </div>
                      <input type="text" className="vmind-input" style={{ height: '44px', padding: '0 14px' }} value={signupUsername} onChange={e => setSignupUsername(e.target.value.replace(/\s+/g, ''))} required />
                    </div>

                    {/* Email */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '9px', fontWeight: 700, color: cyan, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Adresse Email</label>
                      <input type="email" className="vmind-input" style={{ height: '44px', padding: '0 14px' }} value={signupEmail} onChange={e => setSignupEmail(e.target.value)} required />
                    </div>

                    {/* Téléphone */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '9px', fontWeight: 700, color: cyan, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Numéro de Téléphone</label>
                      <input type="text" className="vmind-input" style={{ height: '44px', padding: '0 14px' }} value={signupPhone} onChange={e => setSignupPhone(e.target.value)} required />
                    </div>

                     {/* Actions */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '6px' }}>
                      {isTurnstileConfigured && (
                        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '4px' }}>
                          <Turnstile
                            key={`${showSignup}-${forgotPasswordStep}`}
                            siteKey={siteKey}
                            options={{ theme: 'dark', size: 'normal' }}
                            onSuccess={(token) => setTurnstileToken(token)}
                            onExpire={() => setTurnstileToken('')}
                            onError={() => setTurnstileToken('')}
                          />
                        </div>
                      )}

                      <button type="submit" disabled={signupLoading || isUsernameAvailable === false || (isTurnstileConfigured && !turnstileToken)} className="cta-btn" style={{ width: '100%', height: '52px', borderRadius: '12px', border: 'none', background: signupLoading || isUsernameAvailable === false || (isTurnstileConfigured && !turnstileToken) ? 'rgba(143,163,184,0.12)' : `linear-gradient(90deg, ${cyan} 0%, ${cyan2} 100%)`, color: signupLoading || isUsernameAvailable === false || (isTurnstileConfigured && !turnstileToken) ? muted : '#021010', fontSize: '13px', fontWeight: 800, cursor: signupLoading || isUsernameAvailable === false || (isTurnstileConfigured && !turnstileToken) ? 'not-allowed' : 'pointer', boxShadow: signupLoading || isUsernameAvailable === false || (isTurnstileConfigured && !turnstileToken) ? 'none' : `0 0 20px rgba(0,229,200,0.3)` }}>
                        {signupLoading ? 'ENVOI...' : 'SOUMETTRE LA DEMANDE'}
                      </button>
                      <div style={{ textAlign: 'center', fontSize: '12.5px', color: muted, marginTop: '4px' }}>
                        Déjà inscrit ?{' '}
                        <span onClick={() => { setShowSignup(false); setSignupError(''); setSignupSuccess(''); }} style={{ color: cyan, cursor: 'pointer', fontWeight: 700, textDecoration: 'underline' }}>
                          Retourner à la connexion
                        </span>
                      </div>
                    </div>
                  </form>
                )}
              </div>
            )}

            {/* Card footer */}
            <div style={{ marginTop: '26px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '11px', color: 'rgba(143,163,184,0.55)' }}>
              <Lock size={11} /> Authentification VMIND
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
          <ShieldCheck size={12} color={cyan} /> Infrastructure sécurisée par VirtualDev
        </span>
        <span>© 2026 VMIND • Tous droits réservés</span>
        <span style={{ display: 'flex', gap: '20px' }}>
          <a href="#" className="footer-link" style={{ color: muted, textDecoration: 'none' }}>Confidentialité</a>
          <a href="#" className="footer-link" style={{ color: muted, textDecoration: 'none' }}>Support</a>
        </span>
      </footer>

      {/* POPUP DE COMPTE DÉSACTIVÉ - VIRTUALDEV */}
      {showDeactivatedPopup && (
        <div style={{
          position: 'fixed', inset: 0,
          background: 'rgba(2, 8, 19, 0.82)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          zIndex: 99999,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: "'Inter', -apple-system, sans-serif",
          color: '#FFFFFF', padding: '20px',
        }}>
          <div className="anim-card" style={{
            position: 'relative', width: '100%', maxWidth: '440px',
            background: 'linear-gradient(160deg, rgba(8,20,38,0.98) 0%, rgba(4,12,24,0.99) 100%)',
            border: '1px solid #FF4757',
            borderRadius: '22px', padding: '38px 40px 32px',
            textAlign: 'center',
            boxShadow: '0 0 35px rgba(255, 71, 87, 0.28), 0 25px 60px rgba(0, 0, 0, 0.7)',
          }}>
            {/* Decors de coins Cyberpunk */}
            <div style={{ position: 'absolute', top: 0, left: 0, width: '40px', height: '40px', borderTop: '2px solid #FF4757', borderLeft: '2px solid #FF4757', borderRadius: '22px 0 0 0', opacity: 0.8 }} />
            <div style={{ position: 'absolute', top: 0, right: 0, width: '40px', height: '40px', borderTop: '2px solid #FF4757', borderRight: '2px solid #FF4757', borderRadius: '0 22px 0 0', opacity: 0.8 }} />
            <div style={{ position: 'absolute', bottom: 0, left: 0, width: '40px', height: '40px', borderBottom: '2px solid #FF4757', borderLeft: '2px solid #FF4757', borderRadius: '0 0 0 22px', opacity: 0.4 }} />
            <div style={{ position: 'absolute', bottom: 0, right: 0, width: '40px', height: '40px', borderBottom: '2px solid #FF4757', borderRight: '2px solid #FF4757', borderRadius: '0 0 22px 0', opacity: 0.4 }} />

            {/* Glowing Shield Icon */}
            <div style={{
              width: '74px', height: '74px', borderRadius: '50%',
              background: 'rgba(255, 71, 87, 0.1)',
              border: '1px solid rgba(255, 71, 87, 0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 20px',
              boxShadow: '0 0 20px rgba(255, 71, 87, 0.2)'
            }}>
              <ShieldAlert size={36} color="#FF4757" />
            </div>

            {/* Title */}
            <h2 style={{
              fontSize: '18px', fontWeight: 800,
              letterSpacing: '0.08em', textTransform: 'uppercase',
              color: '#FF4757', marginBottom: '10px'
            }}>
              Accès Restreint
            </h2>

            {/* Description */}
            <p style={{
              fontSize: '13.5px', color: '#D8E3F0',
              lineHeight: 1.6, marginBottom: '28px'
            }}>
              {deactivatedMessage}
            </p>

            {/* Close Button */}
            <button
              onClick={() => setShowDeactivatedPopup(false)}
              style={{
                width: '100%', height: '48px', borderRadius: '12px',
                background: 'linear-gradient(90deg, #FF4757 0%, #ff6b7a 100%)',
                color: '#FFFFFF', border: 'none', cursor: 'pointer',
                fontSize: '13px', fontWeight: 800,
                letterSpacing: '0.05em',
                boxShadow: '0 4px 15px rgba(255, 71, 87, 0.3)',
                fontFamily: 'inherit'
              }}
            >
              COMPRIS
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
