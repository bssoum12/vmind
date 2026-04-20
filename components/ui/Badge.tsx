import React from 'react';

interface BadgeProps {
  label: string;
  bgColor: string;
  color: string;
  borderColor: string;
}

export const AgentBadge: React.FC<BadgeProps> = ({ label, bgColor, color, borderColor }) => {
  return (
    <span className="agent-badge" style={{ background: bgColor, color, border: `1px solid ${borderColor}` }}>
      ◈ {label}
    </span>
  );
};
