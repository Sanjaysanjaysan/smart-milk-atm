import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  User as FirebaseUser,
  onAuthStateChanged,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  sendEmailVerification,
  sendPasswordResetEmail,
  signOut as firebaseSignOut,
} from 'firebase/auth';
import { auth, googleProvider } from '../lib/firebase';
import { syncUserProfileToFirestore } from '../services/firestoreService';
import { UserProfile, UserRole } from '../types';

interface AuthContextType {
  user: UserProfile | null;
  firebaseUser: FirebaseUser | null;
  isFirebaseAuthenticated: boolean;
  token: string | null;
  isAdmin: boolean;
  isStaff: boolean;
  isCustomer: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string; user?: UserProfile }>;
  loginWithGoogle: () => Promise<{ success: boolean; error?: string; user?: UserProfile }>;
  loginWithFirebaseEmail: (email: string, password: string) => Promise<{ success: boolean; error?: string; user?: UserProfile }>;
  register: (fullName: string, email: string, password: string) => Promise<{ success: boolean; error?: string; usedFirebase?: boolean }>;
  registerStaff: (data: {
    fullName: string;
    email: string;
    phone?: string;
    staffId: string;
    assignedMachineId?: string;
    password: string;
  }) => Promise<{ success: boolean; error?: string; message?: string }>;
  registerAdminWithInvite: (data: {
    fullName: string;
    email: string;
    phone?: string;
    password: string;
    inviteToken: string;
  }) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ success: boolean; message: string }>;
  loginAsDemoUser: (role: UserRole) => Promise<{ success: boolean; user?: UserProfile; error?: string }>;
  getAuthHeader: () => Record<string, string>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const LOCAL_STORAGE_TOKEN_KEY = 'smart_milk_atm_token';
