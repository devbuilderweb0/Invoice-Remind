export type InvoiceStatus = 'unpaid' | 'partial' | 'paid';

export interface ReminderFlags {
  before3: boolean; // 3 days before due date
  onDue: boolean;   // On due date
  after7: boolean;  // 7 days after due date
}

export interface Client {
  id: string;
  userId: string;
  name: string;
  email: string;
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
}

export interface Invoice {
  id: string;
  userId: string;
  clientId: string;
  clientName: string;
  clientEmail: string;
  amount: number;       // In cents (integer, e.g. $100.00 is 10000)
  paidAmount: number;   // In cents (integer, default 0)
  status: InvoiceStatus;
  dueDate: string;      // ISO string
  stripePayUrl: string; // Stripe payment link URL
  notes?: string;
  reminderSent: ReminderFlags;
  createdAt: string;    // ISO string
  updatedAt: string;    // ISO string
}

export interface UserSettings {
  userId: string;
  email: string;
  displayName: string;
  businessName?: string;
  emailTemplate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ReminderLog {
  id: string;
  userId: string;
  invoiceId: string;
  clientName: string;
  clientEmailMasked: string;
  reminderType: 'before3' | 'onDue' | 'after7' | 'manual';
  status: 'sent' | 'simulated' | 'failed';
  details?: string;
  sentAt: string; // ISO string
}

export interface CheckDueResult {
  scannedCount: number;
  remindersSent: number;
  logs: ReminderLog[];
  timestamp: string;
  message: string;
}
