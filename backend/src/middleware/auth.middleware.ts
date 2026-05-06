import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { AuthenticatedRequest, JwtPayload } from '../shared/types.js';
import { errorResponse } from '../shared/apiResponse.js';

export const authenticate = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
        return errorResponse(res, 'No token provided', 'UNAUTHORIZED', 401);
    }

    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET) as JwtPayload;
        req.user = decoded;
        return next();
    } catch (error: any) {
        if (error.name === 'TokenExpiredError') {
            return errorResponse(res, 'Token expired', 'TOKEN_EXPIRED', 401);
        }
        return errorResponse(res, 'Invalid token', 'INVALID_TOKEN', 401);
    }
};
