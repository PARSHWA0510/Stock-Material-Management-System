import React, { useState, useEffect } from 'react';
import { siteService } from '../services/siteService';
import type { Site, CreateSiteRequest, ApiError } from '../types';
import { useAuth } from '../contexts/AuthContext';

const Sites: React.FC = () => {
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingSite, setEditingSite] = useState<Site | null>(null);
  const [formData, setFormData] = useState<CreateSiteRequest>({
    name: '',
    address: ''
  });

  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  useEffect(() => {
    fetchSites();
  }, []);

  const fetchSites = async () => {
    try {
      setLoading(true);
      setError(''); // Clear any previous errors
      const data = await siteService.getAll();
      setSites(data);
    } catch (error: unknown) {
      setError((error as ApiError)?.response?.data?.message || 'Failed to fetch sites');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError(''); // Clear any previous errors
      if (editingSite) {
        await siteService.update(editingSite.id, formData);
      } else {
        await siteService.create(formData);
      }
      setError(''); // Clear error on success
      setShowModal(false);
      setEditingSite(null);
      setFormData({ name: '', address: '' });
      fetchSites();
    } catch (error: unknown) {
      setError((error as ApiError)?.response?.data?.message || 'Failed to save site');
    }
  };

  const handleEdit = (site: Site) => {
    setEditingSite(site);
    setFormData({
      name: site.name,
      address: site.address || ''
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this site?')) {
      try {
        setError(''); // Clear any previous errors
        await siteService.delete(id);
        setError(''); // Clear error on success
        fetchSites();
      } catch (error: unknown) {
        setError((error as ApiError)?.response?.data?.message || 'Failed to delete site');
      }
    }
  };

  const handleAddNew = () => {
    setError(''); // Clear any previous errors
    setEditingSite(null);
    setFormData({ name: '', address: '' });
    setShowModal(true);
  };

  if (loading) {
    return (
      <div className="header">
        <h1>Sites</h1>
        <div>Loading...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="header">
        <h1>Sites</h1>
        {isAdmin && (
          <button className="btn btn-primary" onClick={handleAddNew}>
            Add Site
          </button>
        )}
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
          <h3 className="card-title">Sites List</h3>
        </div>
        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Address</th>
              <th>Created</th>
              {isAdmin && <th>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {sites.map((site) => (
              <tr key={site.id}>
                <td>{site.name}</td>
                <td>{site.address || '-'}</td>
                <td>{new Date(site.createdAt).toLocaleDateString()}</td>
                {isAdmin && (
                  <td>
                    <button 
                      className="btn btn-secondary" 
                      style={{ marginRight: '5px' }}
                      onClick={() => handleEdit(site)}
                    >
                      Edit
                    </button>
                    <button 
                      className="btn btn-danger"
                      onClick={() => handleDelete(site.id)}
                    >
                      Delete
                    </button>
                  </td>
                )}
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
            width: '400px',
            maxWidth: '90%'
          }}>
            <h3>{editingSite ? 'Edit Site' : 'Add Site'}</h3>
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
                  {editingSite ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Sites;
