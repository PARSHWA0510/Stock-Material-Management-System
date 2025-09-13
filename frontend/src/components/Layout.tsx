import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Layout: React.FC = () => {
  const location = useLocation();
  const { user, logout } = useAuth();

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  return (
    <div className="layout">
      <nav className="sidebar">
        <div className="sidebar-header">
          <h2>📦 Stock Management</h2>
          <div style={{ fontSize: '12px', color: '#bdc3c7', marginTop: '5px' }}>
            Welcome, {user?.name}
            <br />
            <span style={{ color: user?.role === 'ADMIN' ? '#e74c3c' : '#3498db' }}>
              {user?.role}
            </span>
          </div>
        </div>
        <ul className="sidebar-nav">
          <li>
            <Link 
              to="/" 
              className={isActive('/') ? 'active' : ''}
            >
              📊 Dashboard
            </Link>
          </li>
          <li>
            <Link 
              to="/materials" 
              className={isActive('/materials') ? 'active' : ''}
            >
              🧱 Materials
            </Link>
          </li>
          <li>
            <Link 
              to="/companies" 
              className={isActive('/companies') ? 'active' : ''}
            >
              🏢 Companies
            </Link>
          </li>
          <li>
            <Link 
              to="/sites" 
              className={isActive('/sites') ? 'active' : ''}
            >
              🏗️ Sites
            </Link>
          </li>
          <li>
            <Link 
              to="/godowns" 
              className={isActive('/godowns') ? 'active' : ''}
            >
              🏪 Godowns
            </Link>
          </li>
          <li>
            <Link 
              to="/purchase-bills" 
              className={isActive('/purchase-bills') ? 'active' : ''}
            >
              📋 Purchase Bills
            </Link>
          </li>
          <li>
            <Link 
              to="/material-issues" 
              className={isActive('/material-issues') ? 'active' : ''}
            >
              📤 Material Issues
            </Link>
          </li>
          <li>
            <Link 
              to="/inventory" 
              className={isActive('/inventory') ? 'active' : ''}
            >
              📦 Inventory
            </Link>
          </li>
          <li>
            <Link 
              to="/reports" 
              className={isActive('/reports') ? 'active' : ''}
            >
              📈 Reports
            </Link>
          </li>
          <li style={{ marginTop: '20px', borderTop: '1px solid #34495e', paddingTop: '20px' }}>
            <button 
              onClick={logout}
              style={{
                background: 'none',
                border: 'none',
                color: '#bdc3c7',
                cursor: 'pointer',
                padding: '12px 20px',
                width: '100%',
                textAlign: 'left',
                fontSize: '14px'
              }}
            >
              🚪 Logout
            </button>
          </li>
        </ul>
      </nav>
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;
