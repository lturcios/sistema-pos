import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { prisma } from '../../config/database.js';
import { env } from '../../config/env.js';

export const generateTokens = async (userId: string, roleId: string, branchId?: string | null) => {
    const payload = { userId, roleId, branchId };

    const accessToken = jwt.sign(payload, env.JWT_ACCESS_SECRET, { expiresIn: env.JWT_ACCESS_EXPIRES_IN as jwt.SignOptions['expiresIn'] });
    const refreshToken = crypto.randomBytes(40).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(refreshToken).digest('hex');

    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 7); // Hardcoded 7d for simplicity

    await prisma.refreshToken.create({
        data: {
            userId,
            hashedToken,
            expiresAt: expiryDate,
        },
    });

    return { accessToken, refreshToken };
};

export const findActiveUser = async (email: string) => {
    return prisma.user.findUnique({
        where: { email },
        include: { role: { include: { permissions: true } } },
    });
};

export const revokeRefreshToken = async (refreshToken: string) => {
    const hashedToken = crypto.createHash('sha256').update(refreshToken).digest('hex');
    await prisma.refreshToken.update({
        where: { hashedToken },
        data: { revoked: true },
    });
};
