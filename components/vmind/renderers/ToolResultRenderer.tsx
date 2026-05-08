import React from 'react';
import { VmindMessage } from '@/shared/types/vmind';
import { StandardResponseRenderer } from './StandardResponseRenderer';

interface ToolResultRendererProps {
  message: VmindMessage;
}

export const ToolResultRenderer: React.FC<ToolResultRendererProps> = ({ message }) => {
  return <StandardResponseRenderer message={message} />;
};
