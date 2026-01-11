import React, { useState, useEffect } from 'react';
import {
  generateMaterialWiseOverviewPDF,
  generateMaterialWiseSitesOverviewPDF,
  generateMaterialWiseSiteDetailsPDF,
  generateSiteWisePDF,
  generateGodownInventoryPDF
} from '../utils/pdfGenerator';
import {
  generateMaterialWiseOverviewExcel,
  generateMaterialWiseSitesOverviewExcel,
  generateMaterialWiseSiteDetailsExcel,
  generateSiteWiseExcel,
  generateGodownInventoryExcel
} from '../utils/excelGenerator';
import { reportsService } from '../services/reportsService';

// Component for selecting site when material is selected
const MaterialSiteSelector: React.FC<{
  selectedMaterial: string;
  selectedSite: string;
  onSiteChange: (site: string) => void;
}> = ({ selectedMaterial, selectedSite, onSiteChange }) => {
  const [sites, setSites] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (selectedMaterial) {
      setLoading(true);
      reportsService.getMaterialWiseReports(selectedMaterial)
        .then((materialData: any) => {
          const siteNames = materialData.distribution?.map((d: any) => d.siteName) || [];
          setSites(siteNames);
        })
        .catch((error) => {
          console.error('Error fetching sites:', error);
          setSites([]);
        })
        .finally(() => setLoading(false));
    }
  }, [selectedMaterial]);

  return (
    <div style={{ marginBottom: '15px' }}>
      <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
        Select Site:
      </label>
      <select
        className="form-select"
        value={selectedSite}
        onChange={(e) => onSiteChange(e.target.value)}
        style={{ width: '100%' }}
        disabled={loading || !selectedMaterial}
      >
        <option value="">-- Select Site --</option>
        {loading ? (
          <option value="" disabled>Loading sites...</option>
        ) : (
          sites.map((siteName, idx) => (
            <option key={idx} value={siteName}>{siteName}</option>
          ))
        )}
      </select>
    </div>
  );
};

interface PDFOptionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'material' | 'site' | 'inventory' | 'reports';
  data: any;
  materialName?: string;
  siteName?: string;
  godownName?: string;
  godowns?: any[];
  sites?: any[];
}

