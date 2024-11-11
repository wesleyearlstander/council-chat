import React, { useState, useEffect } from 'react';
import { ChatSkinType } from '../types/ChatSkin';

const Settings: React.FC = () => {
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [saveStatus, setSaveStatus] = useState('');
  const [selectedSkin, setSelectedSkin] = useState<ChatSkinType>(() => {
    const saved = localStorage.getItem('chat_skin');
    return (saved as ChatSkinType) || 'default';
  });
  const [clipdropApiKey, setClipdropApiKey] = useState(() => {
    return localStorage.getItem('clipdrop_api_key') || '';
  });

  useEffect(() => {
    const savedKey = localStorage.getItem('openai_api_key');
    if (savedKey) {
      setApiKey(savedKey);
    }
  }, []);

  const handleSaveKey = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('openai_api_key', apiKey);
    localStorage.setItem('clipdrop_api_key', clipdropApiKey);
    setSaveStatus('Settings saved successfully!');
    setTimeout(() => setSaveStatus(''), 3000);
  };

  const handleSkinChange = (skin: ChatSkinType) => {
    setSelectedSkin(skin);
    localStorage.setItem('chat_skin', skin);
    
    // Clear existing background and character images when switching skins
    if (skin === 'default') {
      localStorage.removeItem('comic_background');
      localStorage.removeItem('comic_characters');
    }
    
    setSaveStatus('Chat skin updated successfully!');
    setTimeout(() => setSaveStatus(''), 3000);
  };

  return (
    <div className="settings-content">
      <h2>Settings</h2>
      <form onSubmit={handleSaveKey} className="settings-form">
        <div className="form-group">
          <label htmlFor="apiKey">OpenAI API Key</label>
          <div className="api-key-input-container">
            <input
              type={showKey ? 'text' : 'password'}
              id="apiKey"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Enter your OpenAI API key"
              className="settings-input"
            />
            <button
              type="button"
              onClick={() => setShowKey(!showKey)}
              className="toggle-visibility-button"
            >
              {showKey ? 'Hide' : 'Show'}
            </button>
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="clipdropApiKey">ClipDrop API Key</label>
          <div className="api-key-input-container">
            <input
              type={showKey ? 'text' : 'password'}
              id="clipdropApiKey"
              value={clipdropApiKey}
              onChange={(e) => setClipdropApiKey(e.target.value)}
              placeholder="Enter your ClipDrop API key"
              className="settings-input"
            />
          </div>
        </div>

        <div className="form-group">
          <label>Chat Skin</label>
          <div className="skin-options">
            <div
              className={`skin-option ${selectedSkin === 'default' ? 'active' : ''}`}
              onClick={() => handleSkinChange('default')}
            >
              <div className="skin-preview default-skin">
                <span>Aa</span>
              </div>
              <span>Default</span>
            </div>
            <div
              className={`skin-option ${selectedSkin === 'comic' ? 'active' : ''}`}
              onClick={() => handleSkinChange('comic')}
            >
              <div className="skin-preview comic-skin">
                <span>💭</span>
              </div>
              <span>Comic Book</span>
            </div>
          </div>
        </div>

        <button type="submit" className="save-button">
          Save Settings
        </button>
        {saveStatus && <div className="save-status">{saveStatus}</div>}
      </form>
    </div>
  );
};

export default Settings; 