import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import toast from 'react-hot-toast';

const notificationTypes = [
  { key: 'task_assigned', label: 'New Task Assigned', description: 'When a task is assigned to you' },
  { key: 'appointment_upcoming', label: 'Upcoming Appointment', description: 'Reminders for upcoming appointments' },
  { key: 'appointment_missed', label: 'Missed Appointment', description: 'Alerts for missed appointments' },
  { key: 'patient_update', label: 'Patient Update', description: 'Important patient information changes' },
  { key: 'lab_result', label: 'Lab Result', description: 'New laboratory test results' },
  { key: 'prescription', label: 'Prescription', description: 'New prescriptions issued' },
  { key: 'critical_alert', label: 'Critical Alert', description: 'Critical system alerts' },
];

export default function NotificationPreferences() {
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: preferences, isLoading } = useQuery({
    queryKey: ['notificationPreferences', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const prefs = await base44.entities.UserNotificationPreference.filter({
        user_id: user.id,
      });
      return prefs[0] || null;
    },
    enabled: !!user?.id,
  });

  const [formData, setFormData] = useState(preferences || {});

  const mutation = useMutation({
    mutationFn: async (data) => {
      if (preferences?.id) {
        return base44.entities.UserNotificationPreference.update(preferences.id, data);
      } else {
        return base44.entities.UserNotificationPreference.create({
          ...data,
          user_id: user.id,
          user_email: user.email,
          organization_id: user.organization_id || '',
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notificationPreferences'] });
      toast.success('Preferences saved');
      setSaving(false);
    },
    onError: () => {
      toast.error('Failed to save preferences');
      setSaving(false);
    },
  });

  const handleToggle = (type, channel) => {
    const current = formData[type] || {};
    setFormData({
      ...formData,
      [type]: {
        ...current,
        [channel]: !current[channel],
      },
    });
  };

  const handleSave = async () => {
    setSaving(true);
    mutation.mutate(formData);
  };

  if (isLoading) {
    return <div className="text-center py-8">Loading preferences...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Notification Preferences</h2>
        <p className="text-slate-500 mt-1">Choose how and when you receive notifications</p>
      </div>

      {/* Notification Types */}
      <div className="space-y-4">
        {notificationTypes.map((notifType) => (
          <Card key={notifType.key} className="p-4">
            <div className="space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-medium text-slate-900">{notifType.label}</h3>
                  <p className="text-sm text-slate-500">{notifType.description}</p>
                </div>
              </div>

              <div className="flex gap-6 pl-0">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={formData[notifType.key]?.in_app !== false}
                    onCheckedChange={() => handleToggle(notifType.key, 'in_app')}
                  />
                  <Label className="text-sm cursor-pointer">In-app notification</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={formData[notifType.key]?.email !== false}
                    onCheckedChange={() => handleToggle(notifType.key, 'email')}
                  />
                  <Label className="text-sm cursor-pointer">Email notification</Label>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Quiet Hours */}
      <Card className="p-4">
        <h3 className="font-medium text-slate-900 mb-4">Quiet Hours</h3>
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Switch
              checked={formData.quiet_hours_enabled || false}
              onCheckedChange={(checked) =>
                setFormData({ ...formData, quiet_hours_enabled: checked })
              }
            />
            <Label className="text-sm cursor-pointer">Enable quiet hours</Label>
          </div>

          {formData.quiet_hours_enabled && (
            <div className="grid grid-cols-2 gap-4 pl-8">
              <div>
                <Label className="text-sm">Start time</Label>
                <Input
                  type="time"
                  value={formData.quiet_hours_start || '22:00'}
                  onChange={(e) =>
                    setFormData({ ...formData, quiet_hours_start: e.target.value })
                  }
                />
              </div>
              <div>
                <Label className="text-sm">End time</Label>
                <Input
                  type="time"
                  value={formData.quiet_hours_end || '08:00'}
                  onChange={(e) =>
                    setFormData({ ...formData, quiet_hours_end: e.target.value })
                  }
                />
              </div>
            </div>
          )}
        </div>
      </Card>

      <div className="flex justify-end gap-3">
        <Button variant="outline">Cancel</Button>
        <Button
          onClick={handleSave}
          disabled={saving}
          className="bg-teal-600 hover:bg-teal-700"
        >
          {saving ? 'Saving...' : 'Save Preferences'}
        </Button>
      </div>
    </div>
  );
}