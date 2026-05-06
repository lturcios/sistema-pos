import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { successResponse, errorResponse } from '../../shared/apiResponse.js';
import { generateTokens, findActiveUser, revokeRefreshToken } from './auth.service.js';
import { prisma } from '../../config/database.js';
import crypto from 'crypto';
import { AuthenticatedRequest } from '../../shared/types.js';

export const login = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { email, password } = req.body;

        const user = await findActiveUser(email);
        if (!user || !user.isActive) {
            return errorResponse(res, 'Incorrect credentials or inactive user', 'UNAUTHORIZED', 401);
        }

        const isValid = await bcrypt.compare(password, user.passwordHash);
        if (!isValid) {
            return errorResponse(res, 'Incorrect credentials', 'UNAUTHORIZED', 401);
        }

        const tokens = await generateTokens(user.id, user.roleId, user.branchId);

        return successResponse(res, {
            user: {
                id: user.id,
                email: user.email,
                fullName: user.fullName,
                name: user.fullName, // Frontend sometimes reads just 'name'
                role: user.role.name,
                branchId: user.branchId,
                permissions: user.role.permissions.map((p: any) => `${p.resource}:${p.action}`)
            },
            ...tokens
        });
    } catch (error) {
        next(error);
    }
};

export const refresh = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { refreshToken } = req.body;
        const hashedToken = crypto.createHash('sha256').update(refreshToken).digest('hex');

        const tokenRecord = await prisma.refreshToken.findUnique({
            where: { hashedToken },
            include: { user: true }
        });

        if (!tokenRecord || tokenRecord.revoked || new Date() > tokenRecord.expiresAt) {
            return errorResponse(res, 'Invalid or expired refresh token', 'INVALID_TOKEN', 401);
        }

        // Revoke old token
        await prisma.refreshToken.update({
            where: { id: tokenRecord.id },
            data: { revoked: true }
        });

        // Issue new tokens
        const tokens = await generateTokens(tokenRecord.user.id, tokenRecord.user.roleId, tokenRecord.user.branchId);

        return successResponse(res, tokens);
    } catch (error) {
        next(error);
    }
};

export const logout = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { refreshToken } = req.body;
        if (refreshToken) {
            await revokeRefreshToken(refreshToken);
        }
        return successResponse(res, { message: 'Logged out successfully' });
    } catch (error) {
        next(error);
    }
};

export const me = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user!.userId },
            select: {
                id: true,
                email: true,
                fullName: true,
                isActive: true,
                branchId: true,
                role: { select: { name: true, permissions: true } }
            }
        });

        if (!user) {
            return errorResponse(res, 'User not found', 'NOT_FOUND', 404);
        }

        const formattedUser = {
            id: user.id,
            email: user.email,
            fullName: user.fullName,
            name: user.fullName,
            isActive: user.isActive,
            branchId: user.branchId,
            role: user.role.name,
            permissions: user.role.permissions.map((p: any) => `${p.resource}:${p.action}`)
        };

        return successResponse(res, formattedUser);
    } catch (error) {
        next(error);
    }
};
