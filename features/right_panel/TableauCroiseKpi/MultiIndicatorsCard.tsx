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

        const [selectedYear, setSelectedYear] = useState(currentYear);
    const [kpis, setKpis] = useState<Kpi[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [hovered, setHovered] = useState(false);
    const [coords, setCoords] = useState({ top: 0, left: 0 });
    const cardRef = React.useRef<HTMLDivElement>(null);

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
        updateCoords();
        setHovered(true);
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

    const fetchData = async (year: number) => {
        setLoading(true);
        setError("");

        try {
            const baseUrl =
                process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

            const clientId =
                process.env.NEXT_PUBLIC_CLIENT_ID || "DEMO";

            const response = await fetch(
                `${baseUrl}/api/tools/get-tableau-croise-kpi-vdata`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        client_id: clientId,
                        year,
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
        } catch (err: any) {
            setError(err.message || "Erreur inconnue");
            setKpis([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (activeAgentId === "VDATA") {
            fetchData(selectedYear);
        }
    }, [activeAgentId, selectedYear]);

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
            onMouseLeave={() => setHovered(false)}
        >
            <KpiTooltip
                visible={hovered}
                kpis={kpis}
                coords={coords}
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
                            onClick={() => fetchData(selectedYear)}
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

                        <select
                            value={selectedYear}
                            onChange={(e) => setSelectedYear(Number(e.target.value))}
                            onClick={(e) => e.stopPropagation()}
                            style={{
                                appearance: "none",
                                WebkitAppearance: "none",

                                background: "rgba(0,229,200,0.06)",
                                color: "var(--cyan)",

                                border: "1px solid rgba(0,229,200,0.15)",
                                borderRadius: "8px",

                                padding: "8px 28px 8px 12px",

                                fontFamily: "var(--font-mono)",
                                fontSize: "10px",
                                fontWeight: 600,

                                

                                cursor: "pointer",

                                boxShadow: "0 0 10px rgba(0,229,200,0.08)",

                                backgroundImage: `
    linear-gradient(45deg, transparent 50%, var(--cyan) 50%),
    linear-gradient(135deg, var(--cyan) 50%, transparent 50%)
  `,
                                backgroundPosition:
                                    "calc(100% - 12px) calc(50% - 2px), calc(100% - 8px) calc(50% - 2px)",
                                backgroundSize: "4px 4px",
                                backgroundRepeat: "no-repeat",
                            }}
                        >
                            {Array.from({ length: 5 }, (_, i) => currentYear - i).map(
                                (year) => (
                                    <option key={year} value={year}>
                                        {year}
                                    </option>
                                )
                            )}
                        </select>
                    </div>
                )}
            </div>
        </div>
    );
};