import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../config/database.js';
import { successResponse } from '../../shared/apiResponse.js';
import { getPaginationOptions, buildPaginationMeta } from '../../shared/pagination.js';

export const listPhysicalProducts = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { search, page, limit } = req.query as { search?: string, page?: string, limit?: string };
        const { skip, take, page: p, limit: l } = getPaginationOptions(page, limit);

        const where: any = {};

        if (search) {
            // Multi-word search AND logic
            const terms = search.trim().split(/\s+/);
            where.AND = terms.map((term: string) => ({
                OR: [
                    { sku: { contains: term } },
                    { description: { contains: term } }
                ]
            }));
        }

        const [items, total] = await Promise.all([
            prisma.productPhysical.findMany({
                where,
                skip,
                take,
                orderBy: { sku: 'asc' }
            }),
            prisma.productPhysical.count({ where })
        ]);

        return successResponse(res, items, buildPaginationMeta(total, p, l));
    } catch (error) {
        next(error);
    }
};

export const createPhysicalProduct = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { sku, description, unitMeasure, costUnit, minStock } = req.body;

        const existing = await prisma.productPhysical.findUnique({ where: { sku } });
        if (existing) {
            return res.status(409).json({ success: false, error: 'SKU already exists', code: 'CONFLICT' });
        }

        const product = await prisma.productPhysical.create({
            data: { sku, description, unitMeasure, costUnit, minStock: minStock || 0 }
        });

        return successResponse(res, product, null, 201);
    } catch (error) {
        next(error);
    }
};

export const updatePhysicalProduct = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params as { id: string };
        const { sku, description, unitMeasure, costUnit, minStock } = req.body;

        if (sku) {
            const existing = await prisma.productPhysical.findFirst({ where: { sku, id: { not: id } } });
            if (existing) return res.status(409).json({ success: false, error: 'SKU already exists', code: 'CONFLICT' });
        }

        const product = await prisma.productPhysical.update({
            where: { id },
            data: { sku, description, unitMeasure, costUnit, minStock: minStock !== undefined ? minStock : undefined }
        });

        return successResponse(res, product);
    } catch (error) {
        next(error);
    }
};
