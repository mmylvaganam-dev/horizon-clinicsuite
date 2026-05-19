import { useEffect, useState } from "react";

import { firebaseAuthFeatureEnabled } from "@/context/FirebaseSessionContext";
import {
  createAdminOrganization,
  getAdminOrganizations,
  getAdminRoles,
} from "@/lib/backendTest";


export default function AdminOrgTest() {
  const [backendBaseUrl, setBackendBaseUrl] = useState(
    import.meta.env.VITE_BACKEND_BASE_URL || "http://127.0.0.1:8000"
  );
  const [organizations, setOrganizations] = useState([]);
  const [roles, setRoles] = useState([]);
  const [orgSource, setOrgSource] = useState("not_loaded");
  const [roleSource, setRoleSource] = useState("not_loaded");
  const [newOrgName, setNewOrgName] = useState("Horizon Test Organization");
  const [newOrgSlug, setNewOrgSlug] = useState("horizon-test-organization");
  const [createdOrg, setCreatedOrg] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (firebaseAuthFeatureEnabled) {
      loadAdminData();
    }
  }, []);

  const loadAdminData = async () => {
    setIsLoading(true);
    setError("");
    setSuccess("");

    try {
      const [organizationResponse, roleResponse] = await Promise.all([
        getAdminOrganizations(backendBaseUrl),
        getAdminRoles(backendBaseUrl),
      ]);
      setOrganizations(organizationResponse.organizations || []);
      setRoles(roleResponse.roles || []);
      setOrgSource(organizationResponse.source || "unknown");
      setRoleSource(roleResponse.source || "unknown");
    } catch (loadError) {
      setError(loadError?.message || "Unable to load admin organization data");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateOrganization = async (event) => {
    event.preventDefault();
    setIsCreating(true);
    setError("");
    setSuccess("");
    setCreatedOrg(null);

    try {
      const response = await createAdminOrganization(
        {
          name: newOrgName,
          slug: newOrgSlug,
        },
        backendBaseUrl
      );
      setCreatedOrg(response.organization);
      setSuccess("Test organization created");
      await loadAdminData();
    } catch (createError) {
      setError(createError?.message || "Unable to create test organization");
    } finally {
      setIsCreating(false);
    }
  };

  if (!firebaseAuthFeatureEnabled) {
    return (
      <AdminShell>
        <StatusMessage
          title="Admin organization test inactive"
          message="VITE_USE_FIREBASE_AUTH is false, so this isolated admin scaffold is not active."
          tone="muted"
        />
      </AdminShell>
    );
  }

  return (
    <AdminShell>
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
          onClick={loadAdminData}
          disabled={isLoading}
        >
          {isLoading ? "Loading" : "Load organizations and roles"}
        </button>
      </section>

      {error && <StatusMessage title="Error" message={error} tone="error" />}
      {success && <StatusMessage title="Success" message={success} tone="success" />}

      <section className="mt-6 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <form
          className="rounded-lg border border-slate-200 bg-white p-5"
          onSubmit={handleCreateOrganization}
        >
          <h2 className="text-lg font-semibold">Create test organization</h2>
          <label className="mt-4 block">
            <span className="text-sm font-medium text-slate-700">Name</span>
            <input
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              value={newOrgName}
              onChange={(event) => setNewOrgName(event.target.value)}
            />
          </label>
          <label className="mt-4 block">
            <span className="text-sm font-medium text-slate-700">Slug</span>
            <input
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              value={newOrgSlug}
              onChange={(event) => setNewOrgSlug(event.target.value)}
            />
          </label>
          <button
            className="mt-5 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            type="submit"
            disabled={isCreating}
          >
            {isCreating ? "Creating" : "Create test organization"}
          </button>
          <pre className="mt-4 max-h-64 overflow-auto rounded-md bg-slate-100 p-3 text-xs">
            {createdOrg ? JSON.stringify(createdOrg, null, 2) : "No organization created yet"}
          </pre>
        </form>

        <section className="rounded-lg border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-lg font-semibold">Organizations</h2>
            <span className="rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-600">
              {orgSource}
            </span>
          </div>
          <div className="mt-4 space-y-3">
            {organizations.length ? (
              organizations.map((organization) => (
                <RecordCard key={organization.id} record={organization} />
              ))
            ) : (
              <div className="text-sm text-slate-600">No organizations loaded</div>
            )}
          </div>
        </section>
      </section>

      <section className="mt-6 rounded-lg border border-slate-200 bg-white p-5">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-lg font-semibold">Roles</h2>
          <span className="rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-600">
            {roleSource}
          </span>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {roles.length ? (
            roles.map((role) => <RecordCard key={role.id} record={role} />)
          ) : (
            <div className="text-sm text-slate-600">No roles loaded</div>
          )}
        </div>
      </section>
    </AdminShell>
  );
}

function AdminShell({ children }) {
  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10 text-slate-900">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8">
          <p className="text-sm font-medium uppercase tracking-wide text-slate-500">
            Isolated Organization Admin Test
          </p>
          <h1 className="mt-2 text-3xl font-semibold">Organizations and Roles</h1>
        </div>
        {children}
      </div>
    </main>
  );
}

function RecordCard({ record }) {
  return (
    <article className="rounded-lg border border-slate-200 bg-slate-50 p-4">
      <div className="font-semibold text-slate-900">{record.name || record.code}</div>
      <pre className="mt-2 max-h-48 overflow-auto text-xs text-slate-700">
        {JSON.stringify(record, null, 2)}
      </pre>
    </article>
  );
}

function StatusMessage({ title, message, tone }) {
  const toneClass = {
    error: "border-red-200 bg-red-50 text-red-900",
    muted: "border-slate-200 bg-white text-slate-900",
    success: "border-emerald-200 bg-emerald-50 text-emerald-900",
  }[tone];

  return (
    <section className={`mt-6 rounded-lg border px-5 py-4 ${toneClass}`}>
      <h2 className="text-base font-semibold">{title}</h2>
      <p className="mt-1 break-all text-sm">{message}</p>
    </section>
  );
}
