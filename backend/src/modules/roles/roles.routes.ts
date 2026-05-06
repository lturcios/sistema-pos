import { Router } from 'express';
import { validate } from '../../middleware/validate.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { authorize } from '../../middleware/rbac.middleware.js';
import { auditLog } from '../../middleware/audit.js';
import { createRoleSchema, updateRoleSchema } from './roles.schema.js';
import { listRoles, createRole, updateRole, deleteRole, listPermissions } from './roles.controller.js';

const router = Router();

// Only apply authentication and authorization
router.use(authenticate);

router.get('/permissions', authorize('roles', 'read'), listPermissions);
router.get('/', authorize('roles', 'read'), listRoles);
router.post('/', authorize('roles', 'create'), validate(createRoleSchema), auditLog('roles'), createRole);
router.put('/:id', authorize('roles', 'update'), validate(updateRoleSchema), auditLog('roles'), updateRole);
router.delete('/:id', authorize('roles', 'delete'), auditLog('roles'), deleteRole);

export default router;
