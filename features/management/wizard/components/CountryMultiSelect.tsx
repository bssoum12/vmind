'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, X, Check } from 'lucide-react';
import { Country } from '@/shared/constants/countries';
import { useIcpOptions } from '../hooks/useIcpOptions';

interface CountryMultiSelectProps {
  selectedCountries: string[];
  onChange: (countries: string[]) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  placeholder?: string;
}

const ALL_ZONES_OPTION = "Toutes les zones géographiques";

export const CountryMultiSelect: React.FC<CountryMultiSelectProps> = ({
  selectedCountries,
  onChange,
  onFocus,
  onBlur,
  placeholder = 'Sélectionner un ou plusieurs pays...'
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

  const { countries } = useIcpOptions();

  const allAvailableCountries = useMemo(() => {
    return [{ name: ALL_ZONES_OPTION, code: 'GLOBAL' } as Country, ...countries];
  }, [countries]);

  const filteredCountries = useMemo(() => {
    if (!searchTerm.trim()) return allAvailableCountries;
    const normSearch = normalize(searchTerm);
    return allAvailableCountries.filter(
      (c) => normalize(c.name).includes(normSearch) || normalize(c.code).includes(normSearch)
    );
  }, [searchTerm, allAvailableCountries]);

  const toggleCountry = (countryName: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (selectedCountries.includes(countryName)) {
      onChange(selectedCountries.filter((item) => item !== countryName));
    } else {
      if (countryName === ALL_ZONES_OPTION) {
        onChange([ALL_ZONES_OPTION]);
      } else {
        onChange([...selectedCountries.filter(item => item !== ALL_ZONES_OPTION), countryName]);
      }
    }
  };

  const removeCountry = (countryName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(selectedCountries.filter((item) => item !== countryName));
  };

  const clearAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange([]);
  };

  return (
    <div
      ref={containerRef}
      className="country-multiselect-container"
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
        {selectedCountries.length === 0 ? (
          <span style={{ color: '#64748B', fontSize: '0.825rem', userSelect: 'none', padding: '0.2rem 0' }}>
            {placeholder}
          </span>
        ) : (
          selectedCountries.map((countryName) => (
            <span
              key={countryName}
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
              <span>{countryName}</span>
              <button
                type="button"
                onClick={(e) => removeCountry(countryName, e)}
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
                title={`Retirer ${countryName}`}
              >
                <X size={12} />
              </button>
            </span>
          ))
        )}

        {/* Right Action Icons (Clear All + Dropdown Chevron) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginLeft: 'auto' }}>
          {selectedCountries.length > 0 && (
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
            maxHeight: '320px',
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
              placeholder="Rechercher un pays..."
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
              {selectedCountries.length > 0 ? (
                <strong style={{ color: 'var(--cyan, #00E5C8)' }}>
                  {selectedCountries.length} pays sélectionné{selectedCountries.length > 1 ? 's' : ''}
                </strong>
              ) : (
                'Sélectionnez un ou plusieurs pays'
              )}
            </span>
            {selectedCountries.length > 0 && (
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

          {/* Scrollable list of countries */}
          <div
            style={{
              overflowY: 'auto',
              maxHeight: '230px',
              padding: '0.35rem 0',
            }}
          >
            {filteredCountries.length > 0 ? (
              filteredCountries.map((c) => {
                const isSelected = selectedCountries.includes(c.name);
                const isAllSpecial = c.name === ALL_ZONES_OPTION;

                return (
                  <div
                    key={c.code}
                    onClick={(e) => toggleCountry(c.name, e)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.65rem',
                      padding: '0.5rem 0.85rem',
                      fontSize: '0.825rem',
                      color: isSelected ? '#FFFFFF' : '#CBD5E1',
                      background: isSelected ? 'rgba(0, 229, 200, 0.12)' : (isAllSpecial ? 'rgba(255, 255, 255, 0.02)' : 'transparent'),
                      borderBottom: isAllSpecial ? '1px solid rgba(255, 255, 255, 0.06)' : 'none',
                      cursor: 'pointer',
                      transition: 'background 0.15s ease',
                      userSelect: 'none',
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) e.currentTarget.style.background = isAllSpecial ? 'rgba(255, 255, 255, 0.02)' : 'transparent';
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

                    {/* Country Name */}
                    <span style={{ flex: 1, fontWeight: isAllSpecial ? 600 : 400 }}>{c.name}</span>
                    {c.code !== 'GLOBAL' && (
                      <span style={{ fontSize: '0.7rem', color: '#64748B', fontFamily: 'monospace' }}>{c.code}</span>
                    )}
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
                Aucun pays ne correspond à « {searchTerm} »
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
