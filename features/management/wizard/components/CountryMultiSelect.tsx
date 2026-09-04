'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { COUNTRIES, Country } from '@/shared/constants/countries';

interface CountryMultiSelectProps {
  selectedCountries: string[];
  onChange: (countries: string[]) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  placeholder?: string;
}

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
  const inputRef = useRef<HTMLInputElement>(null);

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

  // Normalize string for accent-insensitive search
  const normalize = (str: string) =>
    str
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');

  const filteredCountries = useMemo(() => {
    if (!searchTerm.trim()) return COUNTRIES;
    const normSearch = normalize(searchTerm);
    return COUNTRIES.filter(
      (c) => normalize(c.name).includes(normSearch) || normalize(c.code).includes(normSearch)
    );
  }, [searchTerm]);

  const toggleCountry = (countryName: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (selectedCountries.includes(countryName)) {
      onChange(selectedCountries.filter((item) => item !== countryName));
    } else {
      onChange([...selectedCountries, countryName]);
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
      {/* Box Displaying Selected Chips and Input/Trigger */}
      <div
        onClick={() => {
          setIsOpen(true);
          inputRef.current?.focus();
          if (onFocus) onFocus();
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
        {/* Selected Chips */}
        {selectedCountries.map((countryName) => (
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
              ✕
            </button>
          </span>
        ))}

        {/* Input for searching inside the trigger */}
        <input
          ref={inputRef}
          type="text"
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          onFocus={() => {
            setIsOpen(true);
            if (onFocus) onFocus();
          }}
          placeholder={selectedCountries.length === 0 ? placeholder : 'Ajouter un pays...'}
          style={{
            flex: 1,
            minWidth: '140px',
            background: 'transparent',
            border: 'none',
            outline: 'none',
            color: 'var(--text-light, #F0F4F8)',
            fontSize: '0.825rem',
            padding: '0.2rem 0',
          }}
        />

        {/* Right Arrow / Clear indicators */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginLeft: 'auto' }}>
          {selectedCountries.length > 0 && (
            <button
              type="button"
              onClick={clearAll}
              style={{
                background: 'rgba(255, 255, 255, 0.08)',
                border: 'none',
                borderRadius: '50%',
                width: '18px',
                height: '18px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--text-muted, #94A3B8)',
                cursor: 'pointer',
                fontSize: '0.7rem',
              }}
              title="Tout désélectionner"
            >
              ✕
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
            top: 'calc(100% + 4px)',
            left: 0,
            right: 0,
            zIndex: 1000,
            background: 'linear-gradient(160deg, rgba(8, 20, 38, 0.98) 0%, rgba(4, 12, 24, 0.99) 100%)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(0, 229, 200, 0.25)',
            borderRadius: '10px',
            boxShadow: '0 12px 32px rgba(0, 0, 0, 0.75), 0 0 20px rgba(0, 229, 200, 0.1)',
            maxHeight: '280px',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {/* Header with counter and clear */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '0.5rem 0.85rem',
              borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
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
                      background: isSelected ? 'rgba(0, 229, 200, 0.12)' : 'transparent',
                      cursor: 'pointer',
                      transition: 'background 0.15s ease',
                      userSelect: 'none',
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) e.currentTarget.style.background = 'transparent';
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
                        fontSize: '0.65rem',
                        fontWeight: 900,
                        flexShrink: 0,
                      }}
                    >
                      {isSelected && '✓'}
                    </div>

                    {/* Country Name */}
                    <span style={{ flex: 1 }}>{c.name}</span>

                    {/* ISO Code Badge */}
                    <span
                      style={{
                        fontSize: '0.7rem',
                        fontFamily: 'monospace',
                        color: isSelected ? 'var(--cyan, #00E5C8)' : '#64748B',
                        backgroundColor: 'rgba(255, 255, 255, 0.04)',
                        padding: '1px 5px',
                        borderRadius: '4px',
                        border: '1px solid rgba(255, 255, 255, 0.06)',
                      }}
                    >
                      {c.code}
                    </span>
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
