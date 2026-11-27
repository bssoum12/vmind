'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  Check,
  Download,
  FileSpreadsheet,
  Loader2,
  Play,
  Upload,
  X,
} from 'lucide-react';
import {
  AgentDatasetSummary,
  downloadAgentDatasetTemplate,
  getAgentDatasetMetadata,
  MAX_DATASET_FILES,
  replaceAgentDatasetFiles,
} from '@/shared/api/agent-datasets-api';

interface UpdateDatasetModalProps {
  isOpen: boolean;
  onClose: () => void;
  agentUuid: string;
  agentName: string;
  domain: string;
  currentFileName?: string;
  onUpdated?: (dataset: AgentDatasetSummary) => void;
  onUpdatedAndRun?: (dataset: AgentDatasetSummary) => Promise<void> | void;
}

export const UpdateDatasetModal: React.FC<UpdateDatasetModalProps> = ({
  isOpen,
  onClose,
  agentUuid,
  agentName,
  domain,
  currentFileName,
  onUpdated,
  onUpdatedAndRun,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [currentMeta, setCurrentMeta] = useState<AgentDatasetSummary | null>(null);
  const [loadingCurrent, setLoadingCurrent] = useState(false);
  const [saving, setSaving] = useState<'none' | 'save' | 'save_run'>('none');
  const [downloadingTpl, setDownloadingTpl] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen || !agentUuid) return;
    setSelectedFiles([]);
    setError('');
    setLoadingCurrent(true);
    getAgentDatasetMetadata(agentUuid)
      .then((ds) => setCurrentMeta(ds))
      .catch(() => setCurrentMeta(null))
      .finally(() => setLoadingCurrent(false));
  }, [isOpen, agentUuid]);

  if (!isOpen) return null;

  const handlePickFiles = (list: FileList | File[]) => {
    const arr = Array.from(list || []);
    if (!arr.length) return;
    if (arr.length > MAX_DATASET_FILES) {
      setError(`Vous pouvez importer jusqu'à ${MAX_DATASET_FILES} fichiers à la fois.`);
      return;
    }
    setError('');
    setSelectedFiles(arr);
  };

  const handleSave = async (andRun: boolean) => {
    if (selectedFiles.length === 0) {
      setError('Sélectionnez au moins un fichier Excel (.xlsx) ou CSV (.csv).');
      return;
    }
    setError('');
    setSaving(andRun ? 'save_run' : 'save');
    try {
      const updated = await replaceAgentDatasetFiles(agentUuid, domain, selectedFiles);
      onUpdated?.(updated);
      if (andRun && onUpdatedAndRun) {
        await onUpdatedAndRun(updated);
      }
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Impossible de mettre à jour le fichier.');
    } finally {
      setSaving('none');
    }
  };

  const handleDownloadTpl = async () => {
    setDownloadingTpl(true);
    try {
      await downloadAgentDatasetTemplate(domain);
    } catch (err: any) {
      setError(err?.message || 'Impossible de télécharger le modèle Excel.');
    } finally {
      setDownloadingTpl(false);
    }
  };

  return (
    <div
      onClick={() => saving === 'none' && onClose()}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(4, 11, 22, 0.82)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 99999,
        padding: 20,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'linear-gradient(180deg, #0B1B32 0%, #06111F 100%)',
          border: '1px solid rgba(0, 229, 200, 0.32)',
          borderRadius: 16,
          padding: 26,
          maxWidth: 540,
          width: '100%',
          boxShadow: '0 24px 60px rgba(0, 0, 0, 0.65)',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: 'rgba(0, 229, 200, 0.14)',
                border: '1px solid rgba(0, 229, 200, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <FileSpreadsheet size={18} color="#00E5C8" />
            </div>
            <div>
              <h3 style={{ margin: 0, color: '#F8FAFC', fontSize: 16.5, fontWeight: 800 }}>
                Mettre à jour les données Excel / CSV
              </h3>
              <p style={{ margin: '2px 0 0', color: '#94A3B8', fontSize: 12 }}>
                Agent : <strong style={{ color: '#E2E8F0' }}>{agentName}</strong>
              </p>
            </div>
          </div>
          <button
            type="button"
            disabled={saving !== 'none'}
            onClick={onClose}
            aria-label="Fermer"
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94A3B8',
              cursor: 'pointer',
              padding: 4,
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Current file info */}
        <div
          style={{
            padding: '10px 13px',
            borderRadius: 10,
            background: 'rgba(15, 23, 42, 0.7)',
            border: '1px solid rgba(148, 163, 184, 0.18)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 8,
            fontSize: 12,
          }}
        >
          <span style={{ color: '#94A3B8' }}>
            Fichier actuel :{' '}
            <strong style={{ color: '#F1F5F9' }}>
              {loadingCurrent
                ? 'Chargement…'
                : currentMeta?.file_name || currentFileName || 'Aucun fichier'}
            </strong>
          </span>
          {currentMeta?.detected_meta && (
            <span style={{ color: '#64748B' }}>
              {currentMeta.detected_meta.sheets?.length || 0} onglet(s) ·{' '}
              {(currentMeta.detected_meta.total_rows || 0).toLocaleString('fr-FR')} lignes
            </span>
          )}
        </div>

        {/* Dropzone */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            if (e.dataTransfer.files?.length) handlePickFiles(e.dataTransfer.files);
          }}
          onClick={() => saving === 'none' && fileInputRef.current?.click()}
          style={{
            padding: '22px 16px',
            borderRadius: 12,
            border: dragging
              ? '1.5px dashed #00E5C8'
              : selectedFiles.length > 0
                ? '1.5px solid rgba(16, 185, 129, 0.45)'
                : '1.5px dashed rgba(148, 163, 184, 0.32)',
            background: dragging
              ? 'rgba(0, 229, 200, 0.08)'
              : selectedFiles.length > 0
                ? 'rgba(16, 185, 129, 0.07)'
                : 'rgba(10, 22, 40, 0.55)',
            cursor: saving !== 'none' ? 'wait' : 'pointer',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.csv"
            multiple
            style={{ display: 'none' }}
            onChange={(e) => {
              if (e.target.files?.length) handlePickFiles(e.target.files);
            }}
          />
          {selectedFiles.length > 0 ? (
            <>
              <Check size={22} color="#34D399" />
              <div style={{ color: '#ECFDF5', fontSize: 13, fontWeight: 700 }}>
                {selectedFiles.map((f) => f.name).join(' · ')}
              </div>
              <div style={{ color: '#94A3B8', fontSize: 11.5 }}>
                Cliquez pour remplacer la sélection
              </div>
            </>
          ) : (
            <>
              <Upload size={22} color="#00E5C8" />
              <div style={{ color: '#F1F5F9', fontSize: 13, fontWeight: 600 }}>
                Déposez votre nouveau fichier Excel / CSV ou{' '}
                <span style={{ color: '#00E5C8', textDecoration: 'underline' }}>parcourir</span>
              </div>
              <div style={{ color: '#94A3B8', fontSize: 11.5 }}>
                Jusqu&apos;à {MAX_DATASET_FILES} fichiers (.xlsx / .csv) · Max 10 Mo
              </div>
            </>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <span style={{ fontSize: 11.5, color: '#94A3B8' }}>
            Besoin du modèle standard ?
          </span>
          <button
            type="button"
            disabled={downloadingTpl}
            onClick={handleDownloadTpl}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '5px 10px',
              borderRadius: 7,
              border: '1px solid rgba(0, 229, 200, 0.3)',
              background: 'rgba(0, 229, 200, 0.08)',
              color: '#00E5C8',
              fontSize: 11.5,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            {downloadingTpl ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
            Modèle Excel (.xlsx)
          </button>
        </div>

        {error && (
          <div
            style={{
              padding: '9px 12px',
              borderRadius: 8,
              background: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.35)',
              color: '#FCA5A5',
              fontSize: 12,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <AlertCircle size={14} color="#F87171" style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {/* Footer Actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, paddingTop: 4, flexWrap: 'wrap' }}>
          <button
            type="button"
            disabled={saving !== 'none'}
            onClick={onClose}
            style={{
              padding: '9px 15px',
              borderRadius: 8,
              border: '1px solid rgba(148, 163, 184, 0.25)',
              background: 'rgba(255, 255, 255, 0.04)',
              color: '#CBD5E1',
              fontSize: 12.5,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Annuler
          </button>
          <button
            type="button"
            disabled={saving !== 'none' || selectedFiles.length === 0}
            onClick={() => handleSave(false)}
            style={{
              padding: '9px 16px',
              borderRadius: 8,
              border: '1px solid rgba(0, 229, 200, 0.4)',
              background: 'rgba(0, 229, 200, 0.12)',
              color: '#00E5C8',
              fontSize: 12.5,
              fontWeight: 700,
              cursor: selectedFiles.length === 0 ? 'not-allowed' : 'pointer',
              opacity: selectedFiles.length === 0 ? 0.5 : 1,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            {saving === 'save' && <Loader2 size={13} className="animate-spin" />}
            Enregistrer
          </button>
          {onUpdatedAndRun && (
            <button
              type="button"
              disabled={saving !== 'none' || selectedFiles.length === 0}
              onClick={() => handleSave(true)}
              style={{
                padding: '9px 18px',
                borderRadius: 8,
                border: 'none',
                background: 'linear-gradient(135deg, #00E5C8 0%, #00B4D8 100%)',
                color: '#04101E',
                fontSize: 12.5,
                fontWeight: 800,
                cursor: selectedFiles.length === 0 ? 'not-allowed' : 'pointer',
                opacity: selectedFiles.length === 0 ? 0.5 : 1,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                boxShadow: '0 0 18px rgba(0, 229, 200, 0.35)',
              }}
            >
              {saving === 'save_run' ? <Loader2 size={13} className="animate-spin" /> : <Play size={13} />}
              Enregistrer et lancer
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
