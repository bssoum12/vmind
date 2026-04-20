export interface KPI {
  label: string;
  val: string;
  delta: string;
  src: string;
  color?: string;
}

export interface Message {
  id: string;
  sender: 'user' | 'vm';
  agent?: string;
  text: string;
  time: string;
  meta?: string;
  kpis?: KPI[];
  isThinking?: boolean;
}

export interface Agent {
  id: string;
  name: string;
  desc: string;
  status: 'ACTIF' | 'VEILLE';
  color: string;
  bgColor: string;
  borderColor: string;
  icon: string;
}

export interface LogEntry {
  id: string;
  time: string;
  agent: string;
  action: string;
}
