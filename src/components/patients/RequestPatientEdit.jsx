import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileEdit, Send } from 'lucide-react';
import toast from 'react-hot-toast';

export default function RequestPatientEdit({ open, onOpenChange, patient, user }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    first_name: patient?.first_name || '',
    last_name: patient?.last_name || '',
    date_of_birth: patient?.date_of_birth || '',
    gender: patient?.gender || '',
    email: patient?.email || '',
    phone: patient?.phone || '',
    mobile: patient?.mobile || '',
    address: patient?.address || '',
    nic: patient?.nic || '',
    blood_type: patient?.blood_type || '',
    allergies: patient?.allergies || '',
    chronic_conditions: patient?.chronic_conditions || '',
    emergency_contact_name: patient?.emergency_contact_name || '',
    emergency_contact_phone: patient?.emergency_contact_phone || ''
  });
  const [reason, setReason] = useState('');

  const requestEditMutation = useMutation({
    mutationFn: async (data) => {
      // Get changes (fields that are different from current patient data)
      const changes = {};
      Object.keys(formData).forEach(key => {
        if (formData[key] !== (patient?.[key] || '')) {
          changes[key] = formData[key];
        }
      });

      if (Object.keys(changes).length === 0) {
        throw new Error('No changes detected');
      }

      return base44.entities.PatientEditRequest.create({
        organization_id: patient.organization_id,
        patient_id: patient.id,
        requested_by: user.id,
        requested_by_name: user.full_name,
        requested_date: new Date().toISOString(),
        current_data: patient,
        requested_changes: changes,
        reason: data.reason,
        status: 'pending'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['patientEditRequests']);
      toast.success('Edit request submitted for approval');
      onOpenChange(false);
      setReason('');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to submit request');
    }
  });

  const handleSubmit = () => {
    if (!reason.trim()) {
      toast.error('Please provide a reason for the edit');
      return;
    }

    requestEditMutation.mutate({ reason });
  };

  React.useEffect(() => {
    if (patient) {
      setFormData({
        first_name: patient.first_name || '',
        last_name: patient.last_name || '',
        date_of_birth: patient.date_of_birth || '',
        gender: patient.gender || '',
        email: patient.email || '',
        phone: patient.phone || '',
        mobile: patient.mobile || '',
        address: patient.address || '',
        nic: patient.nic || '',
        blood_type: patient.blood_type || '',
        allergies: patient.allergies || '',
        chronic_conditions: patient.chronic_conditions || '',
        emergency_contact_name: patient.emergency_contact_name || '',
        emergency_contact_phone: patient.emergency_contact_phone || ''
      });
    }
  }, [patient, open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileEdit className="w-5 h-5" />
            Request Patient Edit
          </DialogTitle>
          <p className="text-sm text-slate-600 mt-2">
            Submit a request to edit patient information. This will be reviewed by a manager before being applied.
          </p>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Personal Information */}
          <div>
            <h3 className="font-semibold text-slate-900 mb-3">Personal Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>First Name</Label>
                <Input
                  value={formData.first_name}
                  onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                />
              </div>
              <div>
                <Label>Last Name</Label>
                <Input
                  value={formData.last_name}
                  onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                />
              </div>
              <div>
                <Label>Date of Birth</Label>
                <Input
                  type="date"
                  value={formData.date_of_birth}
                  onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                />
              </div>
              <div>
                <Label>Gender</Label>
                <Select value={formData.gender} onValueChange={(value) => setFormData({ ...formData, gender: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>NIC</Label>
                <Input
                  value={formData.nic}
                  onChange={(e) => setFormData({ ...formData, nic: e.target.value })}
                />
              </div>
              <div>
                <Label>Blood Type</Label>
                <Select value={formData.blood_type} onValueChange={(value) => setFormData({ ...formData, blood_type: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select blood type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="A+">A+</SelectItem>
                    <SelectItem value="A-">A-</SelectItem>
                    <SelectItem value="B+">B+</SelectItem>
                    <SelectItem value="B-">B-</SelectItem>
                    <SelectItem value="AB+">AB+</SelectItem>
                    <SelectItem value="AB-">AB-</SelectItem>
                    <SelectItem value="O+">O+</SelectItem>
                    <SelectItem value="O-">O-</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div>
            <h3 className="font-semibold text-slate-900 mb-3">Contact Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Email</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
              <div>
                <Label>Phone</Label>
                <Input
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
              <div>
                <Label>Mobile</Label>
                <Input
                  value={formData.mobile}
                  onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                />
              </div>
              <div className="col-span-2">
                <Label>Address</Label>
                <Textarea
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  rows={2}
                />
              </div>
            </div>
          </div>

          {/* Medical Information */}
          <div>
            <h3 className="font-semibold text-slate-900 mb-3">Medical Information</h3>
            <div className="space-y-4">
              <div>
                <Label>Allergies</Label>
                <Textarea
                  value={formData.allergies}
                  onChange={(e) => setFormData({ ...formData, allergies: e.target.value })}
                  rows={2}
                />
              </div>
              <div>
                <Label>Chronic Conditions</Label>
                <Textarea
                  value={formData.chronic_conditions}
                  onChange={(e) => setFormData({ ...formData, chronic_conditions: e.target.value })}
                  rows={2}
                />
              </div>
            </div>
          </div>

          {/* Emergency Contact */}
          <div>
            <h3 className="font-semibold text-slate-900 mb-3">Emergency Contact</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Contact Name</Label>
                <Input
                  value={formData.emergency_contact_name}
                  onChange={(e) => setFormData({ ...formData, emergency_contact_name: e.target.value })}
                />
              </div>
              <div>
                <Label>Contact Phone</Label>
                <Input
                  value={formData.emergency_contact_phone}
                  onChange={(e) => setFormData({ ...formData, emergency_contact_phone: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Reason */}
          <div className="border-t pt-4">
            <Label className="text-base font-semibold">Reason for Edit *</Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Explain why these changes are needed..."
              className="mt-2"
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-3 border-t pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={requestEditMutation.isPending || !reason.trim()}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              <Send className="w-4 h-4 mr-2" />
              Submit for Approval
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}