'use client';

import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Building, 
  Briefcase, 
  Calendar, 
  ChevronLeft, 
  ChevronRight, 
  Users, 
  Download, 
  RefreshCw, 
  Sparkles, 
  Target, 
  Copy, 
  Check, 
  ArrowUpRight,
  MapPin,
  X
} from 'lucide-react';
import { useToast } from '@/shared/contexts/ToastContext';

interface Lead {
  id: number;
  nom: string;
  prenom: string;
  email: string;
  poste?: string;
  entreprise?: string;
  secteur?: string;
  pays?: string;
  source: string;
  date_collecte: string;
  statut?: string;
  score?: number;
  est_qualifie?: boolean;
  department?: string;
  seniority?: string;
  decision_maker?: boolean;
}

interface LeadsViewProps {
  leads: Lead[];
  onOpenLead: (lead: Lead) => void;
  onRefresh: () => void;
}

export default function LeadsView({ leads, onOpenLead, onRefresh }: LeadsViewProps) {
  const { showToast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [decisionMakerOnly, setDecisionMakerOnly] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const itemsPerPage = 20;

  // KPI Calculations
  const stats = useMemo(() => {
    const total = leads.length;
    const decisionMakers = leads.filter(l => 
      l.decision_maker === true || 
      /ceo|cto|cfo|coo|cmo|cro|founder|fondateur|director|directeur|vp|president|head|leader/i.test(l.poste || '')
    ).length;
    
    const uniqueCompanies = new Set(leads.map(l => (l.entreprise || '').trim().toLowerCase()).filter(Boolean)).size;

    return { total, decisionMakers, uniqueCompanies };
  }, [leads]);

  const filteredLeads = useMemo(() => {
    return leads.filter(lead => {
      const q = searchTerm.toLowerCase();
      const matchSearch = 
        (lead.nom || '').toLowerCase().includes(q) ||
        (lead.prenom || '').toLowerCase().includes(q) ||
        (lead.email || '').toLowerCase().includes(q) ||
        (lead.entreprise || '').toLowerCase().includes(q) ||
        (lead.poste || '').toLowerCase().includes(q) ||
        (lead.secteur || '').toLowerCase().includes(q) ||
        (lead.pays || '').toLowerCase().includes(q);

      const isDecMaker = lead.decision_maker === true || /ceo|cto|cfo|coo|cmo|founder|fondateur|director|vp|president|head/i.test(lead.poste || '');
      if (decisionMakerOnly && !isDecMaker) return false;

      return matchSearch;
    }).sort((a, b) => new Date(b.date_collecte).getTime() - new Date(a.date_collecte).getTime());
  }, [leads, searchTerm, decisionMakerOnly]);

  const totalPages = Math.max(1, Math.ceil(filteredLeads.length / itemsPerPage));
  const paginatedLeads = filteredLeads.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleCopyEmail = (e: React.MouseEvent, lead: Lead) => {
    e.stopPropagation();
    navigator.clipboard.writeText(lead.email);
    setCopiedId(lead.id);
    showToast(`Email de ${lead.prenom} ${lead.nom} copié !`, 'info');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleRefreshClick = () => {
    setIsRefreshing(true);
    onRefresh();
    setTimeout(() => setIsRefreshing(false), 600);
  };

  const exportCsv = () => {
    const headers = ['Nom', 'Prénom', 'Email', 'Poste', 'Entreprise', 'Secteur', 'Pays', 'Source', 'Date de collecte', 'Décideur'];
    const rows = filteredLeads.map(l => [
      `"${(l.nom || '').replace(/"/g, '""')}"`,
      `"${(l.prenom || '').replace(/"/g, '""')}"`,
      `"${(l.email || '').replace(/"/g, '""')}"`,
      `"${(l.poste || '').replace(/"/g, '""')}"`,
      `"${(l.entreprise || '').replace(/"/g, '""')}"`,
      `"${(l.secteur || '').replace(/"/g, '""')}"`,
      `"${(l.pays || '').replace(/"/g, '""')}"`,
      `"${(l.source || 'Sourcing').replace(/"/g, '""')}"`,
      `"${new Date(l.date_collecte).toLocaleDateString('fr-FR')}"`,
      `"${l.decision_maker ? 'Oui' : 'Non'}"`
    ]);

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `sourcing_candidats_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Export CSV téléchargé avec succès', 'success');
  };

  return (
    <div className="tab-pane active" style={{ animation: 'fadeIn 0.3s ease-out', color: '#F0F4F8' }}>
      
      {/* 1. TOP HEADER & ACTIONS */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'flex-start', 
        marginBottom: '24px',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 700, margin: 0, color: '#F0F4F8', letterSpacing: '-0.02em' }}>
              Base de Candidats & Leads
            </h2>
            <span style={{
              background: 'rgba(0, 229, 200, 0.12)',
              border: '1px solid rgba(0, 229, 200, 0.3)',
              color: '#00E5C8',
              fontSize: '0.75rem',
              fontWeight: 600,
              padding: '2px 8px',
              borderRadius: '12px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px'
            }}>
              <Sparkles size={11} /> Sourcing Intelligence
            </span>
          </div>
          <p style={{ margin: 0, fontSize: '0.85rem', color: '#94A3B8' }}>
            Profils qualifiés extraits par l'IA et disponibles pour vos campagnes de prospection.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button 
            onClick={handleRefreshClick}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: '8px',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: '#F0F4F8',
              fontSize: '0.85rem',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'}
          >
            <RefreshCw size={14} className={isRefreshing ? 'spin-anim' : ''} />
            Actualiser
          </button>

          <button 
            onClick={exportCsv}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, rgba(0, 229, 200, 0.15), rgba(0, 229, 200, 0.05))',
              border: '1px solid rgba(0, 229, 200, 0.3)',
              color: '#00E5C8',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: '0 2px 10px rgba(0, 229, 200, 0.1)'
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'rgba(0, 229, 200, 0.25)';
              e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'linear-gradient(135deg, rgba(0, 229, 200, 0.15), rgba(0, 229, 200, 0.05))';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            <Download size={14} />
            Exporter CSV
          </button>
        </div>
      </div>

      {/* 2. SOURCING KPI TELEMETRY CARDS */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
        gap: '14px',
        marginBottom: '24px'
      }}>
        {/* Total Leads */}
        <div style={{
          position: 'relative',
          background: 'linear-gradient(145deg, rgba(8, 20, 38, 0.85) 0%, rgba(12, 28, 52, 0.6) 100%)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '14px',
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          overflow: 'hidden'
        }}>
          <div style={{
            position: 'absolute',
            top: 0,
            left: '15%',
            right: '15%',
            height: '1px',
            background: 'linear-gradient(90deg, transparent, #00E5C8, transparent)',
            opacity: 0.4
          }} />
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '10px',
            background: 'rgba(0, 229, 200, 0.1)',
            border: '1px solid rgba(0, 229, 200, 0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#00E5C8'
          }}>
            <Users size={20} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
              Candidats Sourcés
            </div>
            <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#F0F4F8', lineHeight: 1.2 }}>
              {stats.total}
            </div>
          </div>
        </div>

        {/* Decision Makers */}
        <div style={{
          position: 'relative',
          background: 'linear-gradient(145deg, rgba(8, 20, 38, 0.85) 0%, rgba(12, 28, 52, 0.6) 100%)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '14px',
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          overflow: 'hidden'
        }}>
          <div style={{
            position: 'absolute',
            top: 0,
            left: '15%',
            right: '15%',
            height: '1px',
            background: 'linear-gradient(90deg, transparent, #00E5A0, transparent)',
            opacity: 0.4
          }} />
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '10px',
            background: 'rgba(0, 229, 160, 0.1)',
            border: '1px solid rgba(0, 229, 160, 0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#00E5A0'
          }}>
            <Target size={20} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
              Décideurs Détectés
            </div>
            <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#00E5A0', lineHeight: 1.2 }}>
              {stats.decisionMakers}
            </div>
          </div>
        </div>

        {/* Unique Companies */}
        <div style={{
          position: 'relative',
          background: 'linear-gradient(145deg, rgba(8, 20, 38, 0.85) 0%, rgba(12, 28, 52, 0.6) 100%)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '14px',
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          overflow: 'hidden'
        }}>
          <div style={{
            position: 'absolute',
            top: 0,
            left: '15%',
            right: '15%',
            height: '1px',
            background: 'linear-gradient(90deg, transparent, #38BDF8, transparent)',
            opacity: 0.4
          }} />
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '10px',
            background: 'rgba(56, 189, 248, 0.1)',
            border: '1px solid rgba(56, 189, 248, 0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#38BDF8'
          }}>
            <Building size={20} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
              Entreprises Cibles
            </div>
            <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#F0F4F8', lineHeight: 1.2 }}>
              {stats.uniqueCompanies}
            </div>
          </div>
        </div>
      </div>

      {/* 3. CLEAN SEARCH & TOGGLE BAR */}
      <div style={{
        background: 'linear-gradient(145deg, rgba(8, 20, 38, 0.85) 0%, rgba(12, 28, 52, 0.6) 100%)',
        backdropFilter: 'blur(16px)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '14px',
        padding: '14px 18px',
        marginBottom: '20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '14px'
      }}>
        {/* Search Input */}
        <div style={{ flex: '1 1 320px', position: 'relative' }}>
          <Search size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
          <input 
            type="text" 
            placeholder="Rechercher un candidat, entreprise, poste, secteur, email..." 
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            style={{
              width: '100%',
              padding: '10px 14px 10px 40px',
              borderRadius: '8px',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              backgroundColor: 'rgba(6, 17, 31, 0.7)',
              color: '#F0F4F8',
              fontSize: '0.88rem',
              outline: 'none',
              transition: 'border-color 0.2s',
              caretColor: 'var(--cyan)'
            }}
            onFocus={(e) => e.target.style.borderColor = '#00E5C8'}
            onBlur={(e) => e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)'}
          />
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Decision Maker Toggle Button */}
          <button
            onClick={() => {
              setDecisionMakerOnly(!decisionMakerOnly);
              setCurrentPage(1);
            }}
            style={{
              padding: '9px 15px',
              borderRadius: '8px',
              border: decisionMakerOnly ? '1px solid #00E5A0' : '1px solid rgba(255, 255, 255, 0.1)',
              background: decisionMakerOnly ? 'rgba(0, 229, 160, 0.15)' : 'rgba(6, 17, 31, 0.7)',
              color: decisionMakerOnly ? '#00E5A0' : '#94A3B8',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.2s',
              boxShadow: decisionMakerOnly ? '0 0 12px rgba(0, 229, 160, 0.2)' : 'none'
            }}
          >
            <Target size={14} />
            Décideurs uniquement
          </button>

          {/* Reset Filters */}
          {(searchTerm || decisionMakerOnly) && (
            <button
              onClick={() => {
                setSearchTerm('');
                setDecisionMakerOnly(false);
                setCurrentPage(1);
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '9px 12px',
                borderRadius: '8px',
                background: 'rgba(255, 71, 87, 0.1)',
                border: '1px solid rgba(255, 71, 87, 0.25)',
                color: '#FF4757',
                fontSize: '0.82rem',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              <X size={13} />
              Effacer
            </button>
          )}
        </div>
      </div>

      {/* 4. SOURCING CANDIDATES TABLE */}
      <div style={{
        background: 'linear-gradient(145deg, rgba(8, 20, 38, 0.85) 0%, rgba(12, 28, 52, 0.6) 100%)',
        backdropFilter: 'blur(16px)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '16px',
        overflow: 'hidden',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.35)'
      }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ 
                borderBottom: '1px solid rgba(255, 255, 255, 0.08)', 
                backgroundColor: 'rgba(6, 17, 31, 0.6)' 
              }}>
                <th style={{ padding: '16px 20px', fontSize: '0.78rem', fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Candidat & Contact</th>
                <th style={{ padding: '16px 20px', fontSize: '0.78rem', fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Poste & Responsabilité</th>
                <th style={{ padding: '16px 20px', fontSize: '0.78rem', fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Entreprise & Secteur</th>
                <th style={{ padding: '16px 20px', fontSize: '0.78rem', fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Source</th>
                <th style={{ padding: '16px 20px', fontSize: '0.78rem', fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Date de collecte</th>
                <th style={{ padding: '16px 20px', fontSize: '0.78rem', fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>Dossier</th>
              </tr>
            </thead>
            <tbody>
              {paginatedLeads.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '60px 20px', color: '#64748B' }}>
                    <div style={{ 
                      width: '56px', 
                      height: '56px', 
                      borderRadius: '50%', 
                      background: 'rgba(255, 255, 255, 0.03)', 
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto 16px',
                      color: '#94A3B8'
                    }}>
                      <Users size={28} />
                    </div>
                    <div style={{ fontSize: '1rem', fontWeight: 600, color: '#F0F4F8', marginBottom: '6px' }}>
                      Aucun candidat ne correspond à vos critères
                    </div>
                    <p style={{ fontSize: '0.85rem', color: '#64748B', maxWidth: '400px', margin: '0 auto' }}>
                      {leads.length === 0 
                        ? "Lancez une session de sourcing ou activez l'autopilot pour extraire vos premiers candidats." 
                        : "Essayez de modifier vos termes de recherche ou de réinitialiser les filtres."}
                    </p>
                  </td>
                </tr>
              ) : (
                paginatedLeads.map(lead => {
                  const initials = `${(lead.prenom || '')[0] || ''}${(lead.nom || '')[0] || ''}`.toUpperCase() || 'L';
                  const isDecMaker = lead.decision_maker === true || /ceo|cto|cfo|coo|cmo|founder|fondateur|director|vp|president|head/i.test(lead.poste || '');

                  return (
                    <tr 
                      key={lead.id} 
                      onClick={() => onOpenLead(lead)}
                      style={{ 
                        borderBottom: '1px solid rgba(255, 255, 255, 0.05)', 
                        cursor: 'pointer', 
                        transition: 'all 0.2s ease',
                        background: 'transparent'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'rgba(0, 229, 200, 0.03)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      {/* 1. CANDIDAT */}
                      <td style={{ padding: '16px 20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                          <div style={{ 
                            width: '40px', 
                            height: '40px', 
                            borderRadius: '10px', 
                            background: 'linear-gradient(135deg, rgba(0, 229, 200, 0.2), rgba(6, 17, 31, 0.8))',
                            border: '1px solid rgba(0, 229, 200, 0.3)',
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center', 
                            color: '#00E5C8', 
                            fontWeight: 700,
                            fontSize: '0.9rem',
                            flexShrink: 0
                          }}>
                            {initials}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, color: '#F0F4F8', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              {lead.prenom} {lead.nom}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '3px' }}>
                              <span style={{ fontSize: '0.8rem', color: '#94A3B8' }}>
                                {lead.email}
                              </span>
                              <button
                                onClick={(e) => handleCopyEmail(e, lead)}
                                title="Copier l'email"
                                style={{
                                  background: 'transparent',
                                  border: 'none',
                                  color: copiedId === lead.id ? '#00E5A0' : '#64748B',
                                  cursor: 'pointer',
                                  padding: 0,
                                  display: 'flex',
                                  alignItems: 'center'
                                }}
                              >
                                {copiedId === lead.id ? <Check size={12} /> : <Copy size={12} />}
                              </button>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* 2. POSTE & SENIORITY */}
                      <td style={{ padding: '16px 20px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <div style={{ color: '#F0F4F8', fontWeight: 500, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Briefcase size={13} style={{ color: '#00E5C8', flexShrink: 0 }} />
                            <span>{lead.poste || 'Poste non spécifié'}</span>
                          </div>
                          <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                            {isDecMaker && (
                              <span style={{
                                background: 'rgba(0, 229, 160, 0.12)',
                                border: '1px solid rgba(0, 229, 160, 0.3)',
                                color: '#00E5A0',
                                fontSize: '0.7rem',
                                fontWeight: 600,
                                padding: '1px 6px',
                                borderRadius: '6px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px'
                              }}>
                                <Target size={10} /> Décideur
                              </span>
                            )}
                            {lead.seniority && (
                              <span style={{
                                background: 'rgba(255, 255, 255, 0.05)',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                color: '#CBD5E1',
                                fontSize: '0.7rem',
                                padding: '1px 6px',
                                borderRadius: '6px'
                              }}>
                                {lead.seniority}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* 3. ENTREPRISE & SECTEUR */}
                      <td style={{ padding: '16px 20px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#F0F4F8', fontWeight: 600, fontSize: '0.9rem' }}>
                            <Building size={14} style={{ color: '#38BDF8', flexShrink: 0 }} />
                            {lead.entreprise || 'Entreprise non spécifiée'}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', color: '#94A3B8' }}>
                            {lead.secteur && (
                              <span style={{ 
                                background: 'rgba(255, 255, 255, 0.04)', 
                                padding: '1px 6px', 
                                borderRadius: '4px',
                                fontSize: '0.72rem' 
                              }}>
                                {lead.secteur}
                              </span>
                            )}
                            {lead.pays && (
                              <span style={{ color: '#64748B', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                                <MapPin size={10} /> {lead.pays}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* 4. SOURCE */}
                      <td style={{ padding: '16px 20px' }}>
                        <span style={{
                          background: 'rgba(0, 229, 200, 0.08)',
                          border: '1px solid rgba(0, 229, 200, 0.2)',
                          color: '#00E5C8',
                          fontSize: '0.72rem',
                          fontWeight: 600,
                          padding: '2px 8px',
                          borderRadius: '6px',
                          width: 'fit-content',
                          textTransform: 'capitalize',
                          display: 'inline-block'
                        }}>
                          {lead.source || 'Sourcing Engine'}
                        </span>
                      </td>

                      {/* 5. DATE DE COLLECTE */}
                      <td style={{ padding: '16px 20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.82rem', color: '#94A3B8' }}>
                          <Calendar size={13} style={{ color: '#64748B' }} />
                          {lead.date_collecte ? new Date(lead.date_collecte).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}
                        </div>
                      </td>

                      {/* 6. DOSSIER ACTION */}
                      <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                        <div style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          color: '#00E5C8',
                          fontSize: '0.82rem',
                          fontWeight: 600,
                          padding: '6px 10px',
                          borderRadius: '6px',
                          background: 'rgba(0, 229, 200, 0.06)',
                          border: '1px solid rgba(0, 229, 200, 0.15)',
                          transition: 'all 0.2s'
                        }}>
                          <span>Dossier</span>
                          <ArrowUpRight size={13} />
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* 5. PAGINATION BAR */}
        {filteredLeads.length > 0 && (
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '16px 20px',
            borderTop: '1px solid rgba(255, 255, 255, 0.06)',
            backgroundColor: 'rgba(6, 17, 31, 0.4)',
            fontSize: '0.85rem',
            color: '#94A3B8',
            flexWrap: 'wrap',
            gap: '12px'
          }}>
            <div>
              Affichage de <span style={{ color: '#F0F4F8', fontWeight: 600 }}>{(currentPage - 1) * itemsPerPage + 1}</span> à <span style={{ color: '#F0F4F8', fontWeight: 600 }}>{Math.min(currentPage * itemsPerPage, filteredLeads.length)}</span> sur <span style={{ color: '#F0F4F8', fontWeight: 600 }}>{filteredLeads.length}</span> candidats
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  background: currentPage === 1 ? 'transparent' : 'rgba(255, 255, 255, 0.04)',
                  color: currentPage === 1 ? '#475569' : '#F0F4F8',
                  cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '0.8rem'
                }}
              >
                <ChevronLeft size={14} /> Précédent
              </button>

              <span style={{ padding: '0 8px', color: '#94A3B8', fontSize: '0.8rem' }}>
                Page <strong style={{ color: '#F0F4F8' }}>{currentPage}</strong> / {totalPages}
              </span>

              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  background: currentPage === totalPages ? 'transparent' : 'rgba(255, 255, 255, 0.04)',
                  color: currentPage === totalPages ? '#475569' : '#F0F4F8',
                  cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '0.8rem'
                }}
              >
                Suivant <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
