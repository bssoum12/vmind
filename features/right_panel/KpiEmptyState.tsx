"use client";

import React from 'react';
import { BarChart3, TrendingUp, DollarSign, ShoppingBag, Truck, Sparkles } from 'lucide-react';

interface KpiEmptyStateProps {
  agentId: string;
  onLaunch: () => void;
  isLoading?: boolean;
}

interface SpecialistDetails {
  title: string;
  subtitle: string;
  Icon: React.ComponentType<{ size?: number | string; className?: string }>;
  color: string;
}

const SPECIALIST_INFO: Record<string, SpecialistDetails> = {
  VDATA: {
    title: 'Données & Analytics',
    subtitle: "Score qualité global, volume d'activité et taux de livraison TraLIS.",
    Icon: BarChart3,
    color: '#00f0ff'
  },
  VFIN: {
    title: 'Finance & Trésorerie',
    subtitle: 'Position de trésorerie nette, créances clients, factures et marge nette.',
    Icon: DollarSign,
    color: '#00E5C8'
  },
  VSELL: {
    title: 'Commercial & Ventes',
    subtitle: 'Pipeline des cotations, conversion de prospects et fidélisation clients.',
    Icon: TrendingUp,
    color: '#3B82F6'
  },
  VBUY: {
    title: 'Achats & Fournisseurs',
    subtitle: 'Factures d\'achat à régler, dépenses mensuelles et retards de livraison.',
    Icon: ShoppingBag,
    color: '#F59E0B'
  },
  VMOVE: {
    title: 'Logistique & Transit',
    subtitle: 'Suivi des flux actifs, dossiers en retard et livraisons transporteurs.',
    Icon: Truck,
    color: '#10B981'
  }
};

export const KpiEmptyState: React.FC<KpiEmptyStateProps> = ({ agentId, onLaunch, isLoading = false }) => {
  const agentKey = (agentId || 'VDATA').toUpperCase();
  const info = SPECIALIST_INFO[agentKey] || SPECIALIST_INFO['VDATA'];

  return (
    <div style={{
      padding: '32px 20px',
      margin: '8px 0',
      background: 'rgba(5, 15, 30, 0.65)',
      border: `1px solid ${info.color}35`,
      borderRadius: '14px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      textAlign: 'center',
      boxShadow: `0 8px 32px rgba(0, 0, 0, 0.4), inset 0 0 24px ${info.color}08`,
      backdropFilter: 'blur(12px)',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Glow effect */}
      <div style={{
        position: 'absolute',
        top: '-40px',
        width: '140px',
        height: '140px',
        background: `radial-gradient(circle, ${info.color}25 0%, transparent 70%)`,
        pointerEvents: 'none',
      }} />

      <div style={{
        width: '56px',
        height: '56px',
        borderRadius: '14px',
        background: `${info.color}15`,
        border: `1px solid ${info.color}50`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: info.color,
        marginBottom: '16px',
        boxShadow: `0 0 20px ${info.color}25`
      }}>
        {info.Icon && <info.Icon size={28} />}
      </div>

      <div style={{
        fontSize: '11px',
        fontWeight: 700,
        color: info.color,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        marginBottom: '4px',
        fontFamily: 'var(--font-mono)'
      }}>
        Spécialiste {agentKey}
      </div>

      <h3 style={{
        fontSize: '16px',
        fontWeight: 700,
        color: '#FFFFFF',
        margin: '0 0 8px 0'
      }}>
        {info.title}
      </h3>

      <p style={{
        fontSize: '12.5px',
        color: '#8FA3B8',
        lineHeight: 1.5,
        maxWidth: '320px',
        margin: '0 0 22px 0'
      }}>
        {info.subtitle}
      </p>

      <button
        type="button"
        onClick={onLaunch}
        disabled={isLoading}
        style={{
          background: isLoading ? 'rgba(0, 240, 255, 0.08)' : `linear-gradient(135deg, ${info.color} 0%, ${info.color}CC 100%)`,
          color: isLoading ? '#6A7E95' : '#021010',
          border: 'none',
          padding: '11px 22px',
          borderRadius: '10px',
          fontSize: '13px',
          fontWeight: 800,
          cursor: isLoading ? 'not-allowed' : 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          boxShadow: isLoading ? 'none' : `0 4px 16px ${info.color}40`,
          transition: 'all 0.2s ease',
          fontFamily: 'var(--font-mono)'
        }}
        onMouseOver={e => !isLoading && (e.currentTarget.style.transform = 'translateY(-1px)')}
        onMouseOut={e => !isLoading && (e.currentTarget.style.transform = 'translateY(0)')}
      >
        <Sparkles size={15} />
        <span>{isLoading ? 'Analyse en cours...' : `Lancer l'analyse ${agentKey}`}</span>
      </button>

      <div style={{
        marginTop: '14px',
        fontSize: '11px',
        color: '#556980',
        fontFamily: 'var(--font-mono)'
      }}>
        Interrogation et synthèse IA TraLIS à la demande
      </div>
    </div>
  );
};
