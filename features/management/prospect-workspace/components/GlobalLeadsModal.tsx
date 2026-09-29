'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useProspectSocket } from '../hooks/useProspectSocket';
import { CyberIcon } from '@/shared/management/components/CyberIcon';
import { Database } from 'lucide-react';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://localhost:3001';

interface GlobalLead {
    id: number;
    nom: string;
    prenom: string;
    entreprise: string;
    email: string;
    poste: string;
    secteur: string;
    pays: string;
    source: string;
    has_access: boolean;
}

interface GlobalLeadsModalProps {
    isOpen: boolean;
    agentId: string | number;
    onClose: () => void;
    onSuccess: () => void;
}

export default function GlobalLeadsModal({ isOpen, agentId, onClose, onSuccess }: GlobalLeadsModalProps) {
    const [leads, setLeads] = useState<GlobalLead[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
    const [assigning, setAssigning] = useState(false);

    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const limit = 15;

    const [isMounted, setIsMounted] = useState(false);
    useEffect(() => setIsMounted(true), []);

    useEffect(() => {
        if (isOpen) {
            setSelectedIds(new Set());
            setSearch('');
            setPage(1);
            fetchGlobalLeads();
        }
    }, [isOpen, agentId]);

    useEffect(() => {
        if (isOpen) {
            fetchGlobalLeads();
        }
    }, [page, search]);

    const fetchGlobalLeads = async () => {
        setLoading(true);
        try {
            const queryParams = new URLSearchParams({
                page: page.toString(),
                limit: limit.toString(),
                search: search
            });
            const res = await fetch(`${API_BASE_URL}/api/agent-leads/global/${agentId}?${queryParams.toString()}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('vmind_session')}`
                }
            });
            const data = await res.json();
            setLeads(data.leads || []);
            setTotal(data.pagination?.total || 0);
            setTotalPages(data.pagination?.totalPages || 1);
        } catch (error) {
            console.error('Error fetching global leads:', error);
        } finally {
            setLoading(false);
        }
    };

    const debounceTimer = useRef<NodeJS.Timeout | null>(null);
    useProspectSocket((payload) => {
        if (['prospect_agent_leads', 'prospect_agent_lead_access'].includes(payload.table)) {
            if (debounceTimer.current) {
                clearTimeout(debounceTimer.current);
            }
            debounceTimer.current = setTimeout(() => {
                fetchGlobalLeads();
            }, 500);
        }
    });

    const handleAssign = async () => {
        if (selectedIds.size === 0) return;
        setAssigning(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/agent-leads/assign`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('vmind_session')}` },
                body: JSON.stringify({
                    agentId: agentId,
                    leadIds: Array.from(selectedIds)
                })
            });
            if (res.ok) {
                onSuccess();
                onClose();
            } else {
                const err = await res.json();
                alert('Erreur: ' + (err.details || err.error));
            }
        } catch (error) {
            console.error('Error assigning leads:', error);
        } finally {
            setAssigning(false);
        }
    };

    const toggleSelectAll = () => {
        const assignableLeads = leads.filter(l => !l.has_access);
        if (assignableLeads.length === 0) return;

        if (selectedIds.size === assignableLeads.length) {
            setSelectedIds(new Set());
        } else {
            const newIds = new Set(selectedIds);
            assignableLeads.forEach(l => newIds.add(l.id));
            setSelectedIds(newIds);
        }
    };

    const toggleSelect = (id: number) => {
        const newIds = new Set(selectedIds);
        if (newIds.has(id)) {
            newIds.delete(id);
        } else {
            newIds.add(id);
        }
        setSelectedIds(newIds);
    };

    if (!isOpen || !isMounted) return null;

    return createPortal(
        <div className="fade-in" style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(11, 15, 25, 0.75)', backdropFilter: 'blur(12px)',
            zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
            <div 
                className="global-leads-modal-card"
                style={{
                    background: 'linear-gradient(145deg, rgba(30, 41, 59, 0.9), rgba(15, 23, 42, 0.95))',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '24px',
                    padding: '2.5rem', width: '95vw', maxWidth: '1400px',
                    height: '92vh', display: 'flex', flexDirection: 'column', gap: '1.5rem',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.6), inset 0 1px 1px rgba(255, 255, 255, 0.05)'
                }}
            >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{
                            width: 44,
                            height: 44,
                            borderRadius: 12,
                            background: 'rgba(129, 140, 248, 0.12)',
                            border: '1px solid rgba(129, 140, 248, 0.3)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#818cf8',
                            flexShrink: 0
                        }}>
                            <Database size={22} />
                        </div>
                        <div>
                            <h2 style={{ fontSize: '1.75rem', fontWeight: 800, background: 'linear-gradient(135deg, #e0e7ff, #818cf8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', margin: 0 }}>
                                Base de Prospects Globale
                            </h2>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginTop: '0.25rem', fontWeight: 500, margin: 0 }}>
                                Sélectionnez les prospects existants de votre base pour les assigner à cet agent.
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', cursor: 'pointer', transition: 'all 0.2s ease' }} onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = 'white'; }} onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = 'var(--text-muted)'; }}>
                        <CyberIcon name="close" size={16} />
                    </button>
                </div>

                <div className="global-leads-filter-bar" style={{ display: 'flex', gap: '1rem', alignItems: 'center', background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ flex: 2, position: 'relative' }}>
                        <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', display: 'flex', alignItems: 'center' }}>
                            <CyberIcon name="search" size={15} color="var(--text-muted)" />
                        </span>
                        <input
                            type="text"
                            placeholder="Rechercher par nom, entreprise, email..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            style={{
                                width: '100%', padding: '0.8rem 1rem 0.8rem 2.5rem',
                                background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: '8px', color: 'white', fontSize: '0.95rem',
                                transition: 'all 0.3s ease', outline: 'none'
                            }}
                            onFocus={(e) => e.target.style.borderColor = '#818cf8'}
                            onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                        />
                    </div>

                    <div style={{ flex: 1 }} />
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                        <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.05)', padding: '0.4rem 0.8rem', borderRadius: '20px' }}>
                            <strong style={{ color: 'white' }}>{total}</strong> prospects trouvés
                        </span>
                        <button
                            className="btn btn-primary"
                            onClick={handleAssign}
                            disabled={selectedIds.size === 0 || assigning}
                            style={{
                                background: selectedIds.size > 0 ? 'linear-gradient(135deg, #4f46e5, #6366f1)' : 'rgba(255,255,255,0.05)',
                                color: selectedIds.size > 0 ? 'white' : 'var(--text-muted)',
                                border: 'none', padding: '0.8rem 1.5rem', borderRadius: '8px',
                                fontWeight: 600, transition: 'all 0.3s ease',
                                boxShadow: selectedIds.size > 0 ? '0 4px 15px rgba(79, 70, 229, 0.4)' : 'none',
                                cursor: selectedIds.size > 0 ? 'pointer' : 'not-allowed'
                            }}
                        >
                            {assigning ? 'Assignation...' : `Assigner la sélection (${selectedIds.size})`}
                        </button>
                    </div>
                </div>

                <div className="global-leads-table-wrapper" style={{ flex: 1, minHeight: '300px', overflowY: 'auto', overflowX: 'auto', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', background: 'rgba(0,0,0,0.15)' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead style={{ position: 'sticky', top: 0, background: 'rgba(30, 41, 59, 0.95)', backdropFilter: 'blur(10px)', zIndex: 10 }}>
                            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                                <th style={{ width: '50px', textAlign: 'center', padding: '1rem' }}>
                                    <input
                                        type="checkbox"
                                        disabled={leads.filter(l => !l.has_access).length === 0}
                                        checked={leads.length > 0 && leads.filter(l => !l.has_access).length > 0 && selectedIds.size === leads.filter(l => !l.has_access).length}
                                        onChange={toggleSelectAll}
                                        style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#818cf8' }}
                                    />
                                </th>
                                <th style={{ padding: '1rem', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)' }}>Prospect / Entreprise</th>
                                <th style={{ padding: '1rem', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)' }}>Contact</th>
                                <th style={{ padding: '1rem', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)' }}>Secteur / Pays</th>
                                <th style={{ padding: '1rem', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)' }}>Source</th>
                                <th style={{ padding: '1rem', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)' }}>Statut d'Accès</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={6} style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
                                        <div style={{ display: 'inline-block', width: '30px', height: '30px', border: '3px solid rgba(255,255,255,0.1)', borderTopColor: '#818cf8', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                                        <div style={{ marginTop: '1rem' }}>Chargement des prospects...</div>
                                    </td>
                                </tr>
                            ) : leads.length === 0 ? (
                                <tr>
                                    <td colSpan={6} style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
                                        <div style={{ fontSize: '2rem', marginBottom: '1rem', opacity: 0.5 }}>📭</div>
                                        Aucun prospect trouvé dans la base globale.
                                    </td>
                                </tr>
                            ) : (
                                leads.map((lead, idx) => (
                                    <tr
                                        key={lead.id}
                                        style={{
                                            borderBottom: '1px solid rgba(255,255,255,0.05)',
                                            backgroundColor: selectedIds.has(lead.id) ? 'rgba(99, 102, 241, 0.1)' : idx % 2 === 0 ? 'rgba(255,255,255,0.01)' : 'transparent',
                                            opacity: lead.has_access ? 0.4 : 1,
                                            transition: 'background-color 0.2s ease',
                                            cursor: lead.has_access ? 'not-allowed' : 'pointer'
                                        }}
                                        onMouseEnter={(e) => { if (!lead.has_access && !selectedIds.has(lead.id)) e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)' }}
                                        onMouseLeave={(e) => { if (!lead.has_access && !selectedIds.has(lead.id)) e.currentTarget.style.backgroundColor = idx % 2 === 0 ? 'rgba(255,255,255,0.01)' : 'transparent' }}
                                        onClick={() => !lead.has_access && toggleSelect(lead.id)}
                                    >
                                        <td style={{ textAlign: 'center', padding: '1rem' }}>
                                            <input
                                                type="checkbox"
                                                disabled={lead.has_access}
                                                checked={selectedIds.has(lead.id)}
                                                onChange={(e) => { e.stopPropagation(); toggleSelect(lead.id); }}
                                                style={{ width: '18px', height: '18px', cursor: lead.has_access ? 'not-allowed' : 'pointer', accentColor: '#818cf8' }}
                                            />
                                        </td>
                                        <td style={{ padding: '1rem' }}>
                                            <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{lead.nom} {lead.prenom}</div>
                                            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                                                <span style={{ color: 'var(--accent)' }}>{lead.entreprise || 'Sans entreprise'}</span> • {lead.poste || 'Poste non renseigné'}
                                            </div>
                                        </td>
                                        <td style={{ padding: '1rem' }}>
                                            <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{lead.email}</div>
                                        </td>
                                        <td style={{ padding: '1rem' }}>
                                            <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{lead.secteur || '-'}</div>
                                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{lead.pays || '-'}</div>
                                        </td>
                                        <td style={{ padding: '1rem' }}>
                                            <span style={{ padding: '0.3rem 0.6rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                                {lead.source}
                                            </span>
                                        </td>
                                        <td style={{ padding: '1rem' }}>
                                            {lead.has_access ? (
                                                <span style={{ padding: '0.3rem 0.6rem', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: '6px', fontSize: '0.8rem', color: '#34d399', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                                                    <CyberIcon name="check" size={12} color="#34d399" />
                                                    <span>Déjà assigné</span>
                                                </span>
                                            ) : (
                                                <span style={{ padding: '0.3rem 0.6rem', background: 'rgba(255,255,255,0.03)', border: '1px dashed rgba(255,255,255,0.2)', borderRadius: '6px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                                    Non assigné
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="global-leads-pagination-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '1.5rem' }}>
                    <button
                        className="btn btn-secondary"
                        disabled={page === 1}
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        style={{ padding: '0.6rem 1.2rem', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: page === 1 ? 'rgba(255,255,255,0.2)' : 'white', cursor: page === 1 ? 'not-allowed' : 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                    >
                        <CyberIcon name="arrow-right" size={13} style={{ transform: 'rotate(180deg)' }} />
                        <span>Précédent</span>
                    </button>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <span style={{ padding: '0.6rem 1.2rem', background: 'rgba(99, 102, 241, 0.1)', color: '#818cf8', borderRadius: '8px', fontWeight: 600, border: '1px solid rgba(99, 102, 241, 0.2)' }}>
                            Page {page} sur {totalPages || 1}
                        </span>
                    </div>
                    <button
                        className="btn btn-secondary"
                        disabled={page >= totalPages}
                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                        style={{ padding: '0.6rem 1.2rem', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: page >= totalPages ? 'rgba(255,255,255,0.2)' : 'white', cursor: page >= totalPages ? 'not-allowed' : 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                    >
                        <span>Suivant</span>
                        <CyberIcon name="arrow-right" size={13} />
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}