const PDFOptionsModal: React.FC<PDFOptionsModalProps> = ({
  isOpen,
  onClose,
  type,
  data,
  materialName,
  siteName: _siteName,
  godownName: _godownName,
  godowns = [],
  sites: _sites = []
}) => {
  const [selectedOption, setSelectedOption] = useState<string>('');
  const [selectedFormat, setSelectedFormat] = useState<'pdf' | 'excel' | ''>('');
  const [selectedSite, setSelectedSite] = useState<string>('');
  const [selectedGodown, setSelectedGodown] = useState<string>('');
  const [selectedMaterial, setSelectedMaterial] = useState<string>('');

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedOption('');
      setSelectedFormat('');
      setSelectedSite('');
      setSelectedGodown('');
      setSelectedMaterial('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleDownload = async () => {
    // Validate format is selected
    if (!selectedFormat || (selectedFormat !== 'pdf' && selectedFormat !== 'excel')) {
      alert('Please select a format (PDF or Excel)');
      return;
    }

    // Validate report type is selected
    if (!selectedOption) {
      alert('Please select a report type');
      return;
    }

    try {
      if (type === 'reports') {
        // Reports type - handle all report options
        // Extract siteReports and materialReports from data object
        // data.siteReports might be the full response object with { siteReports: [...], summary: {...} }
        // or it might be the array directly
        const siteReportsData = data.siteReports;
        const siteReportsArray = Array.isArray(siteReportsData) 
          ? siteReportsData 
          : (siteReportsData?.siteReports || []);
        
        const materialReportsData = data.materialReports;
        const materialReportsArray = Array.isArray(materialReportsData)
          ? materialReportsData
          : (materialReportsData?.materialReports || []);
        
        if (selectedOption === 'all-materials-overview') {
          const materialData = { materialReports: materialReportsArray };
          if (selectedFormat === 'pdf') {
            generateMaterialWiseOverviewPDF(materialData);
          } else if (selectedFormat === 'excel') {
            generateMaterialWiseOverviewExcel(materialData);
          }
        } else if (selectedOption === 'material-sites-overview') {
          if (materialName) {
            // Already viewing a specific material
            if (selectedFormat === 'pdf') {
              generateMaterialWiseSitesOverviewPDF(data.selectedMaterialReport || data);
            } else if (selectedFormat === 'excel') {
              generateMaterialWiseSitesOverviewExcel(data.selectedMaterialReport || data);
            }
          } else if (selectedMaterial) {
            // Need to fetch material details
            const materialData = await reportsService.getMaterialWiseReports(selectedMaterial);
            if (selectedFormat === 'pdf') {
              generateMaterialWiseSitesOverviewPDF(materialData);
            } else if (selectedFormat === 'excel') {
              generateMaterialWiseSitesOverviewExcel(materialData);
            }
          }
        } else if (selectedOption === 'material-site-details') {
          if (materialName && selectedSite) {
            // Already viewing a specific material
            if (selectedFormat === 'pdf') {
              generateMaterialWiseSiteDetailsPDF(data.selectedMaterialReport || data, selectedSite);
            } else if (selectedFormat === 'excel') {
              generateMaterialWiseSiteDetailsExcel(data.selectedMaterialReport || data, selectedSite);
            }
          } else if (selectedMaterial && selectedSite) {
            // Need to fetch material details
            const materialData = await reportsService.getMaterialWiseReports(selectedMaterial);
            if (selectedFormat === 'pdf') {
              generateMaterialWiseSiteDetailsPDF(materialData, selectedSite);
            } else if (selectedFormat === 'excel') {
              generateMaterialWiseSiteDetailsExcel(materialData, selectedSite);
            }
          }
        } else if (selectedOption === 'all-sites-overview') {
          const siteData = { siteReports: siteReportsArray, summary: siteReportsData?.summary };
          if (selectedFormat === 'pdf') {
            generateSiteWisePDF(siteData, undefined, 'overview');
          } else if (selectedFormat === 'excel') {
            generateSiteWiseExcel(siteData, undefined, 'overview');
          }
        } else if (selectedOption === 'site-wise-report') {
          // Use the selected site from Reports page if available
          const selectedSiteData = data.selectedSite;
          if (selectedSiteData) {
            if (selectedFormat === 'pdf') {
              generateSiteWisePDF({
                site: selectedSiteData.site,
                materials: selectedSiteData.materials
              }, selectedSiteData.site.name, 'details');
            } else if (selectedFormat === 'excel') {
              generateSiteWiseExcel({
                site: selectedSiteData.site,
                materials: selectedSiteData.materials
              }, selectedSiteData.site.name, 'details');
            }
          } else if (selectedSite) {
            // Fallback: find site by ID if selectedSite is provided
            const site = siteReportsArray.find((r: any) => r.site.id === selectedSite || r.site.name === selectedSite);
            if (site) {
              if (selectedFormat === 'pdf') {
                generateSiteWisePDF({
                  site: site.site,
                  materials: site.materials
                }, site.site.name, 'details');
              } else if (selectedFormat === 'excel') {
                generateSiteWiseExcel({
                  site: site.site,
                  materials: site.materials
                }, site.site.name, 'details');
              }
            }
          }
        }
      } else if (type === 'material') {
        if (selectedOption === 'overview') {
          if (selectedFormat === 'pdf') {
            generateMaterialWiseOverviewPDF(data);
          } else if (selectedFormat === 'excel') {
            generateMaterialWiseOverviewExcel(data);
          }
        } else if (selectedOption === 'sites-overview') {
          if (materialName) {
            if (selectedFormat === 'pdf') {
              generateMaterialWiseSitesOverviewPDF(data);
            } else if (selectedFormat === 'excel') {
              generateMaterialWiseSitesOverviewExcel(data);
            }
          } else if (selectedMaterial) {
            const materialData = await reportsService.getMaterialWiseReports(selectedMaterial);
            if (selectedFormat === 'pdf') {
              generateMaterialWiseSitesOverviewPDF(materialData);
            } else if (selectedFormat === 'excel') {
              generateMaterialWiseSitesOverviewExcel(materialData);
            }
          }
        } else if (selectedOption === 'site-details') {
          if (materialName && selectedSite) {
            if (selectedFormat === 'pdf') {
              generateMaterialWiseSiteDetailsPDF(data, selectedSite);
            } else if (selectedFormat === 'excel') {
              generateMaterialWiseSiteDetailsExcel(data, selectedSite);
            }
          } else if (selectedMaterial && selectedSite) {
            const materialData = await reportsService.getMaterialWiseReports(selectedMaterial);
            if (selectedFormat === 'pdf') {
              generateMaterialWiseSiteDetailsPDF(materialData, selectedSite);
            } else if (selectedFormat === 'excel') {
              generateMaterialWiseSiteDetailsExcel(materialData, selectedSite);
            }
          }
        }
      } else if (type === 'site') {
        if (selectedOption === 'overview') {
          if (selectedFormat === 'pdf') {
            generateSiteWisePDF(data, undefined, 'overview');
          } else if (selectedFormat === 'excel') {
            generateSiteWiseExcel(data, undefined, 'overview');
          }
        } else if (selectedOption === 'details' && selectedSite) {
          const site = data.siteReports?.find((r: any) => r.site.id === selectedSite);
          if (site) {
            if (selectedFormat === 'pdf') {
              generateSiteWisePDF({
                site: site.site,
                materials: site.materials
              }, site.site.name, 'details');
            } else if (selectedFormat === 'excel') {
              generateSiteWiseExcel({
                site: site.site,
                materials: site.materials
              }, site.site.name, 'details');
            }
          }
        }
      } else if (type === 'inventory') {
        if (selectedOption === 'all') {
          if (selectedFormat === 'pdf') {
            generateGodownInventoryPDF(data, undefined, 'all');
          } else if (selectedFormat === 'excel') {
            generateGodownInventoryExcel(data, undefined, 'all');
          }
        } else if (selectedOption === 'godown' && selectedGodown) {
          const godown = godowns.find((g: any) => g.id === selectedGodown);
          if (godown) {
            const filteredData = data.filter((item: any) => item.godown?.id === selectedGodown);
            if (selectedFormat === 'pdf') {
              generateGodownInventoryPDF(filteredData, godown.name, 'godown');
            } else if (selectedFormat === 'excel') {
              generateGodownInventoryExcel(filteredData, godown.name, 'godown');
            }
          }
        }
      }
      onClose();
    } catch (error) {
      console.error('Error generating report:', error);
      alert(`Failed to generate ${selectedFormat === 'pdf' ? 'PDF' : 'Excel'} report. Please try again.`);
    }
  };

  const canDownload = () => {
    // Format must be selected first
    if (!selectedFormat) return false;
    
    if (type === 'reports') {
      if (selectedOption === 'all-materials-overview') return true;
      if (selectedOption === 'material-sites-overview') return !!materialName || !!selectedMaterial;
      if (selectedOption === 'material-site-details') return !!selectedSite && (!!materialName || !!selectedMaterial);
      if (selectedOption === 'all-sites-overview') return true;
      if (selectedOption === 'site-wise-report') return !!data.selectedSite || !!selectedSite;
    } else if (type === 'material') {
      if (selectedOption === 'overview') return true;
      if (selectedOption === 'sites-overview') return !!materialName || !!selectedMaterial;
      if (selectedOption === 'site-details') return !!selectedSite && (!!materialName || !!selectedMaterial);
    } else if (type === 'site') {
      if (selectedOption === 'overview') return true;
      if (selectedOption === 'details') return !!selectedSite;
    } else if (type === 'inventory') {
      if (selectedOption === 'all') return true;
      if (selectedOption === 'godown') return !!selectedGodown;
    }
    return false;
  };

  // Get material reports for dropdown
  const getMaterialReports = () => {
    if (type === 'reports') {
      const materialReports = data.materialReports;
      if (Array.isArray(materialReports)) {
        return materialReports;
      } else if (materialReports?.materialReports && Array.isArray(materialReports.materialReports)) {
        return materialReports.materialReports;
      }
      return [];
    }
    return data.materialReports || [];
  };

  const materialReports = getMaterialReports();

  return (
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
      zIndex: 2000
    }}>
      <div style={{
        backgroundColor: 'white',
        padding: '30px',
        borderRadius: '8px',
        width: '500px',
        maxWidth: '90%',
        maxHeight: '90vh',
        overflowY: 'auto'
      }}>
        <h3 style={{ marginTop: 0, marginBottom: '20px' }}>Download Report</h3>

        {/* Format Selection - Show first */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
            Select Format:
          </label>
          <select
            className="form-select"
            value={selectedFormat}
            onChange={(e) => {
              const format = e.target.value;
              setSelectedFormat(format === 'pdf' || format === 'excel' ? format : '');
              // Reset report type when format changes
              setSelectedOption('');
              setSelectedSite('');
              setSelectedMaterial('');
              setSelectedGodown('');
            }}
            style={{ width: '100%' }}
          >
            <option value="">-- Select Format --</option>
            <option value="pdf">PDF</option>
            <option value="excel">Excel (XLSX)</option>
          </select>
        </div>

        {/* Report Type Selection - Only show after format is selected */}
        {selectedFormat && (type === 'reports' || type === 'material') && (
          <>
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                Select Report Type:
              </label>
              <select
                className="form-select"
                value={selectedOption}
                onChange={(e) => {
                  setSelectedOption(e.target.value);
                  setSelectedSite('');
                  setSelectedMaterial('');
                }}
                style={{ width: '100%' }}
              >
                <option value="">-- Select Option --</option>
                {type === 'reports' && (
                  <>
                    <option value="all-materials-overview">All Materials Overview</option>
                    <option value="material-sites-overview">Material - All Sites Overview</option>
                    <option value="material-site-details">Material - Site-Wise Details</option>
                    <option value="all-sites-overview">All Sites Overview</option>
                    <option value="site-wise-report">Site-Wise Report</option>
                  </>
                )}
                {type === 'material' && (
                  <>
                    <option value="overview">All Materials Overview</option>
                    {!materialName && (
                      <>
                        <option value="sites-overview">Material - All Sites Overview</option>
                        <option value="site-details">Material - Site-Wise Details</option>
                      </>
                    )}
                    {materialName && (
                      <>
                        <option value="sites-overview">All Sites Overview (Current Material)</option>
                        <option value="site-details">Site-Wise Details (Current Material)</option>
                      </>
                    )}
                  </>
                )}
              </select>
            </div>

            {/* Material selection for material-specific reports */}
            {(selectedOption === 'material-sites-overview' || selectedOption === 'material-site-details' || 
              (selectedOption === 'sites-overview' && !materialName) || (selectedOption === 'site-details' && !materialName)) && !materialName && (
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                  Select Material:
                </label>
                <select
                  className="form-select"
                  value={selectedMaterial}
                  onChange={(e) => {
                    setSelectedMaterial(e.target.value);
                    setSelectedSite('');
                  }}
                  style={{ width: '100%' }}
                >
                  <option value="">-- Select Material --</option>
                  {materialReports.map((report: any) => (
                    <option key={report.material?.id || report.id} value={report.material?.id || report.id}>
                      {report.material?.name || report.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Site selection for material-site-details */}
            {(selectedOption === 'material-site-details' || (selectedOption === 'site-details' && !materialName && selectedMaterial)) && (
              <MaterialSiteSelector
                selectedMaterial={selectedMaterial}
                selectedSite={selectedSite}
                onSiteChange={setSelectedSite}
              />
            )}


            {/* Site selection for site-details when viewing a specific material */}
            {selectedOption === 'site-details' && materialName && (
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                  Select Site:
                </label>
                <select
                  className="form-select"
                  value={selectedSite}
                  onChange={(e) => setSelectedSite(e.target.value)}
                  style={{ width: '100%' }}
                >
                  <option value="">-- Select Site --</option>
                  {data.distribution?.map((dist: any, idx: number) => (
                    <option key={idx} value={dist.siteName}>{dist.siteName}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Site selection for site-wise-report when no site is pre-selected */}
            {selectedOption === 'site-wise-report' && !data.selectedSite && type === 'reports' && (
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                  Select Site:
                </label>
                <select
                  className="form-select"
                  value={selectedSite}
                  onChange={(e) => setSelectedSite(e.target.value)}
                  style={{ width: '100%' }}
                >
                  <option value="">-- Select Site --</option>
                  {(() => {
                    const siteReportsData = data.siteReports;
                    const siteReportsArray = Array.isArray(siteReportsData) 
                      ? siteReportsData 
                      : (siteReportsData?.siteReports || []);
                    return siteReportsArray.map((report: any) => (
                      <option key={report.site.id} value={report.site.id}>
                        {report.site.name}
                      </option>
                    ));
                  })()}
                </select>
              </div>
            )}

            {/* Show selected site info for site-wise-report when site is pre-selected */}
            {selectedOption === 'site-wise-report' && data.selectedSite && (
              <div style={{ marginBottom: '15px', padding: '10px', backgroundColor: '#e3f2fd', borderRadius: '4px' }}>
                <div style={{ fontSize: '14px', fontWeight: '500', marginBottom: '5px' }}>
                  Selected Site:
                </div>
                <div style={{ fontSize: '16px', fontWeight: 'bold' }}>
                  {data.selectedSite.site.name}
                </div>
                {data.selectedSite.site.address && (
                  <div style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
                    {data.selectedSite.site.address}
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* Report Type Selection for site type - Only show after format is selected */}
        {selectedFormat && type === 'site' && (
          <>
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                Select Report Type:
              </label>
              <select
                className="form-select"
                value={selectedOption}
                onChange={(e) => {
                  setSelectedOption(e.target.value);
                  setSelectedSite('');
                }}
                style={{ width: '100%' }}
              >
                <option value="">-- Select Option --</option>
                <option value="overview">All Sites Overview</option>
                <option value="details">Site-Wise Details</option>
              </select>
            </div>

            {selectedOption === 'details' && (
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                  Select Site:
                </label>
                <select
                  className="form-select"
                  value={selectedSite}
                  onChange={(e) => setSelectedSite(e.target.value)}
                  style={{ width: '100%' }}
                >
                  <option value="">-- Select Site --</option>
                  {data.siteReports?.map((report: any) => (
                    <option key={report.site.id} value={report.site.id}>
                      {report.site.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </>
        )}

        {/* Report Type Selection for inventory type - Only show after format is selected */}
        {selectedFormat && type === 'inventory' && (
          <>
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                Select Report Type:
              </label>
              <select
                className="form-select"
                value={selectedOption}
                onChange={(e) => {
                  setSelectedOption(e.target.value);
                  setSelectedGodown('');
                }}
                style={{ width: '100%' }}
              >
                <option value="">-- Select Option --</option>
                <option value="all">All Godowns Summary</option>
                <option value="godown">Godown-Wise Details</option>
              </select>
            </div>

            {selectedOption === 'godown' && (
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                  Select Godown:
                </label>
                <select
                  className="form-select"
                  value={selectedGodown}
                  onChange={(e) => setSelectedGodown(e.target.value)}
                  style={{ width: '100%' }}
                >
                  <option value="">-- Select Godown --</option>
                  {godowns.map((godown) => (
                    <option key={godown.id} value={godown.id}>
                      {godown.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </>
        )}

        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
          <button
            className="btn btn-secondary"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            className="btn btn-primary"
            onClick={handleDownload}
            disabled={!canDownload()}
          >
            Download
          </button>
        </div>
      </div>
    </div>
  );
};

export default PDFOptionsModal;
