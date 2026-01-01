import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { jsPDF } from 'npm:jspdf@2.5.1';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { invoice_id } = await req.json();

    // Fetch invoice, lines, patient, and branding
    const [invoice, lines, branding] = await Promise.all([
      base44.entities.InvoiceHeader.filter({ id: invoice_id }).then(r => r[0]),
      base44.entities.InvoiceLine.filter({ invoice_ref: invoice_id }),
      base44.entities.OrganizationBranding.filter({ organization_id: user.organization_id || '' }).then(r => r[0])
    ]);

    if (!invoice) {
      return Response.json({ error: 'Invoice not found' }, { status: 404 });
    }

    const patient = await base44.entities.Patient.filter({ id: invoice.patient_ref }).then(r => r[0]);

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // Header with logos
    doc.setFontSize(16);
    doc.setFont(undefined, 'bold');
    doc.text('Horizon ClinicSuite', 15, 20);
    
    if (branding?.logo_url) {
      doc.setFontSize(10);
      doc.text('Powered by:', pageWidth - 15, 15, { align: 'right' });
      doc.setFontSize(12);
      doc.text(branding.app_name || 'Your Organization', pageWidth - 15, 20, { align: 'right' });
    }

    // Receipt title
    doc.setFontSize(18);
    doc.setFont(undefined, 'bold');
    doc.text('RECEIPT', pageWidth / 2, 35, { align: 'center' });

    // Invoice details
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text(`Invoice: ${invoice.invoice_number}`, 15, 45);
    doc.text(`Date: ${new Date(invoice.invoice_date).toLocaleDateString()}`, 15, 50);
    doc.text(`Time: ${new Date(invoice.invoice_date).toLocaleTimeString()}`, 15, 55);

    // Patient details
    doc.text(`Patient: ${patient?.first_name || ''} ${patient?.last_name || ''}`, pageWidth - 15, 45, { align: 'right' });
    doc.text(`MRN: ${patient?.mrn || 'N/A'}`, pageWidth - 15, 50, { align: 'right' });

    // Line separator
    doc.line(15, 60, pageWidth - 15, 60);

    // Items table
    doc.setFont(undefined, 'bold');
    doc.text('Item', 15, 70);
    doc.text('Qty', 100, 70);
    doc.text('Price', 130, 70);
    doc.text('Total', pageWidth - 15, 70, { align: 'right' });

    doc.setFont(undefined, 'normal');
    let y = 78;
    lines.forEach(line => {
      if (y > 250) {
        doc.addPage();
        y = 20;
      }
      doc.text(line.item_name_cache, 15, y);
      doc.text(line.qty.toString(), 100, y);
      doc.text(`Rs. ${line.unit_price.toFixed(2)}`, 130, y);
      doc.text(`Rs. ${line.line_total.toFixed(2)}`, pageWidth - 15, y, { align: 'right' });
      y += 7;
    });

    // Totals
    doc.line(15, y + 2, pageWidth - 15, y + 2);
    y += 10;
    
    doc.text('Subtotal:', 130, y);
    doc.text(`Rs. ${invoice.subtotal.toFixed(2)}`, pageWidth - 15, y, { align: 'right' });
    y += 7;
    
    if (invoice.subtotal !== invoice.total) {
      doc.text('Discount:', 130, y);
      doc.text(`-Rs. ${(invoice.subtotal - invoice.total).toFixed(2)}`, pageWidth - 15, y, { align: 'right' });
      y += 7;
    }
    
    doc.setFont(undefined, 'bold');
    doc.setFontSize(12);
    doc.text('TOTAL:', 130, y);
    doc.text(`Rs. ${invoice.total.toFixed(2)}`, pageWidth - 15, y, { align: 'right' });

    // Payment info from notes
    if (invoice.notes) {
      y += 10;
      doc.setFontSize(9);
      doc.setFont(undefined, 'normal');
      doc.text(invoice.notes, 15, y, { maxWidth: pageWidth - 30 });
    }

    // Footer
    doc.setFontSize(8);
    doc.text('Thank you for your visit!', pageWidth / 2, 280, { align: 'center' });
    doc.text(`Generated: ${new Date().toLocaleString()}`, pageWidth / 2, 285, { align: 'center' });

    const pdfBytes = doc.output('arraybuffer');

    return new Response(pdfBytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename=receipt-${invoice.invoice_number}.pdf`
      }
    });
  } catch (error) {
    console.error('PDF generation error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});