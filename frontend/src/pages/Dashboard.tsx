import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { materialService } from '../services/materialService';
import { companyService } from '../services/companyService';
import { siteService } from '../services/siteService';
import { godownService } from '../services/godownService';
import { purchaseBillService } from '../services/purchaseBillService';
import { materialIssueService } from '../services/materialIssueService';
import { inventoryService } from '../services/inventoryService';
import { useAuth } from '../contexts/AuthContext';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    materials: 0,
    companies: 0,
    sites: 0,
    godowns: 0,
    purchaseBills: 0,
    materialIssues: 0,
    totalStockValue: 0,
    recentActivity: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [recentBills, setRecentBills] = useState<any[]>([]);
  const [recentIssues, setRecentIssues] = useState<any[]>([]);

  const { user } = useAuth();

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const [materials, companies, sites, godowns, purchaseBills, materialIssues, inventory] = await Promise.all([
        materialService.getAll(),
        companyService.getAll(),
        siteService.getAll(),
        godownService.getAll(),
        purchaseBillService.getAll(),
        materialIssueService.getAll(),
        inventoryService.getInventory()
      ]);

      // Calculate total stock value
      const totalStockValue = inventory.reduce((sum, item) => sum + item.totalValue, 0);

      // Get recent bills and issues (last 5)
      const recentBillsData = purchaseBills.slice(0, 5);
      const recentIssuesData = materialIssues.slice(0, 5);

      setStats({
        materials: materials.length,
        companies: companies.length,
        sites: sites.length,
        godowns: godowns.length,
        purchaseBills: purchaseBills.length,
        materialIssues: materialIssues.length,
        totalStockValue,
        recentActivity: recentBillsData.length + recentIssuesData.length
      });

      setRecentBills(recentBillsData);
      setRecentIssues(recentIssuesData);
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to fetch dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickAction = (action: string) => {
    switch (action) {
      case 'purchase-bill':
        navigate('/purchase-bills');
        break;
      case 'material-issue':
        navigate('/material-issues');
        break;
      case 'inventory':
        navigate('/inventory');
        break;
      case 'reports':
        navigate('/reports');
        break;
      default:
        break;
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

      {/* Welcome Message */}
      <div className="card" style={{ 
        marginBottom: '30px', 
        backgroundColor: '#2c3e50', 
        color: 'white',
        border: 'none',
        boxShadow: '0 4px 15px rgba(44, 62, 80, 0.2)'
      }}>
        <div style={{ padding: '25px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h2 style={{ margin: '0 0 10px 0', fontSize: '28px', fontWeight: '600' }}>
              Welcome back, {user?.name}! 👋
            </h2>
            <p style={{ margin: '0', opacity: '0.9', fontSize: '16px' }}>
              You have <strong>{user?.role}</strong> access to the Stock Management System
            </p>
          </div>
          <button 
            className="btn btn-secondary"
            onClick={fetchStats}
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              color: 'white',
              padding: '8px 16px',
              borderRadius: '6px',
              fontSize: '14px',
              cursor: 'pointer',
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
            }}
          >
            Refresh
          </button>
        </div>
      </div>
      
      {/* Main Stats Grid */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value" style={{ color: '#3498db' }}>{stats.materials}</div>
          <div className="stat-label">Total Materials</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: '#e67e22' }}>{stats.companies}</div>
          <div className="stat-label">Companies</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: '#27ae60' }}>{stats.sites}</div>
          <div className="stat-label">Active Sites</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: '#f39c12' }}>{stats.godowns}</div>
          <div className="stat-label">Godowns</div>
        </div>
      </div>

      {/* Secondary Stats Grid */}
      <div className="stats-grid" style={{ marginBottom: '30px' }}>
        <div className="stat-card">
          <div className="stat-value" style={{ color: '#9b59b6' }}>{stats.purchaseBills}</div>
          <div className="stat-label">Purchase Bills</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: '#1abc9c' }}>{stats.materialIssues}</div>
          <div className="stat-label">Material Issues</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: '#27ae60' }}>₹{stats.totalStockValue.toLocaleString()}</div>
          <div className="stat-label">Total Stock Value</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: '#e74c3c' }}>{stats.recentActivity}</div>
          <div className="stat-label">Recent Activities</div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '30px' }}>
        <div className="card-header">
          <h3 className="card-title">Quick Actions</h3>
        </div>
        <div style={{ padding: '25px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
            <button 
              className="btn btn-primary" 
              style={{ 
                padding: '18px', 
                textAlign: 'left', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '12px',
                fontSize: '16px',
                borderRadius: '10px',
                boxShadow: '0 2px 8px rgba(0, 123, 255, 0.2)',
                transition: 'all 0.3s ease'
              }}
              onClick={() => handleQuickAction('purchase-bill')}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 123, 255, 0.3)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 123, 255, 0.2)';
              }}
            >
              <span style={{ fontSize: '22px' }}>📋</span>
              <div>
                <div style={{ fontWeight: 'bold' }}>Create Purchase Bill</div>
                <div style={{ fontSize: '14px', opacity: '0.8' }}>Record new material purchases</div>
              </div>
            </button>
            <button 
              className="btn btn-success" 
              style={{ 
                padding: '18px', 
                textAlign: 'left', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '12px',
                fontSize: '16px',
                borderRadius: '10px',
                boxShadow: '0 2px 8px rgba(40, 167, 69, 0.2)',
                transition: 'all 0.3s ease'
              }}
              onClick={() => handleQuickAction('material-issue')}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(40, 167, 69, 0.3)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(40, 167, 69, 0.2)';
              }}
            >
              <span style={{ fontSize: '22px' }}>📤</span>
              <div>
                <div style={{ fontWeight: 'bold' }}>Issue Material</div>
                <div style={{ fontSize: '14px', opacity: '0.8' }}>Send materials to sites</div>
              </div>
            </button>
            <button 
              className="btn" 
              style={{ 
                padding: '18px', 
                textAlign: 'left', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '12px',
                fontSize: '16px',
                borderRadius: '10px',
                backgroundColor: '#e67e22',
                color: 'white',
                border: 'none',
                boxShadow: '0 2px 8px rgba(230, 126, 34, 0.2)',
                transition: 'all 0.3s ease'
              }}
              onClick={() => handleQuickAction('inventory')}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(230, 126, 34, 0.3)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(230, 126, 34, 0.2)';
              }}
            >
              <span style={{ fontSize: '22px' }}>📦</span>
              <div>
                <div style={{ fontWeight: 'bold' }}>View Inventory</div>
                <div style={{ fontSize: '14px', opacity: '0.8' }}>Check stock levels</div>
              </div>
            </button>
            <button 
              className="btn" 
              style={{ 
                padding: '18px', 
                textAlign: 'left', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '12px',
                fontSize: '16px',
                borderRadius: '10px',
                backgroundColor: '#9b59b6',
                color: 'white',
                border: 'none',
                boxShadow: '0 2px 8px rgba(155, 89, 182, 0.2)',
                transition: 'all 0.3s ease'
              }}
              onClick={() => handleQuickAction('reports')}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(155, 89, 182, 0.3)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(155, 89, 182, 0.2)';
              }}
            >
              <span style={{ fontSize: '22px' }}>📈</span>
              <div>
                <div style={{ fontWeight: 'bold' }}>Generate Reports</div>
                <div style={{ fontSize: '14px', opacity: '0.8' }}>View site-wise reports</div>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="card" style={{ marginBottom: '30px' }}>
        <div className="card-header">
          <h3 className="card-title">Recent Activity</h3>
        </div>
        <div style={{ padding: '20px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '20px' }}>
            {/* Recent Purchase Bills */}
            <div>
              <h4 style={{ marginBottom: '15px', fontSize: '16px' }}>Recent Purchase Bills</h4>
              {recentBills.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {recentBills.map((bill) => (
                    <div key={bill.id} style={{
                      padding: '12px',
                      border: '1px solid #e0e0e0',
                      borderRadius: '8px',
                      backgroundColor: '#f8f9fa',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <div>
                        <div style={{ fontWeight: 'bold', fontSize: '14px' }}>{bill.invoiceNumber}</div>
                        <div style={{ fontSize: '12px', color: '#7f8c8d' }}>
                          {bill.company.name} • {new Date(bill.billDate).toLocaleDateString()}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: 'bold', color: '#27ae60' }}>
                          ₹{bill.items.reduce((sum: number, item: any) => sum + Number(item.totalInclGst), 0).toLocaleString()}
                        </div>
                        <div style={{ fontSize: '12px', color: '#7f8c8d' }}>
                          {bill.items.length} items
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ color: '#7f8c8d', fontStyle: 'italic' }}>No recent purchase bills</div>
              )}
            </div>

            {/* Recent Material Issues */}
            <div>
              <h4 style={{ marginBottom: '15px', fontSize: '16px' }}>Recent Material Issues</h4>
              {recentIssues.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {recentIssues.map((issue) => (
                    <div key={issue.id} style={{
                      padding: '12px',
                      border: '1px solid #e0e0e0',
                      borderRadius: '8px',
                      backgroundColor: '#f8f9fa',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <div>
                        <div style={{ fontWeight: 'bold', fontSize: '14px' }}>{issue.identifier}</div>
                        <div style={{ fontSize: '12px', color: '#7f8c8d' }}>
                          {issue.site.name} • {new Date(issue.issueDate).toLocaleDateString()}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: 'bold', color: '#3498db' }}>
                          ₹{issue.items.reduce((sum: number, item: any) => sum + Number(item.totalInclGst), 0).toLocaleString()}
                        </div>
                        <div style={{ fontSize: '12px', color: '#7f8c8d' }}>
                          {issue.items.length} items
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ color: '#7f8c8d', fontStyle: 'italic' }}>No recent material issues</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* System Information */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">System Information</h3>
        </div>
        <div style={{ padding: '20px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '30px' }}>
            <div>
              <h4 style={{ marginBottom: '15px', fontSize: '18px' }}>Features Available</h4>
              <div style={{ display: 'grid', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ color: '#27ae60', fontSize: '16px' }}>✅</span>
                  <span>Material Management</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ color: '#27ae60', fontSize: '16px' }}>✅</span>
                  <span>Purchase Bill Processing</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ color: '#27ae60', fontSize: '16px' }}>✅</span>
                  <span>Material Issue Tracking</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ color: '#27ae60', fontSize: '16px' }}>✅</span>
                  <span>Inventory Management</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ color: '#27ae60', fontSize: '16px' }}>✅</span>
                  <span>Direct-to-Site Delivery</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ color: '#27ae60', fontSize: '16px' }}>✅</span>
                  <span>Role-based Access Control</span>
                </div>
              </div>
            </div>
            <div>
              <h4 style={{ marginBottom: '15px', fontSize: '18px' }}>Your Permissions</h4>
              <div style={{ display: 'grid', gap: '8px' }}>
                {user?.role === 'ADMIN' ? (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ color: '#27ae60', fontSize: '16px' }}>✅</span>
                      <span>Full System Access</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ color: '#27ae60', fontSize: '16px' }}>✅</span>
                      <span>Manage Master Data</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ color: '#27ae60', fontSize: '16px' }}>✅</span>
                      <span>Create/Edit/Delete Records</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ color: '#27ae60', fontSize: '16px' }}>✅</span>
                      <span>View All Reports</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ color: '#27ae60', fontSize: '16px' }}>✅</span>
                      <span>View All Data</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ color: '#27ae60', fontSize: '16px' }}>✅</span>
                      <span>Create Purchase Bills</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ color: '#27ae60', fontSize: '16px' }}>✅</span>
                      <span>Create Material Issues</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ color: '#27ae60', fontSize: '16px' }}>✅</span>
                      <span>View Reports</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ color: '#e74c3c', fontSize: '16px' }}>❌</span>
                      <span>Cannot Modify Master Data</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
