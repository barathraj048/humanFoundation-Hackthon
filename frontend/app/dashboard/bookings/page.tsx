// ============================================
// app/dashboard/bookings/page.tsx
// ============================================
'use client';
import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import api from '@/lib/api';
import { Booking } from '@/types';
import { cn, getStatusColor, formatTime } from '@/lib/utils';
import { toast } from 'sonner';
import { Calendar, Clock, MapPin, User, Filter, ChevronDown, Loader2, MoreHorizontal } from 'lucide-react';

const STATUS_OPTIONS = ['ALL', 'PENDING', 'CONFIRMED', 'COMPLETED', 'NO_SHOW', 'CANCELLED'];

export default function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => { loadBookings(); }, []);

  async function loadBookings() {
    setLoading(true);
    try {
      const r = await api.get('/api/bookings');
      setBookings(r.data.data || []);
    } catch { toast.error('Failed to load bookings'); }
    finally { setLoading(false); }
  }

  async function updateStatus(id: string, status: string) {
    setUpdating(id);
    try {
      await api.put(`/api/bookings/${id}/status`, { status });
      setBookings(bs => bs.map(b => b.id === id ? { ...b, status: status as any } : b));
      toast.success('Status updated');
    } catch { toast.error('Update failed'); }
    finally { setUpdating(null); }
  }

  const filtered = statusFilter === 'ALL' ? bookings : bookings.filter(b => b.status === statusFilter);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="page-header flex items-center justify-between">
        <div>
          <h1 className="page-title">Bookings</h1>
          <p className="page-subtitle">{bookings.length} total bookings</p>
        </div>
        <div className="flex gap-2">
          {STATUS_OPTIONS.map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={cn(
                'px-3 py-1.5 text-xs font-medium rounded-lg transition-colors',
                statusFilter === s ? 'bg-blue-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              )}>
              {s}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array(5).fill(0).map((_, i) => <div key={i} className="skeleton h-20 rounded-2xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 p-16 text-center">
          <Calendar className="w-12 h-12 text-slate-200 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">No bookings found</p>
          <p className="text-slate-400 text-sm mt-1">Bookings will appear here when customers schedule appointments</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100">
                {['Customer', 'Service', 'Date & Time', 'Location', 'Status', 'Actions'].map(h => (
                  <th key={h} className="text-left px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map(b => (
                <tr key={b.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-white text-xs font-bold">
                        {b.contact.name[0]}
                      </div>
                      <div>
                        <div className="font-medium text-sm text-slate-800">{b.contact.name}</div>
                        <div className="text-xs text-slate-400">{b.contact.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-medium text-sm text-slate-800">{b.serviceType.name}</div>
                    <div className="text-xs text-slate-400">{b.serviceType.durationMinutes} min</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1.5 text-sm text-slate-700">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      {format(new Date(b.scheduledAt), 'MMM d, yyyy')}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-0.5">
                      <Clock className="w-3 h-3" />
                      {formatTime(b.scheduledAt)}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1.5 text-sm text-slate-600">
                      {b.location ? <><MapPin className="w-3.5 h-3.5 text-slate-400" />{b.location}</> : <span className="text-slate-300">—</span>}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={cn('text-xs px-2.5 py-1 rounded-full font-medium border', getStatusColor(b.status))}>
                      {b.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-1">
                      {['CONFIRMED', 'COMPLETED', 'NO_SHOW'].filter(s => s !== b.status).map(s => (
                        <button key={s} onClick={() => updateStatus(b.id, s)}
                          disabled={updating === b.id}
                          className="text-xs px-2.5 py-1 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-40">
                          {updating === b.id ? <Loader2 className="w-3 h-3 animate-spin" /> : s.replace('_', ' ')}
                        </button>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
