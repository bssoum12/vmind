'use client';

import React, { useState } from 'react';
import { FileSpreadsheet, Sparkles, Upload } from 'lucide-react';
import type { AgentDatasetSummary } from '@/shared/api/agent-datasets-api';
import { UpdateDatasetModal } from './UpdateDatasetModal';

interface DatasetStatusBarProps {
  agentUuid: string;
  agentName: string;
  domain: string;
  sourceMode: 'file' | 'demo';
  dataset?: AgentDatasetSummary | null;
  fallbackFileName?: string;
  onDatasetUpdated?: (dataset: AgentDatasetSummary) => void;
  onDatasetUpdatedAndRun?: (dataset: AgentDatasetSummary) => Promise<void> | void;
}

export const DatasetStatusBar: React.FC<DatasetStatusBarProps> = ({
  agentUuid,
  agentName,
  domain,
  sourceMode,
  dataset,
  fallbackFileName,
  onDatasetUpdated,
  onDatasetUpdatedAndRun,
}) => {
  const [modalOpen, setModalOpen] = useState(false);

  const fileName = dataset?.file_name || fallbackFileName || 'Jeu de données importé';
  const totalRows = dataset?.detected_meta?.total_rows;
  const sheetCount = dataset?.detected_meta?.sheets?.length;
  const isDemo = sourceMode === 'demo' && dataset?.source_mode !== 'file';

  return (
    <>
      <div
        style={{
          marginBottom: 14,
          padding: '10px 16px',
          borderRadius: 12,
          background: isDemo
            ? 'rgba(167, 139, 250, 0.08)'
            : 'rgba(0, 229, 200, 0.07)',
          border: isDemo
            ? '1px solid rgba(167, 139, 250, 0.28)'
            : '1px solid rgba(0, 229, 200, 0.26)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          {isDemo ? (
            <Sparkles size={16} color="#C4B5FD" />
          ) : (
            <FileSpreadsheet size={16} color="#00E5C8" />
          )}
          <span style={{ fontSize: 12.5, color: '#E2E8F0', fontWeight: 600 }}>
            {isDemo ? 'Mode démonstration' : 'Source fichier active'} :{' '}
            <strong style={{ color: '#FFFFFF' }}>{fileName}</strong>
          </span>
          {typeof sheetCount === 'number' && typeof totalRows === 'number' && (
            <span
              style={{
                fontSize: 11.5,
                color: '#94A3B8',
                padding: '2px 8px',
                borderRadius: 999,
                background: 'rgba(15, 23, 42, 0.6)',
                border: '1px solid rgba(148, 163, 184, 0.2)',
              }}
            >
              {sheetCount} onglet(s) · {totalRows.toLocaleString('fr-FR')} lignes
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={() => setModalOpen(true)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '7px 13px',
            borderRadius: 8,
            border: '1px solid rgba(0, 229, 200, 0.4)',
            background: 'rgba(0, 229, 200, 0.12)',
            color: '#00E5C8',
            fontSize: 12,
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          <Upload size={13} />
          {isDemo ? 'Importer mon propre fichier' : 'Mettre à jour le fichier'}
        </button>
      </div>

      <UpdateDatasetModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        agentUuid={agentUuid}
        agentName={agentName}
        domain={domain}
        currentFileName={fileName}
        onUpdated={onDatasetUpdated}
        onUpdatedAndRun={onDatasetUpdatedAndRun}
      />
    </>
  );
};
