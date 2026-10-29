import React, { useState, useEffect, useCallback } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { DashboardView } from './components/DashboardView';
import { InvoicesView } from './components/InvoicesView';
import { ClientsView } from './components/ClientsView';
import { RemindersView } from './components/RemindersView';
import { SettingsView } from './components/SettingsView';
import { api } from './lib/api';
import { Client, Invoice, InvoiceStatus, ReminderLog, UserSettings, CheckDueResult } from './types';
import { 
  CheckCircle2, 
  AlertTriangle, 
  Info, 
  X, 
  Mail, 
  Zap, 
  Plus, 
  LogIn,
  Receipt
} from 'lucide-react';

interface Toast {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

function MainApp() {
  const { user, loading: authLoading, loginWithGoogle, loginAsDemo } = useAuth();

  const [currentTab, setCurrentTab] = useState<'dashboard' | 'invoices' | 'clients' | 'reminders' | 'settings'>('dashboard');
  const [stats, setStats] = useState<{
    totalOutstandingCents: number;
    totalPaidCents: number;
    totalInvoicedCents: number;
    invoicesCount: number;
    overdueCount: number;
    overdueInvoices: Invoice[];
  } | null>(null);

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [logs, setLogs] = useState<ReminderLog[]>([]);
  const [settings, setSettings] = useState<UserSettings | null>(null);

  const [isScanning, setIsScanning] = useState(false);
  const [lastScanResult, setLastScanResult] = useState<CheckDueResult | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Add Client Modal triggered from anywhere
  const [isGlobalAddClientOpen, setIsGlobalAddClientOpen] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [newClientEmail, setNewClientEmail] = useState('');
  const [clientModalError, setClientModalError] = useState<string | null>(null);

  // Toast dispatcher
  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = `toast_${Date.now()}_${Math.random()}`;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  }, []);

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Fetch all user data
  const loadData = useCallback(async () => {
    if (!user) return;
    try {
      const [fetchedStats, fetchedInvoices, fetchedClients, fetchedLogs, fetchedSettings] =
        await Promise.all([
          api.getStats().catch(() => null),
          api.getInvoices().catch(() => []),
          api.getClients().catch(() => []),
          api.getReminderLogs().catch(() => []),
          api.getUserSettings().catch(() => null),
        ]);

      if (fetchedStats) setStats(fetchedStats);
      if (fetchedInvoices) setInvoices(fetchedInvoices);
      if (fetchedClients) setClients(fetchedClients);
      if (fetchedLogs) setLogs(fetchedLogs);
      if (fetchedSettings) setSettings(fetchedSettings);
    } catch (err) {
      console.error('Failed to load application data:', err);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user, loadData]);

  // Invoice Handlers
  const handleCreateInvoice = async (data: {
    clientId: string;
    amount: number;
    dueDate: string;
    stripePayUrl: string;
    status: InvoiceStatus;
    paidAmount?: number;
    notes?: string;
  }) => {
    try {
      const created = await api.createInvoice(data);
      showToast(`Invoice #${created.id.slice(-6)} created successfully!`, 'success');
      await loadData();
    } catch (err: any) {
      showToast(err.message || 'Failed to create invoice', 'error');
      throw err;
    }
  };

  const handleUpdateInvoice = async (
    id: string,
    data: Partial<{
      clientId: string;
      amount: number;
      paidAmount: number;
      status: InvoiceStatus;
      dueDate: string;
      stripePayUrl: string;
      notes: string;
    }>
  ) => {
    try {
      const updated = await api.updateInvoice(id, data);
      showToast(`Invoice #${updated.id.slice(-6)} updated!`, 'success');
      await loadData();
    } catch (err: any) {
      showToast(err.message || 'Failed to update invoice', 'error');
      throw err;
    }
  };

  const handleDeleteInvoice = async (id: string) => {
    try {
      await api.deleteInvoice(id);
      showToast('Invoice deleted successfully.', 'info');
      await loadData();
    } catch (err: any) {
      showToast(err.message || 'Failed to delete invoice', 'error');
    }
  };

  // Client Handlers
  const handleCreateClient = async (data: { name: string; email: string }) => {
    try {
      const created = await api.createClient(data);
      showToast(`Client "${created.name}" added!`, 'success');
      await loadData();
    } catch (err: any) {
      showToast(err.message || 'Failed to add client', 'error');
      throw err;
    }
  };

  const handleUpdateClient = async (id: string, data: { name?: string; email?: string }) => {
    try {
      const updated = await api.updateClient(id, data);
      showToast(`Client "${updated.name}" updated!`, 'success');
      await loadData();
    } catch (err: any) {
      showToast(err.message || 'Failed to update client', 'error');
      throw err;
    }
  };

  const handleDeleteClient = async (id: string) => {
    try {
      await api.deleteClient(id);
      showToast('Client removed successfully.', 'info');
      await loadData();
    } catch (err: any) {
      showToast(err.message || 'Failed to delete client', 'error');
    }
  };

  // Immediate Reminder test handler
  const handleSendTestReminder = async (invoiceId: string) => {
    try {
      const result = await api.sendTestReminder(invoiceId);
      if (result.success) {
        showToast(
          `Reminder dispatched to ${result.clientEmailMasked} (${result.simulated ? 'Simulated send' : 'Sent via Resend'})`,
          'success'
        );
      } else {
        showToast(`Email notice failed: ${result.error || 'Check server configuration'}`, 'error');
      }
      await loadData();
    } catch (err: any) {
      showToast(err.message || 'Failed to send reminder', 'error');
    }
  };

  // Trigger POST /api/check-due
  const handleTriggerScan = async (): Promise<CheckDueResult | null> => {
    setIsScanning(true);
    try {
      const result = await api.checkDue();
      setLastScanResult(result);
      showToast(
        `Due date check complete: ${result.remindersSent} reminders dispatched across ${result.scannedCount} invoices.`,
        'success'
      );
      await loadData();
      return result;
    } catch (err: any) {
      showToast(err.message || 'Automated scan failed', 'error');
      return null;
    } finally {
      setIsScanning(false);
    }
  };

  // Settings update
  const handleUpdateSettings = async (data: Partial<UserSettings>) => {
    try {
      const updated = await api.updateUserSettings(data);
      setSettings(updated);
      showToast('Settings & email template updated!', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to update settings', 'error');
      throw err;
    }
  };

  // Quick Global Add Client
  const submitGlobalAddClient = async (e: React.FormEvent) => {
    e.preventDefault();
    setClientModalError(null);
    if (!newClientName.trim()) {
      setClientModalError('Client name is required.');
      return;
    }
    if (!newClientEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newClientEmail.trim())) {
      setClientModalError('A valid email address is required.');
      return;
    }

    try {
      await handleCreateClient({
        name: newClientName.trim(),
        email: newClientEmail.trim(),
      });
      setIsGlobalAddClientOpen(false);
      setNewClientName('');
      setNewClientEmail('');
    } catch (err: any) {
      setClientModalError(err.message);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center animate-pulse">
            <Receipt className="w-6 h-6" />
          </div>
          <span className="text-xs font-semibold text-slate-500">Loading RemindFlow...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      {/* Toast Notification Container */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto p-4 rounded-xl shadow-lg border text-xs font-semibold flex items-start gap-3 animate-slideIn ${
              t.type === 'success'
                ? 'bg-emerald-900 text-emerald-100 border-emerald-700'
                : t.type === 'error'
                ? 'bg-rose-900 text-rose-100 border-rose-700'
                : 'bg-slate-900 text-slate-100 border-slate-700'
            }`}
          >
            {t.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />}
            {t.type === 'error' && <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />}
            {t.type === 'info' && <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />}
            <div className="flex-1 leading-snug">{t.message}</div>
            <button
              onClick={() => dismissToast(t.id)}
              className="text-slate-400 hover:text-white shrink-0 ml-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>

      {/* Navigation Bar */}
      <Navbar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        onQuickScan={handleTriggerScan}
        isScanning={isScanning}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {currentTab === 'dashboard' && (
          <DashboardView
            stats={stats}
            invoices={invoices}
            onOpenNewInvoice={() => setCurrentTab('invoices')}
            onOpenNewClient={() => setIsGlobalAddClientOpen(true)}
            onSendTestReminder={handleSendTestReminder}
            onTriggerScan={handleTriggerScan}
            onViewAllInvoices={() => setCurrentTab('invoices')}
            isScanning={isScanning}
          />
        )}

        {currentTab === 'invoices' && (
          <InvoicesView
            invoices={invoices}
            clients={clients}
            onCreateInvoice={handleCreateInvoice}
            onUpdateInvoice={handleUpdateInvoice}
            onDeleteInvoice={handleDeleteInvoice}
            onSendTestReminder={handleSendTestReminder}
            onOpenNewClient={() => setIsGlobalAddClientOpen(true)}
          />
        )}

        {currentTab === 'clients' && (
          <ClientsView
            clients={clients}
            invoices={invoices}
            onCreateClient={handleCreateClient}
            onUpdateClient={handleUpdateClient}
            onDeleteClient={handleDeleteClient}
            onSelectClientForInvoice={(clientId) => {
              setCurrentTab('invoices');
            }}
          />
        )}

        {currentTab === 'reminders' && (
          <RemindersView
            logs={logs}
            onTriggerScan={handleTriggerScan}
            isScanning={isScanning}
            lastScanResult={lastScanResult}
          />
        )}

        {currentTab === 'settings' && (
          <SettingsView
            settings={settings}
            onUpdateSettings={handleUpdateSettings}
          />
        )}
      </main>

      {/* Quick Add Client Modal */}
      {isGlobalAddClientOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-scaleIn">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Add New Client</h3>
                <p className="text-xs text-slate-500">Add a client to your directory</p>
              </div>
              <button
                onClick={() => setIsGlobalAddClientOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={submitGlobalAddClient} className="p-6 space-y-4">
              {clientModalError && (
                <div className="p-3 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 text-xs font-medium">
                  {clientModalError}
                </div>
              )}

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">
                  Client Name or Business *
                </label>
                <input
                  type="text"
                  value={newClientName}
                  onChange={(e) => setNewClientName(e.target.value)}
                  required
                  placeholder="e.g. Acme Studio"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">
                  Client Email *
                </label>
                <input
                  type="email"
                  value={newClientEmail}
                  onChange={(e) => setNewClientEmail(e.target.value)}
                  required
                  placeholder="e.g. invoices@acme.com"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsGlobalAddClientOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white shadow-md"
                >
                  Save Client
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 text-center text-xs text-slate-400">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-700">RemindFlow</span>
            <span>&copy; {new Date().getFullYear()} Freelance Invoicing & Automated Payment Reminders</span>
          </div>
          <div className="flex items-center gap-4 text-[11px]">
            <span>Stripe Payment Integration</span>
            <span>•</span>
            <span>Resend Email API</span>
            <span>•</span>
            <span>ABAC Zero-Trust Rules</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
