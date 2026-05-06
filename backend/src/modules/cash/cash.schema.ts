import { z } from 'zod';

export const createRegisterSchema = z.object({
    body: z.object({
        name: z.string().min(1),
        branchId: z.string().uuid(),
        isActive: z.boolean().optional()
    })
});

export const updateRegisterSchema = z.object({
    body: z.object({
        name: z.string().min(1).optional(),
        isActive: z.boolean().optional()
    })
});

export const openSessionSchema = z.object({
    body: z.object({
        registerId: z.string().uuid(),
        openingBalance: z.number().min(0),
        notes: z.string().optional()
    })
});

export const closeSessionSchema = z.object({
    body: z.object({
        closingBalance: z.number().min(0),
        notes: z.string().optional()
    })
});

export const transactionSchema = z.object({
    body: z.object({
        type: z.enum(['INCOME', 'EXPENSE']),
        amount: z.number().positive(),
        description: z.string().min(1),
        reference: z.string().optional()
    })
});
