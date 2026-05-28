import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Package, ShoppingCart, CreditCard,
  Users, Archive, BarChart3, LogOut, Menu, X,
  Bell, DollarSign, TrendingDown
} from 'lucide-react';
import useAuthStore from '../store/authStore';
import toast from 'react-hot-toast';

const navItems = [
  { label: 'Inicio',     icon: LayoutDashboard, path: '/dashboard', roles: ['admin','cajero','supervisor','bodeguero'] },
  { label: 'Ventas',     icon: ShoppingCart,    path: '/pos',        roles: ['admin','cajero','supervisor'], badge: 'HOT' },
  { label: 'Inventario', icon: Package,         path: '/productos',  roles: ['admin','supervisor','bodeguero'] },
  { label: 'Fiados',     icon: CreditCard,      path: '/creditos',   roles: ['admin','cajero','supervisor'] },
  { label: 'Clientes',   icon: Users,           path: '/clientes',   roles: ['admin','cajero','supervisor'] },
  { label: 'Caja',       icon: DollarSign,      path: '/caja',       roles: ['admin','cajero','supervisor'] },
  { label: 'Gastos',     icon: TrendingDown,    path: '/gastos',     roles: ['admin','supervisor','cajero'] },
  { label: 'Historial',  icon: Archive,         path: '/ventas',     roles: ['admin','supervisor'] },
  { label: 'Reportes',   icon: BarChart3,       path: '/reportes',   roles: ['admin','supervisor'] },
];

const navMovil = ['/pos', '/creditos', '/clientes', '/dashboard', '/caja'];

export default function DashboardLayout() {
  const [menuAbierto, setMenuAbierto] = useState(false);
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const navFiltrada = navItems.filter(i => i.roles.includes(user?.role));
  const navMovilItems = navFiltrada.filter(i => navMovil.includes(i.path));

  const handleLogout = async () => {
    await logout();
    toast.success('Sesión cerrada');
    navigate('/login');
  };

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">

      {/* SIDEBAR desktop */}
      <aside className="hidden lg:flex w-60 bg-slate-900 text-white flex-col flex-shrink-0">
        <div className="p-4 border-b border-slate-700">
          <h1 className="text-lg font-bold text-white">🏪 TiendaApp</h1>
          <p className="text-xs text-slate-400">Sistema de Gestión</p>
        </div>
        <div className="p-4 border-b border-slate-700 flex items-center gap-3">
          <div className="w-9 h-9 bg-blue-500 rounded-full flex items-center justify-center font-bold text-sm">
            {user?.name?.[0]?.toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-medium text-white">{user?.name}</p>
            <p className="text-xs text-slate-400 capitalize">{user?.role}</p>
          </div>
        </div>
        <nav className="flex-1 py-3 overflow-y-auto">
          {navFiltrada.map(item => (
            <NavLink key={item.path} to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2.5 mx-2 rounded-lg text-sm font-medium transition-all
                 ${isActive ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`
              }>
              <item.icon size={17} className="flex-shrink-0" />
              <span className="flex-1">{item.label}</span>
              {item.badge && <span className="text-xs bg-orange-500 text-white px-1.5 py-0.5 rounded">{item.badge}</span>}
            </NavLink>
          ))}
        </nav>
        <div className="p-3 border-t border-slate-700">
          <button onClick={handleLogout}
            className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-slate-400 hover:bg-red-600 hover:text-white transition-colors text-sm">
            <LogOut size={16} /><span>Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      {/* DRAWER móvil */}
      {menuAbierto && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMenuAbierto(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-72 bg-slate-900 text-white flex flex-col shadow-2xl">
            <div className="p-4 border-b border-slate-700 flex items-center justify-between">
              <div>
                <h1 className="text-lg font-bold text-white">🏪 TiendaApp</h1>
                <p className="text-xs text-slate-400">Sistema de Gestión</p>
              </div>
              <button onClick={() => setMenuAbierto(false)} className="p-2 hover:bg-slate-700 rounded-lg">
                <X size={20} />
              </button>
            </div>
            <div className="p-4 border-b border-slate-700 flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center font-bold">
                {user?.name?.[0]?.toUpperCase()}
              </div>
              <div>
                <p className="font-medium text-white">{user?.name}</p>
                <p className="text-sm text-slate-400 capitalize">{user?.role}</p>
              </div>
            </div>
            <nav className="flex-1 py-3 overflow-y-auto">
              {navFiltrada.map(item => (
                <NavLink key={item.path} to={item.path}
                  onClick={() => setMenuAbierto(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-4 py-3 mx-2 rounded-lg text-sm font-medium transition-all
                     ${isActive ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`
                  }>
                  <item.icon size={18} />
                  <span className="flex-1">{item.label}</span>
                  {item.badge && <span className="text-xs bg-orange-500 text-white px-1.5 py-0.5 rounded">{item.badge}</span>}
                </NavLink>
              ))}
            </nav>
            <div className="p-4 border-t border-slate-700">
              <button onClick={handleLogout}
                className="flex items-center gap-3 w-full px-4 py-3 rounded-xl bg-red-600/20 text-red-400 hover:bg-red-600 hover:text-white transition-colors text-sm font-medium">
                <LogOut size={18} /><span>Cerrar Sesión</span>
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* CONTENIDO PRINCIPAL */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={() => setMenuAbierto(true)}
              className="lg:hidden p-2 text-gray-600 hover:bg-gray-100 rounded-lg">
              <Menu size={20} />
            </button>
            <p className="hidden sm:block text-sm text-gray-500">
              {new Date().toLocaleDateString('es-CO', { weekday:'long', day:'numeric', month:'long' })}
            </p>
            <span className="lg:hidden font-bold text-gray-800 text-sm">🏪 TiendaApp</span>
          </div>
          <div className="flex items-center gap-2">
            <button className="relative p-2 text-gray-500 hover:bg-gray-100 rounded-lg">
              <Bell size={18} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-bold text-xs">
                {user?.name?.[0]?.toUpperCase()}
              </div>
              <span className="hidden sm:block text-sm font-medium text-gray-700">{user?.name}</span>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-3 sm:p-4 lg:p-6 pb-24 lg:pb-6 bg-gray-50">
          <Outlet />
        </main>

        {/* BARRA INFERIOR MÓVIL */}
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex items-center justify-around px-2 py-1 z-40 shadow-lg">
          {navMovilItems.map(item => (
            <NavLink key={item.path} to={item.path}
              className={({ isActive }) =>
                `flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-all flex-1
                 ${isActive ? 'text-blue-600' : 'text-gray-400'}`
              }>
              {({ isActive }) => (
                <>
                  <div className={`p-1.5 rounded-xl ${isActive ? 'bg-blue-100' : ''}`}>
                    <item.icon size={20} />
                  </div>
                  <span className="text-xs font-medium truncate w-full text-center">{item.label}</span>
                </>
              )}
            </NavLink>
          ))}
          <button onClick={() => setMenuAbierto(true)}
            className="flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl text-gray-400 flex-1">
            <div className="p-1.5 rounded-xl"><Menu size={20} /></div>
            <span className="text-xs font-medium">Más</span>
          </button>
        </nav>
      </div>
    </div>
  );
}