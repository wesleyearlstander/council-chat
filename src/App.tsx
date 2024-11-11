import confetti from 'canvas-confetti';
import React, { useEffect, useState } from 'react';
import './App.css';
import Agents from './components/Agents';
import { ChatContainer, ChatMessage } from './components/ChatMessage';
import ProjectSidebar from './components/ProjectSidebar';
import Responses from './components/Responses';
import Settings from './components/Settings';
import { Agent, AgentMemory, AgentResponse } from './types/Agent';
import { ChatHistoryItem } from './types/ChatHistory';
import { Project, Thread } from './types/Project';
import ChatInput from './components/ChatInput';

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
        
        // Check if memory is enabled
        const isMemoryEnabled = localStorage.getItem('memory_enabled') === 'true';
        
        // Only include memories context if enabled
        const memoriesContext = isMemoryEnabled && agent.memories?.length > 0
          ? "\n\nYour memories:\n" + agent.memories.map(m => `- ${m.content}`).join('\n')
          : '';

        // Log the complete context for this agent
        console.log(`Context for ${agent.name}:`, {
          systemPrompt: agent.systemPrompt + memoriesContext,
          conversationHistory: agentHistory,
          memories: agent.memories
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
                  content: agent.systemPrompt + memoriesContext + 
                    (isMemoryEnabled ? "\n\nYou can store important information in your memory using the 'remember' field in your response. This is optional." : "")
                },
                ...agentHistory,
                { 
                  role: 'user', 
                  content: `Based on the conversation history above, what would you like to contribute now?\n\nRespond in the following JSON format:\n{\n  "thinking": "your internal thought process",\n  "priority": <number between 1-100>,\n  "speech": "what you want to say"${isMemoryEnabled ? ',\n  "remember": "(optional) something you want to remember for future conversations"' : ''}\n}\n\nEnsure your response is valid JSON and contains all required fields.`
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
              memories: agent.memories
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

            // Only process memory if enabled
            if (isMemoryEnabled && parsedResponse.remember) {
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

  const processWinningResponses = (validResponses: AgentResponse[]) => {
    if (validResponses.length === 0) return;

    // Find the highest priority
    const highestPriority = Math.max(...validResponses.map(r => r.priority));
    
    // Get the fastest response with the highest priority
    const winningResponse = validResponses
      .filter(response => response.priority === highestPriority)
      .sort((a, b) => a.timestamp - b.timestamp)[0];

    // Add winning response to chat messages
    const agentMessage: ChatMessage = {
      id: Date.now().toString() + winningResponse.agentId,
      text: winningResponse.speech,
      sender: 'agent',
      agentName: `${winningResponse.agentName} (Priority: ${winningResponse.priority})`,
      timestamp: winningResponse.timestamp,
    };
    setChatMessages(prev => [...prev, agentMessage]);

    // Add to chat history
    const historyItem: ChatHistoryItem = {
      role: 'assistant',
      content: winningResponse.speech,
      agentName: winningResponse.agentName,
      thinking: winningResponse.thinking,
      priority: winningResponse.priority,
      timestamp: winningResponse.timestamp
    };
    setChatHistory(prev => [...prev, historyItem]);

    // Store all responses in the responses tab
    setResponses(prev => [...validResponses, ...prev]);

    // Log the winner
    console.log(`${winningResponse.agentName} won with priority ${highestPriority}`);
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
      processWinningResponses(validResponses);
    }
  };

  const handleSendMessage = async (message: string) => {
    if (!message.trim()) return;

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
      processWinningResponses(validResponses);
    }
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
    
    // Reset all conversation states first
    setResponses([]);
    setCurrentResponses([]);
    setNextIndex(0);
    setChatHistory([]);
    setChatMessages([]);
    
    // Load active thread if it exists
    if (project.activeThreadId) {
      const activeThread = project.threads.find(t => t.id === project.activeThreadId);
      if (activeThread) {
        setActiveThread(activeThread);
        const threadHistory = activeThread.chatHistory || [];
        setChatHistory(threadHistory);
        // Convert chat history to chat messages
        const messages: ChatMessage[] = threadHistory.map(historyItem => ({
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

    // Create new thread with only the topic message
    const newThread: Thread = {
      id: timestamp.toString(),
      name,
      createdAt: timestamp,
      updatedAt: timestamp,
      chatHistory: [topicMessage] // Only include the topic message
    };

    const updatedProject = {
      ...activeProject,
      threads: [...(activeProject.threads || []), newThread],
      activeThreadId: newThread.id
    };

    // Reset all conversation states
    setResponses([]); // Clear previous responses
    setCurrentResponses([]); // Clear current responses
    setNextIndex(0); // Reset next index
    setChatHistory([topicMessage]); // Only include topic message
    setChatMessages([{
      id: timestamp.toString(),
      text: `Topic: ${name}`,
      sender: 'user',
      timestamp
    }]);

    // Update project and thread states
    setProjects(prev => prev.map(p => 
      p.id === activeProject.id ? updatedProject : p
    ));
    setActiveProject(updatedProject);
    setActiveThread(newThread);

    // Switch to chat tab
    setActiveTab('chat');

    // Trigger confetti
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

    // Reset all conversation states first
    setResponses([]);
    setCurrentResponses([]);
    setNextIndex(0);
    
    // Set the new thread
    setActiveThread(thread);
    
    // Load the thread's chat history
    const threadHistory = thread.chatHistory || [];
    setChatHistory(threadHistory);
    
    // Convert thread's chat history to chat messages
    const messages: ChatMessage[] = threadHistory.map(historyItem => ({
      id: `${historyItem.timestamp}-${Math.random()}`,
      text: historyItem.content,
      sender: historyItem.role === 'user' ? 'user' : 'agent',
      agentName: historyItem.agentName,
      timestamp: historyItem.timestamp
    }));
    setChatMessages(messages);
    
    // Update project's active thread
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
    if (activeProject && activeThread && chatHistory.length > 0) {
      // Update the thread with new chat history
      const updatedThread = {
        ...activeThread,
        chatHistory: chatHistory,
        updatedAt: Date.now()
      };

      // Update the project with the modified thread
      const updatedProject = {
        ...activeProject,
        threads: activeProject.threads.map(t =>
          t.id === activeThread.id ? updatedThread : t
        ),
        updatedAt: Date.now()
      };

      // Update both states and localStorage
      setProjects(prev => prev.map(p =>
        p.id === activeProject.id ? updatedProject : p
      ));
      setActiveProject(updatedProject);
      setActiveThread(updatedThread);
      localStorage.setItem('projects', JSON.stringify(
        projects.map(p => p.id === activeProject.id ? updatedProject : p)
      ));
    }
  }, [chatHistory]);

  const handleSettingsClick = () => {
    setActiveTab('settings');
  };

  useEffect(() => {
    let autoPlayTimeout: NodeJS.Timeout;
    
    const runAutoPlay = async () => {
      if (isAutoPlaying && !isProcessing && currentResponses.length > nextIndex) {
        try {
          await handleNext();
        } catch (error) {
          console.error('Error in auto-play:', error);
          setIsAutoPlaying(false);
        }
      } else if (nextIndex >= currentResponses.length) {
        setIsAutoPlaying(false);
      }
    };

    if (isAutoPlaying) {
      autoPlayTimeout = setTimeout(runAutoPlay, 1000);
    }

    return () => {
      if (autoPlayTimeout) {
        clearTimeout(autoPlayTimeout);
      }
    };
  }, [isAutoPlaying, isProcessing, nextIndex, currentResponses.length]);

  // Update the handleAutoPlayToggle function
  const handleAutoPlayToggle = () => {
    if (isAutoPlaying) {
      // Immediately stop auto-play
      setIsAutoPlaying(false);
    } else {
      // Start auto-play only if there are responses to process
      if (currentResponses.length > nextIndex) {
        setIsAutoPlaying(true);
      } else {
        // If no responses, trigger a new response
        handleNext();
        setIsAutoPlaying(true);
      }
    }
  };

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
          {activeTab === 'chat' && activeThread && (
            <>
              <ChatContainer>
                <div className="chat-messages">
                  <div className="welcome-animation">
                    <h2>Topic: {activeThread?.name}</h2>
                  </div>
                  {chatMessages.map((msg, index) => (
                    <ChatMessage 
                      key={msg.id} 
                      message={msg} 
                      isLatest={index === chatMessages.length - 1}
                    />
                  ))}
                </div>
              </ChatContainer>
              
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
              
              <ChatInput
                onSendMessage={handleSendMessage}
                onNext={handleNext}
                isProcessing={isProcessing}
                isAutoPlaying={isAutoPlaying}
                currentResponsesCount={currentResponses.length}
                nextIndex={nextIndex}
                onAutoPlayToggle={handleAutoPlayToggle}
              />
            </>
          )}
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
      </div>
    </div>
  );
}

export default App;
