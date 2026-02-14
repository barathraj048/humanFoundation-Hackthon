'use client';
import { useEffect, useState } from 'react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import api from '@/lib/api';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Calendar, Users, Target, AlertCircle, RefreshCw } from 'lucide-react';

interface AnalyticsData {
  conversionRate: number;
  noShowRate: number;
  bookingTrend: { date: string; bookings: number; leads: number }[];
  bookingsByHour: { hour: string; count: number }[];
  statusBreakdown: Record<string, number>;
  totalBookings: number;
  totalContacts: number;
}

const STATUS_COLORS: Record<string, string> = {
  COMPLETED: '#10b981',
  CONFIRMED: '#3b82f6',
  PENDING: '#f59e0b',
  NO_SHOW: '#ef4444',
  CANCELLED: '#94a3b8',
};

export default function AnalyticsPage() {
  const [range, setRange] = useState<'7' | '30' | '90'>('7');
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  async function fetchAnalytics() {
    setLoading(true);
    setError('');
    try {
      const res = await api.get(`/dashboard/analytics?range=${range}`);
      setData(res.data.data);
      setLastUpdated(new Date());
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchAnalytics(); }, [range]);

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  const statusData = data
    ? Object.entries(data.statusBreakdown)
        .filter(([, v]) => v > 0)
        .map(([name, value]) => ({ name, value, color: STATUS_COLORS[name] || '#94a3b8' }))
    : [];

  const totalStatus = statusData.reduce((a, b) => a + b.value, 0);

  const tooltipStyle = {
    contentStyle: { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, fontSize: 12 },
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold font-display text-slate-900">Analytics</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Live data from your workspace
            {lastUpdated && ` · Updated ${lastUpdated.toLocaleTimeString()}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchAnalytics}
            disabled={loading}
            className="p-2 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
          </button>
          <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
            {(['7', '30', '90'] as const).map(r => (
              <button key={r} onClick={() => setRange(r)}
                className={cn('px-4 py-1.5 text-sm font-medium rounded-lg transition-all',
                  range === r ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700')}>
                {r === '7' ? '7d' : r === '30' ? '30d' : '90d'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">{error}</div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          { label: 'Total Bookings', value: data?.totalBookings, icon: Calendar, color: 'blue', sub: `Last ${range} days` },
          { label: 'New Contacts', value: data?.totalContacts, icon: Users, color: 'violet', sub: `Last ${range} days` },
          { label: 'Conversion Rate', value: data ? `${data.conversionRate}%` : undefined, icon: Target, color: 'emerald', sub: 'Contacts → Bookings', good: (data?.conversionRate ?? 0) >= 50 },
          { label: 'No-Show Rate', value: data ? `${data.noShowRate}%` : undefined, icon: AlertCircle, color: 'red', sub: 'Of all bookings', good: (data?.noShowRate ?? 100) < 15 },
        ].map(card => {
          const Icon = card.icon;
          const colorMap: Record<string, string> = {
            blue: 'bg-blue-50 text-blue-600', violet: 'bg-violet-50 text-violet-600',
            emerald: 'bg-emerald-50 text-emerald-600', red: 'bg-red-50 text-red-500',
          };
          return (
            <div key={card.label} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', colorMap[card.color].split(' ')[0])}>
                  <Icon className={cn('w-5 h-5', colorMap[card.color].split(' ')[1])} />
                </div>
                {'good' in card && data && (
                  <div className={cn('flex items-center gap-1 text-xs font-semibold', card.good ? 'text-emerald-500' : 'text-red-500')}>
                    {card.good ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                  </div>
                )}
              </div>
              {loading
                ? <div className="h-8 w-16 bg-slate-100 rounded-lg animate-pulse mb-1" />
                : <div className="text-3xl font-bold font-display text-slate-900 mb-0.5">{card.value ?? '—'}</div>
              }
              <div className="text-sm font-medium text-slate-700">{card.label}</div>
              <div className="text-xs text-slate-400">{card.sub}</div>
            </div>
          );
        })}
      </div>

      {/* Trend Chart */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="font-semibold font-display text-slate-900">Bookings vs New Contacts</h3>
            <p className="text-xs text-slate-400 mt-0.5">Live data from your workspace — refreshes on each load</p>
          </div>
          <div className="flex items-center gap-4 text-xs text-slate-400">
            <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-blue-500 rounded inline-block" /> Bookings</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-violet-400 rounded inline-block" /> Contacts</span>
          </div>
        </div>
        {loading
          ? <div className="h-52 bg-slate-50 rounded-xl animate-pulse" />
          : !data?.bookingTrend?.some(d => d.bookings > 0 || d.leads > 0)
            ? <div className="h-52 flex flex-col items-center justify-center text-slate-400 text-sm gap-2">
                <Calendar className="w-8 h-8 text-slate-200" />
                <p>No bookings yet in this period.</p>
                <p className="text-xs">Create bookings and contacts to see live trends here.</p>
              </div>
            : <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={data.bookingTrend}>
                  <defs>
                    <linearGradient id="gb" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.15} />
                      <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gv" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.12} />
                      <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="date" tickFormatter={formatDate} axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                  <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                  <Tooltip {...tooltipStyle} labelFormatter={formatDate} />
                  <Area type="monotone" dataKey="leads" stroke="#8b5cf6" strokeWidth={2} fill="url(#gv)" name="Contacts" dot={false} />
                  <Area type="monotone" dataKey="bookings" stroke="#3b82f6" strokeWidth={2} fill="url(#gb)" name="Bookings" dot={{ fill: '#3b82f6', r: 3, strokeWidth: 0 }} />
                </AreaChart>
              </ResponsiveContainer>
        }
      </div>

      {/* Peak Hours + Status Breakdown */}
      <div className="grid lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <h3 className="font-semibold font-display text-slate-900 mb-1">Peak Booking Hours</h3>
          <p className="text-xs text-slate-400 mb-5">When your appointments are most often scheduled</p>
          {loading
            ? <div className="h-44 bg-slate-50 rounded-xl animate-pulse" />
            : !data?.bookingsByHour?.some(h => h.count > 0)
              ? <div className="h-44 flex flex-col items-center justify-center text-slate-400 text-sm gap-2">
                  <p>No scheduled appointments yet.</p>
                </div>
              : <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={data.bookingsByHour} barSize={26}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="hour" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                    <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                    <Tooltip {...tooltipStyle} />
                    <Bar dataKey="count" fill="#3b82f6" radius={[6, 6, 0, 0]} name="Bookings" />
                  </BarChart>
                </ResponsiveContainer>
          }
        </div>

        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <h3 className="font-semibold font-display text-slate-900 mb-1">Booking Outcomes</h3>
          <p className="text-xs text-slate-400 mb-4">All-time status breakdown</p>
          {loading
            ? <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-8 bg-slate-50 rounded-lg animate-pulse" />)}</div>
            : statusData.length === 0
              ? <div className="h-40 flex items-center justify-center text-slate-400 text-sm">No bookings yet.</div>
              : <>
                  <ResponsiveContainer width="100%" height={130}>
                    <PieChart>
                      <Pie data={statusData} cx="50%" cy="50%" innerRadius={38} outerRadius={56} paddingAngle={3} dataKey="value">
                        {statusData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                      </Pie>
                      <Tooltip contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 12 }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-2 mt-2">
                    {statusData.map(s => (
                      <div key={s.name} className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ background: s.color }} />
                          <span className="text-slate-600 capitalize">{s.name.toLowerCase().replace('_', ' ')}</span>
                        </span>
                        <span className="font-semibold text-slate-800">
                          {s.value} <span className="text-slate-400 font-normal text-xs">
                            ({totalStatus > 0 ? Math.round((s.value / totalStatus) * 100) : 0}%)
                          </span>
                        </span>
                      </div>
                    ))}
                  </div>
                </>
          }
        </div>
      </div>
    </div>
  );
}