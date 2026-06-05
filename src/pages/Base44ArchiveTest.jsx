import { useEffect, useMemo, useState } from "react";

import { firebaseAuthFeatureEnabled } from "@/context/FirebaseSessionContext";
import {
  listBase44Archives,
  searchBase44Archive,
  uploadBase44Archive,
} from "@/lib/backendTest";


const ENTITY_OPTIONS = [
  ["patients", "Patients"],
  ["appointments", "Appointments"],
  ["prescriptions", "Prescriptions"],
  ["pharmacy_sales", "Pharmacy sales"],
  ["pharmacy_sale_headers", "Pharmacy sale headers"],
  ["pharmacy_sale_items", "Pharmacy sale items"],
  ["pharmacy_stock", "Pharmacy stock"],
  ["invoices", "Invoices"],
  ["invoice_headers", "Invoice headers"],
  ["patient_documents", "Patient document metadata"],
  ["users", "Users"],
  ["organizations", "Organizations"],
];


export default function Base44ArchiveTest() {
  const [backendBaseUrl, setBackendBaseUrl] = useState(
    import.meta.env.VITE_BACKEND_BASE_URL || "http://127.0.0.1:8000"
  );
  const [archives, setArchives] = useState([]);
  const [selectedArchiveId, setSelectedArchiveId] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [entity, setEntity] = useState("patients");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [entityCounts, setEntityCounts] = useState({});
  const [isUploading, setIsUploading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (firebaseAuthFeatureEnabled) {
      loadArchives();
    }
  }, []);

  const selectedArchive = useMemo(
    () => archives.find((archive) => archive.archive_id === selectedArchiveId),
    [archives, selectedArchiveId]
  );

  const loadArchives = async () => {
    setIsLoading(true);
    setError("");
    setMessage("");

    try {
      const response = await listBase44Archives(backendBaseUrl);
      setArchives(response.archives || []);
      if (!selectedArchiveId && response.archives?.[0]?.archive_id) {
        setSelectedArchiveId(response.archives[0].archive_id);
        setEntityCounts(response.archives[0].entity_counts || {});
      }
    } catch (loadError) {
      setError(loadError?.message || "Unable to load Base44 archives");
    } finally {
      setIsLoading(false);
    }
  };

  const handleArchiveChange = (archiveId) => {
    const archive = archives.find((item) => item.archive_id === archiveId);
    setSelectedArchiveId(archiveId);
    setEntityCounts(archive?.entity_counts || {});
    setResults([]);
    setSelectedRecord(null);
  };

  const handleFileChange = (event) => {
    setSelectedFile(event.target.files?.[0] || null);
    setMessage("");
    setError("");
  };

  const handleUpload = async () => {
    setIsUploading(true);
    setError("");
    setMessage("");
    setSelectedRecord(null);

    try {
      if (!selectedFile) {
        throw new Error("Select a Base44 JSON export first");
      }

      const content = await selectedFile.text();
      const response = await uploadBase44Archive(
        {
          file_name: selectedFile.name,
          content,
        },
        backendBaseUrl
      );

      setMessage(`Archive uploaded: ${response.archive_id}`);
      await loadArchives();
      setSelectedArchiveId(response.archive_id);
      setEntityCounts(response.entity_counts || {});
    } catch (uploadError) {
      setError(uploadError?.message || "Base44 archive upload failed");
    } finally {
      setIsUploading(false);
    }
  };

  const handleSearch = async () => {
    setIsSearching(true);
    setError("");
    setMessage("");
    setSelectedRecord(null);

    try {
      if (!selectedArchiveId) {
        throw new Error("Select an uploaded archive first");
      }

      const response = await searchBase44Archive(
        {
          archive_id: selectedArchiveId,
          entity,
          query,
          limit: 50,
        },
        backendBaseUrl
      );

      setResults(response.results || []);
      setMessage(`${response.returned} result(s) shown from ${response.total_entity_records} ${response.entity} records`);
    } catch (searchError) {
      setError(searchError?.message || "Base44 archive search failed");
    } finally {
      setIsSearching(false);
    }
  };

  if (!firebaseAuthFeatureEnabled) {
    return (
      <ArchiveShell>
        <StatusMessage
          title="Archive viewer inactive"
          message="VITE_USE_FIREBASE_AUTH is false, so this isolated archive viewer is not active."
          tone="muted"
        />
      </ArchiveShell>
    );
  }

  return (
    <ArchiveShell>
      <section className="rounded-lg border border-amber-200 bg-amber-50 p-5 text-sm text-amber-950">
        <div className="font-semibold">Read-only Base44 backup viewer</div>
        <div className="mt-1">
          Use this to search old backup data during transition. Do not edit records here. Do not upload new patient documents.
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
        <button
          className="mt-4 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          type="button"
          onClick={loadArchives}
          disabled={isLoading}
        >
          {isLoading ? "Loading archives" : "Refresh archive list"}
        </button>
      </section>

      {error && <StatusMessage title="Error" message={error} tone="error" />}
      {message && <StatusMessage title="Status" message={message} tone="success" />}

      <section className="mt-6 grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="space-y-6">
          <section className="rounded-lg border border-slate-200 bg-white p-5">
            <h2 className="text-lg font-semibold">Upload Base44 JSON backup</h2>
            <p className="mt-1 text-sm text-slate-600">
              Upload the three company JSON files one at a time. They are kept read-only for archive lookup.
            </p>
            <input
              className="mt-5 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              type="file"
              accept=".json,application/json"
              onChange={handleFileChange}
              disabled={isUploading}
            />
            <div className="mt-3 rounded-md bg-slate-50 p-3 text-sm text-slate-700">
              {selectedFile ? `${selectedFile.name} (${selectedFile.size} bytes)` : "No file selected"}
            </div>
            <button
              className="mt-4 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              type="button"
              onClick={handleUpload}
              disabled={isUploading}
            >
              {isUploading ? "Uploading archive" : "Upload archive"}
            </button>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-5">
            <h2 className="text-lg font-semibold">Archive counts</h2>
            <select
              className="mt-4 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              value={selectedArchiveId}
              onChange={(event) => handleArchiveChange(event.target.value)}
            >
              <option value="">Select archive</option>
              {archives.map((archive) => (
                <option key={archive.archive_id} value={archive.archive_id}>
                  {archive.app || archive.archive_id}
                </option>
              ))}
            </select>

            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {Object.entries(entityCounts).slice(0, 30).map(([key, count]) => (
                <div className="rounded-md bg-slate-50 p-3" key={key}>
                  <div className="truncate text-xs text-slate-500">{key}</div>
                  <div className="text-lg font-semibold">{count}</div>
                </div>
              ))}
            </div>
          </section>
        </div>

        <section className="rounded-lg border border-slate-200 bg-white p-5">
          <div className="flex flex-col gap-3 lg:flex-row">
            <select
              className="rounded-md border border-slate-300 px-3 py-2 text-sm"
              value={entity}
              onChange={(event) => setEntity(event.target.value)}
            >
              {ENTITY_OPTIONS.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <input
              className="min-w-0 flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
              placeholder="Search name, email, phone, item, invoice, sale..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            <button
              className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              type="button"
              onClick={handleSearch}
              disabled={isSearching}
            >
              {isSearching ? "Searching" : "Search"}
            </button>
          </div>

          <div className="mt-5 space-y-3">
            {results.length ? (
              results.map((record, index) => (
                <button
                  className="block w-full rounded-lg border border-slate-200 bg-slate-50 p-4 text-left hover:border-slate-400"
                  key={`${record.entity}-${record.base44_id || index}`}
                  type="button"
                  onClick={() => setSelectedRecord(record)}
                >
                  <div className="font-semibold text-slate-900">
                    {record.name || record.patient_name || record.item_name || record.sale_number || record.invoice_number || record.file_name || record.base44_id || "Record"}
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    {record.entity} {record.status ? `- ${record.status}` : ""}
                  </div>
                  <div className="mt-2 grid gap-1 text-sm text-slate-700 sm:grid-cols-2">
                    {Object.entries(record)
                      .filter(([key]) => !["raw_record", "entity"].includes(key))
                      .slice(0, 8)
                      .map(([key, value]) => (
                        <div className="break-words" key={key}>
                          <span className="text-slate-500">{key}: </span>
                          {String(value ?? "")}
                        </div>
                      ))}
                  </div>
                </button>
              ))
            ) : (
              <div className="rounded-lg border border-dashed border-slate-300 p-8 text-center text-sm text-slate-600">
                No results loaded
              </div>
            )}
          </div>
        </section>
      </section>

      <section className="mt-6 rounded-lg border border-slate-200 bg-white p-5">
        <h2 className="text-lg font-semibold">Selected record details</h2>
        <pre className="mt-4 max-h-[520px] overflow-auto rounded-md bg-slate-100 p-4 text-xs">
          {selectedRecord ? JSON.stringify(selectedRecord, null, 2) : "Select a search result to view details"}
        </pre>
      </section>
    </ArchiveShell>
  );
}

function ArchiveShell({ children }) {
  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10 text-slate-900">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8">
          <p className="text-sm font-medium uppercase tracking-wide text-slate-500">
            Base44 Transition Archive
          </p>
          <h1 className="mt-2 text-3xl font-semibold">Archive Viewer</h1>
        </div>
        {children}
      </div>
    </main>
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
