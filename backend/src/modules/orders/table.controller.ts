import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../config/database.js';
import { successResponse, errorResponse } from '../../shared/apiResponse.js';

export const listTables = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { branchId } = req.query as { branchId?: string };
        const tables = await prisma.table.findMany({
            where: branchId ? { branchId } : {},
            orderBy: { number: 'asc' }
        });
        return successResponse(res, tables);
    } catch (error) {
        next(error);
    }
};

export const createTable = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { branchId, number, label, capacity, colorTheme } = req.body;
        const table = await prisma.table.create({
            data: { branchId, number, label, capacity, colorTheme }
        });
        return successResponse(res, table, null, 201);
    } catch (error) {
        next(error);
    }
};

export const updateTable = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params as { id: string };
        const { number, label, capacity, colorTheme } = req.body;
        
        const table = await prisma.table.update({
            where: { id },
            data: { number, label, capacity, colorTheme }
        });
        
        return successResponse(res, table);
    } catch (error) {
        next(error);
    }
};

export const updateTableStatus = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params as { id: string };
        const { status } = req.body;
        const table = await prisma.table.update({
            where: { id },
            data: { status }
        });

        // Fire and forget WebSocket event 
        // Usually via the central IO instance. Handled externally or implicitly by the clients

        return successResponse(res, table);
    } catch (error) {
        next(error);
    }
};
