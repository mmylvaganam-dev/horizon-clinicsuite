import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Upload, Trash2, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';

/**
 * Reusable component for a doctor to upload their e-signature or seal image.
 * Props:
 *   label       - field label string
 *   value       - current image URL (or null)
 *   onChange    - (url) => void
 *   accept      - file accept string (default: "image/*")
 */
export default function DoctorSignatureUpload({ label, value, onChange, accept = 'image/*' }) {
  const [uploading, setUploading] = useState(false);

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      onChange(file_url);
      toast.success(`${label} uploaded`);
    } catch (err) {
      toast.error('Upload failed');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-slate-700">{label}</p>
      {value ? (
        <div className="flex items-start gap-3 p-3 border border-emerald-200 bg-emerald-50 rounded-lg">
          <img src={value} alt={label} className="h-16 max-w-[160px] object-contain border border-white rounded shadow" />
          <div className="flex flex-col gap-2">
            <span className="flex items-center gap-1 text-xs text-emerald-700 font-medium">
              <CheckCircle className="w-3.5 h-3.5" /> Uploaded
            </span>
            <Button
              size="sm"
              variant="outline"
              className="text-red-600 border-red-200 hover:bg-red-50 h-7 text-xs"
              onClick={() => onChange('')}
            >
              <Trash2 className="w-3 h-3 mr-1" /> Remove
            </Button>
          </div>
        </div>
      ) : (
        <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-slate-300 rounded-lg cursor-pointer hover:border-teal-400 hover:bg-teal-50 transition-colors">
          <Upload className="w-5 h-5 text-slate-400 mb-1" />
          <span className="text-xs text-slate-500">{uploading ? 'Uploading...' : `Upload ${label}`}</span>
          <input type="file" accept={accept} className="hidden" onChange={handleFile} disabled={uploading} />
        </label>
      )}
      <p className="text-xs text-slate-400">PNG with transparent background recommended for best results</p>
    </div>
  );
}