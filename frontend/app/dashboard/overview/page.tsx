'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { AreaChart, Area, ResponsiveContainer, Tooltip, XAxis } from 'recharts';
import api from '@/lib/api';
import { DashboardStats } from '@/types';
import { cn, formatTime, getStatusColor } from '@/lib/utils';
import {
  Calendar, Users, FileText, TrendingUp, AlertCircle, AlertTriangle,
  Info, ArrowUpRight, Clock, MapPin, ChevronRight, Activity
} from 'lucide-react';

// Skeleton component
const Sk = ({ className }: { className?: string }) => (
  <div className={cn('skeleton rounded-xl', className)} />
);

const MOCK_TREND = [
  { day: 'Mon', v: 4 }, { day: 'Tue', v: 7 }, { day: 'Wed', v: 5 },
  { day: 'Thu', v: 9 }, { day: 'Fri', v: 6 }, { day: 'Sat', v: 11 }, { day: 'Sun', v: 8 },
];

export default function OverviewPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/api/dashboard/overview')
      .then(r => setStats(r.data.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const statCards = stats ? [
    {
      label: "Today's Bookings", value: stats.todayBookings.total,
      sub: `${stats.todayBookings.completed} completed`,
      icon: Calendar, color: 'blue', trend: `+${stats.todayBookings.upcoming} upcoming`,
    },
    {
      label: 'New Leads Today', value: stats.leads.newToday,
      sub: `${stats.leads.unanswered} unanswered`,
      icon: Users, color: 'violet', trend: `${stats.leads.totalActive} active total`,
    },
    {
      label: 'Pending Forms', value: stats.forms.pending,
      sub: `${stats.forms.overdue} overdue`,
      icon: FileText, color: stats.forms.overdue > 0 ? 'red' : 'amber', trend: `${stats.forms.completedToday} done today`,
    },
    {
      label: 'Inventory Alerts', value: stats.inventory?.lowStock ?? 0,
      sub: `${stats.inventory?.criticalStock ?? 0} critical`,
      icon: TrendingUp, color: (stats.inventory?.criticalStock ?? 0) > 0 ? 'red' : 'emerald', trend: 'View stock',
    },
  ] : [];

  const colorMap: Record<string, { bg: string; icon: string; ring: string }> = {
    blue:    { bg: 'bg-blue-50',    icon: 'text-blue-600',    ring: 'bg-blue-600' },
    violet:  { bg: 'bg-violet-50',  icon: 'text-violet-600',  ring: 'bg-violet-600' },
    emerald: { bg: 'bg-emerald-50', icon: 'text-emerald-600', ring: 'bg-emerald-600' },
    amber:   { bg: 'bg-amber-50',   icon: 'text-amber-600',   ring: 'bg-amber-600' },
    red:     { bg: 'bg-red-50',     icon: 'text-red-600',     ring: 'bg-red-600' },
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="page-header">
        <h1 className="page-title">Good {getGreeting()}, here's your day</h1>
        <p className="page-subtitle">{format(new Date(), 'EEEE, MMMM d, yyyy')}</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {loading
          ? Array(4).fill(0).map((_, i) => <Sk key={i} className="h-36" />)
          : statCards.map((card) => {
              const Icon = card.icon;
              const c = colorMap[card.color] || colorMap.blue;
              return (
                <div key={card.label} className="stat-card group cursor-pointer">
                  <div className="flex items-start justify-between mb-4">
                    <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', c.bg)}>
                      <Icon className={cn('w-5 h-5', c.icon)} />
                    </div>
                    <ArrowUpRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 transition-colors" />
                  </div>
                  <div className="text-3xl font-bold font-display text-slate-900 mb-1">{card.value}</div>
                  <div className="text-sm font-medium text-slate-700">{card.label}</div>
                  <div className="text-xs text-slate-400 mt-1">{card.sub}</div>
                  <div className={cn('mt-3 inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full', c.bg, c.icon)}>
                    {card.trend}
                  </div>
                </div>
              );
            })}
      </div>

      {/* Middle row */}
      <div className="grid xl:grid-cols-3 gap-4">
        {/* Booking trend chart */}
        <div className="xl:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-semibold text-slate-900 font-display">Booking Trend</h3>
              <p className="text-xs text-slate-400 mt-0.5">Last 7 days</p>
            </div>
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-blue-500" />
              <span className="text-sm font-semibold text-blue-600">+23%</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={MOCK_TREND}>
              <defs>
                <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.15} />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <Tooltip
                contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, fontSize: 12 }}
                cursor={{ stroke: '#3b82f6', strokeWidth: 1, strokeDasharray: '4 4' }}
              />
              <Area type="monotone" dataKey="v" stroke="#3b82f6" strokeWidth={2} fill="url(#grad)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Quick stats */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex flex-col gap-4">
          <h3 className="font-semibold text-slate-900 font-display">At a Glance</h3>
          {loading ? (
            <div className="space-y-3">{Array(4).fill(0).map((_, i) => <Sk key={i} className="h-12" />)}</div>
          ) : (
            <div className="space-y-3 flex-1">
              {[
                { label: 'Completed today', value: stats?.todayBookings.completed || 0, color: 'text-emerald-600' },
                { label: 'No-shows today', value: stats?.todayBookings.noShow || 0, color: 'text-red-500' },
                { label: 'Total active contacts', value: stats?.leads.totalActive || 0, color: 'text-blue-600' },
                { label: 'Forms completed today', value: stats?.forms.completedToday || 0, color: 'text-violet-600' },
              ].map(item => (
                <div key={item.label} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                  <span className="text-sm text-slate-600">{item.label}</span>
                  <span className={cn('text-lg font-bold font-display', item.color)}>{item.value}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Alerts + Upcoming */}
      <div className="grid xl:grid-cols-5 gap-4">
        {/* Alerts */}
        <div className="xl:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <h3 className="font-semibold text-slate-900 font-display mb-4">Action Required</h3>
          {loading ? (
            <div className="space-y-2">{Array(3).fill(0).map((_, i) => <Sk key={i} className="h-14" />)}</div>
          ) : stats?.alerts.length ? (
            <div className="space-y-2">
              {stats.alerts.map((alert, i) => {
                const Icon = alert.severity === 'critical' ? AlertCircle
                  : alert.severity === 'warning' ? AlertTriangle : Info;
                const styles: Record<string, string> = {
                  critical: 'bg-red-50 border-red-100 text-red-700',
                  warning: 'bg-amber-50 border-amber-100 text-amber-700',
                  info: 'bg-blue-50 border-blue-100 text-blue-700',
                };
                return (
                  <Link key={i} href={alert.link}
                    className={cn('flex items-start gap-3 p-3 rounded-xl border transition-all hover:shadow-sm', styles[alert.severity])}>
                    <Icon className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium leading-tight">{alert.message}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 flex-shrink-0 mt-0.5 opacity-60" />
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-32 text-slate-400">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center mb-2">
                <TrendingUp className="w-5 h-5 text-emerald-500" />
              </div>
              <p className="text-sm">All clear! No alerts.</p>
            </div>
          )}
        </div>

        {/* Upcoming bookings */}
        <div className="xl:col-span-3 bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-900 font-display">Upcoming Bookings</h3>
            <Link href="/dashboard/bookings" className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1">
              View all <ChevronRight className="w-3 h-3" />
            </Link>
          </div>

          {loading ? (
            <div className="space-y-3">{Array(4).fill(0).map((_, i) => <Sk key={i} className="h-16" />)}</div>
          ) : stats?.upcomingBookings.length ? (
            <div className="space-y-2">
              {stats.upcomingBookings.slice(0, 5).map((b) => (
                <div key={b.id}
                  className="flex items-center gap-4 p-3 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer group">
                  {/* Date badge */}
                  <div className="w-12 h-12 bg-blue-600 rounded-xl flex flex-col items-center justify-center flex-shrink-0 shadow-sm shadow-blue-100">
                    <div className="text-white text-lg font-bold font-display leading-none">
                      {format(new Date(b.scheduledAt), 'd')}
                    </div>
                    <div className="text-blue-200 text-xs uppercase">
                      {format(new Date(b.scheduledAt), 'MMM')}
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-sm text-slate-800 truncate">{b.contact.name}</p>
                      <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', getStatusColor(b.status))}>
                        {b.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5 truncate">{b.serviceType.name}</p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{formatTime(b.scheduledAt)}</span>
                      {b.location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{b.location}</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-32 text-slate-400">
              <Calendar className="w-10 h-10 text-slate-200 mb-2" />
              <p className="text-sm">No upcoming bookings</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 18) return 'afternoon';
  return 'evening';
}
