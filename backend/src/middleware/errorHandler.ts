import { Request, Response, NextFunction } from 'express';
import { errorResponse } from '../shared/apiResponse.js';

export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
    console.error('[Error]:', err);

    const statusCode = err.statusCode || 500;
    const message = err.message || 'Error interno del servidor';
    const code = err.code || 'INTERNAL_ERROR';

    return errorResponse(res, message, code, statusCode);
};
