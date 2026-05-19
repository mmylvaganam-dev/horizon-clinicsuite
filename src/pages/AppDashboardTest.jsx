import { useFirebaseSession } from "@/context/FirebaseSessionContext";


export default function AppDashboardTest() {
  const session = useFirebaseSession();

  if (!session.enabled) {
    return (
      <DashboardShell>
        <StatusBanner
          title="Firebase app dashboard inactive"
          tone="muted"
          message="VITE_USE_FIREBASE_AUTH is false, so the isolated Firebase dashboard flow is not active."
        />
        <StatusGrid session={session} />
      </DashboardShell>
    );
  }

  if (session.isLoading) {
    return (
      <DashboardShell>
        <StatusBanner
          title="Checking Firebase session"
          tone="active"
          message="Loading authentication state."
        />
      </DashboardShell>
    );
  }

  if (!session.isAuthenticated) {
    return (
      <DashboardShell>
        <StatusBanner
          title="Signed out"
          tone="warning"
          message="No Firebase user is currently authenticated for this isolated test page."
        />
        <StatusGrid session={session} />
      </DashboardShell>
    );
  }

  return (
    <DashboardShell>
      <StatusBanner
        title="Protected app dashboard test"
        tone="success"
        message="Firebase authentication is active for this isolated page."
      />

      <StatusGrid session={session} />

      <section className="mt-6 grid gap-6 lg:grid-cols-2">
        <InfoPanel title="Firebase user info">
          <DataBlock
            value={{
              uid: session.firebaseUser?.uid || null,
              email: session.firebaseUser?.email || null,
              emailVerified: session.firebaseUser?.emailVerified || false,
              displayName: session.firebaseUser?.displayName || null,
            }}
          />
        </InfoPanel>

        <InfoPanel title="Linked app user info">
          {session.isProfileLoading ? (
            <div className="text-sm text-slate-600">Loading linked app profile.</div>
          ) : (
            <DataBlock value={session.appProfile || null} />
          )}
        </InfoPanel>
      </section>

      <InfoPanel title="Protected profile response" className="mt-6">
        <DataBlock value={session.protectedProfile || null} />
      </InfoPanel>

      <InfoPanel title="Errors" className="mt-6">
        <div className="break-all text-sm text-slate-700">
          {session.profileError || "none"}
        </div>
      </InfoPanel>
    </DashboardShell>
  );
}

function DashboardShell({ children }) {
  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10 text-slate-900">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8">
          <p className="text-sm font-medium uppercase tracking-wide text-slate-500">
            Isolated Firebase Auth Test
          </p>
          <h1 className="mt-2 text-3xl font-semibold">Protected App Dashboard</h1>
        </div>
        {children}
      </div>
    </main>
  );
}

function StatusBanner({ title, message, tone }) {
  const toneClass = {
    active: "border-blue-200 bg-blue-50 text-blue-900",
    muted: "border-slate-200 bg-white text-slate-900",
    success: "border-emerald-200 bg-emerald-50 text-emerald-900",
    warning: "border-amber-200 bg-amber-50 text-amber-900",
  }[tone];

  return (
    <section className={`rounded-lg border px-5 py-4 ${toneClass}`}>
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="mt-1 text-sm">{message}</p>
    </section>
  );
}

function StatusGrid({ session }) {
  return (
    <section className="mt-6 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
      <StatusTile label="Firebase auth flow" value={session.enabled ? "active" : "inactive"} />
      <StatusTile label="Auth status" value={session.isAuthenticated ? "authenticated" : "signed_out"} />
      <StatusTile label="Profile status" value={session.profileStatus} />
      <StatusTile label="Profile loading" value={session.isProfileLoading ? "yes" : "no"} />
    </section>
  );
}

function StatusTile({ label, value }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-4 py-3">
      <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-2 break-words text-sm font-semibold text-slate-900">{value}</div>
    </div>
  );
}

function InfoPanel({ title, children, className = "" }) {
  return (
    <section className={`rounded-lg border border-slate-200 bg-white p-5 ${className}`}>
      <h2 className="text-base font-semibold">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function DataBlock({ value }) {
  return (
    <pre className="max-h-80 overflow-auto rounded-md bg-slate-100 p-3 text-xs text-slate-800">
      {value ? JSON.stringify(value, null, 2) : "none"}
    </pre>
  );
}
