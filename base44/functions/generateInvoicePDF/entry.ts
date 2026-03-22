import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';
import { jsPDF } from 'npm:jspdf@2.5.2';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { invoiceId } = await req.json();
    if (!invoiceId) return Response.json({ error: 'invoiceId required' }, { status: 400 });

    // Fetch invoice header
    const invoices = await base44.asServiceRole.entities.InvoiceHeader.filter({ id: invoiceId });
    if (invoices.length === 0) return Response.json({ error: 'Invoice not found' }, { status: 404 });
    const invoice = invoices[0];

    // Fetch invoice lines
    const lines = await base44.asServiceRole.entities.InvoiceLine.filter({ invoice_ref: invoiceId });

    // Fetch patient
    let patient = null;
    if (invoice.patient_ref) {
      const patients = await base44.asServiceRole.entities.Patient.filter({ id: invoice.patient_ref });
      if (patients.length > 0) patient = patients[0];
    }

    // Fetch SOAP notes for patient (most recent)
    let soapNotes = [];
    if (patient?.id) {
      soapNotes = await base44.asServiceRole.entities.SOAPNote.filter({ patient_id: patient.id });
      soapNotes = soapNotes
        .filter(n => n.status === 'finalized' || n.status === 'signed')
        .sort((a, b) => new Date(b.note_date) - new Date(a.note_date))
        .slice(0, 2);
    }

    // Fetch org branding
    let branding = null;
    if (invoice.organization_id) {
      const brandings = await base44.asServiceRole.entities.OrganizationBranding.filter({ organization_id: invoice.organization_id });
      if (brandings.length > 0) branding = brandings[0];
    }

    // Fetch org info
    let org = null;
    if (invoice.organization_id) {
      const orgs = await base44.asServiceRole.entities.Organization.filter({ id: invoice.organization_id });
      if (orgs.length > 0) org = orgs[0];
    }

    // --- Generate PDF ---
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const W = 210;
    let y = 0;

    // Header bar
    const primaryColor = branding?.primary_color || '#0d9488';
    const r = parseInt(primaryColor.slice(1, 3), 16);
    const g = parseInt(primaryColor.slice(3, 5), 16);
    const b = parseInt(primaryColor.slice(5, 7), 16);

    doc.setFillColor(r, g, b);
    doc.rect(0, 0, W, 38, 'F');

    // Org name
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text(branding?.organization_name || org?.name || 'Organization', 14, 16);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    if (org?.address) doc.text(org.address, 14, 23);
    if (org?.phone) doc.text(`Tel: ${org.phone}`, 14, 28);
    if (org?.email) doc.text(`Email: ${org.email}`, 14, 33);

    // INVOICE label (right side of header)
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text('INVOICE', W - 14, 18, { align: 'right' });
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`#${invoice.invoice_number || invoiceId.slice(0, 8).toUpperCase()}`, W - 14, 26, { align: 'right' });
    doc.text(new Date(invoice.invoice_date || invoice.created_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }), W - 14, 32, { align: 'right' });

    y = 48;
    doc.setTextColor(30, 41, 59);

    // Patient info box
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(14, y, 85, 30, 2, 2, 'F');
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100, 116, 139);
    doc.text('BILLED TO', 20, y + 7);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    const patientName = patient ? `${patient.first_name} ${patient.last_name}` : 'Walk-in Patient';
    doc.text(patientName, 20, y + 15);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);
    if (patient?.phn) doc.text(`PHN: ${patient.phn}`, 20, y + 21);
    if (patient?.phone || patient?.mobile) doc.text(`Tel: ${patient?.phone || patient?.mobile}`, 20, y + 27);

    // Invoice status box (right)
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(111, y, 85, 30, 2, 2, 'F');
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100, 116, 139);
    doc.text('INVOICE DETAILS', 117, y + 7);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);
    doc.text(`Status: ${(invoice.status || 'draft').toUpperCase()}`, 117, y + 15);
    doc.text(`Payment: ${(invoice.payment_status || 'unpaid').toUpperCase()}`, 117, y + 21);
    if (invoice.notes) doc.text(`Note: ${invoice.notes.slice(0, 30)}`, 117, y + 27);

    y += 40;

    // Line items table header
    doc.setFillColor(r, g, b);
    doc.rect(14, y, W - 28, 9, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('DESCRIPTION', 18, y + 6);
    doc.text('QTY', 120, y + 6, { align: 'center' });
    doc.text('UNIT PRICE', 150, y + 6, { align: 'center' });
    doc.text('TOTAL', W - 18, y + 6, { align: 'right' });
    y += 9;

    // Line items
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    lines.forEach((line, idx) => {
      if (idx % 2 === 0) {
        doc.setFillColor(248, 250, 252);
        doc.rect(14, y, W - 28, 8, 'F');
      }
      doc.setTextColor(15, 23, 42);
      doc.text(line.item_name_cache || line.item_code || '-', 18, y + 5.5);
      doc.text(String(line.qty || 1), 120, y + 5.5, { align: 'center' });
      doc.text(`LKR ${(line.unit_price || 0).toFixed(2)}`, 150, y + 5.5, { align: 'center' });
      doc.text(`LKR ${(line.line_total || 0).toFixed(2)}`, W - 18, y + 5.5, { align: 'right' });
      y += 8;
    });

    if (lines.length === 0) {
      doc.setTextColor(100, 116, 139);
      doc.text('No line items recorded.', 18, y + 6);
      y += 8;
    }

    // Totals
    y += 4;
    doc.setDrawColor(226, 232, 240);
    doc.line(14, y, W - 14, y);
    y += 6;

    const totalsX = 140;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);
    doc.text('Subtotal:', totalsX, y);
    doc.text(`LKR ${(invoice.subtotal || 0).toFixed(2)}`, W - 18, y, { align: 'right' });
    y += 7;
    if (invoice.tax_total) {
      doc.text('Tax:', totalsX, y);
      doc.text(`LKR ${invoice.tax_total.toFixed(2)}`, W - 18, y, { align: 'right' });
      y += 7;
    }
    doc.setFillColor(r, g, b);
    doc.rect(totalsX - 4, y - 1, W - totalsX - 10, 10, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(255, 255, 255);
    doc.text('TOTAL:', totalsX, y + 6);
    doc.text(`LKR ${(invoice.total || 0).toFixed(2)}`, W - 18, y + 6, { align: 'right' });
    y += 16;

    // SOAP Notes summary section
    if (soapNotes.length > 0) {
      y += 4;
      doc.setDrawColor(226, 232, 240);
      doc.line(14, y, W - 14, y);
      y += 6;

      doc.setFillColor(240, 253, 250);
      doc.roundedRect(14, y, W - 28, 8, 2, 2, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(r, g, b);
      doc.text('CLINICAL SUMMARY (SOAP Notes)', 18, y + 5.5);
      y += 12;

      soapNotes.forEach((note) => {
        const noteDate = new Date(note.note_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(15, 23, 42);
        doc.text(`Visit: ${noteDate}`, 18, y);
        if (note.icd10_codes?.length > 0) {
          doc.setTextColor(r, g, b);
          doc.text(`ICD-10: ${note.icd10_codes.join(', ')}`, 100, y);
        }
        y += 6;

        const sections = [
          { label: 'S', text: note.subjective },
          { label: 'O', text: note.objective },
          { label: 'A', text: note.assessment },
          { label: 'P', text: note.plan },
        ].filter(s => s.text);

        sections.forEach(({ label, text }) => {
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(8);
          doc.setTextColor(r, g, b);
          doc.text(`${label}:`, 18, y);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(71, 85, 105);
          const lines2 = doc.splitTextToSize(text.slice(0, 200), 160);
          doc.text(lines2, 26, y);
          y += lines2.length * 4.5 + 1;
          if (y > 270) { doc.addPage(); y = 20; }
        });
        y += 4;
      });
    }

    // Footer
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFillColor(r, g, b);
      doc.rect(0, 287, W, 10, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.text(branding?.footer_text || `${org?.name || 'Horizon ClinicSuite'} — Thank you for your visit`, W / 2, 293, { align: 'center' });
      doc.text(`Page ${i} of ${pageCount}`, W - 14, 293, { align: 'right' });
    }

    const pdfBytes = doc.output('arraybuffer');
    return new Response(pdfBytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename=invoice-${invoice.invoice_number || invoiceId.slice(0, 8)}.pdf`
      }
    });
  } catch (error) {
    console.error('PDF error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});