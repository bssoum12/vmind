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
    const currentYear = new Date().getFullYear();
    const todayStr = new Date().toISOString().split("T")[0];
    const startOfYearStr = `${currentYear}-01-01`;

    const [startDate, setStartDate] = useState(startOfYearStr);
    const [endDate, setEndDate] = useState(todayStr);
    const [kpis, setKpis] = useState<Kpi[]>([]);
    const [exportData, setExportData] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [hovered, setHovered] = useState(false);
    const [coords, setCoords] = useState({ top: 0, left: 0 });
    const cardRef = React.useRef<HTMLDivElement>(null);
    const hideTimeout = React.useRef<NodeJS.Timeout | null>(null);

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
        if (activeAgentId === "VDATA") {
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
                    padding: "12px",
                    background: "rgba(0,229,200,0.03)",
                    border: "1px solid rgba(0,229,200,0.1)",
                    borderRadius: "6px",
                    position: "relative",
                    overflow: "hidden",
                    cursor: "pointer",
                }}
            >
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
                    <div
                        style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: "12px",
                        }}
                    >
                        <div
                            style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                gap: "12px",
                            }}
                        >
                            <div style={{ flex: 1 }}>
                                <div
                                    style={{
                                        color: "var(--white)",
                                        fontSize: "13px",
                                        fontWeight: 600,
                                        marginBottom: "4px",
                                    }}
                                >
                                    {kpis.length} KPI disponibles
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
                        </div>

                        {/* Cyber-accented Date Picker Controls */}
                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "6px",
                            }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                style={{
                                    background: "rgba(0,229,200,0.04)",
                                    color: "var(--cyan)",
                                    border: "1px solid rgba(0,229,200,0.15)",
                                    borderRadius: "6px",
                                    padding: "6px 8px",
                                    fontFamily: "var(--font-mono)",
                                    fontSize: "10px",
                                    fontWeight: 600,
                                    outline: "none",
                                    cursor: "pointer",
                                    transition: "border-color 0.2s, box-shadow 0.2s",
                                }}
                                onFocus={(e) => {
                                    e.target.style.borderColor = "var(--cyan)";
                                    e.target.style.boxShadow = "0 0 6px rgba(0, 229, 200, 0.2)";
                                }}
                                onBlur={(e) => {
                                    e.target.style.borderColor = "rgba(0, 229, 200, 0.15)";
                                    e.target.style.boxShadow = "none";
                                }}
                            />
                            <span
                                style={{
                                    color: "var(--muted)",
                                    fontSize: "9px",
                                    fontFamily: "var(--font-mono)",
                                }}
                            >
                                au
                            </span>
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                style={{
                                    background: "rgba(0,229,200,0.04)",
                                    color: "var(--cyan)",
                                    border: "1px solid rgba(0,229,200,0.15)",
                                    borderRadius: "6px",
                                    padding: "6px 8px",
                                    fontFamily: "var(--font-mono)",
                                    fontSize: "10px",
                                    fontWeight: 600,
                                    outline: "none",
                                    cursor: "pointer",
                                    transition: "border-color 0.2s, box-shadow 0.2s",
                                }}
                                onFocus={(e) => {
                                    e.target.style.borderColor = "var(--cyan)";
                                    e.target.style.boxShadow = "0 0 6px rgba(0, 229, 200, 0.2)";
                                }}
                                onBlur={(e) => {
                                    e.target.style.borderColor = "rgba(0, 229, 200, 0.15)";
                                    e.target.style.boxShadow = "none";
                                }}
                            />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};