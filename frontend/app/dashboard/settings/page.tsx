'use client';
import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { useStore } from '@/store/useStore';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Settings, Mail, Key, Users, ExternalLink, CheckCircle2, AlertCircle, Loader2, Copy, Globe } from 'lucide-react';

const tabs = ['General', 'Integrations', 'Team', 'Booking Link'];

export default function SettingsPage() {
  const { workspace, user } = useStore();
  const [tab, setTab] = useState('General');
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    businessName: workspace?.businessName || '',
    address: workspace?.address || '',
    contactEmail: workspace?.contactEmail || '',
    timezone: workspace?.timezone || 'UTC',
  });
  const [staffInvite, setStaffInvite] = useState({ email: '', permissions: [] as string[] });
  const [inviting, setInviting] = useState(false);

  useEffect(() => {
    if (workspace) setForm({
      businessName: workspace.businessName,
      address: workspace.address || '',
      contactEmail: workspace.contactEmail || '',
      timezone: workspace.timezone,
    });
  }, [workspace]);

  const bookingUrl = workspace ? `${process.env.NEXT_PUBLIC_APP_URL || window.location.origin}/book/${workspace.slug}` : '';

  async function saveGeneral() {
    setSaving(true);
    try {
      await api.put(`/api/workspaces/${workspace?.id}`, form);
      toast.success('Settings saved');
    } catch { toast.error('Save failed'); }
    finally { setSaving(false); }
  }

  async function inviteStaff() {
    if (!staffInvite.email) return;
    setInviting(true);
    try {
      await api.post(`/api/workspaces/${workspace?.id}/invite`, staffInvite);
      toast.success('Invitation sent!');
      setStaffInvite({ email: '', permissions: [] });
    } catch { toast.error('Invite failed'); }
    finally { setInviting(false); }
  }

  function copyBookingLink() {
    navigator.clipboard.writeText(bookingUrl);
    toast.success('Booking link copied!');
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="page-header">
        <h1 className="page-title">Settings</h1>
        <p className="page-subtitle">Manage your workspace configuration</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl mb-6 w-fit">
        {tabs.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={cn('px-4 py-2 text-sm font-medium rounded-lg transition-colors',
              tab === t ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700')}>
            {t}
          </button>
        ))}
      </div>

      {/* General */}
      {tab === 'General' && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-5">
          <h3 className="font-semibold text-slate-900 font-display">Business Details</h3>
          {[
            { label: 'Business Name', key: 'businessName', type: 'text' },
            { label: 'Address', key: 'address', type: 'text' },
            { label: 'Contact Email', key: 'contactEmail', type: 'email' },
            { label: 'Timezone', key: 'timezone', type: 'text' },
          ].map(f => (
            <div key={f.key}>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">{f.label}</label>
              <input type={f.type} value={(form as any)[f.key]}
                onChange={e => setForm({ ...form, [f.key]: e.target.value })}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          ))}
          <button onClick={saveGeneral} disabled={saving}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-medium text-sm rounded-xl flex items-center gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}Save Changes
          </button>
        </div>
      )}

      {/* Integrations */}
      {tab === 'Integrations' && (
        <div className="space-y-4">
          {[
            { name: 'Resend Email', desc: 'Send automated emails to customers', icon: Mail, status: true },
            { name: 'Google Calendar', desc: 'Sync bookings to Google Calendar', icon: Key, status: false },
          ].map(i => {
            const Icon = i.icon;
            return (
              <div key={i.name} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center">
                    <Icon className="w-6 h-6 text-slate-500" />
                  </div>
                  <div>
                    <div className="font-semibold text-slate-900">{i.name}</div>
                    <div className="text-sm text-slate-500">{i.desc}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {i.status ? (
                    <span className="flex items-center gap-1.5 text-sm text-emerald-600 font-medium">
                      <CheckCircle2 className="w-4 h-4" />Connected
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 text-sm text-slate-400 font-medium">
                      <AlertCircle className="w-4 h-4" />Not connected
                    </span>
                  )}
                  <button className="px-3 py-1.5 text-xs font-medium border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
                    {i.status ? 'Manage' : 'Connect'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Team */}
      {tab === 'Team' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <h3 className="font-semibold text-slate-900 font-display mb-4">Invite Staff Member</h3>
            <div className="flex gap-3">
              <input type="email" value={staffInvite.email}
                onChange={e => setStaffInvite({ ...staffInvite, email: e.target.value })}
                placeholder="staff@business.com"
                className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <button onClick={inviteStaff} disabled={inviting || !staffInvite.email}
                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-medium text-sm rounded-xl flex items-center gap-2 whitespace-nowrap">
                {inviting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Users className="w-4 h-4" />}
                Send Invite
              </button>
            </div>
            <p className="text-xs text-slate-400 mt-2">Staff can manage bookings, inbox and forms. They cannot change system settings.</p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <h3 className="font-semibold text-slate-900 font-display mb-4">Team Members</h3>
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-white text-xs font-bold">
                {user?.email?.[0]?.toUpperCase()}
              </div>
              <div>
                <div className="text-sm font-medium text-slate-800">{user?.email}</div>
                <div className="text-xs text-slate-400">Owner · Full access</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Booking Link */}
      {tab === 'Booking Link' && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-5">
          <h3 className="font-semibold text-slate-900 font-display">Your Public Booking Page</h3>
          <p className="text-sm text-slate-500">Share this link with customers so they can book appointments with you.</p>

          <div className="flex gap-2">
            <div className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-600 truncate">
              {bookingUrl}
            </div>
            <button onClick={copyBookingLink}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-sm rounded-xl flex items-center gap-2 transition-colors whitespace-nowrap">
              <Copy className="w-4 h-4" />Copy
            </button>
            <a href={bookingUrl} target="_blank" rel="noopener noreferrer"
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm rounded-xl flex items-center gap-2 transition-colors whitespace-nowrap">
              <ExternalLink className="w-4 h-4" />Open
            </a>
          </div>

          <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl">
            <h4 className="text-sm font-semibold text-blue-800 mb-2 flex items-center gap-2">
              <Globe className="w-4 h-4" />Embed on your website
            </h4>
            <code className="text-xs text-blue-700 bg-blue-100 px-3 py-2 rounded-lg block font-mono">
              {`<a href="${bookingUrl}">Book an Appointment</a>`}
            </code>
          </div>
        </div>
      )}
    </div>
  );
}
