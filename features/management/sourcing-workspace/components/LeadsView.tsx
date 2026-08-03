'use client';

import React, { useState, useMemo } from 'react';
import { Search, Mail, Building, Briefcase, Calendar, ChevronLeft, ChevronRight, Users } from 'lucide-react';

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
  statut: string;
  emails_count?: number;
  agent_emails_count?: number;
}

interface LeadsViewProps {
  leads: Lead[];
  onOpenLead: (lead: Lead) => void;
  onRefresh: () => void;
}

export default function LeadsView({ leads, onOpenLead, onRefresh }: LeadsViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 25;

  const filteredLeads = useMemo(() => {
    return leads.filter(lead => {
      const matchSearch = (lead.nom + ' ' + lead.prenom + ' ' + lead.email + ' ' + (lead.entreprise || '')).toLowerCase().includes(searchTerm.toLowerCase());
      return matchSearch;
    }).sort((a, b) => new Date(b.date_collecte).getTime() - new Date(a.date_collecte).getTime());
  }, [leads, searchTerm]);

  const totalPages = Math.ceil(filteredLeads.length / itemsPerPage);
  const paginatedLeads = filteredLeads.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const exportCsv = () => {
    const headers = ['Nom', 'Prénom', 'Email', 'Poste', 'Entreprise', 'Date de collecte'];
    const csvContent = "data:text/csv;charset=utf-8," 
      + headers.join(',') + '\n'
      + filteredLeads.map(l => `"${l.nom}","${l.prenom}","${l.email}","${l.poste || ''}","${l.entreprise || ''}","${new Date(l.date_collecte).toLocaleDateString()}"`).join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "candidats_sourcing.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="tab-pane active" style={{ animation: 'fadeIn 0.3s ease-out' }}>
      {/* Header & Controls */}
      <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h2 className="section-title">Base de Candidats</h2>
          <p className="section-desc">{filteredLeads.length} profils sourcés par l'IA</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn-secondary" onClick={onRefresh}>Actualiser</button>
          <button className="btn-secondary" onClick={exportCsv}>Exporter CSV</button>
        </div>
      </div>

      <div className="filters-bar" style={{ display: 'flex', gap: '15px', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'center', backgroundColor: 'var(--card-bg)', padding: '15px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
        <div className="search-box" style={{ flex: 1, minWidth: '250px', position: 'relative' }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          <input 
            type="text" 
            placeholder="Rechercher un candidat, entreprise, email..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ width: '100%', padding: '10px 10px 10px 38px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-color)', color: 'var(--text-color)' }}
          />
        </div>
      </div>

      {/* Leads Table */}
      <div className="table-container" style={{ backgroundColor: 'var(--card-bg)', borderRadius: '12px', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="leads-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', backgroundColor: 'rgba(255,255,255,0.02)' }}>
                <th style={{ padding: '16px', fontSize: '0.85rem', fontWeight: 600, color: '#94a3b8' }}>Candidat</th>
                <th style={{ padding: '16px', fontSize: '0.85rem', fontWeight: 600, color: '#94a3b8' }}>Contact</th>
                <th style={{ padding: '16px', fontSize: '0.85rem', fontWeight: 600, color: '#94a3b8' }}>Poste & Entreprise</th>
                <th style={{ padding: '16px', fontSize: '0.85rem', fontWeight: 600, color: '#94a3b8' }}>Date de collecte</th>
                <th style={{ padding: '16px', fontSize: '0.85rem', fontWeight: 600, color: '#94a3b8', textAlign: 'center' }}>Emails</th>
              </tr>
            </thead>
            <tbody>
              {paginatedLeads.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                    <Users size={32} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
                    <p>Aucun candidat trouvé</p>
                  </td>
                </tr>
              ) : (
                paginatedLeads.map(lead => (
                  <tr 
                    key={lead.id} 
                    onClick={() => onOpenLead(lead)}
                    style={{ borderBottom: '1px solid var(--border-color)', cursor: 'pointer', transition: 'background 0.2s' }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.03)'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <td style={{ padding: '16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: 'var(--accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0F172A', fontWeight: 'bold' }}>
                          {lead.prenom?.[0]}{lead.nom?.[0]}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, color: 'var(--text-color)' }}>{lead.prenom} {lead.nom}</div>
                          <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{lead.pays || 'Non spécifié'}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#cbd5e1', fontSize: '0.9rem' }}>
                        <Mail size={14} /> {lead.email}
                      </div>
                    </td>
                    <td style={{ padding: '16px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-color)', fontSize: '0.9rem' }}>
                          <Briefcase size={14} style={{ color: '#94a3b8' }}/> {lead.poste || 'Non spécifié'}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#94a3b8', fontSize: '0.85rem' }}>
                          <Building size={14} /> {lead.entreprise || 'Non spécifié'}
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '16px', color: '#94a3b8', fontSize: '0.9rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Calendar size={14} />
                        {new Date(lead.date_collecte).toLocaleDateString()}
                      </div>
                    </td>
                    <td style={{ padding: '16px', textAlign: 'center' }}>
                      <span className={`badge ${(lead.agent_emails_count ?? lead.emails_count ?? 0) > 0 ? 'badge-sent' : 'badge-new'}`}>
                        {(lead.agent_emails_count ?? lead.emails_count ?? 0) > 0 ? `📧 ${(lead.agent_emails_count ?? lead.emails_count)}` : '0'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', borderTop: '1px solid var(--border-color)' }}>
            <div style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
              Affichage {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, filteredLeads.length)} sur {filteredLeads.length}
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button 
                className="btn-secondary" 
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(p => p - 1)}
                style={{ padding: '6px 12px', display: 'flex', alignItems: 'center' }}
              >
                <ChevronLeft size={16} />
              </button>
              <button 
                className="btn-secondary" 
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(p => p + 1)}
                style={{ padding: '6px 12px', display: 'flex', alignItems: 'center' }}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
