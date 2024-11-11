export type ChatSkinType = 'default' | 'comic';

export interface ChatSkin {
  type: ChatSkinType;
  backgroundPrompt?: string;
  characterStyle?: string;
} 