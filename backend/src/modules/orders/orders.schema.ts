import { z } from 'zod';

export const createTableSchema = z.object({
    body: z.object({
        branchId: z.string().uuid(),
        number: z.string().min(1),
        label: z.string().optional(),
        capacity: z.number().int().min(1).optional(),
        colorTheme: z.string().optional()
    })
});

export const updateTableSchema = z.object({
    params: z.object({ id: z.string().uuid() }),
    body: z.object({
        number: z.string().min(1).optional(),
        label: z.string().optional(),
        capacity: z.number().int().min(1).optional(),
        colorTheme: z.string().optional()
    })
});

export const createOrderSchema = z.object({
    body: z.object({
        branchId: z.string().uuid(),
        tableId: z.string().uuid().optional().nullable(),
        customerId: z.string().optional().nullable(),
        items: z.array(z.object({
            productSaleId: z.string().uuid(),
            qty: z.coerce.number().positive(),
            unitPrice: z.coerce.number().min(0),
            discount: z.coerce.number().min(0).optional(),
            notes: z.string().optional()
        })).min(1)
    })
});

export const updateOrderSchema = z.object({
    params: z.object({ id: z.string().uuid() }),
    body: z.object({
        status: z.enum(['OPEN', 'PENDING', 'PAID', 'CANCELLED']).optional(),
        customerId: z.string().optional().nullable(),
        items: z.array(z.object({
            productSaleId: z.string().uuid(),
            qty: z.coerce.number().positive(),
            unitPrice: z.coerce.number().min(0),
            discount: z.coerce.number().min(0).optional(),
            notes: z.string().optional()
        })).optional() // Override complete list of items
    })
});

export const processPaymentSchema = z.object({
    params: z.object({ id: z.string().uuid() }),
    body: z.object({
        method: z.enum(['CASH', 'CARD', 'TRANSFER', 'OTHER']),
        amount: z.number().positive(),
        reference: z.string().optional()
    })
});
