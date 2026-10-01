'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Server,
  Plus,
  X,
  Search,
  CheckCircle2,
  AlertTriangle,
  Edit2,
  Trash2,
  Globe,
  Database,
  Folder,
  Layers,
  Eye,
  EyeOff,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  RotateCcw
} from 'lucide-react';
import { jwtDecode } from 'jwt-decode';

export interface TenantFull {
  client_id: string;
  display_name: string;
  mcp_base_url: string | null;
  active: boolean;
  created_at?: string;
  updated_at?: string;
  erp_url: string | null;
  db_server: string | null;
  db_port: number | null;
  db_database: string | null;
  db_user: string | null;
  db_password?: string | null;
  config_database: string | null;
  path_vd: string | null;
  path_e255: string | null;
}

interface TralisInstancesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTenantChanged?: () => void;
  isAdmin?: boolean;
}

function checkIsVmindAdmin(isAdminProp?: boolean): boolean {
  if (typeof isAdminProp === 'boolean') return isAdminProp;
  return true;
}

// ── COMPOSANT CHAMP AVEC LABEL FLOTTANT (STYLE NOTCHED OUTLINE) ───────────────
interface FloatingInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  required?: boolean;
  mono?: boolean;
  surfaceBg?: string;
  rightElement?: React.ReactNode;
  hasError?: boolean;
}

const FloatingInput: React.FC<FloatingInputProps> = ({
  label,
  value,
  onChange,
  onFocus,
  onBlur,
  required,
  mono,
  surfaceBg = '#081226',
  rightElement,
  disabled,
  style,
  type = 'text',
  placeholder,
  hasError,
  ...rest
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const hasValue = value !== undefined && value !== null && String(value).trim() !== '';
  const isFloated = isFocused || hasValue;
  const isError = Boolean(hasError);

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <input
        type={type}
        value={value}
        onChange={onChange}
        disabled={disabled}
        required={required}
        placeholder={isFloated && placeholder ? placeholder : ''}
        onFocus={(e) => {
          setIsFocused(true);
          if (onFocus) onFocus(e);
        }}
        onBlur={(e) => {
          setIsFocused(false);
          if (onBlur) onBlur(e);
        }}
        style={{
          width: '100%',
          height: '42px',
          background: disabled
            ? 'rgba(255, 255, 255, 0.03)'
            : isError
            ? 'rgba(255, 71, 87, 0.08)'
            : 'rgba(15, 23, 42, 0.75)',
          border: `1px solid ${
            isError
              ? '#FF4757'
              : isFocused
              ? '#00E5C8'
              : isFloated
              ? 'rgba(255, 255, 255, 0.22)'
              : 'rgba(255, 255, 255, 0.14)'
          }`,
          borderRadius: '8px',
          padding: rightElement ? '10px 38px 10px 14px' : '10px 14px',
          color: '#FFFFFF',
          fontSize: '12px',
          fontFamily: mono ? 'JetBrains Mono, monospace' : 'inherit',
          outline: 'none',
          boxShadow: isError
            ? '0 0 10px rgba(255, 71, 87, 0.3)'
            : isFocused
            ? '0 0 10px rgba(0, 229, 200, 0.2)'
            : 'none',
          transition: 'all 0.18s ease-in-out',
          boxSizing: 'border-box',
          ...style
        }}
        {...rest}
      />
      <label
        style={{
          position: 'absolute',
          left: '12px',
          pointerEvents: 'none',
          transition: 'all 0.18s cubic-bezier(0.4, 0, 0.2, 1)',
          padding: '0 6px',
          background: isFloated ? surfaceBg : 'transparent',
          borderRadius: '4px',
          top: isFloated ? '-8px' : '50%',
          transform: isFloated ? 'none' : 'translateY(-50%)',
          fontSize: isFloated ? '10px' : '12px',
          fontWeight: isFloated ? 600 : 400,
          color: isError
            ? '#FF6B7A'
            : isFocused
            ? '#00E5C8'
            : isFloated
            ? '#94A3B8'
            : '#64748B',
          letterSpacing: isFloated ? '0.02em' : 'normal',
          lineHeight: '1',
          zIndex: 2,
          userSelect: 'none'
        }}
      >
        {label} {required && <span style={{ color: isError ? '#FF4757' : '#FF6B7A' }}>*</span>}
      </label>
      {rightElement && (
        <div
          style={{
            position: 'absolute',
            right: '12px',
            top: '50%',
            transform: 'translateY(-50%)',
            display: 'flex',
            alignItems: 'center',
            zIndex: 3
          }}
        >
          {rightElement}
        </div>
      )}
    </div>
  );
};

