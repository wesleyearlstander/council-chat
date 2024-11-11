import React, { useEffect, useRef, useState } from 'react';
import { generateImage } from '../services/ImageService';

interface ChatMessageProps {
  message: {
    id: string;
    text: string;
    sender: 'user' | 'agent';
    agentName?: string;
    timestamp: number;
  };
  isLatest: boolean;
}

const ChatContainer: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const chatSkin = localStorage.getItem('chat_skin') || 'default';

  return (
    <div className={`chat-container ${chatSkin === 'comic' ? 'comic-style stage-background' : ''}`}>
      {chatSkin === 'comic' && <div className="stage-floor" />}
      {children}
    </div>
  );
};

const generatePrompt = (agentName: string) => {
  return `full body character portrait of ${agentName}, standing pose, full figure from head to toe, professional comic art style, clean vector art style, facing slightly to the side, theatrical pose, high contrast, clear edges, minimalist style, solid white background (#FFFFFF), high quality, detailed, full body visible`;
};

const ChatMessage: React.FC<ChatMessageProps> = ({ message, isLatest }) => {
  const isUser = message.sender === 'user';
  const chatSkin = localStorage.getItem('chat_skin') || 'default';
  const [agentPortrait, setAgentPortrait] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const previousMessageId = useRef<string | null>(null);

  useEffect(() => {
    // Only trigger animation when the message ID changes (new message)
    if (message.id !== previousMessageId.current) {
      previousMessageId.current = message.id;
      setIsVisible(false);
      
      // Small delay to ensure animation triggers
      const showTimer = setTimeout(() => {
        setIsVisible(true);
      }, 100);

      return () => clearTimeout(showTimer);
    } else {
      // For existing messages, show them immediately
      setIsVisible(true);
    }
  }, [message.id]);

  useEffect(() => {
    const loadOrGeneratePortrait = async () => {
      if (chatSkin === 'comic' && !isUser && message.agentName && isLatest) {
        setIsLoading(true);
        try {
          // Check if we already have a portrait for this agent
          const savedPortraits = JSON.parse(localStorage.getItem('comic_characters') || '{}');
          
          // If we have a saved portrait, use it
          if (savedPortraits[message.agentName]) {
            setAgentPortrait(savedPortraits[message.agentName]);
            setIsLoading(false);
            return;
          }

          // Only generate a new portrait if this is a recent message
          const isRecentMessage = Date.now() - message.timestamp < 5000;
          if (!isRecentMessage) {
            setIsLoading(false);
            return;
          }

          // Generate new portrait
          const apiKey = localStorage.getItem('openai_api_key');
          if (!apiKey) {
            setIsLoading(false);
            return;
          }

          const prompt = generatePrompt(message.agentName);
          const imageUrl = await generateImage(prompt, apiKey);
          
          if (imageUrl) {
            savedPortraits[message.agentName] = imageUrl;
            localStorage.setItem('comic_characters', JSON.stringify(savedPortraits));
            setAgentPortrait(imageUrl);
          }
        } catch (error) {
          console.error('Error generating portrait:', error);
        } finally {
          setIsLoading(false);
        }
      }
    };

    loadOrGeneratePortrait();
  }, [message.id, message.agentName, isUser, chatSkin, message.timestamp, isLatest]);

  // In comic style, only show the latest message
  if (chatSkin === 'comic') {
    if (!isLatest) return null;

    // Get just the agent name without the priority
    const agentName = message.agentName?.split(' (Priority:')[0];

    return (
      <div className={`comic-message ${isUser ? 'user-message' : 'agent-message'} ${isVisible ? 'visible' : ''}`}>
        {!isUser && (
          <div className="character-container">
            {isLoading ? (
              <div className="character-loading">Loading character...</div>
            ) : (
              agentPortrait && (
                <>
                  <img 
                    src={agentPortrait}
                    alt={agentName}
                    className="character-portrait"
                  />
                  <div className="shadow" />
                </>
              )
            )}
          </div>
        )}
        <div className="speech-container">
          {!isUser && (
            <div className="character-name">{agentName}</div>
          )}
          <div className="speech-bubble">
            {message.text}
          </div>
        </div>
      </div>
    );
  }

  // Default message style
  return (
    <div className={`message-container ${isUser ? 'user-message' : 'agent-message'}`}>
      <div className="message-content">
        {!isUser && (
          <div className="message-sender">{message.agentName}</div>
        )}
        <div className="message-bubble">
          {message.text}
        </div>
        <div className="message-timestamp">
          {new Date(message.timestamp).toLocaleTimeString()}
        </div>
      </div>
    </div>
  );
};

export { ChatContainer, ChatMessage };
export default ChatMessage;