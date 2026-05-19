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
    throw new Error(payload.detail || fallbackErrorMessage);
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
