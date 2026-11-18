import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { Mail, ArrowRight, ArrowLeft, Droplets, CheckCircle2 } from 'lucide-react';

export const ForgotPasswordPage: React.FC = () => {
  const { resetPassword } = useAuth();
  const { navigateTo, addToast } = useApp();

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setLoading(true);
    const res = await resetPassword(email);
    setLoading(false);

    if (res.success) {
      setSuccessMessage(res.message);
      addToast('success', 'Reset Dispatched', 'Password reset instructions sent.');
    } else {
      setErrorMessage(res.message);
      addToast('error', 'Reset Notice', res.message);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-16 px-4 flex flex-col items-center justify-center">
      <div className="max-w-md w-full bg-white rounded-3xl border border-slate-200/90 shadow-xl p-8 space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center mx-auto shadow-md">
            <Droplets className="w-6 h-6 fill-current" />
          </div>
          <h1 className="text-2xl font-black text-slate-900">Reset Your Password</h1>
          <p className="text-xs text-slate-500">
            Enter your registered email address and we'll send you recovery instructions.
          </p>
        </div>

        {errorMessage && (
          <div className="p-3.5 bg-amber-50 border border-amber-200 text-amber-900 text-xs rounded-2xl">
            {errorMessage}
          </div>
        )}

        {successMessage ? (
          <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs rounded-2xl space-y-3">
            <div className="flex items-center gap-2 font-bold text-emerald-800">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Reset Link Sent
            </div>
            <p className="leading-relaxed">{successMessage}</p>
            <button
              onClick={() => navigateTo('login')}
              className="w-full bg-slate-900 text-white font-bold py-2 rounded-xl transition text-xs mt-2"
            >
              Back to Login
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div>
              <label className="block text-slate-700 font-bold mb-1">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="customer@example.com"
                  className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-emerald-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl transition shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? 'Sending Instructions...' : 'Send Password Reset Link'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}

        <div className="text-center text-xs pt-2">
          <button
            onClick={() => navigateTo('login')}
            className="text-slate-600 font-bold hover:text-slate-900 flex items-center gap-1.5 mx-auto"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Sign In
          </button>
        </div>
      </div>
    </div>
  );
};
