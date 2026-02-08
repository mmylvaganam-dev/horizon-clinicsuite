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
  CheckCircle2,
  Trash2,
  AlertTriangle
} from 'lucide-react';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';


export default function Settings() {
  const [saved, setSaved] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  
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

  const deleteAccountMutation = useMutation({
    mutationFn: async () => {
      // Log audit entry
      await base44.entities.AuditLog.create({
        action: 'delete_account_request',
        entity_name: 'User',
        entity_id: user.id,
        details: `User ${user.email} requested account deletion`,
        user_email: user.email
      });
      // Block the account instead of deleting (safer approach)
      await base44.entities.BlockedUser.create({
        email: user.email,
        reason: 'Self-requested account deletion',
        blocked_by: user.email,
        blocked_date: new Date().toISOString()
      });
    },
    onSuccess: () => {
      alert('Account deletion request logged. Your account has been blocked. Please contact support for final deletion.');
      base44.auth.logout();
    },
    onError: (error) => {
      alert('Failed to delete account: ' + error.message);
    }
  });

  const handleDeleteAccount = async () => {
    if (deleteConfirmText === 'DELETE') {
      deleteAccountMutation.mutate();
      setDeleteDialogOpen(false);
      setDeleteConfirmText('');
    }
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

      {/* Danger Zone */}
      <Card className="border-red-200 bg-red-50">
        <CardHeader>
          <CardTitle className="text-red-900 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            Danger Zone
          </CardTitle>
          <CardDescription className="text-red-700">
            Irreversible actions that affect your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="destructive" className="bg-red-600 hover:bg-red-700">
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Account
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Delete Account</DialogTitle>
                <DialogDescription>
                  This action cannot be undone. This will permanently delete your account and remove all associated data.
                </DialogDescription>
              </DialogHeader>
              <Alert className="bg-red-50 border-red-200">
                <AlertTriangle className="w-4 h-4 text-red-600" />
                <AlertDescription className="text-red-900">
                  <strong>Warning:</strong> All your data including patient records, appointments, and medical history will be permanently deleted.
                </AlertDescription>
              </Alert>
              <div className="space-y-2">
                <Label htmlFor="delete-confirm">Type DELETE to confirm</Label>
                <Input
                  id="delete-confirm"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder="DELETE"
                  className="font-mono"
                />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => {
                  setDeleteDialogOpen(false);
                  setDeleteConfirmText('');
                }}>
                  Cancel
                </Button>
                <Button 
                  variant="destructive" 
                  onClick={handleDeleteAccount}
                  disabled={deleteConfirmText !== 'DELETE'}
                  className="bg-red-600 hover:bg-red-700"
                >
                  Delete Account Permanently
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
    </div>
  );
}