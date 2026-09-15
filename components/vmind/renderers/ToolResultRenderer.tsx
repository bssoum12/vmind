import React from 'react';
import { VmindMessage } from '@/shared/types/vmind';
import { StandardResponseRenderer } from './StandardResponseRenderer';

interface ToolResultRendererProps {
  message: VmindMessage;
  onAgentClick?: (agentId: string) => void;
}

export const ToolResultRenderer: React.FC<ToolResultRendererProps> = ({ message, onAgentClick }) => {
  return <StandardResponseRenderer message={message} onAgentClick={onAgentClick} />;
};
