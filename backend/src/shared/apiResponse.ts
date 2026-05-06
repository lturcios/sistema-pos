import { Response } from 'express';

export const successResponse = <T>(res: Response, data: T, meta?: any, statusCode = 200) => {
    return res.status(statusCode).json({
        success: true,
        data,
        meta
    });
};

export const errorResponse = (res: Response, error: string, code: string, statusCode = 400) => {
    return res.status(statusCode).json({
        success: false,
        error,
        code
    });
};
