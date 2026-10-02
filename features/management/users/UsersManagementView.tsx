'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Users,
  ShieldAlert,
  Search,
  RefreshCw,
  CheckCircle2,
  Clock,
  Laptop,
  Activity,
  Power,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { useToast } from '@/shared/contexts/ToastContext';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://localhost:3001';

const ALL_AVAILABLE_AGENTS = [
  { code: 'VDATA', name: 'Analyste Données', icon: '📊', color: '#00E5C8' },
  { code: 'VFIN', name: 'Contrôleur Financier', icon: '💰', color: '#10B981' },
  { code: 'VSELL', name: 'Commercial & Ventes', icon: '📈', color: '#6366F1' },
  { code: 'VSTOCK', name: 'Gestion Stocks', icon: '📦', color: '#F59E0B' },
  { code: 'VBUY', name: 'Achats & Fournisseurs', icon: '🛒', color: '#EC4899' },
  { code: 'VMOVE', name: 'Logistique & Transport', icon: '🚚', color: '#8B5CF6' }
];

interface ManagedUser {
  id: number;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  status: string;
  role: string;
  allowedAgents: string[];
  defaultClientId: string;
  connectorType: string;
  isOnline: boolean;
  activeSessionsCount: number;
  lastLoginAt: string;
  lastIp: string;
  lastUserAgent: string;
  createdAt: string;
  updatedAt: string;
}

interface UserStats {
  totalUsers: number;
  activeUsers: number;
  onlineUsers: number;
  pendingUsers: number;
  deactivatedUsers: number;
}

