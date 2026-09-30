'use client';

import React from 'react';
import { CyberIcon } from './CyberIcon';

export interface AdminConfigButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Visual dimension preset or custom pixel number */
  size?: 'sm' | 'md' | 'lg' | number;
  /** Custom inner gear icon size in pixels */
  iconSize?: number;
  /** Tooltip and aria-label */
  title?: string;
  /** Whether clicking automatically stops event bubbling up to parent cards/containers (default true) */
  stopPropagation?: boolean;
}

/**
 * Reusable Admin Configuration Screw/Gear Button
 * 
 * Discrete metallic micro-button reserved for administrator actions (prompts, advanced settings, system controls).
 * Built with subtle hover mechanics (rotates 60deg with a neon cyan cyber glow).
 */
export const AdminConfigButton: React.FC<AdminConfigButtonProps> = ({
  size,
  iconSize,
  title = "Configuration Système & IA (Admin)",
  stopPropagation = true,
  onClick,
  className = '',
  style = {},
  ...props
}) => {
  const pixelSize = typeof size === 'number' 
    ? size 
    : size === 'lg' 
      ? 35 
      : size === 'md' 
        ? 28 
        : size === 'sm' 
          ? 24 
          : undefined;

  const resolvedIconSize = iconSize || (pixelSize && pixelSize < 28 ? 13 : 16);

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (stopPropagation) {
      e.stopPropagation();
    }
    if (onClick) {
      onClick(e);
    }
  };

  return (
    <button
      type="button"
      className={`admin-config-btn atcard-admin-cog ${className}`}
      title={title}
      aria-label={title}
      onClick={handleClick}
      style={{
        ...(pixelSize ? { width: pixelSize, height: pixelSize } : {}),
        ...style
      }}
      {...props}
    >
      <CyberIcon name="settings" size={resolvedIconSize} color="currentColor" />
    </button>
  );
};
