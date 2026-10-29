import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { store } from './server/store';
import { sendReminderEmail } from './server/email';
import { isValidEmail, maskEmail } from './src/lib/utils';
import { Invoice, ReminderLog } from './src/types';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Augment Express Request interface with authenticated user
declare global {
  namespace Express {
    interface Request {
      user?: {
        uid: string;
        email: string;
        name: string;
      };
    }
  }
}

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

app.use(cors());
app.use(express.json());

// Logging middleware with email masking & secret protection
app.use((req, res, next) => {
  const method = req.method;
  const url = req.url;
  // Never log raw request body with sensitive data
  console.log(`[HTTP] ${method} ${url}`);
  next();
});

// Authentication middleware verifying req.user
function requireAuth(req: Request, res: Response, next: NextFunction) {
  let userId: string | null = null;
  let email: string | null = null;
  let name: string | null = null;

  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7).trim();
    if (token) {
      if (token.includes('.')) {
        // JWT format (e.g. Firebase ID token)
        try {
          const parts = token.split('.');
          if (parts.length >= 2) {
            const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
            userId = payload.user_id || payload.sub || payload.uid;
            email = payload.email;
            name = payload.name;
          }
        } catch {
          // If decoding failed, fallback to raw token as ID
          userId = token;
        }
      } else {
        userId = token;
      }
    }
  }

  const customHeader = req.headers['x-user-id'] as string;
  if (!userId && customHeader) {
    userId = customHeader.trim();
  }

  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized: Authentication required' });
  }

  req.user = {
    uid: userId,
    email: email || `${userId}@example.com`,
    name: name || 'Freelancer',
  };

  next();
}

// Optional Auth (for check-due cron execution or user-scoped)
function optionalAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const customHeader = req.headers['x-user-id'] as string;

  if (authHeader?.startsWith('Bearer ') || customHeader) {
    return requireAuth(req, res, next);
  }
  next();
}

// -------------------------------------------------------------
// USER SETTINGS & TEMPLATES API
// -------------------------------------------------------------
app.get('/api/user/settings', requireAuth, (req: Request, res: Response) => {
  const settings = store.getUserSettings(req.user!.uid);
  return res.json(settings);
});

app.put('/api/user/settings', requireAuth, (req: Request, res: Response) => {
  const { businessName, emailTemplate, displayName } = req.body;
  const updated = store.updateUserSettings(req.user!.uid, {
    businessName: typeof businessName === 'string' ? businessName.trim() : undefined,
    emailTemplate: typeof emailTemplate === 'string' ? emailTemplate.trim() : undefined,
    displayName: typeof displayName === 'string' ? displayName.trim() : undefined,
  });
  return res.json(updated);
});

// -------------------------------------------------------------
// CLIENTS API
// -------------------------------------------------------------
// GET /api/clients - List clients for current user
app.get('/api/clients', requireAuth, (req: Request, res: Response) => {
  const clients = store.getClients(req.user!.uid);
  return res.json(clients);
});

// POST /api/clients - Create client
app.post('/api/clients', requireAuth, (req: Request, res: Response) => {
  const { name, email } = req.body;

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return res.status(400).json({ error: 'Client name is required (cannot be empty)' });
  }

  if (name.trim().length > 120) {
    return res.status(400).json({ error: 'Client name must not exceed 120 characters' });
  }

  if (!email || !isValidEmail(email)) {
    return res.status(400).json({ error: 'A valid email address is required' });
  }

  const client = store.createClient(req.user!.uid, {
    name: name.trim(),
    email: email.trim(),
  });

  return res.status(201).json(client);
});

// PUT /api/clients/:id - Update client (Ownership verification: 403 if not owner)
app.put('/api/clients/:id', requireAuth, (req: Request, res: Response) => {
  const { id } = req.params;
  const existing = store.getClient(id);

  if (!existing) {
    return res.status(404).json({ error: 'Client not found' });
  }

  // Security check: Must belong to req.user.uid
  if (existing.userId !== req.user!.uid) {
    return res.status(403).json({ error: 'Forbidden: You do not own this client record' });
  }

  const { name, email } = req.body;
  if (name !== undefined && (typeof name !== 'string' || name.trim().length === 0)) {
    return res.status(400).json({ error: 'Client name cannot be blank' });
  }
  if (email !== undefined && !isValidEmail(email)) {
    return res.status(400).json({ error: 'Client email must be a valid email format' });
  }

  const updated = store.updateClient(id, req.user!.uid, { name, email });
  return res.json(updated);
});

