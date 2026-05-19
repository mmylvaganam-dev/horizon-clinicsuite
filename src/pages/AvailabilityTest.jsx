import { useEffect, useState } from "react";

import { firebaseAuthFeatureEnabled } from "@/context/FirebaseSessionContext";
import {
  createAvailability,
  listAvailability,
  updateAvailability,
} from "@/lib/backendTest";


const weekdays = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];


export default function AvailabilityTest() {
  const [backendBaseUrl, setBackendBaseUrl] = useState(
    import.meta.env.VITE_BACKEND_BASE_URL || "http://127.0.0.1:8000"
  );
  const [form, setForm] = useState({
    provider_user_id: "",
    weekday: 1,
    start_time: "09:00",
    end_time: "17:00",
    timezone: "America/Toronto",
    is_available: true,
  });
  const [updateForm, setUpdateForm] = useState({
    id: "placeholder-availability-monday",
    provider_user_id: "",
    start_time: "10:00",
    end_time: "16:00",
    is_available: true,
  });
  const [availability, setAvailability] = useState([]);
  const [source, setSource] = useState("not_loaded");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (firebaseAuthFeatureEnabled) {
      loadAvailability();
    }
  }, []);

  const loadAvailability = async () => {
    setIsLoading(true);
    setError("");

    try {
      const response = await listAvailability(backendBaseUrl);
      setAvailability(response.availability || []);
      setSource(response.source || "unknown");
    } catch (loadError) {
      setAvailability([]);
      setSource("error");
      setError(loadError?.message || "Unable to list availability");
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
        ...form,
        provider_user_id: form.provider_user_id || undefined,
      };
      const response = await createAvailability(payload, backendBaseUrl);
      setResult(response);
      setUpdateForm((current) => ({
        ...current,
        id: response.availability?.id || current.id,
        provider_user_id: response.availability?.provider_user_id || current.provider_user_id,
      }));
      await loadAvailability();
    } catch (createError) {
      setError(createError?.message || "Unable to create availability");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdate = async (event) => {
    event.preventDefault();
    setIsLoading(true);
    setError("");
    setResult(null);

    try {
      const payload = {
        ...updateForm,
        provider_user_id: updateForm.provider_user_id || undefined,
      };
      const response = await updateAvailability(payload, backendBaseUrl);
      setResult(response);
      await loadAvailability();
    } catch (updateError) {
      setError(updateError?.message || "Unable to update availability");
    } finally {
      setIsLoading(false);
    }
  };

  if (!firebaseAuthFeatureEnabled) {
    return (
      <AvailabilityShell>
        <StatusMessage
          title="Availability test inactive"
          message="VITE_USE_FIREBASE_AUTH is false, so this isolated provider availability flow is not active."
          tone="muted"
        />
      </AvailabilityShell>
    );
  }

  return (
    <AvailabilityShell>
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
          <h2 className="text-lg font-semibold">Add availability</h2>
          <form className="mt-4 space-y-4" onSubmit={handleCreate}>
            <ProviderField
              value={form.provider_user_id}
              onChange={(value) => setForm((current) => ({ ...current, provider_user_id: value }))}
            />
            <WeekdayField
              value={form.weekday}
              onChange={(value) => setForm((current) => ({ ...current, weekday: Number(value) }))}
            />
            <TimeGrid
              startValue={form.start_time}
              endValue={form.end_time}
              onStartChange={(value) => setForm((current) => ({ ...current, start_time: value }))}
              onEndChange={(value) => setForm((current) => ({ ...current, end_time: value }))}
            />
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Timezone</span>
              <input
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                value={form.timezone}
                onChange={(event) => setForm((current) => ({ ...current, timezone: event.target.value }))}
              />
            </label>
            <AvailabilityToggle
              checked={form.is_available}
              onChange={(checked) => setForm((current) => ({ ...current, is_available: checked }))}
            />
            <PrimaryButton disabled={isLoading}>
              {isLoading ? "Working" : "Create availability"}
            </PrimaryButton>
          </form>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-5">
          <h2 className="text-lg font-semibold">Edit availability</h2>
          <form className="mt-4 space-y-4" onSubmit={handleUpdate}>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Availability ID</span>
              <input
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                value={updateForm.id}
                onChange={(event) => setUpdateForm((current) => ({ ...current, id: event.target.value }))}
              />
            </label>
            <ProviderField
              value={updateForm.provider_user_id}
              onChange={(value) => setUpdateForm((current) => ({ ...current, provider_user_id: value }))}
            />
            <TimeGrid
              startValue={updateForm.start_time}
              endValue={updateForm.end_time}
              onStartChange={(value) => setUpdateForm((current) => ({ ...current, start_time: value }))}
              onEndChange={(value) => setUpdateForm((current) => ({ ...current, end_time: value }))}
            />
            <AvailabilityToggle
              checked={updateForm.is_available}
              onChange={(checked) => setUpdateForm((current) => ({ ...current, is_available: checked }))}
            />
            <PrimaryButton disabled={isLoading}>
              {isLoading ? "Working" : "Update availability"}
            </PrimaryButton>
          </form>
        </section>
      </div>

      {result && (
        <pre className="mt-6 max-h-72 overflow-auto rounded-md bg-slate-900 p-4 text-xs text-white">
          {JSON.stringify(result, null, 2)}
        </pre>
      )}

      <section className="mt-6 rounded-lg border border-slate-200 bg-white p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">Availability records</h2>
            <p className="mt-1 text-sm text-slate-600">
              Provider role can manage own records. Admin role can manage provider records.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-600">
              {source}
            </span>
            <button
              className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 disabled:opacity-50"
              type="button"
              onClick={loadAvailability}
              disabled={isLoading}
            >
              Refresh
            </button>
          </div>
        </div>

        <div className="mt-4 overflow-hidden rounded-lg border border-slate-200">
          <div className="grid grid-cols-[1fr_0.8fr_0.8fr_0.8fr_1fr] gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <div>Provider</div>
            <div>Day</div>
            <div>Start</div>
            <div>End</div>
            <div>Status</div>
          </div>
          {availability.length ? (
            availability.map((record) => (
              <article
                className="grid gap-3 border-b border-slate-100 px-4 py-3 text-sm last:border-b-0 md:grid-cols-[1fr_0.8fr_0.8fr_0.8fr_1fr]"
                key={record.id}
              >
                <div className="break-all font-medium text-slate-900">
                  {record.provider_user_id}
                </div>
                <div className="text-slate-700">{weekdays[record.weekday] || record.weekday}</div>
                <div className="text-slate-700">{record.start_time}</div>
                <div className="text-slate-700">{record.end_time}</div>
                <div className="text-slate-700">
                  {record.is_available ? "available" : "not available"}
                </div>
              </article>
            ))
          ) : (
            <div className="px-4 py-6 text-sm text-slate-600">No availability loaded</div>
          )}
        </div>
      </section>
    </AvailabilityShell>
  );
}

