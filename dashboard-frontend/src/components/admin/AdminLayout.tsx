import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import Navbar from '../Navbar';
import '../../styles/SharedLayout.css';
import '../../styles/Dashboard.css';

const AdminLayout: React.FC = () => {
  return (
    <div className="shared-layout">
      <Navbar />

      <main className="shared-main dashboard-main">
        <div className="dashboard-container">
          <aside className="dashboard-sidebar">
            <h2 className="sidebar-title" style={{ color: '#f59e0b' }}>Admin Panel</h2>
            <nav className="sidebar-nav">
              <NavLink
                to="/admin"
                end
                className={({ isActive }) =>
                  `sidebar-link ${isActive ? 'sidebar-link-active' : ''}`
                }
              >
                <span className="sidebar-icon">📊</span>
                <span className="sidebar-text">Overview</span>
              </NavLink>
              <NavLink
                to="/admin/users"
                className={({ isActive }) =>
                  `sidebar-link ${isActive ? 'sidebar-link-active' : ''}`
                }
              >
                <span className="sidebar-icon">👥</span>
                <span className="sidebar-text">Manage Users</span>
              </NavLink>
            </nav>
          </aside>

          <section className="dashboard-content">
            <Outlet />
          </section>
        </div>
      </main>
    </div>
  );
};

export default AdminLayout;
