export interface AgentMemory {
  id: string;
  content: string;
  timestamp: number;
}

export interface AgentResponse {
  thinking: string;
  priority: number;
  speech: string;
  remember?: string;
  agentId: string;
  agentName: string;
  timestamp: number;
  messageId: string;
}

export interface Agent {
  id: string;
  name: string;
  systemPrompt: string;
  knowledgeBase?: File;
  knowledgeBaseName?: string;
  lastResponse?: AgentResponse;
  memories: AgentMemory[];
} 