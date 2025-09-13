import { Request, Response } from 'express';
export declare const getAllCompanies: (req: Request, res: Response) => Promise<void>;
export declare const createCompany: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const updateCompany: (req: Request<{
    id: string;
}>, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const deleteCompany: (req: Request<{
    id: string;
}>, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
//# sourceMappingURL=companiesController.d.ts.map