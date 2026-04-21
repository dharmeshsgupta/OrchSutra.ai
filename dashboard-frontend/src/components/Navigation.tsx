import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../styles/Navigation.css';

const Navigation: React.FC = () => {
  const location = useLocation();
  const { isAuthenticated, logout } = useAuth();

  const isActive = (path: string) => location.pathname === path;

  if (!isAuthenticated) {
    return null;
  }

  return (
    <nav className="navbar">
      <div className="nav-container">
        <Link to="/" className="nav-logo">
          <span className="logo-icon">🚀</span>
          OpenRouter
        </Link>

        <div className="nav-menu">
          <Link 
            to="/dashboard" 
            className={`nav-link ${isActive('/dashboard') ? 'active' : ''}`}
          >
            Dashboard
          </Link>
          <Link 
            to="/api-keys" 
            className={`nav-link ${isActive('/api-keys') ? 'active' : ''}`}
          >
            API Keys
          </Link>
          <Link 
            to="/models" 
            className={`nav-link ${isActive('/models') ? 'active' : ''}`}
          >
            Models
          </Link>
          <Link 
            to="/billing" 
            className={`nav-link ${isActive('/billing') ? 'active' : ''}`}
          >
            Billing
          </Link>
        </div>

        <button className="nav-logout" onClick={logout}>
          Logout
        </button>
      </div>
    </nav>
  );
};

export default Navigation;
