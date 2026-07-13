import React from 'react';

interface SkeletonLoaderProps {
  width?: string | number;
  height?: string | number;
  borderRadius?: string;
  className?: string;
  style?: React.CSSProperties;
}

export const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({
  width = '100%',
  height = '100%',
  borderRadius = '4px',
  className = '',
  style = {},
}) => {
  const customStyle: React.CSSProperties = {
    width: typeof width === 'number' ? `${width}px` : width,
    height: typeof height === 'number' ? `${height}px` : height,
    borderRadius,
    ...style,
  };

  return (
    <div
      className={`skeleton-box ${className}`}
      style={customStyle}
    />
  );
};

export default SkeletonLoader;
