import React, { useState } from 'react';
import { Client, Invoice, InvoiceStatus } from '../types';
import { 
  formatCentsToCurrency, 
  formatDateToReadable, 
  getDaysDiffFromToday, 
  isInvoiceOverdue, 
  maskEmail 
} from '../lib/utils';
import { 
  Plus, 
  Search, 
  Filter, 
  ExternalLink, 
  Mail, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  Trash2, 
  Edit3, 
  DollarSign, 
  Calendar,
  Link as LinkIcon,
  HelpCircle,
  X
} from 'lucide-react';

interface InvoicesViewProps {
  invoices: Invoice[];
  clients: Client[];
  onCreateInvoice: (data: {
    clientId: string;
    amount: number;
    dueDate: string;
    stripePayUrl: string;
    status: InvoiceStatus;
    paidAmount?: number;
    notes?: string;
  }) => Promise<void>;
  onUpdateInvoice: (
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
  ) => Promise<void>;
  onDeleteInvoice: (id: string) => Promise<void>;
  onSendTestReminder: (invoiceId: string) => Promise<void>;
  onOpenNewClient: () => void;
}

export const InvoicesView: React.FC<InvoicesViewProps> = ({
  invoices,
  clients,
  onCreateInvoice,
  onUpdateInvoice,
  onDeleteInvoice,
  onSendTestReminder,
  onOpenNewClient,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'unpaid' | 'partial' | 'paid' | 'overdue'>('all');
  
  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [paymentUpdateModalInvoice, setPaymentUpdateModalInvoice] = useState<Invoice | null>(null);
  const [deleteConfirmInvoice, setDeleteConfirmInvoice] = useState<Invoice | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Create/Edit Form State
  const [formClientId, setFormClientId] = useState('');
  const [formAmountDollars, setFormAmountDollars] = useState('500.00'); // helper string
  const [formAmountCents, setFormAmountCents] = useState(50000); // exact integer cents
  const [formDueDate, setFormDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return d.toISOString().split('T')[0];
  });
  const [formStripePayUrl, setFormStripePayUrl] = useState('https://buy.stripe.com/test_freelance500');
  const [formStatus, setFormStatus] = useState<InvoiceStatus>('unpaid');
  const [formPaidAmountDollars, setFormPaidAmountDollars] = useState('0.00');
  const [formPaidAmountCents, setFormPaidAmountCents] = useState(0);
  const [formNotes, setFormNotes] = useState('');

  // Payment status modal state
  const [paymentStatusTarget, setPaymentStatusTarget] = useState<InvoiceStatus>('paid');
  const [paymentAmountCents, setPaymentAmountCents] = useState(0);
  const [paymentAmountDollars, setPaymentAmountDollars] = useState('0.00');

  // Handle dollar input change
  const handleAmountDollarsChange = (val: string) => {
    setFormAmountDollars(val);
    const parsed = parseFloat(val);
    if (!isNaN(parsed) && parsed > 0) {
      setFormAmountCents(Math.round(parsed * 100));
    } else {
      setFormAmountCents(0);
    }
  };

  const handlePaidAmountDollarsChange = (val: string) => {
    setFormPaidAmountDollars(val);
    const parsed = parseFloat(val);
    if (!isNaN(parsed) && parsed >= 0) {
      setFormPaidAmountCents(Math.round(parsed * 100));
    } else {
      setFormPaidAmountCents(0);
    }
  };

  const openCreateModal = () => {
    setFormError(null);
    setFormClientId(clients[0]?.id || '');
    setFormAmountDollars('500.00');
    setFormAmountCents(50000);
    const d = new Date();
    d.setDate(d.getDate() + 14);
    setFormDueDate(d.toISOString().split('T')[0]);
    setFormStripePayUrl('https://buy.stripe.com/test_invoice');
    setFormStatus('unpaid');
    setFormPaidAmountDollars('0.00');
    setFormPaidAmountCents(0);
    setFormNotes('');
    setIsCreateModalOpen(true);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formClientId) {
      setFormError('Please select or add a client.');
      return;
    }

    if (!Number.isInteger(formAmountCents) || formAmountCents <= 0 || formAmountCents > 100_000_000) {
      setFormError('Amount must be a positive integer in cents <= 100,000,000 ($1,000,000.00).');
      return;
    }

    if (!formDueDate || isNaN(Date.parse(formDueDate))) {
      setFormError('Please select a valid due date.');
      return;
    }

    if (!formStripePayUrl.trim().startsWith('http://') && !formStripePayUrl.trim().startsWith('https://')) {
      setFormError('Please enter a valid Stripe payment link (starts with https://).');
      return;
    }

    if (formStatus === 'partial') {
      if (formPaidAmountCents <= 0 || formPaidAmountCents >= formAmountCents) {
        setFormError('For partial payment, paid amount must be greater than $0 and less than total invoice amount.');
        return;
      }
    }

    setSubmitting(true);
    try {
      await onCreateInvoice({
        clientId: formClientId,
        amount: formAmountCents,
        dueDate: new Date(formDueDate).toISOString(),
        stripePayUrl: formStripePayUrl.trim(),
        status: formStatus,
        paidAmount: formStatus === 'partial' ? formPaidAmountCents : formStatus === 'paid' ? formAmountCents : 0,
        notes: formNotes,
      });
      setIsCreateModalOpen(false);
    } catch (err: any) {
      setFormError(err.message || 'Failed to create invoice');
    } finally {
      setSubmitting(false);
    }
  };

  // Open Edit Modal
  const openEditModal = (inv: Invoice) => {
    setFormError(null);
    setEditingInvoice(inv);
    setFormClientId(inv.clientId);
    setFormAmountCents(inv.amount);
    setFormAmountDollars((inv.amount / 100).toFixed(2));
    setFormDueDate(inv.dueDate.split('T')[0]);
    setFormStripePayUrl(inv.stripePayUrl);
    setFormStatus(inv.status);
    setFormPaidAmountCents(inv.paidAmount || 0);
    setFormPaidAmountDollars(((inv.paidAmount || 0) / 100).toFixed(2));
    setFormNotes(inv.notes || '');
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingInvoice) return;
    setFormError(null);

    if (!Number.isInteger(formAmountCents) || formAmountCents <= 0 || formAmountCents > 100_000_000) {
      setFormError('Amount must be a positive integer in cents <= 100,000,000.');
      return;
    }

    setSubmitting(true);
    try {
      await onUpdateInvoice(editingInvoice.id, {
        clientId: formClientId,
        amount: formAmountCents,
        dueDate: new Date(formDueDate).toISOString(),
        stripePayUrl: formStripePayUrl.trim(),
        status: formStatus,
        paidAmount: formStatus === 'partial' ? formPaidAmountCents : formStatus === 'paid' ? formAmountCents : 0,
        notes: formNotes,
      });
      setEditingInvoice(null);
    } catch (err: any) {
      setFormError(err.message || 'Failed to update invoice');
    } finally {
      setSubmitting(false);
    }
  };

  // Open Payment Update Modal
  const openPaymentUpdateModal = (inv: Invoice) => {
    setPaymentUpdateModalInvoice(inv);
    setPaymentStatusTarget(inv.status === 'paid' ? 'unpaid' : 'paid');
    const remaining = Math.max(0, inv.amount - (inv.paidAmount || 0));
    setPaymentAmountCents(remaining);
    setPaymentAmountDollars((remaining / 100).toFixed(2));
  };

  const handleSavePaymentStatus = async () => {
    if (!paymentUpdateModalInvoice) return;
    setSubmitting(true);
    try {
      let finalPaidAmount = 0;
      if (paymentStatusTarget === 'paid') {
        finalPaidAmount = paymentUpdateModalInvoice.amount;
      } else if (paymentStatusTarget === 'partial') {
        finalPaidAmount = paymentAmountCents;
      } else {
        finalPaidAmount = 0;
      }

      await onUpdateInvoice(paymentUpdateModalInvoice.id, {
        status: paymentStatusTarget,
        paidAmount: finalPaidAmount,
      });
      setPaymentUpdateModalInvoice(null);
    } catch (err: any) {
      alert(err.message || 'Failed to update payment status');
    } finally {
      setSubmitting(false);
    }
  };

  // Filter and search logic
  const filteredInvoices = invoices.filter((inv) => {
    // Search filter
    if (searchQuery.trim().length > 0) {
      const q = searchQuery.toLowerCase();
      const matchName = inv.clientName.toLowerCase().includes(q);
      const matchId = inv.id.toLowerCase().includes(q);
      const matchNotes = (inv.notes || '').toLowerCase().includes(q);
      if (!matchName && !matchId && !matchNotes) return false;
    }

    // Status filter
    if (statusFilter === 'all') return true;
    if (statusFilter === 'overdue') return isInvoiceOverdue(inv);
    return inv.status === statusFilter;
  });

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Invoices
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Create, track, and send Stripe payment links to clients
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-600/20 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Create Invoice
        </button>
      </div>

      {/* Filter Tabs and Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Status Pill Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          {(
            [
              { id: 'all', label: 'All Invoices' },
              { id: 'unpaid', label: 'Unpaid' },
              { id: 'partial', label: 'Partial' },
              { id: 'paid', label: 'Paid' },
              { id: 'overdue', label: 'Overdue' },
            ] as const
          ).map((tab) => {
            const count = invoices.filter((inv) => {
              if (tab.id === 'all') return true;
              if (tab.id === 'overdue') return isInvoiceOverdue(inv);
              return inv.status === tab.id;
            }).length;

            return (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                  statusFilter === tab.id
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {tab.label}
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    statusFilter === tab.id
                      ? 'bg-slate-800 text-slate-300'
                      : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search input */}
        <div className="relative min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search client, ID, notes..."
            className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 focus:bg-white"
          />
        </div>
      </div>

      {/* Invoice Cards / Table */}
      {filteredInvoices.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center mb-3">
            <Filter className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-slate-900">No invoices match your filter</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Try switching filters, clearing your search term, or create a brand new invoice.
          </p>
          <button
            onClick={openCreateModal}
            className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 text-white hover:bg-blue-500"
          >
            <Plus className="w-3.5 h-3.5" />
            Create First Invoice
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredInvoices.map((inv) => {
            const isOverdue = isInvoiceOverdue(inv);
            const daysDiff = getDaysDiffFromToday(inv.dueDate);
            const remainingCents = Math.max(0, inv.amount - (inv.paidAmount || 0));

            return (
              <div
                key={inv.id}
                className={`bg-white rounded-2xl border shadow-sm p-5 transition-all hover:shadow-md ${
                  isOverdue
                    ? 'border-rose-300 ring-1 ring-rose-200'
                    : inv.status === 'paid'
                    ? 'border-emerald-200'
                    : 'border-slate-200'
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Left Column: Client & Status */}
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="text-base font-bold text-slate-900">
                        {inv.clientName}
                      </span>
                      <span className="text-xs text-slate-400">
                        {maskEmail(inv.clientEmail)}
                      </span>
                      <span className="text-xs font-mono bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                        #{inv.id.slice(-6)}
                      </span>

                      {/* Status Badges */}
                      {inv.status === 'paid' && (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3" />
                          Paid in Full
                        </span>
                      )}

                      {inv.status === 'partial' && (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                          <Clock className="w-3 h-3" />
                          Partial Paid
                        </span>
                      )}

                      {inv.status === 'unpaid' && (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200">
                          Unpaid
                        </span>
                      )}

                      {isOverdue && (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-200">
                          <AlertTriangle className="w-3 h-3" />
                          {Math.abs(daysDiff)} Days Overdue
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        Due: <strong>{formatDateToReadable(inv.dueDate)}</strong>
                        <span className="text-slate-400">
                          ({daysDiff === 0 ? 'Today' : daysDiff > 0 ? `in ${daysDiff} days` : `${Math.abs(daysDiff)}d ago`})
                        </span>
                      </span>

                      <span>•</span>

                      {/* Reminder Flags Indicator */}
                      <span className="flex items-center gap-1.5" title="Reminders sent flags">
                        <span className="text-[11px] text-slate-400">Reminders:</span>
                        <span
                          className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                            inv.reminderSent?.before3
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-slate-100 text-slate-400'
                          }`}
                          title="-3 days reminder sent"
                        >
                          -3d {inv.reminderSent?.before3 ? '✓' : '—'}
                        </span>
                        <span
                          className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                            inv.reminderSent?.onDue
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-slate-100 text-slate-400'
                          }`}
                          title="On-due date reminder sent"
                        >
                          due {inv.reminderSent?.onDue ? '✓' : '—'}
                        </span>
                        <span
                          className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                            inv.reminderSent?.after7
                              ? 'bg-rose-100 text-rose-700'
                              : 'bg-slate-100 text-slate-400'
                          }`}
                          title="+7 days overdue reminder sent"
                        >
                          +7d {inv.reminderSent?.after7 ? '✓' : '—'}
                        </span>
                      </span>
                    </div>

                    {inv.notes && (
                      <p className="text-xs text-slate-600 italic bg-slate-50 p-2 rounded-lg border border-slate-100 max-w-2xl">
                        "{inv.notes}"
                      </p>
                    )}
                  </div>

                  {/* Right Column: Financials & Action Buttons */}
                  <div className="flex flex-col sm:flex-row lg:flex-col xl:flex-row items-start sm:items-center justify-between lg:justify-end gap-4 border-t lg:border-t-0 pt-3 lg:pt-0 border-slate-100">
                    {/* Financial Amounts */}
                    <div className="text-left sm:text-right">
                      <div className="text-xs text-slate-400">Total Invoice</div>
                      <div className="text-lg font-bold text-slate-900">
                        {formatCentsToCurrency(inv.amount)}
                      </div>
                      {inv.status === 'partial' && (
                        <div className="text-xs text-amber-700 font-semibold">
                          Remaining: {formatCentsToCurrency(remainingCents)}
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {/* Stripe Pay Button */}
                      <a
                        href={inv.stripePayUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white transition-colors"
                        title="Open Stripe payment checkout link"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        Pay Link
                      </a>

                      {/* Payment Status updater */}
                      <button
                        onClick={() => openPaymentUpdateModal(inv)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                        title="Update payment status (paid or partial)"
                      >
                        <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                        Payment
                      </button>

                      {/* Immediate Reminder Email */}
                      <button
                        onClick={() => onSendTestReminder(inv.id)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 transition-colors"
                        title="Send immediate reminder notice now"
                      >
                        <Mail className="w-3.5 h-3.5" />
                        Remind
                      </button>

                      {/* Edit */}
                      <button
                        onClick={() => openEditModal(inv)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                        title="Edit invoice"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>

                      {/* Delete */}
                      <button
                        onClick={() => setDeleteConfirmInvoice(inv)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                        title="Delete invoice"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CREATE INVOICE MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden animate-scaleIn">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Create New Invoice</h3>
                <p className="text-xs text-slate-500">Amounts are strictly stored as integer cents.</p>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 text-xs font-medium">
                  {formError}
                </div>
              )}

              {/* Client Selection */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-700">Select Client *</label>
                  <button
                    type="button"
                    onClick={() => {
                      setIsCreateModalOpen(false);
                      onOpenNewClient();
                    }}
                    className="text-[11px] font-semibold text-blue-600 hover:text-blue-700"
                  >
                    + Add New Client
                  </button>
                </div>
                {clients.length === 0 ? (
                  <div className="p-3 rounded-xl bg-amber-50 text-amber-800 text-xs border border-amber-200 flex items-center justify-between">
                    <span>No clients found. Add a client first.</span>
                    <button
                      type="button"
                      onClick={() => {
                        setIsCreateModalOpen(false);
                        onOpenNewClient();
                      }}
                      className="font-bold underline"
                    >
                      Add Client
                    </button>
                  </div>
                ) : (
                  <select
                    value={formClientId}
                    onChange={(e) => setFormClientId(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({maskEmail(c.email)})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Amount in Cents / Dollars */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1.5">
                    Amount (USD) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      max="1000000"
                      value={formAmountDollars}
                      onChange={(e) => handleAmountDollarsChange(e.target.value)}
                      required
                      placeholder="500.00"
                      className="w-full pl-7 pr-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1.5">
                    Amount in Cents (Integer)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100000000"
                    value={formAmountCents}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10) || 0;
                      setFormAmountCents(val);
                      setFormAmountDollars((val / 100).toFixed(2));
                    }}
                    required
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono bg-slate-50 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                  <span className="text-[10px] text-slate-400 block mt-0.5">Stored as integer cents</span>
                </div>
              </div>

              {/* Due Date & Status */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1.5">
                    Due Date *
                  </label>
                  <input
                    type="date"
                    value={formDueDate}
                    onChange={(e) => setFormDueDate(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1.5">
                    Initial Status
                  </label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as InvoiceStatus)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="unpaid">Unpaid</option>
                    <option value="partial">Partial Payment</option>
                    <option value="paid">Paid</option>
                  </select>
                </div>
              </div>

              {/* Partial Payment Amount if status is partial */}
              {formStatus === 'partial' && (
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200">
                  <label className="text-xs font-bold text-amber-900 block mb-1.5">
                    Already Paid Amount ($)
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      max={(formAmountCents / 100) - 0.01}
                      value={formPaidAmountDollars}
                      onChange={(e) => handlePaidAmountDollarsChange(e.target.value)}
                      required
                      placeholder="250.00"
                      className="w-full px-3 py-2 rounded-xl border border-amber-300 text-xs bg-white focus:outline-none"
                    />
                    <div className="text-xs text-amber-800 flex items-center font-semibold">
                      Remaining: {formatCentsToCurrency(Math.max(0, formAmountCents - formPaidAmountCents))}
                    </div>
                  </div>
                </div>
              )}

              {/* Stripe Payment Link URL */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">
                  Stripe Payment Link URL *
                </label>
                <div className="relative">
                  <LinkIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="url"
                    value={formStripePayUrl}
                    onChange={(e) => setFormStripePayUrl(e.target.value)}
                    required
                    placeholder="https://buy.stripe.com/..."
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <span className="text-[10px] text-slate-400 block mt-1">
                  Create a payment link in your Stripe Dashboard and paste it here.
                </span>
              </div>

              {/* Notes */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">
                  Notes / Description (Optional)
                </label>
                <textarea
                  rows={2}
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="e.g. Website redesign Sprint 2 deliverables..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              {/* Buttons */}
              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white shadow-md disabled:opacity-50"
                >
                  {submitting ? 'Creating Invoice...' : 'Create Invoice'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT INVOICE MODAL */}
      {editingInvoice && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden animate-scaleIn">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Edit Invoice #{editingInvoice.id.slice(-6)}</h3>
                <p className="text-xs text-slate-500">Update invoice details or payment link</p>
              </div>
              <button
                onClick={() => setEditingInvoice(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 text-xs font-medium">
                  {formError}
                </div>
              )}

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">Client</label>
                <select
                  value={formClientId}
                  onChange={(e) => setFormClientId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1.5">Amount (USD)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formAmountDollars}
                    onChange={(e) => handleAmountDollarsChange(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1.5">Due Date</label>
                  <input
                    type="date"
                    value={formDueDate}
                    onChange={(e) => setFormDueDate(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">Status</label>
                <select
                  value={formStatus}
                  onChange={(e) => setFormStatus(e.target.value as InvoiceStatus)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="unpaid">Unpaid</option>
                  <option value="partial">Partial</option>
                  <option value="paid">Paid</option>
                </select>
              </div>

              {formStatus === 'partial' && (
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200">
                  <label className="text-xs font-bold text-amber-900 block mb-1.5">Paid Amount ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formPaidAmountDollars}
                    onChange={(e) => handlePaidAmountDollarsChange(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-amber-300 text-xs bg-white"
                  />
                </div>
              )}

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">Stripe Payment Link</label>
                <input
                  type="url"
                  value={formStripePayUrl}
                  onChange={(e) => setFormStripePayUrl(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">Notes</label>
                <textarea
                  rows={2}
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEditingInvoice(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white shadow-md disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* UPDATE PAYMENT STATUS MODAL */}
      {paymentUpdateModalInvoice && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-scaleIn p-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">
                Record Payment: #{paymentUpdateModalInvoice.id.slice(-6)}
              </h3>
              <button
                onClick={() => setPaymentUpdateModalInvoice(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-4 space-y-4">
              <div className="p-3 bg-slate-50 rounded-xl text-xs flex justify-between">
                <span>Total Invoice:</span>
                <strong>{formatCentsToCurrency(paymentUpdateModalInvoice.amount)}</strong>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">Select New Status</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['unpaid', 'partial', 'paid'] as InvoiceStatus[]).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setPaymentStatusTarget(st)}
                      className={`py-2 px-3 rounded-xl text-xs font-semibold capitalize border transition-all ${
                        paymentStatusTarget === st
                          ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              {paymentStatusTarget === 'partial' && (
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1.5">
                    Amount Paid by Client ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    max={(paymentUpdateModalInvoice.amount / 100) - 0.01}
                    value={paymentAmountDollars}
                    onChange={(e) => {
                      setPaymentAmountDollars(e.target.value);
                      const parsed = parseFloat(e.target.value);
                      if (!isNaN(parsed) && parsed > 0) {
                        setPaymentAmountCents(Math.round(parsed * 100));
                      }
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none"
                  />
                  <span className="text-[11px] text-slate-500 block mt-1">
                    Remaining balance:{' '}
                    <strong>
                      {formatCentsToCurrency(
                        Math.max(0, paymentUpdateModalInvoice.amount - paymentAmountCents)
                      )}
                    </strong>
                  </span>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setPaymentUpdateModalInvoice(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSavePaymentStatus}
                disabled={submitting}
                className="px-5 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm disabled:opacity-50"
              >
                {submitting ? 'Updating...' : 'Confirm Payment'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deleteConfirmInvoice && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full shadow-2xl border border-slate-200 p-6 text-center animate-scaleIn">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 mx-auto flex items-center justify-center mb-3">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Delete Invoice?</h3>
            <p className="text-xs text-slate-500 mt-1">
              Are you sure you want to delete invoice #{deleteConfirmInvoice.id.slice(-6)} for {deleteConfirmInvoice.clientName}? This action cannot be undone.
            </p>
            <div className="mt-5 flex items-center justify-center gap-3">
              <button
                onClick={() => setDeleteConfirmInvoice(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  await onDeleteInvoice(deleteConfirmInvoice.id);
                  setDeleteConfirmInvoice(null);
                }}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white shadow-sm"
              >
                Delete Invoice
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
