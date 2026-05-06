import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './config/env.js';
import { setupSwagger } from './config/swagger.js';

import authRoutes from './modules/auth/auth.routes.js';
import roleRoutes from './modules/roles/roles.routes.js';
import branchRoutes from './modules/branches/branches.routes.js';
import productRoutes from './modules/products/products.routes.js';
import inventoryRoutes from './modules/inventory/inventory.routes.js';
import orderRoutes from './modules/orders/orders.routes.js';
import reportRoutes from './modules/reports/reports.routes.js';
import userRoutes from './modules/users/users.routes.js';
import cashRoutes from './modules/cash/cash.routes.js';
import kitchenRoutes from './modules/kitchen/kitchen.routes.js';

export const app: Express = express();

// Middlewares
app.use(helmet());
app.use(cors({
    origin: env.CORS_ORIGIN,
    credentials: true
}));
app.use(express.json());
app.use(morgan(env.NODE_ENV === 'development' ? 'dev' : 'combined'));

// Health check
app.get('/health', (req: Request, res: Response) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes (to be loaded)
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/roles', roleRoutes);
app.use('/api/v1/branches', branchRoutes);
app.use('/api/v1/products', productRoutes);
app.use('/api/v1/inventory', inventoryRoutes);
app.use('/api/v1/orders', orderRoutes);
app.use('/api/v1/reports', reportRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/cash', cashRoutes);
app.use('/api/v1/kitchen', kitchenRoutes);

// Swagger Documentation
setupSwagger(app);

// Global Error Handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    console.error(err);
    res.status(500).json({
        success: false,
        error: err.message || 'Internal Server Error',
        code: 'INTERNAL_ERROR'
    });
});
