import React, { useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Printer, Download } from 'lucide-react';
import { format } from 'date-fns';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export default function PHNCard({ open, onOpenChange, patient, branding }) {
  const cardRef = useRef(null);

  const handlePrint = async () => {
    const cardElement = cardRef.current;
    if (!cardElement) return;

    // Create a canvas from the card
    const canvas = await html2canvas(cardElement, {
      scale: 3,
      backgroundColor: '#ffffff',
      logging: false
    });

    // Open a new window for printing
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Print PHN Card - ${patient?.phn || 'Patient'}</title>
          <style>
            @page {
              size: 85.6mm 53.98mm;
              margin: 0;
            }
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            body {
              margin: 0;
              padding: 0;
            }
            img {
              width: 85.6mm;
              height: 53.98mm;
              display: block;
              page-break-after: always;
            }
            @media print {
              body {
                margin: 0;
                padding: 0;
              }
            }
          </style>
        </head>
        <body>
          <img src="${canvas.toDataURL('image/png')}" alt="PHN Card" />
        </body>
      </html>
    `);
    
    printWindow.document.close();
    
    // Wait for image to load then print
    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
    }, 250);
  };

  const handleDownloadPDF = async () => {
    const cardElement = cardRef.current;
    if (!cardElement) return;

    const canvas = await html2canvas(cardElement, {
      scale: 3,
      backgroundColor: '#ffffff',
      logging: false
    });

    const imgData = canvas.toDataURL('image/png');
    
    // A4 page with credit card size (85.6mm x 53.98mm)
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4' // 210mm x 297mm
    });

    // Center the credit card on the page
    const cardWidth = 85.6;
    const cardHeight = 53.98;
    const pageWidth = 210;
    const x = (pageWidth - cardWidth) / 2;
    const y = 20; // 20mm from top

    pdf.addImage(imgData, 'PNG', x, y, cardWidth, cardHeight);
    pdf.save(`PHN_Card_${patient?.phn || 'patient'}.pdf`);
  };

  if (!patient) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Patient Health Card</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Card Preview */}
          <div 
            ref={cardRef}
            className="bg-gradient-to-br from-teal-500 to-blue-600 rounded-lg text-white shadow-xl"
            style={{ 
              width: '100%', 
              aspectRatio: '1.586',
              padding: '5%',
              fontSize: 'clamp(10px, 2.5vw, 14px)'
            }}
          >
            {/* Header */}
            <div className="flex items-start justify-between" style={{ marginBottom: '4%' }}>
              <div>
                {branding?.primary_logo_file_ref ? (
                  <img 
                    src={branding.primary_logo_file_ref} 
                    alt="Logo" 
                    style={{ height: '8%', maxHeight: '30px', width: 'auto' }}
                  />
                ) : (
                  <div style={{ fontSize: '1.2em', fontWeight: 'bold' }}>Health Card</div>
                )}
              </div>
              <div className="text-right" style={{ fontSize: '0.75em', opacity: 0.9 }}>
                <div>Patient Health Number</div>
              </div>
            </div>

            {/* PHN Number */}
            <div style={{ marginBottom: '4%' }}>
              <div style={{ fontSize: '1.6em', fontWeight: 'bold', letterSpacing: '0.05em', marginBottom: '2%' }}>
                {patient.phn || 'PHN00000000'}
              </div>
              <div style={{ height: '1px', background: 'rgba(255,255,255,0.3)', width: '100%' }}></div>
            </div>

            {/* Patient Info */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2%', fontSize: '0.9em' }}>
              <div>
                <div style={{ fontSize: '0.7em', opacity: 0.75 }}>Name</div>
                <div style={{ fontWeight: 600 }}>
                  {patient.first_name} {patient.last_name}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4%' }}>
                <div>
                  <div style={{ fontSize: '0.7em', opacity: 0.75 }}>DOB</div>
                  <div style={{ fontWeight: 500 }}>
                    {patient.date_of_birth ? format(new Date(patient.date_of_birth), 'dd/MM/yyyy') : 'N/A'}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.7em', opacity: 0.75 }}>Gender</div>
                  <div style={{ fontWeight: 500, textTransform: 'capitalize' }}>
                    {patient.gender || 'N/A'}
                  </div>
                </div>
              </div>

              {patient.phone && (
                <div>
                  <div style={{ fontSize: '0.7em', opacity: 0.75 }}>Contact</div>
                  <div style={{ fontWeight: 500 }}>{patient.phone}</div>
                </div>
              )}
            </div>

            {/* Barcode Area */}
            <div style={{ marginTop: '4%', paddingTop: '3%', borderTop: '1px solid rgba(255,255,255,0.2)' }}>
              <div style={{ background: 'white', borderRadius: '4px', padding: '2% 2%', textAlign: 'center' }}>
                <svg 
                  style={{ margin: '0 auto', height: '25px', width: '100%' }}
                  viewBox="0 0 200 40"
                >
                  {/* Simple barcode representation */}
                  {Array.from({ length: 30 }).map((_, i) => (
                    <rect
                      key={i}
                      x={i * 6 + 10}
                      y="5"
                      width={Math.random() > 0.5 ? 4 : 2}
                      height="30"
                      fill="#000000"
                    />
                  ))}
                </svg>
                <div style={{ fontSize: '0.65em', color: '#1e293b', marginTop: '2%', fontFamily: 'monospace', fontWeight: 600 }}>
                  {patient.phn || 'PHN00000000'}
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Button onClick={handlePrint} variant="outline" className="flex-1">
              <Printer className="w-4 h-4 mr-2" />
              Print Card
            </Button>
            <Button onClick={handleDownloadPDF} className="flex-1 bg-teal-600 hover:bg-teal-700">
              <Download className="w-4 h-4 mr-2" />
              Download PDF
            </Button>
          </div>

          <p className="text-xs text-slate-500 text-center">
            This card provides quick access to patient records. Keep it safe and present it during visits.
          </p>
        </div>


      </DialogContent>
    </Dialog>
  );
}