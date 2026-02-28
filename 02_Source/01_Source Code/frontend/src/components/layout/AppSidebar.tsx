import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {LayoutDashboard, Package, Warehouse, Menu, X, LogIn, LogOut} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useAuth } from '../../auth/AuthProvider';

const navItems = [
  { title: 'Dashboard', url: '/', icon: LayoutDashboard },
  { title: 'Materials', url: '/materials', icon: Package },
];

export function AppSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const { isAuthenticated, login, logout, userRoles } = useAuth();

  return (
    <aside
      className={cn(
        'bg-[#1e2329] text-gray-300 border-r border-gray-800 transition-all duration-300 flex flex-col',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Header */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-gray-800">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
              <Warehouse className="w-5 h-5 text-white" />
            </div>
            <span className="font-semibold text-sm text-white">Inventory MS</span>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-2 rounded-lg hover:bg-gray-800 transition-colors"
        >
          {collapsed ? <Menu className="w-5 h-5" /> : <X className="w-5 h-5" />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = location.pathname === item.url;
          return (
            <NavLink
              key={item.title}
              to={item.url}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200',
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'hover:bg-gray-800 text-gray-300'
              )}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              {!collapsed && <span className="text-sm font-medium">{item.title}</span>}
            </NavLink>
          );
        })}
      </nav>

      {/* Footer / Auth Actions */}
      <div className="p-4 border-t border-gray-800 flex flex-col gap-3">
        {isAuthenticated ? (
          <>
            {!collapsed && userRoles && userRoles.length > 0 && (
              <div className="text-xs text-gray-400 truncate px-1">
                Roles: {userRoles.join(', ')}
              </div>
            )}
            <button 
              onClick={logout} 
              title="Logout"
              className="cursor-pointer flex items-center justify-center gap-2 w-full px-3 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md transition-colors shadow-sm"
            >
              <LogOut className="w-4 h-4 flex-shrink-0" />
              {!collapsed && <span>Logout</span>}
            </button>
          </>
        ) : (
          <button 
            onClick={login} 
            title="Login"
            className="cursor-pointer flex items-center justify-center gap-2 w-full px-3 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md transition-colors shadow-sm"
          >
            <LogIn className="w-4 h-4 flex-shrink-0" />
            {!collapsed && <span>Login</span>}
          </button>
        )}
      </div>
    </aside>
  );
}