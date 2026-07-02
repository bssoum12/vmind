'use client';

import React from 'react';
import { WizardView } from './WizardView';
import { WizardProspectionView } from './WizardProspectionView';

interface WizardRouterProps {
  templateId: string;
  onCancel: () => void;
}

export const WizardRouter: React.FC<WizardRouterProps> = ({ templateId, onCancel }) => {
  if (templateId === 'prospection') {
    return <WizardProspectionView templateId={templateId} onCancel={onCancel} />;
  }

  // Default to the original wizard for all other templates
  return <WizardView templateId={templateId} onCancel={onCancel} />;
};
