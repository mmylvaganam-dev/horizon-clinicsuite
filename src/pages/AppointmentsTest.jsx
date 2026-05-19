import { useEffect, useState } from "react";

import { firebaseAuthFeatureEnabled } from "@/context/FirebaseSessionContext";
import {
  createAppointmentRequest,
  listAppointmentRequests,
  listAvailability,
  updateAppointmentRequestStatus,
} from "@/lib/backendTest";


export default function AppointmentsTest() {
  const [backendBaseUrl, setBackendBaseUrl] = useState(
    import.meta.env.VITE_BACKEND_BASE_URL || "http://127.0.0.1:8000"
  );
  const [requestForm, setRequestForm] = useState({
    patient_name: "Test Patient",
    patient_email: "test.patient@example.com",
    requested_provider_user_id: "",
    requested_date: "2026-06-01",
    requested_time: "09:30",
    request_reason: "Appointment request scaffold test",
  });
  const [statusForm, setStatusForm] = useState({
    id: "placeholder-appointment-request",
    status: "confirmed",
  });
  const [appointmentRequests, setAppointmentRequests] = useState([]);
  const [availability, setAvailability] = useState([]);
  const [source, setSource] = useState("not_loaded");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (firebaseAuthFeatureEnabled) {
      loadAppointmentData();
    }
  }, []);

  const loadAppointmentData = async () => {
    setIsLoading(true);
    setError("");

    try {
      const [requestsResponse, availabilityResponse] = await Promise.all([
        listAppointmentRequests(backendBaseUrl),
        listAvailability(backendBaseUrl).catch((availabilityError) => ({
          availability: [],
          source: availabilityError?.message || "availability_unavailable",
        })),
      ]);

      setAppointmentRequests(requestsResponse.appointment_requests || []);
      setAvailability(availabilityResponse.availability || []);
      setSource(requestsResponse.source || "unknown");
    } catch (loadError) {
      setAppointmentRequests([]);
      setAvailability([]);
      setSource("error");
      setError(loadError?.message || "Unable to load appointment requests");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = async (event) => {
    event.preventDefault();
    setIsLoading(true);
    setError("");
    setResult(null);

    try {
      const payload = {
        ...requestForm,
        requested_provider_user_id:
          requestForm.requested_provider_user_id || undefined,
      };
      const response = await createAppointmentRequest(payload, backendBaseUrl);
      setResult(response);
      setStatusForm((current) => ({
        ...current,
        id: response.appointment_request?.id || current.id,
      }));
      await loadAppointmentData();
    } catch (createError) {
      setError(createError?.message || "Unable to create appointment request");
    } finally {
      setIsLoading(false);
    }
  };

  const handleStatusUpdate = async (event) => {
    event.preventDefault();
    setIsLoading(true);
    setError("");
    setResult(null);

    try {
      const response = await updateAppointmentRequestStatus(statusForm, backendBaseUrl);
      setResult(response);
      await loadAppointmentData();
    } catch (updateError) {
      setError(updateError?.message || "Unable to update appointment request status");
    } finally {
      setIsLoading(false);
    }
  };

  if (!firebaseAuthFeatureEnabled) {
    return (
      <AppointmentsShell>
        <StatusMessage
          title="Appointments test inactive"
          message="VITE_USE_FIREBASE_AUTH is false, so this isolated appointment request flow is not active."
          tone="muted"
        />
      </AppointmentsShell>
    );
  }

  return (
    <AppointmentsShell>
      <section className="rounded-lg border border-slate-200 bg-white p-5">
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

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <section className="rounded-lg border border-slate-200 bg-white p-5">
          <h2 className="text-lg font-semibold">Create request</h2>
          <form className="mt-4 space-y-4" onSubmit={handleCreate}>
            <TextField
              label="Patient name"
              value={requestForm.patient_name}
              onChange={(value) => setRequestForm((current) => ({ ...current, patient_name: value }))}
            />
            <TextField
              label="Patient email"
              type="email"
              value={requestForm.patient_email}
              onChange={(value) => setRequestForm((current) => ({ ...current, patient_email: value }))}
            />
            <TextField
              label="Requested provider user ID"
              value={requestForm.requested_provider_user_id}
              placeholder="Optional in placeholder mode"
              onChange={(value) =>
                setRequestForm((current) => ({ ...current, requested_provider_user_id: value }))
              }
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField
                label="Requested date"
                type="date"
                value={requestForm.requested_date}
                onChange={(value) => setRequestForm((current) => ({ ...current, requested_date: value }))}
              />
              <TextField
                label="Requested time"
                type="time"
                value={requestForm.requested_time}
                onChange={(value) => setRequestForm((current) => ({ ...current, requested_time: value }))}
              />
            </div>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Request reason</span>
              <textarea
                className="mt-1 min-h-24 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                value={requestForm.request_reason}
                onChange={(event) =>
                  setRequestForm((current) => ({ ...current, request_reason: event.target.value }))
                }
              />
            </label>
            <PrimaryButton disabled={isLoading}>
              {isLoading ? "Working" : "Create request"}
            </PrimaryButton>
          </form>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-5">
          <h2 className="text-lg font-semibold">Update status</h2>
          <form className="mt-4 space-y-4" onSubmit={handleStatusUpdate}>
            <TextField
              label="Appointment request ID"
              value={statusForm.id}
              onChange={(value) => setStatusForm((current) => ({ ...current, id: value }))}
            />
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Status</span>
              <select
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                value={statusForm.status}
                onChange={(event) =>
                  setStatusForm((current) => ({ ...current, status: event.target.value }))
                }
              >
                <option value="pending">pending</option>
                <option value="confirmed">confirmed</option>
                <option value="cancelled">cancelled</option>
                <option value="completed">completed</option>
              </select>
            </label>
            <PrimaryButton disabled={isLoading}>
              {isLoading ? "Working" : "Update status"}
            </PrimaryButton>
          </form>
        </section>
      </div>

      {result && (
        <pre className="mt-6 max-h-72 overflow-auto rounded-md bg-slate-900 p-4 text-xs text-white">
          {JSON.stringify(result, null, 2)}
        </pre>
      )}

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <section className="rounded-lg border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-lg font-semibold">Appointment requests</h2>
            <div className="flex items-center gap-3">
              <span className="rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-600">
                {source}
              </span>
              <button
                className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 disabled:opacity-50"
                type="button"
                onClick={loadAppointmentData}
                disabled={isLoading}
              >
                Refresh
              </button>
            </div>
          </div>
          <div className="mt-4 overflow-hidden rounded-lg border border-slate-200">
            {appointmentRequests.length ? (
              appointmentRequests.map((request) => (
                <article className="border-b border-slate-100 p-4 last:border-b-0" key={request.id}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="font-medium text-slate-900">{request.patient_name}</div>
                      <div className="mt-1 text-sm text-slate-600">
                        {request.requested_date} at {request.requested_time}
                      </div>
                    </div>
                    <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">
                      {request.status}
                    </span>
                  </div>
                  <div className="mt-3 grid gap-2 text-sm text-slate-700 md:grid-cols-2">
                    <div className="break-all">Provider: {request.requested_provider_user_id || "not selected"}</div>
                    <div className="break-all">Email: {request.patient_email || "none"}</div>
                  </div>
                  <p className="mt-3 text-sm text-slate-700">{request.request_reason || "No reason provided"}</p>
                </article>
              ))
            ) : (
              <div className="px-4 py-6 text-sm text-slate-600">No appointment requests loaded</div>
            )}
          </div>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-5">
          <h2 className="text-lg font-semibold">Read-only availability context</h2>
          <div className="mt-4 space-y-3">
            {availability.length ? (
              availability.map((record) => (
                <article className="rounded-md border border-slate-200 p-3 text-sm" key={record.id}>
                  <div className="font-medium text-slate-900">Provider {record.provider_user_id}</div>
                  <div className="mt-1 text-slate-700">
                    Day {record.weekday}, {record.start_time}-{record.end_time}
                  </div>
                  <div className="mt-1 text-slate-600">{record.timezone}</div>
                </article>
              ))
            ) : (
              <div className="text-sm text-slate-600">No availability context loaded</div>
            )}
          </div>
        </section>
      </div>
    </AppointmentsShell>
  );
}

function AppointmentsShell({ children }) {
  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10 text-slate-900">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8">
          <p className="text-sm font-medium uppercase tracking-wide text-slate-500">
            Isolated Appointments Test
          </p>
          <h1 className="mt-2 text-3xl font-semibold">Appointment Requests</h1>
        </div>
        {children}
      </div>
    </main>
  );
}

function TextField({ label, value, onChange, type = "text", placeholder = "" }) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <input
        className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        placeholder={placeholder}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function PrimaryButton({ children, disabled }) {
  return (
    <button
      className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      type="submit"
      disabled={disabled}
    >
      {children}
    </button>
  );
}

function StatusMessage({ title, message, tone }) {
  const toneClass = {
    error: "border-red-200 bg-red-50 text-red-900",
    muted: "border-slate-200 bg-white text-slate-900",
  }[tone];

  return (
    <section className={`mt-6 rounded-lg border px-5 py-4 ${toneClass}`}>
      <h2 className="text-base font-semibold">{title}</h2>
      <p className="mt-1 break-all text-sm">{message}</p>
    </section>
  );
}
