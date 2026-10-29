import { Client, Invoice, ReminderLog, UserSettings, CheckDueResult } from '../types';

let currentAuthToken: string | null = null;
let currentUserId: string | null = null;

export function setApiAuth(token: string | null, userId: string | null) {
  currentAuthToken = token;
  currentUserId = userId;
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers || {});
  headers.set('Content-Type', 'application/json');

  if (currentAuthToken) {
    headers.set('Authorization', `Bearer ${currentAuthToken}`);
  }
  if (currentUserId) {
    headers.set('x-user-id', currentUserId);
  }

  const response = await fetch(endpoint, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorMessage = `HTTP ${response.status}`;
    try {
      const errorData = await response.json();
      if (errorData.error) {
        errorMessage = errorData.error;
      }
    } catch {
      // Use status
    }
    throw new Error(errorMessage);
  }

  return response.json();
}

export const api = {
  // Stats
  getStats: () =>
    request<{
      totalOutstandingCents: number;
      totalPaidCents: number;
      totalInvoicedCents: number;
      invoicesCount: number;
      overdueCount: number;
      overdueInvoices: Invoice[];
    }>('/api/stats'),

  // User Settings
  getUserSettings: () => request<UserSettings>('/api/user/settings'),
  updateUserSettings: (data: Partial<UserSettings>) =>
    request<UserSettings>('/api/user/settings', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  // Clients
  getClients: () => request<Client[]>('/api/clients'),
  createClient: (data: { name: string; email: string }) =>
    request<Client>('/api/clients', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateClient: (id: string, data: { name?: string; email?: string }) =>
    request<Client>(`/api/clients/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  deleteClient: (id: string) =>
    request<{ success: boolean; message: string }>(`/api/clients/${id}`, {
      method: 'DELETE',
    }),

  // Invoices
  getInvoices: () => request<Invoice[]>('/api/invoices'),
  createInvoice: (data: {
    clientId: string;
    amount: number;
    dueDate: string;
    stripePayUrl: string;
    status?: 'unpaid' | 'partial' | 'paid';
    paidAmount?: number;
    notes?: string;
  }) =>
    request<Invoice>('/api/invoices', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateInvoice: (
    id: string,
    data: Partial<{
      clientId: string;
      amount: number;
      paidAmount: number;
      status: 'unpaid' | 'partial' | 'paid';
      dueDate: string;
      stripePayUrl: string;
      notes: string;
    }>
  ) =>
    request<Invoice>(`/api/invoices/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  deleteInvoice: (id: string) =>
    request<{ success: boolean; message: string }>(`/api/invoices/${id}`, {
      method: 'DELETE',
    }),
  sendTestReminder: (id: string) =>
    request<{
      success: boolean;
      simulated: boolean;
      clientEmailMasked: string;
      subject: string;
      bodySnippet: string;
      error?: string;
    }>(`/api/invoices/${id}/send-reminder`, {
      method: 'POST',
    }),

  // Reminders
  checkDue: () =>
    request<CheckDueResult>('/api/check-due', {
      method: 'POST',
    }),
  getReminderLogs: () => request<ReminderLog[]>('/api/reminders/logs'),
};
