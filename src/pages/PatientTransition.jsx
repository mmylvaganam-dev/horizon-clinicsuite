import { useEffect, useMemo, useState } from "react";

import { firebaseAuthFeatureEnabled } from "@/context/FirebaseSessionContext";
import {
  createTransitionPatient,
  createTransitionPatientVisit,
  listTransitionPatientVisits,
  listTransitionPatients,
} from "@/lib/backendTest";


export default function PatientTransition() {
  const [backendBaseUrl, setBackendBaseUrl] = useState(
    import.meta.env.VITE_BACKEND_BASE_URL || "http://127.0.0.1:8000"
  );
  const [query, setQuery] = useState("");
  const [patients, setPatients] = useState([]);
  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [visits, setVisits] = useState([]);
  const [patientForm, setPatientForm] = useState({
    full_name: "",
    date_of_birth: "",
    gender: "",
    phone: "",
    email: "",
    address: "",
  });
  const [visitForm, setVisitForm] = useState({
    visit_date: new Date().toISOString().slice(0, 10),
    reason: "",
    notes: "",
  });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isBusy, setIsBusy] = useState(false);

  const selectedPatient = useMemo(
    () => patients.find((patient) => patient.id === selectedPatientId),
    [patients, selectedPatientId]
  );

  useEffect(() => {
    if (firebaseAuthFeatureEnabled) {
      loadPatients();
    }
  }, []);

  useEffect(() => {
    if (selectedPatientId) {
      loadVisits(selectedPatientId);
    } else {
      setVisits([]);
    }
  }, [selectedPatientId]);

  const loadPatients = async (searchQuery = query) => {
    setIsBusy(true);
    setError("");
    setMessage("");
    try {
      const response = await listTransitionPatients(searchQuery, backendBaseUrl);
      const loadedPatients = response.patients || [];
      setPatients(loadedPatients);
      if (!selectedPatientId && loadedPatients[0]?.id) {
        setSelectedPatientId(loadedPatients[0].id);
      }
    } catch (loadError) {
      setError(loadError?.message || "Unable to load patients");
    } finally {
      setIsBusy(false);
    }
  };

  const loadVisits = async (patientId) => {
    setError("");
    try {
      const response = await listTransitionPatientVisits(patientId, backendBaseUrl);
      setVisits(response.visits || []);
    } catch (visitError) {
      setError(visitError?.message || "Unable to load visits");
    }
  };

  const handleCreatePatient = async (event) => {
    event.preventDefault();
    setIsBusy(true);
    setError("");
    setMessage("");
    try {
      const response = await createTransitionPatient(patientForm, backendBaseUrl);
      setMessage(`Patient saved: ${response.patient?.full_name}`);
      setPatientForm({
        full_name: "",
        date_of_birth: "",
        gender: "",
        phone: "",
        email: "",
        address: "",
      });
      await loadPatients("");
      if (response.patient?.id) {
        setSelectedPatientId(response.patient.id);
      }
    } catch (patientError) {
      setError(patientError?.message || "Unable to save patient");
    } finally {
      setIsBusy(false);
    }
  };

  const handleCreateVisit = async (event) => {
    event.preventDefault();
    if (!selectedPatientId) {
      setError("Select a patient first");
      return;
    }
    setIsBusy(true);
    setError("");
    setMessage("");
    try {
      const response = await createTransitionPatientVisit(
        {
          patient_id: selectedPatientId,
          visit_date: visitForm.visit_date,
          reason: visitForm.reason,
          notes: visitForm.notes,
        },
        backendBaseUrl
      );
      setMessage(`Visit saved: ${response.visit?.visit_date}`);
      setVisitForm({
        visit_date: new Date().toISOString().slice(0, 10),
        reason: "",
        notes: "",
      });
      await loadVisits(selectedPatientId);
    } catch (visitError) {
      setError(visitError?.message || "Unable to save visit");
    } finally {
      setIsBusy(false);
    }
  };

  if (!firebaseAuthFeatureEnabled) {
    return (
      <PageShell>
        <StatusMessage title="Patient transition inactive" message="Firebase auth feature flag is not enabled." tone="muted" />
      </PageShell>
    );
  }

  return (
    <PageShell>
      <section className="rounded-lg border border-sky-200 bg-sky-50 p-5 text-sm text-sky-950">
        <div className="font-semibold">Sri Lanka patient transition register</div>
        <div className="mt-1">
          Use this for the urgent low-complexity patient list and one-visit workflow. Attachments, labs, billing, and full EMR migration stay separate.
        </div>
      </section>

      <section className="mt-6 rounded-lg border border-slate-200 bg-white p-5">
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
      {message && <StatusMessage title="Status" message={message} tone="success" />}

      <section className="mt-6 grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="space-y-6">
          <form className="rounded-lg border border-slate-200 bg-white p-5" onSubmit={handleCreatePatient}>
            <h2 className="text-lg font-semibold">Add patient</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field label="Full name" value={patientForm.full_name} onChange={(value) => setPatientForm((current) => ({ ...current, full_name: value }))} />
              <Field label="Date of birth" type="date" value={patientForm.date_of_birth} onChange={(value) => setPatientForm((current) => ({ ...current, date_of_birth: value }))} />
              <Field label="Gender" value={patientForm.gender} onChange={(value) => setPatientForm((current) => ({ ...current, gender: value }))} />
              <Field label="Phone" value={patientForm.phone} onChange={(value) => setPatientForm((current) => ({ ...current, phone: value }))} />
              <Field label="Email optional" value={patientForm.email} onChange={(value) => setPatientForm((current) => ({ ...current, email: value }))} />
              <Field label="Address" value={patientForm.address} onChange={(value) => setPatientForm((current) => ({ ...current, address: value }))} />
            </div>
            <button className="mt-5 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50" disabled={isBusy}>
              Save patient
            </button>
          </form>

          <section className="rounded-lg border border-slate-200 bg-white p-5">
            <h2 className="text-lg font-semibold">Find patient</h2>
            <div className="mt-4 flex gap-2">
              <input
                className="min-w-0 flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search name, phone, email"
              />
              <button
                className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                onClick={() => loadPatients(query)}
                type="button"
                disabled={isBusy}
              >
                Search
              </button>
            </div>
            <div className="mt-4 max-h-80 divide-y divide-slate-100 overflow-auto">
              {patients.map((patient) => (
                <button
                  className={`block w-full px-3 py-3 text-left text-sm ${patient.id === selectedPatientId ? "bg-sky-50" : "hover:bg-slate-50"}`}
                  key={patient.id}
                  onClick={() => setSelectedPatientId(patient.id)}
                  type="button"
                >
                  <div className="font-medium text-slate-900">{patient.full_name}</div>
                  <div className="mt-1 text-xs text-slate-500">{patient.phone || "No phone"} {patient.date_of_birth ? `- DOB ${patient.date_of_birth}` : ""}</div>
                </button>
              ))}
              {patients.length === 0 && <div className="py-8 text-center text-sm text-slate-500">No patients found</div>}
            </div>
          </section>
        </div>

        <div className="space-y-6">
          <section className="rounded-lg border border-slate-200 bg-white p-5">
            <h2 className="text-lg font-semibold">Selected patient</h2>
            {selectedPatient ? (
              <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                <Info label="Name" value={selectedPatient.full_name} />
                <Info label="Phone" value={selectedPatient.phone || "-"} />
                <Info label="DOB" value={selectedPatient.date_of_birth || "-"} />
                <Info label="Status" value={selectedPatient.status} />
                <Info label="Email" value={selectedPatient.email || "-"} />
                <Info label="Address" value={selectedPatient.address || "-"} />
              </dl>
            ) : (
              <p className="mt-3 text-sm text-slate-500">Select a patient to add a visit.</p>
            )}
          </section>

          <form className="rounded-lg border border-slate-200 bg-white p-5" onSubmit={handleCreateVisit}>
            <h2 className="text-lg font-semibold">Add visit</h2>
            <div className="mt-4 grid gap-4">
              <Field label="Visit date" type="date" value={visitForm.visit_date} onChange={(value) => setVisitForm((current) => ({ ...current, visit_date: value }))} />
              <Field label="Reason" value={visitForm.reason} onChange={(value) => setVisitForm((current) => ({ ...current, reason: value }))} />
              <label className="block">
                <span className="text-sm font-medium text-slate-700">Notes</span>
                <textarea
                  className="mt-1 min-h-28 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  value={visitForm.notes}
                  onChange={(event) => setVisitForm((current) => ({ ...current, notes: event.target.value }))}
                />
              </label>
            </div>
            <button className="mt-5 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50" disabled={isBusy || !selectedPatient}>
              Save visit
            </button>
          </form>

          <section className="rounded-lg border border-slate-200 bg-white p-5">
            <h2 className="text-lg font-semibold">Visit history</h2>
            <div className="mt-4 space-y-3">
              {visits.map((visit) => (
                <div className="rounded-md border border-slate-100 p-3 text-sm" key={visit.id}>
                  <div className="font-medium text-slate-900">{visit.visit_date} - {visit.reason || "Visit"}</div>
                  <div className="mt-1 whitespace-pre-wrap text-slate-600">{visit.notes || "No notes"}</div>
                </div>
              ))}
              {visits.length === 0 && <div className="py-8 text-center text-sm text-slate-500">No visits yet</div>}
            </div>
          </section>
        </div>
      </section>
    </PageShell>
  );
}

function PageShell({ children }) {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 text-slate-900 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6">
          <p className="text-sm font-medium uppercase text-slate-500">Horizon transition</p>
          <h1 className="mt-1 text-2xl font-semibold">Patient register</h1>
        </div>
        {children}
      </div>
    </main>
  );
}

function Field({ label, value, onChange, type = "text" }) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <input
        className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function Info({ label, value }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase text-slate-500">{label}</dt>
      <dd className="mt-1 text-slate-900">{value}</dd>
    </div>
  );
}

function StatusMessage({ title, message, tone }) {
  const toneClass = tone === "error"
    ? "border-red-200 bg-red-50 text-red-900"
    : tone === "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-900"
      : "border-slate-200 bg-white text-slate-700";
  return (
    <section className={`mt-6 rounded-lg border p-4 text-sm ${toneClass}`}>
      <div className="font-semibold">{title}</div>
      <div className="mt-1">{message}</div>
    </section>
  );
}
