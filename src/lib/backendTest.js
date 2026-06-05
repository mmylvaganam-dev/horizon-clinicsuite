import { onAuthStateChanged } from "firebase/auth";

import { firebaseAuth } from "@/lib/firebase";


const defaultBackendBaseUrl =
  import.meta.env.VITE_BACKEND_BASE_URL || "http://127.0.0.1:8000";

export async function sendFirebaseTokenTest(backendBaseUrl = defaultBackendBaseUrl) {
  return sendFirebaseAuthorizedRequest(
    `${backendBaseUrl}/auth/firebase-test`,
    "Firebase backend token test failed"
  );
}

export async function getProtectedMe(backendBaseUrl = defaultBackendBaseUrl) {
  return sendFirebaseAuthorizedRequest(
    `${backendBaseUrl}/auth/protected-me`,
    "Protected Firebase user test failed"
  );
}

export async function getProtectedProfile(backendBaseUrl = defaultBackendBaseUrl) {
  return sendFirebaseAuthorizedRequest(
    `${backendBaseUrl}/auth/protected-profile`,
    "Protected Firebase profile test failed"
  );
}

export async function getMyProfile(backendBaseUrl = defaultBackendBaseUrl) {
  return sendFirebaseAuthorizedRequest(
    `${backendBaseUrl}/profile/me`,
    "Firebase profile load failed"
  );
}

export async function updateMyProfile(
  profileUpdates,
  backendBaseUrl = defaultBackendBaseUrl
) {
  return sendFirebaseAuthorizedRequest(
    `${backendBaseUrl}/profile/me`,
    "Firebase profile update failed",
    {
      method: "PATCH",
      body: JSON.stringify(profileUpdates),
    }
  );
}

export async function getAdminOrganizations(backendBaseUrl = defaultBackendBaseUrl) {
  return sendFirebaseAuthorizedRequest(
    `${backendBaseUrl}/admin/organizations`,
    "Admin organizations load failed"
  );
}

export async function createAdminOrganization(
  organization,
  backendBaseUrl = defaultBackendBaseUrl
) {
  return sendFirebaseAuthorizedRequest(
    `${backendBaseUrl}/admin/organizations`,
    "Admin organization create failed",
    {
      method: "POST",
      body: JSON.stringify(organization),
    }
  );
}

export async function getAdminRoles(backendBaseUrl = defaultBackendBaseUrl) {
  return sendFirebaseAuthorizedRequest(
    `${backendBaseUrl}/admin/roles`,
    "Admin roles load failed"
  );
}

export async function getRbacMe(backendBaseUrl = defaultBackendBaseUrl) {
  return sendFirebaseAuthorizedRequest(
    `${backendBaseUrl}/rbac/me`,
    "RBAC roles load failed"
  );
}

export async function testRbacAdmin(backendBaseUrl = defaultBackendBaseUrl) {
  return sendFirebaseAuthorizedRequest(
    `${backendBaseUrl}/rbac/admin-test`,
    "Admin RBAC test failed"
  );
}

export async function testRbacProvider(backendBaseUrl = defaultBackendBaseUrl) {
  return sendFirebaseAuthorizedRequest(
    `${backendBaseUrl}/rbac/provider-test`,
    "Provider RBAC test failed"
  );
}

export async function registerDocumentUpload(
  document,
  backendBaseUrl = defaultBackendBaseUrl
) {
  return sendFirebaseAuthorizedRequest(
    `${backendBaseUrl}/documents/register-upload`,
    "Document upload registration failed",
    {
      method: "POST",
      body: JSON.stringify(document),
    }
  );
}

export async function listDocuments(backendBaseUrl = defaultBackendBaseUrl) {
  return sendFirebaseAuthorizedRequest(
    `${backendBaseUrl}/documents/list`,
    "Document list failed"
  );
}

