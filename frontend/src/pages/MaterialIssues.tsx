import React, { useState, useEffect } from 'react';
import { materialIssueService } from '../services/materialIssueService';
import { materialService } from '../services/materialService';
import { siteService } from '../services/siteService';
import { godownService } from '../services/godownService';
import type { MaterialIssue, CreateMaterialIssueRequest, MaterialIssueFormData, Material, Site, Godown, ApiError } from '../types';
import { useAuth } from '../contexts/AuthContext';

const MaterialIssues: React.FC = () => {
  const [materialIssues, setMaterialIssues] = useState<MaterialIssue[]>([]);
  const [filteredMaterialIssues, setFilteredMaterialIssues] = useState<MaterialIssue[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [godowns, setGodowns] = useState<Godown[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalError, setModalError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedIssue, setSelectedIssue] = useState<MaterialIssue | null>(null);
  const [stockData, setStockData] = useState<{[key: string]: number}>({});
  const [materialRates, setMaterialRates] = useState<{[key: string]: number}>({});
  const [selectedYear, setSelectedYear] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [formData, setFormData] = useState<MaterialIssueFormData>({
    siteId: '',
    fromGodownId: '',
    issueDate: new Date().toISOString().split('T')[0],
    items: []
  });

  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(''); // Clear any previous errors
      const [issuesData, materialsData, sitesData, godownsData] = await Promise.all([
        materialIssueService.getAll(),
        materialService.getAll(),
        siteService.getAll(),
        godownService.getAll()
      ]);

      setMaterialIssues(issuesData);
      setFilteredMaterialIssues(issuesData);
      setMaterials(materialsData);
      setSites(sitesData);
      setGodowns(godownsData);
    } catch (error: unknown) {
      setError((error as ApiError)?.response?.data?.message || 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  // Filter material issues by year and month
  useEffect(() => {
    let filtered = materialIssues;

    if (selectedYear) {
      filtered = filtered.filter(issue => {
        const issueYear = new Date(issue.issueDate).getFullYear().toString();
        return issueYear === selectedYear;
      });
    }

    if (selectedMonth) {
      filtered = filtered.filter(issue => {
        const issueMonth = (new Date(issue.issueDate).getMonth() + 1).toString().padStart(2, '0');
        return issueMonth === selectedMonth;
      });
    }

    setFilteredMaterialIssues(filtered);
  }, [materialIssues, selectedYear, selectedMonth]);

  // Get unique years from material issues
  const getAvailableYears = () => {
    const years = [...new Set(materialIssues.map(issue => new Date(issue.issueDate).getFullYear()))];
    return years.sort((a, b) => b - a); // Sort descending (newest first)
  };

  // Get unique months from material issues for selected year
  const getAvailableMonths = () => {
    if (!selectedYear) return [];
    const months = [...new Set(
      materialIssues
        .filter(issue => new Date(issue.issueDate).getFullYear().toString() === selectedYear)
        .map(issue => new Date(issue.issueDate).getMonth() + 1)
    )];
    return months.sort((a, b) => b - a); // Sort descending (newest first)
  };

  const fetchStockData = async (godownId?: string) => {
    try {
      const response = await fetch(`http://localhost:3001/api/inventory${godownId ? `?godownId=${godownId}` : ''}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });
      const stockData = await response.json();
      
      const stockMap: {[key: string]: number} = {};
      stockData.forEach((item: { material: { id: string }; quantity: number }) => {
        stockMap[item.material.id] = item.quantity;
      });
      
      setStockData(stockMap);
      console.log('Fetched stock data:', stockMap);
    } catch (error) {
      console.error('Failed to fetch stock data:', error);
    }
  };

  const fetchMaterialRates = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/purchase-bills', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });
      const purchaseBills = await response.json();
      
      const rateMap: {[key: string]: number} = {};
      const dateMap: {[key: string]: string} = {};
      
      // Get the most recent rate for each material from purchase bills
      purchaseBills.forEach((bill: { items?: Array<{ materialId: string; rate: number }>; billDate: string }) => {
        if (bill.items && Array.isArray(bill.items)) {
          bill.items.forEach((item: { materialId: string; rate: number }) => {
            if (item.materialId && item.rate !== undefined) {
              const itemRate = Number(item.rate);
              const billDate = new Date(bill.billDate);
              const existingDate = dateMap[item.materialId] ? new Date(dateMap[item.materialId]) : new Date(0);
              
              if (!rateMap[item.materialId] || billDate > existingDate) {
                rateMap[item.materialId] = itemRate;
                dateMap[item.materialId] = bill.billDate;
              }
            }
          });
        }
      });
      
      setMaterialRates(rateMap);
      console.log('Fetched material rates:', rateMap);
    } catch (error) {
      console.error('Failed to fetch material rates:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Clear previous errors
    setModalError('');
    
    // Validate items
    if (formData.items.length === 0) {
      setModalError('Please add at least one item');
      return;
    }

    // Validate all items have required fields
    for (let i = 0; i < formData.items.length; i++) {
      const item = formData.items[i];
      if (!item.materialId || !item.quantity || !item.unit) {
        setModalError(`Please fill all required fields for item ${i + 1}`);
        return;
      }
    }

    // Check stock availability for each item
    for (let i = 0; i < formData.items.length; i++) {
      const item = formData.items[i];
      const availableStock = stockData[item.materialId] || 0;
      const requiredQuantity = parseFloat(item.quantity.toString());
      
      console.log(`Stock check for material ${item.materialId}:`, {
        availableStock,
        requiredQuantity,
        stockData,
        materialName: materials.find(m => m.id === item.materialId)?.name
      });
      
      if (requiredQuantity > availableStock) {
        const material = materials.find(m => m.id === item.materialId);
        setModalError(`Insufficient stock for material ${material?.name}. Available: ${availableStock}, Required: ${requiredQuantity}`);
        return;
      }
    }

    try {
      // Convert form data to API format
      const apiData: CreateMaterialIssueRequest = {
        siteId: formData.siteId,
        fromGodownId: formData.fromGodownId || undefined,
        issueDate: formData.issueDate,
        items: formData.items.map(item => ({
          materialId: item.materialId,
          quantity: parseFloat(item.quantity.toString()),
          unit: item.unit,
          rate: parseFloat(item.rate.toString()),
          gstPercent: item.gstPercent,
          totalExclGst: item.totalExclGst,
          totalInclGst: item.totalInclGst
        }))
      };
      
      await materialIssueService.create(apiData);
      setModalError(''); // Clear error on success
      setError(''); // Clear main error on success
      setShowModal(false);
      setFormData({
        siteId: '',
        fromGodownId: '',
        issueDate: new Date().toISOString().split('T')[0],
        items: []
      });
      setStockData({});
      fetchData();
    } catch (error: unknown) {
      setModalError((error as ApiError)?.response?.data?.message || 'Failed to create material issue');
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this material issue?')) {
      try {
        setError(''); // Clear any previous errors
        await materialIssueService.delete(id);
        setError(''); // Clear error on success
        fetchData();
      } catch (error: unknown) {
        setError((error as ApiError)?.response?.data?.message || 'Failed to delete material issue');
      }
    }
  };

  const handleView = (issue: MaterialIssue) => {
    setSelectedIssue(issue);
    setShowViewModal(true);
  };

  const handleModalOpen = () => {
    setError(''); // Clear any previous errors
    setModalError(''); // Clear modal errors
    setShowModal(true);
    setStockData({});
    setMaterialRates({});
    // Fetch stock data and material rates
    fetchStockData();
    fetchMaterialRates();
  };

  const handleGodownChange = (godownId: string) => {
    setFormData({ ...formData, fromGodownId: godownId });
    // Fetch stock data for selected godown
    console.log('Godown changed to:', godownId);
    fetchStockData(godownId);
  };

  const addItem = () => {
    const newItem = {
      id: Date.now().toString(),
      materialId: '',
      quantity: '',
      unit: '',
      rate: 0,
      gstPercent: 18,
      totalExclGst: 0,
      totalInclGst: 0
    };
    
    setFormData(prevFormData => ({
      ...prevFormData,
      items: [...prevFormData.items, newItem]
    }));
    
    // Refresh stock data when adding new items
    fetchStockData(formData.fromGodownId);
  };

  const updateItem = (index: number, field: string, value: string | number) => {
    setFormData(prevFormData => {
      const newItems = [...prevFormData.items];
      newItems[index] = { ...newItems[index], [field]: value };
      
      // Auto-set rate when material is selected
      if (field === 'materialId') {
        const materialRate = materialRates[value as string] || 0;
        console.log('Setting rate for material', value, 'rate:', materialRate);
        newItems[index].rate = Number(materialRate);
      }
      
      // Calculate totals
      if (field === 'quantity' || field === 'rate' || field === 'gstPercent' || field === 'materialId') {
        const quantity = parseFloat(newItems[index].quantity.toString()) || 0;
        const rate = Number(newItems[index].rate) || 0;
        const gstPercent = Number(newItems[index].gstPercent) || 0;
        
        newItems[index].totalExclGst = quantity * rate;
        newItems[index].totalInclGst = newItems[index].totalExclGst * (1 + gstPercent / 100);
      }
      
      return { ...prevFormData, items: newItems };
    });
  };

  const handleQuantityChange = (index: number, value: string) => {
    const numValue = parseFloat(value) || 0;
    if (numValue < 0) return;
    updateItem(index, 'quantity', value);
  };

  const handleGstChange = (index: number, value: string) => {
    const numValue = parseFloat(value) || 0;
    if (numValue < 0) return;
    updateItem(index, 'gstPercent', value);
  };

  const removeItem = (index: number) => {
    const newItems = formData.items.filter((_, i) => i !== index);
    setFormData({ ...formData, items: newItems });
  };

  const getTotalAmount = (issue: MaterialIssue) => {
    return issue.items.reduce((sum, item) => sum + Number(item.totalInclGst), 0);
  };

  if (loading) {
    return (
      <div className="header">
        <h1>Material Issues</h1>
        <div>Loading...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="header">
        <h1>Material Issues</h1>
        <div>
          <button className="btn btn-primary" onClick={handleModalOpen}>
            Issue Material
          </button>
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
      
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Material Issues List</h3>
        </div>
        <div style={{ padding: '20px', borderBottom: '1px solid #e0e0e0' }}>
          <div style={{ display: 'flex', gap: '20px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Filter by Year:</label>
              <select
                value={selectedYear}
                onChange={(e) => {
                  setSelectedYear(e.target.value);
                  setSelectedMonth(''); // Reset month when year changes
                }}
                style={{
                  padding: '8px 12px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  minWidth: '120px'
                }}
              >
                <option value="">All Years</option>
                {getAvailableYears().map(year => (
                  <option key={year} value={year.toString()}>{year}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Filter by Month:</label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                disabled={!selectedYear}
                style={{
                  padding: '8px 12px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  minWidth: '120px',
                  opacity: selectedYear ? 1 : 0.6
                }}
              >
                <option value="">All Months</option>
                {getAvailableMonths().map(month => (
                  <option key={month} value={month.toString().padStart(2, '0')}>
                    {new Date(2024, month - 1).toLocaleDateString('en-US', { month: 'long' })}
                  </option>
                ))}
              </select>
            </div>
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ color: '#666', fontSize: '14px' }}>
                Showing {filteredMaterialIssues.length} of {materialIssues.length} issues
              </span>
              {(selectedYear || selectedMonth) && (
                <button
                  className="btn btn-secondary"
                  onClick={() => {
                    setSelectedYear('');
                    setSelectedMonth('');
                  }}
                  style={{ padding: '6px 12px', fontSize: '14px' }}
                >
                  Clear Filters
                </button>
              )}
            </div>
          </div>
        </div>
        <div className="table-wrapper">
          <table className="table">
          <thead>
            <tr>
              <th>Issue ID</th>
              <th>Site</th>
              <th>From Godown</th>
              <th>Issue Date</th>
              <th>Total Amount</th>
              <th>Created By</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredMaterialIssues.map((issue) => (
              <tr key={issue.id}>
                <td>{issue.identifier}</td>
                <td>{issue.site.name}</td>
                <td>{issue.fromGodown?.name || 'Direct'}</td>
                <td>{new Date(issue.issueDate).toLocaleDateString()}</td>
                <td>₹{getTotalAmount(issue).toLocaleString()}</td>
                <td>{issue.createdBy.name}</td>
                <td>
                  <button 
                    className="btn btn-secondary" 
                    style={{ marginRight: '5px' }}
                    onClick={() => handleView(issue)}
                  >
                    View
                  </button>
                  {isAdmin && (
                    <button 
                      className="btn btn-danger"
                      onClick={() => handleDelete(issue.id)}
                    >
                      Delete
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>

      {/* Create Modal */}
      {showModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '20px',
            borderRadius: '8px',
            width: '90%',
            maxWidth: '800px',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            <h3>Issue Material</h3>
            
            {modalError && (
              <div style={{ 
                color: '#e74c3c', 
                backgroundColor: '#fdf2f2', 
                padding: '10px', 
                borderRadius: '4px', 
                marginBottom: '20px',
                border: '1px solid #fecaca'
              }}>
                {modalError}
              </div>
            )}
            
            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px' }}>
                <div className="form-group">
                  <label className="form-label">Site</label>
                  <select
                    className="form-select"
                    value={formData.siteId}
                    onChange={(e) => setFormData({ ...formData, siteId: e.target.value })}
                    required
                  >
                    <option value="">Select Site</option>
                    {sites.map(site => (
                      <option key={site.id} value={site.id}>{site.name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">From Godown (Optional)</label>
                  <select
                    className="form-select"
                    value={formData.fromGodownId}
                    onChange={(e) => handleGodownChange(e.target.value)}
                  >
                    <option value="">Select Godown (Leave empty for direct issue)</option>
                    {godowns.map(godown => (
                      <option key={godown.id} value={godown.id}>{godown.name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Issue Date</label>
                  <input
                    type="date"
                    className="form-input"
                    value={formData.issueDate}
                    onChange={(e) => setFormData({ ...formData, issueDate: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <h4>Items</h4>
                  <button type="button" className="btn btn-secondary" onClick={addItem}>
                    Add Item
                  </button>
                </div>
                
                {formData.fromGodownId && Object.keys(stockData).length > 0 && (
                  <div style={{ 
                    backgroundColor: '#f8f9fa', 
                    padding: '10px', 
                    borderRadius: '4px', 
                    marginBottom: '15px',
                    border: '1px solid #dee2e6'
                  }}>
                    <div style={{ fontSize: '14px', fontWeight: '500', marginBottom: '5px', color: '#495057' }}>
                      📦 Stock Summary for {godowns.find(g => g.id === formData.fromGodownId)?.name || 'Selected Godown'}:
                    </div>
                    <div style={{ fontSize: '12px', color: '#6c757d' }}>
                      {Object.keys(stockData).length} materials available • Rates auto-fetched from purchase bills
                    </div>
                  </div>
                )}
                {formData.items.map((item, index) => (
                  <div key={item.id} style={{ 
                    border: '1px solid #ddd', 
                    padding: '15px', 
                    marginBottom: '10px', 
                    borderRadius: '4px',
                    backgroundColor: '#f9f9f9'
                  }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '10px', marginBottom: '15px' }}>
                      <div className="form-group">
                        <label className="form-label">Material</label>
                        <select
                          className="form-select"
                          value={item.materialId}
                          onChange={(e) => {
                            const material = materials.find(m => m.id === e.target.value);
                            updateItem(index, 'materialId', e.target.value);
                            if (material) {
                              updateItem(index, 'unit', material.unit);
                            }
                          }}
                          required
                        >
                          <option value="">Select Material</option>
                          {materials.map(material => (
                            <option key={material.id} value={material.id}>{material.name}</option>
                          ))}
                        </select>
                        {item.materialId && stockData[item.materialId] !== undefined && (
                          <div style={{ 
                            fontSize: '12px', 
                            color: stockData[item.materialId] > 0 ? '#16a085' : '#e74c3c',
                            marginTop: '4px',
                            fontWeight: '500'
                          }}>
                            Available Stock: {stockData[item.materialId]} {materials.find(m => m.id === item.materialId)?.unit || ''}
                          </div>
                        )}
                      </div>
                      <div className="form-group">
                        <label className="form-label">Quantity</label>
                        <input
                          type="number"
                          className="form-input"
                          value={item.quantity}
                          onChange={(e) => handleQuantityChange(index, e.target.value)}
                          min="0"
                          step="0.01"
                          required
                          style={{
                            borderColor: item.materialId && stockData[item.materialId] !== undefined && 
                              parseFloat(item.quantity.toString()) > stockData[item.materialId] ? '#e74c3c' : undefined
                          }}
                        />
                        {item.materialId && stockData[item.materialId] !== undefined && 
                         parseFloat(item.quantity.toString()) > stockData[item.materialId] && (
                          <div style={{ 
                            fontSize: '11px', 
                            color: '#e74c3c',
                            marginTop: '2px',
                            fontWeight: '500'
                          }}>
                            ⚠️ Quantity exceeds available stock
                          </div>
                        )}
                      </div>
                      <div className="form-group">
                        <label className="form-label">Unit</label>
                        <input
                          type="text"
                          className="form-input"
                          value={item.unit}
                          onChange={(e) => updateItem(index, 'unit', e.target.value)}
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Rate (Auto-fetched)</label>
                        <input
                          type="number"
                          className="form-input"
                          value={typeof item.rate === 'number' ? item.rate.toFixed(2) : '0.00'}
                          readOnly
                          style={{ backgroundColor: '#f8f9fa', color: '#6c757d' }}
                        />
                        {item.materialId && (
                          <div style={{ 
                            fontSize: '11px', 
                            color: materialRates[item.materialId] ? '#28a745' : '#ffc107',
                            marginTop: '2px',
                            fontWeight: '500'
                          }}>
                            {materialRates[item.materialId] ? 
                              '✓ Rate fetched from latest purchase bill' : 
                              '⚠️ No rate found in purchase bills'
                            }
                          </div>
                        )}
                      </div>
                      <div className="form-group">
                        <label className="form-label">GST %</label>
                        <input
                          type="number"
                          className="form-input"
                          value={item.gstPercent}
                          onChange={(e) => handleGstChange(index, e.target.value)}
                          min="0"
                          step="0.01"
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Total (Excl. GST)</label>
                        <input
                          type="number"
                          className="form-input"
                          value={typeof item.totalExclGst === 'number' ? item.totalExclGst.toFixed(2) : '0.00'}
                          readOnly
                          style={{ backgroundColor: '#f8f9fa', color: '#6c757d' }}
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Total (Incl. GST)</label>
                        <input
                          type="number"
                          className="form-input"
                          value={typeof item.totalInclGst === 'number' ? item.totalInclGst.toFixed(2) : '0.00'}
                          readOnly
                          style={{ backgroundColor: '#f8f9fa', color: '#6c757d' }}
                        />
                      </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <button
                        type="button"
                        className="btn btn-danger"
                        onClick={() => removeItem(index)}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button 
                  type="button" 
                  className="btn btn-secondary"
                  onClick={() => setShowModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Issue Material
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Modal */}
      {showViewModal && selectedIssue && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '20px',
            borderRadius: '8px',
            width: '90%',
            maxWidth: '900px',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3>Material Issue Details - {selectedIssue.identifier}</h3>
              <button 
                className="btn btn-secondary"
                onClick={() => setShowViewModal(false)}
              >
                Close
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '30px' }}>
              <div>
                <h4 style={{ color: '#2c3e50', marginBottom: '10px' }}>Issue Information</h4>
                <div style={{ display: 'grid', gap: '8px' }}>
                  <div><strong>Issue ID:</strong> {selectedIssue.identifier}</div>
                  <div><strong>Site:</strong> {selectedIssue.site.name}</div>
                  <div><strong>From Godown:</strong> {selectedIssue.fromGodown?.name || 'Direct Issue'}</div>
                  <div><strong>Issue Date:</strong> {new Date(selectedIssue.issueDate).toLocaleDateString()}</div>
                  <div><strong>Created By:</strong> {selectedIssue.createdBy.name}</div>
                  <div><strong>Created At:</strong> {new Date(selectedIssue.createdAt).toLocaleString()}</div>
                </div>
              </div>
              
              <div>
                <h4 style={{ color: '#2c3e50', marginBottom: '10px' }}>Summary</h4>
                <div style={{ display: 'grid', gap: '8px' }}>
                  <div><strong>Total Items:</strong> {selectedIssue.items.length}</div>
                  <div><strong>Total Quantity:</strong> {selectedIssue.items.reduce((sum, item) => sum + Number(item.quantity), 0).toLocaleString()}</div>
                  <div><strong>Subtotal (Excl. GST):</strong> ₹{selectedIssue.items.reduce((sum, item) => sum + Number(item.totalExclGst), 0).toLocaleString()}</div>
                  <div><strong>Total Amount (Incl. GST):</strong> ₹{getTotalAmount(selectedIssue).toLocaleString()}</div>
                </div>
              </div>
            </div>

            <div>
              <h4 style={{ color: '#2c3e50', marginBottom: '15px' }}>Items Details</h4>
              <table className="table">
                <thead>
                  <tr>
                    <th>Material</th>
                    <th>Quantity</th>
                    <th>Unit</th>
                    <th>Rate</th>
                    <th>GST %</th>
                    <th>Total (Excl. GST)</th>
                    <th>Total (Incl. GST)</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedIssue.items.map((item, index) => (
                    <tr key={index}>
                      <td>{item.material.name}</td>
                      <td>{item.quantity}</td>
                      <td>{item.unit}</td>
                      <td>₹{item.rate.toLocaleString()}</td>
                      <td>{item.gstPercent}%</td>
                      <td>₹{item.totalExclGst.toLocaleString()}</td>
                      <td>₹{item.totalInclGst.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MaterialIssues;