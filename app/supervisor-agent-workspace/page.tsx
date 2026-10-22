'use client';

import React from 'react';
import { SupervisorWorkspace } from '@/features/management/supervisor-workspace/components/SupervisorWorkspace';

export default function SupervisorAgentWorkspaceDirectPage() {
  return (
    <SupervisorWorkspace
      agentId="supervisor-demo"
      agentName="Superviseur Commercial - A9B2X1"
    />
  );
}
