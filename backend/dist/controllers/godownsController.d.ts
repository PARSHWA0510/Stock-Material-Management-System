import { Request, Response } from 'express';
export declare const getAllGodowns: (req: Request, res: Response) => Promise<void>;
export declare const createGodown: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const updateGodown: (req: Request<{
    id: string;
}>, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const deleteGodown: (req: Request<{
    id: string;
}>, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
//# sourceMappingURL=godownsController.d.ts.map