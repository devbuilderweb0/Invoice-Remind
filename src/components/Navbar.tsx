import React from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Receipt, 
  LayoutDashboard, 
  Users, 
  BellRing, 
  Settings, 
  LogOut, 
  LogIn, 
  Sparkles,
  Zap
} from 'lucide-react';

interface NavbarProps {
  currentTab: 'dashboard' | 'invoices' | 'clients' | 'reminders' | 'settings';
  setCurrentTab: (tab: 'dashboard' | 'invoices' | 'clients' | 'reminders' | 'settings') => void;
  onQuickScan: () => void;
  isScanning: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  setCurrentTab,
  onQuickScan,
  isScanning,
}) => {
  const { user, loginWithGoogle, loginAsDemo, logout } = useAuth();

  return (
    <header className="sticky top-0 z-40 bg-slate-900 border-b border-slate-800 text-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Navigation */}
          <div className="flex items-center gap-8">
            <div 
              onClick={() => setCurrentTab('dashboard')} 
              className="flex items-center gap-2.5 cursor-pointer group"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
                <Receipt className="w-5 h-5 text-white" />
              </div>
              <div>
                <span className="text-lg font-bold tracking-tight text-white flex items-center gap-1.5">
                  RemindFlow
                  <span className="text-[10px] font-semibold uppercase tracking-wider bg-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded border border-blue-500/30">
                    Pro
                  </span>
                </span>
                <span className="text-xs text-slate-400 block -mt-0.5">Freelancer Invoicing</span>
              </div>
            </div>

            <nav className="hidden md:flex items-center space-x-1">
              <button
                onClick={() => setCurrentTab('dashboard')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                  currentTab === 'dashboard'
                    ? 'bg-slate-800 text-white'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <LayoutDashboard className="w-4 h-4" />
                Dashboard
              </button>

              <button
                onClick={() => setCurrentTab('invoices')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                  currentTab === 'invoices'
                    ? 'bg-slate-800 text-white'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <Receipt className="w-4 h-4" />
                Invoices
              </button>

              <button
                onClick={() => setCurrentTab('clients')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                  currentTab === 'clients'
                    ? 'bg-slate-800 text-white'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <Users className="w-4 h-4" />
                Clients
              </button>

              <button
                onClick={() => setCurrentTab('reminders')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                  currentTab === 'reminders'
                    ? 'bg-slate-800 text-white'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <BellRing className="w-4 h-4" />
                Reminders
              </button>

              <button
                onClick={() => setCurrentTab('settings')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                  currentTab === 'settings'
                    ? 'bg-slate-800 text-white'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <Settings className="w-4 h-4" />
                Settings
              </button>
            </nav>
          </div>

          {/* Right Action buttons & Account */}
          <div className="flex items-center gap-3">
            <button
              onClick={onQuickScan}
              disabled={isScanning}
              title="Scan invoices now for -3d, due-date, and +7d payment reminders"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm transition-all disabled:opacity-50"
            >
              <Zap className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} />
              {isScanning ? 'Scanning...' : 'Scan Due Dates'}
            </button>

            {user ? (
              <div className="flex items-center gap-2.5 pl-2 border-l border-slate-800">
                <div className="hidden lg:block text-right">
                  <div className="text-xs font-semibold text-slate-200 truncate max-w-[140px]">
                    {user.displayName}
                  </div>
                  <div className="text-[11px] text-slate-400 truncate max-w-[140px]">
                    {user.isDemo ? 'Demo Mode' : user.email}
                  </div>
                </div>

                <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs shadow">
                  {user.displayName?.[0] || 'U'}
                </div>

                <button
                  onClick={logout}
                  title="Sign out"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={loginWithGoogle}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white text-slate-900 hover:bg-slate-100 transition-colors shadow-sm"
                >
                  <LogIn className="w-3.5 h-3.5 text-blue-600" />
                  Google Sign-In
                </button>
                <button
                  onClick={() => loginAsDemo()}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors"
                >
                  <Sparkles className="w-3 h-3 text-amber-400" />
                  Demo
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Tab Navigation */}
      <div className="md:hidden border-t border-slate-800 px-2 py-1.5 flex justify-around bg-slate-950/80 backdrop-blur">
        <button
          onClick={() => setCurrentTab('dashboard')}
          className={`flex flex-col items-center gap-1 py-1 px-2 text-xs font-medium ${
            currentTab === 'dashboard' ? 'text-blue-400' : 'text-slate-400'
          }`}
        >
          <LayoutDashboard className="w-4 h-4" />
          Dashboard
        </button>
        <button
          onClick={() => setCurrentTab('invoices')}
          className={`flex flex-col items-center gap-1 py-1 px-2 text-xs font-medium ${
            currentTab === 'invoices' ? 'text-blue-400' : 'text-slate-400'
          }`}
        >
          <Receipt className="w-4 h-4" />
          Invoices
        </button>
        <button
          onClick={() => setCurrentTab('clients')}
          className={`flex flex-col items-center gap-1 py-1 px-2 text-xs font-medium ${
            currentTab === 'clients' ? 'text-blue-400' : 'text-slate-400'
          }`}
        >
          <Users className="w-4 h-4" />
          Clients
        </button>
        <button
          onClick={() => setCurrentTab('reminders')}
          className={`flex flex-col items-center gap-1 py-1 px-2 text-xs font-medium ${
            currentTab === 'reminders' ? 'text-blue-400' : 'text-slate-400'
          }`}
        >
          <BellRing className="w-4 h-4" />
          Reminders
        </button>
        <button
          onClick={() => setCurrentTab('settings')}
          className={`flex flex-col items-center gap-1 py-1 px-2 text-xs font-medium ${
            currentTab === 'settings' ? 'text-blue-400' : 'text-slate-400'
          }`}
        >
          <Settings className="w-4 h-4" />
          Settings
        </button>
      </div>
    </header>
  );
};
