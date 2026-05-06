import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../../config/database.js';
import { successResponse, errorResponse } from '../../shared/apiResponse.js';

export const listUsers = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const users = await prisma.user.findMany({
            select: {
                id: true,
                email: true,
                fullName: true,
                isActive: true,
                roleId: true,
                branchId: true,
                createdAt: true,
                role: { select: { name: true } },
                branch: { select: { name: true } }
            },
            orderBy: { createdAt: 'desc' },
        });
        return successResponse(res, users);
    } catch (error) {
        next(error);
    }
};

export const createUser = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { email, password, fullName, isActive, roleId, branchId } = req.body;

        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            return errorResponse(res, 'Email already in use', 'CONFLICT', 409);
        }

        const passwordHash = await bcrypt.hash(password, 10);

        const user = await prisma.user.create({
            data: {
                email,
                passwordHash,
                fullName,
                isActive: isActive ?? true,
                roleId,
                branchId,
            },
            select: {
                id: true,
                email: true,
                fullName: true,
                roleId: true,
                branchId: true,
                isActive: true
            }
        });

        return successResponse(res, user, null, 201);
    } catch (error) {
        next(error);
    }
};

export const updateUser = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params as { id: string };
        const { email, password, fullName, isActive, roleId, branchId } = req.body;

        if (email) {
            const existingUser = await prisma.user.findFirst({ where: { email, id: { not: id } } });
            if (existingUser) {
                return errorResponse(res, 'Email already in use', 'CONFLICT', 409);
            }
        }

        const dataToUpdate: any = {
            email,
            fullName,
            isActive,
            roleId,
            branchId
        };

        if (password && password.trim() !== '') {
            dataToUpdate.passwordHash = await bcrypt.hash(password, 10);
        }

        // remove undefined fields
        Object.keys(dataToUpdate).forEach(key => dataToUpdate[key] === undefined && delete dataToUpdate[key]);

        const user = await prisma.user.update({
            where: { id },
            data: dataToUpdate,
            select: {
                id: true,
                email: true,
                fullName: true,
                roleId: true,
                branchId: true,
                isActive: true
            }
        });

        return successResponse(res, user);
    } catch (error) {
        next(error);
    }
};

export const deleteUser = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params as { id: string };

        // Soft delete or deactivate instead of hard delete usually, or check relations
        const user = await prisma.user.findUnique({ where: { id }, include: { orders: true, counts: true } });
        if (!user) return errorResponse(res, 'User not found', 'NOT_FOUND', 404);

        if (user.orders.length > 0 || user.counts.length > 0) {
            // Unsafe to delete if relations exist, suggest deactivate
            return errorResponse(res, 'User has associated records, deactivate instead of delete.', 'BAD_REQUEST', 400);
        }

        await prisma.user.delete({ where: { id } });
        return successResponse(res, { message: 'User deleted' });
    } catch (error) {
        next(error);
    }
};
