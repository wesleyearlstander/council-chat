import React from 'react';
import { AgentResponse } from '../types/Agent';

interface ResponsesProps {
  responses: AgentResponse[];
}

const Responses: React.FC<ResponsesProps> = ({ responses }) => {
  // First sort all responses by timestamp (newest first)
  const sortedResponses = [...responses].sort((a, b) => b.timestamp - a.timestamp);

  // Group responses by messageId
  const groupedResponses = sortedResponses.reduce((groups, response) => {
    const messageId = response.messageId;
    if (!groups[messageId]) {
      groups[messageId] = [];
    }
    groups[messageId].push(response);
    return groups;
  }, {} as Record<string, AgentResponse[]>);

  return (
    <div className="responses-content">
      <h2>Agent Responses</h2>
      <div className="responses-list">
        {Object.entries(groupedResponses).map(([messageId, conversationResponses]) => (
          <div key={messageId} className="conversation-group">
            <div className="conversation-timestamp">
              {new Date(conversationResponses[0].timestamp).toLocaleString()}
              <span className="response-count">
                {conversationResponses.length} responses
              </span>
            </div>
            {conversationResponses
              .sort((a, b) => b.priority - a.priority) // Sort responses within conversation by priority
              .map((response) => (
                <div 
                  key={`${response.agentId}-${response.timestamp}`} 
                  className={`response-card ${response === conversationResponses[0] ? 'winning-response' : ''}`}
                >
                  <div className="response-header">
                    <div className="response-agent-info">
                      <span className="agent-name">
                        {response.agentName}
                        {response === conversationResponses[0] && 
                          <span className="winner-badge">🏆 Winner</span>
                        }
                      </span>
                      <span className="priority-badge">Priority: {response.priority}</span>
                      <span className="response-time">
                        {new Date(response.timestamp).toLocaleTimeString([], { 
                          hour: '2-digit', 
                          minute: '2-digit', 
                          second: '2-digit',
                          fractionalSecondDigits: 3 
                        })}
                      </span>
                    </div>
                  </div>
                  <div className="response-thinking">
                    <label>Thinking:</label>
                    <p>{response.thinking}</p>
                  </div>
                  <div className="response-speech">
                    <label>Speech:</label>
                    <p>{response.speech}</p>
                  </div>
                </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Responses; 