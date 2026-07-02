'use client';

import React, { useEffect, useState } from 'react';
import { ShieldCheck, Mail, Phone, Calendar, User, Check, X, ShieldAlert, Loader2, Search } from 'lucide-react';

interface SignupRequest {
  id: number;
  first_name: string;
  last_name: string;
  username: string;
  email: string;
  phone_number: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  user_status?: 'pending_activation' | 'active' | 'deactivated';
}

export const SignupRequestsView: React.FC = () => {
  const [requests, setRequests] = useState<SignupRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Search, Filters & Sorting state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [sortField, setSortField] = useState<'name' | 'username' | 'email' | 'date' | 'status' | null>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Modal / Selection state for approval
  const [selectedReq, setSelectedReq] = useState<SignupRequest | null>(null);
  const [role, setRole] = useState<'Administrator' | 'Utilisateur'>('Utilisateur');
  const [clientId, setClientId] = useState('DEMO');
  const [actionLoading, setActionLoading] = useState(false);

  // Modal / Selection state for rejection confirmation
  const [rejectReq, setRejectReq] = useState<SignupRequest | null>(null);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const res = await fetch('http://localhost:3001/api/auth/vmind/signup-requests');
      const data = await res.json();
      if (data.ok) {
        setRequests(data.requests);
      } else {
        setError(data.error || 'Impossible de récupérer les demandes.');
      }
    } catch (err) {
      console.error(err);
      setError('Erreur réseau lors de la récupération des demandes.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleApprove = async () => {
    if (!selectedReq) return;
    try {
      setActionLoading(true);
      const res = await fetch('http://localhost:3001/api/auth/vmind/approve-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestId: selectedReq.id,
          role,
          client_id: clientId
        })
      });
      const data = await res.json();
      if (data.ok) {
        setSelectedReq(null);
        fetchRequests();
      } else {
        alert(data.error || 'Erreur lors de l\'approbation.');
      }
    } catch (err) {
      console.error(err);
      alert('Erreur réseau.');
    } finally {
      setActionLoading(false);
    }
  };

  const confirmReject = async () => {
    if (!rejectReq) return;
    try {
      setActionLoading(true);
      const res = await fetch('http://localhost:3001/api/auth/vmind/reject-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId: rejectReq.id })
      });
      const data = await res.json();
      if (data.ok) {
        setRejectReq(null);
        fetchRequests();
      } else {
        alert(data.error || 'Erreur lors du refus.');
      }
    } catch (err) {
      console.error(err);
      alert('Erreur réseau.');
    } finally {
      setActionLoading(false);
    }
  };
  const toggleUserStatus = async (email: string, currentStatus?: string) => {
    const targetStatus = currentStatus === 'deactivated' ? 'active' : 'deactivated';
    try {
      setActionLoading(true);
      const res = await fetch('http://localhost:3001/api/auth/vmind/toggle-user-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, status: targetStatus })
      });
      const data = await res.json();
      if (data.ok) {
        fetchRequests();
      } else {
        alert(data.error || 'Erreur lors du changement de statut de l\'utilisateur.');
      }
    } catch (err) {
      console.error(err);
      alert('Erreur réseau.');
    } finally {
      setActionLoading(false);
    }
  };
  // ── SORTING HANDLER ──
  const handleSort = (field: 'name' | 'username' | 'email' | 'date' | 'status') => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // ── RENDER SORT INDICATOR ──
  const renderSortIndicator = (field: 'name' | 'username' | 'email' | 'date' | 'status') => {
    if (sortField !== field) {
      return <span style={{ opacity: 0.3, marginLeft: '6px', fontSize: '10px' }}>⇅</span>;
    }
    return sortDirection === 'asc' 
      ? <span style={{ color: '#00E5C8', marginLeft: '6px', fontSize: '10px' }}>▲</span>
      : <span style={{ color: '#00E5C8', marginLeft: '6px', fontSize: '10px' }}>▼</span>;
  };

  // ── FILTERING & SORTING LOGIC ──
  const filteredRequests = requests.filter(req => {
    // 1. Status Filter
    if (statusFilter !== 'all' && req.status !== statusFilter) {
      return false;
    }

    // 2. Search Query Filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const fullName = `${req.first_name} ${req.last_name}`.toLowerCase();
      const username = req.username.toLowerCase();
      const email = req.email.toLowerCase();
      const phone = req.phone_number.toLowerCase();

      return fullName.includes(q) || username.includes(q) || email.includes(q) || phone.includes(q);
    }

    return true;
  });

  const sortedRequests = [...filteredRequests].sort((a, b) => {
    if (!sortField) return 0;

    let valA: any = '';
    let valB: any = '';

    if (sortField === 'name') {
      valA = `${a.first_name} ${a.last_name}`.toLowerCase();
      valB = `${b.first_name} ${b.last_name}`.toLowerCase();
    } else if (sortField === 'username') {
      valA = a.username.toLowerCase();
      valB = b.username.toLowerCase();
    } else if (sortField === 'email') {
      valA = a.email.toLowerCase();
      valB = b.email.toLowerCase();
    } else if (sortField === 'date') {
      valA = new Date(a.created_at).getTime();
      valB = new Date(b.created_at).getTime();
    } else if (sortField === 'status') {
      valA = a.status;
      valB = b.status;
    }

    if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
    if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  return (
    <div className="fade-in-content" style={{ padding: '24px', color: '#D8E3F0' }}>
      <style>{`
        .request-row {
          transition: background-color 0.2s ease;
        }
        .request-row:hover {
          background-color: rgba(0, 229, 200, 0.04) !important;
        }
        .btn-approve {
          transition: all 0.2s ease;
        }
        .btn-approve:hover:not(:disabled) {
          filter: brightness(1.15);
          box-shadow: 0 0 18px rgba(0, 229, 200, 0.45) !important;
          transform: translateY(-1px);
        }
        .btn-approve:active:not(:disabled) {
          transform: translateY(0);
        }
        .btn-reject {
          transition: all 0.2s ease;
        }
        .btn-reject:hover:not(:disabled) {
          background-color: rgba(255, 71, 87, 0.2) !important;
          border-color: rgba(255, 71, 87, 0.5) !important;
          color: #ff6b7a !important;
          transform: translateY(-1px);
        }
        .btn-reject:active:not(:disabled) {
          transform: translateY(0);
        }
      `}</style>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#FFFFFF', letterSpacing: '0.03em', marginBottom: '6px' }}>
            DEMANDES D&apos;INSCRIPTION
          </h1>
          <p style={{ fontSize: '13px', color: '#8FA3B8' }}>
            Gérez, approuvez ou rejetez les demandes de création de compte Standalone VMIND.
          </p>
        </div>
      </div>

      {/* Controls: Search & Filters */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '16px',
        marginBottom: '20px',
        flexWrap: 'wrap'
      }}>
        {/* Search */}
        <div style={{ position: 'relative', flex: 1, minWidth: '260px', maxWidth: '380px' }}>
          <Search size={16} color="#8FA3B8" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
          <input
            type="text"
            placeholder="Rechercher (nom, email, @identifiant...)"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onFocus={e => e.target.style.borderColor = '#00E5C8'}
            onBlur={e => e.target.style.borderColor = 'rgba(0, 229, 200, 0.15)'}
            style={{
              width: '100%',
              height: '42px',
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(0, 229, 200, 0.15)',
              borderRadius: '10px',
              padding: '0 16px 0 42px',
              color: '#FFFFFF',
              outline: 'none',
              fontSize: '13px',
              transition: 'all 0.2s',
              fontFamily: 'inherit'
            }}
          />
        </div>

        {/* Status Filters */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {(['all', 'pending', 'approved', 'rejected'] as const).map(f => (
            <button
              key={f}
              onClick={() => setStatusFilter(f)}
              style={{
                padding: '8px 16px',
                borderRadius: '10px',
                background: statusFilter === f ? 'rgba(0, 229, 200, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                border: `1px solid ${statusFilter === f ? '#00E5C8' : 'rgba(255, 255, 255, 0.08)'}`,
                color: statusFilter === f ? '#00E5C8' : '#8FA3B8',
                fontSize: '12.5px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              {f === 'all' ? 'Tous' : f === 'pending' ? 'En attente' : f === 'approved' ? 'Acceptées' : 'Refusées'}
            </button>
          ))}
        </div>
      </div>

      {/* Main Table Card */}
      <div style={{
        background: 'rgba(8, 20, 38, 0.45)',
        backdropFilter: 'blur(16px)',
        border: '1px solid rgba(0, 229, 200, 0.15)',
        borderRadius: '16px',
        padding: '12px 24px 24px',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)'
      }}>
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', padding: '60px 0' }}>
            <Loader2 size={32} className="anim-spin" style={{ color: '#00E5C8' }} />
            <span style={{ fontSize: '13px', color: '#8FA3B8' }}>Chargement des requêtes...</span>
          </div>
        ) : error ? (
          <div style={{ padding: '20px', background: 'rgba(255, 71, 87, 0.08)', border: '1px solid rgba(255, 71, 87, 0.3)', borderRadius: '12px', color: '#ff6b7a', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <ShieldAlert size={20} />
            <span style={{ fontSize: '13px' }}>{error}</span>
          </div>
        ) : sortedRequests.length === 0 ? (
          <div style={{ padding: '60px 0', textAlign: 'center', color: '#8FA3B8', fontSize: '13.5px' }}>
            {requests.length > 0 ? 'Aucune demande ne correspond à vos filtres.' : 'Aucune demande d\'inscription trouvée dans le système.'}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(0, 229, 200, 0.12)', color: '#00E5C8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  <th onClick={() => handleSort('name')} style={{ padding: '4px 16px 12px 16px', cursor: 'pointer', userSelect: 'none' }}>
                    Demandeur {renderSortIndicator('name')}
                  </th>
                  <th onClick={() => handleSort('username')} style={{ padding: '4px 16px 12px 16px', cursor: 'pointer', userSelect: 'none' }}>
                    Identifiant {renderSortIndicator('username')}
                  </th>
                  <th onClick={() => handleSort('email')} style={{ padding: '4px 16px 12px 16px', cursor: 'pointer', userSelect: 'none' }}>
                    Contacts {renderSortIndicator('email')}
                  </th>
                  <th onClick={() => handleSort('date')} style={{ padding: '4px 16px 12px 16px', cursor: 'pointer', userSelect: 'none' }}>
                    Date {renderSortIndicator('date')}
                  </th>
                  <th onClick={() => handleSort('status')} style={{ padding: '4px 16px 12px 16px', cursor: 'pointer', userSelect: 'none' }}>
                    Statut {renderSortIndicator('status')}
                  </th>
                  <th style={{ padding: '4px 16px 12px 16px', userSelect: 'none' }}>
                    Statut Compte
                  </th>
                  <th style={{ padding: '4px 16px 12px 16px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {sortedRequests.map((req) => (
                  <tr key={req.id} className="request-row" style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', transition: 'background 0.2s' }}>
                    <td style={{ padding: '16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(0, 229, 200, 0.08)', border: '1px solid rgba(0, 229, 200, 0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#00E5C8', fontWeight: 'bold', fontSize: '11px' }}>
                          {req.first_name[0]}{req.last_name[0]}
                        </div>
                        <div>
                          <div style={{ color: '#FFFFFF', fontWeight: 600 }}>{req.first_name} {req.last_name}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '16px', color: '#00E5C8', fontFamily: 'monospace', fontWeight: 600 }}>
                      @{req.username}
                    </td>
                    <td style={{ padding: '16px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#D8E3F0' }}><Mail size={12} color="#8FA3B8" /> {req.email}</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#8FA3B8' }}><Phone size={12} color="#8FA3B8" /> {req.phone_number}</span>
                      </div>
                    </td>
                    <td style={{ padding: '16px', color: '#8FA3B8' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Calendar size={12} /> {new Date(req.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </td>
                    <td style={{ padding: '16px' }}>
                      {req.status === 'pending' && (
                        <span style={{ padding: '4px 10px', borderRadius: '20px', background: 'rgba(255, 179, 0, 0.1)', border: '1px solid rgba(255, 179, 0, 0.3)', color: '#FFB300', fontSize: '11px', fontWeight: 600 }}>
                          En attente
                        </span>
                      )}
                      {req.status === 'approved' && (
                        <span style={{ padding: '4px 10px', borderRadius: '20px', background: 'rgba(0, 229, 200, 0.1)', border: '1px solid rgba(0, 229, 200, 0.3)', color: '#00E5C8', fontSize: '11px', fontWeight: 600 }}>
                          Acceptée
                        </span>
                      )}
                      {req.status === 'rejected' && (
                        <span style={{ padding: '4px 10px', borderRadius: '20px', background: 'rgba(255, 71, 87, 0.1)', border: '1px solid rgba(255, 71, 87, 0.3)', color: '#FF4757', fontSize: '11px', fontWeight: 600 }}>
                          Refusée
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '16px' }}>
                      {req.status === 'approved' ? (
                        <>
                          {req.user_status === 'active' && (
                            <span style={{ padding: '4px 10px', borderRadius: '20px', background: 'rgba(74, 222, 128, 0.1)', border: '1px solid rgba(74, 222, 128, 0.3)', color: '#4ade80', fontSize: '11px', fontWeight: 600 }}>
                              Actif
                            </span>
                          )}
                          {req.user_status === 'deactivated' && (
                            <span style={{ padding: '4px 10px', borderRadius: '20px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#ef4444', fontSize: '11px', fontWeight: 600 }}>
                              Désactivé
                            </span>
                          )}
                          {req.user_status === 'pending_activation' && (
                            <span style={{ padding: '4px 10px', borderRadius: '20px', background: 'rgba(251, 191, 36, 0.1)', border: '1px solid rgba(251, 191, 36, 0.3)', color: '#fbbf24', fontSize: '11px', fontWeight: 600 }}>
                              En attente d'activation
                            </span>
                          )}
                          {!req.user_status && (
                            <span style={{ color: '#8FA3B8', fontSize: '11px' }}>-</span>
                          )}
                        </>
                      ) : (
                        <span style={{ color: '#8FA3B8', fontSize: '11px' }}>-</span>
                      )}
                    </td>
                    <td style={{ padding: '16px', textAlign: 'right' }}>
                      {req.status === 'pending' ? (
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                          <button
                            onClick={() => setSelectedReq(req)}
                            disabled={actionLoading}
                            className="btn-approve"
                            style={{
                              padding: '6px 12px',
                              borderRadius: '8px',
                              background: '#00E5C8',
                              border: 'none',
                              color: '#021010',
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontSize: '11.5px',
                              boxShadow: '0 0 12px rgba(0, 229, 200, 0.25)'
                            }}
                          >
                            <Check size={12} strokeWidth={3} /> Accepter
                          </button>
                          <button
                            onClick={() => setRejectReq(req)}
                            disabled={actionLoading}
                            className="btn-reject"
                            style={{
                              padding: '6px 12px',
                              borderRadius: '8px',
                              background: 'rgba(255, 71, 87, 0.12)',
                              border: '1px solid rgba(255, 71, 87, 0.3)',
                              color: '#FF4757',
                              fontWeight: 600,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontSize: '11.5px'
                            }}
                          >
                            <X size={12} strokeWidth={3} /> Refuser
                          </button>
                        </div>
                      ) : req.status === 'approved' && req.user_status ? (
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                          {(req.user_status === 'active' || req.user_status === 'pending_activation') ? (
                            <button
                              onClick={() => toggleUserStatus(req.email, req.user_status)}
                              disabled={actionLoading}
                              style={{
                                padding: '6px 12px',
                                borderRadius: '8px',
                                background: 'rgba(255, 71, 87, 0.12)',
                                border: '1px solid rgba(255, 71, 87, 0.3)',
                                color: '#FF4757',
                                fontWeight: 600,
                                cursor: 'pointer',
                                fontSize: '11px',
                                fontFamily: 'inherit',
                                transition: 'all 0.2s'
                              }}
                              onMouseEnter={e => {
                                e.currentTarget.style.background = 'rgba(255, 71, 87, 0.2)';
                              }}
                              onMouseLeave={e => {
                                e.currentTarget.style.background = 'rgba(255, 71, 87, 0.12)';
                              }}
                            >
                              Désactiver
                            </button>
                          ) : (
                            <button
                              onClick={() => toggleUserStatus(req.email, req.user_status)}
                              disabled={actionLoading}
                              style={{
                                padding: '6px 12px',
                                borderRadius: '8px',
                                background: 'rgba(0, 229, 200, 0.12)',
                                border: '1px solid rgba(0, 229, 200, 0.3)',
                                color: '#00E5C8',
                                fontWeight: 700,
                                cursor: 'pointer',
                                fontSize: '11px',
                                fontFamily: 'inherit',
                                transition: 'all 0.2s',
                                boxShadow: '0 0 10px rgba(0, 229, 200, 0.1)'
                              }}
                              onMouseEnter={e => {
                                e.currentTarget.style.background = 'rgba(0, 229, 200, 0.2)';
                              }}
                              onMouseLeave={e => {
                                e.currentTarget.style.background = 'rgba(0, 229, 200, 0.12)';
                              }}
                            >
                              Activer
                            </button>
                          )}
                        </div>
                      ) : (
                        <span style={{ color: '#8FA3B8', fontSize: '12px' }}>Traité</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Rejection Confirmation Modal (Premium HUD styling) */}
      {rejectReq && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 100,
          background: 'rgba(3, 7, 18, 0.75)',
          backdropFilter: 'blur(10px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '20px'
        }}>
          <div style={{
            width: '100%', maxWidth: '440px',
            background: 'linear-gradient(160deg, rgba(8,20,38,0.99) 0%, rgba(4,12,24,0.99) 100%)',
            border: '1px solid #FF4757',
            borderRadius: '16px',
            padding: '28px',
            position: 'relative',
            boxShadow: '0 0 30px rgba(255, 71, 87, 0.2)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(255, 71, 87, 0.1)', border: '1px solid rgba(255, 71, 87, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FF4757' }}>
                <ShieldAlert size={24} />
              </div>
            </div>

            <h3 style={{ fontSize: '16.5px', fontWeight: 800, color: '#FFFFFF', letterSpacing: '0.04em', marginBottom: '8px', textAlign: 'center' }}>
              CONFIRMER LE REFUS
            </h3>
            <p style={{ fontSize: '13px', color: '#8FA3B8', marginBottom: '24px', textAlign: 'center', lineHeight: 1.5 }}>
              Voulez-vous vraiment refuser la demande d&apos;inscription de <strong>@{rejectReq.username}</strong> ({rejectReq.first_name} {rejectReq.last_name}) ?
              <br />
              <span style={{ color: '#FF4757', display: 'block', marginTop: '8px', fontSize: '11.5px', fontWeight: 500 }}>
                Cette action est irréversible et lui enverra un email de notification.
              </span>
            </p>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                type="button"
                onClick={() => setRejectReq(null)}
                disabled={actionLoading}
                style={{ flex: 1, height: '42px', borderRadius: '10px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#FFFFFF', fontSize: '12.5px', fontWeight: 700, cursor: 'pointer' }}
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={confirmReject}
                disabled={actionLoading}
                style={{ flex: 1, height: '42px', borderRadius: '10px', border: 'none', background: '#FF4757', color: '#FFFFFF', fontSize: '12.5px', fontWeight: 700, cursor: 'pointer', boxShadow: '0 0 15px rgba(255, 71, 87, 0.25)' }}
              >
                {actionLoading ? 'Refus...' : 'Refuser la demande'}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Approval Details Modal */}
      {selectedReq && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 100,
          background: 'rgba(3, 7, 18, 0.75)',
          backdropFilter: 'blur(10px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '20px'
        }}>
          <div style={{
            width: '100%', maxWidth: '460px',
            background: 'linear-gradient(160deg, rgba(8,20,38,0.99) 0%, rgba(4,12,24,0.99) 100%)',
            border: '1px solid #00E5C8',
            borderRadius: '16px',
            padding: '28px',
            position: 'relative',
            boxShadow: '0 0 30px rgba(0, 229, 200, 0.2)'
          }}>
            <h3 style={{ fontSize: '16.5px', fontWeight: 800, color: '#FFFFFF', letterSpacing: '0.04em', marginBottom: '8px' }}>
              CONFIGURATION DE L&apos;UTILISATEUR
            </h3>
            <p style={{ fontSize: '12.5px', color: '#8FA3B8', marginBottom: '20px' }}>
              Configurez le profil de <strong>@{selectedReq.username}</strong> avant validation.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Role selection */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '10px', fontWeight: 700, color: '#00E5C8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Rôle VMIND</label>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <label style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', borderRadius: '8px', border: `1px solid ${role === 'Utilisateur' ? '#00E5C8' : 'rgba(255,255,255,0.08)'}`, background: role === 'Utilisateur' ? 'rgba(0, 229, 200, 0.05)' : 'transparent', cursor: 'pointer' }}>
                    <input type="radio" name="user_role" checked={role === 'Utilisateur'} onChange={() => setRole('Utilisateur')} style={{ accentColor: '#00E5C8' }} />
                    <span style={{ fontSize: '12.5px', fontWeight: 600 }}>Utilisateur</span>
                  </label>
                  <label style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', borderRadius: '8px', border: `1px solid ${role === 'Administrator' ? '#00E5C8' : 'rgba(255,255,255,0.08)'}`, background: role === 'Administrator' ? 'rgba(0, 229, 200, 0.05)' : 'transparent', cursor: 'pointer' }}>
                    <input type="radio" name="user_role" checked={role === 'Administrator'} onChange={() => setRole('Administrator')} style={{ accentColor: '#00E5C8' }} />
                    <span style={{ fontSize: '12.5px', fontWeight: 600 }}>Administrateur</span>
                  </label>
                </div>
              </div>

              {/* Client ID / Instance name */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '10px', fontWeight: 700, color: '#00E5C8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>ID Client (Connector TraLIS)</label>
                <input
                  type="text"
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value.toUpperCase())}
                  placeholder="DEMO"
                  style={{
                    width: '100%',
                    height: '42px',
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid rgba(0, 229, 200, 0.28)',
                    borderRadius: '8px',
                    padding: '0 12px',
                    color: '#FFFFFF',
                    outline: 'none',
                    fontSize: '13px'
                  }}
                  required
                />
              </div>

              {/* Info alert */}
              <div style={{ padding: '10px 12px', background: 'rgba(0, 229, 200, 0.05)', border: '1px solid rgba(0, 229, 200, 0.15)', borderRadius: '8px', fontSize: '11px', color: '#8FA3B8', lineHeight: 1.5 }}>
                Après approbation, un email contenant un code de réinitialisation unique et valable 48h sera généré pour l&apos;utilisateur.
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setSelectedReq(null)}
                  disabled={actionLoading}
                  style={{ flex: 1, height: '42px', borderRadius: '10px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#FFFFFF', fontSize: '12.5px', fontWeight: 700, cursor: 'pointer' }}
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={handleApprove}
                  disabled={actionLoading}
                  style={{ flex: 1, height: '42px', borderRadius: '10px', border: 'none', background: `linear-gradient(90deg, #00E5C8 0%, #00ffd5 100%)`, color: '#021010', fontSize: '12.5px', fontWeight: 700, cursor: 'pointer', boxShadow: '0 0 15px rgba(0,229,200,0.25)' }}
                >
                  {actionLoading ? 'Validation...' : 'Approuver'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
