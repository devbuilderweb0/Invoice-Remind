import React, { useState } from 'react';
import { ReminderLog, CheckDueResult } from '../types';
import { formatDateToReadable } from '../lib/utils';
import { 
  BellRing, 
  Zap, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  ShieldCheck, 
  RefreshCw,
  Mail,
  Send,
  Calendar
} from 'lucide-react';

interface RemindersViewProps {
  logs: ReminderLog[];
  onTriggerScan: () => Promise<CheckDueResult | null>;
  isScanning: boolean;
  lastScanResult: CheckDueResult | null;
}

export const RemindersView: React.FC<RemindersViewProps> = ({
  logs,
  onTriggerScan,
  isScanning,
  lastScanResult,
}) => {
  const [filterType, setFilterType] = useState<string>('all');

  const filteredLogs = logs.filter((l) => {
    if (filterType === 'all') return true;
    return l.reminderType === filterType;
  });

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Automated Payment Reminders
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Automated email dispatch engine powered by Resend with duplicate protection
          </p>
        </div>

        <button
          onClick={onTriggerScan}
          disabled={isScanning}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/20 transition-all disabled:opacity-50 self-start sm:self-auto hover:scale-[1.02]"
        >
          <Zap className={`w-4 h-4 ${isScanning ? 'animate-spin' : ''}`} />
          {isScanning ? 'Running POST /api/check-due...' : 'Run Automated Scan Now'}
        </button>
      </div>

      {/* Cadence Architecture Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Step 1: 3 Days Before */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
              Stage 1
            </span>
            <span className="text-xs font-mono text-slate-400">reminderSent.before3</span>
          </div>

          <div className="mt-4">
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-sm mb-3">
              -3d
            </div>
            <h3 className="text-base font-bold text-slate-900">3 Days Before Due Date</h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Scans unpaid and partial invoices whose due date is in 3 days. Sends a gentle advance reminder with Stripe link.
            </p>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
            <span>Flag check</span>
            <span className="font-semibold text-blue-600">before3 == false</span>
          </div>
        </div>

        {/* Step 2: On Due Date */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
              Stage 2
            </span>
            <span className="text-xs font-mono text-slate-400">reminderSent.onDue</span>
          </div>

          <div className="mt-4">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-sm mb-3">
              Due
            </div>
            <h3 className="text-base font-bold text-slate-900">On Due Date</h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Dispatches on the invoice due date. Shows remaining balance for partial payments and requests prompt payment.
            </p>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
            <span>Flag check</span>
            <span className="font-semibold text-amber-600">onDue == false</span>
          </div>
        </div>

        {/* Step 3: 7 Days After */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200">
              Stage 3
            </span>
            <span className="text-xs font-mono text-slate-400">reminderSent.after7</span>
          </div>

          <div className="mt-4">
            <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center font-bold text-sm mb-3">
              +7d
            </div>
            <h3 className="text-base font-bold text-slate-900">7 Days Overdue</h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Escalated past-due reminder sent 7 days after the due date if payment is still incomplete.
            </p>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
            <span>Flag check</span>
            <span className="font-semibold text-rose-600">after7 == false</span>
          </div>
        </div>
      </div>

      {/* Last Scan Result Banner */}
      {lastScanResult && (
        <div className="bg-slate-900 rounded-2xl p-6 border border-slate-800 text-white shadow-lg animate-fadeIn">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">
                  Invoice Due Date Scan Completed
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {lastScanResult.message}
                </p>
              </div>
            </div>

            <div className="text-right">
              <span className="text-xs text-slate-400">Reminders Dispatched</span>
              <div className="text-xl font-bold text-emerald-400">
                {lastScanResult.remindersSent}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Security & Invariant Guarantee Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-2">
          <ShieldCheck className="w-5 h-5 text-emerald-600" />
          <h3 className="text-sm font-bold text-slate-900">
            Security & Anti-Duplicate Guarantees
          </h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-slate-600 mt-3">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <strong className="block text-slate-900 mb-1">State Lock Invariant</strong>
            Once a reminder flag is set to true on the invoice document, it is locked. The backend verifies this flag prior to any dispatch.
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <strong className="block text-slate-900 mb-1">Zero PII Leak in Logs</strong>
            All client emails in server output and audit tables are strictly masked (e.g. j***n@domain.com) to comply with privacy rules.
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <strong className="block text-slate-900 mb-1">Ownership Validation</strong>
            Every scan verifies req.user so freelancers only evaluate and dispatch notices for their own authorized client invoices.
          </div>
        </div>
      </div>

      {/* Reminder Audit Logs Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Reminder Dispatch Log
            </h2>
            <p className="text-xs text-slate-500">
              Audit trail of every reminder evaluated and dispatched
            </p>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              <option value="all">All Reminder Types</option>
              <option value="before3">Stage 1 (-3 Days)</option>
              <option value="onDue">Stage 2 (On Due Date)</option>
              <option value="after7">Stage 3 (7 Days Overdue)</option>
              <option value="manual">Manual Immediate</option>
            </select>
          </div>
        </div>

        {filteredLogs.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center mb-3">
              <Mail className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">No reminder logs found</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Run an automated scan or send a manual test reminder from any invoice to generate logs.
            </p>
            <button
              onClick={onTriggerScan}
              disabled={isScanning}
              className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-500"
            >
              <Zap className="w-3.5 h-3.5" />
              Run First Scan
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500 border-b border-slate-100 font-semibold">
                <tr>
                  <th className="px-6 py-3.5">Client & Email</th>
                  <th className="px-6 py-3.5">Invoice</th>
                  <th className="px-6 py-3.5">Reminder Type</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5">Dispatched At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredLogs.map((log) => {
                  let badge = (
                    <span className="px-2 py-0.5 rounded font-mono text-[10px] bg-slate-100 text-slate-700">
                      {log.reminderType}
                    </span>
                  );

                  if (log.reminderType === 'before3') {
                    badge = (
                      <span className="px-2 py-0.5 rounded font-semibold text-[10px] bg-blue-100 text-blue-800">
                        3 Days Before
                      </span>
                    );
                  } else if (log.reminderType === 'onDue') {
                    badge = (
                      <span className="px-2 py-0.5 rounded font-semibold text-[10px] bg-amber-100 text-amber-800">
                        On Due Date
                      </span>
                    );
                  } else if (log.reminderType === 'after7') {
                    badge = (
                      <span className="px-2 py-0.5 rounded font-semibold text-[10px] bg-rose-100 text-rose-800">
                        7 Days Overdue
                      </span>
                    );
                  } else if (log.reminderType === 'manual') {
                    badge = (
                      <span className="px-2 py-0.5 rounded font-semibold text-[10px] bg-purple-100 text-purple-800">
                        Manual Send
                      </span>
                    );
                  }

                  return (
                    <tr key={log.id} className="hover:bg-slate-50/50">
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-900">{log.clientName}</div>
                        <div className="text-slate-400 font-mono text-[11px]">
                          {log.clientEmailMasked}
                        </div>
                      </td>
                      <td className="px-6 py-4 font-mono text-slate-600">
                        #{log.invoiceId.slice(-6)}
                      </td>
                      <td className="px-6 py-4">{badge}</td>
                      <td className="px-6 py-4">
                        {log.status === 'sent' && (
                          <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Sent via Resend
                          </span>
                        )}
                        {log.status === 'simulated' && (
                          <span className="inline-flex items-center gap-1 text-blue-600 font-semibold" title={log.details}>
                            <Zap className="w-3.5 h-3.5" />
                            Simulated (Test Mode)
                          </span>
                        )}
                        {log.status === 'failed' && (
                          <span className="inline-flex items-center gap-1 text-rose-600 font-semibold" title={log.details}>
                            <AlertTriangle className="w-3.5 h-3.5" />
                            Failed
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-slate-400">
                        {formatDateToReadable(log.sentAt)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
