'use client';

import React, { useEffect, useState } from 'react';
import { Check } from 'lucide-react';
import { fetchErpTypes, fetchUserConnections } from '@/shared/api/connections-api';

interface SkillErpSelectorProps {
  isOpen: boolean;
  isAdmin: boolean;
  activeErpType?: string | null;
  selected: string[];
  onChange: (erpTypes: string[]) => void;
  /** The ERP scope needs at least one ERP, so "all" is not offered. */
  requireErp: boolean;
}

/**
 * Multiple choice of the ERPs a skill applies to. No ERP selected means all ERPs.
 * Admins see the ERP catalog, other users the ERPs of their own connections.
 */
export const SkillErpSelector: React.FC<SkillErpSelectorProps> = ({
  isOpen,
  isAdmin,
  activeErpType,
  selected,
  onChange,
  requireErp,
}) => {
  const [labels, setLabels] = useState<Record<string, string>>({});
  const [available, setAvailable] = useState<string[]>([]);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    Promise.all([
      fetchErpTypes().catch(() => []),
      isAdmin ? Promise.resolve([]) : fetchUserConnections().catch(() => []),
    ]).then(([erpTypes, connections]) => {
      if (cancelled) return;
      setLabels(Object.fromEntries(erpTypes.map((erp) => [erp.id.toLowerCase(), erp.display_name])));
      setAvailable(
        isAdmin
          ? erpTypes.map((erp) => erp.id.toLowerCase())
          : connections.filter((c) => c.status === 'connected').map((c) => c.connector_type.toLowerCase())
      );
    });
    return () => {
      cancelled = true;
    };
  }, [isOpen, isAdmin]);

  const options = Array.from(new Set([...available, ...(activeErpType ? [activeErpType.toLowerCase()] : []), ...selected]));

  const toggle = (erp: string) => {
    onChange(selected.includes(erp) ? selected.filter((e) => e !== erp) : [...selected, erp]);
  };

  const chip = (label: string, isSelected: boolean, onClick: () => void) => (
    <button
      key={label}
      type="button"
      aria-pressed={isSelected}
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '7px 12px',
        borderRadius: '8px',
        fontSize: '12.5px',
        fontWeight: 600,
        cursor: 'pointer',
        border: isSelected ? '1px solid #00E5C8' : '1px solid rgba(255,255,255,0.12)',
        background: isSelected ? 'rgba(0, 229, 200, 0.12)' : '#111c30',
        color: isSelected ? '#00E5C8' : '#cbd5e1',
      }}
    >
      {isSelected && <Check size={13} />}
      {label}
    </button>
  );

  return (
    <div data-help="erp">
      <div style={{ fontSize: '11px', fontWeight: 600, color: '#00E5C8', marginBottom: '6px' }}>
        Cette compétence s&apos;applique à
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
        {!requireErp && chip('Tous les ERP', selected.length === 0, () => onChange([]))}
        {options.map((erp) => chip(labels[erp] || erp.toUpperCase(), selected.includes(erp), () => toggle(erp)))}
      </div>
    </div>
  );
};
