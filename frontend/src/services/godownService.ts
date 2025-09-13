import api from './api';
import type { Godown, CreateGodownRequest, UpdateGodownRequest } from '../types';

export const godownService = {
  getAll: async (): Promise<Godown[]> => {
    const response = await api.get('/godowns');
    return response.data;
  },

  create: async (data: CreateGodownRequest): Promise<Godown> => {
    const response = await api.post('/godowns', data);
    return response.data;
  },

  update: async (id: string, data: UpdateGodownRequest): Promise<Godown> => {
    const response = await api.put(`/godowns/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/godowns/${id}`);
  }
};
