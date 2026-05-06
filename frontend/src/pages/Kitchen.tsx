import { useState, useEffect } from 'react';
import { ChefHat, CheckCircle2, Clock, Loader2, ArrowRight } from 'lucide-react';
import { api } from '../lib/axios';

interface OrderItem {
    id: string;
    status: 'PENDING' | 'PREPARING' | 'READY' | 'DELIVERED';
    qty: string | number;
    notes?: string;
    createdAt: string;
    productSale: { name: string };
    order: {
        id: string;
        table?: { number: string; label?: string };
        customerId?: string;
    };
}

export default function Kitchen() {
    const [items, setItems] = useState<OrderItem[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchQueue = async () => {
        try {
            const { data } = await api.get('/kitchen/items');
            if (data.success) {
                setItems(data.data);
            }
        } catch (error) {
            console.error('Error fetching kitchen queue:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchQueue();
        const interval = setInterval(fetchQueue, 10000); // Short-polling every 10 seconds
        return () => clearInterval(interval);
    }, []);

    const updateStatus = async (id: string, newStatus: string) => {
        try {
            // Optimistic update
            setItems(prev => prev.map(item => item.id === id ? { ...item, status: newStatus as any } : item));
            await api.put(`/kitchen/items/${id}/status`, { status: newStatus });
            // Let the interval or a refetch correct any discrepancies, but optimistic update is snappy.
        } catch (error) {
            console.error('Error updating status:', error);
            fetchQueue(); // rollback
        }
    };

    const pendingItems = items.filter(i => i.status === 'PENDING');
    const preparingItems = items.filter(i => i.status === 'PREPARING');
    const readyItems = items.filter(i => i.status === 'READY');

    const renderCard = (item: OrderItem, nextStatus: string | null, buttonText: string, buttonColor: string) => {
        const timeElapsed = Math.floor((new Date().getTime() - new Date(item.createdAt).getTime()) / 60000);
        return (
            <div key={item.id} className="bg-card text-card-foreground brutal-border p-4 shadow-[4px_4px_0_0_rgba(0,0,0,0.2)] flex flex-col gap-3">
                <div className="flex justify-between items-start border-b pb-2">
                    <h3 className="font-black text-lg uppercase leading-tight">{Number(item.qty)}x {item.productSale.name}</h3>
                    <span className={`text-xs font-bold px-2 py-1 ${timeElapsed > 15 ? 'bg-destructive text-destructive-foreground animate-pulse' : 'bg-muted text-muted-foreground'}`}>
                        {timeElapsed} MIN
                    </span>
                </div>
                
                <div className="text-sm font-mono uppercase text-muted-foreground flex justify-between">
                    <span>{item.order.table ? `Mesa: ${item.order.table.number}` : 'PARA LLEVAR'}</span>
                    <span>#{item.order.id.substring(0,6)}</span>
                </div>

                {item.notes && (
                    <div className="bg-amber-100 text-amber-900 border border-amber-300 p-2 text-xs font-bold uppercase">
                        NOTAS: {item.notes}
                    </div>
                )}

                {nextStatus && (
                    <button 
                        onClick={() => updateStatus(item.id, nextStatus)}
                        className={`mt-2 brutal-button w-full py-3 font-black flex justify-center items-center gap-2 ${buttonColor} transition-transform active:scale-95`}
                    >
                        {buttonText} <ArrowRight className="h-5 w-5" />
                    </button>
                )}
            </div>
        );
    };

    return (
        <div className="h-full flex flex-col p-4 bg-background overflow-hidden">
            <div className="flex items-center justify-between mb-6 pb-4 border-b-4 border-foreground">
                <h1 className="text-4xl font-black uppercase tracking-widest flex items-center gap-4">
                    <ChefHat className="h-10 w-10 text-primary" />
                    Monitor de Cocina (KDS)
                </h1>
                <div className="flex items-center gap-4">
                    {loading && <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />}
                    <span className="font-mono text-sm font-bold bg-foreground text-background px-3 py-1">EN VIVO</span>
                </div>
            </div>

            <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-6 overflow-hidden">
                {/* COLUMNA: SOLICITADOS */}
                <div className="flex flex-col border-4 border-foreground bg-muted/20">
                    <div className="bg-foreground text-background p-4 flex justify-between items-center">
                        <h2 className="font-black text-xl uppercase tracking-widest flex items-center gap-2">
                            <Clock className="h-5 w-5" /> Solicitados
                        </h2>
                        <span className="bg-background text-foreground font-black px-2 py-0.5 rounded-full text-sm">{pendingItems.length}</span>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
                        {pendingItems.map(item => renderCard(item, 'PREPARING', 'PREPARAR', 'bg-blue-600 text-white'))}
                    </div>
                </div>

                {/* COLUMNA: EN PREPARACIÓN */}
                <div className="flex flex-col border-4 border-foreground bg-blue-50/50">
                    <div className="bg-blue-600 text-white p-4 flex justify-between items-center">
                        <h2 className="font-black text-xl uppercase tracking-widest flex items-center gap-2">
                            <ChefHat className="h-5 w-5" /> En Preparación
                        </h2>
                        <span className="bg-background text-blue-900 font-black px-2 py-0.5 rounded-full text-sm">{preparingItems.length}</span>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
                        {preparingItems.map(item => renderCard(item, 'READY', 'TERMINADO', 'bg-emerald-600 text-white'))}
                    </div>
                </div>

                {/* COLUMNA: LISTOS */}
                <div className="flex flex-col border-4 border-foreground bg-emerald-50/50">
                    <div className="bg-emerald-600 text-white p-4 flex justify-between items-center">
                        <h2 className="font-black text-xl uppercase tracking-widest flex items-center gap-2">
                            <CheckCircle2 className="h-5 w-5" /> Listos / Esperando
                        </h2>
                        <span className="bg-background text-emerald-900 font-black px-2 py-0.5 rounded-full text-sm">{readyItems.length}</span>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 opacity-70 hover:opacity-100 transition-opacity">
                        {readyItems.map(item => renderCard(item, null, '', ''))}
                        {readyItems.length > 0 && (
                            <div className="text-center text-sm font-bold text-muted-foreground mt-4 uppercase">
                                El cajero/mesero lo entregará desde el POS.
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
