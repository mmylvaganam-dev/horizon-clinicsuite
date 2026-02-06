import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertTriangle, Users } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

export default function UnassignedUsersSection({ unassignedUsers, organizations, companies, onAssign, isAssigning }) {
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [selectedOrgId, setSelectedOrgId] = useState(null);

  // Filter out platform owners from unassigned users (they don't need organization assignment)
  const filteredUnassignedUsers = unassignedUsers.filter(u => 
    !u.is_platform_owner && 
    u.email !== 'mmylvaganam@premierhealthcanada.ca' && 
    u.email !== 'mylvaganam@premierhealthcanada.ca'
  );

  if (filteredUnassignedUsers.length === 0) return null;

  const handleSelectUser = (userId, checked) => {
    if (checked) {
      setSelectedUsers([...selectedUsers, userId]);
    } else {
      setSelectedUsers(selectedUsers.filter(id => id !== userId));
    }
  };

  const handleBulkAssign = () => {
    if (!selectedOrgId || selectedUsers.length === 0) return;
    
    selectedUsers.forEach(userId => {
      onAssign({ userId, orgId: selectedOrgId });
    });
    
    setSelectedUsers([]);
    setSelectedOrgId(null);
  };

  const getOrgsByCompany = (companyId) => {
    return organizations.filter(org => org.company_id === companyId);
  };

  return (
    <Card className="border-red-200 bg-red-50 mb-8">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-red-900">
          <AlertTriangle className="w-5 h-5" />
          Unassigned Users
        </CardTitle>
        <CardDescription className="text-red-700">
          {filteredUnassignedUsers.length} user{filteredUnassignedUsers.length !== 1 ? 's' : ''} need to be assigned to an organization
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert className="bg-red-100 border-red-300">
          <AlertDescription className="text-red-900">
            Users must be assigned to an organization before they can be promoted to company admin.
          </AlertDescription>
        </Alert>

        <div className="space-y-2">
          {filteredUnassignedUsers.map(user => (
            <div key={user.id} className="flex items-center gap-3 p-3 bg-white rounded-lg border">
              <Checkbox
                checked={selectedUsers.includes(user.id)}
                onCheckedChange={(checked) => handleSelectUser(user.id, checked)}
              />
              <div className="flex-1">
                <p className="font-medium text-slate-900">{user.email}</p>
                {user.full_name && <p className="text-sm text-slate-500">{user.full_name}</p>}
              </div>
            </div>
          ))}
        </div>

        {selectedUsers.length > 0 && (
          <Dialog>
            <DialogTrigger asChild>
              <Button className="w-full bg-green-600 hover:bg-green-700">
                <Users className="w-4 h-4 mr-2" />
                Assign {selectedUsers.length} User{selectedUsers.length !== 1 ? 's' : ''} to Organization
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Assign Users to Organization</DialogTitle>
                <DialogDescription>
                  Select an organization for the {selectedUsers.length} selected user{selectedUsers.length !== 1 ? 's' : ''}
                </DialogDescription>
              </DialogHeader>
              {organizations.length === 0 ? (
                <Alert className="bg-red-50 border-red-300">
                  <AlertTriangle className="w-4 h-4 text-red-600" />
                  <AlertDescription className="text-red-900">
                    No organizations found. Create organizations first before assigning users.
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {companies.length > 0 ? (
                    companies.map(company => {
                      const companyOrgs = getOrgsByCompany(company.id);
                      if (companyOrgs.length === 0) return null;
                      return (
                        <div key={company.id} className="space-y-2 border rounded-lg p-4 bg-slate-50">
                          <p className="font-bold text-slate-900">{company.company_legal_name || company.name}</p>
                          <div className="space-y-1">
                            {companyOrgs.map(org => (
                              <Button
                                key={org.id}
                                variant={selectedOrgId === org.id ? 'default' : 'outline'}
                                className="w-full justify-start"
                                onClick={() => setSelectedOrgId(org.id)}
                              >
                                {org.name}
                              </Button>
                            ))}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    // Fallback: show all organizations if no companies
                    <div className="space-y-2">
                      {organizations.map(org => (
                        <Button
                          key={org.id}
                          variant={selectedOrgId === org.id ? 'default' : 'outline'}
                          className="w-full justify-start"
                          onClick={() => setSelectedOrgId(org.id)}
                        >
                          {org.name}
                        </Button>
                      ))}
                    </div>
                  )}
                </div>
              )}
              <div className="flex gap-3 justify-end pt-4">
                <Button variant="outline">Cancel</Button>
                <Button
                  className="bg-green-600 hover:bg-green-700"
                  onClick={handleBulkAssign}
                  disabled={!selectedOrgId || isAssigning}
                >
                  Confirm Assignment
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </CardContent>
    </Card>
  );
}