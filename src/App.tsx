import React, { useEffect, useState } from 'react';
import './App.css';
import Agents from './components/Agents';
import ChatMessage from './components/ChatMessage';
import ProjectSidebar from './components/ProjectSidebar';
import Responses from './components/Responses';
import Settings from './components/Settings';
import { Agent, AgentMemory, AgentResponse } from './types/Agent';
import { ChatHistoryItem } from './types/ChatHistory';
import { Project, Thread } from './types/Project';
import confetti from 'canvas-confetti';

type Tab = 'chat' | 'agents' | 'settings' | 'responses';

interface ChatMessage {
  id: string;
  text: string;
  sender: 'user' | 'agent';
  agentName?: string;
  timestamp: number;
}

function App() {
  const [activeTab, setActiveTab] = useState<Tab>('chat');
  const [message, setMessage] = useState('');
  const [responses, setResponses] = useState<AgentResponse[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatHistory, setChatHistory] = useState<ChatHistoryItem[]>([]);
  const [currentResponses, setCurrentResponses] = useState<AgentResponse[]>([]);
  const [nextIndex, setNextIndex] = useState(0);
  const [projects, setProjects] = useState<Project[]>(() => {
    const saved = localStorage.getItem('projects');
    return saved ? JSON.parse(saved) : [];
  });
  const [activeProject, setActiveProject] = useState<Project | null>(() => {
    const saved = localStorage.getItem('active_project');
    return saved ? JSON.parse(saved) : null;
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [thinkingAgents, setThinkingAgents] = useState<string[]>([]);
  const [activeThread, setActiveThread] = useState<Thread | null>(null);
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);

  useEffect(() => {
    localStorage.setItem('projects', JSON.stringify(projects));
  }, [projects]);

  useEffect(() => {
    localStorage.setItem('active_project', JSON.stringify(activeProject));
  }, [activeProject]);

  const formatHistoryForAgent = (agentName: string) => {
    return chatHistory.map(item => {
      if (item.role === 'assistant') {
        // For messages from agents
        return {
          role: 'assistant',
          content: item.content,
          name: item.agentName?.replace(/[^a-zA-Z0-9_-]/g, '_'), // Use the original agent's name
          thinking: item.thinking
        };
      } else {
        // For user messages
        return {
          role: 'user',
          content: item.content
        };
      }
    });
  };

  const processAgentResponses = async (agents: Agent[], apiKey: string, messageId: string) => {
    setIsProcessing(true);
    setThinkingAgents(agents.map(agent => agent.name));

    try {
      const newResponses = await Promise.all(agents.map(async (agent: Agent, index: number) => {
        const agentHistory = formatHistoryForAgent(agent.name);
        
        // Ensure agent has memories array and safely construct memories context
        const memories = agent.memories || [];
        const memoriesContext = memories.length > 0
          ? "\n\nYour memories:\n" + memories.map(m => `- ${m.content}`).join('\n')
          : '';

        // Log the complete context for this agent
        console.log(`Context for ${agent.name}:`, {
          systemPrompt: agent.systemPrompt + memoriesContext,
          conversationHistory: agentHistory,
          memories: memories
        });

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
                  content: agent.systemPrompt + memoriesContext + "\n\nYou can store important information in your memory using the 'remember' field in your response. This is optional." 
                },
                ...agentHistory,
                { 
                  role: 'user', 
                  content: `Based on the conversation history above, what would you like to contribute now?\n\nRespond in the following JSON format:\n{\n  "thinking": "your internal thought process",\n  "priority": <number between 1-100>,\n  "speech": "what you want to say",\n  "remember": "(optional) something you want to remember for future conversations"\n}\n\nEnsure your response is valid JSON and contains all required fields.` 
                }
              ],
              temperature: 0.7,
              max_tokens: 1000,
            }),
          });

          const data = await response.json();
          
          if (!data.choices || !data.choices[0]?.message?.content) {
            console.error('Invalid API response for agent:', agent.name, data);
            return null;
          }

          const rawResponse = data.choices[0].message.content.trim();
          console.log(`Complete interaction for ${agent.name}:`, {
            context: {
              systemPrompt: agent.systemPrompt + memoriesContext,
              conversationHistory: agentHistory,
              memories: memories
            },
            response: rawResponse
          });

          try {
            const parsedResponse = JSON.parse(rawResponse);
            
            if (!parsedResponse.thinking || !parsedResponse.priority || !parsedResponse.speech) {
              console.error('Missing required fields in response for agent:', agent.name, parsedResponse);
              return null;
            }

            const priority = Number(parsedResponse.priority);
            if (isNaN(priority) || priority < 1 || priority > 100) {
              console.error('Invalid priority value for agent:', agent.name, parsedResponse);
              return null;
            }

            // Update thinking status when agent responds
            setThinkingAgents(prev => prev.filter(name => name !== agent.name));

            const fullResponse = {
              ...parsedResponse,
              priority: priority,
              agentId: agent.id,
              agentName: agent.name,
              timestamp: Date.now(),
              messageId: messageId
            };

            if (parsedResponse.remember) {
              const newMemory: AgentMemory = {
                id: Date.now().toString(),
                content: parsedResponse.remember,
                timestamp: Date.now()
              };
              
              const updatedAgents = agents.map(a => 
                a.id === agent.id 
                  ? { ...a, memories: [...(a.memories || []), newMemory] }
                  : a
              );
              localStorage.setItem('agents', JSON.stringify(updatedAgents));
            }

            return fullResponse;
          } catch (parseError) {
            console.error('Failed to parse response for agent:', agent.name, parseError);
            console.error('Raw response was:', rawResponse);
            return null;
          }
        } catch (fetchError) {
          console.error('API call failed for agent:', agent.name, fetchError);
          return null;
        }
      }));

      const validResponses = newResponses.filter((r): r is AgentResponse => r !== null);
      return validResponses;
    } catch (error) {
      console.error('Error processing responses:', error);
      return [];
    } finally {
      setIsProcessing(false);
      setThinkingAgents([]);
    }
  };

  const handleNext = async () => {
    const apiKey = localStorage.getItem('openai_api_key');
    if (!apiKey) {
      alert('Please set your OpenAI API key in settings first.');
      return;
    }

    // Get all agents from localStorage
    const savedAgents = localStorage.getItem('agents');
    const agents = savedAgents ? JSON.parse(savedAgents) : [];

    if (agents.length === 0) {
      console.warn('No agents configured. Please add agents first.');
      return;
    }

    const messageId = Date.now().toString();
    const validResponses = await processAgentResponses(agents, apiKey, messageId);
    setCurrentResponses(validResponses);

    if (validResponses.length > 0) {
      // Find the response with the highest priority
      const highestPriorityResponse = validResponses.reduce((prev, current) => {
        return (prev.priority > current.priority) ? prev : current;
      }, validResponses[0]);

      // Add winning response to chat messages
      const agentMessage: ChatMessage = {
        id: Date.now().toString() + highestPriorityResponse.agentId,
        text: highestPriorityResponse.speech,
        sender: 'agent',
        agentName: `${highestPriorityResponse.agentName} (Priority: ${highestPriorityResponse.priority})`,
        timestamp: Date.now(),
      };
      setChatMessages(prev => [...prev, agentMessage]);

      // Add winning response to chat history
      const historyItem: ChatHistoryItem = {
        role: 'assistant',
        content: highestPriorityResponse.speech,
        agentName: highestPriorityResponse.agentName,
        thinking: highestPriorityResponse.thinking,
        priority: highestPriorityResponse.priority,
        timestamp: Date.now()
      };
      setChatHistory(prev => [...prev, historyItem]);

      // Store all responses in the responses tab
      setResponses(prev => [...validResponses, ...prev]);

      console.log(`${highestPriorityResponse.agentName} won with priority ${highestPriorityResponse.priority}`);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const currentMessage = message.trim();
    if (!currentMessage) return;
    
    setMessage(''); // Clear input immediately

    const apiKey = localStorage.getItem('openai_api_key');
    if (!apiKey) {
      alert('Please set your OpenAI API key in settings first.');
      return;
    }

    const messageId = Date.now().toString();

    // Add user message to chat and history
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      text: message,
      sender: 'user',
      timestamp: Date.now(),
    };
    setChatMessages(prev => [...prev, userMessage]);
    
    const userHistoryItem: ChatHistoryItem = {
      role: 'user',
      content: message,
      timestamp: Date.now()
    };
    setChatHistory(prev => [...prev, userHistoryItem]);

    // Get all agents from localStorage
    const savedAgents = localStorage.getItem('agents');
    const agents = savedAgents ? JSON.parse(savedAgents) : [];

    // Process initial responses
    const validResponses = await processAgentResponses(agents, apiKey, messageId);
    setCurrentResponses(validResponses);

    if (validResponses.length > 0) {
      // Find the response with the highest priority
      const highestPriorityResponse = validResponses.reduce((prev, current) => {
        return (prev.priority > current.priority) ? prev : current;
      }, validResponses[0]);

      // Add winning response to chat messages
      const agentMessage: ChatMessage = {
        id: Date.now().toString() + highestPriorityResponse.agentId,
        text: highestPriorityResponse.speech,
        sender: 'agent',
        agentName: `${highestPriorityResponse.agentName} (Priority: ${highestPriorityResponse.priority})`,
        timestamp: Date.now(),
      };
      setChatMessages(prev => [...prev, agentMessage]);

      // Add winning response to chat history
      const historyItem: ChatHistoryItem = {
        role: 'assistant',
        content: highestPriorityResponse.speech,
        agentName: highestPriorityResponse.agentName,
        thinking: highestPriorityResponse.thinking,
        priority: highestPriorityResponse.priority,
        timestamp: Date.now()
      };
      setChatHistory(prev => [...prev, historyItem]);

      // Store all responses in the responses tab
      setResponses(prev => [...validResponses, ...prev]);

      console.log(`${highestPriorityResponse.agentName} won with priority ${highestPriorityResponse.priority}`);
    }

    setMessage('');
  };

  const handleCreateProject = (name: string) => {
    const newProject: Project = {
      id: Date.now().toString(),
      name,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      threads: []
    };
    setProjects(prev => [...prev, newProject]);
    setActiveProject(newProject);
  };

  const handleSelectProject = (project: Project) => {
    setActiveProject(project);
    
    // Load active thread if it exists
    if (project.activeThreadId) {
      const activeThread = project.threads.find(t => t.id === project.activeThreadId);
      if (activeThread) {
        setActiveThread(activeThread);
        setChatHistory(activeThread.chatHistory);
        // Convert chat history to chat messages
        const messages: ChatMessage[] = activeThread.chatHistory.map(historyItem => ({
          id: `${historyItem.timestamp}-${Math.random()}`,
          text: historyItem.content,
          sender: historyItem.role === 'user' ? 'user' : 'agent',
          agentName: historyItem.agentName,
          timestamp: historyItem.timestamp
        }));
        setChatMessages(messages);
      }
    } else {
      setActiveThread(null);
      setChatHistory([]);
      setChatMessages([]);
    }
  };

  const handleCreateThread = (name: string) => {
    if (!activeProject) return;

    const timestamp = Date.now();
    const topicMessage: ChatHistoryItem = {
      role: 'user',
      content: `Topic: ${name}`,
      timestamp
    };

    const newThread: Thread = {
      id: timestamp.toString(),
      name,
      createdAt: timestamp,
      updatedAt: timestamp,
      chatHistory: [topicMessage]
    };

    const updatedProject = {
      ...activeProject,
      threads: [...(activeProject.threads || []), newThread],
      activeThreadId: newThread.id
    };

    setProjects(prev => prev.map(p => 
      p.id === activeProject.id ? updatedProject : p
    ));
    setActiveProject(updatedProject);
    setActiveThread(newThread);
    setChatHistory([topicMessage]);
    setChatMessages([{
      id: timestamp.toString(),
      text: `Topic: ${name}`,
      sender: 'user',
      timestamp
    }]);

    // Switch to chat tab
    setActiveTab('chat');

    // Try to trigger confetti, fallback gracefully if module not loaded
    try {
      if (typeof confetti === 'function') {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 }
        });
      }
    } catch (error) {
      console.log('Confetti not available');
    }

    // Automatically start the conversation
    handleNext();
  };

  const handleSelectThread = (thread: Thread) => {
    if (!activeProject) return;

    setActiveThread(thread);
    setChatHistory(thread.chatHistory);
    
    // Convert chat history to chat messages
    const messages: ChatMessage[] = thread.chatHistory.map(historyItem => ({
      id: `${historyItem.timestamp}-${Math.random()}`,
      text: historyItem.content,
      sender: historyItem.role === 'user' ? 'user' : 'agent',
      agentName: historyItem.agentName,
      timestamp: historyItem.timestamp
    }));
    setChatMessages(messages);
    
    const updatedProject = {
      ...activeProject,
      activeThreadId: thread.id
    };
    
    setProjects(prev => prev.map(p => 
      p.id === activeProject.id ? updatedProject : p
    ));
    setActiveProject(updatedProject);
  };

  const handleDeleteThread = (threadId: string) => {
    if (!activeProject) return;

    const updatedProject = {
      ...activeProject,
      threads: activeProject.threads.filter(t => t.id !== threadId),
      activeThreadId: activeProject.activeThreadId === threadId ? undefined : activeProject.activeThreadId
    };

    setProjects(prev => prev.map(p => 
      p.id === activeProject.id ? updatedProject : p
    ));
    setActiveProject(updatedProject);

    if (activeThread?.id === threadId) {
      setActiveThread(null);
      setChatHistory([]);
      setChatMessages([]);
    }
  };

  useEffect(() => {
    if (activeProject && activeThread) {
      const updatedThread = {
        ...activeThread,
        chatHistory,
        updatedAt: Date.now()
      };

      const updatedProject = {
        ...activeProject,
        threads: activeProject.threads.map(t =>
          t.id === activeThread.id ? updatedThread : t
        ),
        updatedAt: Date.now()
      };

      setProjects(prev => prev.map(p =>
        p.id === activeProject.id ? updatedProject : p
      ));
      setActiveProject(updatedProject);
      setActiveThread(updatedThread);
    }
  }, [chatHistory, chatMessages]);

  const handleSettingsClick = () => {
    setActiveTab('settings');
  };

  useEffect(() => {
    let autoPlayTimeout: NodeJS.Timeout;
    
    if (isAutoPlaying && !isProcessing) {
      autoPlayTimeout = setTimeout(() => {
        handleNext();
      }, 1000); // Wait 1 second between responses
    }

    return () => {
      if (autoPlayTimeout) {
        clearTimeout(autoPlayTimeout);
      }
    };
  }, [isAutoPlaying, isProcessing, chatHistory]);

  // Add this effect to handle tab changes when thread status changes
  useEffect(() => {
    if (!activeThread && (activeTab === 'chat' || activeTab === 'responses')) {
      setActiveTab('agents');
    }
  }, [activeThread]);

  // Add this effect to handle default tab selection
  useEffect(() => {
    if (activeThread) {
      setActiveTab('chat');
    } else {
      setActiveTab('agents');
    }
  }, [activeThread]);

  // Add this to show the welcome animation in chat
  const ChatContainer = () => {
    return (
      <div className="chat-container">
        <div className="chat-messages">
          <div className="welcome-animation">
            <h2>Topic: {activeThread?.name}</h2>
          </div>
          {chatMessages.map(msg => (
            <ChatMessage key={msg.id} message={msg} />
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="App">
      <ProjectSidebar
        projects={projects}
        activeProject={activeProject}
        activeThread={activeThread}
        onSelectProject={handleSelectProject}
        onCreateProject={handleCreateProject}
        onCreateThread={handleCreateThread}
        onSelectThread={handleSelectThread}
        onDeleteThread={handleDeleteThread}
        onSettingsClick={handleSettingsClick}
      />
      <div className="main-content">
        <div className="tab-bar">
          {activeThread && (
            <>
              <button 
                className={`tab-button ${activeTab === 'chat' ? 'active' : ''}`}
                onClick={() => setActiveTab('chat')}
              >
                Chat
              </button>
              <button 
                className={`tab-button ${activeTab === 'responses' ? 'active' : ''}`}
                onClick={() => setActiveTab('responses')}
              >
                Responses
              </button>
            </>
          )}
          <button 
            className={`tab-button ${activeTab === 'agents' ? 'active' : ''}`}
            onClick={() => setActiveTab('agents')}
          >
            Agents
          </button>
        </div>

        <div className="content-area">
          {activeTab === 'chat' && activeThread && <ChatContainer />}
          {activeTab === 'agents' && (
            <div className="agents-container">
              <Agents />
            </div>
          )}
          {activeTab === 'responses' && activeThread && (
            <div className="responses-container">
              <Responses responses={responses} />
            </div>
          )}
          {activeTab === 'settings' && (
            <div className="settings-container">
              <Settings />
            </div>
          )}
        </div>

        {activeTab === 'chat' && activeThread && (
          <>
            {thinkingAgents.length > 0 && (
              <div className="thinking-status-bar">
                {thinkingAgents.map(agentName => (
                  <div key={agentName} className="thinking-agent">
                    <span className="thinking-dot-animation" />
                    {agentName} is thinking...
                  </div>
                ))}
              </div>
            )}
            <div className="chat-controls">
              <button
                className={`auto-play-button ${isAutoPlaying ? 'active' : ''}`}
                onClick={() => setIsAutoPlaying(!isAutoPlaying)}
              >
                {isAutoPlaying ? '⏹️ Stop Auto-play' : '▶️ Auto-play'}
              </button>
              <form className="chat-input-form" onSubmit={handleSendMessage}>
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
                  onClick={handleNext}
                  className="next-button"
                  disabled={isProcessing || !currentResponses || nextIndex >= currentResponses.length || isAutoPlaying}
                >
                  Next ({currentResponses ? currentResponses.length - nextIndex : 0})
                </button>
              </form>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default App;
