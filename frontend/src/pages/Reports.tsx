import React, { useState, useEffect } from 'react';
import { reportsService } from '../services/reportsService';
import type { 
  SiteMaterialReportsResponse, 
  SiteMaterialReport, 
  SiteMaterialHistory,
  ApiError 
} from '../types/index';

const Reports: React.FC = () => {
  const [reports, setReports] = useState<SiteMaterialReportsResponse | null>(null);
  const [selectedSite, setSelectedSite] = useState<SiteMaterialReport | null>(null);
  const [selectedMaterial, setSelectedMaterial] = useState<SiteMaterialHistory | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showMaterialHistory, setShowMaterialHistory] = useState(false);

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await reportsService.getSiteMaterialReports();
      setReports(data as SiteMaterialReportsResponse);
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError.response?.data?.message || 'Failed to fetch reports');
    } finally {
      setLoading(false);
    }
  };

  const handleSiteSelect = (site: SiteMaterialReport) => {
    setSelectedSite(site);
    setSelectedMaterial(null);
    setShowMaterialHistory(false);
  };

  const handleMaterialSelect = async (siteId: string, materialId: string) => {
    try {
      setLoading(true);
      const history = await reportsService.getSiteMaterialHistory(siteId, materialId);
      setSelectedMaterial(history);
      setShowMaterialHistory(true);
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError.response?.data?.message || 'Failed to fetch material history');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading && !reports) {
    return (
      <div className="header">
        <h1>Site Material Reports</h1>
        <div>Loading reports...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <div className="header">
          <h1>Site Material Reports</h1>
        </div>
        <div style={{ 
          color: '#e74c3c', 
          backgroundColor: '#fdf2f2', 
          padding: '10px', 
          borderRadius: '4px', 
          marginBottom: '20px' 
        }}>
          {error}
          <button
            onClick={fetchReports}
            style={{
              marginLeft: '10px',
              padding: '5px 10px',
              backgroundColor: '#e74c3c',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="header">
        <h1>Site Material Reports</h1>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button 
            className="btn btn-secondary"
            onClick={fetchReports}
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      {reports && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '30px' }}>
          <div className="card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#2c3e50' }}>
              {reports.summary.totalSites}
            </div>
            <div style={{ color: '#7f8c8d' }}>Total Sites</div>
          </div>
          <div className="card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#27ae60' }}>
              {reports.summary.totalMaterials}
            </div>
            <div style={{ color: '#7f8c8d' }}>Total Materials</div>
          </div>
          <div className="card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#3498db' }}>
              {formatCurrency(reports.summary.overallTotal)}
            </div>
            <div style={{ color: '#7f8c8d' }}>Total Value</div>
          </div>
        </div>
      )}

      {/* Sites Overview */}
      <div className="card" style={{ marginBottom: '30px' }}>
        <div className="card-header">
          <h3 className="card-title">Sites Overview</h3>
        </div>
        <div style={{ padding: '20px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '15px' }}>
            {reports?.siteReports.map((siteReport) => (
              <div 
                key={siteReport.site.id}
                style={{ 
                  border: '1px solid #ddd', 
                  borderRadius: '8px', 
                  padding: '15px',
                  backgroundColor: selectedSite?.site.id === siteReport.site.id ? '#e3f2fd' : '#f8f9fa',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onClick={() => handleSiteSelect(siteReport)}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#e3f2fd'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = selectedSite?.site.id === siteReport.site.id ? '#e3f2fd' : '#f8f9fa'}
              >
                <div style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '10px', color: '#2c3e50' }}>
                  {siteReport.site.name}
                </div>
                {siteReport.site.address && (
                  <div style={{ fontSize: '14px', color: '#7f8c8d', marginBottom: '10px' }}>
                    {siteReport.site.address}
                  </div>
                )}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '14px' }}>
                  <div>
                    <div style={{ color: '#7f8c8d' }}>Materials</div>
                    <div style={{ fontWeight: 'bold' }}>{siteReport.totalMaterials}</div>
                  </div>
                  <div>
                    <div style={{ color: '#7f8c8d' }}>Total Value</div>
                    <div style={{ fontWeight: 'bold', color: '#27ae60' }}>{formatCurrency(siteReport.grandTotal)}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Site Materials Details */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">
            {selectedSite ? `${selectedSite.site.name} - Materials` : 'Select a Site to View Materials'}
          </h3>
        </div>
        {selectedSite ? (
          selectedSite.materials.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#7f8c8d' }}>
              No materials sent to this site
            </div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Material</th>
                  <th>Quantity</th>
                  <th>Unit</th>
                  <th>Total Value</th>
                  <th>Rate per Unit</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {selectedSite.materials.map((material) => (
                  <tr key={material.materialId}>
                    <td>
                      <div style={{ fontWeight: 'bold' }}>{material.materialName}</div>
                    </td>
                    <td>{material.totalQuantity.toLocaleString()}</td>
                    <td>{material.unit}</td>
                    <td style={{ fontWeight: 'bold', color: '#27ae60' }}>
                      {formatCurrency(material.totalValue)}
                    </td>
                    <td>
                      {formatCurrency(material.totalValue / material.totalQuantity)} per {material.unit}
                    </td>
                    <td>
                      <button 
                        className="btn btn-sm btn-primary"
                        onClick={() => handleMaterialSelect(selectedSite.site.id, material.materialId)}
                      >
                        View History
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        ) : (
          <div style={{ padding: '40px', textAlign: 'center', color: '#7f8c8d' }}>
            Click on a site above to view its materials
          </div>
        )}
      </div>

      {/* Material History Modal */}
      {showMaterialHistory && selectedMaterial && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            maxWidth: '800px',
            width: '100%',
            maxHeight: '80vh',
            overflow: 'hidden',
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)'
          }}>
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 className="card-title">
                {selectedMaterial.material.name} - {selectedMaterial.site.name}
              </h3>
              <button
                onClick={() => setShowMaterialHistory(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '20px',
                  cursor: 'pointer',
                  color: '#7f8c8d'
                }}
              >
                ✕
              </button>
            </div>
            <div style={{ padding: '20px', maxHeight: '60vh', overflowY: 'auto' }}>
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: '1fr 1fr', 
                gap: '20px', 
                marginBottom: '20px',
                padding: '15px',
                backgroundColor: '#f8f9fa',
                borderRadius: '8px'
              }}>
                <div>
                  <div style={{ color: '#7f8c8d', fontSize: '14px' }}>Total Quantity</div>
                  <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#2c3e50' }}>
                    {selectedMaterial.totals.totalQuantity} {selectedMaterial.material.unit}
                  </div>
                </div>
                <div>
                  <div style={{ color: '#7f8c8d', fontSize: '14px' }}>Total Value</div>
                  <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#27ae60' }}>
                    {formatCurrency(selectedMaterial.totals.totalValue)}
                  </div>
                </div>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {selectedMaterial.history.map((item, index) => (
                  <div key={index} style={{
                    border: '1px solid #ddd',
                    borderRadius: '8px',
                    padding: '15px',
                    backgroundColor: '#f8f9fa'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                          <span style={{
                            padding: '4px 8px',
                            fontSize: '12px',
                            borderRadius: '12px',
                            marginRight: '8px',
                            backgroundColor: item.type === 'ISSUE' ? '#e3f2fd' : '#e8f5e8',
                            color: item.type === 'ISSUE' ? '#1976d2' : '#2e7d32'
                          }}>
                            {item.type === 'ISSUE' ? 'ISSUE' : 'DIRECT PURCHASE'}
                          </span>
                          <span style={{ fontSize: '14px', color: '#7f8c8d' }}>{formatDate(item.date)}</span>
                        </div>
                        <div>
                          <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>{item.reference}</div>
                          <div style={{ fontSize: '14px', color: '#7f8c8d' }}>
                            From: {item.fromGodown}
                            {item.company && ` • ${item.company}`}
                          </div>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: 'bold', fontSize: '16px' }}>
                          {item.quantity} {selectedMaterial.material.unit}
                        </div>
                        <div style={{ fontSize: '14px', color: '#7f8c8d' }}>
                          @ {formatCurrency(item.rate)} = {formatCurrency(item.totalValue)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Reports;