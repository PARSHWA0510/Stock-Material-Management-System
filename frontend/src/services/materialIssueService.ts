import api from './api';
import type { MaterialIssue, CreateMaterialIssueRequest } from '../types';

export const materialIssueService = {
  getAll: async (): Promise<MaterialIssue[]> => {
    const response = await api.get('/material-issues');
    return response.data;
  },

  getById: async (id: string): Promise<MaterialIssue> => {
    const response = await api.get(`/material-issues/${id}`);
    return response.data;
  },

  create: async (data: CreateMaterialIssueRequest): Promise<MaterialIssue> => {
    const response = await api.post('/material-issues', data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/material-issues/${id}`);
  }
};
