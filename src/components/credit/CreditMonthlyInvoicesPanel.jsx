import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { FileText, Send, Download, RefreshCw, CheckCircle, Mail, AlertCircle } from 'lucide-react';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import toast from 'react-hot-toast';

const STATUS_COLORS = {
  draft: 'bg-slate-100 text-slate-700',
  issued: 'bg-blue-100 text-blue-700',
  paid: 'bg-emerald-100 text-emerald-700',
  void: 'bg-red-100 text-red-600',
};

export default function CreditMonthlyInvoicesPanel({ customer, orgId, creditPayments, creditSales, selectedMonth }) {
  const queryClient = useQueryClient();
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [emailingInvoice, setEmailingInvoice] = useState(null);
  const [emailNote, setEmailNote] = useState('');
  const [generating, setGenerating] = useState(false);

  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ['creditMonthlyInvoices', orgId, customer.institution],
    queryFn: () => base44.entities.CreditMonthlyInvoice.filter({
      organization_id: orgId,
      institution_name: customer.institution,
    }, '-period_month'),
    enabled: !!orgId && !!customer.institution,
  });

  const markPaidMutation = useMutation({
    mutationFn: (inv) => base44.entities.CreditMonthlyInvoice.update(inv.id, { status: 'paid' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['creditMonthlyInvoices'] });
      toast.success('Invoice marked as paid');
    },
  });

  const sendEmailMutation = useMutation({
    mutationFn: async ({ invoice, note }) => {
      if (!invoice.institution_email) throw new Error('No contact email on file for this institution');
      const emailBody = buildEmailBody(invoice, note);
      await base44.integrations.Core.SendEmail({
        to: invoice.institution_email,
        subject: `Monthly Credit Statement — ${invoice.period_label} | ${invoice.invoice_number}`,
        body: emailBody,
      });
      await base44.entities.CreditMonthlyInvoice.update(invoice.id, {
        email_sent: true,
        email_sent_at: new Date().toISOString(),
        status: invoice.status === 'draft' ? 'issued' : invoice.status,
      });
      queryClient.invalidateQueries({ queryKey: ['creditMonthlyInvoices'] });
    },
    onSuccess: () => {
      toast.success('Invoice emailed to institution');
      setShowEmailDialog(false);
      setEmailNote('');
    },
    onError: (err) => toast.error(err.message),
  });

  const handleGenerateForMonth = async () => {
    setGenerating(true);
    try {
      const res = await base44.functions.invoke('generateCreditMonthlyInvoices', {
        month: selectedMonth,
        organization_id: orgId,
      });
      const created = res.data?.invoices?.filter(i => i.institution === customer.institution);
      if (created?.length) {
        toast.success(`Invoice generated: ${created[0].invoice_number}`);
      } else {
        toast('Invoice already exists for this period', { icon: 'ℹ️' });
      }
      queryClient.invalidateQueries({ queryKey: ['creditMonthlyInvoices'] });
    } catch (err) {
      toast.error(err.message || 'Failed to generate invoice');
    } finally {
      setGenerating(false);
    }
  };

  const handlePrint = (invoice) => {
    // Get the sales included in this invoice
    const invSales = creditSales.filter(s => invoice.sale_ids?.includes(s.id));
    const monthPayments = creditPayments.filter(p =>
      p.institution_name === customer.institution &&
      p.payment_date?.startsWith(invoice.period_month)
    );

    const html = `
      <html><head><title>${invoice.invoice_number}</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 20mm; color: #333; }
        h1 { font-size: 22px; margin: 0; }
        .sub { color: #666; font-size: 13px; }
        .meta { display: flex; justify-content: space-between; margin: 20px 0; }
        .meta-box p { margin: 2px 0; }
        .meta-box strong { font-size: 11px; text-transform: uppercase; color: #888; }
        table { width: 100%; border-collapse: collapse; margin: 16px 0; }
        th { background: #f0f0f0; padding: 8px 10px; text-align: left; font-size: 12px; }
        td { padding: 7px 10px; border-bottom: 1px solid #eee; font-size: 13px; }
        .r { text-align: right; }
        .summary { margin-top: 24px; border: 1px solid #ddd; border-radius: 6px; padding: 16px; background: #fafafa; }
        .row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 14px; }
        .row.total { font-weight: bold; font-size: 16px; border-top: 1px solid #ccc; margin-top: 8px; padding-top: 12px; }
        .badge { display: inline-block; padding: 2px 10px; border-radius: 20px; font-size: 11px; font-weight: bold; text-transform: uppercase; }
        .paid { background: #d1fae5; color: #065f46; }
        .issued { background: #dbeafe; color: #1e40af; }
        .footer { margin-top: 40px; text-align: center; color: #aaa; font-size: 11px; }
      </style></head>
      <body>
        <div style="border-bottom: 2px solid #333; padding-bottom: 16px; margin-bottom: 16px;">
          <h1>Monthly Credit Invoice</h1>
          <p class="sub">Invoice #: <strong>${invoice.invoice_number}</strong> &nbsp;|&nbsp; Period: <strong>${invoice.period_label}</strong> &nbsp;|&nbsp; Status: <span class="badge ${invoice.status}">${invoice.status}</span></p>
        </div>
        <div class="meta">
          <div class="meta-box">
            <strong>Bill To</strong>
            <p>${customer.institution}</p>
            ${customer.contact_person ? `<p>${customer.contact_person}</p>` : ''}
            ${customer.contact_email ? `<p>${customer.contact_email}</p>` : ''}
          </div>
          <div class="meta-box" style="text-align:right">
            <strong>Invoice Date</strong>
            <p>${format(new Date(), 'd MMMM yyyy')}</p>
            <strong>Due Date</strong>
            <p>${invoice.due_date ? format(new Date(invoice.due_date), 'd MMMM yyyy') : 'On receipt'}</p>
          </div>
        </div>

        <h3 style="font-size:14px; color:#555;">Sales — ${invoice.period_label}</h3>
        <table>
          <thead><tr><th>Date</th><th>Invoice #</th><th class="r">Amount (Rs.)</th></tr></thead>
          <tbody>
            ${invSales.length > 0
              ? invSales.map(s => `<tr><td>${format(new Date(s.sale_date), 'd MMM yyyy')}</td><td>${s.sale_number || '-'}</td><td class="r">${(s.total || 0).toLocaleString('en-LK', { minimumFractionDigits: 2 })}</td></tr>`).join('')
              : `<tr><td colspan="3" style="text-align:center; color:#999;">No sales records available</td></tr>`
            }
          </tbody>
        </table>

        <h3 style="font-size:14px; color:#555;">Payments Received — ${invoice.period_label}</h3>
        <table>
          <thead><tr><th>Date</th><th>Method</th><th>Reference</th><th class="r">Amount (Rs.)</th></tr></thead>
          <tbody>
            ${monthPayments.length > 0
              ? monthPayments.map(p => `<tr><td>${format(new Date(p.payment_date), 'd MMM yyyy')}</td><td>${p.payment_method || 'Cheque'}</td><td>${p.notes || '-'}</td><td class="r">${(p.amount || 0).toLocaleString('en-LK', { minimumFractionDigits: 2 })}</td></tr>`).join('')
              : `<tr><td colspan="4" style="text-align:center; color:#999;">No payments recorded</td></tr>`
            }
          </tbody>
        </table>

        <div class="summary">
          <div class="row"><span>Opening Balance:</span><span>Rs. ${(invoice.opening_balance || 0).toLocaleString('en-LK', { minimumFractionDigits: 2 })}</span></div>
          <div class="row"><span>Charges This Period:</span><span>Rs. ${(invoice.subtotal || 0).toLocaleString('en-LK', { minimumFractionDigits: 2 })}</span></div>
          <div class="row"><span>Payments Received:</span><span style="color:#065f46">− Rs. ${(invoice.payments_received || 0).toLocaleString('en-LK', { minimumFractionDigits: 2 })}</span></div>
          <div class="row total"><span>Closing Balance Due:</span><span style="color:#b91c1c">Rs. ${(invoice.closing_balance || 0).toLocaleString('en-LK', { minimumFractionDigits: 2 })}</span></div>
        </div>
        <div class="footer">
          <p>This is a computer-generated invoice. Contact us for any discrepancies.</p>
          <p>Generated: ${format(new Date(), 'd MMM yyyy HH:mm')}</p>
        </div>
      </body></html>`;

    const w = window.open('', '_blank');
    w.document.write(html);
    w.document.close();
    setTimeout(() => { w.focus(); w.print(); }, 250);
  };

  return (
    <div className="space-y-3">
      {/* Generate button for selected month */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-500">Consolidated monthly invoices for this institution</p>
        <Button size="sm" variant="outline" onClick={handleGenerateForMonth} disabled={generating}>
          <RefreshCw className={`w-3 h-3 mr-1 ${generating ? 'animate-spin' : ''}`} />
          {generating ? 'Generating...' : `Generate ${selectedMonth}`}
        </Button>
      </div>

      {/* Invoice list */}
      {isLoading ? (
        <p className="text-sm text-slate-400 text-center py-4">Loading...</p>
      ) : invoices.length === 0 ? (
        <div className="text-center py-6 border border-dashed rounded-lg">
          <FileText className="w-8 h-8 mx-auto text-slate-300 mb-2" />
          <p className="text-sm text-slate-500">No invoices generated yet</p>
          <p className="text-xs text-slate-400">Click "Generate" to create one for the selected month</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {invoices.map(inv => (
            <div key={inv.id} className="border rounded-lg p-3 bg-white space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-mono text-sm font-semibold">{inv.invoice_number}</p>
                  <p className="text-xs text-slate-500">{inv.period_label} • {inv.sales_count} sale{inv.sales_count !== 1 ? 's' : ''}</p>
                  {inv.email_sent && (
                    <p className="text-xs text-emerald-600 flex items-center gap-1 mt-0.5">
                      <CheckCircle className="w-3 h-3" /> Emailed {inv.email_sent_at ? format(new Date(inv.email_sent_at), 'd MMM') : ''}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <Badge className={STATUS_COLORS[inv.status] || STATUS_COLORS.draft}>{inv.status}</Badge>
                  <p className="text-sm font-bold text-red-700 mt-1">
                    Rs. {(inv.closing_balance || 0).toLocaleString('en-LK', { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-xs text-slate-400">closing balance</p>
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <Button size="sm" variant="outline" className="flex-1 h-7 text-xs" onClick={() => handlePrint(inv)}>
                  <Download className="w-3 h-3 mr-1" /> Print
                </Button>
                <Button
                  size="sm" variant="outline"
                  className="flex-1 h-7 text-xs border-blue-300 text-blue-700 hover:bg-blue-50"
                  onClick={() => { setEmailingInvoice(inv); setEmailNote(''); setShowEmailDialog(true); }}
                  disabled={!customer.contact_email && !inv.institution_email}
                >
                  <Mail className="w-3 h-3 mr-1" /> Email
                </Button>
                {inv.status === 'issued' && (
                  <Button
                    size="sm"
                    className="flex-1 h-7 text-xs bg-emerald-600 hover:bg-emerald-700"
                    onClick={() => markPaidMutation.mutate(inv)}
                    disabled={markPaidMutation.isPending}
                  >
                    <CheckCircle className="w-3 h-3 mr-1" /> Mark Paid
                  </Button>
                )}
              </div>
              {!customer.contact_email && !inv.institution_email && (
                <p className="text-xs text-amber-600 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> No contact email — add one in Institution Management to enable email
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Email dialog */}
      <Dialog open={showEmailDialog} onOpenChange={setShowEmailDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="w-5 h-5 text-blue-600" />
              Email Invoice — {emailingInvoice?.invoice_number}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="bg-blue-50 p-3 rounded border border-blue-200 text-sm">
              <p className="font-medium text-blue-900">To: {emailingInvoice?.institution_email || customer.contact_email}</p>
              <p className="text-blue-600 text-xs mt-0.5">Subject: Monthly Credit Statement — {emailingInvoice?.period_label}</p>
            </div>
            <div>
              <Label>Additional Note (optional)</Label>
              <Textarea
                value={emailNote}
                onChange={e => setEmailNote(e.target.value)}
                rows={3}
                placeholder="e.g. Please remit payment within 30 days. Thank you for your business."
                className="mt-1"
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowEmailDialog(false)}>Cancel</Button>
              <Button
                className="flex-1"
                disabled={sendEmailMutation.isPending}
                onClick={() => sendEmailMutation.mutate({ invoice: emailingInvoice, note: emailNote })}
              >
                {sendEmailMutation.isPending ? 'Sending...' : 'Send Email'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function buildEmailBody(invoice, note) {
  return `
<div style="font-family: Arial, sans-serif; max-width: 600px; color: #333;">
  <div style="background: #1e40af; color: white; padding: 24px; border-radius: 8px 8px 0 0;">
    <h2 style="margin: 0; font-size: 20px;">Monthly Credit Statement</h2>
    <p style="margin: 4px 0 0; opacity: 0.85;">${invoice.period_label} — ${invoice.invoice_number}</p>
  </div>
  <div style="border: 1px solid #e5e7eb; border-top: none; padding: 24px; border-radius: 0 0 8px 8px;">
    <p>Dear ${invoice.institution_name},</p>
    <p>Please find below your consolidated credit account statement for <strong>${invoice.period_label}</strong>.</p>

    <table style="width: 100%; border-collapse: collapse; margin: 20px 0; background: #f9fafb; border-radius: 8px;">
      <tr><td style="padding: 10px 16px; font-size: 13px; color: #6b7280;">Opening Balance</td>
          <td style="padding: 10px 16px; text-align: right; font-weight: 600;">Rs. ${(invoice.opening_balance || 0).toLocaleString('en-LK', { minimumFractionDigits: 2 })}</td></tr>
      <tr style="background:#fff"><td style="padding: 10px 16px; font-size: 13px; color: #6b7280;">Charges This Period (${invoice.sales_count} invoices)</td>
          <td style="padding: 10px 16px; text-align: right; font-weight: 600;">Rs. ${(invoice.subtotal || 0).toLocaleString('en-LK', { minimumFractionDigits: 2 })}</td></tr>
      <tr><td style="padding: 10px 16px; font-size: 13px; color: #6b7280;">Payments Received</td>
          <td style="padding: 10px 16px; text-align: right; font-weight: 600; color: #059669;">− Rs. ${(invoice.payments_received || 0).toLocaleString('en-LK', { minimumFractionDigits: 2 })}</td></tr>
      <tr style="background: #fef2f2;"><td style="padding: 12px 16px; font-weight: bold; font-size: 15px;">Balance Due</td>
          <td style="padding: 12px 16px; text-align: right; font-weight: bold; font-size: 18px; color: #b91c1c;">Rs. ${(invoice.closing_balance || 0).toLocaleString('en-LK', { minimumFractionDigits: 2 })}</td></tr>
    </table>

    ${invoice.due_date ? `<p style="background:#fff3cd; padding: 10px 16px; border-radius: 6px; border-left: 4px solid #f59e0b;"><strong>Payment Due:</strong> ${invoice.due_date}</p>` : ''}
    ${note ? `<p style="background: #f0fdf4; padding: 12px 16px; border-radius: 6px; margin-top: 16px;">${note}</p>` : ''}

    <p style="margin-top: 24px; color: #6b7280; font-size: 13px;">Please contact us if you have any questions or discrepancies regarding this statement.</p>
    <p style="color: #6b7280; font-size: 12px; margin-top: 16px;">Ref: ${invoice.invoice_number}</p>
  </div>
</div>`;
}