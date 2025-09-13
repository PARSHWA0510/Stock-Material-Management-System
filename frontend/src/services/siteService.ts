import api from './api';
import type { Site, CreateSiteRequest, UpdateSiteRequest } from '../types';

export const siteService = {
  getAll: async (): Promise<Site[]> => {
    const response = await api.get('/sites');
    return response.data;
  },

  create: async (data: CreateSiteRequest): Promise<Site> => {
    const response = await api.post('/sites', data);
    return response.data;
  },

  update: async (id: string, data: UpdateSiteRequest): Promise<Site> => {
    const response = await api.put(`/sites/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/sites/${id}`);
  }
};
