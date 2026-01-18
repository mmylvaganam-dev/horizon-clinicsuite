import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
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
  MessageSquare
} from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

export default function PharmacyBilling() {
  const queryClient = useQueryClient();
  const [sessionDate, setSessionDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [cart, setCart] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [patientSearch, setPatientSearch] = useState('');
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [selectedWalkIn, setSelectedWalkIn] = useState(null);
  const [showPatientDialog, setShowPatientDialog] = useState(false);
  const [showWalkInDialog, setShowWalkInDialog] = useState(false);
  const [walkInForm, setWalkInForm] = useState({ name: '', phone: '', discount_percentage: 0 });
  const [prescriptionFile, setPrescriptionFile] = useState(null);
  const [prescriptionUrl, setPrescriptionUrl] = useState(null);
  const [uploadingPrescription, setUploadingPrescription] = useState(false);
  const [showInvoiceDialog, setShowInvoiceDialog] = useState(false);
  const [completedSale, setCompletedSale] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [activeTab, setActiveTab] = useState('name');

  const { data: pharmacyStock = [] } = useQuery({
    queryKey: ['pharmacyStock'],
    queryFn: () => base44.entities.PharmacyStock.list('-created_date'),
  });

  const { data: patients = [] } = useQuery({
    queryKey: ['patients'],
    queryFn: () => base44.entities.Patient.list(),
  });

  const { data: companies = [] } = useQuery({
    queryKey: ['companies'],
    queryFn: () => base44.entities.CompanyProfile.list(),
  });

  const { data: productUsage = [] } = useQuery({
    queryKey: ['productUsage'],
    queryFn: () => base44.entities.PharmacyProductUsage.list('-frequency_score', 20),
  });

  const { data: walkInPatients = [] } = useQuery({
    queryKey: ['walkInPatients'],
    queryFn: () => base44.entities.PharmacyWalkInPatient.list('-last_visit_date'),
  });

  const { data: branding } = useQuery({
    queryKey: ['organizationBranding'],
    queryFn: async () => {
      const brandings = await base44.entities.OrganizationBranding.list();
      return brandings[0];
    },
  });

  const currency = companies[0]?.base_currency || 'LKR';
  const [billDiscountPercent, setBillDiscountPercent] = useState(0);

  // Product categories
  const categories = [
    '1-ACNE PRO TAX',
    'Antiseptic',
    'BASIC DRUG Tabs',
    'Common OTC tabs',
    'COVID tabs',
    'Digestive enzyme for injection (10ml)',
    'UNIAX Ampo',
    'Disposable syringe (10ml)',
    'Propedolic syringe (10ml)'
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
    
    return matchesSearch && item.quality_status === 'usable';
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
        const newQty = Math.max(1, item.quantity + change);
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

  const createWalkInMutation = useMutation({
    mutationFn: (data) => base44.entities.PharmacyWalkInPatient.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['walkInPatients']);
      toast.success('Walk-in patient created');
      setShowWalkInDialog(false);
      setWalkInForm({ name: '', phone: '', discount_percentage: 0 });
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

  // Filter patients
  const filteredPatients = patients.filter(p => {
    const search = patientSearch.toLowerCase();
    return search === '' ||
      `${p.first_name} ${p.last_name}`.toLowerCase().includes(search) ||
      p.mobile?.toLowerCase().includes(search) ||
      p.patient_id?.toLowerCase().includes(search);
  }).slice(0, 5);

  // Filter walk-in patients
  const filteredWalkIns = walkInPatients.filter(w => {
    const search = patientSearch.toLowerCase();
    return search === '' ||
      w.name.toLowerCase().includes(search) ||
      w.phone?.toLowerCase().includes(search);
  }).slice(0, 5);

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
    if (!walkInForm.name) {
      toast.error('Name is required');
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
    onSuccess: () => {
      toast.success('Invoice sent successfully');
    },
    onError: () => {
      toast.error('Failed to send invoice');
    }
  });

  const handleCompleteSale = () => {
    if (cart.length === 0) {
      toast.error('Cart is empty');
      return;
    }
    
    const receiptNumber = `RX${Date.now().toString().slice(-8)}`;
    const customerName = selectedPatient 
      ? `${selectedPatient.first_name} ${selectedPatient.last_name}`
      : selectedWalkIn?.name || 'Cash Sale';
    
    // Format date/time for Sri Lanka timezone
    const sriLankaTime = new Date().toLocaleString('en-US', {
      timeZone: 'Asia/Colombo',
      dateStyle: 'medium',
      timeStyle: 'short'
    });
    
    const organizationName = branding?.organization_name || 'Anantham Pharmacy';
    const locationAddress = branding?.address || '';
    const locationPhone = branding?.contact_phone || '';
    
    const saleData = {
      receipt_number: receiptNumber,
      customer_name: customerName,
      organization_name: organizationName,
      location_address: locationAddress,
      location_phone: locationPhone,
      sale_datetime: sriLankaTime,
      currency,
      items: cart,
      subtotal,
      discount_amount: finalDiscountAmount,
      total_savings: totalSavings,
      tax,
      total,
      customer_email: selectedPatient?.email || selectedWalkIn?.email,
      customer_phone: selectedPatient?.mobile || selectedWalkIn?.phone
    };
    
    setCompletedSale(saleData);
    setShowInvoiceDialog(true);
    toast.success('Sale completed successfully');
  };

  const handlePrintInvoice = () => {
    if (!completedSale) return;
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>Invoice ${completedSale.receipt_number}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; max-width: 800px; margin: 0 auto; }
            .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 20px; }
            .header h1 { margin: 0; font-size: 24px; }
            .header p { margin: 5px 0; font-size: 12px; }
            .info { display: flex; justify-content: space-between; margin-bottom: 20px; }
            .info div { font-size: 14px; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
            th { background: #f5f5f5; }
            .totals { text-align: right; margin-top: 20px; }
            .totals p { margin: 5px 0; }
            .grand-total { font-weight: bold; font-size: 18px; color: #000; }
            .footer { text-align: center; margin-top: 40px; font-size: 12px; }
            @media print {
              body { padding: 10px; }
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
            <div>
              <p><strong>Receipt:</strong> ${completedSale.receipt_number}</p>
              <p><strong>Customer:</strong> ${completedSale.customer_name}</p>
            </div>
            <div style="text-align: right;">
              <p><strong>Date & Time:</strong></p>
              <p>${completedSale.sale_datetime}</p>
            </div>
          </div>
          
          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th style="text-align: center;">Qty</th>
                <th style="text-align: right;">Price</th>
                <th style="text-align: right;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${completedSale.items.map(item => `
                <tr>
                  <td>${item.display_name}</td>
                  <td style="text-align: center;">${item.quantity}</td>
                  <td style="text-align: right;">${completedSale.currency} ${item.unit_price.toFixed(2)}</td>
                  <td style="text-align: right;">${completedSale.currency} ${item.total.toFixed(2)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          
          <div class="totals">
            <p><strong>Subtotal:</strong> ${completedSale.currency} ${completedSale.subtotal.toFixed(2)}</p>
            ${completedSale.discount_amount > 0 ? `<p style="color: green;"><strong>Discount:</strong> -${completedSale.currency} ${completedSale.discount_amount.toFixed(2)}</p>` : ''}
            <p><strong>Tax:</strong> ${completedSale.currency} ${completedSale.tax.toFixed(2)}</p>
            <p class="grand-total">TOTAL: ${completedSale.currency} ${completedSale.total.toFixed(2)}</p>
          </div>
          
          ${completedSale.total_savings > 0 ? `
          <div style="background: #d1fae5; border: 2px solid #10b981; border-radius: 8px; padding: 15px; margin: 20px 0; text-align: center;">
            <p style="color: #065f46; font-weight: bold; font-size: 16px; margin: 0;">
              🎉 Congratulations! You Saved ${completedSale.currency} ${completedSale.total_savings.toFixed(2)} from MRP!
            </p>
          </div>
          ` : ''}
          
          <div class="footer">
            <p>Thank you for your purchase!</p>
            <p>Please retain this receipt for your records</p>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const handleEmailInvoice = () => {
    if (!completedSale?.customer_email) {
      toast.error('No email address available');
      return;
    }
    
    sendInvoiceMutation.mutate({
      method: 'email',
      recipient: completedSale.customer_email,
      sale_data: completedSale
    });
  };

  const handleSMSInvoice = () => {
    if (!completedSale?.customer_phone) {
      toast.error('No phone number available');
      return;
    }
    
    sendInvoiceMutation.mutate({
      method: 'sms',
      recipient: completedSale.customer_phone,
      sale_data: completedSale
    });
  };

  const handleCloseInvoiceDialog = () => {
    setShowInvoiceDialog(false);
    setCompletedSale(null);
    
    // Reset cart and selections
    setCart([]);
    setSelectedPatient(null);
    setSelectedWalkIn(null);
    setPatientSearch('');
    setPrescriptionFile(null);
    setPrescriptionUrl(null);
  };

  return (
    <div className="h-screen flex flex-col bg-slate-50">
      {/* Top Bar */}
      <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 text-white px-6 py-3 flex items-center justify-between">
        <h1 className="text-xl font-bold">Pharmacy Billing</h1>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            <Input
              type="date"
              value={sessionDate}
              onChange={(e) => setSessionDate(e.target.value)}
              className="bg-white/20 border-white/30 text-white"
            />
          </div>
          <Button variant="ghost" className="text-white hover:bg-white/20">
            <Download className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="bg-white border-b px-6 py-3">
        <div className="flex gap-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-yellow-100 flex items-center justify-center">
              <span className="text-sm font-bold text-yellow-700">{stats.loading}</span>
            </div>
            <span className="text-sm text-slate-600">Loading</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
              <span className="text-sm font-bold text-emerald-700">{stats.stored}</span>
            </div>
            <span className="text-sm text-slate-600">Stored</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
              <span className="text-sm font-bold text-blue-700">{stats.billing}</span>
            </div>
            <span className="text-sm text-slate-600">Billing</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
              <span className="text-sm font-bold text-purple-700">{stats.mine}</span>
            </div>
            <span className="text-sm text-slate-600">Mine</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-rose-100 flex items-center justify-center">
              <span className="text-sm font-bold text-rose-700">{stats.days}</span>
            </div>
            <span className="text-sm text-slate-600">Days</span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Categories & Frequently Used */}
        <div className="w-64 bg-white border-r overflow-y-auto">
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

        {/* Center - Products */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Search Bar */}
          <div className="p-4 bg-white border-b space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Invoice Number"
                  className="pl-10"
                />
              </div>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Search patient or walk-in customer"
                  value={patientSearch}
                  onChange={(e) => setPatientSearch(e.target.value)}
                  onFocus={() => setShowPatientDialog(true)}
                  className="pl-10"
                />
                {(selectedPatient || selectedWalkIn) && (
                  <Badge className="absolute right-2 top-1/2 -translate-y-1/2 bg-emerald-600">
                    {selectedWalkIn && selectedWalkIn.discount_percentage > 0 ? `${selectedWalkIn.discount_percentage}% OFF` : '✓'}
                  </Badge>
                )}
              </div>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList>
                <TabsTrigger value="name">Name</TabsTrigger>
                <TabsTrigger value="generics">Generics</TabsTrigger>
                <TabsTrigger value="substitutes">Substitutes</TabsTrigger>
                <TabsTrigger value="barcods">Barcods</TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="relative">
              <Barcode className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder={activeTab === 'barcods' ? 'Scan or type barcode' : 'Search by name'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                autoFocus={activeTab === 'barcods'}
              />
            </div>
          </div>

          {/* Products Grid */}
          <div className="flex-1 overflow-y-auto p-4">
            <div className="grid grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {filteredStock.map((item) => (
                <Card
                  key={item.id}
                  className="cursor-pointer hover:shadow-lg transition-all"
                  onClick={() => addToCart(item)}
                >
                  <CardContent className="p-4">
                    <div className="text-center">
                      <p className="font-semibold text-sm text-slate-900 mb-2 line-clamp-2">
                        {item.display_name}
                      </p>
                      <Badge variant="outline" className="text-xs mb-2">
                        {item.barcode}
                      </Badge>
                      <p className="text-lg font-bold text-emerald-600">
                        {currency} {(item.mrp || item.unit_price || 0).toFixed(2)}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        Stock: {item.quantity}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>

        {/* Right Sidebar - Cart */}
        <div className="w-96 bg-white border-l flex flex-col">
          <div className="p-4 border-b">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg">Cart</h3>
              <Badge className="bg-indigo-600">{cart.length} items</Badge>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {cart.length === 0 ? (
              <div className="text-center py-12">
                <ShoppingCart className="w-12 h-12 mx-auto text-slate-300 mb-4" />
                <p className="text-slate-500">Cart is empty</p>
              </div>
            ) : (
              cart.map((item) => (
                <Card key={item.stock_id} className="p-3">
                  <div className="space-y-2">
                    <div className="flex items-start justify-between">
                      <p className="font-medium text-sm flex-1">{item.display_name}</p>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => removeFromCart(item.stock_id)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                    
                    {/* Item Discount */}
                    <div className="flex items-center gap-2">
                      <Label className="text-xs text-slate-600">Discount %:</Label>
                      <Input
                        type="number"
                        value={item.discount_percent}
                        onChange={(e) => updateItemDiscount(item.stock_id, parseFloat(e.target.value) || 0)}
                        className="h-7 w-16 text-xs"
                        min="0"
                        max="15"
                        step="1"
                      />
                      <span className="text-xs text-slate-500">(max 15%)</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => updateQuantity(item.stock_id, -1)}
                        >
                          <Minus className="w-3 h-3" />
                        </Button>
                        <span className="font-medium w-8 text-center">{item.quantity}</span>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => updateQuantity(item.stock_id, 1)}
                        >
                          <Plus className="w-3 h-3" />
                        </Button>
                      </div>
                      <div className="text-right">
                        {item.discount_percent > 0 && (
                          <p className="text-xs text-slate-500 line-through">{currency} {(item.mrp * item.quantity).toFixed(2)}</p>
                        )}
                        <p className="font-bold text-emerald-600">{currency} {item.total.toFixed(2)}</p>
                      </div>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>

          <div className="border-t p-4 space-y-3">
            {/* Prescription Upload */}
            {cart.length > 0 && (
              <div className="pb-3 border-b">
                <Label className="text-xs text-slate-600 mb-2 block">Prescription (Optional)</Label>
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

            <div className="space-y-2">
              {/* Bill Discount */}
              {cart.length > 0 && !selectedWalkIn && (
                <div className="flex items-center gap-2 pb-2 border-b">
                  <Label className="text-xs text-slate-600">Bill Discount %:</Label>
                  <Input
                    type="number"
                    value={billDiscountPercent}
                    onChange={(e) => setBillDiscountPercent(Math.max(0, Math.min(15, parseFloat(e.target.value) || 0)))}
                    className="h-7 w-16 text-xs"
                    min="0"
                    max="15"
                    step="1"
                  />
                  <span className="text-xs text-slate-500">(max 15%)</span>
                </div>
              )}

              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Subtotal:</span>
                <span className="font-semibold">{currency} {subtotal.toFixed(2)}</span>
              </div>
              {finalDiscountAmount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-emerald-600">
                    Discount {walkInDiscountPercent > 0 ? `(${walkInDiscountPercent}%)` : `(${billDiscountPercent}% from profit)`}:
                  </span>
                  <span className="font-semibold text-emerald-600">- {currency} {finalDiscountAmount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Tax:</span>
                <span className="font-semibold">{currency} {tax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-lg pt-2 border-t">
                <span className="font-bold">Total:</span>
                <span className="font-bold text-indigo-600">{currency} {total.toFixed(2)}</span>
              </div>
              {totalSavings > 0 && (
                <div className="bg-emerald-50 border border-emerald-200 rounded p-2">
                  <p className="text-sm text-emerald-700 font-semibold text-center">
                    💰 You Save: {currency} {totalSavings.toFixed(2)} from MRP!
                  </p>
                </div>
              )}
            </div>
            <Button 
              className="w-full bg-indigo-600 hover:bg-indigo-700" 
              disabled={cart.length === 0}
              onClick={handleCompleteSale}
            >
              <Check className="w-5 h-5 mr-2" />
              Complete Sale
            </Button>
            {cart.length > 0 && !selectedPatient && !selectedWalkIn && (
              <p className="text-xs text-slate-500 text-center">
                No customer selected - will process as Cash Sale
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Patient Search Dialog */}
      <Dialog open={showPatientDialog} onOpenChange={setShowPatientDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Select Patient or Walk-In Customer</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Registered Patients */}
            {filteredPatients.length > 0 && (
              <div>
                <h3 className="font-semibold text-sm text-slate-700 mb-2">Registered Patients</h3>
                <div className="space-y-2">
                  {filteredPatients.map(patient => (
                    <Card
                      key={patient.id}
                      className="p-3 cursor-pointer hover:bg-slate-50 transition-colors"
                      onClick={() => handleSelectPatient(patient)}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium">{patient.first_name} {patient.last_name}</p>
                          <p className="text-sm text-slate-600">{patient.mobile}</p>
                          <Badge variant="outline" className="mt-1 text-xs">{patient.patient_id}</Badge>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Walk-In Patients */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-sm text-slate-700">Walk-In Customers</h3>
                <Button size="sm" variant="outline" onClick={() => setShowWalkInDialog(true)}>
                  <UserPlus className="w-4 h-4 mr-2" />
                  New Walk-In
                </Button>
              </div>
              <div className="space-y-2">
                {filteredWalkIns.length === 0 ? (
                  <p className="text-sm text-slate-500 text-center py-4">No walk-in customers found</p>
                ) : (
                  filteredWalkIns.map(walkIn => (
                    <Card
                      key={walkIn.id}
                      className="p-3 cursor-pointer hover:bg-slate-50 transition-colors"
                      onClick={() => handleSelectWalkIn(walkIn)}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium">{walkIn.name}</p>
                          <p className="text-sm text-slate-600">{walkIn.phone}</p>
                          <div className="flex gap-2 mt-1">
                            {walkIn.discount_percentage > 0 && (
                              <Badge className="bg-emerald-600 text-xs">{walkIn.discount_percentage}% Discount</Badge>
                            )}
                            <Badge variant="outline" className="text-xs">{walkIn.total_visits || 0} visits</Badge>
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Walk-In Dialog */}
      <Dialog open={showWalkInDialog} onOpenChange={setShowWalkInDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Walk-In Customer</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label>Name *</Label>
              <Input
                value={walkInForm.name}
                onChange={(e) => setWalkInForm({...walkInForm, name: e.target.value})}
                placeholder="Customer name"
              />
            </div>
            <div>
              <Label>Phone</Label>
              <Input
                value={walkInForm.phone}
                onChange={(e) => setWalkInForm({...walkInForm, phone: e.target.value})}
                placeholder="Phone number"
              />
            </div>
            <div>
              <Label>Special Discount (%)</Label>
              <Input
                type="number"
                value={walkInForm.discount_percentage}
                onChange={(e) => setWalkInForm({...walkInForm, discount_percentage: parseFloat(e.target.value) || 0})}
                placeholder="0"
                min="0"
                max="100"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowWalkInDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateWalkIn}>
                Create Customer
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

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
                
                {completedSale.customer_email && (
                  <Button 
                    className="w-full justify-start" 
                    variant="outline"
                    onClick={handleEmailInvoice}
                    disabled={sendInvoiceMutation.isPending}
                  >
                    <Mail className="w-4 h-4 mr-2" />
                    Email to {completedSale.customer_email}
                  </Button>
                )}
                
                {completedSale.customer_phone && (
                  <Button 
                    className="w-full justify-start" 
                    variant="outline"
                    onClick={handleSMSInvoice}
                    disabled={sendInvoiceMutation.isPending}
                  >
                    <MessageSquare className="w-4 h-4 mr-2" />
                    SMS to {completedSale.customer_phone}
                  </Button>
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