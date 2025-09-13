import React, { useState, useEffect } from 'react';
import { materialService } from '../services/materialService';
import { companyService } from '../services/companyService';
import { siteService } from '../services/siteService';
import { godownService } from '../services/godownService';
import { useAuth } from '../contexts/AuthContext';

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState({
    materials: 0,
    companies: 0,
    sites: 0,
    godowns: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const { user } = useAuth();

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const [materials, companies, sites, godowns] = await Promise.all([
        materialService.getAll(),
        companyService.getAll(),
        siteService.getAll(),
        godownService.getAll()
      ]);

      setStats({
        materials: materials.length,
        companies: companies.length,
        sites: sites.length,
        godowns: godowns.length
      });
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to fetch dashboard data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="header">
        <h1>Dashboard</h1>
        <div>Loading...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="header">
        <h1>Dashboard</h1>
        <div style={{ fontSize: '14px', color: '#666' }}>
          Welcome back, {user?.name}! ({user?.role})
        </div>
      </div>

      {error && (
        <div style={{ 
          color: '#e74c3c', 
          backgroundColor: '#fdf2f2', 
          padding: '10px', 
          borderRadius: '4px', 
          marginBottom: '20px' 
        }}>
          {error}
        </div>
      )}
      
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{stats.materials}</div>
          <div className="stat-label">Total Materials</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.companies}</div>
          <div className="stat-label">Companies</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.sites}</div>
          <div className="stat-label">Active Sites</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.godowns}</div>
          <div className="stat-label">Godowns</div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Quick Actions</h3>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
          <button className="btn btn-primary" style={{ padding: '15px', textAlign: 'left' }}>
            📋 Create Purchase Bill
          </button>
          <button className="btn btn-success" style={{ padding: '15px', textAlign: 'left' }}>
            📤 Issue Material
          </button>
          <button className="btn btn-secondary" style={{ padding: '15px', textAlign: 'left' }}>
            📦 View Inventory
          </button>
          <button className="btn btn-secondary" style={{ padding: '15px', textAlign: 'left' }}>
            📈 Generate Reports
          </button>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="card-title">System Information</h3>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
          <div>
            <h4 style={{ color: '#2c3e50', marginBottom: '10px' }}>Features Available</h4>
            <ul style={{ listStyle: 'none', padding: 0 }}>
              <li>✅ Material Management</li>
              <li>✅ Purchase Bill Processing</li>
              <li>✅ Material Issue Tracking</li>
              <li>✅ Inventory Management</li>
              <li>✅ Direct-to-Site Delivery</li>
              <li>✅ Role-based Access Control</li>
            </ul>
          </div>
          <div>
            <h4 style={{ color: '#2c3e50', marginBottom: '10px' }}>Your Permissions</h4>
            <ul style={{ listStyle: 'none', padding: 0 }}>
              {user?.role === 'ADMIN' ? (
                <>
                  <li>✅ Full System Access</li>
                  <li>✅ Manage Master Data</li>
                  <li>✅ Create/Edit/Delete Records</li>
                  <li>✅ View All Reports</li>
                </>
              ) : (
                <>
                  <li>✅ View All Data</li>
                  <li>✅ Create Purchase Bills</li>
                  <li>✅ Create Material Issues</li>
                  <li>✅ View Reports</li>
                  <li>❌ Cannot Modify Master Data</li>
                </>
              )}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
