import api from './api';
import type { PurchaseBill, CreatePurchaseBillRequest } from '../types';

export const purchaseBillService = {
  getAll: async (): Promise<PurchaseBill[]> => {
    const response = await api.get('/purchase-bills');
    return response.data;
  },

  getById: async (id: string): Promise<PurchaseBill> => {
    const response = await api.get(`/purchase-bills/${id}`);
    return response.data;
  },

  create: async (data: CreatePurchaseBillRequest): Promise<PurchaseBill> => {
    const response = await api.post('/purchase-bills', data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/purchase-bills/${id}`);
  }
};
