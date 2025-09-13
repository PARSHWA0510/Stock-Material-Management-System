import api from './api';
import type { Material, CreateMaterialRequest, UpdateMaterialRequest } from '../types/index';

export const materialService = {
  getAll: async (): Promise<Material[]> => {
    const response = await api.get('/materials');
    return response.data;
  },

  getById: async (id: string): Promise<Material> => {
    const response = await api.get(`/materials/${id}`);
    return response.data;
  },

  create: async (data: CreateMaterialRequest): Promise<Material> => {
    const response = await api.post('/materials', data);
    return response.data;
  },

  update: async (id: string, data: UpdateMaterialRequest): Promise<Material> => {
    const response = await api.put(`/materials/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/materials/${id}`);
  }
};
