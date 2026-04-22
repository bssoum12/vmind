export interface LogEntry {
  id: string;
  time: string;
  agent: string;
  action: string;
}

export interface KPI {
  label: string;
  val: string;
  delta: string;
  src?: string;
  color?: string;
}

export interface Message {
  id: string;
  sender: 'user' | 'vm';
  text: string;
  time: string;
  agent?: string;
  meta?: string;
  isThinking?: boolean;
}
