'use client';
import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import api from '@/lib/api';
import { Contact } from '@/types';
import { cn, getStatusColor, getInitials } from '@/lib/utils';
import { toast } from 'sonner';
import { Users, Search, Mail, Phone, Calendar } from 'lucide-react';

const STATUS_COLORS: Record<string, string> = {
  NEW: 'badge-blue', CONTACTED: 'badge-purple',
  BOOKED: 'badge-green', COMPLETED: 'badge-gray',
};

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  useEffect(() => {
    api.get('/api/contacts')
      .then(r => setContacts(r.data.data || []))
      .catch(() => toast.error('Failed to load contacts'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = contacts.filter(c => {
    const matchSearch = c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.email?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'ALL' || c.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="page-header">
        <h1 className="page-title">Contacts</h1>
        <p className="page-subtitle">{contacts.length} total contacts</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by name or email..."
            className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
        </div>
        <div className="flex gap-2">
          {['ALL', 'NEW', 'CONTACTED', 'BOOKED', 'COMPLETED'].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={cn('px-3 py-1.5 text-xs font-medium rounded-lg transition-colors',
                statusFilter === s ? 'bg-blue-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50')}>
              {s}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array(6).fill(0).map((_, i) => <div key={i} className="skeleton h-40 rounded-2xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 p-16 text-center">
          <Users className="w-12 h-12 text-slate-200 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">No contacts found</p>
          <p className="text-slate-400 text-sm mt-1">Contacts are created when customers submit forms or book appointments</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(c => (
            <div key={c.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 card-hover">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-white text-sm font-bold">
                    {getInitials(c.name)}
                  </div>
                  <div>
                    <div className="font-semibold text-sm text-slate-800">{c.name}</div>
                    <div className="text-xs text-slate-400 capitalize">{c.source}</div>
                  </div>
                </div>
                <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium border', STATUS_COLORS[c.status] || 'badge-gray')}>
                  {c.status}
                </span>
              </div>
              <div className="space-y-2">
                {c.email && (
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />{c.email}
                  </div>
                )}
                {c.phone && (
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />{c.phone}
                  </div>
                )}
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <Calendar className="w-3.5 h-3.5" />{format(new Date(c.createdAt), 'MMM d, yyyy')}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
