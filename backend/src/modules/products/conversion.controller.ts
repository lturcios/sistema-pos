import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../config/database.js';
import { successResponse, errorResponse } from '../../shared/apiResponse.js';

export const listConversions = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const conversions = await prisma.unitConversion.findMany();
        return successResponse(res, conversions);
    } catch (error) {
        next(error);
    }
};

export const createConversion = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { fromUnit, toUnit, factor } = req.body;

        // Check if unique constraint exists
        const existing = await prisma.unitConversion.findUnique({
            where: {
                fromUnit_toUnit: { fromUnit, toUnit }
            }
        });

        if (existing) {
            return errorResponse(res, 'Conversion already exists', 'CONFLICT', 409);
        }

        const conversion = await prisma.unitConversion.create({
            data: { fromUnit, toUnit, factor }
        });
        return successResponse(res, conversion, null, 201);
    } catch (error) {
        next(error);
    }
};
