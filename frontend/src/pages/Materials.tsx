import React, { useState, useEffect, useRef } from 'react';
import { materialService } from '../services/materialService';
import type { Material, CreateMaterialRequest, ApiError } from '../types/index';
import { useAuth } from '../contexts/AuthContext';
import * as XLSX from 'xlsx';

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
      setError(''); // Clear any previous errors
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
    
    // If Excel data is parsed, upload that instead
    if (!editingMaterial && parsedMaterials.length > 0) {
      await handleExcelUpload();
      return;
    }

    try {
      setError(''); // Clear any previous errors
      if (editingMaterial) {
        await materialService.update(editingMaterial.id, formData);
      } else {
        await materialService.create(formData);
      }
      setError(''); // Clear error on success
      setShowModal(false);
      setEditingMaterial(null);
      setFormData({ name: '', unit: '', hsnSac: '' });
      fetchMaterials();
    } catch (error: unknown) {
      setError((error as ApiError)?.response?.data?.message || 'Failed to save material');
    }
  };

  const handleEdit = (material: Material) => {
    setError(''); // Clear any previous errors
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
        setError(''); // Clear any previous errors
        await materialService.delete(id);
        setError(''); // Clear error on success
        fetchMaterials();
      } catch (error: unknown) {
        setError((error as ApiError)?.response?.data?.message || 'Failed to delete material');
      }
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingMaterial(null);
    setFormData({ name: '', unit: '', hsnSac: '' });
    setParsedMaterials([]);
    setShowPreview(false);
    setShowPreviewModal(false);
    setUploadResults(null);
    setError('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleAddNew = () => {
    setEditingMaterial(null);
    setFormData({ name: '', unit: '', hsnSac: '' });
    setParsedMaterials([]);
    setShowPreview(false);
    setShowPreviewModal(false);
    setUploadResults(null);
    setError('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setShowModal(true);
  };

  interface UploadResult {
    message: string;
    results: {
      created: Material[];
      skipped: Array<{ name: string; reason: string }>;
      errors: Array<{ name: string; error: string }>;
    };
  }

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [parsedMaterials, setParsedMaterials] = useState<CreateMaterialRequest[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [uploadResults, setUploadResults] = useState<UploadResult | null>(null);

  const handleExcelFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setError('');
      setUploadResults(null);

      // Read Excel file
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      // Validate and transform data
      const materials: CreateMaterialRequest[] = (jsonData as Record<string, unknown>[]).map((row) => ({
        name: (row.Name || row.name || '') as string,
        unit: (row.Unit || row.unit || '') as string,
        hsnSac: (row['HSN/SAC'] || row.HSN || row.SAC || row.hsnSac || row.hsn || row.sac || '') as string
      })).filter((material: CreateMaterialRequest) => material.name.trim() !== '' && material.unit.trim() !== '');

      if (materials.length === 0) {
        setError('No valid materials found in the Excel file. Please ensure the file has "Name" and "Unit" columns.');
        setParsedMaterials([]);
        setShowPreview(false);
        return;
      }

      setParsedMaterials(materials);
      setShowPreview(true);
    } catch {
      setError('Failed to parse Excel file. Please ensure it is a valid Excel file.');
      setParsedMaterials([]);
      setShowPreview(false);
    }
  };

  const handleExcelUpload = async () => {
    if (parsedMaterials.length === 0) {
      setError('No materials to upload. Please select an Excel file first.');
      return;
    }

    try {
      setUploading(true);
      setError('');

      // Upload to backend
      const result = await materialService.bulkCreate(parsedMaterials);
      
      setUploadResults(result);
      
      // If there are errors, keep them visible and don't close modal
      if (result.results && result.results.errors.length > 0) {
        setError(result.message || 'Upload completed with errors');
        setUploading(false);
        return;
      }
      
      // Only refresh and close if successful (no errors)
      fetchMaterials();
      
      // Close modals and clear preview after successful upload
      setShowModal(false);
      setParsedMaterials([]);
      setShowPreview(false);
      setShowPreviewModal(false);
      setUploadResults(null);
      setFormData({ name: '', unit: '', hsnSac: '' });
      setError('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error: unknown) {
      const apiError = error as ApiError;
      const errorMessage = apiError?.response?.data?.message || 'Failed to upload Excel file';
      const errorData = apiError?.response?.data as { results?: UploadResult['results'] };
      const errorResults = errorData?.results;
      
      setError(errorMessage);
      
      // If backend returned error results, show them
      if (errorResults) {
        setUploadResults({
          message: errorMessage,
          results: errorResults
        });
      }
    } finally {
      setUploading(false);
    }
  };

  const handleClearPreview = () => {
    setParsedMaterials([]);
    setShowPreview(false);
    setShowPreviewModal(false);
    setUploadResults(null);
    setFormData({ name: '', unit: '', hsnSac: '' });
    setError('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
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
        <div>
          <button className="btn btn-primary" onClick={handleAddNew}>
            Add Material
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
          <h3 className="card-title">Materials List</h3>
        </div>
        <div className="table-wrapper">
          <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Unit</th>
              <th>HSN/SAC</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {materials.map((material) => (
              <tr key={material.id}>
                <td>{material.name}</td>
                <td>{material.unit}</td>
                <td>{material.hsnSac || '-'}</td>
                <td>{new Date(material.createdAt).toLocaleDateString()}</td>
                <td>
                  <button 
                    className="btn btn-secondary" 
                    style={{ marginRight: '5px' }}
                    onClick={() => handleEdit(material)}
                  >
                    Edit
                  </button>
                  {isAdmin && (
                    <button 
                      className="btn btn-danger"
                      onClick={() => handleDelete(material.id)}
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
            width: '400px',
            maxWidth: '90%'
          }}>
            <h3>{editingMaterial ? 'Edit Material' : 'Add Material'}</h3>
            {!editingMaterial && (
              <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#f0f8ff', borderRadius: '4px', border: '1px solid #4a90e2' }}>
                <label style={{ display: 'block', marginBottom: '10px', fontWeight: '500' }}>
                  Upload Excel File (Optional)
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleExcelFileSelect}
                  disabled={uploading}
                  style={{ marginBottom: '10px', width: '100%' }}
                />
                <div style={{ fontSize: '12px', color: '#666', marginBottom: '10px' }}>
                  Excel format: Columns should be "Name", "Unit", "HSN/SAC" (optional)
                </div>
                
                {showPreview && parsedMaterials.length > 0 && (
                  <div style={{ marginTop: '15px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
                      <strong style={{ color: '#28a745' }}>✓ {parsedMaterials.length} materials parsed successfully</strong>
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={() => setShowPreviewModal(true)}
                        style={{ padding: '6px 12px', fontSize: '14px' }}
                      >
                        View Preview
                      </button>
                    </div>
                  </div>
                )}

                {uploadResults && (
                  <div style={{ marginTop: '15px', padding: '10px', backgroundColor: uploadResults.results.errors.length > 0 ? '#fff3cd' : '#d4edda', borderRadius: '4px', border: `1px solid ${uploadResults.results.errors.length > 0 ? '#ffc107' : '#28a745'}` }}>
                    <strong style={{ display: 'block', marginBottom: '8px' }}>Upload Results:</strong>
                    <div style={{ fontSize: '12px' }}>
                      <div style={{ color: '#28a745' }}>✓ Created: {uploadResults.results.created.length}</div>
                      {uploadResults.results.skipped.length > 0 && (
                        <div style={{ color: '#ffc107', marginTop: '4px' }}>
                          ⚠ Skipped: {uploadResults.results.skipped.length}
                          <ul style={{ margin: '4px 0 0 20px', padding: 0 }}>
                            {uploadResults.results.skipped.map((item, idx) => (
                              <li key={idx}>{item.name}: {item.reason}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {uploadResults.results.errors.length > 0 && (
                        <div style={{ color: '#dc3545', marginTop: '4px' }}>
                          ✗ Errors: {uploadResults.results.errors.length}
                          <ul style={{ margin: '4px 0 0 20px', padding: 0 }}>
                            {uploadResults.results.errors.map((item, idx) => (
                              <li key={idx}>{item.name}: {item.error}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
            <form onSubmit={handleSubmit}>
              {parsedMaterials.length === 0 && (
                <>
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
                </>
              )}
              {parsedMaterials.length > 0 && (
                <div style={{ padding: '15px', backgroundColor: '#e7f3ff', borderRadius: '4px', marginBottom: '20px', textAlign: 'center' }}>
                  <div style={{ fontSize: '14px', color: '#0066cc' }}>
                    ✓ {parsedMaterials.length} materials ready to upload from Excel file
                  </div>
                  <div style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
                    Manual entry fields are hidden. Click "Add {parsedMaterials.length} Materials" to upload.
                  </div>
                </div>
              )}
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button 
                  type="button" 
                  className="btn btn-secondary"
                  onClick={handleCloseModal}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary" 
                  disabled={uploading || (uploadResults?.results?.errors && uploadResults.results.errors.length > 0 && parsedMaterials.length > 0)}
                >
                  {uploading ? 'Uploading...' : editingMaterial ? 'Update' : parsedMaterials.length > 0 ? `Add ${parsedMaterials.length} Materials` : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Full Screen Preview Modal */}
      {showPreviewModal && parsedMaterials.length > 0 && (
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
          zIndex: 2000
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '30px',
            borderRadius: '8px',
            width: '95%',
            height: '90%',
            maxWidth: '1200px',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2>Preview - {parsedMaterials.length} Materials</h2>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleClearPreview}
                >
                  Clear & Close
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowPreviewModal(false)}
                >
                  Close
                </button>
              </div>
            </div>
            
            <div style={{ flex: 1, overflow: 'auto', border: '1px solid #ddd', borderRadius: '4px' }}>
              <table className="table" style={{ width: '100%', margin: 0 }}>
                <thead style={{ backgroundColor: '#f5f5f5', position: 'sticky', top: 0, zIndex: 10 }}>
                  <tr>
                    <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #ddd' }}>#</th>
                    <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #ddd' }}>Name</th>
                    <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #ddd' }}>Unit</th>
                    <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #ddd' }}>HSN/SAC</th>
                  </tr>
                </thead>
                <tbody>
                  {parsedMaterials.map((material, index) => (
                    <tr key={index} style={{ borderBottom: '1px solid #eee' }}>
                      <td style={{ padding: '12px' }}>{index + 1}</td>
                      <td style={{ padding: '12px' }}>{material.name}</td>
                      <td style={{ padding: '12px' }}>{material.unit}</td>
                      <td style={{ padding: '12px' }}>{material.hsnSac || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid #ddd', textAlign: 'center' }}>
              <div style={{ fontSize: '14px', color: '#666', marginBottom: '10px' }}>
                Total: {parsedMaterials.length} materials ready to upload
              </div>
              <div style={{ fontSize: '12px', color: '#999' }}>
                Click "Add {parsedMaterials.length} Materials" button in the main form to upload
              </div>
            </div>

            {uploadResults && (
              <div style={{ marginTop: '20px', padding: '15px', backgroundColor: uploadResults.results.errors.length > 0 ? '#fff3cd' : '#d4edda', borderRadius: '4px', border: `1px solid ${uploadResults.results.errors.length > 0 ? '#ffc107' : '#28a745'}` }}>
                <strong style={{ display: 'block', marginBottom: '10px', fontSize: '16px' }}>Upload Results:</strong>
                <div style={{ fontSize: '14px' }}>
                  <div style={{ color: '#28a745', marginBottom: '8px' }}>✓ Created: {uploadResults.results.created.length}</div>
                  {uploadResults.results.skipped.length > 0 && (
                    <div style={{ color: '#ffc107', marginTop: '8px' }}>
                      ⚠ Skipped: {uploadResults.results.skipped.length}
                      <ul style={{ margin: '8px 0 0 20px', padding: 0 }}>
                        {uploadResults.results.skipped.map((item, idx) => (
                          <li key={idx} style={{ marginBottom: '4px' }}>{item.name}: {item.reason}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {uploadResults.results.errors.length > 0 && (
                    <div style={{ color: '#dc3545', marginTop: '8px' }}>
                      ✗ Errors: {uploadResults.results.errors.length}
                      <ul style={{ margin: '8px 0 0 20px', padding: 0 }}>
                        {uploadResults.results.errors.map((item, idx) => (
                          <li key={idx} style={{ marginBottom: '4px' }}>{item.name}: {item.error}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Materials;
