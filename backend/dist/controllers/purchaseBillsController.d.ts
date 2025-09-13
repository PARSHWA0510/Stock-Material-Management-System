import { Request, Response } from 'express';
import { CreatePurchaseBillRequest } from '../types';
export declare const getAllPurchaseBills: (req: Request, res: Response) => Promise<void>;
export declare const getPurchaseBillById: (req: Request<{
    id: string;
}>, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const createPurchaseBill: (req: Request<{}, any, CreatePurchaseBillRequest>, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const deletePurchaseBill: (req: Request<{
    id: string;
}>, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
//# sourceMappingURL=purchaseBillsController.d.ts.map