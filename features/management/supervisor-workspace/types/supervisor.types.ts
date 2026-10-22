export type HealthStatus = 'HEALTHY' | 'WARNING' | 'CRITICAL' | 'UNANALYZED';
export type AgentType = 'sourcing' | 'prospect';

export interface DiagnosticFinding {
  id: string;
  severity: 'info' | 'warning' | 'critical';
  title: string;
  description: string;
}

export interface ParameterRecommendation {
  id: string;
  targetAgentId?: string;
  targetAgentName?: string;
  parameter: string;
  label: string;
  currentValue: string;
  suggestedValue: string;
  rationale: string;
  impact: 'high' | 'medium' | 'low';
  applied?: boolean;
}

export interface SupervisorNode {
  id: string;
  name: string;
  type: AgentType;
  status: HealthStatus;
  healthScore: number; // 0 - 100
  summary: string;
  metrics: {
    totalLeads: number;
    qualificationRate?: number;
    emailsSent?: number;
    replyRate?: number;
    bounceRate?: number;
    lastExecution?: string;
  };
  config: {
    targetAudience?: string;
    seniority?: string[];
    industry?: string;
    country?: string;
    qualificationThreshold?: number;
    sendDelay?: string;
    dailyVolume?: number;
  };
  findings: DiagnosticFinding[];
  recommendations: ParameterRecommendation[];
  // Force graph coordinates
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  fx?: number;
  fy?: number;
}

export interface AlignmentDimension {
  dimension: string;
  sourcingValue: string;
  prospectValue: string;
  isMatch: boolean;
  note: string;
}

export interface RejectionReasonStat {
  reason: string;
  count: number;
  percentage: number;
}

export interface SupervisorLink {
  id: string;
  source: string | SupervisorNode;
  target: string | SupervisorNode;
  sourceName: string;
  targetName: string;
  status: HealthStatus;
  alignmentScore: number; // 0 - 100
  summary: string;
  throughput: {
    leadsExtracted: number;
    leadsTransferred: number;
    leadsQualified: number;
    leadsRejected: number;
    conversionRate: number; // %
  };
  alignmentMatrix: AlignmentDimension[];
  topRejectionReasons: RejectionReasonStat[];
  recommendations: ParameterRecommendation[];
}

export interface CompanyContext {
  website: string;
  valueProposition: string;
  targetCustomers: string;
  competitors: string;
}

export interface FleetAuditSummary {
  lastAuditedAt: string;
  overallScore: number;
  totalAgents: number;
  healthyCount: number;
  warningCount: number;
  criticalCount: number;
  unanalyzedCount: number;
  topPriorities: string[];
}
