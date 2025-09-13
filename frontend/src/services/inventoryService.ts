import api from './api';

export interface InventoryItem {
  material: {
    id: string;
    name: string;
    unit: string;
    hsnSac?: string;
  };
  godown?: {
    id: string;
    name: string;
    address?: string;
  };
  quantity: number;
  totalValue: number;
  lastUpdated: string;
}

export interface StockTransaction {
  id: string;
  materialId: string;
  godownId?: string;
  siteId?: string;
  txType: 'IN' | 'OUT';
  referenceTable: string;
  referenceId: string;
  quantity: number;
  rate: number;
  balanceAfter: number;
  txDate: string;
  createdAt: string;
  material: {
    id: string;
    name: string;
    unit: string;
  };
  godown?: {
    id: string;
    name: string;
  };
  site?: {
    id: string;
    name: string;
  };
}

export const inventoryService = {
  getInventory: async (godownId?: string): Promise<InventoryItem[]> => {
    const params = godownId ? { godownId } : {};
    const response = await api.get('/inventory', { params });
    return response.data;
  },

  getStockTransactions: async (params?: {
    materialId?: string;
    godownId?: string;
    siteId?: string;
    txType?: string;
    limit?: number;
    offset?: number;
  }): Promise<StockTransaction[]> => {
    const response = await api.get('/inventory/transactions', { params });
    return response.data;
  }
};
