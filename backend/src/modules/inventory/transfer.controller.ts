import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../config/database.js';
import { Prisma } from '@prisma/client';
import { successResponse, errorResponse } from '../../shared/apiResponse.js';

export const createTransfer = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { productPhysicalId, fromBranchId, toBranchId, quantity } = req.body;

        if (fromBranchId === toBranchId) {
            return errorResponse(res, 'Source and destination branch cannot be the same', 'BAD_REQUEST', 400);
        }

        const transfer = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
            // Check stock in origin
            const fromStock = await tx.stock.findUnique({
                where: { productPhysicalId_branchId: { productPhysicalId, branchId: fromBranchId } }
            });

            if (!fromStock || Number(fromStock.quantity) < quantity) {
                throw new Error('Insufficient stock in origin branch');
            }

            // Decrement from origin
            await tx.stock.update({
                where: { id: fromStock.id },
                data: { quantity: { decrement: quantity } }
            });
            await tx.stockMovement.create({
                data: {
                    productPhysicalId,
                    branchId: fromBranchId,
                    qty: -quantity,
                    type: 'TRANSFER',
                    cost: 0,
                    reference: `Transfer to ${toBranchId}`
                }
            });

            // Increment in destination
            const toStock = await tx.stock.upsert({
                where: { productPhysicalId_branchId: { productPhysicalId, branchId: toBranchId } },
                update: { quantity: { increment: quantity } },
                create: { productPhysicalId, branchId: toBranchId, quantity }
            });
            await tx.stockMovement.create({
                data: {
                    productPhysicalId,
                    branchId: toBranchId,
                    qty: quantity,
                    type: 'TRANSFER',
                    cost: 0,
                    reference: `Transfer from ${fromBranchId}`
                }
            });

            return {
                fromBranchStock: Number(fromStock.quantity) - quantity,
                toBranchStock: Number(toStock.quantity)
            };
        });

        return successResponse(res, transfer, null, 201);
    } catch (error: any) {
        if (error.message === 'Insufficient stock in origin branch') {
            return errorResponse(res, error.message, 'INSUFFICIENT_STOCK', 400);
        }
        next(error);
    }
};