export async function getAuditLogs(backendBaseUrl = defaultBackendBaseUrl) {
  return sendFirebaseAuthorizedRequest(
    `${backendBaseUrl}/audit/logs`,
    "Audit logs load failed"
  );
}

export async function getSystemHealthSummary(backendBaseUrl = defaultBackendBaseUrl) {
  return sendFirebaseAuthorizedRequest(
    `${backendBaseUrl}/system/health-summary`,
    "System health summary load failed"
  );
}

export async function createInvitation(
  invitation,
  backendBaseUrl = defaultBackendBaseUrl
) {
  return sendFirebaseAuthorizedRequest(
    `${backendBaseUrl}/invitations/create`,
    "Invitation create failed",
    {
      method: "POST",
      body: JSON.stringify(invitation),
    }
  );
}

export async function listInvitations(backendBaseUrl = defaultBackendBaseUrl) {
  return sendFirebaseAuthorizedRequest(
    `${backendBaseUrl}/invitations/list`,
    "Invitation list failed"
  );
}

export async function acceptInvitation(token, backendBaseUrl = defaultBackendBaseUrl) {
  return sendFirebaseAuthorizedRequest(
    `${backendBaseUrl}/invitations/accept`,
    "Invitation accept failed",
    {
      method: "POST",
      body: JSON.stringify({ token }),
    }
  );
}

export async function createAvailability(
  availability,
  backendBaseUrl = defaultBackendBaseUrl
) {
  return sendFirebaseAuthorizedRequest(
    `${backendBaseUrl}/availability/create`,
    "Availability create failed",
    {
      method: "POST",
      body: JSON.stringify(availability),
    }
  );
}

export async function listAvailability(backendBaseUrl = defaultBackendBaseUrl) {
  return sendFirebaseAuthorizedRequest(
    `${backendBaseUrl}/availability/list`,
    "Availability list failed"
  );
}

export async function updateAvailability(
  availability,
  backendBaseUrl = defaultBackendBaseUrl
) {
  return sendFirebaseAuthorizedRequest(
    `${backendBaseUrl}/availability/update`,
    "Availability update failed",
    {
      method: "PATCH",
      body: JSON.stringify(availability),
    }
  );
}

export async function createAppointmentRequest(
  appointmentRequest,
  backendBaseUrl = defaultBackendBaseUrl
) {
  return sendFirebaseAuthorizedRequest(
    `${backendBaseUrl}/appointments/request`,
    "Appointment request create failed",
    {
      method: "POST",
      body: JSON.stringify(appointmentRequest),
    }
  );
}

export async function listAppointmentRequests(backendBaseUrl = defaultBackendBaseUrl) {
  return sendFirebaseAuthorizedRequest(
    `${backendBaseUrl}/appointments/list`,
    "Appointment request list failed"
  );
}

export async function updateAppointmentRequestStatus(
  appointmentRequestStatus,
  backendBaseUrl = defaultBackendBaseUrl
) {
  return sendFirebaseAuthorizedRequest(
    `${backendBaseUrl}/appointments/status`,
    "Appointment request status update failed",
    {
      method: "PATCH",
      body: JSON.stringify(appointmentRequestStatus),
    }
  );
}

export async function listOrgMembers(backendBaseUrl = defaultBackendBaseUrl) {
  return sendFirebaseAuthorizedRequest(
    `${backendBaseUrl}/org-members/list`,
    "Organization member list failed"
  );
}

export async function addOrgMember(member, backendBaseUrl = defaultBackendBaseUrl) {
  return sendFirebaseAuthorizedRequest(
    `${backendBaseUrl}/org-members/add`,
    "Organization member add failed",
    {
      method: "POST",
      body: JSON.stringify(member),
    }
  );
}

export async function updateOrgMemberStatus(
  memberStatus,
  backendBaseUrl = defaultBackendBaseUrl
) {
  return sendFirebaseAuthorizedRequest(
    `${backendBaseUrl}/org-members/status`,
    "Organization member status update failed",
    {
      method: "PATCH",
      body: JSON.stringify(memberStatus),
    }
  );
}

