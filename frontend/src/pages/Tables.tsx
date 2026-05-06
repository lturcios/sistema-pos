import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layers, Search, Plus, FileText, User, Users, X, Loader2, Edit, CreditCard } from 'lucide-react';
import { api } from '../lib/axios';
import { useAuthStore } from '../store/authStore';

interface Table {
    id: string;
    branchId: string;
    number: string;
    label: string | null;
    capacity: number;
    status: 'AVAILABLE' | 'OCCUPIED' | 'RESERVED';
    colorTheme: string;
}

interface Order {
    id: string;
    branchId: string;
    tableId: string | null;
    customerId: string | null;
    status: 'OPEN' | 'PENDING' | 'PAID' | 'CANCELLED';
    subtotal: number;
    taxTotal: number;
    total: number;
    createdAt: string;
    items?: OrderItem[];
}

interface OrderItem {
    id: string;
    orderId: string;
    productSaleId: string;
    qty: string | number;
    unitPrice: string | number;
    discount: string | number;
    notes: string | null;
    productSale?: { name: string };
}

interface Branch {
    id: string;
    name: string;
}

export default function Tables() {
    const [activeTab, setActiveTab] = useState<'tables' | 'orders'>('tables');
    const [loading, setLoading] = useState(false);
    const [tables, setTables] = useState<Table[]>([]);
    const [orders, setOrders] = useState<Order[]>([]);
    const [activeTableOrders, setActiveTableOrders] = useState<Order[]>([]);
    const navigate = useNavigate();

    // SuperAdmin Branch selection if needed, otherwise fallback to user's branch
    const user = useAuthStore(state => state.user);
    const [branches, setBranches] = useState<Branch[]>([]);
    const [selectedBranchId, setSelectedBranchId] = useState<string>(user?.branchId || '');

    // Modals state
    const [showTableModal, setShowTableModal] = useState(false);
    const [newTable, setNewTable] = useState<{ id?: string, number: string, label: string, capacity: number, colorTheme: string }>({ number: '', label: '', capacity: 4, colorTheme: 'default' });

    const tableColors = [
        { id: 'default', name: 'Original', bgClass: 'bg-primary', occupied: 'bg-primary text-primary-foreground border-primary shadow-[4px_4px_0px_0px_rgba(0,0,0,0.5)]', available: 'bg-primary/10 text-foreground border-primary border-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.5)] hover:bg-primary/20 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,0.5)]' },
        { id: 'slate', name: 'Gris Pizarra', bgClass: 'bg-slate-800', occupied: 'bg-slate-800 text-white border-slate-900 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)]', available: 'bg-slate-200 border-slate-800 border-2 text-slate-900 shadow-[4px_4px_0px_0px_rgba(15,23,42,0.5)] hover:bg-slate-300 hover:shadow-[6px_6px_0px_0px_rgba(15,23,42,0.5)]' },
        { id: 'red', name: 'Rojo Carmesí', bgClass: 'bg-red-700', occupied: 'bg-red-700 text-white border-red-900 shadow-[4px_4px_0px_0px_rgba(127,29,29,1)]', available: 'bg-red-200 border-red-700 border-2 text-red-950 shadow-[4px_4px_0px_0px_rgba(127,29,29,0.5)] hover:bg-red-300 hover:shadow-[6px_6px_0px_0px_rgba(127,29,29,0.5)]' },
        { id: 'orange', name: 'Naranja Vivo', bgClass: 'bg-orange-600', occupied: 'bg-orange-600 text-white border-orange-800 shadow-[4px_4px_0px_0px_rgba(154,52,18,1)]', available: 'bg-orange-200 border-orange-600 border-2 text-orange-950 shadow-[4px_4px_0px_0px_rgba(154,52,18,0.5)] hover:bg-orange-300 hover:shadow-[6px_6px_0px_0px_rgba(154,52,18,0.5)]' },
        { id: 'yellow', name: 'Amarillo', bgClass: 'bg-yellow-400', occupied: 'bg-yellow-400 text-yellow-950 border-yellow-600 shadow-[4px_4px_0px_0px_rgba(202,138,4,1)]', available: 'bg-yellow-200 border-yellow-500 border-2 text-yellow-950 shadow-[4px_4px_0px_0px_rgba(202,138,4,0.5)] hover:bg-yellow-300 hover:shadow-[6px_6px_0px_0px_rgba(202,138,4,0.5)]' },
        { id: 'green', name: 'Verde Bosque', bgClass: 'bg-emerald-700', occupied: 'bg-emerald-700 text-white border-emerald-900 shadow-[4px_4px_0px_0px_rgba(6,78,59,1)]', available: 'bg-emerald-200 border-emerald-700 border-2 text-emerald-950 shadow-[4px_4px_0px_0px_rgba(6,78,59,0.5)] hover:bg-emerald-300 hover:shadow-[6px_6px_0px_0px_rgba(6,78,59,0.5)]' },
        { id: 'teal', name: 'Verde Azulado', bgClass: 'bg-teal-600', occupied: 'bg-teal-600 text-white border-teal-800 shadow-[4px_4px_0px_0px_rgba(17,94,89,1)]', available: 'bg-teal-200 border-teal-600 border-2 text-teal-950 shadow-[4px_4px_0px_0px_rgba(17,94,89,0.5)] hover:bg-teal-300 hover:shadow-[6px_6px_0px_0px_rgba(17,94,89,0.5)]' },
        { id: 'blue', name: 'Azul Océano', bgClass: 'bg-blue-700', occupied: 'bg-blue-700 text-white border-blue-900 shadow-[4px_4px_0px_0px_rgba(30,58,138,1)]', available: 'bg-blue-200 border-blue-700 border-2 text-blue-950 shadow-[4px_4px_0px_0px_rgba(30,58,138,0.5)] hover:bg-blue-300 hover:shadow-[6px_6px_0px_0px_rgba(30,58,138,0.5)]' },
        { id: 'indigo', name: 'Indigo Profundo', bgClass: 'bg-indigo-700', occupied: 'bg-indigo-700 text-white border-indigo-900 shadow-[4px_4px_0px_0px_rgba(49,46,129,1)]', available: 'bg-indigo-200 border-indigo-700 border-2 text-indigo-950 shadow-[4px_4px_0px_0px_rgba(49,46,129,0.5)] hover:bg-indigo-300 hover:shadow-[6px_6px_0px_0px_rgba(49,46,129,0.5)]' },
        { id: 'purple', name: 'Púrpura Real', bgClass: 'bg-purple-700', occupied: 'bg-purple-700 text-white border-purple-900 shadow-[4px_4px_0px_0px_rgba(88,28,135,1)]', available: 'bg-purple-200 border-purple-700 border-2 text-purple-950 shadow-[4px_4px_0px_0px_rgba(88,28,135,0.5)] hover:bg-purple-300 hover:shadow-[6px_6px_0px_0px_rgba(88,28,135,0.5)]' },
        { id: 'pink', name: 'Rosa Vibrante', bgClass: 'bg-pink-600', occupied: 'bg-pink-600 text-white border-pink-800 shadow-[4px_4px_0px_0px_rgba(157,23,77,1)]', available: 'bg-pink-200 border-pink-600 border-2 text-pink-950 shadow-[4px_4px_0px_0px_rgba(157,23,77,0.5)] hover:bg-pink-300 hover:shadow-[6px_6px_0px_0px_rgba(157,23,77,0.5)]' }
    ];

    const getTableColorClasses = (table: Table) => {
        const theme = tableColors.find(t => t.id === (table.colorTheme || 'default')) || tableColors[0];
        if (table.status === 'OCCUPIED') return theme.occupied;
        if (table.status === 'RESERVED') return '!bg-amber-400 text-amber-900 border-amber-900 !shadow-[4px_4px_0px_0px_rgba(120,53,15,1)]';
        return theme.available;
    };

    const getTagColorClasses = (table: Table) => {
        const theme = tableColors.find(t => t.id === (table.colorTheme || 'default')) || tableColors[0];
        const baseClasses = theme.available.split(' ').filter(c => !c.startsWith('hover:') && !c.startsWith('shadow-')).join(' ');
        return `brutal-border shadow-[2px_2px_0_0_rgba(0,0,0,0.5)] ${baseClasses}`;
    };

    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [viewOrderDetails, setViewOrderDetails] = useState<Order | null>(null); // For consulting paid orders
    const [statusFilter, setStatusFilter] = useState('');
    const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'CARD' | 'TRANSFER'>('CASH');
    const [paymentAmount, setPaymentAmount] = useState<string>('');

    useEffect(() => {
        // If user is superadmin and branchId is blank or we explicitly want to fetch branches
        if (!selectedBranchId) {
            api.get('/branches').then(res => {
                if (res.data.success && res.data.data.length > 0) {
                    setBranches(res.data.data);
                    setSelectedBranchId(res.data.data[0].id);
                }
            }).catch(console.error);
        }
    }, [selectedBranchId]);

    useEffect(() => {
        if (selectedBranchId) {
            if (activeTab === 'tables') fetchTables();
            if (activeTab === 'orders') fetchOrders();
        }
    }, [activeTab, selectedBranchId, statusFilter]);

    const fetchTables = async () => {
        setLoading(true);
        try {
            const [tablesRes, ordersRes] = await Promise.all([
                api.get(`/orders/tables?branchId=${selectedBranchId}`),
                api.get(`/orders?branchId=${selectedBranchId}&status=OPEN,PENDING`)
            ]);
            if (tablesRes.data?.success) setTables(tablesRes.data.data);
            if (ordersRes.data?.success) setActiveTableOrders(ordersRes.data.data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const fetchOrders = async () => {
        setLoading(true);
        try {
            // Limit to 50 for quick display, could add real pagination
            let url = `/orders?branchId=${selectedBranchId}&limit=50`;
            if (statusFilter) url += `&status=${statusFilter}`;
            const { data } = await api.get(url);
            if (data.success) setOrders(data.data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateTable = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedBranchId) {
            alert("Seleccione una sucursal primero");
            return;
        }
        setLoading(true);
        try {
            if (newTable.id) {
                await api.put(`/orders/tables/${newTable.id}`, {
                    number: newTable.number,
                    label: newTable.label,
                    capacity: Number(newTable.capacity),
                    colorTheme: newTable.colorTheme
                });
            } else {
                await api.post('/orders/tables', {
                    branchId: selectedBranchId,
                    number: newTable.number,
                    label: newTable.label,
                    capacity: Number(newTable.capacity),
                    colorTheme: newTable.colorTheme
                });
            }
            setShowTableModal(false);
            fetchTables();
            setNewTable({ number: '', label: '', capacity: 4, colorTheme: 'default' });
        } catch (err: unknown) {
            const error = err as { response?: { data?: { error?: string } } };
            alert(error.response?.data?.error || 'Error al guardar mesa');
        } finally {
            setLoading(false);
        }
    };

    const handlePayOrder = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedOrder) return;
        setLoading(true);
        try {
            await api.post(`/orders/${selectedOrder.id}/pay`, {
                method: paymentMethod,
                amount: Number(paymentAmount)
            });
            alert('¡Pago registrado exitosamente!');
            setSelectedOrder(null);
            fetchOrders();
            fetchTables(); // Refresh tables in case one was freed
        } catch (err: unknown) {
            const error = err as { response?: { data?: { error?: string } } };
            alert(error.response?.data?.error || 'Error procesando el pago');
        } finally {
            setLoading(false);
        }
    };

    const handleTableClick = async (table: Table) => {
        if (table.status === 'OCCUPIED' || table.status === 'RESERVED') {
            const activeOrder = activeTableOrders.find((o) => o.tableId === table.id);

            const proceedWithOrder = (foundOrder: Order) => {
                if (foundOrder.status === 'PENDING') {
                    setSelectedOrder(foundOrder);
                    setPaymentAmount(foundOrder.total.toString());
                    setPaymentMethod('CASH');
                } else {
                    navigate(`/pos?orderId=${foundOrder.id}`);
                }
            };

            if (activeOrder) {
                proceedWithOrder(activeOrder);
            } else {
                try {
                    const { data } = await api.get(`/orders?branchId=${selectedBranchId}&status=OPEN,PENDING`);
                    const found = data.data.find((o: Order) => o.tableId === table.id);
                    if (found) proceedWithOrder(found);
                    else alert('No se pudo encontrar la orden activa o pendiente en esta mesa.');
                } catch (err) {
                    console.error(err);
                }
            }
        } else if (table.status === 'AVAILABLE') {
            navigate(`/pos?tableId=${table.id}`);
        }
    };
    const handleCancelOrder = async (orderId: string) => {
        if (!confirm('¿Está seguro de anular esta orden? Si ya estaba cobrada, el inventario y dinero regresarán a su estado anterior.')) return;
        setLoading(true);
        try {
            await api.post(`/orders/${orderId}/cancel`, { reason: 'Anulación manual desde panel' });
            alert("Orden anulada correctamente.");
            setViewOrderDetails(null);
            fetchOrders();
            fetchTables();
        } catch (e: unknown) {
            const error = e as { response?: { data?: { error?: string } } };
            alert(error.response?.data?.error || 'Error al anular orden');
        } finally {
            setLoading(false);
        }
    };

    const handleMarkPending = async (orderId: string) => {
        setLoading(true);
        try {
            await api.put(`/orders/${orderId}`, { status: 'PENDING' });
            alert("Orden marcada como PENDIENTE (Pre-cuenta solicitada).");
            setViewOrderDetails(null);
            fetchOrders();
        } catch (e: unknown) {
            const error = e as { response?: { data?: { error?: string } } };
            alert(error.response?.data?.error || 'Error al actualizar orden');
        } finally {
            setLoading(false);
        }
    };

    const handleOrderClick = async (o: Order) => {
        // Fetch detailed order including products for all statuses
        try {
            const { data } = await api.get(`/orders/${o.id}`);
            if (data.success) {
                setViewOrderDetails(data.data);
            }
        } catch (err) {
            console.error(err);
            alert("No se pudo cargar el detalle de la orden");
        }
    };

    return (
        <div className="p-4 md:p-6 h-full flex flex-col bg-background relative font-sans">

            <div className="flex flex-col md:flex-row justify-between md:items-end gap-4 mb-6">
                <div>
                    <h1 className="text-3xl md:text-4xl font-black tracking-widest uppercase">MESAS Y ÓRDENES</h1>
                    <p className="text-muted-foreground mt-1 font-mono text-sm uppercase">Gestión visual del comedor y órdenes activas.</p>
                </div>

                <div className="flex gap-2 items-center">
                    {branches.length > 0 && (
                        <select
                            value={selectedBranchId} onChange={e => setSelectedBranchId(e.target.value)}
                            className="brutal-border px-3 py-2 text-sm bg-background mr-2 font-bold uppercase"
                        >
                            {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                        </select>
                    )}

                    <button
                        onClick={() => {
                            if (activeTab === 'tables') setShowTableModal(true);
                        }}
                        className="flex items-center gap-2 brutal-button bg-primary text-primary-foreground px-4 py-2 text-sm font-black uppercase tracking-widest"
                    >
                        <Plus className="h-4 w-4" />
                        {activeTab === 'tables' ? 'AGREGAR MESA' : 'NUEVA ORDEN'}
                    </button>
                </div>
            </div>

            <div className="flex border-b-2 border-foreground mb-6 shrink-0 uppercase text-sm font-black tracking-widest">
                <button
                    onClick={() => setActiveTab('tables')}
                    className={`flex-1 md:flex-none flex justify-center items-center gap-2 px-6 py-3 border-r-2 border-foreground transition-all ${activeTab === 'tables' ? 'bg-foreground text-background' : 'hover:bg-muted text-foreground'}`}
                >
                    <Layers className="h-5 w-5" /> MAPA DE MESAS
                </button>
                <button
                    onClick={() => setActiveTab('orders')}
                    className={`flex-1 md:flex-none flex justify-center items-center gap-2 px-6 py-3 transition-all ${activeTab === 'orders' ? 'bg-foreground text-background' : 'hover:bg-muted text-foreground'}`}
                >
                    <FileText className="h-5 w-5" /> HISTORIAL DE ÓRDENES
                </button>
            </div>

            <div className="flex-1 overflow-auto flex flex-col">

                {/* Loading Indicator */}
                {loading && (
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 bg-background/80 px-4 py-2 rounded-lg flex items-center gap-2 border shadow-lg backdrop-blur-sm">
                        <Loader2 className="h-5 w-5 animate-spin text-primary" />
                        <span className="text-sm font-medium">Sincronizando...</span>
                    </div>
                )}

                {/* TAB: MESAS (Mapa) */}
                {activeTab === 'tables' && (
                    <div className="flex-1 overflow-y-auto w-full p-2">
                        {tables.length === 0 && !loading && (
                            <div className="py-12 flex flex-col items-center justify-center text-muted-foreground text-center">
                                <Layers className="h-16 w-16 mb-4 opacity-20" />
                                <p className="text-lg font-medium text-foreground/80">No hay mesas mapeadas aún</p>
                                <p className="mt-2 text-sm">Comienza agregando mesas físicas a esta sucursal.</p>
                            </div>
                        )}

                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                            {tables.map(table => {
                                const activeOrder = activeTableOrders.find(o => o.tableId === table.id);
                                return (
                                    <button
                                        key={table.id}
                                        onClick={() => handleTableClick(table)}
                                        className={`relative flex flex-col items-center justify-center p-6 pb-10 brutal-card transition-all active:translate-x-[2px] active:translate-y-[2px] active:shadow-none group ${getTableColorClasses(table)}`}
                                    >
                                        {/* Edit Button */}
                                        <div
                                            className="absolute top-2 left-2 z-30 p-1.5 rounded-sm bg-background/50 hover:bg-background text-foreground opacity-0 group-hover:opacity-100 transition-opacity border cursor-pointer pointer-events-auto"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setNewTable({ id: table.id, number: table.number, label: table.label || '', capacity: table.capacity, colorTheme: table.colorTheme || 'default' });
                                                setShowTableModal(true);
                                            }}
                                            title="Editar Mesa"
                                        >
                                            <Edit className="h-4 w-4" />
                                        </div>

                                        {/* Indicador de Status Superior */}
                                        <div className="absolute top-3 right-3 flex items-center gap-1.5 z-20">
                                            <span className="relative flex h-2.5 w-2.5">
                                                {table.status === 'OCCUPIED' && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-background opacity-75"></span>}
                                                <span className={`relative inline-flex rounded-full h-2.5 w-2.5 
                                                ${table.status === 'AVAILABLE' ? 'bg-emerald-500' : ''}
                                                ${table.status === 'OCCUPIED' ? 'bg-background' : ''}
                                                ${table.status === 'RESERVED' ? 'bg-amber-500' : ''}
                                            `}></span>
                                            </span>
                                        </div>

                                        {table.status === 'OCCUPIED' && (
                                            <div className="absolute overflow-hidden right-0 top-0 h-16 w-16">
                                                <div className="absolute -right-4 top-4 bg-background text-foreground uppercase tracking-widest text-[8px] font-black py-0.5 w-[80px] text-center rotate-45 shadow-sm">
                                                    En Uso
                                                </div>
                                            </div>
                                        )}

                                        {/* Info Mesa */}
                                        <div className={`h-16 w-16 mb-4 flex items-center justify-center brutal-border z-10 ${table.status === 'AVAILABLE' ? 'bg-muted' : 'bg-background/20 backdrop-blur-sm'}`}>
                                            <span className="text-3xl font-black">{table.number}</span>
                                        </div>

                                        <h3 className="font-bold text-sm text-center leading-tight mb-2 uppercase">{table.label || 'Mesa'}</h3>

                                        <div className="flex items-center gap-1.5 text-xs font-medium opacity-70">
                                            <Users className="h-3 w-3" />
                                            <span>{table.capacity} pax</span>
                                        </div>

                                        {table.status === 'OCCUPIED' && (
                                            <div className="mt-2 mb-2 brutal-border bg-background text-foreground px-3 py-1 text-[10px] font-black uppercase tracking-widest shadow-none flex items-center gap-1 z-10">
                                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                                ACTIVA
                                            </div>
                                        )}
                                        {table.status === 'AVAILABLE' && (
                                            <div className="mt-2 mb-2brutal-border px-3 py-1 bg-background text-muted-foreground text-[10px] uppercase font-black tracking-widest shadow-none z-10">
                                                LIBRE
                                            </div>
                                        )}

                                        {/* Etiqueta de Cuenta */}
                                        {activeOrder && (
                                            <div className={`absolute bottom-2 left-1/2 -translate-x-1/2 font-black text-m px-3 py-1 whitespace-nowrap z-30 ${getTagColorClasses(table)}`}>
                                                {activeOrder.status === 'PENDING' && <span className="mr-1 text-[10px] align-top">PENDIENTE</span>}
                                                ${Number(activeOrder.total).toFixed(2)}
                                            </div>
                                        )}
                                    </button>
                                )
                            })}
                        </div>
                    </div>
                )}

                {/* TAB: HISTORIAL ORDENES */}
                {activeTab === 'orders' && (
                    <div className="brutal-card bg-card h-full flex flex-col overflow-hidden">
                        {/* Toolbar interna */}
                        <div className="p-4 border-b-2 border-foreground flex justify-between items-center bg-muted/10">
                            <div className="relative w-72">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                                <input type="text" placeholder="BUSCAR ORDEN..." className="w-full pl-10 pr-4 py-2 text-sm font-bold placeholder:text-muted-foreground brutal-border bg-transparent focus:outline-none focus:bg-accent uppercase" />
                            </div>
                            <div className="flex gap-2">
                                <select
                                    className="brutal-border px-3 py-2 text-sm font-bold bg-transparent focus:outline-none focus:bg-accent text-foreground uppercase"
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(e.target.value)}
                                >
                                    <option value="">ESTADO: TODAS</option>
                                    <option value="OPEN">ABIERTAS</option>
                                    <option value="PENDING">PENDIENTES</option>
                                    <option value="PAID">PAGADAS</option>
                                    <option value="CANCELLED">CANCELADAS</option>
                                </select>
                            </div>
                        </div>

                        {/* Tabla Ordenes */}
                        <div className="flex-1 overflow-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-foreground text-background font-black uppercase tracking-widest text-xs sticky top-0 z-10">
                                    <tr>
                                        <th className="px-6 py-4">Nº Orden / Fecha</th>
                                        <th className="px-6 py-4">Origen</th>
                                        <th className="px-6 py-4">Cliente</th>
                                        <th className="px-6 py-4 text-center">Estado</th>
                                        <th className="px-6 py-4 text-right">Total</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y-2 divide-foreground">
                                    {orders.map(o => (
                                        <tr key={o.id} className={`transition-colors cursor-pointer group hover:bg-muted ${o.status === 'CANCELLED' ? 'opacity-50' : ''}`} onClick={() => handleOrderClick(o)}>
                                            <td className="px-6 py-4 font-mono font-bold text-primary">
                                                <div className="text-foreground text-base">#{o.id.substring(0, 8).toUpperCase()}</div>
                                                <div className="text-xs text-muted-foreground">{new Date(o.createdAt).toLocaleString()}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                {o.tableId ? <span className="brutal-border px-2 py-1 text-[10px] font-black uppercase tracking-widest bg-background">EN MESA</span> : <span className="text-muted-foreground text-[10px] font-bold uppercase tracking-widest">PARA LLEVAR</span>}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2 font-bold uppercase text-xs tracking-wider">
                                                    <User className="h-4 w-4" /> {o.customerId || 'CONSUMIDOR FINAL'}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={`brutal-border px-3 py-1 text-[10px] font-black uppercase tracking-widest
                             ${o.status === 'OPEN' ? 'bg-amber-400 text-amber-900 border-amber-900' : ''}
                             ${o.status === 'PAID' ? 'bg-emerald-400 text-emerald-900 border-emerald-900' : ''}
                             ${o.status === 'CANCELLED' ? 'bg-destructive text-destructive-foreground border-destructive' : ''}
                             ${o.status === 'PENDING' ? 'bg-primary text-primary-foreground border-primary' : ''}
                          `}>
                                                    {o.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right font-black text-xl flex justify-end gap-4 items-center h-full">
                                                ${Number(o.total).toFixed(2)}
                                                {(o.status === 'OPEN' || o.status === 'PENDING') && (
                                                    <div className="flex gap-2">
                                                        <button title={o.status === 'OPEN' ? "Ver/Editar" : "Ver"} onClick={(e) => { e.stopPropagation(); navigate(`/pos?orderId=${o.id}`); }} className="brutal-button bg-background text-foreground px-3 py-2 text-[10px] flex items-center justify-center">
                                                            <Edit className="h-4 w-4" />
                                                        </button>
                                                        <button title="Cobrar" onClick={(e) => { e.stopPropagation(); setSelectedOrder(o); setPaymentAmount(o.total.toString()); setPaymentMethod('CASH'); }} className="brutal-button bg-primary text-primary-foreground px-3 py-2 text-[10px] flex items-center justify-center gap-2">
                                                            <CreditCard className="h-4 w-4" /> COBRAR
                                                        </button>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    ))}

                                    {orders.length === 0 && !loading && (
                                        <tr><td colSpan={5} className="text-center py-12 text-muted-foreground font-bold uppercase tracking-widest text-sm">No hay órdenes registradas.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

            </div>

            {/* MODAL: Nueva Mesa */}
            {showTableModal && (
                <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="w-full max-w-sm bg-card border rounded-xl shadow-lg flex flex-col animate-in zoom-in-95 duration-200">
                        <div className="p-4 border-b flex justify-between items-center"><h2 className="text-lg font-bold">{newTable.id ? 'Editar Mesa' : 'Agregar Nueva Mesa'}</h2><button onClick={() => setShowTableModal(false)}><X className="h-5 w-5" /></button></div>
                        <form onSubmit={handleCreateTable} className="p-4 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm font-medium mb-1 block">Número (#)</label>
                                    <input required type="text" value={newTable.number} onChange={e => setNewTable({ ...newTable, number: e.target.value })} className="w-full border rounded-md px-3 py-2 bg-transparent text-sm font-mono" placeholder="Ej: 12" />
                                </div>
                                <div>
                                    <label className="text-sm font-medium mb-1 block">Capacidad (Pax)</label>
                                    <input required type="number" min="1" value={newTable.capacity} onChange={e => setNewTable({ ...newTable, capacity: Number(e.target.value) })} className="w-full border rounded-md px-3 py-2 bg-transparent text-sm" placeholder="4" />
                                </div>
                            </div>
                            <div>
                                <label className="text-sm font-medium mb-1 block">Etiqueta/Area (Opcional)</label>
                                <input value={newTable.label} onChange={e => setNewTable({ ...newTable, label: e.target.value })} className="w-full border rounded-md px-3 py-2 bg-transparent text-sm" placeholder="Ej: Terraza Norte" />
                            </div>
                            <div>
                                <label className="text-sm font-medium mb-1 block">Color de Mesa</label>
                                <div className="grid grid-cols-5 gap-2 mt-2">
                                    {tableColors.map((color) => (
                                        <button
                                            key={color.id}
                                            type="button"
                                            onClick={() => setNewTable({ ...newTable, colorTheme: color.id })}
                                            className={`h-8 w-full rounded-md border-2 transition-all cursor-pointer ${newTable.colorTheme === color.id ? 'border-foreground shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] scale-110 z-10' : 'border-transparent'} ${color.bgClass}`}
                                            title={color.name}
                                        />
                                    ))}
                                </div>
                            </div>
                            <div className="pt-4 flex justify-end gap-2 border-t">
                                <button type="submit" disabled={loading} className="w-full brutal-button bg-foreground text-background py-3 font-bold hover:bg-primary hover:text-primary-foreground transition-colors">
                                    {newTable.id ? 'Guardar Cambios' : 'Guardar Mapeo'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL: Cobrar Orden */}
            {selectedOrder && (
                <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="w-full max-w-sm bg-card border rounded-xl shadow-lg flex flex-col animate-in zoom-in-95 duration-200">
                        <div className="p-4 border-b flex justify-between items-center"><h2 className="text-lg font-bold">Cobrar Orden</h2><button onClick={() => setSelectedOrder(null)}><X className="h-5 w-5" /></button></div>
                        <form onSubmit={handlePayOrder} className="p-4 space-y-4">
                            <div className="bg-muted p-4 rounded-lg text-center shadow-inner">
                                <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider mb-1">Total a Pagar</p>
                                <p className="font-bold text-3xl text-primary">${Number(selectedOrder.total).toFixed(2)}</p>
                            </div>
                            <div>
                                <label className="text-sm font-medium mb-1 block">Método de Pago</label>
                                <div className="grid grid-cols-3 gap-2">
                                    <button type="button" onClick={() => setPaymentMethod('CASH')} className={`py-2 text-sm font-bold border rounded-md transition-colors ${paymentMethod === 'CASH' ? 'bg-emerald-500/10 border-emerald-500 text-emerald-600' : 'bg-transparent text-muted-foreground'}`}>EFECTIVO</button>
                                    <button type="button" onClick={() => setPaymentMethod('CARD')} className={`py-2 text-sm font-bold border rounded-md transition-colors ${paymentMethod === 'CARD' ? 'bg-blue-500/10 border-blue-500 text-blue-600' : 'bg-transparent text-muted-foreground'}`}>TARJETA</button>
                                    <button type="button" onClick={() => setPaymentMethod('TRANSFER')} className={`py-2 text-sm font-bold border rounded-md transition-colors ${paymentMethod === 'TRANSFER' ? 'bg-violet-500/10 border-violet-500 text-violet-600' : 'bg-transparent text-muted-foreground'}`}>TRANSF.</button>
                                </div>
                            </div>
                            <div>
                                <label className="text-sm font-medium mb-1 block">Monto Entregado / Recibido</label>
                                <input required type="number" step="0.01" min={selectedOrder.total} value={paymentAmount} onChange={e => setPaymentAmount(e.target.value)} className="w-full border rounded-md px-3 py-3 font-mono text-center text-xl font-bold bg-transparent" placeholder="0.00" />
                                <div className="text-xs text-center text-muted-foreground mt-2">
                                    {(Number(paymentAmount) - selectedOrder.total) > 0 && <span>Su Cambio: <span className="font-bold text-foreground">${(Number(paymentAmount) - selectedOrder.total).toFixed(2)}</span></span>}
                                </div>
                            </div>

                            <div className="pt-2 flex justify-end gap-2 border-t">
                                <button type="submit" disabled={loading || Number(paymentAmount) < selectedOrder.total} className="w-full py-3 bg-primary text-primary-foreground rounded-md text-sm font-bold flex items-center justify-center gap-2 shadow-md hover:bg-primary/90">
                                    {loading && <Loader2 className="h-4 w-4 animate-spin" />} CONFIRMAR PAGO Y CERRAR ORDEN
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL: Consultar Orden Detalles */}
            {viewOrderDetails && (
                <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="w-full max-w-lg bg-card border rounded-xl shadow-lg flex flex-col animate-in zoom-in-95 duration-200 max-h-full">
                        <div className="p-4 border-b flex justify-between items-center bg-muted/30">
                            <div>
                                <h2 className="text-lg font-bold flex items-center gap-2">Detalle de Orden <span className="text-muted-foreground text-sm font-normal">#{viewOrderDetails.id.substring(0, 8).toUpperCase()}</span></h2>
                                <p className="text-xs text-muted-foreground">{new Date(viewOrderDetails.createdAt).toLocaleString()}</p>
                            </div>
                            <button onClick={() => setViewOrderDetails(null)} className="p-1 hover:bg-muted rounded"><X className="h-5 w-5" /></button>
                        </div>

                        <div className="flex-1 overflow-auto p-4 space-y-4">
                            <div className="grid grid-cols-2 gap-4 text-sm bg-muted/20 p-3 rounded-lg border">
                                <div>
                                    <span className="text-muted-foreground block text-xs uppercase font-bold tracking-wider mb-1">Cliente</span>
                                    <span className="font-semibold">{viewOrderDetails.customerId || 'Consumidor Final'}</span>
                                </div>
                                <div>
                                    <span className="text-muted-foreground block text-xs uppercase font-bold tracking-wider mb-1">Estado</span>
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider 
                                        ${viewOrderDetails.status === 'PAID' ? 'bg-emerald-500/10 text-emerald-600' : ''}
                                        ${viewOrderDetails.status === 'CANCELLED' ? 'bg-destructive/10 text-destructive' : ''}
                                    `}>
                                        {viewOrderDetails.status === 'PAID' ? 'Pagada' : 'Cancelada'}
                                    </span>
                                </div>
                            </div>

                            <div>
                                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Productos Facturados</h3>
                                <div className="border rounded-md divide-y overflow-hidden">
                                    {viewOrderDetails.items?.map((item: OrderItem) => (
                                        <div key={item.id} className="p-3 flex justify-between items-center hover:bg-muted/30 transition-colors">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-semibold">{item.productSale?.name || 'Producto General'}</span>
                                                <span className="text-xs text-muted-foreground">{Number(item.qty)} x ${Number(item.unitPrice).toFixed(2)} {item.notes && `(${item.notes})`}</span>
                                            </div>
                                            <span className="text-sm font-bold font-mono">
                                                ${((Number(item.qty) * Number(item.unitPrice)) - Number(item.discount || 0)).toFixed(2)}
                                            </span>
                                        </div>
                                    ))}
                                    {(!viewOrderDetails.items || viewOrderDetails.items.length === 0) && (
                                        <div className="p-4 text-center text-sm text-muted-foreground">Sin productos registrados en esta orden.</div>
                                    )}
                                </div>
                            </div>

                            <div className="bg-primary/5 p-4 rounded-lg flex justify-between items-center border">
                                <span className="font-bold text-sm uppercase tracking-wider text-primary">Total Abonado</span>
                                <span className="text-2xl font-black text-primary">${Number(viewOrderDetails.total).toFixed(2)}</span>
                            </div>
                        </div>

                        <div className="p-4 border-t bg-muted/30 flex justify-between items-center bg-card rounded-b-xl">
                            <div className="flex gap-2">
                                {viewOrderDetails.status !== 'CANCELLED' && (
                                    <button onClick={() => handleCancelOrder(viewOrderDetails.id)} disabled={loading} className="px-4 h-10 border border-destructive text-destructive rounded-md font-medium text-sm hover:bg-destructive shadow-sm hover:text-destructive-foreground transition-colors inline-flex items-center justify-center gap-2">
                                        <X className="h-4 w-4" /> Anular Orden
                                    </button>
                                )}
                                {viewOrderDetails.status === 'OPEN' && (
                                    <button onClick={() => handleMarkPending(viewOrderDetails.id)} disabled={loading} className="px-4 h-10 bg-indigo-500/10 text-indigo-600 rounded-md font-bold text-sm hover:bg-indigo-500/20 shadow-sm transition-colors border border-indigo-500/30 inline-flex items-center justify-center">
                                        Generar Pre-cuenta (P. Pendiente)
                                    </button>
                                )}
                                {viewOrderDetails.status === 'PENDING' && (
                                    <button onClick={() => { setViewOrderDetails(null); setSelectedOrder(viewOrderDetails); setPaymentAmount(viewOrderDetails.total.toString()); setPaymentMethod('CASH'); }} disabled={loading} className="px-4 h-10 bg-primary text-primary-foreground rounded-md font-bold text-sm hover:bg-primary/90 shadow-sm transition-colors inline-flex gap-2 items-center justify-center">
                                        <CreditCard className="h-4 w-4" /> Cobrar Ahora
                                    </button>
                                )}
                            </div>

                            <button onClick={() => setViewOrderDetails(null)} className="px-5 h-10 border rounded-md font-medium text-sm hover:bg-muted transition-colors shadow-sm bg-background inline-flex items-center justify-center">
                                Cerrar
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}
