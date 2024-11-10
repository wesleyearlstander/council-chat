import React, { useState, useEffect } from 'react';

const Settings: React.FC = () => {
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [saveStatus, setSaveStatus] = useState('');

  useEffect(() => {
    const savedKey = localStorage.getItem('openai_api_key');
    if (savedKey) {
      setApiKey(savedKey);
    }
  }, []);

  const handleSaveKey = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('openai_api_key', apiKey);
    setSaveStatus('API key saved successfully!');
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
        <button type="submit" className="save-button">
          Save API Key
        </button>
        {saveStatus && <div className="save-status">{saveStatus}</div>}
      </form>
    </div>
  );
};

export default Settings; 