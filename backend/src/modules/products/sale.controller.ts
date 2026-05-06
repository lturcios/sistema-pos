import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../config/database.js';
import { successResponse, errorResponse } from '../../shared/apiResponse.js';
import { getPaginationOptions, buildPaginationMeta } from '../../shared/pagination.js';

export const listSaleProducts = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { search, page, limit, categoryId } = req.query as { search?: string, page?: string, limit?: string, categoryId?: string };
        const { skip, take, page: p, limit: l } = getPaginationOptions(page, limit);

        const where: any = {};

        if (categoryId) {
            where.categoryId = categoryId;
        }

        if (search) {
            // Multi-word search AND logic implementation memory item
            const terms = search.trim().split(/\s+/);
            where.AND = terms.map((term: string) => ({
                OR: [
                    { code: { contains: term } },
                    { name: { contains: term } }
                ]
            }));
        }

        const [items, total] = await Promise.all([
            prisma.productSale.findMany({
                where,
                skip,
                take,
                include: { compositions: true },
                orderBy: { name: 'asc' }
            }),
            prisma.productSale.count({ where })
        ]);

        return successResponse(res, items, buildPaginationMeta(total, p, l));
    } catch (error) {
        next(error);
    }
};

export const createSaleProduct = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { code, name, price, taxRate, categoryId, imageUrl, compositions, isExempt, isNonSubject, requiresPreparation } = req.body;

        const existing = await prisma.productSale.findUnique({ where: { code } });
        if (existing) {
            return errorResponse(res, 'Code already exists', 'CONFLICT', 409);
        }

        const product = await prisma.productSale.create({
            data: {
                code, name, price, taxRate, categoryId, imageUrl, isExempt, isNonSubject, requiresPreparation,
                compositions: compositions ? {
                    create: compositions.map((c: any) => ({
                        productPhysicalId: c.productPhysicalId,
                        quantityRequired: c.quantityRequired
                    }))
                } : undefined
            },
            include: { compositions: true }
        });

        return successResponse(res, product, null, 201);
    } catch (error) {
        next(error);
    }
};

export const updateSaleProduct = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params as { id: string };
        const { code, name, price, taxRate, categoryId, imageUrl, compositions, isExempt, isNonSubject, requiresPreparation } = req.body;

        if (code) {
            const existing = await prisma.productSale.findFirst({ where: { code, id: { not: id } } });
            if (existing) return errorResponse(res, 'Code already exists', 'CONFLICT', 409);
        }

        const product = await prisma.$transaction(async (tx: any) => {
            if (compositions !== undefined) {
                await tx.saleComposition.deleteMany({ where: { productSaleId: id } });
            }

            return await tx.productSale.update({
                where: { id },
                data: {
                    code, name, price, taxRate, categoryId, imageUrl, isExempt, isNonSubject, requiresPreparation,
                    compositions: compositions ? {
                        create: compositions.map((c: any) => ({
                            productPhysicalId: c.productPhysicalId,
                            quantityRequired: c.quantityRequired
                        }))
                    } : undefined
                },
                include: { compositions: true }
            });
        });

        return successResponse(res, product);
    } catch (error) {
        next(error);
    }
};
