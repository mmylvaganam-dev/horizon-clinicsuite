import React from 'react';
import { useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Shield, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AssignMyRoles() {
  const [result, setResult] = React.useState(null);

  const assignRolesMutation = useMutation({
    mutationFn: async () => {
      const response = await base44.functions.invoke('assignOwnerRoles', {});
      return response.data;
    },
    onSuccess: (data) => {
      setResult(data);
      toast.success('Roles assigned successfully!');
      // Reload page after 2 seconds to refresh permissions
      setTimeout(() => window.location.reload(), 2000);
    },
    onError: () => {
      toast.error('Failed to assign roles');
    }
  });

  return (
    <div className="flex items-center justify-center min-h-screen p-6">
      <Card className="max-w-2xl w-full">
        <CardHeader>
          <CardTitle className="text-2xl flex items-center gap-2">
            <Shield className="w-6 h-6 text-rose-500" />
            Assign PLATFORM_OWNER + PHYSICIAN Roles
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <p className="text-amber-900 font-semibold mb-2">This will assign you:</p>
            <ul className="list-disc list-inside text-amber-800 space-y-1">
              <li>PLATFORM_OWNER - Full platform access</li>
              <li>PHYSICIAN - Full clinical access including EMR, patients, orders</li>
            </ul>
          </div>

          {!result ? (
            <Button 
              onClick={() => assignRolesMutation.mutate()}
              disabled={assignRolesMutation.isPending}
              className="w-full bg-rose-600 hover:bg-rose-700"
              size="lg"
            >
              {assignRolesMutation.isPending ? 'Assigning Roles...' : 'Assign My Roles Now'}
            </Button>
          ) : (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-green-900 font-semibold mb-2">
                <CheckCircle className="w-5 h-5" />
                Success!
              </div>
              <p className="text-green-800 mb-2">Email: {result.user_email}</p>
              <p className="text-green-800 mb-2">Assigned: {result.assigned_roles.join(', ')}</p>
              <p className="text-green-800">All roles: {result.all_roles.join(', ')}</p>
              <p className="text-sm text-green-700 mt-3">Page will reload in 2 seconds...</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}