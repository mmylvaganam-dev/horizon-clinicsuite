import { useEffect, useState } from "react";

import { firebaseAuthFeatureEnabled } from "@/context/FirebaseSessionContext";
import { getSystemHealthSummary } from "@/lib/backendTest";


const statusStyles = {
  ready: "border-emerald-200 bg-emerald-50 text-emerald-900",
  partial: "border-amber-200 bg-amber-50 text-amber-900",
  not_connected: "border-slate-200 bg-slate-50 text-slate-800",
  not_started: "border-red-200 bg-red-50 text-red-900",
};


export default function SystemHealthTest() {
  const [backendBaseUrl, setBackendBaseUrl] = useState(
    import.meta.env.VITE_BACKEND_BASE_URL || "http://127.0.0.1:8000"
  );
  const [modules, setModules] = useState({});
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (firebaseAuthFeatureEnabled) {
      loadHealthSummary();
    }
  }, []);

  const loadHealthSummary = async () => {
    setIsLoading(true);
    setError("");

    try {
      const response = await getSystemHealthSummary(backendBaseUrl);
      setModules(response.modules || {});
    } catch (loadError) {
      setModules({});
      setError(loadError?.message || "Unable to load system health summary");
    } finally {
      setIsLoading(false);
    }
  };

  if (!firebaseAuthFeatureEnabled) {
    return (
      <HealthShell>
        <StatusMessage
          title="System health test inactive"
          message="VITE_USE_FIREBASE_AUTH is false, so this isolated dashboard is not active."
        />
      </HealthShell>
    );
  }

  return (
    <HealthShell>
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
          onClick={loadHealthSummary}
          disabled={isLoading}
        >
          {isLoading ? "Loading summary" : "Load system health"}
        </button>
      </section>

      {error && <StatusMessage title="Error" message={error} />}

      <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Object.entries(modules).length ? (
          Object.entries(modules).map(([moduleName, moduleStatus]) => (
            <HealthCard
              key={moduleName}
              moduleName={moduleName}
              moduleStatus={moduleStatus}
            />
          ))
        ) : (
          <div className="rounded-lg border border-slate-200 bg-white p-5 text-sm text-slate-600">
            No module statuses loaded
          </div>
        )}
      </section>
    </HealthShell>
  );
}

function HealthShell({ children }) {
  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10 text-slate-900">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8">
          <p className="text-sm font-medium uppercase tracking-wide text-slate-500">
            Isolated Migration Health Test
          </p>
          <h1 className="mt-2 text-3xl font-semibold">System Health Summary</h1>
        </div>
        {children}
      </div>
    </main>
  );
}

function HealthCard({ moduleName, moduleStatus }) {
  const status = moduleStatus.status || "not_started";
  const toneClass = statusStyles[status] || statusStyles.not_started;

  return (
    <article className="rounded-lg border border-slate-200 bg-white p-5">
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-base font-semibold capitalize">
          {moduleName.replaceAll("_", " ")}
        </h2>
        <span className={`rounded-md border px-2 py-1 text-xs font-semibold ${toneClass}`}>
          {status}
        </span>
      </div>
      <p className="mt-3 text-sm leading-6 text-slate-600">
        {moduleStatus.detail || "No detail provided"}
      </p>
    </article>
  );
}

function StatusMessage({ title, message }) {
  return (
    <section className="mt-6 rounded-lg border border-red-200 bg-red-50 px-5 py-4 text-red-900">
      <h2 className="text-base font-semibold">{title}</h2>
      <p className="mt-1 break-all text-sm">{message}</p>
    </section>
  );
}
