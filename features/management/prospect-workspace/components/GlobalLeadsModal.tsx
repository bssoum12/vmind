'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

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
    agentId: number;
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
                    'x-client-id': 'PROSPECT_AGENT',
                    'x-user-id': '1' // MOCK USER ID 1
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

    const handleAssign = async () => {
        if (selectedIds.size === 0) return;
        setAssigning(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/agent-leads/assign`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-client-id': 'PROSPECT_AGENT',
                    'x-user-id': '1'
                },
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
                alert('Erreur: ' + err.error);
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
            backgroundColor: 'rgba(11, 15, 25, 0.6)', backdropFilter: 'blur(6px)',
            zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
            <div style={{
                backgroundColor: 'var(--bg-secondary)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: 'var(--border-radius-xl)',
                padding: '2.5rem', width: '95vw', maxWidth: '1400px',
                height: '92vh', display: 'flex', flexDirection: 'column', gap: '1.5rem',
                boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h2 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <span style={{ fontSize: '1.5rem' }}>✨</span> Base de Prospects Globale
                        </h2>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginTop: '0.5rem' }}>
                            Sélectionnez les prospects existants à assigner à cet agent.
                        </p>
                    </div>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '1.5rem', cursor: 'pointer' }}>×</button>
                </div>

                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <input
                        type="text"
                        placeholder="Rechercher par nom, entreprise, email..."
                        className="search-input"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        style={{ flex: 2 }}
                    />

                    <div style={{ flex: 1 }} />
                    <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                        {total} prospects trouvés
                    </span>
                    <button
                        className="btn btn-primary"
                        onClick={handleAssign}
                        disabled={selectedIds.size === 0 || assigning}
                    >
                        {assigning ? 'Assignation...' : `Assigner (${selectedIds.size})`}
                    </button>
                </div>

                <div className="table-container" style={{ flex: 1, minHeight: '300px', overflowY: 'auto' }}>
                    <table className="leads-table">
                        <thead>
                            <tr>
                                <th style={{ width: '40px', textAlign: 'center' }}>
                                    <input
                                        type="checkbox"
                                        disabled={leads.filter(l => !l.has_access).length === 0}
                                        checked={leads.length > 0 && leads.filter(l => !l.has_access).length > 0 && selectedIds.size === leads.filter(l => !l.has_access).length}
                                        onChange={toggleSelectAll}
                                    />
                                </th>
                                <th>Prospect / Entreprise</th>
                                <th>Contact</th>
                                <th>Secteur / Pays</th>
                                <th>Source</th>
                                <th>Statut d'Accès</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                                        Chargement...
                                    </td>
                                </tr>
                            ) : leads.length === 0 ? (
                                <tr>
                                    <td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                                        Aucun prospect trouvé.
                                    </td>
                                </tr>
                            ) : (
                                leads.map(lead => (
                                    <tr key={lead.id} className={selectedIds.has(lead.id) ? 'selected' : ''} style={{ opacity: lead.has_access ? 0.6 : 1 }}>
                                        <td style={{ textAlign: 'center' }}>
                                            <input
                                                type="checkbox"
                                                disabled={lead.has_access}
                                                checked={selectedIds.has(lead.id)}
                                                onChange={() => toggleSelect(lead.id)}
                                            />
                                        </td>
                                        <td>
                                            <div className="lead-name">{lead.nom} {lead.prenom}</div>
                                            <div className="lead-company">{lead.entreprise} • {lead.poste}</div>
                                        </td>
                                        <td>
                                            <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{lead.email}</div>
                                        </td>
                                        <td>
                                            <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{lead.secteur || '-'}</div>
                                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{lead.pays || '-'}</div>
                                        </td>
                                        <td>
                                            <span className="badge badge-new">{lead.source}</span>
                                        </td>
                                        <td>
                                            {lead.has_access ? (
                                                <span className="badge badge-sent">Déjà assigné</span>
                                            ) : (
                                                <span className="badge badge-discarded" style={{ backgroundColor: 'transparent', color: 'var(--text-muted)' }}>Non assigné</span>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="pagination" style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
                    <button
                        className="btn btn-secondary"
                        disabled={page === 1}
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                    >
                        Précédent
                    </button>
                    <span className="page-info">
                        Page {page} sur {totalPages}
                    </span>
                    <button
                        className="btn btn-secondary"
                        disabled={page >= totalPages}
                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    >
                        Suivant
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}
