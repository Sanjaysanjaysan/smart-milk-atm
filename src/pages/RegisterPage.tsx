import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { Lock, Mail, User, Eye, EyeOff, ArrowRight, Droplets, CheckCircle2 } from 'lucide-react';

export const RegisterPage: React.FC = () => {
  const { register, loginWithGoogle } = useAuth();
  const { navigateTo, addToast } = useApp();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (!agreeTerms) {
      setError('Please agree to the Terms & Conditions and BYOC Container Policy');
      return;
    }

    setLoading(true);
    const res = await register(fullName, email, password);
    setLoading(false);

    if (res.success) {
      addToast(
        'success',
        res.usedFirebase ? 'Firebase Account Created!' : 'Account Created!',
        res.usedFirebase
          ? 'Welcome to Smart Milk ATM. A verification email has been sent.'
          : 'Welcome to the Smart Milk ATM eco-community.'
      );
      navigateTo('buy-milk');
    } else {
      setError(res.error || 'Registration failed');
    }
  };

  const handleGoogleRegister = async () => {
    setError(null);
    setLoading(true);
    const res = await loginWithGoogle();
    setLoading(false);
    if (res.success && res.user) {
      addToast('success', 'Signed In via Google', `Welcome, ${res.user.fullName}!`);
      if (res.user.role === 'admin') navigateTo('admin-dashboard');
      else if (res.user.role === 'staff') navigateTo('staff-dashboard');
      else navigateTo('customer-dashboard');
    } else {
      setError(res.error || 'Google authentication failed.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-16 px-4 flex flex-col items-center justify-center">
      <div className="max-w-md w-full bg-white rounded-3xl border border-slate-200/90 shadow-xl p-8 space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center mx-auto shadow-md">
            <Droplets className="w-6 h-6 fill-current" />
          </div>
          <h1 className="text-2xl font-black text-slate-900">Create an Account</h1>
          <p className="text-xs text-slate-500">Join the zero-plastic milk dispensing movement</p>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          <div>
            <label className="block text-slate-700 font-bold mb-1">Full Name</label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Ramesh Patel"
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-700 font-bold mb-1">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ramesh@example.com"
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-700 font-bold mb-1">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-10 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-emerald-500"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-slate-700 font-bold mb-1">Confirm Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-emerald-500"
              />
            </div>
          </div>

          <label className="flex items-start gap-2 pt-1 text-slate-600 text-[11px] cursor-pointer">
            <input
              type="checkbox"
              checked={agreeTerms}
              onChange={(e) => setAgreeTerms(e.target.checked)}
              className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500"
            />
            <span>
              I agree to the{' '}
              <button
                type="button"
                onClick={() => navigateTo('terms')}
                className="text-emerald-700 font-bold underline"
              >
                Terms and Conditions
              </button>{' '}
              and confirm I will bring clean, sanitized food-grade containers.
            </span>
          </label>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl transition shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-2"
          >
            {loading ? 'Creating Account...' : 'Register'}
            <ArrowRight className="w-4 h-4" />
          </button>

          <div className="relative py-2">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-[10px] uppercase font-bold tracking-wider">
              <span className="bg-white px-2.5 text-slate-400">Or Register with Google</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleGoogleRegister}
            disabled={loading}
            className="w-full py-2.5 px-4 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 font-bold text-xs flex items-center justify-center gap-2.5 transition cursor-pointer disabled:opacity-50"
          >
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
              <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z" />
              <path fill="#34A853" d="M12 24c3.3 0 6.08-1.09 8.11-2.96l-3.88-3.05c-1.08.72-2.46 1.15-4.23 1.15-3.25 0-6-2.19-6.98-5.14H1.01v3.14C3.05 21.2 7.21 24 12 24Z" />
              <path fill="#FBBC05" d="M5.02 14c-.25-.72-.39-1.49-.39-2.29s.14-1.57.39-2.29V6.28H1.01C.37 7.56 0 9.01 0 11.71s.37 4.15 1.01 5.43L5.02 14Z" />
              <path fill="#EA4335" d="M12 4.75c1.79 0 3.41.62 4.68 1.83l3.51-3.51C18.07 1.08 15.29 0 12 0 7.21 0 3.05 2.8 1.01 6.28l4.01 3.14C6 6.94 8.75 4.75 12 4.75Z" />
            </svg>
            <span>Continue with Google (Firebase Auth)</span>
          </button>
        </form>

        <div className="text-center text-xs text-slate-500 pt-2">
          Already have an account?{' '}
          <button
            onClick={() => navigateTo('login')}
            className="text-emerald-700 font-bold hover:underline"
          >
            Sign in
          </button>
        </div>
      </div>
    </div>
  );
};
