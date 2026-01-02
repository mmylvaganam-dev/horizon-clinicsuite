import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Building2, 
  Users, 
  ChevronRight,
  ChevronDown,
  MapPin,
  Shield,
  ArrowLeft
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';

export default function CompanyHierarchy() {
  const [expandedCompanies, setExpandedCompanies] = useState({});
  const [expandedOrganizations, setExpandedOrganizations] = useState({});

  const { data: companies = [] } = useQuery({
    queryKey: ['companies'],
    queryFn: () => base44.entities.CompanyProfile.list(),
  });

  const { data: organizations = [] } = useQuery({
    queryKey: ['organizations'],
    queryFn: () => base44.entities.Organization.list(),
  });

  const { data: locations = [] } = useQuery({
    queryKey: ['locations'],
    queryFn: () => base44.entities.Location.list(),
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
  });

  const { data: userRoles = [] } = useQuery({
    queryKey: ['userRoles'],
    queryFn: () => base44.entities.UserRole.list(),
  });

  const { data: roles = [] } = useQuery({
    queryKey: ['roles'],
    queryFn: () => base44.entities.Role.list(),
  });

  const toggleCompany = (companyId) => {
    setExpandedCompanies(prev => ({
      ...prev,
      [companyId]: !prev[companyId]
    }));
  };

  const toggleOrganization = (orgId) => {
    setExpandedOrganizations(prev => ({
      ...prev,
      [orgId]: !prev[orgId]
    }));
  };

  const getOrganizationsForCompany = (companyId) => {
    return organizations.filter(org => org.company_id === companyId);
  };

  const getLocationsForOrganization = (orgId) => {
    return locations.filter(loc => loc.organization_id === orgId);
  };

  const getUsersForOrganization = (orgId) => {
    const orgUserRoles = userRoles.filter(ur => ur.organization_id === orgId);
    const userIds = [...new Set(orgUserRoles.map(ur => ur.user_id))];
    return users.filter(u => userIds.includes(u.id));
  };

  const getUserRoleNames = (userId, orgId) => {
    const userOrgRoles = userRoles.filter(ur => 
      ur.user_id === userId && ur.organization_id === orgId
    );
    return userOrgRoles.map(ur => {
      const role = roles.find(r => r.id === ur.role_id);
      return role?.name || 'Unknown';
    });
  };

  const getUnlinkedOrganizations = () => {
    return organizations.filter(org => !org.company_id);
  };

  const unlinkedOrgs = getUnlinkedOrganizations();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to={createPageUrl('Admin')}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Company Hierarchy</h1>
            <p className="text-slate-500 mt-1">
              View company → organizations → locations → users structure
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
          <CardContent className="p-6">
            <Building2 className="w-8 h-8 mb-2 opacity-80" />
            <p className="text-sm opacity-90">Companies</p>
            <p className="text-3xl font-bold mt-1">{companies.length}</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-teal-500 to-teal-600 text-white">
          <CardContent className="p-6">
            <Building2 className="w-8 h-8 mb-2 opacity-80" />
            <p className="text-sm opacity-90">Organizations</p>
            <p className="text-3xl font-bold mt-1">{organizations.length}</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-cyan-500 to-cyan-600 text-white">
          <CardContent className="p-6">
            <MapPin className="w-8 h-8 mb-2 opacity-80" />
            <p className="text-sm opacity-90">Locations</p>
            <p className="text-3xl font-bold mt-1">{locations.length}</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-indigo-500 to-indigo-600 text-white">
          <CardContent className="p-6">
            <Users className="w-8 h-8 mb-2 opacity-80" />
            <p className="text-sm opacity-90">Users</p>
            <p className="text-3xl font-bold mt-1">{users.length}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Company Structure</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {companies.length === 0 ? (
            <div className="text-center py-12">
              <Building2 className="w-12 h-12 mx-auto text-slate-300 mb-4" />
              <p className="text-slate-500">No companies created yet</p>
              <Link to={createPageUrl('FinanceCompanies')}>
                <Button className="mt-4">Create Company</Button>
              </Link>
            </div>
          ) : (
            companies.map(company => {
              const companyOrgs = getOrganizationsForCompany(company.id);
              const isExpanded = expandedCompanies[company.id];

              return (
                <Card key={company.id} className="border-2 border-blue-200">
                  <CardContent className="p-4">
                    <div 
                      className="flex items-center justify-between cursor-pointer"
                      onClick={() => toggleCompany(company.id)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                          <Building2 className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-900 text-lg">
                            {company.company_legal_name}
                          </h3>
                          <p className="text-sm text-slate-500">
                            {company.country_code} • {companyOrgs.length} organization(s)
                          </p>
                        </div>
                      </div>
                      {isExpanded ? (
                        <ChevronDown className="w-5 h-5 text-slate-400" />
                      ) : (
                        <ChevronRight className="w-5 h-5 text-slate-400" />
                      )}
                    </div>

                    {isExpanded && companyOrgs.length > 0 && (
                      <div className="ml-8 mt-4 space-y-3">
                        {companyOrgs.map(org => {
                          const orgLocations = getLocationsForOrganization(org.id);
                          const orgUsers = getUsersForOrganization(org.id);
                          const isOrgExpanded = expandedOrganizations[org.id];

                          return (
                            <Card key={org.id} className="border border-teal-200 bg-teal-50">
                              <CardContent className="p-4">
                                <div 
                                  className="flex items-center justify-between cursor-pointer"
                                  onClick={() => toggleOrganization(org.id)}
                                >
                                  <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center">
                                      <Building2 className="w-5 h-5 text-white" />
                                    </div>
                                    <div>
                                      <h4 className="font-semibold text-slate-900">{org.name}</h4>
                                      <div className="flex gap-2 mt-1">
                                        <Badge variant="outline" className="text-xs">
                                          {org.type}
                                        </Badge>
                                        <Badge variant="outline" className="text-xs">
                                          {orgLocations.length} location(s)
                                        </Badge>
                                        <Badge variant="outline" className="text-xs">
                                          {orgUsers.length} user(s)
                                        </Badge>
                                      </div>
                                    </div>
                                  </div>
                                  {isOrgExpanded ? (
                                    <ChevronDown className="w-5 h-5 text-slate-400" />
                                  ) : (
                                    <ChevronRight className="w-5 h-5 text-slate-400" />
                                  )}
                                </div>

                                {isOrgExpanded && (
                                  <div className="ml-8 mt-4 space-y-4">
                                    {/* Locations */}
                                    {orgLocations.length > 0 && (
                                      <div>
                                        <p className="text-xs font-semibold text-slate-600 mb-2 flex items-center gap-2">
                                          <MapPin className="w-3 h-3" />
                                          LOCATIONS
                                        </p>
                                        <div className="space-y-2">
                                          {orgLocations.map(loc => (
                                            <div key={loc.id} className="p-3 bg-white rounded-lg border">
                                              <p className="font-medium text-sm">{loc.name}</p>
                                              <p className="text-xs text-slate-500">{loc.address}</p>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )}

                                    {/* Users */}
                                    {orgUsers.length > 0 && (
                                      <div>
                                        <p className="text-xs font-semibold text-slate-600 mb-2 flex items-center gap-2">
                                          <Users className="w-3 h-3" />
                                          USERS
                                        </p>
                                        <div className="space-y-2">
                                          {orgUsers.map(user => {
                                            const userRoleNames = getUserRoleNames(user.id, org.id);
                                            return (
                                              <div key={user.id} className="p-3 bg-white rounded-lg border">
                                                <div className="flex items-start justify-between">
                                                  <div>
                                                    <p className="font-medium text-sm">{user.full_name}</p>
                                                    <p className="text-xs text-slate-500">{user.email}</p>
                                                  </div>
                                                  <div className="flex flex-wrap gap-1">
                                                    {userRoleNames.map((roleName, idx) => (
                                                      <Badge key={idx} variant="outline" className="text-xs">
                                                        <Shield className="w-3 h-3 mr-1" />
                                                        {roleName}
                                                      </Badge>
                                                    ))}
                                                  </div>
                                                </div>
                                              </div>
                                            );
                                          })}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })
          )}
        </CardContent>
      </Card>

      {unlinkedOrgs.length > 0 && (
        <Card className="border-2 border-amber-200 bg-amber-50">
          <CardHeader>
            <CardTitle className="text-amber-900">
              Unlinked Organizations ({unlinkedOrgs.length})
            </CardTitle>
            <p className="text-sm text-amber-700">
              These organizations are not linked to any company. Link them via AdminCompanies page.
            </p>
          </CardHeader>
          <CardContent className="space-y-2">
            {unlinkedOrgs.map(org => (
              <Card key={org.id} className="p-3 bg-white border">
                <div className="flex items-center gap-3">
                  <Building2 className="w-5 h-5 text-amber-600" />
                  <div>
                    <p className="font-medium text-slate-900">{org.name}</p>
                    <p className="text-xs text-slate-500">{org.code}</p>
                  </div>
                </div>
              </Card>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}