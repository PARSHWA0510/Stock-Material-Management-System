import React, { useState, useEffect } from 'react';
import { inventoryService } from '../services/inventoryService';
import { godownService } from '../services/godownService';
import PDFOptionsModal from '../components/PDFOptionsModal';
import type { InventoryItem, StockTransaction, ApiError } from '../types';

const Inventory: React.FC = () => {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [godowns, setGodowns] = useState<any[]>([]);
  const [selectedGodown, setSelectedGodown] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showTransactions, setShowTransactions] = useState(false);
  const [transactions, setTransactions] = useState<StockTransaction[]>([]);
  const [selectedMaterial, setSelectedMaterial] = useState<string>('');
  const [showPDFModal, setShowPDFModal] = useState(false);

  useEffect(() => {
    fetchData();
  }, [selectedGodown]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(''); // Clear any previous errors
      const [inventoryData, godownsData] = await Promise.all([
        inventoryService.getInventory(selectedGodown || undefined),
        godownService.getAll()
      ]);

      setInventory(inventoryData);
      setGodowns(godownsData);
    } catch (error: unknown) {
      setError((error as ApiError)?.response?.data?.message || 'Failed to fetch inventory data');
    } finally {
      setLoading(false);
    }
  };

  const handleViewTransactions = async (materialId: string, materialName: string) => {
    try {
      setSelectedMaterial(materialName);
      const transactionsData = await inventoryService.getStockTransactions({
        materialId,
        limit: 20
      });
      setTransactions(transactionsData);
      setShowTransactions(true);
    } catch (error: unknown) {
      setError((error as ApiError)?.response?.data?.message || 'Failed to fetch transactions');
    }
  };

  const getTotalValue = () => {
    return inventory.reduce((sum, item) => sum + item.totalValue, 0);
  };

  const getTotalQuantity = () => {
    return inventory.reduce((sum, item) => sum + item.quantity, 0);
  };

  const getGodownSummary = () => {
    const godownSummary: { [key: string]: { quantity: number; value: number; materials: number } } = {};
    
    inventory.forEach(item => {
      const godownName = item.godown?.name || 'Direct';
      if (!godownSummary[godownName]) {
        godownSummary[godownName] = { quantity: 0, value: 0, materials: 0 };
      }
      godownSummary[godownName].quantity += item.quantity;
      godownSummary[godownName].value += item.totalValue;
      godownSummary[godownName].materials += 1;
    });

    return godownSummary;
  };

  if (loading) {
    return (
      <div className="header">
        <h1>Inventory</h1>
        <div>Loading...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="header">
        <h1>Inventory</h1>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button
            className="btn btn-primary"
            onClick={() => setShowPDFModal(true)}
            disabled={inventory.length === 0}
          >
            Download PDF
          </button>
          <select
            className="form-select"
            value={selectedGodown}
            onChange={(e) => setSelectedGodown(e.target.value)}
            style={{ width: '200px' }}
          >
            <option value="">All Godowns</option>
            {godowns.map(godown => (
              <option key={godown.id} value={godown.id}>{godown.name}</option>
            ))}
          </select>
          <button 
            className="btn btn-secondary"
            onClick={fetchData}
          >
            Refresh
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

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '30px' }}>
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#2c3e50' }}>
            {inventory.length}
          </div>
          <div style={{ color: '#7f8c8d' }}>Materials in Stock</div>
        </div>
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#27ae60' }}>
            {getTotalQuantity().toLocaleString()}
          </div>
          <div style={{ color: '#7f8c8d' }}>Total Quantity</div>
        </div>
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#3498db' }}>
            ₹{getTotalValue().toLocaleString()}
          </div>
          <div style={{ color: '#7f8c8d' }}>Total Value</div>
        </div>
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#e67e22' }}>
            {Object.keys(getGodownSummary()).length}
          </div>
          <div style={{ color: '#7f8c8d' }}>Godowns</div>
        </div>
      </div>

      {/* Godown Summary */}
      <div className="card" style={{ marginBottom: '30px' }}>
        <div className="card-header">
          <h3 className="card-title">Godown Summary</h3>
        </div>
        <div style={{ padding: '20px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '15px' }}>
            {Object.entries(getGodownSummary()).map(([godownName, summary]) => (
              <div key={godownName} style={{ 
                border: '1px solid #ddd', 
                borderRadius: '8px', 
                padding: '15px',
                backgroundColor: '#f8f9fa'
              }}>
                <div style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '10px', color: '#2c3e50' }}>
                  {godownName}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '14px' }}>
                  <div>
                    <div style={{ color: '#7f8c8d' }}>Materials</div>
                    <div style={{ fontWeight: 'bold' }}>{summary.materials}</div>
                  </div>
                  <div>
                    <div style={{ color: '#7f8c8d' }}>Quantity</div>
                    <div style={{ fontWeight: 'bold' }}>{summary.quantity.toLocaleString()}</div>
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <div style={{ color: '#7f8c8d' }}>Value</div>
                    <div style={{ fontWeight: 'bold', color: '#27ae60' }}>₹{summary.value.toLocaleString()}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Detailed Inventory Table */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">
            {selectedGodown ? 
              `Stock Details - ${godowns.find(g => g.id === selectedGodown)?.name}` : 
              'Stock Details - All Godowns'
            }
          </h3>
        </div>
        <table className="table">
          <thead>
            <tr>
              <th>Material</th>
              <th>Godown</th>
              <th>Quantity</th>
              <th>Unit</th>
              <th>Total Value</th>
              <th>Last Updated</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {inventory.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: '#7f8c8d' }}>
                  {selectedGodown ? 'No stock available in selected godown' : 'No stock available'}
                </td>
              </tr>
            ) : (
              inventory.map((item) => (
                <tr key={`${item.material.id}-${item.godown?.id || 'direct'}`}>
                  <td>
                    <div style={{ fontWeight: 'bold' }}>{item.material.name}</div>
                    {item.material.hsnSac && (
                      <div style={{ fontSize: '12px', color: '#7f8c8d' }}>
                        HSN: {item.material.hsnSac}
                      </div>
                    )}
                  </td>
                  <td>
                    <div style={{ fontWeight: '500' }}>
                      {item.godown?.name || 'Direct Delivery'}
                    </div>
                    {item.godown?.address && (
                      <div style={{ fontSize: '12px', color: '#7f8c8d' }}>
                        {item.godown.address}
                      </div>
                    )}
                  </td>
                  <td>
                    <div style={{ fontWeight: 'bold', color: '#27ae60' }}>
                      {item.quantity.toLocaleString()}
                    </div>
                  </td>
                  <td>{item.material.unit}</td>
                  <td>
                    <div style={{ fontWeight: 'bold', color: '#3498db' }}>
                      ₹{item.totalValue.toLocaleString()}
                    </div>
                  </td>
                  <td>
                    <div style={{ fontSize: '12px' }}>
                      {new Date(item.lastUpdated).toLocaleDateString()}
                    </div>
                    <div style={{ fontSize: '11px', color: '#7f8c8d' }}>
                      {new Date(item.lastUpdated).toLocaleTimeString()}
                    </div>
                  </td>
                  <td>
                    <button 
                      className="btn btn-secondary"
                      onClick={() => handleViewTransactions(item.material.id, item.material.name)}
                      style={{ fontSize: '12px', padding: '5px 10px' }}
                    >
                      View History
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Transactions Modal */}
      {showTransactions && (
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
            maxWidth: '1000px',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3>Transaction History - {selectedMaterial}</h3>
              <button 
                className="btn btn-secondary"
                onClick={() => setShowTransactions(false)}
              >
                Close
              </button>
            </div>

            <table className="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Quantity</th>
                  <th>Rate</th>
                  <th>Balance After</th>
                  <th>Godown</th>
                  <th>Site</th>
                  <th>Reference</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx) => (
                  <tr key={tx.id}>
                    <td>
                      <div style={{ fontSize: '12px' }}>
                        {new Date(tx.txDate).toLocaleDateString()}
                      </div>
                      <div style={{ fontSize: '11px', color: '#7f8c8d' }}>
                        {new Date(tx.txDate).toLocaleTimeString()}
                      </div>
                    </td>
                    <td>
                      <span style={{
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontWeight: 'bold',
                        backgroundColor: tx.txType === 'IN' ? '#d4edda' : '#f8d7da',
                        color: tx.txType === 'IN' ? '#155724' : '#721c24'
                      }}>
                        {tx.txType}
                      </span>
                    </td>
                    <td style={{ fontWeight: 'bold' }}>{tx.quantity}</td>
                    <td>₹{tx.rate.toLocaleString()}</td>
                    <td style={{ fontWeight: 'bold' }}>{tx.balanceAfter}</td>
                    <td>{tx.godown?.name || '-'}</td>
                    <td>{tx.site?.name || '-'}</td>
                    <td>
                      <div style={{ fontSize: '11px' }}>
                        {tx.referenceTable}
                      </div>
                      <div style={{ fontSize: '10px', color: '#7f8c8d' }}>
                        {tx.referenceId.substring(0, 8)}...
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* PDF Options Modal */}
      <PDFOptionsModal
        isOpen={showPDFModal}
        onClose={() => setShowPDFModal(false)}
        type="inventory"
        data={inventory}
        godowns={godowns}
      />
    </div>
  );
};

export default Inventory;
