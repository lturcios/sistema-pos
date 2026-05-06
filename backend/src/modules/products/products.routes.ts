import { Router } from 'express';
import { validate } from '../../middleware/validate.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { authorize } from '../../middleware/rbac.middleware.js';
import { auditLog } from '../../middleware/audit.js';

import { createCategorySchema, createConversionSchema, createPhysicalProductSchema, createSaleProductSchema, searchProductsQuerySchema, updatePhysicalProductSchema, updateSaleProductSchema } from './products.schema.js';
import { listCategories, createCategory } from './category.controller.js';
import { listConversions, createConversion } from './conversion.controller.js';
import { listPhysicalProducts, createPhysicalProduct, updatePhysicalProduct } from './physical.controller.js';
import { listSaleProducts, createSaleProduct, updateSaleProduct } from './sale.controller.js';

const router = Router();

router.use(authenticate);

// Categories
router.get('/categories', authorize('products', 'read'), listCategories);
router.post('/categories', authorize('products', 'create'), validate(createCategorySchema), auditLog('categories'), createCategory);

// Conversions
router.get('/conversions', authorize('products', 'read'), listConversions);
router.post('/conversions', authorize('products', 'create'), validate(createConversionSchema), auditLog('conversions'), createConversion);

// Physical Products
router.get('/physical', authorize('products', 'read'), validate(searchProductsQuerySchema), listPhysicalProducts);
router.post('/physical', authorize('products', 'create'), validate(createPhysicalProductSchema), auditLog('physical-products'), createPhysicalProduct);
router.put('/physical/:id', authorize('products', 'update'), validate(updatePhysicalProductSchema), auditLog('physical-products'), updatePhysicalProduct);

// Sale Products
router.get('/sale', authorize('products', 'read'), validate(searchProductsQuerySchema), listSaleProducts);
router.post('/sale', authorize('products', 'create'), validate(createSaleProductSchema), auditLog('sale-products'), createSaleProduct);
router.put('/sale/:id', authorize('products', 'update'), validate(updateSaleProductSchema), auditLog('sale-products'), updateSaleProduct);

export default router;
