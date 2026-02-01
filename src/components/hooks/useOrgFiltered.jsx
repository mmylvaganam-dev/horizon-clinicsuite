import { useOrganization } from '@/components/OrganizationProvider';

/**
 * Hook to get organization-filtered query and mutation options
 * Usage: const { orgFilter, withOrgId } = useOrgFiltered();
 */
export function useOrgFiltered() {
  const { selectedOrgId } = useOrganization();

  // Filter object to add to queries
  const orgFilter = selectedOrgId ? { organization_id: selectedOrgId } : {};

  // Helper to add org_id to data being created/updated
  const withOrgId = (data) => ({
    ...data,
    organization_id: selectedOrgId,
  });

  return {
    orgFilter,
    withOrgId,
    selectedOrgId,
  };
}