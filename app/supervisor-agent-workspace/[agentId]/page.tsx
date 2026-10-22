'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { SupervisorWorkspace } from '@/features/management/supervisor-workspace/components/SupervisorWorkspace';

export default function SupervisorAgentWorkspaceDynamicPage() {
  const params = useParams();
  const agentId = (params?.agentId as string) || 'supervisor-fleet';

  return (
    <SupervisorWorkspace
      agentId={agentId}
      agentName="Superviseur Commercial - A9B2X1"
    />
  );
}
