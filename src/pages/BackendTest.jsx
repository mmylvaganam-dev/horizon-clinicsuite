import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";

import { firebaseAuth } from "@/lib/firebase";
import {
  getProtectedMe,
  getProtectedProfile,
  sendFirebaseTokenTest,
} from "@/lib/backendTest";


export default function BackendTest() {
  const [backendBaseUrl, setBackendBaseUrl] = useState(
    import.meta.env.VITE_BACKEND_BASE_URL || "http://127.0.0.1:8000"
  );
  const [result, setResult] = useState(null);
  const [protectedResult, setProtectedResult] = useState(null);
  const [profileResult, setProfileResult] = useState(null);
  const [error, setError] = useState("");
  const [protectedError, setProtectedError] = useState("");
  const [profileError, setProfileError] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [isProtectedRunning, setIsProtectedRunning] = useState(false);
  const [isProfileRunning, setIsProfileRunning] = useState(false);
  const [currentUser, setCurrentUser] = useState(firebaseAuth?.currentUser || null);

  useEffect(() => {
    if (!firebaseAuth) {
      return undefined;
    }

    return onAuthStateChanged(firebaseAuth, (user) => {
      setCurrentUser(user);
    });
  }, []);

  const handleFirebaseBackendTest = async () => {
    setIsRunning(true);
    setError("");
    setResult(null);

    try {
      const response = await sendFirebaseTokenTest(backendBaseUrl);
      setResult(response);
    } catch (testError) {
      setError(testError?.message || "Unknown backend Firebase token test error");
    } finally {
      setIsRunning(false);
    }
  };

  const handleProtectedMeTest = async () => {
    setIsProtectedRunning(true);
    setProtectedError("");
    setProtectedResult(null);

    try {
      const response = await getProtectedMe(backendBaseUrl);
      setProtectedResult(response);
    } catch (testError) {
      setProtectedError(testError?.message || "Unknown protected backend test error");
    } finally {
      setIsProtectedRunning(false);
    }
  };

  const handleProtectedProfileTest = async () => {
    setIsProfileRunning(true);
    setProfileError("");
    setProfileResult(null);

    try {
      const response = await getProtectedProfile(backendBaseUrl);
      setProfileResult(response);
    } catch (testError) {
      setProfileError(testError?.message || "Unknown protected profile test error");
    } finally {
      setIsProfileRunning(false);
    }
  };

  const decodedUser = result?.user;
  const protectedUser = protectedResult?.user;

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10 text-slate-900">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-3xl font-semibold">Backend Test</h1>
        <p className="mt-3 text-sm text-slate-600">
          Isolated backend diagnostics only. This does not replace Base44 auth or
          change production login behavior.
        </p>

        <section className="mt-8 space-y-4 rounded-lg border border-slate-200 bg-white p-5">
          <h2 className="text-xl font-semibold">Firebase Backend Verification</h2>
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Backend URL</span>
            <input
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              value={backendBaseUrl}
              onChange={(event) => setBackendBaseUrl(event.target.value)}
            />
          </label>

          <button
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            type="button"
            onClick={handleFirebaseBackendTest}
            disabled={isRunning}
          >
            Send Firebase token test
          </button>
        </section>

        <section className="mt-6 overflow-hidden rounded-lg border border-slate-200 bg-white">
          <div className="flex justify-between border-b border-slate-100 px-5 py-4">
            <span className="font-medium">Firebase user signed in</span>
            <span>{currentUser ? "yes" : "no"}</span>
          </div>
          <div className="flex justify-between border-b border-slate-100 px-5 py-4">
            <span className="font-medium">Token verification</span>
            <span>{result ? "success" : "not_run"}</span>
          </div>
          <div className="border-b border-slate-100 px-5 py-4">
            <div className="font-medium">Decoded user</div>
            <pre className="mt-2 max-h-80 overflow-auto rounded-md bg-slate-100 p-3 text-xs">
              {decodedUser ? JSON.stringify(decodedUser, null, 2) : "none"}
            </pre>
          </div>
          <div className="px-5 py-4">
            <div className="font-medium">Error</div>
            <div className="mt-1 break-all text-sm text-slate-700">
              {error || "none"}
            </div>
          </div>
        </section>

        <section className="mt-8 space-y-4 rounded-lg border border-slate-200 bg-white p-5">
          <h2 className="text-xl font-semibold">Protected Firebase User</h2>
          <p className="text-sm text-slate-600">
            Calls <span className="font-mono">/auth/protected-me</span> with the
            current Firebase ID token. No PostgreSQL lookup is used yet.
          </p>

          <button
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            type="button"
            onClick={handleProtectedMeTest}
            disabled={isProtectedRunning}
          >
            Get protected me
          </button>

          <div className="overflow-hidden rounded-lg border border-slate-200">
            <div className="flex justify-between border-b border-slate-100 px-5 py-4">
              <span className="font-medium">Protected route</span>
              <span>{protectedResult ? "success" : "not_run"}</span>
            </div>
            <div className="border-b border-slate-100 px-5 py-4">
              <div className="font-medium">Protected user</div>
              <pre className="mt-2 max-h-80 overflow-auto rounded-md bg-slate-100 p-3 text-xs">
                {protectedUser ? JSON.stringify(protectedUser, null, 2) : "none"}
              </pre>
            </div>
            <div className="px-5 py-4">
              <div className="font-medium">Protected error</div>
              <div className="mt-1 break-all text-sm text-slate-700">
                {protectedError || "none"}
              </div>
            </div>
          </div>
        </section>

        <section className="mt-8 space-y-4 rounded-lg border border-slate-200 bg-white p-5">
          <h2 className="text-xl font-semibold">Protected Profile Lookup</h2>
          <p className="text-sm text-slate-600">
            Calls <span className="font-mono">/auth/protected-profile</span> with
            the current Firebase ID token. PostgreSQL lookup is optional and
            safely returns <span className="font-mono">not_linked</span> when no
            app user is available.
          </p>

          <button
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            type="button"
            onClick={handleProtectedProfileTest}
            disabled={isProfileRunning}
          >
            Get protected profile
          </button>

          <div className="overflow-hidden rounded-lg border border-slate-200">
            <div className="flex justify-between border-b border-slate-100 px-5 py-4">
              <span className="font-medium">Protected profile</span>
              <span>{profileResult ? "success" : "not_run"}</span>
            </div>
            <div className="flex justify-between border-b border-slate-100 px-5 py-4">
              <span className="font-medium">Profile status</span>
              <span>{profileResult?.profile_status || "not_run"}</span>
            </div>
            <div className="border-b border-slate-100 px-5 py-4">
              <div className="font-medium">Profile response</div>
              <pre className="mt-2 max-h-80 overflow-auto rounded-md bg-slate-100 p-3 text-xs">
                {profileResult ? JSON.stringify(profileResult, null, 2) : "none"}
              </pre>
            </div>
            <div className="px-5 py-4">
              <div className="font-medium">Profile error</div>
              <div className="mt-1 break-all text-sm text-slate-700">
                {profileError || "none"}
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
