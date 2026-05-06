import { useState, useEffect } from 'react';
import { Users, Shield, Store, Search, Plus, Loader2, X, Box, Tag, Edit } from 'lucide-react';
import { api } from '../lib/axios';

interface Branch { id: string; name: string; code: string; address: string | null; phone: string | null; isActive: boolean; }
interface PhysicalProduct { id: string; sku: string; description: string; unitMeasure: string; costUnit: number; minStock: number; }
interface SaleProduct { id: string; code: string; name: string; price: number; taxRate: number; isExempt?: boolean; isNonSubject?: boolean; requiresPreparation?: boolean; compositions?: any[]; }
interface Role { id: string; name: string; description: string | null; permissions?: any[]; }
interface Permission { id: string; resource: string; action: string; description?: string; }
interface User { id: string; email: string; fullName: string; isActive: boolean; roleId: string; branchId: string | null; role: { name: string }; branch?: { name: string } | null; }

export default function AdminPanel() {
    const [activeTab, setActiveTab] = useState<'users' | 'roles' | 'branches' | 'physical_products' | 'sale_products'>('branches');
    const [loading, setLoading] = useState(false);

    // Data State
    const [branches, setBranches] = useState<Branch[]>([]);
    const [physicals, setPhysicals] = useState<PhysicalProduct[]>([]);
    const [sales, setSales] = useState<SaleProduct[]>([]);
    const [roles, setRoles] = useState<Role[]>([]);
    const [permissions, setPermissions] = useState<Permission[]>([]);
    const [users, setUsers] = useState<User[]>([]);

    // Modals state
    const [showBranchModal, setShowBranchModal] = useState(false);
    const [showPhysicalModal, setShowPhysicalModal] = useState(false);
    const [showSaleModal, setShowSaleModal] = useState(false);
    const [showRoleModal, setShowRoleModal] = useState(false);
    const [showUserModal, setShowUserModal] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    // Forms State
    const [newBranch, setNewBranch] = useState({ name: '', code: '', address: '', phone: '', isActive: true });
    const [newPhysical, setNewPhysical] = useState({ sku: '', description: '', unitMeasure: 'Unidades', costUnit: 0, minStock: 0 });
    const [newSale, setNewSale] = useState({ code: '', name: '', price: 0, taxRate: 0, isExempt: false, isNonSubject: false, requiresPreparation: false });
    const [newRole, setNewRole] = useState({ name: '', description: '', permissionIds: [] as string[] });
    const [newUser, setNewUser] = useState({ email: '', fullName: '', password: '', roleId: '', branchId: '', isActive: true });
    // Compositions state for Sale Product
    const [compositions, setCompositions] = useState<{ productPhysicalId: string, quantityRequired: number }[]>([]);

    useEffect(() => {
        if (activeTab === 'users') { fetchUsers(); fetchRoles(); fetchBranches(); }
        if (activeTab === 'roles') { fetchRoles(); fetchPermissions(); }
        if (activeTab === 'branches') fetchBranches();
        if (activeTab === 'physical_products') fetchPhysicals();
        if (activeTab === 'sale_products') {
            fetchSales();
            fetchPhysicals(); // We need them for the composition selector
        }
    }, [activeTab]);

    const fetchBranches = async () => {
        setLoading(true);
        try { const { data } = await api.get('/branches'); setBranches(data.data); } catch (e) { console.error(e); } finally { setLoading(false); }
    };

    const fetchPhysicals = async () => {
        setLoading(true);
        try { const { data } = await api.get('/products/physical'); setPhysicals(data.data); } catch (e) { console.error(e); } finally { setLoading(false); }
    };

    const fetchSales = async () => {
        setLoading(true);
        try { const { data } = await api.get('/products/sale'); setSales(data.data); } catch (e) { console.error(e); } finally { setLoading(false); }
    };

    const fetchRoles = async () => {
        setLoading(true);
        try { const { data } = await api.get('/roles'); setRoles(data.data); } catch (e) { console.error(e); } finally { setLoading(false); }
    };

    const fetchPermissions = async () => {
        setLoading(true);
        try { const { data } = await api.get('/roles/permissions'); setPermissions(data.data); } catch (e) { console.error(e); } finally { setLoading(false); }
    };

    const fetchUsers = async () => {
        setLoading(true);
        try { const { data } = await api.get('/users'); setUsers(data.data); } catch (e) { console.error(e); } finally { setLoading(false); }
    };

    const handleCreateBranch = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            if (editingId) {
                await api.put(`/branches/${editingId}`, newBranch);
            } else {
                await api.post('/branches', newBranch);
            }
            setShowBranchModal(false); fetchBranches(); setNewBranch({ name: '', code: '', address: '', phone: '', isActive: true }); setEditingId(null);
        } catch (err: any) { alert(err.response?.data?.error || 'Error al guardar'); } finally { setLoading(false); }
    };

    const handleCreatePhysical = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            if (editingId) {
                await api.put(`/products/physical/${editingId}`, { ...newPhysical, costUnit: Number(newPhysical.costUnit), minStock: Number(newPhysical.minStock) });
            } else {
                await api.post('/products/physical', { ...newPhysical, costUnit: Number(newPhysical.costUnit), minStock: Number(newPhysical.minStock) });
            }
            setShowPhysicalModal(false); fetchPhysicals(); setNewPhysical({ sku: '', description: '', unitMeasure: 'Unidades', costUnit: 0, minStock: 0 }); setEditingId(null);
        } catch (err: any) { alert(err.response?.data?.error || 'Error al guardar Insumo'); } finally { setLoading(false); }
    };

    const handleCreateSale = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const payload = {
                ...newSale,
                price: Number(newSale.price),
                taxRate: Number(newSale.taxRate),
                compositions
            };
            if (editingId) {
                await api.put(`/products/sale/${editingId}`, payload);
            } else {
                await api.post('/products/sale', payload);
            }
            setShowSaleModal(false); fetchSales(); setNewSale({ code: '', name: '', price: 0, taxRate: 0, isExempt: false, isNonSubject: false, requiresPreparation: false }); setCompositions([]); setEditingId(null);
        } catch (err: any) { alert(err.response?.data?.error || 'Error al guardar Producto de Venta'); } finally { setLoading(false); }
    };

    const handleCreateRole = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            if (editingId) {
                await api.put(`/roles/${editingId}`, newRole);
            } else {
                await api.post('/roles', newRole);
            }
            setShowRoleModal(false); fetchRoles(); setNewRole({ name: '', description: '', permissionIds: [] }); setEditingId(null);
        } catch (err: any) { alert(err.response?.data?.error || 'Error al guardar Rol'); } finally { setLoading(false); }
    };

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const payload: any = { ...newUser };
            if (payload.branchId === '') delete payload.branchId; // optional branch
            if (editingId) {
                await api.put(`/users/${editingId}`, payload);
            } else {
                await api.post('/users', payload);
            }
            setShowUserModal(false); fetchUsers(); setNewUser({ email: '', fullName: '', password: '', roleId: '', branchId: '', isActive: true }); setEditingId(null);
        } catch (err: any) { alert(err.response?.data?.error || 'Error al guardar Usuario'); } finally { setLoading(false); }
    };

    return (
        <div className="p-6 h-full flex flex-col bg-muted/10 relative">

            <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-6 gap-4">
                <div className="w-full md:w-auto">
                    <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Administración</h1>
                    <p className="text-muted-foreground mt-1 text-sm md:text-base">Configuración general y gestión de catálogos del sistema.</p>
                </div>

                <div className="w-full md:w-auto flex justify-end">
                    <button
                        onClick={() => {
                            setEditingId(null);
                            if (activeTab === 'users') { setNewUser({ email: '', fullName: '', password: '', roleId: '', branchId: '', isActive: true }); setShowUserModal(true); }
                            else if (activeTab === 'roles') { setNewRole({ name: '', description: '', permissionIds: [] }); setShowRoleModal(true); }
                            else if (activeTab === 'branches') { setNewBranch({ name: '', code: '', address: '', phone: '', isActive: true }); setShowBranchModal(true); }
                            else if (activeTab === 'physical_products') { setNewPhysical({ sku: '', description: '', unitMeasure: 'Unidades', costUnit: 0, minStock: 0 }); setShowPhysicalModal(true); }
                            else if (activeTab === 'sale_products') { setNewSale({ code: '', name: '', price: 0, taxRate: 0, isExempt: false, isNonSubject: false, requiresPreparation: false }); setCompositions([]); setShowSaleModal(true); }
                            else alert("Módulo en desarrollo");
                        }}
                        className="flex items-center justify-center w-full md:w-auto gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md font-medium hover:bg-primary/90 transition-colors shadow-sm"
                    >
                        <Plus className="h-4 w-4" />
                        {activeTab === 'users' ? 'Nuevo Usuario' :
                            activeTab === 'roles' ? 'Nuevo Rol' :
                                activeTab === 'branches' ? 'Nueva Sucursal' :
                                    activeTab === 'physical_products' ? 'Nuevo Insumo (Físico)' : 'Nuevo Producto Venta'}
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex flex-wrap gap-x-6 gap-y-2 border-b mb-6 border-border shrink-0">
                <button onClick={() => { setActiveTab('users'); setEditingId(null); }} className={`whitespace-nowrap flex items-center gap-2 px-2 pb-2 border-b-2 font-medium transition-colors ${activeTab === 'users' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}><Users className="h-4 w-4" /> Usuarios</button>
                <button onClick={() => { setActiveTab('roles'); setEditingId(null); }} className={`whitespace-nowrap flex items-center gap-2 px-2 pb-2 border-b-2 font-medium transition-colors ${activeTab === 'roles' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}><Shield className="h-4 w-4" /> Roles</button>
                <button onClick={() => { setActiveTab('branches'); setEditingId(null); }} className={`whitespace-nowrap flex items-center gap-2 px-2 pb-2 border-b-2 font-medium transition-colors ${activeTab === 'branches' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}><Store className="h-4 w-4" /> Sucursales</button>
                <button onClick={() => { setActiveTab('physical_products'); setEditingId(null); }} className={`whitespace-nowrap flex items-center gap-2 px-2 pb-2 border-b-2 font-medium transition-colors ${activeTab === 'physical_products' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}><Box className="h-4 w-4" /> Físicos e Insumos</button>
                <button onClick={() => { setActiveTab('sale_products'); setEditingId(null); }} className={`whitespace-nowrap flex items-center gap-2 px-2 pb-2 border-b-2 font-medium transition-colors ${activeTab === 'sale_products' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}><Tag className="h-4 w-4" /> Productos a Venta</button>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-auto bg-card rounded-xl border shadow-sm flex flex-col">

                {/* Toolbar */}
                <div className="p-4 border-b flex justify-between items-center bg-muted/30">
                    <div className="relative w-80">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <input type="text" placeholder="Buscar registros..." className="w-full pl-9 pr-4 py-1.5 text-sm border rounded-md bg-transparent focus:outline-none focus:ring-1 focus:ring-primary" />
                    </div>
                    <div className="flex gap-2 items-center text-sm font-medium text-muted-foreground">
                        {loading && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
                    </div>
                </div>

                {/* --- VIEWS --- */}
                <div className="flex-1 overflow-auto">
                    {/* VIEW: Users */}
                    {activeTab === 'users' && (
                        <>
                            <div className="hidden md:block">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-muted text-muted-foreground uppercase text-xs sticky top-0">
                                        <tr><th className="px-6 py-3 font-semibold">Usuario</th><th className="px-6 py-3 font-semibold">Email</th><th className="px-6 py-3 font-semibold">Rol</th><th className="px-6 py-3 font-semibold">Sucursal</th><th className="px-6 py-3 font-semibold text-center">Estado</th><th className="px-6 py-3"></th></tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {users.map(u => (
                                            <tr key={u.id} className="hover:bg-muted/50 transition-colors group">
                                                <td className="px-6 py-4 font-bold">{u.fullName}</td>
                                                <td className="px-6 py-4 text-muted-foreground">{u.email}</td>
                                                <td className="px-6 py-4"><span className="bg-primary/10 text-primary px-2 py-0.5 rounded text-xs font-semibold">{u.role?.name || '---'}</span></td>
                                                <td className="px-6 py-4 text-muted-foreground">{u.branch?.name || 'Sede Global'}</td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${u.isActive ? 'bg-emerald-500/10 text-emerald-600' : 'bg-destructive/10 text-destructive'}`}>
                                                        {u.isActive ? 'Activo' : 'Inactivo'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <button onClick={() => { setEditingId(u.id); setNewUser({ email: u.email, fullName: u.fullName, password: '', roleId: u.roleId, branchId: u.branchId || '', isActive: u.isActive }); setShowUserModal(true); }} className="p-1.5 text-muted-foreground hover:bg-muted rounded opacity-100 transition-opacity hover:text-primary"><Edit className="h-4 w-4" /></button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            {/* Mobile Card View */}
                            <div className="md:hidden flex flex-col gap-3 p-4 bg-muted/5">
                                {users.map(u => (
                                    <div key={u.id} className="bg-background border rounded-xl p-4 shadow-sm relative overflow-hidden flex flex-col gap-2">
                                        <div className={`absolute left-0 top-0 bottom-0 w-1 ${u.isActive ? 'bg-emerald-500' : 'bg-destructive'}`} />
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <h3 className="font-bold text-base leading-tight">{u.fullName}</h3>
                                                <p className="text-xs text-muted-foreground mt-0.5">{u.email}</p>
                                            </div>
                                            <button onClick={() => { setEditingId(u.id); setNewUser({ email: u.email, fullName: u.fullName, password: '', roleId: u.roleId, branchId: u.branchId || '', isActive: u.isActive }); setShowUserModal(true); }} className="p-2 text-muted-foreground hover:bg-muted rounded-md bg-muted/30"><Edit className="h-4 w-4" /></button>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2 mt-2 pt-3 border-t">
                                            <div>
                                                <span className="block text-[10px] uppercase font-bold text-muted-foreground mb-1 tracking-wider">Rol</span>
                                                <span className="bg-primary/10 text-primary px-2 py-0.5 rounded text-xs font-semibold inline-block">{u.role?.name || '---'}</span>
                                            </div>
                                            <div className="text-right flex flex-col items-end">
                                                <span className="block text-[10px] uppercase font-bold text-muted-foreground mb-1 tracking-wider">Estado</span>
                                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider inline-block ${u.isActive ? 'bg-emerald-500/10 text-emerald-600' : 'bg-destructive/10 text-destructive'}`}>
                                                    {u.isActive ? 'Activo' : 'Inactivo'}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="bg-muted/30 px-3 py-2 rounded-md mt-1">
                                            <span className="block text-[10px] uppercase font-bold text-muted-foreground mb-0.5 tracking-wider">Sucursal</span>
                                            <span className="text-sm font-medium">{u.branch?.name || 'Sede Global'}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}

                    {/* VIEW: Roles */}
                    {activeTab === 'roles' && (
                        <table className="w-full text-sm text-left">
                            <thead className="bg-muted text-muted-foreground uppercase text-xs sticky top-0">
                                <tr><th className="px-6 py-3 font-semibold">Rol</th><th className="px-6 py-3 font-semibold">Descripción</th><th className="px-6 py-3"></th></tr>
                            </thead>
                            <tbody className="divide-y">
                                {roles.map(r => (
                                    <tr key={r.id} className="hover:bg-muted/50 transition-colors group">
                                        <td className="px-6 py-4 font-bold text-primary">{r.name}</td>
                                        <td className="px-6 py-4 text-muted-foreground">{r.description || '---'}</td>
                                        <td className="px-6 py-4 text-right">
                                            <button onClick={() => { setEditingId(r.id); setNewRole({ name: r.name, description: r.description || '', permissionIds: r.permissions?.map(p => p.id) || [] }); setShowRoleModal(true); }} className="p-1.5 text-muted-foreground hover:bg-muted rounded opacity-100 transition-opacity hover:text-primary"><Edit className="h-4 w-4" /></button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}

                    {/* VIEW: Sucursales */}
                    {activeTab === 'branches' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
                            {branches.map(b => (
                                <div key={b.id} className="border rounded-xl p-5 hover:shadow-md transition-shadow bg-background relative overflow-hidden group">
                                    <div className={`absolute top-0 left-0 w-1 h-full ${b.isActive ? 'bg-primary' : 'bg-destructive'}`} />
                                    <button onClick={() => { setEditingId(b.id); setNewBranch({ name: b.name, code: b.code, address: b.address || '', phone: b.phone || '', isActive: b.isActive }); setShowBranchModal(true); }} className="absolute top-2 right-2 p-1.5 bg-muted rounded-md text-muted-foreground opacity-100 transition-opacity hover:text-primary"><Edit className="h-4 w-4" /></button>
                                    <div className="flex justify-between items-start mb-4 pr-6">
                                        <div>
                                            <h3 className="font-bold text-lg leading-none">{b.name}</h3>
                                            <p className="text-xs font-mono text-muted-foreground mt-1">CODE: {b.code}</p>
                                        </div>
                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${b.isActive ? 'bg-emerald-500/10 text-emerald-600' : 'bg-destructive/10 text-destructive'}`}>
                                            {b.isActive ? 'Activa' : 'Inactiva'}
                                        </span>
                                    </div>
                                    <div className="space-y-2 text-sm text-muted-foreground"><p><strong>Dirección:</strong> {b.address || 'N/A'}</p><p><strong>Teléfono:</strong> {b.phone || 'N/A'}</p></div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* VIEW: Insumos Fisicos */}
                    {activeTab === 'physical_products' && (
                        <>
                            <div className="hidden md:block">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-muted text-muted-foreground uppercase text-xs sticky top-0">
                                        <tr><th className="px-6 py-3 font-semibold">SKU / Código</th><th className="px-6 py-3 font-semibold">Descripción Físia</th><th className="px-6 py-3 font-semibold">Unidad de Medida</th><th className="px-6 py-3 font-semibold text-right">Costo Unitario Ref.</th><th className="px-6 py-3 font-semibold text-center">Stock Mín.</th><th className="px-6 py-3"></th></tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {physicals.map(p => (
                                            <tr key={p.id} className="hover:bg-muted/50 transition-colors group">
                                                <td className="px-6 py-4 font-mono font-medium text-primary">{p.sku}</td>
                                                <td className="px-6 py-4 font-semibold">{p.description}</td>
                                                <td className="px-6 py-4 text-muted-foreground">{p.unitMeasure}</td>
                                                <td className="px-6 py-4 text-right font-mono">${Number(p.costUnit).toFixed(2)}</td>
                                                <td className="px-6 py-4 text-center font-bold">{Number(p.minStock || 0)}</td>
                                                <td className="px-6 py-4 text-right">
                                                    <button onClick={() => { setEditingId(p.id); setNewPhysical({ sku: p.sku, description: p.description, unitMeasure: p.unitMeasure, costUnit: p.costUnit, minStock: p.minStock || 0 }); setShowPhysicalModal(true); }} className="p-1.5 text-muted-foreground hover:bg-muted rounded opacity-100 transition-opacity hover:text-primary"><Edit className="h-4 w-4" /></button>
                                                </td>
                                            </tr>
                                        ))}
                                        {physicals.length === 0 && !loading && <tr><td colSpan={6} className="text-center py-8 text-muted-foreground">Inicia creando Insumos Físicos (Materia Prima / Latas / Unidades cerradas)</td></tr>}
                                    </tbody>
                                </table>
                            </div>
                            {/* Mobile Card View */}
                            <div className="md:hidden flex flex-col gap-3 p-4 bg-muted/5">
                                {physicals.map(p => (
                                    <div key={p.id} className="bg-background border rounded-xl p-4 shadow-sm relative flex flex-col gap-3">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <h3 className="font-bold text-base leading-tight pr-4">{p.description}</h3>
                                                <p className="text-xs text-primary font-mono mt-1 font-bold">{p.sku}</p>
                                            </div>
                                            <button onClick={() => { setEditingId(p.id); setNewPhysical({ sku: p.sku, description: p.description, unitMeasure: p.unitMeasure, costUnit: p.costUnit, minStock: p.minStock || 0 }); setShowPhysicalModal(true); }} className="p-2 text-muted-foreground hover:bg-muted rounded-md bg-muted/30 shrink-0"><Edit className="h-4 w-4" /></button>
                                        </div>
                                        <div className="grid grid-cols-3 gap-2 mt-2 pt-3 border-t">
                                            <div>
                                                <span className="block text-[10px] uppercase font-bold text-muted-foreground mb-1 tracking-wider">U. Medida</span>
                                                <span className="text-sm font-medium">{p.unitMeasure}</span>
                                            </div>
                                            <div className="text-center">
                                                <span className="block text-[10px] uppercase font-bold text-muted-foreground mb-1 tracking-wider">Costo</span>
                                                <span className="text-sm font-mono font-bold">${Number(p.costUnit).toFixed(2)}</span>
                                            </div>
                                            <div className="text-right">
                                                <span className="block text-[10px] uppercase font-bold text-muted-foreground mb-1 tracking-wider">Min.</span>
                                                <span className="text-sm font-mono font-bold text-amber-600">{Number(p.minStock || 0)}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {physicals.length === 0 && !loading && <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-xl border-border">No hay insumos físicos.</div>}
                            </div>
                        </>
                    )}

                    {/* VIEW: Productos de Venta */}
                    {activeTab === 'sale_products' && (
                        <>
                            <div className="hidden md:block">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-muted text-muted-foreground uppercase text-xs sticky top-0">
                                        <tr><th className="px-6 py-3 font-semibold">Código POS</th><th className="px-6 py-3 font-semibold">Nombre en Pantalla</th><th className="px-6 py-3 font-semibold text-right">Precio Facturación</th><th className="px-6 py-3 font-semibold text-center">Impuestos</th><th className="px-6 py-3 font-semibold text-center">Prep.</th><th className="px-6 py-3"></th></tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {sales.map(s => (
                                            <tr key={s.id} className="hover:bg-muted/50 transition-colors group">
                                                <td className="px-6 py-4 font-mono font-medium text-emerald-600">{s.code}</td>
                                                <td className="px-6 py-4 font-bold">{s.name}</td>
                                                <td className="px-6 py-4 text-right font-bold text-lg">${Number(s.price).toFixed(2)}</td>
                                                <td className="px-6 py-4 text-center text-xs">{(Number(s.taxRate) * 100).toFixed(0)}%</td>
                                                <td className="px-6 py-4 text-center text-xs">{s.requiresPreparation ? <span className="bg-amber-500/20 text-amber-600 px-2 py-0.5 rounded font-bold">SÍ</span> : <span className="text-muted-foreground">NO</span>}</td>
                                                <td className="px-6 py-4 text-right">
                                                    <button onClick={() => { setEditingId(s.id); setNewSale({ code: s.code, name: s.name, price: s.price, taxRate: s.taxRate, isExempt: s.isExempt || false, isNonSubject: s.isNonSubject || false, requiresPreparation: s.requiresPreparation || false }); setCompositions(s.compositions ? s.compositions.map((c: any) => ({ productPhysicalId: c.productPhysicalId, quantityRequired: c.quantityRequired })) : []); setShowSaleModal(true); }} className="p-1.5 text-muted-foreground hover:bg-muted rounded opacity-100 transition-opacity hover:text-primary"><Edit className="h-4 w-4" /></button>
                                                </td>
                                            </tr>
                                        ))}
                                        {sales.length === 0 && !loading && <tr><td colSpan={6} className="text-center py-8 text-muted-foreground">Registra un Producto/Combo de Venta, enlazando qué Insumos rebajará</td></tr>}
                                    </tbody>
                                </table>
                            </div>
                            {/* Mobile Card View */}
                            <div className="md:hidden flex flex-col gap-3 p-4 bg-muted/5">
                                {sales.map(s => (
                                    <div key={s.id} className="bg-background border rounded-xl p-4 shadow-sm relative flex flex-col gap-3">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <h3 className="font-bold text-base leading-tight pr-4">{s.name}</h3>
                                                <p className="text-xs text-emerald-600 font-mono mt-1 font-bold">{s.code}</p>
                                            </div>
                                            <button onClick={() => { setEditingId(s.id); setNewSale({ code: s.code, name: s.name, price: s.price, taxRate: s.taxRate, isExempt: s.isExempt || false, isNonSubject: s.isNonSubject || false, requiresPreparation: s.requiresPreparation || false }); setCompositions(s.compositions ? s.compositions.map((c: any) => ({ productPhysicalId: c.productPhysicalId, quantityRequired: c.quantityRequired })) : []); setShowSaleModal(true); }} className="p-2 text-muted-foreground hover:bg-muted rounded-md bg-muted/30 shrink-0"><Edit className="h-4 w-4" /></button>
                                        </div>
                                        <div className="flex items-center justify-between mt-1 pt-3 border-t">
                                            <div>
                                                <span className="block text-[10px] uppercase font-bold text-muted-foreground mb-1 tracking-wider">Precio Final</span>
                                                <span className="text-xl font-black">${Number(s.price).toFixed(2)}</span>
                                            </div>
                                            <div className="flex flex-col items-end gap-2">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Impuestos:</span>
                                                    <span className="text-xs font-mono font-bold bg-muted px-2 py-0.5 rounded">{(Number(s.taxRate) * 100).toFixed(0)}%</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Cocina:</span>
                                                    {s.requiresPreparation ? <span className="bg-amber-500/20 text-amber-700 px-2 py-0.5 rounded text-[10px] font-bold">SÍ</span> : <span className="bg-muted text-muted-foreground px-2 py-0.5 rounded text-[10px] font-bold">NO</span>}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {sales.length === 0 && !loading && <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-xl border-border">No hay productos de venta registrados.</div>}
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* MODAL: Users */}
            {showUserModal && (
                <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="w-full max-w-md bg-card border rounded-xl shadow-lg flex flex-col animate-in zoom-in-95 duration-200">
                        <div className="p-4 border-b flex justify-between items-center"><h2 className="text-lg font-bold">{editingId ? 'Editar Usuario' : 'Nuevo Usuario'}</h2><button onClick={() => setShowUserModal(false)}><X className="h-5 w-5" /></button></div>
                        <form onSubmit={handleCreateUser} className="p-4 space-y-4">
                            <div><label className="text-sm font-medium mb-1 block">Nombre Completo</label><input required value={newUser.fullName} onChange={e => setNewUser({ ...newUser, fullName: e.target.value })} className="w-full border rounded-md px-3 py-2 bg-transparent text-sm" /></div>
                            <div><label className="text-sm font-medium mb-1 block">Correo Electrónico</label><input type="email" required value={newUser.email} onChange={e => setNewUser({ ...newUser, email: e.target.value })} className="w-full border rounded-md px-3 py-2 bg-transparent text-sm" /></div>
                            <div>
                                <label className="text-sm font-medium mb-1 block">Contraseña {editingId && <span className="text-xs text-muted-foreground">(Dejar en blanco para no cambiar)</span>}</label>
                                <input type="password" required={!editingId} value={newUser.password} onChange={e => setNewUser({ ...newUser, password: e.target.value })} className="w-full border rounded-md px-3 py-2 bg-transparent text-sm" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm font-medium mb-1 block">Rol de Sistema</label>
                                    <select required value={newUser.roleId} onChange={e => setNewUser({ ...newUser, roleId: e.target.value })} className="w-full border rounded-md px-3 py-2 bg-transparent text-sm">
                                        <option value="">Selecciona Rol</option>
                                        {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-sm font-medium mb-1 block">Sucursal de Asignación</label>
                                    <select value={newUser.branchId} onChange={e => setNewUser({ ...newUser, branchId: e.target.value })} className="w-full border rounded-md px-3 py-2 bg-transparent text-sm">
                                        <option value="">Todas (Matriz Global)</option>
                                        {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                                    </select>
                                </div>
                            </div>
                            {editingId && (
                                <div className="flex items-center gap-2 mt-4">
                                    <input type="checkbox" id="userActive" checked={newUser.isActive} onChange={e => setNewUser({ ...newUser, isActive: e.target.checked })} className="rounded text-primary focus:ring-primary" />
                                    <label htmlFor="userActive" className="text-sm font-medium">Usuario Activo en el Sistema</label>
                                </div>
                            )}
                            <div className="pt-4 flex justify-end gap-2 border-t"><button type="submit" disabled={loading} className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium flex items-center gap-2">{loading && <Loader2 className="h-4 w-4 animate-spin" />} Guardar</button></div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL: Roles */}
            {showRoleModal && (
                <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="w-full max-w-md bg-card border rounded-xl shadow-lg flex flex-col animate-in zoom-in-95 duration-200">
                        <div className="p-4 border-b flex justify-between items-center"><h2 className="text-lg font-bold">{editingId ? 'Editar Rol' : 'Nuevo Rol'}</h2><button onClick={() => setShowRoleModal(false)}><X className="h-5 w-5" /></button></div>
                        <form onSubmit={handleCreateRole} className="p-4 space-y-4">
                            <div><label className="text-sm font-medium mb-1 block">Nombre del Rol</label><input required value={newRole.name} onChange={e => setNewRole({ ...newRole, name: e.target.value })} className="w-full border rounded-md px-3 py-2 bg-transparent text-sm" placeholder="Ej: Cajero, Administrador" /></div>
                            <div><label className="text-sm font-medium mb-1 block">Descripción Relevante</label><input required value={newRole.description} onChange={e => setNewRole({ ...newRole, description: e.target.value })} className="w-full border rounded-md px-3 py-2 bg-transparent text-sm" placeholder="Permisos para utilizar el POS..." /></div>

                            <div className="mt-4">
                                <label className="text-sm font-medium mb-2 block">Asignación de Permisos del Sistema</label>
                                <div className="border rounded-md h-96 overflow-y-auto p-4 space-y-6 bg-muted/10">
                                    {Array.from(new Set(permissions.map(p => p.resource))).map(resource => (
                                        <div key={resource} className="bg-card border rounded-lg p-3 shadow-sm">
                                            <h4 className="text-sm font-bold uppercase tracking-wider mb-3 text-primary border-b pb-2">{resource}</h4>
                                            <div className="flex flex-col gap-3">
                                                {permissions.filter(p => p.resource === resource).map(p => (
                                                    <label key={p.id} className="flex items-start gap-3 cursor-pointer hover:bg-muted/50 p-2 rounded-md transition-colors">
                                                        <input
                                                            type="checkbox"
                                                            className="rounded text-primary focus:ring-primary h-4 w-4 mt-0.5"
                                                            checked={newRole.permissionIds.includes(p.id)}
                                                            onChange={e => {
                                                                if (e.target.checked) setNewRole({ ...newRole, permissionIds: [...newRole.permissionIds, p.id] });
                                                                else setNewRole({ ...newRole, permissionIds: newRole.permissionIds.filter(id => id !== p.id) });
                                                            }}
                                                        />
                                                        <div className="flex flex-col">
                                                            <span className="capitalize font-semibold text-sm leading-none">{p.action}</span>
                                                            {p.description && <span className="text-xs text-muted-foreground mt-1 leading-snug">{p.description}</span>}
                                                        </div>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                    {permissions.length === 0 && <span className="text-xs text-muted-foreground">Cargando permisos...</span>}
                                </div>
                            </div>

                            <div className="pt-4 flex justify-end gap-2 border-t"><button type="submit" disabled={loading} className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium flex items-center gap-2">{loading && <Loader2 className="h-4 w-4 animate-spin" />} Guardar</button></div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL: Branch */}
            {showBranchModal && (
                <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="w-full max-w-md bg-card border rounded-xl shadow-lg flex flex-col animate-in zoom-in-95 duration-200">
                        <div className="p-4 border-b flex justify-between items-center"><h2 className="text-lg font-bold">{editingId ? 'Editar Sucursal' : 'Agregar Sucursal'}</h2><button onClick={() => setShowBranchModal(false)}><X className="h-5 w-5" /></button></div>
                        <form onSubmit={handleCreateBranch} className="p-4 space-y-4">
                            <div><label className="text-sm font-medium mb-1 block">Nombre</label><input required value={newBranch.name} onChange={e => setNewBranch({ ...newBranch, name: e.target.value })} className="w-full border rounded-md px-3 py-2 bg-transparent text-sm" /></div>
                            <div><label className="text-sm font-medium mb-1 block">Código Identificador</label><input required value={newBranch.code} onChange={e => setNewBranch({ ...newBranch, code: e.target.value })} className="w-full border rounded-md px-3 py-2 bg-transparent text-sm uppercase" /></div>
                            <div className="pt-4 flex justify-end gap-2 border-t"><button type="submit" disabled={loading} className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium flex items-center gap-2">Guardar</button></div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL: Physical Product */}
            {showPhysicalModal && (
                <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="w-full max-w-md bg-card border rounded-xl shadow-lg flex flex-col animate-in zoom-in-95 duration-200">
                        <div className="p-4 border-b flex justify-between items-center"><h2 className="text-lg font-bold">{editingId ? 'Editar Insumo Físico (Bodega)' : 'Ingresar Insumo Físico (Bodega)'}</h2><button onClick={() => setShowPhysicalModal(false)}><X className="h-5 w-5" /></button></div>
                        <form onSubmit={handleCreatePhysical} className="p-4 space-y-4">
                            <div><label className="text-sm font-medium mb-1 block">SKU / Código de Barra Interno</label><input required value={newPhysical.sku} onChange={e => setNewPhysical({ ...newPhysical, sku: e.target.value })} className="w-full border rounded-md px-3 py-2 bg-transparent text-sm font-mono uppercase" placeholder="Ej: LATA-COLA-1" /></div>
                            <div><label className="text-sm font-medium mb-1 block">Descripción Físisica</label><input required value={newPhysical.description} onChange={e => setNewPhysical({ ...newPhysical, description: e.target.value })} className="w-full border rounded-md px-3 py-2 bg-transparent text-sm" placeholder="Ej: Lata de Soda Cola 355ml" /></div>
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="text-sm font-medium mb-1 block">U. Medida</label><input required value={newPhysical.unitMeasure} onChange={e => setNewPhysical({ ...newPhysical, unitMeasure: e.target.value })} className="w-full border rounded-md px-3 py-2 bg-transparent text-sm" placeholder="Latas, Libras, Cajas..." /></div>
                                <div><label className="text-sm font-medium mb-1 block">Costo Unit. Ref ($)</label><input type="number" step="0.01" required value={newPhysical.costUnit} onChange={e => setNewPhysical({ ...newPhysical, costUnit: Number(e.target.value) })} className="w-full border rounded-md px-3 py-2 bg-transparent text-sm font-mono text-right" /></div>
                            </div>
                            <div>
                                <label className="text-sm font-medium mb-1 block">Stock Mínimo Ideal</label>
                                <input type="number" step="0.01" required value={newPhysical.minStock} onChange={e => setNewPhysical({ ...newPhysical, minStock: Number(e.target.value) })} className="w-full border rounded-md px-3 py-2 bg-transparent text-sm" placeholder="Ej: 50 para alarmar si baja de 50..." />
                            </div>
                            <div className="pt-4 flex justify-end gap-2 border-t"><button type="submit" disabled={loading} className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium flex items-center gap-2">{loading && <Loader2 className="h-4 w-4 animate-spin" />} Guardar Insumo</button></div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL: Sale Product */}
            {showSaleModal && (
                <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="w-full max-w-2xl bg-card border rounded-xl shadow-lg flex flex-col animate-in zoom-in-95 duration-200 max-h-full">
                        <div className="p-4 border-b flex justify-between items-center bg-primary/5"><h2 className="text-lg font-bold text-primary">{editingId ? 'Editar Detalle de Producto para Facturación' : 'Detalle de Producto para Facturación'}</h2><button onClick={() => setShowSaleModal(false)}><X className="h-5 w-5" /></button></div>
                        <form onSubmit={handleCreateSale} className="flex-1 overflow-auto p-4 space-y-6">

                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="text-sm font-medium mb-1 block">Código en Menú (POS)</label><input required value={newSale.code} onChange={e => setNewSale({ ...newSale, code: e.target.value })} className="w-full border rounded-md px-3 py-2 bg-transparent text-sm font-mono uppercase" placeholder="Ej: SODA-3PACK" /></div>
                                <div><label className="text-sm font-medium mb-1 block">Nombre Comercial</label><input required value={newSale.name} onChange={e => setNewSale({ ...newSale, name: e.target.value })} className="w-full border rounded-md px-3 py-2 bg-transparent text-sm font-bold" placeholder="Ej: Oferta 3Pack Sodas" /></div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 bg-muted/20 p-4 rounded-lg border">
                                <div><label className="text-sm font-medium mb-1 block">Precio Venta ($)</label><input type="number" step="0.01" required value={newSale.price} onChange={e => setNewSale({ ...newSale, price: Number(e.target.value) })} className="w-full border-b border-primary/50 text-2xl font-black bg-transparent py-1 focus:outline-none focus:border-primary text-primary" /></div>
                                <div><label className="text-sm font-medium mb-1 block">Tasa de Impuestos</label>
                                    <select required value={newSale.isExempt ? 'EXEMPT' : newSale.isNonSubject ? 'NONSUBJECT' : newSale.taxRate.toString()} onChange={e => {
                                        const val = e.target.value;
                                        if (val === '0.13') setNewSale({ ...newSale, taxRate: 0.13, isExempt: false, isNonSubject: false });
                                        if (val === '0') setNewSale({ ...newSale, taxRate: 0, isExempt: false, isNonSubject: false });
                                        if (val === 'EXEMPT') setNewSale({ ...newSale, taxRate: 0, isExempt: true, isNonSubject: false });
                                        if (val === 'NONSUBJECT') setNewSale({ ...newSale, taxRate: 0, isExempt: false, isNonSubject: true });
                                    }} className="w-full border rounded-md px-3 py-2 bg-background text-sm">
                                        <option value="0.13">13% IVA (Gravado)</option>
                                        <option value="0">0% Gravado (Tasa Cero)</option>
                                        <option value="EXEMPT">Exento</option>
                                        <option value="NONSUBJECT">No Sujeto</option>
                                    </select>
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-2 mt-2 bg-muted/10 p-3 rounded-lg border">
                                <input type="checkbox" id="reqPrep" checked={newSale.requiresPreparation} onChange={e => setNewSale({ ...newSale, requiresPreparation: e.target.checked })} className="rounded text-primary focus:ring-primary h-4 w-4" />
                                <label htmlFor="reqPrep" className="text-sm font-bold text-foreground">Este producto requiere ser preparado en Cocina/Barra</label>
                            </div>

                            {/* Receta / Composicion */}
                            <div className="border rounded-lg overflow-hidden">
                                <div className="bg-muted px-4 py-2 font-semibold text-sm flex justify-between items-center">
                                    <span>Receta / Descargo de Bodega</span>
                                    <button type="button" onClick={() => setCompositions([...compositions, { productPhysicalId: '', quantityRequired: 1 }])} className="text-xs bg-background border px-2 py-1 rounded shadow-sm hover:text-primary transition-colors flex items-center gap-1"><Plus className="h-3 w-3" /> Agregar Fila</button>
                                </div>
                                <div className="p-4 space-y-3 bg-card">
                                    {compositions.length === 0 && <p className="text-xs text-muted-foreground text-center py-2">Al venderse, no afectará ninguna existencia Físicamente (Servicio Intangible).</p>}

                                    {compositions.map((comp, idx) => (
                                        <div key={idx} className="flex gap-2 items-center">
                                            <select required value={comp.productPhysicalId} onChange={e => { const newC = [...compositions]; newC[idx].productPhysicalId = e.target.value; setCompositions(newC); }} className="flex-1 border rounded-md px-2 py-1.5 text-sm bg-transparent">
                                                <option value="">-- Seleccionar Insumo --</option>
                                                {physicals.map(p => <option key={p.id} value={p.id}>{p.sku} - {p.description}</option>)}
                                            </select>
                                            <span className="text-muted-foreground text-sm">x</span>
                                            <input type="number" step="0.0001" required value={comp.quantityRequired} onChange={e => { const newC = [...compositions]; newC[idx].quantityRequired = Number(e.target.value); setCompositions(newC); }} className="w-24 border rounded-md px-2 py-1.5 text-sm bg-transparent text-right font-mono" placeholder="Cant." />
                                            <button type="button" onClick={() => setCompositions(compositions.filter((_, i) => i !== idx))} className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded"><X className="h-4 w-4" /></button>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="pt-4 flex justify-end gap-2 border-t">
                                <button type="button" onClick={() => setShowSaleModal(false)} className="px-4 py-2 border rounded-md text-sm font-medium hover:bg-muted">Cerrar</button>
                                <button type="submit" disabled={loading} className="px-6 py-2 bg-primary text-primary-foreground rounded-lg font-bold flex items-center gap-2 shadow-lg hover:shadow-primary/20 hover:-translate-y-0.5 transition-all">
                                    {loading && <Loader2 className="h-4 w-4 animate-spin" />} {editingId ? 'Guardar Cambios' : 'Crear Master'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

        </div>
    );
}
