'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Loader2, Zap, Eye, EyeOff, CheckCircle } from 'lucide-react';
import api from '@/lib/api';
import { setToken, useStore } from '@/store/useStore';

const schema = z.object({
  businessName: z.string().min(3, 'Min 3 characters'),
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'Min 8 characters'),
});
type Form = z.infer<typeof schema>;

const perks = [
  'Booking page live in 60 seconds',
  'Automated welcome & confirmation emails',
  'Full inbox for email & SMS',
  'Real-time business dashboard',
];

export default function RegisterPage() {
  const router = useRouter();
  const { setUser, setWorkspace } = useStore();
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<Form>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: Form) => {
    setLoading(true);
    try {
      const res = await api.post('/api/auth/register', data);
      const { user, workspace, token } = res.data.data;
      setToken(token);
      setUser(user);
      setWorkspace(workspace);
      toast.success('Account created! Let\'s set up your workspace.');
      router.push('/onboarding');
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex">
      {/* Left - perk panel */}
      <div className="hidden lg:flex w-1/2 bg-gradient-to-br from-blue-600/20 to-violet-600/10 border-r border-white/5 flex-col justify-center px-16">
        <div className="flex items-center gap-2 mb-12">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-violet-600 rounded-xl flex items-center justify-center">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold text-white font-display">CareOps</span>
        </div>
        <h2 className="text-4xl font-bold text-white font-display mb-4 leading-tight">
          Your entire operation.<br />One platform.
        </h2>
        <p className="text-slate-400 mb-10 leading-relaxed">
          Service businesses that use CareOps spend 70% less time on admin and never miss a lead.
        </p>
        <div className="space-y-4">
          {perks.map((p) => (
            <div key={p} className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0" />
              <span className="text-slate-300 text-sm">{p}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right - form */}
      <div className="flex-1 flex items-center justify-center px-8 relative">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[400px] h-[300px] rounded-full bg-blue-600/8 blur-[100px]" />
        </div>

        <div className="w-full max-w-md relative z-10 animate-fade-in">
          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-violet-600 rounded-lg flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="text-lg font-bold text-white font-display">CareOps</span>
          </div>

          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white font-display">Create account</h1>
            <p className="text-slate-400 text-sm mt-2">Set up your workspace in under 60 seconds</p>
          </div>

          <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-8">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Business Name</label>
                <input
                  {...register('businessName')}
                  placeholder="Acme Wellness Clinic"
                  className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
                {errors.businessName && <p className="text-red-400 text-xs mt-1">{errors.businessName.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Work Email</label>
                <input
                  {...register('email')}
                  type="email"
                  placeholder="you@business.com"
                  className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
                {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Password</label>
                <div className="relative">
                  <input
                    {...register('password')}
                    type={showPw ? 'text' : 'password'}
                    placeholder="Min 8 characters"
                    className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all pr-10"
                  />
                  <button type="button" onClick={() => setShowPw(!showPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200">
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.password && <p className="text-red-400 text-xs mt-1">{errors.password.message}</p>}
              </div>

              <button type="submit" disabled={loading}
                className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2">
                {loading
                  ? <><Loader2 className="w-4 h-4 animate-spin" />Creating account...</>
                  : 'Create free account'}
              </button>
            </form>
          </div>

          <p className="text-center text-sm text-slate-500 mt-6">
            Already have an account?{' '}
            <Link href="/login" className="text-blue-400 hover:text-blue-300 font-medium">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
