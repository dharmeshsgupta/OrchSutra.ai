import React, { useState, useEffect } from 'react';
import { ApiKeysService } from '../services/apiKeysService';
import type { ApiKey } from '../services/apiKeysService';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import '../styles/ApiKeys.css';

const ApiKeysPage: React.FC = () => {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [newKeyName, setNewKeyName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createdKey, setCreatedKey] = useState<{ id: string; apiKey: string } | null>(null);

  useEffect(() => {
    loadApiKeys();
  }, []);

  const loadApiKeys = async () => {
    try {
      setLoading(true);
      const keys = await ApiKeysService.getAll();
      setApiKeys(keys);
      setError('');
    } catch (err) {
      setError('Failed to load API keys');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyName.trim()) {
      setError('Please enter a name for the API key');
      return;
    }

    try {
      setLoading(true);
      const newKey = await ApiKeysService.create(newKeyName);
      setCreatedKey(newKey);
      setNewKeyName('');
      setShowCreateForm(false);
      await loadApiKeys();
      setError('');
    } catch (err) {
      setError('Failed to create API key');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleDisable = async (id: string, currentDisabled: boolean) => {
    try {
      await ApiKeysService.update(id, !currentDisabled);
      await loadApiKeys();
      setError('');
    } catch (err) {
      setError('Failed to update API key');
      console.error(err);
    }
  };

  const handleDeleteKey = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this API key?')) {
      try {
        await ApiKeysService.delete(id);
        await loadApiKeys();
        setError('');
      } catch (err) {
        setError('Failed to delete API key');
        console.error(err);
      }
    }
  };

  return (
    <div className="api-keys-page">
      <Navbar />
      <div className="api-keys-container">
      <div className="api-keys-header">
        <h1>API Keys</h1>
        <button 
          className="btn btn-primary"
          onClick={() => setShowCreateForm(!showCreateForm)}
        >
          {showCreateForm ? 'Cancel' : 'Create New Key'}
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {createdKey && (
        <div className="alert alert-success">
          <h3>API Key Created!</h3>
          <p>Key ID: <code>{createdKey.id}</code></p>
          <p>API Key: <code>{createdKey.apiKey}</code></p>
          <p className="alert-warning" style={{ marginTop: '0.5rem' }}>
            ⚠️ Keep this key safe! You won't be able to see it again.
          </p>
          <button 
            className="btn btn-secondary"
            onClick={() => setCreatedKey(null)}
          >
            Dismiss
          </button>
        </div>
      )}

      {showCreateForm && (
        <form className="create-key-form" onSubmit={handleCreateKey}>
          <div className="form-group">
            <label htmlFor="keyName">Key Name</label>
            <input
              id="keyName"
              type="text"
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              placeholder="e.g., My Application"
              disabled={loading}
            />
          </div>
          <button 
            type="submit" 
            className="btn btn-primary"
            disabled={loading}
          >
            {loading ? 'Creating...' : 'Create Key'}
          </button>
        </form>
      )}

      <div className="api-keys-list">
        <h2>Your API Keys</h2>
        {loading && !apiKeys.length ? (
          <p>Loading API keys...</p>
        ) : apiKeys.length === 0 ? (
          <p className="empty-state">No API keys yet. Create one to get started.</p>
        ) : (
          <table className="keys-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Key ID</th>
                <th>Credits Used</th>
                <th>Last Used</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {apiKeys.map((key) => (
                <tr key={key.id}>
                  <td>{key.name}</td>
                  <td><code>{key.id}</code></td>
                  <td>{key.credisConsumed}</td>
                  <td>
                    {key.lastUsed 
                      ? new Date(key.lastUsed).toLocaleDateString() 
                      : 'Never'}
                  </td>
                  <td>
                    <span className={`status ${key.disabled ? 'disabled' : 'active'}`}>
                      {key.disabled ? 'Disabled' : 'Active'}
                    </span>
                  </td>
                  <td className="actions">
                    <button
                      className="btn btn-sm btn-secondary"
                      onClick={() => handleToggleDisable(key.id, key.disabled)}
                      disabled={loading}
                    >
                      {key.disabled ? 'Enable' : 'Disable'}
                    </button>
                    <button
                      className="btn btn-sm btn-danger"
                      onClick={() => handleDeleteKey(key.id)}
                      disabled={loading}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      </div>
      <Footer />
    </div>
  );
};

export default ApiKeysPage;
