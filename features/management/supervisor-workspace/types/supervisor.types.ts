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

export interface FleetFunnelStageMetric {
  id: string;
  label: string;
  count: number;
  pct: number;
  subtext?: string;
  color?: string;
}

export interface AgentPairFunnelRow {
  sourceAgentId: number;
  sourceUuid: string;
  sourceName: string;
  targetAgentId: number;
  targetUuid: string;
  targetName: string;
  transferredCount: number;
  qualifiedCount: number;
  rejectedCount: number;
  qualificationRate: number;
  draftsCount: number;
  emailsSentCount: number;
  phonesRevealedCount: number;
  phonesAvailableCount: number;
  contactRate: number;
}

export interface FleetFunnelData {
  supervisor: {
    uuid: string;
    name: string;
    supervisedAgentCount: number;
    sourcingCount: number;
    prospectCount: number;
  };
  summary: {
    totalSourced: number;
    totalTransferred: number;
    totalQualified: number;
    totalRejected: number;
    totalEvaluated: number;
    totalDrafts: number;
    totalEmailsSent: number;
    emailErrors: number;
    totalPhonesRevealed: number;
    totalPhonesAvailable: number;
    globalConversionRate: number;
    qualificationRate: number;
    contactRate: number;
  };
  stages: FleetFunnelStageMetric[];
  agentPairs: AgentPairFunnelRow[];
  lastCalculatedAt: string;
}

export const DEFAULT_FLEET_FUNNEL_DATA: FleetFunnelData = {
  supervisor: {
    uuid: '',
    name: '',
    supervisedAgentCount: 0,
    sourcingCount: 0,
    prospectCount: 0,
  },
  summary: {
    totalSourced: 0,
    totalTransferred: 0,
    totalQualified: 0,
    totalRejected: 0,
    totalEvaluated: 0,
    totalDrafts: 0,
    totalEmailsSent: 0,
    emailErrors: 0,
    totalPhonesRevealed: 0,
    totalPhonesAvailable: 0,
    globalConversionRate: 0,
    qualificationRate: 0,
    contactRate: 0,
  },
  stages: [],
  agentPairs: [],
  lastCalculatedAt: '',
};

// ── KBN-16: Fleet Evaluation History & Audit Comparison Types ──
export interface AuditNodeSnapshot {
  agentUuid: string;
  agentName: string;
  agentRole: 'sourcing' | 'prospect';
  score: number;
  scoreDelta?: number | null;
  status: 'HEALTHY' | 'WARNING' | 'CRITICAL';
  summary: string;
  leadsCount: number;
}

export interface AuditLinkSnapshot {
  sourceUuid: string;
  sourceName: string;
  targetUuid: string;
  targetName: string;
  score: number;
  scoreDelta?: number | null;
  status: 'HEALTHY' | 'WARNING' | 'CRITICAL';
  summary: string;
  leadsCount: number;
}

export interface FleetAuditHistoryItem {
  id: string | number;
  timestamp: string;
  triggerType: 'MANUAL' | 'AUTOPILOT';
  status: 'SUCCESS' | 'FAIL';
  overallScore: number | null;
  scoreDelta?: number | null;
  reportSent: boolean;
  recipientEmail?: string | null;
  summaryMessage: string;
  errorMessage?: string | null;
  nodeSnapshots: AuditNodeSnapshot[];
  linkSnapshots: AuditLinkSnapshot[];
  recommendations: string[];
  healthyCount?: number;
  warningCount?: number;
  criticalCount?: number;
}

export interface AgentHistoricalPoint {
  id: string | number;
  score: number;
  summary: string;
  date: string;
}

export interface AgentHistoryTrack {
  agentId: string;
  agentUuid: string;
  agentName: string;
  role: 'sourcing' | 'prospect';
  currentScore: number;
  scoreDelta: number | null;
  evaluationsCount: number;
  history: AgentHistoricalPoint[];
}

export interface FleetHistoryData {
  supervisor: {
    id: string;
    name: string;
    supervisedAgentsCount: number;
  };
  totalAuditsCount: number;
  latestScore: number | null;
  audits: FleetAuditHistoryItem[];
  agentHistories?: AgentHistoryTrack[];
}

export const DEFAULT_FLEET_HISTORY_DATA: FleetHistoryData = {
  supervisor: {
    id: '',
    name: '',
    supervisedAgentsCount: 0,
  },
  totalAuditsCount: 0,
  latestScore: null,
  audits: [],
  agentHistories: [],
};


