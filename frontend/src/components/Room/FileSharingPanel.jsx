import { useState, useEffect } from 'react';
import { Upload, FileText, FileImage, FileCode, Download, Loader2, Paperclip, CheckCircle, XCircle, X } from 'lucide-react';
import { files as filesApi } from '../../services/api';

const MAX_FILE_SIZE_MB = 5;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

const getFileIcon = (name = '', mimetype = '') => {
  if (mimetype.startsWith('image/')) return <FileImage className="w-5 h-5" />;
  if (mimetype.includes('pdf') || name.endsWith('.pdf')) return <FileText className="w-5 h-5 text-red-500" />;
  if (mimetype.includes('text') || name.endsWith('.txt') || name.endsWith('.md')) return <FileCode className="w-5 h-5 text-green-500" />;
  return <FileText className="w-5 h-5" />;
};

const Toast = ({ message, type, onClose }) => (
  <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold shadow-sm border ${
    type === 'success'
      ? 'bg-green-50 border-green-200 text-green-800'
      : 'bg-red-50 border-red-200 text-red-800'
  }`}>
    {type === 'success'
      ? <CheckCircle className="w-3.5 h-3.5 text-green-600 flex-shrink-0" />
      : <XCircle className="w-3.5 h-3.5 text-red-600 flex-shrink-0" />
    }
    <span className="flex-1">{message}</span>
    <button onClick={onClose} className="opacity-60 hover:opacity-100 transition">
      <X className="w-3 h-3" />
    </button>
  </div>
);

export const FileSharingPanel = ({ roomId }) => {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchFiles = async () => {
    try {
      setLoading(true);
      const res = await filesApi.getRoomFiles(roomId);
      setFiles(res.data || []);
    } catch (err) {
      console.error('Failed to load room files:', err);
      showToast('Failed to load shared files. Please refresh.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (roomId) fetchFiles();
  }, [roomId]);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file size
    if (file.size > MAX_FILE_SIZE_BYTES) {
      showToast(`File too large. Maximum size is ${MAX_FILE_SIZE_MB}MB.`, 'error');
      e.target.value = '';
      return;
    }

    setUploading(true);

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const base64Content = reader.result;
        await filesApi.upload(roomId, {
          name: file.name,
          content: base64Content,
          mimetype: file.type || 'application/octet-stream',
          size: file.size
        });
        await fetchFiles();
        showToast('File shared successfully!', 'success');
      } catch (err) {
        showToast(err.message || 'Failed to upload file. Try a smaller file.', 'error');
      } finally {
        setUploading(false);
        e.target.value = '';
      }
    };
    reader.onerror = () => {
      showToast('Error reading file. Please try again.', 'error');
      setUploading(false);
      e.target.value = '';
    };
    reader.readAsDataURL(file);
  };

  const handleDownload = async (fileId, fileName) => {
    setDownloadingId(fileId);
    try {
      const res = await filesApi.download(fileId);
      const base64Data = res.content;

      const link = document.createElement('a');
      link.href = base64Data;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast(`"${fileName}" downloaded!`, 'success');
    } catch (err) {
      showToast(err.message || 'Failed to download file.', 'error');
    } finally {
      setDownloadingId(null);
    }
  };

  const formatBytes = (bytes, decimals = 1) => {
    if (!+bytes) return '0 B';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
  };

  return (
    <div className="flex flex-col h-[500px] bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm font-sans">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white flex-shrink-0">
        <div className="flex items-center gap-2">
          <Paperclip className="w-5 h-5" />
          <div>
            <h3 className="font-semibold text-sm">Shared Resources</h3>
            <p className="text-[10px] text-purple-100">Upload & download study materials (max {MAX_FILE_SIZE_MB}MB)</p>
          </div>
        </div>

        {/* Upload Button */}
        <label className={`flex items-center gap-1.5 bg-white/20 hover:bg-white/30 cursor-pointer text-xs px-3 py-1.5 rounded-lg font-semibold transition border border-white/20 ${uploading ? 'opacity-70 pointer-events-none' : ''}`}>
          {uploading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Upload className="w-3.5 h-3.5" />
          )}
          <span>{uploading ? 'Uploading…' : 'Share File'}</span>
          <input
            type="file"
            onChange={handleFileUpload}
            disabled={uploading}
            className="hidden"
            accept=".pdf,.txt,.md,.png,.jpg,.jpeg,.gif,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.csv,.zip,.json,.js,.ts,.py"
          />
        </label>
      </div>

      {/* Toast Notification */}
      {toast && (
        <div className="px-3 pt-2 flex-shrink-0">
          <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
        </div>
      )}

      {/* File List Area */}
      <div className="flex-1 bg-gray-50 overflow-y-auto p-4">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-8 h-8 text-purple-600 animate-spin" />
          </div>
        ) : files.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 space-y-2">
            <FileText className="w-10 h-10 stroke-1 opacity-40 text-purple-600" />
            <p className="text-xs font-semibold">No shared materials yet</p>
            <p className="text-[10px]">Be the first to share a note or PDF!</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {files.map((file) => (
              <div
                key={file._id}
                className="flex items-center justify-between p-3 bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md hover:border-purple-100 transition-all"
              >
                <div className="flex items-center gap-3 min-w-0 mr-3">
                  <div className="w-9 h-9 bg-purple-50 text-purple-600 rounded-lg flex items-center justify-center flex-shrink-0">
                    {getFileIcon(file.name, file.mimetype)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-gray-800 truncate" title={file.name}>
                      {file.name}
                    </p>
                    <p className="text-[10px] text-gray-400 mt-0.5">
                      {formatBytes(file.size)} • By {file.uploadedBy?.username || 'Unknown'}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => handleDownload(file._id, file.name)}
                  disabled={downloadingId === file._id}
                  className="p-2 rounded-lg bg-gray-50 hover:bg-purple-50 text-gray-600 hover:text-purple-600 border border-gray-200 hover:border-purple-200 transition-all flex-shrink-0 disabled:opacity-50"
                  title="Download File"
                >
                  {downloadingId === file._id
                    ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    : <Download className="w-3.5 h-3.5" />
                  }
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
