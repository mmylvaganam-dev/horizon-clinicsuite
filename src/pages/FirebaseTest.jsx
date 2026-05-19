import firebaseApp, {
  firebaseAuth,
  firebaseConfigured,
  firebaseStorage,
} from "@/lib/firebase";


const checks = [
  {
    label: "Firebase config",
    initialized: firebaseConfigured,
  },
  {
    label: "Firebase app",
    initialized: Boolean(firebaseApp),
  },
  {
    label: "Firebase Auth",
    initialized: Boolean(firebaseAuth),
  },
  {
    label: "Firebase Storage",
    initialized: Boolean(firebaseStorage),
  },
];

export default function FirebaseTest() {
  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10 text-slate-900">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-3xl font-semibold">Firebase Connectivity Test</h1>
        <p className="mt-3 text-sm text-slate-600">
          This isolated page checks local Firebase client initialization only. It
          does not replace Base44 login, upload files, or connect patient data.
        </p>

        <div className="mt-8 overflow-hidden rounded-lg border border-slate-200 bg-white">
          {checks.map((check) => (
            <div
              key={check.label}
              className="flex items-center justify-between border-b border-slate-100 px-5 py-4 last:border-b-0"
            >
              <span className="font-medium">{check.label}</span>
              <span
                className={
                  check.initialized
                    ? "text-sm font-semibold text-emerald-700"
                    : "text-sm font-semibold text-amber-700"
                }
              >
                {check.initialized ? "initialized" : "not initialized"}
              </span>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
