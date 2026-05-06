import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { api } from '../lib/axios';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const setAuth = useAuthStore(state => state.setAuth);
    const navigate = useNavigate();
    const location = useLocation();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setLoading(true);
            setError('');

            const { data } = await api.post('/auth/login', { email, password });

            if (data.success && data.data.accessToken) {
                setAuth(data.data.user, data.data.accessToken);
                
                const roleName = typeof data.data.user.role === 'string' 
                    ? data.data.user.role.toUpperCase() 
                    : data.data.user.role?.name?.toUpperCase() || '';
                    
                let origin = (location.state as any)?.from?.pathname || '/dashboard';
                
                if (roleName === 'COCINA') {
                    origin = '/kitchen';
                }
                
                navigate(origin, { replace: true });
            } else {
                setError('Error inesperado al iniciar sesión.');
            }
        } catch (err: any) {
            if (err.response?.status === 401) {
                setError('Credenciales inválidas.');
            } else {
                setError(err.response?.data?.error || 'No se pudo conectar al servidor.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col min-h-screen items-center justify-center bg-background p-4 font-sans relative">
            {/* Background brutalist accents */}
            <div className="absolute inset-0 z-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, currentColor 1px, transparent 0)', backgroundSize: '24px 24px' }}></div>

            <div className="w-full max-w-sm brutal-card bg-card text-card-foreground p-8 z-10">
                <form onSubmit={handleLogin} className="flex flex-col gap-6">
                    <div>
                        <h1 className="text-4xl font-black tracking-widest uppercase">
                            SISTEMA POS
                        </h1>
                        <p className="text-sm font-bold text-muted-foreground mt-2 font-mono uppercase tracking-widest border-b-2 border-foreground pb-4 content-['']">
                            Autenticación Requerida
                        </p>
                    </div>

                    {error && (
                        <div className="p-3 bg-destructive text-destructive-foreground font-bold text-sm tracking-wide uppercase brutal-border">
                            {error}
                        </div>
                    )}

                    <div className="flex flex-col gap-5">
                        <div className="space-y-1">
                            <label className="text-xs font-bold uppercase tracking-widest font-mono text-muted-foreground">Correo Electrónico</label>
                            <input
                                type="email"
                                placeholder="usuario@empresa.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                className="flex h-12 w-full brutal-border bg-transparent px-3 py-1 text-sm transition-colors placeholder:text-muted-foreground/50 focus-visible:outline-none focus-visible:bg-accent focus-visible:text-accent-foreground disabled:cursor-not-allowed disabled:opacity-50 font-bold"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-bold uppercase tracking-widest font-mono text-muted-foreground">Contraseña</label>
                            <input
                                type="password"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                className="flex h-12 w-full brutal-border bg-transparent px-3 py-1 text-sm transition-colors placeholder:text-muted-foreground/50 focus-visible:outline-none focus-visible:bg-accent focus-visible:text-accent-foreground disabled:cursor-not-allowed disabled:opacity-50 font-bold font-mono tracking-widest"
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="mt-4 w-full flex items-center justify-center brutal-button bg-primary text-primary-foreground h-14 px-4 py-2 text-lg font-black tracking-widest uppercase transition-all"
                        >
                            {loading ? 'AUTENTICANDO...' : 'INGRESAR AL SISTEMA'}
                        </button>
                    </div>
                </form>
            </div>

            <div className="absolute bottom-6 left-0 w-full text-center z-10 pointer-events-none">
                <p className="font-mono text-[10px] font-bold tracking-widest uppercase text-muted-foreground opacity-50">V: 1.0.0-PROD | TERMINAL AUTORIZADA</p>
            </div>
        </div>
    );
}
