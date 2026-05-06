import { Router } from 'express';
import { validate } from '../../middleware/validate.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { authorize } from '../../middleware/rbac.middleware.js';
import { auditLog } from '../../middleware/audit.js';
import { createUserSchema, updateUserSchema } from './users.schema.js';
import { listUsers, createUser, updateUser, deleteUser } from './users.controller.js';

const router = Router();

// Only apply authentication and authorization
router.use(authenticate);

router.get('/', authorize('users', 'read'), listUsers);
router.post('/', authorize('users', 'create'), validate(createUserSchema), auditLog('users'), createUser);
router.put('/:id', authorize('users', 'update'), validate(updateUserSchema), auditLog('users'), updateUser);
router.delete('/:id', authorize('users', 'delete'), auditLog('users'), deleteUser);

export default router;
