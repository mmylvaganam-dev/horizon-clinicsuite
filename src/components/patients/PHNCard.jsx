import React, { useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Printer, Download } from 'lucide-react';
import { format } from 'date-fns';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export default function PHNCard({ open, onOpenChange, patient, branding }) {
  const cardRef = useRef(null);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = async () => {
    const cardElement = cardRef.current;
    if (!cardElement) return;

    const canvas = await html2canvas(cardElement, {
      scale: 2,
      backgroundColor: '#ffffff'
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: [85.6, 53.98] // Credit card size
    });

    pdf.addImage(imgData, 'PNG', 0, 0, 85.6, 53.98);
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
            className="bg-gradient-to-br from-teal-500 to-blue-600 rounded-lg p-6 text-white shadow-xl"
            style={{ width: '100%', aspectRatio: '1.586' }}
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
              <div>
                {branding?.primary_logo_file_ref ? (
                  <img 
                    src={branding.primary_logo_file_ref} 
                    alt="Logo" 
                    className="h-10 w-auto"
                  />
                ) : (
                  <div className="text-lg font-bold">Health Card</div>
                )}
              </div>
              <div className="text-right text-xs opacity-90">
                <div>Patient Health Number</div>
              </div>
            </div>

            {/* PHN Number */}
            <div className="mb-4">
              <div className="text-2xl font-bold tracking-wider mb-1">
                {patient.phn || 'PHN00000000'}
              </div>
              <div className="h-px bg-white/30 w-full"></div>
            </div>

            {/* Patient Info */}
            <div className="space-y-2 text-sm">
              <div>
                <div className="text-xs opacity-75">Name</div>
                <div className="font-semibold">
                  {patient.first_name} {patient.last_name}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs opacity-75">DOB</div>
                  <div className="font-medium">
                    {patient.date_of_birth ? format(new Date(patient.date_of_birth), 'dd/MM/yyyy') : 'N/A'}
                  </div>
                </div>
                <div>
                  <div className="text-xs opacity-75">Gender</div>
                  <div className="font-medium capitalize">
                    {patient.gender || 'N/A'}
                  </div>
                </div>
              </div>

              {patient.phone && (
                <div>
                  <div className="text-xs opacity-75">Contact</div>
                  <div className="font-medium">{patient.phone}</div>
                </div>
              )}
            </div>

            {/* Barcode Area */}
            <div className="mt-4 pt-3 border-t border-white/20">
              <div className="bg-white rounded px-2 py-1 text-center">
                <svg 
                  className="mx-auto h-8"
                  style={{ width: '100%' }}
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
                <div className="text-xs text-slate-900 mt-1 font-mono">
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

        <style jsx>{`
          @media print {
            body * {
              visibility: hidden;
            }
            ${cardRef.current && `#${cardRef.current.id}`}, ${cardRef.current && `#${cardRef.current.id}`} * {
              visibility: visible;
            }
            ${cardRef.current && `#${cardRef.current.id}`} {
              position: absolute;
              left: 0;
              top: 0;
            }
          }
        `}</style>
      </DialogContent>
    </Dialog>
  );
}