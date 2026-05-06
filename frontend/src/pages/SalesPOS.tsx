import { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Search, Plus, Minus, Trash2, ShoppingCart, Loader2, MapPin, Ticket, List, Layers, User, CreditCard, Wallet, X } from 'lucide-react';
import { api } from '../lib/axios';
import { useAuthStore } from '../store/authStore';

interface SaleProduct {
    id: string;
    code: string;
    name: string;
    price: number;
    taxRate: number;
    categoryId?: string | null;
    isExempt: boolean;
    isNonSubject: boolean;
}

interface OrderItem extends SaleProduct {
    cartId: string;
    quantity: number;
    isSaved?: boolean; // Indicates if this item was already saved in DB
    status?: string; // PENDING, PREPARING, READY, DELIVERED
}

interface Table {
    id: string;
    label: string | null;
    number: string;
    status: string;
}

interface Order {
    id: string;
    customerId: string | null;
    tableId: string | null;
    status: string;
}

interface Branch {
    id: string;
    name: string;
}

export default function SalesPOS() {
    const user = useAuthStore(state => state.user);
    const location = useLocation();
    const navigate = useNavigate();

    // Base State
    const [loading, setLoading] = useState(false);
    const [products, setProducts] = useState<SaleProduct[]>([]);
    const [tables, setTables] = useState<Table[]>([]);
    const [branches, setBranches] = useState<Branch[]>([]);

    // Selection State
    const [selectedBranchId, setSelectedBranchId] = useState<string>(user?.branchId || '');
    const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
    const [existingOrderId, setExistingOrderId] = useState<string | null>(null);
    const [openOrders, setOpenOrders] = useState<Order[]>([]);

    // POS UI State
    const [activeCategory, setActiveCategory] = useState<string>('Todos');
    const [searchQuery, setSearchQuery] = useState('');

    // Cart State
    const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
    const [cartTab, setCartTab] = useState<'nueva' | 'cuenta' | 'resumen'>('nueva');
    const [customerName, setCustomerName] = useState('');

    // Fiscal State
    const [docType, setDocType] = useState<'TICKET' | 'DTE_01' | 'DTE_03' | 'EXCLUIDO'>('TICKET');
    const [clientIsAlcaldia, setClientIsAlcaldia] = useState(false); // Retencion 1% Alcaldías

    // Payment Modal State
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'CARD' | 'TRANSFER'>('CASH');
    const [paymentAmount, setPaymentAmount] = useState<string>('');
    const [showMobileCart, setShowMobileCart] = useState(false);

    // Init Data
    useEffect(() => {
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
            loadPOSData();
        }
    }, [selectedBranchId, location.search]); // Re-run when navigation search changes

    const loadPOSData = async () => {
        setLoading(true);
        try {
            const [prodRes, tableRes, ordersRes] = await Promise.all([
                api.get(`/products/sale`),
                api.get(`/orders/tables?branchId=${selectedBranchId}`),
                api.get(`/orders?branchId=${selectedBranchId}&status=OPEN&limit=100`)
            ]);
            setProducts(prodRes.data.data);
            setTables(tableRes.data.data);
            setOpenOrders(ordersRes.data.data);

            // Fetch specific order if provided in URL
            const searchParams = new URLSearchParams(location.search);
            const oId = searchParams.get('orderId');
            if (oId && prodRes.data.data.length > 0) {
                const orderRes = await api.get(`/orders/${oId}`);
                if (orderRes.data.success) {
                    const orderData = orderRes.data.data;
                    setExistingOrderId(orderData.id);
                    setSelectedTableId(orderData.tableId);
                    setCustomerName(orderData.customerId || '');

                    // Map existing items to cart
                    const mappedItems = orderData.items.map((item: any) => {
                        const baseProd = prodRes.data.data.find((p: any) => p.id === item.productSaleId);
                        return {
                            ...baseProd,
                            cartId: item.id,
                            quantity: Number(item.qty),
                            isSaved: true,
                            status: item.status
                        };
                    });
                    setOrderItems(mappedItems);
                }
            } else {
                // If it's a new order without an ID, optionally clear cart if we are resetting
                if (!oId && location.pathname === '/pos') {
                    const tId = searchParams.get('tableId');
                    setSelectedTableId(tId || null);
                    if (!tId && !existingOrderId) {
                        // Keep current cart if we just landed, otherwise maybe clear.
                        // We will just let the state be.
                    }
                }
            }

        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    // derived data
    const filteredProducts = useMemo(() => {
        let temp = products;
        if (searchQuery) {
            temp = temp.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.code.toLowerCase().includes(searchQuery.toLowerCase()));
        }
        // logic for category would go here
        return temp;
    }, [products, searchQuery, activeCategory]);

    const addToOrder = (product: SaleProduct) => {
        // ALWAYS add a new line to preserve sequence as requested
        setOrderItems(prev => [...prev, { ...product, cartId: crypto.randomUUID(), quantity: 1, isSaved: false }]);
    };

    const updateQuantity = (cartId: string, delta: number) => {
        setOrderItems(prev => prev.map(item => {
            if (item.cartId === cartId) {
                const newQty = item.quantity + delta;
                return newQty > 0 ? { ...item, quantity: newQty, isSaved: false } : item;
            }
            return item;
        }));
    };

    const removeItem = (cartId: string) => {
        setOrderItems(prev => prev.filter(item => item.cartId !== cartId));
    };

    const markAsDelivered = async (cartId: string) => {
        setLoading(true);
        try {
            await api.put(`/kitchen/items/${cartId}/status`, { status: 'DELIVERED' });
            setOrderItems(prev => prev.map(item => item.cartId === cartId ? { ...item, status: 'DELIVERED' } : item));
        } catch (err) {
            console.error(err);
            alert("Error al marcar como entregado.");
        } finally {
            setLoading(false);
        }
    };

    const processOrder = async () => {
        if (orderItems.length === 0) return;
        if (!selectedBranchId) return alert('No hay sucursal seleccionada');

        setLoading(true);
        try {
            // We send them raw (unconsolidated) so the backend saves each line individually,
            // preserving the exact sequence in which they were requested for the "Detalle de Solicitud".
            const rawItemsToSend = orderItems.map(item => ({
                id: item.isSaved ? item.cartId : undefined,
                productSaleId: item.id,
                qty: item.quantity,
                unitPrice: item.price,
                discount: 0
            }));

            const orderData = {
                branchId: selectedBranchId,
                tableId: selectedTableId, // null means To-Go
                customerId: customerName || null,
                items: rawItemsToSend
            };

            if (existingOrderId) {
                // Update Order
                const { data } = await api.put(`/orders/${existingOrderId}`, { status: 'OPEN', items: orderData.items, customerId: orderData.customerId });
                if (data.success) {
                    alert('¡Orden actualizada exitosamente!');
                    navigate('/tables'); // Go back to tables or stay
                }
            } else {
                // Create Order
                const { data } = await api.post('/orders', orderData);
                if (data.success) {
                    alert('¡Orden creada exitosamente! N# ' + data.data.id.substring(0, 8));
                    setOrderItems([]);
                    setSelectedTableId(null);
                    setCustomerName('');
                    loadPOSData(); // recargar mesas
                }
            }
        } catch (err: any) {
            console.error("Detalles de error al crear orden:", err.response?.data);
            const details = err.response?.data?.details ? `\nDetalles: ${JSON.stringify(err.response.data.details)}` : '';
            alert(`${err.response?.data?.error || 'Error procesando la orden'}${details}`);
        } finally {
            setLoading(false);
        }
    };

    const handleDirectPay = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            // STEP 1: Process/Update Order
            const rawItemsToSend = orderItems.map(item => ({
                id: item.isSaved ? item.cartId : undefined,
                productSaleId: item.id,
                qty: item.quantity,
                unitPrice: item.price,
                discount: 0
            }));

            const orderData = {
                branchId: selectedBranchId,
                tableId: selectedTableId,
                customerId: customerName || null,
                items: rawItemsToSend
            };

            let finalOrderId = existingOrderId;

            if (finalOrderId) {
                await api.put(`/orders/${finalOrderId}`, { status: 'OPEN', items: orderData.items, customerId: orderData.customerId });
            } else {
                const { data } = await api.post('/orders', orderData);
                finalOrderId = data.data.id;
            }

            // STEP 2: Pay Order
            await api.post(`/orders/${finalOrderId}/pay`, {
                method: paymentMethod,
                amount: Number(paymentAmount)
            });

            alert('¡Pago registrado exitosamente!');
            setShowPaymentModal(false);
            setOrderItems([]);
            setSelectedTableId(null);
            setCustomerName('');
            setExistingOrderId(null);

            if (existingOrderId) {
                navigate('/tables');
            } else {
                loadPOSData();
            }

        } catch (err: any) {
            console.error("Detalles de error al cobrar:", err.response?.data);
            alert(err.response?.data?.error || 'Error procesando el cobro directo.');
        } finally {
            setLoading(false);
        }
    };

    // Math & Summary
    const subtotal = orderItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    // Grouped items for the summary view
    const summaryItems = useMemo(() => {
        const map = new Map<string, { name: string, price: number, qty: number }>();
        orderItems.forEach(item => {
            if (map.has(item.id)) {
                map.get(item.id)!.qty += item.quantity;
            } else {
                map.set(item.id, { name: item.name, price: item.price, qty: item.quantity });
            }
        });
        return Array.from(map.values());
    }, [orderItems]);

    // Lógica Retencion 1% Alcaldias / IVA según reqfirestore en la memoria base
    // Si es DTE 01 a Alcaldía y > $100 -> se le retiene 1% de IVA asumiendo que el subtotal es base $100
    let retencion1 = 0;
    if (docType === 'DTE_01' && clientIsAlcaldia && subtotal >= 100) {
        retencion1 = subtotal * 0.01;
    }
    const total = subtotal - retencion1;

    const activeTable = tables.find(t => t.id === selectedTableId);

    return (
        <div className="h-full flex flex-col lg:flex-row bg-background relative overflow-hidden font-sans">

            {loading && products.length === 0 && (
                <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
                    <Loader2 className="h-10 w-10 animate-spin text-primary" />
                </div>
            )}

            {/* LEFT SECTION - Product Catalog */}
            <div className="flex-1 flex flex-col h-full overflow-hidden border-r-2 border-foreground bg-background">

                {/* Top Bar - Search and Categories */}
                <div className="p-4 border-b-2 border-foreground space-y-4 shrink-0 bg-muted/10">
                    <div className="flex gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <input
                                type="text"
                                placeholder="Buscar productos o combos..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-9 pr-4 py-2 border rounded-md bg-transparent focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
                            />
                        </div>

                        {branches.length > 0 && (
                            <select
                                value={selectedBranchId} onChange={e => setSelectedBranchId(e.target.value)}
                                className="border rounded-md px-3 py-2 text-sm bg-card max-w-[200px]"
                            >
                                {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                            </select>
                        )}
                    </div>

                    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                        {['Todos'].map(cat => (
                            <button key={cat} onClick={() => setActiveCategory(cat)} className={`whitespace-nowrap px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${activeCategory === cat ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}>{cat}</button>
                        ))}
                    </div>
                </div>

                {/* Product Grid */}
                <div className="flex-1 overflow-y-auto p-4 pb-24 lg:pb-4">
                    <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {filteredProducts.map(product => (
                            <button key={product.id} onClick={() => addToOrder(product)} className="flex flex-col text-left bg-card text-card-foreground border border-border/50 rounded-2xl shadow-sm hover:shadow-md hover:bg-muted transition-all group overflow-hidden">
                                <div className="h-28 bg-muted flex items-center justify-center w-full relative border-b border-border/50">
                                    <span className="text-4xl text-muted-foreground/30 font-black group-hover:scale-110 transition-transform select-none">
                                        {product.name.charAt(0)}
                                    </span>
                                    {product.isExempt && <span className="absolute top-2 right-2 border border-emerald-400 rounded-md bg-emerald-300 text-emerald-900 px-2 py-0.5 text-[10px] font-bold">EXENTO</span>}
                                </div>
                                <div className="p-3">
                                    <h3 className="font-bold text-sm line-clamp-2 leading-tight min-h-[40px] uppercase">{product.name}</h3>
                                    <div className="flex justify-between items-end mt-1">
                                        <p className="text-primary font-black text-xl">${Number(product.price).toFixed(2)}</p>
                                        {Number(product.taxRate) > 0 && <span className="text-[10px] text-muted-foreground font-mono">+{Number(product.taxRate) * 100}% IVA</span>}
                                    </div>
                                </div>
                            </button>
                        ))}

                        {filteredProducts.length === 0 && !loading && (
                            <div className="col-span-full py-12 text-center text-muted-foreground flex flex-col items-center">
                                <ShoppingCart className="h-12 w-12 mb-3 opacity-20" />
                                <p className="font-medium text-foreground">El Catálogo está vacío.</p>
                                <p className="text-sm">Si eres administrador, agrega Productos de Venta desde el panel Administrativo.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Mobile Cart Toggle Overlay */}
            {showMobileCart && (
                <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-30 lg:hidden" onClick={() => setShowMobileCart(false)}></div>
            )}

            {/* Mobile Cart Toggle Button */}
            <button
                onClick={() => setShowMobileCart(!showMobileCart)}
                className="lg:hidden fixed bottom-6 right-6 z-40 rounded-full bg-accent text-accent-foreground p-4 shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2"
            >
                {showMobileCart ? <X className="h-6 w-6" /> : (
                    <>
                        <ShoppingCart className="h-6 w-6" />
                        <span className="font-bold">{orderItems.length > 0 ? orderItems.length : ''}</span>
                    </>
                )}
            </button>

            {/* RIGHT SECTION - Order Summary */}
            <div className={`fixed lg:relative right-0 top-0 bottom-0 w-full lg:w-[420px] flex flex-col h-full bg-card shrink-0 z-40 lg:z-10 transition-transform duration-300 lg:translate-x-0 ${showMobileCart ? 'translate-x-0 shadow-2xl' : 'translate-x-full shadow-none'} lg:border-l border-border/50`}>

                {/* Mesa Indicator Section */}
                <div className="p-4 border-b border-border/50 bg-muted/10">
                    <div className="flex justify-between items-center mb-3">
                        <h2 className="text-xl font-black uppercase tracking-widest flex items-center gap-2">
                            ORDEN
                        </h2>
                        <div className="flex items-center gap-2">
                            <span className={`text-xs px-2 py-1 rounded-md font-bold uppercase tracking-wide border ${activeTable ? 'bg-primary/10 text-primary border-primary/20' : 'bg-muted text-muted-foreground border-border'}`}>
                                {activeTable ? `MESA ${activeTable.number} (${activeTable.label || ''})` : 'PARA LLEVAR'}
                            </span>
                            <button onClick={() => setShowMobileCart(false)} className="lg:hidden p-1.5 bg-muted rounded-md text-foreground hover:bg-muted/80 active:scale-95 transition-transform">
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                    </div>

                    {/* Table Selector Dropdown */}
                    <div className="flex items-center gap-2 bg-background border rounded-lg p-1 shadow-sm">
                        <MapPin className="h-4 w-4 text-muted-foreground ml-2" />
                        <select
                            value={existingOrderId ? `order_${existingOrderId}` : (selectedTableId || '')}
                            onChange={(e) => {
                                const val = e.target.value;
                                if (val.startsWith('order_')) {
                                    const oId = val.split('_')[1];
                                    navigate(`/pos?orderId=${oId}`);
                                } else {
                                    setSelectedTableId(val || null);
                                    setExistingOrderId(null);
                                    setCustomerName('');
                                    setOrderItems([]);
                                    navigate('/pos' + (val ? `?tableId=${val}` : ''));
                                }
                            }}
                            className="flex-1 bg-transparent py-1.5 px-1 text-sm font-medium focus:outline-none"
                        >
                            <option value="">Nueva Cuenta: Llevar / Delivery</option>
                            <optgroup label="Tus Mesas Mapeadas">
                                {tables.map(t => {
                                    const order = openOrders.find(o => o.tableId === t.id);
                                    const val = order ? `order_${order.id}` : t.id;
                                    return (
                                        <option key={`table_${t.id}`} value={val}>
                                            {t.status === 'OCCUPIED' ? '🔴' : '🟢'} Mesa {t.number} {t.label ? `- ${t.label}` : ''}
                                        </option>
                                    );
                                })}
                            </optgroup>

                            {openOrders.filter(o => o.tableId === null).length > 0 && (
                                <optgroup label="Cuentas Flotantes (Abiertas)">
                                    {openOrders.filter(o => o.tableId === null).map(o => (
                                        <option key={`order_${o.id}`} value={`order_${o.id}`}>
                                            📋 {o.customerId || 'Cliente Sin Nombre'} (Nº {o.id.substring(0, 6).toUpperCase()})
                                        </option>
                                    ))}
                                </optgroup>
                            )}
                        </select>
                    </div>

                    {/* Nombre / Referencia de Cuenta Abierta */}
                    <div className="flex items-center gap-2 bg-background border rounded-lg p-1.5 shadow-sm mt-3">
                        <User className="h-4 w-4 text-muted-foreground ml-2 shrink-0" />
                        <input
                            type="text"
                            placeholder="Nombre / Referencia de cuenta (Opcional)"
                            value={customerName}
                            onChange={(e) => setCustomerName(e.target.value)}
                            className="flex-1 bg-transparent text-sm focus:outline-none placeholder:text-muted-foreground/60 w-full"
                        />
                    </div>

                    <div className="mt-3">
                        <button onClick={() => navigate('/tables')} className="w-full py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold shadow-md transition-all active:scale-95 flex items-center justify-center gap-2 uppercase tracking-wide">
                            <MapPin className="h-4 w-4" />
                            Volver al Mapa de Mesas
                        </button>
                    </div>
                </div>

                {/* Tabs Checkout */}
                <div className="flex border-b border-border/50 text-xs font-bold uppercase tracking-wider bg-muted/10">
                    <button onClick={() => setCartTab('nueva')} className={`flex-1 py-3 flex items-center justify-center gap-1 border-r border-border/50 transition-colors ${cartTab === 'nueva' ? 'bg-primary text-primary-foreground' : 'text-foreground hover:bg-muted'}`}>
                        <Plus className="h-3.5 w-3.5" /> Nueva Orden
                    </button>
                    <button onClick={() => setCartTab('cuenta')} className={`flex-1 py-3 flex items-center justify-center gap-1 border-r border-border/50 transition-colors ${cartTab === 'cuenta' ? 'bg-primary text-primary-foreground' : 'text-foreground hover:bg-muted'}`}>
                        <List className="h-3.5 w-3.5" /> Cuenta
                    </button>
                    <button onClick={() => setCartTab('resumen')} className={`flex-1 py-3 flex items-center justify-center gap-1 transition-colors ${cartTab === 'resumen' ? 'bg-primary text-primary-foreground' : 'text-foreground hover:bg-muted'}`}>
                        <Layers className="h-3.5 w-3.5" /> Resumen
                    </button>
                </div>

                {/* Order Items List */}
                <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 relative">
                    {cartTab === 'resumen' ? (
                        orderItems.length === 0 ? (
                            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground opacity-60 m-auto mt-20">
                                <ShoppingCart className="h-16 w-16 mb-4 stroke-1" />
                                <p className="font-medium text-lg text-foreground/80">Orden vacía</p>
                            </div>
                        ) : (
                            <div className="bg-background rounded-xl border p-4 shadow-sm flex flex-col gap-2">
                                <h3 className="font-bold text-sm mb-2 border-b pb-2 text-muted-foreground uppercase tracking-wider">Consolidado Total</h3>
                                {summaryItems.map((sItem, idx) => (
                                    <div key={idx} className="flex justify-between items-center py-2 border-b border-border/50 last:border-0">
                                        <div className="flex items-center gap-3">
                                            <span className="bg-primary/10 text-primary font-bold px-2 py-0.5 rounded w-8 text-center">{sItem.qty}x</span>
                                            <span className="font-semibold text-sm">{sItem.name}</span>
                                        </div>
                                        <span className="font-bold whitespace-nowrap">${(sItem.price * sItem.qty).toFixed(2)}</span>
                                    </div>
                                ))}
                            </div>
                        )
                    ) : (
                        (() => {
                            const displayItems = orderItems.filter(item => cartTab === 'nueva' ? !item.isSaved : item.isSaved);
                            if (displayItems.length === 0) {
                                return (
                                    <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground opacity-60 m-auto mt-20 text-center px-4">
                                        {cartTab === 'nueva' ? <Plus className="h-16 w-16 mb-4 stroke-1 opacity-50" /> : <List className="h-16 w-16 mb-4 stroke-1 opacity-50" />}
                                        <p className="font-medium text-lg text-foreground/80">{cartTab === 'nueva' ? 'Nueva Orden Vacía' : 'Cuenta Vacía'}</p>
                                        <p className="text-sm mt-1">{cartTab === 'nueva' ? 'Toca productos para agregar a esta orden' : 'No hay productos guardados en esta cuenta'}</p>
                                    </div>
                                );
                            }
                            return displayItems.map((item, idx) => (
                                <div key={item.cartId} className={`flex flex-col shrink-0 border border-border/50 bg-background rounded-xl p-3 shadow-sm relative group overflow-hidden transition-colors hover:shadow-md ${item.isSaved ? 'opacity-80' : 'new-item-glow'}`}>
                                    <div className={`absolute left-0 top-0 bottom-0 w-1 transform scale-y-0 group-hover:scale-y-100 transition-transform origin-bottom ${item.isSaved ? 'bg-muted-foreground' : 'bg-primary'}`} />
                                    <div className="flex justify-between items-start">
                                        <span className="font-semibold text-sm pr-4 leading-tight flex items-center gap-2">
                                            <span className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono text-muted-foreground">#{idx + 1}</span>
                                            {item.name}
                                        </span>
                                        <div className="flex flex-col items-end gap-1">
                                            <span className="font-black text-sm whitespace-nowrap">${(item.price * item.quantity).toFixed(2)}</span>
                                            {item.isSaved && item.status === 'PREPARING' && <span className="text-[10px] bg-blue-100 text-blue-800 border-blue-300 border px-1 font-bold">PREPARANDO</span>}
                                            {item.isSaved && item.status === 'READY' && <span className="text-[10px] bg-emerald-100 text-emerald-800 border-emerald-300 border px-1 font-bold">LISTO / ESPERANDO</span>}
                                            {item.isSaved && item.status === 'DELIVERED' && <span className="text-[10px] bg-muted text-muted-foreground border px-1 font-bold">ENTREGADO</span>}
                                        </div>
                                    </div>
                                    <div className="flex justify-between items-center mt-3">
                                        <span className="text-xs text-muted-foreground font-mono bg-muted px-1.5 py-0.5 rounded">${Number(item.price).toFixed(2)} c/u</span>

                                        <div className="flex items-center gap-1 bg-muted/40 border rounded-lg p-1">
                                            {item.isSaved ? (
                                                item.status === 'READY' ? (
                                                    <button onClick={() => markAsDelivered(item.cartId)} className="px-2 py-1 bg-emerald-500 text-white font-bold text-[10px] rounded hover:bg-emerald-600 uppercase tracking-widest transition-colors">
                                                        ENTREGAR AL CLIENTE
                                                    </button>
                                                ) : (
                                                    <span className="px-2 text-[10px] font-bold text-muted-foreground uppercase opacity-50">SIN ACCIONES</span>
                                                )
                                            ) : (
                                                <>
                                                    <button onClick={() => item.quantity > 1 ? updateQuantity(item.cartId, -1) : removeItem(item.cartId)} className="w-8 h-8 flex items-center justify-center hover:bg-background rounded shadow-sm text-foreground/80 transition-all active:scale-90">
                                                        {item.quantity === 1 ? <Trash2 className="h-4 w-4 text-destructive" /> : <Minus className="h-4 w-4" />}
                                                    </button>
                                                    <span className="w-8 text-center font-bold">{item.quantity}</span>
                                                    <button onClick={() => updateQuantity(item.cartId, 1)} className="w-8 h-8 flex items-center justify-center hover:bg-background rounded shadow-sm text-foreground/80 transition-all active:scale-90 text-primary">
                                                        <Plus className="h-4 w-4" />
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ));
                        })()
                    )}
                </div>

                {/* Totals & Fiscal Checkout */}
                <div className="border-t border-border/50 bg-card shrink-0">

                    {/* Docs & Retentions */}
                    <div className="px-5 py-3 border-b bg-muted/10 grid grid-cols-2 gap-3 items-center">
                        <div className="text-xs font-semibold text-muted-foreground">Documento:</div>
                        <select value={docType} onChange={(e) => setDocType(e.target.value as any)} className="border rounded-md px-2 py-1 text-sm font-medium bg-background shadow-sm focus:outline-none focus:ring-1 focus:ring-primary">
                            <option value="TICKET">Ticket (Interno)</option>
                            <option value="DTE_01">Factura Consumidor Final (DTE 01)</option>
                            <option value="DTE_03">Crédito Fiscal (DTE 03)</option>
                            <option value="EXCLUIDO">Sujeto Excluido</option>
                        </select>

                        {docType === 'DTE_01' && (
                            <div className="col-span-2 flex items-center gap-2 mt-2 p-2 bg-amber-500/10 rounded-md border border-amber-500/20 text-xs">
                                <input type="checkbox" id="alcaldia" checked={clientIsAlcaldia} onChange={e => setClientIsAlcaldia(e.target.checked)} className="rounded text-primary focus:ring-primary accent-amber-600" />
                                <label htmlFor="alcaldia" className="font-semibold text-amber-800 cursor-pointer flex-1 cursor-pointer">
                                    Cliente es Alcaldía (Aplica Retención 1% IVA si supera límite legal).
                                </label>
                            </div>
                        )}
                    </div>

                    <div className="p-5 space-y-3">
                        <div className="flex justify-between text-sm text-muted-foreground font-medium">
                            <span>Subtotal Facturable</span>
                            <span>${subtotal.toFixed(2)}</span>
                        </div>
                        {retencion1 > 0 && (
                            <div className="flex justify-between text-sm text-rose-600 font-bold bg-rose-50 px-2 py-1 rounded">
                                <span>(-) Retención Anticipo IVA (1%) DTE 01</span>
                                <span>-${retencion1.toFixed(2)}</span>
                            </div>
                        )}
                        <div className="flex justify-between text-2xl font-black pt-3 border-t">
                            <span>Total a Cobrar</span>
                            <span className="text-primary">${total.toFixed(2)}</span>
                        </div>
                    </div>

                    <div className="p-4 pt-0 space-y-3">
                        <button
                            onClick={processOrder}
                            disabled={orderItems.length === 0 || loading}
                            className="w-full relative flex items-center justify-center gap-2 rounded-xl border border-border/50 bg-card py-4 font-black uppercase text-sm tracking-wide shadow-sm hover:shadow-md transition-all active:scale-95 disabled:opacity-50"
                        >
                            <Ticket className="h-5 w-5" />
                            {existingOrderId ? 'ACTUALIZAR COMANDA' : 'GUARDAR COMANDA'}
                        </button>

                        <button
                            onClick={() => {
                                setPaymentAmount(total.toFixed(2));
                                setShowPaymentModal(true);
                            }}
                            disabled={orderItems.length === 0 || loading}
                            className="w-full relative flex items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/20 py-5 font-black text-lg hover:bg-primary/90 uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50"
                        >
                            <Wallet className="h-6 w-6" />
                            COBRAR DIRECTO
                        </button>
                    </div>
                </div>
            </div>

            {/* MODAL: Cobrar Directo */}
            {showPaymentModal && (
                <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="w-full max-w-sm bg-card border rounded-xl shadow-lg flex flex-col animate-in zoom-in-95 duration-200 overflow-hidden">
                        <div className="p-4 border-b flex justify-between items-center bg-emerald-600 text-white">
                            <h2 className="text-lg font-bold flex items-center gap-2"><CreditCard className="h-5 w-5" /> Cobro Rápido</h2>
                            <button onClick={() => setShowPaymentModal(false)} className="hover:bg-white/20 p-1 rounded transition-colors"><X className="h-5 w-5" /></button>
                        </div>
                        <form onSubmit={handleDirectPay} className="p-4 space-y-4">
                            <div className="bg-muted p-4 rounded-lg text-center shadow-inner">
                                <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider mb-1">Total a Pagar</p>
                                <p className="font-bold text-3xl text-emerald-600">${Number(total).toFixed(2)}</p>
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
                                <label className="text-sm font-medium mb-1 block">Monto Recibido</label>
                                <input required type="number" step="0.01" min={total} value={paymentAmount} onChange={e => setPaymentAmount(e.target.value)} className="w-full border rounded-md px-3 py-3 font-mono text-center text-xl font-bold bg-transparent focus:outline-none focus:ring-2 focus:ring-emerald-500/50" placeholder="0.00" />
                                <div className="text-xs text-center text-muted-foreground mt-2 min-h-[16px]">
                                    {(Number(paymentAmount) - total) > 0 && <span>Su Cambio: <span className="font-bold text-foreground">${(Number(paymentAmount) - total).toFixed(2)}</span></span>}
                                </div>
                            </div>

                            <div className="pt-2 flex justify-end gap-2 border-t">
                                <button type="submit" disabled={loading || Number(paymentAmount) < total} className="w-full py-3 bg-emerald-600 text-white rounded-md text-sm font-bold flex items-center justify-center gap-2 shadow-md hover:bg-emerald-700 transition-colors disabled:opacity-50">
                                    {loading && <Loader2 className="h-4 w-4 animate-spin" />} CONFIRMAR PAGO
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

        </div>
    );
}
