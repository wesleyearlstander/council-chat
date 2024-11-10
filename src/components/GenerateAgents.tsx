import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import { Agent } from '../types/Agent';

interface GenerateAgentsProps {
  onAgentsGenerated: (agents: Agent[]) => void;
}

const GenerateAgents: React.FC<GenerateAgentsProps> = ({ onAgentsGenerated }) => {
  const [context, setContext] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async () => {
    if (!context.trim()) {
      toast.error('Please provide a context for agent generation');
      return;
    }

    const apiKey = localStorage.getItem('openai_api_key');
    if (!apiKey) {
      toast.error('Please set your OpenAI API key in settings first');
      return;
    }

    setIsGenerating(true);
    const toastId = toast.loading('Generating agents...');

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4',
          messages: [
            {
              role: 'system',
              content: `You are an expert at creating diverse and specialized AI agents. Generate a team of 3-5 agents that would be best suited to collaborate on the given context. Each agent should have a unique perspective and role.

Response format must be valid JSON array:
[
  {
    "name": "agent name",
    "systemPrompt": "detailed system prompt that defines the agent's role, perspective, and behavior"
  },
  ...
]`
            },
            {
              role: 'user',
              content: `Generate a team of agents for the following context: ${context}`
            }
          ],
          temperature: 0.7,
        }),
      });

      const data = await response.json();
      const generatedAgents = JSON.parse(data.choices[0].message.content);

      // Convert to Agent type with IDs and empty memories
      const newAgents: Agent[] = generatedAgents.map((agent: any) => ({
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        name: agent.name,
        systemPrompt: agent.systemPrompt,
        memories: []
      }));

      onAgentsGenerated(newAgents);
      toast.success('Agents generated successfully!', { id: toastId });
      setContext('');
    } catch (error) {
      console.error('Error generating agents:', error);
      toast.error('Failed to generate agents. Please try again.', { id: toastId });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="generate-agents">
      <h3>Generate Agents</h3>
      <div className="generate-form">
        <textarea
          value={context}
          onChange={(e) => setContext(e.target.value)}
          placeholder="Describe the context or problem for which you want to generate specialized agents..."
          className="context-input"
          rows={4}
        />
        <button
          onClick={handleGenerate}
          disabled={isGenerating || !context.trim()}
          className="generate-button"
        >
          {isGenerating ? 'Generating...' : 'Generate Agents'}
        </button>
      </div>
    </div>
  );
};

export default GenerateAgents; 