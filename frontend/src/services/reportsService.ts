import api from './api';
import type { SiteMaterialReport, SiteMaterialHistory, SiteMaterialReportsResponse } from '../types/index';

export const reportsService = {
  // Get site-wise material reports
  getSiteMaterialReports: async (siteId?: string): Promise<SiteMaterialReport | SiteMaterialReportsResponse> => {
    const params = siteId ? { site_id: siteId } : {};
    const response = await api.get('/reports/site-materials', { params });
    return response.data;
  },

  // Get detailed material history for a specific site and material
  getSiteMaterialHistory: async (siteId: string, materialId: string): Promise<SiteMaterialHistory> => {
    const response = await api.get(`/reports/site-materials/${siteId}/${materialId}/history`);
    return response.data;
  },

  // Get material-wise reports
  getMaterialWiseReports: async (materialId?: string): Promise<any> => {
    const params = materialId ? { material_id: materialId } : {};
    const response = await api.get('/reports/material-wise', { params });
    return response.data;
  }
};
