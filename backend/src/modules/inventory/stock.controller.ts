import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../config/database.js';
import { Prisma } from '@prisma/client';
import { successResponse, errorResponse } from '../../shared/apiResponse.js';

export const getStock = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { branchId, productPhysicalId } = req.query as { branchId?: string, productPhysicalId?: string };

        if (!branchId) {
            const where: any = {};
            if (productPhysicalId) where.productPhysicalId = productPhysicalId;

            const stocks = await prisma.stock.findMany({
                where,
                include: {
                    productPhysical: { select: { sku: true, description: true, unitMeasure: true, minStock: true } },
                    branch: { select: { name: true } }
                },
                orderBy: { quantity: 'asc' }
            });
            return successResponse(res, stocks);
        }

        // Si hay una sucursal específica solicitada, obtenemos TODOS los insumos para esa sucursal
        const products = await prisma.productPhysical.findMany({
            where: productPhysicalId ? { id: productPhysicalId } : {},
            include: {
                stocks: {
                    where: { branchId }
                }
            },
            orderBy: { description: 'asc' }
        });

        const branch = await prisma.branch.findUnique({ where: { id: branchId } });

        const formattedStocks = products.map((p: any) => {
            const stockRecord = p.stocks[0];
            return {
                id: stockRecord ? stockRecord.id : p.id, // Id del stock o del producto para renderizado flat
                quantity: stockRecord ? Number(stockRecord.quantity) : 0,
                productPhysical: {
                    sku: p.sku,
                    description: p.description,
                    unitMeasure: p.unitMeasure,
                    minStock: Number(p.minStock)
                },
                branch: {
                    name: branch?.name || 'Unknown'
                }
            };
        });

        return successResponse(res, formattedStocks);
    } catch (error) {
        next(error);
    }
};

export const adjustStock = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { productPhysicalId, branchId, quantity, cost, reference } = req.body;

        const stock = await prisma.$transaction(async (tx: any) => {
            // Registrar el movimiento de kardex
            await tx.stockMovement.create({
                data: {
                    productPhysicalId,
                    branchId,
                    qty: quantity,
                    type: 'ADJUSTMENT',
                    cost,
                    reference: reference || 'Ajuste manual'
                }
            });

            // Upsert stock record
            return await tx.stock.upsert({
                where: {
                    productPhysicalId_branchId: { productPhysicalId, branchId }
                },
                update: {
                    quantity: { increment: quantity }
                },
                create: {
                    productPhysicalId,
                    branchId,
                    quantity
                }
            });
        });

        return successResponse(res, stock);
    } catch (error) {
        next(error);
    }
};
