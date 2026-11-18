import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import {
  Lock,
  Mail,
  Eye,
  EyeOff,
  ArrowRight,
  Droplets,
  ShieldCheck,
  User,
  Wrench,
  KeyRound,
  Sparkles,
  AlertCircle,
  Clock,
  Phone,
} from 'lucide-react';
import { UserRole } from '../types';

export const LoginPage: React.FC = () => {
  const { login, loginWithGoogle, loginAsDemoUser, registerAdminWithInvite } = useAuth();
  const { navigateTo, addToast } = useApp();

  // Active role tab for UI presentation
  const [activeTab, setActiveTab] = useState<UserRole>('customer');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Admin invite token registration modal/toggle
  const [showAdminInviteForm, setShowAdminInviteForm] = useState(false);
  const [adminFullName, setAdminFullName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPhone, setAdminPhone] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminInviteToken, setAdminInviteToken] = useState('INV-ADM-DEMO2026');
  const [adminRegisterLoading, setAdminRegisterLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await login(email, password);
    setLoading(false);

    if (res.success && res.user) {
      addToast('success', 'Authentication Successful', `Welcome back, ${res.user.fullName}!`);
      // Strict role-based redirect based entirely on backend-verified role
      if (res.user.role === 'admin') {
        navigateTo('admin-dashboard');
      } else if (res.user.role === 'staff') {
        navigateTo('staff-dashboard');
      } else {
        navigateTo('customer-dashboard');
      }
    } else {
      setError(res.error || 'Authentication failed. Please verify your credentials.');
    }
  };

  const handleAdminInviteRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setAdminRegisterLoading(true);

    const res = await registerAdminWithInvite({
      fullName: adminFullName,
      email: adminEmail,
      phone: adminPhone,
      password: adminPassword,
      inviteToken: adminInviteToken,
    });
    setAdminRegisterLoading(false);

    if (res.success) {
      addToast('success', 'Admin Account Activated', 'Your administrator profile is active.');
      navigateTo('admin-dashboard');
    } else {
      setError(res.error || 'Failed to activate administrator account.');
    }
  };

  const handleQuickDemoLogin = async (role: UserRole) => {
    setLoading(true);
    setError(null);
    const res = await loginAsDemoUser(role);
    setLoading(false);

    if (res.success && res.user) {
      addToast('success', `${role.toUpperCase()} Session Started`, `Logged in as ${res.user.fullName}.`);
      if (res.user.role === 'admin') {
        navigateTo('admin-dashboard');
      } else if (res.user.role === 'staff') {
        navigateTo('staff-dashboard');
      } else {
        navigateTo('customer-dashboard');
      }
    } else {
      setError(res.error || 'Could not launch demo session.');
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    const res = await loginWithGoogle();
    setLoading(false);

    if (res.success && res.user) {
      addToast(
        'success',
        'Firebase Sign-In Verified',
        `Signed in as ${res.user.fullName} (Role: ${res.user.role.toUpperCase()}).`
      );
      if (res.user.role === 'admin') {
        navigateTo('admin-dashboard');
      } else if (res.user.role === 'staff') {
        navigateTo('staff-dashboard');
      } else {
        navigateTo('customer-dashboard');
      }
    } else {
      setError(res.error || 'Google Sign-In failed.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 flex flex-col items-center justify-center">
      <div className="max-w-xl w-full bg-white rounded-3xl border border-slate-200/90 shadow-xl p-6 sm:p-8 space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-blue-600 text-white flex items-center justify-center mx-auto shadow-md">
            <Droplets className="w-6 h-6 fill-current" />
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Smart Milk ATM Portal</h1>
          <p className="text-xs text-slate-500">
            Automated Milk Vending System • Role-Based Authentication
          </p>
        </div>

        {/* Role Selection Tabs */}
        <div className="grid grid-cols-3 gap-1.5 p-1.5 bg-slate-100 rounded-2xl border border-slate-200/80">
          <button
            type="button"
            onClick={() => {
              setActiveTab('customer');
              setError(null);
              setEmail('sanjay.customer@example.com');
              setPassword('password123');
            }}
            className={`py-2.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'customer'
                ? 'bg-white text-emerald-800 shadow-sm border border-emerald-100'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <User className="w-3.5 h-3.5 text-emerald-600" />
            <span>Customer</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('staff');
              setError(null);
              setEmail('priya.staff@smartmilkatm.in');
              setPassword('staff123');
            }}
            className={`py-2.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'staff'
                ? 'bg-white text-amber-800 shadow-sm border border-amber-100'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Wrench className="w-3.5 h-3.5 text-amber-600" />
            <span>Staff / Op</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('admin');
              setError(null);
              setEmail('admin@smartmilkatm.in');
              setPassword('admin123');
            }}
            className={`py-2.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'admin'
                ? 'bg-white text-blue-800 shadow-sm border border-blue-100'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
            <span>Admin</span>
          </button>
        </div>

        {/* Role Context Banner */}
        <div
          className={`p-3.5 rounded-2xl text-xs flex items-start gap-2.5 border ${
            activeTab === 'customer'
              ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
              : activeTab === 'staff'
              ? 'bg-amber-50/70 border-amber-200 text-amber-900'
              : 'bg-blue-50/70 border-blue-200 text-blue-900'
          }`}
        >
          {activeTab === 'customer' && <Droplets className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />}
          {activeTab === 'staff' && <Wrench className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />}
          {activeTab === 'admin' && <ShieldCheck className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />}

          <div>
            <p className="font-bold">
              {activeTab === 'customer' && 'Customer Portal Login'}
              {activeTab === 'staff' && 'Staff & Kiosk Technician Console'}
              {activeTab === 'admin' && 'Central Dairy Administration'}
            </p>
            <p className="text-[11px] opacity-85 mt-0.5 leading-relaxed">
              {activeTab === 'customer' &&
                'Purchase milk, download official digital PDF receipts, track bottles saved, and view order history.'}
              {activeTab === 'staff' &&
                'Record milk refills, check FEFO batch allocations, inspect DS18B20 temperature, and monitor kiosk status.'}
              {activeTab === 'admin' &&
                'Manage milk inventory, approve pending staff applications, calibrate flow sensors, adjust pricing, and emergency pump shutoff.'}
            </p>
          </div>
        </div>

        {error && (
          <div className="p-3.5 bg-red-50 border border-red-200 text-red-800 text-xs rounded-2xl font-medium flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Authentication Notice</p>
              <p className="text-[11px] mt-0.5 text-red-700">{error}</p>
            </div>
          </div>
        )}

        {/* Login Form */}
        {!showAdminInviteForm ? (
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div>
              <label className="block text-slate-700 font-bold mb-1">
                {activeTab === 'staff'
                  ? 'Staff Official Email'
                  : activeTab === 'admin'
                  ? 'Administrator Email'
                  : 'Customer Email'}
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={
                    activeTab === 'staff'
                      ? 'technician@smartmilkatm.in'
                      : activeTab === 'admin'
                      ? 'admin@smartmilkatm.in'
                      : 'customer@example.com'
                  }
                  className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-emerald-500 font-medium"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-slate-700 font-bold">Password</label>
                {activeTab === 'customer' && (
                  <button
                    type="button"
                    onClick={() => navigateTo('forgot-password')}
                    className="text-[11px] text-emerald-700 font-semibold hover:underline"
                  >
                    Forgot Password?
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-emerald-500 font-medium"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full text-white font-bold py-3 rounded-xl transition shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 ${
                activeTab === 'customer'
                  ? 'bg-emerald-600 hover:bg-emerald-700'
                  : activeTab === 'staff'
                  ? 'bg-amber-600 hover:bg-amber-700'
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {loading ? (
                <span>Verifying Authentication...</span>
              ) : (
                <>
                  <span>
                    Sign In as {activeTab === 'customer' ? 'Customer' : activeTab === 'staff' ? 'Staff' : 'Administrator'}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            <div className="relative py-2">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200" />
              </div>
              <div className="relative flex justify-center text-[10px] uppercase font-bold tracking-wider">
                <span className="bg-white px-2.5 text-slate-400">Or Firebase Free-Tier SSO</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 font-bold text-xs flex items-center justify-center gap-2.5 transition cursor-pointer disabled:opacity-50 shadow-xs"
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
        ) : (
          /* Admin Registration via Invite Token */
          <form onSubmit={handleAdminInviteRegister} className="space-y-3.5 text-xs">
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-blue-900 text-xs">
              <p className="font-bold">Admin Bootstrap & Invite Redemption</p>
              <p className="text-[11px] text-blue-700">Enter a secure token issued by an active Administrator.</p>
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">Invite Token</label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={adminInviteToken}
                  onChange={(e) => setAdminInviteToken(e.target.value)}
                  placeholder="INV-ADM-XXXXXX"
                  className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl uppercase font-mono font-bold"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={adminFullName}
                  onChange={(e) => setAdminFullName(e.target.value)}
                  placeholder="e.g. Dr. Rajesh Rao"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Mobile Phone</label>
                <input
                  type="tel"
                  value={adminPhone}
                  onChange={(e) => setAdminPhone(e.target.value)}
                  placeholder="+91 98800 00000"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">Admin Email</label>
              <input
                type="email"
                required
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                placeholder="rajesh.admin@smartmilkatm.in"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">Password</label>
              <input
                type="password"
                required
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                placeholder="Minimum 6 characters"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAdminInviteForm(false)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={adminRegisterLoading}
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl"
              >
                {adminRegisterLoading ? 'Verifying...' : 'Activate Admin Profile'}
              </button>
            </div>
          </form>
        )}

        {/* 1-Click Demo Testing Buttons */}
        <div className="pt-4 border-t border-slate-100 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              1-Click Instant Demo Authentication
            </span>
            <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium">
              Examiner Ready
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => handleQuickDemoLogin('customer')}
              className="p-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200/60 text-[11px] font-bold transition flex flex-col items-center justify-center gap-1 cursor-pointer text-center"
            >
              <div className="flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-emerald-600" />
                <span>Demo Customer</span>
              </div>
              <span className="text-[9px] text-emerald-700 font-normal truncate max-w-full">
                Sanjay Kumar
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleQuickDemoLogin('staff')}
              className="p-2.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200/60 text-[11px] font-bold transition flex flex-col items-center justify-center gap-1 cursor-pointer text-center"
            >
              <div className="flex items-center gap-1">
                <Wrench className="w-3.5 h-3.5 text-amber-600" />
                <span>Demo Staff</span>
              </div>
              <span className="text-[9px] text-amber-700 font-normal truncate max-w-full">
                Priya Sharma (STF)
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleQuickDemoLogin('admin')}
              className="p-2.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-200/60 text-[11px] font-bold transition flex flex-col items-center justify-center gap-1 cursor-pointer text-center"
            >
              <div className="flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                <span>Demo Admin</span>
              </div>
              <span className="text-[9px] text-blue-700 font-normal truncate max-w-full">
                Chief Dairy Officer
              </span>
            </button>
          </div>
        </div>

        {/* Registration & Invite Pathways */}
        <div className="text-center text-xs text-slate-500 pt-1 space-y-1.5">
          {activeTab === 'customer' && (
            <p>
              Don't have a customer account?{' '}
              <button
                type="button"
                onClick={() => navigateTo('register')}
                className="text-emerald-700 font-bold hover:underline cursor-pointer"
              >
                Register as Customer
              </button>
            </p>
          )}

          {activeTab === 'staff' && (
            <p>
              New Dairy Kiosk Technician?{' '}
              <button
                type="button"
                onClick={() => navigateTo('staff-register')}
                className="text-amber-800 font-bold hover:underline cursor-pointer"
              >
                Apply for Staff Account
              </button>
            </p>
          )}

          {activeTab === 'admin' && (
            <p>
              Need to initialize an administrator?{' '}
              <button
                type="button"
                onClick={() => setShowAdminInviteForm(!showAdminInviteForm)}
                className="text-blue-700 font-bold hover:underline cursor-pointer"
              >
                {showAdminInviteForm ? 'Back to Admin Login' : 'Enter Admin Invite Token'}
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
