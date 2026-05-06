import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../config/database.js';
import { successResponse, errorResponse } from '../../shared/apiResponse.js';

// Registers
export const listRegisters = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { branchId } = req.query;
        let filters: any = {};
        if (branchId) filters.branchId = branchId;

        const registers = await prisma.cashRegister.findMany({
            where: filters,
            include: {
                branch: { select: { name: true } }
            },
            orderBy: { name: 'asc' }
        });
        return successResponse(res, registers);
    } catch (error) {
        next(error);
    }
};

export const createRegister = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { name, branchId, isActive } = req.body;
        const register = await prisma.cashRegister.create({
            data: { name, branchId, isActive: isActive ?? true },
            include: { branch: { select: { name: true } } }
        });
        return successResponse(res, register, null, 201);
    } catch (error) {
        next(error);
    }
};

export const updateRegister = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params as { id: string };
        const { name, isActive } = req.body;
        const register = await prisma.cashRegister.update({
            where: { id },
            data: { name, isActive },
            include: { branch: { select: { name: true } } }
        });
        return successResponse(res, register);
    } catch (error) {
        next(error);
    }
};

// Sessions (Arqueos)
export const listSessions = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { branchId, status } = req.query;
        let filters: any = {};
        if (branchId) filters.register = { branchId };
        if (status) filters.status = status;

        const userId = (req as any).user?.userId;
        if (userId) {
            const currentUser = await prisma.user.findUnique({
                where: { id: userId },
                select: { role: { select: { name: true } } }
            });
            
            const roleName = currentUser?.role?.name?.toUpperCase();
            if (roleName !== 'ADMINISTRADOR' && roleName !== 'SUPERADMIN' && roleName !== 'ADMIN') {
                filters.userId = userId;
            }
        }

        const sessions = await prisma.cashSession.findMany({
            where: filters,
            include: {
                register: { include: { branch: true } },
                user: { select: { fullName: true } }
            },
            orderBy: { openedAt: 'desc' },
            take: 50
        });
        return successResponse(res, sessions);
    } catch (error) {
        next(error);
    }
};

export const getSessionById = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params as { id: string };
        const session = await prisma.cashSession.findUnique({
            where: { id },
            include: {
                register: { include: { branch: true } },
                user: { select: { fullName: true } },
                transactions: { orderBy: { date: 'desc' } }
            }
        });
        if (!session) return errorResponse(res, 'Session not found', 'NOT_FOUND', 404);
        return successResponse(res, session);
    } catch (error) {
        next(error);
    }
};

export const getActiveSession = async (req: Request, res: Response, next: NextFunction) => {
    try {
        // Find if user has an open session
        const userId = (req as any).user?.userId;
        if (!userId) return errorResponse(res, 'Unauthorized', 'UNAUTHORIZED', 401);

        const session = await prisma.cashSession.findFirst({
            where: { userId, status: 'OPEN' },
            include: { register: { include: { branch: true } } }
        });

        return successResponse(res, session);
    } catch (error) {
        next(error);
    }
};

export const openSession = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = (req as any).user?.userId;
        if (!userId) return errorResponse(res, 'Unauthorized', 'UNAUTHORIZED', 401);

        const { registerId, openingBalance, notes } = req.body;

        // Check if register is already open
        const existingSession = await prisma.cashSession.findFirst({
            where: { registerId, status: 'OPEN' }
        });

        if (existingSession) return errorResponse(res, 'Esta caja ya tiene una sesión abierta.', 'CONFLICT', 409);

        // Check if user already has an open session
        const userSession = await prisma.cashSession.findFirst({
            where: { userId, status: 'OPEN' }
        });
        if (userSession) return errorResponse(res, 'Ya tienes una sesión de caja abierta en este u otro registro.', 'CONFLICT', 409);

        const session = await prisma.cashSession.create({
            data: {
                registerId,
                userId,
                openingBalance,
                status: 'OPEN',
                notes
            },
            include: { register: true }
        });

        return successResponse(res, session, null, 201);
    } catch (error) {
        next(error);
    }
};

export const closeSession = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params as { id: string };
        const { closingBalance, notes } = req.body;

        const session = await prisma.cashSession.findUnique({
            where: { id },
            include: { transactions: true }
        });

        if (!session) return errorResponse(res, 'Sesión no encontrada', 'NOT_FOUND', 404);
        if (session.status === 'CLOSED') return errorResponse(res, 'La sesión ya está cerrada', 'BAD_REQUEST', 400);

        const userId = (req as any).user?.userId;
        if (userId) {
            const currentUser = await prisma.user.findUnique({
                where: { id: userId },
                select: { role: { select: { name: true } } }
            });
            const roleName = currentUser?.role?.name?.toUpperCase();
            if (roleName !== 'ADMINISTRADOR' && roleName !== 'SUPERADMIN' && roleName !== 'ADMIN') {
                if (session.userId !== userId) {
                    return errorResponse(res, 'No tiene permisos para cerrar el turno de otro usuario.', 'FORBIDDEN', 403);
                }
            }
        }

        // Compute expected balance matching Opening Balance + Transactions
        let expectedBalance = Number(session.openingBalance);

        for (const tx of session.transactions) {
            const amount = Number(tx.amount);
            if (tx.type === 'SALE' || tx.type === 'INCOME') {
                expectedBalance += amount;
            } else if (tx.type === 'REFUND' || tx.type === 'EXPENSE') {
                expectedBalance -= amount;
            }
        }

        const discrepancy = closingBalance - expectedBalance;

        const closedSession = await prisma.cashSession.update({
            where: { id },
            data: {
                status: 'CLOSED',
                closedAt: new Date(),
                expectedBalance,
                closingBalance,
                discrepancy,
                notes: notes ? (session.notes ? session.notes + '\n\nCierre: ' + notes : 'Cierre: ' + notes) : session.notes
            }
        });

        return successResponse(res, closedSession);
    } catch (error) {
        next(error);
    }
};

// Transactions (Movimientos en Caja Fuerte / Retiros / Ingresos base)
export const addTransaction = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id: sessionId } = req.params as { id: string };
        const { type, amount, description, reference } = req.body;

        const session = await prisma.cashSession.findUnique({ where: { id: sessionId } });
        if (!session) return errorResponse(res, 'Sesión no encontrada', 'NOT_FOUND', 404);
        if (session.status !== 'OPEN') return errorResponse(res, 'No se pueden registrar transacciones en una sesión cerrada.', 'BAD_REQUEST', 400);

        const transaction = await prisma.cashTransaction.create({
            data: {
                sessionId,
                type, // 'INCOME', 'EXPENSE'
                amount,
                description,
                reference
            }
        });

        return successResponse(res, transaction, null, 201);
    } catch (error) {
        next(error);
    }
};