export const UsersManagementView: React.FC = () => {
  const { showToast } = useToast();

  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isForbidden, setIsForbidden] = useState(false);
  const [forbiddenReason, setForbiddenReason] = useState('');

  // Filtres et pagination
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [presenceFilter, setPresenceFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [limit] = useState(15);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Chargement des statistiques globales
  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/users/stats`, {
        credentials: 'include',
        cache: 'no-store'
      });
      if (res.ok) {
        const data = await res.json();
        if (data.ok && data.stats) {
          setStats(data.stats);
        }
      }
    } catch (err) {
      console.error('[USERS VIEW] Erreur chargement stats:', err);
    }
  }, []);

  // Chargement de la liste paginée des utilisateurs
  const fetchUsers = useCallback(async (targetPage = page) => {
    setIsLoading(true);
    setIsForbidden(false);

    try {
      const queryParams = new URLSearchParams({
        page: targetPage.toString(),
        limit: limit.toString(),
        search: searchQuery.trim(),
        role: roleFilter,
        status: statusFilter,
        presence: presenceFilter
      });

      const res = await fetch(`${API_BASE_URL}/api/admin/users?${queryParams.toString()}`, {
        credentials: 'include',
        cache: 'no-store'
      });

      if (res.status === 401 || res.status === 403) {
        const errData = await res.json().catch(() => ({}));
        setIsForbidden(true);
        setForbiddenReason(errData.message || 'Accès refusé : Cette interface est strictement réservée aux administrateurs.');
        return;
      }

      if (res.ok) {
        const data = await res.json();
        if (data.ok) {
          setUsers(data.users || []);
          setTotal(data.total || 0);
          setTotalPages(data.totalPages || 1);
          setPage(data.page || targetPage);
        }
      } else {
        showToast('Erreur lors de la récupération des utilisateurs', 'error');
      }
    } catch (err) {
      console.error('[USERS VIEW] Erreur chargement utilisateurs:', err);
      showToast('Impossible de contacter le serveur', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [page, limit, searchQuery, roleFilter, statusFilter, presenceFilter, showToast]);

  useEffect(() => {
    fetchStats();
    fetchUsers(1);
  }, [roleFilter, statusFilter, presenceFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchUsers(1);
  };

  const handleRefresh = () => {
    fetchStats();
    fetchUsers(page);
  };

  const formatRelativeDate = (dateStr: string) => {
    if (!dateStr) return 'Jamais';
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMins < 1) return "À l'instant";
      if (diffMins < 60) return `Il y a ${diffMins} min`;
      if (diffHours < 24) return `Il y a ${diffHours} h`;
      if (diffDays === 1) return 'Hier';
      if (diffDays < 7) return `Il y a ${diffDays} j`;
      return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  // Écran d'accès refusé si non-administrateur
  if (isForbidden) {
    return (
      <div
        className="anim"
        style={{
          minHeight: '600px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '40px 20px'
        }}
      >
        <div
          style={{
            maxWidth: '520px',
            textAlign: 'center',
            background: 'linear-gradient(135deg, rgba(255, 71, 87, 0.08) 0%, rgba(13, 27, 42, 0.7) 100%)',
            border: '1px solid rgba(255, 71, 87, 0.35)',
            borderRadius: '16px',
            padding: '36px 28px',
            boxShadow: '0 12px 40px rgba(0, 0, 0, 0.5), 0 0 24px rgba(255, 71, 87, 0.12)'
          }}
        >
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: 'rgba(255, 71, 87, 0.12)',
              border: '2px solid rgba(255, 71, 87, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px auto',
              color: '#FF4757'
            }}
          >
            <ShieldAlert size={32} />
          </div>
          <h2 style={{ color: '#F0F4F8', fontSize: '18px', fontWeight: 800, marginBottom: '10px' }}>
            Accès Strictement Réservé aux Administrateurs
          </h2>
          <p style={{ color: '#94A3B8', fontSize: '13px', lineHeight: '1.6', margin: 0 }}>
            {forbiddenReason || "Vous ne disposez pas des privilèges suffisants pour consulter la liste et le suivi des utilisateurs. Cette section est strictement réservée aux comptes administrateurs."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="anim" style={{ padding: '24px 32px', minHeight: '100%', color: '#F0F4F8' }}>
      {/* ─── Header de la Vue ─── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: 'rgba(0, 229, 200, 0.12)',
                border: '1px solid rgba(0, 229, 200, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#00E5C8'
              }}
            >
              <Users size={20} />
            </div>
            <div>
              <h1 style={{ fontSize: '20px', fontWeight: 800, margin: 0, letterSpacing: '-0.3px', color: '#F0F4F8' }}>
                Suivi des Utilisateurs
              </h1>
              <p style={{ fontSize: '12px', color: '#94A3B8', margin: '2px 0 0 0' }}>
                Supervisez les comptes actifs, l&apos;état des sessions en direct et les accès aux agents IA.
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={handleRefresh}
          disabled={isLoading}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 14px',
            background: 'rgba(15, 32, 53, 0.8)',
            border: '1px solid rgba(0, 229, 200, 0.25)',
            borderRadius: '8px',
            color: '#00E5C8',
            fontSize: '12px',
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
        >
          <RefreshCw size={14} className={isLoading ? 'spin' : ''} />
          <span>Actualiser</span>
        </button>
      </div>

      {/* ─── Cartes KPIs de Synthèse ─── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '14px',
          marginBottom: '24px'
        }}
      >
        {/* KPI 1 : Total Utilisateurs */}
        <div
          style={{
            background: 'linear-gradient(135deg, rgba(15, 32, 53, 0.7) 0%, rgba(6, 17, 31, 0.8) 100%)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '12px',
            padding: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '14px'
          }}
        >
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '10px',
              background: 'rgba(255, 255, 255, 0.05)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#F0F4F8'
            }}
          >
            <Users size={20} />
          </div>
          <div>
            <div style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 600, textTransform: 'uppercase' }}>
              Total Utilisateurs
            </div>
            <div style={{ fontSize: '22px', fontWeight: 800, color: '#F0F4F8' }}>
              {stats?.totalUsers ?? '…'}
            </div>
          </div>
        </div>

        {/* KPI 2 : En Ligne Maintenant */}
        <div
          style={{
            background: 'linear-gradient(135deg, rgba(0, 229, 200, 0.08) 0%, rgba(6, 17, 31, 0.8) 100%)',
            border: '1px solid rgba(0, 229, 200, 0.3)',
            borderRadius: '12px',
            padding: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '14px'
          }}
        >
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '10px',
              background: 'rgba(0, 229, 200, 0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#00E5C8'
            }}
          >
            <Activity size={20} />
          </div>
          <div>
            <div style={{ fontSize: '11px', color: '#00E5C8', fontWeight: 700, textTransform: 'uppercase' }}>
              En Ligne Actuellement
            </div>
            <div style={{ fontSize: '22px', fontWeight: 800, color: '#00E5C8' }}>
              {stats?.onlineUsers ?? '…'}
            </div>
          </div>
        </div>

        {/* KPI 3 : Comptes Actifs */}
        <div
          style={{
            background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(6, 17, 31, 0.8) 100%)',
            border: '1px solid rgba(16, 185, 129, 0.25)',
            borderRadius: '12px',
            padding: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '14px'
          }}
        >
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '10px',
              background: 'rgba(16, 185, 129, 0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#10B981'
            }}
          >
            <CheckCircle2 size={20} />
          </div>
          <div>
            <div style={{ fontSize: '11px', color: '#10B981', fontWeight: 700, textTransform: 'uppercase' }}>
              Comptes Actifs
            </div>
            <div style={{ fontSize: '22px', fontWeight: 800, color: '#10B981' }}>
              {stats?.activeUsers ?? '…'}
            </div>
          </div>
        </div>

        {/* KPI 4 : Comptes Désactivés / En Attente */}
        <div
          style={{
            background: 'linear-gradient(135deg, rgba(255, 71, 87, 0.06) 0%, rgba(6, 17, 31, 0.8) 100%)',
            border: '1px solid rgba(255, 71, 87, 0.2)',
            borderRadius: '12px',
            padding: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '14px'
          }}
        >
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '10px',
              background: 'rgba(255, 71, 87, 0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FF4757'
            }}
          >
            <Power size={20} />
          </div>
          <div>
            <div style={{ fontSize: '11px', color: '#FF4757', fontWeight: 700, textTransform: 'uppercase' }}>
              Désactivés / Inactifs
            </div>
            <div style={{ fontSize: '22px', fontWeight: 800, color: '#FF4757' }}>
              {stats?.deactivatedUsers ?? '…'}
            </div>
          </div>
        </div>
      </div>

      {/* ─── Barre de Recherche & Filtres ─── */}
      <div
        style={{
          background: 'rgba(10, 24, 40, 0.75)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '12px',
          padding: '14px 18px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          flexWrap: 'wrap'
        }}
      >
        <form onSubmit={handleSearchSubmit} style={{ flex: 1, minWidth: '240px', position: 'relative' }}>
          <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher par nom, username, email..."
            style={{
              width: '100%',
              padding: '8px 12px 8px 36px',
              background: 'rgba(6, 17, 31, 0.8)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '8px',
              color: '#F0F4F8',
              fontSize: '12px',
              outline: 'none'
            }}
          />
        </form>

        {/* Filtre Présence */}
        <select
          value={presenceFilter}
          onChange={(e) => setPresenceFilter(e.target.value)}
          style={{
            padding: '8px 12px',
            background: 'rgba(6, 17, 31, 0.8)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '8px',
            color: '#CBD5E1',
            fontSize: '12px',
            cursor: 'pointer'
          }}
        >
          <option value="all">Toutes présences</option>
          <option value="online">🟢 En ligne</option>
          <option value="offline">⚪ Hors ligne</option>
        </select>

        {/* Filtre Rôle */}
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          style={{
            padding: '8px 12px',
            background: 'rgba(6, 17, 31, 0.8)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '8px',
            color: '#CBD5E1',
            fontSize: '12px',
            cursor: 'pointer'
          }}
        >
          <option value="all">Tous les rôles</option>
          <option value="Administrator">Administrateurs</option>
          <option value="Utilisateur">Utilisateurs standards</option>
        </select>

        {/* Filtre Statut */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{
            padding: '8px 12px',
            background: 'rgba(6, 17, 31, 0.8)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '8px',
            color: '#CBD5E1',
            fontSize: '12px',
            cursor: 'pointer'
          }}
        >
          <option value="all">Tous les statuts</option>
          <option value="active">Actif</option>
          <option value="deactivated">Désactivé</option>
          <option value="pending_activation">En attente</option>
        </select>
      </div>

      {/* ─── Table des Utilisateurs (Supervision & Suivi) ─── */}
      <div
        style={{
          background: 'rgba(10, 24, 40, 0.8)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '12px',
          overflow: 'hidden',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
        }}
      >
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
            <thead>
              <tr style={{ background: 'rgba(6, 17, 31, 0.9)', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
                <th style={{ padding: '14px 18px', color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase', fontSize: '10px' }}>Utilisateur</th>
                <th style={{ padding: '14px 18px', color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase', fontSize: '10px' }}>Rôle & Tenant</th>
                <th style={{ padding: '14px 18px', color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase', fontSize: '10px' }}>Agents Autorisés</th>
                <th style={{ padding: '14px 18px', color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase', fontSize: '10px' }}>Statut & Présence</th>
                <th style={{ padding: '14px 18px', color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase', fontSize: '10px' }}>Dernière Activité</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={5} style={{ padding: '40px', textAlign: 'center', color: '#94A3B8' }}>
                    <RefreshCw size={24} className="spin" style={{ margin: '0 auto 10px auto', display: 'block', color: '#00E5C8' }} />
                    Chargement des utilisateurs...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: '40px', textAlign: 'center', color: '#94A3B8' }}>
                    Aucun utilisateur trouvé avec ces critères de recherche.
                  </td>
                </tr>
              ) : (
                users.map((user) => {
                  const isAdminRole = ['Administrator', 'Administrators', 'Admin'].includes(user.role);
                  const isDeactivated = user.status === 'deactivated';

                  return (
                    <tr
                      key={user.id}
                      style={{
                        borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                        transition: 'background 0.15s ease'
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      {/* Utilisateur (Avatar, Nom, Email) */}
                      <td style={{ padding: '14px 18px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{ position: 'relative' }}>
                            <div
                              style={{
                                width: '38px',
                                height: '38px',
                                borderRadius: '10px',
                                background: isAdminRole ? 'rgba(255, 184, 0, 0.15)' : 'rgba(0, 229, 200, 0.12)',
                                border: `1px solid ${isAdminRole ? 'rgba(255, 184, 0, 0.35)' : 'rgba(0, 229, 200, 0.25)'}`,
                                color: isAdminRole ? '#FFB800' : '#00E5C8',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: 800,
                                fontSize: '13px'
                              }}
                            >
                              {(user.firstName ? user.firstName[0] : user.username[0] || 'U').toUpperCase()}
                            </div>
                            {/* Pastille présence en ligne */}
                            <span
                              title={user.isOnline ? `En ligne (${user.activeSessionsCount} session(s) active(s))` : 'Hors ligne'}
                              style={{
                                position: 'absolute',
                                bottom: '-2px',
                                right: '-2px',
                                width: '10px',
                                height: '10px',
                                borderRadius: '50%',
                                backgroundColor: user.isOnline ? '#00E5C8' : '#64748B',
                                border: '2px solid #0A1828',
                                boxShadow: user.isOnline ? '0 0 8px #00E5C8' : 'none'
                              }}
                            />
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, color: '#F0F4F8', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span>{user.firstName ? `${user.firstName} ${user.lastName}` : user.username}</span>
                              <span style={{ fontSize: '10px', color: '#64748B' }}>@{user.username}</span>
                            </div>
                            <div style={{ fontSize: '11px', color: '#94A3B8' }}>{user.email}</div>
                          </div>
                        </div>
                      </td>

                      {/* Rôle & Tenant */}
                      <td style={{ padding: '14px 18px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              fontSize: '10px',
                              fontWeight: 700,
                              textTransform: 'uppercase',
                              width: 'fit-content',
                              background: isAdminRole ? 'rgba(255, 184, 0, 0.12)' : 'rgba(99, 102, 241, 0.12)',
                              color: isAdminRole ? '#FFB800' : '#818CF8',
                              border: `1px solid ${isAdminRole ? 'rgba(255, 184, 0, 0.3)' : 'rgba(99, 102, 241, 0.25)'}`
                            }}
                          >
                            {isAdminRole ? '★ Administrateur' : 'Utilisateur'}
                          </span>
                          <span style={{ fontSize: '11px', color: '#64748B' }}>
                            Client: <strong style={{ color: '#94A3B8' }}>{user.defaultClientId}</strong>
                          </span>
                        </div>
                      </td>

                      {/* Agents Autorisés */}
                      <td style={{ padding: '14px 18px' }}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', maxWidth: '240px' }}>
                          {user.allowedAgents && user.allowedAgents.length > 0 ? (
                            user.allowedAgents.map((ag) => {
                              const meta = ALL_AVAILABLE_AGENTS.find(a => a.code === ag);
                              return (
                                <span
                                  key={ag}
                                  title={meta?.name || ag}
                                  style={{
                                    fontSize: '9.5px',
                                    fontWeight: 700,
                                    padding: '1px 6px',
                                    borderRadius: '3px',
                                    background: 'rgba(15, 32, 53, 0.9)',
                                    color: meta?.color || '#00E5C8',
                                    border: `1px solid ${meta?.color ? `${meta.color}40` : 'rgba(0, 229, 200, 0.2)'}`
                                  }}
                                >
                                  {ag}
                                </span>
                              );
                            })
                          ) : (
                            <span style={{ fontSize: '11px', color: '#64748B', fontStyle: 'italic' }}>Aucun agent</span>
                          )}
                        </div>
                      </td>

                      {/* Statut & Présence */}
                      <td style={{ padding: '14px 18px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span
                              style={{
                                width: '6px',
                                height: '6px',
                                borderRadius: '50%',
                                backgroundColor: isDeactivated ? '#FF4757' : '#10B981',
                                display: 'inline-block'
                              }}
                            />
                            <span
                              style={{
                                fontSize: '11px',
                                fontWeight: 700,
                                color: isDeactivated ? '#FF4757' : '#10B981'
                              }}
                            >
                              {isDeactivated ? 'Désactivé' : 'Actif'}
                            </span>
                          </div>
                          <span style={{ fontSize: '10px', color: user.isOnline ? '#00E5C8' : '#64748B' }}>
                            {user.isOnline ? `● En ligne (${user.activeSessionsCount})` : '○ Hors ligne'}
                          </span>
                        </div>
                      </td>

                      {/* Dernière Activité (Date, IP) */}
                      <td style={{ padding: '14px 18px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <span style={{ color: '#E2E8F0', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Clock size={11} style={{ color: '#94A3B8' }} />
                            {formatRelativeDate(user.lastLoginAt)}
                          </span>
                          <span style={{ color: '#64748B', fontSize: '10px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Laptop size={11} />
                            IP: {user.lastIp || 'N/A'}
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ─── Pagination Footer ─── */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 18px',
            borderTop: '1px solid rgba(255, 255, 255, 0.06)',
            background: 'rgba(6, 17, 31, 0.95)',
            fontSize: '11px',
            color: '#94A3B8'
          }}
        >
          <div>
            Total : <strong style={{ color: '#F0F4F8' }}>{total}</strong> utilisateur{total > 1 ? 's' : ''} (Page {page} / {totalPages})
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={() => { const p = Math.max(1, page - 1); setPage(p); fetchUsers(p); }}
              disabled={page <= 1 || isLoading}
              style={{
                padding: '5px 10px',
                background: 'rgba(15, 32, 53, 0.8)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '6px',
                color: page <= 1 ? '#475569' : '#00E5C8',
                cursor: page <= 1 ? 'not-allowed' : 'pointer'
              }}
            >
              <ChevronLeft size={13} />
            </button>
            <button
              onClick={() => { const p = Math.min(totalPages, page + 1); setPage(p); fetchUsers(p); }}
              disabled={page >= totalPages || isLoading}
              style={{
                padding: '5px 10px',
                background: 'rgba(15, 32, 53, 0.8)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '6px',
                color: page >= totalPages ? '#475569' : '#00E5C8',
                cursor: page >= totalPages ? 'not-allowed' : 'pointer'
              }}
            >
              <ChevronRight size={13} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
