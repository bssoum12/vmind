'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, X, Check, Plus } from 'lucide-react';
import { JOB_TITLES } from '@/shared/constants/jobTitles';

interface JobTitleMultiSelectProps {
  selectedJobTitles: string[];
  onChange: (titles: string[]) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  placeholder?: string;
}

const ALL_JOB_TITLES_OPTION = "Tous les postes";
const DECISION_MAKER_SPECIAL_TITLE = "Tous les postes décisionnaires";

export const JobTitleMultiSelect: React.FC<JobTitleMultiSelectProps> = ({
  selectedJobTitles,
  onChange,
  onFocus,
  onBlur,
  placeholder = 'Sélectionner un ou plusieurs intitulés de poste...'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        if (isOpen) {
          setIsOpen(false);
          setSearchTerm('');
          if (onBlur) onBlur();
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onBlur]);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  // Normalize string for accent-insensitive search
  const normalize = (str: string) =>
    str
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');

  const allAvailableTitles = useMemo(() => {
    const withoutSpecial = JOB_TITLES.filter((t: string) => t !== ALL_JOB_TITLES_OPTION && t !== DECISION_MAKER_SPECIAL_TITLE);
    return [ALL_JOB_TITLES_OPTION, DECISION_MAKER_SPECIAL_TITLE, ...withoutSpecial];
  }, []);

  const filteredJobTitles = useMemo(() => {
    if (!searchTerm.trim()) return allAvailableTitles;
    const normSearch = normalize(searchTerm);
    return allAvailableTitles.filter((title) => normalize(title).includes(normSearch));
  }, [searchTerm, allAvailableTitles]);

  const isExactMatch = useMemo(() => {
    if (!searchTerm.trim()) return true;
    const normSearch = normalize(searchTerm.trim());
    return allAvailableTitles.some(t => normalize(t) === normSearch) || selectedJobTitles.some(t => normalize(t) === normSearch);
  }, [searchTerm, allAvailableTitles, selectedJobTitles]);

  const toggleJobTitle = (title: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (selectedJobTitles.includes(title)) {
      onChange(selectedJobTitles.filter((item) => item !== title));
    } else {
      if (title === ALL_JOB_TITLES_OPTION) {
        onChange([ALL_JOB_TITLES_OPTION]);
      } else if (title === DECISION_MAKER_SPECIAL_TITLE) {
        onChange([DECISION_MAKER_SPECIAL_TITLE]);
      } else {
        onChange([
          ...selectedJobTitles.filter(
            (item) => item !== ALL_JOB_TITLES_OPTION && item !== DECISION_MAKER_SPECIAL_TITLE
          ),
          title
        ]);
      }
    }
  };

  const addCustomJobTitle = () => {
    const trimmed = searchTerm.trim();
    if (trimmed && !selectedJobTitles.includes(trimmed)) {
      onChange([
        ...selectedJobTitles.filter(
          (item) => item !== ALL_JOB_TITLES_OPTION && item !== DECISION_MAKER_SPECIAL_TITLE
        ),
        trimmed
      ]);
      setSearchTerm('');
    }
  };

  const removeJobTitle = (title: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(selectedJobTitles.filter((item) => item !== title));
  };

  const clearAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange([]);
  };

  return (
    <div
      ref={containerRef}
      className="job-title-multiselect-container"
      style={{ position: 'relative', width: '100%' }}
    >
      {/* Trigger Box displaying selected chips or placeholder */}
      <div
        onClick={() => {
          const next = !isOpen;
          setIsOpen(next);
          if (next && onFocus) onFocus();
        }}
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '0.4rem',
          padding: '0.5rem 0.65rem',
          minHeight: '44px',
          alignItems: 'center',
          backgroundColor: 'rgba(255, 255, 255, 0.03)',
          border: isOpen ? '1px solid var(--cyan, #00E5C8)' : '1px solid var(--border, rgba(255, 255, 255, 0.12))',
          borderRadius: '8px',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          boxShadow: isOpen ? '0 0 12px rgba(0, 229, 200, 0.15)' : 'none',
        }}
      >
        {selectedJobTitles.length === 0 ? (
          <span style={{ color: '#64748B', fontSize: '0.825rem', userSelect: 'none', padding: '0.2rem 0' }}>
            {placeholder}
          </span>
        ) : (
          selectedJobTitles.map((title) => (
            <span
              key={title}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                backgroundColor: 'rgba(0, 229, 200, 0.12)',
                border: '1px solid rgba(0, 229, 200, 0.3)',
                color: 'var(--cyan, #00E5C8)',
                padding: '0.2rem 0.55rem',
                borderRadius: '16px',
                fontSize: '0.78rem',
                fontWeight: 500,
                userSelect: 'none',
              }}
            >
              <span>{title}</span>
              <button
                type="button"
                onClick={(e) => removeJobTitle(title, e)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--cyan, #00E5C8)',
                  cursor: 'pointer',
                  padding: '0 2px',
                  fontSize: '0.85rem',
                  lineHeight: 1,
                  display: 'flex',
                  alignItems: 'center',
                  opacity: 0.8,
                }}
                title={`Retirer ${title}`}
              >
                <X size={12} />
              </button>
            </span>
          ))
        )}

        {/* Right Action Icons (Clear All + Dropdown Chevron) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginLeft: 'auto' }}>
          {selectedJobTitles.length > 0 && (
            <button
              type="button"
              onClick={clearAll}
              style={{
                background: 'rgba(255, 255, 255, 0.08)',
                border: 'none',
                borderRadius: '50%',
                width: '20px',
                height: '20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--text-muted, #94A3B8)',
                cursor: 'pointer',
                fontSize: '0.7rem',
                transition: 'all 0.15s ease',
              }}
              title="Tout désélectionner"
            >
              <X size={12} />
            </button>
          )}
          <span
            style={{
              color: 'var(--text-muted, #94A3B8)',
              fontSize: '0.75rem',
              transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s ease',
              display: 'inline-block',
            }}
          >
            ▼
          </span>
        </div>
      </div>

      {/* Floating Dropdown List */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            right: 0,
            zIndex: 1000,
            background: 'linear-gradient(160deg, rgba(8, 20, 38, 0.98) 0%, rgba(4, 12, 24, 0.99) 100%)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(0, 229, 200, 0.25)',
            borderRadius: '10px',
            boxShadow: '0 12px 32px rgba(0, 0, 0, 0.75), 0 0 20px rgba(0, 229, 200, 0.1)',
            maxHeight: '340px',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {/* Sticky Dedicated Search Header */}
          <div
            style={{
              padding: '0.55rem 0.75rem',
              borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
              background: 'rgba(0, 0, 0, 0.25)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <Search size={14} color="var(--cyan, #00E5C8)" style={{ flexShrink: 0, opacity: 0.8 }} />
            <input
              ref={searchInputRef}
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Rechercher un intitulé de poste..."
              style={{
                flex: 1,
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: 'var(--text-light, #F0F4F8)',
                fontSize: '0.825rem',
                padding: '0.2rem 0',
              }}
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#94A3B8',
                  cursor: 'pointer',
                  padding: '2px',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Subheader with selection counter and clear action */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '0.45rem 0.85rem',
              borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
              background: 'rgba(255, 255, 255, 0.02)',
              fontSize: '0.75rem',
              color: '#94A3B8',
            }}
          >
            <span>
              {selectedJobTitles.length > 0 ? (
                <strong style={{ color: 'var(--cyan, #00E5C8)' }}>
                  {selectedJobTitles.length} poste{selectedJobTitles.length > 1 ? 's' : ''} sélectionné{selectedJobTitles.length > 1 ? 's' : ''}
                </strong>
              ) : (
                'Sélectionnez un ou plusieurs postes cibles'
              )}
            </span>
            {selectedJobTitles.length > 0 && (
              <button
                type="button"
                onClick={clearAll}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#FF4757',
                  fontSize: '0.725rem',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                Tout effacer
              </button>
            )}
          </div>

          {/* Scrollable list of job titles */}
          <div
            style={{
              overflowY: 'auto',
              maxHeight: '250px',
              padding: '0.35rem 0',
            }}
          >
            {/* Custom option prompt if user entered text not in list */}
            {!isExactMatch && searchTerm.trim() && (
              <div
                onClick={addCustomJobTitle}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.65rem',
                  padding: '0.55rem 0.85rem',
                  margin: '0.2rem 0.45rem 0.35rem',
                  borderRadius: '6px',
                  fontSize: '0.8rem',
                  color: '#00E5C8',
                  background: 'rgba(0, 229, 200, 0.08)',
                  border: '1px dashed rgba(0, 229, 200, 0.35)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(0, 229, 200, 0.16)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(0, 229, 200, 0.08)';
                }}
              >
                <Plus size={14} color="#00E5C8" style={{ flexShrink: 0 }} />
                <span>Ajouter <strong>« {searchTerm.trim()} »</strong> comme intitulé personnalisé</span>
              </div>
            )}

            {filteredJobTitles.length > 0 ? (
              filteredJobTitles.map((title) => {
                const isSelected = selectedJobTitles.includes(title);
                const isAllSpecial = title === ALL_JOB_TITLES_OPTION;
                const isDecisionSpecial = title === DECISION_MAKER_SPECIAL_TITLE;

                return (
                  <div
                    key={title}
                    onClick={(e) => toggleJobTitle(title, e)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.65rem',
                      padding: '0.5rem 0.85rem',
                      fontSize: '0.825rem',
                      color: isSelected ? '#FFFFFF' : '#CBD5E1',
                      background: isSelected ? 'rgba(0, 229, 200, 0.12)' : ((isAllSpecial || isDecisionSpecial) ? 'rgba(255, 255, 255, 0.02)' : 'transparent'),
                      borderBottom: (isAllSpecial || isDecisionSpecial) ? '1px solid rgba(255, 255, 255, 0.06)' : 'none',
                      cursor: 'pointer',
                      transition: 'background 0.15s ease',
                      userSelect: 'none',
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) e.currentTarget.style.background = (isAllSpecial || isDecisionSpecial) ? 'rgba(255, 255, 255, 0.02)' : 'transparent';
                    }}
                  >
                    {/* Custom Checkbox */}
                    <div
                      style={{
                        width: '16px',
                        height: '16px',
                        borderRadius: '4px',
                        border: isSelected ? '1px solid var(--cyan, #00E5C8)' : '1px solid rgba(255, 255, 255, 0.25)',
                        backgroundColor: isSelected ? 'var(--cyan, #00E5C8)' : 'rgba(255, 255, 255, 0.04)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#040C18',
                        flexShrink: 0,
                      }}
                    >
                      {isSelected && <Check size={11} strokeWidth={3} />}
                    </div>

                    {/* Job Title Name */}
                    <span style={{ flex: 1, fontWeight: (isAllSpecial || isDecisionSpecial) ? 600 : 400 }}>{title}</span>
                  </div>
                );
              })
            ) : (
              <div
                style={{
                  padding: '1.25rem 0.85rem',
                  textAlign: 'center',
                  fontSize: '0.8rem',
                  color: '#64748B',
                }}
              >
                Aucun poste standard ne correspond à « {searchTerm} »
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
