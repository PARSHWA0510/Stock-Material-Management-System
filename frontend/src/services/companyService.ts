import api from './api';
import type { Company, CreateCompanyRequest, UpdateCompanyRequest } from '../types';

export const companyService = {
  getAll: async (): Promise<Company[]> => {
    const response = await api.get('/companies');
    return response.data;
  },

  create: async (data: CreateCompanyRequest): Promise<Company> => {
    const response = await api.post('/companies', data);
    return response.data;
  },

  bulkCreate: async (companies: CreateCompanyRequest[]): Promise<any> => {
    const response = await api.post('/companies/bulk', { companies });
    return response.data;
  },

  update: async (id: string, data: UpdateCompanyRequest): Promise<Company> => {
    const response = await api.put(`/companies/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/companies/${id}`);
  }
};
