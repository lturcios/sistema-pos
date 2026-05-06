import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../config/database.js';
import { Prisma } from '@prisma/client';
import { successResponse, errorResponse } from '../../shared/apiResponse.js';
import { AuthenticatedRequest } from '../../shared/types.js';
import { getPaginationOptions, buildPaginationMeta } from '../../shared/pagination.js';

export const listCounts = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { branchId, status, page, limit } = req.query as { branchId?: string, status?: string, page?: string, limit?: string };
        const { skip, take, page: p, limit: l } = getPaginationOptions(page, limit);

        const where: any = {};
        if (branchId) where.branchId = branchId;
        if (status) where.status = status;

        const [items, total] = await Promise.all([
            prisma.inventoryCount.findMany({
                where,
                skip,
                take,
                include: { user: { select: { fullName: true } }, lines: { include: { productPhysical: { select: { sku: true, description: true } } } } },
                orderBy: { date: 'desc' }
            }),
            prisma.inventoryCount.count({ where })
        ]);

        return successResponse(res, items, buildPaginationMeta(total, p, l));
    } catch (error) {
        next(error);
    }
};

export const createCount = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const { branchId, lines } = req.body;
        const userId = req.user!.userId;

        // Resolve expected quantities first
        const resolvedLines = await Promise.all(
            lines.map(async (line: any) => {
                const stock = await prisma.stock.findUnique({
                    where: { productPhysicalId_branchId: { productPhysicalId: line.productPhysicalId, branchId } }
                });
                return {
                    productPhysicalId: line.productPhysicalId,
                    countedQty: line.countedQty,
                    expectedQty: stock ? Number(stock.quantity) : 0
                };
            })
        );

        // Create the physical count process
        const count = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
            const newCount = await tx.inventoryCount.create({
                data: {
                    branchId,
                    userId,
                    status: 'DRAFT',
                    lines: {
                        create: resolvedLines
                    }
                },
                include: { lines: true }
            });
            return newCount;
        });

        return successResponse(res, count, null, 201);
    } catch (error) {
        next(error);
    }
};

export const reconcileCount = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params as { id: string };

        const count = await prisma.inventoryCount.findUnique({
            where: { id },
            include: { lines: true }
        });

        if (!count) return errorResponse(res, 'Count not found', 'NOT_FOUND', 404);
        if (count.status !== 'DRAFT') return errorResponse(res, 'Only draft counts can be reconciled', 'BAD_REQUEST', 400);

        const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
            // Apply the variations to the stock
            for (const line of (count as any).lines) {
                const diff = Number(line.countedQty) - Number(line.expectedQty);

                if (diff !== 0) {
                    // Record adjustment
                    await tx.stockMovement.create({
                        data: {
                            productPhysicalId: line.productPhysicalId,
                            branchId: count.branchId,
                            qty: diff,
                            type: 'ADJUSTMENT',
                            cost: 0,
                            reference: `Inventario Físico ${count.id}`
                        }
                    });

                    // Upsert stock
                    await tx.stock.upsert({
                        where: { productPhysicalId_branchId: { productPhysicalId: line.productPhysicalId, branchId: count.branchId } },
                        update: { quantity: Number(line.countedQty) },
                        create: { productPhysicalId: line.productPhysicalId, branchId: count.branchId, quantity: Number(line.countedQty) }
                    });
                }
            }

            // Mark count as completed
            return await tx.inventoryCount.update({
                where: { id },
                data: { status: 'COMPLETED' },
                include: { lines: true }
            });
        });

        return successResponse(res, result);
    } catch (error) {
        next(error);
    }
};
