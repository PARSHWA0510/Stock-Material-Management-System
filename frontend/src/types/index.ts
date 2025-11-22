export interface User {
  id: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'STOREKEEPER';
  createdAt: string;
  updatedAt: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: User;
}

export interface Material {
  id: string;
  name: string;
  unit: string;
  hsnSac?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateMaterialRequest {
  name: string;
  unit: string;
  hsnSac?: string;
}

export interface UpdateMaterialRequest {
  name?: string;
  unit?: string;
  hsnSac?: string;
}

export interface Company {
  id: string;
  name: string;
  gstin?: string;
  address?: string;
  contactPerson?: string;
  mobileNumber?: string;
  emailId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Site {
  id: string;
  name: string;
  address?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Godown {
  id: string;
  name: string;
  address?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PurchaseBillItem {
  id: string;
  materialId: string;
  material: Material;
  quantity: number;
  unit: string;
  rate: number;
  gstPercent: number;
  totalExclGst: number;
  totalInclGst: number;
  locationInGodown?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PurchaseBill {
  id: string;
  companyId: string;
  company: Company;
  invoiceNumber: string;
  gstinNumber?: string;
  billDate: string;
  deliveredToType: 'GODOWN' | 'SITE';
  deliveredToId: string;
  createdById: string;
  createdBy: User;
  items: PurchaseBillItem[];
  createdAt: string;
  updatedAt: string;
}

export interface CreatePurchaseBillRequest {
  companyId: string;
  invoiceNumber: string;
  gstinNumber?: string;
  billDate: string;
  deliveredToType: 'GODOWN' | 'SITE';
  deliveredToId: string;
  items: {
    materialId: string;
    quantity: number;
    unit: string;
    rate: number;
    gstPercent: number;
    totalExclGst: number;
    totalInclGst: number;
    locationInGodown?: string;
  }[];
}

export interface PurchaseBillFormData {
  companyId: string;
  invoiceNumber: string;
  gstinNumber?: string;
  billDate: string;
  deliveredToType: 'GODOWN' | 'SITE';
  deliveredToId: string;
  items: {
    id: string;
    materialId: string;
    quantity: string | number;
    unit: string;
    rate: string | number;
    gstPercent: number;
    totalExclGst: number;
    totalInclGst: number;
  }[];
}

export interface CreateCompanyRequest {
  name: string;
  gstin?: string;
  address?: string;
  contactPerson?: string;
  mobileNumber?: string;
  emailId?: string;
}

export interface UpdateCompanyRequest {
  name?: string;
  gstin?: string;
  address?: string;
  contactPerson?: string;
  mobileNumber?: string;
  emailId?: string;
}

export interface CreateSiteRequest {
  name: string;
  address?: string;
}

export interface UpdateCompanyRequest {
  name?: string;
  gstin?: string;
  address?: string;
}

export interface UpdateSiteRequest {
  name?: string;
  address?: string;
}

export interface CreateGodownRequest {
  name: string;
  address?: string;
}

export interface UpdateGodownRequest {
  name?: string;
  address?: string;
}

export interface MaterialIssueItem {
  id: string;
  materialIssueId: string;
  materialId: string;
  material: Material;
  quantity: number;
  unit: string;
  rate: number;
  totalExclGst: number;
  gstPercent: number;
  totalInclGst: number;
  createdAt: string;
  updatedAt: string;
}

export interface MaterialIssue {
  id: string;
  identifier: string;
  issueDate: string;
  siteId: string;
  site: Site;
  fromGodownId?: string;
  fromGodown?: Godown;
  createdById: string;
  createdBy: User;
  items: MaterialIssueItem[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateMaterialIssueRequest {
  siteId: string;
  fromGodownId?: string;
  issueDate: string;
  items: {
    materialId: string;
    quantity: number;
    unit: string;
    rate: number;
    gstPercent: number;
    totalExclGst: number;
    totalInclGst: number;
  }[];
}

export interface MaterialIssueFormData {
  siteId: string;
  fromGodownId: string;
  issueDate: string;
  items: {
    id: string;
    materialId: string;
    quantity: string | number;
    unit: string;
    rate: number;
    gstPercent: number;
    totalExclGst: number;
    totalInclGst: number;
  }[];
}

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

export interface ApiError {
  response?: {
    data?: {
      message?: string;
    };
  };
}

// Reports Types
export interface SiteMaterialSummary {
  materialId: string;
  materialName: string;
  unit: string;
  totalQuantity: number;
  totalValue: number;
  issues?: {
    issueId: string;
    issueDate: string;
    quantity: number;
    rate: number;
    totalValue: number;
    fromGodown: string;
    isDirectPurchase?: boolean;
  }[];
}

export interface SiteMaterialReport {
  site: {
    id: string;
    name: string;
    address?: string;
  };
  materials: SiteMaterialSummary[];
  grandTotal: number;
  totalMaterials: number;
}

export interface SiteMaterialReportsResponse {
  siteReports: SiteMaterialReport[];
  summary: {
    totalSites: number;
    overallTotal: number;
    totalMaterials: number;
  };
}

export interface MaterialHistoryItem {
  type: 'ISSUE' | 'DIRECT_PURCHASE';
  date: string;
  quantity: number;
  rate: number;
  totalValue: number;
  fromGodown: string;
  reference: string;
  issueId?: string;
  purchaseId?: string;
  company?: string;
}

export interface SiteMaterialHistory {
  site: {
    id: string;
    name: string;
    address?: string;
  };
  material: {
    id: string;
    name: string;
    unit: string;
  };
  history: MaterialHistoryItem[];
  totals: {
    totalQuantity: number;
    totalValue: number;
  };
}
