'use client';

import React, { useState, useRef } from 'react';

interface EmailSignatureEditorProps {
  value: string;
  onChange: (value: string) => void;
  onFocus?: () => void;
  onBlur?: () => void;
}

interface VisualSignatureState {
  fullName: string;
  jobTitle: string;
  company: string;
  phone: string;
  email: string;
  website: string;
  logoUrl: string;
  theme: 'sidebar' | 'classic' | 'minimal';
}

const SIGNATURE_PRESETS = [
  {
    name: 'Professionnel',
    html: `<table style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 13px; color: #1E293B; line-height: 1.4; border-collapse: collapse;" cellpadding="0" cellspacing="0">
  <tr>
    <td style="padding-right: 14px; border-right: 2px solid #00E5C8; vertical-align: middle;">
      <div style="width: 48px; height: 48px; border-radius: 8px; background: #081426; color: #00E5C8; font-weight: bold; font-size: 16px; text-align: center; line-height: 48px;">
        VD
      </div>
    </td>
    <td style="padding-left: 14px; vertical-align: middle;">
      <strong style="font-size: 15px; color: #0F172A;">Hamdi Triki</strong><br>
      <span style="color: #008f7d; font-weight: 600;">Technical Consultant</span> | <strong>VIRTUALDEV</strong><br>
      E-mail: <a href="mailto:hamdi.triki@virtualdev.tn" style="color: #475569; text-decoration: none;">hamdi.triki@virtualdev.tn</a><br>
      Mob: +216 29 400 566 &nbsp;•&nbsp; Tel: +216 71 191 616<br>
      <a href="https://www.virtualdev.tn" style="color: #00E5C8; text-decoration: none;">www.virtualdev.tn</a>
    </td>
  </tr>
</table>
<p style="margin-top: 10px; font-size: 11px; color: #64748B; font-style: italic; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  Adoptez l'éco-attitude. N'imprimez cet email que si c'est vraiment nécessaire.
</p>`,
  },
  {
    name: 'Corporate',
    html: `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 13px; color: #1E293B; line-height: 1.4;">
  <div style="border-left: 3px solid #00E5C8; padding-left: 12px; margin-bottom: 6px;">
    <strong style="font-size: 15px; color: #0F172A;">Direction Commerciale</strong><br>
    <span style="color: #008f7d; font-weight: 600;">Département Développement & Solutions</span>
  </div>
  <p style="margin: 0; font-size: 12px; color: #64748B;">
    Tel: +216 71 191 616 &nbsp;•&nbsp; E-mail: <a href="mailto:contact@virtualdev.tn" style="color: #008f7d; text-decoration: none;">contact@virtualdev.tn</a> &nbsp;•&nbsp; <a href="https://www.virtualdev.tn" style="color: #00E5C8; text-decoration: none;">www.virtualdev.tn</a>
  </p>
</div>`,
  },
  {
    name: 'Minimaliste',
    html: `<p style="margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 13px; color: #1E293B; line-height: 1.5;">
  Cordialement,<br>
  <strong style="color: #0F172A;">Hamdi Triki</strong><br>
  <span style="color: #64748B; font-size: 12px;">Mob: +216 29 400 566 &nbsp;•&nbsp; Tel: +216 71 191 616</span><br>
  <a href="https://www.virtualdev.tn" style="color: #008f7d; text-decoration: none; font-size: 12px;">www.virtualdev.tn</a>
</p>`,
  },
];

