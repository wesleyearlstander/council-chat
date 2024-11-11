import React, { useEffect, useState } from 'react';
import { Agent } from '../types/Agent';
import { Project } from '../types/Project';
import GenerateAgents from './GenerateAgents';

interface AgentsProps {
  project: Project;
  onUpdateProject: (updatedProject: Project) => void;
}

const Agents: React.FC<AgentsProps> = ({ project, onUpdateProject }) => {
  const [isMemoryEnabled, setIsMemoryEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem('memory_enabled');
    return saved ? JSON.parse(saved) : true;
  });

  useEffect(() => {
    if (!project.agents) {
      const updatedProject = {
        ...project,
        agents: [],
        updatedAt: Date.now()
      };
      onUpdateProject(updatedProject);
    }
  }, [project.id]);

  useEffect(() => {
    localStorage.setItem('memory_enabled', JSON.stringify(isMemoryEnabled));
  }, [isMemoryEnabled]);

  const saveAgents = (updatedAgents: Agent[]) => {
    const updatedProject = {
      ...project,
      agents: updatedAgents,
      updatedAt: Date.now()
    };
    onUpdateProject(updatedProject);
  };

  const addAgent = () => {
    const newAgent: Agent = {
      id: Date.now().toString(),
      name: 'New Agent',
      systemPrompt: '',
      memories: [],
    };
    saveAgents([...(project.agents || []), newAgent]);
  };

  const updateAgent = (id: string, updates: Partial<Agent>) => {
    const updatedAgents = (project.agents || []).map(agent =>
      agent.id === id ? { ...agent, ...updates } : agent
    );
    saveAgents(updatedAgents);
  };

  const deleteAgent = (id: string) => {
    const updatedAgents = (project.agents || []).filter(agent => agent.id !== id);
    saveAgents(updatedAgents);
  };

  const clearMemories = (agentId: string) => {
    const updatedAgents = (project.agents || []).map(agent =>
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
    saveAgents([...(project.agents || []), ...newAgents]);
  };

  if (!project) {
    return <div>Loading...</div>;
  }

  return (
    <div className="agents-content">
      <div className="agents-header">
        <div className="agents-header-left">
          <h2>Agents</h2>
          <div className="memory-toggle">
            <label className="toggle-label">
              <input
                type="checkbox"
                checked={isMemoryEnabled}
                onChange={(e) => setIsMemoryEnabled(e.target.checked)}
              />
              <span className="toggle-text">Memory {isMemoryEnabled ? 'Enabled' : 'Disabled'}</span>
            </label>
          </div>
        </div>
        <button onClick={addAgent} className="add-agent-button">
          Add Agent
        </button>
      </div>
      
      <GenerateAgents onAgentsGenerated={handleAgentsGenerated} />
      
      <div className="agents-list">
        {(project.agents || []).map(agent => (
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

            {isMemoryEnabled && (
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
            )}
            
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