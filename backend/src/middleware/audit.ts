import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../shared/types.js';
import { prisma } from '../config/database.js';

export const auditLog = (resource: string) => {
    return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        const originalSend = res.send;

        // Solo registrar POST, PUT, DELETE, PATCH
        if (['GET', 'OPTIONS', 'HEAD'].includes(req.method)) {
            return next();
        }

        res.send = function (body) {
            // Registrar log asíncronamente después de responder
            if (res.statusCode >= 200 && res.statusCode < 300) {
                const payload = {
                    userId: req.user?.userId || null,
                    action: req.method,
                    resource,
                    ip: req.ip,
                    newData: req.body,
                };

                // Fire and forget
                prisma.auditLog.create({
                    data: payload
                }).catch((err: any) => console.error('Error writing audit log:', err));
            }

            return originalSend.call(this, body);
        };

        next();
    };
};
