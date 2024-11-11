import React, { useState, memo, KeyboardEvent } from 'react';

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  onNext: () => void;
  isProcessing: boolean;
  isAutoPlaying: boolean;
  currentResponsesCount: number;
  nextIndex: number;
  onAutoPlayToggle: () => void;
  autoPlayCount: number;
  onAutoPlayCountChange: (count: number) => void;
  remainingPlays: number;
}

const ChatInput: React.FC<ChatInputProps> = memo(({
  onSendMessage,
  onNext,
  isProcessing,
  isAutoPlaying,
  currentResponsesCount,
  nextIndex,
  onAutoPlayToggle,
  autoPlayCount,
  onAutoPlayCountChange,
  remainingPlays
}) => {
  const [message, setMessage] = useState('');
  const [showCounter, setShowCounter] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim()) {
      onSendMessage(message.trim());
      setMessage('');
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter') {
      if (e.shiftKey) {
        return;
      } else {
        e.preventDefault();
        if (message.trim() && !isProcessing && !isAutoPlaying) {
          onSendMessage(message.trim());
          setMessage('');
        }
      }
    }
  };

  return (
    <div className="chat-controls">
      <form className="chat-input-form" onSubmit={handleSubmit}>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type your message... (Press Enter to send, Shift+Enter for new line)"
          className="chat-input"
          disabled={isProcessing || isAutoPlaying}
          rows={1}
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
        <div className="auto-play-controls">
          <button
            type="button"
            onClick={() => setShowCounter(!showCounter)}
            className="counter-toggle-button"
            title="Set auto-play limit"
          >
            {autoPlayCount === -1 ? '∞' : `${remainingPlays}×`}
          </button>
          {showCounter && (
            <div className="counter-popup">
              <input
                type="number"
                min="1"
                value={autoPlayCount === -1 ? '' : autoPlayCount}
                onChange={(e) => onAutoPlayCountChange(Math.max(1, parseInt(e.target.value) || 1))}
                className="counter-input"
                placeholder="Enter count"
              />
              <div className="counter-buttons">
                <button onClick={() => onAutoPlayCountChange(-1)}>∞</button>
                <button onClick={() => onAutoPlayCountChange(1)}>1</button>
                <button onClick={() => onAutoPlayCountChange(5)}>5</button>
                <button onClick={() => onAutoPlayCountChange(10)}>10</button>
              </div>
            </div>
          )}
          <button
            type="button"
            onClick={onAutoPlayToggle}
            className={`auto-play-button ${isAutoPlaying ? 'active' : ''}`}
            disabled={isProcessing}
          >
            {isAutoPlaying ? '⏹ Stop' : '▶️ Auto'}
          </button>
        </div>
      </form>
    </div>
  );
});

ChatInput.displayName = 'ChatInput';

export default ChatInput; 