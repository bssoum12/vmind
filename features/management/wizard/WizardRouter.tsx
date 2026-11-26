'use client';

import React from 'react';
import { WizardView } from './WizardView';
import { WizardProspectionView } from './WizardProspectionView';
import { WizardSourcingView } from './WizardSourcingView';

import { WizardSupervisorView } from './WizardSupervisorView';
import { WizardFinanceView } from './WizardFinanceView';
import { WizardDirectionView } from './WizardDirectionView';
import { WizardAchatsView } from './WizardAchatsView';

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

  if (templateId === 'supervisor') {
    return <WizardSupervisorView templateId={templateId} onCancel={onCancel} agentToEdit={agentToEdit} initialStep={initialStep} />;
  }

  // A deployed report agent carries its template (its run_mode is "finance_report").
  if (templateId === 'finance' || templateId === 'finance_report' || agentToEdit?.templateId === 'finance') {
    return <WizardFinanceView templateId={templateId} onCancel={onCancel} agentToEdit={agentToEdit} initialStep={initialStep} />;
  }

  // Direction Générale: form only for now, nothing is saved (backend not connected yet).
  if (templateId === 'direction_generale' || agentToEdit?.templateId === 'direction_generale') {
    return <WizardDirectionView onCancel={onCancel} />;
  }

  if (templateId === 'achats_supply') {
    return <WizardAchatsView templateId={templateId} onCancel={onCancel} agentToEdit={agentToEdit} initialStep={initialStep} />;
  }

  // Default to the original wizard for all other templates
  return <WizardView templateId={templateId} onCancel={onCancel} agentToEdit={agentToEdit} />;
};
