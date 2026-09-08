'use client';

import React from 'react';
import { Users, Search, Zap, FileSpreadsheet, Database, UserPlus, UploadCloud } from 'lucide-react';

interface LeadsEmptyStateProps {
  onOpenImport: () => void;
  onOpenGlobalModal: () => void;
  onOpenSourcing?: () => void;
}

export const LeadsEmptyState: React.FC<LeadsEmptyStateProps> = ({
  onOpenImport,
  onOpenGlobalModal,
  onOpenSourcing,
}) => {
  return (
    <div
      style={{
        position: 'relative',
        margin: '1.5rem 0',
        padding: '2.5rem 2rem',
        borderRadius: '16px',
        background: 'linear-gradient(160deg, rgba(8, 20, 38, 0.95) 0%, rgba(4, 12, 24, 0.98) 100%)',
        border: '1px solid rgba(0, 229, 200, 0.2)',
        boxShadow: '0 12px 40px rgba(0, 0, 0, 0.45), 0 0 20px rgba(0, 229, 200, 0.05)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        textAlign: 'center',
        overflow: 'hidden',
      }}
    >
      {/* Specular Top Glow Beam */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: '10%',
          right: '10%',
          height: '2px',
          background: 'linear-gradient(90deg, transparent, #00E5C8, transparent)',
          opacity: 0.8,
        }}
      />

      {/* Main Icon & Title */}
      <div style={{ maxWidth: '680px', margin: '0 auto' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.25rem auto',
          }}
        >
          <div style={{
            width: 64,
            height: 64,
            borderRadius: 20,
            background: 'rgba(0, 229, 200, 0.08)',
            border: '1px solid rgba(0, 229, 200, 0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#00E5C8'
          }}>
            <Users size={32} />
          </div>
        </div>

        <h2
          style={{
            fontSize: '1.35rem',
            fontWeight: 800,
            color: '#F0F4F8',
            marginBottom: '0.5rem',
            letterSpacing: '-0.02em',
          }}
        >
          Votre Agent de Prospection est prêt à travailler !
        </h2>

        <p
          style={{
            fontSize: '0.875rem',
            color: '#94A3B8',
            lineHeight: '1.6',
            marginBottom: '2rem',
          }}
        >
          Cet agent commercial attend ses premiers contacts pour évaluer leur profil selon votre score ICP et rédiger des emails personnalisés. Choisissez comment alimenter votre pipeline :
        </p>
      </div>

      {/* 3 Pipeline Feeding Action Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '1.25rem',
          maxWidth: '900px',
          margin: '0 auto',
          textAlign: 'left',
        }}
      >
        {/* Card 1: Sourcing Agent */}
        <div
          style={{
            padding: '1.25rem',
            borderRadius: '12px',
            background: 'linear-gradient(145deg, rgba(255, 255, 255, 0.03) 0%, rgba(255, 255, 255, 0.01) 100%)',
            border: '1px solid rgba(0, 229, 200, 0.25)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            transition: 'all 0.2s ease',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
              <div style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: 'rgba(0, 229, 200, 0.1)',
                border: '1px solid rgba(0, 229, 200, 0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#00E5C8',
                flexShrink: 0
              }}>
                <Search size={20} />
              </div>
              <div>
                <strong style={{ color: '#00E5C8', fontSize: '0.9rem', display: 'block' }}>Recherche IA Automatique</strong>
                <span style={{ fontSize: '0.72rem', color: '#64748B' }}>Sourcing Web & Réseaux</span>
              </div>
            </div>
            <p style={{ fontSize: '0.78rem', color: '#94A3B8', lineHeight: '1.45', margin: '0 0 1rem 0' }}>
              Déployez un <strong>Sourcing Agent</strong> pour explorer le web et injecter des décideurs ciblés en continu.
            </p>
          </div>

          <button
            type="button"
            className="btn btn-primary"
            onClick={onOpenSourcing || onOpenGlobalModal}
            style={{
              width: '100%',
              padding: '0.55rem',
              fontSize: '0.8rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
            }}
          >
            <Zap size={14} style={{ flexShrink: 0 }} />
            <span>Lancer le Sourcing</span>
          </button>
        </div>

        {/* Card 2: Manual Import CSV */}
        <div
          style={{
            padding: '1.25rem',
            borderRadius: '12px',
            background: 'linear-gradient(145deg, rgba(255, 255, 255, 0.03) 0%, rgba(255, 255, 255, 0.01) 100%)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            transition: 'all 0.2s ease',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
              <div style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: 'rgba(56, 189, 248, 0.1)',
                border: '1px solid rgba(56, 189, 248, 0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#38BDF8',
                flexShrink: 0
              }}>
                <FileSpreadsheet size={20} />
              </div>
              <div>
                <strong style={{ color: '#F0F4F8', fontSize: '0.9rem', display: 'block' }}>Importer mes Contacts</strong>
                <span style={{ fontSize: '0.72rem', color: '#64748B' }}>Fichiers CSV / Excel</span>
              </div>
            </div>
            <p style={{ fontSize: '0.78rem', color: '#94A3B8', lineHeight: '1.45', margin: '0 0 1rem 0' }}>
              Glissez votre fichier <strong>CSV ou Excel</strong> contenant vos prospects pour les qualifier instantanément.
            </p>
          </div>

          <button
            type="button"
            className="btn btn-secondary"
            onClick={onOpenImport}
            style={{
              width: '100%',
              padding: '0.55rem',
              fontSize: '0.8rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
            }}
          >
            <UploadCloud size={14} style={{ flexShrink: 0 }} />
            <span>Importer un CSV</span>
          </button>
        </div>

        {/* Card 3: Global Base Assignment */}
        <div
          style={{
            padding: '1.25rem',
            borderRadius: '12px',
            background: 'linear-gradient(145deg, rgba(255, 255, 255, 0.03) 0%, rgba(255, 255, 255, 0.01) 100%)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            transition: 'all 0.2s ease',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
              <div style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: 'rgba(129, 140, 248, 0.1)',
                border: '1px solid rgba(129, 140, 248, 0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#818cf8',
                flexShrink: 0
              }}>
                <Database size={20} />
              </div>
              <div>
                <strong style={{ color: '#F0F4F8', fontSize: '0.9rem', display: 'block' }}>Base Existante VMIND</strong>
                <span style={{ fontSize: '0.72rem', color: '#64748B' }}>Pool Global de Décideurs</span>
              </div>
            </div>
            <p style={{ fontSize: '0.78rem', color: '#94A3B8', lineHeight: '1.45', margin: '0 0 1rem 0' }}>
              Sélectionnez des contacts déjà présents dans votre espace global et assignez-les à cet agent.
            </p>
          </div>

          <button
            type="button"
            className="btn btn-secondary"
            onClick={onOpenGlobalModal}
            style={{
              width: '100%',
              padding: '0.55rem',
              fontSize: '0.8rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
            }}
          >
            <UserPlus size={14} style={{ flexShrink: 0 }} />
            <span>Assigner des Leads</span>
          </button>
        </div>
      </div>
    </div>
  );
};
