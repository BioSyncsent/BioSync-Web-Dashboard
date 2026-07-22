import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import './Layout.css';

const Layout = ({ children }) => {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  const menuItems = [
    { path: '/dashboard', label: 'Dashboard', icon: '📊' },
    { path: '/users', label: 'Users', icon: '👥' },
    { path: '/attendance', label: 'Attendance', icon: '📋' },
    { path: '/devices', label: 'Devices', icon: '📱' },
    { path: '/disputes', label: 'Disputes', icon: '⚖️' },
    { path: '/analytics', label: 'Analytics', icon: '📈' },
    { path: '/audit-logs', label: 'Audit Logs', icon: '🔍' },
    { path: '/settings', label: 'Settings', icon: '⚙️' },
  ];

  return (
    <div className={`layout ${collapsed ? 'collapsed' : ''}`}>
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="logo">
            <span className="logo-icon">🔐</span>
            {!collapsed && <span className="logo-text">Bio-Sync</span>}
          </div>
          <button className="toggle-btn" onClick={() => setCollapsed(!collapsed)}>
            {collapsed ? '→' : '←'}
          </button>
        </div>

        <nav className="sidebar-nav">
          {menuItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`nav-link ${location.pathname === item.path ? 'active' : ''}`}
            >
              <span className="nav-icon">{item.icon}</span>
              {!collapsed && <span className="nav-label">{item.label}</span>}
            </Link>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="user-info">
            <div className="user-avatar">AD</div>
            {!collapsed && (
              <div>
                <p className="user-name">Admin User</p>
                <p className="user-role">Administrator</p>
              </div>
            )}
          </div>
          {!collapsed && (
            <Link to="/login" className="logout-btn">Logout</Link>
          )}
        </div>
      </aside>

      <main className="main-content">
        {children}
      </main>
    </div>
  );
};

export default Layout;