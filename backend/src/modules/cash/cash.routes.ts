import { Router } from 'express';
import { validate } from '../../middleware/validate.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { authorize } from '../../middleware/rbac.middleware.js';
import { auditLog } from '../../middleware/audit.js';
import { createRegisterSchema, updateRegisterSchema, openSessionSchema, closeSessionSchema, transactionSchema } from './cash.schema.js';
import { listRegisters, createRegister, updateRegister, listSessions, getSessionById, getActiveSession, openSession, closeSession, addTransaction } from './cash.controller.js';

const router = Router();
router.use(authenticate);

// --- Cajas (Registers) ---
// Note: Roles can be generic like 'registers' or 'cash'
router.get('/registers', authorize('cash', 'read'), listRegisters);
router.post('/registers', authorize('registers', 'create'), validate(createRegisterSchema), auditLog('registers'), createRegister);
router.put('/registers/:id', authorize('registers', 'update'), validate(updateRegisterSchema), auditLog('registers'), updateRegister);

// --- Sesiones (Arqueos / Cortes) ---
// get active session for current user
router.get('/sessions/active', getActiveSession);
router.get('/sessions', authorize('cash', 'read'), listSessions);
router.get('/sessions/:id', authorize('cash', 'read'), getSessionById);

// Turn ON/OFF register by user
router.post('/sessions/open', authorize('cash', 'open'), validate(openSessionSchema), auditLog('sessions'), openSession);
router.post('/sessions/:id/close', authorize('cash', 'close'), validate(closeSessionSchema), auditLog('sessions'), closeSession);

// --- Transacciones manuales (Ingresos, Retiros) ---
router.post('/sessions/:id/transactions', authorize('cash', 'create'), validate(transactionSchema), auditLog('sessions'), addTransaction);

export default router;
