import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface User {
    id: string;
    name: string;
    email: string;
    role: string;
    branchId?: string;
    permissions?: string[];
}

interface AuthState {
    user: User | null;
    token: string | null;
    isAuthenticated: boolean;
    setAuth: (user: User, token: string) => void;
    logout: () => void;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set) => ({
            user: null,
            token: null,
            isAuthenticated: false,

            setAuth: (user, token) => {
                set({ user, token, isAuthenticated: true });
            },

            logout: () => {
                set({ user: null, token: null, isAuthenticated: false });
                // Optional: clear local storage if manually required outside persist
                localStorage.removeItem('auth-storage');
            },
        }),
        {
            name: 'auth-storage', // name of item in the storage (must be unique)
            // Only persist the token (and user if desired), but the token is critical
        }
    )
);
