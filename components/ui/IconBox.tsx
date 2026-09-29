import React from 'react';

interface IconBoxProps {
  children: React.ReactNode;
  style?: React.CSSProperties;
  className?: string;
}

export const IconBox: React.FC<IconBoxProps> = ({ children, style, className = '' }) => {
  return (
    <div className={`nav-icon ${className}`} style={style}>
      {children}
    </div>
  );
};
