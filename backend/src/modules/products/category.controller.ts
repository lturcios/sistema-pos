import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../config/database.js';
import { successResponse, errorResponse } from '../../shared/apiResponse.js';

export const listCategories = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const categories = await prisma.category.findMany({
            orderBy: { sortOrder: 'asc' },
            include: { children: true }
        });
        return successResponse(res, categories);
    } catch (error) {
        next(error);
    }
};

export const createCategory = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { name, icon, sortOrder, parentId } = req.body;
        const category = await prisma.category.create({
            data: { name, icon, sortOrder, parentId }
        });
        return successResponse(res, category, null, 201);
    } catch (error) {
        next(error);
    }
};
