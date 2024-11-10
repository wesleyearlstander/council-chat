import { ChatHistoryItem } from './ChatHistory';

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
} 