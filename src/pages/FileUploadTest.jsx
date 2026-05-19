import { useState } from "react";
import { getDownloadURL, ref, uploadBytesResumable } from "firebase/storage";
import { UploadCloud } from "lucide-react";

import { firebaseAuthFeatureEnabled } from "@/context/FirebaseSessionContext";
import { firebaseStorage } from "@/lib/firebase";


export default function FileUploadTest() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [progress, setProgress] = useState(0);
  const [downloadUrl, setDownloadUrl] = useState("");
  const [error, setError] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = (event) => {
    setSelectedFile(event.target.files?.[0] || null);
    setProgress(0);
    setDownloadUrl("");
    setError("");
  };

  const handleUpload = () => {
    setError("");
    setDownloadUrl("");
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
      setError("Select a non-patient test file before uploading");
      return;
    }

    const safeName = selectedFile.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const uploadPath = `test-uploads/${Date.now()}-${safeName}`;
    const storageReference = ref(firebaseStorage, uploadPath);
    const uploadTask = uploadBytesResumable(storageReference, selectedFile, {
      contentType: selectedFile.type || "application/octet-stream",
      customMetadata: {
        purpose: "isolated_storage_test",
        containsPatientData: "false",
      },
    });

    setIsUploading(true);

    uploadTask.on(
      "state_changed",
      (snapshot) => {
        const percent = Math.round(
          (snapshot.bytesTransferred / snapshot.totalBytes) * 100
        );
        setProgress(percent);
      },
      (uploadError) => {
        setIsUploading(false);
        setError(uploadError?.message || "Firebase Storage upload failed");
      },
      async () => {
        try {
          const url = await getDownloadURL(uploadTask.snapshot.ref);
          setDownloadUrl(url);
          setProgress(100);
        } catch (urlError) {
          setError(urlError?.message || "Upload finished, but download URL failed");
        } finally {
          setIsUploading(false);
        }
      }
    );
  };

  if (!firebaseAuthFeatureEnabled) {
    return (
      <UploadShell>
        <StatusMessage
          title="Firebase Storage test inactive"
          message="VITE_USE_FIREBASE_AUTH is false, so this isolated upload test is not active."
          tone="muted"
        />
      </UploadShell>
    );
  }

  return (
    <UploadShell>
      <section className="rounded-lg border border-slate-200 bg-white p-5">
        <div className="flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-white">
            <UploadCloud className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Firebase Storage upload test</h2>
            <p className="mt-1 text-sm text-slate-600">
              Upload only safe test files. Files are stored under test-uploads/.
            </p>
          </div>
        </div>

        <label className="mt-6 block">
          <span className="text-sm font-medium text-slate-700">Test file</span>
          <input
            className="mt-2 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            type="file"
            onChange={handleFileChange}
            disabled={isUploading}
          />
        </label>

        <div className="mt-4 rounded-md bg-slate-50 p-3 text-sm text-slate-700">
          {selectedFile ? (
            <div className="space-y-1">
              <div>Selected: {selectedFile.name}</div>
              <div>Size: {selectedFile.size} bytes</div>
            </div>
          ) : (
            "No file selected"
          )}
        </div>

        <button
          className="mt-5 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          type="button"
          onClick={handleUpload}
          disabled={isUploading}
        >
          {isUploading ? "Uploading" : "Upload test file"}
        </button>
      </section>

      <section className="mt-6 rounded-lg border border-slate-200 bg-white p-5">
        <h2 className="text-base font-semibold">Upload progress</h2>
        <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full bg-slate-900 transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="mt-2 text-sm text-slate-600">{progress}%</div>
      </section>

      {downloadUrl && (
        <StatusMessage
          title="Download URL generated"
          message={downloadUrl}
          tone="success"
        />
      )}

      {error && (
        <StatusMessage title="Error" message={error} tone="error" />
      )}
    </UploadShell>
  );
}

function UploadShell({ children }) {
  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10 text-slate-900">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8">
          <p className="text-sm font-medium uppercase tracking-wide text-slate-500">
            Isolated Firebase Storage Test
          </p>
          <h1 className="mt-2 text-3xl font-semibold">File Upload Test</h1>
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
