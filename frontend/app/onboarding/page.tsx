'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/store/useStore';
import api from '@/lib/api';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  Check, ChevronRight, Loader2, Zap, Building2,
  Mail, Briefcase, Clock, Users, CheckCircle2, Plus, X, AlertCircle
} from 'lucide-react';

const STEPS = [
  { id: 0, label: 'Business', icon: Building2 },
  { id: 1, label: 'Email', icon: Mail },
  { id: 2, label: 'Services', icon: Briefcase },
  { id: 3, label: 'Availability', icon: Clock },
  { id: 4, label: 'Launch', icon: CheckCircle2 },
];
const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
const HOURS = Array.from({length: 24}, (_, i) => `${String(i).padStart(2,'0')}:00`);
const TIMEZONES = ['America/New_York','America/Chicago','America/Los_Angeles','UTC','Europe/London','Asia/Kolkata'];

export default function OnboardingPage() {
  const router = useRouter();
  const { workspace } = useStore();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);

  // Step 0 - business
  const [biz, setBiz] = useState({
    businessName: workspace?.businessName || '',
    address: '', timezone: 'America/New_York', contactEmail: ''
  });

  // Step 1 - email
  const [apiKey, setApiKey] = useState('');
  const [tested, setTested] = useState(false);
  const [testing, setTesting] = useState(false);

  // Step 2 - services
  const [services, setServices] = useState<any[]>([]);
  const [svcForm, setSvcForm] = useState({ name:'', description:'', durationMinutes:30, location:'' });
  const [showSvcForm, setShowSvcForm] = useState(false);

  // Step 3 - availability
  const [avail, setAvail] = useState<any[]>([]);
  const isDayOn = (d: number) => avail.some(a => a.dayOfWeek === d);
  function toggleDay(d: number, on: boolean) {
    if (on) setAvail(a => [...a, { dayOfWeek: d, startTime: '09:00', endTime: '17:00' }]);
    else setAvail(a => a.filter(x => x.dayOfWeek !== d));
  }
  function updateAvail(d: number, key: string, val: string) {
    setAvail(a => a.map(x => x.dayOfWeek === d ? { ...x, [key]: val } : x));
  }

  async function testEmail() {
    if (!apiKey) return;
    setTesting(true);
    try {
      await api.put(`/api/workspaces/${workspace?.id}/integrations`, {
        type:'EMAIL', provider:'resend', config:{ apiKey }
      });
      setTested(true);
      toast.success('Email connected!');
    } catch { toast.error('Invalid API key or connection failed'); }
    finally { setTesting(false); }
  }

  function addService() {
    if (!svcForm.name) return;
    setServices(s => [...s, { ...svcForm, id: Date.now() }]);
    setSvcForm({ name:'', description:'', durationMinutes:30, location:'' });
    setShowSvcForm(false);
  }

  async function launch() {
    setLoading(true);
    try {
      // Save services
      for (const s of services) {
        await api.post(`/api/workspaces/${workspace?.id}/service-types`, {
          name: s.name, description: s.description,
          durationMinutes: s.durationMinutes, location: s.location
        });
      }
      // Save availability
      if (avail.length) await api.post(`/api/workspaces/${workspace?.id}/availability`, avail);
      // Activate
      await api.put(`/api/workspaces/${workspace?.id}/activate`);
      toast.success('🎉 Workspace is live!');
      router.push('/dashboard/overview');
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Activation failed');
    } finally { setLoading(false); }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Glow */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] rounded-full bg-blue-600/8 blur-[100px]" />
      </div>

      <div className="relative z-10 max-w-3xl mx-auto px-6 py-10">
        {/* Logo */}
        <div className="flex items-center gap-2 mb-12">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-violet-600 rounded-xl flex items-center justify-center">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold font-display text-lg">CareOps</span>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-10">
          {STEPS.map((s, i) => {
            const done = i < step;
            const active = i === step;
            const Icon = s.icon;
            return (
              <div key={s.id} className="flex items-center gap-2">
                <div className={cn(
                  'w-9 h-9 rounded-full flex items-center justify-center transition-all font-medium text-sm',
                  done ? 'bg-emerald-500 text-white' : active ? 'bg-blue-600 text-white ring-4 ring-blue-500/30' : 'bg-white/10 text-slate-400'
                )}>
                  {done ? <Check className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                </div>
                <span className={cn('text-sm hidden sm:block', active ? 'text-white font-medium' : 'text-slate-500')}>
                  {s.label}
                </span>
                {i < STEPS.length - 1 && (
                  <div className={cn('h-0.5 w-8 sm:w-12 mx-1 rounded', i < step ? 'bg-emerald-500' : 'bg-white/10')} />
                )}
              </div>
            );
          })}
        </div>

        {/* Step content */}
        <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-8 animate-fade-in">

          {/* Step 0: Business */}
          {step === 0 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-2xl font-bold font-display mb-1">Tell us about your business</h2>
                <p className="text-slate-400 text-sm">This info appears on your booking page</p>
              </div>
              {[
                { label:'Business Name', key:'businessName', type:'text', placeholder:'Acme Wellness Clinic', required:true },
                { label:'Business Address', key:'address', type:'text', placeholder:'123 Main St, City, State 12345', required:true },
                { label:'Contact Email', key:'contactEmail', type:'email', placeholder:'contact@business.com', required:true },
              ].map(f => (
                <div key={f.key}>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">
                    {f.label}{f.required && <span className="text-red-400 ml-1">*</span>}
                  </label>
                  <input type={f.type} value={(biz as any)[f.key]}
                    onChange={e => setBiz({ ...biz, [f.key]: e.target.value })}
                    placeholder={f.placeholder}
                    className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                </div>
              ))}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Timezone</label>
                <select value={biz.timezone} onChange={e => setBiz({ ...biz, timezone: e.target.value })}
                  className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                  {TIMEZONES.map(tz => <option key={tz} value={tz} className="bg-slate-900">{tz}</option>)}
                </select>
              </div>
              <button onClick={() => { if (!biz.businessName||!biz.address||!biz.contactEmail) { toast.error('Fill required fields'); return; } setStep(1); }}
                className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl flex items-center justify-center gap-2">
                Continue <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Step 1: Email */}
          {step === 1 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-2xl font-bold font-display mb-1">Connect your email</h2>
                <p className="text-slate-400 text-sm">Send automated confirmations and reminders</p>
              </div>
              <div className="flex items-start gap-3 p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                <AlertCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-300">
                  Get your free API key from{' '}
                  <a href="https://resend.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-blue-400 underline">resend.com/api-keys</a>.
                  Free plan allows 3,000 emails/month.
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Resend API Key</label>
                <input type="password" value={apiKey} onChange={e => { setApiKey(e.target.value); setTested(false); }}
                  placeholder="re_xxxxxxxxxxxxxxxx"
                  className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
              </div>
              <button onClick={testEmail} disabled={testing || !apiKey}
                className={cn('w-full py-2.5 rounded-xl font-medium text-sm flex items-center justify-center gap-2 transition-all',
                  tested ? 'bg-emerald-500 text-white' : 'bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10')}>
                {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : tested ? <CheckCircle2 className="w-4 h-4" /> : <Mail className="w-4 h-4" />}
                {testing ? 'Testing...' : tested ? 'Connected!' : 'Test Connection'}
              </button>
              <div className="flex gap-3">
                <button onClick={() => setStep(0)} className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-slate-300 font-semibold rounded-xl">Back</button>
                <button onClick={() => setStep(2)} disabled={!tested}
                  className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-semibold rounded-xl flex items-center justify-center gap-2">
                  Continue <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Services */}
          {step === 2 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-2xl font-bold font-display mb-1">Add your services</h2>
                <p className="text-slate-400 text-sm">What do you offer? Add at least one service.</p>
              </div>
              <div className="space-y-2">
                {services.map(s => (
                  <div key={s.id} className="flex items-center justify-between p-3 bg-white/5 border border-white/10 rounded-xl">
                    <div>
                      <div className="font-medium text-sm">{s.name}</div>
                      <div className="text-xs text-slate-400">{s.durationMinutes} min{s.location && ` · ${s.location}`}</div>
                    </div>
                    <button onClick={() => setServices(sv => sv.filter(x => x.id !== s.id))}
                      className="text-slate-500 hover:text-red-400 transition-colors">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
              {showSvcForm ? (
                <div className="p-4 bg-white/5 border border-white/10 rounded-xl space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label:'Service Name', key:'name', type:'text', span:2 },
                      { label:'Duration (min)', key:'durationMinutes', type:'number', span:1 },
                      { label:'Location (optional)', key:'location', type:'text', span:1 },
                    ].map(f => (
                      <div key={f.key} className={f.span===2 ? 'col-span-2' : ''}>
                        <label className="block text-xs font-medium text-slate-400 mb-1">{f.label}</label>
                        <input type={f.type} value={(svcForm as any)[f.key]}
                          onChange={e => setSvcForm({ ...svcForm, [f.key]: f.type==='number' ? +e.target.value : e.target.value })}
                          className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={addService} disabled={!svcForm.name}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-sm font-medium rounded-lg">Add</button>
                    <button onClick={() => setShowSvcForm(false)}
                      className="px-4 py-2 bg-white/5 hover:bg-white/10 text-slate-300 text-sm font-medium rounded-lg">Cancel</button>
                  </div>
                </div>
              ) : (
                <button onClick={() => setShowSvcForm(true)}
                  className="w-full py-2.5 border border-dashed border-white/20 rounded-xl text-slate-400 hover:text-slate-200 hover:border-white/40 text-sm flex items-center justify-center gap-2 transition-colors">
                  <Plus className="w-4 h-4" /> Add Service
                </button>
              )}
              <div className="flex gap-3">
                <button onClick={() => setStep(1)} className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-slate-300 font-semibold rounded-xl">Back</button>
                <button onClick={() => { if (!services.length) { toast.error('Add at least one service'); return; } setStep(3); }}
                  className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl flex items-center justify-center gap-2">
                  Continue <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Availability */}
          {step === 3 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-2xl font-bold font-display mb-1">Set your availability</h2>
                <p className="text-slate-400 text-sm">When can customers book with you?</p>
              </div>
              <div className="space-y-2">
                {DAYS.map((day, i) => {
                  const on = isDayOn(i === 6 ? 0 : i + 1);
                  const rule = avail.find(a => a.dayOfWeek === (i === 6 ? 0 : i + 1));
                  const dayNum = i === 6 ? 0 : i + 1;
                  return (
                    <div key={day} className={cn('flex items-center gap-4 p-3 rounded-xl border transition-colors',
                      on ? 'bg-white/5 border-white/10' : 'border-transparent')}>
                      <div className="flex items-center gap-3 w-32">
                        <input type="checkbox" id={`d${dayNum}`} checked={on} onChange={e => toggleDay(dayNum, e.target.checked)}
                          className="w-4 h-4 rounded accent-blue-600 cursor-pointer" />
                        <label htmlFor={`d${dayNum}`} className={cn('text-sm font-medium cursor-pointer', on ? 'text-white' : 'text-slate-500')}>
                          {day}
                        </label>
                      </div>
                      {on && rule && (
                        <div className="flex items-center gap-2">
                          <select value={rule.startTime} onChange={e => updateAvail(dayNum, 'startTime', e.target.value)}
                            className="px-2 py-1 bg-white/10 border border-white/10 rounded-lg text-sm text-white focus:outline-none">
                            {HOURS.map(h => <option key={h} value={h} className="bg-slate-900">{h}</option>)}
                          </select>
                          <span className="text-slate-500 text-sm">to</span>
                          <select value={rule.endTime} onChange={e => updateAvail(dayNum, 'endTime', e.target.value)}
                            className="px-2 py-1 bg-white/10 border border-white/10 rounded-lg text-sm text-white focus:outline-none">
                            {HOURS.map(h => <option key={h} value={h} className="bg-slate-900">{h}</option>)}
                          </select>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="flex gap-3">
                <button onClick={() => setStep(2)} className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-slate-300 font-semibold rounded-xl">Back</button>
                <button onClick={() => { if (!avail.length) { toast.error('Select at least one day'); return; } setStep(4); }}
                  className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl flex items-center justify-center gap-2">
                  Continue <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Launch */}
          {step === 4 && (
            <div className="text-center space-y-6">
              <div className="w-20 h-20 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-3xl flex items-center justify-center mx-auto shadow-2xl shadow-emerald-500/30">
                <CheckCircle2 className="w-10 h-10 text-white" />
              </div>
              <div>
                <h2 className="text-3xl font-bold font-display mb-2">You're ready to launch!</h2>
                <p className="text-slate-400">Everything is configured. Activate your workspace to go live.</p>
              </div>
              <div className="text-left space-y-2 bg-white/5 border border-white/10 rounded-2xl p-5">
                {[
                  { label: 'Business Name', value: biz.businessName },
                  { label: 'Email Integration', value: tested ? 'Resend (connected)' : '—' },
                  { label: 'Services', value: `${services.length} service${services.length !== 1 ? 's' : ''} added` },
                  { label: 'Availability', value: `${avail.length} day${avail.length !== 1 ? 's' : ''} configured` },
                ].map(r => (
                  <div key={r.label} className="flex items-center justify-between text-sm">
                    <span className="text-slate-400">{r.label}</span>
                    <span className="font-medium text-white flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5 text-emerald-400" />{r.value}
                    </span>
                  </div>
                ))}
              </div>
              <div className="flex gap-3">
                <button onClick={() => setStep(3)} className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-slate-300 font-semibold rounded-xl">Back</button>
                <button onClick={launch} disabled={loading}
                  className="flex-2 px-8 py-3 bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 disabled:opacity-50 text-white font-bold rounded-xl flex items-center justify-center gap-2">
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5" />}
                  Activate Workspace
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
