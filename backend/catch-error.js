import { PrismaClient } from '@prisma/client';

try {
    const prisma = new PrismaClient({ log: ['query'] });
    console.log('Success');
} catch (e) {
    console.log('--- ERROR ---');
    console.error(e.message);
}
