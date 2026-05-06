import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../config/database.js';
import { successResponse, errorResponse } from '../../shared/apiResponse.js';

export const getKitchenQueue = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { branchId } = req.query as { branchId?: string };
        const where: any = {
            productSale: {
                requiresPreparation: true
            },
            status: {
                in: ['PENDING', 'PREPARING', 'READY']
            }
        };

        if (branchId) {
            where.order = { branchId };
        }

        const items = await prisma.orderItem.findMany({
            where,
            include: {
                productSale: {
                    select: { name: true }
                },
                order: {
                    select: { 
                        id: true,
                        tableId: true,
                        customerId: true,
                        status: true
                    }
                }
            },
            orderBy: {
                createdAt: 'asc'
            }
        });

        // Resolve tables manually since relation is missing in Prisma schema
        const tableIds = [...new Set(items.map(i => i.order.tableId).filter(Boolean))] as string[];
        const tables = tableIds.length > 0 ? await prisma.table.findMany({
            where: { id: { in: tableIds } },
            select: { id: true, number: true, label: true }
        }) : [];

        const mappedItems = items.map(item => ({
            ...item,
            order: {
                ...item.order,
                table: item.order.tableId ? tables.find(t => t.id === item.order.tableId) : null
            }
        }));

        return successResponse(res, mappedItems);
    } catch (error) {
        next(error);
    }
};

export const updateItemStatus = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!['PENDING', 'PREPARING', 'READY', 'DELIVERED'].includes(status)) {
            return errorResponse(res, 'Estado inválido', 400);
        }

        const item = await prisma.orderItem.update({
            where: { id },
            data: { status }
        });

        return successResponse(res, item);
    } catch (error) {
        next(error);
    }
};
