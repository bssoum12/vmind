"use client";

import React, { useEffect, useState, useRef } from "react";
import { RefreshCw, Info, TrendingUp, TrendingDown, Award } from "lucide-react";
import { ScoreGlobalTooltip } from "./ScoreGlobalTooltip";
import { useKpis } from "../../../shared/contexts/KpiCacheContext";
import { AnimatedNumber } from "./AnimatedNumber";

function getAuthToken() {
  if (typeof window === 'undefined') return '';
  const mcpToken = localStorage.getItem('vmind_mcp_token');
  if (mcpToken) return mcpToken;
  try {
    const sessionStr = localStorage.getItem('vmind_session');
    if (!sessionStr) return '';
    if (sessionStr.startsWith('eyJ')) return sessionStr;
    const parsed = JSON.parse(sessionStr);
    return parsed?.token || parsed?.access_token || parsed?.user?.token || '';
  } catch(e) { return ''; }
}

interface Props {
  activeAgentId?: string;
}

export const ScoreGlobalCard: React.FC<Props> = ({ activeAgentId }) => {
  const { kpisByAgent, loadingByAgent, fetchKpis, error: globalError } = useKpis();
  
  const [prevScoreQualite, setPrevScoreQualite] = useState<number | null>(null);
  const [prevDetails, setPrevDetails] = useState<any>(null);
  const [prevYear, setPrevYear] = useState<number>(new Date().getFullYear() - 1);
  
  const [isCardHovered, setIsCardHovered] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number; height?: number }>({ top: 0, left: 0 });
  const cardRef = useRef<HTMLDivElement>(null);
  const hideTimeout = useRef<NodeJS.Timeout | null>(null);

  // Read current active year data from Context
  const agentData = kpisByAgent["vdata"] || kpisByAgent["VDATA"] || {};
  const toolData = agentData.get_score_global_vdata_kpi || agentData.data || agentData || {};
  
  const scoreQualite = toolData.ok && toolData.kpis 
    ? (toolData.kpis.find((k: any) => k.label === "Score qualité global")?.value ?? null) 
    : (toolData.data?.kpis ? (toolData.data.kpis.find((k: any) => k.label === "Score qualité global")?.value ?? null) : null);
  const statut = toolData.details?.statut ?? toolData.data?.details?.statut ?? (toolData.ok ? "Optimal" : "En attente");
  const details = toolData.details || toolData.data?.details || null;
  
  const effectiveLoading = (loadingByAgent["vdata"] || loadingByAgent["VDATA"]) && !toolData.ok;
  const error = !effectiveLoading && !toolData.ok && globalError ? globalError : "";

  const updateCoords = () => {
    if (cardRef.current) {
      const rect = cardRef.current.getBoundingClientRect();
      setCoords({
        top: rect.top,
        left: rect.left,
        height: rect.height,
      });
    }
  };

  const handleMouseEnter = () => {
    if (hideTimeout.current) {
      clearTimeout(hideTimeout.current);
      hideTimeout.current = null;
    }
    updateCoords();
    setHovered(true);
    setIsCardHovered(true);
  };

  const handleMouseLeave = () => {
    setIsCardHovered(false);
    hideTimeout.current = setTimeout(() => {
      setHovered(false);
    }, 250);
  };

  const handleTooltipMouseEnter = () => {
    if (hideTimeout.current) {
      clearTimeout(hideTimeout.current);
      hideTimeout.current = null;
    }
    setHovered(true);
  };

  const handleTooltipMouseLeave = () => {
    hideTimeout.current = setTimeout(() => {
      setHovered(false);
    }, 250);
  };

  useEffect(() => {
    if (!hovered) return;
    const handleUpdate = () => {
      updateCoords();
    };
    const panel = document.querySelector(".right-panel");
    if (panel) {
      panel.addEventListener("scroll", handleUpdate, { passive: true });
    }
    window.addEventListener("scroll", handleUpdate, { passive: true });
    window.addEventListener("resize", handleUpdate, { passive: true });
    return () => {
      if (panel) {
        panel.removeEventListener("scroll", handleUpdate);
      }
      window.removeEventListener("scroll", handleUpdate);
      window.removeEventListener("resize", handleUpdate);
    };
  }, [hovered]);

  const fetchPrevYearData = async () => {
    if (typeof window === "undefined") return;
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || "https://localhost:3001";
    const clientId = "DEMO";

    try {
      const currentYear = new Date().getFullYear();
      const pYear = currentYear - 1;
      setPrevYear(pYear);
      const prevStart = `${pYear}0101`;
      const prevEnd = `${pYear}1231`;

      const prevResponse = await fetch(
        `${baseUrl}/api/tools/get-score-global-vdata-kpi`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${getAuthToken()}`,
          },
          body: JSON.stringify({
            client_id: clientId,
            startDate: prevStart,
            endDate: prevEnd,
          }),
        }
      );

      if (prevResponse.ok) {
        const prevJson = await prevResponse.json();
        if (prevJson.ok) {
          setPrevScoreQualite(prevJson.data?.details?.score_qualite_global ?? null);
          setPrevDetails(prevJson.data?.details ?? null);
        }
      }
    } catch (e) {
      console.warn("Failed to fetch prev year score global:", e);
    }
  };

  useEffect(() => {
    if (activeAgentId === "VDATA") {
      const timer = setTimeout(() => {
        fetchPrevYearData();
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [activeAgentId]);

  if (activeAgentId !== "VDATA") {
    return null;
  }

  // Determine status color theme
  let statusColor = "#00e5c8";
  if (scoreQualite !== null) {
    if (scoreQualite >= 85) {
      statusColor = "#00e5c8";
    } else if (scoreQualite >= 70) {
      statusColor = "#00f0ff";
    } else if (scoreQualite >= 50) {
      statusColor = "#ffb800";
    } else {
      statusColor = "#ff3b30";
    }
  }

  const isPositiveVsPrev = prevScoreQualite !== null && scoreQualite !== null ? scoreQualite >= prevScoreQualite : true;
  const diffVsPrev = prevScoreQualite !== null && scoreQualite !== null ? Math.abs(scoreQualite - prevScoreQualite) : null;

  return (
    <div
      ref={cardRef}
      style={{
        background: 'linear-gradient(145deg, rgba(13, 17, 26, 0.96) 0%, rgba(10, 24, 28, 0.96) 100%)',
        border: `1px solid ${statusColor}45`,
        borderRadius: '16px',
        padding: '16px 18px',
        color: '#fff',
        boxShadow: `0 10px 35px rgba(0, 0, 0, 0.55), inset 0 0 20px ${statusColor}10`,
        backdropFilter: 'blur(16px)',
        position: 'relative',
        overflow: 'visible',
        marginBottom: '16px'
      }}
    >
      <ScoreGlobalTooltip
        visible={hovered}
        coords={coords}
        details={details}
        prevScore={prevScoreQualite}
        prevDetails={prevDetails}
        prevYear={prevYear}
        onMouseEnter={handleTooltipMouseEnter}
        onMouseLeave={handleTooltipMouseLeave}
      />

      {/* Top Header Row */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{
            fontSize: '9px',
            fontFamily: 'var(--font-mono)',
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '1.5px',
            color: '#E2E8F0'
          }}>
            SCORE QUALITÉ GLOBAL
          </span>
          <span style={{
            fontSize: '9px',
            fontWeight: 800,
            color: '#00E5C8',
            background: 'rgba(0, 229, 200, 0.15)',
            border: '1px solid rgba(0, 229, 200, 0.35)',
            padding: '1px 6px',
            borderRadius: '4px',
            letterSpacing: '0.5px'
          }}>
            VDATA
          </span>
        </div>

        <button
          onClick={() => fetchKpis('vdata', true, 'get_score_global_vdata_kpi')}
          title="Rafraîchir KPI via n8n"
          disabled={effectiveLoading}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#64748B',
            cursor: effectiveLoading ? 'not-allowed' : 'pointer',
            padding: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'color 0.2s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.color = '#00E5C8'}
          onMouseLeave={(e) => e.currentTarget.style.color = '#64748B'}
        >
          <RefreshCw size={12} className={effectiveLoading ? 'animate-spin' : ''} />
        </button>
      </div>

      {effectiveLoading ? (
        <div style={{
          padding: '24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          color: '#64748B',
          fontSize: '11px'
        }}>
          <RefreshCw size={14} className="animate-spin" />
          <span>Chargement du score qualité global...</span>
        </div>
      ) : error ? (
        <div style={{
          padding: '14px',
          fontSize: '11px',
          color: '#EF4444',
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.2)',
          borderRadius: '8px'
        }}>
          {error}
        </div>
      ) : (
        /* Main Card Container */
        <div
          onMouseEnter={handleMouseEnter}
          onMouseMove={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          style={{
            background: isCardHovered
              ? `linear-gradient(135deg, ${statusColor}18 0%, rgba(6, 182, 212, 0.08) 100%)`
              : 'rgba(255, 255, 255, 0.02)',
            border: isCardHovered
              ? `1px solid ${statusColor}60`
              : '1px solid rgba(255, 255, 255, 0.07)',
            borderRadius: '14px',
            padding: '14px 16px',
            transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
            cursor: 'pointer',
            boxShadow: isCardHovered ? `0 6px 24px ${statusColor}25` : 'none',
            position: 'relative'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px' }}>
            {/* Left Column: Metrics */}
            <div style={{ flex: 1, minWidth: 0 }}>
              {/* Header subtext & Details pill */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <span style={{ fontSize: '9px', color: '#64748B', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700 }}>
                  INDICE DE CONFORMITÉ
                </span>
                <span style={{
                  fontSize: '9px',
                  color: isCardHovered ? '#6EE7B7' : '#64748B',
                  background: isCardHovered ? 'rgba(0, 229, 200, 0.18)' : 'rgba(255, 255, 255, 0.04)',
                  border: isCardHovered ? '1px solid rgba(0, 229, 200, 0.35)' : '1px solid rgba(255, 255, 255, 0.08)',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  transition: 'all 0.2s',
                  flexShrink: 0
                }}>
                  <Info size={10} style={{ color: isCardHovered ? '#00E5C8' : '#94A3B8' }} />
                  {isCardHovered ? 'Détails actifs' : 'Détails'}
                </span>
              </div>

              {/* Main Score Amount */}
              <div style={{
                fontSize: '24px',
                fontWeight: 900,
                color: '#FFFFFF',
                fontFamily: 'monospace',
                letterSpacing: '-0.5px',
                marginBottom: '4px',
                display: 'flex',
                alignItems: 'baseline',
                gap: '2px'
              }}>
                {scoreQualite !== null ? (
                  <AnimatedNumber value={scoreQualite} formatter={(val) => `${val.toFixed(2)}%`} />
                ) : (
                  <span>— %</span>
                )}
              </div>

              {/* Status Badge */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
                <span style={{
                  fontSize: '9px',
                  fontWeight: 800,
                  color: statusColor,
                  background: `${statusColor}18`,
                  border: `1px solid ${statusColor}40`,
                  padding: '2px 8px',
                  borderRadius: '6px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.6px'
                }}>
                  ● {statut}
                </span>

                {scoreQualite !== null && prevScoreQualite !== null && (
                  <div style={{
                    fontSize: '9px',
                    fontFamily: 'var(--font-mono)',
                    color: isPositiveVsPrev ? '#10B981' : '#FF4757',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '3px'
                  }}>
                    {isPositiveVsPrev ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                    <span>{isPositiveVsPrev ? '+' : '-'}{diffVsPrev?.toFixed(2)}% vs {prevYear}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Sleek Icon Badge */}
            <div style={{
              position: 'relative',
              width: '48px',
              height: '48px',
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '12px',
              background: `radial-gradient(circle, ${statusColor}30 0%, ${statusColor}05 70%)`,
              border: `1px solid ${statusColor}40`,
              boxShadow: `0 0 16px ${statusColor}25`
            }}>
              <Award size={24} style={{ color: statusColor }} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
