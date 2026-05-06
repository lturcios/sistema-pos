import { useState, useEffect } from 'react';
import { api } from '../lib/axios';
import { CreditCard, DollarSign, Loader2, ArrowUpCircle, ArrowDownCircle, CheckCircle, Plus, X, Lock, FileText } from 'lucide-react';
import CashReportModal from '../components/cash/CashReportModal';
import { usePermissions } from '../hooks/usePermissions';
import { useAuthStore } from '../store/authStore';

interface Branch { id: string; name: string; }
interface CashRegister { id: string; name: string; branch: Branch; isActive: boolean; }
interface User { fullName: string; }
interface CashTransaction { id: string; type: string; amount: number; description: string; reference: string | null; date: string; }
interface CashSession {
    id: string;
    status: string;
    openingBalance: number;
    closingBalance: number | null;
    expectedBalance: number | null;
    discrepancy: number | null;
    openedAt: string;
    closedAt: string | null;
    notes: string | null;
    register: CashRegister;
    user: User;
    transactions?: CashTransaction[];
}

export default function Cash() {
    const { hasPermission } = usePermissions();
    const user = useAuthStore(state => state.user);
    const roleName = user?.role?.toUpperCase() || '';
    const isAdmin = roleName === 'ADMINISTRADOR' || roleName === 'SUPERADMIN' || roleName === 'ADMIN';

    const [loading, setLoading] = useState(false);
    const [registers, setRegisters] = useState<CashRegister[]>([]);
    const [sessions, setSessions] = useState<CashSession[]>([]);
    const [activeSession, setActiveSession] = useState<CashSession | null>(null);
    const [sessionToClose, setSessionToClose] = useState<CashSession | null>(null);

    // Modals
    const [showOpenModal, setShowOpenModal] = useState(false);
    const [showCloseModal, setShowCloseModal] = useState(false);
    const [showTxModal, setShowTxModal] = useState(false);
    const [showRegisterModal, setShowRegisterModal] = useState(false);
    const [viewReportSessionId, setViewReportSessionId] = useState<string | null>(null);

    // Form states
    const [openForm, setOpenForm] = useState({ registerId: '', openingBalance: 0, notes: '' });
    const [closeForm, setCloseForm] = useState({ closingBalance: 0, notes: '' });
    const [txForm, setTxForm] = useState({ type: 'INCOME', amount: 0, description: '', reference: '' });
    const [registerForm, setRegisterForm] = useState({ name: '', branchId: '', isActive: true });

    // Admin config data
    const [branches, setBranches] = useState<Branch[]>([]);

    useEffect(() => {
        fetchActiveSession();
        fetchSessions();
        fetchRegisters();
        if (hasPermission('branches', 'read')) {
            fetchBranches();
        }
    }, [hasPermission]);

    const fetchActiveSession = async () => {
        try {
            const { data } = await api.get('/cash/sessions/active');
            setActiveSession(data.data);
        } catch (error) { console.error("Error fetching active session:", error); }
    };

    const fetchSessions = async () => {
        setLoading(true);
        try {
            const { data } = await api.get('/cash/sessions');
            setSessions(data.data);
        } catch (error) { console.error(error); } finally { setLoading(false); }
    };

    const fetchRegisters = async () => {
        try {
            const { data } = await api.get('/cash/registers');
            setRegisters(data.data);
        } catch (error) { console.error(error); }
    };

    const fetchBranches = async () => {
        try {
            const { data } = await api.get('/branches');
            setBranches(data.data);
        } catch (error) { console.error(error); }
    };

    const handleOpenSession = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await api.post('/cash/sessions/open', {
                ...openForm,
                openingBalance: Number(openForm.openingBalance)
            });
            setShowOpenModal(false);
            fetchActiveSession();
            fetchSessions();
            setOpenForm({ registerId: '', openingBalance: 0, notes: '' });
        } catch (error: any) { alert(error.response?.data?.error || 'Error al abrir caja'); } finally { setLoading(false); }
    };

    const handleCloseSession = async (e: React.FormEvent) => {
        e.preventDefault();
        const targetSession = sessionToClose || activeSession;
        if (!targetSession) return;
        setLoading(true);
        try {
            await api.post(`/cash/sessions/${targetSession.id}/close`, {
                ...closeForm,
                closingBalance: Number(closeForm.closingBalance)
            });
            setShowCloseModal(false);
            setSessionToClose(null);
            fetchActiveSession();
            fetchSessions();
            setCloseForm({ closingBalance: 0, notes: '' });
        } catch (error: any) { alert(error.response?.data?.error || 'Error al cerrar caja'); } finally { setLoading(false); }
    };

    const handleTransaction = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!activeSession) return;
        setLoading(true);
        try {
            await api.post(`/cash/sessions/${activeSession.id}/transactions`, {
                ...txForm,
                amount: Number(txForm.amount)
            });
            setShowTxModal(false);
            fetchActiveSession();
            setTxForm({ type: 'INCOME', amount: 0, description: '', reference: '' });
        } catch (error: any) { alert(error.response?.data?.error || 'Error al registrar movimiento'); } finally { setLoading(false); }
    };

    const handleCreateRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await api.post('/cash/registers', registerForm);
            setShowRegisterModal(false);
            fetchRegisters();
            setRegisterForm({ name: '', branchId: '', isActive: true });
        } catch (error: any) { alert(error.response?.data?.error || 'Error al crear caja'); } finally { setLoading(false); }
    };

    return (
        <div className="p-6 h-full flex flex-col bg-muted/10 relative">
            <div className="flex justify-between items-end mb-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Gestión de Cajas</h1>
                    <p className="text-muted-foreground mt-1">Apertura, movimientos, retiros de efectivo y cortes de turno.</p>
                </div>
                <div className="flex items-center gap-2">
                    {hasPermission('registers', 'create') && (
                        <button onClick={() => setShowRegisterModal(true)} className="flex items-center gap-2 border bg-card text-foreground px-4 py-2 rounded-md font-medium hover:bg-muted transition-colors shadow-sm text-sm">
                            <Plus className="h-4 w-4" />
                            Crear Caja (Admin)
                        </button>
                    )}
                    {!activeSession ? (
                        <button onClick={() => setShowOpenModal(true)} className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-md font-bold hover:bg-emerald-700 transition-colors shadow-sm">
                            <CheckCircle className="h-4 w-4" />
                            Abrir Mi Turno
                        </button>
                    ) : (
                        <button onClick={() => { setSessionToClose(activeSession); setShowCloseModal(true); }} className="flex items-center gap-2 bg-destructive text-destructive-foreground px-4 py-2 rounded-md font-bold hover:bg-destructive/90 transition-colors shadow-sm">
                            <Lock className="h-4 w-4" />
                            Cerrar Turno (Corte)
                        </button>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 overflow-hidden">
                {/* STATUS BAR / ACTIVE SESSION */}
                <div className="lg:col-span-1 flex flex-col gap-6">
                    <div className={`p-6 rounded-xl border shadow-sm flex flex-col text-white ${activeSession ? 'bg-gradient-to-br from-emerald-600 to-emerald-800' : 'bg-gradient-to-br from-slate-700 to-slate-900 border-slate-700'}`}>
                        <h2 className="text-lg font-bold mb-4 opacity-90 tracking-wide flex items-center justify-between">
                            <span>Mi Turno Actual</span>
                            <CreditCard className="h-5 w-5 opacity-50" />
                        </h2>

                        {activeSession ? (
                            <>
                                <div className="space-y-4 flex-1">
                                    <div>
                                        <p className="text-emerald-100 text-sm">Caja / Sede</p>
                                        <p className="font-bold text-xl">{activeSession.register.name}</p>
                                    </div>
                                    <div>
                                        <p className="text-emerald-100 text-sm">Aperturada el</p>
                                        <p className="font-mono text-base">{new Date(activeSession.openedAt).toLocaleString()}</p>
                                    </div>
                                    <div className="pt-4 border-t border-emerald-500/30">
                                        <p className="text-emerald-100 text-sm">Saldo Inicial (Fondo)</p>
                                        <p className="font-mono text-2xl font-black">${Number(activeSession.openingBalance).toFixed(2)}</p>
                                    </div>
                                </div>
                                <div className="mt-8">
                                    <button onClick={() => setShowTxModal(true)} className="w-full bg-white/20 hover:bg-white/30 text-white py-3 rounded-lg font-bold transition-colors flex items-center justify-center gap-2 border border-white/20 shadow">
                                        <DollarSign className="h-5 w-5" /> Movimiento Rápido de Efectivo
                                    </button>
                                </div>
                            </>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center text-center opacity-80 min-h-[250px]">
                                <Lock className="h-12 w-12 mb-3 opacity-50" />
                                <p className="font-medium text-lg">Caja Cerrada</p>
                                <p className="text-sm mt-1 max-w-[200px]">No tienes un turno actualmente. Abre tu caja para comenzar a facturar y registrar ingresos.</p>
                            </div>
                        )}
                    </div>

                    {/* Summary list of recent movements mapped if active session mapped from a context or endpoint *to be expanded* */}
                    <div className="bg-card rounded-xl border shadow-sm p-4 flex-1 overflow-auto">
                        <h3 className="font-bold mb-3 border-b pb-2 flex items-center justify-between">Movimientos de la Sedes</h3>
                        <p className="text-xs text-muted-foreground italic text-center py-10 opacity-70">Para ver transacciones detalladas navegue al histórico.</p>
                    </div>
                </div>

                {/* HISTORICAL SESSIONS TABLE */}
                <div className="lg:col-span-2 bg-card rounded-xl border shadow-sm flex flex-col overflow-hidden">
                    <div className="p-4 border-b bg-muted/30">
                        <h2 className="font-bold text-lg">Histórico de Cortes (Arqueos)</h2>
                    </div>
                    <div className="flex-1 overflow-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-muted text-muted-foreground uppercase text-xs sticky top-0">
                                <tr>
                                    <th className="px-4 py-3 font-semibold">Fecha / Cajero</th>
                                    <th className="px-4 py-3 font-semibold">Caja Activa</th>
                                    <th className="px-4 py-3 font-semibold text-right">Inicial</th>
                                    <th className="px-4 py-3 font-semibold text-right">Final Reportado</th>
                                    <th className="px-4 py-3 font-semibold text-center">Descuadre</th>
                                    <th className="px-4 py-3 font-semibold text-center">Estado</th>
                                    <th className="px-4 py-3 font-semibold text-center">Reporte</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y relative">
                                {sessions.map(s => {
                                    const diff = s.discrepancy !== null ? Number(s.discrepancy) : 0;
                                    return (
                                        <tr key={s.id} className="hover:bg-muted/50 transition-colors group">
                                            <td className="px-4 py-4">
                                                <div className="font-bold">{s.user.fullName}</div>
                                                <div className="text-xs text-muted-foreground">{new Date(s.openedAt).toLocaleDateString()} {new Date(s.openedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {s.closedAt ? new Date(s.closedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '...'}</div>
                                            </td>
                                            <td className="px-4 py-4 font-medium text-primary">{s.register.name}</td>
                                            <td className="px-4 py-4 text-right font-mono">${Number(s.openingBalance).toFixed(2)}</td>
                                            <td className="px-4 py-4 text-right font-mono font-bold">{s.closingBalance !== null ? `$${Number(s.closingBalance).toFixed(2)}` : '---'}</td>
                                            <td className="px-4 py-4 text-center">
                                                {s.closingBalance === null ? <span className="text-muted-foreground">---</span> : (
                                                    isAdmin ? (
                                                        <span className={`px-2 py-0.5 rounded text-xs font-bold font-mono ${diff === 0 ? 'bg-emerald-500/10 text-emerald-600' : diff > 0 ? 'bg-amber-500/10 text-amber-600' : 'bg-destructive/10 text-destructive'}`}>
                                                            {diff === 0 ? 'OK / CUADRADO' : diff > 0 ? `SOBRANTE: +${diff.toFixed(2)}` : `FALTANTE: ${diff.toFixed(2)}`}
                                                        </span>
                                                    ) : (
                                                        <span className={`px-2 py-0.5 rounded text-xs font-bold font-mono ${diff >= 0 ? 'bg-emerald-500/10 text-emerald-600' : 'bg-destructive/10 text-destructive'}`}>
                                                            {diff >= 0 ? 'OK / CUADRADO' : `FALTANTE: ${diff.toFixed(2)}`}
                                                        </span>
                                                    )
                                                )}
                                            </td>
                                            <td className="px-4 py-4 text-center">
                                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${s.status === 'OPEN' ? 'bg-emerald-500/20 text-emerald-700 animate-pulse' : 'bg-slate-200 text-slate-700'}`}>
                                                    {s.status === 'OPEN' ? 'Abierta' : 'Cerrada'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-4 text-center">
                                                <div className="flex gap-2 justify-center">
                                                    <button onClick={() => setViewReportSessionId(s.id)} className="p-1.5 bg-muted text-foreground hover:bg-muted/80 rounded-md transition-colors border shadow-sm flex items-center justify-center mx-auto" title={s.status === 'OPEN' ? 'Corte X (Parcial)' : 'Corte Z (Final)'}>
                                                        <FileText className="h-4 w-4" />
                                                    </button>
                                                    {s.status === 'OPEN' && isAdmin && (
                                                        <button onClick={() => { setSessionToClose(s); setShowCloseModal(true); }} className="p-1.5 bg-destructive text-destructive-foreground hover:bg-destructive/80 rounded-md transition-colors border shadow-sm flex items-center justify-center mx-auto" title="Forzar Cierre de Turno">
                                                            <Lock className="h-4 w-4" />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                })}
                                {sessions.length === 0 && !loading && (
                                    <tr><td colSpan={6} className="text-center py-10 text-muted-foreground text-sm">No existen registros de turnos históricos.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* --- MODALS --- */}

            {/* ABRIR CAJA */}
            {showOpenModal && (
                <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="w-full max-w-sm bg-card border rounded-xl shadow-lg flex flex-col animate-in zoom-in-95 duration-200">
                        <div className="p-4 border-b flex justify-between items-center"><h2 className="text-lg font-bold">Apertura de Caja</h2><button onClick={() => setShowOpenModal(false)}><X className="h-5 w-5" /></button></div>
                        <form onSubmit={handleOpenSession} className="p-4 space-y-4">
                            <div>
                                <label className="text-sm font-medium mb-1 block">Seleccionar Caja Asignada</label>
                                <select required value={openForm.registerId} onChange={e => setOpenForm({ ...openForm, registerId: e.target.value })} className="w-full border rounded-md px-3 py-2 bg-transparent text-sm">
                                    <option value="">-- Elige la Caja --</option>
                                    {registers.filter(r => r.isActive).map(r => <option key={r.id} value={r.id}>{r.name} - {r.branch.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="text-sm font-medium mb-1 block">Saldo Inicial / Efectivo Base ($)</label>
                                <input type="number" step="0.01" min="0" required value={openForm.openingBalance} onChange={e => setOpenForm({ ...openForm, openingBalance: Number(e.target.value) })} className="w-full border rounded-md px-3 py-2 bg-transparent text-lg font-mono text-center font-bold text-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-500" />
                            </div>
                            <div><label className="text-sm font-medium mb-1 block">Observaciones Iniciales</label><textarea value={openForm.notes} onChange={e => setOpenForm({ ...openForm, notes: e.target.value })} className="w-full border rounded-md px-3 py-2 bg-transparent text-sm h-20 resize-none" placeholder="Opcional. Ej: Base incompleta..."></textarea></div>
                            <div className="pt-2"><button type="submit" disabled={loading} className="w-full py-3 bg-emerald-600 text-white rounded-md font-bold text-sm tracking-wide shadow-md hover:bg-emerald-700 flex items-center justify-center gap-2">{loading && <Loader2 className="h-4 w-4 animate-spin" />} ABRIR CAJA (INICIAR TURNO)</button></div>
                        </form>
                    </div>
                </div>
            )}

            {/* CERRAR CAJA / CORTE */}
            {showCloseModal && (
                <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="w-full max-w-sm bg-card border rounded-xl shadow-lg flex flex-col animate-in zoom-in-95 duration-200">
                        <div className="p-4 border-b flex justify-between items-center"><h2 className="text-lg font-bold text-destructive">Cierre de Caja (Corte Z)</h2><button onClick={() => { setShowCloseModal(false); setSessionToClose(null); }}><X className="h-5 w-5" /></button></div>
                        <form onSubmit={handleCloseSession} className="p-4 space-y-4">
                            <div className="bg-muted p-4 rounded-lg text-center">
                                <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider mb-1">Caja en cierre</p>
                                <p className="font-bold text-lg">{(sessionToClose || activeSession)?.register?.name}</p>
                            </div>
                            <div>
                                <label className="text-sm font-medium mb-1 block text-center text-foreground/80">Declara el Efectivo / Totales Contados en Gaveta ($)</label>
                                <input type="number" step="0.01" min="0" required value={closeForm.closingBalance} onChange={e => setCloseForm({ ...closeForm, closingBalance: Number(e.target.value) })} className="w-full border-2 border-destructive/30 rounded-lg px-3 py-4 bg-transparent text-3xl font-mono text-center font-black text-destructive focus:outline-none focus:border-destructive" />
                                <p className="text-[10px] text-center text-muted-foreground mt-1 tracking-tight">El sistema validará automáticamente si existen diferencias al cerrar.</p>
                            </div>
                            <div><label className="text-sm font-medium mb-1 block">Observaciones de Cierre</label><textarea value={closeForm.notes} onChange={e => setCloseForm({ ...closeForm, notes: e.target.value })} className="w-full border rounded-md px-3 py-2 bg-transparent text-sm h-16 resize-none" placeholder="Justificaciones de faltantes/sobrantes..."></textarea></div>
                            <div className="pt-2"><button type="submit" disabled={loading} className="w-full py-3 bg-destructive text-white rounded-md font-bold text-sm tracking-wide shadow-md hover:bg-destructive/90 flex items-center justify-center gap-2">{loading && <Loader2 className="h-4 w-4 animate-spin" />} CONFIRMAR CORTE Y CERRAR</button></div>
                        </form>
                    </div>
                </div>
            )}

            {/* OPERACION / TRANSACCION MANUAAL */}
            {showTxModal && activeSession && (
                <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="w-full max-w-md bg-card border rounded-xl shadow-lg flex flex-col animate-in zoom-in-95 duration-200">
                        <div className="p-4 border-b flex justify-between items-center"><h2 className="text-lg font-bold">Registro Manual de Efectivo</h2><button onClick={() => setShowTxModal(false)}><X className="h-5 w-5" /></button></div>
                        <form onSubmit={handleTransaction} className="p-4 space-y-4">
                            <div className="grid grid-cols-2 gap-2">
                                <button type="button" onClick={() => setTxForm({ ...txForm, type: 'INCOME' })} className={`py-4 flex flex-col items-center justify-center gap-2 border rounded-lg font-bold transition-colors ${txForm.type === 'INCOME' ? 'bg-emerald-500/10 border-emerald-500 text-emerald-600' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}>
                                    <ArrowUpCircle className="h-6 w-6" /> INGRESO
                                </button>
                                <button type="button" onClick={() => setTxForm({ ...txForm, type: 'EXPENSE' })} className={`py-4 flex flex-col items-center justify-center gap-2 border rounded-lg font-bold transition-colors ${txForm.type === 'EXPENSE' ? 'bg-destructive/10 border-destructive text-destructive' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}>
                                    <ArrowDownCircle className="h-6 w-6" /> RETIRO / PAGO
                                </button>
                            </div>
                            <div>
                                <label className="text-sm font-medium mb-1 block">Cantidad ($)</label>
                                <input type="number" step="0.01" min="0.01" required value={txForm.amount} onChange={e => setTxForm({ ...txForm, amount: Number(e.target.value) })} className="w-full border rounded-md px-3 py-3 bg-transparent text-xl font-mono text-center font-bold focus:outline-none focus:ring-1 focus:ring-primary" />
                            </div>
                            <div><label className="text-sm font-medium mb-1 block">Motivo / Descripción</label><input required value={txForm.description} onChange={e => setTxForm({ ...txForm, description: e.target.value })} className="w-full border rounded-md px-3 py-2 bg-transparent text-sm" placeholder="Ej: Pago de agua, Retiro para remesa..." /></div>
                            <div><label className="text-sm font-medium mb-1 block">Referencia (Factura, Recibo)</label><input value={txForm.reference} onChange={e => setTxForm({ ...txForm, reference: e.target.value })} className="w-full border rounded-md px-3 py-2 bg-transparent text-sm font-mono uppercase" placeholder="Opcional" /></div>

                            <div className="pt-4"><button type="submit" disabled={loading} className="w-full py-3 bg-primary text-primary-foreground rounded-md font-bold text-sm shadow hover:bg-primary/90 flex items-center justify-center gap-2">{loading && <Loader2 className="h-4 w-4 animate-spin" />} APLICAR A CAJA</button></div>
                        </form>
                    </div>
                </div>
            )}

            {/* CREAR CAJA MASTER */}
            {showRegisterModal && (
                <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="w-full max-w-sm bg-card border rounded-xl shadow-lg flex flex-col animate-in zoom-in-95 duration-200">
                        <div className="p-4 border-b flex justify-between items-center"><h2 className="text-lg font-bold">Crear Terminal de Caja</h2><button onClick={() => setShowRegisterModal(false)}><X className="h-5 w-5" /></button></div>
                        <form onSubmit={handleCreateRegister} className="p-4 space-y-4">
                            <div><label className="text-sm font-medium mb-1 block">Nombre Comercial Identificativo</label><input required value={registerForm.name} onChange={e => setRegisterForm({ ...registerForm, name: e.target.value })} className="w-full border rounded-md px-3 py-2 bg-transparent text-sm" placeholder="Ej: Caja Principal 01" /></div>
                            <div>
                                <label className="text-sm font-medium mb-1 block">Sucursal de Operación</label>
                                <select required value={registerForm.branchId} onChange={e => setRegisterForm({ ...registerForm, branchId: e.target.value })} className="w-full border rounded-md px-3 py-2 bg-transparent text-sm">
                                    <option value="">Selecciona Sucursal</option>
                                    {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                                </select>
                            </div>
                            <div className="pt-2"><button type="submit" disabled={loading} className="w-full py-2 bg-primary text-primary-foreground rounded-md font-bold text-sm hover:bg-primary/90 flex items-center justify-center gap-2">{loading && <Loader2 className="h-4 w-4 animate-spin" />} Guardar Terminal</button></div>
                        </form>
                    </div>
                </div>
            )}

            {/* REPORTE CORTE Z / X MODAL */}
            {viewReportSessionId && (
                <CashReportModal
                    sessionId={viewReportSessionId}
                    onClose={() => setViewReportSessionId(null)}
                />
            )}

        </div>
    );
}