// DELETE /api/clients/:id - Delete client (Ownership verification: 403 if not owner)
app.delete('/api/clients/:id', requireAuth, (req: Request, res: Response) => {
  const { id } = req.params;
  const existing = store.getClient(id);

  if (!existing) {
    return res.status(404).json({ error: 'Client not found' });
  }

  // Security check: Must belong to req.user.uid
  if (existing.userId !== req.user!.uid) {
    return res.status(403).json({ error: 'Forbidden: You do not own this client record' });
  }

  store.deleteClient(id, req.user!.uid);
  return res.json({ success: true, message: 'Client deleted' });
});

// -------------------------------------------------------------
// INVOICES API
// -------------------------------------------------------------
// GET /api/invoices - List invoices for current user
app.get('/api/invoices', requireAuth, (req: Request, res: Response) => {
  const invoices = store.getInvoices(req.user!.uid);
  return res.json(invoices);
});

// POST /api/invoices - Create invoice with strict server validation
app.post('/api/invoices', requireAuth, (req: Request, res: Response) => {
  const { clientId, amount, dueDate, stripePayUrl, status, paidAmount, notes } = req.body;

  // 1. Client check
  if (!clientId || typeof clientId !== 'string') {
    return res.status(400).json({ error: 'Client selection is required' });
  }
  const client = store.getClient(clientId);
  if (!client) {
    return res.status(404).json({ error: 'Selected client does not exist' });
  }
  if (client.userId !== req.user!.uid) {
    return res.status(403).json({ error: 'Forbidden: Client does not belong to logged-in user' });
  }

  // 2. Amount validation: positive integer <= 100,000,000
  if (
    typeof amount !== 'number' ||
    !Number.isInteger(amount) ||
    amount <= 0 ||
    amount > 100_000_000
  ) {
    return res.status(400).json({
      error: 'Invalid amount: Must be a positive integer in cents (<= 100,000,000)',
    });
  }

  // 3. DueDate validation: valid date, converted to ISO string
  if (!dueDate || isNaN(Date.parse(dueDate))) {
    return res.status(400).json({ error: 'dueDate must be a valid date' });
  }

  // 4. Stripe payment link URL
  if (!stripePayUrl || typeof stripePayUrl !== 'string' || stripePayUrl.trim().length === 0) {
    return res.status(400).json({ error: 'Stripe payment link URL is required' });
  }
  try {
    const parsedUrl = new URL(stripePayUrl.trim());
    if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
      return res.status(400).json({ error: 'Stripe payment URL must be a valid http/https link' });
    }
  } catch {
    return res.status(400).json({ error: 'Invalid Stripe payment URL format' });
  }

  // 5. Status validation: 'unpaid' | 'partial' | 'paid'
  const validStatuses = ['unpaid', 'partial', 'paid'];
  const invoiceStatus = status || 'unpaid';
  if (!validStatuses.includes(invoiceStatus)) {
    return res.status(400).json({ error: 'status must be unpaid, partial, or paid' });
  }

  // 6. Paid amount validation
  let validatedPaidAmount = 0;
  if (paidAmount !== undefined) {
    if (
      typeof paidAmount !== 'number' ||
      !Number.isInteger(paidAmount) ||
      paidAmount < 0 ||
      paidAmount > amount
    ) {
      return res.status(400).json({
        error: 'paidAmount must be a non-negative integer in cents <= total amount',
      });
    }
    validatedPaidAmount = paidAmount;
  }

  try {
    const invoice = store.createInvoice(req.user!.uid, {
      clientId,
      amount,
      dueDate,
      stripePayUrl,
      status: invoiceStatus,
      paidAmount: validatedPaidAmount,
      notes,
    });
    return res.status(201).json(invoice);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to create invoice';
    return res.status(400).json({ error: msg });
  }
});

