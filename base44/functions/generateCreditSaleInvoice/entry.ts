import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import { jsPDF } from 'npm:jspdf@4.0.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const creditSaleId = body.creditSaleId;

    if (!creditSaleId) {
      return Response.json({ error: 'creditSaleId required' }, { status: 400 });
    }

    // Fetch the credit sale record
    const creditSalesData = await base44.entities.CreditSale.filter({ id: creditSaleId });
    if (creditSalesData.length === 0) {
      return Response.json({ error: 'Credit sale not found' }, { status: 404 });
    }

    const creditSale = creditSalesData[0];

    // Fetch institution details
    const institutions = await base44.entities.Institution.filter({ id: creditSale.institution_id });
    const institution = institutions[0] || {};

    // Fetch organization details
    const organizations = await base44.entities.Organization.filter({ id: creditSale.organization_id });
    const organization = organizations[0] || {};

    // Create PDF
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;
    const contentWidth = pageWidth - 2 * margin;
    let yPos = margin;

    // Header
    doc.setFillColor(31, 115, 143); // Teal color
    doc.rect(0, 0, pageWidth, 35, 'F');

    // Organization name (white text on teal background)
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont('Helvetica', 'bold');
    doc.text(organization.name || 'Pharmacy', margin, 20);

    // Invoice header info
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    yPos = 45;

    // Invoice title and details
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(16);
    doc.text('INVOICE', margin, yPos);
    yPos += 10;

    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`Invoice #: ${creditSale.id}`, margin, yPos);
    yPos += 5;
    doc.text(`PO Number: ${creditSale.po_number || 'N/A'}`, margin, yPos);
    yPos += 5;
    doc.text(`Date: ${new Date(creditSale.sale_date).toLocaleDateString()}`, margin, yPos);
    yPos += 10;

    // Organization details
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('FROM:', margin, yPos);
    yPos += 5;

    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(organization.name || 'Pharmacy', margin, yPos);
    yPos += 4;
    doc.text(organization.address || '', margin, yPos);
    yPos += 4;
    doc.text(`${organization.phone || ''}`, margin, yPos);
    yPos += 4;
    doc.text(organization.email || '', margin, yPos);
    yPos += 10;

    // Institution details
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('BILL TO:', margin, yPos);
    yPos += 5;

    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(creditSale.institution_name, margin, yPos);
    yPos += 4;
    institution.contact_person && doc.text(`Contact: ${institution.contact_person}`, margin, yPos);
    yPos += 4;
    institution.address && doc.text(institution.address, margin, yPos);
    yPos += 4;
    doc.text(`${institution.city || ''} ${institution.country || ''}`, margin, yPos);
    yPos += 4;
    doc.text(`Email: ${institution.contact_email || ''}`, margin, yPos);
    yPos += 4;
    doc.text(`Phone: ${institution.contact_phone || ''}`, margin, yPos);
    yPos += 10;

    // Summary table
    const tableY = yPos;
    const colWidth = contentWidth / 2;

    // Table header
    doc.setFillColor(240, 240, 240);
    doc.rect(margin, tableY, contentWidth, 6, 'F');
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('Description', margin + 3, tableY + 4);
    doc.text('Amount', margin + colWidth + 3, tableY + 4);

    // Table content
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(9);
    const itemY = tableY + 8;
    doc.text('Credit Sale Transaction', margin + 3, itemY);
    doc.text(`$${creditSale.total_amount.toFixed(2)}`, margin + colWidth + 3, itemY);

    // Total
    const totalY = itemY + 8;
    doc.setFillColor(31, 115, 143);
    doc.rect(margin, totalY, contentWidth, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('TOTAL:', margin + 3, totalY + 5);
    doc.text(`$${creditSale.total_amount.toFixed(2)}`, margin + colWidth + 3, totalY + 5);

    // Payment terms
    doc.setTextColor(0, 0, 0);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(9);
    const paymentTermsY = totalY + 12;
    doc.text('Payment Terms:', margin, paymentTermsY);
    doc.setFont('Helvetica', 'normal');
    doc.text(institution.payment_terms?.replace('_', ' ').toUpperCase() || 'NET 30', margin, paymentTermsY + 4);

    // Payment status
    doc.setFont('Helvetica', 'bold');
    doc.text('Status:', margin, paymentTermsY + 8);
    doc.setFont('Helvetica', 'normal');
    doc.text(creditSale.payment_status.toUpperCase(), margin, paymentTermsY + 12);

    // Notes
    if (creditSale.notes) {
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(9);
      doc.text('Notes:', margin, pageHeight - 30);
      doc.setFont('Helvetica', 'normal');
      const noteLines = doc.splitTextToSize(creditSale.notes, contentWidth);
      doc.text(noteLines, margin, pageHeight - 26);
    }

    // Footer
    doc.setFontSize(8);
    doc.setTextColor(128, 128, 128);
    doc.text(
      'This is an automatically generated invoice. Please retain for your records.',
      margin,
      pageHeight - 5
    );

    // Generate PDF buffer
    const pdfBuffer = Buffer.from(doc.output('arraybuffer'));

    // Upload to Base44
    const uploadFormData = new FormData();
    const blob = new Blob([pdfBuffer], { type: 'application/pdf' });
    uploadFormData.append('file', blob, `invoice-${creditSale.id}.pdf`);

    const uploadResponse = await fetch('https://api.base44.io/v1/files/upload', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${user.id}`,
      },
      body: uploadFormData,
    });

    if (!uploadResponse.ok) {
      throw new Error(`File upload failed: ${uploadResponse.statusText}`);
    }

    const uploadedFile = await uploadResponse.json();
    const fileUrl = uploadedFile.file_url;

    // Update credit sale with invoice URL
    await base44.entities.CreditSale.update(creditSaleId, {
      invoice_pdf_url: fileUrl,
    });

    return Response.json({
      success: true,
      fileUrl: fileUrl,
      creditSaleId: creditSaleId,
    });
  } catch (error) {
    console.error('Invoice generation error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});