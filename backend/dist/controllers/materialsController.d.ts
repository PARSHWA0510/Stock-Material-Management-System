import { Request, Response } from 'express';
import { Material } from '../types';
export declare const getAllMaterials: (req: Request, res: Response) => Promise<void>;
export declare const getMaterialById: (req: Request<{
    id: string;
}>, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const createMaterial: (req: Request<{}, Material, Omit<Material, "id" | "createdAt" | "updatedAt">>, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const updateMaterial: (req: Request<{
    id: string;
}, Material, Partial<Omit<Material, "id" | "createdAt" | "updatedAt">>>, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const deleteMaterial: (req: Request<{
    id: string;
}>, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
//# sourceMappingURL=materialsController.d.ts.map