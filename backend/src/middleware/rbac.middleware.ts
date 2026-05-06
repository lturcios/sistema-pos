import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../shared/types.js';
import { errorResponse } from '../shared/apiResponse.js';
import { prisma } from '../config/database.js';

export const authorize = (resource: string, action: string) => {
    return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        try {
            if (!req.user) {
                return errorResponse(res, 'User not authenticated', 'UNAUTHORIZED', 401);
            }

            const { roleId } = req.user;

            const role = await prisma.role.findUnique({ where: { id: roleId } });
            if (role?.name === 'SuperAdmin') {
                return next();
            }

            const permissionCount = await prisma.permission.count({
                where: {
                    roles: {
                        some: { id: roleId }
                    },
                    resource,
                    action
                }
            });

            if (permissionCount === 0) {
                return errorResponse(res, 'User does not have required permissions', 'FORBIDDEN', 403);
            }

            return next();
        } catch (error) {
            return next(error);
        }
    };
};
