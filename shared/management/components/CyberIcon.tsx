'use client';

import React from 'react';

export type CyberIconName = 
  | 'zap'
  | 'arrow-right'
  | 'check'
  | 'sparkles'
  | 'search'
  | 'flame'
  | 'link'
  | 'rocket'
  | 'star'
  | 'bot'
  | 'target'
  | 'close'
  | 'mail'
  | 'file'
  | 'refresh'
  | 'eye'
  | 'database'
  | 'settings'
  | 'edit'
  | 'chart';

export interface CyberIconProps {
  name: CyberIconName;
  size?: number;
  color?: string;
  variant?: 'cyan' | 'gold' | 'coral' | 'purple' | 'current' | 'muted';
  className?: string;
  style?: React.CSSProperties;
}

const COLOR_MAP: Record<string, string> = {
  cyan: '#00E5C8',
  gold: '#FFB800',
  coral: '#FF4757',
  purple: '#A855F7',
  current: 'currentColor',
  muted: '#94A3B8'
};

export const CyberIcon: React.FC<CyberIconProps> = ({
  name,
  size = 14,
  color,
  variant = 'current',
  className = '',
  style = {}
}) => {
  const iconColor = color || COLOR_MAP[variant] || 'currentColor';

  const renderPath = () => {
    switch (name) {
      case 'zap':
        // Sleek, high-precision cyber energy bolt
        return (
          <path
            d="M13 2L3 14H12L11 22L21 10H12L13 2Z"
            fill={iconColor}
            stroke={iconColor}
            strokeWidth="1.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        );

      case 'arrow-right':
        // Crisp geometric modern arrow
        return (
          <path
            d="M5 12H19M19 12L12 5M19 12L12 19"
            stroke={iconColor}
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        );

      case 'check':
        // Crisp cyber checkmark
        return (
          <path
            d="M20 6L9 17L4 12"
            stroke={iconColor}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        );

      case 'sparkles':
        // 4-pointed AI brilliance stars
        return (
          <path
            d="M12 3C12 7.5 7.5 12 3 12C7.5 12 12 16.5 12 21C12 16.5 16.5 12 21 12C16.5 12 12 7.5 12 3Z"
            fill={iconColor}
          />
        );

      case 'search':
        // Futuristic geometric loupe
        return (
          <>
            <circle cx="11" cy="11" r="7" stroke={iconColor} strokeWidth="2" fill="none" />
            <path d="M16.5 16.5L21 21" stroke={iconColor} strokeWidth="2.5" strokeLinecap="round" />
          </>
        );

      case 'flame':
        // Geometric flame
        return (
          <path
            d="M8.5 14.5C8.5 17.5 10 19 12 19C14 19 15.5 17.5 15.5 14.5C15.5 11.5 13.5 10 12 8C10.5 10 8.5 11.5 8.5 14.5ZM12 2C12 2 17 6.5 17 13C17 16.5 14.5 21 12 21C9.5 21 7 16.5 7 13C7 6.5 12 2 12 2Z"
            fill={iconColor}
          />
        );

      case 'link':
        // Interlocking cyber links
        return (
          <path
            d="M10 13C10.5 13.5 11.2 13.8 12 13.8C12.8 13.8 13.5 13.5 14 13L17.5 9.5C18.5 8.5 18.5 7 17.5 6C16.5 5 15 5 14 6L13.5 6.5M14 11C13.5 10.5 12.8 10.2 12 10.2C11.2 10.2 10.5 10.5 10 11L6.5 14.5C5.5 15.5 5.5 17 6.5 18C7.5 19 9 19 10 18L10.5 17.5"
            stroke={iconColor}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        );

      case 'rocket':
        // Sleek spacecraft
        return (
          <path
            d="M4.5 16.5C3.5 14.5 3.5 12 4 10.5L9.5 5C11 3.5 14 3 17 3C19 3 21 5 21 7C21 10 20.5 13 19 14.5L13.5 20C12 20.5 9.5 20.5 7.5 19.5L4.5 16.5ZM14 8C14 9.1 13.1 10 12 10C10.9 10 10 9.1 10 8C10 6.9 10.9 6 12 6C13.1 6 14 6.9 14 8Z"
            stroke={iconColor}
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        );

      case 'star':
        return (
          <path
            d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"
            fill={iconColor}
          />
        );

      case 'bot':
        return (
          <>
            <rect x="4" y="8" width="16" height="12" rx="3" stroke={iconColor} strokeWidth="1.8" fill="none" />
            <circle cx="9" cy="14" r="1.5" fill={iconColor} />
            <circle cx="15" cy="14" r="1.5" fill={iconColor} />
            <path d="M12 4V8M8 4H16" stroke={iconColor} strokeWidth="1.8" strokeLinecap="round" />
          </>
        );

      case 'target':
        return (
          <>
            <circle cx="12" cy="12" r="8" stroke={iconColor} strokeWidth="1.8" fill="none" />
            <circle cx="12" cy="12" r="3" fill={iconColor} />
            <path d="M12 2V6M12 18V22M2 12H6M18 12H22" stroke={iconColor} strokeWidth="1.8" strokeLinecap="round" />
          </>
        );

      case 'close':
        return (
          <path
            d="M18 6L6 18M6 6L18 18"
            stroke={iconColor}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        );

      case 'mail':
        return (
          <>
            <rect x="3" y="5" width="18" height="14" rx="2" stroke={iconColor} strokeWidth="1.8" fill="none" />
            <path d="M3 7L12 13L21 7" stroke={iconColor} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </>
        );

      case 'file':
        return (
          <path
            d="M14 2H6C4.9 2 4 2.9 4 4V20C4 21.1 4.9 22 6 22H18C19.1 22 20 21.1 20 20V8L14 2ZM14 2V8H20M16 13H8M16 17H8M10 9H8"
            stroke={iconColor}
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        );

      case 'refresh':
        return (
          <path
            d="M21.5 2V8H15.5M2.5 22V16H8.5M21 11.5A9 9 0 005.6 6.6L2.5 8M3 12.5A9 9 0 0018.4 17.4L21.5 16"
            stroke={iconColor}
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        );

      case 'eye':
        return (
          <>
            <path
              d="M1 12S5 4 12 4S23 12 23 12S19 20 12 20S1 12 1 12Z"
              stroke={iconColor}
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
            <circle cx="12" cy="12" r="3" stroke={iconColor} strokeWidth="1.8" fill="none" />
          </>
        );

      case 'database':
        return (
          <>
            <ellipse cx="12" cy="5" rx="9" ry="3" stroke={iconColor} strokeWidth="1.8" fill="none" />
            <path d="M21 12C21 13.66 16.97 15 12 15C7.03 15 3 13.66 3 12" stroke={iconColor} strokeWidth="1.8" fill="none" />
            <path d="M3 5V19C3 20.66 7.03 22 12 22C16.97 22 21 20.66 21 19V5" stroke={iconColor} strokeWidth="1.8" fill="none" />
          </>
        );

      case 'settings':
        return (
          <>
            <circle cx="12" cy="12" r="3" stroke={iconColor} strokeWidth="1.8" fill="none" />
            <path
              d="M19.4 15A1.65 1.65 0 0019.7 16.8L20.6 18.3A1 1 0 0119.5 19.8L17.7 19.2A1.65 1.65 0 0015.8 19.9L15.3 21.7A1 1 0 0113.8 22.4H10.2A1 1 0 018.7 21.7L8.2 19.9A1.65 1.65 0 006.3 19.2L4.5 19.8A1 1 0 013.4 18.3L4.3 16.8A1.65 1.65 0 004.6 15A1.65 1.65 0 004.3 13.2L3.4 11.7A1 1 0 014.5 10.2L6.3 10.8A1.65 1.65 0 008.2 10.1L8.7 8.3A1 1 0 0110.2 7.6H13.8A1 1 0 0115.3 8.3L15.8 10.1A1.65 1.65 0 0017.7 10.8L19.5 10.2A1 1 0 0120.6 11.7L19.7 13.2A1.65 1.65 0 0019.4 15Z"
              stroke={iconColor}
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          </>
        );

      case 'edit':
        return (
          <path
            d="M11 4H4C2.9 4 2 4.9 2 6V20C2 21.1 2.9 22 4 22H18C19.1 22 20 21.1 20 20V13M18.5 2.5A2.121 2.121 0 0121.5 5.5L12 15L8 16L9 12L18.5 2.5Z"
            stroke={iconColor}
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        );

      case 'chart':
        return (
          <path
            d="M18 20V10M12 20V4M6 20V14"
            stroke={iconColor}
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        );

      default:
        return null;
    }
  };

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`cyber-icon ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        verticalAlign: 'middle',
        flexShrink: 0,
        ...style
      }}
    >
      {renderPath()}
    </svg>
  );
};
