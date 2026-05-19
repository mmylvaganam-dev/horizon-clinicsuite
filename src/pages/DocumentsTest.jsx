import { useEffect, useState } from "react";
import { getDownloadURL, ref, uploadBytesResumable } from "firebase/storage";

import { firebaseAuthFeatureEnabled } from "@/context/FirebaseSessionContext";
import { firebaseStorage } from "@/lib/firebase";
import { listDocuments, registerDocumentUpload } from "@/lib/backendTest";


export default function DocumentsTest() {
  const [backendBaseUrl, setBackendBaseUrl] = useState(
    import.meta.env.VITE_BACKEND_BASE_URL || "http://127.0.0.1:8000"
  );
  const [selectedFile, setSelectedFile] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [source, setSource] = useState("not_loaded");
  const [progress, setProgress] = useState(0);
  const [registeredDocument, setRegisteredDocument] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (firebaseAuthFeatureEnabled) {
      loadDocuments();
    }
  }, []);

  const loadDocuments = async () => {
    setIsLoading(true);
    setError("");

    try {
      const response = await listDocuments(backendBaseUrl);
      setDocuments(response.documents || []);
      setSource(response.source || "unknown");
    } catch (loadError) {
      setError(loadError?.message || "Unable to list uploaded documents");
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileChange = (event) => {
    setSelectedFile(event.target.files?.[0] || null);
    setProgress(0);
    setRegisteredDocument(null);
    setError("");
    setSuccess("");
  };

  const handleUploadAndRegister = () => {
    setError("");
    setSuccess("");
    setRegisteredDocument(null);
    setProgress(0);

    if (!firebaseAuthFeatureEnabled) {
      setError("Firebase auth feature flag is not enabled");
      return;
    }

    if (!firebaseStorage) {
      setError("Firebase Storage is not configured");
      return;
    }

    if (!selectedFile) {
      setError("Select a safe test document before uploading");
      return;
    }

    const safeName = selectedFile.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const storagePath = `document-test-uploads/${Date.now()}-${safeName}`;
    const storageReference = ref(firebaseStorage, storagePath);
    const uploadTask = uploadBytesResumable(storageReference, selectedFile, {
      contentType: selectedFile.type || "application/octet-stream",
      customMetadata: {
        purpose: "isolated_document_metadata_test",
        containsPatientData: "false",
      },
    });

    setIsUploading(true);

    uploadTask.on(
      "state_changed",
      (snapshot) => {
        setProgress(Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100));
      },
      (uploadError) => {
        setIsUploading(false);
        setError(uploadError?.message || "Firebase Storage upload failed");
      },
      async () => {
        try {
          const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
          const response = await registerDocumentUpload(
            {
              file_name: selectedFile.name,
              storage_path: storagePath,
              download_url: downloadUrl,
              mime_type: selectedFile.type || "application/octet-stream",
              file_size: selectedFile.size,
            },
            backendBaseUrl
          );
          setRegisteredDocument(response.document);
          setSuccess("Document metadata registered");
          await loadDocuments();
        } catch (registerError) {
          setError(registerError?.message || "Document metadata registration failed");
        } finally {
          setIsUploading(false);
        }
      }
    );
  };

  if (!firebaseAuthFeatureEnabled) {
    return (
      <DocumentsShell>
        <StatusMessage
          title="Document metadata test inactive"
          message="VITE_USE_FIREBASE_AUTH is false, so this isolated document flow is not active."
          tone="muted"
        />
      </DocumentsShell>
    );
  }

  return (
    <DocumentsShell>
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
          onClick={loadDocuments}
          disabled={isLoading}
        >
          {isLoading ? "Loading documents" : "List uploaded documents"}
        </button>
      </section>

      {error && <StatusMessage title="Error" message={error} tone="error" />}
      {success && <StatusMessage title="Success" message={success} tone="success" />}

      <section className="mt-6 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <h2 className="text-lg font-semibold">Upload and register test document</h2>
          <p className="mt-1 text-sm text-slate-600">
            Use safe test files only. Do not upload patient, business, or banking files.
          </p>

          <input
            className="mt-5 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            type="file"
            onChange={handleFileChange}
            disabled={isUploading}
          />

          <div className="mt-4 rounded-md bg-slate-50 p-3 text-sm text-slate-700">
            {selectedFile ? `${selectedFile.name} (${selectedFile.size} bytes)` : "No file selected"}
          </div>

          <button
            className="mt-5 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            type="button"
            onClick={handleUploadAndRegister}
            disabled={isUploading}
          >
            {isUploading ? "Uploading and registering" : "Upload and register metadata"}
          </button>

          <div className="mt-5 h-3 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full bg-slate-900" style={{ width: `${progress}%` }} />
          </div>
          <div className="mt-2 text-sm text-slate-600">{progress}%</div>

          <pre className="mt-4 max-h-72 overflow-auto rounded-md bg-slate-100 p-3 text-xs">
            {registeredDocument ? JSON.stringify(registeredDocument, null, 2) : "No document registered yet"}
          </pre>
        </div>

        <section className="rounded-lg border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-lg font-semibold">Uploaded documents</h2>
            <span className="rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-600">
              {source}
            </span>
          </div>
          <div className="mt-4 space-y-3">
            {documents.length ? (
              documents.map((document) => (
                <article
                  className="rounded-lg border border-slate-200 bg-slate-50 p-4"
                  key={document.id}
                >
                  <div className="font-semibold text-slate-900">{document.file_name}</div>
                  <div className="mt-1 break-all text-xs text-slate-500">
                    {document.storage_path}
                  </div>
                  <pre className="mt-3 max-h-48 overflow-auto text-xs text-slate-700">
                    {JSON.stringify(document, null, 2)}
                  </pre>
                </article>
              ))
            ) : (
              <div className="text-sm text-slate-600">No documents loaded</div>
            )}
          </div>
        </section>
      </section>
    </DocumentsShell>
  );
}

function DocumentsShell({ children }) {
  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10 text-slate-900">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8">
          <p className="text-sm font-medium uppercase tracking-wide text-slate-500">
            Isolated Document Metadata Test
          </p>
          <h1 className="mt-2 text-3xl font-semibold">Documents</h1>
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
