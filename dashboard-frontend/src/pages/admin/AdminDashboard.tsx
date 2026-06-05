import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import '../../styles/Dashboard.css';

interface AdminStats {
  total_users: number;
  total_models: number;
  total_api_keys: number;
  total_credits: number;
}

const AdminDashboard: React.FC = () => {
  const { getIdToken } = useAuth();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const token = await getIdToken();
        const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/v1/admin/stats`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (!response.ok) throw new Error('Failed to fetch stats');
        const data = await response.json();
        setStats(data);
      } catch (err: any) {
        setError(err.message);
      }
    };
    
    fetchStats();
  }, [getIdToken]);

  return (
    <div className="dashboard-content-inner">
      <div className="content-header">
        <h1 className="content-title">Overview</h1>
        <p className="content-subtitle">Platform statistics and metrics</p>
      </div>

      {error && <div style={{ color: 'red', marginBottom: '1rem' }}>{error}</div>}

      <div className="stats-grid">
        <div className="stat-card" style={{ borderTop: '4px solid #f59e0b' }}>
          <div className="stat-label">Total Users</div>
          <div className="stat-value">{stats?.total_users || 0}</div>
        </div>
        <div className="stat-card" style={{ borderTop: '4px solid #3b82f6' }}>
          <div className="stat-label">Total Credits Given</div>
          <div className="stat-value">${stats?.total_credits ? (stats.total_credits / 100).toFixed(2) : '0.00'}</div>
        </div>
        <div className="stat-card" style={{ borderTop: '4px solid #10b981' }}>
          <div className="stat-label">Active Models</div>
          <div className="stat-value">{stats?.total_models || 0}</div>
        </div>
        <div className="stat-card" style={{ borderTop: '4px solid #8b5cf6' }}>
          <div className="stat-label">API Keys Issued</div>
          <div className="stat-value">{stats?.total_api_keys || 0}</div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
