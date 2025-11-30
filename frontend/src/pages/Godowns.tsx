import React, { useState, useEffect } from 'react';
import { godownService } from '../services/godownService';
import type { Godown, CreateGodownRequest, ApiError } from '../types';
import { useAuth } from '../contexts/AuthContext';

const Godowns: React.FC = () => {
  const [godowns, setGodowns] = useState<Godown[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingGodown, setEditingGodown] = useState<Godown | null>(null);
  const [formData, setFormData] = useState<CreateGodownRequest>({
    name: '',
    address: ''
  });

  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  useEffect(() => {
    fetchGodowns();
  }, []);

  const fetchGodowns = async () => {
    try {
      setLoading(true);
      setError(''); // Clear any previous errors
      const data = await godownService.getAll();
      setGodowns(data);
    } catch (error: unknown) {
      setError((error as ApiError)?.response?.data?.message || 'Failed to fetch godowns');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError(''); // Clear any previous errors
      if (editingGodown) {
        await godownService.update(editingGodown.id, formData);
      } else {
        await godownService.create(formData);
      }
      setError(''); // Clear error on success
      setShowModal(false);
      setEditingGodown(null);
      setFormData({ name: '', address: '' });
      fetchGodowns();
    } catch (error: unknown) {
      setError((error as ApiError)?.response?.data?.message || 'Failed to save godown');
    }
  };

  const handleEdit = (godown: Godown) => {
    setError(''); // Clear any previous errors
    setEditingGodown(godown);
    setFormData({
      name: godown.name,
      address: godown.address || ''
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this godown?')) {
      try {
        setError(''); // Clear any previous errors
        await godownService.delete(id);
        setError(''); // Clear error on success
        fetchGodowns();
      } catch (error: unknown) {
        setError((error as ApiError)?.response?.data?.message || 'Failed to delete godown');
      }
    }
  };

  const handleAddNew = () => {
    setError(''); // Clear any previous errors
    setEditingGodown(null);
    setFormData({ name: '', address: '' });
    setShowModal(true);
  };

  if (loading) {
    return (
      <div className="header">
        <h1>Godowns</h1>
        <div>Loading...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="header">
        <h1>Godowns</h1>
        <div>
          <button className="btn btn-primary" onClick={handleAddNew}>
            Add Godown
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
          <h3 className="card-title">Godowns List</h3>
        </div>
        <div className="table-wrapper">
          <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Address</th>
              <th>Created At</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {godowns.map((godown) => (
              <tr key={godown.id}>
                <td>{godown.name}</td>
                <td>{godown.address || 'N/A'}</td>
                <td>{new Date(godown.createdAt).toLocaleDateString()}</td>
                <td>
                  <button 
                    className="btn btn-secondary" 
                    style={{ marginRight: '5px' }}
                    onClick={() => handleEdit(godown)}
                  >
                    Edit
                  </button>
                  {isAdmin && (
                    <button 
                      className="btn btn-danger"
                      onClick={() => handleDelete(godown.id)}
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
            maxWidth: '500px'
          }}>
            <h3>{editingGodown ? 'Edit Godown' : 'Add Godown'}</h3>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Name</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Address</label>
                <textarea
                  className="form-input"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  rows={3}
                />
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
                  {editingGodown ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Godowns;
