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
