import { z } from 'zod';

export const createCategorySchema = z.object({
    body: z.object({
        name: z.string().min(1),
        icon: z.string().optional(),
        sortOrder: z.number().int().optional(),
        parentId: z.string().uuid().optional().nullable()
    })
});

export const createConversionSchema = z.object({
    body: z.object({
        fromUnit: z.string().min(1),
        toUnit: z.string().min(1),
        factor: z.number().positive()
    })
});

export const createPhysicalProductSchema = z.object({
    body: z.object({
        sku: z.string().min(1),
        description: z.string().min(1),
        unitMeasure: z.string().min(1),
        costUnit: z.coerce.number().min(0),
        minStock: z.coerce.number().min(0).optional()
    })
});

export const updatePhysicalProductSchema = z.object({
    params: z.object({ id: z.string().uuid() }),
    body: z.object({
        sku: z.string().min(1).optional(),
        description: z.string().min(1).optional(),
        unitMeasure: z.string().min(1).optional(),
        costUnit: z.coerce.number().min(0).optional(),
        minStock: z.coerce.number().min(0).optional()
    })
});

export const createSaleProductSchema = z.object({
    body: z.object({
        code: z.string().min(1),
        name: z.string().min(1),
        price: z.number().min(0),
        taxRate: z.number().min(0).optional(),
        categoryId: z.string().uuid().optional().nullable(),
        imageUrl: z.string().url().optional().nullable(),
        isExempt: z.boolean().optional(),
        isNonSubject: z.boolean().optional(),
        requiresPreparation: z.boolean().optional(),
        compositions: z.array(z.object({
            productPhysicalId: z.string().uuid(),
            quantityRequired: z.number().positive()
        })).optional()
    })
});

export const updateSaleProductSchema = z.object({
    params: z.object({
        id: z.string().uuid()
    }),
    body: z.object({
        code: z.string().min(1).optional(),
        name: z.string().min(1).optional(),
        price: z.number().min(0).optional(),
        taxRate: z.number().min(0).optional(),
        categoryId: z.string().uuid().optional().nullable(),
        imageUrl: z.string().url().optional().nullable(),
        isExempt: z.boolean().optional(),
        isNonSubject: z.boolean().optional(),
        requiresPreparation: z.boolean().optional(),
        compositions: z.array(z.object({
            productPhysicalId: z.string().uuid(),
            quantityRequired: z.number().positive()
        })).optional()
    })
});

// Product search query schema for multi-word search
export const searchProductsQuerySchema = z.object({
    query: z.object({
        page: z.string().optional(),
        limit: z.string().optional(),
        search: z.string().optional(),
        categoryId: z.string().uuid().optional()
    })
});
