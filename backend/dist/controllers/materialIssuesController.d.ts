import { Request, Response } from 'express';
import { CreateMaterialIssueRequest } from '../types';
export declare const getAllMaterialIssues: (req: Request, res: Response) => Promise<void>;
export declare const getMaterialIssueById: (req: Request<{
    id: string;
}>, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const createMaterialIssue: (req: Request<{}, any, CreateMaterialIssueRequest>, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const deleteMaterialIssue: (req: Request<{
    id: string;
}>, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
//# sourceMappingURL=materialIssuesController.d.ts.map