import React, { useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Clock, LogOut, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function AccessPending() {
  const [user, setUser] = React.useState(null);

  useEffect(() => {
    const getUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
      } catch (error) {
        console.error('Error fetching user:', error);
      }
    };
    getUser();
  }, []);

  const handleLogout = () => {
    base44.auth.logout();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-lg p-8 text-center space-y-6">
          <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mx-auto">
            <Clock className="w-6 h-6 text-amber-600" />
          </div>

          <div>
            <h1 className="text-2xl font-bold text-slate-900 mb-2">Access Pending</h1>
            <p className="text-slate-600">
              Your account is awaiting administrator approval.
            </p>
          </div>

          {user && (
            <div className="bg-slate-50 rounded-lg p-4 text-left space-y-2">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm text-slate-700">
                    <span className="font-semibold">Email:</span> {user.email}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Please contact your organization administrator to approve your access.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="pt-4">
            <Button
              onClick={handleLogout}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}