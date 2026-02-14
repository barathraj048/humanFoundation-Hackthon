'use client';
import Link from 'next/link';
import { ArrowRight, Calendar, MessageSquare, Users, Package, Zap, BarChart3, CheckCircle } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#070b14] text-white overflow-hidden">
      {/* Ambient glow */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] rounded-full bg-blue-600/10 blur-[120px]" />
        <div className="absolute top-40 right-1/4 w-[400px] h-[400px] rounded-full bg-violet-600/10 blur-[100px]" />
      </div>

      {/* Nav */}
      <nav className="relative z-10 max-w-7xl mx-auto px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-violet-600 rounded-lg flex items-center justify-center">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <span className="text-xl font-bold font-display">CareOps</span>
        </div>
        <div className="flex gap-3">
          <Link href="/login" className="px-5 py-2 text-sm text-slate-300 hover:text-white transition-colors">
            Sign in
          </Link>
          <Link href="/register"
            className="px-5 py-2 text-sm bg-blue-600 hover:bg-blue-500 rounded-xl font-medium transition-colors flex items-center gap-2">
            Get started free <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 pt-24 pb-20 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm mb-8">
          <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
          Unified operations for service businesses
        </div>
        <h1 className="text-6xl md:text-7xl font-bold font-display leading-[1.05] mb-6">
          One platform.<br />
          <span className="text-gradient">Zero chaos.</span>
        </h1>
        <p className="text-lg text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
          Stop juggling 6 different tools. CareOps brings your bookings, leads,
          inbox, forms, and inventory into one powerful dashboard.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/register"
            className="px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-semibold text-base transition-all hover:shadow-xl hover:shadow-blue-500/25 flex items-center gap-2 justify-center">
            Start free trial <ArrowRight className="w-5 h-5" />
          </Link>
          <Link href="/book/demo"
            className="px-8 py-4 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-2xl font-semibold text-base transition-all flex items-center gap-2 justify-center">
            See live demo
          </Link>
        </div>

        {/* Stats bar */}
        <div className="mt-20 grid grid-cols-3 gap-px bg-white/5 rounded-2xl overflow-hidden border border-white/10 max-w-2xl mx-auto">
          {[
            { value: '10x', label: 'Faster setup' },
            { value: '0', label: 'Missed bookings' },
            { value: '100%', label: 'Automated follow-ups' },
          ].map((s) => (
            <div key={s.label} className="bg-white/[0.02] px-8 py-6">
              <div className="text-3xl font-bold font-display text-white">{s.value}</div>
              <div className="text-sm text-slate-400 mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features grid */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 py-24">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold font-display mb-4">Everything in one place</h2>
          <p className="text-slate-400 text-lg">Replace your stack of disconnected tools with one smart platform</p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            { icon: Calendar, color: 'blue', title: 'Smart Bookings', desc: 'Public booking page with real-time availability. Prevents double-bookings automatically. Syncs to Google Calendar.' },
            { icon: MessageSquare, color: 'violet', title: 'Unified Inbox', desc: 'Email and SMS in one thread per customer. Smart automation pauses when your team replies.' },
            { icon: Users, color: 'emerald', title: 'Lead Pipeline', desc: 'Every contact form submission becomes a lead. Track status from new → booked → completed automatically.' },
            { icon: BarChart3, color: 'orange', title: 'Business Analytics', desc: 'Conversion rates, no-show tracking, booking trends. Know your business at a glance.' },
            { icon: Package, color: 'pink', title: 'Inventory Alerts', desc: 'Track supplies and get automated vendor alerts before you run out. Never be caught unprepared.' },
            { icon: Zap, color: 'yellow', title: 'Event Automation', desc: 'Welcome messages, booking confirmations, form reminders. All automated. All configurable.' },
          ].map((f) => {
            const Icon = f.icon;
            const colorMap: Record<string, string> = {
              blue: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
              violet: 'text-violet-400 bg-violet-500/10 border-violet-500/20',
              emerald: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
              orange: 'text-orange-400 bg-orange-500/10 border-orange-500/20',
              pink: 'text-pink-400 bg-pink-500/10 border-pink-500/20',
              yellow: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
            };
            return (
              <div key={f.title}
                className="bg-white/[0.03] border border-white/8 rounded-2xl p-6 hover:bg-white/[0.06] transition-colors group">
                <div className={`w-10 h-10 rounded-xl border flex items-center justify-center mb-4 ${colorMap[f.color]}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="font-semibold text-lg mb-2 font-display">{f.title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{f.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* CTA */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 py-24">
        <div className="bg-gradient-to-r from-blue-600/20 to-violet-600/20 border border-white/10 rounded-3xl p-16 text-center">
          <h2 className="text-5xl font-bold font-display mb-4">Ready to take control?</h2>
          <p className="text-slate-400 text-lg mb-8 max-w-xl mx-auto">
            Get your entire operation running in under 60 seconds. No credit card required.
          </p>
          <Link href="/register"
            className="inline-flex items-center gap-2 px-8 py-4 bg-white text-slate-900 rounded-2xl font-bold text-base hover:bg-slate-100 transition-colors">
            Start for free <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      <footer className="relative z-10 text-center py-8 text-slate-600 text-sm">
        © 2024 CareOps · Built for service businesses
      </footer>
    </div>
  );
}
