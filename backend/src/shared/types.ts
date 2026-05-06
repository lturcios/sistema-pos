import { Request } from 'express';

export interface JwtPayload {
    userId: string;
    roleId: string;
    branchId?: string | null;
}

declare global {
    namespace Express {
        interface User extends JwtPayload {}
    }
}

export interface AuthenticatedRequest extends Request {
    user?: Express.User;
}
