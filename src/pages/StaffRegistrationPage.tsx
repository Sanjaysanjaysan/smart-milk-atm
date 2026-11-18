import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { saveStaffRequestToFirestore, isFirebaseSessionReady } from '../services/firestoreService';
import {
  Wrench,
  User,
  Mail,
  Phone,
  Shield,
  Lock,
  ArrowRight,
  CheckCircle2,
  Clock,
  AlertCircle,
  Building2,
} from 'lucide-react';

export const StaffRegistrationPage: React.FC = () => {
  const { registerStaff } = useAuth();
  const { navigateTo, addToast, config } = useApp();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [staffId, setStaffId] = useState('');
  const [assignedMachineId, setAssignedMachineId] = useState(config.defaultMachineId || 'ATM-KA-001');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    if (!staffId.trim()) {
      setError('Employee / Staff ID is required.');
      return;
    }

    setLoading(true);
    const res = await registerStaff({
      fullName,
      email,
      phone,
      staffId: staffId.toUpperCase(),
      assignedMachineId,
      password,
    });
    setLoading(false);

    if (res.success) {
      if (isFirebaseSessionReady()) {
        void saveStaffRequestToFirestore({
          requestId: `REQ-${Date.now()}`,
          fullName,
          email,
          phone,
          staffId: staffId.toUpperCase(),
          assignedMachineId,
        });
      }
      setSubmitted(true);
      addToast('success', 'Staff Application Received', 'Administrator review required.');
    } else {
      setError(res.error || 'Failed to submit staff registration.');
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-slate-50 py-16 px-4 flex flex-col items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-3xl border border-slate-200/90 shadow-xl p-8 text-center space-y-6">
          <div className="w-16 h-16 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
            <Clock className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-black text-slate-900">Application Submitted</h2>
            <p className="text-xs text-slate-600 leading-relaxed">
              Your registration as Dairy Staff member <span className="font-bold text-slate-900">{fullName}</span> (ID: <span className="font-mono font-bold text-amber-700">{staffId.toUpperCase()}</span>) is pending approval by the Central Dairy Administrator.
            </p>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-left text-xs space-y-2">
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Applicant:</span>
              <span className="font-semibold text-slate-800">{fullName}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Staff ID:</span>
              <span className="font-mono font-bold text-slate-800">{staffId.toUpperCase()}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Assigned Kiosk:</span>
              <span className="font-semibold text-slate-800">{assignedMachineId}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-500">Status:</span>
              <span className="inline-flex items-center gap-1 text-amber-700 font-bold px-2 py-0.5 rounded-full bg-amber-50">
                <Clock className="w-3 h-3" /> PENDING ADMIN APPROVAL
              </span>
            </div>
          </div>

          <p className="text-[11px] text-slate-400">
            For demonstration and immediate testing, you can use the pre-approved Demo Staff account from the login page.
          </p>

          <button
            onClick={() => navigateTo('login')}
            className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 rounded-xl transition cursor-pointer text-xs"
          >
            Return to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 flex flex-col items-center justify-center">
      <div className="max-w-lg w-full bg-white rounded-3xl border border-slate-200/90 shadow-xl p-6 sm:p-8 space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center mx-auto shadow-md">
            <Wrench className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-black text-slate-900">Staff Onboarding Application</h1>
          <p className="text-xs text-slate-500">
            Kiosk Operator, Refill Technician, & Maintenance Staff
          </p>
        </div>

        {/* Security / Policy Notice */}
        <div className="p-3.5 bg-amber-50/80 border border-amber-200/80 rounded-2xl text-xs text-amber-900 flex items-start gap-2.5">
          <Shield className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
          <p className="text-[11px] leading-relaxed">
            <span className="font-bold">Strict Role Isolation:</span> Staff accounts can record milk refills, view batch inventory, and log machine telemetry. Account access requires verified approval by a Central Dairy Administrator.
          </p>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl font-medium flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Application Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-slate-700 font-bold mb-1">Full Legal Name</label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Ramesh Patil"
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-amber-500 font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">Staff / Employee ID</label>
              <div className="relative">
                <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={staffId}
                  onChange={(e) => setStaffId(e.target.value)}
                  placeholder="STF-KA-102"
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-amber-500 font-mono font-bold uppercase"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-slate-700 font-bold mb-1">Official Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="technician@smartmilkatm.in"
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-amber-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">Mobile Contact Phone</label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98450 11223"
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-amber-500"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-slate-700 font-bold mb-1">Assigned Milk ATM Kiosk</label>
            <input
              type="text"
              required
              value={assignedMachineId}
              onChange={(e) => setAssignedMachineId(e.target.value)}
              placeholder="ATM-KA-001"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-800"
            />
            <p className="text-[10px] text-slate-400 mt-1">
              Staff can only access telemetry and refill controls for their designated machine.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-slate-700 font-bold mb-1">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-amber-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">Confirm Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-amber-500"
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold py-3 rounded-xl transition shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 text-xs"
          >
            {loading ? 'Submitting Application...' : 'Submit Staff Registration Application'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Back Link */}
        <div className="text-center text-xs text-slate-500 pt-2">
          Already registered?{' '}
          <button
            type="button"
            onClick={() => navigateTo('login')}
            className="text-amber-700 font-bold hover:underline cursor-pointer"
          >
            Back to Portal Login
          </button>
        </div>
      </div>
    </div>
  );
};
