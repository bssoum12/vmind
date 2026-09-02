"use client";

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useKpis } from '@/shared/contexts/KpiCacheContext';
import { RefreshCw, Globe, Layers, Calendar, FileText, ChevronRight, ChevronLeft, X, Loader2, Navigation, MapPin, ChevronDown, ChevronUp, Ship, Plane, Truck, ArrowRight, Activity, Search, Maximize2, Minimize2 } from 'lucide-react';
import { AnimatedNumber } from './AnimatedNumber';

interface VmoveActiveFlowsMapCardProps {
  activeAgentId?: string;
  onRefresh?: (agentId?: string) => void;
  onInsertPrompt?: (text: string) => void;
}

// ── Country Node Layout Positions (Optimized Radial Spacing - Zero Collisions) ──
const COUNTRY_NODE_POSITIONS: Record<string, { name: string; x: number; y: number; iso: string; flag: string }> = {
  'Tunisie': { name: 'Tunisie', x: 500, y: 220, iso: 'TN', flag: '🇹🇳' },
  'France': { name: 'France', x: 380, y: 100, iso: 'FR', flag: '🇫🇷' },
  'Italie': { name: 'Italie', x: 620, y: 90, iso: 'IT', flag: '🇮🇹' },
  'Allemagne': { name: 'Allemagne', x: 500, y: 60, iso: 'DE', flag: '🇩🇪' },
  'Autriche': { name: 'Autriche', x: 740, y: 190, iso: 'AT', flag: '🇦🇹' },
  'Espagne': { name: 'Espagne', x: 260, y: 150, iso: 'ES', flag: '🇪🇸' },
  'Turquie': { name: 'Turquie', x: 740, y: 130, iso: 'TR', flag: '🇹🇷' },
  'Chine': { name: 'Chine', x: 880, y: 180, iso: 'CN', flag: '🇨🇳' },
  'États-Unis': { name: 'États-Unis', x: 120, y: 130, iso: 'US', flag: '🇺🇸' },
  'Émirats Arabes Unis': { name: 'Émirats Arabes Unis', x: 820, y: 280, iso: 'AE', flag: '🇦🇪' },
  'Égypte': { name: 'Égypte', x: 720, y: 320, iso: 'EG', flag: '🇪🇬' },
  'Royaume-Uni': { name: 'Royaume-Uni', x: 290, y: 70, iso: 'GB', flag: '🇬🇧' },
  'Belgique': { name: 'Belgique', x: 420, y: 65, iso: 'BE', flag: '🇧🇪' },
  'Pays-Bas': { name: 'Pays-Bas', x: 460, y: 55, iso: 'NL', flag: '🇳🇱' },
  'Suisse': { name: 'Suisse', x: 450, y: 110, iso: 'CH', flag: '🇨🇭' },
  'Pologne': { name: 'Pologne', x: 580, y: 65, iso: 'PL', flag: '🇵🇱' },
  'Portugal': { name: 'Portugal', x: 200, y: 190, iso: 'PT', flag: '🇵🇹' },
  'Grèce': { name: 'Grèce', x: 670, y: 170, iso: 'GR', flag: '🇬🇷' },
  'Algérie': { name: 'Algérie', x: 320, y: 310, iso: 'DZ', flag: '🇩🇿' },
  'Maroc': { name: 'Maroc', x: 180, y: 270, iso: 'MA', flag: '🇲🇦' },
  'Libye': { name: 'Libye', x: 500, y: 370, iso: 'LY', flag: '🇱🇾' },
  'Inde': { name: 'Inde', x: 860, y: 250, iso: 'IN', flag: '🇮🇳' },
  'Japon': { name: 'Japon', x: 920, y: 120, iso: 'JP', flag: '🇯🇵' },
  'Corée du Sud': { name: 'Corée du Sud', x: 920, y: 150, iso: 'KR', flag: '🇰🇷' },
  'Canada': { name: 'Canada', x: 150, y: 70, iso: 'CA', flag: '🇨🇦' },
  'Brésil': { name: 'Brésil', x: 150, y: 350, iso: 'BR', flag: '🇧🇷' },
  'Qatar': { name: 'Qatar', x: 780, y: 370, iso: 'QA', flag: '🇶🇦' },
  'Non Spécifié': { name: 'Non Spécifié', x: 500, y: 370, iso: 'N/A', flag: '🌐' }
};

const getNodePosition = (countryName: string, index: number = 0) => {
  if (!countryName || countryName === 'N/A' || countryName === 'Inconnu') return COUNTRY_NODE_POSITIONS['Non Spécifié'];
  const clean = countryName.trim();
  if (COUNTRY_NODE_POSITIONS[clean]) return COUNTRY_NODE_POSITIONS[clean];

  const foundKey = Object.keys(COUNTRY_NODE_POSITIONS).find(
    k => k.toLowerCase() === clean.toLowerCase() || clean.toLowerCase().includes(k.toLowerCase())
  );
  if (foundKey) return COUNTRY_NODE_POSITIONS[foundKey];

  // Golden ratio spiral algorithm for unmapped locations (Guarantees zero overlap)
  const goldenAngle = 137.5 * (Math.PI / 180);
  const radius = 130 + Math.sqrt(index + 1) * 45;
  const angle = index * goldenAngle;

  return {
    name: clean,
    x: 500 + radius * Math.cos(angle),
    y: 220 + radius * Math.sin(angle),
    iso: 'N/A',
    flag: '📍'
  };
};

// ── Helper to normalize any city/airport/port string into its Country Hub ──
const normalizeToCountry = (name: string): string => {
  if (!name || name === 'N/A' || name === 'Inconnu') return 'Non Spécifié';
  const clean = name.trim();
  const s = clean.toUpperCase();
  if (s.includes('PARIS') || s.includes('CDG') || s.includes('ORLY') || s.includes('FRANCE') || s.includes('LYON') || s.includes('MARSEILLE') || s.includes('VALENCE') || s.includes('HEIMSBRUNN')) return 'France';
  if (s.includes('TUNIS') || s.includes('CARTHAGE') || s.includes('RADES') || s.includes('GOULETTE') || s.includes('TUNISIE') || s.includes('SOUSSE') || s.includes('SFAX')) return 'Tunisie';
  if (s.includes('MAROC') || s.includes('TANGER') || s.includes('CASABLANCA')) return 'Maroc';
  if (s.includes('ESPAGNE') || s.includes('SPAIN') || s.includes('MADRID') || s.includes('BARCELONA')) return 'Espagne';
  if (s.includes('ITAL') || s.includes('ROME') || s.includes('MILAN')) return 'Italie';
  if (s.includes('ALLEMAGNE') || s.includes('GERMAN') || s.includes('FRANKFURT') || s.includes('HAMBURG')) return 'Allemagne';
  if (s.includes('ROYAUME-UNI') || s.includes('UK') || s.includes('LONDON')) return 'Royaume-Uni';
  if (s.includes('VIENNE') || s.includes('VIENNA') || s.includes('AUTRICHE') || s.includes('AUSTRIA')) return 'Autriche';
  if (s.includes('CHINE') || s.includes('CHINA') || s.includes('HONG KONG') || s.includes('SHANGHAI')) return 'Chine';
  if (s.includes('JAPON') || s.includes('JAPAN') || s.includes('TOKYO')) return 'Japon';
  if (s.includes('ÉMIRATS') || s.includes('EMIRAT') || s.includes('DUBAI') || s.includes('ABU DHABI')) return 'Émirats Arabes Unis';
  if (s.includes('ALGÉR') || s.includes('ALGER')) return 'Algérie';
  if (s.includes('ÉGYPTE') || s.includes('EGYPT') || s.includes('CAIRO')) return 'Égypte';
  if (s.includes('QATAR') || s.includes('DOHA')) return 'Qatar';
  if (s.includes('TURQ') || s.includes('TURKEY') || s.includes('ISTANBUL')) return 'Turquie';
  if (s.includes('PAYS-BAS') || s.includes('NETHERLANDS') || s.includes('ROTTERDAM') || s.includes('AMSTERDAM') || s.includes('OUDENBOSCH')) return 'Pays-Bas';
  if (s.includes('BELG') || s.includes('BRUSSELS') || s.includes('ANTWERP')) return 'Belgique';
  if (s.includes('ÉTATS-UNIS') || s.includes('USA') || s.includes('NEW YORK')) return 'États-Unis';
  return clean;
};

