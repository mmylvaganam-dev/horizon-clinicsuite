import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TestTube, Search, Plus, X, CheckSquare, Square } from 'lucide-react';
import toast from 'react-hot-toast';
import { useOrganization } from '@/components/OrganizationProvider';

// Standard GP lab checklist grouped by category
const GP_LAB_PANELS = [
  {
    group: 'Full Blood Count',
    tests: [
      'FBC (Full Blood Count)',
      'WBC Differential',
      'ESR (Erythrocyte Sedimentation Rate)',
      'CRP (C-Reactive Protein)',
    ],
  },
  {
    group: 'Metabolic / Biochemistry',
    tests: [
      'FBS (Fasting Blood Sugar)',
      'PPBS (Post-Prandial Blood Sugar)',
      'HbA1c',
      'Lipid Profile (Cholesterol, TG, HDL, LDL)',
      'Serum Creatinine',
      'eGFR',
      'BUN (Blood Urea Nitrogen)',
      'Serum Uric Acid',
      'LFT (Liver Function Tests)',
      'ALT / SGPT',
      'AST / SGOT',
      'ALP (Alkaline Phosphatase)',
      'Total Bilirubin',
      'Serum Electrolytes (Na, K, Cl)',
      'Serum Calcium',
      'Serum Phosphate',
      'Serum Albumin',
      'Total Protein',
    ],
  },
  {
    group: 'Thyroid',
    tests: [
      'TSH (Thyroid Stimulating Hormone)',
      'Free T3',
      'Free T4',
      'T3 / T4',
    ],
  },
  {
    group: 'Urinalysis',
    tests: [
      'Urine Full Report (UFR)',
      'Urine Culture & Sensitivity',
      'Urine Protein-Creatinine Ratio',
      '24hr Urine Protein',
    ],
  },
  {
    group: 'Iron Studies',
    tests: [
      'Serum Iron',
      'TIBC (Total Iron Binding Capacity)',
      'Ferritin',
      'Transferrin Saturation',
    ],
  },
  {
    group: 'Vitamins & Minerals',
    tests: [
      'Vitamin D (25-OH)',
      'Vitamin B12',
      'Folate',
      'Magnesium',
      'Zinc',
    ],
  },
  {
    group: 'Cardiac',
    tests: [
      'Troponin I / T',
      'CK-MB',
      'BNP / NT-proBNP',
      'Homocysteine',
      'hs-CRP',
    ],
  },
  {
    group: 'Coagulation',
    tests: [
      'PT / INR',
      'APTT',
      'Platelet Count',
    ],
  },
  {
    group: 'Serology / Immunology',
    tests: [
      'Dengue NS1 Antigen',
      'Dengue IgM / IgG',
      'Malaria ICT',
      'HIV Ag/Ab Combo',
      'HBsAg',
      'Anti-HCV',
      'VDRL / RPR (Syphilis)',
      'RA Factor',
      'ANA (Antinuclear Antibody)',
      'ASO Titre',
    ],
  },
  {
    group: 'Hormones',
    tests: [
      'Prolactin',
      'FSH',
      'LH',
      'Oestradiol (E2)',
      'Testosterone',
      'DHEA-S',
      'Cortisol (AM)',
      'Progesterone',
      'Beta-hCG (Pregnancy)',
      'PSA (Prostate Specific Antigen)',
      'CA-125',
      'CA 19-9',
      'CEA',
      'AFP (Alpha-fetoprotein)',
    ],
  },
  {
    group: 'Stool',
    tests: [
      'Stool Full Report',
      'Stool Culture & Sensitivity',
      'Stool Occult Blood',
      'H. pylori Stool Antigen',
    ],
  },
  {
    group: 'Microbiology',
    tests: [
      'Blood Culture & Sensitivity',
      'Throat Swab C&S',
      'Wound Swab C&S',
      'Sputum C&S',
    ],
  },
];

