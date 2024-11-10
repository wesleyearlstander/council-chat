import React, { useState } from 'react';
import { Project, Thread } from '../types/Project';

interface ProjectSidebarProps {
  projects: Project[];
  activeProject: Project | null;
  activeThread: Thread | null;
  onSelectProject: (project: Project) => void;
  onCreateProject: (name: string) => void;
  onCreateThread: (name: string) => void;
  onSelectThread: (thread: Thread) => void;
  onDeleteThread: (threadId: string) => void;
  onSettingsClick: () => void;
}

const ProjectSidebar: React.FC<ProjectSidebarProps> = ({
  projects,
  activeProject,
  activeThread,
  onSelectProject,
  onCreateProject,
  onCreateThread,
  onSelectThread,
  onDeleteThread,
  onSettingsClick,
}) => {
  const [newProjectName, setNewProjectName] = useState('');
  const [newThreadName, setNewThreadName] = useState('');
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [isCreatingThread, setIsCreatingThread] = useState(false);

  const handleCreateProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (newProjectName.trim()) {
      onCreateProject(newProjectName.trim());
      setNewProjectName('');
      setIsCreatingProject(false);
    }
  };

  const handleCreateThread = (e: React.FormEvent) => {
    e.preventDefault();
    if (newThreadName.trim()) {
      onCreateThread(newThreadName.trim());
      setNewThreadName('');
      setIsCreatingThread(false);
    }
  };

  return (
    <div className="project-sidebar">
      <div className="project-sidebar-header">
        <h2>Projects</h2>
        <button 
          className="create-project-button"
          onClick={() => setIsCreatingProject(true)}
        >
          + New Project
        </button>
      </div>

      {isCreatingProject && (
        <form onSubmit={handleCreateProject} className="create-project-form">
          <input
            type="text"
            value={newProjectName}
            onChange={(e) => setNewProjectName(e.target.value)}
            placeholder="Project name"
            className="project-name-input"
            autoFocus
          />
          <div className="create-project-actions">
            <button type="submit" className="confirm-button">
              Create
            </button>
            <button 
              type="button" 
              className="cancel-button"
              onClick={() => {
                setIsCreatingProject(false);
                setNewProjectName('');
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="sidebar-content">
        {projects.map(project => (
          <div key={project.id} className="project-section">
            <div
              className={`project-item ${activeProject?.id === project.id ? 'active' : ''}`}
              onClick={() => onSelectProject(project)}
            >
              <span className="project-name">{project.name}</span>
              <span className="project-date">
                {new Date(project.updatedAt).toLocaleDateString()}
              </span>
            </div>

            {activeProject?.id === project.id && (
              <div className="project-threads">
                <div className="threads-header">
                  <h3>Threads</h3>
                  <button 
                    className="create-thread-button"
                    onClick={() => setIsCreatingThread(true)}
                  >
                    + New Thread
                  </button>
                </div>

                {isCreatingThread && (
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
                          setIsCreatingThread(false);
                          setNewThreadName('');
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}

                <div className="threads-list">
                  {project.threads.map(thread => (
                    <div
                      key={thread.id}
                      className={`thread-item ${activeThread?.id === thread.id ? 'active' : ''}`}
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
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteThread(thread.id);
                        }}
                        title="Delete thread"
                      >
                        🗑️
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="sidebar-footer">
        <button 
          className="settings-button"
          onClick={onSettingsClick}
        >
          ⚙️ Settings
        </button>
      </div>
    </div>
  );
};

export default ProjectSidebar;