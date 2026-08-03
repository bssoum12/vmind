import React from 'react';

interface StatusDotProps {
  style?: React.CSSProperties;
}

export const StatusDot: React.FC<StatusDotProps> = ({ style }) => {
  return <span className="status-dot" style={style}></span>;
};