// PUT /api/invoices/:id - Update invoice (Ownership verification: 403 if not owner)
app.put('/api/invoices/:id', requireAuth, (req: Request, res: Response) => {
  const { id } = req.params;
  const existing = store.getInvoice(id);

  if (!existing) {
    return res.status(404).json({ error: 'Invoice not found' });
  }

  // Security check: Must belong to req.user.uid
  if (existing.userId !== req.user!.uid) {
    return res.status(403).json({ error: 'Forbidden: You do not own this invoice' });
  }

  const { clientId, amount, dueDate, stripePayUrl, status, paidAmount, notes } = req.body;

  if (amount !== undefined) {
    if (
      typeof amount !== 'number' ||
      !Number.isInteger(amount) ||
      amount <= 0 ||
      amount > 100_000_000
    ) {
      return res.status(400).json({
        error: 'Invalid amount: Must be a positive integer in cents <= 100,000,000',
      });
    }
  }

  if (dueDate !== undefined) {
    if (isNaN(Date.parse(dueDate))) {
      return res.status(400).json({ error: 'dueDate must be a valid date' });
    }
  }

  if (status !== undefined) {
    if (!['unpaid', 'partial', 'paid'].includes(status)) {
      return res.status(400).json({ error: 'status must be unpaid, partial, or paid' });
    }
  }

  if (paidAmount !== undefined) {
    const total = amount !== undefined ? amount : existing.amount;
    if (
      typeof paidAmount !== 'number' ||
      !Number.isInteger(paidAmount) ||
      paidAmount < 0 ||
      paidAmount > total
    ) {
      return res.status(400).json({
        error: 'paidAmount must be a non-negative integer in cents <= total amount',
      });
    }
  }

  const updated = store.updateInvoice(id, req.user!.uid, {
    clientId,
    amount,
    dueDate,
    stripePayUrl,
    status,
    paidAmount,
    notes,
  });

  return res.json(updated);
});

// DELETE /api/invoices/:id - Delete invoice (Ownership verification: 403 if not owner)
app.delete('/api/invoices/:id', requireAuth, (req: Request, res: Response) => {
  const { id } = req.params;
  const existing = store.getInvoice(id);

  if (!existing) {
    return res.status(404).json({ error: 'Invoice not found' });
  }

  // Security check: Must belong to req.user.uid
  if (existing.userId !== req.user!.uid) {
    return res.status(403).json({ error: 'Forbidden: You do not own this invoice' });
  }

  store.deleteInvoice(id, req.user!.uid);
  return res.json({ success: true, message: 'Invoice deleted' });
});

// -------------------------------------------------------------
// MANUAL REMINDER TEST DISPATCH
// -------------------------------------------------------------
app.post('/api/invoices/:id/send-reminder', requireAuth, async (req: Request, res: Response) => {
  const { id } = req.params;
  const existing = store.getInvoice(id);

  if (!existing) {
    return res.status(404).json({ error: 'Invoice not found' });
  }

  if (existing.userId !== req.user!.uid) {
    return res.status(403).json({ error: 'Forbidden: You do not own this invoice' });
  }

  const userSettings = store.getUserSettings(req.user!.uid);
  const result = await sendReminderEmail({
    invoice: existing,
    userSettings,
    reminderType: 'manual',
  });

  store.addReminderLog({
    userId: req.user!.uid,
    invoiceId: existing.id,
    clientName: existing.clientName,
    clientEmailMasked: result.clientEmailMasked,
    reminderType: 'manual',
    status: result.success ? (result.simulated ? 'simulated' : 'sent') : 'failed',
    details: result.error || (result.simulated ? 'Simulated send (no live API key)' : 'Sent via Resend'),
  });

  return res.json(result);
});

