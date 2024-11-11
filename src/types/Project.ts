import { ChatHistoryItem } from './ChatHistory';
import { Agent } from './Agent';

export interface Thread {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  chatHistory: ChatHistoryItem[];
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  createdAt: number;
  updatedAt: number;
  threads: Thread[];
  activeThreadId?: string;
  agents: Agent[];
} 