export const TralisInstancesModal: React.FC<TralisInstancesModalProps> = ({
  isOpen,
  onClose,
  onTenantChanged,
  isAdmin
}) => {
  const [tenants, setTenants] = useState<TenantFull[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // ── Configuration des largeurs de colonnes & redimensionnement dynamique ───
  const DEFAULT_COL_WIDTHS = useMemo(
    () => ({
      erp: 280,
      mcp: 240,
      sql: 220,
      config: 160,
      paths: 280
    }),
    []
  );

  const [colWidths, setColWidths] = useState<{ [key: string]: number }>({
    erp: 280,
    mcp: 240,
    sql: 220,
    config: 160,
    paths: 280
  });

  const [activeResizing, setActiveResizing] = useState<string | null>(null);

  const colPreset = useMemo(() => {
    if (colWidths.erp === 180 && colWidths.mcp === 160) return 'compact';
    if (colWidths.erp === 280 && colWidths.mcp === 240) return 'standard';
    if (colWidths.erp === 400 && colWidths.mcp === 340) return 'wide';
    return 'custom';
  }, [colWidths]);

  const handleStartResize = (key: string, startEvent: React.MouseEvent) => {
    startEvent.preventDefault();
    startEvent.stopPropagation();
    setActiveResizing(key);

    const startX = startEvent.clientX;
    const startW = colWidths[key] || 200;
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'col-resize';

    const onMouseMove = (moveEvent: MouseEvent) => {
      const delta = moveEvent.clientX - startX;
      const nextW = Math.max(90, Math.min(800, startW + delta));
      setColWidths(prev => ({ ...prev, [key]: nextW }));
    };

    const onMouseUp = () => {
      setActiveResizing(null);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const handleResetWidths = () => {
    setColWidths(DEFAULT_COL_WIDTHS);
  };

  // Formulaire d'édition / création
  const [showFormModal, setShowFormModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const isFieldMissing = (val: any) => {
    if (!hasAttemptedSubmit) return false;
    return val === undefined || val === null || String(val).trim() === '';
  };

  const handleCloseForm = () => {
    setShowFormModal(false);
    setFormError(null);
    setHasAttemptedSubmit(false);
    setError(null);
  };

  // Form State
  const [formData, setFormData] = useState<Partial<TenantFull>>({
    client_id: '',
    display_name: '',
    active: true,
    erp_url: 'http://localhost',
    mcp_base_url: 'https://localhost:3002/mcp',
    db_server: 'localhost',
    db_port: 1433,
    db_database: '',
    db_user: 'mcp_user',
    db_password: '',
    config_database: 'TMS_Config',
    path_vd: 'C:\\TRaLis SMTI\\PROD\\Site\\VD',
    path_e255: 'C:\\TRaLis SMTI\\PROD\\Site\\E255'
  });

  // Modal de confirmation de suppression
  const [tenantToDelete, setTenantToDelete] = useState<string | null>(null);

  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'https://localhost:3001';

  // ── Chargement des instances ───────────────────────────────────────────────
  const fetchTenants = async () => {
    if (!checkIsVmindAdmin(isAdmin)) {
      setError('Accès réservé aux administrateurs VMIND.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${baseUrl}/api/admin/tenants/getAll`, {
        credentials: 'include'
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setTenants(data.tenants || []);
      } else {
        setError(data.error || 'Impossible de récupérer la liste des instances.');
      }
    } catch (err: any) {
      setError(err?.message || 'Erreur réseau lors de la communication avec le backend.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchTenants();
      setError(null);
      setSuccessMsg(null);
    }
  }, [isOpen]);

  // ── Filtrage ───────────────────────────────────────────────────────────────
  const filteredTenants = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return tenants;
    return tenants.filter(
      t =>
        t.client_id.toLowerCase().includes(q) ||
        t.display_name.toLowerCase().includes(q) ||
        (t.db_database && t.db_database.toLowerCase().includes(q)) ||
        (t.erp_url && t.erp_url.toLowerCase().includes(q))
    );
  }, [tenants, searchTerm]);

  const activeCount = useMemo(() => tenants.filter(t => t.active).length, [tenants]);

  // ── Ouverture modal création ──────────────────────────────────────────────
  const handleOpenCreate = () => {
    setIsEditing(false);
    setHasAttemptedSubmit(false);
    setError(null);
    setFormError(null);
    setFormData({
      client_id: '',
      display_name: '',
      active: true,
      erp_url: 'http://localhost',
      mcp_base_url: 'https://localhost:3002/mcp',
      db_server: 'localhost',
      db_port: 1433,
      db_database: '',
      db_user: 'mcp_user',
      db_password: '',
      config_database: 'TMS_Config',
      path_vd: 'C:\\TRaLis SMTI\\PROD\\Site\\VD',
      path_e255: 'C:\\TRaLis SMTI\\PROD\\Site\\E255'
    });
    setShowPassword(false);
    setShowFormModal(true);
  };

  // ── Ouverture modal édition ───────────────────────────────────────────────
  const handleOpenEdit = (tenant: TenantFull) => {
    setIsEditing(true);
    setHasAttemptedSubmit(false);
    setError(null);
    setFormError(null);
    setFormData({
      ...tenant,
      db_password: tenant.db_password || ''
    });
    setShowPassword(false);
    setShowFormModal(true);
  };

  // ── Bascule de statut actif/inactif ─────────────────────────────────────────
  const handleToggleStatus = async (client_id: string, currentActive: boolean) => {
    try {
      const res = await fetch(`${baseUrl}/api/admin/tenants/toggle-status/${client_id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ active: !currentActive })
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setSuccessMsg(`Instance ${client_id} ${!currentActive ? 'activée' : 'désactivée'}.`);
        fetchTenants();
        if (onTenantChanged) onTenantChanged();
      } else {
        setError(data.error || 'Échec de la modification du statut.');
      }
    } catch (err: any) {
      setError(err?.message || 'Erreur réseau.');
    }
  };

  // ── Soumission Formulaire (Ajout ou Modification) ──────────────────────────
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setHasAttemptedSubmit(true);
    setFormError(null);

    // Validation explicite des champs obligatoires (tous sauf les chemins de fichiers)
    const hasMissingFields =
      !formData.client_id?.trim() ||
      !formData.display_name?.trim() ||
      !formData.erp_url?.trim() ||
      !formData.mcp_base_url?.trim() ||
      !formData.db_server?.trim() ||
      !formData.db_port ||
      !formData.db_database?.trim() ||
      !formData.config_database?.trim() ||
      !formData.db_user?.trim() ||
      (!isEditing && !formData.db_password?.trim());

    if (hasMissingFields) {
      setFormError('Champs obligatoires manquants : remplir tous les champs surlignés en rouge.');
      return;
    }

    setActionLoading(true);

    try {
      const endpoint = isEditing
        ? `${baseUrl}/api/admin/tenants/update/${formData.client_id}`
        : `${baseUrl}/api/admin/tenants/add`;

      const method = isEditing ? 'PUT' : 'POST';

      const res = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(formData)
      });

      const data = await res.json();
      if (res.ok && data.ok) {
        setSuccessMsg(
          isEditing
            ? `Instance ${formData.client_id} mise à jour avec succès.`
            : `Nouvelle instance ${formData.client_id} créée avec succès.`
        );
        handleCloseForm();
        fetchTenants();
        if (onTenantChanged) onTenantChanged();
      } else {
        setFormError(data.error || 'Erreur lors de l’enregistrement de l’instance.');
      }
    } catch (err: any) {
      setFormError(err?.message || 'Erreur réseau lors de la sauvegarde.');
    } finally {
      setActionLoading(false);
    }
  };

  // ── Confirmation suppression ──────────────────────────────────────────────
  const handleConfirmDelete = async () => {
    if (!tenantToDelete) return;
    setActionLoading(true);
    try {
      const res = await fetch(`${baseUrl}/api/admin/tenants/delete/${tenantToDelete}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setSuccessMsg(`Instance ${tenantToDelete} supprimée avec succès.`);
        setTenantToDelete(null);
        fetchTenants();
        if (onTenantChanged) onTenantChanged();
      } else {
        setError(data.error || 'Erreur lors de la suppression.');
      }
    } catch (err: any) {
      setError(err?.message || 'Erreur réseau lors de la suppression.');
    } finally {
      setActionLoading(false);
    }
  };

  if (!isOpen || !checkIsVmindAdmin(isAdmin)) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(2, 6, 18, 0.85)',
        backdropFilter: 'blur(16px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        animation: 'fadeIn 0.2s ease-out'
      }}
    >
      {/* ── CONTENEUR PRINCIPAL ─────────────────────────────────────────────── */}
      <div
        style={{
          width: '100%',
          maxWidth: '1050px',
          maxHeight: '90vh',
          background: 'linear-gradient(180deg, rgba(10, 20, 38, 0.98) 0%, rgba(5, 12, 24, 0.98) 100%)',
          border: '1px solid rgba(0, 229, 200, 0.25)',
          borderRadius: '16px',
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.8), 0 0 30px rgba(0, 229, 200, 0.08)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}
      >
        {/* Style CSS pour les rubans de propriétés défilables horizontalement */}
        <style>{`
          .vmind-horizontal-properties-row::-webkit-scrollbar {
            height: 5px;
          }
          .vmind-horizontal-properties-row::-webkit-scrollbar-track {
            background: rgba(5, 12, 24, 0.7);
            border-radius: 4px;
          }
          .vmind-horizontal-properties-row::-webkit-scrollbar-thumb {
            background: rgba(0, 229, 200, 0.25);
            border-radius: 4px;
          }
          .vmind-horizontal-properties-row::-webkit-scrollbar-thumb:hover {
            background: rgba(0, 229, 200, 0.55);
          }
        `}</style>

        {/* ── EN-TÊTE MODAL ─────────────────────────────────────────────────── */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'rgba(5, 12, 24, 0.6)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: '12px',
                background: 'rgba(130, 80, 255, 0.12)',
                border: '1px solid rgba(130, 80, 255, 0.35)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#B088FF'
              }}
            >
              <Server size={22} />
            </div>
            <div>
              <h2
                style={{
                  margin: 0,
                  fontSize: '18px',
                  fontWeight: 800,
                  fontFamily: 'Orbitron, sans-serif',
                  letterSpacing: '0.04em',
                  color: '#FFFFFF'
                }}
              >
                Instances TraLIS <span style={{ color: '#00E5C8' }}>Multi-Tenant</span>
              </h2>
              <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#8FA3B8' }}>
                Référentiel centralisé des instances et bases de données ERP (<code style={{ color: '#00E5C8' }}>vmind_tenants</code>)
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              onClick={handleOpenCreate}
              style={{
                background: 'linear-gradient(90deg, #00E5C8 0%, #21F3D6 100%)',
                color: '#021010',
                border: 'none',
                padding: '9px 16px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 0 15px rgba(0, 229, 200, 0.25)',
                transition: 'all 0.2s'
              }}
            >
              <Plus size={16} /> Nouvelle Instance
            </button>
            <button
              onClick={onClose}
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: '#8FA3B8',
                width: 36,
                height: 36,
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.15s'
              }}
              onMouseOver={e => (e.currentTarget.style.color = '#FFF')}
              onMouseOut={e => (e.currentTarget.style.color = '#8FA3B8')}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* ── BARRE DE CONTRÔLE (RECHERCHE & STATS) ─────────────────────────── */}
        <div
          style={{
            padding: '14px 24px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
            background: 'rgba(3, 8, 18, 0.4)'
          }}
        >
          <div
            style={{
              position: 'relative',
              flex: 1,
              maxWidth: '420px'
            }}
          >
            <Search
              size={15}
              style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#64748B'
              }}
            />
            <input
              type="text"
              placeholder="Rechercher par code, nom, base ou URL..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                background: 'rgba(15, 23, 42, 0.8)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: '8px',
                padding: '8px 12px 8px 36px',
                color: '#FFFFFF',
                fontSize: '12px',
                outline: 'none'
              }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {/* Préréglages de largeur de colonnes */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                background: 'rgba(255, 255, 255, 0.04)',
                padding: '3px 6px',
                borderRadius: '8px',
                border: '1px solid rgba(255, 255, 255, 0.08)'
              }}
            >
              <span style={{ fontSize: '11px', color: '#64748B', paddingRight: '4px' }}>Colonnes :</span>
              <button
                type="button"
                onClick={() => setColWidths({ erp: 180, mcp: 160, sql: 160, config: 120, paths: 180 })}
                title="Format compact avec troncature automatique (...)"
                style={{
                  background: colPreset === 'compact' ? 'rgba(0, 229, 200, 0.15)' : 'transparent',
                  border: colPreset === 'compact' ? '1px solid rgba(0, 229, 200, 0.3)' : '1px solid transparent',
                  color: colPreset === 'compact' ? '#00E5C8' : '#8FA3B8',
                  fontSize: '11px',
                  fontWeight: 600,
                  padding: '3px 8px',
                  borderRadius: '5px',
                  cursor: 'pointer',
                  transition: 'all 0.15s'
                }}
              >
                Compact
              </button>
              <button
                type="button"
                onClick={() => setColWidths(DEFAULT_COL_WIDTHS)}
                title="Format standard équilibré"
                style={{
                  background: colPreset === 'standard' ? 'rgba(0, 229, 200, 0.15)' : 'transparent',
                  border: colPreset === 'standard' ? '1px solid rgba(0, 229, 200, 0.3)' : '1px solid transparent',
                  color: colPreset === 'standard' ? '#00E5C8' : '#8FA3B8',
                  fontSize: '11px',
                  fontWeight: 600,
                  padding: '3px 8px',
                  borderRadius: '5px',
                  cursor: 'pointer',
                  transition: 'all 0.15s'
                }}
              >
                Standard
              </button>
              <button
                type="button"
                onClick={() => setColWidths({ erp: 400, mcp: 340, sql: 300, config: 220, paths: 380 })}
                title="Format large étendu (défilement horizontal complet)"
                style={{
                  background: colPreset === 'wide' ? 'rgba(0, 229, 200, 0.15)' : 'transparent',
                  border: colPreset === 'wide' ? '1px solid rgba(0, 229, 200, 0.3)' : '1px solid transparent',
                  color: colPreset === 'wide' ? '#00E5C8' : '#8FA3B8',
                  fontSize: '11px',
                  fontWeight: 600,
                  padding: '3px 8px',
                  borderRadius: '5px',
                  cursor: 'pointer',
                  transition: 'all 0.15s'
                }}
              >
                Large
              </button>
              <button
                type="button"
                onClick={handleResetWidths}
                title="Réinitialiser les largeurs des colonnes"
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#64748B',
                  padding: '4px 6px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'color 0.15s'
                }}
                onMouseOver={e => (e.currentTarget.style.color = '#FFF')}
                onMouseOut={e => (e.currentTarget.style.color = '#64748B')}
              >
                <RotateCcw size={12} />
              </button>
            </div>

            <span
              style={{
                fontSize: '12px',
                padding: '4px 10px',
                borderRadius: '6px',
                background: 'rgba(255, 255, 255, 0.05)',
                color: '#8FA3B8',
                border: '1px solid rgba(255, 255, 255, 0.08)'
              }}
            >
              Total : <strong style={{ color: '#FFF' }}>{tenants.length}</strong>
            </span>
            <span
              style={{
                fontSize: '12px',
                padding: '4px 10px',
                borderRadius: '6px',
                background: 'rgba(0, 229, 200, 0.1)',
                color: '#00E5C8',
                border: '1px solid rgba(0, 229, 200, 0.25)'
              }}
            >
              Actives : <strong>{activeCount}</strong>
            </span>
            <button
              onClick={fetchTenants}
              title="Rafraîchir la liste"
              style={{
                background: 'transparent',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: '#8FA3B8',
                padding: '7px',
                borderRadius: '8px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* ── MESSAGES RETOUR (ERREURS / SUCCÈS) ────────────────────────────── */}
        {error && (
          <div
            style={{
              margin: '16px 24px 0 24px',
              padding: '12px 16px',
              borderRadius: '8px',
              background: 'rgba(255, 71, 87, 0.12)',
              border: '1px solid rgba(255, 71, 87, 0.35)',
              color: '#FF6B7A',
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '10px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <AlertTriangle size={16} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
            <button
              type="button"
              onClick={() => setError(null)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#FF6B7A',
                cursor: 'pointer',
                padding: '2px',
                display: 'flex',
                alignItems: 'center'
              }}
            >
              <X size={14} />
            </button>
          </div>
        )}

        {successMsg && (
          <div
            style={{
              margin: '16px 24px 0 24px',
              padding: '12px 16px',
              borderRadius: '8px',
              background: 'rgba(0, 229, 200, 0.12)',
              border: '1px solid rgba(0, 229, 200, 0.35)',
              color: '#00E5C8',
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '10px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
              <span>{successMsg}</span>
            </div>
            <button
              type="button"
              onClick={() => setSuccessMsg(null)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#00E5C8',
                cursor: 'pointer',
                padding: '2px',
                display: 'flex',
                alignItems: 'center'
              }}
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* ── LISTE DES INSTANCES ────────────────────────────────────────────── */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '20px 24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}
        >
          {loading && tenants.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: '#8FA3B8' }}>
              <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 12px auto', color: '#00E5C8' }} />
              <div>Chargement des instances TraLIS...</div>
            </div>
          ) : filteredTenants.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '60px 20px',
                color: '#64748B',
                border: '1px dashed rgba(255, 255, 255, 0.1)',
                borderRadius: '12px'
              }}
            >
              <Server size={36} style={{ margin: '0 auto 12px auto', opacity: 0.4 }} />
              <div style={{ fontSize: '14px', fontWeight: 600, color: '#94A3B8' }}>Aucune instance trouvée</div>
              <div style={{ fontSize: '12px', marginTop: '4px' }}>
                {searchTerm ? 'Aucun résultat ne correspond aux critères de recherche.' : 'Utiliser le bouton "+ Nouvelle Instance" pour créer une première instance.'}
              </div>
            </div>
          ) : (
            filteredTenants.map(t => (
              <div
                key={t.client_id}
                style={{
                  background: 'rgba(15, 23, 42, 0.65)',
                  border: t.active ? '1px solid rgba(0, 229, 200, 0.18)' : '1px solid rgba(255, 255, 255, 0.07)',
                  borderRadius: '12px',
                  padding: '16px 20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  transition: 'all 0.2s',
                  position: 'relative'
                }}
              >
                {/* Ligne 1 : Titre, Code, Statut et Actions */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span
                      style={{
                        padding: '4px 10px',
                        borderRadius: '6px',
                        fontFamily: 'JetBrains Mono, monospace',
                        fontSize: '12px',
                        fontWeight: 700,
                        letterSpacing: '0.04em',
                        background: 'rgba(0, 229, 200, 0.12)',
                        color: '#00E5C8',
                        border: '1px solid rgba(0, 229, 200, 0.3)'
                      }}
                    >
                      {t.client_id}
                    </span>
                    <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#FFFFFF' }}>
                      {t.display_name}
                    </h3>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {/* Toggle Statut */}
                    <button
                      onClick={() => handleToggleStatus(t.client_id, t.active)}
                      style={{
                        background: t.active ? 'rgba(0, 229, 200, 0.1)' : 'rgba(255, 255, 255, 0.05)',
                        border: t.active ? '1px solid rgba(0, 229, 200, 0.3)' : '1px solid rgba(255, 255, 255, 0.1)',
                        color: t.active ? '#00E5C8' : '#64748B',
                        padding: '5px 12px',
                        borderRadius: '20px',
                        fontSize: '11px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        transition: 'all 0.15s'
                      }}
                    >
                      <span
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: '50%',
                          background: t.active ? '#00E5C8' : '#64748B',
                          boxShadow: t.active ? '0 0 6px #00E5C8' : 'none'
                        }}
                      />
                      {t.active ? 'Actif' : 'Inactif'}
                    </button>

                    {/* Bouton Modifier */}
                    <button
                      onClick={() => handleOpenEdit(t)}
                      title="Modifier cette instance"
                      style={{
                        background: 'rgba(130, 80, 255, 0.1)',
                        border: '1px solid rgba(130, 80, 255, 0.25)',
                        color: '#B088FF',
                        padding: '6px 12px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        transition: 'all 0.15s'
                      }}
                      onMouseOver={e => (e.currentTarget.style.background = 'rgba(130, 80, 255, 0.2)')}
                      onMouseOut={e => (e.currentTarget.style.background = 'rgba(130, 80, 255, 0.1)')}
                    >
                      <Edit2 size={13} /> Modifier
                    </button>

                    {/* Bouton Supprimer */}
                    <button
                      onClick={() => setTenantToDelete(t.client_id)}
                      title="Supprimer cette instance"
                      style={{
                        background: 'rgba(255, 71, 87, 0.08)',
                        border: '1px solid rgba(255, 71, 87, 0.2)',
                        color: '#FF6B7A',
                        padding: '6px 10px',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.15s'
                      }}
                      onMouseOver={e => (e.currentTarget.style.background = 'rgba(255, 71, 87, 0.18)')}
                      onMouseOut={e => (e.currentTarget.style.background = 'rgba(255, 71, 87, 0.08)')}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* Ligne 2 : Ruban des propriétés à défilement horizontal et colonnes redimensionnables */}
                <div
                  className="vmind-horizontal-properties-row"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '10px 14px',
                    background: 'rgba(5, 12, 24, 0.6)',
                    borderRadius: '8px',
                    border: '1px solid rgba(255, 255, 255, 0.05)',
                    overflowX: 'auto',
                    overflowY: 'hidden',
                    scrollbarWidth: 'thin',
                    scrollbarColor: 'rgba(0, 229, 200, 0.25) rgba(5, 12, 24, 0.5)'
                  }}
                >
                  {/* Colonne 1 : ERP URL */}
                  <div
                    style={{
                      width: colWidths.erp,
                      minWidth: colWidths.erp,
                      maxWidth: colWidths.erp,
                      flexShrink: 0,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      position: 'relative',
                      paddingRight: '12px',
                      borderRight: '1px solid rgba(255, 255, 255, 0.08)'
                    }}
                  >
                    <Globe size={13} style={{ color: '#00E5C8', flexShrink: 0 }} />
                    <span style={{ color: '#64748B', fontSize: '11px', flexShrink: 0 }}>ERP :</span>
                    <span
                      title={t.erp_url || 'Non configuré'}
                      style={{
                        color: '#E2E8F0',
                        fontFamily: 'JetBrains Mono, monospace',
                        fontSize: '11px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        flex: 1,
                        minWidth: 0
                      }}
                    >
                      {t.erp_url || 'Non configuré'}
                    </span>

                    {/* Poignée de redimensionnement manuel */}
                    <div
                      onMouseDown={(e) => handleStartResize('erp', e)}
                      title="Glisser pour redimensionner la colonne ERP"
                      style={{
                        position: 'absolute',
                        right: '-6px',
                        top: 0,
                        bottom: 0,
                        width: '12px',
                        cursor: 'col-resize',
                        zIndex: 10,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        userSelect: 'none'
                      }}
                    >
                      <div
                        style={{
                          width: '2px',
                          height: '16px',
                          background: activeResizing === 'erp' ? '#00E5C8' : 'rgba(255, 255, 255, 0.2)',
                          borderRadius: '1px',
                          transition: 'background 0.15s'
                        }}
                      />
                    </div>
                  </div>

                  {/* Colonne 2 : MCP Base URL */}
                  <div
                    style={{
                      width: colWidths.mcp,
                      minWidth: colWidths.mcp,
                      maxWidth: colWidths.mcp,
                      flexShrink: 0,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      position: 'relative',
                      paddingRight: '12px',
                      borderRight: '1px solid rgba(255, 255, 255, 0.08)'
                    }}
                  >
                    <Server size={13} style={{ color: '#B088FF', flexShrink: 0 }} />
                    <span style={{ color: '#64748B', fontSize: '11px', flexShrink: 0 }}>MCP :</span>
                    <span
                      title={t.mcp_base_url || 'Local (Port 3002)'}
                      style={{
                        color: '#E2E8F0',
                        fontFamily: 'JetBrains Mono, monospace',
                        fontSize: '11px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        flex: 1,
                        minWidth: 0
                      }}
                    >
                      {t.mcp_base_url || 'Local (Port 3002)'}
                    </span>

                    {/* Poignée de redimensionnement manuel */}
                    <div
                      onMouseDown={(e) => handleStartResize('mcp', e)}
                      title="Glisser pour redimensionner la colonne MCP"
                      style={{
                        position: 'absolute',
                        right: '-6px',
                        top: 0,
                        bottom: 0,
                        width: '12px',
                        cursor: 'col-resize',
                        zIndex: 10,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        userSelect: 'none'
                      }}
                    >
                      <div
                        style={{
                          width: '2px',
                          height: '16px',
                          background: activeResizing === 'mcp' ? '#00E5C8' : 'rgba(255, 255, 255, 0.2)',
                          borderRadius: '1px',
                          transition: 'background 0.15s'
                        }}
                      />
                    </div>
                  </div>

                  {/* Colonne 3 : Base Métier & Serveur SQL */}
                  <div
                    style={{
                      width: colWidths.sql,
                      minWidth: colWidths.sql,
                      maxWidth: colWidths.sql,
                      flexShrink: 0,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      position: 'relative',
                      paddingRight: '12px',
                      borderRight: '1px solid rgba(255, 255, 255, 0.08)'
                    }}
                  >
                    <Database size={13} style={{ color: '#32AAFF', flexShrink: 0 }} />
                    <span style={{ color: '#64748B', fontSize: '11px', flexShrink: 0 }}>SQL :</span>
                    <span
                      title={`${t.db_database || 'Aucune base'} (${t.db_server || 'localhost'}:${t.db_port || 1433})`}
                      style={{
                        color: '#E2E8F0',
                        fontFamily: 'JetBrains Mono, monospace',
                        fontSize: '11px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        flex: 1,
                        minWidth: 0
                      }}
                    >
                      {t.db_database || 'Aucune base'} ({t.db_server || 'localhost'})
                    </span>

                    {/* Poignée de redimensionnement manuel */}
                    <div
                      onMouseDown={(e) => handleStartResize('sql', e)}
                      title="Glisser pour redimensionner la colonne SQL"
                      style={{
                        position: 'absolute',
                        right: '-6px',
                        top: 0,
                        bottom: 0,
                        width: '12px',
                        cursor: 'col-resize',
                        zIndex: 10,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        userSelect: 'none'
                      }}
                    >
                      <div
                        style={{
                          width: '2px',
                          height: '16px',
                          background: activeResizing === 'sql' ? '#00E5C8' : 'rgba(255, 255, 255, 0.2)',
                          borderRadius: '1px',
                          transition: 'background 0.15s'
                        }}
                      />
                    </div>
                  </div>

                  {/* Colonne 4 : Base Config DNN */}
                  <div
                    style={{
                      width: colWidths.config,
                      minWidth: colWidths.config,
                      maxWidth: colWidths.config,
                      flexShrink: 0,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      position: 'relative',
                      paddingRight: '12px',
                      borderRight: '1px solid rgba(255, 255, 255, 0.08)'
                    }}
                  >
                    <Layers size={13} style={{ color: '#FFB800', flexShrink: 0 }} />
                    <span style={{ color: '#64748B', fontSize: '11px', flexShrink: 0 }}>Config :</span>
                    <span
                      title={t.config_database || 'TMS_Config'}
                      style={{
                        color: '#E2E8F0',
                        fontFamily: 'JetBrains Mono, monospace',
                        fontSize: '11px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        flex: 1,
                        minWidth: 0
                      }}
                    >
                      {t.config_database || 'TMS_Config'}
                    </span>

                    {/* Poignée de redimensionnement manuel */}
                    <div
                      onMouseDown={(e) => handleStartResize('config', e)}
                      title="Glisser pour redimensionner la colonne Config"
                      style={{
                        position: 'absolute',
                        right: '-6px',
                        top: 0,
                        bottom: 0,
                        width: '12px',
                        cursor: 'col-resize',
                        zIndex: 10,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        userSelect: 'none'
                      }}
                    >
                      <div
                        style={{
                          width: '2px',
                          height: '16px',
                          background: activeResizing === 'config' ? '#00E5C8' : 'rgba(255, 255, 255, 0.2)',
                          borderRadius: '1px',
                          transition: 'background 0.15s'
                        }}
                      />
                    </div>
                  </div>

                  {/* Colonne 5 : Chemins Répertoires (VD / E255) */}
                  <div
                    style={{
                      width: colWidths.paths,
                      minWidth: colWidths.paths,
                      maxWidth: colWidths.paths,
                      flexShrink: 0,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      position: 'relative',
                      paddingRight: '12px'
                    }}
                  >
                    <Folder size={13} style={{ color: '#64748B', flexShrink: 0 }} />
                    <span style={{ color: '#64748B', fontSize: '11px', flexShrink: 0 }}>Chemins :</span>
                    <span
                      title={`VD: ${t.path_vd || 'N/A'} | E255: ${t.path_e255 || 'N/A'}`}
                      style={{
                        color: '#94A3B8',
                        fontFamily: 'JetBrains Mono, monospace',
                        fontSize: '11px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        flex: 1,
                        minWidth: 0
                      }}
                    >
                      {t.path_vd ? `VD: ${t.path_vd}` : ''}
                      {t.path_vd && t.path_e255 ? '  |  ' : ''}
                      {t.path_e255 ? `E255: ${t.path_e255}` : ''}
                      {!t.path_vd && !t.path_e255 ? 'Non définis' : ''}
                    </span>

                    {/* Poignée de redimensionnement manuel */}
                    <div
                      onMouseDown={(e) => handleStartResize('paths', e)}
                      title="Glisser pour redimensionner la colonne Chemins"
                      style={{
                        position: 'absolute',
                        right: '-6px',
                        top: 0,
                        bottom: 0,
                        width: '12px',
                        cursor: 'col-resize',
                        zIndex: 10,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        userSelect: 'none'
                      }}
                    >
                      <div
                        style={{
                          width: '2px',
                          height: '16px',
                          background: activeResizing === 'paths' ? '#00E5C8' : 'rgba(255, 255, 255, 0.2)',
                          borderRadius: '1px',
                          transition: 'background 0.15s'
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* ── PIED DE MODAL ─────────────────────────────────────────────────── */}
        <div
          style={{
            padding: '14px 24px',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'rgba(5, 12, 24, 0.7)',
            fontSize: '12px',
            color: '#64748B'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <ShieldCheck size={14} style={{ color: '#00E5C8' }} />
            <span>Toutes les modifications prennent effet immédiatement en mémoire (invalidation automatique du cache).</span>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              color: '#FFFFFF',
              padding: '7px 18px',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Fermer
          </button>
        </div>
      </div>

      {/* ── SOUS-MODAL FORMULAIRE (AJOUT / MODIFICATION) ──────────────────── */}
      {showFormModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 10000,
            background: 'rgba(0, 0, 0, 0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '680px',
              maxHeight: '92vh',
              background: '#081226',
              border: '1px solid rgba(0, 229, 200, 0.35)',
              borderRadius: '16px',
              boxShadow: '0 25px 60px rgba(0, 0, 0, 0.9), 0 0 25px rgba(0, 229, 200, 0.15)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden'
            }}
          >
            {/* Header Form */}
            <div
              style={{
                padding: '18px 24px',
                borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: 'rgba(15, 23, 42, 0.5)'
              }}
            >
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#FFF' }}>
                {isEditing ? `Modifier l'instance : ${formData.client_id}` : 'Ajouter une Nouvelle Instance TraLIS'}
              </h3>
              <button
                onClick={handleCloseForm}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#8FA3B8',
                  cursor: 'pointer'
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Form Fields */}
            <form noValidate onSubmit={handleSubmitForm} style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {/* Alerte Erreur dans le formulaire */}
                {formError && (
                  <div
                    style={{
                      padding: '10px 14px',
                      borderRadius: '8px',
                      background: 'rgba(255, 71, 87, 0.12)',
                      border: '1px solid rgba(255, 71, 87, 0.35)',
                      color: '#FF6B7A',
                      fontSize: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '8px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <AlertTriangle size={15} style={{ flexShrink: 0 }} />
                      <span>{formError}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setFormError(null)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#FF6B7A',
                        cursor: 'pointer',
                        padding: '2px',
                        display: 'flex',
                        alignItems: 'center'
                      }}
                    >
                      <X size={13} />
                    </button>
                  </div>
                )}

                {/* 1. Identification */}
                <div>
                  <h4 style={{ margin: '0 0 14px 0', fontSize: '13px', color: '#00E5C8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    1. Identification du Tenant
                  </h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '14px' }}>
                    <FloatingInput
                      label="Nom de l'instance"
                      required
                      disabled={isEditing}
                      mono
                      hasError={isFieldMissing(formData.client_id)}
                      value={formData.client_id || ''}
                      onChange={e => setFormData({ ...formData, client_id: e.target.value.toUpperCase() })}
                    />
                    <FloatingInput
                      label="Nom d'affichage"
                      required
                      hasError={isFieldMissing(formData.display_name)}
                      value={formData.display_name || ''}
                      onChange={e => setFormData({ ...formData, display_name: e.target.value })}
                    />
                  </div>

                  <div style={{ marginTop: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input
                      type="checkbox"
                      id="tenantActiveCheck"
                      checked={formData.active}
                      onChange={e => setFormData({ ...formData, active: e.target.checked })}
                      style={{ cursor: 'pointer', accentColor: '#00E5C8' }}
                    />
                    <label htmlFor="tenantActiveCheck" style={{ fontSize: '12px', color: '#E2E8F0', cursor: 'pointer' }}>
                      Activer cette instance (autoriser les connexions et requêtes MCP)
                    </label>
                  </div>
                </div>

                {/* 2. Endpoints Réseau */}
                <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '18px' }}>
                  <h4 style={{ margin: '0 0 14px 0', fontSize: '13px', color: '#B088FF', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    2. Passerelle & Endpoints
                  </h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                    <FloatingInput
                      label="URL ERP TraLIS"
                      required
                      mono
                      hasError={isFieldMissing(formData.erp_url)}
                      value={formData.erp_url || ''}
                      onChange={e => setFormData({ ...formData, erp_url: e.target.value })}
                    />
                    <FloatingInput
                      label="URL Serveur MCP Dédié"
                      required
                      mono
                      hasError={isFieldMissing(formData.mcp_base_url)}
                      value={formData.mcp_base_url || ''}
                      onChange={e => setFormData({ ...formData, mcp_base_url: e.target.value })}
                    />
                  </div>
                </div>

                {/* 3. Connexion SQL Server */}
                <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '18px' }}>
                  <h4 style={{ margin: '0 0 14px 0', fontSize: '13px', color: '#32AAFF', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    3. Connexion Microsoft SQL Server
                  </h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '14px', marginBottom: '14px' }}>
                    <FloatingInput
                      label="Serveur Hôte"
                      required
                      hasError={isFieldMissing(formData.db_server)}
                      value={formData.db_server || ''}
                      onChange={e => setFormData({ ...formData, db_server: e.target.value })}
                    />
                    <FloatingInput
                      label="Port TCP"
                      required
                      type="number"
                      hasError={isFieldMissing(formData.db_port)}
                      value={formData.db_port || 1433}
                      onChange={e => setFormData({ ...formData, db_port: Number(e.target.value) })}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                    <FloatingInput
                      label="Base Métier"
                      required
                      hasError={isFieldMissing(formData.db_database)}
                      value={formData.db_database || ''}
                      onChange={e => setFormData({ ...formData, db_database: e.target.value })}
                    />
                    <FloatingInput
                      label="Base de Configuration DNN"
                      required
                      hasError={isFieldMissing(formData.config_database)}
                      value={formData.config_database || ''}
                      onChange={e => setFormData({ ...formData, config_database: e.target.value })}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                    <FloatingInput
                      label="Utilisateur SQL"
                      required
                      hasError={isFieldMissing(formData.db_user)}
                      value={formData.db_user || ''}
                      onChange={e => setFormData({ ...formData, db_user: e.target.value })}
                    />
                    <FloatingInput
                      label="Mot de passe SQL"
                      required={!isEditing}
                      hasError={!isEditing && isFieldMissing(formData.db_password)}
                      type={showPassword ? 'text' : 'password'}
                      value={formData.db_password || ''}
                      onChange={e => setFormData({ ...formData, db_password: e.target.value })}
                      placeholder={isEditing ? '•••••••• (inchangé)' : undefined}
                      rightElement={
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#8FA3B8',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: 0
                          }}
                        >
                          {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                      }
                    />
                  </div>
                </div>

                {/* 4. Chemins Locaux */}
                <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '18px' }}>
                  <h4 style={{ margin: '0 0 14px 0', fontSize: '13px', color: '#FFB800', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    4. Chemins Fichiers & Répertoires
                  </h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                    <FloatingInput
                      label="Chemin Répertoire VD"
                      mono
                      value={formData.path_vd || ''}
                      onChange={e => setFormData({ ...formData, path_vd: e.target.value })}
                    />
                    <FloatingInput
                      label="Chemin Répertoire E255"
                      mono
                      value={formData.path_e255 || ''}
                      onChange={e => setFormData({ ...formData, path_e255: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* Actions Form */}
              <div
                style={{
                  marginTop: '24px',
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: '12px'
                }}
              >
                <button
                  type="button"
                  onClick={handleCloseForm}
                  style={{
                    background: 'transparent',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    color: '#8FA3B8',
                    padding: '8px 16px',
                    borderRadius: '8px',
                    fontSize: '13px',
                    cursor: 'pointer'
                  }}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  style={{
                    background: 'linear-gradient(90deg, #00E5C8 0%, #21F3D6 100%)',
                    color: '#021010',
                    border: 'none',
                    padding: '8px 20px',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: actionLoading ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    boxShadow: '0 0 15px rgba(0, 229, 200, 0.25)'
                  }}
                >
                  {actionLoading ? <RefreshCw size={14} className="animate-spin" /> : null}
                  {isEditing ? 'Enregistrer les modifications' : 'Créer l’instance'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL CONFIRMATION SUPPRESSION ─────────────────────────────────── */}
      {tenantToDelete && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 10001,
            background: 'rgba(0, 0, 0, 0.85)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '440px',
              background: '#0F172A',
              border: '1px solid rgba(255, 71, 87, 0.4)',
              borderRadius: '14px',
              padding: '24px',
              boxShadow: '0 20px 50px rgba(0, 0, 0, 0.9)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: '#FF4757', marginBottom: '14px' }}>
              <AlertTriangle size={24} />
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800 }}>Confirmer la suppression</h3>
            </div>

            <p style={{ fontSize: '13px', color: '#CBD5E1', lineHeight: 1.6, margin: '0 0 20px 0' }}>
              Confirmation requise : suppression définitive de l'instance <strong style={{ color: '#FF4757' }}>{tenantToDelete}</strong>.
              <br />
              Cette action supprimera également les liaisons de connecteurs utilisateurs associées.
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                onClick={() => setTenantToDelete(null)}
                style={{
                  background: 'transparent',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  color: '#94A3B8',
                  padding: '7px 14px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  cursor: 'pointer'
                }}
              >
                Annuler
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={actionLoading}
                style={{
                  background: '#FF4757',
                  border: 'none',
                  color: '#FFF',
                  padding: '7px 16px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: actionLoading ? 'not-allowed' : 'pointer'
                }}
              >
                {actionLoading ? 'Suppression...' : 'Supprimer définitivement'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
