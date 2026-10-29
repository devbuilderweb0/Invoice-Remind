import fs from 'fs';
import path from 'path';
import { Client, Invoice, ReminderLog, UserSettings } from '../src/types';
import { isValidEmail, maskEmail } from '../src/lib/utils';

interface DataStoreSchema {
  users: Record<string, UserSettings>;
  clients: Record<string, Client>;
  invoices: Record<string, Invoice>;
  logs: ReminderLog[];
}

const DATA_DIR = path.resolve(process.cwd(), '.data');
const DATA_FILE = path.resolve(DATA_DIR, 'store.json');

class DataStore {
  private data: DataStoreSchema = {
    users: {},
    clients: {},
    invoices: {},
    logs: [],
  };
  private isLoaded = false;

  constructor() {
    this.load();
  }

  private load() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      if (fs.existsSync(DATA_FILE)) {
        const raw = fs.readFileSync(DATA_FILE, 'utf-8');
        this.data = JSON.parse(raw);
      } else {
        this.seedInitialData();
        this.save();
      }
      this.isLoaded = true;
    } catch (err) {
      console.error('[DATASTORE] Error initializing store:', err);
      this.seedInitialData();
    }
  }

  private save() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(DATA_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (err) {
      console.error('[DATASTORE] Failed to persist data to disk:', err);
    }
  }

  private seedInitialData() {
    // Demo user for instant evaluation
    const demoUserId = 'demo-freelancer-uid';
    const now = new Date();
    
    // Seed sample user
    this.data.users[demoUserId] = {
      userId: demoUserId,
      email: 'demo@freelancerflow.dev',
      displayName: 'Alex Morgan',
      businessName: 'Morgan Creative Studio',
      emailTemplate: '',
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };

    // Seed sample clients
    const client1Id = 'cli_acme_corp';
    const client2Id = 'cli_apex_media';
    const client3Id = 'cli_starlight_labs';

    this.data.clients[client1Id] = {
      id: client1Id,
      userId: demoUserId,
      name: 'Acme Corporation (Sarah Chen)',
      email: 'billing@acmecorp.com',
      createdAt: new Date(now.getTime() - 25 * 86400000).toISOString(),
      updatedAt: new Date(now.getTime() - 25 * 86400000).toISOString(),
    };

    this.data.clients[client2Id] = {
      id: client2Id,
      userId: demoUserId,
      name: 'Apex Digital Media',
      email: 'invoices@apexdigital.io',
      createdAt: new Date(now.getTime() - 15 * 86400000).toISOString(),
      updatedAt: new Date(now.getTime() - 15 * 86400000).toISOString(),
    };

    this.data.clients[client3Id] = {
      id: client3Id,
      userId: demoUserId,
      name: 'Starlight Tech Labs',
      email: 'accounts@starlightlabs.net',
      createdAt: new Date(now.getTime() - 5 * 86400000).toISOString(),
      updatedAt: new Date(now.getTime() - 5 * 86400000).toISOString(),
    };

    // Calculate sample dates
    // 1. Overdue by 8 days (eligible for after7 reminder)
    const overdueDate = new Date(now.getTime() - 8 * 86400000).toISOString();
    // 2. Due today (eligible for onDue reminder)
    const dueTodayDate = new Date(now.getTime() + 1000 * 60 * 60).toISOString();
    // 3. Due in 3 days (eligible for before3 reminder)
    const dueIn3DaysDate = new Date(now.getTime() + 3 * 86400000).toISOString();
    // 4. Paid invoice
    const pastPaidDate = new Date(now.getTime() - 20 * 86400000).toISOString();

    const inv1Id = 'inv_1001';
    const inv2Id = 'inv_1002';
    const inv3Id = 'inv_1003';
    const inv4Id = 'inv_1004';

    this.data.invoices[inv1Id] = {
      id: inv1Id,
      userId: demoUserId,
      clientId: client1Id,
      clientName: 'Acme Corporation (Sarah Chen)',
      clientEmail: 'billing@acmecorp.com',
      amount: 150000, // $1,500.00
      paidAmount: 50000, // $500.00 paid -> $1,000.00 outstanding (partial)
      status: 'partial',
      dueDate: overdueDate,
      stripePayUrl: 'https://buy.stripe.com/test_eVaeVb5093Acme1500',
      notes: 'Website Redesign Milestone 2 - 8 days overdue',
      reminderSent: {
        before3: true,
        onDue: true,
        after7: false, // Ready for after7 reminder!
      },
      createdAt: new Date(now.getTime() - 25 * 86400000).toISOString(),
      updatedAt: new Date(now.getTime() - 8 * 86400000).toISOString(),
    };

    this.data.invoices[inv2Id] = {
      id: inv2Id,
      userId: demoUserId,
      clientId: client2Id,
      clientName: 'Apex Digital Media',
      clientEmail: 'invoices@apexdigital.io',
      amount: 280000, // $2,800.00
      paidAmount: 0,
      status: 'unpaid',
      dueDate: dueTodayDate,
      stripePayUrl: 'https://buy.stripe.com/test_7sIeVb5093Apex2800',
      notes: 'Full-stack Web Application Development - Sprint 1',
      reminderSent: {
        before3: true,
        onDue: false, // Ready for onDue reminder!
        after7: false,
      },
      createdAt: new Date(now.getTime() - 14 * 86400000).toISOString(),
      updatedAt: now.toISOString(),
    };

    this.data.invoices[inv3Id] = {
      id: inv3Id,
      userId: demoUserId,
      clientId: client3Id,
      clientName: 'Starlight Tech Labs',
      clientEmail: 'accounts@starlightlabs.net',
      amount: 85000, // $850.00
      paidAmount: 0,
      status: 'unpaid',
      dueDate: dueIn3DaysDate,
      stripePayUrl: 'https://buy.stripe.com/test_3cIeVb5093Starlight850',
      notes: 'Brand Guidelines & Identity Design Package',
      reminderSent: {
        before3: false, // Ready for before3 reminder!
        onDue: false,
        after7: false,
      },
      createdAt: new Date(now.getTime() - 4 * 86400000).toISOString(),
      updatedAt: now.toISOString(),
    };

    this.data.invoices[inv4Id] = {
      id: inv4Id,
      userId: demoUserId,
      clientId: client1Id,
      clientName: 'Acme Corporation (Sarah Chen)',
      clientEmail: 'billing@acmecorp.com',
      amount: 200000, // $2,000.00
      paidAmount: 200000,
      status: 'paid',
      dueDate: pastPaidDate,
      stripePayUrl: 'https://buy.stripe.com/test_1aIeVb5093Paid2000',
      notes: 'Project Kickoff & Discovery Session',
      reminderSent: {
        before3: true,
        onDue: true,
        after7: false,
      },
      createdAt: new Date(now.getTime() - 30 * 86400000).toISOString(),
      updatedAt: new Date(now.getTime() - 20 * 86400000).toISOString(),
    };
  }

  // --- Users ---
  getUserSettings(userId: string): UserSettings {
    if (!this.data.users[userId]) {
      this.data.users[userId] = {
        userId,
        email: '',
        displayName: 'Freelancer',
        businessName: '',
        emailTemplate: '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      this.save();
    }
    return this.data.users[userId];
  }

  updateUserSettings(userId: string, updates: Partial<UserSettings>): UserSettings {
    const existing = this.getUserSettings(userId);
    const updated: UserSettings = {
      ...existing,
      ...updates,
      userId, // Immutable
      updatedAt: new Date().toISOString(),
    };
    this.data.users[userId] = updated;
    this.save();
    return updated;
  }

  // --- Clients ---
  getClients(userId: string): Client[] {
    return Object.values(this.data.clients)
      .filter((c) => c.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  getClient(id: string): Client | undefined {
    return this.data.clients[id];
  }

  createClient(userId: string, data: { name: string; email: string }): Client {
    const trimmedName = data.name.trim();
    const trimmedEmail = data.email.trim();

    const id = `cli_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();
    const client: Client = {
      id,
      userId,
      name: trimmedName,
      email: trimmedEmail,
      createdAt: now,
      updatedAt: now,
    };
    this.data.clients[id] = client;
    this.save();
    console.log(`[CLIENT CREATED] ID: ${id} | Masked Email: ${maskEmail(trimmedEmail)}`);
    return client;
  }

  updateClient(id: string, userId: string, data: { name?: string; email?: string }): Client | null {
    const client = this.data.clients[id];
    if (!client) return null;
    if (client.userId !== userId) return null;

    if (data.name && data.name.trim().length > 0) {
      client.name = data.name.trim();
    }
    if (data.email && isValidEmail(data.email)) {
      client.email = data.email.trim();
    }
    client.updatedAt = new Date().toISOString();

    // Also update cached client info on related invoices
    Object.values(this.data.invoices).forEach((inv) => {
      if (inv.clientId === id) {
        inv.clientName = client.name;
        inv.clientEmail = client.email;
        inv.updatedAt = new Date().toISOString();
      }
    });

    this.save();
    return client;
  }

  deleteClient(id: string, userId: string): boolean {
    const client = this.data.clients[id];
    if (!client) return false;
    if (client.userId !== userId) return false;

    delete this.data.clients[id];
    this.save();
    console.log(`[CLIENT DELETED] ID: ${id}`);
    return true;
  }

  // --- Invoices ---
  getInvoices(userId: string): Invoice[] {
    return Object.values(this.data.invoices)
      .filter((inv) => inv.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  getInvoice(id: string): Invoice | undefined {
    return this.data.invoices[id];
  }

  getAllInvoicesAcrossUsers(): Invoice[] {
    return Object.values(this.data.invoices);
  }

  createInvoice(
    userId: string,
    data: {
      clientId: string;
      amount: number;
      dueDate: string;
      stripePayUrl: string;
      status?: 'unpaid' | 'partial' | 'paid';
      paidAmount?: number;
      notes?: string;
    }
  ): Invoice {
    const client = this.data.clients[data.clientId];
    if (!client || client.userId !== userId) {
      throw new Error('Client not found or does not belong to user');
    }

    const id = `inv_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();
    const isoDueDate = new Date(data.dueDate).toISOString();

    const amount = Math.round(data.amount);
    let paidAmount = Math.round(data.paidAmount || 0);
    if (paidAmount < 0) paidAmount = 0;
    if (paidAmount > amount) paidAmount = amount;

    let status = data.status || 'unpaid';
    if (status === 'paid') {
      paidAmount = amount;
    } else if (status === 'partial') {
      if (paidAmount <= 0) paidAmount = Math.round(amount / 2);
    } else {
      paidAmount = 0;
    }

    const invoice: Invoice = {
      id,
      userId,
      clientId: data.clientId,
      clientName: client.name,
      clientEmail: client.email,
      amount,
      paidAmount,
      status,
      dueDate: isoDueDate,
      stripePayUrl: data.stripePayUrl.trim(),
      notes: data.notes?.trim() || '',
      reminderSent: {
        before3: false,
        onDue: false,
        after7: false,
      },
      createdAt: now,
      updatedAt: now,
    };

    this.data.invoices[id] = invoice;
    this.save();
    console.log(
      `[INVOICE CREATED] ID: ${id} | Client: ${maskEmail(client.email)} | Amount: $${(
        amount / 100
      ).toFixed(2)} | Due: ${isoDueDate}`
    );
    return invoice;
  }

  updateInvoice(
    id: string,
    userId: string,
    updates: Partial<{
      clientId: string;
      amount: number;
      paidAmount: number;
      status: 'unpaid' | 'partial' | 'paid';
      dueDate: string;
      stripePayUrl: string;
      notes: string;
      reminderSent: Partial<Invoice['reminderSent']>;
    }>
  ): Invoice | null {
    const invoice = this.data.invoices[id];
    if (!invoice) return null;
    if (invoice.userId !== userId) return null;

    if (updates.clientId && updates.clientId !== invoice.clientId) {
      const client = this.data.clients[updates.clientId];
      if (client && client.userId === userId) {
        invoice.clientId = client.id;
        invoice.clientName = client.name;
        invoice.clientEmail = client.email;
      }
    }

    if (typeof updates.amount === 'number' && updates.amount > 0 && updates.amount <= 100_000_000) {
      invoice.amount = Math.round(updates.amount);
    }

    if (typeof updates.paidAmount === 'number' && updates.paidAmount >= 0) {
      invoice.paidAmount = Math.min(invoice.amount, Math.round(updates.paidAmount));
    }

    if (updates.status) {
      invoice.status = updates.status;
      if (invoice.status === 'paid') {
        invoice.paidAmount = invoice.amount;
      } else if (invoice.status === 'unpaid') {
        invoice.paidAmount = 0;
      }
    }

    if (updates.dueDate && !isNaN(Date.parse(updates.dueDate))) {
      invoice.dueDate = new Date(updates.dueDate).toISOString();
    }

    if (updates.stripePayUrl) {
      invoice.stripePayUrl = updates.stripePayUrl.trim();
    }

    if (typeof updates.notes === 'string') {
      invoice.notes = updates.notes.trim();
    }

    if (updates.reminderSent) {
      invoice.reminderSent = {
        ...invoice.reminderSent,
        ...updates.reminderSent,
      };
    }

    invoice.updatedAt = new Date().toISOString();
    this.save();
    return invoice;
  }

  deleteInvoice(id: string, userId: string): boolean {
    const invoice = this.data.invoices[id];
    if (!invoice) return false;
    if (invoice.userId !== userId) return false;

    delete this.data.invoices[id];
    this.save();
    console.log(`[INVOICE DELETED] ID: ${id}`);
    return true;
  }

  markReminderSent(
    invoiceId: string,
    reminderType: 'before3' | 'onDue' | 'after7'
  ): Invoice | null {
    const invoice = this.data.invoices[invoiceId];
    if (!invoice) return null;

    invoice.reminderSent = {
      ...invoice.reminderSent,
      [reminderType]: true,
    };
    invoice.updatedAt = new Date().toISOString();
    this.save();
    return invoice;
  }

  // --- Logs ---
  addReminderLog(log: Omit<ReminderLog, 'id' | 'sentAt'>): ReminderLog {
    const id = `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const fullLog: ReminderLog = {
      ...log,
      id,
      sentAt: new Date().toISOString(),
    };
    this.data.logs.unshift(fullLog);
    if (this.data.logs.length > 200) {
      this.data.logs = this.data.logs.slice(0, 200);
    }
    this.save();
    return fullLog;
  }

  getReminderLogs(userId?: string): ReminderLog[] {
    if (!userId) {
      return this.data.logs.slice(0, 50);
    }
    return this.data.logs.filter((l) => l.userId === userId).slice(0, 50);
  }
}

export const store = new DataStore();
