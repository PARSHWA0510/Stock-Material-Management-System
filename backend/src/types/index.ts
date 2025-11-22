export interface User {
  id: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'STOREKEEPER';
  createdAt: Date;
  updatedAt: Date;
}

export interface Company {
  id: string;
  name: string;
  gstin?: string;
  address?: string;
  contactPerson?: string;
  mobileNumber?: string;
  emailId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Material {
  id: string;
  name: string;
  unit: string;
  hsnSac?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Site {
  id: string;
  name: string;
  address?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Godown {
  id: string;
  name: string;
  address?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PurchaseBillItem {
  materialId: string;
  quantity: number;
  unit: string;
  rate: number;
  gstPercent: number;
  totalExclGst: number;
  totalInclGst: number;
  locationInGodown?: string;
}

export interface CreatePurchaseBillRequest {
  companyId: string;
  invoiceNumber: string;
  gstinNumber?: string;
  billDate: string;
  deliveredToType: 'GODOWN' | 'SITE';
  deliveredToId: string;
  items: PurchaseBillItem[];
}

export interface MaterialIssueItem {
  materialId: string;
  quantity: number;
  unit: string;
  rate: number;
  totalExclGst: number;
  gstPercent: number;
  totalInclGst: number;
}

export interface CreateMaterialIssueRequest {
  siteId: string;
  fromGodownId?: string;
  issueDate: string;
  items: MaterialIssueItem[];
}

export interface UpdateCompanyRequest {
  name?: string;
  gstin?: string;
  address?: string;
  contactPerson?: string;
  mobileNumber?: string;
  emailId?: string;
}

export interface UpdateSiteRequest {
  name?: string;
  address?: string;
}

export interface UpdateGodownRequest {
  name?: string;
  address?: string;
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
  txDate: Date;
  createdAt: Date;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: User;
}
