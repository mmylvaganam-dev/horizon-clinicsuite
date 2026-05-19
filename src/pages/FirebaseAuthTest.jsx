import { useEffect, useRef, useState } from "react";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";

import { firebaseAuth } from "@/lib/firebase";


const initialResult = {
  signup: "not_run",
  login: "not_run",
  logout: "not_run",
  error: "",
};

function makeTestEmail() {
  return `firebase-auth-test-${Date.now()}@example.com`;
}

export default function FirebaseAuthTest() {
  const [email, setEmail] = useState(makeTestEmail);
  const [password, setPassword] = useState("FirebaseTest123!");
  const [currentUser, setCurrentUser] = useState(null);
  const [result, setResult] = useState(initialResult);
  const [isRunning, setIsRunning] = useState(false);
  const hasAutoRun = useRef(false);

  useEffect(() => {
    if (!firebaseAuth) {
      return undefined;
    }

    return onAuthStateChanged(firebaseAuth, (user) => {
      setCurrentUser(user);
    });
  }, []);

  useEffect(() => {
    if (hasAutoRun.current || !window.location.search.includes("autorun=1")) {
      return;
    }

    hasAutoRun.current = true;
    runFullAuthTest();
  }, []);

  const setError = (error) => {
    setResult((previous) => ({
      ...previous,
      error: error?.message || "Unknown Firebase Auth error",
    }));
  };

  const runFullAuthTest = async () => {
    if (!firebaseAuth) {
      setError(new Error("Firebase Auth is not initialized"));
      return;
    }

    const generatedEmail = makeTestEmail();
    const testPassword = "FirebaseTest123!";
    setEmail(generatedEmail);
    setPassword(testPassword);
    setIsRunning(true);
    setResult({
      signup: "running",
      login: "not_run",
      logout: "not_run",
      error: "",
    });

    try {
      await createUserWithEmailAndPassword(
        firebaseAuth,
        generatedEmail,
        testPassword
      );
      setResult((previous) => ({ ...previous, signup: "success" }));

      setResult((previous) => ({ ...previous, logout: "running" }));
      await signOut(firebaseAuth);
      setResult((previous) => ({ ...previous, logout: "success" }));

      setResult((previous) => ({ ...previous, login: "running" }));
      await signInWithEmailAndPassword(firebaseAuth, generatedEmail, testPassword);
      setResult((previous) => ({ ...previous, login: "success" }));
    } catch (error) {
      setResult((previous) => ({
        ...previous,
        [previous.signup === "running" ? "signup" : previous.logout === "running" ? "logout" : "login"]: "failed",
      }));
      setError(error);
    } finally {
      setIsRunning(false);
    }
  };

  const handleSignup = async () => {
    if (!firebaseAuth) {
      setError(new Error("Firebase Auth is not initialized"));
      return;
    }

    setIsRunning(true);
    setResult((previous) => ({ ...previous, signup: "running", error: "" }));

    try {
      await createUserWithEmailAndPassword(firebaseAuth, email, password);
      setResult((previous) => ({ ...previous, signup: "success" }));
    } catch (error) {
      setResult((previous) => ({ ...previous, signup: "failed" }));
      setError(error);
    } finally {
      setIsRunning(false);
    }
  };

  const handleLogin = async () => {
    if (!firebaseAuth) {
      setError(new Error("Firebase Auth is not initialized"));
      return;
    }

    setIsRunning(true);
    setResult((previous) => ({ ...previous, login: "running", error: "" }));

    try {
      await signInWithEmailAndPassword(firebaseAuth, email, password);
      setResult((previous) => ({ ...previous, login: "success" }));
    } catch (error) {
      setResult((previous) => ({ ...previous, login: "failed" }));
      setError(error);
    } finally {
      setIsRunning(false);
    }
  };

  const handleLogout = async () => {
    if (!firebaseAuth) {
      setError(new Error("Firebase Auth is not initialized"));
      return;
    }

    setIsRunning(true);
    setResult((previous) => ({ ...previous, logout: "running", error: "" }));

    try {
      await signOut(firebaseAuth);
      setResult((previous) => ({ ...previous, logout: "success" }));
    } catch (error) {
      setResult((previous) => ({ ...previous, logout: "failed" }));
      setError(error);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10 text-slate-900">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-3xl font-semibold">Firebase Auth Test</h1>
        <p className="mt-3 text-sm text-slate-600">
          This isolated page tests Firebase Auth only. It does not replace
          Base44 auth, upload files, or connect patient data.
        </p>

        <section className="mt-8 space-y-4 rounded-lg border border-slate-200 bg-white p-5">
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Email</span>
            <input
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-700">Password</span>
            <input
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>

          <div className="flex flex-wrap gap-3">
            <button
              className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              type="button"
              onClick={handleSignup}
              disabled={isRunning}
            >
              Signup test
            </button>
            <button
              className="rounded-md bg-slate-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              type="button"
              onClick={handleLogin}
              disabled={isRunning}
            >
              Login test
            </button>
            <button
              className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 disabled:opacity-50"
              type="button"
              onClick={handleLogout}
              disabled={isRunning}
            >
              Logout
            </button>
            <button
              className="rounded-md border border-slate-900 px-4 py-2 text-sm font-medium text-slate-900 disabled:opacity-50"
              type="button"
              onClick={runFullAuthTest}
              disabled={isRunning}
            >
              Run full auth test
            </button>
          </div>
        </section>

        <section className="mt-6 overflow-hidden rounded-lg border border-slate-200 bg-white">
          <div className="flex justify-between border-b border-slate-100 px-5 py-4">
            <span className="font-medium">Firebase Auth</span>
            <span>{firebaseAuth ? "initialized" : "not initialized"}</span>
          </div>
          <div className="flex justify-between border-b border-slate-100 px-5 py-4">
            <span className="font-medium">Signup</span>
            <span>{result.signup}</span>
          </div>
          <div className="flex justify-between border-b border-slate-100 px-5 py-4">
            <span className="font-medium">Login</span>
            <span>{result.login}</span>
          </div>
          <div className="flex justify-between border-b border-slate-100 px-5 py-4">
            <span className="font-medium">Logout</span>
            <span>{result.logout}</span>
          </div>
          <div className="border-b border-slate-100 px-5 py-4">
            <div className="font-medium">Current user</div>
            <div className="mt-1 break-all text-sm text-slate-700">
              {currentUser ? currentUser.email : "none"}
            </div>
          </div>
          <div className="px-5 py-4">
            <div className="font-medium">Error</div>
            <div className="mt-1 break-all text-sm text-slate-700">
              {result.error || "none"}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
