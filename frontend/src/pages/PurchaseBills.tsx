import React, { useState, useEffect } from 'react';
import { purchaseBillService } from '../services/purchaseBillService';
import { materialService } from '../services/materialService';
import { companyService } from '../services/companyService';
import { siteService } from '../services/siteService';
import { godownService } from '../services/godownService';
import type { PurchaseBill, PurchaseBillFormData, Material, Company, Site, Godown, ApiError } from '../types';
import { useAuth } from '../contexts/AuthContext';

const PurchaseBills: React.FC = () => {
  const [purchaseBills, setPurchaseBills] = useState<PurchaseBill[]>([]);
  const [filteredPurchaseBills, setFilteredPurchaseBills] = useState<PurchaseBill[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [godowns, setGodowns] = useState<Godown[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedBill, setSelectedBill] = useState<PurchaseBill | null>(null);
  const [selectedYear, setSelectedYear] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [formData, setFormData] = useState<PurchaseBillFormData>({
    companyId: '',
    invoiceNumber: '',
    gstinNumber: '',
    billDate: new Date().toISOString().split('T')[0],
    deliveredToType: 'GODOWN',
    deliveredToId: '',
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
      const [purchaseBillsData, materialsData, companiesData, sitesData, godownsData] = await Promise.all([
        purchaseBillService.getAll(),
        materialService.getAll(),
        companyService.getAll(),
        siteService.getAll(),
        godownService.getAll()
      ]);

      setPurchaseBills(purchaseBillsData);
      setFilteredPurchaseBills(purchaseBillsData);
      setMaterials(materialsData);
      setCompanies(companiesData);
      setSites(sitesData);
      setGodowns(godownsData);
      
    } catch (error: unknown) {
      setError((error as ApiError)?.response?.data?.message || 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  // Filter purchase bills by year and month
  useEffect(() => {
    let filtered = purchaseBills;

    if (selectedYear) {
      filtered = filtered.filter(bill => {
        const billYear = new Date(bill.billDate).getFullYear().toString();
        return billYear === selectedYear;
      });
    }

    if (selectedMonth) {
      filtered = filtered.filter(bill => {
        const billMonth = (new Date(bill.billDate).getMonth() + 1).toString().padStart(2, '0');
        return billMonth === selectedMonth;
      });
    }

    setFilteredPurchaseBills(filtered);
  }, [purchaseBills, selectedYear, selectedMonth]);

  // Get unique years from purchase bills
  const getAvailableYears = () => {
    const years = [...new Set(purchaseBills.map(bill => new Date(bill.billDate).getFullYear()))];
    return years.sort((a, b) => b - a); // Sort descending (newest first)
  };

  // Get unique months from purchase bills for selected year
  const getAvailableMonths = () => {
    if (!selectedYear) return [];
    const months = [...new Set(
      purchaseBills
        .filter(bill => new Date(bill.billDate).getFullYear().toString() === selectedYear)
        .map(bill => new Date(bill.billDate).getMonth() + 1)
    )];
    return months.sort((a, b) => b - a); // Sort descending (newest first)
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate items
    if (formData.items.length === 0) {
      setError('Please add at least one item');
      return;
    }

    // Validate all items have required fields
    for (let i = 0; i < formData.items.length; i++) {
      const item = formData.items[i];
      if (!item.materialId || !item.quantity || !item.unit || !item.rate) {
        setError(`Please fill all required fields for item ${i + 1}`);
        return;
      }
    }

    try {
      // Convert string values to numbers for submission
      const submitData = {
        ...formData,
        items: formData.items.map(item => ({
          ...item,
          quantity: parseFloat(item.quantity.toString()) || 0,
          rate: parseFloat(item.rate.toString()) || 0,
          gstPercent: parseFloat(item.gstPercent.toString()) || 0
        }))
      };

      await purchaseBillService.create(submitData);
      setShowModal(false);
      setFormData({
        companyId: '',
        invoiceNumber: '',
        gstinNumber: '',
        billDate: new Date().toISOString().split('T')[0],
        deliveredToType: 'GODOWN',
        deliveredToId: '',
        items: []
      });
      setError('');
      fetchData();
    } catch (error: unknown) {
      setError((error as ApiError)?.response?.data?.message || 'Failed to create purchase bill');
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this purchase bill?')) {
      try {
        await purchaseBillService.delete(id);
        fetchData();
      } catch (error: unknown) {
        setError((error as ApiError)?.response?.data?.message || 'Failed to delete purchase bill');
      }
    }
  };

  const handleView = (bill: PurchaseBill) => {
    setSelectedBill(bill);
    setShowViewModal(true);
  };

  const addItem = () => {
    const newItem = {
      id: Date.now().toString(), // Add unique ID for stable key
      materialId: '',
      quantity: '',
      unit: '',
      rate: '',
      gstPercent: 18,
      totalExclGst: 0,
      totalInclGst: 0
    };
    
    setFormData(prevFormData => ({
      ...prevFormData,
      items: [...prevFormData.items, newItem]
    }));
  };

  const updateItem = (index: number, field: string, value: string | number) => {
    setFormData(prevFormData => {
      const newItems = [...prevFormData.items];
      newItems[index] = { ...newItems[index], [field]: value };
      
      // Calculate totals
      if (field === 'quantity' || field === 'rate' || field === 'gstPercent') {
        const quantity = parseFloat(newItems[index].quantity.toString()) || 0;
        const rate = parseFloat(newItems[index].rate.toString()) || 0;
        const gstPercent = parseFloat(newItems[index].gstPercent.toString()) || 0;
        
        newItems[index].totalExclGst = quantity * rate;
        newItems[index].totalInclGst = newItems[index].totalExclGst * (1 + gstPercent / 100);
      }
      
      return { ...prevFormData, items: newItems };
    });
  };

  const handleQuantityChange = (index: number, value: string) => {
    const numValue = parseFloat(value) || 0;
    if (numValue < 0) return; // Prevent negative values
    updateItem(index, 'quantity', value);
  };

  const handleRateChange = (index: number, value: string) => {
    const numValue = parseFloat(value) || 0;
    if (numValue < 0) return; // Prevent negative values
    updateItem(index, 'rate', value);
  };

  const handleGstChange = (index: number, value: string) => {
    const numValue = parseFloat(value) || 0;
    if (numValue < 0) return; // Prevent negative values
    updateItem(index, 'gstPercent', value);
  };

  const removeItem = (index: number) => {
    const newItems = formData.items.filter((_, i) => i !== index);
    setFormData({ ...formData, items: newItems });
  };

  const getDeliveredToName = (bill: PurchaseBill) => {
    if (bill.deliveredToType === 'GODOWN') {
      return godowns.find(g => g.id === bill.deliveredToId)?.name || 'Unknown Godown';
    } else {
      return sites.find(s => s.id === bill.deliveredToId)?.name || 'Unknown Site';
    }
  };

  const getTotalAmount = (bill: PurchaseBill) => {
    return bill.items.reduce((sum, item) => sum + Number(item.totalInclGst), 0);
  };

  if (loading) {
    return (
      <div className="header">
        <h1>Purchase Bills</h1>
        <div>Loading...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="header">
        <h1>Purchase Bills</h1>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          Add Purchase Bill
        </button>
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
          <h3 className="card-title">Purchase Bills List</h3>
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
                Showing {filteredPurchaseBills.length} of {purchaseBills.length} bills
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
        <table className="table">
          <thead>
            <tr>
              <th>Invoice No.</th>
              <th>Company</th>
              <th>Bill Date</th>
              <th>Delivered To</th>
              <th>Total Amount</th>
              <th>Created By</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredPurchaseBills.map((bill) => (
              <tr key={bill.id}>
                <td>{bill.invoiceNumber}</td>
                <td>{bill.company.name}</td>
                <td>{new Date(bill.billDate).toLocaleDateString()}</td>
                <td>{getDeliveredToName(bill)}</td>
                <td>₹{getTotalAmount(bill).toLocaleString()}</td>
                <td>{bill.createdBy.name}</td>
                <td>
                  <button 
                    className="btn btn-secondary" 
                    style={{ marginRight: '5px' }}
                    onClick={() => handleView(bill)}
                  >
                    View
                  </button>
                  {isAdmin && (
                    <button 
                      className="btn btn-danger"
                      onClick={() => handleDelete(bill.id)}
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

      {/* Modal */}
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
            <h3>Add Purchase Bill</h3>
            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px' }}>
                <div className="form-group">
                  <label className="form-label">Company</label>
                  <select
                    className="form-select"
                    value={formData.companyId}
                    onChange={(e) => setFormData({ ...formData, companyId: e.target.value })}
                    required
                  >
                    <option value="">Select Company</option>
                    {companies.map(company => (
                      <option key={company.id} value={company.id}>{company.name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Invoice Number</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.invoiceNumber}
                    onChange={(e) => setFormData({ ...formData, invoiceNumber: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">GSTIN Number</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.gstinNumber}
                    onChange={(e) => setFormData({ ...formData, gstinNumber: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Bill Date</label>
                  <input
                    type="date"
                    className="form-input"
                    value={formData.billDate}
                    onChange={(e) => setFormData({ ...formData, billDate: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Delivered To Type</label>
                  <select
                    className="form-select"
                    value={formData.deliveredToType}
                    onChange={(e) => setFormData({ ...formData, deliveredToType: e.target.value as 'GODOWN' | 'SITE', deliveredToId: '' })}
                    required
                  >
                    <option value="GODOWN">Godown</option>
                    <option value="SITE">Site</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">
                    {formData.deliveredToType === 'GODOWN' ? 'Godown' : 'Site'}
                  </label>
                  <select
                    className="form-select"
                    value={formData.deliveredToId}
                    onChange={(e) => setFormData({ ...formData, deliveredToId: e.target.value })}
                    required
                  >
                    <option value="">Select {formData.deliveredToType === 'GODOWN' ? 'Godown' : 'Site'}</option>
                    {(formData.deliveredToType === 'GODOWN' ? godowns : sites).map(item => (
                      <option key={item.id} value={item.id}>{item.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <h4>Items</h4>
                  <button type="button" className="btn btn-secondary" onClick={addItem}>
                    Add Item
                  </button>
                </div>
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
                        />
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
                        <label className="form-label">Rate</label>
                        <input
                          type="number"
                          className="form-input"
                          value={item.rate}
                          onChange={(e) => handleRateChange(index, e.target.value)}
                          min="0"
                          step="0.01"
                          required
                        />
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
                          value={item.totalExclGst.toFixed(2)}
                          readOnly
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Total (Incl. GST)</label>
                        <input
                          type="number"
                          className="form-input"
                          value={item.totalInclGst.toFixed(2)}
                          readOnly
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
                  Create Purchase Bill
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Modal */}
      {showViewModal && selectedBill && (
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
              <h3>Purchase Bill Details - {selectedBill.invoiceNumber}</h3>
              <button 
                className="btn btn-secondary"
                onClick={() => setShowViewModal(false)}
              >
                Close
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '30px' }}>
              <div>
                <h4 style={{ color: '#2c3e50', marginBottom: '10px' }}>Bill Information</h4>
                <div style={{ display: 'grid', gap: '8px' }}>
                  <div><strong>Invoice Number:</strong> {selectedBill.invoiceNumber}</div>
                  <div><strong>Company:</strong> {selectedBill.company.name}</div>
                  <div><strong>GSTIN:</strong> {selectedBill.gstinNumber || 'N/A'}</div>
                  <div><strong>Bill Date:</strong> {new Date(selectedBill.billDate).toLocaleDateString()}</div>
                  <div><strong>Delivered To:</strong> {getDeliveredToName(selectedBill)} ({selectedBill.deliveredToType})</div>
                  <div><strong>Created By:</strong> {selectedBill.createdBy.name}</div>
                  <div><strong>Created At:</strong> {new Date(selectedBill.createdAt).toLocaleString()}</div>
                </div>
              </div>
              
              <div>
                <h4 style={{ color: '#2c3e50', marginBottom: '10px' }}>Summary</h4>
                <div style={{ display: 'grid', gap: '8px' }}>
                  <div><strong>Total Items:</strong> {selectedBill.items.length}</div>
                  <div><strong>Total Quantity:</strong> {selectedBill.items.reduce((sum, item) => sum + Number(item.quantity), 0).toLocaleString()}</div>
                  <div><strong>Subtotal (Excl. GST):</strong> ₹{selectedBill.items.reduce((sum, item) => sum + Number(item.totalExclGst), 0).toLocaleString()}</div>
                  <div><strong>Total Amount (Incl. GST):</strong> ₹{getTotalAmount(selectedBill).toLocaleString()}</div>
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
                  {selectedBill.items.map((item, index) => (
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

export default PurchaseBills;
