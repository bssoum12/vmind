'use client';

import React, { useRef, useState } from 'react';
import {
  AlertCircle,
  Calendar,
  Check,
  Database,
  Download,
  FileSpreadsheet,
  Loader2,
  Sparkles,
  Upload,
} from 'lucide-react';
import {
  AgentDataSourceMode,
  AgentDatasetSummary,
  createAgentDemoDataset,
  downloadAgentDatasetTemplate,
  importAgentDatasetFiles,
  MAX_DATASET_FILES,
} from '@/shared/api/agent-datasets-api';

export interface DataSourcePickerValue {
  mode: AgentDataSourceMode;
  dataset: AgentDatasetSummary | null;
}

interface DataSourcePickerProps {
  /** Domain registered in backend domainTemplates.ts (e.g. 'exploitation', 'achats', 'dg') */
  domain: string;
  value: DataSourcePickerValue;
  onChange: (next: DataSourcePickerValue) => void;
  isErpConnected: boolean;
  erpLabel?: string | null;
  /** Optional: allow users to apply the date range detected inside their uploaded file in 1 click */
  onApplyDetectedPeriod?: (minDate: string, maxDate: string) => void;
  /** Optional: surface toast/error messages through parent */
  onError?: (message: string) => void;
  onSuccess?: (message: string) => void;
}

