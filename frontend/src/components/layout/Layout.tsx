import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { Store, LayoutDashboard, ShoppingCart, LogOut, Package, Settings, Layers, DollarSign, FileText, Menu, X } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { Authorized } from '../auth/Authorized';
import { useState } from 'react';

export default function Layout() {
    const { user, logout } = useAuthStore();
    const navigate = useNavigate();
    const location = useLocation();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const toggleMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen);
    const closeMenu = () => setIsMobileMenuOpen(false);

    return (
        <div className="flex h-screen w-full bg-background overflow-hidden relative">
            {/* Mobile Header */}
            <header className="lg:hidden h-14 border-b-2 border-foreground flex items-center justify-between px-4 bg-card shrink-0 absolute top-0 w-full z-40 brutal-shadow">
                <div className="flex items-center gap-2 font-black uppercase tracking-wider">
                    <Store className="h-6 w-6 text-primary" />
                    <span>POS</span>
                </div>
                <button onClick={toggleMenu} className="p-2 brutal-border bg-accent text-accent-foreground brutal-button active:translate-x-[2px] active:translate-y-[2px]">
                    {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                </button>
            </header>

            {/* Sidebar (Desktop) / Mobile Menu */}
            <aside className={`
                fixed lg:static inset-y-0 left-0 z-50 w-64 brutal-border border-l-0 border-t-0 border-b-0 bg-card flex flex-col transform transition-transform duration-200 ease-in-out lg:translate-x-0
                ${isMobileMenuOpen ? 'translate-x-0 brutal-shadow-none' : '-translate-x-full lg:border-r-2'}
                lg:z-0 top-14 lg:top-0 h-[calc(100vh-3.5rem)] lg:h-screen
            `}>
                <div className="p-6 border-b-2 border-foreground hidden lg:block">
                    <div className="flex items-center gap-2 font-black uppercase tracking-wider text-xl">
                        <Store className="h-8 w-8 text-primary" />
                        <span>Sistema POS</span>
                    </div>
                </div>

                <nav className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 font-semibold mt-4 md:mt-0">
                    <Authorized resource="reports" action="read">
                        <Link onClick={closeMenu} to="/dashboard" className={`flex items-center gap-3 px-4 py-3 transition-all brutal-border brutal-shadow ${location.pathname === '/dashboard' ? 'bg-primary text-primary-foreground' : 'bg-card text-foreground hover:bg-accent hover:text-accent-foreground'}`}>
                            <LayoutDashboard className="h-5 w-5" />
                            DASHBOARD
                        </Link>
                    </Authorized>
                    <Authorized resource="sales" action="read">
                        <Link onClick={closeMenu} to="/tables" className={`flex items-center gap-3 px-4 py-3 transition-all brutal-border brutal-shadow ${location.pathname.startsWith('/tables') ? 'bg-primary text-primary-foreground' : 'bg-card text-foreground hover:bg-accent hover:text-accent-foreground'}`}>
                            <Layers className="h-5 w-5" />
                            MESAS
                        </Link>
                    </Authorized>
                    <Authorized resource="sales" action="create">
                        <Link onClick={closeMenu} to="/pos" className={`flex items-center gap-3 px-4 py-3 transition-all brutal-border brutal-shadow ${location.pathname.startsWith('/pos') ? 'bg-primary text-primary-foreground' : 'bg-card text-foreground hover:bg-accent hover:text-accent-foreground'}`}>
                            <ShoppingCart className="h-5 w-5" />
                            PUNTO DE VENTA
                        </Link>
                    </Authorized>
                    <Authorized resource="cash" action="read">
                        <Link onClick={closeMenu} to="/cash" className={`flex items-center gap-3 px-4 py-3 transition-all brutal-border brutal-shadow ${location.pathname.startsWith('/cash') ? 'bg-primary text-primary-foreground' : 'bg-card text-foreground hover:bg-accent hover:text-accent-foreground'}`}>
                            <DollarSign className="h-5 w-5" />
                            CAJAS
                        </Link>
                    </Authorized>
                    <Authorized resource="inventory" action="read">
                        <Link onClick={closeMenu} to="/inventory" className={`flex items-center gap-3 px-4 py-3 transition-all brutal-border brutal-shadow ${location.pathname.startsWith('/inventory') ? 'bg-primary text-primary-foreground' : 'bg-card text-foreground hover:bg-accent hover:text-accent-foreground'}`}>
                            <Package className="h-5 w-5" />
                            INVENTARIO
                        </Link>
                    </Authorized>
                    <Authorized resource="reports" action="read">
                        <Link onClick={closeMenu} to="/reports" className={`flex items-center gap-3 px-4 py-3 transition-all brutal-border brutal-shadow ${location.pathname.startsWith('/reports') ? 'bg-primary text-primary-foreground' : 'bg-card text-foreground hover:bg-accent hover:text-accent-foreground'}`}>
                            <FileText className="h-5 w-5" />
                            REPORTES
                        </Link>
                    </Authorized>
                    <Authorized resource="users" action="read">
                        <Link onClick={closeMenu} to="/admin" className={`flex items-center gap-3 px-4 py-3 transition-all brutal-border brutal-shadow ${location.pathname.startsWith('/admin') ? 'bg-primary text-primary-foreground' : 'bg-card text-foreground hover:bg-accent hover:text-accent-foreground'}`}>
                            <Settings className="h-5 w-5" />
                            ADMIN
                        </Link>
                    </Authorized>
                </nav>

                <div className="p-4 border-t-2 border-foreground bg-muted/50">
                    <div className="mb-4 text-xs font-mono p-2 bg-background brutal-border opacity-80">
                        USER: {user?.name}<br />
                        ROLE: {user?.role}
                    </div>
                    <button
                        onClick={handleLogout}
                        className="flex w-full items-center justify-center gap-3 brutal-button px-4 py-3 bg-card text-foreground hover:bg-destructive hover:text-destructive-foreground"
                    >
                        <LogOut className="h-5 w-5" />
                        SALIR
                    </button>
                </div>
            </aside>

            {/* Overlay for mobile */}
            {isMobileMenuOpen && (
                <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-30 lg:hidden" onClick={closeMenu}></div>
            )}

            {/* Main Content Area */}
            <main className="flex-1 flex flex-col h-screen overflow-hidden pt-14 lg:pt-0 w-full">
                <header className="hidden lg:flex h-14 border-b-2 border-foreground items-center justify-between px-6 bg-card shrink-0 z-10 w-full brutal-shadow">
                    <p className="font-black tracking-widest uppercase">Sucursal Principal</p>
                    <div className="flex items-center gap-3">
                        <span className="font-bold border-2 border-foreground px-3 py-1 bg-accent text-accent-foreground">{user?.name}</span>
                        <span className="px-2 py-1 text-xs font-mono brutal-border bg-background">({user?.role})</span>
                    </div>
                </header>
                <div className="flex-1 overflow-auto bg-background lg:bg-muted/10">
                    <Outlet />
                </div>
            </main>
        </div>
    );
}
