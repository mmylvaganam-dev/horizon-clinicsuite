import { useEffect, useState } from "react";

import { firebaseAuthFeatureEnabled } from "@/context/FirebaseSessionContext";
import { getMyProfile, updateMyProfile } from "@/lib/backendTest";


const emptyForm = {
  first_name: "",
  last_name: "",
  mobile_number: "",
  specialty_or_program: "",
  practice_address: "",
};


export default function ProfileTest() {
  const [backendBaseUrl, setBackendBaseUrl] = useState(
    import.meta.env.VITE_BACKEND_BASE_URL || "http://127.0.0.1:8000"
  );
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (firebaseAuthFeatureEnabled) {
      loadProfile();
    }
  }, []);

  const loadProfile = async () => {
    setIsLoading(true);
    setError("");
    setSuccess("");

    try {
      const response = await getMyProfile(backendBaseUrl);
      setProfile(response);
      setForm(profileToForm(response?.app_user));
    } catch (loadError) {
      setProfile(null);
      setError(loadError?.message || "Unable to load profile");
    } finally {
      setIsLoading(false);
    }
  };

  const saveProfile = async (event) => {
    event.preventDefault();
    setIsSaving(true);
    setError("");
    setSuccess("");

    try {
      const response = await updateMyProfile(form, backendBaseUrl);
      setProfile(response);
      setForm(profileToForm(response?.app_user));
      setSuccess("Profile saved");
    } catch (saveError) {
      setError(saveError?.message || "Unable to save profile");
    } finally {
      setIsSaving(false);
    }
  };

  if (!firebaseAuthFeatureEnabled) {
    return (
      <ProfileShell>
        <StatusMessage
          title="Firebase profile test inactive"
          message="VITE_USE_FIREBASE_AUTH is false, so this isolated profile flow is not active."
          tone="muted"
        />
      </ProfileShell>
    );
  }

  return (
    <ProfileShell>
      <section className="rounded-lg border border-slate-200 bg-white p-5">
        <label className="block">
          <span className="text-sm font-medium text-slate-700">Backend URL</span>
          <input
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            value={backendBaseUrl}
            onChange={(event) => setBackendBaseUrl(event.target.value)}
          />
        </label>
        <button
          className="mt-4 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          type="button"
          onClick={loadProfile}
          disabled={isLoading}
        >
          {isLoading ? "Loading profile" : "Load profile"}
        </button>
      </section>

      {error && (
        <StatusMessage title="Error" message={error} tone="error" />
      )}
      {success && (
        <StatusMessage title="Success" message={success} tone="success" />
      )}

      <section className="mt-6 grid gap-6 lg:grid-cols-[1fr_0.9fr]">
        <form
          className="rounded-lg border border-slate-200 bg-white p-5"
          onSubmit={saveProfile}
        >
          <h2 className="text-lg font-semibold">Editable profile</h2>
          <div className="mt-4 grid gap-4">
            <TextField label="First name" name="first_name" value={form.first_name} onChange={setFormValue} />
            <TextField label="Last name" name="last_name" value={form.last_name} onChange={setFormValue} />
            <TextField label="Mobile number" name="mobile_number" value={form.mobile_number} onChange={setFormValue} />
            <TextField label="Specialty or program" name="specialty_or_program" value={form.specialty_or_program} onChange={setFormValue} />
            <TextField label="Practice address" name="practice_address" value={form.practice_address} onChange={setFormValue} />
          </div>
          <button
            className="mt-5 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            type="submit"
            disabled={isSaving || isLoading}
          >
            {isSaving ? "Saving profile" : "Save profile"}
          </button>
        </form>

        <section className="rounded-lg border border-slate-200 bg-white p-5">
          <h2 className="text-lg font-semibold">Profile status</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <StatusRow label="Load state" value={isLoading ? "loading" : "idle"} />
            <StatusRow label="Save state" value={isSaving ? "saving" : "idle"} />
            <StatusRow label="Profile status" value={profile?.profile_status || "not_loaded"} />
            <StatusRow label="App user linked" value={profile?.app_user ? "yes" : "no"} />
          </dl>

          <h3 className="mt-6 text-sm font-semibold">Current profile payload</h3>
          <pre className="mt-2 max-h-96 overflow-auto rounded-md bg-slate-100 p-3 text-xs">
            {profile ? JSON.stringify(profile, null, 2) : "none"}
          </pre>
        </section>
      </section>
    </ProfileShell>
  );

  function setFormValue(name, value) {
    setForm((current) => ({ ...current, [name]: value }));
  }
}

function ProfileShell({ children }) {
  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10 text-slate-900">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8">
          <p className="text-sm font-medium uppercase tracking-wide text-slate-500">
            Isolated Firebase Profile Test
          </p>
          <h1 className="mt-2 text-3xl font-semibold">My Profile</h1>
        </div>
        {children}
      </div>
    </main>
  );
}

function TextField({ label, name, value, onChange }) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <input
        className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        value={value}
        onChange={(event) => onChange(name, event.target.value)}
      />
    </label>
  );
}

function StatusMessage({ title, message, tone }) {
  const toneClass = {
    error: "border-red-200 bg-red-50 text-red-900",
    muted: "border-slate-200 bg-white text-slate-900",
    success: "border-emerald-200 bg-emerald-50 text-emerald-900",
  }[tone];

  return (
    <section className={`mt-6 rounded-lg border px-5 py-4 ${toneClass}`}>
      <h2 className="text-base font-semibold">{title}</h2>
      <p className="mt-1 break-all text-sm">{message}</p>
    </section>
  );
}

function StatusRow({ label, value }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="font-medium text-slate-600">{label}</dt>
      <dd className="break-words text-right text-slate-900">{value}</dd>
    </div>
  );
}

function profileToForm(appUser) {
  return {
    first_name: appUser?.first_name || "",
    last_name: appUser?.last_name || "",
    mobile_number: appUser?.mobile_number || "",
    specialty_or_program: appUser?.specialty_or_program || "",
    practice_address: appUser?.practice_address || "",
  };
}
