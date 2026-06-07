import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import Footer from '../components/Footer';
import type { UserStats, AdminConfig, RecentRequest } from '../services/types';
import '../styles/Dashboard.css';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // Dynamic State
  const [stats, setStats] = useState<UserStats | null>(null);
  const [adminConfig, setAdminConfig] = useState<AdminConfig | null>(null);
  const [recentActivity, setRecentActivity] = useState<RecentRequest[]>([]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // In production, these would be your actual primary-backend endpoints
        const [profileRes, configRes, activityRes] = await Promise.all([
          fetch('http://localhost:3001/auth/profile', { credentials: 'include' }),
          fetch('http://localhost:3001/api/config/global'), // Admin controlled
          fetch('http://localhost:3001/api/usage/recent', { credentials: 'include' })
        ]);

        if (profileRes.ok) setStats(await profileRes.json());
        if (configRes.ok) setAdminConfig(await configRes.json());
        if (activityRes.ok) setRecentActivity(await activityRes.json());
      } catch (error) {
        console.error("Failed to load dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (loading) return <div className="loading-spinner">Loading your dashboard...</div>;

  return (
    <>
      <Navbar />
      <div className="dashboard-with-sidebar">
        {/* Mobile overlay */}
        <div
          className={`sidebar-overlay ${sidebarOpen ? 'visible' : ''}`}
          onClick={() => setSidebarOpen(false)}
        />
        <Sidebar className={sidebarOpen ? 'sidebar-open' : ''} />
        <div className="dashboard-container">
          
          <div className="dashboard-header">
            <h1>Dashboard</h1>
            <p className="subtitle">Welcome to your workspace</p>
          </div>

          {/* Admin Controlled Announcement Banner */}
          {adminConfig?.announcementText && (
            <div className="admin-announcement-banner">
              <span className="icon">📢</span> {adminConfig.announcementText}
            </div>
          )}

          {/* Dynamic Stats Bar */}
          <div className="stats-bar">
            <div className="stat-item">
              <span className="stat-icon">💰</span>
              <div>
                <p className="stat-label">Credits</p>
                <p className="stat-value">${stats?.credits?.toFixed(4) || '0.0000'}</p>
              </div>
            </div>
            <div className="stat-item">
              <span className="stat-icon">🔑</span>
              <div>
                <p className="stat-label">Active API Keys</p>
                <p className="stat-value">{stats?.activeApiKeys || 0}</p>
              </div>
            </div>
            <div className="stat-item">
              <span className="stat-icon">📈</span>
              <div>
                <p className="stat-label">Tokens Today</p>
                <p className="stat-value">{stats?.tokensUsedToday?.toLocaleString() || 0}</p>
              </div>
            </div>
          </div>

          {/* Core Navigation Grid */}
          <div className="dashboard-grid">
            <div className="dashboard-card" onClick={() => navigate('/api-keys')}>
              <div className="card-icon">🔑</div>
              <h3>API Keys</h3>
              <p>Manage your keys for secure API access.</p>
              <span className="card-action">Manage Keys →</span>
            </div>

            <div className="dashboard-card" onClick={() => navigate('/models')}>
              <div className="card-icon">🤖</div>
              <h3>Models</h3>
              <p>Compare pricing and features across providers.</p>
              <span className="card-action">Browse Models →</span>
            </div>

            {/* Conditionally render billing based on Admin config */}
            {adminConfig?.isBillingEnabled && (
              <div className="dashboard-card" onClick={() => navigate('/billing')}>
                <div className="card-icon">💳</div>
                <h3>Billing</h3>
                <p>Manage credits and view transaction history.</p>
                <span className="card-action">View Billing →</span>
              </div>
            )}
          </div>

          {/* Dynamic Recent Activity Section (Crucial for OpenRouter) */}
          <div className="dashboard-section">
            <h2>Recent API Activity</h2>
            {recentActivity.length > 0 ? (
              <div className="activity-table-wrapper">
                <table className="activity-table">
                  <thead>
                    <tr>
                      <th>Time</th>
                      <th>Model</th>
                      <th>Tokens (In/Out)</th>
                      <th>Cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentActivity.map(req => (
                      <tr key={req.id}>
                        <td>{new Date(req.timestamp).toLocaleTimeString()}</td>
                        <td>{req.model}</td>
                        <td>{req.tokens.toLocaleString()}</td>
                        <td>${req.cost.toFixed(6)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="empty-state">No API requests made yet today. Generate an API key to get started!</p>
            )}
          </div>

          {/* Admin Controlled Quick Start */}
          <div className="dashboard-section">
            <h2>Quick Start</h2>
            <div className="quick-start-steps">
              {adminConfig?.quickStartSteps.map((step: any, index: number) => (
                <div className="step" key={index}>
                  <div className="step-number">{index + 1}</div>
                  <div>
                    <h4>{step.title}</h4>
                    <p>{step.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* Mobile sidebar toggle */}
      <button
        className="sidebar-toggle-btn"
        onClick={() => setSidebarOpen(prev => !prev)}
        aria-label="Toggle sidebar"
      >
        {sidebarOpen ? '✕' : '☰'}
      </button>

      <Footer />
    </>
  );
};

export default Dashboard;