import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../config/database.js';
import { successResponse, errorResponse } from '../../shared/apiResponse.js';

export const listBranches = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const branches = await prisma.branch.findMany({
            orderBy: { name: 'asc' }
        });
        return successResponse(res, branches);
    } catch (error) {
        next(error);
    }
};

export const getBranch = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params as { id: string };
        const branch = await prisma.branch.findUnique({ where: { id } });
        if (!branch) {
            return errorResponse(res, 'Branch not found', 'NOT_FOUND', 404);
        }
        return successResponse(res, branch);
    } catch (error) {
        next(error);
    }
};

export const createBranch = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { name, code, address, phone, isActive } = req.body;

        const existingCode = await prisma.branch.findUnique({ where: { code } });
        if (existingCode) {
            return errorResponse(res, 'Branch code already exists', 'CONFLICT', 409);
        }

        const branch = await prisma.branch.create({
            data: { name, code, address, phone, isActive }
        });

        return successResponse(res, branch, null, 201);
    } catch (error) {
        next(error);
    }
};

export const updateBranch = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params as { id: string };
        const { name, code, address, phone, isActive } = req.body;

        if (code) {
            const existingCode = await prisma.branch.findFirst({
                where: { code, id: { not: id } }
            });
            if (existingCode) {
                return errorResponse(res, 'Branch code already exists', 'CONFLICT', 409);
            }
        }

        const branch = await prisma.branch.update({
            where: { id },
            data: { name, code, address, phone, isActive }
        });

        return successResponse(res, branch);
    } catch (error) {
        next(error);
    }
};

export const deleteBranch = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params as { id: string };

        // Soft check if things are assigned
        const userCount = await prisma.user.count({ where: { branchId: id } });
        if (userCount > 0) {
            return errorResponse(res, 'Cannot delete branch with assigned users', 'BAD_REQUEST', 400);
        }

        await prisma.branch.delete({ where: { id } });
        return successResponse(res, { message: 'Branch deleted' });
    } catch (error) {
        next(error);
    }
};
