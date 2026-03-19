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

    // CLINIC HEADER (Primary - Large)
    doc.setFontSize(20);
    doc.setFont(undefined, 'bold');
    const clinicName = branding?.app_display_name || 'Medical Center';
    doc.text(clinicName, pageWidth / 2, 20, { align: 'center' });

    // Contact details
    let y = 26;
    doc.setFontSize(9);
    doc.setFont(undefined, 'normal');
    
    if (branding?.address) {
      doc.text(branding.address, pageWidth / 2, y, { align: 'center' });
      y += 4;
    }
    
    const contactLine = [
      branding?.phone_number && `Tel: ${branding.phone_number}`,
      branding?.phone_number_2 && branding.phone_number_2,
      branding?.email && `Email: ${branding.email}`
    ].filter(Boolean).join(' | ');
    
    if (contactLine) {
      doc.text(contactLine, pageWidth / 2, y, { align: 'center' });
      y += 4;
    }
    
    if (branding?.website) {
      doc.text(branding.website, pageWidth / 2, y, { align: 'center' });
      y += 4;
    }

    // Horizon small branding (bottom right corner - small)
    doc.setFontSize(6);
    doc.setTextColor(150, 150, 150);
    doc.text('Powered by Horizon ClinicSuite', pageWidth - 15, y, { align: 'right' });
    doc.setTextColor(0, 0, 0);

    y += 8;

    // Receipt title
    doc.setFontSize(18);
    doc.setFont(undefined, 'bold');
    doc.text('RECEIPT', pageWidth / 2, y, { align: 'center' });
    y += 10;

    // Invoice details
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text(`Invoice: ${invoice.invoice_number}`, 15, y);
    doc.text(`Date: ${new Date(invoice.invoice_date).toLocaleDateString()}`, 15, y + 5);
    doc.text(`Time: ${new Date(invoice.invoice_date).toLocaleTimeString()}`, 15, y + 10);

    // Patient details
    doc.text(`Patient: ${patient?.first_name || ''} ${patient?.last_name || ''}`, pageWidth - 15, y, { align: 'right' });
    doc.text(`MRN: ${patient?.mrn || 'N/A'}`, pageWidth - 15, y + 5, { align: 'right' });

    y += 18;

    // Line separator
    doc.line(15, y, pageWidth - 15, y);
    y += 8;

    // Items table
    doc.setFont(undefined, 'bold');
    doc.text('Item', 15, y);
    doc.text('Qty', 100, y);
    doc.text('Price', 130, y);
    doc.text('Total', pageWidth - 15, y, { align: 'right' });

    doc.setFont(undefined, 'normal');
    y += 8;
    
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
    y = 280;
    doc.setFontSize(9);
    const footerText = branding?.footer_text || 'Thank you for your visit!';
    doc.text(footerText, pageWidth / 2, y, { align: 'center' });
    
    doc.setFontSize(7);
    doc.setTextColor(100, 100, 100);
    doc.text(`Generated: ${new Date().toLocaleString()}`, pageWidth / 2, y + 5, { align: 'center' });

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