import React, { useState } from 'react';
import { Agent } from '../types/Agent';

interface GenerateAgentsProps {
  onAgentsGenerated: (agents: Agent[]) => void;
}

interface TemplateAttribute {
  name: string;
  description: string;
  defaultValue: string;
  required: boolean;
}

interface CharacterSummary {
  name: string;
  role: string;
}

const defaultTemplateAttributes: TemplateAttribute[] = [
  {
    name: 'Context',
    description: 'The core context surrounding the person, their fundamental system prompt',
    defaultValue: 'Context',
    required: true
  },
  {
    name: 'Personality',
    description: 'How they would instruct themselves to be, their character traits',
    defaultValue: 'Personality',
    required: true
  },
  {
    name: 'Would',
    description: 'Example responses that represent how they would respond to certain questions',
    defaultValue: 'Would',
    required: true
  },
  {
    name: 'Family',
    description: 'Their immediate family and people they love deeply',
    defaultValue: 'Family',
    required: true
  },
  {
    name: 'Relationships',
    description: 'People who have a relationship with the individual but are not family',
    defaultValue: 'Relationships',
    required: true
  }
];

const GenerateAgents: React.FC<GenerateAgentsProps> = ({ onAgentsGenerated }) => {
  const [context, setContext] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState<string>('');
  const [isEditingTemplate, setIsEditingTemplate] = useState(false);
  const [templateAttributes, setTemplateAttributes] = useState<TemplateAttribute[]>(defaultTemplateAttributes);
  const [newAttributeName, setNewAttributeName] = useState('');
  const [newAttributeDescription, setNewAttributeDescription] = useState('');

  const generateCharacterList = async (apiKey: string, context: string): Promise<CharacterSummary[]> => {
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
            content: `You are an expert at identifying key characters and roles for a given context. Generate a list of essential characters that would create interesting and dynamic interactions.

Response format must be valid JSON array:
[
  {
    "name": "character name",
    "role": "brief description of their role and importance"
  },
  ...
]`
          },
          {
            role: 'user',
            content: `Generate a list of characters for the following context: ${context}`
          }
        ],
        temperature: 1,
      }),
    });

    const data = await response.json();
    return JSON.parse(data.choices[0].message.content);
  };

  const generateAgentProfile = async (apiKey: string, character: CharacterSummary): Promise<Agent> => {
    setGenerationProgress(prev => prev + `\nGenerating profile for ${character.name}...`);
    
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
            content: `You are an expert at creating detailed character profiles written as first-person instructions. Generate a complete profile that reads as if the character is instructing an AI how to embody their persona.

Character: ${character.name}
Role: ${character.role}

For each attribute, write instructions as if the character is explaining how to be them. Each section must be written in first person, as if giving direct instructions.

Required sections and their purposes:
${templateAttributes.map(attr => `- ${attr.name}: ${attr.description}`).join('\n')}

Response format must be valid JSON:
{
  "name": "${character.name}",
  "systemPrompt": {
${templateAttributes.map(attr => `    "${attr.name}": "As ${character.name}, I instruct you on my ${attr.name.toLowerCase()}..."`).join(',\n')}
  }
}`
          },
          {
            role: 'user',
            content: `Write a first-person instruction set for ${character.name} in the following context: ${context}

Remember:
1. Write as if ${character.name} is directly instructing how to be them
2. Each section must be personal and instructive
3. Include all required attributes
4. Maintain character voice throughout
5. Focus on actionable instructions`
          }
        ],
        temperature: 1,
      }),
    });

    const data = await response.json();
    const profile = JSON.parse(data.choices[0].message.content);

    // Validate all required attributes are present
    const missingAttributes = templateAttributes
      .filter(attr => !profile.systemPrompt[attr.name])
      .map(attr => attr.name);

    if (missingAttributes.length > 0) {
      throw new Error(`Missing required attributes: ${missingAttributes.join(', ')}`);
    }

    // Format the system prompt to be more readable
    const formattedPrompt = Object.entries(profile.systemPrompt)
      .map(([key, value]) => {
        // Add a header comment for each section
        return `// ${key.toUpperCase()}\n${value}`;
      })
      .join('\n\n');

    return {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      name: profile.name,
      systemPrompt: formattedPrompt,
      memories: []
    };
  };

  const handleGenerate = async () => {
    if (!context.trim()) {
      alert('Please provide a context for agent generation');
      return;
    }

    const apiKey = localStorage.getItem('openai_api_key');
    if (!apiKey) {
      alert('Please set your OpenAI API key in settings first');
      return;
    }

    setIsGenerating(true);
    setGenerationProgress('Identifying characters...');

    try {
      // Step 1: Generate list of characters
      const characters = await generateCharacterList(apiKey, context);
      setGenerationProgress(prev => prev + `\nIdentified ${characters.length} characters.`);

      // Step 2: Generate detailed profile for each character
      const agents = await Promise.all(
        characters.map(character => generateAgentProfile(apiKey, character))
      );

      setGenerationProgress(prev => prev + '\nAll profiles generated successfully!');
      onAgentsGenerated(agents);
      setContext('');
    } catch (error) {
      console.error('Error generating agents:', error);
      alert('Failed to generate agents. Please try again.');
    } finally {
      setIsGenerating(false);
      setTimeout(() => setGenerationProgress(''), 3000);
    }
  };

  const addTemplateAttribute = () => {
    if (!newAttributeName.trim()) return;

    setTemplateAttributes(prev => [...prev, {
      name: newAttributeName,
      description: newAttributeDescription,
      defaultValue: newAttributeName,
      required: false
    }]);

    setNewAttributeName('');
    setNewAttributeDescription('');
  };

  const removeTemplateAttribute = (index: number) => {
    setTemplateAttributes(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="generate-agents">
      <div className="generate-header">
        <h3>Generate Agents</h3>
        <button 
          className="template-button"
          onClick={() => setIsEditingTemplate(!isEditingTemplate)}
        >
          ⚙️ Template Settings
        </button>
      </div>

      {isEditingTemplate && (
        <div className="template-editor">
          <h4>Agent Attributes</h4>
          <div className="template-attributes">
            {templateAttributes.map((attr, index) => (
              <div key={index} className="template-attribute">
                <div className="attribute-header">
                  <span className="attribute-name">{attr.name}</span>
                  <button
                    className="remove-attribute-button"
                    onClick={() => removeTemplateAttribute(index)}
                  >
                    ✕
                  </button>
                </div>
                <p className="attribute-description">{attr.description}</p>
              </div>
            ))}
          </div>

          <div className="add-attribute-form">
            <input
              type="text"
              value={newAttributeName}
              onChange={(e) => setNewAttributeName(e.target.value)}
              placeholder="New attribute name"
              className="attribute-input"
            />
            <input
              type="text"
              value={newAttributeDescription}
              onChange={(e) => setNewAttributeDescription(e.target.value)}
              placeholder="Attribute description"
              className="attribute-input"
            />
            <button
              onClick={addTemplateAttribute}
              disabled={!newAttributeName.trim()}
              className="add-attribute-button"
            >
              Add Attribute
            </button>
          </div>
        </div>
      )}

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
        {generationProgress && (
          <div className="generation-progress">
            {generationProgress.split('\n').map((line, index) => (
              <div key={index} className="progress-line">{line}</div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default GenerateAgents; 