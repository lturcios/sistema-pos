import { Router } from 'express';
import { validate } from '../../middleware/validate.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { authorize } from '../../middleware/rbac.middleware.js';
import { auditLog } from '../../middleware/audit.js';
import { createBranchSchema, updateBranchSchema } from './branches.schema.js';
import { listBranches, getBranch, createBranch, updateBranch, deleteBranch } from './branches.controller.js';

const router = Router();

router.use(authenticate);

router.get('/', authorize('branches', 'read'), listBranches);
router.get('/:id', authorize('branches', 'read'), getBranch);
router.post('/', authorize('branches', 'create'), validate(createBranchSchema), auditLog('branches'), createBranch);
router.put('/:id', authorize('branches', 'update'), validate(updateBranchSchema), auditLog('branches'), updateBranch);
router.delete('/:id', authorize('branches', 'delete'), auditLog('branches'), deleteBranch);

export default router;
