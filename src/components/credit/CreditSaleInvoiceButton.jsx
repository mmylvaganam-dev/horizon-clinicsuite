import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, FileText, Loader } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

export default function CreditSaleInvoiceButton({ creditSale, variant = "outline" }) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleDownload = async () => {
    if (!creditSale.invoice_pdf_url) {
      toast({
        title: "Invoice not ready",
        description: "The invoice is being generated. Please try again in a moment.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsLoading(true);
      const link = document.createElement('a');
      link.href = creditSale.invoice_pdf_url;
      link.download = `invoice-${creditSale.id}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: "Success",
        description: "Invoice downloaded successfully.",
      });
    } catch (error) {
      console.error('Download error:', error);
      toast({
        title: "Error",
        description: "Failed to download invoice.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      onClick={handleDownload}
      disabled={isLoading || !creditSale.invoice_pdf_url}
      variant={variant}
      size="sm"
      className="gap-2"
      title={creditSale.invoice_pdf_url ? "Download invoice PDF" : "Invoice is being generated..."}
    >
      {isLoading ? (
        <>
          <Loader className="w-4 h-4 animate-spin" />
          Downloading...
        </>
      ) : creditSale.invoice_pdf_url ? (
        <>
          <Download className="w-4 h-4" />
          Invoice
        </>
      ) : (
        <>
          <FileText className="w-4 h-4" />
          Generating...
        </>
      )}
    </Button>
  );
}