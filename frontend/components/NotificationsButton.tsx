'use client';
import { useState, useEffect, useRef } from 'react';
import { Bell, X, Package, FileText, Users, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import Link from 'next/link';
import api from '@/lib/api';
import { cn } from '@/lib/utils';

interface Alert {
  type: string;
  message: string;
  link: string;
  severity: 'critical' | 'warning' | 'info';
}

const ICON_MAP: Record<string, any> = {
  inventory_critical: Package,
  inventory_low: Package,
  forms_overdue: FileText,
  leads_unanswered: Users,
  no_show: AlertTriangle,
};

const SEV: Record<string, { dot: string; row: string; iconBg: string; iconColor: string }> = {
  critical: { dot: 'bg-red-500',   row: 'hover:bg-red-50',   iconBg: 'bg-red-50',   iconColor: 'text-red-500' },
  warning:  { dot: 'bg-amber-500', row: 'hover:bg-amber-50', iconBg: 'bg-amber-50', iconColor: 'text-amber-500' },
  info:     { dot: 'bg-blue-500',  row: 'hover:bg-blue-50',  iconBg: 'bg-blue-50',  iconColor: 'text-blue-500' },
};

export default function NotificationsButton() {
  const [open, setOpen] = useState(false);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Fetch on mount (for badge count) and when opened
  useEffect(() => { loadAlerts(); }, []);

  async function loadAlerts() {
    setLoading(true);
    try {
      const res = await api.get('/dashboard/overview');
      setAlerts(res.data.data?.alerts || []);
    } catch {
      // Don't break the nav if this fails
    } finally {
      setLoading(false);
    }
  }

  const visible = alerts.filter(a => !dismissed.has(a.type));
  const criticalCount = visible.filter(a => a.severity === 'critical').length;

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell with badge */}
      <button
        onClick={() => { setOpen(o => !o); if (!open) loadAlerts(); }}
        className="relative w-9 h-9 rounded-xl flex items-center justify-center text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
      >
        <Bell className="w-5 h-5" />
        {visible.length > 0 && (
          <span className={cn(
            'absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full',
            'text-white text-[10px] font-bold flex items-center justify-center',
            criticalCount > 0 ? 'bg-red-500 animate-pulse' : 'bg-amber-500'
          )}>
            {visible.length > 9 ? '9+' : visible.length}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-11 w-80 bg-white rounded-2xl shadow-xl border border-slate-100 z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-slate-900">Notifications</span>
              {visible.length > 0 && (
                <span className="bg-slate-100 text-slate-600 text-xs font-semibold px-2 py-0.5 rounded-full">
                  {visible.length}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {visible.length > 0 && (
                <button onClick={() => setDismissed(new Set(alerts.map(a => a.type)))}
                  className="text-xs text-blue-600 hover:text-blue-700 font-medium">
                  Clear all
                </button>
              )}
              <button onClick={loadAlerts} className="text-xs text-slate-400 hover:text-slate-600">
                Refresh
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="max-h-72 overflow-y-auto">
            {loading ? (
              <div className="p-4 space-y-3">
                {[1, 2].map(i => (
                  <div key={i} className="flex gap-3 animate-pulse">
                    <div className="w-8 h-8 bg-slate-100 rounded-xl flex-shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 bg-slate-100 rounded w-3/4" />
                      <div className="h-3 bg-slate-100 rounded w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : visible.length === 0 ? (
              <div className="py-10 text-center">
                <div className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-3">
                  <CheckCircle className="w-6 h-6 text-emerald-500" />
                </div>
                <p className="text-sm font-medium text-slate-700">All clear!</p>
                <p className="text-xs text-slate-400 mt-1">No active alerts right now</p>
              </div>
            ) : (
              <div className="py-1">
                {visible.map(alert => {
                  const s = SEV[alert.severity] || SEV.info;
                  const Icon = ICON_MAP[alert.type] || Info;
                  return (
                    <div key={alert.type}
                      className={cn('flex items-start gap-3 px-4 py-3 group transition-colors', s.row)}>
                      <div className={cn('w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0', s.iconBg)}>
                        <Icon className={cn('w-4 h-4', s.iconColor)} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-slate-700 leading-snug">{alert.message}</p>
                        <Link
                          href={alert.link}
                          onClick={() => setOpen(false)}
                          className="text-xs text-blue-600 hover:underline font-medium mt-0.5 inline-block"
                        >
                          View →
                        </Link>
                      </div>
                      <button
                        onClick={() => setDismissed(p => new Set([...p, alert.type]))}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded-lg hover:bg-white/80 text-slate-400 transition-all"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-2.5 border-t border-slate-100 bg-slate-50/80">
            <p className="text-xs text-slate-400 text-center">
              Pulls live data from your workspace
            </p>
          </div>
        </div>
      )}
    </div>
  );
}