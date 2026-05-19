import { useEffect, useMemo, useState } from "react";

import AuthGuard from "@/components/app/AuthGuard";
import {
  AppEmptyState,
  AppErrorState,
  AppLoadingState,
} from "@/components/app/AppStates";
import { getRbacMe } from "@/lib/backendTest";
import { normalizeApiError } from "@/lib/apiError";


export default function RbacRouteGuard({ allowedRoles, children }) {
  const [rbacContext, setRbacContext] = useState(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isCurrent = true;
    setIsLoading(true);
    setError("");

    getRbacMe()
      .then((context) => {
        if (isCurrent) {
          setRbacContext(context);
        }
      })
      .catch((loadError) => {
        if (isCurrent) {
          setError(normalizeApiError(loadError, "Unable to load RBAC context"));
          setRbacContext(null);
        }
      })
      .finally(() => {
        if (isCurrent) {
          setIsLoading(false);
        }
      });

    return () => {
      isCurrent = false;
    };
  }, []);

  const hasAllowedRole = useMemo(() => {
    const currentRoles = new Set(rbacContext?.roles || []);
    return allowedRoles.some((role) => currentRoles.has(role));
  }, [allowedRoles, rbacContext]);

  return (
    <AuthGuard>
      {isLoading ? (
        <GuardShell>
          <AppLoadingState message="Loading role permissions" />
        </GuardShell>
      ) : error ? (
        <GuardShell>
          <AppErrorState title="Role check failed" message={error} />
        </GuardShell>
      ) : hasAllowedRole ? (
        children
      ) : (
        <GuardShell>
          <AppEmptyState
            title="Access unavailable"
            message="Your current role does not have access to this operational area."
          />
        </GuardShell>
      )}
    </AuthGuard>
  );
}


function GuardShell({ children }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6 text-slate-900">
      <div className="w-full max-w-xl">{children}</div>
    </main>
  );
}
