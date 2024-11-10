export interface ChatHistoryItem {
  role: 'user' | 'assistant';
  content: string;
  agentName?: string;
  thinking?: string;
  priority?: number;
  timestamp: number;
} 