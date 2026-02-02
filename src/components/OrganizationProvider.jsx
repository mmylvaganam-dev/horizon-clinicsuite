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
                          user?.is_platform_owner;

  const { data: organizations } = useQuery({
    queryKey: ['allOrganizations'],
    queryFn: async () => {
      if (!isPlatformOwner) return [];
      return await base44.entities.Organization.list();
    },
    enabled: isPlatformOwner,
  });

  useEffect(() => {
    if (isPlatformOwner && organizations?.length > 0 && !selectedOrgId) {
      setSelectedOrgId(organizations[0].id);
      sessionStorage.setItem('selectedOrgId', organizations[0].id);
    }
  }, [organizations, isPlatformOwner, selectedOrgId]);

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