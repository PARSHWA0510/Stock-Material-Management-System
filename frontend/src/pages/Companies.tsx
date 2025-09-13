import React, { useState, useEffect } from 'react';
import { companyService } from '../services/companyService';
import type { Company, CreateCompanyRequest, ApiError } from '../types';
import { useAuth } from '../contexts/AuthContext';

const Companies: React.FC = () => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [formData, setFormData] = useState<CreateCompanyRequest>({
    name: '',
    gstin: '',
    address: ''
  });

  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  useEffect(() => {
    fetchCompanies();
  }, []);

  const fetchCompanies = async () => {
    try {
      setLoading(true);
      const data = await companyService.getAll();
      setCompanies(data);
    } catch (error: unknown) {
      setError((error as ApiError)?.response?.data?.message || 'Failed to fetch companies');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingCompany) {
        await companyService.update(editingCompany.id, formData);
      } else {
        await companyService.create(formData);
      }
      setShowModal(false);
      setEditingCompany(null);
      setFormData({ name: '', gstin: '', address: '' });
      fetchCompanies();
    } catch (error: unknown) {
      setError((error as ApiError)?.response?.data?.message || 'Failed to save company');
    }
  };

  const handleEdit = (company: Company) => {
    setEditingCompany(company);
    setFormData({
      name: company.name,
      gstin: company.gstin || '',
      address: company.address || ''
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this company?')) {
      try {
        await companyService.delete(id);
        fetchCompanies();
      } catch (error: unknown) {
        setError((error as ApiError)?.response?.data?.message || 'Failed to delete company');
      }
    }
  };

  const handleAddNew = () => {
    setEditingCompany(null);
    setFormData({ name: '', gstin: '', address: '' });
    setShowModal(true);
  };

  if (loading) {
    return (
      <div className="header">
        <h1>Companies</h1>
        <div>Loading...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="header">
        <h1>Companies</h1>
        {isAdmin && (
          <button className="btn btn-primary" onClick={handleAddNew}>
            Add Company
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
          <h3 className="card-title">Companies List</h3>
        </div>
        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>GSTIN</th>
              <th>Address</th>
              <th>Created</th>
              {isAdmin && <th>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {companies.map((company) => (
              <tr key={company.id}>
                <td>{company.name}</td>
                <td>{company.gstin || '-'}</td>
                <td>{company.address || '-'}</td>
                <td>{new Date(company.createdAt).toLocaleDateString()}</td>
                {isAdmin && (
                  <td>
                    <button 
                      className="btn btn-secondary" 
                      style={{ marginRight: '5px' }}
                      onClick={() => handleEdit(company)}
                    >
                      Edit
                    </button>
                    <button 
                      className="btn btn-danger"
                      onClick={() => handleDelete(company.id)}
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
            <h3>{editingCompany ? 'Edit Company' : 'Add Company'}</h3>
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
                <label className="form-label">GSTIN</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.gstin}
                  onChange={(e) => setFormData({ ...formData, gstin: e.target.value })}
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
                  {editingCompany ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Companies;
