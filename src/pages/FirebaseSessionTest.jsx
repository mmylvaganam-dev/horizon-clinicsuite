import { useFirebaseSession } from "@/context/FirebaseSessionContext";


export default function FirebaseSessionTest() {
  const session = useFirebaseSession();

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10 text-slate-900">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-3xl font-semibold">Firebase Session Test</h1>
        <p className="mt-3 text-sm text-slate-600">
          Isolated feature-flagged session diagnostics only. This does not
          replace Base44 auth or production login behavior.
        </p>

        <section className="mt-8 overflow-hidden rounded-lg border border-slate-200 bg-white">
          <StatusRow label="Feature flag" value={session.enabled ? "true" : "false"} />
          <StatusRow label="Loading" value={session.isLoading ? "yes" : "no"} />
          <StatusRow
            label="Firebase session visible"
            value={session.firebaseUser ? "yes" : "no"}
          />
          <StatusRow
            label="Authenticated"
            value={session.isAuthenticated ? "yes" : "no"}
          />
          <StatusRow
            label="Protected profile fetched"
            value={session.protectedProfile ? "yes" : "no"}
          />
          <StatusRow label="Profile status" value={session.profileStatus} />

          <div className="border-b border-slate-100 px-5 py-4">
            <div className="font-medium">Firebase user</div>
            <pre className="mt-2 max-h-64 overflow-auto rounded-md bg-slate-100 p-3 text-xs">
              {session.firebaseUser
                ? JSON.stringify(
                    {
                      uid: session.firebaseUser.uid,
                      email: session.firebaseUser.email,
                      emailVerified: session.firebaseUser.emailVerified,
                    },
                    null,
                    2
                  )
                : "none"}
            </pre>
          </div>

          <div className="border-b border-slate-100 px-5 py-4">
            <div className="font-medium">Protected profile</div>
            <pre className="mt-2 max-h-64 overflow-auto rounded-md bg-slate-100 p-3 text-xs">
              {session.protectedProfile
                ? JSON.stringify(session.protectedProfile, null, 2)
                : "none"}
            </pre>
          </div>

          <div className="px-5 py-4">
            <div className="font-medium">Error</div>
            <div className="mt-1 break-all text-sm text-slate-700">
              {session.profileError || "none"}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function StatusRow({ label, value }) {
  return (
    <div className="flex justify-between border-b border-slate-100 px-5 py-4">
      <span className="font-medium">{label}</span>
      <span>{value}</span>
    </div>
  );
}
