import { useEffect, useState } from "react";

import { firebaseAuthFeatureEnabled } from "@/context/FirebaseSessionContext";
import { getAuditLogs } from "@/lib/backendTest";


export default function AuditTest() {
  const [backendBaseUrl, setBackendBaseUrl] = useState(
    import.meta.env.VITE_BACKEND_BASE_URL || "http://127.0.0.1:8000"
  );
  const [auditLogs, setAuditLogs] = useState([]);
  const [source, setSource] = useState("not_loaded");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (firebaseAuthFeatureEnabled) {
      loadAuditLogs();
    }
  }, []);

  const loadAuditLogs = async () => {
    setIsLoading(true);
    setError("");

    try {
      const response = await getAuditLogs(backendBaseUrl);
      setAuditLogs(response.audit_logs || []);
      setSource(response.source || "unknown");
    } catch (loadError) {
      setAuditLogs([]);
      setSource("error");
      setError(loadError?.message || "Unable to load audit logs");
    } finally {
      setIsLoading(false);
    }
  };

  if (!firebaseAuthFeatureEnabled) {
    return (
      <AuditShell>
        <StatusMessage
          title="Audit test inactive"
          message="VITE_USE_FIREBASE_AUTH is false, so this isolated audit flow is not active."
          tone="muted"
        />
      </AuditShell>
    );
  }

  return (
    <AuditShell>
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
          onClick={loadAuditLogs}
          disabled={isLoading}
        >
          {isLoading ? "Loading audit logs" : "Load audit logs"}
        </button>
      </section>

      {error && <StatusMessage title="Error" message={error} tone="error" />}

      <section className="mt-6 rounded-lg border border-slate-200 bg-white p-5">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-lg font-semibold">Audit logs</h2>
          <span className="rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-600">
            {source}
          </span>
        </div>

        <div className="mt-4 overflow-hidden rounded-lg border border-slate-200">
          <div className="grid grid-cols-[1.1fr_1fr_1fr_1fr] gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <div>Action</div>
            <div>Resource</div>
            <div>User</div>
            <div>Time</div>
          </div>
          {auditLogs.length ? (
            auditLogs.map((auditLog) => (
              <article
                className="border-b border-slate-100 px-4 py-3 last:border-b-0"
                key={auditLog.id}
              >
                <div className="grid gap-3 text-sm md:grid-cols-[1.1fr_1fr_1fr_1fr]">
                  <div className="font-medium text-slate-900">{auditLog.action_type}</div>
                  <div className="break-all text-slate-700">
                    {auditLog.resource_type}
                    {auditLog.resource_id ? `:${auditLog.resource_id}` : ""}
                  </div>
                  <div className="break-all text-slate-700">{auditLog.user_id || "none"}</div>
                  <div className="text-slate-700">{auditLog.created_at || "pending"}</div>
                </div>
                <pre className="mt-3 max-h-40 overflow-auto rounded-md bg-slate-100 p-3 text-xs text-slate-700">
                  {JSON.stringify(auditLog.metadata_json || {}, null, 2)}
                </pre>
              </article>
            ))
          ) : (
            <div className="px-4 py-6 text-sm text-slate-600">No audit logs loaded</div>
          )}
        </div>
      </section>
    </AuditShell>
  );
}

function AuditShell({ children }) {
  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10 text-slate-900">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8">
          <p className="text-sm font-medium uppercase tracking-wide text-slate-500">
            Isolated Audit Test
          </p>
          <h1 className="mt-2 text-3xl font-semibold">Audit Logs</h1>
        </div>
        {children}
      </div>
    </main>
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