export const EmailSignatureEditor: React.FC<EmailSignatureEditorProps> = ({
  value,
  onChange,
  onFocus,
  onBlur,
}) => {
  const [editorMode, setEditorMode] = useState<'visual' | 'code'>('visual');
  const [isDragging, setIsDragging] = useState(false);
  const [visualState, setVisualState] = useState<VisualSignatureState>({
    fullName: '',
    jobTitle: '',
    company: '',
    phone: '',
    email: '',
    website: '',
    logoUrl: '',
    theme: 'sidebar',
  });

  const visualLogoInputRef = useRef<HTMLInputElement>(null);
  const codeImageInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Generate HTML from visual state
  const buildHtmlFromVisualState = (state: VisualSignatureState): string => {
    const { fullName, jobTitle, company, phone, email, website, logoUrl, theme } = state;

    if (!fullName && !company && !phone && !email && !logoUrl) {
      return '';
    }

    if (theme === 'minimal') {
      return `<p style="margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 13px; color: #334155; line-height: 1.5;">
  Cordialement,<br>
  ${fullName ? `<strong>${fullName}</strong>` : ''}${jobTitle ? ` — ${jobTitle}` : ''}${company ? `<br><span style="color: #64748B;">${company}</span>` : ''}
  ${phone || email || website ? `<br><span style="font-size: 12px; color: #64748B;">${[phone, email ? `<a href="mailto:${email}" style="color: #008f7d; text-decoration: none;">${email}</a>` : '', website ? `<a href="${website.startsWith('http') ? website : `https://${website}`}" style="color: #008f7d; text-decoration: none;">${website}</a>` : ''].filter(Boolean).join(' | ')}</span>` : ''}
  ${logoUrl ? `<br><img src="${logoUrl}" alt="Logo" style="max-height: 40px; width: auto; margin-top: 8px; display: block;" />` : ''}
</p>`;
    }

    if (theme === 'classic') {
      return `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 13px; color: #1E293B; line-height: 1.4;">
  <p style="margin: 0 0 6px 0;">
    ${fullName ? `<strong style="font-size: 15px; color: #0F172A;">${fullName}</strong><br>` : ''}
    ${jobTitle ? `<span style="color: #008f7d; font-weight: 600;">${jobTitle}</span>` : ''}${jobTitle && company ? ' — ' : ''}${company ? `<strong>${company}</strong>` : ''}
  </p>
  <p style="margin: 0; font-size: 12px; color: #64748B;">
    ${phone ? `${phone}&nbsp;&nbsp;` : ''}
    ${email ? `<a href="mailto:${email}" style="color: #008f7d; text-decoration: none;">${email}</a>&nbsp;&nbsp;` : ''}
    ${website ? `<a href="${website.startsWith('http') ? website : `https://${website}`}" style="color: #008f7d; text-decoration: none;">${website}</a>` : ''}
  </p>
  ${logoUrl ? `<img src="${logoUrl}" alt="Logo" style="max-height: 45px; width: auto; margin-top: 10px; display: block;" />` : ''}
</div>`;
    }

    // Default: 'sidebar' with cyan vertical bar and logo/avatar
    return `<table cellpadding="0" cellspacing="0" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 13px; color: #1E293B; line-height: 1.4; border-collapse: collapse;">
  <tr>
    ${
      logoUrl
        ? `<td style="padding-right: 14px; vertical-align: middle; border-right: 2px solid #00E5C8;">
      <img src="${logoUrl}" alt="Logo" style="max-height: 52px; max-width: 90px; width: auto; display: block; border-radius: 4px;" />
    </td>`
        : ''
    }
    <td style="padding-left: ${logoUrl ? '14px' : '0'}; vertical-align: middle;">
      ${fullName ? `<div style="font-size: 15px; font-weight: bold; color: #0F172A;">${fullName}</div>` : ''}
      ${
        jobTitle || company
          ? `<div style="font-size: 13px; color: #475569; margin-top: 2px;">
        ${jobTitle ? `<span style="color: #008f7d; font-weight: 600;">${jobTitle}</span>` : ''}${jobTitle && company ? ' | ' : ''}${company ? `<strong>${company}</strong>` : ''}
      </div>`
          : ''
      }
      ${
        phone || email || website
          ? `<div style="font-size: 12px; color: #64748B; margin-top: 4px;">
        ${[phone, email ? `<a href="mailto:${email}" style="color: #008f7d; text-decoration: none;">${email}</a>` : '', website ? `<a href="${website.startsWith('http') ? website : `https://${website}`}" style="color: #008f7d; text-decoration: none;">${website}</a>` : ''].filter(Boolean).join(' &nbsp;•&nbsp; ')}
      </div>`
          : ''
      }
    </td>
  </tr>
</table>`;
  };

  const updateVisualField = <K extends keyof VisualSignatureState>(
    field: K,
    val: VisualSignatureState[K]
  ) => {
    const updated = { ...visualState, [field]: val };
    setVisualState(updated);
    onChange(buildHtmlFromVisualState(updated));
  };

  // Helper to insert snippet in Code Mode at cursor position
  const insertSnippetInCode = (snippet: string) => {
    const textarea = textareaRef.current;
    if (!textarea) {
      onChange(value + '\n' + snippet);
      return;
    }
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const textBefore = value.substring(0, start);
    const textAfter = value.substring(end);
    const newValue = textBefore + snippet + textAfter;
    onChange(newValue);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + snippet.length, start + snippet.length);
    }, 50);
  };

  // Compress & convert image file to Base64
  const processImageFile = (file: File, callback: (dataUrl: string) => void) => {
    if (!file.type.startsWith('image/')) {
      alert('Veuillez sélectionner un fichier image valide (PNG, JPG, SVG).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxDim = 320;
        let width = img.width;
        let height = img.height;
        if (width > height && width > maxDim) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else if (height > maxDim) {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/png', 0.88);
        callback(dataUrl);
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Code Mode image upload
  const handleCodeImageUpload = (file: File) => {
    processImageFile(file, (dataUrl) => {
      const imgHtml = `\n<img src="${dataUrl}" alt="Logo" style="max-width: 160px; height: auto; margin-top: 8px; display: block;" />\n`;
      insertSnippetInCode(imgHtml);
    });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDropInCode = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleCodeImageUpload(e.dataTransfer.files[0]);
    }
  };

  const isHtml = (str: string) => /<[a-z][\s\S]*>/i.test(str);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '0.85rem',
        width: '100%',
      }}
    >
      {/* Hidden file inputs */}
      <input
        ref={visualLogoInputRef}
        type="file"
        accept="image/png, image/jpeg, image/webp, image/svg+xml"
        style={{ display: 'none' }}
        onChange={(e) => {
          if (e.target.files && e.target.files[0]) {
            processImageFile(e.target.files[0], (dataUrl) => updateVisualField('logoUrl', dataUrl));
            e.target.value = '';
          }
        }}
      />

      <input
        ref={codeImageInputRef}
        type="file"
        accept="image/png, image/jpeg, image/webp, image/svg+xml"
        style={{ display: 'none' }}
        onChange={(e) => {
          if (e.target.files && e.target.files[0]) {
            handleCodeImageUpload(e.target.files[0]);
            e.target.value = '';
          }
        }}
      />

      {/* Top Header: Mode Switcher & Presets */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '0.5rem',
        }}
      >
        {/* Mode Switcher */}
        <div
          style={{
            display: 'flex',
            background: 'rgba(255, 255, 255, 0.04)',
            padding: '3px',
            borderRadius: '8px',
            border: '1px solid rgba(255, 255, 255, 0.08)',
          }}
        >
          <button
            type="button"
            onClick={() => setEditorMode('visual')}
            style={{
              padding: '0.35rem 0.85rem',
              borderRadius: '6px',
              fontSize: '0.78rem',
              fontWeight: 600,
              background: editorMode === 'visual' ? 'rgba(0, 229, 200, 0.15)' : 'transparent',
              color: editorMode === 'visual' ? '#00E5C8' : '#94A3B8',
              border: editorMode === 'visual' ? '1px solid rgba(0, 229, 200, 0.35)' : '1px solid transparent',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              transition: 'all 0.15s ease',
            }}
          >
            Générateur Visuel (Simple)
          </button>

          <button
            type="button"
            onClick={() => setEditorMode('code')}
            style={{
              padding: '0.35rem 0.85rem',
              borderRadius: '6px',
              fontSize: '0.78rem',
              fontWeight: 600,
              background: editorMode === 'code' ? 'rgba(0, 229, 200, 0.15)' : 'transparent',
              color: editorMode === 'code' ? '#00E5C8' : '#94A3B8',
              border: editorMode === 'code' ? '1px solid rgba(0, 229, 200, 0.35)' : '1px solid transparent',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              transition: 'all 0.15s ease',
            }}
          >
            Code HTML (Avancé)
          </button>
        </div>

        {/* Presets Bar Always Visible */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.75rem', color: '#64748B' }}>Modèles prêts à l&apos;emploi :</span>
          {SIGNATURE_PRESETS.map((preset) => (
            <button
              key={preset.name}
              type="button"
              onClick={() => {
                if (preset.name === 'Professionnel') {
                  setVisualState({
                    fullName: 'Hamdi Triki',
                    jobTitle: 'Technical Consultant',
                    company: 'VIRTUALDEV',
                    phone: '+216 29 400 566 / +216 71 191 616',
                    email: 'hamdi.triki@virtualdev.tn',
                    website: 'www.virtualdev.tn',
                    logoUrl: '',
                    theme: 'sidebar',
                  });
                } else if (preset.name === 'Corporate') {
                  setVisualState({
                    fullName: 'Direction Commerciale',
                    jobTitle: 'Département Développement',
                    company: 'VIRTUALDEV',
                    phone: '+216 71 191 616',
                    email: 'contact@virtualdev.tn',
                    website: 'www.virtualdev.tn',
                    logoUrl: '',
                    theme: 'classic',
                  });
                } else {
                  setVisualState({
                    fullName: 'Hamdi Triki',
                    jobTitle: '',
                    company: 'VIRTUALDEV',
                    phone: '+216 29 400 566',
                    email: '',
                    website: 'www.virtualdev.tn',
                    logoUrl: '',
                    theme: 'minimal',
                  });
                }
                onChange(preset.html);
              }}
              style={{
                padding: '0.25rem 0.55rem',
                borderRadius: '6px',
                fontSize: '0.725rem',
                fontWeight: 500,
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                color: '#CBD5E1',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'rgba(0, 229, 200, 0.3)';
                e.currentTarget.style.color = '#00E5C8';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                e.currentTarget.style.color = '#CBD5E1';
              }}
            >
              <span>{preset.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* MODE 1: VISUAL FORM BUILDER (Zero Code) */}
      {editorMode === 'visual' ? (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1.2fr 1fr',
            gap: '1rem',
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '10px',
            padding: '1rem',
          }}
        >
          {/* Left: Simple Fields */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem' }}>
              <div>
                <label style={fieldLabelStyle}>Nom & Prénom</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Ex: Hamdi Triki"
                  value={visualState.fullName}
                  onFocus={onFocus}
                  onBlur={onBlur}
                  onChange={(e) => updateVisualField('fullName', e.target.value)}
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={fieldLabelStyle}>Poste / Titre</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Ex: Technical Consultant"
                  value={visualState.jobTitle}
                  onFocus={onFocus}
                  onBlur={onBlur}
                  onChange={(e) => updateVisualField('jobTitle', e.target.value)}
                  style={inputStyle}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem' }}>
              <div>
                <label style={fieldLabelStyle}>Entreprise</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Ex: VIRTUALDEV"
                  value={visualState.company}
                  onFocus={onFocus}
                  onBlur={onBlur}
                  onChange={(e) => updateVisualField('company', e.target.value)}
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={fieldLabelStyle}>Téléphone / Mobile</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Ex: +216 71 191 616 / +216 29 400 566"
                  value={visualState.phone}
                  onFocus={onFocus}
                  onBlur={onBlur}
                  onChange={(e) => updateVisualField('phone', e.target.value)}
                  style={inputStyle}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem' }}>
              <div>
                <label style={fieldLabelStyle}>Email de contact</label>
                <input
                  type="email"
                  className="form-input"
                  placeholder="Ex: contact@virtualdev.tn"
                  value={visualState.email}
                  onFocus={onFocus}
                  onBlur={onBlur}
                  onChange={(e) => updateVisualField('email', e.target.value)}
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={fieldLabelStyle}>Site Web</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Ex: www.virtualdev.tn"
                  value={visualState.website}
                  onFocus={onFocus}
                  onBlur={onBlur}
                  onChange={(e) => updateVisualField('website', e.target.value)}
                  style={inputStyle}
                />
              </div>
            </div>

            {/* Logo Upload */}
            <div>
              <label style={fieldLabelStyle}>Logo ou Avatar (PNG / JPG)</label>
              <div
                onClick={() => visualLogoInputRef.current?.click()}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.5rem 0.85rem',
                  border: '1px dashed rgba(0, 229, 200, 0.35)',
                  borderRadius: '6px',
                  backgroundColor: 'rgba(0, 229, 200, 0.03)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(0, 229, 200, 0.08)')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'rgba(0, 229, 200, 0.03)')}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.78rem', color: '#94A3B8' }}>
                  <span>{visualState.logoUrl ? 'Changer le logo PNG...' : 'Cliquer pour importer un logo PNG...'}</span>
                </div>

                {visualState.logoUrl && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <img
                      src={visualState.logoUrl}
                      alt="Logo preview"
                      style={{ maxHeight: '28px', maxWidth: '50px', borderRadius: '3px' }}
                    />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        updateVisualField('logoUrl', '');
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#FF4757',
                        cursor: 'pointer',
                        fontSize: '0.75rem',
                      }}
                      title="Supprimer le logo"
                    >
                      ✕
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right: Live Email Preview */}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <label style={fieldLabelStyle}>Aperçu de l&apos;Email en direct</label>
            <div
              style={{
                flex: 1,
                minHeight: '180px',
                backgroundColor: '#FFFFFF',
                borderRadius: '8px',
                padding: '1rem',
                border: '1px solid #E2E8F0',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div style={{ color: '#94A3B8', fontSize: '11px', marginBottom: '0.75rem', borderBottom: '1px dashed #E2E8F0', paddingBottom: '0.4rem' }}>
                  <em>... [Exemple : Corps de l&apos;email de prospection] ...</em>
                </div>

                {value ? (
                  <div
                    className="email-signature-rendered-content"
                    style={{
                      color: '#1E293B',
                      fontSize: '13px',
                      lineHeight: '1.5',
                      wordBreak: 'break-word',
                    }}
                  >
                    <style>{`
                      .email-signature-rendered-content,
                      .email-signature-rendered-content p,
                      .email-signature-rendered-content span,
                      .email-signature-rendered-content div,
                      .email-signature-rendered-content td,
                      .email-signature-rendered-content strong,
                      .email-signature-rendered-content em {
                        color: #1E293B;
                      }
                      .email-signature-rendered-content a {
                        color: #008f7d !important;
                      }
                    `}</style>
                    {isHtml(value) ? (
                      <div dangerouslySetInnerHTML={{ __html: value }} />
                    ) : (
                      <div style={{ whiteSpace: 'pre-wrap', color: '#1E293B' }}>{value}</div>
                    )}
                  </div>
                ) : (
                  <div style={{ color: '#94A3B8', fontSize: '12px', fontStyle: 'italic', paddingTop: '1rem', textAlign: 'center' }}>
                    Remplissez les champs à gauche pour voir votre signature s&apos;afficher en direct.
                  </div>
                )}
              </div>

              <div style={{ textAlign: 'right', fontSize: '10px', color: '#94A3B8', marginTop: '0.5rem' }}>
                Prêt pour l&apos;envoi
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* MODE 2: CODE HTML AVANCÉ (Power Suite) */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
          {/* Advanced Formatting Toolbar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              padding: '0.4rem 0.65rem',
              background: 'rgba(255, 255, 255, 0.02)',
              borderRadius: '6px',
              border: '1px solid rgba(255, 255, 255, 0.06)',
              flexWrap: 'wrap',
            }}
          >
            {/* Upload image button */}
            <button
              type="button"
              onClick={() => codeImageInputRef.current?.click()}
              style={{
                padding: '0.2rem 0.55rem',
                borderRadius: '4px',
                fontSize: '0.75rem',
                background: 'rgba(0, 229, 200, 0.1)',
                border: '1px solid rgba(0, 229, 200, 0.3)',
                color: '#00E5C8',
                cursor: 'pointer',
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
              }}
              title="Insérer un logo ou une image PNG/JPEG"
            >
              + Insérer Image PNG
            </button>

            <span style={{ color: 'rgba(255, 255, 255, 0.15)', margin: '0 2px' }}>|</span>

            {/* Quick HTML tags */}
            <button
              type="button"
              onClick={() => insertSnippetInCode('<strong>Texte en gras</strong>')}
              style={toolbarBtnStyle}
              title="Gras"
            >
              <b>B</b>
            </button>

            <button
              type="button"
              onClick={() => insertSnippetInCode('<em>Texte en italique</em>')}
              style={toolbarBtnStyle}
              title="Italique"
            >
              <i>I</i>
            </button>

            <button
              type="button"
              onClick={() => insertSnippetInCode('<a href="https://votresite.com" style="color: #00E5C8; text-decoration: none;">Lien</a>')}
              style={toolbarBtnStyle}
              title="Insérer un lien"
            >
              Lien
            </button>

            <button
              type="button"
              onClick={() => insertSnippetInCode('<br>')}
              style={toolbarBtnStyle}
              title="Saut de ligne"
            >
              ↵ Ligne
            </button>

            <button
              type="button"
              onClick={() => insertSnippetInCode('<hr style="border: none; border-top: 1px solid #E2E8F0; margin: 12px 0;" />')}
              style={toolbarBtnStyle}
              title="Ligne de séparation"
            >
              ― Séparateur
            </button>
          </div>

          {/* Textarea with Drag & Drop */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDropInCode}
            style={{ position: 'relative', width: '100%' }}
          >
            <textarea
              ref={textareaRef}
              className="form-input"
              value={value}
              onFocus={onFocus}
              onBlur={onBlur}
              onChange={(e) => onChange(e.target.value)}
              placeholder="Collez ou écrivez votre code HTML de signature..."
              style={{
                width: '100%',
                minHeight: '140px',
                fontFamily: isHtml(value) ? 'monospace, sans-serif' : 'inherit',
                fontSize: isHtml(value) ? '12px' : '13px',
                lineHeight: '1.5',
                padding: '0.75rem',
                backgroundColor: isDragging ? 'rgba(0, 229, 200, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                border: isDragging ? '1px dashed #00E5C8' : '1px solid var(--border, rgba(255, 255, 255, 0.12))',
                borderRadius: '8px',
                color: 'var(--text-light, #F0F4F8)',
                resize: 'vertical',
              }}
            />

            {isDragging && (
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: 'rgba(6, 17, 31, 0.85)',
                  border: '2px dashed #00E5C8',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#00E5C8',
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  pointerEvents: 'none',
                }}
              >
                Déposez votre image PNG pour l&apos;insérer dans la signature
              </div>
            )}
          </div>

          {/* Real-time HTML Preview Box */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '8px',
              padding: '1rem',
              border: '1px solid #E2E8F0',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            }}
          >
            <div style={{ color: '#94A3B8', fontSize: '11px', marginBottom: '0.5rem', borderBottom: '1px dashed #E2E8F0', paddingBottom: '0.4rem' }}>
              <em>Aperçu du rendu HTML :</em>
            </div>
            {value ? (
              <div
                className="email-signature-code-rendered-content"
                style={{
                  color: '#1E293B',
                  fontSize: '13px',
                  lineHeight: '1.5',
                  wordBreak: 'break-word',
                }}
              >
                <style>{`
                  .email-signature-code-rendered-content,
                  .email-signature-code-rendered-content p,
                  .email-signature-code-rendered-content span,
                  .email-signature-code-rendered-content div,
                  .email-signature-code-rendered-content td,
                  .email-signature-code-rendered-content strong,
                  .email-signature-code-rendered-content em {
                    color: #1E293B;
                  }
                  .email-signature-code-rendered-content a {
                    color: #008f7d !important;
                  }
                `}</style>
                {isHtml(value) ? (
                  <div dangerouslySetInnerHTML={{ __html: value }} />
                ) : (
                  <div style={{ whiteSpace: 'pre-wrap', color: '#1E293B' }}>{value}</div>
                )}
              </div>
            ) : (
              <div style={{ color: '#94A3B8', fontSize: '12px', fontStyle: 'italic' }}>Aucune signature.</div>
            )}
          </div>
        </div>
      )}

      {/* Footer info */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.725rem', color: '#64748B' }}>
        <span>
          <em>Vous pouvez basculer entre le générateur visuel et le code HTML à tout moment.</em>
        </span>
        <span>{value ? `${value.length} caractères` : '0 caractère'}</span>
      </div>
    </div>
  );
};

const fieldLabelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '0.75rem',
  color: '#94A3B8',
  marginBottom: '0.25rem',
  fontWeight: 500,
};

const inputStyle: React.CSSProperties = {
  padding: '0.4rem 0.65rem',
  fontSize: '0.8rem',
  borderRadius: '6px',
  background: 'rgba(10, 15, 28, 0.8)',
  border: '1px solid rgba(255, 255, 255, 0.12)',
  color: '#F0F4F8',
  width: '100%',
};

const toolbarBtnStyle: React.CSSProperties = {
  padding: '0.2rem 0.45rem',
  borderRadius: '4px',
  fontSize: '0.725rem',
  background: 'rgba(255, 255, 255, 0.05)',
  border: '1px solid rgba(255, 255, 255, 0.08)',
  color: '#CBD5E1',
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
};
