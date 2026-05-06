import { z } from 'zod';

export const manualAdjustmentSchema = z.object({
    body: z.object({
        productPhysicalId: z.string().uuid(),
        branchId: z.string().uuid(),
        quantity: z.number(), // Puede ser negativo o positivo (ajuste neto)
        cost: z.number().min(0),
        reference: z.string().optional()
    })
});

export const transferSchema = z.object({
    body: z.object({
        productPhysicalId: z.string().uuid(),
        fromBranchId: z.string().uuid(),
        toBranchId: z.string().uuid(),
        quantity: z.number().positive(),
    })
});

export const createCountSchema = z.object({
    body: z.object({
        branchId: z.string().uuid(),
        lines: z.array(z.object({
            productPhysicalId: z.string().uuid(),
            countedQty: z.number().min(0)
        })).min(1)
    })
});
