import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useLocation } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ShoppingCart,
  Search,
  Barcode,
  User,
  Calendar,
  Eye,
  Download,
  Plus,
  Minus,
  X,
  Check,
  UserPlus,
  Upload,
  Camera,
  FileText,
  Printer,
  Mail,
  MessageSquare,
  Package,
  AlertCircle
} from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { createPageUrl } from '../utils';
import { useNavigate } from 'react-router-dom';
import PHNCard from '@/components/patients/PHNCard';
import { useOrgFiltered } from '@/components/hooks/useOrgFiltered';

export default function PharmacyBilling() {
  const queryClient = useQueryClient();
  const location = useLocation();
  const { orgFilter, selectedOrgId } = useOrgFiltered();
  const [sessionDate, setSessionDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [cart, setCart] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [patientSearch, setPatientSearch] = useState('');
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [selectedWalkIn, setSelectedWalkIn] = useState(null);
  const [showPatientDialog, setShowPatientDialog] = useState(false);
  const [showWalkInDialog, setShowWalkInDialog] = useState(false);
  const [showPHNCard, setShowPHNCard] = useState(false);
  const [walkInForm, setWalkInForm] = useState({ first_name: '', last_name: '', phone: '', mobile: '', date_of_birth: '', gender: '' });
  const [prescriptionFile, setPrescriptionFile] = useState(null);
  const [prescriptionUrl, setPrescriptionUrl] = useState(null);
  const [uploadingPrescription, setUploadingPrescription] = useState(false);
  const [showInvoiceDialog, setShowInvoiceDialog] = useState(false);
  const [completedSale, setCompletedSale] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [activeTab, setActiveTab] = useState('name');
  const [emailSent, setEmailSent] = useState(false);
  const [smsSent, setSmsSent] = useState(false);

  const { data: pharmacyStock = [], isLoading: stockLoading, error: stockError } = useQuery({
    queryKey: ['pharmacyStock', selectedOrgId],
    queryFn: async () => {
      if (!selectedOrgId) {
        console.log('PharmacyBilling - No org selected');
        return [];
      }
      console.log('PharmacyBilling - Fetching stock for org:', selectedOrgId);
      try {
        const result = await base44.entities.PharmacyStock.filter(orgFilter, '-created_date');
        console.log('PharmacyBilling - Got stock:', result.length, 'items');
        return result;
      } catch (error) {
        console.error('PharmacyBilling - Stock fetch error:', error);
        throw error;
      }
    },
    enabled: !!selectedOrgId,
  });

  React.useEffect(() => {
    if (stockError) {
      console.error('PharmacyBilling - Stock query error:', stockError);
      toast.error('Failed to load pharmacy stock');
    }
  }, [stockError]);

  // Handle prescription from work queue
  useEffect(() => {
    if (location.state?.prescription && location.state?.patient && pharmacyStock.length > 0) {
      const { prescription, patient } = location.state;
      
      // Set patient
      setSelectedPatient(patient);
      setPatientSearch(`${patient.first_name} ${patient.last_name}`);
      
      // Find matching stock and add to cart
      const matchingStock = pharmacyStock.find(item => 
        item.display_name.toLowerCase().includes(prescription.drug_name.toLowerCase())
      );
      
      if (matchingStock) {
        const mrp = matchingStock.mrp || matchingStock.unit_price || 0;
        const cost = matchingStock.unit_cost || 0;
        setCart([{
          stock_id: matchingStock.id,
          display_name: matchingStock.display_name,
          barcode: matchingStock.barcode,
          quantity: prescription.quantity || 1,
          unit_price: mrp,
          mrp: mrp,
          unit_cost: cost,
          discount_percent: 0,
          total: mrp * (prescription.quantity || 1)
        }]);
        toast.success(`Added ${prescription.drug_name} to cart`);
      } else {
        setSearchQuery(prescription.drug_name);
        toast.info(`Search for: ${prescription.drug_name}`);
      }
    }
  }, [location.state, pharmacyStock]);

  const { data: patients = [] } = useQuery({
    queryKey: ['patients', selectedOrgId],
    queryFn: async () => {
      if (!selectedOrgId) return [];
      return base44.entities.Patient.filter(orgFilter);
    },
    enabled: !!selectedOrgId,
  });

  const { data: companies = [] } = useQuery({
    queryKey: ['companies', selectedOrgId],
    queryFn: async () => {
      if (!selectedOrgId) return [];
      return base44.entities.CompanyProfile.filter(orgFilter);
    },
    enabled: !!selectedOrgId,
  });

  const { data: productUsage = [] } = useQuery({
    queryKey: ['productUsage', selectedOrgId],
    queryFn: async () => {
      if (!selectedOrgId) return [];
      return base44.entities.PharmacyProductUsage.filter(orgFilter, '-frequency_score', 20);
    },
    enabled: !!selectedOrgId,
  });

  const { data: walkInPatients = [] } = useQuery({
    queryKey: ['walkInPatients', selectedOrgId],
    queryFn: async () => {
      if (!selectedOrgId) return [];
      return base44.entities.PharmacyWalkInPatient.filter(orgFilter, '-last_visit_date');
    },
    enabled: !!selectedOrgId,
  });

  const { data: branding } = useQuery({
    queryKey: ['organizationBranding', selectedOrgId],
    queryFn: async () => {
      if (!selectedOrgId) return null;
      const brandings = await base44.entities.OrganizationBranding.filter(orgFilter);
      return brandings[0] || null;
    },
    enabled: !!selectedOrgId,
  });

  const currency = 'Rs';
  const [billDiscountPercent, setBillDiscountPercent] = useState(0);
  
  // Set default category
  React.useEffect(() => {
    if (selectedCategory === 'all') {
      setSelectedCategory('All');
    }
  }, []);

  // Product categories
  const categories = [
    'All',
    'Antibiotics',
    'Pain & Fever (NSAIDs)',
    'Blood Pressure',
    'Diabetes',
    'Heart & Cholesterol',
    'Vitamins & Supplements',
    'Gastro & Digestion',
    'Respiratory & Asthma',
    'Antiseptic & Wound Care',
    'Skin & Dermatology',
    'Eye & Ear Drops',
    'Injections & IV',
    'Surgical Items',
    'Baby Care',
    'OTC & Common Drugs'
  ];

  // Stats (mock data based on image)
  const stats = {
    loading: 76,
    stored: 70,
    billing: 0,
    mine: 14,
    days: 15
  };

  // Filter stock by category and search
  const filteredStock = pharmacyStock.filter(item => {
    const matchesSearch = searchQuery === '' || 
      item.display_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.barcode?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = selectedCategory === 'All' || selectedCategory === 'all' ||
      item.service_category?.toLowerCase().includes(selectedCategory.toLowerCase()) ||
      item.class_of_medicine?.toLowerCase().includes(selectedCategory.toLowerCase()) ||
      item.display_name?.toLowerCase().includes(selectedCategory.toLowerCase());
    
    return matchesSearch && matchesCategory && item.quality_status === 'usable';
  });

  // Get frequently used items based on actual usage
  const frequentlyUsed = productUsage
    .map(usage => pharmacyStock.find(item => item.id === usage.product_id))
    .filter(item => item && item.quality_status === 'usable')
    .slice(0, 20);

  const updateUsageMutation = useMutation({
    mutationFn: (product) => base44.functions.invoke('updateProductUsage', {
      product_id: product.id,
      product_name: product.display_name
    }),
    onSuccess: () => {
      queryClient.invalidateQueries(['productUsage']);
    }
  });

  const addToCart = (item) => {
    const existing = cart.find(c => c.stock_id === item.id);
    if (existing) {
      setCart(cart.map(c => 
        c.stock_id === item.id 
          ? {...c, quantity: c.quantity + 1, total: (c.quantity + 1) * c.unit_price}
          : c
      ));
    } else {
      const mrp = item.mrp || item.unit_price || 0;
      const cost = item.unit_cost || 0;
      setCart([...cart, {
        stock_id: item.id,
        display_name: item.display_name,
        barcode: item.barcode,
        quantity: 1,
        unit_price: mrp,
        mrp: mrp,
        unit_cost: cost,
        discount_percent: 0,
        total: mrp
      }]);
      
      // Update usage stats when item is added to cart
      updateUsageMutation.mutate(item);
    }
    toast.success(`Added ${item.display_name}`);
  };

  const updateQuantity = (stockId, change) => {
    setCart(cart.map(item => {
      if (item.stock_id === stockId) {
        const newQty = Math.max(0, item.quantity + change);
        const profitMargin = item.mrp - item.unit_cost;
        const discountFromProfit = (profitMargin * item.discount_percent) / 100;
        const finalPrice = item.mrp - discountFromProfit;
        return {...item, quantity: newQty, unit_price: finalPrice, total: newQty * finalPrice};
      }
      return item;
    }));
  };

  const setQuantity = (stockId, value) => {
    const qty = parseInt(value) || 0;
    setCart(cart.map(item => {
      if (item.stock_id === stockId) {
        const newQty = Math.max(0, qty);
        const profitMargin = item.mrp - item.unit_cost;
        const discountFromProfit = (profitMargin * item.discount_percent) / 100;
        const finalPrice = item.mrp - discountFromProfit;
        return {...item, quantity: newQty, unit_price: finalPrice, total: newQty * finalPrice};
      }
      return item;
    }));
  };

  const updateItemDiscount = (stockId, discountPercent) => {
    const percent = Math.max(0, Math.min(15, discountPercent));
    setCart(cart.map(item => {
      if (item.stock_id === stockId) {
        const profitMargin = item.mrp - item.unit_cost;
        const discountFromProfit = (profitMargin * percent) / 100;
        const finalPrice = item.mrp - discountFromProfit;
        return {...item, discount_percent: percent, unit_price: finalPrice, total: item.quantity * finalPrice};
      }
      return item;
    }));
  };

  const removeFromCart = (stockId) => {
    setCart(cart.filter(item => item.stock_id !== stockId));
  };

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const createWalkInMutation = useMutation({
    mutationFn: async (data) => {
      // Generate PHN first
      const phnResponse = await base44.functions.invoke('generatePHN', {});
      const phn = phnResponse?.data?.phn || `WI${Date.now()}`;
      
      // Create as regular patient with walk_in type
      const patientData = {
        first_name: data.first_name || '',
        last_name: data.last_name || '',
        phone: data.phone || '',
        mobile: data.mobile || '',
        date_of_birth: data.date_of_birth || null,
        gender: data.gender || null,
        phn: phn,
        patient_type: 'walk_in',
        status: 'active',
        organization_id: currentUser?.organization_id || null
      };
      
      return base44.entities.Patient.create(patientData);
    },
    onSuccess: (newPatient) => {
      queryClient.invalidateQueries(['patients']);
      setSelectedPatient(newPatient);
      setPatientSearch(`${newPatient.first_name} ${newPatient.last_name}`);
      setShowWalkInDialog(false);
      setWalkInForm({ first_name: '', last_name: '', phone: '', mobile: '', date_of_birth: '', gender: '' });
      setShowPHNCard(true);
      toast.success('Walk-in patient registered with PHN!');
    },
    onError: (error) => {
      console.error('Patient creation error:', error);
      toast.error(error.message || 'Failed to create patient. Please try again.');
    }
  });

  const subtotal = cart.reduce((sum, item) => sum + item.total, 0);
  const totalMRP = cart.reduce((sum, item) => sum + (item.mrp * item.quantity), 0);
  
  // Calculate bill-level discount from profit margin
  const totalProfit = cart.reduce((sum, item) => sum + ((item.mrp - item.unit_cost) * item.quantity), 0);
  const billDiscountAmount = (totalProfit * billDiscountPercent) / 100;
  
  // Apply walk-in customer discount or bill discount (not both)
  const walkInDiscountPercent = selectedWalkIn?.discount_percentage || 0;
  const walkInDiscountAmount = (subtotal * walkInDiscountPercent) / 100;
  
  const finalDiscountAmount = walkInDiscountPercent > 0 ? walkInDiscountAmount : billDiscountAmount;
  const afterDiscount = subtotal - finalDiscountAmount;
  
  const tax = 0; // Can be configured
  const total = afterDiscount + tax;
  
  // Calculate total savings (from MRP)
  const totalSavings = totalMRP - total;

  // Filter patients - instant search as user types
  const filteredPatients = patients.filter(p => {
    const search = patientSearch.toLowerCase().trim();
    if (search === '') return false;
    
    const fullName = `${p.first_name || ''} ${p.last_name || ''}`.toLowerCase();
    const firstName = (p.first_name || '').toLowerCase();
    const lastName = (p.last_name || '').toLowerCase();
    const mobile = (p.mobile || '').toLowerCase();
    const phone = (p.phone || '').toLowerCase();
    const phn = (p.phn || '').toLowerCase();
    
    return firstName.includes(search) ||
      lastName.includes(search) ||
      fullName.includes(search) ||
      mobile.includes(search) ||
      phone.includes(search) ||
      phn.includes(search);
  }).slice(0, 10);

  // Filter walk-in patients
  const filteredWalkIns = walkInPatients.filter(w => {
    const search = patientSearch.toLowerCase().trim();
    if (search === '') return false;
    
    const name = (w.name || '').toLowerCase();
    const phone = (w.phone || '').toLowerCase();
    
    return name.includes(search) || phone.includes(search);
  }).slice(0, 10);

  const handleSelectPatient = (patient) => {
    setSelectedPatient(patient);
    setSelectedWalkIn(null);
    setPatientSearch(`${patient.first_name} ${patient.last_name}`);
    setShowPatientDialog(false);
  };

  const handleSelectWalkIn = (walkIn) => {
    setSelectedWalkIn(walkIn);
    setSelectedPatient(null);
    setPatientSearch(walkIn.name);
    setShowPatientDialog(false);
  };

  const handleCreateWalkIn = () => {
    if (!walkInForm.first_name) {
      toast.error('First name is required');
      return;
    }
    createWalkInMutation.mutate(walkInForm);
  };

  const handlePrescriptionUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingPrescription(true);
    try {
      const result = await base44.integrations.Core.UploadFile({ file });
      setPrescriptionUrl(result.file_url);
      setPrescriptionFile(file);
      toast.success('Prescription uploaded');
    } catch (error) {
      toast.error('Failed to upload prescription');
    } finally {
      setUploadingPrescription(false);
    }
  };

  const sendInvoiceMutation = useMutation({
    mutationFn: (data) => base44.functions.invoke('sendInvoice', data),
    onSuccess: (_, variables) => {
      if (variables.method === 'email') {
        setEmailSent(true);
      } else if (variables.method === 'sms') {
        setSmsSent(true);
      }
      toast.success('Invoice sent successfully');
    },
    onError: () => {
      toast.error('Failed to send invoice');
    }
  });

  const createSaleMutation = useMutation({
    mutationFn: async () => {
      if (cart.length === 0) {
        throw new Error('Cart is empty');
      }
      
      const user = await base44.auth.me();
      const company = companies.length > 0 ? companies[0] : null;
      const receiptNumber = `RX${Date.now().toString().slice(-8)}`;
      const customerName = selectedPatient 
        ? `${selectedPatient.first_name} ${selectedPatient.last_name}`
        : selectedWalkIn?.name || 'Cash Sale';
      
      // Create the pharmacy sale record
      const subtotalAmount = subtotal;
      const taxAmount = tax;
      const totalAmount = total;
      
      const saleData = {
        organization_id: user?.organization_id || 'default_org',
        location_id: user?.location_id || 'default_location',
        patient_ref: selectedPatient?.id || selectedWalkIn?.id || null,
        sale_number: receiptNumber,
        sale_date: new Date().toISOString(),
        subtotal: subtotalAmount,
        tax_total: taxAmount,
        total: totalAmount,
        status: 'paid',
        payment_method: 'cash',
        notes: finalDiscountAmount > 0 ? `Discount: Rs ${finalDiscountAmount.toFixed(2)}` : ''
      };

      const sale = await base44.entities.PharmacySaleHeader.create(saleData);
      
      // Create sale line items
      for (const item of cart) {
        await base44.entities.PharmacySaleLine.create({
          organization_id: user?.organization_id || 'default_org',
          location_id: user?.location_id || 'default_location',
          sale_header_id: sale.id,
          stock_id: item.stock_id,
          product_name: item.display_name,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_price: item.total
        });
      }
      
      // Update stock quantities
      for (const item of cart) {
        const product = pharmacyStock.find(p => p.id === item.stock_id);
        if (product) {
          await base44.entities.PharmacyStock.update(item.stock_id, {
            quantity: Math.max(0, product.quantity - item.quantity)
          });
        }
      }

      // Send SMS notification
      if (selectedPatient?.mobile || selectedPatient?.phone || selectedWalkIn?.phone) {
        const phone = selectedPatient?.mobile || selectedPatient?.phone || selectedWalkIn?.phone;
        const smsMessage = `Thank you for your purchase! Receipt: ${receiptNumber}. Total: ${currency} ${totalAmount.toFixed(2)}. ${company?.company_trade_name || 'Clinic'}`;
        try {
          await base44.functions.invoke('sendSaleSMS', {
            phone: phone,
            message: smsMessage,
            patient_name: customerName
          });
        } catch (smsError) {
          console.log('SMS failed:', smsError);
        }
      }

      // Format date/time for Sri Lanka timezone
      const sriLankaTime = new Date().toLocaleString('en-US', {
        timeZone: 'Asia/Colombo',
        dateStyle: 'medium',
        timeStyle: 'short'
      });
      
      const organizationName = branding?.organization_name || 'Anantham Pharmacy';
      const locationAddress = branding?.address || '';
      const locationPhone = branding?.contact_phone || '';
      
      return {
        receipt_number: receiptNumber,
        customer_name: customerName,
        organization_name: organizationName,
        location_address: locationAddress,
        location_phone: locationPhone,
        sale_datetime: sriLankaTime,
        currency,
        items: cart,
        subtotal: subtotalAmount,
        discount_amount: finalDiscountAmount,
        total_savings: totalSavings,
        tax: taxAmount,
        total: totalAmount,
        customer_email: selectedPatient?.email || selectedWalkIn?.email,
        customer_phone: selectedPatient?.mobile || selectedWalkIn?.phone
      };
    },
    onSuccess: (completedSaleData) => {
      queryClient.invalidateQueries(['pharmacyStock']);
      toast.success(`Sale ${completedSaleData.receipt_number} completed!`);
      setCompletedSale(completedSaleData);
      setShowInvoiceDialog(true);
    },
    onError: (error) => {
      toast.error('Sale failed: ' + error.message);
      console.error(error);
    }
  });

  const handleCompleteSale = () => {
    createSaleMutation.mutate();
  };

  const handlePrintInvoice = () => {
    if (!completedSale) return;
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>Invoice ${completedSale.receipt_number}</title>
          <style>
            @page {
              size: 80mm auto;
              margin: 0;
            }
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            body { 
              font-family: 'Courier New', monospace; 
              width: 72mm;
              margin: 0 auto;
              padding: 5mm;
              font-size: 11px;
              line-height: 1.3;
            }
            .header { 
              text-align: center; 
              border-bottom: 1px dashed #333; 
              padding-bottom: 5px; 
              margin-bottom: 8px; 
            }
            .header h1 { 
              font-size: 14px; 
              font-weight: bold;
              margin-bottom: 3px;
            }
            .header p { 
              font-size: 9px;
              margin: 1px 0;
            }
            .info { 
              margin-bottom: 8px; 
              font-size: 10px;
            }
            .info-row {
              display: flex;
              justify-content: space-between;
              margin: 2px 0;
            }
            .divider {
              border-top: 1px dashed #333;
              margin: 5px 0;
            }
            .items {
              margin: 5px 0;
            }
            .item {
              margin: 3px 0;
              font-size: 10px;
            }
            .item-name {
              font-weight: bold;
              margin-bottom: 1px;
            }
            .item-details {
              display: flex;
              justify-content: space-between;
              font-size: 9px;
            }
            .totals { 
              margin-top: 8px;
              border-top: 1px solid #333;
              padding-top: 5px;
            }
            .total-row {
              display: flex;
              justify-content: space-between;
              margin: 2px 0;
              font-size: 10px;
            }
            .grand-total { 
              font-weight: bold; 
              font-size: 12px;
              border-top: 1px solid #333;
              margin-top: 3px;
              padding-top: 3px;
            }
            .savings {
              text-align: center;
              margin: 8px 0;
              padding: 5px;
              border: 1px solid #333;
              font-size: 10px;
              font-weight: bold;
            }
            .footer { 
              text-align: center; 
              margin-top: 10px;
              padding-top: 5px;
              border-top: 1px dashed #333;
              font-size: 9px;
            }
            @media print {
              body { 
                width: 72mm;
              }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${completedSale.organization_name}</h1>
            ${completedSale.location_address ? `<p>${completedSale.location_address}</p>` : ''}
            ${completedSale.location_phone ? `<p>Tel: ${completedSale.location_phone}</p>` : ''}
          </div>
          
          <div class="info">
            <div class="info-row">
              <span>Receipt:</span>
              <span><strong>${completedSale.receipt_number}</strong></span>
            </div>
            <div class="info-row">
              <span>Customer:</span>
              <span>${completedSale.customer_name}</span>
            </div>
            <div class="info-row">
              <span>Date/Time:</span>
              <span>${completedSale.sale_datetime}</span>
            </div>
          </div>
          
          <div class="divider"></div>
          
          <div class="items">
            ${completedSale.items.map(item => `
              <div class="item">
                <div class="item-name">${item.display_name}</div>
                <div class="item-details">
                  <span>${item.quantity} x ${completedSale.currency} ${item.unit_price.toFixed(2)}</span>
                  <span><strong>${completedSale.currency} ${item.total.toFixed(2)}</strong></span>
                </div>
              </div>
            `).join('')}
          </div>
          
          <div class="totals">
            <div class="total-row">
              <span>Subtotal:</span>
              <span>${completedSale.currency} ${completedSale.subtotal.toFixed(2)}</span>
            </div>
            ${completedSale.discount_amount > 0 ? `
            <div class="total-row">
              <span>Discount:</span>
              <span>-${completedSale.currency} ${completedSale.discount_amount.toFixed(2)}</span>
            </div>
            ` : ''}
            <div class="total-row">
              <span>Tax:</span>
              <span>${completedSale.currency} ${completedSale.tax.toFixed(2)}</span>
            </div>
            <div class="total-row grand-total">
              <span>TOTAL:</span>
              <span>${completedSale.currency} ${completedSale.total.toFixed(2)}</span>
            </div>
          </div>
          
          ${completedSale.total_savings > 0 ? `
          <div class="savings">
            You Saved ${completedSale.currency} ${completedSale.total_savings.toFixed(2)}!
          </div>
          ` : ''}
          
          <div class="footer">
            <p>Thank you for your purchase!</p>
            <p>Please keep this receipt</p>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
    }, 250);
  };

  const handleEmailInvoice = () => {
    if (!completedSale?.customer_email) {
      toast.error('No email address available');
      return;
    }
    
    const companyId = companies && companies.length > 0 ? companies[0].id : null;
    if (!companyId) {
      toast.error('Company information not available');
      return;
    }
    
    sendInvoiceMutation.mutate({
      method: 'email',
      recipient: completedSale.customer_email,
      sale_data: completedSale,
      company_id: companyId
    });
  };

  const handleSMSInvoice = () => {
    if (!completedSale?.customer_phone) {
      toast.error('No phone number available');
      return;
    }
    
    const companyId = companies && companies.length > 0 ? companies[0].id : null;
    if (!companyId) {
      toast.error('Company information not available');
      return;
    }
    
    sendInvoiceMutation.mutate({
      method: 'sms',
      recipient: completedSale.customer_phone,
      sale_data: completedSale,
      company_id: companyId
    });
  };

  const handlePrintAndEmail = () => {
    handlePrintInvoice();
    if (completedSale?.customer_email) {
      handleEmailInvoice();
    }
  };

  const handlePrintAndSMS = () => {
    handlePrintInvoice();
    if (completedSale?.customer_phone) {
      handleSMSInvoice();
    }
  };

  const handleAll = () => {
    handlePrintInvoice();
    if (completedSale?.customer_email) {
      handleEmailInvoice();
    }
    if (completedSale?.customer_phone) {
      handleSMSInvoice();
    }
  };

  const handleCloseInvoiceDialog = () => {
    setShowInvoiceDialog(false);
    setCompletedSale(null);
    setEmailSent(false);
    setSmsSent(false);
    
    // Reset cart and selections
    setCart([]);
    setSelectedPatient(null);
    setSelectedWalkIn(null);
    setPatientSearch('');
    setPrescriptionFile(null);
    setPrescriptionUrl(null);
  };

  console.log('PharmacyBilling - Rendering with:', { selectedOrgId, stockCount: pharmacyStock.length, cartCount: cart.length });

  if (!selectedOrgId) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Card className="p-8 max-w-md text-center">
          <AlertCircle className="w-16 h-16 mx-auto text-amber-500 mb-4" />
          <h2 className="text-xl font-bold mb-2">No Organization Selected</h2>
          <p className="text-slate-600 mb-4">Please select an organization from the top right to continue.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-slate-50">
      {/* Top Bar */}
      <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 text-white px-4 lg:px-6 py-2 lg:py-3 flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-lg lg:text-xl font-bold">Pharmacy POS</h1>
        <div className="flex items-center gap-2 lg:gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 lg:w-5 lg:h-5" />
            <Input
              type="date"
              value={sessionDate}
              onChange={(e) => setSessionDate(e.target.value)}
              className="bg-white/20 border-white/30 text-white text-sm h-8 lg:h-9"
            />
          </div>
        </div>
      </div>

      {/* Stats Bar - Hidden on small screens */}
      <div className="hidden md:block bg-white border-b px-4 lg:px-6 py-2">
        <div className="flex gap-3 lg:gap-6 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 lg:w-8 lg:h-8 rounded-lg bg-yellow-100 flex items-center justify-center">
              <span className="text-xs lg:text-sm font-bold text-yellow-700">{stats.loading}</span>
            </div>
            <span className="text-xs lg:text-sm text-slate-600">Loading</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 lg:w-8 lg:h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
              <span className="text-xs lg:text-sm font-bold text-emerald-700">{stats.stored}</span>
            </div>
            <span className="text-xs lg:text-sm text-slate-600">Stored</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 lg:w-8 lg:h-8 rounded-lg bg-blue-100 flex items-center justify-center">
              <span className="text-xs lg:text-sm font-bold text-blue-700">{stats.billing}</span>
            </div>
            <span className="text-xs lg:text-sm text-slate-600">Billing</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 lg:w-8 lg:h-8 rounded-lg bg-purple-100 flex items-center justify-center">
              <span className="text-xs lg:text-sm font-bold text-purple-700">{stats.mine}</span>
            </div>
            <span className="text-xs lg:text-sm text-slate-600">Mine</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 lg:w-8 lg:h-8 rounded-lg bg-rose-100 flex items-center justify-center">
              <span className="text-xs lg:text-sm font-bold text-rose-700">{stats.days}</span>
            </div>
            <span className="text-xs lg:text-sm text-slate-600">Days</span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Categories & Frequently Used - Hidden on mobile/tablet */}
        <div className="hidden xl:block w-64 bg-white border-r overflow-y-auto flex-shrink-0">
          <div className="p-4 border-b">
            <h3 className="font-semibold text-slate-900 mb-3">FREQUENTLY USED (Top 20)</h3>
            <div className="space-y-1">
              {frequentlyUsed.length === 0 ? (
                <p className="text-xs text-slate-500 px-3 py-2">Start selling to build your frequently used list</p>
              ) : (
                frequentlyUsed.map((item, idx) => (
                  <button
                    key={item.id}
                    onClick={() => addToCart(item)}
                    className="w-full text-left px-3 py-2 text-sm rounded hover:bg-slate-100 transition-colors flex items-center justify-between group"
                  >
                    <span className="flex-1">{item.display_name}</span>
                    <Badge variant="outline" className="text-xs opacity-0 group-hover:opacity-100 transition-opacity">
                      #{idx + 1}
                    </Badge>
                  </button>
                ))
              )}
            </div>
          </div>
          
          <div className="p-4">
            <h3 className="font-semibold text-slate-900 mb-3">CATEGORIES</h3>
            <div className="space-y-1">
              {categories.map((cat, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedCategory(cat)}
                  className={`w-full text-left px-3 py-2 text-sm rounded transition-colors ${
                    selectedCategory === cat ? 'bg-indigo-100 text-indigo-900' : 'hover:bg-slate-100'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Center - Search & Results */}
        <div className="flex-1 flex flex-col overflow-hidden bg-slate-50">
          {/* Search Bar */}
          <div className="p-4 lg:p-6 bg-white border-b space-y-4 flex-shrink-0">
            <div className="space-y-2">
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <Input
                  placeholder="Tap to search patient or customer"
                  value={patientSearch}
                  onChange={(e) => {
                    setPatientSearch(e.target.value);
                    if (!showPatientDialog) setShowPatientDialog(true);
                  }}
                  onClick={() => setShowPatientDialog(true)}
                  onFocus={() => setShowPatientDialog(true)}
                  className="pl-12 h-11 text-base cursor-pointer"
                  readOnly={false}
                />
                {(selectedPatient || selectedWalkIn) && (
                  <Badge className="absolute right-3 top-1/2 -translate-y-1/2 bg-emerald-600">
                    {selectedWalkIn && selectedWalkIn.discount_percentage > 0 ? `${selectedWalkIn.discount_percentage}%` : '✓'}
                  </Badge>
                )}
              </div>
              {(selectedPatient || selectedWalkIn) && (
                <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-lg p-2">
                  <div className="text-sm">
                    <p className="font-semibold text-emerald-900">
                      {selectedPatient ? `${selectedPatient.first_name} ${selectedPatient.last_name}` : selectedWalkIn?.name}
                    </p>
                    {selectedPatient && (
                      <p className="text-xs text-emerald-700">PHN: {selectedPatient.phn}</p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    onClick={() => {
                      setSelectedPatient(null);
                      setSelectedWalkIn(null);
                      setPatientSearch('');
                      setShowPatientDialog(true);
                    }}
                    title="Change patient"
                  >
                    <X className="w-4 h-4 mr-1" />
                    Change
                  </Button>
                </div>
              )}
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid grid-cols-4 w-full h-11">
                <TabsTrigger value="name">Name</TabsTrigger>
                <TabsTrigger value="generics">Generics</TabsTrigger>
                <TabsTrigger value="substitutes">Substitutes</TabsTrigger>
                <TabsTrigger value="barcods">Barcode</TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <Input
                placeholder={`Tap to search ${activeTab === 'barcods' ? 'barcode' : activeTab === 'name' ? 'drug name' : activeTab === 'generics' ? 'generic' : 'substitute'}`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 h-12 text-base"
                inputMode="search"
              />
            </div>
          </div>

          {/* Search Results */}
          <div className="flex-1 overflow-y-auto p-4 lg:p-6">
            {searchQuery === '' ? (
              <div className="text-center py-20">
                <Search className="w-16 h-16 mx-auto text-slate-300 mb-4" />
                <p className="text-lg text-slate-600 font-medium">Start typing to search products</p>
                <p className="text-sm text-slate-500 mt-2">Search by name, generic, substitute, or barcode</p>
              </div>
            ) : filteredStock.length === 0 ? (
              <div className="text-center py-20">
                <Package className="w-16 h-16 mx-auto text-slate-300 mb-4" />
                <p className="text-lg text-slate-600 font-medium">No products found</p>
                <p className="text-sm text-slate-500 mt-2">Try a different search term</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredStock.map((item) => (
                  <Card
                    key={item.id}
                    className="cursor-pointer hover:shadow-lg hover:border-indigo-300 transition-all"
                    onClick={() => addToCart(item)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-start gap-2 mb-1">
                            <p className="font-semibold text-base text-slate-900 flex-1">
                              {item.display_name}
                            </p>
                            {item.expire_date && (
                              <Badge className={`font-bold text-xs whitespace-nowrap ${
                                new Date(item.expire_date) < new Date() 
                                  ? 'bg-red-600 text-white border-2 border-red-700' 
                                  : new Date(item.expire_date) <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
                                  ? 'bg-orange-600 text-white border-2 border-orange-700'
                                  : new Date(item.expire_date) <= new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
                                  ? 'bg-amber-500 text-white border-2 border-amber-600'
                                  : 'bg-slate-100 text-slate-700'
                              }`}>
                                {format(new Date(item.expire_date), 'd MMM yyyy')}
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-sm text-slate-600">
                            <Badge variant="outline">{item.barcode}</Badge>
                            {item.batch_no && <span>Batch: {item.batch_no}</span>}
                            <span>Stock: {item.quantity}</span>
                            {item.generic_name && <span className="text-xs">• {item.generic_name}</span>}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-emerald-600">
                            {currency} {(item.mrp || item.unit_price || 0).toFixed(2)}
                          </p>
                          <Button size="sm" className="mt-2 bg-indigo-600 hover:bg-indigo-700">
                            <Plus className="w-4 h-4 mr-1" />
                            Add to Cart
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Sidebar - Cart */}
        <div className="w-full md:w-96 lg:w-[26rem] xl:w-[28rem] bg-white border-l flex flex-col flex-shrink-0">
          <div className="p-3 lg:p-4 border-b flex-shrink-0">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base lg:text-lg">Cart</h3>
              <Badge className="bg-indigo-600 text-xs lg:text-sm">{cart.length} items</Badge>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
            {cart.length === 0 ? (
              <div className="text-center py-8">
                <ShoppingCart className="w-10 h-10 mx-auto text-slate-300 mb-3" />
                <p className="text-sm text-slate-500">Cart is empty</p>
              </div>
            ) : (
              cart.map((item) => (
                <Card key={item.stock_id} className="p-2">
                  <div className="space-y-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-medium text-xs flex-1 line-clamp-1">{item.display_name}</p>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5 flex-shrink-0"
                        onClick={() => removeFromCart(item.stock_id)}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                    
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => updateQuantity(item.stock_id, -1)}
                        >
                          <Minus className="w-3 h-3" />
                        </Button>
                        <Input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => setQuantity(item.stock_id, e.target.value)}
                          className="h-6 w-14 text-center text-sm font-medium p-0"
                          min="0"
                        />
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => updateQuantity(item.stock_id, 1)}
                        >
                          <Plus className="w-3 h-3" />
                        </Button>
                      </div>
                      
                      <div className="flex items-center gap-0.5">
                        <span className="text-[10px] text-slate-600">Disc:</span>
                        <Input
                          type="number"
                          value={item.discount_percent}
                          onChange={(e) => updateItemDiscount(item.stock_id, parseFloat(e.target.value) || 0)}
                          className="h-6 w-14 text-xs text-center"
                          min="0"
                          max="15"
                          step="1"
                        />
                        <span className="text-xs text-slate-600">%</span>
                      </div>
                      
                      <div className="text-right">
                        {item.discount_percent > 0 && (
                          <p className="text-[9px] text-slate-500 line-through">{currency} {(item.mrp * item.quantity).toFixed(2)}</p>
                        )}
                        <p className="font-bold text-sm text-emerald-600">{currency} {item.total.toFixed(2)}</p>
                      </div>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>

          <div className="border-t p-2 lg:p-4 space-y-2 lg:space-y-3 flex-shrink-0">
            {/* Prescription Upload */}
            {cart.length > 0 && (
              <div className="pb-2 lg:pb-3 border-b">
                <Label className="text-[10px] lg:text-xs text-slate-600 mb-1.5 lg:mb-2 block">Prescription (Optional)</Label>
                {prescriptionFile ? (
                  <div className="flex items-center gap-2 p-2 bg-emerald-50 border border-emerald-200 rounded">
                    <FileText className="w-4 h-4 text-emerald-600" />
                    <span className="text-sm text-emerald-700 flex-1">{prescriptionFile.name}</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setPrescriptionFile(null);
                        setPrescriptionUrl(null);
                      }}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    <label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handlePrescriptionUpload}
                        className="hidden"
                        disabled={uploadingPrescription}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="w-full"
                        disabled={uploadingPrescription}
                        onClick={(e) => e.currentTarget.previousElementSibling?.click()}
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        Upload
                      </Button>
                    </label>
                    <label>
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={handlePrescriptionUpload}
                        className="hidden"
                        disabled={uploadingPrescription}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="w-full"
                        disabled={uploadingPrescription}
                        onClick={(e) => e.currentTarget.previousElementSibling?.click()}
                      >
                        <Camera className="w-4 h-4 mr-2" />
                        Scan
                      </Button>
                    </label>
                  </div>
                )}
              </div>
            )}

            <div className="space-y-1.5 lg:space-y-2">
              {/* Bill Discount */}
              {cart.length > 0 && !selectedWalkIn && (
                <div className="flex items-center gap-1.5 lg:gap-2 pb-1.5 lg:pb-2 border-b">
                  <Label className="text-[10px] lg:text-xs text-slate-600 whitespace-nowrap">Bill Disc %:</Label>
                  <Input
                    type="number"
                    value={billDiscountPercent}
                    onChange={(e) => setBillDiscountPercent(Math.max(0, Math.min(15, parseFloat(e.target.value) || 0)))}
                    className="h-6 lg:h-7 w-12 lg:w-16 text-xs"
                    min="0"
                    max="15"
                    step="1"
                  />
                  <span className="text-[10px] lg:text-xs text-slate-500 whitespace-nowrap">(max 15)</span>
                </div>
              )}

              <div className="flex justify-between text-xs lg:text-sm">
                <span className="text-slate-600">Subtotal:</span>
                <span className="font-semibold">{currency} {subtotal.toFixed(2)}</span>
              </div>
              {finalDiscountAmount > 0 && (
                <div className="flex justify-between text-xs lg:text-sm">
                  <span className="text-emerald-600 text-[10px] lg:text-xs">
                    Discount {walkInDiscountPercent > 0 ? `(${walkInDiscountPercent}%)` : `(${billDiscountPercent}%)`}:
                  </span>
                  <span className="font-semibold text-emerald-600">- {currency} {finalDiscountAmount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-xs lg:text-sm">
                <span className="text-slate-600">Tax:</span>
                <span className="font-semibold">{currency} {tax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-base lg:text-lg pt-1.5 lg:pt-2 border-t">
                <span className="font-bold">Total:</span>
                <span className="font-bold text-indigo-600">{currency} {total.toFixed(2)}</span>
              </div>
              {totalSavings > 0 && (
                <div className="bg-emerald-50 border border-emerald-200 rounded p-1.5 lg:p-2">
                  <p className="text-xs lg:text-sm text-emerald-700 font-semibold text-center">
                    💰 Save: {currency} {totalSavings.toFixed(2)}
                  </p>
                </div>
              )}
            </div>
            <Button 
              className="w-full bg-indigo-600 hover:bg-indigo-700 h-9 lg:h-10 text-sm lg:text-base" 
              disabled={cart.length === 0 || createSaleMutation.isPending}
              onClick={handleCompleteSale}
            >
              <Check className="w-4 h-4 lg:w-5 lg:h-5 mr-2" />
              {createSaleMutation.isPending ? 'Processing...' : 'Complete Sale'}
            </Button>
            {cart.length > 0 && !selectedPatient && !selectedWalkIn && (
              <p className="text-[10px] lg:text-xs text-slate-500 text-center">
                No customer - Cash Sale
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Patient Search Dialog */}
      <Dialog open={showPatientDialog} onOpenChange={setShowPatientDialog}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Search & Select Patient</DialogTitle>
          </DialogHeader>
          
          {/* Search Input in Dialog */}
          <div className="sticky top-0 bg-white pb-3 border-b">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <Input
                placeholder="Type patient name, phone, or PHN..."
                value={patientSearch}
                onChange={(e) => setPatientSearch(e.target.value)}
                className="pl-10 h-12 text-base"
                autoFocus
              />
            </div>
            {patientSearch.trim() && (
              <p className="text-xs text-slate-500 mt-2">
                Showing {filteredPatients.length + filteredWalkIns.length} results
              </p>
            )}
          </div>

          <div className="flex-1 overflow-y-auto space-y-4 py-2">
            {patientSearch.trim() === '' ? (
              <div className="text-center py-12">
                <User className="w-16 h-16 mx-auto text-slate-300 mb-4" />
                <p className="text-slate-600 font-medium">Start typing to search</p>
                <p className="text-sm text-slate-500 mt-2">Search by name, phone, or PHN</p>
                <Button 
                  className="mt-6" 
                  onClick={() => {
                    setShowPatientDialog(false);
                    setShowWalkInDialog(true);
                  }}
                >
                  <UserPlus className="w-4 h-4 mr-2" />
                  Register New Patient
                </Button>
              </div>
            ) : (filteredPatients.length === 0 && filteredWalkIns.length === 0) ? (
              <div className="text-center py-12">
                <p className="text-slate-600 font-medium mb-4">No patients found</p>
                <Button 
                  onClick={() => {
                    setShowPatientDialog(false);
                    setShowWalkInDialog(true);
                  }}
                >
                  <UserPlus className="w-4 h-4 mr-2" />
                  Register New Patient
                </Button>
              </div>
            ) : (
              <>
                {/* Registered Patients */}
                {filteredPatients.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-sm text-slate-700 mb-3 px-1">Registered Patients ({filteredPatients.length})</h3>
                    <div className="space-y-2">
                      {filteredPatients.map(patient => (
                        <Card
                          key={patient.id}
                          className="p-4 cursor-pointer hover:bg-blue-50 hover:border-blue-300 transition-all border-2"
                          onClick={() => handleSelectPatient(patient)}
                        >
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <p className="font-semibold text-lg text-slate-900">
                                {patient.first_name} {patient.last_name}
                              </p>
                              <div className="flex flex-wrap gap-2 mt-2">
                                {patient.mobile && (
                                  <Badge variant="outline" className="text-xs">
                                    📱 {patient.mobile}
                                  </Badge>
                                )}
                                {patient.phn && (
                                  <Badge variant="outline" className="text-xs bg-blue-50">
                                    PHN: {patient.phn}
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <Badge className="bg-emerald-600">Select</Badge>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}

                {/* Walk-In Patients */}
                {filteredWalkIns.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-sm text-slate-700 mb-3 px-1">Walk-In Customers ({filteredWalkIns.length})</h3>
                    <div className="space-y-2">
                      {filteredWalkIns.map(walkIn => (
                        <Card
                          key={walkIn.id}
                          className="p-4 cursor-pointer hover:bg-purple-50 hover:border-purple-300 transition-all border-2"
                          onClick={() => handleSelectWalkIn(walkIn)}
                        >
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <p className="font-semibold text-lg text-slate-900">{walkIn.name}</p>
                              <div className="flex flex-wrap gap-2 mt-2">
                                {walkIn.phone && (
                                  <Badge variant="outline" className="text-xs">
                                    📱 {walkIn.phone}
                                  </Badge>
                                )}
                                {walkIn.discount_percentage > 0 && (
                                  <Badge className="bg-emerald-600 text-xs">
                                    {walkIn.discount_percentage}% Discount
                                  </Badge>
                                )}
                                <Badge variant="outline" className="text-xs">
                                  {walkIn.total_visits || 0} visits
                                </Badge>
                              </div>
                            </div>
                            <Badge className="bg-purple-600">Select</Badge>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Walk-in Customer Dialog */}
      <Dialog open={showWalkInDialog} onOpenChange={setShowWalkInDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Register Walk-in Patient</DialogTitle>
            <p className="text-sm text-slate-500">A PHN card will be generated for this patient</p>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>First Name *</Label>
                <Input
                  value={walkInForm.first_name}
                  onChange={(e) => setWalkInForm({ ...walkInForm, first_name: e.target.value })}
                  placeholder="First name"
                />
              </div>
              <div>
                <Label>Last Name / Initial</Label>
                <Input
                  value={walkInForm.last_name}
                  onChange={(e) => setWalkInForm({ ...walkInForm, last_name: e.target.value })}
                  placeholder="Last name or initial"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
               <div>
                 <Label>Home Phone</Label>
                 <Input
                   value={walkInForm.phone}
                   onChange={(e) => setWalkInForm({ ...walkInForm, phone: e.target.value })}
                   placeholder="Optional"
                 />
               </div>
               <div>
                 <Label>Mobile Phone</Label>
                 <Input
                   value={walkInForm.mobile}
                   onChange={(e) => setWalkInForm({ ...walkInForm, mobile: e.target.value })}
                   placeholder="Optional - for SMS"
                 />
               </div>
             </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Date of Birth</Label>
                <Input
                  type="date"
                  value={walkInForm.date_of_birth}
                  onChange={(e) => setWalkInForm({ ...walkInForm, date_of_birth: e.target.value })}
                />
              </div>
              <div>
                <Label>Gender</Label>
                <Select 
                  value={walkInForm.gender} 
                  onValueChange={(value) => setWalkInForm({ ...walkInForm, gender: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowWalkInDialog(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleCreateWalkIn}
                disabled={!walkInForm.first_name || createWalkInMutation.isPending}
              >
                {createWalkInMutation.isPending ? 'Registering...' : 'Register & Generate PHN'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* PHN Card Dialog */}
      <PHNCard 
        open={showPHNCard} 
        onOpenChange={setShowPHNCard}
        patient={selectedPatient}
        branding={branding}
      />

      {/* Invoice Options Dialog */}
      <Dialog open={showInvoiceDialog} onOpenChange={setShowInvoiceDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Invoice Ready</DialogTitle>
          </DialogHeader>
          
          {completedSale && (
            <div className="space-y-4">
              <div className="bg-slate-50 p-4 rounded-lg">
                <p className="text-sm text-slate-600">Receipt #{completedSale.receipt_number}</p>
                <p className="font-semibold">{completedSale.customer_name}</p>
                <p className="text-2xl font-bold text-indigo-600 mt-2">
                  {completedSale.currency} {completedSale.total.toFixed(2)}
                </p>
              </div>

              <div className="space-y-2">
                <Button 
                  className="w-full justify-start" 
                  variant="outline"
                  onClick={handlePrintInvoice}
                >
                  <Printer className="w-4 h-4 mr-2" />
                  Print Invoice
                </Button>
                
                <Button 
                  className="w-full justify-start" 
                  variant="outline"
                  onClick={handleEmailInvoice}
                  disabled={!completedSale.customer_email || sendInvoiceMutation.isPending || emailSent}
                >
                  <Mail className="w-4 h-4 mr-2" />
                  {emailSent ? (
                    <>
                      <Check className="w-4 h-4 mr-2 text-green-600" />
                      <span className="text-green-600">Email Sent</span>
                    </>
                  ) : completedSale.customer_email ? (
                    `Email to ${completedSale.customer_email}`
                  ) : (
                    'Email (No email address)'
                  )}
                </Button>
                
                <Button 
                  className="w-full justify-start" 
                  variant="outline"
                  onClick={handleSMSInvoice}
                  disabled={!completedSale.customer_phone || sendInvoiceMutation.isPending || smsSent}
                >
                  <MessageSquare className="w-4 h-4 mr-2" />
                  {smsSent ? (
                    <>
                      <Check className="w-4 h-4 mr-2 text-green-600" />
                      <span className="text-green-600">SMS Sent</span>
                    </>
                  ) : completedSale.customer_phone ? (
                    `SMS to ${completedSale.customer_phone}`
                  ) : (
                    'SMS (No phone number)'
                  )}
                </Button>

                {!completedSale.customer_email && !completedSale.customer_phone && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-700">No email or phone number available. Print invoice only.</p>
                  </div>
                )}

                {(completedSale.customer_email || completedSale.customer_phone) && (
                  <>
                    <div className="border-t my-2"></div>
                    {completedSale.customer_email && completedSale.customer_phone && (
                      <Button 
                        className="w-full justify-start bg-indigo-600 hover:bg-indigo-700 text-white" 
                        onClick={handleAll}
                        disabled={sendInvoiceMutation.isPending}
                      >
                        <Check className="w-4 h-4 mr-2" />
                        Print, Email & SMS All
                      </Button>
                    )}
                    {completedSale.customer_email && !completedSale.customer_phone && (
                      <Button 
                        className="w-full justify-start bg-indigo-600 hover:bg-indigo-700 text-white" 
                        onClick={handlePrintAndEmail}
                        disabled={sendInvoiceMutation.isPending}
                      >
                        <Check className="w-4 h-4 mr-2" />
                        Print & Email
                      </Button>
                    )}
                    {completedSale.customer_phone && !completedSale.customer_email && (
                      <Button 
                        className="w-full justify-start bg-indigo-600 hover:bg-indigo-700 text-white" 
                        onClick={handlePrintAndSMS}
                        disabled={sendInvoiceMutation.isPending}
                      >
                        <Check className="w-4 h-4 mr-2" />
                        Print & SMS
                      </Button>
                    )}
                  </>
                )}
              </div>

              <div className="flex justify-end pt-2">
                <Button onClick={handleCloseInvoiceDialog}>
                  Done
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}