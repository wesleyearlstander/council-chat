import React, { useState } from 'react';
import { Thread } from '../types/Project';

interface ThreadListProps {
  threads: Thread[];
  activeThreadId?: string;
  onSelectThread: (thread: Thread) => void;
  onCreateThread: (name: string) => void;
  onDeleteThread: (threadId: string) => void;
}

const ThreadList: React.FC<ThreadListProps> = ({
  threads,
  activeThreadId,
  onSelectThread,
  onCreateThread,
  onDeleteThread,
}) => {
  const [newThreadName, setNewThreadName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const handleCreateThread = (e: React.FormEvent) => {
    e.preventDefault();
    if (newThreadName.trim()) {
      onCreateThread(newThreadName.trim());
      setNewThreadName('');
      setIsCreating(false);
    }
  };

  return (
    <div className="thread-list">
      <div className="thread-list-header">
        <h3>Threads</h3>
        <button 
          className="create-thread-button"
          onClick={() => setIsCreating(true)}
        >
          + New Thread
        </button>
      </div>

      {isCreating && (
        <form onSubmit={handleCreateThread} className="create-thread-form">
          <input
            type="text"
            value={newThreadName}
            onChange={(e) => setNewThreadName(e.target.value)}
            placeholder="Thread name"
            className="thread-name-input"
            autoFocus
          />
          <div className="thread-actions">
            <button type="submit" className="confirm-button">
              Create
            </button>
            <button 
              type="button" 
              className="cancel-button"
              onClick={() => {
                setIsCreating(false);
                setNewThreadName('');
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="threads">
        {threads.map(thread => (
          <div
            key={thread.id}
            className={`thread-item ${activeThreadId === thread.id ? 'active' : ''}`}
          >
            <div 
              className="thread-info"
              onClick={() => onSelectThread(thread)}
            >
              <span className="thread-name">{thread.name}</span>
              <span className="thread-date">
                {new Date(thread.updatedAt).toLocaleDateString()}
              </span>
            </div>
            <button
              className="delete-thread-button"
              onClick={() => onDeleteThread(thread.id)}
              title="Delete thread"
            >
              🗑️
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ThreadList; 