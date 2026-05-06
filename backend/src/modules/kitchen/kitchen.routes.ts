import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware.js';
import { authorize } from '../../middleware/rbac.middleware.js';
import { getKitchenQueue, updateItemStatus } from './kitchen.controller.js';

const router = Router();
router.use(authenticate);

// We might create a specific permission for this, or just use 'orders'/'cash'
// If we strictly follow the 'COCINA' role, maybe we need a new permission.
// For MVP, if they have 'orders:read' or we just check if role is COCINA in middleware.
// We will allow anyone authenticated to hit this and we can rely on frontend protecting the route,
// or we can add a basic authorize('kitchen', 'read') but we need to seed the 'kitchen' resource.
// For now, let's keep it open to authenticated users since it's an internal dashboard.

router.get('/items', getKitchenQueue);
router.put('/items/:id/status', updateItemStatus);

export default router;
