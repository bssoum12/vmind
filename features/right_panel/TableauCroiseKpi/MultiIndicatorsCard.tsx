"use client";

import React, { useEffect, useState } from "react";
import { KpiTooltip } from "./KpiTooltip";

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
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [kpis, setKpis] = useState<Kpi[]>([]);
    const [exportData, setExportData] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [hovered, setHovered] = useState(false);
    const [coords, setCoords] = useState({ top: 0, left: 0 });
    const [mounted, setMounted] = useState(false);
    const cardRef = React.useRef<HTMLDivElement>(null);
    const hideTimeout = React.useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        setMounted(true);
        const currentYear = new Date().getFullYear();
        const todayStr = new Date().toISOString().split("T")[0];
        const startOfYearStr = `${currentYear}-01-01`;
        setStartDate(startOfYearStr);
        setEndDate(todayStr);
    }, []);

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
    };

    const handleMouseLeave = () => {
        hideTimeout.current = setTimeout(() => {
            setHovered(false);
        }, 250); // 250ms buffer to cross the gap to the tooltip
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

    const fetchData = async (start: string, end: string) => {
        setLoading(true);
        setError("");

        try {
            const baseUrl =
                process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

            const clientId =
                process.env.NEXT_PUBLIC_CLIENT_ID || "DEMO";

            const formattedStart = start.replace(/-/g, "");
            const formattedEnd = end.replace(/-/g, "");

            const response = await fetch(
                `${baseUrl}/api/tools/get-tableau-croise-kpi-vdata`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        client_id: clientId,
                        startDate: formattedStart,
                        endDate: formattedEnd,
                    }),
                }
            );

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const json = await response.json();

            if (!json.ok) {
                throw new Error(json.error || "Erreur serveur");
            }

            setKpis(json.data?.kpis || []);
            setExportData(json.data?.exportData || null);
        } catch (err: any) {
            setError(err.message || "Erreur inconnue");
            setKpis([]);
            setExportData(null);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (activeAgentId === "VDATA" && startDate && endDate) {
            fetchData(startDate, endDate);
        }
    }, [activeAgentId, startDate, endDate]);

    if (activeAgentId !== "VDATA") {
        return null;
    }

    return (
        <div
            ref={cardRef}
            style={{
                position: "relative",
                marginTop: "16px",
                overflow: "visible",
                zIndex: 10,
            }}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
        >
            <KpiTooltip
                visible={hovered}
                kpis={kpis}
                coords={coords}
                exportData={exportData}
                onMouseEnter={handleTooltipMouseEnter}
                onMouseLeave={handleTooltipMouseLeave}
            />

            <div
                style={{
                    padding: "16px",
                    backgroundColor: hovered ? "rgba(6, 17, 31, 0.85)" : "rgba(6, 17, 31, 0.7)",
                    backgroundImage: `
                        radial-gradient(rgba(0, 240, 255, 0.04) 1px, transparent 0),
                        radial-gradient(rgba(0, 240, 255, 0.02) 1px, transparent 0)
                    `,
                    backgroundSize: "12px 12px",
                    backgroundPosition: "0 0, 6px 6px",
                    border: hovered ? "1px solid rgba(0, 240, 255, 0.35)" : "1px solid rgba(0, 240, 255, 0.16)",
                    borderRadius: "8px",
                    position: "relative",
                    overflow: "hidden",
                    cursor: "pointer",
                    boxShadow: hovered 
                        ? "0 10px 35px rgba(0, 0, 0, 0.55), inset 0 0 16px rgba(0, 240, 255, 0.08), 0 0 15px rgba(0, 240, 255, 0.1)" 
                        : "0 10px 35px rgba(0, 0, 0, 0.55), inset 0 0 16px rgba(0, 240, 255, 0.04)",
                    transform: hovered ? "translateY(-1px) scale(1.005)" : "none",
                    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                }}
            >
                {/* Glowing Corner Brackets */}
                <div style={{ position: "absolute", top: 0, left: 0, width: "10px", height: "10px", borderTop: "2px solid #00f0ff", borderLeft: "2px solid #00f0ff", borderRadius: "2px 0 0 0", boxShadow: "0 0 5px rgba(0, 240, 255, 0.4)" }} />
                <div style={{ position: "absolute", top: 0, right: 0, width: "10px", height: "10px", borderTop: "2px solid #00f0ff", borderRight: "2px solid #00f0ff", borderRadius: "0 2px 0 0", boxShadow: "0 0 5px rgba(0, 240, 255, 0.4)" }} />
                <div style={{ position: "absolute", bottom: 0, left: 0, width: "10px", height: "10px", borderBottom: "2px solid #00f0ff", borderLeft: "2px solid #00f0ff", borderRadius: "0 0 0 2px", boxShadow: "0 0 5px rgba(0, 240, 255, 0.4)" }} />
                <div style={{ position: "absolute", bottom: 0, right: 0, width: "10px", height: "10px", borderBottom: "2px solid #00f0ff", borderRight: "2px solid #00f0ff", borderRadius: "0 0 2px 0", boxShadow: "0 0 5px rgba(0, 240, 255, 0.4)" }} />

                <div
                    style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        right: 0,
                        height: "1px",
                        background:
                            "linear-gradient(90deg, transparent, var(--cyan), transparent)",
                        opacity: 0.6,
                    }}
                />

                <div
                    style={{
                        fontSize: "9px",
                        color: "var(--muted)",
                        fontFamily: "var(--font-mono)",
                        letterSpacing: "1.5px",
                        textTransform: "uppercase",
                        marginBottom: "10px",
                    }}
                >
                    Vue multi-indicateurs
                </div>

                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: "10px",
                    }}
                >
                    {/* Left Section */}
                    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "10px" }}>
                        {loading ? (
                            <div
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "8px",
                                }}
                            >
                                <div
                                    style={{
                                        width: "6px",
                                        height: "6px",
                                        borderRadius: "50%",
                                        background: "var(--cyan)",
                                        boxShadow: "0 0 6px var(--cyan)",
                                        animation: "pulse 1.5s infinite",
                                    }}
                                />

                                <span
                                    style={{
                                        fontSize: "9px",
                                        fontFamily: "var(--font-mono)",
                                        color: "var(--muted)",
                                    }}
                                >
                                    CHARGEMENT…
                                </span>
                            </div>
                        ) : error ? (
                            <div
                                style={{
                                    display: "flex",
                                    flexDirection: "column",
                                    gap: "6px",
                                }}
                            >
                                <span
                                    style={{
                                        color: "var(--red)",
                                        fontSize: "9px",
                                        fontFamily: "var(--font-mono)",
                                    }}
                                >
                                    {error}
                                </span>

                                <button
                                    onClick={() => fetchData(startDate, endDate)}
                                    style={{
                                        background: "none",
                                        border: "none",
                                        color: "var(--cyan)",
                                        cursor: "pointer",
                                        fontSize: "8px",
                                        fontFamily: "var(--font-mono)",
                                        textDecoration: "underline",
                                        padding: 0,
                                        textAlign: "left",
                                    }}
                                >
                                    Réessayer
                                </button>
                            </div>
                        ) : (
                            <div>
                                <div
                                    style={{
                                        color: "var(--white)",
                                        fontSize: "13px",
                                        fontWeight: 600,
                                        marginBottom: "4px",
                                    }}
                                >
                                    {kpis.length || 7} KPI disponibles
                                </div>

                                <div
                                    style={{
                                        color: "var(--muted)",
                                        fontSize: "9px",
                                        fontFamily: "var(--font-mono)",
                                    }}
                                >
                                    Survolez pour afficher les détails
                                </div>
                            </div>
                        )}

                        {/* Cyber-accented Date Picker Controls */}
                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "6px",
                                zIndex: 20,
                                position: "relative",
                                marginTop: "4px",
                            }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                onKeyDown={(e) => e.preventDefault()}
                                onClick={(e) => {
                                    try {
                                        e.currentTarget.showPicker();
                                    } catch (err) {}
                                }}
                                style={{
                                    background: "rgba(0, 240, 255, 0.04)",
                                    color: "#00f0ff",
                                    border: "1px solid rgba(0, 240, 255, 0.2)",
                                    borderRadius: "4px",
                                    padding: "3px 6px",
                                    fontFamily: "var(--font-mono)",
                                    fontSize: "8px",
                                    outline: "none",
                                    cursor: "pointer",
                                    transition: "all 0.2s ease",
                                }}
                                onFocus={(e) => {
                                    e.target.style.borderColor = "#00f0ff";
                                    e.target.style.boxShadow = "0 0 6px rgba(0, 240, 255, 0.2)";
                                }}
                                onBlur={(e) => {
                                    e.target.style.borderColor = "rgba(0, 240, 255, 0.2)";
                                    e.target.style.boxShadow = "none";
                                }}
                            />
                            <span
                                style={{
                                    color: "var(--muted)",
                                    fontSize: "8px",
                                    fontFamily: "var(--font-mono)",
                                    flexShrink: 0,
                                }}
                            >
                                au
                            </span>
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                onKeyDown={(e) => e.preventDefault()}
                                onClick={(e) => {
                                    try {
                                        e.currentTarget.showPicker();
                                    } catch (err) {}
                                }}
                                style={{
                                    background: "rgba(0, 240, 255, 0.04)",
                                    color: "#00f0ff",
                                    border: "1px solid rgba(0, 240, 255, 0.2)",
                                    borderRadius: "4px",
                                    padding: "3px 6px",
                                    fontFamily: "var(--font-mono)",
                                    fontSize: "8px",
                                    outline: "none",
                                    cursor: "pointer",
                                    transition: "all 0.2s ease",
                                }}
                                onFocus={(e) => {
                                    e.target.style.borderColor = "#00f0ff";
                                    e.target.style.boxShadow = "0 0 6px rgba(0, 240, 255, 0.2)";
                                }}
                                onBlur={(e) => {
                                    e.target.style.borderColor = "rgba(0, 240, 255, 0.2)";
                                    e.target.style.boxShadow = "none";
                                }}
                            />
                        </div>
                    </div>

                    {/* Right Section: Animated Radar Web Chart */}
                    <div style={{ flexShrink: 0, overflow: "visible" }}>
                        <AnimatedRadar />
                    </div>
                </div>
            </div>
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

    const cx = 55;
    const cy = 55;
    const maxRadius = 38;
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
            
            // If not mounted, keep animation offset static (0)
            let wave = 0;
            if (mounted) {
                if (shapeType === "cyan") {
                    wave = 0.07 * Math.sin((time * 0.0015) + i * 1.5);
                } else if (shapeType === "purple") {
                    wave = 0.07 * Math.cos((time * 0.0012) + i * 2.0);
                } else if (shapeType === "green") {
                    wave = 0.06 * Math.sin((time * 0.0018) + i * 0.8);
                } else { // amber
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
            width="110" 
            height="110" 
            viewBox="0 0 110 110" 
            style={{ display: "block", overflow: "visible" }}
        >
            <defs>
                {/* Glow Filter for Cyber Neon Style */}
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
                const labelDist = maxRadius + 9;
                const lx = cx + labelDist * Math.cos(angle);
                const ly = cy + labelDist * Math.sin(angle);
                return (
                    <text
                        key={`label-${i}`}
                        x={lx}
                        y={ly}
                        fill="rgba(0, 240, 255, 0.5)"
                        fontSize="7"
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
            {/* Amber Shape Vertices Glow Dots */}
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
            {/* Green Shape Vertices Glow Dots */}
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
            {/* Purple Shape Vertices Glow Dots */}
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
            {/* Cyan Shape Vertices Glow Dots */}
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