// -------------------------------------------------------------
// AUTOMATED DUE DATE SCANNER ENDPOINT (POST /api/check-due)
// -------------------------------------------------------------
// Scans invoices and sends reminders for:
// - 3 days before due date (if reminderSent.before3 is false)
// - On due date (if reminderSent.onDue is false)
// - 7 days after due date (if reminderSent.after7 is false)
// Never sends twice.
app.post('/api/check-due', optionalAuth, async (req: Request, res: Response) => {
  console.log('[CHECK-DUE] Initiating automated invoice reminder scan...');
  
  // If user is authenticated, scan their invoices; otherwise scan all system invoices
  const invoicesToScan: Invoice[] = req.user
    ? store.getInvoices(req.user.uid)
    : store.getAllInvoicesAcrossUsers();

  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const logsCreated: ReminderLog[] = [];
  let remindersSentCount = 0;

  for (const invoice of invoicesToScan) {
    // Only remind unpaid or partial invoices
    if (invoice.status === 'paid') {
      continue;
    }

    const dueDate = new Date(invoice.dueDate);
    dueDate.setHours(0, 0, 0, 0);

    // Calculate days until due date:
    // positive = future (e.g. 3 = due in 3 days)
    // 0 = due today
    // negative = past due (e.g. -7 = 7 days overdue)
    const diffTime = dueDate.getTime() - now.getTime();
    const daysUntilDue = Math.round(diffTime / (1000 * 60 * 60 * 24));

    const reminderSent = invoice.reminderSent || {
      before3: false,
      onDue: false,
      after7: false,
    };

    let targetReminderType: 'before3' | 'onDue' | 'after7' | null = null;

    // Check conditions:
    // 1. 3 days before due date
    if (daysUntilDue <= 3 && daysUntilDue > 0 && !reminderSent.before3) {
      targetReminderType = 'before3';
    }
    // 2. On due date (today)
    else if (daysUntilDue <= 0 && daysUntilDue > -7 && !reminderSent.onDue) {
      targetReminderType = 'onDue';
    }
    // 3. 7 days after due date
    else if (daysUntilDue <= -7 && !reminderSent.after7) {
      targetReminderType = 'after7';
    }

    if (targetReminderType) {
      console.log(
        `[CHECK-DUE] Invoice ${invoice.id.slice(-6)} matches trigger: ${targetReminderType} (daysUntilDue: ${daysUntilDue})`
      );

      const userSettings = store.getUserSettings(invoice.userId);
      const sendResult = await sendReminderEmail({
        invoice,
        userSettings,
        reminderType: targetReminderType,
      });

      // Update flag so it never sends twice
      store.markReminderSent(invoice.id, targetReminderType);

      // Record log
      const log = store.addReminderLog({
        userId: invoice.userId,
        invoiceId: invoice.id,
        clientName: invoice.clientName,
        clientEmailMasked: sendResult.clientEmailMasked,
        reminderType: targetReminderType,
        status: sendResult.success ? (sendResult.simulated ? 'simulated' : 'sent') : 'failed',
        details: sendResult.error || (sendResult.simulated ? 'Simulated send (no live API key)' : 'Sent via Resend'),
      });

      logsCreated.push(log);
      remindersSentCount++;
    }
  }

  console.log(
    `[CHECK-DUE] Scan complete. Invoices scanned: ${invoicesToScan.length}, Reminders sent: ${remindersSentCount}`
  );

  return res.json({
    scannedCount: invoicesToScan.length,
    remindersSent: remindersSentCount,
    logs: logsCreated,
    timestamp: new Date().toISOString(),
    message: `Scan finished. Evaluated ${invoicesToScan.length} invoices, dispatched ${remindersSentCount} reminders.`,
  });
});

// -------------------------------------------------------------
// REMINDER LOGS API
// -------------------------------------------------------------
app.get('/api/reminders/logs', requireAuth, (req: Request, res: Response) => {
  const logs = store.getReminderLogs(req.user!.uid);
  return res.json(logs);
});

// -------------------------------------------------------------
// DASHBOARD STATS API
// -------------------------------------------------------------
// Show total outstanding amount (sum of unpaid + partial remaining)
// and list of overdue invoices (dueDate passed and status != paid)
app.get('/api/stats', requireAuth, (req: Request, res: Response) => {
  const invoices = store.getInvoices(req.user!.uid);
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  let totalOutstandingCents = 0;
  let totalPaidCents = 0;
  let totalInvoicedCents = 0;
  const overdueInvoices: Invoice[] = [];

  for (const inv of invoices) {
    totalInvoicedCents += inv.amount;
    totalPaidCents += inv.paidAmount || 0;

    const remaining = Math.max(0, inv.amount - (inv.paidAmount || 0));
    if (inv.status !== 'paid') {
      totalOutstandingCents += remaining;

      const due = new Date(inv.dueDate);
      due.setHours(0, 0, 0, 0);
      if (now.getTime() > due.getTime()) {
        overdueInvoices.push(inv);
      }
    }
  }

  return res.json({
    totalOutstandingCents,
    totalPaidCents,
    totalInvoicedCents,
    invoicesCount: invoices.length,
    overdueCount: overdueInvoices.length,
    overdueInvoices,
  });
});

// -------------------------------------------------------------
// VITE DEV SERVER / STATIC FILE SERVING
// -------------------------------------------------------------
async function startServer() {
  const isDev = process.env.NODE_ENV !== 'production';

  if (isDev) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[SERVER] Full-stack application listening on port ${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[SERVER] Fatal failure starting application server:', err);
  process.exit(1);
});
