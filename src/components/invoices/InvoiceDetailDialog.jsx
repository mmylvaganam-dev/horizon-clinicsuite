import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Download, Loader2, FileText } from 'lucide-react';

const STATUS_COLORS = {
  draft: 'bg-slate-100 text-slate-700',
  paid: 'bg-green-100 text-green-700',
  void: 'bg-red-100 text-red-700',
  refunded: 'bg-orange-100 text-orange-700',
};

export default function InvoiceDetailDialog({ invoice, patient, onClose, onDownloadPdf, generatingPdf }) {
  const { data: lines = [] } = useQuery({
    queryKey: ['invoiceLines', invoice.id],
    queryFn: () => base44.entities.InvoiceLine.filter({ invoice_ref: invoice.id }),
    enabled: !!invoice.id,
  });

  const { data: soapNotes = [] } = useQuery({
    queryKey: ['soapNotesForInvoice', patient?.id],
    queryFn: () => base44.entities.SOAPNote.filter({ patient_id: patient.id }),
    enabled: !!patient?.id,
    select: (data) => data
      .filter(n => n.status === 'finalized' || n.status === 'signed')
      .sort((a, b) => new Date(b.note_date) - new Date(a.note_date))
      .slice(0, 3),
  });

  const patientName = patient ? `${patient.first_name} ${patient.last_name}` : 'Walk-in Patient';

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-teal-600" />
            Invoice #{invoice.invoice_number || invoice.id.slice(0, 8).toUpperCase()}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* Header info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-50 rounded-lg p-4">
              <p className="text-xs text-slate-500 uppercase font-semibold mb-1">Patient</p>
              <p className="font-semibold text-slate-900">{patientName}</p>
              {patient?.phn && <p className="text-sm text-slate-500">PHN: {patient.phn}</p>}
              {(patient?.phone || patient?.mobile) && (
                <p className="text-sm text-slate-500">Tel: {patient?.phone || patient?.mobile}</p>
              )}
            </div>
            <div className="bg-slate-50 rounded-lg p-4">
              <p className="text-xs text-slate-500 uppercase font-semibold mb-1">Invoice Details</p>
              <p className="text-sm">
                Date: <span className="font-medium">{invoice.invoice_date ? new Date(invoice.invoice_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}</span>
              </p>
              <div className="flex gap-2 mt-1 flex-wrap">
                <Badge className={STATUS_COLORS[invoice.status] || STATUS_COLORS.draft}>{invoice.status}</Badge>
                <Badge className={invoice.payment_status === 'paid' ? 'bg-green-100 text-green-700' : invoice.payment_status === 'partial' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}>
                  {invoice.payment_status}
                </Badge>
              </div>
            </div>
          </div>

          {/* Line items */}
          <div>
            <p className="text-xs text-slate-500 uppercase font-semibold mb-2">Line Items</p>
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b">
                  <tr>
                    <th className="text-left px-3 py-2 text-slate-600">Item</th>
                    <th className="text-center px-3 py-2 text-slate-600">Qty</th>
                    <th className="text-right px-3 py-2 text-slate-600">Unit Price</th>
                    <th className="text-right px-3 py-2 text-slate-600">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {lines.length === 0 ? (
                    <tr><td colSpan={4} className="text-center py-4 text-slate-400">No line items</td></tr>
                  ) : lines.map(line => (
                    <tr key={line.id} className="border-b last:border-0">
                      <td className="px-3 py-2">{line.item_name_cache || line.item_code}</td>
                      <td className="px-3 py-2 text-center">{line.qty}</td>
                      <td className="px-3 py-2 text-right">LKR {(line.unit_price || 0).toFixed(2)}</td>
                      <td className="px-3 py-2 text-right font-medium">LKR {(line.line_total || 0).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Totals */}
            <div className="flex justify-end mt-3">
              <div className="text-sm space-y-1 text-right min-w-48">
                <div className="flex justify-between gap-8 text-slate-600">
                  <span>Subtotal</span><span>LKR {(invoice.subtotal || 0).toFixed(2)}</span>
                </div>
                {invoice.tax_total > 0 && (
                  <div className="flex justify-between gap-8 text-slate-600">
                    <span>Tax</span><span>LKR {invoice.tax_total.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between gap-8 font-bold text-base border-t pt-1">
                  <span>Total</span><span className="text-teal-700">LKR {(invoice.total || 0).toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* SOAP Notes */}
          {soapNotes.length > 0 && (
            <div>
              <p className="text-xs text-slate-500 uppercase font-semibold mb-2">Clinical Summary</p>
              <div className="space-y-3">
                {soapNotes.map(note => (
                  <div key={note.id} className="border rounded-lg p-3 bg-teal-50/40">
                    <p className="text-xs font-semibold text-teal-700 mb-2">
                      Visit: {new Date(note.note_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                      {note.icd10_codes?.length > 0 && ` — ICD-10: ${note.icd10_codes.join(', ')}`}
                    </p>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {note.subjective && <div><span className="font-semibold text-slate-600">S: </span><span className="text-slate-700">{note.subjective.slice(0, 150)}</span></div>}
                      {note.objective && <div><span className="font-semibold text-slate-600">O: </span><span className="text-slate-700">{note.objective.slice(0, 150)}</span></div>}
                      {note.assessment && <div><span className="font-semibold text-slate-600">A: </span><span className="text-slate-700">{note.assessment.slice(0, 150)}</span></div>}
                      {note.plan && <div><span className="font-semibold text-slate-600">P: </span><span className="text-slate-700">{note.plan.slice(0, 150)}</span></div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2 border-t">
            <Button variant="outline" onClick={onClose}>Close</Button>
            <Button
              onClick={() => onDownloadPdf(invoice.id, invoice.invoice_number)}
              disabled={generatingPdf === invoice.id}
              className="bg-teal-600 hover:bg-teal-700 text-white"
            >
              {generatingPdf === invoice.id
                ? <Loader2 className="w-4 h-4 animate-spin mr-2" />
                : <Download className="w-4 h-4 mr-2" />}
              Download PDF Receipt
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}