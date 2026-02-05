import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Shield, Ban, UserX, Trash2, Crown } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

export default function BlockedUsers() {
  const queryClient = useQueryClient();
  const [blockEmail, setBlockEmail] = useState('');
  const [blockReason, setBlockReason] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const isPlatformOwner = currentUser?.email === 'mmylvaganam@premierhealthcanada.ca' || 
                         currentUser?.email === 'mylvaganam@premierhealthcanada.ca' || 
                         currentUser?.is_platform_owner;

  const { data: blockedUsers = [] } = useQuery({
    queryKey: ['blockedUsers'],
    queryFn: () => base44.entities.BlockedUser.list(),
    enabled: isPlatformOwner,
  });

  const blockUserMutation = useMutation({
    mutationFn: async ({ email, reason }) => {
      return base44.entities.BlockedUser.create({
        email: email.toLowerCase().trim(),
        reason,
        blocked_by: currentUser.email,
        blocked_date: new Date().toISOString()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blockedUsers'] });
      setBlockEmail('');
      setBlockReason('');
      setDialogOpen(false);
    },
  });

  const unblockUserMutation = useMutation({
    mutationFn: async (blockedUserId) => {
      return base44.entities.BlockedUser.delete(blockedUserId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blockedUsers'] });
    },
  });

  if (!isPlatformOwner) {
    return (
      <div className="p-8">
        <Alert className="bg-red-50 border-red-200">
          <Shield className="w-4 h-4 text-red-600" />
          <AlertDescription className="text-red-900">
            Access denied. Only platform owners can manage blocked users.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Blocked Users</h1>
          <p className="text-slate-600 mt-1">
            Permanently block users from accessing the platform
          </p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-red-600 hover:bg-red-700">
              <Ban className="w-4 h-4 mr-2" />
              Block User
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Block User Permanently</DialogTitle>
              <DialogDescription>
                This will prevent the user from accessing the platform entirely
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">User Email</label>
                <Input
                  type="email"
                  placeholder="user@example.com"
                  value={blockEmail}
                  onChange={(e) => setBlockEmail(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Reason</label>
                <Textarea
                  placeholder="Reason for blocking this user"
                  value={blockReason}
                  onChange={(e) => setBlockReason(e.target.value)}
                  rows={3}
                />
              </div>
              <Alert className="bg-red-50 border-red-200">
                <Ban className="w-4 h-4 text-red-600" />
                <AlertDescription className="text-red-900">
                  <strong>Warning:</strong> This action will immediately block the user's access. They will see an "Access Denied" message on login.
                </AlertDescription>
              </Alert>
              <div className="flex gap-3 justify-end">
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button
                  className="bg-red-600 hover:bg-red-700"
                  onClick={() => blockUserMutation.mutate({ email: blockEmail, reason: blockReason })}
                  disabled={!blockEmail || blockUserMutation.isPending}
                >
                  Block User
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Alert className="bg-purple-50 border-purple-200">
        <Crown className="w-4 h-4 text-purple-600" />
        <AlertDescription className="text-purple-900">
          <strong>Platform Owner Control:</strong> You have full authority to block and unblock users across all organizations.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserX className="w-5 h-5 text-red-600" />
            Blocked Users ({blockedUsers.length})
          </CardTitle>
          <CardDescription>
            Users who are permanently denied access to the platform
          </CardDescription>
        </CardHeader>
        <CardContent>
          {blockedUsers.length === 0 ? (
            <p className="text-center text-slate-500 py-8">No blocked users</p>
          ) : (
            <div className="space-y-3">
              {blockedUsers.map((blocked) => (
                <div key={blocked.id} className="flex items-center justify-between p-4 border rounded-lg bg-red-50 border-red-200">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-slate-900">{blocked.email}</p>
                      <Badge className="bg-red-600 text-white">
                        <Ban className="w-3 h-3 mr-1" />
                        Blocked
                      </Badge>
                    </div>
                    {blocked.reason && (
                      <p className="text-sm text-slate-600 mt-1">
                        <strong>Reason:</strong> {blocked.reason}
                      </p>
                    )}
                    <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                      <span>Blocked by: {blocked.blocked_by}</span>
                      {blocked.blocked_date && (
                        <span>Date: {new Date(blocked.blocked_date).toLocaleDateString()}</span>
                      )}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => unblockUserMutation.mutate(blocked.id)}
                    disabled={unblockUserMutation.isPending}
                    className="text-green-600 hover:text-green-700"
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    Unblock
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}