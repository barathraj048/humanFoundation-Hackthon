'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { CheckCircle2, Loader2 } from 'lucide-react';

interface Field {
  id: string; label: string; type: string;
  required?: boolean; options?: string[]; placeholder?: string;
}
interface PublicForm {
  id: string; status: string;
  formTemplate: { name: string; type: string; fields: Field[] };
  contact: { name: string };
  workspace: { businessName: string };
}

export default function PublicFormPage() {
  const { id } = useParams<{ id: string }>();
  const [form, setForm]       = useState<PublicForm | null>(null);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted]   = useState(false);
  const [error, setError]     = useState('');

  const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  useEffect(() => {
    fetch(`${API}/api/forms/public/${id}`)
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          setForm(d.data);
          if (d.data.status === 'COMPLETED') setSubmitted(true);
        } else setError('Form not found');
      })
      .catch(() => setError('Failed to load form'))
      .finally(() => setLoading(false));
  }, [id]);

  function setAnswer(fieldId: string, value: any) {
    setAnswers(prev => ({ ...prev, [fieldId]: value }));
  }

  function toggleMulti(fieldId: string, option: string) {
    setAnswers(prev => {
      const current: string[] = prev[fieldId] || [];
      return {
        ...prev,
        [fieldId]: current.includes(option)
          ? current.filter(o => o !== option)
          : [...current, option],
      };
    });
  }

  async function handleSubmit() {
    // Validate required fields
    const fields: Field[] = form?.formTemplate.fields || [];
    for (const f of fields) {
      if (f.required) {
        const val = answers[f.id];
        if (!val || (Array.isArray(val) && val.length === 0)) {
          setError(`"${f.label}" is required`);
          return;
        }
      }
    }
    setError('');
    setSubmitting(true);
    try {
      const r = await fetch(`${API}/api/forms/public/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: answers }),
      });
      const d = await r.json();
      if (d.success) setSubmitted(true);
      else setError(d.error || 'Submission failed');
    } catch {
      setError('Network error — please try again');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-violet-50 flex items-center justify-center">
      <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
    </div>
  );

  if (error && !form) return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-violet-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-8 text-center shadow-sm max-w-sm w-full">
        <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-2xl">❌</span>
        </div>
        <h2 className="font-semibold text-slate-800 mb-2">Form Not Found</h2>
        <p className="text-slate-500 text-sm">{error}</p>
      </div>
    </div>
  );

  if (submitted) return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-violet-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-10 text-center shadow-sm max-w-sm w-full">
        <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-5">
          <CheckCircle2 className="w-8 h-8 text-emerald-500" />
        </div>
        <h2 className="text-xl font-bold text-slate-800 mb-2">Form Submitted!</h2>
        <p className="text-slate-500 text-sm">
          Thank you, <strong>{form?.contact.name}</strong>. Your response has been received by{' '}
          <strong>{form?.workspace.businessName}</strong>.
        </p>
      </div>
    </div>
  );

  const fields: Field[] = form?.formTemplate.fields || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-violet-50 py-10 px-4">
      <div className="max-w-xl mx-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-violet-600 rounded-2xl p-6 text-center mb-6 shadow-sm">
          <p className="text-blue-100 text-xs uppercase tracking-widest mb-1">{form?.workspace.businessName}</p>
          <h1 className="text-white text-xl font-bold">{form?.formTemplate.name}</h1>
        </div>

        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100">
            <p className="text-slate-600 text-sm">
              Hi <strong>{form?.contact.name}</strong>, please fill in the form below.
              Fields marked <span className="text-red-500">*</span> are required.
            </p>
          </div>

          <div className="p-6 space-y-6">
            {fields.map(field => (
              <div key={field.id}>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  {field.label}
                  {field.required && <span className="text-red-500 ml-1">*</span>}
                </label>

                {/* TEXT */}
                {field.type === 'text' && (
                  <input
                    type="text"
                    placeholder={field.placeholder || ''}
                    value={answers[field.id] || ''}
                    onChange={e => setAnswer(field.id, e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                )}

                {/* TEXTAREA */}
                {field.type === 'textarea' && (
                  <textarea
                    rows={3}
                    placeholder={field.placeholder || ''}
                    value={answers[field.id] || ''}
                    onChange={e => setAnswer(field.id, e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  />
                )}

                {/* SELECT (single dropdown) */}
                {field.type === 'select' && (
                  <select
                    value={answers[field.id] || ''}
                    onChange={e => setAnswer(field.id, e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                  >
                    <option value="">Select an option</option>
                    {(field.options || []).map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                )}

                {/* MULTISELECT — checkbox group */}
                {field.type === 'multiselect' && (
                  <div className="space-y-2">
                    {(field.options || []).map(opt => {
                      const selected = (answers[field.id] || []).includes(opt);
                      return (
                        <label key={opt}
                          className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                            selected ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-slate-300'
                          }`}>
                          <input
                            type="checkbox"
                            checked={selected}
                            onChange={() => toggleMulti(field.id, opt)}
                            className="w-4 h-4 text-blue-600 rounded"
                          />
                          <span className="text-sm text-slate-700">{opt}</span>
                        </label>
                      );
                    })}
                    {(answers[field.id]?.length > 0) && (
                      <p className="text-xs text-blue-600">{answers[field.id].length} selected</p>
                    )}
                  </div>
                )}

                {/* CHECKBOX (single yes/no) */}
                {field.type === 'checkbox' && (
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!!answers[field.id]}
                      onChange={e => setAnswer(field.id, e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    <span className="text-sm text-slate-600">{field.placeholder || 'Yes'}</span>
                  </label>
                )}

                {/* DATE */}
                {field.type === 'date' && (
                  <input
                    type="date"
                    value={answers[field.id] || ''}
                    onChange={e => setAnswer(field.id, e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                )}
              </div>
            ))}

            {error && (
              <div className="bg-red-50 border border-red-100 text-red-600 text-sm px-4 py-3 rounded-xl">
                {error}
              </div>
            )}

            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {submitting ? 'Submitting...' : 'Submit Form'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
