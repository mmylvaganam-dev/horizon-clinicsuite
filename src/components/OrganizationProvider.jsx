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
    queryFn: async () => {
      try {
        const userData = await base44.auth.me();
        console.log('OrganizationProvider - User auth check succeeded:', userData);
        return userData;
      } catch (error) {
        console.error('User auth check failed:', error);
        // Decode JWT token to get email
        const token = localStorage.getItem('base44_token') || sessionStorage.getItem('base44_token');
        if (token) {
          try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            console.log('Decoded JWT email:', payload.sub);
            return {
              email: payload.sub,
              is_platform_owner: payload.sub === 'mmylvaganam@premierhealthcanada.ca' || 
                                 payload.sub === 'mylvaganam@premierhealthcanada.ca'
            };
          } catch (e) {
            console.error('Failed to decode JWT:', e);
          }
        }
        return null;
      }
    },
  });

  // CRITICAL: Platform owner status is PERMANENT and based ONLY on email - never affected by organization or company status
  const isPlatformOwner = user?.email === 'mmylvaganam@premierhealthcanada.ca' || 
                          user?.email === 'mylvaganam@premierhealthcanada.ca' ||
                          user?.is_platform_owner === true;
  
  console.log('🔴 PLATFORM OWNER CHECK - Email:', user?.email, 'isPlatformOwner:', isPlatformOwner, 'This should ALWAYS be true for platform owner emails');

  // For platform owners: load ALL organizations (including inactive)
  const { data: organizations } = useQuery({
    queryKey: ['allOrganizations'],
    queryFn: async () => {
      if (!isPlatformOwner) return [];
      const orgs = await base44.entities.Organization.list();
      console.log('🔵 Platform owner - Loading ALL organizations (active + inactive):', orgs.length, 'orgs');
      console.log('🔵 Organizations:', orgs.map(o => `${o.name} (${o.status})`));
      return orgs; // Platform owners can see all organizations
    },
    enabled: isPlatformOwner,
  });

  // For regular users: get their assigned organization from UserRole
  // Check if TELEMEDICINE module is enabled for the selected org's company
  const { data: isTeleEnabled = false } = useQuery({
    queryKey: ['teleModuleEnabled', selectedOrgId],
    queryFn: async () => {
      if (!selectedOrgId) return false;
      const orgs = await base44.entities.Organization.filter({ id: selectedOrgId });
      if (!orgs[0]?.company_id) return false;
      const access = await base44.entities.CompanyModuleAccess.filter({
        company_id: orgs[0].company_id,
        module_code: 'TELEMEDICINE',
        is_enabled: true,
      });
      return access.length > 0;
    },
    enabled: !!selectedOrgId,
  });

  const { data: userOrganization } = useQuery({
    queryKey: ['userOrganization', user?.email],
    queryFn: async () => {
      if (isPlatformOwner || !user?.email) return null;
      
      // Get user's role assignment to find their organization
      const userRoles = await base44.entities.UserRole.list();
      console.log('Regular user - All UserRoles:', userRoles);
      
      // Find roles for this user by email (since we may not have user.id yet)
      const myRoles = userRoles.filter(role => 
        role.user_id === user.id || 
        role.created_by === user.email ||
        role.created_by_email === user.email
      );
      console.log('Regular user - My UserRoles:', myRoles);
      
      if (myRoles && myRoles.length > 0) {
        const orgId = myRoles[0].organization_id;
        console.log('Regular user - Found organization_id:', orgId);
        return orgId;
      }
      
      // Fallback: check if user has organization_id directly in their profile
      if (user.organization_id) {
        console.log('Regular user - Using user.organization_id:', user.organization_id);
        return user.organization_id;
      }
      
      // Final fallback: Check UserApproval records for approved organization
      console.log('Regular user - Checking UserApproval records...');
      const approvals = await base44.entities.UserApproval.filter({ user_email: user.email });
      console.log('Regular user - UserApproval records:', approvals);
      
      const approvedOrg = approvals.find(a => 
        a.final_status === 'approved' || 
        a.platform_owner_status === 'approved' ||
        a.org_admin_status === 'approved'
      );
      
      if (approvedOrg) {
        console.log('Regular user - Found approved organization:', approvedOrg.organization_id);
        return approvedOrg.organization_id;
      }
      
      // Last resort: If user has any UserApproval record, use that org
      if (approvals.length > 0) {
        console.log('Regular user - Using first approval organization:', approvals[0].organization_id);
        return approvals[0].organization_id;
      }
      
      return null;
    },
    enabled: !isPlatformOwner && !!user?.email,
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
        isTeleEnabled,
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