export async function uploadBase44Archive(
  archive,
  backendBaseUrl = defaultBackendBaseUrl
) {
  return sendFirebaseAuthorizedRequest(
    `${backendBaseUrl}/base44-archive/upload`,
    "Base44 archive upload failed",
    {
      method: "POST",
      body: JSON.stringify(archive),
    }
  );
}

export async function listBase44Archives(backendBaseUrl = defaultBackendBaseUrl) {
  return sendFirebaseAuthorizedRequest(
    `${backendBaseUrl}/base44-archive/list`,
    "Base44 archive list failed"
  );
}

export async function searchBase44Archive(
  search,
  backendBaseUrl = defaultBackendBaseUrl
) {
  const params = new URLSearchParams({
    archive_id: search.archive_id,
    entity: search.entity,
    query: search.query || "",
    limit: String(search.limit || 25),
  });

  return sendFirebaseAuthorizedRequest(
    `${backendBaseUrl}/base44-archive/search?${params.toString()}`,
    "Base44 archive search failed"
  );
}

export async function listPharmacyProducts(
  query = "",
  backendBaseUrl = defaultBackendBaseUrl
) {
  const params = new URLSearchParams({ query });
  return sendFirebaseAuthorizedRequest(
    `${backendBaseUrl}/pharmacy/products?${params.toString()}`,
    "Pharmacy products load failed"
  );
}

export async function createPharmacyProduct(
  product,
  backendBaseUrl = defaultBackendBaseUrl
) {
  return sendFirebaseAuthorizedRequest(
    `${backendBaseUrl}/pharmacy/products`,
    "Pharmacy product create failed",
    {
      method: "POST",
      body: JSON.stringify(product),
    }
  );
}

export async function createPharmacySale(
  sale,
  backendBaseUrl = defaultBackendBaseUrl
) {
  return sendFirebaseAuthorizedRequest(
    `${backendBaseUrl}/pharmacy/sales`,
    "Pharmacy sale create failed",
    {
      method: "POST",
      body: JSON.stringify(sale),
    }
  );
}

export async function listPharmacySales(backendBaseUrl = defaultBackendBaseUrl) {
  return sendFirebaseAuthorizedRequest(
    `${backendBaseUrl}/pharmacy/sales`,
    "Pharmacy sales load failed"
  );
}

export async function getPharmacyDailySummary(backendBaseUrl = defaultBackendBaseUrl) {
  return sendFirebaseAuthorizedRequest(
    `${backendBaseUrl}/pharmacy/daily-summary`,
    "Pharmacy daily summary load failed"
  );
}

async function sendFirebaseAuthorizedRequest(url, fallbackErrorMessage, options = {}) {
  const currentUser = await waitForFirebaseUser();

  if (!currentUser) {
    throw new Error("No Firebase user is currently signed in");
  }

  const token = await currentUser.getIdToken();
  const response = await fetch(url, {
    method: options.method || "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      ...(options.body ? { "Content-Type": "application/json" } : {}),
    },
    body: options.body,
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(payload.detail || fallbackErrorMessage);
    error.status = response.status;
    error.payload = payload;
    throw error;
  }

  return payload;
}

function waitForFirebaseUser(timeoutMs = 5000) {
  if (!firebaseAuth) {
    return Promise.resolve(null);
  }

  if (firebaseAuth.currentUser) {
    return Promise.resolve(firebaseAuth.currentUser);
  }

  return new Promise((resolve) => {
    const timeoutId = window.setTimeout(() => {
      unsubscribe();
      resolve(null);
    }, timeoutMs);

    const unsubscribe = onAuthStateChanged(firebaseAuth, (user) => {
      window.clearTimeout(timeoutId);
      unsubscribe();
      resolve(user);
    });
  });
}
