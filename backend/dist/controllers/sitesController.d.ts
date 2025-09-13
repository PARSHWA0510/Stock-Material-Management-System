import { Request, Response } from 'express';
export declare const getAllSites: (req: Request, res: Response) => Promise<void>;
export declare const createSite: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const updateSite: (req: Request<{
    id: string;
}>, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const deleteSite: (req: Request<{
    id: string;
}>, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
//# sourceMappingURL=sitesController.d.ts.map