import React, { useState, useEffect } from 'react';
import { materialService } from '../services/materialService';
import type { Material, CreateMaterialRequest, ApiError } from '../types/index';
import { useAuth } from '../contexts/AuthContext';

const Materials: React.FC = () => {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);
  const [formData, setFormData] = useState<CreateMaterialRequest>({
    name: '',
    unit: '',
    hsnSac: ''
  });

  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  useEffect(() => {
    fetchMaterials();
  }, []);

  const fetchMaterials = async () => {
    try {
      setLoading(true);
      const data = await materialService.getAll();
      setMaterials(data);
    } catch (error: unknown) {
      setError((error as ApiError)?.response?.data?.message || 'Failed to fetch materials');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingMaterial) {
        await materialService.update(editingMaterial.id, formData);
      } else {
        await materialService.create(formData);
      }
      setShowModal(false);
      setEditingMaterial(null);
      setFormData({ name: '', unit: '', hsnSac: '' });
      fetchMaterials();
    } catch (error: unknown) {
      setError((error as ApiError)?.response?.data?.message || 'Failed to save material');
    }
  };

  const handleEdit = (material: Material) => {
    setEditingMaterial(material);
    setFormData({
      name: material.name,
      unit: material.unit,
      hsnSac: material.hsnSac || ''
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this material?')) {
      try {
        await materialService.delete(id);
        fetchMaterials();
      } catch (error: unknown) {
        setError((error as ApiError)?.response?.data?.message || 'Failed to delete material');
      }
    }
  };

  const handleAddNew = () => {
    setEditingMaterial(null);
    setFormData({ name: '', unit: '', hsnSac: '' });
    setShowModal(true);
  };

  if (loading) {
    return (
      <div className="header">
        <h1>Materials Master</h1>
        <div>Loading...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="header">
        <h1>Materials Master</h1>
        {isAdmin && (
          <button className="btn btn-primary" onClick={handleAddNew}>
            Add Material
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
          <h3 className="card-title">Materials List</h3>
        </div>
        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Unit</th>
              <th>HSN/SAC</th>
              <th>Created</th>
              {isAdmin && <th>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {materials.map((material) => (
              <tr key={material.id}>
                <td>{material.name}</td>
                <td>{material.unit}</td>
                <td>{material.hsnSac || '-'}</td>
                <td>{new Date(material.createdAt).toLocaleDateString()}</td>
                {isAdmin && (
                  <td>
                    <button 
                      className="btn btn-secondary" 
                      style={{ marginRight: '5px' }}
                      onClick={() => handleEdit(material)}
                    >
                      Edit
                    </button>
                    <button 
                      className="btn btn-danger"
                      onClick={() => handleDelete(material.id)}
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
            <h3>{editingMaterial ? 'Edit Material' : 'Add Material'}</h3>
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
                <label className="form-label">Unit</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.unit}
                  onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">HSN/SAC</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.hsnSac}
                  onChange={(e) => setFormData({ ...formData, hsnSac: e.target.value })}
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
                  {editingMaterial ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Materials;
