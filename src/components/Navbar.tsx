import React, { useState } from 'react';
import { useApp, PageName } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import {
  Droplets,
  Leaf,
  CreditCard,
  User,
  Shield,
  Menu,
  X,
  History,
  Cpu,
  LogIn,
  LogOut,
  HelpCircle,
  Info,
  Wrench,
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const { currentPage, navigateTo, machine } = useApp();
  const { user, isAdmin, isStaff, logout, loginAsDemoUser } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  const navLinks: { name: string; page: PageName; icon?: any }[] = [
    { name: 'Home', page: 'home' },
    { name: 'Buy Milk', page: 'buy-milk' },
    { name: 'Milk Pricing', page: 'milk-pricing' },
    { name: 'Order History', page: 'order-history' },
    { name: 'ESP32 & IoT Lab', page: 'hardware-hub', icon: Cpu },
    { name: 'About Us', page: 'about-us', icon: Info },
    { name: 'FAQ', page: 'faq', icon: HelpCircle },
  ];

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-18">
          {/* Logo with Milk Bottle + Green Leaf + Payment Symbol */}
          <div
            onClick={() => navigateTo('home')}
            className="flex items-center gap-3 cursor-pointer group select-none"
          >
            <div className="relative w-11 h-11 rounded-xl bg-gradient-to-tr from-emerald-600 to-blue-600 flex items-center justify-center shadow-md shadow-emerald-500/15 group-hover:scale-105 transition-transform duration-200">
              <Droplets className="w-6 h-6 text-white stroke-[2.2]" />
              <div className="absolute -top-1 -right-1 bg-emerald-400 text-white p-0.5 rounded-full ring-2 ring-white">
                <Leaf className="w-3 h-3 text-emerald-950 fill-current" />
              </div>
              <div className="absolute -bottom-1 -left-1 bg-blue-500 text-white p-0.5 rounded-full ring-2 ring-white">
                <CreditCard className="w-2.5 h-2.5" />
              </div>
            </div>

            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-slate-900 tracking-tight text-lg">
                  SMART MILK <span className="text-emerald-600">ATM</span>
                </span>
                <span className="text-[10px] uppercase font-bold tracking-widest px-1.5 py-0.5 rounded-sm bg-blue-100 text-blue-700">
                  IoT v2.4
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium hidden sm:block">
                Fresh Milk • Smart UPI • Zero Plastic Pouches
              </p>
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-1">
            {navLinks.map((link) => {
              const active = currentPage === link.page;
              return (
                <button
                  key={link.page}
                  onClick={() => navigateTo(link.page)}
                  className={`px-3 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center gap-1.5 ${
                    active
                      ? 'bg-emerald-50 text-emerald-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-950 hover:bg-slate-100/70'
                  }`}
                >
                  {link.icon && <link.icon className="w-3.5 h-3.5 text-slate-400" />}
                  {link.name}
                </button>
              );
            })}

            {/* Staff Console shortcut */}
            {(isStaff || isAdmin) && (
              <button
                onClick={() => navigateTo('staff-dashboard')}
                className={`px-3 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center gap-1.5 ${
                  currentPage === 'staff-dashboard'
                    ? 'bg-amber-50 text-amber-800 shadow-xs'
                    : 'text-slate-600 hover:text-amber-700 hover:bg-amber-50/50'
                }`}
              >
                <Wrench className="w-3.5 h-3.5 text-amber-600" />
                Staff Console
              </button>
            )}

            {/* Admin Dashboard shortcut */}
            {isAdmin && (
              <button
                onClick={() => navigateTo('admin-dashboard')}
                className={`px-3 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center gap-1.5 ${
                  currentPage === 'admin-dashboard'
                    ? 'bg-blue-50 text-blue-700 shadow-xs'
                    : 'text-slate-600 hover:text-blue-600 hover:bg-blue-50/50'
                }`}
              >
                <Shield className="w-3.5 h-3.5 text-blue-600" />
                Admin
              </button>
            )}
          </nav>

          {/* Right Action Area */}
          <div className="hidden sm:flex items-center gap-3">
            {/* Direct Dispense CTA */}
            <button
              onClick={() => navigateTo('buy-milk')}
              className="bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white font-semibold text-sm px-4 py-2 rounded-xl shadow-sm shadow-emerald-600/25 transition active:scale-95 flex items-center gap-2 cursor-pointer"
            >
              <Droplets className="w-4 h-4 text-emerald-200 fill-current" />
              Buy Milk Now
            </button>

            {/* User Account / Profile */}
            <div className="relative">
              {user ? (
                <div>
                  <button
                    onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                    className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-slate-100 transition border border-slate-200 text-slate-700"
                  >
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs uppercase ${
                        user.role === 'admin'
                          ? 'bg-blue-100 text-blue-800'
                          : user.role === 'staff'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {user.fullName.slice(0, 2)}
                    </div>
                    <div className="text-left hidden md:block pr-1">
                      <p className="text-xs font-semibold text-slate-900 leading-tight truncate max-w-[100px]">
                        {user.fullName}
                      </p>
                      <p className="text-[10px] font-medium capitalize text-slate-500">
                        {user.role === 'admin' ? 'Administrator' : user.role === 'staff' ? 'Dairy Staff' : 'Customer'}
                      </p>
                    </div>
                  </button>

                  {userDropdownOpen && (
                    <div
                      className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-200 py-2 z-50 text-slate-700"
                      onMouseLeave={() => setUserDropdownOpen(false)}
                    >
                      <div className="px-4 py-2 border-b border-slate-100">
                        <p className="text-xs text-slate-400 font-medium">Signed in as</p>
                        <p className="text-xs font-bold text-slate-800 truncate">{user.email}</p>
                        <span
                          className={`inline-block mt-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                            user.role === 'admin'
                              ? 'bg-blue-100 text-blue-800'
                              : user.role === 'staff'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {user.role === 'admin'
                            ? '🛡 Administrator'
                            : user.role === 'staff'
                            ? `🔧 Staff (${user.staffId || 'STF'})`
                            : '🌱 Eco-Customer'}
                        </span>
                      </div>

                      <button
                        onClick={() => {
                          setUserDropdownOpen(false);
                          navigateTo('customer-dashboard');
                        }}
                        className="w-full text-left px-4 py-2 text-xs font-medium hover:bg-slate-50 flex items-center gap-2"
                      >
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        Customer Dashboard
                      </button>

                      <button
                        onClick={() => {
                          setUserDropdownOpen(false);
                          navigateTo('order-history');
                        }}
                        className="w-full text-left px-4 py-2 text-xs font-medium hover:bg-slate-50 flex items-center gap-2"
                      >
                        <History className="w-3.5 h-3.5 text-slate-400" />
                        My Milk Orders
                      </button>

                      {(isStaff || isAdmin) && (
                        <button
                          onClick={() => {
                            setUserDropdownOpen(false);
                            navigateTo('staff-dashboard');
                          }}
                          className="w-full text-left px-4 py-2 text-xs font-medium text-amber-800 hover:bg-amber-50 flex items-center gap-2"
                        >
                          <Wrench className="w-3.5 h-3.5 text-amber-600" />
                          Staff Operations Console
                        </button>
                      )}

                      {isAdmin && (
                        <button
                          onClick={() => {
                            setUserDropdownOpen(false);
                            navigateTo('admin-dashboard');
                          }}
                          className="w-full text-left px-4 py-2 text-xs font-medium text-blue-600 hover:bg-blue-50 flex items-center gap-2"
                        >
                          <Shield className="w-3.5 h-3.5 text-blue-500" />
                          Admin Console
                        </button>
                      )}

                      <div className="border-t border-slate-100 my-1 pt-1">
                        <button
                          onClick={() => {
                            setUserDropdownOpen(false);
                            logout();
                          }}
                          className="w-full text-left px-4 py-2 text-xs font-medium text-red-600 hover:bg-red-50 flex items-center gap-2"
                        >
                          <LogOut className="w-3.5 h-3.5" />
                          Logout
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => navigateTo('login')}
                    className="text-slate-700 hover:text-slate-900 text-xs font-bold px-3 py-2 rounded-lg hover:bg-slate-100 transition"
                  >
                    Login
                  </button>
                  <button
                    onClick={() => navigateTo('register')}
                    className="bg-slate-900 text-white hover:bg-slate-800 text-xs font-semibold px-3 py-2 rounded-lg transition"
                  >
                    Register
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Mobile menu button */}
          <div className="flex lg:hidden items-center gap-2">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-slate-200 bg-white px-4 pt-3 pb-6 space-y-1 shadow-lg">
          {navLinks.map((link) => (
            <button
              key={link.page}
              onClick={() => {
                setMobileMenuOpen(false);
                navigateTo(link.page);
              }}
              className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-semibold flex items-center justify-between ${
                currentPage === link.page
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <span>{link.name}</span>
            </button>
          ))}

          {(isStaff || isAdmin) && (
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                navigateTo('staff-dashboard');
              }}
              className="w-full text-left px-3 py-2.5 rounded-lg text-sm font-semibold text-amber-800 hover:bg-amber-50 flex items-center justify-between"
            >
              <span>Staff Operations Console</span>
              <Wrench className="w-4 h-4 text-amber-600" />
            </button>
          )}

          {isAdmin && (
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                navigateTo('admin-dashboard');
              }}
              className="w-full text-left px-3 py-2.5 rounded-lg text-sm font-semibold text-blue-700 hover:bg-blue-50 flex items-center justify-between"
            >
              <span>Admin Control Panel</span>
              <Shield className="w-4 h-4 text-blue-600" />
            </button>
          )}

          <div className="pt-3 border-t border-slate-100 space-y-2">
            {user ? (
              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50">
                <div>
                  <p className="text-xs font-bold text-slate-800">{user.fullName}</p>
                  <p className="text-[11px] text-slate-500">{user.email}</p>
                </div>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    logout();
                  }}
                  className="text-xs text-red-600 font-semibold px-2.5 py-1 bg-red-50 rounded"
                >
                  Logout
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    navigateTo('login');
                  }}
                  className="w-full text-center py-2 bg-slate-100 text-slate-800 rounded-lg text-xs font-bold"
                >
                  Login
                </button>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    navigateTo('register');
                  }}
                  className="w-full text-center py-2 bg-emerald-600 text-white rounded-lg text-xs font-bold"
                >
                  Register
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
