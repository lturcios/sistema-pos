import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../config/database.js';
import { successResponse } from '../../shared/apiResponse.js';
import { getPaginationOptions, buildPaginationMeta } from '../../shared/pagination.js';

export const listStockMovements = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { branchId, productPhysicalId, page, limit } = req.query as { branchId?: string, productPhysicalId?: string, page?: string, limit?: string };
        const { skip, take, page: p, limit: l } = getPaginationOptions(page, limit);

        const where: any = {};
        if (branchId) where.branchId = branchId;
        if (productPhysicalId) where.productPhysicalId = productPhysicalId;

        const [items, total] = await Promise.all([
            prisma.stockMovement.findMany({
                where,
                skip,
                take,
                include: {
                    productPhysical: { select: { sku: true, description: true } },
                    branch: { select: { name: true } }
                },
                orderBy: { date: 'desc' }
            }),
            prisma.stockMovement.count({ where })
        ]);

        return successResponse(res, items, buildPaginationMeta(total, p, l));
    } catch (error) {
        next(error);
    }
};
