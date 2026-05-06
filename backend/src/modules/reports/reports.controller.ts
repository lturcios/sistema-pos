import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../config/database.js';
import { successResponse, errorResponse } from '../../shared/apiResponse.js';

export const getDashboardMetrics = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { branchId, startDate, endDate } = req.query as { branchId?: string, startDate?: string, endDate?: string };

        const where: any = {};
        if (branchId) where.branchId = branchId;

        let dateFilter: any = {};
        if (startDate) dateFilter.gte = new Date(startDate);
        if (endDate) dateFilter.lte = new Date(endDate);

        if (Object.keys(dateFilter).length > 0) {
            where.createdAt = dateFilter;
        }

        const [totalSales, orderCount, productCount] = await Promise.all([
            prisma.order.aggregate({
                where: { ...where, status: 'PAID' },
                _sum: { total: true }
            }),
            prisma.order.count({ where }),
            prisma.productSale.count()
        ]);

        // Worker pattern para exportar excel mencionado en el memory (Mocked para MVP o process offload post-MVP)
        const metrics = {
            revenue: totalSales._sum.total || 0,
            totalOrders: orderCount,
            totalProducts: productCount
        };

        return successResponse(res, metrics);
    } catch (error) {
        next(error);
    }
};

export const exportSalesReport = async (req: Request, res: Response, next: NextFunction) => {
    try {
        // Aquí invocamos native Promises/Workers en lugar de BullMQ (según instrucciones previas y el codebase)
        const exportJob = new Promise((resolve) => {
            setTimeout(() => {
                resolve({ fileUrl: 'http://localhost/downloads/report.xlsx' });
            }, 2000);
        });

        // In a real scenario we might stream the file or return a URL
        return successResponse(res, { message: 'Report generation started. The frontend logic polls or subscribes to WS.' });
    } catch (error) {
        next(error);
    }
};

export const getTopProducts = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { branchId, startDate, endDate } = req.query as { branchId?: string, startDate?: string, endDate?: string };

        const whereOrder: any = { status: 'PAID' };
        if (branchId) whereOrder.branchId = branchId;

        let dateFilter: any = {};
        if (startDate) dateFilter.gte = new Date(startDate);
        if (endDate) dateFilter.lte = new Date(endDate);
        if (Object.keys(dateFilter).length > 0) whereOrder.createdAt = dateFilter;

        const topItems = await prisma.orderItem.groupBy({
            by: ['productSaleId'],
            _sum: { qty: true },
            where: { order: whereOrder },
            orderBy: { _sum: { qty: 'desc' } },
            take: 20
        });

        const productIds = topItems.map(item => item.productSaleId);
        const products = await prisma.productSale.findMany({
            where: { id: { in: productIds } },
            select: { id: true, name: true, code: true, category: { select: { name: true } } }
        });

        const reportData = topItems.map(item => {
            const p = products.find(prod => prod.id === item.productSaleId);
            return {
                id: item.productSaleId,
                name: p?.name || 'Producto General',
                code: p?.code || '-',
                category: p?.category?.name || 'Sin Categoría',
                totalSold: item._sum.qty ? Number(item._sum.qty) : 0
            };
        });

        return successResponse(res, reportData);
    } catch (error) {
        next(error);
    }
};

export const getSalesChart = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { branchId, days = '7' } = req.query as { branchId?: string, days?: string };

        const numDays = parseInt(days) || 7;
        const pastDate = new Date();
        pastDate.setDate(pastDate.getDate() - numDays);

        const whereOrder: any = { status: 'PAID', createdAt: { gte: pastDate } };
        if (branchId) whereOrder.branchId = branchId;

        const orders = await prisma.order.findMany({
            where: whereOrder,
            select: { total: true, createdAt: true }
        });

        const dailyMap: Record<string, number> = {};

        // Initialize map with empty days
        for (let i = numDays - 1; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dateStr = d.toISOString().split('T')[0];
            dailyMap[dateStr] = 0;
        }

        orders.forEach(order => {
            const dateStr = order.createdAt.toISOString().split('T')[0];
            if (dailyMap[dateStr] !== undefined) {
                dailyMap[dateStr] += Number(order.total);
            }
        });

        const chartData = Object.keys(dailyMap).map(date => ({
            date,
            ventas: dailyMap[date]
        }));

        return successResponse(res, chartData);
    } catch (error) {
        next(error);
    }
};

