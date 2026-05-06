import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../config/database.js';
import { successResponse, errorResponse } from '../../shared/apiResponse.js';
import { getPaginationOptions, buildPaginationMeta } from '../../shared/pagination.js';
import { AuthenticatedRequest } from '../../shared/types.js';

export const listOrders = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { branchId, status, page, limit } = req.query as { branchId?: string, status?: string, page?: string, limit?: string };
        const { skip, take, page: p, limit: l } = getPaginationOptions(page, limit);

        const where: any = {};
        if (branchId) where.branchId = branchId;
        if (status) {
            if (status.includes(',')) {
                where.status = { in: status.split(',') };
            } else {
                where.status = status;
            }
        }

        const userId = (req as any).user?.userId;
        if (userId) {
            const currentUser = await prisma.user.findUnique({
                where: { id: userId },
                select: { role: { select: { name: true } } }
            });

            const roleName = currentUser?.role?.name?.toUpperCase();
            if (roleName !== 'ADMINISTRADOR' && roleName !== 'SUPERADMIN' && roleName !== 'ADMIN') {
                where.OR = [
                    { status: 'OPEN' },
                    { createdBy: userId }
                ];
            }
        }

        const [items, total] = await Promise.all([
            prisma.order.findMany({
                where,
                skip,
                take,
                include: { items: true, payments: true },
                orderBy: { createdAt: 'desc' }
            }),
            prisma.order.count({ where })
        ]);

        return successResponse(res, items, buildPaginationMeta(total, p, l));
    } catch (error) {
        next(error);
    }
};

export const getOrderById = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params as { id: string };
        const order = await prisma.order.findUnique({
            where: { id },
            include: { items: { include: { productSale: true } }, payments: true }
        });
        if (!order) return errorResponse(res, 'Order not found', 'NOT_FOUND', 404);
        return successResponse(res, order);
    } catch (error) {
        next(error);
    }
};

export const createOrder = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const { branchId, tableId, customerId, items } = req.body;

        const subtotal = items.reduce((acc: number, item: any) => acc + (item.qty * item.unitPrice - (item.discount || 0)), 0);
        const taxTotal = 0; // Se calcularía con la DB base si procede
        const total = subtotal + taxTotal;

        const order = await prisma.$transaction(async (tx: any) => {
            const newOrder = await tx.order.create({
                data: {
                    branchId,
                    tableId,
                    customerId,
                    status: 'OPEN',
                    subtotal,
                    taxTotal,
                    total,
                    createdBy: req.user?.userId,
                    items: {
                        create: items.map((i: any) => ({
                            productSaleId: i.productSaleId,
                            qty: i.qty,
                            unitPrice: i.unitPrice,
                            discount: i.discount,
                            notes: i.notes
                        }))
                    }
                },
                include: { items: true }
            });

            if (tableId) {
                await tx.table.update({
                    where: { id: tableId },
                    data: { status: 'OCCUPIED' }
                });
            }

            return newOrder;
        });

        return successResponse(res, order, null, 201);
    } catch (error) {
        next(error);
    }
};

