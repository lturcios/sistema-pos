import { Router } from 'express';
import { validate } from '../../middleware/validate.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { authorize } from '../../middleware/rbac.middleware.js';
import { auditLog } from '../../middleware/audit.js';

import { createTableSchema, createOrderSchema, updateOrderSchema, processPaymentSchema, updateTableSchema } from './orders.schema.js';
import { listTables, createTable, updateTable, updateTableStatus } from './table.controller.js';
import { listOrders, getOrderById, createOrder, updateOrder, cancelOrder } from './order.controller.js';
import { processPayment } from './payment.controller.js';

const router = Router();
router.use(authenticate);

// Tables
router.get('/tables', authorize('sales', 'read'), listTables);
router.post('/tables', authorize('sales', 'create'), validate(createTableSchema), auditLog('tables'), createTable);
router.put('/tables/:id', authorize('sales', 'update'), validate(updateTableSchema), auditLog('tables'), updateTable);
router.patch('/tables/:id/status', authorize('sales', 'update'), auditLog('tables'), updateTableStatus);

// Orders
router.get('/', authorize('sales', 'read'), listOrders);
router.get('/:id', authorize('sales', 'read'), getOrderById);
router.post('/', authorize('sales', 'create'), validate(createOrderSchema), auditLog('orders'), createOrder);
router.put('/:id', authorize('sales', 'update'), validate(updateOrderSchema), auditLog('orders'), updateOrder);
router.post('/:id/cancel', authorize('sales', 'void'), auditLog('orders'), cancelOrder);

// Payments
router.post('/:id/pay', authorize('sales', 'create'), validate(processPaymentSchema), auditLog('payments'), processPayment);

export default router;
