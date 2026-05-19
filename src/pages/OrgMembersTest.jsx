import { useEffect, useState } from "react";

import { firebaseAuthFeatureEnabled } from "@/context/FirebaseSessionContext";
import {
  addOrgMember,
  listOrgMembers,
  updateOrgMemberStatus,
} from "@/lib/backendTest";


export default function OrgMembersTest() {
  const [backendBaseUrl, setBackendBaseUrl] = useState(
    import.meta.env.VITE_BACKEND_BASE_URL || "http://127.0.0.1:8000"
  );
  const [memberForm, setMemberForm] = useState({
    organization_id: "",
    user_id: "22222222-2222-4222-8222-222222222222",
    role: "staff",
    status: "active",
  });
  const [statusForm, setStatusForm] = useState({
    id: "placeholder-org-member-admin",
    status: "inactive",
  });
  const [members, setMembers] = useState([]);
  const [source, setSource] = useState("not_loaded");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (firebaseAuthFeatureEnabled) {
      loadMembers();
    }
  }, []);

  const loadMembers = async () => {
    setIsLoading(true);
    setError("");

    try {
      const response = await listOrgMembers(backendBaseUrl);
      setMembers(response.members || []);
      setSource(response.source || "unknown");
    } catch (loadError) {
      setMembers([]);
      setSource("error");
      setError(loadError?.message || "Unable to list organization members");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddMember = async (event) => {
    event.preventDefault();
    setIsLoading(true);
    setError("");
    setResult(null);

    try {
      const payload = {
        ...memberForm,
        organization_id: memberForm.organization_id || undefined,
      };
      const response = await addOrgMember(payload, backendBaseUrl);
      setResult(response);
      setStatusForm((current) => ({
        ...current,
        id: response.member?.id || current.id,
      }));
      await loadMembers();
    } catch (addError) {
      setError(addError?.message || "Unable to add organization member");
    } finally {
      setIsLoading(false);
    }
  };

  const handleStatusUpdate = async (event) => {
    event.preventDefault();
    setIsLoading(true);
    setError("");
    setResult(null);

    try {
      const response = await updateOrgMemberStatus(statusForm, backendBaseUrl);
      setResult(response);
      await loadMembers();
    } catch (updateError) {
      setError(updateError?.message || "Unable to update organization member status");
    } finally {
      setIsLoading(false);
    }
  };

  if (!firebaseAuthFeatureEnabled) {
    return (
      <OrgMembersShell>
        <StatusMessage
          title="Organization members test inactive"
          message="VITE_USE_FIREBASE_AUTH is false, so this isolated membership flow is not active."
          tone="muted"
        />
      </OrgMembersShell>
    );
  }

  return (
    <OrgMembersShell>
      <section className="rounded-lg border border-slate-200 bg-white p-5">
        <label className="block">
          <span className="text-sm font-medium text-slate-700">Backend URL</span>
          <input
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            value={backendBaseUrl}
            onChange={(event) => setBackendBaseUrl(event.target.value)}
          />
        </label>
      </section>

      {error && <StatusMessage title="Error" message={error} tone="error" />}

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <section className="rounded-lg border border-slate-200 bg-white p-5">
          <h2 className="text-lg font-semibold">Add test member</h2>
          <form className="mt-4 space-y-4" onSubmit={handleAddMember}>
            <TextField
              label="Organization ID"
              placeholder="Optional in placeholder mode"
              value={memberForm.organization_id}
              onChange={(value) => setMemberForm((current) => ({ ...current, organization_id: value }))}
            />
            <TextField
              label="User ID"
              value={memberForm.user_id}
              onChange={(value) => setMemberForm((current) => ({ ...current, user_id: value }))}
            />
            <SelectField
              label="Role"
              value={memberForm.role}
              options={["admin", "provider", "staff", "viewer"]}
              onChange={(value) => setMemberForm((current) => ({ ...current, role: value }))}
            />
            <SelectField
              label="Status"
              value={memberForm.status}
              options={["pending", "active", "inactive"]}
              onChange={(value) => setMemberForm((current) => ({ ...current, status: value }))}
            />
            <PrimaryButton disabled={isLoading}>
              {isLoading ? "Working" : "Add member"}
            </PrimaryButton>
          </form>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-5">
          <h2 className="text-lg font-semibold">Activate or deactivate</h2>
          <form className="mt-4 space-y-4" onSubmit={handleStatusUpdate}>
            <TextField
              label="Member ID"
              value={statusForm.id}
              onChange={(value) => setStatusForm((current) => ({ ...current, id: value }))}
            />
            <SelectField
              label="Status"
              value={statusForm.status}
              options={["pending", "active", "inactive"]}
              onChange={(value) => setStatusForm((current) => ({ ...current, status: value }))}
            />
            <PrimaryButton disabled={isLoading}>
              {isLoading ? "Working" : "Update status"}
            </PrimaryButton>
          </form>
        </section>
      </div>

      {result && (
        <pre className="mt-6 max-h-72 overflow-auto rounded-md bg-slate-900 p-4 text-xs text-white">
          {JSON.stringify(result, null, 2)}
        </pre>
      )}

      <section className="mt-6 rounded-lg border border-slate-200 bg-white p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">Organization members</h2>
            <p className="mt-1 text-sm text-slate-600">
              Admin can add/update. Provider, staff, and viewer can list.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-600">
              {source}
            </span>
            <button
              className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 disabled:opacity-50"
              type="button"
              onClick={loadMembers}
              disabled={isLoading}
            >
              Refresh
            </button>
          </div>
        </div>

        <div className="mt-4 overflow-hidden rounded-lg border border-slate-200">
          <div className="grid grid-cols-[1fr_1fr_0.7fr_0.7fr] gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <div>User</div>
            <div>Organization</div>
            <div>Role</div>
            <div>Status</div>
          </div>
          {members.length ? (
            members.map((member) => (
              <article
                className="grid gap-3 border-b border-slate-100 px-4 py-3 text-sm last:border-b-0 md:grid-cols-[1fr_1fr_0.7fr_0.7fr]"
                key={member.id}
              >
                <div className="break-all font-medium text-slate-900">{member.user_id}</div>
                <div className="break-all text-slate-700">{member.organization_id || "none"}</div>
                <div className="text-slate-700">{member.role}</div>
                <div className="text-slate-700">{member.status}</div>
              </article>
            ))
          ) : (
            <div className="px-4 py-6 text-sm text-slate-600">No members loaded</div>
          )}
        </div>
      </section>
    </OrgMembersShell>
  );
}

function OrgMembersShell({ children }) {
  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10 text-slate-900">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8">
          <p className="text-sm font-medium uppercase tracking-wide text-slate-500">
            Isolated Organization Members Test
          </p>
          <h1 className="mt-2 text-3xl font-semibold">Organization Membership</h1>
        </div>
        {children}
      </div>
    </main>
  );
}

function TextField({ label, value, onChange, placeholder = "" }) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <input
        className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function SelectField({ label, value, options, onChange }) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <select
        className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function PrimaryButton({ children, disabled }) {
  return (
    <button
      className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      type="submit"
      disabled={disabled}
    >
      {children}
    </button>
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