export const updateOrder = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params as { id: string };
        const { status, items, customerId } = req.body;

        const currentOrder = await prisma.order.findUnique({ where: { id } });
        if (!currentOrder) return errorResponse(res, 'Order not found', 'NOT_FOUND', 404);

        let updateData: any = {};
        if (customerId !== undefined) updateData.customerId = customerId;
        if (status) {
            updateData.status = status;
            if (status === 'CANCELLED' && currentOrder.tableId) {
                // Libera la mesa
                await prisma.table.update({ where: { id: currentOrder.tableId }, data: { status: 'AVAILABLE' } });
            }
        }

        // Actualización simplificada de ítems para el scope de la API (generalmente se envían todos en el override del carrito)
        if (items) {
            const subtotal = items.reduce((acc: number, item: any) => acc + (item.qty * item.unitPrice - (item.discount || 0)), 0);
            updateData.subtotal = subtotal;
            updateData.total = subtotal; // omiting tax simple calculation here

            const incomingIds = items.filter((i: any) => i.id).map((i: any) => i.id);
            if (incomingIds.length > 0) {
                await prisma.orderItem.deleteMany({
                    where: { orderId: id, id: { notIn: incomingIds } }
                });
            } else {
                await prisma.orderItem.deleteMany({ where: { orderId: id } });
            }
            
            for (const item of items) {
                if (item.id) {
                    await prisma.orderItem.update({
                        where: { id: item.id },
                        data: { qty: item.qty, unitPrice: item.unitPrice, notes: item.notes }
                    });
                } else {
                    await prisma.orderItem.create({
                        data: {
                            orderId: id,
                            productSaleId: item.productSaleId,
                            qty: item.qty,
                            unitPrice: item.unitPrice,
                            discount: item.discount,
                            notes: item.notes
                        }
                    });
                }
            }
        }

        const order = await prisma.order.update({
            where: { id },
            data: updateData,
            include: { items: true }
        });

        return successResponse(res, order);
    } catch (error) {
        next(error);
    }
};

export const cancelOrder = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params as { id: string };
        const { reason } = req.body;

        const order = await prisma.order.findUnique({
            where: { id },
            include: { items: { include: { productSale: { include: { compositions: true } } } }, payments: true }
        });

        if (!order) return errorResponse(res, 'Order not found', 'NOT_FOUND', 404);
        if (order.status === 'CANCELLED') return errorResponse(res, 'Order already cancelled', 'CONFLICT', 409);

        await prisma.$transaction(async (tx: any) => {
            // If the order was already PAID, it means inventory WAS deducted and cash session logged.
            // We need to revert inventory.
            if (order.status === 'PAID') {
                for (const item of (order as any).items) {
                    const comps = item.productSale.compositions;
                    for (const c of comps) {
                        const qtyToRestore = Number(c.quantityRequired) * Number(item.qty);

                        // Restore current stock
                        await tx.stock.update({
                            where: { productPhysicalId_branchId: { productPhysicalId: c.productPhysicalId, branchId: order.branchId } },
                            data: { quantity: { increment: qtyToRestore } },
                        });

                        // Write movement log for restoration
                        await tx.stockMovement.create({
                            data: {
                                productPhysicalId: c.productPhysicalId,
                                branchId: order.branchId,
                                qty: qtyToRestore,
                                type: 'ADJUSTMENT',
                                reference: `Anulación Venta ${order.id}. Motivo: ${reason || 'N/A'}`
                            }
                        });
                    }
                }

                // We should also ideally reverse CashTransaction, but we'll add a negative transaction.
                for (const payment of order.payments) {
                    if (payment.method === 'CASH' || payment.method === 'CARD') {
                        // Find the cash transaction by reference
                        const cashTx = await tx.cashTransaction.findFirst({
                            where: { reference: { contains: order.id.split('-')[0] } }
                        });

                        if (cashTx) {
                            await tx.cashTransaction.create({
                                data: {
                                    sessionId: cashTx.sessionId,
                                    type: 'REFUND',
                                    amount: payment.amount,
                                    description: `Anulación de Pago por orden #${order.id.split('-')[0]}`,
                                    reference: `REV-${order.id.split('-')[0]}`
                                }
                            });
                        }
                    }
                }
            }

            // Finally, change the status to CANCELLED
            await tx.order.update({
                where: { id },
                data: { status: 'CANCELLED' }
            });

            // If table was linked, maybe free it if no other active order
            if (order.tableId) {
                await tx.table.update({
                    where: { id: order.tableId },
                    data: { status: 'AVAILABLE' }
                });
            }
        });

        return successResponse(res, { message: 'Order cancelled successfully' });
    } catch (error) {
        next(error);
    }
};
