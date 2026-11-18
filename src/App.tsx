/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { AuthProvider } from './context/AuthContext';
import { AppProvider, useApp } from './context/AppContext';
import { DemoBanner } from './components/DemoBanner';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { ToastContainer } from './components/ToastContainer';
import { ErrorBoundary } from './components/ErrorBoundary';

// Pages
import { HomePage } from './pages/HomePage';
import { BuyMilkPage } from './pages/BuyMilkPage';
import { PaymentPage } from './pages/PaymentPage';
import { PaymentStatusPage } from './pages/PaymentStatusPage';
import { DispensingStatusPage } from './pages/DispensingStatusPage';
import { OrderHistoryPage } from './pages/OrderHistoryPage';
import { CustomerDashboardPage } from './pages/CustomerDashboardPage';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import { StaffDashboardPage } from './pages/StaffDashboardPage';
import { StaffRegistrationPage } from './pages/StaffRegistrationPage';
import { HardwareHubPage } from './pages/HardwareHubPage';
import { MilkPricingPage } from './pages/MilkPricingPage';
import { AboutUsPage } from './pages/AboutUsPage';
import { ContactUsPage } from './pages/ContactUsPage';
import { FAQPage } from './pages/FAQPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { PrivacyPolicyPage } from './pages/PrivacyPolicyPage';
import { TermsPage } from './pages/TermsPage';
import { RefundPolicyPage } from './pages/RefundPolicyPage';
import { ShippingPolicyPage } from './pages/ShippingPolicyPage';
import { useAuth } from './context/AuthContext';
import { ShieldAlert, ArrowLeft, LogIn } from 'lucide-react';

const AccessDeniedView: React.FC<{ requiredRole: string }> = ({ requiredRole }) => {
  const { navigateTo } = useApp();
  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl border border-red-200 shadow-xl p-8 text-center space-y-5">
        <div className="w-16 h-16 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mx-auto">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-black text-slate-900">Access Restricted</h2>
          <p className="text-xs text-slate-600 leading-relaxed">
            This module requires verified <span className="font-bold uppercase text-red-600">{requiredRole}</span> privileges. Frontend role parameters are ignored by backend security rules.
          </p>
        </div>
        <div className="flex flex-col gap-2 pt-2">
          <button
            onClick={() => navigateTo('login')}
            className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer"
          >
            <LogIn className="w-4 h-4" />
            Sign in with Authorized Credentials
          </button>
          <button
            onClick={() => navigateTo('home')}
            className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            Return to Storefront
          </button>
        </div>
      </div>
    </div>
  );
};

const PageRenderer: React.FC = () => {
  const { currentPage } = useApp();
  const { user, isAdmin, isStaff } = useAuth();

  switch (currentPage) {
    case 'home':
      return <HomePage />;
    case 'buy-milk':
      return <BuyMilkPage />;
    case 'payment':
      return <PaymentPage />;
    case 'payment-status':
      return <PaymentStatusPage />;
    case 'dispensing-status':
      return <DispensingStatusPage />;
    case 'order-history':
      return <OrderHistoryPage />;
    case 'customer-dashboard':
      return <CustomerDashboardPage />;
    case 'admin-dashboard':
      if (!isAdmin) {
        return <AccessDeniedView requiredRole="Central Dairy Administrator" />;
      }
      return <AdminDashboardPage />;
    case 'staff-dashboard':
      if (!isStaff && !isAdmin) {
        return <AccessDeniedView requiredRole="Dairy Staff & Kiosk Technician" />;
      }
      return <StaffDashboardPage />;
    case 'staff-register':
      return <StaffRegistrationPage />;
    case 'hardware-hub':
      return <HardwareHubPage />;
    case 'milk-pricing':
      return <MilkPricingPage />;
    case 'about-us':
      return <AboutUsPage />;
    case 'contact-us':
      return <ContactUsPage />;
    case 'faq':
      return <FAQPage />;
    case 'login':
      return <LoginPage />;
    case 'register':
      return <RegisterPage />;
    case 'forgot-password':
      return <ForgotPasswordPage />;
    case 'privacy-policy':
      return <PrivacyPolicyPage />;
    case 'terms':
      return <TermsPage />;
    case 'refund-policy':
      return <RefundPolicyPage />;
    case 'shipping-policy':
      return <ShippingPolicyPage />;
    default:
      return <HomePage />;
  }
};

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AppProvider>
          <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans selection:bg-emerald-500 selection:text-white">
            <DemoBanner />
            <Navbar />
            <main className="flex-1">
              <PageRenderer />
            </main>
            <Footer />
            <ToastContainer />
          </div>
        </AppProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
