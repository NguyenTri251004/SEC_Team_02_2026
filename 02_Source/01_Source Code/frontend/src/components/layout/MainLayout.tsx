import { Outlet } from 'react-router-dom';
import { AppSidebar } from './AppSidebar';

export function MainLayout() {
  return (
    <div className="h-screen flex w-full bg-slate-50 overflow-hidden">
      <AppSidebar />
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}