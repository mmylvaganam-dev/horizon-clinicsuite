import { useEffect, useState } from "react";

import { firebaseAuthFeatureEnabled } from "@/context/FirebaseSessionContext";
import {
  getRbacMe,
  testRbacAdmin,
  testRbacProvider,
} from "@/lib/backendTest";


export default function RbacTest() {
  const [backendBaseUrl, setBackendBaseUrl] = useState(
    import.meta.env.VITE_BACKEND_BASE_URL || "http://127.0.0.1:8000"
  );
  const [rbacContext, setRbacContext] = useState(null);
  const [adminResult, setAdminResult] = useState(null);
  const [providerResult, setProviderResult] = useState(null);
  const [error, setError] = useState("");
  const [isLoadingRoles, setIsLoadingRoles] = useState(false);
  const [isTestingAdmin, setIsTestingAdmin] = useState(false);
  const [isTestingProvider, setIsTestingProvider] = useState(false);

  useEffect(() => {
    if (firebaseAuthFeatureEnabled) {
      loadRoles();
    }
  }, []);

  const loadRoles = async () => {
    setIsLoadingRoles(true);
    setError("");

    try {
      setRbacContext(await getRbacMe(backendBaseUrl));
    } catch (loadError) {
      setError(loadError?.message || "Unable to load RBAC roles");
    } finally {
      setIsLoadingRoles(false);
    }
  };

  const runAdminTest = async () => {
    setIsTestingAdmin(true);
    setAdminResult(null);
    setError("");

    try {
      setAdminResult({
        status: "authorized",
        response: await testRbacAdmin(backendBaseUrl),
      });
    } catch (testError) {
      setAdminResult({
        status: testError?.status === 403 ? "unauthorized" : "error",
        error: testError?.message || "Admin RBAC test failed",
      });
    } finally {
      setIsTestingAdmin(false);
    }
  };

  const runProviderTest = async () => {
    setIsTestingProvider(true);
    setProviderResult(null);
    setError("");

    try {
      setProviderResult({
        status: "authorized",
        response: await testRbacProvider(backendBaseUrl),
      });
    } catch (testError) {
      setProviderResult({
        status: testError?.status === 403 ? "unauthorized" : "error",
        error: testError?.message || "Provider RBAC test failed",
      });
    } finally {
      setIsTestingProvider(false);
    }
  };

  if (!firebaseAuthFeatureEnabled) {
    return (
      <RbacShell>
        <StatusMessage
          title="RBAC test inactive"
          message="VITE_USE_FIREBASE_AUTH is false, so this isolated RBAC test is not active."
          tone="muted"
        />
      </RbacShell>
    );
  }

  return (
    <RbacShell>
      <section className="rounded-lg border border-slate-200 bg-white p-5">
        <label className="block">
          <span className="text-sm font-medium text-slate-700">Backend URL</span>
          <input
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            value={backendBaseUrl}
            onChange={(event) => setBackendBaseUrl(event.target.value)}
          />
        </label>
        <button
          className="mt-4 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          type="button"
          onClick={loadRoles}
          disabled={isLoadingRoles}
        >
          {isLoadingRoles ? "Loading roles" : "Load current roles"}
        </button>
      </section>

      {error && <StatusMessage title="Error" message={error} tone="error" />}

      <section className="mt-6 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <h2 className="text-lg font-semibold">Current roles</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {(rbacContext?.roles || ["not_loaded"]).map((role) => (
              <span
                key={role}
                className="rounded-md bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700"
              >
                {role}
              </span>
            ))}
          </div>
          <pre className="mt-4 max-h-80 overflow-auto rounded-md bg-slate-100 p-3 text-xs">
            {rbacContext ? JSON.stringify(rbacContext, null, 2) : "none"}
          </pre>
        </div>

        <div className="space-y-4">
          <RouteTestCard
            title="Admin route"
            description="Calls /rbac/admin-test and requires admin."
            isRunning={isTestingAdmin}
            result={adminResult}
            onRun={runAdminTest}
          />
          <RouteTestCard
            title="Provider route"
            description="Calls /rbac/provider-test and requires provider or admin."
            isRunning={isTestingProvider}
            result={providerResult}
            onRun={runProviderTest}
          />
        </div>
      </section>
    </RbacShell>
  );
}

function RbacShell({ children }) {
  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10 text-slate-900">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8">
          <p className="text-sm font-medium uppercase tracking-wide text-slate-500">
            Isolated RBAC Test
          </p>
          <h1 className="mt-2 text-3xl font-semibold">Role-Based Access Control</h1>
        </div>
        {children}
      </div>
    </main>
  );
}

function RouteTestCard({ title, description, isRunning, result, onRun }) {
  const statusTone =
    result?.status === "authorized"
      ? "text-emerald-700"
      : result?.status === "unauthorized"
        ? "text-amber-700"
        : "text-slate-500";

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">{title}</h2>
          <p className="mt-1 text-sm text-slate-600">{description}</p>
        </div>
        <span className={`text-sm font-semibold ${statusTone}`}>
          {result?.status || "not_run"}
        </span>
      </div>
      <button
        className="mt-4 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        type="button"
        onClick={onRun}
        disabled={isRunning}
      >
        {isRunning ? "Testing" : "Run test"}
      </button>
      <pre className="mt-4 max-h-64 overflow-auto rounded-md bg-slate-100 p-3 text-xs">
        {result ? JSON.stringify(result, null, 2) : "none"}
      </pre>
    </section>
  );
}

function StatusMessage({ title, message, tone }) {
  const toneClass = {
    error: "border-red-200 bg-red-50 text-red-900",
    muted: "border-slate-200 bg-white text-slate-900",
  }[tone];

  return (
    <section className={`mt-6 rounded-lg border px-5 py-4 ${toneClass}`}>
      <h2 className="text-base font-semibold">{title}</h2>
      <p className="mt-1 break-all text-sm">{message}</p>
    </section>
  );
}