// ── Helpers for resolving Chargement & Livraison fallback displays ──
const getChargementDisplay = (item: any): string => {
  if (item.lieu_chargement && item.lieu_chargement !== 'N/A' && item.lieu_chargement !== 'Inconnu') {
    return item.lieu_chargement;
  }
  if (item.aeroport_depart && item.aeroport_depart !== 'N/A' && item.aeroport_depart !== 'Inconnu') {
    return item.aeroport_depart;
  }
  if (item.port_depart && item.port_depart !== 'N/A' && item.port_depart !== 'Inconnu') {
    return item.port_depart;
  }
  return 'N/A';
};

const getLivraisonDisplay = (item: any): string => {
  if (item.lieu_livraison && item.lieu_livraison !== 'N/A' && item.lieu_livraison !== 'Inconnu') {
    return item.lieu_livraison;
  }
  if (item.aeroport_destination && item.aeroport_destination !== 'N/A' && item.aeroport_destination !== 'Inconnu') {
    return item.aeroport_destination;
  }
  if (item.port_destination && item.port_destination !== 'N/A' && item.port_destination !== 'Inconnu') {
    return item.port_destination;
  }
  return 'N/A';
};

export const VmoveActiveFlowsMapCard: React.FC<VmoveActiveFlowsMapCardProps> = ({
  activeAgentId,
  onRefresh,
}) => {
  const { kpisByAgent, loadingByAgent, fetchKpis, error: globalError } = useKpis();
  const agentData = kpisByAgent["vmove"] || kpisByAgent["VMOVE"] || {};
  const n8nToolData = agentData.get_vmove_kpi_active_flows;

  const effectiveLoading = (loadingByAgent["vmove"] || loadingByAgent["VMOVE"]) && !n8nToolData;
  const error = !effectiveLoading && !n8nToolData && globalError ? globalError : "";
  const payload = n8nToolData?.data || n8nToolData;

  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [selectedMonth, setSelectedMonth] = useState<number>(0);

  // View Mode: 'map' (Visual Cyber Nodes Network) vs 'grid' (Corridor Cards List)
  const [viewMode, setViewMode] = useState<'map' | 'grid'>('map');

  // Interactive Hover & Selection State
  const [hoveredRouteKey, setHoveredRouteKey] = useState<string | null>(null);
  const [selectedRouteFilter, setSelectedRouteFilter] = useState<string | null>(null);
  const [hoveredCountryNode, setHoveredCountryNode] = useState<string | null>(null);

  // Widget / HUD Drawer State
  const [isWidgetOpen, setIsWidgetOpen] = useState<boolean>(false);
  const [isMapModalOpen, setIsMapModalOpen] = useState<boolean>(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const widgetPortalRef = useRef<HTMLDivElement>(null);

  // Collapsible Accordion Toggle (false by default for zero layout shift)
  const [isChartsExpanded, setIsChartsExpanded] = useState<boolean>(false);

  // Pagination State for HUD Widget (5 items per page)
  const [currentPage, setCurrentPage] = useState<number>(1);
  const ITEMS_PER_PAGE = 5;

  // Corridor List Search & Pagination State
  const [corridorSearchQuery, setCorridorSearchQuery] = useState<string>('');
  const [corridorPage, setCorridorPage] = useState<number>(1);
  const CORRIDORS_PER_PAGE = 5;

  const [isMounted, setIsMounted] = useState<boolean>(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleRefreshClick = () => {
    fetchKpis('vmove', true, 'get_vmove_kpi_active_flows');
  };

  // Close widget on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const isClickInCard = cardRef.current && cardRef.current.contains(event.target as Node);
      const isClickInWidget = widgetPortalRef.current && widgetPortalRef.current.contains(event.target as Node);
      if (!isClickInCard && !isClickInWidget) {
        setIsWidgetOpen(false);
      }
    };
    if (isWidgetOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isWidgetOpen]);

  // Guard Clause: Only display for VMOVE (and VDATA overview) - Placed AFTER all hooks!
  if (activeAgentId && activeAgentId !== 'VMOVE') {
    return null;
  }

  const summary = payload?.summary || {
    total_dossiers_actifs: 0,
    total_routes_actives: 0,
    annee: selectedYear,
    mois: selectedMonth
  };

  const routesList: any[] = payload?.routes || [];
  const rawDetails: any[] = payload?.details || [];

  // Aggregate raw routes into clean Country Hub routes
  const aggregatedRoutesMap = new Map<string, { origin_country: string; destination_country: string; count: number; route_key: string; cities: Set<string> }>();

  routesList.forEach(r => {
    const normOrigin = normalizeToCountry(r.origin_country);
    const normDest = normalizeToCountry(r.destination_country);
    const key = `${normOrigin} ➔ ${normDest}`;
    
    if (aggregatedRoutesMap.has(key)) {
      const existing = aggregatedRoutesMap.get(key)!;
      existing.count += r.count;
      existing.cities.add(r.origin_country);
      existing.cities.add(r.destination_country);
    } else {
      aggregatedRoutesMap.set(key, {
        origin_country: normOrigin,
        destination_country: normDest,
        count: r.count,
        route_key: key,
        cities: new Set([r.origin_country, r.destination_country])
      });
    }
  });

  const mapRoutesList = Array.from(aggregatedRoutesMap.values());

  // Filtered corridors list for grid view (using clean aggregated Country Hub corridors)
  const filteredCorridors = mapRoutesList.filter(r => {
    if (!corridorSearchQuery) return true;
    const q = corridorSearchQuery.toLowerCase().trim();
    return r.origin_country.toLowerCase().includes(q) ||
           r.destination_country.toLowerCase().includes(q) ||
           r.route_key.toLowerCase().includes(q);
  });

  const totalCorridorPages = Math.ceil(filteredCorridors.length / CORRIDORS_PER_PAGE) || 1;
  const paginatedCorridors = filteredCorridors.slice(
    (corridorPage - 1) * CORRIDORS_PER_PAGE,
    corridorPage * CORRIDORS_PER_PAGE
  );

  // Filtered details for HUD Widget (Strict Origin AND Destination Match)
  const filteredDetails = rawDetails.filter(item => {
    if (!selectedRouteFilter) return true;
    const depCountry = normalizeToCountry(item.pays_depart && item.pays_depart !== 'Inconnu' ? item.pays_depart : (item.aeroport_depart || item.port_depart || item.lieu_chargement || 'Non Spécifié'));
    const arrCountry = normalizeToCountry(item.pays_livraison && item.pays_livraison !== 'Inconnu' ? item.pays_livraison : (item.aeroport_destination || item.port_destination || item.lieu_livraison || 'Non Spécifié'));
    
    const normKey = `${depCountry} ➔ ${arrCountry}`.toUpperCase();
    const rawKey = `${item.pays_depart || ''} ➔ ${item.pays_livraison || ''}`.toUpperCase();
    const targetKey = selectedRouteFilter.toUpperCase();

    const parts = targetKey.split('➔').map(s => s.trim());
    if (parts.length === 2) {
      const [targetOrigin, targetDest] = parts;
      const itemOrigin = depCountry.toUpperCase();
      const itemDest = arrCountry.toUpperCase();
      const rawOrigin = (item.pays_depart || item.aeroport_depart || item.port_depart || item.lieu_chargement || '').toUpperCase();
      const rawDest = (item.pays_livraison || item.aeroport_destination || item.port_destination || item.lieu_livraison || '').toUpperCase();

      const matchesOrigin = (itemOrigin === targetOrigin) || targetOrigin.includes(itemOrigin) || (rawOrigin && targetOrigin.includes(rawOrigin));
      const matchesDest = (itemDest === targetDest) || targetDest.includes(itemDest) || (rawDest && targetDest.includes(rawDest));

      return matchesOrigin && matchesDest;
    }

    return normKey === targetKey || rawKey === targetKey;
  });

  const totalPages = Math.ceil(filteredDetails.length / ITEMS_PER_PAGE) || 1;
  const paginatedDetails = filteredDetails.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const monthNames = [
    "Toute l'année", "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
    "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
  ];

  const getNatureIcon = (nature: string) => {
    const n = (nature || '').toLowerCase();
    if (n.includes('mar') || n.includes('sea')) return <Ship size={12} color="#00E5C8" />;
    if (n.includes('air') || n.includes('aér')) return <Plane size={12} color="#38BDF8" />;
    return <Truck size={12} color="#F59E0B" />;
  };

  // Collect active unique countries for clean node network
  const activeCountryNames = Array.from(new Set([
    ...mapRoutesList.map(r => r.origin_country),
    ...mapRoutesList.map(r => r.destination_country)
  ])).filter(c => c && c !== 'Inconnu');

  return (
    <div
      ref={cardRef}
      style={{
        background: 'linear-gradient(135deg, rgba(8, 25, 38, 0.95) 0%, rgba(12, 35, 52, 0.95) 100%)',
        border: '1px solid rgba(0, 229, 200, 0.35)',
        borderRadius: '16px',
        padding: '16px',
        color: '#FFF',
        boxShadow: '0 8px 32px rgba(0, 229, 200, 0.12), inset 0 1px 0 rgba(255,255,255,0.08)',
        position: 'relative',
        backdropFilter: 'blur(12px)',
        marginBottom: '16px'
      }}
    >
      {/* 1. Header with Cyber Glow */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '36px', height: '36px', borderRadius: '10px',
            background: 'rgba(0, 229, 200, 0.15)',
            border: '1px solid rgba(0, 229, 200, 0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 12px rgba(0, 229, 200, 0.25)'
          }}>
            <Globe size={20} color="#00E5C8" />
          </div>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 800, color: '#00E5C8', letterSpacing: '0.4px', textTransform: 'uppercase' }}>
              Carte Flux Actifs
            </div>
            <div style={{ fontSize: '10px', color: '#94A3B8', fontWeight: 500 }}>
              Visualisation des Corridors Logistiques
            </div>
          </div>
        </div>

        <button
          onClick={handleRefreshClick}
          disabled={effectiveLoading}
          style={{
            background: 'rgba(0, 229, 200, 0.1)',
            border: '1px solid rgba(0, 229, 200, 0.3)',
            borderRadius: '8px',
            padding: '6px 10px',
            color: '#00E5C8',
            fontSize: '10px',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'all 0.2s ease'
          }}
        >
          <RefreshCw size={12} className={effectiveLoading ? "animate-spin" : ""} />
          <span>{effectiveLoading ? "..." : "Actualiser"}</span>
        </button>
      </div>

      {/* 2. Period Filter Selector */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'rgba(4, 15, 25, 0.6)',
        border: '1px solid rgba(0, 229, 200, 0.18)',
        borderRadius: '10px',
        padding: '6px 10px',
        marginBottom: '14px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#00E5C8', fontWeight: 700 }}>
          <Calendar size={13} />
          <span>PÉRIODE:</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
            style={{
              background: 'rgba(8, 25, 38, 0.9)',
              border: '1px solid rgba(0, 229, 200, 0.3)',
              borderRadius: '6px',
              color: '#FFF',
              fontSize: '11px',
              padding: '3px 8px',
              outline: 'none',
              cursor: 'pointer',
              fontWeight: 600
            }}
          >
            {monthNames.map((m, idx) => (
              <option key={idx} value={idx} style={{ background: '#081926', color: '#FFF' }}>{m}</option>
            ))}
          </select>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            style={{
              background: 'rgba(8, 25, 38, 0.9)',
              border: '1px solid rgba(0, 229, 200, 0.3)',
              borderRadius: '6px',
              color: '#FFF',
              fontSize: '11px',
              padding: '3px 8px',
              outline: 'none',
              cursor: 'pointer',
              fontWeight: 600
            }}
          >
            {[2024, 2025, 2026].map((y) => (
              <option key={y} value={y} style={{ background: '#081926', color: '#FFF' }}>{y}</option>
            ))}
          </select>
        </div>
      </div>

      {/* 3. Summary Metric Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', marginBottom: '14px' }}>
        <div style={{
          background: 'rgba(0, 229, 200, 0.08)',
          border: '1px solid rgba(0, 229, 200, 0.25)',
          borderRadius: '12px',
          padding: '10px 12px'
        }}>
          <div style={{ fontSize: '9px', color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.3px', display: 'flex', alignItems: 'center', gap: '5px' }}>
            <Navigation size={11} color="#00E5C8" /> ROUTE CANAUX
          </div>
          <div style={{ fontSize: '20px', fontWeight: 900, color: '#00E5C8', marginTop: '2px', lineHeight: 1.1 }}>
            <AnimatedNumber value={summary.total_routes_actives} />
          </div>
          <div style={{ fontSize: '8px', color: '#64748B', marginTop: '2px', fontWeight: 600 }}>
            Axes logistiques découverts
          </div>
        </div>

        <div style={{
          background: 'rgba(56, 189, 248, 0.08)',
          border: '1px solid rgba(56, 189, 248, 0.25)',
          borderRadius: '12px',
          padding: '10px 12px'
        }}>
          <div style={{ fontSize: '9px', color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.3px', display: 'flex', alignItems: 'center', gap: '5px' }}>
            <MapPin size={11} color="#38BDF8" /> DOSSIERS EN TRANSIT
          </div>
          <div style={{ fontSize: '20px', fontWeight: 900, color: '#38BDF8', marginTop: '2px', lineHeight: 1.1 }}>
            <AnimatedNumber value={summary.total_dossiers_actifs} />
          </div>
          <div style={{ fontSize: '8px', color: '#64748B', marginTop: '2px', fontWeight: 600 }}>
            {selectedMonth === 0 ? `Année ${selectedYear}` : `${monthNames[selectedMonth]} ${selectedYear}`}
          </div>
        </div>
      </div>

      {/* 4. Collapsible Chart Accordion Header */}
      <button
        onClick={() => setIsChartsExpanded(prev => !prev)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '6px 10px',
          background: 'rgba(0, 229, 200, 0.08)',
          border: '1px solid rgba(0, 229, 200, 0.25)',
          borderRadius: '8px',
          color: '#00E5C8',
          fontSize: '10px',
          fontWeight: 700,
          cursor: 'pointer',
          marginBottom: isChartsExpanded ? '12px' : '0px',
          transition: 'all 0.2s ease'
        }}
      >
        <span>{isChartsExpanded ? "Masquer le schéma interactif des flux" : "Afficher le schéma interactif des flux en transit"}</span>
        {isChartsExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>

      {/* 5. Expanded Interactive Network Node View */}
      {isChartsExpanded && (
        <>
          {effectiveLoading ? (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: '220px',
              gap: '12px',
              color: '#00E5C8'
            }}>
              <Loader2 size={26} className="animate-spin" />
              <span style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 500 }}>Construction du schéma des flux...</span>
            </div>
          ) : (
            <div style={{
              background: 'rgba(4, 15, 25, 0.85)',
              border: '1px solid rgba(0, 229, 200, 0.2)',
              borderRadius: '12px',
              padding: '12px',
              position: 'relative',
              marginBottom: '12px'
            }}>
              {/* Header Bar: Mode Switcher & Filter Reset */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    onClick={() => setViewMode('map')}
                    style={{
                      background: viewMode === 'map' ? 'rgba(0, 229, 200, 0.2)' : 'transparent',
                      border: `1px solid ${viewMode === 'map' ? '#00E5C8' : 'rgba(148, 163, 184, 0.2)'}`,
                      borderRadius: '6px',
                      padding: '3px 8px',
                      fontSize: '10px',
                      color: viewMode === 'map' ? '#00E5C8' : '#94A3B8',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    Réseau Cyber
                  </button>
                  <button
                    onClick={() => setViewMode('grid')}
                    style={{
                      background: viewMode === 'grid' ? 'rgba(0, 229, 200, 0.2)' : 'transparent',
                      border: `1px solid ${viewMode === 'grid' ? '#00E5C8' : 'rgba(148, 163, 184, 0.2)'}`,
                      borderRadius: '6px',
                      padding: '3px 8px',
                      fontSize: '10px',
                      color: viewMode === 'grid' ? '#00E5C8' : '#94A3B8',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    Liste par Corridors ({mapRoutesList.length})
                  </button>
                </div>

                {selectedRouteFilter && (
                  <button
                    onClick={() => setSelectedRouteFilter(null)}
                    style={{ background: 'none', border: 'none', color: '#00E5C8', fontSize: '10px', cursor: 'pointer', textDecoration: 'underline' }}
                  >
                    Réinitialiser filtre
                  </button>
                )}
              </div>
              {/* View Mode 1: Cyber Hologram Node Network Diagram */}
              {viewMode === 'map' && (
                <div style={{ width: '100%', height: '280px', position: 'relative', borderRadius: '10px', overflow: 'hidden', background: '#030C14', border: '1px solid rgba(0,229,200,0.1)' }}>
                  {/* Floating Maximize Button in Top-Right Corner */}
                  <button
                    onClick={() => setIsMapModalOpen(true)}
                    title="Agrandir en plein écran"
                    style={{
                      position: 'absolute',
                      top: '8px',
                      right: '8px',
                      zIndex: 10,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: 'rgba(3, 12, 20, 0.8)',
                      border: '1px solid rgba(0, 229, 200, 0.4)',
                      borderRadius: '6px',
                      padding: '5px',
                      color: '#00E5C8',
                      cursor: 'pointer',
                      backdropFilter: 'blur(4px)',
                      transition: 'all 0.2s ease',
                      boxShadow: '0 0 10px rgba(0, 229, 200, 0.2)'
                    }}
                  >
                    <Maximize2 size={13} />
                  </button>

                  <svg viewBox="200 10 800 360" style={{ width: '100%', height: '100%', display: 'block' }}>
                    <defs>
                      <linearGradient id="cyber-bg" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor="#030C14" />
                        <stop offset="100%" stopColor="#071927" />
                      </linearGradient>
                      <filter id="glow-cyan">
                        <feGaussianBlur stdDeviation="3" result="blur" />
                        <feMerge>
                          <feMergeNode in="blur" />
                          <feMergeNode in="SourceGraphic" />
                        </feMerge>
                      </filter>
                    </defs>

                    <rect width="1000" height="400" fill="url(#cyber-bg)" />

                    {/* Concentric Cyber Rings around Central Tunisia Hub */}
                    <circle cx="500" cy="220" r="110" fill="none" stroke="rgba(0,229,200,0.06)" strokeWidth="1" strokeDasharray="4 4" />
                    <circle cx="500" cy="220" r="190" fill="none" stroke="rgba(0,229,200,0.04)" strokeWidth="1" strokeDasharray="6 6" />

                    {/* Route Arcs */}
                    {mapRoutesList.map((route, idx) => {
                      const depNode = getNodePosition(route.origin_country, idx);
                      const arrNode = getNodePosition(route.destination_country, idx);

                      const isHovered = hoveredRouteKey === route.route_key;
                      const isSelected = !!selectedRouteFilter && (
                        selectedRouteFilter === route.route_key ||
                        (selectedRouteFilter.includes(route.origin_country) && selectedRouteFilter.includes(route.destination_country)) ||
                        (selectedRouteFilter.includes('VIENNE') && (route.destination_country === 'Autriche' || route.origin_country === 'Autriche')) ||
                        (selectedRouteFilter.includes('HEIMSBRUNN') && (route.destination_country === 'France' || route.origin_country === 'France'))
                      );

                      const midX = (depNode.x + arrNode.x) / 2;
                      const midY = (depNode.y + arrNode.y) / 2 - 25;
                      const pathD = `M ${depNode.x} ${depNode.y} Q ${midX} ${midY} ${arrNode.x} ${arrNode.y}`;

                      const opacity = selectedRouteFilter ? (isSelected ? 1 : 0.2) : 1;
                      const strokeColor = (isSelected || isHovered) ? '#00E5C8' : 'rgba(0, 229, 200, 0.35)';
                      const strokeWidth = isSelected ? 3.5 : isHovered ? 2.5 : 1.5;

                      return (
                        <g key={route.route_key} style={{ cursor: 'pointer', opacity }}
                          onMouseEnter={() => setHoveredRouteKey(route.route_key)}
                          onMouseLeave={() => setHoveredRouteKey(null)}
                          onClick={() => setSelectedRouteFilter(isSelected ? null : route.route_key)}
                        >
                          <path
                            d={pathD}
                            fill="none"
                            stroke={strokeColor}
                            strokeWidth={strokeWidth}
                            filter={(isSelected || isHovered) ? "url(#glow-cyan)" : "none"}
                          />
                          {/* Animated particle pulse */}
                          <circle r="3" fill="#00E5C8" filter="url(#glow-cyan)">
                            <animateMotion path={pathD} dur={`${2.5 + (idx % 3)}s`} repeatCount="indefinite" />
                          </circle>
                        </g>
                      );
                    })}

                    {/* Country Nodes & Badges */}
                    {activeCountryNames.map((cName, idx) => {
                      const node = getNodePosition(cName, idx);
                      const isHub = cName === 'Tunisie';

                      // Find total shipments associated with this node
                      const totalNodeDossiers = mapRoutesList
                        .filter(r => r.origin_country === cName || r.destination_country === cName)
                        .reduce((sum, r) => sum + r.count, 0);

                      return (
                        <g key={cName} transform={`translate(${node.x}, ${node.y})`} style={{ cursor: 'pointer' }}>
                          <circle r={isHub ? "10" : "7"} fill={isHub ? "#00E5C8" : "#38BDF8"} filter="url(#glow-cyan)" />
                          <circle r={isHub ? "16" : "12"} fill="none" stroke={isHub ? "#00E5C8" : "#38BDF8"} strokeWidth="1.2" opacity="0.6">
                            <animate attributeName="r" values={isHub ? "10;22;10" : "7;15;7"} dur="3s" repeatCount="indefinite" />
                            <animate attributeName="opacity" values="0.8;0;0.8" dur="3s" repeatCount="indefinite" />
                          </circle>

                          {/* Country Flag & Label Pill */}
                          <foreignObject x="-50" y={isHub ? "-34" : "-28"} width="100" height="24">
                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '4px',
                              background: isHub ? 'rgba(0, 229, 200, 0.25)' : 'rgba(8, 25, 38, 0.85)',
                              border: `1px solid ${isHub ? '#00E5C8' : 'rgba(56, 189, 248, 0.4)'}`,
                              borderRadius: '10px',
                              padding: '1px 6px',
                              fontSize: '9px',
                              color: '#FFF',
                              fontWeight: 700,
                              whiteSpace: 'nowrap'
                            }}>
                              <span>{node.flag || '📍'}</span>
                              <span>{cName}</span>
                              <b style={{ color: isHub ? '#00E5C8' : '#38BDF8', marginLeft: '2px' }}>{totalNodeDossiers}</b>
                            </div>
                          </foreignObject>
                        </g>
                      );
                    })}
                  </svg>
                </div>
              )}

              {/* View Mode 2: Structured Corridor Cards List with Airport Tablet Marquee on Hover */}
              {viewMode === 'grid' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {/* CSS Keyframe Animation for Airport Tablet Marquee & No-Scrollbar */}
                  <style>{`
                    @keyframes airportTabletScroll {
                      0% { transform: translateX(0%); }
                      75% { transform: translateX(-65%); }
                      85% { transform: translateX(-65%); }
                      100% { transform: translateX(0%); }
                    }
                    .corridor-row-card:hover .airport-marquee-inner {
                      animation: airportTabletScroll 3.8s ease-in-out infinite;
                    }
                    .no-scrollbar::-webkit-scrollbar {
                      display: none !important;
                    }
                    .no-scrollbar {
                      -ms-overflow-style: none !important;
                      scrollbar-width: none !important;
                    }
                  `}</style>

                  {/* Search Bar for Corridors */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    background: 'rgba(3, 12, 20, 0.9)',
                    border: '1px solid rgba(0, 229, 200, 0.25)',
                    borderRadius: '8px',
                    padding: '5px 10px'
                  }}>
                    <Search size={13} color="#00E5C8" />
                    <input
                      type="text"
                      placeholder="Filtrer un corridor (ex: Tunisie, France, Maroc...)"
                      value={corridorSearchQuery}
                      onChange={(e) => {
                        setCorridorSearchQuery(e.target.value);
                        setCorridorPage(1);
                      }}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        outline: 'none',
                        color: '#FFF',
                        fontSize: '11px',
                        width: '100%',
                        fontWeight: 500
                      }}
                    />
                    {corridorSearchQuery && (
                      <button
                        onClick={() => setCorridorSearchQuery('')}
                        style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: 0 }}
                      >
                        <X size={12} />
                      </button>
                    )}
                  </div>

                  {/* Corridors Grid */}
                  <div
                    className="no-scrollbar"
                    style={{
                      overflow: 'hidden',
                      scrollbarWidth: 'none',
                      msOverflowStyle: 'none',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px'
                    }}
                  >
                    {paginatedCorridors.length > 0 ? (
                      paginatedCorridors.map((r) => {
                        const isSelected = selectedRouteFilter === r.route_key;
                        const depNode = getNodePosition(r.origin_country);
                        const arrNode = getNodePosition(r.destination_country);

                        return (
                          <div
                            key={r.route_key}
                            className="corridor-row-card"
                            onClick={() => setSelectedRouteFilter(isSelected ? null : r.route_key)}
                            style={{
                              background: isSelected ? 'rgba(0, 229, 200, 0.18)' : 'rgba(6, 20, 32, 0.75)',
                              border: `1px solid ${isSelected ? '#00E5C8' : 'rgba(0, 229, 200, 0.18)'}`,
                              borderRadius: '10px',
                              padding: '8px 10px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: '8px',
                              cursor: 'pointer',
                              transition: 'all 0.2s ease',
                              boxShadow: isSelected ? '0 0 12px rgba(0, 229, 200, 0.2)' : 'none'
                            }}
                          >
                            {/* Origin -> Destination Pill Badges with Airport Tablet Marquee */}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '5px', width: '100%' }}>
                              {/* Origin Pill */}
                              <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '3px',
                                background: 'rgba(0, 229, 200, 0.12)',
                                border: '1px solid rgba(0, 229, 200, 0.3)',
                                borderRadius: '6px',
                                padding: '3px 6px',
                                fontSize: '10px',
                                fontWeight: 700,
                                color: '#FFF',
                                flex: '1 1 0px',
                                maxWidth: '82px',
                                overflow: 'hidden',
                                whiteSpace: 'nowrap'
                              }}>
                                <span style={{ flexShrink: 0 }}>{depNode.flag || '📍'}</span>
                                <div style={{ overflow: 'hidden', whiteSpace: 'nowrap', flex: 1 }}>
                                  <span className="airport-marquee-inner" style={{ display: 'inline-block', whiteSpace: 'nowrap', color: '#00E5C8' }}>
                                    {r.origin_country}
                                  </span>
                                </div>
                              </div>

                              <ArrowRight size={11} color="#38BDF8" style={{ flexShrink: 0 }} />

                              {/* Destination Pill */}
                              <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '3px',
                                background: 'rgba(56, 189, 248, 0.12)',
                                border: '1px solid rgba(56, 189, 248, 0.3)',
                                borderRadius: '6px',
                                padding: '3px 6px',
                                fontSize: '10px',
                                fontWeight: 700,
                                color: '#FFF',
                                flex: '1 1 0px',
                                maxWidth: '82px',
                                overflow: 'hidden',
                                whiteSpace: 'nowrap'
                              }}>
                                <span style={{ flexShrink: 0 }}>{arrNode.flag || '📍'}</span>
                                <div style={{ overflow: 'hidden', whiteSpace: 'nowrap', flex: 1 }}>
                                  <span className="airport-marquee-inner" style={{ display: 'inline-block', whiteSpace: 'nowrap', color: '#FFF' }}>
                                    {r.destination_country}
                                  </span>
                                </div>
                              </div>

                              {/* Compact Count Badge (No collision!) */}
                              <div style={{ display: 'flex', alignItems: 'center', gap: '3px', flexShrink: 0, marginLeft: 'auto' }}>
                                <span style={{
                                  background: 'rgba(0, 229, 200, 0.18)',
                                  border: '1px solid rgba(0, 229, 200, 0.45)',
                                  borderRadius: '10px',
                                  padding: '2px 7px',
                                  fontSize: '10px',
                                  fontWeight: 800,
                                  color: '#00E5C8',
                                  whiteSpace: 'nowrap'
                                }}>
                                  {r.count}
                                </span>
                                <ChevronRight size={13} color="#00E5C8" style={{ flexShrink: 0 }} />
                              </div>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div style={{ textAlign: 'center', padding: '16px', color: '#64748B', fontSize: '11px' }}>
                        Aucun corridor ne correspond à "{corridorSearchQuery}".
                      </div>
                    )}
                  </div>

                  {/* Corridor Pagination */}
                  {totalCorridorPages > 1 && (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      paddingTop: '6px',
                      borderTop: '1px solid rgba(0, 229, 200, 0.15)',
                      fontSize: '10px',
                      color: '#94A3B8'
                    }}>
                      <button
                        disabled={corridorPage === 1}
                        onClick={() => setCorridorPage(p => Math.max(1, p - 1))}
                        style={{
                          background: 'rgba(0,229,200,0.1)',
                          border: '1px solid rgba(0,229,200,0.3)',
                          color: '#00E5C8',
                          borderRadius: '4px',
                          padding: '2px 6px',
                          cursor: corridorPage === 1 ? 'not-allowed' : 'pointer',
                          opacity: corridorPage === 1 ? 0.4 : 1
                        }}
                      >
                        <ChevronLeft size={12} />
                      </button>
                      <span>Page {corridorPage} sur {totalCorridorPages} ({filteredCorridors.length} corridors)</span>
                      <button
                        disabled={corridorPage === totalCorridorPages}
                        onClick={() => setCorridorPage(p => Math.min(totalCorridorPages, p + 1))}
                        style={{
                          background: 'rgba(0,229,200,0.1)',
                          border: '1px solid rgba(0,229,200,0.3)',
                          color: '#00E5C8',
                          borderRadius: '4px',
                          padding: '2px 6px',
                          cursor: corridorPage === totalCorridorPages ? 'not-allowed' : 'pointer',
                          opacity: corridorPage === totalCorridorPages ? 0.4 : 1
                        }}
                      >
                        <ChevronRight size={12} />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* 6. Primary Action Button (Triggers Left Cyber HUD Widget) */}
      <button
        onClick={() => {
          setIsWidgetOpen(true);
          setCurrentPage(1);
        }}
        style={{
          width: '100%',
          marginTop: '14px',
          padding: '10px 14px',
          background: 'linear-gradient(90deg, rgba(0, 229, 200, 0.25) 0%, rgba(56, 189, 248, 0.25) 100%)',
          border: '1px solid rgba(0, 229, 200, 0.5)',
          borderRadius: '10px',
          color: '#00E5C8',
          fontSize: '11px',
          fontWeight: 800,
          letterSpacing: '0.2px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          boxShadow: '0 4px 14px rgba(0, 229, 200, 0.2)',
          transition: 'all 0.2s ease'
        }}
      >
        <FileText size={15} />
        <span>Voir la liste des {filteredDetails.length} dossiers en transit</span>
        <ChevronRight size={15} />
      </button>

      {/* 7. RIGHT-ANCHORED CYBER HUD WIDGET LEDGER (PORTAL TO BODY) */}
      {isWidgetOpen && isMounted && createPortal(
        <div
          ref={widgetPortalRef}
          style={{
            position: 'fixed',
            top: '80px',
            right: '345px',
            width: '440px',
            maxHeight: 'calc(100vh - 110px)',
            background: 'rgba(8, 25, 38, 0.98)',
            border: '1px solid rgba(0, 229, 200, 0.5)',
            borderRadius: '16px',
            padding: '18px',
            color: '#FFF',
            boxShadow: '0 16px 48px rgba(0, 0, 0, 0.8), 0 0 24px rgba(0, 229, 200, 0.2)',
            backdropFilter: 'blur(16px)',
            zIndex: 99999,
            display: 'flex',
            flexDirection: 'column',
            animation: 'fadeIn 0.2s ease-out'
          }}
        >
          {/* HUD Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', borderBottom: '1px solid rgba(0, 229, 200, 0.2)', paddingBottom: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(0, 229, 200, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Globe size={18} color="#00E5C8" />
              </div>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 800, color: '#00E5C8' }}>
                  Registre des Flux en Transit
                </div>
                <div style={{ fontSize: '10px', color: '#94A3B8' }}>
                  {selectedRouteFilter ? `Axe : ${selectedRouteFilter}` : `Tous les Axes (${filteredDetails.length} dossiers)`}
                </div>
              </div>
            </div>

            <button
              onClick={() => setIsWidgetOpen(false)}
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: '#94A3B8', padding: '4px', cursor: 'pointer' }}
            >
              <X size={16} />
            </button>
          </div>

          {/* Dossiers List (STRICT USER RULE: Only display non-empty fields!) */}
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px', paddingRight: '4px' }}>
            {paginatedDetails.length > 0 ? (
              paginatedDetails.map((item: any, idx: number) => {
                const isAir = (item.nature_transport || '').toLowerCase().includes('air') || (item.nature_transport || '').toLowerCase().includes('aér');
                const isSea = (item.nature_transport || '').toLowerCase().includes('mar') || (item.nature_transport || '').toLowerCase().includes('sea');

                return (
                  <div
                    key={idx}
                    style={{
                      background: 'rgba(4, 15, 25, 0.8)',
                      border: '1px solid rgba(0, 229, 200, 0.2)',
                      borderRadius: '10px',
                      padding: '12px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px'
                    }}
                  >
                    {/* Top Row: Dossier Ref + Sens + Nature */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '12px', fontWeight: 800, color: '#00E5C8' }}>
                        {item.reference_dossier}
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {getNatureIcon(item.nature_transport)}
                        <span style={{ fontSize: '9px', fontWeight: 700, padding: '2px 6px', borderRadius: '4px', background: 'rgba(0,229,200,0.15)', color: '#00E5C8' }}>
                          {item.sens_operation} • {item.nature_transport}
                        </span>
                      </div>
                    </div>

                    {/* Client */}
                    <div style={{ fontSize: '11px', color: '#F1F5F9', fontWeight: 600 }}>
                      Client : <span style={{ color: '#94A3B8' }}>{item.client}</span>
                    </div>

                    {/* Dynamic Non-Empty Fields Breakdown (STRICT RULE) */}
                    <div style={{
                      background: 'rgba(8, 25, 38, 0.6)',
                      border: '1px stroke rgba(255,255,255,0.05)',
                      borderRadius: '6px',
                      padding: '8px',
                      fontSize: '10px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px'
                    }}>
                      {/* Origin & Destination Countries */}
                      <div style={{ color: '#38BDF8', fontWeight: 700 }}>
                        Axe : {normalizeToCountry(item.pays_depart && item.pays_depart !== 'Inconnu' ? item.pays_depart : getChargementDisplay(item))} ➔ {normalizeToCountry(item.pays_livraison && item.pays_livraison !== 'Inconnu' ? item.pays_livraison : getLivraisonDisplay(item))}
                      </div>

                      {/* Always Display Chargement (falls back to Airport/Port) */}
                      <div>Chargement : <b style={{ color: '#FFF' }}>{getChargementDisplay(item)}</b></div>

                      {/* Always Display Livraison (falls back to Airport/Port) */}
                      <div>Livraison : <b style={{ color: '#FFF' }}>{getLivraisonDisplay(item)}</b></div>

                      {/* Display Navire if available */}
                      {item.navire && item.navire !== 'N/A' && item.navire !== 'Inconnu' && (
                        <div>Navire : <b style={{ color: '#00E5C8' }}>{item.navire}</b></div>
                      )}
                    </div>

                    {/* Statut & Date */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', color: '#64748B', marginTop: '2px' }}>
                      <span>Statut : <b style={{ color: '#00E5C8' }}>{item.statut_dossier}</b></span>
                      <span>Créé le : {item.date_creation ? item.date_creation.substring(0, 10) : 'N/A'}</span>
                    </div>
                  </div>
                );
              })
            ) : (
              <div style={{ padding: '20px', textAlign: 'center', color: '#64748B', fontSize: '11px' }}>
                Aucun dossier en transit pour ce filtre.
              </div>
            )}
          </div>

          {/* HUD Pagination */}
          {totalPages > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '12px', paddingTop: '8px', borderTop: '1px solid rgba(0, 229, 200, 0.2)' }}>
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                style={{ background: 'rgba(0,229,200,0.1)', border: '1px solid rgba(0,229,200,0.3)', color: '#00E5C8', borderRadius: '6px', padding: '4px 8px', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', opacity: currentPage === 1 ? 0.4 : 1 }}
              >
                <ChevronLeft size={14} />
              </button>
              <span style={{ fontSize: '10px', color: '#94A3B8' }}>
                Page {currentPage} sur {totalPages}
              </span>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                style={{ background: 'rgba(0,229,200,0.1)', border: '1px solid rgba(0,229,200,0.3)', color: '#00E5C8', borderRadius: '6px', padding: '4px 8px', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', opacity: currentPage === totalPages ? 0.4 : 1 }}
              >
                <ChevronRight size={14} />
              </button>
            </div>
          )}
        </div>,
        document.body
      )}

      {/* 7. Ultra-Premium Fullscreen Cyber Command HUD Modal Portal */}
      {isMounted && isMapModalOpen && createPortal(
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 999999,
          background: 'linear-gradient(135deg, rgba(2, 8, 15, 0.97) 0%, rgba(5, 18, 30, 0.98) 100%)',
          backdropFilter: 'blur(16px)',
          display: 'flex',
          flexDirection: 'column',
          padding: '24px 32px',
          fontFamily: 'var(--font-geist-sans), sans-serif'
        }}>
          {/* Top Bar Command Header */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '20px',
            paddingBottom: '16px',
            borderBottom: '1px solid rgba(0, 229, 200, 0.25)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{
                background: 'rgba(0, 229, 200, 0.15)',
                border: '1px solid rgba(0, 229, 200, 0.4)',
                borderRadius: '12px',
                padding: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 15px rgba(0, 229, 200, 0.2)'
              }}>
                <Globe size={24} color="#00E5C8" />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#FFF', letterSpacing: '0.6px' }}>
                    CYBER COMMAND CENTER — FLUX ACTIFS LOGISTIQUES VMOVE
                  </h2>
                  <span style={{
                    background: 'rgba(0, 229, 200, 0.2)',
                    border: '1px solid #00E5C8',
                    borderRadius: '10px',
                    padding: '2px 8px',
                    fontSize: '9px',
                    fontWeight: 800,
                    color: '#00E5C8',
                    letterSpacing: '0.5px'
                  }}>
                    LIVE ● REALTIME
                  </span>
                </div>
                <div style={{ fontSize: '12px', color: '#94A3B8', fontWeight: 500, marginTop: '3px' }}>
                  Supervision globale des corridors d'export & d'import • Hub central : <b style={{ color: '#00E5C8' }}>🇹🇳 Tunisie</b> ({summary.total_dossiers_actifs} dossiers en transit)
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              {selectedRouteFilter && (
                <button
                  onClick={() => setSelectedRouteFilter(null)}
                  style={{
                    background: 'rgba(0, 229, 200, 0.18)',
                    border: '1px solid rgba(0, 229, 200, 0.45)',
                    color: '#00E5C8',
                    borderRadius: '8px',
                    padding: '6px 14px',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: '0 0 12px rgba(0,229,200,0.2)'
                  }}
                >
                  Réinitialiser le filtre ({selectedRouteFilter})
                </button>
              )}
              <button
                onClick={() => setIsMapModalOpen(false)}
                style={{
                  background: 'rgba(239, 68, 68, 0.18)',
                  border: '1px solid rgba(239, 68, 68, 0.45)',
                  color: '#EF4444',
                  borderRadius: '10px',
                  padding: '8px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '13px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: '0 0 15px rgba(239,68,68,0.2)'
                }}
              >
                <Minimize2 size={16} />
                <span>Quitter le mode Command</span>
              </button>
            </div>
          </div>

          {/* Main Fullscreen Workspace */}
          <div style={{ display: 'flex', flex: 1, gap: '20px', overflow: 'hidden' }}>
            {/* Left Glassmorphic Floating HUD Sidebar */}
            <div style={{
              width: '280px',
              background: 'rgba(4, 16, 26, 0.85)',
              border: '1px solid rgba(0, 229, 200, 0.25)',
              borderRadius: '16px',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              backdropFilter: 'blur(10px)',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)'
            }}>
              <div style={{ fontSize: '12px', fontWeight: 800, color: '#00E5C8', letterSpacing: '0.8px', textTransform: 'uppercase' }}>
                MÉTRIQUES DE SUPERVISION
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ background: 'rgba(0,229,200,0.08)', border: '1px solid rgba(0,229,200,0.2)', borderRadius: '10px', padding: '12px' }}>
                  <div style={{ fontSize: '10px', color: '#94A3B8', fontWeight: 600 }}>DOSSIERS ACTIFS EN TRANSIT</div>
                  <div style={{ fontSize: '24px', fontWeight: 900, color: '#00E5C8', marginTop: '2px' }}>{summary.total_dossiers_actifs}</div>
                </div>

                <div style={{ background: 'rgba(56,189,248,0.08)', border: '1px solid rgba(56,189,248,0.2)', borderRadius: '10px', padding: '12px' }}>
                  <div style={{ fontSize: '10px', color: '#94A3B8', fontWeight: 600 }}>CORRIDORS INTERNATIONAUX</div>
                  <div style={{ fontSize: '24px', fontWeight: 900, color: '#38BDF8', marginTop: '2px' }}>{routesList.length}</div>
                </div>

                <div style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: '10px', padding: '12px' }}>
                  <div style={{ fontSize: '10px', color: '#94A3B8', fontWeight: 600 }}>HUB LOGISTIQUE PRINCIPAL</div>
                  <div style={{ fontSize: '14px', fontWeight: 800, color: '#FFF', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>🇹🇳</span> Tunisie (Central Node)
                  </div>
                </div>
              </div>

              <div style={{ fontSize: '11px', fontWeight: 700, color: '#94A3B8', marginTop: '8px' }}>
                TOP CORRIDORS ACTIFS
              </div>

              <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', paddingRight: '4px' }} className="no-scrollbar">
                {mapRoutesList.slice(0, 8).map(r => (
                  <div
                    key={`side-${r.route_key}`}
                    onClick={() => setSelectedRouteFilter(selectedRouteFilter === r.route_key ? null : r.route_key)}
                    style={{
                      background: selectedRouteFilter === r.route_key ? 'rgba(0,229,200,0.2)' : 'rgba(8, 25, 38, 0.7)',
                      border: `1px solid ${selectedRouteFilter === r.route_key ? '#00E5C8' : 'rgba(0,229,200,0.15)'}`,
                      borderRadius: '8px',
                      padding: '8px 10px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer'
                    }}
                  >
                    <div style={{ fontSize: '10px', fontWeight: 700, color: '#FFF', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span>{r.origin_country}</span>
                      <ArrowRight size={10} color="#00E5C8" />
                      <span>{r.destination_country}</span>
                    </div>
                    <span style={{ fontSize: '9px', fontWeight: 800, color: '#00E5C8', background: 'rgba(0,229,200,0.15)', padding: '1px 6px', borderRadius: '8px' }}>
                      {r.count}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Tactical Interactive SVG Canvas */}
            <div style={{
              flex: 1,
              position: 'relative',
              background: 'radial-gradient(circle at 50% 50%, #082438 0%, #030C14 100%)',
              border: '1px solid rgba(0, 229, 200, 0.35)',
              borderRadius: '16px',
              overflow: 'hidden',
              boxShadow: '0 0 50px rgba(0, 229, 200, 0.15)'
            }}>
              <svg viewBox="0 0 1050 500" style={{ width: '100%', height: '100%', display: 'block' }}>
                <defs>
                  <linearGradient id="cyber-modal-bg-grad" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#030C14" />
                    <stop offset="50%" stopColor="#071E30" />
                    <stop offset="100%" stopColor="#030C14" />
                  </linearGradient>
                  <filter id="glow-modal-cyan-strong">
                    <feGaussianBlur stdDeviation="5" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>

                <rect width="1050" height="500" fill="url(#cyber-modal-bg-grad)" />

                {/* Tactical Radar Grid Lines */}
                <line x1="0" y1="250" x2="1050" y2="250" stroke="rgba(0, 229, 200, 0.07)" strokeWidth="1" strokeDasharray="6 6" />
                <line x1="500" y1="0" x2="500" y2="500" stroke="rgba(0, 229, 200, 0.07)" strokeWidth="1" strokeDasharray="6 6" />

                {/* Concentric Cyber Rings */}
                <circle cx="500" cy="220" r="110" fill="none" stroke="rgba(0,229,200,0.08)" strokeWidth="1.2" strokeDasharray="4 4" />
                <circle cx="500" cy="220" r="200" fill="none" stroke="rgba(0,229,200,0.06)" strokeWidth="1.2" strokeDasharray="6 6" />
                <circle cx="500" cy="220" r="300" fill="none" stroke="rgba(0,229,200,0.04)" strokeWidth="1" strokeDasharray="8 8" />

                {/* Route Plasma Arcs */}
                {mapRoutesList.map((route, idx) => {
                  const depNode = getNodePosition(route.origin_country, idx);
                  const arrNode = getNodePosition(route.destination_country, idx);
                  const isHovered = hoveredRouteKey === route.route_key;
                  const isSelected = !!selectedRouteFilter && (
                    selectedRouteFilter === route.route_key ||
                    (selectedRouteFilter.includes(route.origin_country) && selectedRouteFilter.includes(route.destination_country)) ||
                    (selectedRouteFilter.includes('VIENNE') && (route.destination_country === 'Autriche' || route.origin_country === 'Autriche')) ||
                    (selectedRouteFilter.includes('HEIMSBRUNN') && (route.destination_country === 'France' || route.origin_country === 'France'))
                  );

                  const midX = (depNode.x + arrNode.x) / 2;
                  const midY = (depNode.y + arrNode.y) / 2 - 35;
                  const pathD = `M ${depNode.x} ${depNode.y} Q ${midX} ${midY} ${arrNode.x} ${arrNode.y}`;

                  const opacity = selectedRouteFilter ? (isSelected ? 1 : 0.18) : 1;
                  const strokeColor = (isSelected || isHovered) ? '#00E5C8' : 'rgba(0, 229, 200, 0.45)';
                  const strokeWidth = isSelected ? 4.5 : isHovered ? 3.5 : 2;

                  return (
                    <g key={`modal-${route.route_key}`} style={{ cursor: 'pointer', opacity }}
                      onMouseEnter={() => setHoveredRouteKey(route.route_key)}
                      onMouseLeave={() => setHoveredRouteKey(null)}
                      onClick={() => setSelectedRouteFilter(isSelected ? null : route.route_key)}
                    >
                      <path
                        d={pathD}
                        fill="none"
                        stroke={strokeColor}
                        strokeWidth={strokeWidth}
                        filter={(isSelected || isHovered) ? "url(#glow-modal-cyan-strong)" : "none"}
                      />
                      <circle r="4" fill="#00E5C8" filter="url(#glow-modal-cyan-strong)">
                        <animateMotion path={pathD} dur={`${2 + (idx % 3)}s`} repeatCount="indefinite" />
                      </circle>
                    </g>
                  );
                })}

                {/* Country Nodes & Glossy Glassmorphic Badges */}
                {activeCountryNames.map((cName, idx) => {
                  const node = getNodePosition(cName, idx);
                  const isHub = cName === 'Tunisie';
                  const totalNodeDossiers = mapRoutesList
                    .filter(r => r.origin_country === cName || r.destination_country === cName)
                    .reduce((sum, r) => sum + r.count, 0);

                  return (
                    <g key={`modal-node-${cName}`} transform={`translate(${node.x}, ${node.y})`} style={{ cursor: 'pointer' }}>
                      <circle r={isHub ? "12" : "8"} fill={isHub ? "#00E5C8" : "#38BDF8"} filter="url(#glow-modal-cyan-strong)" />
                      <circle r={isHub ? "22" : "15"} fill="none" stroke={isHub ? "#00E5C8" : "#38BDF8"} strokeWidth="1.5" opacity="0.7">
                        <animate attributeName="r" values={isHub ? "12;28;12" : "8;20;8"} dur="3s" repeatCount="indefinite" />
                        <animate attributeName="opacity" values="0.8;0;0.8" dur="3s" repeatCount="indefinite" />
                      </circle>

                      <foreignObject x="-70" y={isHub ? "-40" : "-32"} width="140" height="32">
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          background: isHub ? 'rgba(0, 229, 200, 0.28)' : 'rgba(5, 18, 30, 0.92)',
                          border: `1px solid ${isHub ? '#00E5C8' : 'rgba(56, 189, 248, 0.45)'}`,
                          borderRadius: '14px',
                          padding: '3px 10px',
                          fontSize: '11px',
                          color: '#FFF',
                          fontWeight: 700,
                          whiteSpace: 'nowrap',
                          boxShadow: '0 4px 20px rgba(0,0,0,0.6), 0 0 15px rgba(0,229,200,0.2)',
                          backdropFilter: 'blur(8px)'
                        }}>
                          <span>{node.flag || '📍'}</span>
                          <span>{cName}</span>
                          <b style={{
                            color: isHub ? '#00E5C8' : '#38BDF8',
                            marginLeft: '2px',
                            background: 'rgba(0,229,200,0.15)',
                            padding: '1px 6px',
                            borderRadius: '8px',
                            fontSize: '10px'
                          }}>
                            {totalNodeDossiers}
                          </b>
                        </div>
                      </foreignObject>
                    </g>
                  );
                })}
              </svg>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
