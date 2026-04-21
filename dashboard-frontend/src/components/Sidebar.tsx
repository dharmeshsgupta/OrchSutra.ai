import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../styles/Sidebar.css';

interface SidebarProps {
  className?: string;
}

const Sidebar: React.FC<SidebarProps> = ({ className = '' }) => {
  const { user } = useAuth();

  const initial = user?.displayName?.charAt(0)?.toUpperCase()
    || user?.email?.charAt(0)?.toUpperCase()
    || '?';

  return (
    <aside className={`sidebar ${className}`}>
      {/* User card */}
      <div className="sidebar-user-card">
        {user?.photoURL ? (
          <img src={user.photoURL} alt="avatar" className="sidebar-avatar" />
        ) : (
          <div className="sidebar-avatar-placeholder">{initial}</div>
        )}
        <div className="sidebar-user-info">
          <p className="sidebar-user-name">{user?.displayName || 'User'}</p>
          <p className="sidebar-user-email">{user?.email || user?.phoneNumber || ''}</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        <p className="sidebar-section-title">Overview</p>

        <NavLink to="/dashboard" end className={({ isActive }) => `sidebar-link ${isActive ? 'sidebar-link-active' : ''}`}>
          <span className="sidebar-link-icon">📊</span>
          Dashboard
        </NavLink>

        <NavLink to="/api-keys" className={({ isActive }) => `sidebar-link ${isActive ? 'sidebar-link-active' : ''}`}>
          <span className="sidebar-link-icon">🔑</span>
          API Keys
        </NavLink>

        <NavLink to="/models" className={({ isActive }) => `sidebar-link ${isActive ? 'sidebar-link-active' : ''}`}>
          <span className="sidebar-link-icon">🤖</span>
          Models
        </NavLink>

        <NavLink to="/billing" className={({ isActive }) => `sidebar-link ${isActive ? 'sidebar-link-active' : ''}`}>
          <span className="sidebar-link-icon">💳</span>
          Billing
        </NavLink>

        <NavLink to="/build" className={({ isActive }) => `sidebar-link ${isActive ? 'sidebar-link-active' : ''}`}>
          <span className="sidebar-link-icon">⚡</span>
          Agent Builder
        </NavLink>

        <p className="sidebar-section-title">Account</p>

        <NavLink to="/edit-profile" className={({ isActive }) => `sidebar-link ${isActive ? 'sidebar-link-active' : ''}`}>
          <span className="sidebar-link-icon">✏️</span>
          Edit Profile
        </NavLink>

        <NavLink to="/change-password" className={({ isActive }) => `sidebar-link ${isActive ? 'sidebar-link-active' : ''}`}>
          <span className="sidebar-link-icon">🔒</span>
          Change Password
        </NavLink>
      </nav>
    </aside>
  );
};

export default Sidebar;
