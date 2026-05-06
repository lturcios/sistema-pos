import http from 'http';
import { Server } from 'socket.io';
import { app } from './app.js';
import { env } from './config/env.js';
import { prisma } from './config/database.js';

const server = http.createServer(app);

// Configuración de WebSocket (con fallback a long-polling para Hostinger)
export const io = new Server(server, {
    cors: {
        origin: env.CORS_ORIGIN,
        methods: ['GET', 'POST'],
        credentials: true,
    },
    transports: ['websocket', 'polling']
});

io.on('connection', (socket) => {
    console.log(`🔌 Client connected: ${socket.id}`);

    // Posibles eventos como unirse al room de su sucursal
    socket.on('joinBranch', (branchId) => {
        socket.join(`branch:${branchId}`);
        console.log(`Socket ${socket.id} joined branch:${branchId}`);
    });

    socket.on('disconnect', () => {
        console.log(`🔌 Client disconnected: ${socket.id}`);
    });
});

const startServer = async () => {
    try {
        // Validate DB connection
        await prisma.$connect();
        console.log('✅ Connected to database');

        const PORT = parseInt(env.PORT, 10);
        server.listen(PORT, '0.0.0.0', () => {
            console.log(`🚀 Server running on http://localhost:${PORT}`);
            console.log(`🚀 Env: ${env.NODE_ENV}`);
        });
    } catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
};

startServer();
// Graceful shutdown
process.on('SIGINT', async () => {
    await prisma.$disconnect();
    process.exit(0);
});
process.on('SIGTERM', async () => {
    await prisma.$disconnect();
    process.exit(0);
});