function formatFrDate(iso?: string | null): string {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return '';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

export const DataSourcePicker: React.FC<DataSourcePickerProps> = ({
  domain,
  value,
  onChange,
  isErpConnected,
  erpLabel,
  onApplyDetectedPeriod,
  onError,
  onSuccess,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [loadingDemo, setLoadingDemo] = useState(false);
  const [downloadingTpl, setDownloadingTpl] = useState(false);
  const [localError, setLocalError] = useState<string>('');

  const handleFilesSelected = async (fileList: FileList | File[]) => {
    const files = Array.from(fileList || []);
    if (!files.length) return;
    setLocalError('');
    setUploading(true);
    try {
      const ds = await importAgentDatasetFiles(domain, files);
      onChange({ mode: 'file', dataset: ds });
      onSuccess?.(`Fichier « ${ds.file_name} » importé (${ds.detected_meta.total_rows} lignes).`);
    } catch (err: any) {
      const msg = err?.message || "Impossible d'importer vos fichiers.";
      setLocalError(msg);
      onError?.(msg);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleLoadDemo = async () => {
    setLocalError('');
    setLoadingDemo(true);
    try {
      const ds = await createAgentDemoDataset(domain);
      onChange({ mode: 'demo', dataset: ds });
      onSuccess?.('Données de démonstration chargées avec succès.');
    } catch (err: any) {
      const msg = err?.message || 'Impossible de charger les données de démonstration.';
      setLocalError(msg);
      onError?.(msg);
    } finally {
      setLoadingDemo(false);
    }
  };

  const handleDownloadTemplate = async () => {
    setLocalError('');
    setDownloadingTpl(true);
    try {
      await downloadAgentDatasetTemplate(domain);
    } catch (err: any) {
      const msg = err?.message || 'Impossible de télécharger le modèle Excel.';
      setLocalError(msg);
      onError?.(msg);
    } finally {
      setDownloadingTpl(false);
    }
  };

  const handleSelectMode = (nextMode: AgentDataSourceMode) => {
    setLocalError('');
    if (nextMode === 'erp') {
      onChange({ mode: 'erp', dataset: value.dataset });
      return;
    }
    if (nextMode === 'demo') {
      if (value.dataset && value.dataset.source_mode === 'demo') {
        onChange({ mode: 'demo', dataset: value.dataset });
      } else {
        onChange({ mode: 'demo', dataset: null });
        void handleLoadDemo();
      }
      return;
    }
    onChange({
      mode: 'file',
      dataset: value.dataset && value.dataset.source_mode === 'file' ? value.dataset : null,
    });
  };

  const meta = value.dataset?.detected_meta;
  const minDate = meta?.detected_date_range?.min_date || null;
  const maxDate = meta?.detected_date_range?.max_date || null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Mode selector cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
          gap: 10,
        }}
      >
        {/* 1. ERP connecté */}
        <button
          type="button"
          onClick={() => handleSelectMode('erp')}
          style={{
            textAlign: 'left',
            padding: '12px 14px',
            borderRadius: 12,
            border:
              value.mode === 'erp'
                ? '1.5px solid #00E5C8'
                : '1px solid rgba(148, 163, 184, 0.22)',
            background:
              value.mode === 'erp'
                ? 'rgba(0, 229, 200, 0.11)'
                : 'rgba(15, 23, 42, 0.5)',
            cursor: 'pointer',
            transition: 'all 0.18s ease',
            display: 'flex',
            flexDirection: 'column',
            gap: 5,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, color: '#F1F5F9', fontWeight: 700, fontSize: 13 }}>
              <Database size={15} color={value.mode === 'erp' ? '#00E5C8' : '#94A3B8'} />
              ERP connecté
            </span>
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                padding: '2px 7px',
                borderRadius: 999,
                background: isErpConnected ? 'rgba(16, 185, 129, 0.16)' : 'rgba(245, 158, 11, 0.14)',
                color: isErpConnected ? '#34D399' : '#FBBF24',
                border: isErpConnected
                  ? '1px solid rgba(16, 185, 129, 0.35)'
                  : '1px solid rgba(245, 158, 11, 0.35)',
              }}
            >
              {isErpConnected ? (erpLabel || 'Connecté') : 'Non connecté'}
            </span>
          </div>
          <span style={{ fontSize: 11.5, color: '#94A3B8', lineHeight: 1.4 }}>
            Données en direct & planification automatique
          </span>
        </button>

        {/* 2. Fichier Excel / CSV */}
        <button
          type="button"
          onClick={() => handleSelectMode('file')}
          style={{
            textAlign: 'left',
            padding: '12px 14px',
            borderRadius: 12,
            border:
              value.mode === 'file'
                ? '1.5px solid #00E5C8'
                : '1px solid rgba(148, 163, 184, 0.22)',
            background:
              value.mode === 'file'
                ? 'rgba(0, 229, 200, 0.11)'
                : 'rgba(15, 23, 42, 0.5)',
            cursor: 'pointer',
            transition: 'all 0.18s ease',
            display: 'flex',
            flexDirection: 'column',
            gap: 5,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, color: '#F1F5F9', fontWeight: 700, fontSize: 13 }}>
              <FileSpreadsheet size={15} color={value.mode === 'file' ? '#00E5C8' : '#94A3B8'} />
              Fichier Excel / CSV
            </span>
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                padding: '2px 7px',
                borderRadius: 999,
                background: 'rgba(56, 189, 248, 0.15)',
                color: '#38BDF8',
                border: '1px solid rgba(56, 189, 248, 0.32)',
              }}
            >
              Sans ERP
            </span>
          </div>
          <span style={{ fontSize: 11.5, color: '#94A3B8', lineHeight: 1.4 }}>
            Modèle fourni ou vos propres tableaux (.xlsx / .csv)
          </span>
        </button>

        {/* 3. Mode Démo */}
        <button
          type="button"
          onClick={() => handleSelectMode('demo')}
          style={{
            textAlign: 'left',
            padding: '12px 14px',
            borderRadius: 12,
            border:
              value.mode === 'demo'
                ? '1.5px solid #A78BFA'
                : '1px solid rgba(148, 163, 184, 0.22)',
            background:
              value.mode === 'demo'
                ? 'rgba(167, 139, 250, 0.12)'
                : 'rgba(15, 23, 42, 0.5)',
            cursor: 'pointer',
            transition: 'all 0.18s ease',
            display: 'flex',
            flexDirection: 'column',
            gap: 5,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, color: '#F1F5F9', fontWeight: 700, fontSize: 13 }}>
              <Sparkles size={15} color={value.mode === 'demo' ? '#C4B5FD' : '#94A3B8'} />
              Données d&apos;exemple
            </span>
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                padding: '2px 7px',
                borderRadius: 999,
                background: 'rgba(167, 139, 250, 0.16)',
                color: '#C4B5FD',
                border: '1px solid rgba(167, 139, 250, 0.35)',
              }}
            >
              Essai 1 clic
            </span>
          </div>
          <span style={{ fontSize: 11.5, color: '#94A3B8', lineHeight: 1.4 }}>
            Tester l&apos;agent immédiatement sans aucun fichier
          </span>
        </button>
      </div>

      {/* Mode ERP disconnected gentle hint */}
      {value.mode === 'erp' && !isErpConnected && (
        <div
          style={{
            padding: '12px 14px',
            borderRadius: 10,
            background: 'rgba(245, 158, 11, 0.09)',
            border: '1px solid rgba(245, 158, 11, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, color: '#FDE68A', fontSize: 12.5 }}>
            <AlertCircle size={16} color="#FBBF24" style={{ flexShrink: 0 }} />
            <span>
              Aucun ERP n&apos;est connecté actuellement. Connectez votre ERP ou basculez sur{' '}
              <strong>Fichier Excel / CSV</strong> pour continuer tout de suite.
            </span>
          </div>
          <button
            type="button"
            onClick={() => handleSelectMode('file')}
            style={{
              padding: '6px 12px',
              borderRadius: 8,
              border: '1px solid rgba(0, 229, 200, 0.4)',
              background: 'rgba(0, 229, 200, 0.12)',
              color: '#00E5C8',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            Utiliser un fichier Excel
          </button>
        </div>
      )}

      {/* Mode File upload zone */}
      {value.mode === 'file' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              if (e.dataTransfer.files?.length) {
                void handleFilesSelected(e.dataTransfer.files);
              }
            }}
            onClick={() => !uploading && fileInputRef.current?.click()}
            style={{
              padding: '18px 16px',
              borderRadius: 12,
              border: dragging
                ? '1.5px dashed #00E5C8'
                : '1.5px dashed rgba(148, 163, 184, 0.32)',
              background: dragging
                ? 'rgba(0, 229, 200, 0.08)'
                : 'rgba(10, 22, 40, 0.55)',
              cursor: uploading ? 'wait' : 'pointer',
              transition: 'all 0.18s ease',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
              gap: 7,
            }}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.csv"
              multiple
              style={{ display: 'none' }}
              onChange={(e) => {
                if (e.target.files?.length) {
                  void handleFilesSelected(e.target.files);
                }
              }}
            />
            {uploading ? (
              <>
                <Loader2 size={22} color="#00E5C8" className="animate-spin" />
                <span style={{ color: '#E2E8F0', fontSize: 13, fontWeight: 600 }}>
                  Analyse de vos fichiers en cours…
                </span>
              </>
            ) : (
              <>
                <Upload size={22} color="#00E5C8" />
                <div style={{ color: '#F1F5F9', fontSize: 13, fontWeight: 600 }}>
                  Glissez-déposez vos fichiers Excel (.xlsx) ou CSV (.csv), ou{' '}
                  <span style={{ color: '#00E5C8', textDecoration: 'underline' }}>parcourir</span>
                </div>
                <div style={{ color: '#94A3B8', fontSize: 11.5 }}>
                  1 classeur multi-onglets ou jusqu&apos;à {MAX_DATASET_FILES} fichiers séparés · Max 10 Mo · 25 000 lignes/feuille
                </div>
              </>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
            <span style={{ fontSize: 11.5, color: '#94A3B8' }}>
              Vous pouvez importer vos propres colonnes ou partir de notre modèle prêt à remplir :
            </span>
            <button
              type="button"
              disabled={downloadingTpl}
              onClick={handleDownloadTemplate}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 12px',
                borderRadius: 8,
                border: '1px solid rgba(0, 229, 200, 0.35)',
                background: 'rgba(0, 229, 200, 0.08)',
                color: '#00E5C8',
                fontSize: 12,
                fontWeight: 700,
                cursor: downloadingTpl ? 'wait' : 'pointer',
              }}
            >
              {downloadingTpl ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
              Télécharger le modèle Excel (.xlsx)
            </button>
          </div>
        </div>
      )}

      {/* Mode Demo loading state */}
      {value.mode === 'demo' && loadingDemo && (
        <div
          style={{
            padding: '14px 16px',
            borderRadius: 10,
            background: 'rgba(167, 139, 250, 0.08)',
            border: '1px solid rgba(167, 139, 250, 0.25)',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            color: '#E9D5FF',
            fontSize: 12.5,
          }}
        >
          <Loader2 size={16} color="#C4B5FD" className="animate-spin" />
          <span>Préparation du jeu de données d&apos;exemple…</span>
        </div>
      )}

      {/* Parsed dataset summary pill (both file and demo modes) */}
      {(value.mode === 'file' || value.mode === 'demo') && value.dataset && meta && (
        <div
          style={{
            padding: '13px 15px',
            borderRadius: 12,
            background: 'rgba(16, 185, 129, 0.08)',
            border: '1px solid rgba(16, 185, 129, 0.32)',
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 999,
                  background: 'rgba(16, 185, 129, 0.2)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Check size={13} color="#34D399" />
              </span>
              <span style={{ color: '#ECFDF5', fontWeight: 700, fontSize: 13 }}>
                {value.dataset.file_name}
              </span>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: 999,
                  background: value.dataset.template_matched
                    ? 'rgba(0, 229, 200, 0.14)'
                    : 'rgba(167, 139, 250, 0.16)',
                  color: value.dataset.template_matched ? '#00E5C8' : '#C4B5FD',
                }}
              >
                {value.mode === 'demo'
                  ? 'Jeu de démonstration prêt'
                  : value.dataset.template_matched
                    ? 'Format standard détecté'
                    : 'Colonnes personnalisées — adaptation automatique'}
              </span>
            </div>
            <span style={{ fontSize: 12, color: '#A7F3D0', fontWeight: 600 }}>
              {meta.sheets.length} onglet(s) · {meta.total_rows.toLocaleString('fr-FR')} lignes
            </span>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {meta.sheets.map((s) => (
              <span
                key={s.tool_name}
                style={{
                  fontSize: 11,
                  color: '#CBD5E1',
                  padding: '3px 9px',
                  borderRadius: 6,
                  background: 'rgba(15, 23, 42, 0.65)',
                  border: '1px solid rgba(148, 163, 184, 0.2)',
                }}
              >
                {s.sheet_name} ({s.row_count} lignes)
              </span>
            ))}
          </div>

          {minDate && maxDate && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 8,
                paddingTop: 6,
                borderTop: '1px solid rgba(16, 185, 129, 0.18)',
              }}
            >
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#CBD5E1' }}>
                <Calendar size={13} color="#34D399" />
                Dates détectées dans le fichier :{' '}
                <strong style={{ color: '#F8FAFC' }}>
                  {formatFrDate(minDate)} → {formatFrDate(maxDate)}
                </strong>
              </span>
              {onApplyDetectedPeriod && (
                <button
                  type="button"
                  onClick={() => onApplyDetectedPeriod(minDate, maxDate)}
                  style={{
                    padding: '4px 10px',
                    borderRadius: 7,
                    border: '1px solid rgba(52, 211, 153, 0.4)',
                    background: 'rgba(16, 185, 129, 0.14)',
                    color: '#6EE7B7',
                    fontSize: 11.5,
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Appliquer ces dates
                </button>
              )}
            </div>
          )}

          {meta.warnings?.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 2 }}>
              {meta.warnings.map((w, idx) => (
                <div key={idx} style={{ fontSize: 11.5, color: '#FDE68A', display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                  <AlertCircle size={13} color="#FBBF24" style={{ marginTop: 2, flexShrink: 0 }} />
                  <span>{w}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {localError && (
        <div
          style={{
            padding: '10px 12px',
            borderRadius: 8,
            background: 'rgba(239, 68, 68, 0.12)',
            border: '1px solid rgba(239, 68, 68, 0.35)',
            color: '#FCA5A5',
            fontSize: 12.5,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <AlertCircle size={15} color="#F87171" style={{ flexShrink: 0 }} />
          <span>{localError}</span>
        </div>
      )}
    </div>
  );
};
