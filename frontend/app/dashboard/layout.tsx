'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useStore, isAuthenticated } from '@/store/useStore';
import api from '@/lib/api';
import {
  LayoutDashboard, Inbox, Calendar, Users, FileText,
  Package, Settings, LogOut, Zap, Menu, X, Bell, BarChart3
} from 'lucide-react';
import { getInitials } from '@/lib/utils';

const nav = [
  { name: 'Overview', href: '/dashboard/overview', icon: LayoutDashboard },
  { name: 'Inbox', href: '/dashboard/inbox', icon: Inbox },
  { name: 'Bookings', href: '/dashboard/bookings', icon: Calendar },
  { name: 'Contacts', href: '/dashboard/contacts', icon: Users },
  { name: 'Forms', href: '/dashboard/forms', icon: FileText },
  { name: 'Settings', href: '/dashboard/settings', icon: Settings },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, workspace, setUser, setWorkspace, logout, sidebarOpen, setSidebarOpen } = useStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated()) { router.push('/login'); return; }
    if (!user) {
      api.get('/api/auth/me')
        .then(r => { setUser(r.data.data.user); setWorkspace(r.data.data.user.workspace); })
        .catch(() => router.push('/login'))
        .finally(() => setLoading(false));
    } else { setLoading(false); }
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-violet-600 rounded-xl flex items-center justify-center animate-pulse">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <div className="text-sm text-slate-400">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-20 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={cn(
        'fixed lg:relative inset-y-0 left-0 z-30 lg:z-auto w-64 bg-white border-r border-slate-100 flex flex-col transition-transform duration-300',
        sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      )}>
        {/* Logo */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-violet-600 rounded-lg flex items-center justify-center shadow-sm">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-slate-900 font-display text-lg">CareOps</span>
          </div>
          <button className="lg:hidden text-slate-400" onClick={() => setSidebarOpen(false)}>
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Workspace badge */}
        <div className="px-4 py-3 mx-3 mt-4 bg-blue-50 rounded-xl border border-blue-100">
          <div className="text-xs text-blue-500 font-medium uppercase tracking-wider mb-0.5">Workspace</div>
          <div className="text-sm font-semibold text-slate-800 truncate">{workspace?.businessName || '—'}</div>
          {workspace?.isActive && (
            <div className="flex items-center gap-1.5 mt-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs text-emerald-600 font-medium">Active</span>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 overflow-y-auto">
          <div className="space-y-0.5">
            {nav.map((item) => {
              const active = pathname.startsWith(item.href);
              return (
                <Link key={item.name} href={item.href}
                  className={cn('sidebar-link', active ? 'sidebar-link-active' : 'sidebar-link-inactive')}>
                  <item.icon className="w-4.5 h-4.5 flex-shrink-0" />
                  <span>{item.name}</span>
                  {item.name === 'Inbox' && (
                    <span className="ml-auto bg-red-100 text-red-600 text-xs font-bold px-1.5 py-0.5 rounded-full">3</span>
                  )}
                </Link>
              );
            })}
          </div>
        </nav>

        {/* User */}
        <div className="border-t border-slate-100 p-3">
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 transition-colors group">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
              {user ? getInitials(user.email) : 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-slate-700 truncate">{user?.email}</div>
              <div className="text-xs text-slate-400 capitalize">{user?.role?.toLowerCase()}</div>
            </div>
            <button onClick={logout} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="h-16 bg-white border-b border-slate-100 flex items-center justify-between px-6 flex-shrink-0">
          <button className="lg:hidden text-slate-500" onClick={() => setSidebarOpen(true)}>
            <Menu className="w-5 h-5" />
          </button>
          <div className="hidden lg:block text-sm text-slate-400">
            {nav.find(n => pathname.startsWith(n.href))?.name || 'Dashboard'}
          </div>
          <div className="flex items-center gap-3 ml-auto">
            <button className="relative w-9 h-9 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors">
              <Bell className="w-4 h-4" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
