import { useState } from "react";
import { signOut } from "firebase/auth";
import {
  Building2,
  Home,
  LogOut,
  Menu,
  ShieldCheck,
  User,
  X,
} from "lucide-react";

import {
  firebaseAuthFeatureEnabled,
  useFirebaseSession,
} from "@/context/FirebaseSessionContext";
import { firebaseAuth } from "@/lib/firebase";


const navigationItems = [
  { label: "Home", icon: Home, status: "ready" },
  { label: "Profile", icon: User, status: "scaffold" },
  { label: "Access", icon: ShieldCheck, status: "scaffold" },
];


export default function ProtectedAppLayout({ children, title = "Horizon App" }) {
  const session = useFirebaseSession();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [logoutError, setLogoutError] = useState("");

  const userName =
    session.appProfile?.name ||
    session.firebaseUser?.displayName ||
    session.firebaseUser?.email ||
    "Firebase user";
  const organizationName = "Organization pending";

  const handleLogout = async () => {
    setLogoutError("");

    try {
      if (firebaseAuth) {
        await signOut(firebaseAuth);
      }
    } catch (error) {
      setLogoutError(error?.message || "Unable to sign out");
    }
  };

  if (!firebaseAuthFeatureEnabled || !session.enabled) {
    return (
      <ShellMessage
        title="Independent app shell inactive"
        message="VITE_USE_FIREBASE_AUTH is false, so this protected app shell is not active."
      />
    );
  }

  if (session.isLoading) {
    return (
      <ShellMessage
        title="Loading secure session"
        message="Checking Firebase authentication state."
      />
    );
  }

  if (!session.isAuthenticated) {
    return (
      <ShellMessage
        title="Signed out"
        message="Sign in with Firebase to view the independent Horizon app shell."
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="lg:hidden">
        <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4">
          <button
            aria-label="Open navigation"
            className="rounded-md border border-slate-200 p-2 text-slate-700"
            type="button"
            onClick={() => setIsSidebarOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="min-w-0 px-3 text-center">
            <div className="truncate text-sm font-semibold">{title}</div>
            <div className="truncate text-xs text-slate-500">{userName}</div>
          </div>
          <button
            aria-label="Sign out"
            className="rounded-md border border-slate-200 p-2 text-slate-700"
            type="button"
            onClick={handleLogout}
          >
            <LogOut className="h-5 w-5" />
          </button>
        </header>
      </div>

      {isSidebarOpen && (
        <button
          aria-label="Close navigation overlay"
          className="fixed inset-0 z-30 bg-slate-900/30 lg:hidden"
          type="button"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 w-72 border-r border-slate-200 bg-white transition-transform lg:translate-x-0 ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-full flex-col">
          <div className="flex h-16 items-center justify-between border-b border-slate-200 px-5">
            <div>
              <div className="text-sm font-semibold">Horizon</div>
              <div className="text-xs text-slate-500">Independent shell</div>
            </div>
            <button
              aria-label="Close navigation"
              className="rounded-md p-2 text-slate-500 lg:hidden"
              type="button"
              onClick={() => setIsSidebarOpen(false)}
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <nav className="flex-1 space-y-1 px-3 py-4">
            {navigationItems.map((item) => (
              <button
                key={item.label}
                className="flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100"
                type="button"
              >
                <span className="flex items-center gap-3">
                  <item.icon className="h-4 w-4 text-slate-500" />
                  <span>{item.label}</span>
                </span>
                <span className="text-xs text-slate-400">{item.status}</span>
              </button>
            ))}
          </nav>

          <div className="border-t border-slate-200 p-4">
            <div className="rounded-lg bg-slate-50 p-3">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white">
                  {initialsFor(userName)}
                </div>
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold">{userName}</div>
                  <div className="truncate text-xs text-slate-500">
                    {session.firebaseUser?.email || "No email"}
                  </div>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
                <Building2 className="h-4 w-4" />
                <span>{organizationName}</span>
              </div>
              <button
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
                type="button"
                onClick={handleLogout}
              >
                <LogOut className="h-4 w-4" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      </aside>

      <div className="lg:pl-72">
        <header className="hidden h-16 items-center justify-between border-b border-slate-200 bg-white px-6 lg:flex">
          <div>
            <div className="text-sm font-semibold">{title}</div>
            <div className="text-xs text-slate-500">{organizationName}</div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-sm font-semibold">{userName}</div>
              <div className="text-xs text-slate-500">{session.profileStatus}</div>
            </div>
            <button
              className="flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
              type="button"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4" />
              <span>Logout</span>
            </button>
          </div>
        </header>

        <main className="px-4 py-6 sm:px-6 lg:px-8">
          {logoutError && (
            <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
              {logoutError}
            </div>
          )}
          {children}
        </main>
      </div>
    </div>
  );
}

function ShellMessage({ title, message }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6 text-slate-900">
      <section className="w-full max-w-lg rounded-lg border border-slate-200 bg-white p-6 text-center">
        <h1 className="text-xl font-semibold">{title}</h1>
        <p className="mt-2 text-sm text-slate-600">{message}</p>
      </section>
    </main>
  );
}

function initialsFor(name) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "HU";
}
