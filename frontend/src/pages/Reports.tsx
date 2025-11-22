import React, { useState, useEffect } from 'react';
import { reportsService } from '../services/reportsService';
import PDFOptionsModal from '../components/PDFOptionsModal';
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
  const [materialWiseReports, setMaterialWiseReports] = useState<any>(null);
  const [selectedMaterialReport, setSelectedMaterialReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMaterialWise, setLoadingMaterialWise] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showMaterialHistory, setShowMaterialHistory] = useState(false);
  const [activeTab, setActiveTab] = useState<'site' | 'material'>('site');
  const [showPDFModal, setShowPDFModal] = useState(false);

  useEffect(() => {
    fetchReports();
    fetchMaterialWiseReports();
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

  const fetchMaterialWiseReports = async (materialId?: string) => {
    try {
      setLoadingMaterialWise(true);
      setError(null);
      const data = await reportsService.getMaterialWiseReports(materialId);
      if (materialId) {
        setSelectedMaterialReport(data);
      } else {
        setMaterialWiseReports(data);
      }
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError.response?.data?.message || 'Failed to fetch material-wise reports');
    } finally {
      setLoadingMaterialWise(false);
    }
  };

  const handleMaterialWiseSelect = async (materialId: string) => {
    await fetchMaterialWiseReports(materialId);
  };

  const handleDownloadPDF = () => {
    setShowPDFModal(true);
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
          <h1>Reports</h1>
          <div>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <button 
            className="btn btn-primary"
            onClick={handleDownloadPDF}
            disabled={
              (activeTab === 'site' && !reports) ||
              (activeTab === 'material' && !materialWiseReports && !selectedMaterialReport)
            }
          >
            Download PDF
          </button>
          <button 
            className="btn btn-secondary"
            onClick={() => {
              if (activeTab === 'site') fetchReports();
              else fetchMaterialWiseReports();
            }}
          >
            Refresh
          </button>
            </div>
          </div>
        </div>

      {/* Tabs */}
      <div style={{ marginBottom: '20px', borderBottom: '2px solid #ddd' }}>
        <button
          onClick={() => setActiveTab('site')}
          style={{
            padding: '10px 20px',
            backgroundColor: activeTab === 'site' ? '#3498db' : 'transparent',
            color: activeTab === 'site' ? 'white' : '#333',
            border: 'none',
            borderBottom: activeTab === 'site' ? '3px solid #2980b9' : 'none',
            cursor: 'pointer',
            marginRight: '10px'
          }}
        >
          Site-Wise Reports
        </button>
        <button
          onClick={() => setActiveTab('material')}
          style={{
            padding: '10px 20px',
            backgroundColor: activeTab === 'material' ? '#3498db' : 'transparent',
            color: activeTab === 'material' ? 'white' : '#333',
            border: 'none',
            borderBottom: activeTab === 'material' ? '3px solid #2980b9' : 'none',
            cursor: 'pointer'
          }}
        >
          Material-Wise Reports
        </button>
      </div>

      {/* Site-Wise Reports */}
      {activeTab === 'site' && (
        <>
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
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)',
            overflow: 'hidden'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '20px 24px',
              borderBottom: '1px solid #e0e0e0',
              backgroundColor: '#f8f9fa'
            }}>
              <h3 style={{
                margin: 0,
                fontSize: '20px',
                fontWeight: 'bold',
                color: '#2c3e50'
              }}>
                {selectedMaterial.material.name} - {selectedMaterial.site.name}
              </h3>
              <button
                onClick={() => setShowMaterialHistory(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '28px',
                  cursor: 'pointer',
                  color: '#666',
                  padding: '4px 8px',
                  borderRadius: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '36px',
                  height: '36px',
                  lineHeight: '1',
                  transition: 'all 0.2s ease',
                  fontWeight: 'bold'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#e0e0e0';
                  e.currentTarget.style.color = '#333';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = '#666';
                }}
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <div style={{ padding: '24px', maxHeight: 'calc(90vh - 100px)', overflowY: 'auto' }}>
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: '1fr 1fr', 
                gap: '20px', 
                marginBottom: '24px',
                padding: '20px',
                backgroundColor: '#f8f9fa',
                borderRadius: '8px',
                border: '1px solid #e0e0e0'
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
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {selectedMaterial.history.map((item, index) => (
                  <div key={index} style={{
                    border: '1px solid #e0e0e0',
                    borderRadius: '8px',
                    padding: '16px 20px',
                    backgroundColor: '#ffffff',
                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
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
      </>)}

      {/* Material-Wise Reports */}
      {activeTab === 'material' && (
        <>
          {loadingMaterialWise ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>Loading material-wise reports...</div>
          ) : selectedMaterialReport ? (
            <div className="card">
              <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 className="card-title">Material: {selectedMaterialReport.material.name}</h3>
                <button className="btn btn-secondary" onClick={() => setSelectedMaterialReport(null)}>
                  Back to List
                </button>
              </div>
              <div style={{ padding: '20px' }}>
                <div style={{ marginBottom: '20px' }}>
                  <h4>Summary</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px', marginTop: '10px' }}>
                    <div style={{ padding: '15px', backgroundColor: '#e3f2fd', borderRadius: '4px' }}>
                      <div style={{ fontSize: '14px', color: '#666' }}>Total Added</div>
                      <div style={{ fontSize: '20px', fontWeight: 'bold' }}>
                        {selectedMaterialReport.summary.totalAdded} {selectedMaterialReport.material.unit}
                      </div>
                    </div>
                    <div style={{ padding: '15px', backgroundColor: '#fff3cd', borderRadius: '4px' }}>
                      <div style={{ fontSize: '14px', color: '#666' }}>Total Distributed</div>
                      <div style={{ fontSize: '20px', fontWeight: 'bold' }}>
                        {selectedMaterialReport.summary.totalDistributed} {selectedMaterialReport.material.unit}
                      </div>
                    </div>
                    <div style={{ padding: '15px', backgroundColor: '#d4edda', borderRadius: '4px' }}>
                      <div style={{ fontSize: '14px', color: '#666' }}>Remaining</div>
                      <div style={{ fontSize: '20px', fontWeight: 'bold' }}>
                        {selectedMaterialReport.summary.remaining} {selectedMaterialReport.material.unit}
                      </div>
                    </div>
                  </div>
                </div>

                {selectedMaterialReport.distribution && selectedMaterialReport.distribution.length > 0 && (
                  <div style={{ marginBottom: '20px' }}>
                    <h4>Distribution to Sites</h4>
                    <table className="table" style={{ marginTop: '10px' }}>
                      <thead>
                        <tr>
                          <th>Site Name</th>
                          <th>Quantity</th>
                          <th>Total Value</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedMaterialReport.distribution.map((dist: any, idx: number) => (
                          <tr key={idx}>
                            <td>{dist.siteName}</td>
                            <td>{dist.totalQuantity} {selectedMaterialReport.material.unit}</td>
                            <td>₹{dist.totalValue.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          ) : materialWiseReports ? (
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">Material-Wise Reports</h3>
              </div>
              <div style={{ padding: '20px' }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Material</th>
                      <th>Unit</th>
                      <th>Total Added</th>
                      <th>Total Distributed</th>
                      <th>Remaining</th>
                      <th>Site Distribution</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {materialWiseReports.materialReports.map((report: any) => (
                      <tr key={report.material.id}>
                        <td>{report.material.name}</td>
                        <td>{report.material.unit}</td>
                        <td>{report.summary.totalAdded} {report.material.unit}</td>
                        <td>{report.summary.totalDistributed} {report.material.unit}</td>
                        <td>{report.summary.remaining} {report.material.unit}</td>
                        <td>
                          {report.siteDistribution.length > 0 ? (
                            <ul style={{ margin: 0, paddingLeft: '20px' }}>
                              {report.siteDistribution.map((dist: any, idx: number) => (
                                <li key={idx}>{dist.siteName}: {dist.quantity} {report.material.unit}</li>
                              ))}
                            </ul>
                          ) : 'N/A'}
                        </td>
                        <td>
                          <button 
                            className="btn btn-primary"
                            onClick={() => handleMaterialWiseSelect(report.material.id)}
                            style={{ padding: '5px 10px', fontSize: '12px' }}
                          >
                            View Details
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px' }}>No material-wise reports available</div>
          )}
        </>
      )}

      {/* PDF Options Modal */}
      <PDFOptionsModal
        isOpen={showPDFModal}
        onClose={() => setShowPDFModal(false)}
        type="reports"
        data={{
          siteReports: reports,
          materialReports: materialWiseReports,
          selectedMaterialReport: selectedMaterialReport
        }}
        materialName={selectedMaterialReport?.material?.name}
        siteName={selectedSite?.site?.name}
        sites={reports?.siteReports?.map((r: any) => r.site) || []}
      />
    </div>
  );
};

export default Reports;