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
  User,
  Plus,
  Minus,
  X,
  Check,
  Stethoscope,
  Activity,
  Scan,
  Home,
  Package,
  TestTube,
  Heart
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function SalesWorkspace() {
  const queryClient = useQueryClient();
  const [cart, setCart] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [patientSearch, setPatientSearch] = useState('');
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [showPatientDialog, setShowPatientDialog] = useState(false);
  const [activeServiceTab, setActiveServiceTab] = useState('pharmacy');

  // Fetch all service data
  const { data: pharmacyStock = [] } = useQuery({
    queryKey: ['pharmacyStock'],
    queryFn: () => base44.entities.PharmacyStock.list('-created_date'),
  });

  const { data: gpProfiles = [] } = useQuery({
    queryKey: ['gpProfiles'],
    queryFn: () => base44.entities.GPProfile.filter({ status: 'active' }),
  });

  const { data: specialists = [] } = useQuery({
    queryKey: ['specialists'],
    queryFn: () => base44.entities.SpecialistProfile.filter({ status: 'active' }),
  });

  const { data: radiologyServices = [] } = useQuery({
    queryKey: ['radiologyServices'],
    queryFn: () => base44.entities.RadiologyService.filter({ status: 'active' }),
  });

  const { data: homeCareServices = [] } = useQuery({
    queryKey: ['homeCareServices'],
    queryFn: () => base44.entities.HomeCareServiceCatalog.filter({ status: 'active' }),
  });

  const { data: labTests = [] } = useQuery({
    queryKey: ['labTests'],
    queryFn: () => base44.entities.LabTestCatalog.filter({ is_active: true }),
  });

  const { data: healthPackages = [] } = useQuery({
    queryKey: ['healthPackages'],
    queryFn: () => base44.entities.HealthPackage.filter({ active: true }),
  });

  const { data: patients = [] } = useQuery({
    queryKey: ['patients'],
    queryFn: () => base44.entities.Patient.list(),
  });

  const { data: companies = [] } = useQuery({
    queryKey: ['companies'],
    queryFn: () => base44.entities.CompanyProfile.list(),
  });

  const currency = 'Rs';

  // Add item to cart
  const addToCart = (item, type) => {
    let cartItem;
    
    switch(type) {
      case 'pharmacy':
        cartItem = {
          id: `pharmacy-${item.id}`,
          type: 'pharmacy',
          name: item.display_name,
          price: item.mrp || item.unit_price || 0,
          quantity: 1,
          total: item.mrp || item.unit_price || 0
        };
        break;
      case 'gp':
        cartItem = {
          id: `gp-${item.id}`,
          type: 'gp',
          name: `GP - ${item.doctor_name}`,
          price: item.total_fee,
          doctor_fee: item.consultation_fee,
          hospital_fee: item.hospital_fee,
          quantity: 1,
          total: item.total_fee
        };
        break;
      case 'specialist':
        cartItem = {
          id: `specialist-${item.id}`,
          type: 'specialist',
          name: `${item.specialty} - ${item.specialist_name}`,
          price: item.total_fee,
          doctor_fee: item.consultation_fee,
          hospital_fee: item.hospital_fee,
          quantity: 1,
          total: item.total_fee
        };
        break;
      case 'radiology':
        cartItem = {
          id: `radiology-${item.id}`,
          type: 'radiology',
          name: item.service_name,
          price: item.price,
          quantity: 1,
          total: item.price
        };
        break;
      case 'homecare':
        const price = item.price_per_visit || item.price_per_hour || item.price_per_day || 0;
        cartItem = {
          id: `homecare-${item.id}`,
          type: 'homecare',
          name: item.service_name,
          price: price,
          quantity: 1,
          total: price
        };
        break;
      case 'lab':
        cartItem = {
          id: `lab-${item.id}`,
          type: 'lab',
          name: item.test_name,
          price: item.price || 0,
          quantity: 1,
          total: item.price || 0
        };
        break;
      case 'package':
        cartItem = {
          id: `package-${item.id}`,
          type: 'package',
          name: item.package_name,
          price: item.total_price,
          quantity: 1,
          total: item.total_price
        };
        break;
    }

    const existing = cart.find(c => c.id === cartItem.id);
    if (existing) {
      updateQuantity(cartItem.id, 1);
    } else {
      setCart([...cart, cartItem]);
    }
    toast.success(`Added ${cartItem.name}`);
  };

  const updateQuantity = (itemId, change) => {
    setCart(cart.map(item => {
      if (item.id === itemId) {
        const newQty = Math.max(1, item.quantity + change);
        return {...item, quantity: newQty, total: newQty * item.price};
      }
      return item;
    }));
  };

  const removeFromCart = (itemId) => {
    setCart(cart.filter(item => item.id !== itemId));
  };

  const subtotal = cart.reduce((sum, item) => sum + item.total, 0);
  const tax = 0;
  const total = subtotal + tax;

  // Filter services by search - category-aware filtering
  const filteredPharmacy = pharmacyStock.filter(item => 
    searchQuery === '' || 
    item.display_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.brand_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.generic_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredGPs = gpProfiles.filter(gp =>
    searchQuery === '' || 
    gp.doctor_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    gp.qualification?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    gp.specialization?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredSpecialists = specialists.filter(spec =>
    searchQuery === '' || 
    spec.specialist_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    spec.specialty?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    spec.qualification?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredRadiology = radiologyServices.filter(rad =>
    searchQuery === '' || 
    rad.service_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    rad.region?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    rad.service_type?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredHomeCare = homeCareServices.filter(hc =>
    searchQuery === '' || 
    hc.service_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    hc.service_type?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    hc.service_category?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredLabTests = labTests.filter(lab =>
    searchQuery === '' || 
    lab.test_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    lab.test_code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    lab.category?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    lab.specimen_type?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredPackages = healthPackages.filter(pkg =>
    searchQuery === '' || 
    pkg.package_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    pkg.package_code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    pkg.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Filter patients
  const filteredPatients = patients.filter(p => {
    const search = patientSearch.toLowerCase();
    return search === '' ||
      `${p.first_name} ${p.last_name}`.toLowerCase().includes(search) ||
      p.phone?.toLowerCase().includes(search) ||
      p.phn?.toLowerCase().includes(search);
  }).slice(0, 5);

  const handleSelectPatient = (patient) => {
    setSelectedPatient(patient);
    setPatientSearch(`${patient.first_name} ${patient.last_name}`);
    setShowPatientDialog(false);
  };

  const handleCompleteSale = () => {
    if (cart.length === 0) {
      toast.error('Cart is empty');
      return;
    }
    if (!selectedPatient) {
      toast.error('Please select a patient');
      return;
    }

    // Here you would create the sale record
    toast.success('Sale completed successfully!');
    
    // Reset
    setCart([]);
    setSelectedPatient(null);
    setPatientSearch('');
  };

  const getTypeIcon = (type) => {
    switch(type) {
      case 'pharmacy': return <Package className="w-4 h-4" />;
      case 'gp': return <Stethoscope className="w-4 h-4" />;
      case 'specialist': return <Activity className="w-4 h-4" />;
      case 'radiology': return <Scan className="w-4 h-4" />;
      case 'homecare': return <Home className="w-4 h-4" />;
      case 'lab': return <TestTube className="w-4 h-4" />;
      case 'package': return <Heart className="w-4 h-4" />;
      default: return null;
    }
  };

  const getTypeBadge = (type) => {
    const badges = {
      pharmacy: 'bg-blue-100 text-blue-800',
      gp: 'bg-green-100 text-green-800',
      specialist: 'bg-purple-100 text-purple-800',
      radiology: 'bg-orange-100 text-orange-800',
      homecare: 'bg-pink-100 text-pink-800',
      lab: 'bg-cyan-100 text-cyan-800',
      package: 'bg-rose-100 text-rose-800'
    };
    return badges[type] || 'bg-slate-100 text-slate-800';
  };

  return (
    <>
      <div className="h-screen flex flex-col lg:flex-row bg-slate-50">
      {/* Left - Services */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 text-white px-4 lg:px-6 py-4">
          <h1 className="text-xl lg:text-2xl font-bold">New Sale</h1>
          <p className="text-sm text-indigo-100">Products & Services</p>
        </div>

        {/* Search & Patient */}
        <div className="p-3 lg:p-4 bg-white border-b space-y-3">
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search and select patient"
              value={patientSearch}
              onChange={(e) => setPatientSearch(e.target.value)}
              onFocus={() => setShowPatientDialog(true)}
              className="pl-10"
            />
            {selectedPatient && (
              <Badge className="absolute right-2 top-1/2 -translate-y-1/2 bg-emerald-600">
                ✓ {selectedPatient.phn}
              </Badge>
            )}
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search services..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Service Category Buttons - Horizontal Scrollable */}
        <div className="bg-white border-b px-3 lg:px-4 py-3 overflow-x-auto">
          <div className="flex gap-2 min-w-max">
            <Button
              variant={activeServiceTab === 'pharmacy' ? 'default' : 'outline'}
              onClick={() => setActiveServiceTab('pharmacy')}
              className={activeServiceTab === 'pharmacy' ? 'bg-blue-600 hover:bg-blue-700' : 'hover:bg-blue-50'}
            >
              <Package className="w-4 h-4 mr-2" />
              Pharmacy
            </Button>
            <Button
              variant={activeServiceTab === 'gp' ? 'default' : 'outline'}
              onClick={() => setActiveServiceTab('gp')}
              className={activeServiceTab === 'gp' ? 'bg-green-600 hover:bg-green-700' : 'hover:bg-green-50'}
            >
              <Stethoscope className="w-4 h-4 mr-2" />
              GP Service
            </Button>
            <Button
              variant={activeServiceTab === 'specialist' ? 'default' : 'outline'}
              onClick={() => setActiveServiceTab('specialist')}
              className={activeServiceTab === 'specialist' ? 'bg-purple-600 hover:bg-purple-700' : 'hover:bg-purple-50'}
            >
              <Activity className="w-4 h-4 mr-2" />
              Specialist
            </Button>
            <Button
              variant={activeServiceTab === 'radiology' ? 'default' : 'outline'}
              onClick={() => setActiveServiceTab('radiology')}
              className={activeServiceTab === 'radiology' ? 'bg-orange-600 hover:bg-orange-700' : 'hover:bg-orange-50'}
            >
              <Scan className="w-4 h-4 mr-2" />
              Radiology
            </Button>
            <Button
              variant={activeServiceTab === 'homecare' ? 'default' : 'outline'}
              onClick={() => setActiveServiceTab('homecare')}
              className={activeServiceTab === 'homecare' ? 'bg-pink-600 hover:bg-pink-700' : 'hover:bg-pink-50'}
            >
              <Home className="w-4 h-4 mr-2" />
              Home Care
            </Button>
            <Button
              variant={activeServiceTab === 'lab' ? 'default' : 'outline'}
              onClick={() => setActiveServiceTab('lab')}
              className={activeServiceTab === 'lab' ? 'bg-cyan-600 hover:bg-cyan-700' : 'hover:bg-cyan-50'}
            >
              <TestTube className="w-4 h-4 mr-2" />
              Lab Tests
            </Button>
            <Button
              variant={activeServiceTab === 'package' ? 'default' : 'outline'}
              onClick={() => setActiveServiceTab('package')}
              className={activeServiceTab === 'package' ? 'bg-rose-600 hover:bg-rose-700' : 'hover:bg-rose-50'}
            >
              <Heart className="w-4 h-4 mr-2" />
              Packages
            </Button>
          </div>
        </div>

        {/* Products/Services List */}
        <div className="flex-1 overflow-y-auto p-3 lg:p-4">
          {activeServiceTab === 'pharmacy' && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {filteredPharmacy.map((item) => (
                <Card key={item.id} className="cursor-pointer hover:shadow-lg hover:border-blue-400 transition-all" onClick={() => addToCart(item, 'pharmacy')}>
                  <CardContent className="p-3 lg:p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Package className="w-4 h-4 text-blue-600" />
                      <Badge className="bg-blue-100 text-blue-800 text-xs">Pharmacy</Badge>
                    </div>
                    <p className="font-semibold text-sm mb-2 line-clamp-2">{item.display_name}</p>
                    <p className="text-lg font-bold text-emerald-600">{currency} {(item.mrp || item.unit_price || 0).toFixed(2)}</p>
                    <p className="text-xs text-slate-500">Stock: {item.quantity}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {activeServiceTab === 'gp' && (
            filteredGPs.length === 0 && searchQuery !== '' ? (
              <div className="text-center py-12">
                <p className="text-slate-500">No GP profiles found matching "{searchQuery}"</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredGPs.map((gp) => (
                  <Card key={gp.id} className="cursor-pointer hover:shadow-lg hover:border-green-400 transition-all" onClick={() => addToCart(gp, 'gp')}>
                    <CardContent className="p-3 lg:p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Stethoscope className="w-4 h-4 text-green-600" />
                        <Badge className="bg-green-100 text-green-800 text-xs">GP</Badge>
                      </div>
                      <p className="font-semibold mb-2">{gp.doctor_name}</p>
                      <p className="text-xs text-slate-600 mb-3">{gp.qualification}</p>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-slate-600">Doctor Fee:</span>
                          <span className="font-medium">{currency} {gp.consultation_fee}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-600">Hospital Fee:</span>
                          <span className="font-medium">{currency} {gp.hospital_fee}</span>
                        </div>
                        <div className="flex justify-between pt-2 border-t">
                          <span className="font-semibold">Total:</span>
                          <span className="font-bold text-emerald-600">{currency} {gp.total_fee}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )
          )}

          {activeServiceTab === 'specialist' && (
            filteredSpecialists.length === 0 && searchQuery !== '' ? (
              <div className="text-center py-12">
                <p className="text-slate-500">No specialists found matching "{searchQuery}"</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredSpecialists.map((spec) => (
                  <Card key={spec.id} className="cursor-pointer hover:shadow-lg hover:border-purple-400 transition-all" onClick={() => addToCart(spec, 'specialist')}>
                    <CardContent className="p-3 lg:p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Activity className="w-4 h-4 text-purple-600" />
                        <Badge className="bg-purple-100 text-purple-800 text-xs">Specialist</Badge>
                      </div>
                      <Badge className="mb-2">{spec.specialty}</Badge>
                      <p className="font-semibold mb-2">{spec.specialist_name}</p>
                      <p className="text-xs text-slate-600 mb-3">{spec.qualification}</p>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-slate-600">Doctor Fee:</span>
                          <span className="font-medium">{currency} {spec.consultation_fee}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-600">Hospital Fee:</span>
                          <span className="font-medium">{currency} {spec.hospital_fee}</span>
                        </div>
                        <div className="flex justify-between pt-2 border-t">
                          <span className="font-semibold">Total:</span>
                          <span className="font-bold text-emerald-600">{currency} {spec.total_fee}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )
          )}

          {activeServiceTab === 'radiology' && (
            filteredRadiology.length === 0 && searchQuery !== '' ? (
              <div className="text-center py-12">
                <p className="text-slate-500">No radiology services found matching "{searchQuery}"</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredRadiology.map((rad) => (
                  <Card key={rad.id} className="cursor-pointer hover:shadow-lg hover:border-orange-400 transition-all" onClick={() => addToCart(rad, 'radiology')}>
                    <CardContent className="p-3 lg:p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Scan className="w-4 h-4 text-orange-600" />
                        <Badge className="bg-orange-100 text-orange-800 text-xs">Radiology</Badge>
                      </div>
                      <Badge className="mb-2">{rad.service_type}</Badge>
                      <p className="font-semibold mb-1">{rad.service_name}</p>
                      <p className="text-xs text-slate-600 mb-3">{rad.region}</p>
                      <p className="text-lg font-bold text-emerald-600">{currency} {rad.price}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )
          )}

          {activeServiceTab === 'homecare' && (
            filteredHomeCare.length === 0 && searchQuery !== '' ? (
              <div className="text-center py-12">
                <p className="text-slate-500">No home care services found matching "{searchQuery}"</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredHomeCare.map((hc) => (
                  <Card key={hc.id} className="cursor-pointer hover:shadow-lg hover:border-pink-400 transition-all" onClick={() => addToCart(hc, 'homecare')}>
                    <CardContent className="p-3 lg:p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Home className="w-4 h-4 text-pink-600" />
                        <Badge className="bg-pink-100 text-pink-800 text-xs">Home Care</Badge>
                      </div>
                      <Badge className="mb-2">{hc.service_category}</Badge>
                      <p className="font-semibold mb-2">{hc.service_name}</p>
                      <p className="text-xs text-slate-600 mb-3 line-clamp-2">{hc.description}</p>
                      <p className="text-lg font-bold text-emerald-600">
                        {currency} {hc.price_per_visit || hc.price_per_hour || hc.price_per_day || 0}
                      </p>
                      <p className="text-xs text-slate-500">{hc.duration_type}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )
          )}

          {activeServiceTab === 'lab' && (
            filteredLabTests.length === 0 && searchQuery !== '' ? (
              <div className="text-center py-12">
                <p className="text-slate-500">No lab tests found matching "{searchQuery}"</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredLabTests.map((lab) => (
                  <Card key={lab.id} className="cursor-pointer hover:shadow-lg hover:border-cyan-400 transition-all" onClick={() => addToCart(lab, 'lab')}>
                    <CardContent className="p-3 lg:p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <TestTube className="w-4 h-4 text-cyan-600" />
                        <Badge className="bg-cyan-100 text-cyan-800 text-xs">Lab Test</Badge>
                      </div>
                      <Badge className="mb-2">{lab.category}</Badge>
                      <p className="font-semibold mb-1">{lab.test_name}</p>
                      <p className="text-xs text-slate-600 mb-2">Code: {lab.test_code}</p>
                      <p className="text-xs text-slate-500 mb-3">{lab.specimen_type}</p>
                      <p className="text-lg font-bold text-emerald-600">{currency} {lab.price || 0}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )
          )}

          {activeServiceTab === 'package' && (
            filteredPackages.length === 0 && searchQuery !== '' ? (
              <div className="text-center py-12">
                <p className="text-slate-500">No health packages found matching "{searchQuery}"</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                {filteredPackages.map((pkg) => (
                  <Card key={pkg.id} className="cursor-pointer hover:shadow-lg transition-all border-2 border-rose-200 hover:border-rose-400" onClick={() => addToCart(pkg, 'package')}>
                    <CardContent className="p-3 lg:p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Heart className="w-4 h-4 text-rose-600" />
                        <Badge className="bg-rose-100 text-rose-800 text-xs">Package</Badge>
                      </div>
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-bold text-lg">{pkg.package_name}</p>
                          <p className="text-xs text-slate-500">Code: {pkg.package_code}</p>
                        </div>
                        <p className="text-2xl font-bold text-emerald-600">{currency} {pkg.total_price}</p>
                      </div>
                      {pkg.description && (
                        <p className="text-sm text-slate-600 mb-2">{pkg.description}</p>
                      )}
                      {pkg.items_json && pkg.items_json.length > 0 && (
                        <div className="mt-3 pt-3 border-t">
                          <p className="text-xs font-semibold text-slate-700 mb-1">Includes:</p>
                          <div className="space-y-0.5">
                            {pkg.items_json.slice(0, 5).map((item, idx) => (
                              <p key={idx} className="text-xs text-slate-600">• {item.test_name}</p>
                            ))}
                            {pkg.items_json.length > 5 && (
                              <p className="text-xs text-slate-500">+ {pkg.items_json.length - 5} more tests</p>
                            )}
                          </div>
                        </div>
                      )}
                      {pkg.notes && (
                        <p className="text-xs text-amber-600 mt-2">Note: {pkg.notes}</p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )
          )}
        </div>
      </div>

      {/* Right - Cart */}
      <div className="w-full lg:w-96 bg-white border-t lg:border-t-0 lg:border-l flex flex-col max-h-[50vh] lg:max-h-none">
        <div className="p-3 lg:p-4 border-b">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-lg">Cart</h3>
            <Badge className="bg-indigo-600">{cart.length} items</Badge>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3 lg:p-4 space-y-3">
            {cart.length === 0 ? (
              <div className="text-center py-12">
                <ShoppingCart className="w-12 h-12 mx-auto text-slate-300 mb-4" />
                <p className="text-slate-500">Cart is empty</p>
              </div>
            ) : (
              cart.map((item) => (
                <Card key={item.id} className="p-3">
                  <div className="space-y-2">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge className={getTypeBadge(item.type)}>
                            {item.type}
                          </Badge>
                        </div>
                        <p className="font-medium text-sm">{item.name}</p>
                        {item.doctor_fee && (
                          <div className="text-xs text-slate-600 mt-1">
                            <div>Dr: {currency} {item.doctor_fee}</div>
                            <div>Hospital: {currency} {item.hospital_fee}</div>
                          </div>
                        )}
                      </div>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeFromCart(item.id)}>
                        <X className="w-4 h-4" />
                      </Button>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => updateQuantity(item.id, -1)}>
                          <Minus className="w-3 h-3" />
                        </Button>
                        <span className="font-medium w-8 text-center">{item.quantity}</span>
                        <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => updateQuantity(item.id, 1)}>
                          <Plus className="w-3 h-3" />
                        </Button>
                      </div>
                      <p className="font-bold text-emerald-600">{currency} {item.total.toFixed(2)}</p>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>

          <div className="border-t p-3 lg:p-4 space-y-3">
            <div className="space-y-2">
              {(() => {
                const doctorFees = cart.filter(item => item.doctor_fee).reduce((sum, item) => sum + (item.doctor_fee * item.quantity), 0);
                const hospitalFees = cart.filter(item => item.hospital_fee).reduce((sum, item) => sum + (item.hospital_fee * item.quantity), 0);
                const otherItems = cart.filter(item => !item.doctor_fee).reduce((sum, item) => sum + item.total, 0);
                
                return (
                  <>
                    {doctorFees > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-600">Doctor Fees:</span>
                        <span className="font-semibold">{currency} {doctorFees.toFixed(2)}</span>
                      </div>
                    )}
                    {hospitalFees > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-600">Hospital Fees:</span>
                        <span className="font-semibold">{currency} {hospitalFees.toFixed(2)}</span>
                      </div>
                    )}
                    {otherItems > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-600">Other Services:</span>
                        <span className="font-semibold">{currency} {otherItems.toFixed(2)}</span>
                      </div>
                    )}
                  </>
                );
              })()}
              <div className="flex justify-between text-sm pt-2 border-t">
                <span className="text-slate-600">Subtotal:</span>
                <span className="font-semibold">{currency} {subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Tax:</span>
                <span className="font-semibold">{currency} {tax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-lg pt-2 border-t">
                <span className="font-bold">Total:</span>
                <span className="font-bold text-indigo-600">{currency} {total.toFixed(2)}</span>
              </div>
            </div>
            <Button 
              className="w-full bg-indigo-600 hover:bg-indigo-700" 
              disabled={cart.length === 0 || !selectedPatient}
              onClick={handleCompleteSale}
            >
              <Check className="w-5 h-5 mr-2" />
              Complete Sale
            </Button>
            {!selectedPatient && (
              <p className="text-xs text-red-500 text-center">Please select a patient</p>
            )}
          </div>
        </div>
      </div>

      {/* Patient Search Dialog */}
      <Dialog open={showPatientDialog} onOpenChange={setShowPatientDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Select Patient</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-2">
            {filteredPatients.length === 0 ? (
              <p className="text-center py-8 text-slate-500">No patients found</p>
            ) : (
              filteredPatients.map(patient => (
                <Card
                  key={patient.id}
                  className="p-3 cursor-pointer hover:bg-slate-50 transition-colors"
                  onClick={() => handleSelectPatient(patient)}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium">{patient.first_name} {patient.last_name}</p>
                      <p className="text-sm text-slate-600">{patient.phone}</p>
                      <Badge variant="outline" className="mt-1 text-xs">{patient.phn}</Badge>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}