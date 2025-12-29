import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  User, 
  Building2, 
  Bell, 
  Shield,
  Save,
  Loader2,
  CheckCircle2
} from 'lucide-react';
import { toast } from '@/components/ui/toast';

export default function Settings() {
  const [saved, setSaved] = useState(false);
  
  const { data: user, isLoading } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const [profile, setProfile] = useState({
    full_name: '',
    clinic_name: '',
    clinic_address: '',
    clinic_phone: '',
    specialty: '',
  });

  const [notifications, setNotifications] = useState({
    email_appointments: true,
    email_reminders: true,
    email_updates: false,
  });

  useEffect(() => {
    if (user) {
      setProfile({
        full_name: user.full_name || '',
        clinic_name: user.clinic_name || '',
        clinic_address: user.clinic_address || '',
        clinic_phone: user.clinic_phone || '',
        specialty: user.specialty || '',
      });
      if (user.notifications) {
        setNotifications(user.notifications);
      }
    }
  }, [user]);

  const updateMutation = useMutation({
    mutationFn: (data) => base44.auth.updateMe(data),
    onSuccess: () => {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    },
  });

  const handleSaveProfile = () => {
    updateMutation.mutate(profile);
  };

  const handleSaveNotifications = () => {
    updateMutation.mutate({ notifications });
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Settings</h1>
        <p className="text-slate-500 mt-1">Manage your account and preferences</p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList>
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <User className="w-4 h-4" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="clinic" className="flex items-center gap-2">
            <Building2 className="w-4 h-4" />
            Clinic
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="w-4 h-4" />
            Notifications
          </TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile">
          <Card className="bg-white border-0 shadow-sm">
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>Update your personal details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  value={user?.email || ''}
                  disabled
                  className="bg-slate-50"
                />
                <p className="text-xs text-slate-500">Email cannot be changed</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="full_name">Full Name</Label>
                <Input
                  id="full_name"
                  value={profile.full_name}
                  onChange={(e) => setProfile(prev => ({ ...prev, full_name: e.target.value }))}
                  placeholder="Dr. John Doe"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="specialty">Specialty</Label>
                <Input
                  id="specialty"
                  value={profile.specialty}
                  onChange={(e) => setProfile(prev => ({ ...prev, specialty: e.target.value }))}
                  placeholder="General Practice, Cardiology, etc."
                />
              </div>

              <div className="flex justify-end pt-4">
                <Button 
                  onClick={handleSaveProfile}
                  disabled={updateMutation.isPending}
                  className="bg-teal-600 hover:bg-teal-700"
                >
                  {updateMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : saved ? (
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  {saved ? 'Saved!' : 'Save Changes'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Clinic Tab */}
        <TabsContent value="clinic">
          <Card className="bg-white border-0 shadow-sm">
            <CardHeader>
              <CardTitle>Clinic Information</CardTitle>
              <CardDescription>Update your clinic details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="clinic_name">Clinic Name</Label>
                <Input
                  id="clinic_name"
                  value={profile.clinic_name}
                  onChange={(e) => setProfile(prev => ({ ...prev, clinic_name: e.target.value }))}
                  placeholder="Horizon Medical Center"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="clinic_phone">Phone Number</Label>
                <Input
                  id="clinic_phone"
                  value={profile.clinic_phone}
                  onChange={(e) => setProfile(prev => ({ ...prev, clinic_phone: e.target.value }))}
                  placeholder="+1 (555) 123-4567"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="clinic_address">Address</Label>
                <Textarea
                  id="clinic_address"
                  value={profile.clinic_address}
                  onChange={(e) => setProfile(prev => ({ ...prev, clinic_address: e.target.value }))}
                  placeholder="123 Medical Drive, Suite 100, City, State 12345"
                  rows={3}
                />
              </div>

              <div className="flex justify-end pt-4">
                <Button 
                  onClick={handleSaveProfile}
                  disabled={updateMutation.isPending}
                  className="bg-teal-600 hover:bg-teal-700"
                >
                  {updateMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : saved ? (
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  {saved ? 'Saved!' : 'Save Changes'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications">
          <Card className="bg-white border-0 shadow-sm">
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>Choose what notifications you receive</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Appointment Notifications</p>
                  <p className="text-sm text-slate-500">Get notified about new and updated appointments</p>
                </div>
                <Switch
                  checked={notifications.email_appointments}
                  onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, email_appointments: checked }))}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Appointment Reminders</p>
                  <p className="text-sm text-slate-500">Receive reminders before scheduled appointments</p>
                </div>
                <Switch
                  checked={notifications.email_reminders}
                  onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, email_reminders: checked }))}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Product Updates</p>
                  <p className="text-sm text-slate-500">Hear about new features and improvements</p>
                </div>
                <Switch
                  checked={notifications.email_updates}
                  onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, email_updates: checked }))}
                />
              </div>

              <div className="flex justify-end pt-4">
                <Button 
                  onClick={handleSaveNotifications}
                  disabled={updateMutation.isPending}
                  className="bg-teal-600 hover:bg-teal-700"
                >
                  {updateMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : saved ? (
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  {saved ? 'Saved!' : 'Save Preferences'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}