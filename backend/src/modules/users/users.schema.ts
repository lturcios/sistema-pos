import { z } from 'zod';

export const createUserSchema = z.object({
    body: z.object({
        email: z.string().email(),
        password: z.string().min(6),
        fullName: z.string().min(1),
        isActive: z.boolean().optional(),
        roleId: z.string().uuid(),
        branchId: z.string().uuid().optional().nullable()
    })
});

export const updateUserSchema = z.object({
    body: z.object({
        email: z.string().email().optional(),
        password: z.string().min(6).optional(),
        fullName: z.string().min(1).optional(),
        isActive: z.boolean().optional(),
        roleId: z.string().uuid().optional(),
        branchId: z.string().uuid().optional().nullable()
    })
});
