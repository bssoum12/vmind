'use client';

import React from 'react';
import { WizardView } from './WizardView';
import { WizardProspectionView } from './WizardProspectionView';
import { WizardSourcingView } from './WizardSourcingView';

interface WizardRouterProps {
  templateId: string;
  onCancel: () => void;
  agentToEdit?: any;
  initialStep?: number;
}

export const WizardRouter: React.FC<WizardRouterProps> = ({ templateId, onCancel, agentToEdit, initialStep }) => {
  if (templateId === 'prospection') {
    return <WizardProspectionView templateId={templateId} onCancel={onCancel} agentToEdit={agentToEdit} initialStep={initialStep} />;
  }

  if (templateId === 'sourcing') {
    return <WizardSourcingView templateId={templateId} onCancel={onCancel} agentToEdit={agentToEdit} initialStep={initialStep} />;
  }

  // Default to the original wizard for all other templates
  return <WizardView templateId={templateId} onCancel={onCancel} agentToEdit={agentToEdit} />;
};
