import React from 'react';

interface ChatMessageProps {
  message: {
    id: string;
    text: string;
    sender: 'user' | 'agent';
    agentName?: string;
    timestamp: number;
  };
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const isUser = message.sender === 'user';
  
  return (
    <div className={`message-container ${isUser ? 'user-message' : 'agent-message'}`}>
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
  );
};

export default ChatMessage; 