export default function LabOrderBuilder({ patientId, patient, onClose, onSaved }) {
  const queryClient = useQueryClient();
  const { selectedOrgId } = useOrganization();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTests, setSelectedTests] = useState([]);
  const [customTest, setCustomTest] = useState('');
  const [priority, setPriority] = useState('routine');
  const [clinicalNotes, setClinicalNotes] = useState('');

  const { data: user } = useQuery({ queryKey: ['currentUser'], queryFn: () => base44.auth.me() });

  const { data: catalog = [] } = useQuery({
    queryKey: ['labTestCatalog'],
    queryFn: () => base44.entities.LabTestCatalog.list(),
  });

  // All unique test names: GP panels + catalog
  const allTestNames = useMemo(() => {
    const set = new Set();
    GP_LAB_PANELS.forEach(g => g.tests.forEach(t => set.add(t)));
    catalog.forEach(c => { if (c.test_name) set.add(c.test_name); });
    return [...set];
  }, [catalog]);

  // Search results (only shown when searchTerm typed)
  const searchResults = useMemo(() => {
    if (!searchTerm.trim()) return [];
    const q = searchTerm.toLowerCase();
    return allTestNames.filter(t => t.toLowerCase().includes(q)).slice(0, 20);
  }, [searchTerm, allTestNames]);

  const toggleTest = (name) => {
    setSelectedTests(prev =>
      prev.includes(name) ? prev.filter(t => t !== name) : [...prev, name]
    );
  };

  const addCustomTest = () => {
    const t = customTest.trim();
    if (!t) return;
    if (!selectedTests.includes(t)) setSelectedTests(prev => [...prev, t]);
    setCustomTest('');
  };

  const removeTest = (name) => setSelectedTests(prev => prev.filter(t => t !== name));

  const toggleGroup = (group) => {
    const groupTests = group.tests;
    const allSelected = groupTests.every(t => selectedTests.includes(t));
    if (allSelected) {
      setSelectedTests(prev => prev.filter(t => !groupTests.includes(t)));
    } else {
      setSelectedTests(prev => [...new Set([...prev, ...groupTests])]);
    }
  };

  // Filtered panels based on search (for checklist view)
  const visiblePanels = useMemo(() => {
    if (!searchTerm.trim()) return GP_LAB_PANELS;
    const q = searchTerm.toLowerCase();
    return GP_LAB_PANELS.map(g => ({
      ...g,
      tests: g.tests.filter(t => t.toLowerCase().includes(q)),
    })).filter(g => g.tests.length > 0);
  }, [searchTerm]);

  const orderMutation = useMutation({
    mutationFn: async () => {
      if (selectedTests.length === 0) throw new Error('Select at least one test');
      const orderNumber = `LAB-${Date.now().toString().slice(-8)}`;
      const res = await base44.functions.invoke('createOrder', {
        orderData: {
          organization_id: selectedOrgId || '',
          patient_id: patientId,
          order_type: 'lab',
          order_number: orderNumber,
          test_name: selectedTests.join(', '),
          tests: selectedTests,
          priority,
          clinical_notes: clinicalNotes,
          status: 'Pending',
          order_date: new Date().toISOString(),
          ordered_by: user?.id || user?.email || '',
          ordered_by_email: user?.email || '',
        },
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['labOrders'] });
      toast.success(`Lab request created — ${selectedTests.length} test${selectedTests.length > 1 ? 's' : ''}`);
      onSaved?.();
      onClose();
    },
    onError: (err) => toast.error(err?.message || 'Failed to create lab request'),
  });

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TestTube className="w-5 h-5 text-teal-600" />
            Lab Request — {patient ? `${patient.first_name} ${patient.last_name}` : ''}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* Selected tests summary */}
          {selectedTests.length > 0 && (
            <div className="bg-teal-50 border border-teal-200 rounded-lg p-3">
              <p className="text-xs font-semibold text-teal-700 mb-2">Selected ({selectedTests.length})</p>
              <div className="flex flex-wrap gap-1.5">
                {selectedTests.map(t => (
                  <span key={t} className="inline-flex items-center gap-1 text-xs bg-white border border-teal-300 text-teal-800 rounded-full px-2 py-0.5">
                    {t}
                    <button onClick={() => removeTest(t)} className="hover:text-red-500">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Search any lab test by name..."
              className="pl-9"
            />
          </div>

          {/* GP Lab Checklist grouped */}
          <div className="space-y-3 max-h-64 overflow-y-auto pr-1 border border-slate-200 rounded-lg p-3 bg-slate-50">
            {visiblePanels.map(group => {
              const groupSelected = group.tests.filter(t => selectedTests.includes(t)).length;
              const allGroupSelected = groupSelected === group.tests.length;
              return (
                <div key={group.group}>
                  <button
                    type="button"
                    className="flex items-center gap-2 w-full text-left mb-1.5"
                    onClick={() => toggleGroup(group)}
                  >
                    {allGroupSelected
                      ? <CheckSquare className="w-4 h-4 text-teal-600 flex-shrink-0" />
                      : <Square className="w-4 h-4 text-slate-400 flex-shrink-0" />
                    }
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">{group.group}</span>
                    {groupSelected > 0 && (
                      <Badge className="ml-1 text-xs bg-teal-100 text-teal-700 border-teal-200">{groupSelected}/{group.tests.length}</Badge>
                    )}
                  </button>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 pl-6">
                    {group.tests.map(test => (
                      <button
                        key={test}
                        type="button"
                        className={`flex items-center gap-2 text-sm text-left py-0.5 rounded hover:text-teal-700 transition-colors ${selectedTests.includes(test) ? 'text-teal-700 font-medium' : 'text-slate-600'}`}
                        onClick={() => toggleTest(test)}
                      >
                        {selectedTests.includes(test)
                          ? <CheckSquare className="w-3.5 h-3.5 text-teal-600 flex-shrink-0" />
                          : <Square className="w-3.5 h-3.5 text-slate-300 flex-shrink-0" />
                        }
                        {test}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Add additional / custom test */}
          <div>
            <Label>Add Additional Test</Label>
            <div className="flex gap-2 mt-1">
              <Input
                value={customTest}
                onChange={e => setCustomTest(e.target.value)}
                placeholder="Type any test not in the list above..."
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustomTest(); } }}
              />
              <Button variant="outline" onClick={addCustomTest} disabled={!customTest.trim()}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Priority & notes */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Priority</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="routine">Routine</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                  <SelectItem value="stat">STAT</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Clinical Notes / Indication</Label>
              <Textarea
                value={clinicalNotes}
                onChange={e => setClinicalNotes(e.target.value)}
                placeholder="e.g., Screening for DM, monitoring INR..."
                rows={2}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-between items-center pt-2 border-t border-slate-100">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button
              className="bg-teal-600 hover:bg-teal-700"
              disabled={selectedTests.length === 0 || orderMutation.isPending}
              onClick={() => orderMutation.mutate()}
            >
              <TestTube className="w-4 h-4 mr-2" />
              Submit Lab Request ({selectedTests.length} test{selectedTests.length !== 1 ? 's' : ''})
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}