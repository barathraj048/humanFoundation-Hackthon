'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { format, addDays, isSameDay, startOfDay } from 'date-fns';
import api from '@/lib/api';
import { ServiceType } from '@/types';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  Clock, MapPin, CheckCircle2, Loader2, Zap,
  Calendar, ChevronLeft, ChevronRight, User, Mail, Phone
} from 'lucide-react';

interface WorkspaceInfo {
  id: string; businessName: string; address: string; slug: string;
}

export default function BookingPage() {
  const params = useParams();
  const slug = params.workspaceSlug as string;

  const [workspace, setWorkspace] = useState<WorkspaceInfo | null>(null);
  const [services, setServices] = useState<ServiceType[]>([]);
  const [service, setService] = useState<ServiceType | null>(null);
  const [calDate, setCalDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [slots, setSlots] = useState<string[]>([]);
  const [slot, setSlot] = useState<string | null>(null);
  const [contact, setContact] = useState({ name: '', email: '', phone: '' });
  const [loading, setLoading] = useState(true);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [step, setStep] = useState<'service' | 'datetime' | 'contact' | 'confirm'>('service');

  useEffect(() => {
    api.get(`/api/public/${slug}/info`)
      .then(r => {
        setWorkspace(r.data.data.workspace);
        setServices(r.data.data.serviceTypes || []);
        if (r.data.data.serviceTypes?.length) setService(r.data.data.serviceTypes[0]);
      })
      .catch(() => toast.error('Workspace not found'))
      .finally(() => setLoading(false));
  }, [slug]);

  useEffect(() => {
    if (service && selectedDate) loadSlots();
  }, [service, selectedDate]);

  async function loadSlots() {
    if (!service || !selectedDate) return;
    setSlotsLoading(true);
    try {
      const r = await api.get(`/api/public/${slug}/availability`, {
        params: { date: format(selectedDate, 'yyyy-MM-dd'), serviceTypeId: service.id }
      });
      setSlots(r.data.data.slots || []);
    } catch { toast.error('Could not load availability'); }
    finally { setSlotsLoading(false); }
  }

  async function confirmBooking() {
    if (!service || !slot || !selectedDate) return;
    if (!contact.name || !contact.email) { toast.error('Fill name and email'); return; }
    setSubmitting(true);
    try {
      const [h, m] = slot.split(':').map(Number);
      const dt = new Date(selectedDate);
      dt.setHours(h, m, 0, 0);
      await api.post(`/api/public/${slug}/book`, {
        serviceTypeId: service.id,
        scheduledAt: dt.toISOString(),
        contact,
      });
      setSuccess(true);
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Booking failed');
    } finally { setSubmitting(false); }
  }

  // Generate calendar days for display
  const calDays = Array.from({ length: 35 }, (_, i) => {
    const d = new Date(calDate.getFullYear(), calDate.getMonth(), 1);
    d.setDate(d.getDate() - d.getDay() + 1 + i);
    return d;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  if (!workspace) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">
        <div className="text-center">
          <Zap className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <p className="text-lg font-medium">Workspace not found</p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center animate-scale-in">
          <div className="w-24 h-24 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-emerald-500/30">
            <CheckCircle2 className="w-12 h-12 text-white" />
          </div>
          <h2 className="text-3xl font-bold text-white font-display mb-3">Booking Confirmed!</h2>
          <p className="text-slate-400 mb-6">
            A confirmation has been sent to <span className="text-white font-medium">{contact.email}</span>
          </p>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5 text-left space-y-3 mb-6">
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Service</span>
              <span className="text-white font-medium">{service?.name}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Date</span>
              <span className="text-white font-medium">{selectedDate && format(selectedDate, 'MMMM d, yyyy')}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Time</span>
              <span className="text-white font-medium">{slot}</span>
            </div>
            {workspace.address && (
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Location</span>
                <span className="text-white font-medium text-right max-w-[200px]">{workspace.address}</span>
              </div>
            )}
          </div>
          <button onClick={() => { setSuccess(false); setSlot(null); setSelectedDate(null); setStep('service'); setContact({ name:'',email:'',phone:'' }); }}
            className="w-full py-3 bg-white/10 hover:bg-white/20 text-white font-medium rounded-xl transition-colors">
            Book Another Appointment
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Glow */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full bg-blue-600/8 blur-[120px]" />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="flex items-center gap-3 mb-10">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-violet-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/25">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-xl font-display">{workspace.businessName}</h1>
            {workspace.address && (
              <p className="text-slate-400 text-xs flex items-center gap-1">
                <MapPin className="w-3 h-3" />{workspace.address}
              </p>
            )}
          </div>
        </div>

        {/* Progress indicator */}
        <div className="flex items-center gap-2 mb-8">
          {(['service','datetime','contact','confirm'] as const).map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={cn(
                'h-1 rounded-full transition-all',
                step === s ? 'bg-blue-500 w-8' : i < ['service','datetime','contact','confirm'].indexOf(step) ? 'bg-emerald-500 w-6' : 'bg-white/10 w-6'
              )} />
            </div>
          ))}
          <span className="text-xs text-slate-500 ml-2">
            {step === 'service' ? 'Select service' : step === 'datetime' ? 'Choose time' : step === 'contact' ? 'Your info' : 'Confirm'}
          </span>
        </div>

        {/* Step: Service */}
        {step === 'service' && (
          <div className="animate-fade-in">
            <h2 className="text-2xl font-bold font-display mb-6">What can we help you with?</h2>
            <div className="grid sm:grid-cols-2 gap-3">
              {services.map(s => (
                <button key={s.id} onClick={() => { setService(s); setStep('datetime'); }}
                  className={cn(
                    'text-left p-5 rounded-2xl border transition-all',
                    service?.id === s.id
                      ? 'bg-blue-600/20 border-blue-500/50'
                      : 'bg-white/[0.04] border-white/10 hover:bg-white/[0.08] hover:border-white/20'
                  )}>
                  <div className="font-semibold text-lg mb-1">{s.name}</div>
                  {s.description && <div className="text-sm text-slate-400 mb-3">{s.description}</div>}
                  <div className="flex items-center gap-3 text-xs text-slate-400">
                    <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{s.durationMinutes} min</span>
                    {s.location && <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{s.location}</span>}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step: DateTime */}
        {step === 'datetime' && (
          <div className="animate-fade-in">
            <button onClick={() => setStep('service')} className="flex items-center gap-1.5 text-slate-400 hover:text-white mb-6 text-sm transition-colors">
              <ChevronLeft className="w-4 h-4" /> Back
            </button>
            <h2 className="text-2xl font-bold font-display mb-6">Pick a date and time</h2>

            <div className="grid lg:grid-cols-2 gap-6">
              {/* Calendar */}
              <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <button onClick={() => setCalDate(d => new Date(d.getFullYear(), d.getMonth()-1, 1))}
                    className="p-1.5 hover:bg-white/10 rounded-lg transition-colors">
                    <ChevronLeft className="w-4 h-4 text-slate-400" />
                  </button>
                  <span className="font-semibold">{format(calDate, 'MMMM yyyy')}</span>
                  <button onClick={() => setCalDate(d => new Date(d.getFullYear(), d.getMonth()+1, 1))}
                    className="p-1.5 hover:bg-white/10 rounded-lg transition-colors">
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </button>
                </div>
                {/* Day headers */}
                <div className="grid grid-cols-7 mb-2">
                  {['Mo','Tu','We','Th','Fr','Sa','Su'].map(d => (
                    <div key={d} className="text-center text-xs text-slate-500 py-1">{d}</div>
                  ))}
                </div>
                {/* Days */}
                <div className="grid grid-cols-7 gap-1">
                  {calDays.map((d, i) => {
                    const isCurrentMonth = d.getMonth() === calDate.getMonth();
                    const isPast = d < startOfDay(new Date());
                    const isSelected = selectedDate && isSameDay(d, selectedDate);
                    const isToday = isSameDay(d, new Date());
                    return (
                      <button key={i}
                        onClick={() => { if (!isPast && isCurrentMonth) { setSelectedDate(d); setSlot(null); } }}
                        disabled={isPast || !isCurrentMonth}
                        className={cn(
                          'h-9 w-full rounded-lg text-sm transition-all font-medium',
                          !isCurrentMonth && 'text-slate-700 cursor-default',
                          isCurrentMonth && isPast && 'text-slate-600 cursor-not-allowed',
                          isCurrentMonth && !isPast && !isSelected && 'text-slate-200 hover:bg-white/10',
                          isSelected && 'bg-blue-600 text-white shadow-lg shadow-blue-500/30',
                          isToday && !isSelected && 'ring-1 ring-blue-500/50 text-blue-400',
                        )}>
                        {format(d, 'd')}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Time slots */}
              <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-5">
                {!selectedDate ? (
                  <div className="flex flex-col items-center justify-center h-full text-slate-500">
                    <Calendar className="w-10 h-10 text-slate-700 mb-3" />
                    <p className="text-sm">Select a date to see available times</p>
                  </div>
                ) : slotsLoading ? (
                  <div className="flex flex-col items-center justify-center h-full">
                    <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-2" />
                    <p className="text-sm text-slate-400">Loading availability...</p>
                  </div>
                ) : slots.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-slate-500">
                    <Clock className="w-10 h-10 text-slate-700 mb-3" />
                    <p className="text-sm">No available times on {format(selectedDate, 'MMM d')}</p>
                    <p className="text-xs text-slate-600 mt-1">Try another date</p>
                  </div>
                ) : (
                  <div>
                    <h3 className="font-medium mb-4 text-sm text-slate-300">
                      {format(selectedDate, 'EEEE, MMMM d')}
                    </h3>
                    <div className="grid grid-cols-3 gap-2">
                      {slots.map(s => (
                        <button key={s} onClick={() => setSlot(s)}
                          className={cn(
                            'py-2.5 rounded-xl text-sm font-medium transition-all',
                            slot === s
                              ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                              : 'bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 hover:border-white/20'
                          )}>
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button onClick={() => setStep('contact')} disabled={!slot}
                className="px-8 py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-semibold rounded-xl flex items-center gap-2">
                Continue <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step: Contact */}
        {step === 'contact' && (
          <div className="animate-fade-in max-w-md">
            <button onClick={() => setStep('datetime')} className="flex items-center gap-1.5 text-slate-400 hover:text-white mb-6 text-sm transition-colors">
              <ChevronLeft className="w-4 h-4" /> Back
            </button>
            <h2 className="text-2xl font-bold font-display mb-2">Your contact information</h2>
            <p className="text-slate-400 text-sm mb-6">We'll send confirmation to your email</p>

            <div className="space-y-4">
              {[
                { label:'Full Name', key:'name', type:'text', placeholder:'John Smith', icon:User, required:true },
                { label:'Email', key:'email', type:'email', placeholder:'john@email.com', icon:Mail, required:true },
                { label:'Phone (optional)', key:'phone', type:'tel', placeholder:'+1 (555) 123-4567', icon:Phone, required:false },
              ].map(f => {
                const Icon = f.icon;
                return (
                  <div key={f.key}>
                    <label className="block text-sm font-medium text-slate-300 mb-1.5">
                      {f.label}{f.required && <span className="text-red-400 ml-1">*</span>}
                    </label>
                    <div className="relative">
                      <Icon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                      <input type={f.type} value={(contact as any)[f.key]}
                        onChange={e => setContact({ ...contact, [f.key]: e.target.value })}
                        placeholder={f.placeholder}
                        className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                    </div>
                  </div>
                );
              })}
            </div>

            <button onClick={() => { if (!contact.name||!contact.email) { toast.error('Name and email required'); return; } setStep('confirm'); }}
              className="w-full mt-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl flex items-center justify-center gap-2">
              Review Booking <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Step: Confirm */}
        {step === 'confirm' && (
          <div className="animate-fade-in max-w-md">
            <button onClick={() => setStep('contact')} className="flex items-center gap-1.5 text-slate-400 hover:text-white mb-6 text-sm transition-colors">
              <ChevronLeft className="w-4 h-4" /> Back
            </button>
            <h2 className="text-2xl font-bold font-display mb-6">Confirm your booking</h2>

            <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-6 space-y-4 mb-6">
              {[
                { label:'Service', value: service?.name },
                { label:'Date', value: selectedDate ? format(selectedDate, 'EEEE, MMMM d, yyyy') : '—' },
                { label:'Time', value: slot || '—' },
                { label:'Duration', value: `${service?.durationMinutes} minutes` },
                { label:'Location', value: workspace.address || service?.location || 'Contact for details' },
                { label:'Name', value: contact.name },
                { label:'Email', value: contact.email },
                contact.phone && { label:'Phone', value: contact.phone },
              ].filter(Boolean).map((r: any) => (
                <div key={r.label} className="flex items-start justify-between gap-4">
                  <span className="text-slate-400 text-sm flex-shrink-0">{r.label}</span>
                  <span className="text-white text-sm font-medium text-right">{r.value}</span>
                </div>
              ))}
            </div>

            <button onClick={confirmBooking} disabled={submitting}
              className="w-full py-4 bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 disabled:opacity-50 text-white font-bold rounded-xl flex items-center justify-center gap-2 text-base shadow-xl shadow-blue-500/25">
              {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
              {submitting ? 'Confirming...' : 'Confirm Booking'}
            </button>
            <p className="text-center text-xs text-slate-500 mt-3">
              You'll receive a confirmation email immediately
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
