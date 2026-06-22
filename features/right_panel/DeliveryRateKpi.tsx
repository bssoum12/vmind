"use client";

import React, { useEffect, useState } from 'react';

interface DeliveryKpiData {
  value: number;
  display: string;
  status: 'success' | 'warning' | 'danger' | string;
}

interface DeliveryRateKpiProps {
  activeAgentId?: string;
}

export const DeliveryRateKpi: React.FC<DeliveryRateKpiProps> = ({ activeAgentId }) => {
  const [kpi, setKpi] = useState<DeliveryKpiData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [noData, setNoData] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    setNoData(false);
    setKpi(null);

    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const clientId = process.env.NEXT_PUBLIC_CLIENT_ID || 'DEMO';

      const response = await fetch(`${baseUrl}/api/tools/get-delivery-rate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_id: clientId }),
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const resJson = await response.json();

      if (!resJson.ok) {
        throw new Error(resJson.error?.message || 'Erreur serveur');
      }

      const data = resJson.data;

      // If no KPIs were returned, it means no data for this month
      if (!data.kpis || data.kpis.length === 0) {
        setNoData(true);
        return;
      }

      const k = data.kpis[0];
      setKpi({
        value: k.value,
        display: k.display,
        status: k.status,
      });
    } catch (err: any) {
      setError(err.message || 'Erreur inconnue');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeAgentId === 'VDATA') {
      fetchData();
    }
  }, [activeAgentId]);

  if (activeAgentId !== 'VDATA') return null;

  // Color based on status
  const statusColor =
    kpi?.status === 'success'
      ? 'var(--green)'
      : kpi?.status === 'warning'
      ? 'var(--amber)'
      : kpi?.status === 'danger'
      ? 'var(--red)'
      : 'var(--cyan)';

  // Progress arc (for the SVG gauge)
  const percent = kpi ? Math.min(kpi.value, 100) : 0;
  const radius = 22;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percent / 100) * circumference;

  return (
    <div
      style={{
        marginTop: '16px',
        padding: '12px',
        background: 'rgba(0,229,200,0.03)',
        border: '1px solid rgba(0,229,200,0.1)',
        borderRadius: '6px',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Subtle glow accent */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '1px',
          background: `linear-gradient(90deg, transparent, ${statusColor}, transparent)`,
          opacity: 0.6,
        }}
      />

      {/* Section Title */}
      <div
        style={{
          fontSize: '9px',
          color: 'var(--muted)',
          fontFamily: 'var(--font-mono)',
          letterSpacing: '1.5px',
          textTransform: 'uppercase',
          marginBottom: '10px',
        }}
      >
        Livraison à temps
      </div>

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 0' }}>
          <div
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: 'var(--cyan)',
              boxShadow: '0 0 6px var(--cyan)',
              animation: 'pulse 1.5s infinite',
              flexShrink: 0,
            }}
          />
          <span style={{ fontSize: '9px', fontFamily: 'var(--font-mono)', color: 'var(--muted)' }}>
            CALCUL EN COURS…
          </span>
        </div>
      ) : error ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span style={{ fontSize: '8px', fontFamily: 'var(--font-mono)', color: 'var(--red)' }}>
            {error}
          </span>
          <button
            onClick={fetchData}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--cyan)',
              fontFamily: 'var(--font-mono)',
              fontSize: '8px',
              textDecoration: 'underline',
              cursor: 'pointer',
              padding: 0,
              textAlign: 'left',
            }}
          >
            Réessayer
          </button>
        </div>
      ) : noData ? (
        <div style={{ fontSize: '9px', fontFamily: 'var(--font-mono)', color: 'var(--muted)', fontStyle: 'italic' }}>
          Aucune donnée ce mois-ci
        </div>
      ) : kpi ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* SVG Circular Gauge */}
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <svg width="56" height="56" viewBox="0 0 56 56">
              <defs>
                <filter id="delivery-glow">
                  <feGaussianBlur stdDeviation="2" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>
              {/* Background track */}
              <circle
                cx="28"
                cy="28"
                r={radius}
                fill="none"
                stroke="rgba(0,229,200,0.08)"
                strokeWidth="4"
              />
              {/* Progress arc */}
              <circle
                cx="28"
                cy="28"
                r={radius}
                fill="none"
                stroke={statusColor}
                strokeWidth="4"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                transform="rotate(-90 28 28)"
                filter="url(#delivery-glow)"
                style={{ transition: 'stroke-dashoffset 0.8s ease, stroke 0.4s ease' }}
              />
            </svg>
            {/* Value label in center */}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'column',
              }}
            >
              <span
                style={{
                  fontSize: '11px',
                  fontFamily: 'var(--font-mono)',
                  fontWeight: 700,
                  color: statusColor,
                  lineHeight: 1,
                }}
              >
                {kpi.display}
              </span>
            </div>
          </div>

          {/* Right side text */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: '11px',
                fontFamily: 'var(--font-body)',
                color: 'var(--white)',
                fontWeight: 500,
                lineHeight: 1.3,
                marginBottom: '4px',
              }}
            >
              Dossiers livrés dans les délais contractuels
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <div
                style={{
                  width: '5px',
                  height: '5px',
                  borderRadius: '50%',
                  background: statusColor,
                  boxShadow: `0 0 5px ${statusColor}`,
                  flexShrink: 0,
                }}
              />
              <span
                style={{
                  fontSize: '9px',
                  fontFamily: 'var(--font-mono)',
                  color: statusColor,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}
              >
                {kpi.status === 'success'
                  ? 'Objectif atteint'
                  : kpi.status === 'warning'
                  ? 'À surveiller'
                  : 'En alerte'}
              </span>
            </div>
            <div
              style={{
                fontSize: '8px',
                fontFamily: 'var(--font-mono)',
                color: 'var(--muted)',
                marginTop: '2px',
              }}
            >
              Mois courant
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};
