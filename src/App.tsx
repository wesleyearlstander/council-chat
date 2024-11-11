import confetti from 'canvas-confetti';
import { useEffect, useState } from 'react';
import './App.css';
import Agents from './components/Agents';
import ChatInput from './components/ChatInput';
import { ChatContainer, ChatMessage } from './components/ChatMessage';
import ProjectSidebar from './components/ProjectSidebar';
import Responses from './components/Responses';
import Settings from './components/Settings';
import { Agent, AgentMemory, AgentResponse } from './types/Agent';
import { ChatHistoryItem } from './types/ChatHistory';
import { Project, Thread } from './types/Project';

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
  const [autoPlayCount, setAutoPlayCount] = useState<number>(0);
  const [autoPlayExecuted, setAutoPlayExecuted] = useState<number>(0);

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

  // Update the triageResponses function
  const triageResponses = async (responses: AgentResponse[], apiKey: string): Promise<AgentResponse> => {
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo', // Using smaller model for triage
          messages: [
            {
              role: 'system',
              content: 'You are a triage expert. Select the response that provides the most valuable information. Focus on: relevance, insight depth, and actionable content.'
            },
            {
              role: 'user',
              content: `Select the ONE response that provides the most important information:

${responses.map((r, i) => `[${i + 1}]
Agent: ${r.agentName}
Response: ${r.speech}`).join('\n\n')}

Respond with ONLY the agent name, like: "AgentName"`
            }
          ],
          temperature: 0.3, // Lower temperature for more consistent selection
          max_tokens: 50, // Limit response length since we only need the name
        }),
      });

      const data = await response.json();
      const selectedAgentName = data.choices[0].message.content.trim();
      
      // Find and return the selected response
      const selectedResponse = responses.find(r => r.agentName === selectedAgentName);
      if (!selectedResponse) {
        console.warn('Selected agent not found, using first response');
        return responses[0];
      }

      return selectedResponse;
    } catch (error) {
      console.error('Triage error:', error);
      // If triage fails, fall back to the first response
      return responses[0];
    }
  };

  // Update the processWinningResponses function
  const processWinningResponses = async (validResponses: AgentResponse[]) => {
    if (validResponses.length === 0) return;

    // Find the highest priority
    const highestPriority = Math.max(...validResponses.map(r => r.priority));
    
    // Get all responses with the highest priority
    const highestPriorityResponses = validResponses
      .filter(response => response.priority === highestPriority)
      .sort((a, b) => a.timestamp - b.timestamp);

    try {
      // If multiple responses have the same priority, use triage
      let winningResponse: AgentResponse;
      if (highestPriorityResponses.length > 1) {
        const apiKey = localStorage.getItem('openai_api_key');
        if (!apiKey) throw new Error('API key not found');
        
        console.log(`Triaging ${highestPriorityResponses.length} responses with priority ${highestPriority}`);
        winningResponse = await triageResponses(highestPriorityResponses, apiKey);
      } else {
        winningResponse = highestPriorityResponses[0];
      }

      // Add winning response to chat messages
      const agentMessage: ChatMessage = {
        id: Date.now().toString() + winningResponse.agentId,
        text: winningResponse.speech,
        sender: 'agent',
        agentName: `${winningResponse.agentName} (Priority: ${winningResponse.priority})`,
        timestamp: winningResponse.timestamp,
      };
      setChatMessages(prev => [...prev, agentMessage]);

      // Add to chat history - keep only last 10 items
      const historyItem: ChatHistoryItem = {
        role: 'assistant',
        content: winningResponse.speech,
        agentName: winningResponse.agentName,
        thinking: winningResponse.thinking,
        priority: winningResponse.priority,
        timestamp: winningResponse.timestamp
      };
      setChatHistory(prev => [...prev, historyItem].slice(-10));

      // Store all responses in the responses tab
      setResponses(prev => [...validResponses, ...prev]);

      // Log the winner and triage result
      console.log(`${winningResponse.agentName} won with priority ${highestPriority}`);
    } catch (error) {
      console.error('Error processing winning responses:', error);
    }
  };

  const handleNext = async () => {
    if (!activeProject) {
      alert('Please select a project first.');
      return;
    }

    const apiKey = localStorage.getItem('openai_api_key');
    if (!apiKey) {
      alert('Please set your OpenAI API key in settings first.');
      return;
    }

    if (activeProject.agents.length === 0) {
      alert('Please add agents to the project first.');
      return;
    }

    const messageId = Date.now().toString();
    const validResponses = await processAgentResponses(activeProject.agents, apiKey, messageId);
    setCurrentResponses(validResponses);

    if (validResponses.length > 0) {
      processWinningResponses(validResponses);
    }
  };

  const handleSendMessage = async (message: string) => {
    if (!message.trim() || !activeThread || !activeProject) return;

    const apiKey = localStorage.getItem('openai_api_key');
    if (!apiKey) {
      alert('Please set your OpenAI API key in settings first.');
      return;
    }

    const messageId = Date.now().toString();
    const timestamp = Date.now();

    // Create user message objects
    const userMessage: ChatMessage = {
      id: messageId,
      text: message,
      sender: 'user',
      timestamp,
    };

    const userHistoryItem: ChatHistoryItem = {
      role: 'user',
      content: message,
      timestamp
    };

    // Update chat messages and history
    setChatMessages(prev => [...prev, userMessage]);
    const updatedHistory = [...chatHistory, userHistoryItem].slice(-10);
    setChatHistory(updatedHistory);

    // Update thread with new chat history
    const updatedThread = {
      ...activeThread,
      chatHistory: updatedHistory,
      updatedAt: timestamp
    };

    // Update project with modified thread
    const updatedProject = {
      ...activeProject,
      threads: activeProject.threads.map(t =>
        t.id === activeThread.id ? updatedThread : t
      ),
      updatedAt: timestamp
    };

    // Update states and localStorage
    setActiveThread(updatedThread);
    setProjects(prev => prev.map(p =>
      p.id === activeProject.id ? updatedProject : p
    ));
    setActiveProject(updatedProject);

    // Process agent responses with project's agents
    const validResponses = await processAgentResponses(activeProject.agents, apiKey, messageId);
    setCurrentResponses(validResponses);

    if (validResponses.length > 0) {
      await processWinningResponses(validResponses);
    }
  };

  const handleCreateProject = (name: string) => {
    const newProject: Project = {
      id: Date.now().toString(),
      name,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      threads: [],
      agents: [],
    };
    setProjects(prev => [...prev, newProject]);
    setActiveProject(newProject);
    setActiveTab('agents');
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
      chatHistory: [topicMessage]
    };

    // Reset all states before updating with new thread
    setResponses([]);
    setCurrentResponses([]);
    setNextIndex(0);
    setChatHistory([topicMessage]);
    setChatMessages([{
      id: timestamp.toString(),
      text: `Topic: ${name}`,
      sender: 'user',
      timestamp
    }]);
    setIsAutoPlaying(false);
    setAutoPlayExecuted(0);

    const updatedProject = {
      ...activeProject,
      threads: [...(activeProject.threads || []), newThread],
      activeThreadId: newThread.id
    };

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
    setIsAutoPlaying(false);
    setAutoPlayExecuted(0);
    
    // Set the new thread
    setActiveThread(thread);
    
    // Load the thread's chat history
    const threadHistory = thread.chatHistory || [];
    setChatHistory([...threadHistory]); // Create a new array to ensure state update
    
    // Convert thread's chat history to chat messages
    const messages: ChatMessage[] = threadHistory.map(historyItem => ({
      id: `${historyItem.timestamp}-${Math.random()}`,
      text: historyItem.content,
      sender: historyItem.role === 'user' ? 'user' : 'agent',
      agentName: historyItem.agentName,
      timestamp: historyItem.timestamp
    }));
    setChatMessages([...messages]); // Create a new array to ensure state update
    
    // Update project's active thread
    const updatedProject = {
      ...activeProject,
      activeThreadId: thread.id,
      threads: activeProject.threads.map(t => 
        t.id === thread.id ? { ...thread, chatHistory: threadHistory } : t
      )
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
    let timeoutId: NodeJS.Timeout | null = null;
    
    const runAutoPlay = async () => {
      if (!isAutoPlaying || isProcessing) return;

      // Check if we've reached the count limit
      if (autoPlayCount > 0 && autoPlayExecuted >= autoPlayCount) {
        setIsAutoPlaying(false);
        setAutoPlayExecuted(0);
        return;
      }

      try {
        await handleNext();
        if (autoPlayCount > 0) {
          setAutoPlayExecuted(prev => prev + 1);
        }
      } catch (error) {
        console.error('Error in auto-play:', error);
        setIsAutoPlaying(false);
        setAutoPlayExecuted(0);
      }
    };

    // Only set timeout if auto-play is active
    if (isAutoPlaying && !isProcessing) {
      timeoutId = setTimeout(runAutoPlay, 1000);
    }

    // Cleanup function
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [isAutoPlaying, isProcessing, autoPlayCount, autoPlayExecuted, nextIndex]);

  // Update the handleAutoPlayToggle function
  const handleAutoPlayToggle = () => {
    if (isAutoPlaying) {
      // Force immediate stop
      setIsAutoPlaying(false);
      setAutoPlayExecuted(0);
      setNextIndex(prev => prev); // Force update to stop current execution
    } else {
      // Start auto-play
      setAutoPlayExecuted(0);
      setIsAutoPlaying(true);
      if (currentResponses.length <= nextIndex) {
        handleNext();
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

  // Add the counter handler
  const handleAutoPlayCountChange = (count: number) => {
    setAutoPlayCount(count);
    setAutoPlayExecuted(0);
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
                autoPlayCount={autoPlayCount}
                onAutoPlayCountChange={handleAutoPlayCountChange}
                remainingPlays={autoPlayCount === -1 ? -1 : autoPlayCount - autoPlayExecuted}
              />
            </>
          )}
          {activeTab === 'agents' && activeProject && (
            <div className="agents-container">
              <Agents 
                project={activeProject}
                onUpdateProject={(updatedProject) => {
                  setProjects(prev => prev.map(p => 
                    p.id === updatedProject.id ? updatedProject : p
                  ));
                  setActiveProject(updatedProject);
                }}
              />
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
