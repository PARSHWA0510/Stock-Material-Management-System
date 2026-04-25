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
  const [expandedItemIds, setExpandedItemIds] = useState<string[]>([]);

  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  useEffect(() => {
    fetchData();
  }, []);

  // Auto-fetch GSTIN when company is selected
  useEffect(() => {
    if (formData.companyId) {
      const selectedCompany = companies.find(c => c.id === formData.companyId);
      if (selectedCompany && selectedCompany.gstin) {
        setFormData(prev => ({ ...prev, gstinNumber: selectedCompany.gstin || '' }));
      } else {
        setFormData(prev => ({ ...prev, gstinNumber: '' }));
      }
    } else {
      setFormData(prev => ({ ...prev, gstinNumber: '' }));
    }
  }, [formData.companyId, companies]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(''); // Clear any previous errors
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
      setError(''); // Clear any previous errors
      // Convert string values to numbers for submission
      const submitData = {
        ...formData,
        items: formData.items.map(item => {
          const rate = parseFloat(item.rate.toString()) || 0;
          const discountPercent = parseFloat(item.discountPercent?.toString() || '0') || 0;
          // Calculate netRate if not already set or if it's 0
          const netRate = item.netRate && item.netRate > 0 
            ? parseFloat(item.netRate.toString()) 
            : rate - (rate * discountPercent / 100);
          
          return {
          ...item,
          quantity: parseFloat(item.quantity.toString()) || 0,
            rate,
            discountPercent,
            netRate,
          gstPercent: parseFloat(item.gstPercent.toString()) || 0
          };
        })
      };

      await purchaseBillService.create(submitData);
      setError(''); // Clear error on success
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
      fetchData();
    } catch (error: unknown) {
      setError((error as ApiError)?.response?.data?.message || 'Failed to create purchase bill');
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this purchase bill?')) {
      try {
        setError(''); // Clear any previous errors
        await purchaseBillService.delete(id);
        setError(''); // Clear error on success
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
      discountPercent: 0,
      netRate: 0,
      gstPercent: 18,
      totalExclGst: 0,
      totalInclGst: 0
    };
    
    setFormData(prevFormData => ({
      ...prevFormData,
      items: [newItem, ...prevFormData.items]
    }));
    setExpandedItemIds(prev => [newItem.id, ...prev]);
  };

  const toggleItemAccordion = (itemId: string) => {
    setExpandedItemIds(prev =>
      prev.includes(itemId)
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  const getMaterialName = (materialId: string) => {
    if (!materialId) return 'Select Material';
    return materials.find(material => material.id === materialId)?.name || 'Unknown Material';
  };

  const updateItem = (index: number, field: string, value: string | number) => {
    setFormData(prevFormData => {
      const newItems = [...prevFormData.items];
      newItems[index] = { ...newItems[index], [field]: value };
      
      // Calculate net rate and totals
      if (field === 'rate' || field === 'discountPercent') {
        const rate = parseFloat(newItems[index].rate.toString()) || 0;
        const discountPercent = parseFloat(newItems[index].discountPercent.toString()) || 0;
        
        // Calculate net rate: rate - (rate * discountPercent / 100)
        newItems[index].netRate = rate - (rate * discountPercent / 100);
      }
      
      // Calculate totals using net rate
      if (field === 'quantity' || field === 'rate' || field === 'discountPercent' || field === 'gstPercent') {
        const quantity = parseFloat(newItems[index].quantity.toString()) || 0;
        const netRate = parseFloat(newItems[index].netRate.toString()) || 0;
        const gstPercent = parseFloat(newItems[index].gstPercent.toString()) || 0;
        
        newItems[index].totalExclGst = quantity * netRate;
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

  const handleDiscountChange = (index: number, value: string) => {
    // If empty string, treat as 0
    if (value === '' || value === null || value === undefined) {
      updateItem(index, 'discountPercent', 0);
      return;
    }
    const numValue = parseFloat(value);
    if (isNaN(numValue) || numValue < 0 || numValue > 100) return; // Prevent invalid, negative values or values over 100%
    updateItem(index, 'discountPercent', numValue);
  };

  const handleGstChange = (index: number, value: string) => {
    const numValue = parseFloat(value) || 0;
    if (numValue < 0) return; // Prevent negative values
    updateItem(index, 'gstPercent', value);
  };

  const removeItem = (index: number) => {
    const itemIdToRemove = formData.items[index]?.id;
    const newItems = formData.items.filter((_, i) => i !== index);
    setFormData({ ...formData, items: newItems });
    if (itemIdToRemove) {
      setExpandedItemIds(prev => prev.filter(id => id !== itemIdToRemove));
    }
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
        <div>
          <button className="btn btn-primary" onClick={() => {
            setError(''); // Clear any previous errors
            setShowModal(true);
          }}>
            Add Purchase Bill
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
        <div className="table-wrapper">
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
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'nowrap' }}>
                  <button 
                    className="btn btn-secondary" 
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
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
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
            width: 'min(95vw, 1200px)',
            minWidth: '320px',
            resize: 'both',
            maxHeight: '90vh',
            overflow: 'auto'
          }}>
            <h3>Add Purchase Bill</h3>
            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '15px', marginBottom: '20px' }}>
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
                    value={formData.gstinNumber || ''}
                    readOnly
                    style={{ backgroundColor: '#f5f5f5', cursor: 'not-allowed' }}
                    placeholder="Auto-filled from selected company"
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
                  <button type="button" className="btn btn-primary" onClick={addItem}>
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
                    <div style={{ 
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: '10px',
                      marginBottom: expandedItemIds.includes(item.id) ? '15px' : 0
                    }}>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontWeight: 600, color: '#2c3e50' }}>
                          Item {index + 1}
                        </div>
                        <div
                          style={{
                            color: '#666',
                            marginTop: '4px',
                            whiteSpace: 'normal',
                            wordBreak: 'break-word'
                          }}
                          title={getMaterialName(item.materialId)}
                        >
                          {getMaterialName(item.materialId)}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={() => toggleItemAccordion(item.id)}
                          style={{ padding: '6px 10px' }}
                        >
                          {expandedItemIds.includes(item.id) ? 'Close' : 'Open'}
                        </button>
                        <button
                          type="button"
                          className="btn btn-danger"
                          onClick={() => removeItem(index)}
                          style={{ padding: '6px 10px' }}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                    {expandedItemIds.includes(item.id) && (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px', marginBottom: '5px' }}>
                        <div className="form-group">
                          <label className="form-label">Material</label>
                          <select
                            className="form-select"
                            value={item.materialId}
                            onChange={(e) => {
                              const selectedMaterialId = e.target.value;
                              const duplicateExists = formData.items.some(
                                (existingItem, existingIndex) => existingIndex !== index && existingItem.materialId === selectedMaterialId
                              );

                              if (duplicateExists) {
                                setError('This material is already added in another item. Please select a different material.');
                                return;
                              }

                              const material = materials.find(m => m.id === selectedMaterialId);
                              updateItem(index, 'materialId', selectedMaterialId);
                              if (material) {
                                updateItem(index, 'unit', material.unit);
                              }
                            }}
                            required
                          >
                            <option value="">Select Material</option>
                            {materials.map(material => {
                              const alreadySelectedInOtherItem = formData.items.some(
                                (existingItem, existingIndex) => existingIndex !== index && existingItem.materialId === material.id
                              );

                              return (
                                <option
                                  key={material.id}
                                  value={material.id}
                                  disabled={alreadySelectedInOtherItem}
                                  style={alreadySelectedInOtherItem ? { color: '#e74c3c', fontWeight: 600 } : undefined}
                                  title={alreadySelectedInOtherItem ? 'Already selected in another item' : material.name}
                                >
                                  {material.name}{alreadySelectedInOtherItem ? ' (Already added)' : ''}
                                </option>
                              );
                            })}
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
                          <label className="form-label">Discount %</label>
                          <input
                            type="number"
                            className="form-input"
                            value={item.discountPercent && item.discountPercent !== 0 ? item.discountPercent : ''}
                            onChange={(e) => handleDiscountChange(index, e.target.value)}
                            min="0"
                            max="100"
                            step="0.01"
                            placeholder="0"
                          />
                        </div>
                        <div className="form-group">
                          <label className="form-label">Net Rate</label>
                          <input
                            type="number"
                            className="form-input"
                            value={item.netRate ? item.netRate.toFixed(2) : '0.00'}
                            readOnly
                            style={{ backgroundColor: '#f5f5f5' }}
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
                            style={{ backgroundColor: '#f5f5f5' }}
                          />
                        </div>
                        <div className="form-group">
                          <label className="form-label">Total (Incl. GST)</label>
                          <input
                            type="number"
                            className="form-input"
                            value={item.totalInclGst.toFixed(2)}
                            readOnly
                            style={{ backgroundColor: '#f5f5f5' }}
                          />
                        </div>
                      </div>
                    )}
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
                    <th>Discount %</th>
                    <th>Net Rate</th>
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
                      <td>₹{Number(item.rate).toLocaleString()}</td>
                      <td>{item.discountPercent || 0}%</td>
                      <td>₹{Number(item.netRate || item.rate).toLocaleString()}</td>
                      <td>{item.gstPercent}%</td>
                      <td>₹{Number(item.totalExclGst).toLocaleString()}</td>
                      <td>₹{Number(item.totalInclGst).toLocaleString()}</td>
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
