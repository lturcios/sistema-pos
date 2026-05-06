import { Router } from 'express';
import { validate } from '../../middleware/validate.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { authorize } from '../../middleware/rbac.middleware.js';
import { auditLog } from '../../middleware/audit.js';

import { reportQuerySchema } from './reports.schema.js';
import { getDashboardMetrics, exportSalesReport, getTopProducts, getSalesChart, getLowStockAlerts, getCashFlow, getRegistersConsolidated, getKitchenPerformance } from './reports.controller.js';

const router = Router();
router.use(authenticate);

router.get('/dashboard', authorize('reports', 'read'), validate(reportQuerySchema), getDashboardMetrics);
router.get('/products/top', authorize('reports', 'read'), validate(reportQuerySchema), getTopProducts);
router.get('/sales/chart', authorize('reports', 'read'), validate(reportQuerySchema), getSalesChart);
router.get('/inventory/low-stock', authorize('reports', 'read'), validate(reportQuerySchema), getLowStockAlerts);
router.get('/kitchen', authorize('reports', 'read'), validate(reportQuerySchema), getKitchenPerformance);
router.post('/export/sales', authorize('reports', 'read'), validate(reportQuerySchema), auditLog('reports'), exportSalesReport);
router.get('/cash-flow', authorize('reports', 'read'), validate(reportQuerySchema), getCashFlow);
router.get('/registers-consolidated', authorize('reports', 'read'), validate(reportQuerySchema), getRegistersConsolidated);
export default router;
