import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../config/database.js';
import { successResponse, errorResponse } from '../../shared/apiResponse.js';

export const listPermissions = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const permissions = await prisma.permission.findMany({
            orderBy: [{ resource: 'asc' }, { action: 'asc' }]
        });
        return successResponse(res, permissions);
    } catch (error) {
        next(error);
    }
};

export const listRoles = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const roles = await prisma.role.findMany({
            include: {
                permissions: true,
            }
        });
        return successResponse(res, roles);
    } catch (error) {
        next(error);
    }
};

export const createRole = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { name, description, permissionIds } = req.body;

        const existingRole = await prisma.role.findUnique({ where: { name } });
        if (existingRole) {
            return errorResponse(res, 'Role already exists', 'CONFLICT', 409);
        }

        const role = await prisma.role.create({
            data: {
                name,
                description,
                permissions: permissionIds ? {
                    connect: permissionIds.map((id: string) => ({ id }))
                } : undefined
            },
            include: { permissions: true }
        });

        return successResponse(res, role, null, 201);
    } catch (error) {
        next(error);
    }
};

export const updateRole = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params as { id: string };
        const { name, description, permissionIds } = req.body;

        const role = await prisma.role.update({
            where: { id },
            data: {
                name,
                description,
                permissions: permissionIds ? {
                    set: permissionIds.map((id: string) => ({ id }))
                } : undefined
            },
            include: { permissions: true }
        });

        return successResponse(res, role);
    } catch (error) {
        next(error);
    }
};

export const deleteRole = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params as { id: string };

        // Soft check if users are assigned
        const userCount = await prisma.user.count({ where: { roleId: id } });
        if (userCount > 0) {
            return errorResponse(res, 'Cannot delete role assigned to users', 'BAD_REQUEST', 400);
        }

        await prisma.role.delete({ where: { id } });
        return successResponse(res, { message: 'Role deleted' });
    } catch (error) {
        next(error);
    }
};
