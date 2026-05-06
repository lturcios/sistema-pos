import { useCallback } from 'react';
import { useAuthStore } from '../store/authStore';

export function usePermissions() {
    const { user } = useAuthStore();

    const hasPermission = useCallback((resource: string, action: string) => {
        // Super admin bypass or full permissive role bypass
        const roleName = user?.role?.toUpperCase();
        if (roleName === 'ADMINISTRADOR' || roleName === 'SUPERADMIN' || roleName === 'ADMIN') return true;
        if (!user?.permissions) return false;

        const p = `${resource}:${action}`;
        const pAllAction = `${resource}:*`;
        const pAllResource = `*:${action}`;
        const pAll = `*:*`;

        return user.permissions.includes(p) ||
            user.permissions.includes(pAllAction) ||
            user.permissions.includes(pAllResource) ||
            user.permissions.includes(pAll);
    }, [user?.role, user?.permissions]);

    const hasAnyPermission = useCallback((requirements: { resource: string, action: string }[]) => {
        return requirements.some(req => hasPermission(req.resource, req.action));
    }, [hasPermission]);

    return { hasPermission, hasAnyPermission, permissions: user?.permissions || [] };
}
