'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { SupervisorWorkspace } from '@/features/management/supervisor-workspace/components/SupervisorWorkspace';

export default function SupervisorAgentWorkspaceDynamicPage() {
  const params = useParams();
  const agentId = params?.agentId as string;

  return <SupervisorWorkspace agentId={agentId} />;
}

