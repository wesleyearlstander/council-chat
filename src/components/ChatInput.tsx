import React, { useState, memo } from 'react';

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  onNext: () => void;
  isProcessing: boolean;
  isAutoPlaying: boolean;
  currentResponsesCount: number;
  nextIndex: number;
  onAutoPlayToggle: () => void;
}

const ChatInput: React.FC<ChatInputProps> = memo(({
  onSendMessage,
  onNext,
  isProcessing,
  isAutoPlaying,
  currentResponsesCount,
  nextIndex,
  onAutoPlayToggle
}) => {
  const [message, setMessage] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim()) {
      onSendMessage(message.trim());
      setMessage('');
    }
  };

  return (
    <div className="chat-controls">
      <form className="chat-input-form" onSubmit={handleSubmit}>
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type your message..."
          className="chat-input"
          disabled={isProcessing || isAutoPlaying}
        />
        <button 
          type="submit" 
          className="send-button"
          disabled={isProcessing || !message.trim() || isAutoPlaying}
        >
          Send
        </button>
        <button 
          type="button" 
          onClick={onNext}
          className="next-button"
          disabled={isProcessing || !currentResponsesCount || nextIndex >= currentResponsesCount || isAutoPlaying}
        >
          Next ({currentResponsesCount ? currentResponsesCount - nextIndex : 0})
        </button>
        <button
          type="button"
          onClick={onAutoPlayToggle}
          className={`auto-play-button ${isAutoPlaying ? 'active' : ''}`}
          disabled={isProcessing}
        >
          {isAutoPlaying ? '⏹ Stop' : '▶️ Auto'}
        </button>
      </form>
    </div>
  );
});

ChatInput.displayName = 'ChatInput';

export default ChatInput; 