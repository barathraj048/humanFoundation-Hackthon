'use client';
import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { cn } from '@/lib/utils';
import {
  Plus, Trash2, Eye, Send, CheckCircle, Clock, AlertTriangle,
  ChevronDown, ChevronUp, FileText, X, Save, GripVertical
} from 'lucide-react';

type FieldType = 'text' | 'email' | 'phone' | 'textarea' | 'select' | 'checkbox' | 'date';
interface FormField { id: string; label: string; type: FieldType; required: boolean; options?: string[] }
interface FormTemplate { id: string; name: string; type: string; fields: FormField[]; isActive: boolean; createdAt: string }
interface Submission {
  id: string; status: string; createdAt: string;
  contact: { name: string; email: string };
  formTemplate: { name: string; type: string };
  booking?: { serviceType: { name: string }; scheduledAt: string };
}
interface Contact { id: string; name: string; email: string; status: string }

const FIELD_TYPES: { value: FieldType; label: string }[] = [
  { value: 'text', label: 'Short Text' },
  { value: 'textarea', label: 'Long Text' },
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone Number' },
  { value: 'date', label: 'Date' },
  { value: 'select', label: 'Dropdown' },
  { value: 'checkbox', label: 'Checkbox' },
];

export default function FormsPage() {
  const [tab, setTab] = useState<'submissions' | 'templates' | 'builder'>('submissions');
  const [templates, setTemplates] = useState<FormTemplate[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Builder
  const [name, setName] = useState('');
  const [formType, setFormType] = useState('INTAKE');
  const [fields, setFields] = useState<FormField[]>([
    { id: '1', label: 'Full Name', type: 'text', required: true },
    { id: '2', label: 'Date of Birth', type: 'date', required: false },
    { id: '3', label: 'Reason for Visit', type: 'textarea', required: true },
  ]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Modals
  const [sendModal, setSendModal] = useState<FormTemplate | null>(null);
  const [sendContactId, setSendContactId] = useState('');
  const [sending, setSending] = useState(false);
  const [viewModal, setViewModal] = useState<Submission | null>(null);
  const [completing, setCompleting] = useState(false);

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    setLoading(true);
    try {
      const [t, s, c] = await Promise.all([
        api.get('/forms/templates'),
        api.get('/forms/submissions?limit=100'),
        api.get('/contacts?limit=200'),
      ]);
      setTemplates(t.data.data || []);
      setSubmissions(s.data.data || []);
      setContacts(c.data.data || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  // ─── BUILDER HELPERS ──────────────────────────────────────────────────────
  function addField() {
    setFields(f => [...f, { id: String(Date.now()), label: 'New Field', type: 'text', required: false }]);
  }
  function updateField(id: string, patch: Partial<FormField>) {
    setFields(f => f.map(x => x.id === id ? { ...x, ...patch } : x));
  }
  function removeField(id: string) {
    if (fields.length <= 1) return;
    setFields(f => f.filter(x => x.id !== id));
  }
  function moveField(id: string, dir: 'up' | 'down') {
    const i = fields.findIndex(f => f.id === id);
    if (dir === 'up' && i === 0) return;
    if (dir === 'down' && i === fields.length - 1) return;
    const arr = [...fields];
    const swap = dir === 'up' ? i - 1 : i + 1;
    [arr[i], arr[swap]] = [arr[swap], arr[i]];
    setFields(arr);
  }

  async function saveForm() {
    if (!name.trim()) { alert('Enter a form name'); return; }
    setSaving(true);
    try {
      await api.post('/forms/templates', { name: name.trim(), type: formType, fields });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      await loadAll();
      setTab('templates');
      setName(''); setFormType('INTAKE');
      setFields([{ id: '1', label: 'Full Name', type: 'text', required: true }]);
    } catch { alert('Failed to save. Please try again.'); }
    finally { setSaving(false); }
  }

  // ─── SEND FORM ────────────────────────────────────────────────────────────
  async function sendForm() {
    if (!sendContactId) { alert('Select a contact first'); return; }
    setSending(true);
    try {
      await api.post('/forms/submissions', {
        formTemplateId: sendModal!.id,
        contactId: sendContactId,
        data: {},
      });
      setSendModal(null); setSendContactId('');
      await loadAll();
    } catch { alert('Failed to send form'); }
    finally { setSending(false); }
  }

  // ─── COMPLETE SUBMISSION ──────────────────────────────────────────────────
  async function markComplete(id: string) {
    setCompleting(true);
    try {
      await api.put(`/forms/submissions/${id}/complete`, { data: {} });
      await loadAll();
      setViewModal(null);
    } catch { alert('Failed to mark complete'); }
    finally { setCompleting(false); }
  }

  // ─── STATS ────────────────────────────────────────────────────────────────
  const pending = submissions.filter(s => s.status === 'PENDING').length;
  const overdue = submissions.filter(s => s.status === 'PENDING' &&
    new Date(s.createdAt) < new Date(Date.now() - 72 * 60 * 60 * 1000)).length;
  const completed = submissions.filter(s => s.status === 'COMPLETED').length;

  const filteredSubs = statusFilter === 'ALL' ? submissions
    : submissions.filter(s => s.status === statusFilter);

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-5">

      {/* ── HEADER ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold font-display text-slate-900">Forms</h1>
          <p className="text-sm text-slate-400 mt-0.5">Build intake forms · Send to contacts · Track completions</p>
        </div>
        <button onClick={() => setTab('builder')}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-500 transition-colors shadow-sm">
          <Plus className="w-4 h-4" /> Build New Form
        </button>
      </div>

      {/* ── STATS ── */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Awaiting Completion', value: pending, icon: Clock, color: 'amber' },
          { label: 'Overdue (3+ days)', value: overdue, icon: AlertTriangle, color: 'red' },
          { label: 'Completed', value: completed, icon: CheckCircle, color: 'emerald' },
        ].map(s => {
          const Icon = s.icon;
          const c: Record<string, string> = {
            amber: 'bg-amber-50 text-amber-600', red: 'bg-red-50 text-red-500', emerald: 'bg-emerald-50 text-emerald-600'
          };
          return (
            <div key={s.label} className="bg-white rounded-2xl border border-slate-100 p-4 flex items-center gap-3">
              <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0', c[s.color].split(' ')[0])}>
                <Icon className={cn('w-5 h-5', c[s.color].split(' ')[1])} />
              </div>
              <div>
                <div className={cn('text-2xl font-bold font-display', c[s.color].split(' ')[1])}>{s.value}</div>
                <div className="text-xs text-slate-500 leading-tight">{s.label}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── TABS ── */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        {(['submissions', 'templates', 'builder'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={cn('px-5 py-2 text-sm font-medium rounded-lg capitalize transition-all',
              tab === t ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700')}>
            {t === 'builder' ? '+ Builder' : t}
          </button>
        ))}
      </div>

      {/* ══ SUBMISSIONS TAB ══════════════════════════════════════════════ */}
      {tab === 'submissions' && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <span className="text-sm font-medium text-slate-700">Form Submissions</span>
            <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
              {['ALL', 'PENDING', 'COMPLETED'].map(f => (
                <button key={f} onClick={() => setStatusFilter(f)}
                  className={cn('px-3 py-1 text-xs font-medium rounded-md transition-all',
                    statusFilter === f ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500')}>
                  {f}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="p-8 text-center text-slate-400">Loading...</div>
          ) : filteredSubs.length === 0 ? (
            <div className="py-14 text-center">
              <FileText className="w-10 h-10 text-slate-200 mx-auto mb-3" />
              <p className="font-medium text-slate-500">No submissions yet</p>
              <p className="text-sm text-slate-400 mt-1">
                {statusFilter === 'ALL'
                  ? 'Create a form template then send it to a contact'
                  : `No ${statusFilter.toLowerCase()} submissions`}
              </p>
              {statusFilter === 'ALL' && (
                <button onClick={() => setTab('builder')}
                  className="mt-4 text-sm text-blue-600 font-medium hover:underline">
                  Build your first form →
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px]">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    {['Contact', 'Form', 'Submitted', 'Status', ''].map(h => (
                      <th key={h} className="text-left text-xs font-semibold text-slate-500 px-4 py-3 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredSubs.map(sub => {
                    const isOverdue = sub.status === 'PENDING' &&
                      new Date(sub.createdAt) < new Date(Date.now() - 72 * 60 * 60 * 1000);
                    return (
                      <tr key={sub.id} className={cn('hover:bg-slate-50/80 transition-colors', isOverdue && 'bg-red-50/30')}>
                        <td className="px-4 py-3.5">
                          <p className="text-sm font-medium text-slate-800">{sub.contact?.name}</p>
                          <p className="text-xs text-slate-400">{sub.contact?.email || '—'}</p>
                        </td>
                        <td className="px-4 py-3.5">
                          <p className="text-sm text-slate-700">{sub.formTemplate?.name}</p>
                          <p className="text-xs text-slate-400">{sub.formTemplate?.type}</p>
                        </td>
                        <td className="px-4 py-3.5">
                          <p className="text-sm text-slate-600">{new Date(sub.createdAt).toLocaleDateString()}</p>
                          {isOverdue && <span className="text-xs font-semibold text-red-500">Overdue</span>}
                        </td>
                        <td className="px-4 py-3.5">
                          <span className={cn('inline-flex px-2.5 py-1 rounded-full text-xs font-semibold border',
                            sub.status === 'COMPLETED'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : isOverdue
                                ? 'bg-red-50 text-red-700 border-red-200'
                                : 'bg-amber-50 text-amber-700 border-amber-200')}>
                            {sub.status}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          <button onClick={() => setViewModal(sub)}
                            className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium">
                            <Eye className="w-3 h-3" /> View
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ══ TEMPLATES TAB ════════════════════════════════════════════════ */}
      {tab === 'templates' && (
        <div className="grid md:grid-cols-2 gap-4">
          {loading ? (
            [1, 2].map(i => <div key={i} className="h-48 bg-white rounded-2xl border border-slate-100 animate-pulse" />)
          ) : templates.length === 0 ? (
            <div className="md:col-span-2 bg-white rounded-2xl border border-slate-100 py-14 text-center">
              <FileText className="w-10 h-10 text-slate-200 mx-auto mb-3" />
              <p className="font-medium text-slate-500">No form templates yet</p>
              <button onClick={() => setTab('builder')} className="mt-3 text-sm text-blue-600 font-medium hover:underline">
                Build your first form →
              </button>
            </div>
          ) : templates.map(t => (
            <div key={t.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-slate-900">{t.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs font-medium rounded-full">{t.type}</span>
                    <span className="text-xs text-slate-400">{t.fields?.length || 0} fields</span>
                  </div>
                </div>
                <button onClick={() => { setSendModal(t); setSendContactId(''); }}
                  className="flex items-center gap-1.5 bg-blue-600 text-white px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-blue-500 transition-colors">
                  <Send className="w-3 h-3" /> Send
                </button>
              </div>
              <div className="space-y-1.5 mt-3">
                {(t.fields || []).slice(0, 5).map(f => (
                  <div key={f.id} className="flex items-center gap-2 text-xs text-slate-500">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-300 flex-shrink-0" />
                    <span>{f.label}</span>
                    {f.required && <span className="text-red-400 font-medium">*</span>}
                    <span className="ml-auto text-slate-300">{f.type}</span>
                  </div>
                ))}
                {(t.fields?.length || 0) > 5 && (
                  <p className="text-xs text-slate-400 pl-3.5">+{t.fields.length - 5} more fields</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ══ BUILDER TAB ══════════════════════════════════════════════════ */}
      {tab === 'builder' && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-5">
          <div>
            <h2 className="font-semibold font-display text-xl text-slate-900 mb-1">Form Builder</h2>
            <p className="text-sm text-slate-400">Drag fields to reorder. Add options for dropdown fields.</p>
          </div>

          {/* Form meta */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Form Name *</label>
              <input value={name} onChange={e => setName(e.target.value)}
                placeholder="e.g. New Patient Intake Form"
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Form Type</label>
              <select value={formType} onChange={e => setFormType(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="INTAKE">Intake Form</option>
                <option value="CONTACT">Contact Form</option>
                <option value="AGREEMENT">Agreement / Waiver</option>
              </select>
            </div>
          </div>

          {/* Fields */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-slate-700">Fields ({fields.length})</label>
              <p className="text-xs text-slate-400">Fields marked * are required</p>
            </div>

            {fields.map((field, idx) => (
              <div key={field.id} className="border border-slate-200 rounded-xl p-4 space-y-3 bg-slate-50/40">
                <div className="flex items-center gap-2.5">
                  {/* Move up/down */}
                  <div className="flex flex-col gap-0.5 flex-shrink-0">
                    <button onClick={() => moveField(field.id, 'up')} disabled={idx === 0}
                      className="text-slate-300 hover:text-slate-500 disabled:opacity-0 transition-colors">
                      <ChevronUp className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => moveField(field.id, 'down')} disabled={idx === fields.length - 1}
                      className="text-slate-300 hover:text-slate-500 disabled:opacity-0 transition-colors">
                      <ChevronDown className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <input value={field.label} onChange={e => updateField(field.id, { label: e.target.value })}
                    placeholder="Field label"
                    className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500" />

                  <select value={field.type} onChange={e => updateField(field.id, { type: e.target.value as FieldType })}
                    className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                    {FIELD_TYPES.map(ft => <option key={ft.value} value={ft.value}>{ft.label}</option>)}
                  </select>

                  <label className="flex items-center gap-1.5 text-sm text-slate-600 cursor-pointer flex-shrink-0">
                    <input type="checkbox" checked={field.required}
                      onChange={e => updateField(field.id, { required: e.target.checked })}
                      className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                    Req.
                  </label>

                  <button onClick={() => removeField(field.id)} disabled={fields.length <= 1}
                    className="text-slate-300 hover:text-red-400 disabled:opacity-20 transition-colors flex-shrink-0">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {field.type === 'select' && (
                  <div className="pl-7">
                    <label className="text-xs text-slate-500 mb-1 block">Options (one per line)</label>
                    <textarea
                      value={(field.options || []).join('\n')}
                      onChange={e => updateField(field.id, { options: e.target.value.split('\n').filter(Boolean) })}
                      placeholder={'Option A\nOption B\nOption C'}
                      rows={3}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                )}
              </div>
            ))}

            <button onClick={addField}
              className="w-full border-2 border-dashed border-slate-200 rounded-xl py-3 text-sm text-slate-400 hover:border-blue-400 hover:text-blue-600 transition-colors flex items-center justify-center gap-2">
              <Plus className="w-4 h-4" /> Add Field
            </button>
          </div>

          {/* Save */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            <p className="text-sm text-slate-400">{fields.length} field{fields.length !== 1 ? 's' : ''} · {formType} type</p>
            <div className="flex items-center gap-3">
              {saved && (
                <span className="flex items-center gap-1.5 text-sm text-emerald-600 font-medium">
                  <CheckCircle className="w-4 h-4" /> Saved!
                </span>
              )}
              <button onClick={saveForm} disabled={saving || !name.trim()}
                className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-500 disabled:opacity-50 transition-colors shadow-sm">
                <Save className="w-4 h-4" />
                {saving ? 'Saving...' : 'Save Template'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ SEND FORM MODAL ══════════════════════════════════════════════ */}
      {sendModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-semibold font-display text-lg text-slate-900">Send Form</h3>
              <button onClick={() => setSendModal(null)} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-blue-50 rounded-xl p-3.5 mb-5">
              <p className="text-sm font-semibold text-blue-900">{sendModal.name}</p>
              <p className="text-xs text-blue-600 mt-0.5">{sendModal.fields?.length} fields · {sendModal.type}</p>
            </div>

            <div className="mb-5">
              <label className="block text-sm font-medium text-slate-700 mb-2">Send to Contact *</label>
              <select value={sendContactId} onChange={e => setSendContactId(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Select a contact...</option>
                {contacts.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name}{c.email ? ` — ${c.email}` : ''} [{c.status}]
                  </option>
                ))}
              </select>
            </div>

            <div className="bg-amber-50 border border-amber-100 rounded-xl p-3.5 mb-5 text-xs text-amber-800">
              <strong>How it works:</strong> This creates a pending form submission record for the contact. Track it in the Submissions tab. Mark complete once they've filled it out.
            </div>

            <div className="flex gap-3">
              <button onClick={() => setSendModal(null)}
                className="flex-1 border border-slate-200 text-slate-700 rounded-xl py-2.5 text-sm font-medium hover:bg-slate-50">
                Cancel
              </button>
              <button onClick={sendForm} disabled={sending || !sendContactId}
                className="flex-1 bg-blue-600 text-white rounded-xl py-2.5 text-sm font-semibold hover:bg-blue-500 disabled:opacity-50 transition-colors">
                {sending ? 'Sending...' : 'Send Form'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ VIEW SUBMISSION MODAL ════════════════════════════════════════ */}
      {viewModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-semibold font-display text-lg text-slate-900">Submission Details</h3>
              <button onClick={() => setViewModal(null)} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 bg-slate-50 rounded-xl p-4 mb-5">
              {[
                { label: 'Contact', value: viewModal.contact?.name },
                { label: 'Email', value: viewModal.contact?.email || '—' },
                { label: 'Form', value: viewModal.formTemplate?.name },
                { label: 'Type', value: viewModal.formTemplate?.type },
                { label: 'Submitted', value: new Date(viewModal.createdAt).toLocaleString() },
                ...(viewModal.booking ? [{ label: 'Linked Booking', value: viewModal.booking.serviceType.name }] : []),
              ].map(row => (
                <div key={row.label} className="flex justify-between text-sm">
                  <span className="text-slate-500">{row.label}</span>
                  <span className="font-medium text-slate-800">{row.value}</span>
                </div>
              ))}
              <div className="flex justify-between text-sm pt-1 border-t border-slate-200">
                <span className="text-slate-500">Status</span>
                <span className={cn('font-semibold',
                  viewModal.status === 'COMPLETED' ? 'text-emerald-600' : 'text-amber-600')}>
                  {viewModal.status}
                </span>
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setViewModal(null)}
                className="flex-1 border border-slate-200 text-slate-700 rounded-xl py-2.5 text-sm font-medium hover:bg-slate-50">
                Close
              </button>
              {viewModal.status === 'PENDING' && (
                <button onClick={() => markComplete(viewModal.id)} disabled={completing}
                  className="flex-1 bg-emerald-600 text-white rounded-xl py-2.5 text-sm font-semibold hover:bg-emerald-500 disabled:opacity-50 flex items-center justify-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  {completing ? 'Saving...' : 'Mark Complete'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}