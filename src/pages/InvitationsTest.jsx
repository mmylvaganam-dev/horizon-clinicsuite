import { useEffect, useState } from "react";

import { firebaseAuthFeatureEnabled } from "@/context/FirebaseSessionContext";
import {
  acceptInvitation,
  createInvitation,
  listInvitations,
} from "@/lib/backendTest";


export default function InvitationsTest() {
  const [backendBaseUrl, setBackendBaseUrl] = useState(
    import.meta.env.VITE_BACKEND_BASE_URL || "http://127.0.0.1:8000"
  );
  const [inviteForm, setInviteForm] = useState({
    invited_email: "invited@example.com",
    invited_role: "staff",
  });
  const [acceptToken, setAcceptToken] = useState("placeholder-invitation-token");
  const [invitations, setInvitations] = useState([]);
  const [source, setSource] = useState("not_loaded");
  const [createResult, setCreateResult] = useState(null);
  const [acceptResult, setAcceptResult] = useState(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (firebaseAuthFeatureEnabled) {
      loadInvitations();
    }
  }, []);

  const loadInvitations = async () => {
    setIsLoading(true);
    setError("");

    try {
      const response = await listInvitations(backendBaseUrl);
      setInvitations(response.invitations || []);
      setSource(response.source || "unknown");
    } catch (loadError) {
      setInvitations([]);
      setSource("error");
      setError(loadError?.message || "Unable to list invitations");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = async (event) => {
    event.preventDefault();
    setIsLoading(true);
    setError("");
    setCreateResult(null);

    try {
      const response = await createInvitation(inviteForm, backendBaseUrl);
      setCreateResult(response);
      setAcceptToken(response.invitation?.token || acceptToken);
      await loadInvitations();
    } catch (createError) {
      setError(createError?.message || "Unable to create invitation");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAccept = async (event) => {
    event.preventDefault();
    setIsLoading(true);
    setError("");
    setAcceptResult(null);

    try {
      const response = await acceptInvitation(acceptToken, backendBaseUrl);
      setAcceptResult(response);
      await loadInvitations();
    } catch (acceptError) {
      setError(acceptError?.message || "Unable to accept invitation");
    } finally {
      setIsLoading(false);
    }
  };

  if (!firebaseAuthFeatureEnabled) {
    return (
      <InvitationShell>
        <StatusMessage
          title="Invitations test inactive"
          message="VITE_USE_FIREBASE_AUTH is false, so this isolated invitation flow is not active."
          tone="muted"
        />
      </InvitationShell>
    );
  }

  return (
    <InvitationShell>
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

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="rounded-lg border border-slate-200 bg-white p-5">
          <h2 className="text-lg font-semibold">Create invitation</h2>
          <form className="mt-4 space-y-4" onSubmit={handleCreate}>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Invited email</span>
              <input
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                type="email"
                value={inviteForm.invited_email}
                onChange={(event) =>
                  setInviteForm((current) => ({
                    ...current,
                    invited_email: event.target.value,
                  }))
                }
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Role</span>
              <select
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                value={inviteForm.invited_role}
                onChange={(event) =>
                  setInviteForm((current) => ({
                    ...current,
                    invited_role: event.target.value,
                  }))
                }
              >
                <option value="admin">admin</option>
                <option value="provider">provider</option>
                <option value="staff">staff</option>
                <option value="viewer">viewer</option>
              </select>
            </label>
            <button
              className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              type="submit"
              disabled={isLoading}
            >
              {isLoading ? "Working" : "Create invitation"}
            </button>
          </form>
          <ResultBlock result={createResult} />
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-5">
          <h2 className="text-lg font-semibold">Accept invitation</h2>
          <form className="mt-4 space-y-4" onSubmit={handleAccept}>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Token</span>
              <input
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                value={acceptToken}
                onChange={(event) => setAcceptToken(event.target.value)}
              />
            </label>
            <button
              className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              type="submit"
              disabled={isLoading}
            >
              {isLoading ? "Working" : "Accept invitation"}
            </button>
          </form>
          <ResultBlock result={acceptResult} />
        </section>
      </div>

      <section className="mt-6 rounded-lg border border-slate-200 bg-white p-5">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-lg font-semibold">Invitations</h2>
          <div className="flex items-center gap-3">
            <span className="rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-600">
              {source}
            </span>
            <button
              className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 disabled:opacity-50"
              type="button"
              onClick={loadInvitations}
              disabled={isLoading}
            >
              Refresh
            </button>
          </div>
        </div>

        <div className="mt-4 overflow-hidden rounded-lg border border-slate-200">
          <div className="grid grid-cols-[1.2fr_0.7fr_0.7fr_1fr] gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <div>Email</div>
            <div>Role</div>
            <div>Status</div>
            <div>Token</div>
          </div>
          {invitations.length ? (
            invitations.map((invitation) => (
              <article
                className="grid gap-3 border-b border-slate-100 px-4 py-3 text-sm last:border-b-0 md:grid-cols-[1.2fr_0.7fr_0.7fr_1fr]"
                key={invitation.id}
              >
                <div className="break-all font-medium text-slate-900">
                  {invitation.invited_email}
                </div>
                <div className="text-slate-700">{invitation.invited_role}</div>
                <div className="text-slate-700">{invitation.status}</div>
                <div className="break-all text-slate-700">{invitation.token}</div>
              </article>
            ))
          ) : (
            <div className="px-4 py-6 text-sm text-slate-600">No invitations loaded</div>
          )}
        </div>
      </section>
    </InvitationShell>
  );
}

function InvitationShell({ children }) {
  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10 text-slate-900">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8">
          <p className="text-sm font-medium uppercase tracking-wide text-slate-500">
            Isolated Invitations Test
          </p>
          <h1 className="mt-2 text-3xl font-semibold">Invitation Management</h1>
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

function ResultBlock({ result }) {
  if (!result) {
    return null;
  }

  return (
    <pre className="mt-4 max-h-72 overflow-auto rounded-md bg-slate-100 p-3 text-xs text-slate-700">
      {JSON.stringify(result, null, 2)}
    </pre>
  );
}
