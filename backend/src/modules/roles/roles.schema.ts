import { z } from 'zod';

export const createRoleSchema = z.object({
    body: z.object({
        name: z.string().min(1),
        description: z.string().optional(),
        permissionIds: z.array(z.string().uuid()).optional()
    })
});

export const updateRoleSchema = z.object({
    params: z.object({
        id: z.string().uuid()
    }),
    body: z.object({
        name: z.string().min(1).optional(),
        description: z.string().optional(),
        permissionIds: z.array(z.string().uuid()).optional()
    })
});
