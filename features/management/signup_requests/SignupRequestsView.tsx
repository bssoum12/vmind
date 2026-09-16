'use client';

import React, { useEffect, useState } from 'react';
import { ShieldCheck, Mail, Phone, Calendar, User, Check, X, ShieldAlert, Loader2, Search, RefreshCw } from 'lucide-react';

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
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'https://localhost:3001'}/api/auth/vmind/signup-requests`);
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
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'https://localhost:3001'}/api/auth/vmind/approve-request`, {
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
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'https://localhost:3001'}/api/auth/vmind/reject-request`, {
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
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'https://localhost:3001'}/api/auth/vmind/toggle-user-status`, {
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
      <div className="page-head" style={{ marginBottom: '20px', padding: '0 0 16px', background: 'transparent', borderBottom: '1px solid var(--border)' }}>
        <div>
          <div className="page-title">DEMANDES D&apos;INSCRIPTION</div>
          <div className="page-sub">Gérez, approuvez ou rejetez les demandes de création de compte Standalone VMIND</div>
        </div>
        <div className="page-actions" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button className="btn" onClick={fetchRequests} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '11px', padding: '4px 10px', height: '28px', whiteSpace: 'nowrap' }}>
            <RefreshCw size={12} />
            Rafraîchir
          </button>
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
          <Search size={15} color="var(--muted)" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
          <input
            type="text"
            placeholder="Rechercher (nom, email, @identifiant...)"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              height: '38px',
              background: 'var(--navy3)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              padding: '0 16px 0 38px',
              color: 'var(--white)',
              outline: 'none',
              fontSize: '13px',
              transition: 'all 0.2s',
              fontFamily: 'inherit'
            }}
          />
        </div>

        {/* Status Filters */}
        <div className="filter-chips" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: 0 }}>
          {(['all', 'pending', 'approved', 'rejected'] as const).map(f => (
            <button
              key={f}
              onClick={() => setStatusFilter(f)}
              className={`chip ${statusFilter === f ? 'on' : ''}`}
            >
              {f === 'all' ? 'Tous' : f === 'pending' ? 'En attente' : f === 'approved' ? 'Acceptées' : 'Refusées'}
            </button>
          ))}
        </div>
      </div>

      {/* Main Table Card */}
      <div className="scroll" style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
        <div className="agents-table-wrap" style={{ flex: 1, minWidth: 0, width: '100%', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--muted)' }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>⏳</div>
              Chargement des requêtes...
            </div>
          ) : error ? (
            <div style={{
              padding: '16px 20px', borderRadius: 10, marginBottom: 16,
              background: 'rgba(255,71,87,0.1)', border: '1px solid rgba(255,71,87,0.3)',
              color: '#FF4757', display: 'flex', alignItems: 'center', gap: '12px'
            }}>
              <ShieldAlert size={20} />
              <span style={{ fontSize: '13px' }}>{error}</span>
            </div>
          ) : sortedRequests.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--muted)', fontSize: 14 }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
              <div style={{ fontWeight: 600, marginBottom: 6, color: 'var(--text)' }}>
                {requests.length > 0 ? 'Aucune demande ne correspond à vos filtres.' : 'Aucune demande d\'inscription trouvée dans le système.'}
              </div>
            </div>
          ) : (
            <table className="agents-table" style={{ width: '100%', minWidth: '850px', borderCollapse: 'separate', borderSpacing: 0, textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(0, 229, 200, 0.12)', color: '#00E5C8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>
                  <th onClick={() => handleSort('name')} style={{ padding: '10px 16px', cursor: 'pointer', userSelect: 'none', position: 'sticky', left: 0, zIndex: 6, background: '#091B33', width: '220px', minWidth: '220px', boxShadow: '4px 0 10px rgba(0,0,0,0.45)' }}>
                    Demandeur {renderSortIndicator('name')}
                  </th>
                  <th onClick={() => handleSort('email')} style={{ padding: '10px 16px', cursor: 'pointer', userSelect: 'none', minWidth: '220px' }}>
                    Contacts {renderSortIndicator('email')}
                  </th>
                  <th onClick={() => handleSort('username')} style={{ padding: '10px 16px', cursor: 'pointer', userSelect: 'none', minWidth: '130px' }}>
                    Identifiant {renderSortIndicator('username')}
                  </th>
                  <th onClick={() => handleSort('date')} style={{ padding: '10px 16px', cursor: 'pointer', userSelect: 'none', minWidth: '140px' }}>
                    Date {renderSortIndicator('date')}
                  </th>
                  <th onClick={() => handleSort('status')} style={{ padding: '10px 16px', cursor: 'pointer', userSelect: 'none', minWidth: '130px' }}>
                    Statut Demande {renderSortIndicator('status')}
                  </th>
                  <th style={{ padding: '10px 16px', userSelect: 'none', minWidth: '140px' }}>
                    Statut Compte
                  </th>
                  <th style={{ padding: '10px 16px', textAlign: 'right', minWidth: '170px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {sortedRequests.map((req) => (
                  <tr key={req.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', transition: 'all .15s' }}>
                    <td style={{ padding: '12px 16px', position: 'sticky', left: 0, zIndex: 4, background: '#061426', width: '220px', minWidth: '220px', boxShadow: '4px 0 10px rgba(0,0,0,0.45)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                          width: 32, height: 32, borderRadius: 8, display: 'flex',
                          alignItems: 'center', justifyContent: 'center',
                          background: 'rgba(0, 229, 200, 0.08)',
                          border: '1px solid rgba(0, 229, 200, 0.25)',
                          color: '#00E5C8', fontWeight: 'bold', fontSize: '11px', flexShrink: 0
                        }}>
                          {req.first_name?.[0]}{req.last_name?.[0]}
                        </div>
                        <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          <div className="agent-row-name" style={{ fontWeight: 600, color: 'var(--text)' }}>{req.first_name} {req.last_name}</div>
                          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>@{req.username}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px', minWidth: '220px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#D8E3F0', fontSize: 12 }}>
                          <Mail size={12} color="#8FA3B8" /> {req.email}
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#8FA3B8', fontSize: 12 }}>
                          <Phone size={12} color="#8FA3B8" /> {req.phone_number}
                        </span>
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px', color: '#00E5C8', fontFamily: 'monospace', fontWeight: 600, fontSize: 12 }}>
                      @{req.username}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 12, color: 'var(--muted)' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Calendar size={12} /> {new Date(req.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      {req.status === 'pending' && (
                        <span className="status-pill warn" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, width: 'fit-content' }}>
                          <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#FFB300', boxShadow: '0 0 6px #FFB300' }} />
                          En attente
                        </span>
                      )}
                      {req.status === 'approved' && (
                        <span className="status-pill on" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, width: 'fit-content' }}>
                          <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#00E5A0', boxShadow: '0 0 6px #00E5A0' }} />
                          Acceptée
                        </span>
                      )}
                      {req.status === 'rejected' && (
                        <span className="status-pill off" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, width: 'fit-content' }}>
                          <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#FF4757' }} />
                          Refusée
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      {req.status === 'approved' ? (
                        <>
                          {req.user_status === 'active' && (
                            <span className="status-pill on" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, width: 'fit-content' }}>
                              <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#00E5A0', boxShadow: '0 0 6px #00E5A0' }} />
                              Actif
                            </span>
                          )}
                          {req.user_status === 'deactivated' && (
                            <span className="status-pill off" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, width: 'fit-content' }}>
                              <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#FF4757' }} />
                              Désactivé
                            </span>
                          )}
                          {req.user_status === 'pending_activation' && (
                            <span className="status-pill warn" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, width: 'fit-content' }}>
                              <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#FFB300', boxShadow: '0 0 6px #FFB300' }} />
                              En attente d'activation
                            </span>
                          )}
                          {!req.user_status && (
                            <span style={{ color: 'var(--muted)', fontSize: 12 }}>-</span>
                          )}
                        </>
                      ) : (
                        <span style={{ color: 'var(--muted)', fontSize: 12 }}>-</span>
                      )}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right' }} onClick={e => e.stopPropagation()}>
                      <div className="row-actions" style={{ justifyContent: 'flex-end' }}>
                        {req.status === 'pending' ? (
                          <>
                            <button
                              onClick={() => setSelectedReq(req)}
                              disabled={actionLoading}
                              className="row-btn"
                              style={{ color: '#00E5A0', borderColor: 'rgba(0,229,160,0.3)', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                              title="Configurer et accepter"
                            >
                              <Check size={11} strokeWidth={2.5} />
                              <span>Accepter</span>
                            </button>
                            <button
                              onClick={() => setRejectReq(req)}
                              disabled={actionLoading}
                              className="row-btn danger"
                              style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
                              title="Refuser la demande"
                            >
                              <X size={11} strokeWidth={2.5} />
                              <span>Refuser</span>
                            </button>
                          </>
                        ) : req.status === 'approved' && req.user_status ? (
                          <>
                            {(req.user_status === 'active' || req.user_status === 'pending_activation') ? (
                              <button
                                onClick={() => toggleUserStatus(req.email, req.user_status)}
                                disabled={actionLoading}
                                className="row-btn danger"
                                title="Désactiver le compte"
                              >
                                Désactiver
                              </button>
                            ) : (
                              <button
                                onClick={() => toggleUserStatus(req.email, req.user_status)}
                                disabled={actionLoading}
                                className="row-btn"
                                style={{ color: '#00E5A0', borderColor: 'rgba(0,229,160,0.3)' }}
                                title="Activer le compte"
                              >
                                Activer
                              </button>
                            )}
                            <button
                              onClick={() => setSelectedReq(req)}
                              className="row-btn"
                              title="Modifier la configuration"
                            >
                              ⚙️ Config
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => setSelectedReq(req)}
                            className="row-btn"
                            title="Consulter les détails"
                          >
                            Détails
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
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
