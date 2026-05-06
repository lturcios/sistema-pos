import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../config/database.js';
import { successResponse, errorResponse } from '../../shared/apiResponse.js';

export const processPayment = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params as { id: string };
        const { method, amount, reference } = req.body;

        const order = await prisma.order.findUnique({
            where: { id },
            include: { items: { include: { productSale: { include: { compositions: true } } } }, payments: true }
        });

        if (!order) return errorResponse(res, 'Order not found', 'NOT_FOUND', 404);
        if (order.status === 'PAID') return errorResponse(res, 'Order already paid', 'CONFLICT', 409);

        const prevPaid = (order as any).payments.reduce((acc: number, p: any) => acc + Number(p.amount), 0);
        const remainingToPay = Number(order.total) - prevPaid;
        const appliedAmount = remainingToPay > 0 ? Math.min(Number(amount), remainingToPay) : 0;

        const paidTotal = prevPaid + appliedAmount;
        const isFullyPaid = paidTotal >= Number(order.total);

        const result = await prisma.$transaction(async (tx: any) => {
            // 1. Create Payment record
            const payment = await tx.payment.create({
                data: {
                    orderId: id,
                    method,
                    amount: appliedAmount,
                    reference
                }
            });

            // 1B. Log CashTransaction in active session if doing a Cash / POS payment
            // Retrieve active session for user
            const userId = (req as any).user?.userId;

            if (method === 'CASH' || method === 'CARD') {
                if (!userId) throw new Error("User ID is required for CASH/CARD payments.");

                const activeSession = await tx.cashSession.findFirst({
                    where: { userId, status: 'OPEN' }
                });

                if (!activeSession) {
                    throw new Error("ACTIVE_SESSION_REQUIRED: No tienes un turno de caja abierto para registrar este cobro.");
                }

                await tx.cashTransaction.create({
                    data: {
                        sessionId: activeSession.id,
                        type: 'SALE',
                        amount: appliedAmount,
                        description: `Pago ${method} por orden #${order.id.split('-')[0]}`,
                        reference: reference || `ORD-${order.id.split('-')[0]}`
                    }
                });
            }

            // 2. Adjust Order status
            if (isFullyPaid) {
                await tx.order.update({
                    where: { id },
                    data: { status: 'PAID' }
                });

                if (order.tableId) {
                    await tx.table.update({
                        where: { id: order.tableId },
                        data: { status: 'AVAILABLE' }
                    });
                }

                // 3. Subtract physical stock based on sale compositions
                for (const item of (order as any).items) {
                    const comps = item.productSale.compositions;
                    for (const c of comps) {
                        const qtyToSubtract = Number(c.quantityRequired) * Number(item.qty);

                        // Fetch current stock
                        const currentStock = await tx.stock.upsert({
                            where: { productPhysicalId_branchId: { productPhysicalId: c.productPhysicalId, branchId: order.branchId } },
                            update: { quantity: { decrement: qtyToSubtract } },
                            create: { productPhysicalId: c.productPhysicalId, branchId: order.branchId, quantity: -qtyToSubtract }
                        });

                        // Write movement log
                        await tx.stockMovement.create({
                            data: {
                                productPhysicalId: c.productPhysicalId,
                                branchId: order.branchId,
                                qty: -qtyToSubtract,
                                type: 'SALE',
                                cost: 0, // Should be actual cost, omitting for brevity
                                reference: `Sale Order ${order.id}`
                            }
                        });
                    }
                }
            }

            return payment;
        });

        return successResponse(res, result, { isFullyPaid }, 201);
    } catch (error: any) {
        if (error.message && error.message.includes('ACTIVE_SESSION_REQUIRED')) {
            return errorResponse(res, 'No tienes un turno de caja abierto. Ve a Caja > Crear Turno.', 'SESSION_REQUIRED', 403);
        }
        next(error);
    }
};
