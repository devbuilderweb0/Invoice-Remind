import React from 'react';
import { Invoice } from '../types';
import { formatCentsToCurrency, formatDateToReadable, getDaysDiffFromToday, maskEmail } from '../lib/utils';
import { 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  ExternalLink, 
  Mail, 
  Plus, 
  Receipt, 
  Zap,
  DollarSign
} from 'lucide-react';

interface DashboardViewProps {
  stats: {
    totalOutstandingCents: number;
    totalPaidCents: number;
    totalInvoicedCents: number;
    invoicesCount: number;
    overdueCount: number;
    overdueInvoices: Invoice[];
  } | null;
  invoices: Invoice[];
  onOpenNewInvoice: () => void;
  onOpenNewClient: () => void;
  onSendTestReminder: (invoiceId: string) => Promise<void>;
  onTriggerScan: () => void;
  onViewAllInvoices: () => void;
  isScanning: boolean;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  stats,
  invoices,
  onOpenNewInvoice,
  onOpenNewClient,
  onSendTestReminder,
  onTriggerScan,
  onViewAllInvoices,
  isScanning,
}) => {
  const totalOutstanding = stats?.totalOutstandingCents || 0;
  const totalPaid = stats?.totalPaidCents || 0;
  const overdueInvoices = stats?.overdueInvoices || [];
  
  // Upcoming invoices (not paid, not overdue, due within next 7 days)
  const upcomingInvoices = invoices.filter((inv) => {
    if (inv.status === 'paid') return false;
    const diff = getDaysDiffFromToday(inv.dueDate);
    return diff >= 0 && diff <= 7;
  });

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Top Banner / Hero Bar */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-6 sm:p-8 border border-slate-800 text-white shadow-xl relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-semibold mb-3 border border-blue-500/30">
              <Zap className="w-3.5 h-3.5" />
              Automated Reminders Active
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Freelancer Cashflow & Invoicing
            </h1>
            <p className="text-slate-400 text-sm mt-1 max-w-xl">
              Automatic payment reminders at -3 days, on due date, and +7 days overdue with integrated Stripe pay links.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={onOpenNewInvoice}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/30 transition-all hover:scale-[1.02]"
            >
              <Plus className="w-4 h-4" />
              New Invoice
            </button>
            <button
              onClick={onOpenNewClient}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all"
            >
              <Plus className="w-4 h-4" />
              Add Client
            </button>
            <button
              onClick={onTriggerScan}
              disabled={isScanning}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-all disabled:opacity-50"
            >
              <Zap className={`w-4 h-4 ${isScanning ? 'animate-spin' : ''}`} />
              {isScanning ? 'Checking Due Dates...' : 'Run Reminder Scan'}
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Total Outstanding Card (Core Requirement) */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold tracking-wider uppercase text-slate-500">
              Total Outstanding
            </span>
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-black text-slate-900 tracking-tight">
              {formatCentsToCurrency(totalOutstanding)}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Sum of all unpaid + partial remaining balances
            </p>
          </div>
          <div className="h-1.5 w-full bg-slate-100 rounded-full mt-4 overflow-hidden">
            <div className="h-full bg-amber-500 rounded-full" style={{ width: '100%' }} />
          </div>
        </div>

        {/* Total Paid Card */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold tracking-wider uppercase text-slate-500">
              Collected & Paid
            </span>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-black text-slate-900 tracking-tight">
              {formatCentsToCurrency(totalPaid)}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Total funds successfully collected
            </p>
          </div>
          <div className="h-1.5 w-full bg-slate-100 rounded-full mt-4 overflow-hidden">
            <div className="h-full bg-emerald-500 rounded-full" style={{ width: '100%' }} />
          </div>
        </div>

        {/* Overdue Invoices Count Card */}
        <div className={`rounded-2xl p-6 border shadow-sm transition-colors ${
          overdueInvoices.length > 0 
            ? 'bg-rose-50/60 border-rose-200' 
            : 'bg-white border-slate-200'
        }`}>
          <div className="flex items-center justify-between">
            <span className={`text-xs font-semibold tracking-wider uppercase ${
              overdueInvoices.length > 0 ? 'text-rose-700' : 'text-slate-500'
            }`}>
              Overdue Invoices
            </span>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              overdueInvoices.length > 0 
                ? 'bg-rose-100 text-rose-600' 
                : 'bg-slate-100 text-slate-600'
            }`}>
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className={`text-3xl font-black tracking-tight ${
              overdueInvoices.length > 0 ? 'text-rose-700' : 'text-slate-900'
            }`}>
              {overdueInvoices.length}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Due date passed & status != paid
            </p>
          </div>
          <div className="h-1.5 w-full bg-slate-200 rounded-full mt-4 overflow-hidden">
            <div 
              className="h-full bg-rose-500 rounded-full transition-all" 
              style={{ width: overdueInvoices.length > 0 ? '100%' : '0%' }} 
            />
          </div>
        </div>

        {/* Total Invoices Count */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold tracking-wider uppercase text-slate-500">
              Total Invoices
            </span>
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Receipt className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-black text-slate-900 tracking-tight">
              {stats?.invoicesCount || 0}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Lifetime invoices managed
            </p>
          </div>
          <div className="h-1.5 w-full bg-slate-100 rounded-full mt-4 overflow-hidden">
            <div className="h-full bg-blue-500 rounded-full" style={{ width: '100%' }} />
          </div>
        </div>
      </div>

      {/* OVERDUE INVOICES LIST (CORE REQUIREMENT) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center font-bold">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                Overdue Invoices
                {overdueInvoices.length > 0 && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 font-semibold border border-rose-200">
                    {overdueInvoices.length} Require Attention
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-500">
                Invoices past their due date with outstanding balance (status != paid)
              </p>
            </div>
          </div>

          <button
            onClick={onViewAllInvoices}
            className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 self-start sm:self-auto"
          >
            Manage All Invoices &rarr;
          </button>
        </div>

        {overdueInvoices.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center mb-3">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">All Caught Up!</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              No overdue invoices detected. Your clients are paid up or ahead of schedule.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {overdueInvoices.map((inv) => {
              const diffDays = Math.abs(getDaysDiffFromToday(inv.dueDate));
              const remainingCents = Math.max(0, inv.amount - (inv.paidAmount || 0));

              return (
                <div
                  key={inv.id}
                  className="p-5 hover:bg-rose-50/30 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                      {diffDays}d
                      <span className="text-[9px] block">late</span>
                    </div>

                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-slate-900">
                          {inv.clientName}
                        </span>
                        <span className="text-xs text-slate-400">
                          ({maskEmail(inv.clientEmail)})
                        </span>
                        <span className="text-[10px] font-mono bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                          #{inv.id.slice(-6)}
                        </span>
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 border border-rose-200">
                          {diffDays === 0 ? 'Due Today' : `${diffDays} days overdue`}
                        </span>
                        {inv.status === 'partial' && (
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200">
                            Partial Paid
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-4 text-xs text-slate-500 mt-1.5">
                        <span>Due: <strong>{formatDateToReadable(inv.dueDate)}</strong></span>
                        <span>•</span>
                        <span>Total: {formatCentsToCurrency(inv.amount)}</span>
                        {inv.status === 'partial' && (
                          <>
                            <span>•</span>
                            <span className="text-emerald-600 font-medium">
                              Paid: {formatCentsToCurrency(inv.paidAmount || 0)}
                            </span>
                          </>
                        )}
                      </div>

                      {inv.notes && (
                        <p className="text-xs text-slate-500 italic mt-1 line-clamp-1">
                          "{inv.notes}"
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Balance & Actions */}
                  <div className="flex items-center justify-between md:justify-end gap-4 shrink-0 pl-14 md:pl-0 border-t md:border-t-0 pt-3 md:pt-0 border-slate-100">
                    <div className="text-right">
                      <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold block">
                        Remaining Due
                      </span>
                      <span className="text-lg font-black text-rose-600">
                        {formatCentsToCurrency(remainingCents)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <a
                        href={inv.stripePayUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white transition-colors"
                        title="Open client Stripe checkout page"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        Stripe Pay
                      </a>

                      <button
                        onClick={() => onSendTestReminder(inv.id)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 transition-colors"
                        title="Send immediate reminder email"
                      >
                        <Mail className="w-3.5 h-3.5" />
                        Remind Now
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* UPCOMING INVOICES & AUTOMATION SCHEDULE */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upcoming Invoices */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Upcoming Invoices (Next 7 Days)
              </h2>
              <p className="text-xs text-slate-500">
                Invoices nearing due date eligible for -3d or on-due reminders
              </p>
            </div>
            <button
              onClick={onViewAllInvoices}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700"
            >
              View all
            </button>
          </div>

          {upcomingInvoices.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs">
              No invoices due in the next 7 days.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {upcomingInvoices.map((inv) => {
                const daysDiff = getDaysDiffFromToday(inv.dueDate);
                return (
                  <div key={inv.id} className="py-3 flex items-center justify-between">
                    <div>
                      <div className="text-sm font-semibold text-slate-900">
                        {inv.clientName}
                      </div>
                      <div className="text-xs text-slate-500 flex items-center gap-2">
                        <span>Due {formatDateToReadable(inv.dueDate)}</span>
                        <span>•</span>
                        <span className="text-blue-600 font-medium">
                          {daysDiff === 0 ? 'Due Today' : `In ${daysDiff} days`}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-slate-900">
                        {formatCentsToCurrency(inv.amount)}
                      </div>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                        {inv.status}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Automated Reminder Cadence Info */}
        <div className="bg-gradient-to-br from-indigo-50/60 to-blue-50/40 rounded-2xl border border-indigo-100 p-6">
          <div className="flex items-center gap-2 mb-3">
            <Zap className="w-5 h-5 text-indigo-600" />
            <h3 className="text-sm font-bold text-slate-900">
              Automatic Reminder Schedule
            </h3>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed mb-4">
            The background scanner monitors every unpaid and partial invoice and automatically triggers custom Resend emails:
          </p>

          <ul className="space-y-3 text-xs text-slate-700">
            <li className="flex items-start gap-2.5">
              <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">
                1
              </span>
              <div>
                <strong>3 Days Before Due Date:</strong> Courtesy advance reminder with invoice summary and payment link.
              </div>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">
                2
              </span>
              <div>
                <strong>On Due Date:</strong> Direct reminder that payment is due today with remaining balance details.
              </div>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="w-5 h-5 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">
                3
              </span>
              <div>
                <strong>7 Days After Due Date:</strong> Escalated overdue alert highlighting payment urgency.
              </div>
            </li>
          </ul>

          <div className="mt-5 pt-4 border-t border-indigo-100/80 flex items-center justify-between">
            <span className="text-[11px] text-slate-500">Duplicate safeguard</span>
            <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              Never sends twice
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
