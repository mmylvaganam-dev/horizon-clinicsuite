import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Building2, Plus, Edit } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import toast from 'react-hot-toast';

export default function FinanceCompanies() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState(null);
  const [formData, setFormData] = useState({
    company_legal_name: '',
    company_trade_name: '',
    country_code: '',
    incorporation_number: '',
    fiscal_year_end: '',
    base_currency: 'USD',
    status: 'active'
  });

  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: companies = [], isLoading } = useQuery({
    queryKey: ['companies'],
    queryFn: () => base44.entities.CompanyProfile.list('-created_date'),
  });

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      const company = editingCompany
        ? await base44.entities.CompanyProfile.update(editingCompany.id, data)
        : await base44.entities.CompanyProfile.create({
            ...data,
            organization_id: user?.organization_id || ''
          });

      await base44.entities.AuditLog.create({
        timestamp: new Date().toISOString(),
        user_id: user.id,
        user_email: user.email,
        organization_id: user?.organization_id || '',
        location_id: '',
        patient_id: '',
        module: 'FINANCE_CONTROL_TOWER',
        action: editingCompany ? 'update_company' : 'create_company',
        record_type: 'CompanyProfile',
        record_id: company.id,
        metadata: {}
      });

      return company;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      setDialogOpen(false);
      setEditingCompany(null);
      setFormData({
        company_legal_name: '',
        company_trade_name: '',
        country_code: '',
        incorporation_number: '',
        fiscal_year_end: '',
        base_currency: 'USD',
        status: 'active'
      });
      toast.success(editingCompany ? 'Company updated' : 'Company created');
    },
  });

  const handleEdit = (company) => {
    setEditingCompany(company);
    setFormData({
      company_legal_name: company.company_legal_name,
      company_trade_name: company.company_trade_name || '',
      country_code: company.country_code,
      incorporation_number: company.incorporation_number || '',
      fiscal_year_end: company.fiscal_year_end || '',
      base_currency: company.base_currency,
      status: company.status
    });
    setDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Company Profiles</h1>
          <p className="text-slate-500 mt-1">Manage company entities</p>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" />
          Add Company
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-24 rounded-xl" />
              ))}
            </div>
          ) : companies.length === 0 ? (
            <div className="text-center py-12">
              <Building2 className="w-12 h-12 mx-auto text-slate-300 mb-4" />
              <p className="text-slate-500">No companies yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {companies.map((company) => (
                <div key={company.id} className="flex items-start justify-between p-4 rounded-lg border bg-white hover:shadow-md transition-shadow">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                      <Building2 className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-slate-900">{company.company_legal_name}</h3>
                        <Badge className={company.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'}>
                          {company.status}
                        </Badge>
                      </div>
                      {company.company_trade_name && (
                        <p className="text-sm text-slate-600">DBA: {company.company_trade_name}</p>
                      )}
                      <p className="text-xs text-slate-500 mt-1">
                        {company.country_code} • {company.base_currency}
                        {company.incorporation_number && ` • Reg: ${company.incorporation_number}`}
                      </p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => handleEdit(company)}>
                    <Edit className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCompany ? 'Edit Company' : 'Add Company'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Legal Name *</Label>
              <Input
                value={formData.company_legal_name}
                onChange={(e) => setFormData({...formData, company_legal_name: e.target.value})}
                placeholder="Legal company name"
              />
            </div>

            <div>
              <Label>Trade Name (DBA)</Label>
              <Input
                value={formData.company_trade_name}
                onChange={(e) => setFormData({...formData, company_trade_name: e.target.value})}
                placeholder="Doing business as..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Country Code *</Label>
                <Select value={formData.country_code} onValueChange={(value) => setFormData({...formData, country_code: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="US">US</SelectItem>
                    <SelectItem value="CA">CA</SelectItem>
                    <SelectItem value="UK">UK</SelectItem>
                    <SelectItem value="AU">AU</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Base Currency *</Label>
                <Select value={formData.base_currency} onValueChange={(value) => setFormData({...formData, base_currency: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="CAD">CAD</SelectItem>
                    <SelectItem value="GBP">GBP</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Incorporation Number</Label>
              <Input
                value={formData.incorporation_number}
                onChange={(e) => setFormData({...formData, incorporation_number: e.target.value})}
                placeholder="Optional"
              />
            </div>

            <div>
              <Label>Fiscal Year End (MM-DD)</Label>
              <Input
                value={formData.fiscal_year_end}
                onChange={(e) => setFormData({...formData, fiscal_year_end: e.target.value})}
                placeholder="12-31"
              />
            </div>

            <div>
              <Label>Status</Label>
              <Select value={formData.status} onValueChange={(value) => setFormData({...formData, status: value})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => {
                setDialogOpen(false);
                setEditingCompany(null);
              }}>
                Cancel
              </Button>
              <Button
                onClick={() => saveMutation.mutate(formData)}
                disabled={!formData.company_legal_name || !formData.country_code || saveMutation.isPending}
              >
                {editingCompany ? 'Update' : 'Create'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}