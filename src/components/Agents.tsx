import React, { useState, useEffect } from 'react';
import { Agent, AgentMemory } from '../types/Agent';
import GenerateAgents from './GenerateAgents';

const Agents: React.FC = () => {
  const [agents, setAgents] = useState<Agent[]>([]);

  useEffect(() => {
    const savedAgents = localStorage.getItem('agents');
    if (savedAgents) {
      const parsedAgents = JSON.parse(savedAgents);
      const validatedAgents = parsedAgents.map((agent: Agent) => ({
        ...agent,
        memories: agent.memories || []
      }));
      setAgents(validatedAgents);
    }
  }, []);

  const saveAgents = (updatedAgents: Agent[]) => {
    const validatedAgents = updatedAgents.map(agent => ({
      ...agent,
      memories: agent.memories || []
    }));
    localStorage.setItem('agents', JSON.stringify(validatedAgents));
    setAgents(validatedAgents);
  };

  const addAgent = () => {
    const newAgent: Agent = {
      id: Date.now().toString(),
      name: 'New Agent',
      systemPrompt: '',
      memories: [],
    };
    saveAgents([...agents, newAgent]);
  };

  const updateAgent = (id: string, updates: Partial<Agent>) => {
    const updatedAgents = agents.map(agent =>
      agent.id === id ? { ...agent, ...updates } : agent
    );
    saveAgents(updatedAgents);
  };

  const deleteAgent = (id: string) => {
    const updatedAgents = agents.filter(agent => agent.id !== id);
    saveAgents(updatedAgents);
  };

  const clearMemories = (agentId: string) => {
    const updatedAgents = agents.map(agent =>
      agent.id === agentId ? { ...agent, memories: [] } : agent
    );
    saveAgents(updatedAgents);
  };

  const handleFileUpload = (agentId: string, file: File) => {
    updateAgent(agentId, {
      knowledgeBase: file,
      knowledgeBaseName: file.name
    });
  };

  const handleAgentsGenerated = (newAgents: Agent[]) => {
    saveAgents([...agents, ...newAgents]);
  };

  return (
    <div className="agents-content">
      <div className="agents-header">
        <h2>Agents</h2>
        <button onClick={addAgent} className="add-agent-button">
          Add Agent
        </button>
      </div>
      
      <GenerateAgents onAgentsGenerated={handleAgentsGenerated} />
      
      <div className="agents-list">
        {agents.map(agent => (
          <div key={agent.id} className="agent-card">
            <div className="agent-header">
              <input
                type="text"
                value={agent.name}
                onChange={(e) => updateAgent(agent.id, { name: e.target.value })}
                className="agent-name-input"
                placeholder="Agent Name"
              />
              <button
                onClick={() => deleteAgent(agent.id)}
                className="delete-agent-button"
              >
                Delete
              </button>
            </div>
            
            <div className="agent-field">
              <label>System Prompt</label>
              <textarea
                value={agent.systemPrompt}
                onChange={(e) => updateAgent(agent.id, { systemPrompt: e.target.value })}
                className="system-prompt-input"
                placeholder="Enter the system prompt for this agent..."
                rows={4}
              />
            </div>

            <div className="agent-field">
              <div className="memories-header">
                <label>Memories ({agent.memories?.length || 0})</label>
                <button
                  onClick={() => clearMemories(agent.id)}
                  className="clear-memories-button"
                  disabled={!agent.memories?.length}
                >
                  Clear Memories
                </button>
              </div>
              <div className="memories-list">
                {agent.memories?.map((memory) => (
                  <div key={memory.id} className="memory-item">
                    <p>{memory.content}</p>
                    <span className="memory-timestamp">
                      {new Date(memory.timestamp).toLocaleString()}
                    </span>
                  </div>
                )) || null}
              </div>
            </div>
            
            <div className="agent-field">
              <label>Knowledge Base</label>
              <div className="file-upload-container">
                <input
                  type="file"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileUpload(agent.id, file);
                  }}
                  className="file-input"
                  id={`file-${agent.id}`}
                />
                <label htmlFor={`file-${agent.id}`} className="file-upload-button">
                  {agent.knowledgeBaseName || 'Upload Document'}
                </label>
                {agent.knowledgeBaseName && (
                  <span className="file-name">{agent.knowledgeBaseName}</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Agents; 