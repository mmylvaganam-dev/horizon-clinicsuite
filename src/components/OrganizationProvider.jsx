import React, { createContext, useContext, useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

const OrganizationContext = createContext();

export function OrganizationProvider({ children }) {
  const [selectedOrgId, setSelectedOrgId] = useState(() => {
    return sessionStorage.getItem('selectedOrgId') || null;
  });

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const isPlatformOwner = user?.email === 'madhawaekanayake@gmail.com' || 
                          user?.email === 'mmylvaganam@premierhealthcanada.ca' || 
                          user?.is_platform_owner === true;
  
  console.log('OrganizationProvider - User:', user?.email, 'isPlatformOwner:', isPlatformOwner);

  // For platform owners: load all organizations
  const { data: organizations } = useQuery({
    queryKey: ['allOrganizations'],
    queryFn: async () => {
      if (!isPlatformOwner) return [];
      const orgs = await base44.entities.Organization.list();
      console.log('Platform owner - Organizations loaded:', orgs);
      return orgs;
    },
    enabled: isPlatformOwner,
  });

  // For regular users: get their assigned organization from UserRole
  const { data: userOrganization } = useQuery({
    queryKey: ['userOrganization', user?.id],
    queryFn: async () => {
      if (isPlatformOwner || !user?.id) return null;
      
      // Get user's role assignment to find their organization
      const userRoles = await base44.entities.UserRole.filter({ user_id: user.id });
      console.log('Regular user - UserRoles:', userRoles);
      
      if (userRoles && userRoles.length > 0) {
        const orgId = userRoles[0].organization_id;
        console.log('Regular user - Found organization_id:', orgId);
        return orgId;
      }
      
      return null;
    },
    enabled: !isPlatformOwner && !!user?.id,
  });

  useEffect(() => {
    console.log('OrganizationProvider - isPlatformOwner:', isPlatformOwner, 'user:', user?.email, 'selectedOrgId:', selectedOrgId, 'organizations:', organizations?.length);
    
    // Platform owner: auto-select first org
    if (isPlatformOwner && organizations?.length > 0 && !selectedOrgId) {
      const firstOrg = organizations[0];
      console.log('Auto-selecting first organization:', firstOrg.id, firstOrg.name);
      setSelectedOrgId(firstOrg.id);
      sessionStorage.setItem('selectedOrgId', firstOrg.id);
    }
    
    // Regular user: use their assigned organization
    if (!isPlatformOwner && userOrganization && !selectedOrgId) {
      console.log('Regular user - Setting organization:', userOrganization);
      setSelectedOrgId(userOrganization);
      sessionStorage.setItem('selectedOrgId', userOrganization);
    }
  }, [organizations, userOrganization, isPlatformOwner, selectedOrgId, user]);

  const handleOrgChange = (orgId) => {
    setSelectedOrgId(orgId);
    sessionStorage.setItem('selectedOrgId', orgId);
  };

  return (
    <OrganizationContext.Provider
      value={{
        selectedOrgId,
        setSelectedOrgId: handleOrgChange,
        organizations,
        isPlatformOwner,
        onOrgChange: handleOrgChange,
        user,
      }}
    >
      {children}
    </OrganizationContext.Provider>
  );
}

export function useOrganization() {
  const context = useContext(OrganizationContext);
  if (!context) {
    throw new Error('useOrganization must be used within OrganizationProvider');
  }
  return context;
}