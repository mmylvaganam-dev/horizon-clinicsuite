import React, { useState, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Search, Folder, FileText, Image, Loader2, ChevronLeft,
  Cloud, CheckCircle2, ArrowRight
} from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

function getFileIcon(mimeType) {
  if (!mimeType) return FileText;
  if (mimeType === 'application/vnd.google-apps.folder') return Folder;
  if (mimeType.startsWith('image/')) return Image;
  return FileText;
}

function getFileColor(mimeType) {
  if (mimeType === 'application/vnd.google-apps.folder') return 'text-yellow-500';
  if (mimeType.startsWith('image/')) return 'text-orange-500';
  return 'text-blue-500';
}

export default function GoogleDrivePickerDialog({ open, onClose, onImport }) {
  const [query, setQuery] = useState('');
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [folderStack, setFolderStack] = useState([]); // [{id, name}]
  const [importing, setImporting] = useState(null); // file id being imported
  const [hasSearched, setHasSearched] = useState(false);

  const currentFolder = folderStack[folderStack.length - 1] || null;

  const browse = useCallback(async (folderId = null, searchQuery = '') => {
    setLoading(true);
    setHasSearched(true);
    try {
      const res = await base44.functions.invoke('browseGoogleDrive', {
        folder_id: folderId || undefined,
        query: searchQuery || undefined,
      });
      setFiles(res.data?.files || []);
    } catch (err) {
      toast.error('Failed to load Drive files');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    setFolderStack([]);
    browse(null, query);
  };

  const handleOpenFolder = (file) => {
    setFolderStack(prev => [...prev, { id: file.id, name: file.name }]);
    setQuery('');
    browse(file.id);
  };

  const handleBack = () => {
    const newStack = folderStack.slice(0, -1);
    setFolderStack(newStack);
    const parent = newStack[newStack.length - 1];
    browse(parent?.id || null);
  };

  const handleImport = async (file) => {
    setImporting(file.id);
    try {
      const res = await base44.functions.invoke('importGoogleDriveFile', {
        file_id: file.id,
        file_name: file.name,
        mime_type: file.mimeType,
      });
      if (res.data?.file_url) {
        await onImport({ file_url: res.data.file_url, file_name: file.name, mime_type: file.mimeType });
        toast.success(`"${file.name}" imported successfully`);
      } else {
        toast.error('Import failed');
      }
    } catch (err) {
      toast.error('Failed to import file');
    } finally {
      setImporting(null);
    }
  };

  const handleClose = () => {
    setQuery('');
    setFiles([]);
    setFolderStack([]);
    setHasSearched(false);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Cloud className="w-5 h-5 text-blue-500" />
            Import from Google Drive
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 flex-1 overflow-hidden flex flex-col">
          {/* Search bar */}
          <form onSubmit={handleSearch} className="flex gap-2">
            <Input
              placeholder="Search files..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              className="flex-1"
            />
            <Button type="submit" size="sm" disabled={loading}>
              <Search className="w-4 h-4" />
            </Button>
          </form>

          {/* Breadcrumb */}
          {folderStack.length > 0 && (
            <div className="flex items-center gap-1 text-sm text-slate-500">
              <Button variant="ghost" size="sm" className="h-6 px-1" onClick={handleBack}>
                <ChevronLeft className="w-3 h-3" />
              </Button>
              <span>My Drive</span>
              {folderStack.map((f, i) => (
                <React.Fragment key={f.id}>
                  <span>/</span>
                  <span className={i === folderStack.length - 1 ? 'text-slate-800 font-medium' : ''}>{f.name}</span>
                </React.Fragment>
              ))}
            </div>
          )}

          {/* Browse root button */}
          {!hasSearched && (
            <Button variant="outline" className="w-full" onClick={() => browse(null)} disabled={loading}>
              <Folder className="w-4 h-4 mr-2 text-yellow-500" />
              Browse My Drive
            </Button>
          )}

          {/* File list */}
          <div className="flex-1 overflow-y-auto space-y-1 min-h-0">
            {loading ? (
              <div className="flex items-center justify-center py-12 text-slate-400">
                <Loader2 className="w-6 h-6 animate-spin mr-2" />Loading...
              </div>
            ) : files.length === 0 && hasSearched ? (
              <div className="text-center py-10 text-slate-400">
                <Cloud className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No files found</p>
              </div>
            ) : (
              files.map(file => {
                const Icon = getFileIcon(file.mimeType);
                const isFolder = file.mimeType === 'application/vnd.google-apps.folder';
                const isImportable = !isFolder;
                const isImporting = importing === file.id;

                return (
                  <div
                    key={file.id}
                    className="flex items-center gap-3 p-2 rounded-lg border bg-white hover:bg-slate-50 transition-colors"
                  >
                    {file.thumbnailLink ? (
                      <img src={file.thumbnailLink} alt="" className="w-9 h-9 rounded object-cover flex-shrink-0" />
                    ) : (
                      <div className="w-9 h-9 rounded flex items-center justify-center flex-shrink-0 bg-slate-100">
                        <Icon className={`w-5 h-5 ${getFileColor(file.mimeType)}`} />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">{file.name}</p>
                      {file.modifiedTime && (
                        <p className="text-xs text-slate-400">
                          {format(new Date(file.modifiedTime), 'MMM d, yyyy')}
                          {file.size && ` · ${(file.size / 1024).toFixed(0)} KB`}
                        </p>
                      )}
                    </div>
                    {isFolder ? (
                      <Button variant="ghost" size="sm" onClick={() => handleOpenFolder(file)}>
                        <ArrowRight className="w-4 h-4" />
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        className="bg-teal-600 hover:bg-teal-700 text-white flex-shrink-0"
                        disabled={!!importing}
                        onClick={() => handleImport(file)}
                      >
                        {isImporting ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <CheckCircle2 className="w-4 h-4" />
                        )}
                        <span className="ml-1 text-xs">{isImporting ? 'Importing...' : 'Import'}</span>
                      </Button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}