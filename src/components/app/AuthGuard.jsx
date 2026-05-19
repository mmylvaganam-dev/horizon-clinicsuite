import {
  firebaseAuthFeatureEnabled,
  useFirebaseSession,
} from "@/context/FirebaseSessionContext";
import { AppLoadingState, AppEmptyState } from "@/components/app/AppStates";


export default function AuthGuard({ children }) {
  const session = useFirebaseSession();

  if (!firebaseAuthFeatureEnabled || !session.enabled) {
    return (
      <GuardShell>
        <AppEmptyState
          title="Operational app inactive"
          message="VITE_USE_FIREBASE_AUTH is false, so the unified operational app is not active."
        />
      </GuardShell>
    );
  }

  if (session.isLoading) {
    return (
      <GuardShell>
        <AppLoadingState message="Checking Firebase session" />
      </GuardShell>
    );
  }

  if (!session.isAuthenticated) {
    return (
      <GuardShell>
        <AppEmptyState
          title="Signed out"
          message="Sign in with Firebase to access the isolated operational app."
        />
      </GuardShell>
    );
  }

  return children;
}


function GuardShell({ children }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6 text-slate-900">
      <div className="w-full max-w-xl">{children}</div>
    </main>
  );
}
