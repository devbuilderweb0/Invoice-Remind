import { maskEmail } from '../src/lib/utils';
import { Invoice, UserSettings } from '../src/types';

export interface SendReminderParams {
  invoice: Invoice;
  userSettings?: UserSettings | null;
  reminderType: 'before3' | 'onDue' | 'after7' | 'manual';
}

export interface SendReminderResult {
  success: boolean;
  simulated: boolean;
  messageId?: string;
  error?: string;
  clientEmailMasked: string;
  subject: string;
  bodySnippet: string;
}

export function formatCents(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(cents / 100);
}

export function generateReminderEmailContent({
  invoice,
  userSettings,
  reminderType,
}: SendReminderParams): { subject: string; text: string; html: string } {
  const totalAmountStr = formatCents(invoice.amount);
  const paidAmountStr = formatCents(invoice.paidAmount || 0);
  const remainingCents = Math.max(0, invoice.amount - (invoice.paidAmount || 0));
  const remainingStr = formatCents(remainingCents);
  
  const dueDateFormatted = new Date(invoice.dueDate).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  let subject = '';
  let headerNotice = '';
  switch (reminderType) {
    case 'before3':
      subject = `Upcoming Payment Reminder: Invoice #${invoice.id.slice(-6)} due in 3 days`;
      headerNotice = 'Upcoming Payment Reminder (Due in 3 days)';
      break;
    case 'onDue':
      subject = `Payment Due Today: Invoice #${invoice.id.slice(-6)}`;
      headerNotice = 'Payment Due Today';
      break;
    case 'after7':
      subject = `OVERDUE: Payment Reminder for Invoice #${invoice.id.slice(-6)} (7 days overdue)`;
      headerNotice = 'Invoice Past Due (7 Days Overdue)';
      break;
    default:
      subject = `Payment Reminder: Invoice #${invoice.id.slice(-6)}`;
      headerNotice = 'Invoice Payment Reminder';
  }

  const customTemplate = userSettings?.emailTemplate?.trim();
  let balanceLine = '';
  if (invoice.status === 'partial') {
    balanceLine = `You have partially paid ${paidAmountStr}, leaving an outstanding balance of ${remainingStr}.`;
  } else {
    balanceLine = `Outstanding balance: ${remainingStr}.`;
  }

  let textContent = '';
  if (customTemplate && customTemplate.length > 0) {
    textContent = customTemplate
      .replace(/{client_name}/g, invoice.clientName)
      .replace(/{amount}/g, totalAmountStr)
      .replace(/{paid_amount}/g, paidAmountStr)
      .replace(/{remaining_balance}/g, remainingStr)
      .replace(/{due_date}/g, dueDateFormatted)
      .replace(/{pay_url}/g, invoice.stripePayUrl)
      .replace(/{invoice_id}/g, invoice.id.slice(-6))
      .replace(/{business_name}/g, userSettings?.businessName || userSettings?.displayName || 'Freelance Services');
  } else {
    textContent = [
      `Hi ${invoice.clientName},`,
      '',
      `This is a payment reminder regarding invoice #${invoice.id.slice(-6)}.`,
      `Total Invoice Amount: ${totalAmountStr}`,
      balanceLine,
      `Due Date: ${dueDateFormatted}`,
      '',
      `Please review and pay your invoice securely using this Stripe payment link:`,
      invoice.stripePayUrl,
      '',
      `If you have already sent payment, please disregard this message.`,
      '',
      `Best regards,`,
      userSettings?.businessName || userSettings?.displayName || 'Freelance Services',
    ].join('\n');
  }

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b; padding: 24px; margin: 0; }
          .container { max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
          .header { background: #0f172a; color: #ffffff; padding: 24px 32px; }
          .header h1 { margin: 0; font-size: 18px; font-weight: 600; letter-spacing: -0.02em; }
          .badge { display: inline-block; background: #3b82f6; color: #fff; font-size: 12px; padding: 4px 10px; border-radius: 9999px; font-weight: 500; margin-top: 8px; }
          .badge.overdue { background: #ef4444; }
          .body { padding: 32px; font-size: 15px; line-height: 1.6; color: #334155; }
          .card { background: #f1f5f9; border-radius: 8px; padding: 20px; margin: 20px 0; }
          .card-row { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 14px; }
          .card-row:last-child { margin-bottom: 0; font-weight: 700; font-size: 16px; color: #0f172a; border-top: 1px solid #cbd5e1; padding-top: 8px; }
          .btn { display: inline-block; background: #2563eb; color: #ffffff !important; text-decoration: none; padding: 14px 28px; font-weight: 600; border-radius: 8px; margin: 16px 0; text-align: center; font-size: 15px; }
          .footer { padding: 20px 32px; background: #f8fafc; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b; text-align: center; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>${userSettings?.businessName || userSettings?.displayName || 'Freelance Invoice Reminder'}</h1>
            <span class="badge ${reminderType === 'after7' ? 'overdue' : ''}">${headerNotice}</span>
          </div>
          <div class="body">
            <p>Hi <strong>${invoice.clientName}</strong>,</p>
            <p>Please find the details for Invoice <strong>#${invoice.id.slice(-6)}</strong> below:</p>
            
            <div class="card">
              <div class="card-row">
                <span>Total Invoiced</span>
                <span>${totalAmountStr}</span>
              </div>
              ${
                invoice.status === 'partial'
                  ? `<div class="card-row">
                      <span>Amount Paid</span>
                      <span style="color: #16a34a;">-${paidAmountStr}</span>
                    </div>`
                  : ''
              }
              <div class="card-row">
                <span>Remaining Due</span>
                <span style="color: #0f172a;">${remainingStr}</span>
              </div>
              <div class="card-row" style="border: none; padding-top: 4px; font-size: 13px; font-weight: normal; color: #64748b;">
                <span>Due Date</span>
                <span>${dueDateFormatted}</span>
              </div>
            </div>

            <p style="text-align: center; margin: 28px 0;">
              <a href="${invoice.stripePayUrl}" class="btn" target="_blank" rel="noopener noreferrer">
                Pay Now with Stripe &rarr;
              </a>
            </p>

            <p style="font-size: 13px; color: #64748b; word-break: break-all;">
              Or copy and paste this link in your browser:<br/>
              <a href="${invoice.stripePayUrl}" style="color: #2563eb;">${invoice.stripePayUrl}</a>
            </p>
          </div>
          <div class="footer">
            Sent automatically by RemindFlow on behalf of ${userSettings?.displayName || 'your freelancer'}.<br/>
            Questions? Reply directly to this invoice notice.
          </div>
        </div>
      </body>
    </html>
  `;

  return { subject, text: textContent, html: htmlContent };
}

export async function sendReminderEmail(params: SendReminderParams): Promise<SendReminderResult> {
  const { invoice, reminderType } = params;
  const maskedEmail = maskEmail(invoice.clientEmail);
  const { subject, text, html } = generateReminderEmailContent(params);

  const resendApiKey = process.env.RESEND_API_KEY?.trim();
  const fromEmail = process.env.RESEND_FROM_EMAIL?.trim() || 'onboarding@resend.dev';

  // Check if real Resend API key is provided
  if (!resendApiKey || resendApiKey === 'MY_RESEND_API_KEY' || resendApiKey.startsWith('re_123456789')) {
    // Simulated delivery mode (API key not configured)
    console.log(
      `[SIMULATED EMAIL] Type: ${reminderType} | To: ${maskedEmail} | Invoice: ${invoice.id.slice(
        -6
      )} | Due: ${invoice.dueDate} | Amount: ${formatCents(invoice.amount)}`
    );
    return {
      success: true,
      simulated: true,
      clientEmailMasked: maskedEmail,
      subject,
      bodySnippet: text.slice(0, 140) + '...',
    };
  }

  try {
    console.log(
      `[DISPATCHING EMAIL] Invoking Resend API | To: ${maskedEmail} | Type: ${reminderType}`
    );
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [invoice.clientEmail],
        subject,
        html,
        text,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(
        `[EMAIL ERROR] Resend dispatch failed for ${maskedEmail}: status ${response.status} (details omitted for security)`
      );
      return {
        success: false,
        simulated: false,
        error: `Resend HTTP error ${response.status}`,
        clientEmailMasked: maskedEmail,
        subject,
        bodySnippet: text.slice(0, 140),
      };
    }

    const data = (await response.json()) as { id?: string };
    console.log(`[EMAIL SUCCESS] Sent to ${maskedEmail} (Resend ID: ${data.id || 'ok'})`);
    return {
      success: true,
      simulated: false,
      messageId: data.id,
      clientEmailMasked: maskedEmail,
      subject,
      bodySnippet: text.slice(0, 140),
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown network failure';
    console.error(`[EMAIL ERROR] Exception sending to ${maskedEmail}: ${errorMsg}`);
    return {
      success: false,
      simulated: false,
      error: errorMsg,
      clientEmailMasked: maskedEmail,
      subject,
      bodySnippet: text.slice(0, 140),
    };
  }
}
