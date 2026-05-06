import React from 'react';
import { usePermissions } from '../../hooks/usePermissions';

interface AuthorizedProps {
    resource: string;
    action: string;
    children: React.ReactNode;
    fallback?: React.ReactNode;
}

export function Authorized({ resource, action, children, fallback = null }: AuthorizedProps) {
    const { hasPermission } = usePermissions();

    if (hasPermission(resource, action)) {
        return <>{children}</>;
    }

    return <>{fallback}</>;
}