function AvailabilityShell({ children }) {
  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10 text-slate-900">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8">
          <p className="text-sm font-medium uppercase tracking-wide text-slate-500">
            Isolated Availability Test
          </p>
          <h1 className="mt-2 text-3xl font-semibold">Provider Availability</h1>
        </div>
        {children}
      </div>
    </main>
  );
}

function ProviderField({ value, onChange }) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-700">Provider user ID</span>
      <input
        className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        placeholder="Blank uses current linked provider"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function WeekdayField({ value, onChange }) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-700">Weekday</span>
      <select
        className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {weekdays.map((weekday, index) => (
          <option key={weekday} value={index}>
            {weekday}
          </option>
        ))}
      </select>
    </label>
  );
}

function TimeGrid({ startValue, endValue, onStartChange, onEndChange }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <label className="block">
        <span className="text-sm font-medium text-slate-700">Start time</span>
        <input
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          type="time"
          value={startValue}
          onChange={(event) => onStartChange(event.target.value)}
        />
      </label>
      <label className="block">
        <span className="text-sm font-medium text-slate-700">End time</span>
        <input
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          type="time"
          value={endValue}
          onChange={(event) => onEndChange(event.target.value)}
        />
      </label>
    </div>
  );
}

function AvailabilityToggle({ checked, onChange }) {
  return (
    <label className="flex items-center gap-3 text-sm font-medium text-slate-700">
      <input
        className="h-4 w-4 rounded border-slate-300"
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      Available during this block
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
