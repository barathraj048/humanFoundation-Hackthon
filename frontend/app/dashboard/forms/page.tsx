'use client';
import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import api from '@/lib/api';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  FileText, Clock, CheckCircle2, AlertTriangle, ChevronRight,
  Plus, X, Trash2, Send, Eye, GripVertical, ChevronDown
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────
type FieldType = 'text' | 'textarea' | 'select' | 'multiselect' | 'checkbox' | 'date';

interface FormField {
  id: string; label: string; type: FieldType;
  required: boolean; options: string[]; placeholder: string;
}

interface FormTemplate { id: string; name: string; type: string; fields: FormField[]; }
interface Contact      { id: string; name: string; email: string; }
interface Submission   {
  id: string; status: 'PENDING' | 'COMPLETED'; createdAt: string; completedAt?: string;
  data: Record<string, any>;
  formTemplate: { id: string; name: string; type: string; fields: FormField[] };
  contact: { id: string; name: string; email: string };
  booking?: { scheduledAt: string; serviceType: { name: string } };
}

const FIELD_TYPES: { value: FieldType; label: string; desc: string }[] = [
  { value: 'text',        label: 'Text',        desc: 'Single line answer' },
  { value: 'textarea',    label: 'Long text',   desc: 'Paragraph answer' },
  { value: 'select',      label: 'Dropdown',    desc: 'Pick one option' },
  { value: 'multiselect', label: 'Multi-select',desc: 'Pick multiple options' },
  { value: 'checkbox',    label: 'Checkbox',    desc: 'Yes / No toggle' },
  { value: 'date',        label: 'Date',        desc: 'Date picker' },
];

function uid() { return Math.random().toString(36).slice(2, 9); }

