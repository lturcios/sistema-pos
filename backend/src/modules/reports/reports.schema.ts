import { z } from 'zod';

export const reportQuerySchema = z.object({
    query: z.object({
        branchId: z.string().uuid().optional().or(z.literal('')),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
    })
});
