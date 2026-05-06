import { useState, useEffect } from 'react';
import { Package, ArrowRightLeft, ClipboardList, Search, Plus, Loader2, Edit3, X, History } from 'lucide-react';
import { api } from '../lib/axios';
import { useAuthStore } from '../store/authStore';
import { usePermissions } from '../hooks/usePermissions';

interface Branch {
    id: string;
    name: string;
}

interface Stock {
    id: string;
    quantity: number;
    productPhysical: {
        sku: string;
        description: string;
        unitMeasure: string;
        minStock: number;
    };
    branch: {
        name: string;
    }
}

interface PhysicalProduct {
    id: string;
    sku: string;
    description: string;
}

interface StockMovement {
    id: string;
    qty: number;
    type: string;
    cost: number;
    reference: string;
    date: string;
    productPhysical: { sku: string; description: string; };
    branch: { name: string; };
}

interface CountLine { id: string; productPhysical: { sku: string; description: string; }; expectedQty: number; countedQty: number; }
interface InventoryCount { id: string; status: string; date: string; user: { fullName: string; }; lines: CountLine[]; }

export default function Inventory() {
    const user = useAuthStore(state => state.user);
    const { hasPermission } = usePermissions();

    const [activeTab, setActiveTab] = useState<'stock' | 'transfers' | 'counts' | 'movements'>('stock');
    const [loading, setLoading] = useState(false);
    const [branches, setBranches] = useState<Branch[]>([]);
    const [selectedBranchId, setSelectedBranchId] = useState<string>(user?.branchId || '');
    const [stocks, setStocks] = useState<Stock[]>([]);
    const [searchQuery, setSearchQuery] = useState('');

    const [movements, setMovements] = useState<StockMovement[]>([]);
    const [selectedPhysicalId, setSelectedPhysicalId] = useState<string>('');

    // Estados para Tomas Físicas (Counts)
    const [counts, setCounts] = useState<InventoryCount[]>([]);

    // Estados para Modales
    const [showAdjustModal, setShowAdjustModal] = useState(false);
    const [showTransferModal, setShowTransferModal] = useState(false);
    const [showCountModal, setShowCountModal] = useState(false);

    const [physicalProducts, setPhysicalProducts] = useState<PhysicalProduct[]>([]);
    const [adjustForm, setAdjustForm] = useState({
        productPhysicalId: '',
        quantity: '',
        cost: '',
        reference: 'Compra / Ajuste Directo'
    });
    const [transferForm, setTransferForm] = useState({
        productPhysicalId: '',
        toBranchId: '',
        quantity: ''
    });
    const [countLines, setCountLines] = useState<{ productPhysicalId: string, countedQty: string, sku: string, desc: string }[]>([]);

    useEffect(() => {
        if (branches.length === 0) {
            api.get('/branches').then(res => {
                if (res.data.success) {
                    setBranches(res.data.data);
                    if (!selectedBranchId && res.data.data.length > 0) {
                        setSelectedBranchId(res.data.data[0].id);
                    }
                }
            }).catch(console.error);
        }
    }, [branches.length, selectedBranchId]);

    useEffect(() => {
        if (selectedBranchId && activeTab === 'stock') {
            fetchStock();
            fetchPhysicalProducts(); // Para tener la lista de productos al abrir el modal
        }
        if (selectedBranchId && activeTab === 'movements') {
            fetchPhysicalProducts();
            fetchMovements();
        }
        if (selectedBranchId && activeTab === 'counts') {
            fetchCounts();
        }
        if (selectedBranchId && activeTab === 'transfers') {
            // Reusing movements but only for transfers could be an option, 
            // but we can just fetch all movements and filter
            fetchMovements();
        }
    }, [selectedBranchId, activeTab, selectedPhysicalId]);

    const fetchStock = async () => {
        setLoading(true);
        try {
            const { data } = await api.get(`/inventory/stock?branchId=${selectedBranchId}`);
            if (data.success) {
                setStocks(data.data);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const fetchMovements = async () => {
        setLoading(true);
        try {
            let url = `/inventory/movements?branchId=${selectedBranchId}&limit=100`;
            if (activeTab === 'movements' && selectedPhysicalId) {
                url += `&productPhysicalId=${selectedPhysicalId}`;
            }
            const { data } = await api.get(url);
            if (data.success) {
                setMovements(data.data);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const fetchCounts = async () => {
        setLoading(true);
        try {
            const { data } = await api.get(`/inventory/counts?branchId=${selectedBranchId}`);
            if (data.success) setCounts(data.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const fetchPhysicalProducts = async () => {
        try {
            const { data } = await api.get(`/products/physical`);
            if (data.success) {
                setPhysicalProducts(data.data);
            }
        } catch (error) {
            console.error('Error fetching physical products:', error);
        }
    }

    const handleAdjustSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const payload = {
                branchId: selectedBranchId,
                productPhysicalId: adjustForm.productPhysicalId,
                quantity: Number(adjustForm.quantity),
                cost: Number(adjustForm.cost) || 0,
                reference: adjustForm.reference
            };

            await api.post('/inventory/stock/adjust', payload);
            alert('¡Ajuste aplicado exitosamente en Kardex!');

            setShowAdjustModal(false);
            setAdjustForm({ productPhysicalId: '', quantity: '', cost: '', reference: 'Compra / Ajuste Directo' });
            fetchStock(); // Refresh
        } catch (error: any) {
            console.error(error.response?.data);
            alert(error.response?.data?.error || 'Error aplicando ajuste manual');
        } finally {
            setLoading(false);
        }
    };

    const handleTransferSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const payload = {
                fromBranchId: selectedBranchId,
                toBranchId: transferForm.toBranchId,
                productPhysicalId: transferForm.productPhysicalId,
                quantity: Number(transferForm.quantity)
            };
            await api.post('/inventory/transfer', payload);
            alert('¡Traslado enviado exitosamente!');
            setShowTransferModal(false);
            setTransferForm({ productPhysicalId: '', toBranchId: '', quantity: '' });
            fetchMovements();
        } catch (error: any) {
            console.error(error.response?.data);
            alert(error.response?.data?.error || 'Error enviando traslado');
        } finally {
            setLoading(false);
        }
    };

    const handleCountSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const lines = countLines.filter(l => l.countedQty !== '').map(l => ({
                productPhysicalId: l.productPhysicalId,
                countedQty: Number(l.countedQty)
            }));
            if (lines.length === 0) return alert("Ingresa al menos 1 cantidad contada");

            await api.post('/inventory/count', { branchId: selectedBranchId, lines });
            alert('¡Conteo Guardado (Borrador)!');
            setShowCountModal(false);
            setCountLines([]);
            fetchCounts();
        } catch (error: any) {
            console.error(error.response?.data);
            alert(error.response?.data?.error || 'Error guardando conteo');
        } finally {
            setLoading(false);
        }
    };

    const handleReconcile = async (countId: string) => {
        if (!confirm('¿Estás seguro de conciliar este conteo? Esto afectará inmediatamente el Kardex de forma irreversible.')) return;
        setLoading(true);
        try {
            await api.post(`/inventory/count/${countId}/reconcile`);
            alert('¡Conteo Conciliado y Kardex Actualizado!');
            fetchCounts();
        } catch (error: any) {
            alert(error.response?.data?.error || 'Error conciliando');
        } finally {
            setLoading(false);
        }
    };

    const handleInitCount = async () => {
        await fetchPhysicalProducts();
        // Initialize lines with empty string to not enforce writing zeroes
        setCountLines(physicalProducts.map(p => ({
            productPhysicalId: p.id,
            sku: p.sku,
            desc: p.description,
            countedQty: ''
        })));
        setShowCountModal(true);
    };

    const filteredStock = stocks.filter(s =>
        s.productPhysical.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.productPhysical.sku.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="p-6 h-full flex flex-col bg-muted/10 relative">

            <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-6 gap-4">
                <div className="w-full md:w-auto">
                    <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Inventario Físico</h1>
                    <p className="text-muted-foreground mt-1 text-sm md:text-base">Gestión de existencias materiales, traslados y tomas físicas.</p>
                </div>

                <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
                    {branches.length > 0 && (
                        <select
                            value={selectedBranchId} onChange={e => setSelectedBranchId(e.target.value)}
                            className="border rounded-md px-3 py-2 text-sm bg-background shadow-sm w-full md:w-auto md:max-w-[200px]"
                        >
                            {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                        </select>
                    )}

                    {/* Acciones */}
                    {activeTab === 'stock' && (
                        <>
                            <button onClick={fetchStock} className="flex-1 md:flex-none justify-center flex items-center gap-2 bg-secondary text-secondary-foreground px-4 py-2 rounded-md font-medium hover:bg-secondary/80 outline outline-1 outline-border">
                                <Search className="h-4 w-4" /> Recargar
                            </button>
                            {hasPermission('inventory', 'adjust') && (
                                <button onClick={() => setShowAdjustModal(true)} className="flex-1 md:flex-none justify-center flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md font-medium hover:bg-primary/90 shadow-sm">
                                    <Edit3 className="h-4 w-4" /> Ajuste / Compra
                                </button>
                            )}
                        </>
                    )}
                    {activeTab === 'movements' && (
                        <button onClick={fetchMovements} className="flex-1 md:flex-none justify-center flex items-center gap-2 bg-secondary text-secondary-foreground px-4 py-2 rounded-md font-medium hover:bg-secondary/80 outline outline-1 outline-border">
                            <Search className="h-4 w-4" /> Recargar Historial
                        </button>
                    )}
                    {activeTab === 'transfers' && (
                        <>
                            <button onClick={fetchMovements} className="flex-1 md:flex-none justify-center flex items-center gap-2 bg-secondary text-secondary-foreground px-4 py-2 rounded-md font-medium hover:bg-secondary/80 outline outline-1 outline-border">
                                <Search className="h-4 w-4" /> Recargar
                            </button>
                            {hasPermission('inventory', 'transfer') && (
                                <button onClick={() => { fetchPhysicalProducts(); setShowTransferModal(true); }} className="flex-1 md:flex-none justify-center flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md font-medium hover:bg-primary/90">
                                    <Plus className="h-4 w-4" /> Nuevo Traslado
                                </button>
                            )}
                        </>
                    )}
                    {activeTab === 'counts' && (
                        <>
                            <button onClick={fetchCounts} className="flex-1 md:flex-none justify-center flex items-center gap-2 bg-secondary text-secondary-foreground px-4 py-2 rounded-md font-medium hover:bg-secondary/80 outline outline-1 outline-border">
                                <Search className="h-4 w-4" /> Recargar
                            </button>
                            {hasPermission('inventory', 'count') && (
                                <button onClick={handleInitCount} className="flex-1 md:flex-none justify-center flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md font-medium hover:bg-primary/90">
                                    <Plus className="h-4 w-4" /> Ejecutar Conteo Ciego
                                </button>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* Tabs */}
            <div className="flex flex-wrap gap-x-6 gap-y-2 border-b mb-6 border-border shrink-0">
                <button onClick={() => setActiveTab('stock')} className={`whitespace-nowrap flex items-center gap-2 px-2 pb-2 border-b-2 font-medium transition-colors ${activeTab === 'stock' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
                    <Package className="h-4 w-4" /> Kardex de Existencias
                </button>
                <button onClick={() => setActiveTab('transfers')} className={`whitespace-nowrap flex items-center gap-2 px-2 pb-2 border-b-2 font-medium transition-colors ${activeTab === 'transfers' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
                    <ArrowRightLeft className="h-4 w-4" /> Traslados Internos
                </button>
                <button onClick={() => setActiveTab('counts')} className={`whitespace-nowrap flex items-center gap-2 px-2 pb-2 border-b-2 font-medium transition-colors ${activeTab === 'counts' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
                    <ClipboardList className="h-4 w-4" /> Tomas Físicas Ciega
                </button>
                <button onClick={() => setActiveTab('movements')} className={`whitespace-nowrap flex items-center gap-2 px-2 pb-2 border-b-2 font-medium transition-colors ${activeTab === 'movements' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
                    <History className="h-4 w-4" /> Historial / Kardex
                </button>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-auto bg-card rounded-xl border shadow-sm relative">

                {loading && !showAdjustModal && (
                    <div className="absolute inset-0 bg-background/50 backdrop-blur-sm z-50 flex items-center justify-center">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                )}

                {/* Tab 1: MOCK REAL STOCK VIEW */}
                {activeTab === 'stock' && (
                    <div className="flex flex-col h-full">
                        <div className="p-4 border-b flex justify-between items-center bg-muted/30">
                            <div className="relative w-72">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    placeholder="Filtrar Insumos por Nombre/SKU"
                                    className="w-full pl-9 pr-4 py-1.5 text-sm border rounded-md bg-transparent focus:outline-none focus:ring-1 focus:ring-primary"
                                />
                            </div>
                        </div>
                        <div className="flex-1 overflow-auto">
                            {/* Desktop Table View */}
                            <div className="hidden md:block h-full">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-muted text-muted-foreground uppercase text-xs sticky top-0 z-10 shadow-sm">
                                        <tr>
                                            <th className="px-6 py-3 font-semibold w-32">SKU</th>
                                            <th className="px-6 py-3 font-semibold">Descripción del Insumo Físico</th>
                                            <th className="px-6 py-3 font-semibold">Base U.M.</th>
                                            <th className="px-6 py-3 font-semibold text-right">Existencia Actual</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {filteredStock.map(s => (
                                            <tr key={s.id} className="hover:bg-muted/50 transition-colors">
                                                <td className="px-6 py-4 font-mono font-medium">{s.productPhysical.sku}</td>
                                                <td className="px-6 py-4 font-bold text-foreground">{s.productPhysical.description}</td>
                                                <td className="px-6 py-4 text-muted-foreground">{s.productPhysical.unitMeasure}</td>
                                                <td className="px-6 py-4 text-right">
                                                    <span className={`font-bold px-2 py-1 rounded text-sm ${(() => {
                                                        const qty = Number(s.quantity);
                                                        const min = Number(s.productPhysical.minStock || 0);
                                                        if (min === 0) {
                                                            return qty <= 0 ? 'bg-destructive/10 text-destructive' : 'bg-muted text-foreground';
                                                        }
                                                        const ratio = min > 0 ? qty / min : 0;
                                                        if (ratio >= 1.5) return 'bg-emerald-500/10 text-emerald-600';
                                                        if (ratio >= 1.25) return 'bg-yellow-500/20 text-yellow-700';
                                                        if (ratio > 1.00) return 'bg-orange-500/20 text-orange-600';
                                                        if (ratio > 0.50) return 'bg-rose-400/20 text-rose-500';
                                                        return 'bg-destructive/20 text-destructive';
                                                    })()
                                                        }`}>
                                                        {Number(s.quantity).toFixed(2)}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                        {filteredStock.length === 0 && !loading && (
                                            <tr>
                                                <td colSpan={5} className="py-12 text-center text-muted-foreground">
                                                    <Package className="h-12 w-12 mx-auto mb-3 opacity-20" />
                                                    <p>No se encontraron datos de stock en la sucursal seleccionada.</p>
                                                    <p className="text-xs">Usa el botón "Ajuste / Compra" para alimentarlo.</p>
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                            
                            {/* Mobile Card View */}
                            <div className="md:hidden flex flex-col gap-3 p-4 bg-muted/5">
                                {filteredStock.map(s => {
                                    const qty = Number(s.quantity);
                                    const min = Number(s.productPhysical.minStock || 0);
                                    let statusColor = 'bg-muted text-foreground';
                                    let borderStatus = 'border-border';
                                    
                                    if (min === 0) {
                                        if (qty <= 0) { statusColor = 'bg-destructive/10 text-destructive'; borderStatus = 'border-destructive'; }
                                    } else {
                                        const ratio = qty / min;
                                        if (ratio >= 1.5) { statusColor = 'bg-emerald-500/10 text-emerald-600'; borderStatus = 'border-emerald-500'; }
                                        else if (ratio >= 1.25) { statusColor = 'bg-yellow-500/20 text-yellow-700'; borderStatus = 'border-yellow-500'; }
                                        else if (ratio > 1.00) { statusColor = 'bg-orange-500/20 text-orange-600'; borderStatus = 'border-orange-500'; }
                                        else if (ratio > 0.50) { statusColor = 'bg-rose-400/20 text-rose-500'; borderStatus = 'border-rose-400'; }
                                        else { statusColor = 'bg-destructive/20 text-destructive'; borderStatus = 'border-destructive'; }
                                    }

                                    return (
                                        <div key={s.id} className="bg-background border rounded-xl p-4 shadow-sm relative overflow-hidden flex flex-col gap-2">
                                            <div className={`absolute left-0 top-0 bottom-0 w-1 ${borderStatus}`} />
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <h3 className="font-bold text-base leading-tight pr-2">{s.productPhysical.description}</h3>
                                                    <p className="text-[10px] text-muted-foreground font-mono mt-1 tracking-widest">{s.productPhysical.sku}</p>
                                                </div>
                                                <div className="text-right">
                                                    <span className="block text-[10px] uppercase font-bold text-muted-foreground mb-1 tracking-wider">Existencia</span>
                                                    <span className={`font-black px-2 py-1 rounded text-lg ${statusColor}`}>
                                                        {qty.toFixed(2)}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="flex justify-between items-center mt-2 pt-2 border-t">
                                                <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">U. Medida: {s.productPhysical.unitMeasure}</span>
                                                <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Mínimo: {min.toFixed(2)}</span>
                                            </div>
                                        </div>
                                    );
                                })}
                                {filteredStock.length === 0 && !loading && (
                                    <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-xl border-border">
                                        <Package className="h-10 w-10 mx-auto mb-2 opacity-20" />
                                        <p className="font-bold text-sm">Sin datos de stock</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Tab 4: HISTORIAL DE KARDEX */}
                {activeTab === 'movements' && (
                    <div className="flex flex-col h-full">
                        <div className="p-4 border-b flex justify-between items-center bg-muted/30">
                            <div className="flex gap-2 items-center w-full max-w-md">
                                <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">Insumo:</span>
                                <select
                                    value={selectedPhysicalId}
                                    onChange={e => setSelectedPhysicalId(e.target.value)}
                                    className="w-full border rounded-md px-3 py-1.5 text-sm bg-background shadow-sm"
                                >
                                    <option value="">TODOS (Historico General)</option>
                                    {physicalProducts.map(p => (
                                        <option key={p.id} value={p.id}>[{p.sku}] {p.description}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div className="flex-1 overflow-auto">
                            {/* Desktop Table View */}
                            <div className="hidden md:block h-full">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-muted text-muted-foreground uppercase text-xs sticky top-0 z-10 shadow-sm">
                                        <tr>
                                            <th className="px-6 py-3 font-semibold w-40">Fecha</th>
                                            {/* Reference Column omitted globally per request, SKU demoted below */}
                                            <th className="px-6 py-3 font-semibold">SKU / Insumo Físico</th>
                                            <th className="px-6 py-3 font-semibold">Tipo Mov.</th>
                                            <th className="px-6 py-3 font-semibold text-right">Cant. Afec.</th>
                                            <th className="px-6 py-3 font-semibold text-right">Costo Mov.</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {movements.map(m => (
                                            <tr key={m.id} className="hover:bg-muted/50 transition-colors">
                                                <td className="px-6 py-4 font-mono text-xs">{new Date(m.date).toLocaleString()}</td>
                                                <td className="px-6 py-4">
                                                    <div className="font-bold text-foreground">{m.productPhysical.description}</div>
                                                    <div className="text-[10px] text-muted-foreground font-mono mt-0.5">{m.productPhysical.sku}</div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider ${m.type === 'IN' || m.type === 'ADJUSTMENT' && Number(m.qty) > 0 ? 'bg-emerald-500/10 text-emerald-600' :
                                                        m.type === 'SALE' || m.type === 'OUT' || (m.type === 'ADJUSTMENT' && Number(m.qty) < 0) ? 'bg-rose-500/10 text-rose-600' :
                                                            'bg-blue-500/10 text-blue-600'
                                                        }`}>
                                                        {m.type}
                                                    </span>
                                                </td>
                                                <td className={`px-6 py-4 text-right font-bold ${Number(m.qty) > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                    {Number(m.qty) > 0 ? '+' : ''}{Number(m.qty).toFixed(2)}
                                                </td>
                                                <td className="px-6 py-4 text-right font-mono text-muted-foreground">
                                                    ${Number(m.cost).toFixed(2)}
                                                </td>
                                            </tr>
                                        ))}
                                        {movements.length === 0 && !loading && (
                                            <tr>
                                                <td colSpan={5} className="py-12 text-center text-muted-foreground">
                                                    <History className="h-12 w-12 mx-auto mb-3 opacity-20" />
                                                    <p>No se encontraron movimientos o transacciones en el Kardex.</p>
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* Mobile Card View */}
                            <div className="md:hidden flex flex-col gap-3 p-4 bg-muted/5">
                                {movements.map(m => {
                                    const qty = Number(m.qty);
                                    const isPositive = m.type === 'IN' || (m.type === 'ADJUSTMENT' && qty > 0);
                                    const isNegative = m.type === 'SALE' || m.type === 'OUT' || (m.type === 'ADJUSTMENT' && qty < 0);
                                    
                                    const typeColor = isPositive ? 'bg-emerald-500/10 text-emerald-600' : 
                                                      isNegative ? 'bg-rose-500/10 text-rose-600' : 'bg-blue-500/10 text-blue-600';
                                    
                                    const borderColor = isPositive ? 'border-emerald-500' : 
                                                        isNegative ? 'border-rose-500' : 'border-blue-500';

                                    return (
                                        <div key={m.id} className="bg-background border rounded-xl p-4 shadow-sm relative overflow-hidden flex flex-col gap-2">
                                            <div className={`absolute left-0 top-0 bottom-0 w-1 ${borderColor}`} />
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <p className="text-xs text-muted-foreground font-mono mb-1">{new Date(m.date).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</p>
                                                    <h3 className="font-bold text-sm leading-tight pr-2">{m.productPhysical.description}</h3>
                                                </div>
                                                <div className="text-right">
                                                    <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider whitespace-nowrap ${typeColor}`}>
                                                        {m.type}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="flex justify-between items-end mt-2 pt-2 border-t">
                                                <div className="text-left">
                                                    <span className="block text-[10px] uppercase font-bold text-muted-foreground mb-0.5 tracking-wider">Costo</span>
                                                    <span className="text-sm font-mono text-muted-foreground">${Number(m.cost).toFixed(2)}</span>
                                                </div>
                                                <div className="text-right">
                                                    <span className="block text-[10px] uppercase font-bold text-muted-foreground mb-0.5 tracking-wider">Cant. Afectada</span>
                                                    <span className={`font-black text-lg ${qty > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                        {qty > 0 ? '+' : ''}{qty.toFixed(2)}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                                {movements.length === 0 && !loading && (
                                    <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-xl border-border">
                                        <History className="h-10 w-10 mx-auto mb-2 opacity-20" />
                                        <p className="font-bold text-sm">Sin movimientos</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Tab 2: TRASLADOS */}
                {activeTab === 'transfers' && (
                    <div className="flex flex-col h-full">
                        <div className="p-4 border-b flex justify-between items-center bg-muted/30">
                            <h3 className="font-medium text-sm text-muted-foreground">Últimos Traslados Emitidos/Recibidos (Kardex)</h3>
                        </div>
                        <div className="flex-1 overflow-auto">
                            {/* Desktop Table View */}
                            <div className="hidden md:block h-full">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-muted text-muted-foreground uppercase text-xs sticky top-0 z-10 shadow-sm">
                                        <tr>
                                            <th className="px-6 py-3 font-semibold w-40">Fecha</th>
                                            <th className="px-6 py-3 font-semibold">Insumo Físico</th>
                                            <th className="px-6 py-3 font-semibold">Movimiento</th>
                                            <th className="px-6 py-3 font-semibold text-right">Cantidad</th>
                                            <th className="px-6 py-3 font-semibold">Referencia Destino/Origen</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {movements.filter(m => m.type === 'TRANSFER').map(m => (
                                            <tr key={m.id} className="hover:bg-muted/50 transition-colors">
                                                <td className="px-6 py-4 font-mono text-xs">{new Date(m.date).toLocaleString()}</td>
                                                <td className="px-6 py-4 font-bold text-foreground">[{m.productPhysical.sku}] {m.productPhysical.description}</td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider ${Number(m.qty) > 0 ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-600'}`}>
                                                        {Number(m.qty) > 0 ? 'RECIBIDO (Entrada)' : 'ENVIADO (Salida)'}
                                                    </span>
                                                </td>
                                                <td className={`px-6 py-4 text-right font-bold ${Number(m.qty) > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                    {Number(m.qty) > 0 ? '+' : ''}{Number(m.qty).toFixed(2)}
                                                </td>
                                                <td className="px-6 py-4 text-muted-foreground">{m.reference}</td>
                                            </tr>
                                        ))}
                                        {movements.filter(m => m.type === 'TRANSFER').length === 0 && !loading && (
                                            <tr>
                                                <td colSpan={5} className="py-12 text-center text-muted-foreground">
                                                    <ArrowRightLeft className="h-12 w-12 mx-auto mb-3 opacity-20" />
                                                    <p>No existen traslados registrados en esta Sucursal.</p>
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* Mobile Card View */}
                            <div className="md:hidden flex flex-col gap-3 p-4 bg-muted/5">
                                {movements.filter(m => m.type === 'TRANSFER').map(m => {
                                    const qty = Number(m.qty);
                                    const isReceived = qty > 0;
                                    const colorClass = isReceived ? 'text-emerald-600 bg-emerald-500/10' : 'text-rose-600 bg-rose-500/10';
                                    const borderColor = isReceived ? 'border-emerald-500' : 'border-rose-500';

                                    return (
                                        <div key={m.id} className="bg-background border rounded-xl p-4 shadow-sm relative overflow-hidden flex flex-col gap-2">
                                            <div className={`absolute left-0 top-0 bottom-0 w-1 ${borderColor}`} />
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <p className="text-xs text-muted-foreground font-mono mb-1">{new Date(m.date).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</p>
                                                    <h3 className="font-bold text-sm leading-tight pr-2">{m.productPhysical.description}</h3>
                                                </div>
                                                <div className="text-right">
                                                    <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider whitespace-nowrap ${colorClass}`}>
                                                        {isReceived ? 'RECIBIDO' : 'ENVIADO'}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="flex justify-between items-center mt-2 pt-2 border-t">
                                                <div className="text-left w-2/3 pr-2">
                                                    <span className="block text-[10px] uppercase font-bold text-muted-foreground mb-0.5 tracking-wider">Ref: {isReceived ? 'Origen' : 'Destino'}</span>
                                                    <span className="text-xs text-muted-foreground line-clamp-1">{m.reference || 'N/A'}</span>
                                                </div>
                                                <div className="text-right">
                                                    <span className="block text-[10px] uppercase font-bold text-muted-foreground mb-0.5 tracking-wider">Cantidad</span>
                                                    <span className={`font-black text-lg ${isReceived ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                        {isReceived ? '+' : ''}{qty.toFixed(2)}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                                {movements.filter(m => m.type === 'TRANSFER').length === 0 && !loading && (
                                    <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-xl border-border">
                                        <ArrowRightLeft className="h-10 w-10 mx-auto mb-2 opacity-20" />
                                        <p className="font-bold text-sm">Sin traslados en la sucursal</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Tab 3: CONTEOS TOMAS FISICAS */}
                {activeTab === 'counts' && (
                    <div className="flex flex-col h-full">
                        <div className="flex-1 overflow-auto p-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {counts.map(c => (
                                    <div key={c.id} className="border rounded-xl p-5 hover:shadow-md transition-shadow bg-background relative overflow-hidden group">
                                        <div className={`absolute top-0 left-0 w-1 h-full ${c.status === 'COMPLETED' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                                        <div className="flex justify-between items-start mb-4 pr-2">
                                            <div>
                                                <h3 className="font-bold text-sm leading-none">Auditoría {new Date(c.date).toLocaleDateString()}</h3>
                                                <p className="text-xs text-muted-foreground mt-1">Por: {c.user.fullName}</p>
                                            </div>
                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${c.status === 'COMPLETED' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-amber-500/10 text-amber-600'}`}>
                                                {c.status === 'COMPLETED' ? 'Conciliado' : 'Borrador'}
                                            </span>
                                        </div>
                                        <div className="text-xs space-y-2 mb-4">
                                            <p className="text-muted-foreground">{c.lines.length} Items auditados.</p>
                                        </div>
                                        {c.status === 'DRAFT' && (
                                            <button onClick={() => handleReconcile(c.id)} className="w-full text-center px-4 py-2 bg-primary text-primary-foreground text-xs font-bold rounded-md hover:bg-primary/90">
                                                Conciliar y Aplicar Diferencias
                                            </button>
                                        )}
                                        {c.status === 'COMPLETED' && (
                                            <button disabled className="w-full text-center px-4 py-2 bg-muted text-muted-foreground text-xs font-bold rounded-md cursor-not-allowed">
                                                Aplicado a Kardex
                                            </button>
                                        )}
                                    </div>
                                ))}
                                {counts.length === 0 && !loading && (
                                    <div className="col-span-full py-12 text-center text-muted-foreground">
                                        <ClipboardList className="h-12 w-12 mx-auto mb-3 opacity-20" />
                                        <p>No hay tomas físicas creadas.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

            </div>

            {/* MODAL: Ajuste Manual de Stock */}
            {showAdjustModal && (
                <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="w-full max-w-md bg-card border rounded-xl shadow-lg flex flex-col animate-in zoom-in-95 duration-200">
                        <div className="p-4 border-b flex justify-between items-center">
                            <h2 className="text-lg font-bold">Ajuste Manual / Compra Directa</h2>
                            <button onClick={() => setShowAdjustModal(false)}><X className="h-5 w-5" /></button>
                        </div>
                        <form onSubmit={handleAdjustSubmit} className="p-4 space-y-4 relative">

                            {loading && (
                                <div className="absolute inset-0 bg-background/50 backdrop-blur-sm z-50 flex items-center justify-center rounded-b-xl border">
                                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                </div>
                            )}

                            <div>
                                <label className="text-sm font-medium mb-1 block">Insumo Físico</label>
                                <select
                                    required
                                    value={adjustForm.productPhysicalId}
                                    onChange={e => setAdjustForm({ ...adjustForm, productPhysicalId: e.target.value })}
                                    className="w-full border rounded-md px-3 py-2 bg-transparent text-sm font-medium focus:ring-1 focus:ring-primary"
                                >
                                    <option value="">-- Seleccione un producto --</option>
                                    {physicalProducts.map(p => (
                                        <option key={p.id} value={p.id}>[{p.sku}] {p.description}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm font-medium mb-1 block">Cantidad Variación</label>
                                    <input
                                        required
                                        type="number"
                                        step="0.001"
                                        value={adjustForm.quantity}
                                        onChange={e => setAdjustForm({ ...adjustForm, quantity: e.target.value })}
                                        className="w-full border rounded-md px-3 py-2 bg-transparent text-sm font-mono focus:ring-1 focus:ring-primary"
                                        placeholder="Ej: 50 (Suma) o -5 (Resta)"
                                    />
                                    <p className="text-[10px] text-muted-foreground mt-1">Usa negativos p/ mermas</p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium mb-1 block">Costo Directo ($)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={adjustForm.cost}
                                        onChange={e => setAdjustForm({ ...adjustForm, cost: e.target.value })}
                                        className="w-full border rounded-md px-3 py-2 bg-transparent text-sm focus:ring-1 focus:ring-primary"
                                        placeholder="Costo total de entrada"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="text-sm font-medium mb-1 block">Motivo o Referencia</label>
                                <input
                                    required
                                    type="text"
                                    value={adjustForm.reference}
                                    onChange={e => setAdjustForm({ ...adjustForm, reference: e.target.value })}
                                    className="w-full border rounded-md px-3 py-2 bg-transparent text-sm focus:ring-1 focus:ring-primary"
                                    placeholder="Ej: Factura de Compra #1234"
                                />
                            </div>

                            <div className="pt-4 flex justify-end gap-2 border-t mt-6">
                                <button type="button" onClick={() => setShowAdjustModal(false)} className="px-4 py-2 border rounded-md text-sm font-medium">Cancelar</button>
                                <button type="submit" disabled={loading} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-sm font-bold flex items-center gap-2">
                                    Aplicar Movimiento
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL: Nuevo Traslado */}
            {showTransferModal && (
                <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="w-full max-w-md bg-card border rounded-xl shadow-lg flex flex-col animate-in zoom-in-95 duration-200">
                        <div className="p-4 border-b flex justify-between items-center">
                            <h2 className="text-lg font-bold">Enviar Traslado Interno</h2>
                            <button onClick={() => setShowTransferModal(false)}><X className="h-5 w-5" /></button>
                        </div>
                        <form onSubmit={handleTransferSubmit} className="p-4 space-y-4 relative">
                            {loading && (
                                <div className="absolute inset-0 bg-background/50 backdrop-blur-sm z-50 flex items-center justify-center rounded-b-xl border">
                                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                </div>
                            )}
                            <div>
                                <label className="text-sm font-medium mb-1 block">Insumo Físico a Enviar</label>
                                <select required value={transferForm.productPhysicalId} onChange={e => setTransferForm({ ...transferForm, productPhysicalId: e.target.value })} className="w-full border rounded-md px-3 py-2 bg-transparent text-sm font-medium focus:ring-1 focus:ring-primary">
                                    <option value="">-- Seleccione Insumo --</option>
                                    {physicalProducts.map(p => <option key={p.id} value={p.id}>[{p.sku}] {p.description}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="text-sm font-medium mb-1 block">Sucursal Destino</label>
                                <select required value={transferForm.toBranchId} onChange={e => setTransferForm({ ...transferForm, toBranchId: e.target.value })} className="w-full border rounded-md px-3 py-2 bg-transparent text-sm font-medium focus:ring-1 focus:ring-primary">
                                    <option value="">-- Seleccione Sucursal (Bodega) --</option>
                                    {branches.filter(b => b.id !== selectedBranchId).map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="text-sm font-medium mb-1 block">Cantidad Exacta a Enviar</label>
                                <input required type="number" step="0.001" min="0" value={transferForm.quantity} onChange={e => setTransferForm({ ...transferForm, quantity: e.target.value })} className="w-full border rounded-md px-3 py-2 bg-transparent text-sm font-mono focus:ring-1 focus:ring-primary" placeholder="Ej: 50" />
                            </div>
                            <div className="pt-4 flex justify-end gap-2 border-t mt-6">
                                <button type="button" onClick={() => setShowTransferModal(false)} className="px-4 py-2 border rounded-md text-sm font-medium">Cancelar</button>
                                <button type="submit" disabled={loading} className="px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-md text-sm font-bold flex items-center gap-2">Confirmar Envío</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL: Tomas Fisicas (Conteo) */}
            {showCountModal && (
                <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="w-full max-w-2xl bg-card border rounded-xl shadow-lg flex flex-col animate-in zoom-in-95 duration-200 max-h-full">
                        <div className="p-4 border-b flex justify-between items-center">
                            <div>
                                <h2 className="text-lg font-bold">Hoja de Toma Física (Conteo Ciego)</h2>
                                <p className="text-xs text-muted-foreground">Llena las existencias reales en tu bodega. Puedes dejar en blanco los que no deseas contar.</p>
                            </div>
                            <button onClick={() => setShowCountModal(false)}><X className="h-5 w-5" /></button>
                        </div>
                        <form onSubmit={handleCountSubmit} className="flex-1 overflow-auto p-0 relative flex flex-col min-h-0">
                            {loading && (
                                <div className="absolute inset-0 bg-background/50 backdrop-blur-sm z-50 flex items-center justify-center">
                                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                </div>
                            )}
                            <div className="flex-1 overflow-auto p-4">
                                <table className="w-full text-sm text-left border">
                                    <thead className="bg-muted text-muted-foreground uppercase text-xs sticky top-0">
                                        <tr>
                                            <th className="px-4 py-2 w-32">SKU</th>
                                            <th className="px-4 py-2">Insumo Físico</th>
                                            <th className="px-4 py-2 text-right">Cant. FÍSICA Contada</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {countLines.map((line, i) => (
                                            <tr key={i} className="hover:bg-muted/30">
                                                <td className="px-4 py-2 font-mono text-muted-foreground">{line.sku}</td>
                                                <td className="px-4 py-2 font-bold">{line.desc}</td>
                                                <td className="px-4 py-2">
                                                    <input
                                                        type="number"
                                                        step="0.001"
                                                        min="0"
                                                        value={line.countedQty}
                                                        onChange={e => {
                                                            const n = [...countLines];
                                                            n[i].countedQty = e.target.value;
                                                            setCountLines(n);
                                                        }}
                                                        className="w-full border-b border-primary/50 bg-background/50 px-2 py-1 text-right font-mono font-bold focus:outline-none focus:border-primary focus:bg-primary/5"
                                                        placeholder="Vacio = Omitir"
                                                    />
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <div className="p-4 flex justify-end gap-2 border-t mt-auto shadow-[0_-10px_10px_-10px_rgba(0,0,0,0.1)]">
                                <button type="button" onClick={() => setShowCountModal(false)} className="px-4 py-2 border rounded-md text-sm font-medium">Cancelar</button>
                                <button type="submit" disabled={loading} className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-md text-sm font-bold flex items-center gap-2">Enviar a Revisión (Borrador)</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

        </div>
    );
}
