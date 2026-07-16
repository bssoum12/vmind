'use client';

import React from 'react';
import { WizardView } from './WizardView';
import { WizardProspectionView } from './WizardProspectionView';

interface WizardRouterProps {
  templateId: string;
  onCancel: () => void;
  agentToEdit?: any;
}

export const WizardRouter: React.FC<WizardRouterProps> = ({ templateId, onCancel, agentToEdit }) => {
  if (templateId === 'prospection') {
    return <WizardProspectionView templateId={templateId} onCancel={onCancel} agentToEdit={agentToEdit} />;
  }

  // Default to the original wizard for all other templates
  return <WizardView templateId={templateId} onCancel={onCancel} agentToEdit={agentToEdit} />;
};
