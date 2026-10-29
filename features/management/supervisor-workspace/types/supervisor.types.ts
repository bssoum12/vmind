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

export interface ProspectPitchAlignment {
  score: number;
  strengths: string[];
  weaknesses: string[];
}

export interface ProspectCopywritingAnalysis {
  subject_lines_quality: string;
  personalization?: string;
  cta_clarity: string;
  average_length_assessment: string;
}

export interface ProspectPotentialPyramid {
  eleve_count?: number;
  moyen_count?: number;
  faible_count?: number;
  eleve_ratio: number;
  moyen_ratio: number;
  faible_ratio: number;
  analysis: string;
}

export interface ProspectDeliveryHealth {
  total_count: number;
  sent_count: number;
  failure_count: number;
  draft_count: number;
  auto_count?: number;
  manual_count?: number;
  failure_rate: number;
  analysis?: string;
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
  missionUpdatedAt?: string | null;
  evaluation?: any;
  lastEvaluatedAt?: string | null;
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
  sourceUuid?: string;
  targetUuid?: string;
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
  missionCutoffDate?: string | null;
  evaluation?: any;
  lastEvaluatedAt?: string | null;
  leadsCountAtEval?: number;
}

export interface CompanyContext {
  website: string;
  summary?: string;
  additional_info?: string;
  valueProposition?: string;
  value_proposition?: string;
  targetCustomers?: string;
  target_customers?: string;
  competitors?: string;
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

export const DEFAULT_COMPANY_CONTEXT: CompanyContext = {
  website: '',
  valueProposition: '',
  targetCustomers: '',
  competitors: ''
};

export const DEFAULT_FLEET_SUMMARY: FleetAuditSummary = {
  lastAuditedAt: 'En attente',
  overallScore: 0,
  totalAgents: 0,
  healthyCount: 0,
  warningCount: 0,
  criticalCount: 0,
  unanalyzedCount: 0,
  topPriorities: []
};