// ─── Form Builder Modal ───────────────────────────────────────────────────────
function BuilderModal({ onClose, onSave }: { onClose: () => void; onSave: (t: FormTemplate) => void }) {
  const [name, setName]     = useState('');
  const [type, setType]     = useState<'INTAKE' | 'CONTACT' | 'AGREEMENT'>('INTAKE');
  const [fields, setFields] = useState<FormField[]>([
    { id: uid(), label: 'Full Name', type: 'text', required: true, options: [], placeholder: '' },
  ]);
  const [saving, setSaving] = useState(false);

  function addField() {
    setFields(f => [...f, { id: uid(), label: 'New Field', type: 'text', required: false, options: [], placeholder: '' }]);
  }
  function removeField(id: string) { setFields(f => f.filter(x => x.id !== id)); }
  function updateField(id: string, key: keyof FormField, value: any) {
    setFields(f => f.map(x => x.id === id ? { ...x, [key]: value } : x));
  }
  function addOption(id: string) {
    setFields(f => f.map(x => x.id === id ? { ...x, options: [...x.options, 'Option'] } : x));
  }
  function updateOption(fieldId: string, idx: number, val: string) {
    setFields(f => f.map(x => x.id === fieldId
      ? { ...x, options: x.options.map((o, i) => i === idx ? val : o) }
      : x
    ));
  }
  function removeOption(fieldId: string, idx: number) {
    setFields(f => f.map(x => x.id === fieldId
      ? { ...x, options: x.options.filter((_, i) => i !== idx) }
      : x
    ));
  }

  async function save() {
    if (!name.trim()) { toast.error('Form name is required'); return; }
    if (fields.length === 0) { toast.error('Add at least one field'); return; }
    setSaving(true);
    try {
      const r = await api.post('/forms/templates', { name: name.trim(), type, fields });
      onSave(r.data.data);
      toast.success('Form created!');
      onClose();
    } catch { toast.error('Failed to create form'); }
    finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <h2 className="font-bold text-slate-900 text-lg">Create Form</h2>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100"><X className="w-4 h-4"/></button>
        </div>

        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          {/* Form name + type */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Form Name *</label>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. New Patient Intake"
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Form Type</label>
              <select value={type} onChange={e => setType(e.target.value as any)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                <option value="INTAKE">Intake</option>
                <option value="CONTACT">Contact</option>
                <option value="AGREEMENT">Agreement</option>
              </select>
            </div>
          </div>

          {/* Fields */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-3">Form Fields</label>
            <div className="space-y-3">
              {fields.map((field, idx) => (
                <div key={field.id} className="border border-slate-200 rounded-xl p-4 space-y-3 bg-slate-50/50">
                  <div className="flex items-start gap-3">
                    <GripVertical className="w-4 h-4 text-slate-300 mt-2.5 flex-shrink-0"/>
                    <div className="flex-1 grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-slate-500 mb-1 block">Label</label>
                        <input value={field.label} onChange={e => updateField(field.id, 'label', e.target.value)}
                          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                      </div>
                      <div>
                        <label className="text-xs text-slate-500 mb-1 block">Field Type</label>
                        <select value={field.type} onChange={e => updateField(field.id, 'type', e.target.value)}
                          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                          {FIELD_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                        </select>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-6">
                      <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer">
                        <input type="checkbox" checked={field.required}
                          onChange={e => updateField(field.id, 'required', e.target.checked)}
                          className="w-3.5 h-3.5 rounded"/>
                        Required
                      </label>
                      {fields.length > 1 && (
                        <button onClick={() => removeField(field.id)} className="text-slate-400 hover:text-red-500 transition-colors">
                          <Trash2 className="w-3.5 h-3.5"/>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Options for select/multiselect */}
                  {(field.type === 'select' || field.type === 'multiselect') && (
                    <div className="ml-7">
                      <div className="text-xs text-slate-500 mb-2">
                        Options <span className="text-blue-600">({field.type === 'multiselect' ? 'user can pick multiple' : 'user picks one'})</span>
                      </div>
                      <div className="space-y-1.5">
                        {field.options.map((opt, oi) => (
                          <div key={oi} className="flex items-center gap-2">
                            <input value={opt} onChange={e => updateOption(field.id, oi, e.target.value)}
                              className="flex-1 border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                            <button onClick={() => removeOption(field.id, oi)} className="text-slate-300 hover:text-red-400">
                              <X className="w-3.5 h-3.5"/>
                            </button>
                          </div>
                        ))}
                        <button onClick={() => addOption(field.id)}
                          className="text-blue-600 text-xs hover:text-blue-700 flex items-center gap-1 mt-1">
                          <Plus className="w-3 h-3"/> Add option
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Placeholder for text types */}
                  {(field.type === 'text' || field.type === 'textarea') && (
                    <div className="ml-7">
                      <label className="text-xs text-slate-500 mb-1 block">Placeholder (optional)</label>
                      <input value={field.placeholder} onChange={e => updateField(field.id, 'placeholder', e.target.value)}
                        placeholder="Hint text shown inside the field"
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                    </div>
                  )}
                </div>
              ))}
            </div>
            <button onClick={addField}
              className="mt-3 flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 border border-dashed border-blue-200 rounded-xl px-4 py-2.5 w-full justify-center hover:bg-blue-50 transition-colors">
              <Plus className="w-4 h-4"/> Add Field
            </button>
          </div>
        </div>

        <div className="flex gap-3 p-6 border-t border-slate-100">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-600 hover:bg-slate-50">
            Cancel
          </button>
          <button onClick={save} disabled={saving}
            className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-xl text-sm font-semibold transition-colors">
            {saving ? 'Creating...' : 'Create Form'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Send Form Modal ──────────────────────────────────────────────────────────
function SendModal({ templates, onClose, onSent }: {
  templates: FormTemplate[]; onClose: () => void; onSent: () => void;
}) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [templateId, setTemplateId] = useState(templates[0]?.id || '');
  const [contactId, setContactId]   = useState('');
  const [search, setSearch]         = useState('');
  const [sending, setSending]       = useState(false);

  useEffect(() => {
    api.get('api/contacts').then(r => setContacts(r.data.data || [])).catch(() => {});
  }, []);

  const filtered = contacts.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.email.toLowerCase().includes(search.toLowerCase())
  );

  async function send() {
    if (!templateId) { toast.error('Select a form'); return; }
    if (!contactId)  { toast.error('Select a contact'); return; }
    const contact = contacts.find(c => c.id === contactId);
    if (!contact?.email) { toast.error('Selected contact has no email address'); return; }
    setSending(true);
    try {
      await api.post('api/forms/submissions', { formTemplateId: templateId, contactId });
      toast.success(`Form sent to ${contact.name} (${contact.email})`);
      onSent();
      onClose();
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Failed to send form');
    } finally { setSending(false); }
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <h2 className="font-bold text-slate-900">Send Form</h2>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100"><X className="w-4 h-4"/></button>
        </div>

        <div className="p-6 space-y-5">
          {/* Select template */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Form Template</label>
            {templates.length === 0 ? (
              <p className="text-sm text-slate-400 bg-slate-50 rounded-xl px-4 py-3">
                No forms yet — create one first
              </p>
            ) : (
              <select value={templateId} onChange={e => setTemplateId(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                {templates.map(t => <option key={t.id} value={t.id}>{t.name} ({t.type})</option>)}
              </select>
            )}
          </div>

          {/* Select contact */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Send To</label>
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search contacts..."
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2"/>
            <div className="max-h-48 overflow-y-auto border border-slate-100 rounded-xl divide-y divide-slate-50">
              {filtered.length === 0 ? (
                <p className="text-sm text-slate-400 p-4 text-center">No contacts found</p>
              ) : filtered.map(c => (
                <label key={c.id} className={cn(
                  'flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-slate-50 transition-colors',
                  contactId === c.id && 'bg-blue-50'
                )}>
                  <input type="radio" name="contact" value={c.id} checked={contactId === c.id}
                    onChange={() => setContactId(c.id)} className="w-4 h-4 text-blue-600"/>
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-slate-800 truncate">{c.name}</div>
                    <div className={cn('text-xs truncate', c.email ? 'text-slate-400' : 'text-red-400')}>
                      {c.email || 'No email — cannot send'}
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {contactId && (() => {
            const c = contacts.find(x => x.id === contactId);
            return c?.email ? (
              <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-sm text-blue-700">
                📧 Will be sent to <strong>{c.email}</strong>
              </div>
            ) : null;
          })()}
        </div>

        <div className="flex gap-3 p-6 border-t border-slate-100">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-600 hover:bg-slate-50">
            Cancel
          </button>
          <button onClick={send} disabled={sending || !templateId || !contactId}
            className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-colors">
            <Send className="w-3.5 h-3.5"/>
            {sending ? 'Sending...' : 'Send Form'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Results Modal ────────────────────────────────────────────────────────────
function ResultsModal({ sub, onClose }: { sub: Submission; onClose: () => void }) {
  const fields: FormField[] = sub.formTemplate.fields || [];
  const data = sub.data || {};

  function renderAnswer(field: FormField) {
    const val = data[field.id];
    if (val === undefined || val === null || val === '') {
      return <span className="text-slate-400 italic text-sm">No answer</span>;
    }
    if (Array.isArray(val)) {
      return (
        <div className="flex flex-wrap gap-1.5">
          {val.map((v: string) => (
            <span key={v} className="bg-blue-100 text-blue-700 text-xs px-2.5 py-1 rounded-full font-medium">{v}</span>
          ))}
        </div>
      );
    }
    if (typeof val === 'boolean') {
      return <span className={cn('text-sm font-medium', val ? 'text-emerald-600' : 'text-slate-500')}>
        {val ? '✓ Yes' : '✗ No'}
      </span>;
    }
    return <p className="text-sm text-slate-800 whitespace-pre-wrap">{String(val)}</p>;
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <div>
            <h2 className="font-bold text-slate-900">{sub.formTemplate.name}</h2>
            <p className="text-sm text-slate-400 mt-0.5">{sub.contact.name} · {sub.contact.email}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100"><X className="w-4 h-4"/></button>
        </div>

        {/* Status banner */}
        <div className={cn('px-6 py-3 border-b flex items-center gap-2 text-sm font-medium',
          sub.status === 'COMPLETED' ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-amber-50 border-amber-100 text-amber-700')}>
          {sub.status === 'COMPLETED'
            ? <><CheckCircle2 className="w-4 h-4"/> Completed {sub.completedAt ? format(new Date(sub.completedAt), 'MMM d, yyyy h:mm a') : ''}</>
            : <><Clock className="w-4 h-4"/> Pending — not yet submitted</>
          }
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          {sub.status !== 'COMPLETED' ? (
            <div className="text-center py-10">
              <Clock className="w-10 h-10 text-slate-200 mx-auto mb-3"/>
              <p className="text-slate-500 font-medium">Waiting for response</p>
              <p className="text-slate-400 text-sm mt-1">The form was sent but the contact hasn't submitted it yet.</p>
            </div>
          ) : fields.length === 0 ? (
            <div className="text-center py-10">
              <FileText className="w-10 h-10 text-slate-200 mx-auto mb-3"/>
              <p className="text-slate-400 text-sm">No fields in this form template</p>
            </div>
          ) : (
            <div className="space-y-5">
              {fields.map(field => (
                <div key={field.id} className="border-b border-slate-100 pb-5 last:border-0 last:pb-0">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                    {field.label}
                    {field.required && <span className="text-red-400 ml-1">*</span>}
                    <span className="ml-2 normal-case font-normal text-slate-300">
                      {FIELD_TYPES.find(t => t.value === field.type)?.label}
                    </span>
                  </p>
                  {renderAnswer(field)}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-6 border-t border-slate-100">
          <button onClick={onClose} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-600 hover:bg-slate-50">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function FormsPage() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [templates, setTemplates]     = useState<FormTemplate[]>([]);
  const [loading, setLoading]         = useState(true);
  const [filter, setFilter]           = useState<'ALL' | 'PENDING' | 'COMPLETED'>('ALL');
  const [showBuilder, setShowBuilder] = useState(false);
  const [showSend, setShowSend]       = useState(false);
  const [viewResult, setViewResult]   = useState<Submission | null>(null);

  async function load() {
    try {
      const [subRes, tplRes] = await Promise.all([
        api.get('api/forms/submissions'),
        api.get('api/forms/templates'),
      ]);
      setSubmissions(subRes.data.data || []);
      setTemplates(tplRes.data.data || []);
    } catch (err) { toast.error('Failed to load forms'); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  const pending   = submissions.filter(s => s.status === 'PENDING');
  const completed = submissions.filter(s => s.status === 'COMPLETED');
  const overdue   = pending.filter(s =>
    new Date(s.createdAt).getTime() < Date.now() - 3 * 24 * 60 * 60 * 1000
  );
  const filtered = filter === 'ALL' ? submissions : submissions.filter(s => s.status === filter);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="page-title">Forms</h1>
          <p className="page-subtitle">{templates.length} template{templates.length !== 1 ? 's' : ''} · track intake completion</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowBuilder(true)}
            className="flex items-center gap-2 px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors">
            <Plus className="w-4 h-4"/> New Form
          </button>
          <button onClick={() => setShowSend(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 rounded-xl text-sm font-semibold text-white transition-colors shadow-sm shadow-blue-100">
            <Send className="w-4 h-4"/> Send Form
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid sm:grid-cols-3 gap-4">
        {[
          { label: 'Pending',   value: pending.length,   icon: Clock,         color: 'bg-amber-50 text-amber-600' },
          { label: 'Overdue',   value: overdue.length,   icon: AlertTriangle, color: 'bg-red-50 text-red-600' },
          { label: 'Completed', value: completed.length, icon: CheckCircle2,  color: 'bg-emerald-50 text-emerald-600' },
        ].map(c => {
          const Icon = c.icon;
          return (
            <div key={c.label} className="stat-card flex items-center gap-4">
              <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0', c.color)}>
                <Icon className="w-6 h-6"/>
              </div>
              <div>
                <div className="text-3xl font-bold font-display text-slate-900">{c.value}</div>
                <div className="text-sm text-slate-500">{c.label}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {(['ALL', 'PENDING', 'COMPLETED'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={cn('px-4 py-2 text-sm font-medium rounded-xl transition-colors',
              filter === f ? 'bg-blue-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50')}>
            {f}
          </button>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <div className="space-y-3">{Array(4).fill(0).map((_, i) => <div key={i} className="skeleton h-16 rounded-xl"/>)}</div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 p-16 text-center">
          <FileText className="w-12 h-12 text-slate-200 mx-auto mb-3"/>
          <p className="text-slate-500 font-medium mb-1">No form submissions</p>
          <p className="text-slate-400 text-sm">Click "Send Form" to send a form to a contact</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100">
                {['Contact', 'Form', 'Sent', 'Status', 'Actions'].map(h => (
                  <th key={h} className="text-left px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map(s => {
                const isOverdue = s.status === 'PENDING' &&
                  new Date(s.createdAt).getTime() < Date.now() - 3 * 24 * 60 * 60 * 1000;
                return (
                  <tr key={s.id} className={cn('hover:bg-slate-50 transition-colors', isOverdue && 'bg-red-50/30')}>
                    <td className="px-6 py-4">
                      <div className="font-medium text-sm text-slate-800">{s.contact.name}</div>
                      <div className="text-xs text-slate-400">{s.contact.email}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-slate-700 font-medium">{s.formTemplate.name}</div>
                      <div className="text-xs text-slate-400 capitalize">{s.formTemplate.type?.toLowerCase()}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500">
                      {format(new Date(s.createdAt), 'MMM d, yyyy')}
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn('text-xs px-2.5 py-1 rounded-full font-medium border',
                        s.status === 'COMPLETED' ? 'badge-green'
                        : isOverdue ? 'badge-red' : 'badge-yellow')}>
                        {s.status === 'COMPLETED' ? '✓ Completed' : isOverdue ? '⚠ Overdue' : '⏳ Pending'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => setViewResult(s)}
                        className="flex items-center gap-1.5 text-blue-600 hover:text-blue-700 text-xs font-medium bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors">
                        <Eye className="w-3.5 h-3.5"/>
                        {s.status === 'COMPLETED' ? 'View Results' : 'View'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modals */}
      {showBuilder && (
        <BuilderModal
          onClose={() => setShowBuilder(false)}
          onSave={t => setTemplates(prev => [t, ...prev])}
        />
      )}
      {showSend && (
        <SendModal
          templates={templates}
          onClose={() => setShowSend(false)}
          onSent={load}
        />
      )}
      {viewResult && (
        <ResultsModal sub={viewResult} onClose={() => setViewResult(null)}/>
      )}
    </div>
  );
}
