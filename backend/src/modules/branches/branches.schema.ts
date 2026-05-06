import { z } from 'zod';

export const createBranchSchema = z.object({
    body: z.object({
        name: z.string().min(1),
        code: z.string().min(1),
        address: z.string().optional(),
        phone: z.string().optional(),
        isActive: z.boolean().optional(),
    })
});

export const updateBranchSchema = z.object({
    params: z.object({
        id: z.string().uuid()
    }),
    body: z.object({
        name: z.string().min(1).optional(),
        code: z.string().min(1).optional(),
        address: z.string().optional(),
        phone: z.string().optional(),
        isActive: z.boolean().optional(),
    })
});
