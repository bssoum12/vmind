'use client';

import React from 'react';
import { Check } from 'lucide-react';
import type { GuidedSection, SectionValues } from './skill-guided-form';

interface SkillGuidedFieldsProps {
  tabs: GuidedSection[];
  helpKey: string;
  freeDescription: boolean;
  description: string;
  quand: string;
  pasPour: string;
  sections: SectionValues;
  activeSection: string;
  title: string;
  onDescriptionChange: (value: string) => void;
  onQuandChange: (value: string) => void;
  onPasPourChange: (value: string) => void;
  onSectionChange: (key: string, value: string) => void;
  onActiveSectionChange: (key: string) => void;
  onTitleChange: (value: string) => void;
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '11px',
  fontWeight: 600,
  color: '#00E5C8',
  marginBottom: '6px',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '9px 12px',
  borderRadius: '8px',
  background: '#111c30',
  border: '1px solid rgba(255,255,255,0.12)',
  color: '#fff',
  fontSize: '13px',
};

/**
 * The fields shown when Mode expert is off.
 * One section is visible at a time, so the window keeps the same height.
 */
export const SkillGuidedFields: React.FC<SkillGuidedFieldsProps> = ({
  tabs,
  helpKey,
  freeDescription,
  description,
  quand,
  pasPour,
  sections,
  activeSection,
  title,
  onDescriptionChange,
  onQuandChange,
  onPasPourChange,
  onSectionChange,
  onActiveSectionChange,
  onTitleChange,
}) => (
  <>
    {freeDescription ? (
      <div data-help="description">
        <label htmlFor="skill-description" style={labelStyle}>
          Description *
        </label>
        <textarea
          id="skill-description"
          rows={3}
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          required
          style={{ ...inputStyle, display: 'block', fontFamily: 'inherit', lineHeight: 1.5, resize: 'vertical' }}
        />
      </div>
    ) : (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
        <div data-help="quand">
          <label htmlFor="skill-quand" style={labelStyle}>
            Quand on demande *
          </label>
          <input
            id="skill-quand"
            type="text"
            value={quand}
            onChange={(e) => onQuandChange(e.target.value)}
            required
            style={inputStyle}
          />
        </div>

        <div data-help="pasPour">
          <label htmlFor="skill-pas-pour" style={labelStyle}>
            Pas pour
          </label>
          <input
            id="skill-pas-pour"
            type="text"
            value={pasPour}
            onChange={(e) => onPasPourChange(e.target.value)}
            style={inputStyle}
          />
        </div>
      </div>
    )}

    <div data-help={helpKey}>
      <div style={labelStyle}>Ce que l&apos;assistant doit faire</div>
      <div role="tablist" style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
        {tabs.map((section) => {
          const isActive = section.key === activeSection;
          const isFilled = Boolean(sections[section.key]?.trim());
          return (
            <button
              key={section.key}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => onActiveSectionChange(section.key)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '5px 11px',
                borderRadius: '7px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                border: isActive ? '1px solid #00E5C8' : '1px solid rgba(255,255,255,0.12)',
                background: isActive ? 'rgba(0, 229, 200, 0.12)' : 'transparent',
                color: isActive ? '#00E5C8' : '#cbd5e1',
              }}
            >
              {isFilled && <Check size={12} aria-label="Rempli" />}
              {section.title}
              {section.required ? ' *' : ''}
            </button>
          );
        })}
      </div>
      <textarea
        id="skill-section"
        aria-label={tabs.find((s) => s.key === activeSection)?.title}
        value={sections[activeSection] || ''}
        onChange={(e) => onSectionChange(activeSection, e.target.value)}
        style={{ ...inputStyle, display: 'block', height: '120.5px', fontFamily: 'inherit', lineHeight: 1.5, resize: 'vertical' }}
      />
    </div>

    <div data-help="nom">
      <label htmlFor="skill-nom" style={labelStyle}>
        Nom court *
      </label>
      <input
        id="skill-nom"
        type="text"
        value={title}
        onChange={(e) => onTitleChange(e.target.value)}
        required
        maxLength={200}
        style={inputStyle}
      />
    </div>
  </>
);
