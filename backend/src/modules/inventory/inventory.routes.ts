import { Router } from 'express';
import { validate } from '../../middleware/validate.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { authorize } from '../../middleware/rbac.middleware.js';
import { auditLog } from '../../middleware/audit.js';

import { getStock, adjustStock } from './stock.controller.js';
import { listStockMovements } from './movement.controller.js';
import { createTransfer } from './transfer.controller.js';
import { createCount, reconcileCount, listCounts } from './count.controller.js';
import { manualAdjustmentSchema, transferSchema, createCountSchema } from './inventory.schema.js';

const router = Router();
router.use(authenticate);

// Stocks and Adjustments
router.get('/stock', authorize('inventory', 'read'), getStock);
router.post('/stock/adjust', authorize('inventory', 'update'), validate(manualAdjustmentSchema), auditLog('stock'), adjustStock);

// Kardex
router.get('/movements', authorize('inventory', 'read'), listStockMovements);

// Transfers
router.post('/transfer', authorize('inventory', 'create'), validate(transferSchema), auditLog('transfers'), createTransfer);

// Physical Counts
router.get('/counts', authorize('inventory', 'read'), listCounts);
router.post('/count', authorize('inventory', 'create'), validate(createCountSchema), auditLog('counts'), createCount);
router.post('/count/:id/reconcile', authorize('inventory', 'update'), auditLog('counts'), reconcileCount);

export default router;
