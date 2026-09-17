"use client";

import React, { useEffect, useState, useRef } from "react";
import { RefreshCw, Info } from "lucide-react";
import { KpiTooltip } from "./KpiTooltip";
import { useKpis } from "../../../shared/contexts/KpiCacheContext";

interface Kpi {
    label: string;
    value: number;
    display: string;
    delta_24h?: number;
    unit?: string;
}

interface Props {
    activeAgentId?: string;
}

export const MultiIndicatorsCard: React.FC<Props> = ({
    activeAgentId,
}) => {
    const { kpisByAgent, loadingByAgent, fetchKpis, error: globalError } = useKpis();
    const [hovered, setHovered] = useState(false);
    const [isCardHovered, setIsCardHovered] = useState(false);
    const [coords, setCoords] = useState({ top: 0, left: 0 });
    const cardRef = useRef<HTMLDivElement>(null);
    const hideTimeout = useRef<NodeJS.Timeout | null>(null);

    // Read current active data from Context
    const agentData = kpisByAgent["vdata"] || kpisByAgent["VDATA"] || {};
    const toolData = agentData.get_tableau_croise || agentData || {};
    
    const kpis = toolData.ok && toolData.kpis ? (toolData.kpis as Kpi[]) : [];
    const exportData = toolData.data?.exportData || null;

    const effectiveLoading = (loadingByAgent["vdata"] || loadingByAgent["VDATA"]) && !toolData.ok;
    const error = !effectiveLoading && !toolData.ok && globalError ? globalError : "";

    const updateCoords = () => {
        if (cardRef.current) {
            const rect = cardRef.current.getBoundingClientRect();
            setCoords({
                top: rect.top,
                left: rect.left,
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

    if (activeAgentId !== "VDATA") {
        return null;
    }

    return (
        <div
            ref={cardRef}
            style={{
                background: 'linear-gradient(145deg, rgba(13, 17, 26, 0.96) 0%, rgba(14, 18, 30, 0.96) 100%)',
                border: '1px solid rgba(0, 240, 255, 0.3)',
                borderRadius: '16px',
                padding: '16px 18px',
                color: '#fff',
                boxShadow: '0 10px 35px rgba(0, 0, 0, 0.55), inset 0 0 20px rgba(0, 240, 255, 0.05)',
                backdropFilter: 'blur(16px)',
                position: 'relative',
                overflow: 'visible',
                marginBottom: '16px'
            }}
        >
            <KpiTooltip
                visible={hovered}
                kpis={kpis}
                coords={coords}
                exportData={exportData}
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
                        VUE MULTI-INDICATEURS
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
                    onClick={() => fetchKpis('vdata', true, 'get_tableau_croise')}
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
                    onMouseEnter={(e) => e.currentTarget.style.color = '#00f0ff'}
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
                    <span>Chargement de la vue multi-indicateurs...</span>
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
                <div
                    onMouseEnter={handleMouseEnter}
                    onMouseLeave={handleMouseLeave}
                    style={{
                        background: isCardHovered
                            ? 'linear-gradient(135deg, rgba(0, 240, 255, 0.1) 0%, rgba(6, 182, 212, 0.05) 100%)'
                            : 'rgba(255, 255, 255, 0.02)',
                        border: isCardHovered
                            ? '1px solid rgba(0, 240, 255, 0.4)'
                            : '1px solid rgba(255, 255, 255, 0.07)',
                        borderRadius: '14px',
                        padding: '14px 16px',
                        transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                        cursor: 'pointer',
                        boxShadow: isCardHovered ? '0 6px 24px rgba(0, 240, 255, 0.2)' : 'none',
                    }}
                >
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: "10px",
                        }}
                    >
                        {/* Left Section */}
                        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "8px" }}>
                            <div>
                                <div
                                    style={{
                                        color: "#FFFFFF",
                                        fontSize: "15px",
                                        fontWeight: 800,
                                        fontFamily: "monospace",
                                        marginBottom: "4px",
                                    }}
                                >
                                    {kpis.length || 7} Indicateurs Clés
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <span style={{
                                        fontSize: '9px',
                                        color: isCardHovered ? '#6EE7B7' : '#64748B',
                                        background: isCardHovered ? 'rgba(0, 229, 200, 0.18)' : 'rgba(255, 255, 255, 0.04)',
                                        border: isCardHovered ? '1px solid rgba(0, 229, 200, 0.35)' : '1px solid rgba(255, 255, 255, 0.08)',
                                        padding: '2px 8px',
                                        borderRadius: '12px',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                        transition: 'all 0.2s',
                                    }}>
                                        <Info size={10} style={{ color: isCardHovered ? '#00E5C8' : '#94A3B8' }} />
                                        {isCardHovered ? 'Détails interactifs' : 'Survolez pour détails'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Right Section: Animated Radar Web Chart */}
                        <div style={{ flexShrink: 0, overflow: "visible" }}>
                            <AnimatedRadar />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const AnimatedRadar: React.FC = () => {
    const [time, setTime] = useState(0);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        let animId: number;
        const tick = () => {
            setTime(prev => prev + 16);
            animId = requestAnimationFrame(tick);
        };
        animId = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(animId);
    }, []);

    const cx = 50;
    const cy = 50;
    const maxRadius = 34;
    const numAxes = 6;
    const axesLabels = ["0", "2", "4", "6", "8", "10"];

    // Base values for the four shapes
    const baseCyan = [0.85, 0.7, 0.8, 0.9, 0.65, 0.75];
    const basePurple = [0.55, 0.8, 0.6, 0.5, 0.85, 0.65];
    const baseGreen = [0.7, 0.5, 0.85, 0.75, 0.45, 0.9];
    const baseAmber = [0.4, 0.6, 0.5, 0.8, 0.7, 0.5];

    // Compute coordinate points for a shape
    const getPoints = (baseVals: number[], shapeType: "cyan" | "purple" | "green" | "amber") => {
        const points: { x: number; y: number }[] = [];
        for (let i = 0; i < numAxes; i++) {
            const angle = -Math.PI / 2 + i * (Math.PI / 3);
            
            let wave = 0;
            if (mounted) {
                if (shapeType === "cyan") {
                    wave = 0.07 * Math.sin((time * 0.0015) + i * 1.5);
                } else if (shapeType === "purple") {
                    wave = 0.07 * Math.cos((time * 0.0012) + i * 2.0);
                } else if (shapeType === "green") {
                    wave = 0.06 * Math.sin((time * 0.0018) + i * 0.8);
                } else {
                    wave = 0.06 * Math.cos((time * 0.0010) + i * 2.5);
                }
            }
            
            const pct = Math.min(1.0, Math.max(0.15, baseVals[i] + wave));
            const r = pct * maxRadius;
            const x = cx + r * Math.cos(angle);
            const y = cy + r * Math.sin(angle);
            points.push({ x, y });
        }
        return points;
    };

    const cyanPoints = getPoints(baseCyan, "cyan");
    const purplePoints = getPoints(basePurple, "purple");
    const greenPoints = getPoints(baseGreen, "green");
    const amberPoints = getPoints(baseAmber, "amber");

    const cyanPointsStr = cyanPoints.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
    const purplePointsStr = purplePoints.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
    const greenPointsStr = greenPoints.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
    const amberPointsStr = amberPoints.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");

    // Hexagon layers
    const hexagonLayers = [0.25, 0.5, 0.75, 1.0];
    const circleLayers = [0.4, 0.7, 0.95];

    return (
        <svg 
            width="100" 
            height="100" 
            viewBox="0 0 100 100" 
            style={{ display: "block", overflow: "visible" }}
        >
            <defs>
                <filter id="radarCyanGlow" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="2.5" result="blur" />
                    <feMerge>
                        <feMergeNode in="blur" />
                        <feMergeNode in="SourceGraphic" />
                    </feMerge>
                </filter>
                <filter id="radarPurpleGlow" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="2.5" result="blur" />
                    <feMerge>
                        <feMergeNode in="blur" />
                        <feMergeNode in="SourceGraphic" />
                    </feMerge>
                </filter>
                <filter id="radarGreenGlow" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="2.5" result="blur" />
                    <feMerge>
                        <feMergeNode in="blur" />
                        <feMergeNode in="SourceGraphic" />
                    </feMerge>
                </filter>
                <filter id="radarAmberGlow" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="2.5" result="blur" />
                    <feMerge>
                        <feMergeNode in="blur" />
                        <feMergeNode in="SourceGraphic" />
                    </feMerge>
                </filter>
            </defs>

            {/* Concentric Circle Grids */}
            {circleLayers.map((layer, idx) => (
                <circle
                    key={`c-layer-${idx}`}
                    cx={cx}
                    cy={cy}
                    r={layer * maxRadius}
                    fill="none"
                    stroke="rgba(0, 240, 255, 0.05)"
                    strokeWidth="0.8"
                />
            ))}

            {/* Concentric Hexagon Grids */}
            {hexagonLayers.map((layer, idx) => {
                const r = layer * maxRadius;
                const points = [];
                for (let i = 0; i < numAxes; i++) {
                    const angle = -Math.PI / 2 + i * (Math.PI / 3);
                    const x = cx + r * Math.cos(angle);
                    const y = cy + r * Math.sin(angle);
                    points.push(`${x},${y}`);
                }
                return (
                    <polygon
                        key={`h-layer-${idx}`}
                        points={points.join(" ")}
                        fill="none"
                        stroke="rgba(0, 229, 200, 0.12)"
                        strokeWidth="0.8"
                    />
                );
            })}

            {/* Spoke Axes */}
            {Array.from({ length: numAxes }).map((_, i) => {
                const angle = -Math.PI / 2 + i * (Math.PI / 3);
                const x2 = cx + maxRadius * Math.cos(angle);
                const y2 = cy + maxRadius * Math.sin(angle);
                return (
                    <line
                        key={`spoke-${i}`}
                        x1={cx}
                        y1={cy}
                        x2={x2}
                        y2={y2}
                        stroke="rgba(0, 229, 200, 0.15)"
                        strokeWidth="0.8"
                        strokeDasharray="2,2"
                    />
                );
            })}

            {/* Axes Labels */}
            {axesLabels.map((label, i) => {
                const angle = -Math.PI / 2 + i * (Math.PI / 3);
                const labelDist = maxRadius + 8;
                const lx = cx + labelDist * Math.cos(angle);
                const ly = cy + labelDist * Math.sin(angle);
                return (
                    <text
                        key={`label-${i}`}
                        x={lx}
                        y={ly}
                        fill="rgba(0, 240, 255, 0.5)"
                        fontSize="6.5"
                        fontFamily="var(--font-mono)"
                        textAnchor="middle"
                        dominantBaseline="central"
                    >
                        {label}
                    </text>
                );
            })}

            {/* Amber Shape */}
            <polygon
                points={amberPointsStr}
                fill="rgba(255, 184, 0, 0.05)"
                stroke="rgba(255, 184, 0, 0.5)"
                strokeWidth="0.9"
                style={{ transition: "all 0.1s linear" }}
            />
            {amberPoints.map((p, i) => (
                <circle
                    key={`a-dot-${i}`}
                    cx={p.x}
                    cy={p.y}
                    r="1.0"
                    fill="#ffb800"
                    stroke="#ffffff"
                    strokeWidth="0.3"
                    filter="url(#radarAmberGlow)"
                />
            ))}

            {/* Green Shape */}
            <polygon
                points={greenPointsStr}
                fill="rgba(0, 255, 136, 0.06)"
                stroke="rgba(0, 255, 136, 0.55)"
                strokeWidth="1.0"
                style={{ transition: "all 0.1s linear" }}
            />
            {greenPoints.map((p, i) => (
                <circle
                    key={`g-dot-${i}`}
                    cx={p.x}
                    cy={p.y}
                    r="1.2"
                    fill="#00ff88"
                    stroke="#ffffff"
                    strokeWidth="0.3"
                    filter="url(#radarGreenGlow)"
                />
            ))}

            {/* Purple Shape */}
            <polygon
                points={purplePointsStr}
                fill="rgba(123, 97, 255, 0.08)"
                stroke="rgba(123, 97, 255, 0.6)"
                strokeWidth="1.1"
                style={{ transition: "all 0.1s linear" }}
            />
            {purplePoints.map((p, i) => (
                <circle
                    key={`p-dot-${i}`}
                    cx={p.x}
                    cy={p.y}
                    r="1.4"
                    fill="#7b61ff"
                    stroke="#ffffff"
                    strokeWidth="0.3"
                    filter="url(#radarPurpleGlow)"
                />
            ))}

            {/* Cyan Shape */}
            <polygon
                points={cyanPointsStr}
                fill="rgba(0, 229, 200, 0.1)"
                stroke="rgba(0, 229, 200, 0.8)"
                strokeWidth="1.3"
                style={{ filter: "url(#radarCyanGlow)", transition: "all 0.1s linear" }}
            />
            {cyanPoints.map((p, i) => (
                <circle
                    key={`c-dot-${i}`}
                    cx={p.x}
                    cy={p.y}
                    r="1.7"
                    fill="#00f0ff"
                    stroke="#ffffff"
                    strokeWidth="0.3"
                    filter="url(#radarCyanGlow)"
                />
            ))}

            {/* Center Core dot */}
            <circle cx={cx} cy={cy} r="1.0" fill="var(--cyan)" />
        </svg>
    );
};