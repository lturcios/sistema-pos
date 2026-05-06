import { useState, useEffect } from 'react';
import { api } from '../lib/axios';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    BarChart, Bar
} from 'recharts';
import { TrendingUp, Box, DollarSign, Calendar, FileSpreadsheet, Loader2, AlertTriangle, Printer } from 'lucide-react';
import * as XLSX from 'xlsx';

export default function Reports() {
    const [loading, setLoading] = useState(false);

    const [dashboardMetrics, setDashboardMetrics] = useState({ revenue: 0, totalOrders: 0, totalProducts: 0 });
    const [salesChartData, setSalesChartData] = useState<any[]>([]);
    const [topProducts, setTopProducts] = useState<any[]>([]);
    const [lowStockAlerts, setLowStockAlerts] = useState<any[]>([]);

    const [branchId, setBranchId] = useState<string>('');
    const [branches, setBranches] = useState<any[]>([]);

    const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'CASH_FLOW' | 'REGISTERS' | 'KITCHEN'>('OVERVIEW');
    const [kitchenPerformance, setKitchenPerformance] = useState<any[]>([]);
    const [dateRange, setDateRange] = useState({ start: '', end: '' });

    // Cash Flow State
    const [cashFlowSummary, setCashFlowSummary] = useState<any>(null);
    const [cashFlowTransactions, setCashFlowTransactions] = useState<any[]>([]);

    // Registers Consolidated State
    const [registersConsolidated, setRegistersConsolidated] = useState<any[]>([]);
    const [registersTotals, setRegistersTotals] = useState({ grandTotal: 0, totalDiscrepancy: 0 });

    useEffect(() => {
        fetchBranches();
    }, []);

    useEffect(() => {
        fetchTabData();
    }, [branchId, activeTab, dateRange]);

    const fetchBranches = async () => {
        try {
            const { data } = await api.get('/branches');
            setBranches(data.data);
        } catch (error) { console.error(error); }
    };

    const fetchTabData = async () => {
        setLoading(true);
        try {
            let qs = `?branchId=${branchId}`;
            if (dateRange.start) qs += `&startDate=${dateRange.start}`;
            if (dateRange.end) qs += `&endDate=${dateRange.end}T23:59:59.999Z`;

            if (activeTab === 'OVERVIEW') {
                const [metricsRes, chartRes, productsRes, alertsRes] = await Promise.all([
                    api.get(`/reports/dashboard${qs}`),
                    api.get(`/reports/sales/chart${qs}`),
                    api.get(`/reports/products/top${qs}`),
                    api.get(`/reports/inventory/low-stock?branchId=${branchId}`) // Alerts typically global/current
                ]);
                setDashboardMetrics(metricsRes.data.data);
                setSalesChartData(chartRes.data.data);
                setTopProducts(productsRes.data.data);
                setLowStockAlerts(alertsRes.data.data);
            } else if (activeTab === 'CASH_FLOW') {
                const { data } = await api.get(`/reports/cash-flow${qs}`);
                setCashFlowSummary(data.data.summary);
                setCashFlowTransactions(data.data.transactions);
            } else if (activeTab === 'REGISTERS') {
                const { data } = await api.get(`/reports/registers-consolidated${qs}`);
                setRegistersConsolidated(data.data.registers);
                setRegistersTotals({ grandTotal: data.data.grandTotal, totalDiscrepancy: data.data.totalDiscrepancy });
            } else if (activeTab === 'KITCHEN') {
                const { data } = await api.get(`/reports/kitchen${qs}`);
                setKitchenPerformance(data.data);
            }
        } catch (error) {
            console.error("Error fetching report data", error);
        } finally {
            setLoading(false);
        }
    };

    const exportToExcel = () => {
        const wb = XLSX.utils.book_new();

        // Sheet 1: Ventas Diarias
        const wsVentas = XLSX.utils.json_to_sheet(salesChartData.map(d => ({ Fecha: d.date, Ventas: Number(d.ventas) })));
        XLSX.utils.book_append_sheet(wb, wsVentas, "Ventas Diarias");

        // Sheet 2: Productos Estrella
        const wsProductos = XLSX.utils.json_to_sheet(topProducts.map(p => ({
            Código: p.code,
            Producto: p.name,
            Categoría: p.category,
            "Cant. Vendida": p.totalSold
        })));
        XLSX.utils.book_append_sheet(wb, wsProductos, "Top Productos");

        // Sheet 3: Alertas de Inventario
        const wsAlertas = XLSX.utils.json_to_sheet(lowStockAlerts.map(a => ({
            SKU: a.sku,
            Insumo: a.name,
            Sucursal: a.branch,
            "Stock Actual": `${a.currentStock} ${a.unit}`,
            "Stock Mínimo": `${a.minStock} ${a.unit}`,
            Estado: a.status === 'CRITICAL' ? 'CRÍTICO (Agotado)' : 'BAJO'
        })));
        XLSX.utils.book_append_sheet(wb, wsAlertas, "Alertas Stock");

        XLSX.writeFile(wb, `Reporte_General_Ventas.xlsx`);
    };

    const handleQuickDate = (preset: 'TODAY' | 'WEEK' | 'FORTNIGHT' | 'MONTH' | 'QUARTER' | 'YEAR') => {
        const today = new Date();
        let start = new Date();
        let end = new Date();

        switch (preset) {
            case 'TODAY':
                break;
            case 'WEEK':
                const day = today.getDay();
                const diff = today.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
                start = new Date(today.setDate(diff));
                end = new Date(start);
                end.setDate(start.getDate() + 6);
                break;
            case 'FORTNIGHT':
                if (today.getDate() <= 15) {
                    start = new Date(today.getFullYear(), today.getMonth(), 1);
                    end = new Date(today.getFullYear(), today.getMonth(), 15);
                } else {
                    start = new Date(today.getFullYear(), today.getMonth(), 16);
                    end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
                }
                break;
            case 'MONTH':
                start = new Date(today.getFullYear(), today.getMonth(), 1);
                end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
                break;
            case 'QUARTER':
                const q = Math.floor(today.getMonth() / 3);
                start = new Date(today.getFullYear(), q * 3, 1);
                end = new Date(today.getFullYear(), q * 3 + 3, 0);
                break;
            case 'YEAR':
                start = new Date(today.getFullYear(), 0, 1);
                end = new Date(today.getFullYear(), 11, 31);
                break;
        }

        const formatDate = (date: Date) => {
            const y = date.getFullYear();
            const m = String(date.getMonth() + 1).padStart(2, '0');
            const d = String(date.getDate()).padStart(2, '0');
            return `${y}-${m}-${d}`;
        };

        if (preset === 'TODAY') {
             setDateRange({ start: formatDate(new Date()), end: formatDate(new Date()) });
        } else {
             setDateRange({ start: formatDate(start), end: formatDate(end) });
        }
    };

    const calculateAverageKitchenTime = () => {
        if (kitchenPerformance.length === 0) return 0;
        let totalMins = 0;
        kitchenPerformance.forEach(item => {
            const createdAt = new Date(item.createdAt);
            const end = item.deliveredAt ? new Date(item.deliveredAt) : (item.readyAt ? new Date(item.readyAt) : (item.preparingAt ? new Date(item.preparingAt) : new Date()));
            totalMins += Math.max(0, Math.round((end.getTime() - createdAt.getTime()) / 60000));
        });
        return Math.round(totalMins / kitchenPerformance.length);
    };

    return (
        <div className="p-4 md:p-6 h-full flex flex-col bg-muted/10 overflow-auto">
            <div className="flex flex-col xl:flex-row justify-between items-start xl:items-end mb-6 gap-6">
                <div className="print:hidden w-full xl:w-auto">
                    <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Centro de Reportes</h1>
                    <p className="text-muted-foreground mt-1 text-sm md:text-base">Métricas de ventas, flujos de efectivo y consolidación.</p>
                </div>
                <div className="hidden print:block mb-4">
                    <h1 className="text-2xl font-bold">Reporte del Sistema</h1>
                    <p className="text-sm">Generado el {new Date().toLocaleString()}</p>
                    <p className="text-sm">Fechas: {dateRange.start || 'Inicio'} al {dateRange.end || 'Fin'}</p>
                </div>
                <div className="flex flex-col gap-3 w-full xl:w-auto">
                    <div className="flex flex-wrap items-center gap-2 print:hidden xl:justify-end">
                        <button onClick={() => handleQuickDate('TODAY')} className="text-xs border px-2 py-1.5 rounded-md hover:bg-muted font-medium bg-background shadow-sm">Hoy</button>
                        <button onClick={() => handleQuickDate('WEEK')} className="text-xs border px-2 py-1.5 rounded-md hover:bg-muted font-medium bg-background shadow-sm">Esta Sem.</button>
                        <button onClick={() => handleQuickDate('FORTNIGHT')} className="text-xs border px-2 py-1.5 rounded-md hover:bg-muted font-medium bg-background shadow-sm">Esta Quin.</button>
                        <button onClick={() => handleQuickDate('MONTH')} className="text-xs border px-2 py-1.5 rounded-md hover:bg-muted font-medium bg-background shadow-sm">Este Mes</button>
                        <button onClick={() => handleQuickDate('QUARTER')} className="text-xs border px-2 py-1.5 rounded-md hover:bg-muted font-medium bg-background shadow-sm">Este Trim.</button>
                        <button onClick={() => handleQuickDate('YEAR')} className="text-xs border px-2 py-1.5 rounded-md hover:bg-muted font-medium bg-background shadow-sm">Este Año</button>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 print:hidden">
                        <div className="flex items-center gap-2 border rounded-md px-3 py-1 bg-card shadow-sm text-sm">
                            <span className="text-muted-foreground font-medium">Desde:</span>
                            <input type="date" value={dateRange.start} onChange={e => setDateRange(prev => ({ ...prev, start: e.target.value }))} className="bg-transparent focus:outline-none" />
                            <span className="text-muted-foreground font-medium ml-2">Hasta:</span>
                            <input type="date" value={dateRange.end} onChange={e => setDateRange(prev => ({ ...prev, end: e.target.value }))} className="bg-transparent focus:outline-none" />
                            {(dateRange.start || dateRange.end) && (
                                <button onClick={() => setDateRange({ start: '', end: '' })} className="ml-2 text-destructive font-bold text-xs" title="Limpiar Fechas">X</button>
                            )}
                        </div>

                        <select value={branchId} onChange={e => setBranchId(e.target.value)} className="border rounded-md px-3 py-2 bg-card text-sm shadow-sm">
                            <option value="">Todas las Sucursales</option>
                            {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                        </select>
                        <button onClick={exportToExcel} className="flex items-center gap-2 bg-[#217346] text-white px-4 py-2 rounded-md font-bold hover:bg-[#1e6b41] transition-colors shadow-sm">
                            <FileSpreadsheet className="h-4 w-4" /> Exportar a Excel
                        </button>
                        <button onClick={() => window.print()} className="flex-1 md:flex-none flex items-center justify-center gap-2 border border-foreground bg-card text-foreground px-4 py-2 rounded-md font-bold hover:bg-muted transition-colors shadow-sm whitespace-nowrap">
                            <Printer className="h-4 w-4" /> PDF / Imprimir
                        </button>
                        <button onClick={fetchTabData} className="p-2 border rounded-md bg-card hover:bg-muted flex items-center justify-center shadow-sm" title="Recargar">
                            <Loader2 className={`h-5 w-5 ${loading ? 'animate-spin text-primary' : 'text-muted-foreground'}`} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex flex-wrap gap-x-6 gap-y-2 border-b mb-6 uppercase text-sm font-bold tracking-wide print:hidden">
                <button onClick={() => setActiveTab('OVERVIEW')} className={`pb-2 px-2 border-b-2 transition-colors ${activeTab === 'OVERVIEW' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>Dashboard General</button>
                <button onClick={() => setActiveTab('CASH_FLOW')} className={`pb-2 px-2 border-b-2 transition-colors ${activeTab === 'CASH_FLOW' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>Flujo de Efectivo</button>
                <button onClick={() => setActiveTab('REGISTERS')} className={`pb-2 px-2 border-b-2 transition-colors ${activeTab === 'REGISTERS' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>Consolidado de Cajas</button>
                <button onClick={() => setActiveTab('KITCHEN')} className={`pb-2 px-2 border-b-2 transition-colors ${activeTab === 'KITCHEN' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>Auditoría de Cocina</button>
            </div>

            {activeTab === 'OVERVIEW' && (
                <>
                    {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-card p-6 rounded-xl border shadow-sm flex items-center gap-4">
                    <div className="p-4 bg-primary/10 rounded-full text-primary"><DollarSign className="h-8 w-8" /></div>
                    <div>
                        <p className="text-sm font-medium text-muted-foreground">Ingresos (Histórico)</p>
                        <p className="text-3xl font-black">${Number(dashboardMetrics.revenue).toFixed(2)}</p>
                    </div>
                </div>
                <div className="bg-card p-6 rounded-xl border shadow-sm flex items-center gap-4">
                    <div className="p-4 bg-emerald-500/10 rounded-full text-emerald-600"><TrendingUp className="h-8 w-8" /></div>
                    <div>
                        <p className="text-sm font-medium text-muted-foreground">Órdenes Pagadas</p>
                        <p className="text-3xl font-black">{dashboardMetrics.totalOrders}</p>
                    </div>
                </div>
                <div className="bg-card p-6 rounded-xl border shadow-sm flex items-center gap-4">
                    <div className="p-4 bg-blue-500/10 rounded-full text-blue-600"><Box className="h-8 w-8" /></div>
                    <div>
                        <p className="text-sm font-medium text-muted-foreground">Catálogo Activo</p>
                        <p className="text-3xl font-black">{dashboardMetrics.totalProducts} <span className="text-sm font-normal text-muted-foreground">ítems</span></p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* Chart 1: Sales Trend */}
                <div className="bg-card p-6 border rounded-xl shadow-sm flex flex-col min-h-[400px]">
                    <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                        <Calendar className="h-5 w-5 text-muted-foreground" />
                        Tendencia de Ventas (Últimos 7 días)
                    </h3>
                    <div className="flex-1 w-full relative">
                        {loading && salesChartData.length === 0 ? (
                            <div className="absolute inset-0 flex items-center justify-center bg-card/50 z-10">
                                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                            </div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                                <LineChart data={salesChartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                                    <XAxis dataKey="date" tick={{ fontSize: 12 }} tickMargin={10} axisLine={false} tickLine={false} />
                                    <YAxis tickFormatter={(val) => `$${val}`} tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                                    <Tooltip formatter={(value) => [`$${value}`, 'Ventas']} labelStyle={{ color: 'black' }} />
                                    <Line type="monotone" dataKey="ventas" stroke="#2563eb" strokeWidth={3} dot={{ r: 4, fill: '#2563eb', strokeWidth: 0 }} activeDot={{ r: 6 }} />
                                </LineChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </div>

                {/* Chart 2: Top Products */}
                <div className="bg-card p-6 border rounded-xl shadow-sm flex flex-col min-h-[400px]">
                    <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                        <Box className="h-5 w-5 text-muted-foreground" />
                        Top 20 Productos Estrella (Vendidos)
                    </h3>
                    <div className="flex-1 w-full relative">
                        {loading && topProducts.length === 0 ? (
                            <div className="absolute inset-0 flex items-center justify-center bg-card/50 z-10">
                                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                            </div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                                <BarChart data={topProducts.slice(0, 10)} layout="vertical" margin={{ top: 0, right: 30, left: 40, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e5e7eb" />
                                    <XAxis type="number" axisLine={false} tickLine={false} />
                                    <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                                    <Tooltip cursor={{ fill: 'transparent' }} formatter={(value) => [`${value} uds`, 'Vendido']} />
                                    <Bar dataKey="totalSold" fill="#10b981" radius={[0, 4, 4, 0]} barSize={20} />
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </div>

                    <div className="mt-6 border-t pt-4">
                        <p className="text-sm font-medium text-muted-foreground mb-2">Desglose Rápido</p>
                        <div className="max-h-40 overflow-y-auto pr-2">
                            {topProducts.map((p, idx) => (
                                <div key={p.id} className="flex justify-between items-center py-2 border-b last:border-0 text-sm">
                                    <span className="flex items-center gap-2">
                                        <span className="font-mono text-xs bg-muted px-1.5 rounded text-muted-foreground">{idx + 1}</span>
                                        <span className="font-semibold">{p.name} <span className="font-normal text-xs text-muted-foreground ml-1">({p.category})</span></span>
                                    </span>
                                    <span className="font-bold font-mono">{p.totalSold} uds</span>
                                </div>
                            ))}
                            {topProducts.length === 0 && !loading && <div className="text-center text-muted-foreground text-sm py-4">No hay ventas registradas aún</div>}
                        </div>
                    </div>
                </div>

            </div>

            {/* Inventory Alerts Section */}
            <div className="bg-card p-6 border rounded-xl shadow-sm mt-6 mb-8 flex flex-col">
                <h3 className="font-bold text-lg mb-4 flex items-center gap-2 text-destructive">
                    <AlertTriangle className="h-5 w-5" />
                    Alertas de Reabastecimiento (Inventario Crítico / Bajo)
                </h3>
                
                {/* Desktop View */}
                <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-muted text-muted-foreground uppercase text-xs">
                            <tr>
                                <th className="px-4 py-3 font-semibold">Insumo / Artículo Físico</th>
                                <th className="px-4 py-3 font-semibold">SKU / Código</th>
                                <th className="px-4 py-3 font-semibold">Sucursal</th>
                                <th className="px-4 py-3 font-semibold text-right">Existencia Actual</th>
                                <th className="px-4 py-3 font-semibold text-right">Mínimo Requerido</th>
                                <th className="px-4 py-3 font-semibold text-center">Nivel de Riesgo</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y relative">
                            {lowStockAlerts.map(alert => (
                                <tr key={alert.id} className="hover:bg-muted/50 transition-colors">
                                    <td className="px-4 py-4 font-bold">{alert.name}</td>
                                    <td className="px-4 py-4 font-mono text-xs">{alert.sku}</td>
                                    <td className="px-4 py-4">{alert.branch}</td>
                                    <td className="px-4 py-4 text-right font-mono font-bold text-destructive">
                                        {alert.currentStock} {alert.unit}
                                    </td>
                                    <td className="px-4 py-4 text-right font-mono">
                                        {alert.minStock} {alert.unit}
                                    </td>
                                    <td className="px-4 py-4 text-center">
                                        <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${alert.status === 'CRITICAL' ? 'bg-destructive text-destructive-foreground animate-pulse' : 'bg-amber-500/20 text-amber-700'}`}>
                                            {alert.status === 'CRITICAL' ? 'Agotado' : 'Bajo Stock'}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                            {lowStockAlerts.length === 0 && !loading && (
                                <tr>
                                    <td colSpan={6} className="text-center py-10 text-muted-foreground">
                                        <div className="flex flex-col items-center justify-center">
                                            <div className="h-12 w-12 rounded-full bg-emerald-500/10 flex items-center justify-center mb-3">
                                                <Box className="h-6 w-6 text-emerald-600" />
                                            </div>
                                            <p className="font-medium text-emerald-700">Stock Saludable</p>
                                            <p className="text-xs mt-1 max-w-[250px]">No hay alertas de reabastecimiento en este momento. Todos los insumos están por encima de su mínimo.</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Mobile Card View */}
                <div className="md:hidden flex flex-col gap-4">
                    {lowStockAlerts.map(alert => (
                        <div key={alert.id} className="bg-background border rounded-xl shadow-sm p-4 relative overflow-hidden">
                            <div className={`absolute left-0 top-0 bottom-0 w-1 ${alert.status === 'CRITICAL' ? 'bg-destructive' : 'bg-amber-500'}`} />
                            <div className="flex justify-between items-start mb-3">
                                <div>
                                    <h4 className="font-bold text-base">{alert.name}</h4>
                                    <p className="text-xs text-muted-foreground font-mono mt-0.5">{alert.sku} • {alert.branch}</p>
                                </div>
                                <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${alert.status === 'CRITICAL' ? 'bg-destructive/10 text-destructive animate-pulse' : 'bg-amber-500/10 text-amber-700'}`}>
                                    {alert.status === 'CRITICAL' ? 'Agotado' : 'Bajo Stock'}
                                </span>
                            </div>
                            <div className="grid grid-cols-2 gap-4 mt-2 pt-3 border-t">
                                <div>
                                    <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mb-1">Mínimo Req.</p>
                                    <p className="font-mono text-sm">{alert.minStock} {alert.unit}</p>
                                </div>
                                <div className="text-right">
                                    <p className={`text-[10px] uppercase font-bold tracking-wider mb-1 ${alert.status === 'CRITICAL' ? 'text-destructive' : 'text-amber-700'}`}>Existencia Actual</p>
                                    <p className={`font-mono text-xl font-bold ${alert.status === 'CRITICAL' ? 'text-destructive' : 'text-amber-600'}`}>{alert.currentStock} {alert.unit}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                    {lowStockAlerts.length === 0 && !loading && (
                        <div className="text-center py-8 text-muted-foreground bg-background rounded-xl border">
                            <Box className="h-8 w-8 mx-auto mb-3 text-emerald-600 opacity-50" />
                            <p className="font-medium text-emerald-700">Stock Saludable</p>
                            <p className="text-xs mt-1">No hay alertas en este momento.</p>
                        </div>
                    )}
                </div>
            </div>
                </>
            )}

            {activeTab === 'KITCHEN' && (
                <div className="bg-card p-4 md:p-6 border rounded-xl shadow-sm flex flex-col flex-1 min-h-[400px]">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                        <div>
                            <h2 className="text-xl font-bold flex items-center gap-2"><Loader2 className="h-6 w-6 text-emerald-600" /> Auditoría de Cocina</h2>
                            <p className="text-sm text-muted-foreground mt-1">Tiempo Promedio Global: <span className="font-bold text-foreground text-base">{calculateAverageKitchenTime()} min</span></p>
                        </div>
                        <span className="text-xs bg-muted text-muted-foreground px-3 py-1.5 rounded-full font-mono font-medium border shadow-sm">Últimos {kitchenPerformance.length} registros</span>
                    </div>

                    {/* Desktop View */}
                    <div className="hidden md:block overflow-x-auto flex-1 bg-background rounded-lg border">
                        <table className="w-full text-left text-sm whitespace-nowrap">
                            <thead className="bg-muted text-muted-foreground border-b border-border/50">
                                <tr>
                                    <th className="px-4 py-3 font-medium">Orden / Mesa</th>
                                    <th className="px-4 py-3 font-medium">Producto</th>
                                    <th className="px-4 py-3 font-medium">Ingresó</th>
                                    <th className="px-4 py-3 font-medium">Inicio Prep.</th>
                                    <th className="px-4 py-3 font-medium">Listo</th>
                                    <th className="px-4 py-3 font-medium">Entregado</th>
                                    <th className="px-4 py-3 font-medium text-right">Tiempo Total (Min)</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/50">
                                {kitchenPerformance.map((item, i) => {
                                    const createdAt = new Date(item.createdAt);
                                    const preparingAt = item.preparingAt ? new Date(item.preparingAt) : null;
                                    const readyAt = item.readyAt ? new Date(item.readyAt) : null;
                                    const deliveredAt = item.deliveredAt ? new Date(item.deliveredAt) : null;

                                    const end = deliveredAt || readyAt || preparingAt || new Date();
                                    const diffMs = end.getTime() - createdAt.getTime();
                                    const diffMins = Math.max(0, Math.round(diffMs / 60000));

                                    return (
                                        <tr key={item.id || i} className="hover:bg-muted/50 transition-colors">
                                            <td className="px-4 py-3">
                                                <div className="font-bold">{item.order?.table ? `Mesa ${item.order.table.number}` : (item.order?.customerId || 'Para Llevar')}</div>
                                                <div className="text-xs text-muted-foreground font-mono">#{item.order?.id?.substring(0, 8)}</div>
                                            </td>
                                            <td className="px-4 py-3 font-medium">{item.productSale?.name}</td>
                                            <td className="px-4 py-3 text-muted-foreground">{createdAt.toLocaleTimeString()}</td>
                                            <td className="px-4 py-3 font-mono">{preparingAt ? preparingAt.toLocaleTimeString() : <span className="text-muted-foreground/30">-</span>}</td>
                                            <td className="px-4 py-3 text-emerald-600 font-mono">{readyAt ? readyAt.toLocaleTimeString() : <span className="text-muted-foreground/30">-</span>}</td>
                                            <td className="px-4 py-3 font-mono">{deliveredAt ? deliveredAt.toLocaleTimeString() : <span className="text-muted-foreground/30">-</span>}</td>
                                            <td className="px-4 py-3 text-right">
                                                <span className={`font-black text-lg ${diffMins > 20 ? 'text-red-500' : 'text-foreground'}`}>{diffMins}</span> <span className="text-xs text-muted-foreground font-normal">min</span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* Mobile Card View */}
                    <div className="md:hidden flex flex-col gap-4">
                        {kitchenPerformance.length === 0 && !loading && (
                            <div className="py-12 text-center text-muted-foreground bg-background rounded-xl border">
                                <Loader2 className="h-10 w-10 mx-auto mb-4 opacity-20" />
                                <p className="font-medium text-foreground">No hay datos de auditoría</p>
                                <p className="text-xs px-4">No se encontraron productos en este período.</p>
                            </div>
                        )}
                        {kitchenPerformance.map((item, i) => {
                            const createdAt = new Date(item.createdAt);
                            const preparingAt = item.preparingAt ? new Date(item.preparingAt) : null;
                            const readyAt = item.readyAt ? new Date(item.readyAt) : null;
                            const deliveredAt = item.deliveredAt ? new Date(item.deliveredAt) : null;

                            const end = deliveredAt || readyAt || preparingAt || new Date();
                            const diffMs = end.getTime() - createdAt.getTime();
                            const diffMins = Math.max(0, Math.round(diffMs / 60000));

                            return (
                                <div key={item.id || i} className="bg-background rounded-xl border shadow-sm p-4 flex flex-col gap-3 relative overflow-hidden">
                                    <div className={`absolute left-0 top-0 bottom-0 w-1 ${diffMins > 20 ? 'bg-red-500' : 'bg-primary'}`} />
                                    
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <div className="font-bold text-base">{item.productSale?.name}</div>
                                            <div className="text-sm text-muted-foreground">{item.order?.table ? `Mesa ${item.order.table.number}` : (item.order?.customerId || 'Para Llevar')} <span className="font-mono text-xs opacity-50 ml-1">#{item.order?.id?.substring(0, 8)}</span></div>
                                        </div>
                                        <div className="flex flex-col items-end">
                                            <span className={`font-black text-2xl leading-none ${diffMins > 20 ? 'text-red-500' : 'text-foreground'}`}>{diffMins}</span>
                                            <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Minutos</span>
                                        </div>
                                    </div>
                                    
                                    <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-xs mt-2 pt-3 border-t">
                                        <div>
                                            <span className="text-muted-foreground block mb-0.5 font-medium">1. Ingreso</span>
                                            <span className="font-mono">{createdAt.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                        </div>
                                        <div>
                                            <span className="text-muted-foreground block mb-0.5 font-medium">2. Prep.</span>
                                            <span className="font-mono">{preparingAt ? preparingAt.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '-'}</span>
                                        </div>
                                        <div>
                                            <span className="text-emerald-600 block mb-0.5 font-medium">3. Listo</span>
                                            <span className="font-mono text-emerald-700 font-medium">{readyAt ? readyAt.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '-'}</span>
                                        </div>
                                        <div>
                                            <span className="text-muted-foreground block mb-0.5 font-medium">4. Entrega</span>
                                            <span className="font-mono">{deliveredAt ? deliveredAt.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '-'}</span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {activeTab === 'CASH_FLOW' && cashFlowSummary && (
                <div className="flex flex-col gap-6 animate-in slide-in-from-bottom-4 duration-300">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="p-6 bg-card border rounded-xl shadow-sm">
                            <h4 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-1">Ingresos de Ventas (+)</h4>
                            <p className="text-3xl text-emerald-600 font-bold">${cashFlowSummary.totalSales.toFixed(2)}</p>
                        </div>
                        <div className="p-6 bg-card border rounded-xl shadow-sm">
                            <h4 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-1">Inyecciones Operativas (+)</h4>
                            <p className="text-3xl text-blue-600 font-bold">${cashFlowSummary.totalIncomes.toFixed(2)}</p>
                        </div>
                        <div className="p-6 bg-card border rounded-xl shadow-sm">
                            <h4 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-1">Gastos y Retiros (-)</h4>
                            <p className="text-3xl text-red-600 font-bold">${cashFlowSummary.totalExpenses.toFixed(2)}</p>
                        </div>
                        <div className="p-6 bg-primary text-primary-foreground border-primary rounded-xl shadow-sm">
                            <h4 className="text-sm font-bold uppercase tracking-wider text-primary-foreground/70 mb-1">Resultado Neto Esperado (=)</h4>
                            <p className="text-3xl lg:text-4xl font-black">${cashFlowSummary.netIncome.toFixed(2)}</p>
                        </div>
                    </div>

                    <div className="bg-card rounded-xl border shadow-sm flex-1 overflow-hidden flex flex-col">
                        <div className="p-4 border-b bg-muted/30">
                            <h2 className="font-bold text-lg">Libro Mayor (Histórico de Movimientos)</h2>
                        </div>
                        
                        {/* Desktop View */}
                        <div className="hidden md:block flex-1 overflow-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-muted text-muted-foreground uppercase text-xs sticky top-0 shadow-sm z-10">
                                    <tr>
                                        <th className="px-4 py-3 font-semibold">Fecha / Hora</th>
                                        <th className="px-4 py-3 font-semibold">Sucursal / Origen</th>
                                        <th className="px-4 py-3 font-semibold">Tipo</th>
                                        <th className="px-4 py-3 font-semibold">Concepto / Ref</th>
                                        <th className="px-4 py-3 font-semibold text-right">Monto</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y relative">
                                    {cashFlowTransactions.map(tx => (
                                        <tr key={tx.id} className="hover:bg-muted/50 transition-colors">
                                            <td className="px-4 py-3 text-xs font-mono">{new Date(tx.date).toLocaleString()}</td>
                                            <td className="px-4 py-3 font-medium text-xs">{tx.branchName} <span className="text-muted-foreground">({tx.registerName})</span></td>
                                            <td className="px-4 py-3">
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest ${tx.type === 'SALE' ? 'bg-emerald-500/10 text-emerald-700' : tx.type === 'INCOME' ? 'bg-blue-500/10 text-blue-700' : tx.type === 'REFUND' ? 'bg-orange-500/10 text-orange-700' : 'bg-red-500/10 text-red-700'}`}>
                                                    {tx.type}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="text-xs">{tx.description}</div>
                                                <div className="text-[10px] text-muted-foreground font-mono">{tx.reference}</div>
                                            </td>
                                            <td className={`px-4 py-3 text-right font-bold font-mono ${tx.type === 'EXPENSE' || tx.type === 'REFUND' ? 'text-destructive' : 'text-emerald-600'}`}>
                                                {tx.type === 'EXPENSE' || tx.type === 'REFUND' ? '-' : ''}${tx.amount.toFixed(2)}
                                            </td>
                                        </tr>
                                    ))}
                                    {cashFlowTransactions.length === 0 && !loading && (
                                        <tr><td colSpan={5} className="text-center py-12 text-muted-foreground">No existen flujos de efectivo en el rango seleccionado.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile Card View */}
                        <div className="md:hidden flex flex-col gap-3 p-4 bg-muted/10">
                            {cashFlowTransactions.map(tx => (
                                <div key={tx.id} className="bg-background border rounded-xl p-4 shadow-sm relative overflow-hidden">
                                    <div className={`absolute left-0 top-0 bottom-0 w-1 ${tx.type === 'EXPENSE' || tx.type === 'REFUND' ? 'bg-destructive' : 'bg-emerald-500'}`} />
                                    <div className="flex justify-between items-start">
                                        <div className="pr-2">
                                            <p className="font-bold text-sm leading-tight">{tx.description}</p>
                                            <p className="text-[10px] text-muted-foreground font-mono mt-1 opacity-70 truncate max-w-[180px]">{tx.reference}</p>
                                        </div>
                                        <div className="flex flex-col items-end">
                                            <p className={`font-bold font-mono text-xl leading-none ${tx.type === 'EXPENSE' || tx.type === 'REFUND' ? 'text-destructive' : 'text-emerald-600'}`}>
                                                {tx.type === 'EXPENSE' || tx.type === 'REFUND' ? '-' : ''}${tx.amount.toFixed(2)}
                                            </p>
                                            <span className={`inline-block px-2 py-0.5 mt-2 rounded text-[10px] font-bold uppercase tracking-widest ${tx.type === 'SALE' ? 'bg-emerald-500/10 text-emerald-700' : tx.type === 'INCOME' ? 'bg-blue-500/10 text-blue-700' : tx.type === 'REFUND' ? 'bg-orange-500/10 text-orange-700' : 'bg-red-500/10 text-red-700'}`}>
                                                {tx.type}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="mt-3 pt-3 border-t grid grid-cols-2 text-xs text-muted-foreground">
                                        <div>
                                            <span className="block font-semibold uppercase tracking-wider text-[10px] mb-0.5">Fecha / Hora</span>
                                            <span className="font-mono">{new Date(tx.date).toLocaleString([], {month:'short', day:'numeric', hour:'2-digit', minute:'2-digit'})}</span>
                                        </div>
                                        <div className="text-right">
                                            <span className="block font-semibold uppercase tracking-wider text-[10px] mb-0.5">Origen</span>
                                            <span className="font-medium truncate block">{tx.branchName}</span>
                                            <span className="text-[10px] opacity-70">({tx.registerName})</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {cashFlowTransactions.length === 0 && !loading && (
                                <div className="text-center py-8 text-muted-foreground bg-background rounded-xl border">No existen flujos de efectivo.</div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'REGISTERS' && (
                <div className="flex flex-col gap-6 animate-in slide-in-from-bottom-4 duration-300">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-6 bg-card border rounded-xl shadow-sm">
                            <h4 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-1">Efectivo Consolidado (Total Recibido)</h4>
                            <p className="text-4xl text-foreground font-black">${registersTotals.grandTotal.toFixed(2)}</p>
                        </div>
                        <div className={`p-6 bg-card border rounded-xl shadow-sm ${registersTotals.totalDiscrepancy < 0 ? 'border-destructive/50' : ''}`}>
                            <h4 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-1">Diferencias/Faltantes Global</h4>
                            <p className={`text-4xl font-black ${registersTotals.totalDiscrepancy < 0 ? 'text-destructive' : 'text-emerald-600'}`}>
                                {registersTotals.totalDiscrepancy >= 0 ? '0.00 (OK)' : `$${registersTotals.totalDiscrepancy.toFixed(2)}`}
                            </p>
                        </div>
                    </div>

                    <div className="bg-card rounded-xl border shadow-sm flex-1 overflow-hidden flex flex-col">
                        <div className="p-4 border-b bg-muted/30">
                            <h2 className="font-bold text-lg">Consolidado por Sucursal y Caja (Turnos Cerrados)</h2>
                        </div>
                        
                        {/* Desktop View */}
                        <div className="hidden md:block flex-1 overflow-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-muted text-muted-foreground uppercase text-xs sticky top-0 shadow-sm z-10">
                                    <tr>
                                        <th className="px-4 py-3 font-semibold">Sucursal</th>
                                        <th className="px-4 py-3 font-semibold">Terminal (Caja)</th>
                                        <th className="px-4 py-3 font-semibold text-center">Turnos Realizados</th>
                                        <th className="px-4 py-3 font-semibold text-right">Efectivo Total</th>
                                        <th className="px-4 py-3 font-semibold text-center">Estado Auditoría</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y relative">
                                    {registersConsolidated.map((r, i) => (
                                        <tr key={i} className="hover:bg-muted/50 transition-colors">
                                            <td className="px-4 py-4 font-bold">{r.branchName}</td>
                                            <td className="px-4 py-4 text-primary font-bold tracking-wide">{r.registerName}</td>
                                            <td className="px-4 py-4 text-center font-mono font-medium">{r.sessionCount} Turnos</td>
                                            <td className="px-4 py-4 text-right font-bold font-mono text-lg">${r.totalClosed.toFixed(2)}</td>
                                            <td className="px-4 py-4 text-center">
                                                {r.discrepancy < 0 ? (
                                                    <span className="px-3 py-1 bg-destructive/10 text-destructive rounded font-bold text-xs uppercase tracking-wider">
                                                        FALTANTES: ${r.discrepancy.toFixed(2)}
                                                    </span>
                                                ) : (
                                                    <span className="px-3 py-1 bg-emerald-500/10 text-emerald-700 rounded font-bold text-xs uppercase tracking-wider">
                                                        CUADRE PERFECTO
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                    {registersConsolidated.length === 0 && !loading && (
                                        <tr><td colSpan={5} className="text-center py-12 text-muted-foreground">No hay turnos cerrados en el rango seleccionado para consolidar.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile Card View */}
                        <div className="md:hidden flex flex-col gap-3 p-4 bg-muted/10">
                            {registersConsolidated.map((r, i) => (
                                <div key={i} className="bg-background border rounded-xl p-4 shadow-sm relative overflow-hidden">
                                    <div className={`absolute left-0 top-0 bottom-0 w-1 ${r.discrepancy < 0 ? 'bg-destructive' : 'bg-emerald-500'}`} />
                                    <div className="flex justify-between items-start mb-3">
                                        <div>
                                            <h4 className="font-bold text-base text-primary">{r.registerName}</h4>
                                            <p className="text-xs text-muted-foreground mt-0.5 font-medium">{r.branchName}</p>
                                        </div>
                                        <div className="bg-muted px-2 py-1 rounded-md text-center">
                                            <span className="block font-mono font-bold leading-none">{r.sessionCount}</span>
                                            <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Turnos</span>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4 mt-2 pt-3 border-t">
                                        <div>
                                            <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mb-1">Efectivo Total</p>
                                            <p className="font-mono text-xl font-bold">${r.totalClosed.toFixed(2)}</p>
                                        </div>
                                        <div className="flex flex-col justify-end items-end">
                                            {r.discrepancy < 0 ? (
                                                <span className="px-2 py-1 bg-destructive/10 text-destructive rounded font-bold text-[10px] uppercase tracking-wider text-right">
                                                    FALTANTES:<br/>${Math.abs(r.discrepancy).toFixed(2)}
                                                </span>
                                            ) : (
                                                <span className="px-2 py-1 bg-emerald-500/10 text-emerald-700 rounded font-bold text-[10px] uppercase tracking-wider text-right">
                                                    CUADRE PERFECTO
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {registersConsolidated.length === 0 && !loading && (
                                <div className="text-center py-8 text-muted-foreground bg-background rounded-xl border">No hay turnos cerrados.</div>
                            )}
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}