export const getLowStockAlerts = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { branchId } = req.query as { branchId?: string };

        const where: any = {};
        if (branchId) where.branchId = branchId;

        // Prisma no soporta comparar dos campos nativamente en filter directamente en SQLite/MySQL de manera simple
        // para cantidad <= minStock (si usaran el mismo tipo), pero aquí usamos raw si es muy complejo
        // o podemos traerlos y filtrarlos en memoria si es MVp, o usar condition query.
        // Dado que usamos Prisma con MySQL, podemos traer aquellos donde minStock > 0 para optimizar,
        // o usar una raw query. Por facilidad de tipos, traeremos aquellos items donde minStock > 0 y 
        // revisaremos en memoria (o con prisma filtering).
        // En Prisma (desde cierta version), no podemos comparar `quantity` con `minStock` directamente en select.

        // Mejor approach: Traer el inventario y filtrar, o query nativo
        const stocks = await prisma.stock.findMany({
            where,
            include: {
                productPhysical: { select: { sku: true, description: true, unitMeasure: true } },
                branch: { select: { name: true } }
            }
        });

        const lowStocks = stocks
            .filter(st => Number(st.quantity) <= Number(st.minStock))
            .map(st => ({
                id: st.id,
                sku: st.productPhysical.sku,
                name: st.productPhysical.description,
                branch: st.branch.name,
                unit: st.productPhysical.unitMeasure,
                currentStock: Number(st.quantity),
                minStock: Number(st.minStock),
                status: Number(st.quantity) <= 0 ? 'CRITICAL' : 'LOW'
            }))
            .sort((a, b) => a.currentStock - b.currentStock);

        return successResponse(res, lowStocks);
    } catch (error) {
        next(error);
    }
};

export const getCashFlow = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { branchId, startDate, endDate } = req.query as { branchId?: string, startDate?: string, endDate?: string };

        let dateFilter: any = {};
        if (startDate) dateFilter.gte = new Date(startDate);
        if (endDate) dateFilter.lte = new Date(endDate);

        const where: any = {};
        if (Object.keys(dateFilter).length > 0) where.date = dateFilter;
        if (branchId) {
            const branchSessions = await prisma.cashSession.findMany({ where: { register: { branchId } }, select: { id: true } });
            where.sessionId = { in: branchSessions.map(s => s.id) };
        }

        const transactions = await prisma.cashTransaction.findMany({
            where,
            include: { session: { include: { register: { include: { branch: true } } } } },
            orderBy: { date: 'asc' }
        });

        // Grouping for "Estado de Resultados"
        let totalSales = 0;
        let totalIncomes = 0;
        let totalExpenses = 0;
        let totalRefunds = 0;

        transactions.forEach(tx => {
            const amount = Number(tx.amount);
            if (tx.type === 'SALE') totalSales += amount;
            else if (tx.type === 'INCOME') totalIncomes += amount;
            else if (tx.type === 'EXPENSE') totalExpenses += amount;
            else if (tx.type === 'REFUND') totalRefunds += amount;
        });

        const netIncome = (totalSales + totalIncomes) - (totalExpenses + totalRefunds);

        return successResponse(res, {
            summary: {
                totalSales,
                totalIncomes,
                totalExpenses,
                totalRefunds,
                netIncome,
                grossIncome: totalSales + totalIncomes
            },
            transactions: transactions.map(t => ({
                id: t.id,
                date: t.date,
                type: t.type,
                amount: Number(t.amount),
                description: t.description,
                reference: t.reference,
                branchName: t.session.register.branch.name,
                registerName: t.session.register.name
            }))
        });
    } catch (error) {
        next(error);
    }
};

export const getRegistersConsolidated = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { branchId, startDate, endDate } = req.query as { branchId?: string, startDate?: string, endDate?: string };

        const sessionWhere: any = { status: 'CLOSED' };
        if (branchId) sessionWhere.register = { branchId };

        let dateFilter: any = {};
        if (startDate) dateFilter.gte = new Date(startDate);
        if (endDate) dateFilter.lte = new Date(endDate);
        if (Object.keys(dateFilter).length > 0) sessionWhere.closedAt = dateFilter;

        const sessions = await prisma.cashSession.findMany({
            where: sessionWhere,
            include: {
                register: { include: { branch: true } }
            }
        });

        const registersMap: Record<string, { registerName: string, branchName: string, totalClosed: number, sessionCount: number, discrepancy: number }> = {};
        let grandTotal = 0;
        let totalDiscrepancy = 0;

        sessions.forEach(s => {
            const closing = Number(s.closingBalance || 0);
            const diff = Number(s.discrepancy || 0);

            if (!registersMap[s.registerId]) {
                registersMap[s.registerId] = {
                    registerName: s.register.name,
                    branchName: s.register.branch.name,
                    totalClosed: 0,
                    sessionCount: 0,
                    discrepancy: 0
                };
            }

            registersMap[s.registerId].totalClosed += closing;
            registersMap[s.registerId].sessionCount += 1;
            registersMap[s.registerId].discrepancy += diff;

            grandTotal += closing;
            totalDiscrepancy += diff;
        });

        return successResponse(res, {
            registers: Object.values(registersMap),
            grandTotal,
            totalDiscrepancy
        });

    } catch (error) {
        next(error);
    }
};
