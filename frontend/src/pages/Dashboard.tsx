import { useState, useEffect } from 'react';
import { api } from '../lib/axios';
import { useAuthStore } from '../store/authStore';
import { usePermissions } from '../hooks/usePermissions';
import { Link } from 'react-router-dom';
import { DollarSign, ShoppingCart, TrendingUp, Flame, ExternalLink, Calendar, Store, ArrowRight, Loader2 } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function Dashboard() {
    const { user } = useAuthStore();
    const { hasPermission } = usePermissions();
    const [loading, setLoading] = useState(true);

    const [todayMetrics, setTodayMetrics] = useState({ revenue: 0, totalOrders: 0, totalProducts: 0 });
    const [monthlyMetrics, setMonthlyMetrics] = useState({ revenue: 0, totalOrders: 0 });
    const [salesChartData, setSalesChartData] = useState<any[]>([]);
    const [recentSessions, setRecentSessions] = useState<any[]>([]);

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        setLoading(true);
        try {
            // Get Dates
            const today = new Date();
            const startOfDay = new Date(today.setHours(0, 0, 0, 0)).toISOString();
            const endOfDay = new Date(today.setHours(23, 59, 59, 999)).toISOString();

            const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString();

            const promises: Promise<any>[] = [];

            const canReadReports = hasPermission('reports', 'read');
            const canReadSessions = hasPermission('cash', 'read');

            if (canReadReports) {
                promises.push(
                    api.get(`/reports/dashboard?startDate=${startOfDay}&endDate=${endOfDay}`).then(res => setTodayMetrics(res.data.data)),
                    api.get(`/reports/dashboard?startDate=${firstDayOfMonth}&endDate=${endOfDay}`).then(res => setMonthlyMetrics(res.data.data)),
                    api.get(`/reports/sales/chart?days=7`).then(res => setSalesChartData(res.data.data))
                );
            }

            if (canReadSessions) {
                promises.push(
                    api.get(`/cash/sessions`).then(res => setRecentSessions((res.data.data || []).slice(0, 5)))
                );
            }

            await Promise.all(promises);

        } catch (error) {
            console.error("Error fetching dashboard data", error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex h-full items-center justify-center bg-muted/10">
                <div className="flex flex-col items-center gap-4 text-muted-foreground">
                    <Loader2 className="h-10 w-10 animate-spin text-primary" />
                    <p className="font-medium animate-pulse">Cargando inteligencia de negocio...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-8 h-full flex flex-col bg-background overflow-auto font-sans">

            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between md:items-end gap-4 mb-8">
                <div>
                    <h1 className="text-4xl md:text-5xl font-black tracking-widest uppercase text-foreground">
                        HOLA, {user?.name || 'ADMIN'}
                    </h1>
                    <p className="text-muted-foreground mt-2 font-mono text-sm uppercase">Resumen de operaciones del día.</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 px-4 py-2 bg-accent text-accent-foreground brutal-border brutal-shadow-sm font-bold text-sm uppercase tracking-wider">
                        <Calendar className="h-4 w-4" />
                        {new Date().toLocaleDateString('es-ES', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
                    </div>
                </div>
            </div>

            {/* Quick KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">

                {hasPermission('reports', 'read') && (
                    <>
                        {/* Hoy Revenue */}
                        <div className="bg-primary text-primary-foreground p-6 brutal-border shadow-brutal-primary relative overflow-hidden group flex flex-col justify-between">
                            <div className="absolute -right-4 -top-4 opacity-20 transform group-hover:scale-110 transition-transform">
                                <DollarSign className="h-32 w-32" />
                            </div>
                            <p className="font-bold text-sm mb-2 uppercase tracking-widest relative z-10 font-mono">Ventas Hoy</p>
                            <h3 className="text-5xl font-black relative z-10">${Number(todayMetrics.revenue).toFixed(2)}</h3>
                            <p className="text-xs font-bold opacity-80 mt-4 flex items-center gap-2 relative z-10 uppercase tracking-widest bg-background/20 w-fit px-2 py-1 brutal-border">
                                <ShoppingCart className="h-4 w-4" /> {todayMetrics.totalOrders} órdenes completas
                            </p>
                        </div>

                        {/* Mes Revenue */}
                        <div className="brutal-card p-6 flex flex-col justify-between">
                            <div>
                                <p className="font-bold text-sm mb-2 uppercase tracking-widest text-muted-foreground font-mono">Ventas del Mes</p>
                                <h3 className="text-4xl font-black text-foreground">${Number(monthlyMetrics.revenue).toFixed(2)}</h3>
                            </div>
                            <p className="text-xs font-bold text-foreground mt-4 flex items-center gap-2 uppercase tracking-widest bg-accent w-fit px-2 py-1 brutal-border">
                                <TrendingUp className="h-4 w-4" /> +{monthlyMetrics.totalOrders} rtd.
                            </p>
                        </div>

                        {/* Pedidos Hoy */}
                        <div className="brutal-card p-6 flex flex-col justify-between">
                            <div>
                                <p className="font-bold text-sm mb-2 uppercase tracking-widest text-muted-foreground font-mono">Órdenes Hoy</p>
                                <h3 className="text-4xl font-black text-foreground">{todayMetrics.totalOrders}</h3>
                            </div>
                            <p className="text-xs font-bold mt-4 flex items-center gap-2 text-foreground bg-primary/10 w-fit px-2 py-1 brutal-border uppercase tracking-widest">
                                ATENCIÓN EN PISO
                            </p>
                        </div>
                    </>
                )}

                {/* Shortcuts */}
                <div className="brutal-card p-6 flex flex-col justify-center gap-4">
                    <p className="text-sm font-bold text-foreground font-mono uppercase tracking-widest border-b-2 border-foreground pb-2">Accesos Rápidos</p>
                    <Link to="/pos" className="brutal-button flex items-center justify-between p-3 bg-accent text-accent-foreground text-sm uppercase tracking-widest">
                        <span className="flex items-center gap-3"><ShoppingCart className="h-5 w-5" /> Ir a POS</span>
                        <ArrowRight className="h-5 w-5" />
                    </Link>
                    <Link to="/cash" className="brutal-button flex items-center justify-between p-3 bg-muted text-foreground text-sm uppercase tracking-widest">
                        <span className="flex items-center gap-3"><Store className="h-5 w-5" /> Turnos (Caja)</span>
                        <ArrowRight className="h-5 w-5" />
                    </Link>
                </div>

            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-[400px]">

                {/* 7 Days Trend Curve */}
                {hasPermission('reports', 'read') ? (
                    <div className="lg:col-span-2 brutal-card p-6 flex flex-col">
                        <div className="flex justify-between items-center mb-8 border-b-2 border-foreground pb-4">
                            <h3 className="font-black text-xl flex items-center gap-3 uppercase tracking-widest">
                                <Flame className="h-6 w-6 text-foreground" />
                                ACTIVIDAD RECIENTE
                            </h3>
                            <Link to="/reports" className="brutal-button bg-foreground text-background px-4 py-2 text-xs font-bold flex items-center gap-2 uppercase tracking-widest">
                                REPORTES <ExternalLink className="h-4 w-4" />
                            </Link>
                        </div>

                        <div className="flex-1 w-full relative min-h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={salesChartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="0" vertical={false} stroke="hsl(var(--muted-foreground))" strokeOpacity={0.3} />
                                    <XAxis dataKey="date" tick={{ fontSize: 11, fontFamily: 'Space Mono', fontWeight: 'bold' }} tickMargin={10} axisLine={{ stroke: 'hsl(var(--foreground))', strokeWidth: 2 }} tickLine={true} />
                                    <YAxis tickFormatter={(val) => `$${val}`} tick={{ fontSize: 11, fontFamily: 'Space Mono', fontWeight: 'bold' }} axisLine={false} tickLine={false} />
                                    <Tooltip formatter={(value) => [`$${value}`, 'Ventas']} cursor={{ stroke: 'hsl(var(--foreground))', strokeWidth: 2, strokeDasharray: '4 4' }} contentStyle={{ borderRadius: '0', border: '2px solid hsl(var(--foreground))', boxShadow: '4px 4px 0px 0px hsl(var(--foreground))', fontWeight: 'bold', fontFamily: 'Space Mono' }} />
                                    <Line type="step" dataKey="ventas" stroke="hsl(var(--primary))" strokeWidth={4} dot={{ r: 6, fill: 'hsl(var(--background))', strokeWidth: 2, stroke: 'hsl(var(--foreground))' }} activeDot={{ r: 8, strokeWidth: 2, fill: 'hsl(var(--accent))' }} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                ) : (
                    <div className="lg:col-span-2 brutal-card p-6 flex flex-col items-center justify-center text-center">
                        <TrendingUp className="h-16 w-16 text-muted-foreground mb-6" />
                        <h3 className="font-black text-2xl mb-4 uppercase tracking-widest">MÉTRICAS DEL SISTEMA</h3>
                        <p className="text-muted-foreground font-mono text-sm max-w-[400px]">Tu rol actual no tiene acceso completo a las estadísticas de ventas y reportes financieros del sistema.</p>
                    </div>
                )}

                {/* Active Sessions Mini-view */}
                {hasPermission('cash', 'read') && (
                    <div className="brutal-card p-6 flex flex-col">
                        <h3 className="font-black text-xl mb-6 flex items-center gap-3 uppercase tracking-widest border-b-2 border-foreground pb-4">
                            <Store className="h-6 w-6 text-foreground" />
                            Turnos Recientes
                        </h3>

                        <div className="flex-1 flex flex-col gap-4 overflow-y-auto pr-2">
                            {recentSessions.length === 0 ? (
                                <div className="flex-1 flex flex-col justify-center items-center text-center p-4">
                                    <div className="p-4 brutal-border bg-muted mb-4"><DollarSign className="h-8 w-8 text-muted-foreground" /></div>
                                    <p className="text-sm font-bold font-mono text-muted-foreground uppercase">Sin Turnos</p>
                                </div>
                            ) : (
                                recentSessions.map(session => (
                                    <div key={session.id} className="relative overflow-hidden group brutal-border bg-card p-4 transition-all hover:-translate-y-1 hover:shadow-brutal">
                                        <div className="flex justify-between items-start mb-4 border-b-2 border-foreground/10 pb-2">
                                            <div className="flex items-center gap-3">
                                                <div className="h-10 w-10 brutal-border bg-accent flex items-center justify-center text-accent-foreground font-black text-lg">
                                                    {session.user?.name?.charAt(0) || 'U'}
                                                </div>
                                                <div>
                                                    <p className="font-black text-sm uppercase tracking-wide leading-tight">{session.user?.name}</p>
                                                    <p className="text-xs text-muted-foreground font-mono uppercase">{session.register?.name}</p>
                                                </div>
                                            </div>
                                            <span className={`px-2 py-1 brutal-border text-xs font-black tracking-widest uppercase ${session.status === 'OPEN' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                                                {session.status === 'OPEN' ? 'ACTIVO' : 'CERRADO'}
                                            </span>
                                        </div>

                                        <div className="flex justify-between items-end mt-2">
                                            <div>
                                                <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Apertura</p>
                                                <p className="text-sm font-mono font-bold">${Number(session.openingBalance).toFixed(2)}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">{session.status === 'OPEN' ? 'Esperado' : 'Final'}</p>
                                                <p className="text-lg font-mono font-black text-foreground">
                                                    ${session.status === 'OPEN'
                                                        ? Number(session.expectedBalance || session.openingBalance).toFixed(2)
                                                        : Number(session.closingBalance).toFixed(2)}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        <Link to="/cash" className="mt-6 brutal-button bg-foreground text-background p-3 text-sm font-bold text-center uppercase tracking-widest flex items-center justify-center gap-2">
                            Gestionar Turnos <ArrowRight className="h-4 w-4" />
                        </Link>
                    </div>
                )}

            </div>
        </div>
    );
}
