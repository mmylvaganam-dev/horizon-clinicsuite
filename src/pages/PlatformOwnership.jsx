import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Crown, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import toast from 'react-hot-toast';

export default function PlatformOwnership() {
  const queryClient = useQueryClient();
  const [newOwnerEmail, setNewOwnerEmail] = useState('');
  const [confirmationText, setConfirmationText] = useState('');

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => {
      try {
        return await base44.auth.me();
      } catch (error) {
        console.error('❌ Auth failed in PlatformOwnership, using JWT fallback');
        const token = localStorage.getItem('base44_token') || sessionStorage.getItem('base44_token');
        if (token) {
          const payload = JSON.parse(atob(token.split('.')[1]));
          return { 
            email: payload.sub,
            is_platform_owner: payload.sub === 'mmylvaganam@premierhealthcanada.ca' || 
                               payload.sub === 'mylvaganam@premierhealthcanada.ca' ||
                               payload.sub === 'madhawaekanayake@gmail.com'
          };
        }
        return null;
      }
    },
  });

  // CRITICAL: Platform owner check based on email - ALWAYS true for these emails
  const isPlatformOwner = currentUser?.email === 'madhawaekanayake@gmail.com' || 
                         currentUser?.email === 'mmylvaganam@premierhealthcanada.ca' || 
                         currentUser?.email === 'mylvaganam@premierhealthcanada.ca' ||
                         currentUser?.is_platform_owner === true;
  
  console.log('🔴 PlatformOwnership - User email:', currentUser?.email, 'isPlatformOwner:', isPlatformOwner);

  const transferOwnershipMutation = useMutation({
    mutationFn: async (newEmail) => {
      // Update current owner
      await base44.entities.User.update(currentUser.id, {
        is_platform_owner: false
      });
      
      // Find and update new owner
      const allUsers = await base44.entities.User.list();
      const newOwner = allUsers.find(u => u.email === newEmail);
      if (!newOwner) {
        throw new Error('User not found');
      }
      
      await base44.entities.User.update(newOwner.id, {
        is_platform_owner: true
      });
      
      return newOwner;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
      toast.success('Platform ownership transferred successfully');
      setNewOwnerEmail('');
      setConfirmationText('');
      // Logout after transfer
      setTimeout(() => {
        base44.auth.logout();
      }, 2000);
    },
    onError: (error) => {
      toast.error('Transfer failed: ' + error.message);
    },
  });

  if (!isPlatformOwner) {
    return (
      <div className="space-y-8">
        <Alert className="bg-red-50 border-red-200">
          <AlertTriangle className="w-4 h-4 text-red-600" />
          <AlertDescription className="text-red-900">
            <strong>Access Denied:</strong> Only the platform owner can access this page.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Platform Ownership Transfer</h1>
        <p className="text-slate-600 mt-1">Transfer complete platform ownership to another user</p>
      </div>

      <Alert className="bg-purple-50 border-purple-200">
        <Crown className="w-4 h-4 text-purple-600" />
        <AlertDescription className="text-purple-900">
          <strong>Current Platform Owner:</strong> {currentUser?.email}
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Crown className="w-5 h-5 text-purple-600" />
            Transfer Platform Ownership
          </CardTitle>
          <CardDescription>
            This action will transfer all platform-level control to another user. You will lose platform owner privileges.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert className="mb-6 bg-red-50 border-red-200">
            <AlertTriangle className="w-4 h-4 text-red-600" />
            <AlertDescription className="text-red-900">
              <strong>Warning:</strong> This action is permanent and cannot be undone. The new owner will have complete control over:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>All organizations and their users</li>
                <li>User approval system</li>
                <li>Organization admin assignments</li>
                <li>Platform configuration and settings</li>
                <li>Ability to transfer ownership again</li>
              </ul>
              <p className="mt-2">You will be automatically logged out after the transfer.</p>
            </AlertDescription>
          </Alert>

          <Dialog>
            <DialogTrigger asChild>
              <Button className="bg-red-600 hover:bg-red-700">
                <Crown className="w-4 h-4 mr-2" />
                Transfer Ownership
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Confirm Ownership Transfer</DialogTitle>
                <DialogDescription>
                  This action is permanent and will log you out immediately after completion.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>New Platform Owner Email</Label>
                  <Input
                    type="email"
                    placeholder="Enter email address of new owner"
                    value={newOwnerEmail}
                    onChange={(e) => setNewOwnerEmail(e.target.value)}
                    className="mt-2"
                  />
                </div>
                
                <div>
                  <Label>Type "TRANSFER OWNERSHIP" to confirm</Label>
                  <Input
                    placeholder="Type exactly: TRANSFER OWNERSHIP"
                    value={confirmationText}
                    onChange={(e) => setConfirmationText(e.target.value)}
                    className="mt-2"
                  />
                </div>

                <Alert className="bg-amber-50 border-amber-200">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <AlertDescription className="text-amber-900 text-sm">
                    Make sure the new owner's email is correct. You will not be able to reverse this action.
                  </AlertDescription>
                </Alert>

                <div className="flex gap-3 justify-end pt-4">
                  <Button variant="outline" onClick={() => {
                    setNewOwnerEmail('');
                    setConfirmationText('');
                  }}>
                    Cancel
                  </Button>
                  <Button
                    className="bg-red-600 hover:bg-red-700"
                    onClick={() => transferOwnershipMutation.mutate(newOwnerEmail)}
                    disabled={
                      transferOwnershipMutation.isPending ||
                      !newOwnerEmail ||
                      confirmationText !== 'TRANSFER OWNERSHIP'
                    }
                  >
                    {transferOwnershipMutation.isPending ? 'Transferring...' : 'Confirm Transfer'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
    </div>
  );
}