const LOCAL_STORAGE_USER_KEY = 'smart_milk_atm_user';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(() => {
    try {
      return localStorage.getItem(LOCAL_STORAGE_TOKEN_KEY);
    } catch {
      return null;
    }
  });

  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);

  const [user, setUser] = useState<UserProfile | null>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_USER_KEY);
      if (saved) return JSON.parse(saved);
    } catch {
      // fallback
    }
    return {
      uid: 'cust-demo-101',
      email: 'sanjay.customer@example.com',
      fullName: 'Sanjay Kumar',
      role: 'customer',
      bottlesSaved: 14,
      totalMilkPurchasedMl: 7000,
      authProvider: 'demo-local',
      createdAt: new Date().toISOString(),
    };
  });

  const syncFirebaseTokenWithBackend = useCallback(
    async (fbUser: FirebaseUser, explicitFullName?: string): Promise<{ success: boolean; user?: UserProfile; error?: string }> => {
      try {
        const idToken = await fbUser.getIdToken();
        const res = await fetch('/api/auth/firebase-sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            idToken,
            fullName: explicitFullName || fbUser.displayName || undefined,
          }),
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          return { success: false, error: data.error || 'Failed to verify Firebase identity with backend' };
        }

        setToken(data.token);
        setUser(data.user);
        localStorage.setItem(LOCAL_STORAGE_TOKEN_KEY, data.token);
        localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(data.user));

        const providerId = fbUser.providerData?.[0]?.providerId || 'firebase';
        await syncUserProfileToFirestore(data.user, providerId);

        return { success: true, user: data.user };
      } catch (e: any) {
        return { success: false, error: e?.message || 'Network error verifying Firebase session' };
      }
    },
    []
  );

  // Verify and refresh profile from backend on mount and token change
  const refreshProfile = useCallback(async () => {
    const currentToken = localStorage.getItem(LOCAL_STORAGE_TOKEN_KEY);
    if (!currentToken) return;

    try {
      const res = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${currentToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(data.user));
      } else if (res.status === 401) {
        localStorage.removeItem(LOCAL_STORAGE_TOKEN_KEY);
        localStorage.removeItem(LOCAL_STORAGE_USER_KEY);
        setToken(null);
        setUser(null);
      }
    } catch {
      // Offline fallback
    }
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);
      if (fbUser) {
        const existingSavedUser = localStorage.getItem(LOCAL_STORAGE_USER_KEY);
        const parsedSaved = existingSavedUser ? JSON.parse(existingSavedUser) : null;
        // Restore Firebase session unless user intentionally switched to a seeded local demo role
        if (!parsedSaved || parsedSaved.authProvider !== 'demo-local') {
          await syncFirebaseTokenWithBackend(fbUser);
        }
      }
    });
    return () => unsub();
  }, [syncFirebaseTokenWithBackend]);

  useEffect(() => {
    if (!token && user?.email === 'sanjay.customer@example.com') {
      const defaultDemoToken = 'tok-demo-customer';
      setToken(defaultDemoToken);
      localStorage.setItem(LOCAL_STORAGE_TOKEN_KEY, defaultDemoToken);
      localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(user));
    } else if (token) {
      refreshProfile();
    }
  }, [refreshProfile, token]);

  const getAuthHeader = useCallback((): Record<string, string> => {
    const curToken = token || localStorage.getItem(LOCAL_STORAGE_TOKEN_KEY);
    return curToken ? { Authorization: `Bearer ${curToken}` } : {};
  }, [token]);

  const loginWithGoogle = async (): Promise<{ success: boolean; error?: string; user?: UserProfile }> => {
    try {
      const cred = await signInWithPopup(auth, googleProvider);
      return await syncFirebaseTokenWithBackend(cred.user);
    } catch (e: any) {
      const code = e?.code || '';
      if (code === 'auth/popup-closed-by-user') {
        return { success: false, error: 'Google sign-in popup was closed before completing authentication.' };
      }
      if (code === 'auth/popup-blocked') {
        return { success: false, error: 'Browser blocked the Google sign-in popup. Please allow popups for this site and try again.' };
      }
      return { success: false, error: e?.message || 'Google Sign-In failed' };
    }
  };

  const loginWithFirebaseEmail = async (
    email: string,
    pass: string
  ): Promise<{ success: boolean; error?: string; user?: UserProfile }> => {
    try {
      const cred = await signInWithEmailAndPassword(auth, email.trim(), pass);
      return await syncFirebaseTokenWithBackend(cred.user);
    } catch (e: any) {
      const code = e?.code || '';
      if (code === 'auth/operation-not-allowed') {
        return {
          success: false,
          error:
            'Firebase Email/Password provider is not enabled in Firebase Console yet. Use "Continue with Google" or Demo credentials below, or enable Email/Password in Firebase Console -> Authentication -> Sign-in method.',
        };
      }
      return { success: false, error: e?.message || 'Firebase email sign-in failed' };
    }
  };

  const login = async (email: string, pass: string): Promise<{ success: boolean; error?: string; user?: UserProfile }> => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: pass }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setToken(data.token);
        setUser(data.user);
        localStorage.setItem(LOCAL_STORAGE_TOKEN_KEY, data.token);
        localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(data.user));
        return { success: true, user: data.user };
      }

      // If backend says invalid credentials (401), try Firebase Email/Password as fallback if user registered in Firebase Auth
      if (res.status === 401) {
        try {
          const cred = await signInWithEmailAndPassword(auth, email.trim(), pass);
          return await syncFirebaseTokenWithBackend(cred.user);
        } catch {
          return { success: false, error: data.error || 'Invalid email address or password' };
        }
      }

      return { success: false, error: data.error || 'Login failed. Please verify credentials.' };
    } catch (e: any) {
      return { success: false, error: e.message || 'Network error during login' };
    }
  };

  const register = async (
    fullName: string,
    email: string,
    pass: string
  ): Promise<{ success: boolean; error?: string; usedFirebase?: boolean }> => {
    // Attempt Firebase Email/Password registration first when enabled in Firebase Console
    try {
      const cred = await createUserWithEmailAndPassword(auth, email.trim(), pass);
      if (fullName.trim()) {
        await updateProfile(cred.user, { displayName: fullName.trim() });
      }
      try {
        await sendEmailVerification(cred.user);
      } catch {
        // Non-blocking
      }
      const syncRes = await syncFirebaseTokenWithBackend(cred.user, fullName.trim());
      if (syncRes.success) {
        return { success: true, usedFirebase: true };
      }
      return { success: false, error: syncRes.error };
    } catch (fbErr: any) {
      const code = fbErr?.code || '';
      if (code === 'auth/email-already-in-use') {
        return { success: false, error: 'An account with this email already exists in Firebase Authentication. Please sign in.' };
      }
      if (code !== 'auth/operation-not-allowed') {
        return { success: false, error: fbErr?.message || 'Firebase registration failed' };
      }
      // If Email/Password sign-in provider is not enabled yet in Firebase Console, fall back cleanly to Express salted-scrypt auth
    }

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName, email, password: pass }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        return { success: false, error: data.error || 'Registration failed' };
      }

      setToken(data.token);
      setUser(data.user);
      localStorage.setItem(LOCAL_STORAGE_TOKEN_KEY, data.token);
      localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(data.user));
      return { success: true, usedFirebase: false };
    } catch (e: any) {
      return { success: false, error: e.message || 'Network error during registration' };
    }
  };

  const registerStaff = async (data: {
    fullName: string;
    email: string;
    phone?: string;
    staffId: string;
    assignedMachineId?: string;
    password: string;
  }): Promise<{ success: boolean; error?: string; message?: string }> => {
    try {
      const res = await fetch('/api/auth/staff-register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const resData = await res.json();
      if (!res.ok || !resData.success) {
        return { success: false, error: resData.error || 'Staff application submission failed' };
      }

      return { success: true, message: resData.message };
    } catch (e: any) {
      return { success: false, error: e.message || 'Network error during staff registration' };
    }
  };

  const registerAdminWithInvite = async (data: {
    fullName: string;
    email: string;
    phone?: string;
    password: string;
    inviteToken: string;
  }): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch('/api/auth/admin-register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const resData = await res.json();
      if (!res.ok || !resData.success) {
        return { success: false, error: resData.error || 'Admin registration failed' };
      }

      setToken(resData.token);
      setUser(resData.user);
      localStorage.setItem(LOCAL_STORAGE_TOKEN_KEY, resData.token);
      localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(resData.user));
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message || 'Network error during admin registration' };
    }
  };

  const logout = async () => {
    const curToken = token || localStorage.getItem(LOCAL_STORAGE_TOKEN_KEY);
    if (curToken) {
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { Authorization: `Bearer ${curToken}` },
        });
      } catch {
        // ignore
      }
    }
    try {
      await firebaseSignOut(auth);
    } catch {
      // ignore
    }
    localStorage.removeItem(LOCAL_STORAGE_TOKEN_KEY);
    localStorage.removeItem(LOCAL_STORAGE_USER_KEY);
    setToken(null);
    setUser(null);
    setFirebaseUser(null);
  };

  const resetPassword = async (email: string) => {
    if (!email || !email.includes('@')) {
      return { success: false, message: 'Please enter a valid email address' };
    }
    try {
      await sendPasswordResetEmail(auth, email.trim());
      return {
        success: true,
        message: `Firebase password reset link has been sent to ${email}. Check your inbox.`,
      };
    } catch (err: any) {
      if (err?.code === 'auth/operation-not-allowed') {
        return {
          success: false,
          message:
            'Email/Password sign-in is not yet enabled in Firebase Console. Sign in with Google Auth or contact the dairy administrator.',
        };
      }
      return {
        success: false,
        message: err?.message || 'Unable to send password reset email right now.',
      };
    }
  };

  const loginAsDemoUser = async (role: UserRole): Promise<{ success: boolean; user?: UserProfile; error?: string }> => {
    if (role === 'admin') {
      return await login('admin@smartmilkatm.in', 'admin123');
    } else if (role === 'staff') {
      return await login('priya.staff@smartmilkatm.in', 'staff123');
    } else {
      return await login('sanjay.customer@example.com', 'password123');
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        firebaseUser,
        isFirebaseAuthenticated: Boolean(firebaseUser),
        token,
        isAdmin: user?.role === 'admin',
        isStaff: user?.role === 'staff',
        isCustomer: user?.role === 'customer',
        login,
        loginWithGoogle,
        loginWithFirebaseEmail,
        register,
        registerStaff,
        registerAdminWithInvite,
        logout,
        resetPassword,
        loginAsDemoUser,
        getAuthHeader,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
