import React, { useState, useEffect } from 'react';
import { UserSettings } from '../types';
import { 
  Settings, 
  Mail, 
  Sparkles, 
  CheckCircle2, 
  Save, 
  RotateCcw, 
  Code, 
  Eye, 
  Building,
  Key,
  ShieldCheck,
  ExternalLink
} from 'lucide-react';

interface SettingsViewProps {
  settings: UserSettings | null;
  onUpdateSettings: (data: Partial<UserSettings>) => Promise<void>;
}

const DEFAULT_TEMPLATE = `Hi {client_name},

This is a payment reminder regarding invoice #{invoice_id} for {amount}.
Outstanding balance: {remaining_balance}.
Due Date: {due_date}.

You can pay securely with credit card or bank transfer using Stripe:
{pay_url}

Thank you for your business!

Best regards,
{business_name}`;

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  onUpdateSettings,
}) => {
  const [businessName, setBusinessName] = useState(settings?.businessName || '');
  const [displayName, setDisplayName] = useState(settings?.displayName || '');
  const [emailTemplate, setEmailTemplate] = useState(settings?.emailTemplate || '');
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [previewMode, setPreviewMode] = useState<'unpaid' | 'partial'>('unpaid');

  useEffect(() => {
    if (settings) {
      setBusinessName(settings.businessName || '');
      setDisplayName(settings.displayName || '');
      setEmailTemplate(settings.emailTemplate || '');
    }
  }, [settings]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSavedSuccess(false);
    try {
      await onUpdateSettings({
        businessName: businessName.trim(),
        displayName: displayName.trim(),
        emailTemplate: emailTemplate.trim(),
      });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err: any) {
      alert(err.message || 'Failed to update settings');
    } finally {
      setSaving(false);
    }
  };

  const handleInsertToken = (token: string) => {
    setEmailTemplate((prev) => prev + token);
  };

  const handleResetDefaultTemplate = () => {
    setEmailTemplate(DEFAULT_TEMPLATE);
  };

  // Generate live sample preview
  const sampleTemplate = emailTemplate.trim().length > 0 ? emailTemplate : DEFAULT_TEMPLATE;
  const sampleClient = 'Acme Corp (Sarah Chen)';
  const sampleTotal = '$1,500.00';
  const samplePaid = previewMode === 'partial' ? '$500.00' : '$0.00';
  const sampleRemaining = previewMode === 'partial' ? '$1,000.00' : '$1,500.00';
  const sampleDueDate = 'Nov 15, 2026';
  const samplePayUrl = 'https://buy.stripe.com/test_sample_invoice';
  const sampleBiz = businessName.trim() || displayName.trim() || 'Morgan Creative Studio';
  const sampleId = '1001';

  const previewRendered = sampleTemplate
    .replace(/{client_name}/g, sampleClient)
    .replace(/{amount}/g, sampleTotal)
    .replace(/{paid_amount}/g, samplePaid)
    .replace(/{remaining_balance}/g, sampleRemaining)
    .replace(/{due_date}/g, sampleDueDate)
    .replace(/{pay_url}/g, samplePayUrl)
    .replace(/{invoice_id}/g, sampleId)
    .replace(/{business_name}/g, sampleBiz);

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">
          Settings & Email Templates
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Customize your business branding and the automated email template sent to clients
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Form: Profile & Template Editor (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          <form onSubmit={handleSave} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Building className="w-4 h-4 text-blue-600" />
                Freelancer Business Profile
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Included in reminder emails and invoice headers
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1.5">
                    Business / Studio Name
                  </label>
                  <input
                    type="text"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    placeholder="e.g. Morgan Creative Studio"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1.5">
                    Freelancer Display Name
                  </label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="e.g. Alex Morgan"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="border-t border-slate-100 pt-6">
              <div className="flex items-center justify-between mb-1.5">
                <div>
                  <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <Mail className="w-4 h-4 text-indigo-600" />
                    Custom Reminder Email Body Template
                  </h2>
                  <p className="text-xs text-slate-500">
                    Stored in Firestore under your user account. Will be used by the automated reminder scanner.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleResetDefaultTemplate}
                  className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-1"
                >
                  <RotateCcw className="w-3 h-3" />
                  Reset to Default
                </button>
              </div>

              {/* Tag Pill Helpers */}
              <div className="mt-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-[11px] font-bold text-slate-600 block mb-1.5">
                  Click to insert variables:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { token: '{client_name}', label: 'Client Name' },
                    { token: '{amount}', label: 'Total Amount' },
                    { token: '{remaining_balance}', label: 'Remaining Balance' },
                    { token: '{paid_amount}', label: 'Paid Amount' },
                    { token: '{due_date}', label: 'Due Date' },
                    { token: '{pay_url}', label: 'Stripe Pay Link' },
                    { token: '{invoice_id}', label: 'Invoice ID' },
                    { token: '{business_name}', label: 'Business Name' },
                  ].map((t) => (
                    <button
                      key={t.token}
                      type="button"
                      onClick={() => handleInsertToken(t.token)}
                      className="px-2 py-1 rounded bg-white hover:bg-blue-50 text-[11px] font-mono text-blue-700 border border-slate-200 hover:border-blue-300 transition-colors shadow-2xs"
                    >
                      {t.token}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-4">
                <textarea
                  rows={8}
                  value={emailTemplate}
                  onChange={(e) => setEmailTemplate(e.target.value)}
                  placeholder={DEFAULT_TEMPLATE}
                  className="w-full p-3 rounded-xl border border-slate-200 text-xs font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none leading-relaxed bg-white"
                />
                <span className="text-[10px] text-slate-400 block mt-1">
                  Leave blank to use the standard responsive HTML template with dynamic partial payment balance lines.
                </span>
              </div>
            </div>

            <div className="border-t border-slate-100 pt-4 flex items-center justify-between">
              {savedSuccess ? (
                <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  Settings saved successfully!
                </span>
              ) : (
                <span />
              )}

              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white shadow-md disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </form>

          {/* Security & Credentials Notice */}
          <div className="bg-slate-50 rounded-2xl border border-slate-200 p-5 text-xs text-slate-600 space-y-2">
            <div className="flex items-center gap-2 font-bold text-slate-900">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              Security Architecture
            </div>
            <p>
              Per strict security requirements, Stripe secret keys and Resend API credentials are never exposed to the client or browser bundle. All email dispatches, webhook checks, and invoice calculations run securely on the server with user-isolated Firestore checks.
            </p>
          </div>
        </div>

        {/* Right Column: Live Email Preview (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sticky top-24">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-blue-600" />
                <h3 className="text-sm font-bold text-slate-900">Live Email Preview</h3>
              </div>

              {/* Toggle Unpaid vs Partial */}
              <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg text-[10px] font-semibold">
                <button
                  type="button"
                  onClick={() => setPreviewMode('unpaid')}
                  className={`px-2 py-1 rounded-md transition-colors ${
                    previewMode === 'unpaid' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'
                  }`}
                >
                  Unpaid
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewMode('partial')}
                  className={`px-2 py-1 rounded-md transition-colors ${
                    previewMode === 'partial' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'
                  }`}
                >
                  Partial ($500 paid)
                </button>
              </div>
            </div>

            {/* Email Container Mockup */}
            <div className="mt-4 border border-slate-200 rounded-xl overflow-hidden shadow-xs bg-slate-50">
              {/* Email Client Header */}
              <div className="bg-slate-900 text-white p-4">
                <div className="text-xs font-semibold text-slate-200">
                  {sampleBiz}
                </div>
                <div className="text-[11px] text-blue-400 mt-0.5">
                  To: billing@acmecorp.com
                </div>
                <div className="text-xs font-bold text-white mt-1">
                  Subject: Upcoming Payment Reminder: Invoice #1001
                </div>
              </div>

              {/* Email Render Body */}
              <div className="p-4 bg-white text-xs text-slate-700 space-y-3 whitespace-pre-wrap font-sans leading-relaxed">
                {previewRendered}
              </div>

              {/* Mock Stripe CTA */}
              <div className="p-4 bg-slate-50 border-t border-slate-100 text-center">
                <a
                  href={samplePayUrl}
                  onClick={(e) => e.preventDefault()}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold text-xs shadow-xs"
                >
                  Pay Now with Stripe &rarr;
                </a>
              </div>
            </div>

            <div className="mt-3 text-[11px] text-slate-400 text-center">
              Variables dynamically substitute client name, balance, and Stripe pay link.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
