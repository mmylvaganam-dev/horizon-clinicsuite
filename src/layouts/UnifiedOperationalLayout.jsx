import { useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { signOut } from "firebase/auth";
import { LogOut, Menu, X } from "lucide-react";

import { useFirebaseSession } from "@/context/FirebaseSessionContext";
import { firebaseAuth } from "@/lib/firebase";
import { modulesForArea } from "@/lib/operationalModules";


const areaLabels = {
  admin: "Admin",
  provider: "Provider",
  viewer: "Viewer",
};


export default function UnifiedOperationalLayout({ area, children }) {
  const session = useFirebaseSession();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [logoutError, setLogoutError] = useState("");
  const modules = modulesForArea(area);

  const userName =
    session.appProfile?.name ||
    session.firebaseUser?.displayName ||
    session.firebaseUser?.email ||
    "Firebase user";

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

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 lg:hidden">
        <button
          aria-label="Open navigation"
          className="rounded-md border border-slate-200 p-2"
          type="button"
          onClick={() => setIsSidebarOpen(true)}
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="min-w-0 px-3 text-center">
          <div className="truncate text-sm font-semibold">Horizon {areaLabels[area]}</div>
          <div className="truncate text-xs text-slate-500">{userName}</div>
        </div>
        <button
          aria-label="Sign out"
          className="rounded-md border border-slate-200 p-2"
          type="button"
          onClick={handleLogout}
        >
          <LogOut className="h-5 w-5" />
        </button>
      </header>

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
            <Link to={`/app/${area}/dashboard`}>
              <div className="text-sm font-semibold">Horizon</div>
              <div className="text-xs text-slate-500">{areaLabels[area]} platform</div>
            </Link>
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
            {modules.map((module) => (
              <NavLink
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-md px-3 py-2 text-sm ${
                    isActive
                      ? "bg-slate-900 text-white"
                      : "text-slate-700 hover:bg-slate-100"
                  }`
                }
                key={module.key}
                to={`/app/${area}/${module.key}`}
                onClick={() => setIsSidebarOpen(false)}
              >
                <module.icon className="h-4 w-4" />
                <span>{module.label}</span>
              </NavLink>
            ))}
          </nav>

          <div className="border-t border-slate-200 p-4">
            <div className="rounded-lg bg-slate-50 p-3">
              <div className="truncate text-sm font-semibold">{userName}</div>
              <div className="truncate text-xs text-slate-500">
                {session.firebaseUser?.email || "No email"}
              </div>
              <div className="mt-2 text-xs text-slate-500">
                Profile: {session.profileStatus}
              </div>
              <button
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
                type="button"
                onClick={handleLogout}
              >
                <LogOut className="h-4 w-4" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </aside>

      <div className="lg:pl-72">
        <header className="hidden h-16 items-center justify-between border-b border-slate-200 bg-white px-6 lg:flex">
          <div>
            <div className="text-sm font-semibold">Horizon {areaLabels[area]}</div>
            <div className="text-xs text-slate-500">Unified operational app shell</div>
          </div>
          <div className="text-right">
            <div className="text-sm font-semibold">{userName}</div>
            <div className="text-xs text-slate-500">{session.firebaseUser?.email}</div>
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
