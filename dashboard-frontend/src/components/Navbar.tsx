import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Logo from './Logo';
import '../styles/SharedLayout.css';

interface NavbarProps {
  /** Show Login/Sign Up tab switcher (only on login page) */
  showAuthTabs?: boolean;
  isSignUp?: boolean;
  onSwitchMode?: (toSignUp: boolean) => void;
}

const Navbar: React.FC<NavbarProps> = ({ showAuthTabs, isSignUp, onSwitchMode }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, logout } = useAuth();
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');

  const isActive = (path: string) => location.pathname === path;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      console.log('Search:', searchQuery);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <nav className="shared-navbar">
      <div className="navbar-inner">
        {/* Logo */}
        <Logo linkTo="/" size="md" />

        {/* Search bar */}
        <form className="navbar-search" onSubmit={handleSearch}>
          <span className="navbar-search-icon">🔍</span>
          <input
            type="text"
            className="navbar-search-input"
            placeholder="Search models, docs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <kbd className="navbar-search-kbd">/</kbd>
        </form>

        {/* Hamburger toggle for mobile */}
        <button className="navbar-hamburger" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle menu">
          <span className={`hamburger-line ${menuOpen ? 'open' : ''}`}></span>
          <span className={`hamburger-line ${menuOpen ? 'open' : ''}`}></span>
          <span className={`hamburger-line ${menuOpen ? 'open' : ''}`}></span>
        </button>

        {/* Center links — always the same */}
        <div className={`navbar-center ${menuOpen ? 'navbar-center-open' : ''}`}>
          <Link to="/models" className="navbar-link" onClick={() => setMenuOpen(false)}>Models</Link>
          <Link to="/chat" className="navbar-link" onClick={() => setMenuOpen(false)}>Chat</Link>
          <Link to="/rankings" className="navbar-link" onClick={() => setMenuOpen(false)}>Ranking</Link>
          <Link to="/apps" className="navbar-link" onClick={() => setMenuOpen(false)}>Apps</Link>
          <a href="#enterprise" className="navbar-link" onClick={() => setMenuOpen(false)}>Enterprise</a>
          <Link to="/pricing" className="navbar-link" onClick={() => setMenuOpen(false)}>Pricing</Link>
          <a href="https://docs.openrouter.ai" target="_blank" rel="noopener noreferrer" className="navbar-link" onClick={() => setMenuOpen(false)}>Docs</a>
        </div>

        {/* Right section */}
        <div className="navbar-right">
          {/* Auth-page tab switcher (Login / Sign Up) */}
          {showAuthTabs && onSwitchMode && (
            <div className="navbar-tabs">
              <button
                className={`navbar-tab ${!isSignUp ? 'navbar-tab-active' : ''}`}
                onClick={() => onSwitchMode(false)}
              >Login</button>
              <button
                className={`navbar-tab ${isSignUp ? 'navbar-tab-active' : ''}`}
                onClick={() => onSwitchMode(true)}
              >Sign Up</button>
            </div>
          )}

          {/* Authenticated: Dashboard + Logout */}
          {isAuthenticated && (
            <>
              <Link
                to="/dashboard"
                className={`navbar-cta navbar-cta-dashboard ${isActive('/dashboard') || isActive('/api-keys') || isActive('/models') || isActive('/billing') ? 'navbar-cta-dashboard-active' : ''}`}
              >
                Dashboard
              </Link>
              <button className="navbar-cta navbar-cta-logout" onClick={handleLogout}>
                Logout
              </button>
            </>
          )}

          {/* Not authenticated & not on auth page: Sign In */}
          {!isAuthenticated && !showAuthTabs && (
            <Link to="/login" className="navbar-cta">Sign In</Link>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
