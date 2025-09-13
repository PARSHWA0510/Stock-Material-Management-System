import { Request, Response } from 'express';
import { LoginRequest, LoginResponse } from '../types';
export declare const login: (req: Request<{}, LoginResponse, LoginRequest>, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const getProfile: (req: any, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
//# sourceMappingURL=authController.d.ts.map