import { useState, useEffect, useRef } from 'react';
import { Upload, File, FileText, Image as ImageIcon, FileCode, Download, Loader, Trash2, FolderUp } from 'lucide-react';
import { files as filesApi } from '../../services/api';
import { useSocket } from '../../hooks/useSocket';
import { useAuth } from '../../hooks/useAuth';

export const FileSharingPanel = ({ roomId }) => {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  
  const fileInputRef = useRef(null);
  const { socket } = useSocket();
  const { user } = useAuth();

  const fetchFiles = async () => {
    try {
      setLoading(true);
      const res = await filesApi.getRoomFiles(roomId);
      setFiles(res.data || []);
      setError(null);
    } catch (err) {
      setError(err.message || 'Failed to load files');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!roomId) return;
    fetchFiles();

    if (socket) {
      const handleFileShared = (newFile) => {
        if (newFile.roomId === roomId) {
          setFiles((prev) => {
            if (prev.some((f) => f._id === newFile._id)) return prev;
            return [newFile, ...prev];
          });
        }
      };

      socket.on('file:shared', handleFileShared);
      return () => {
        socket.off('file:shared', handleFileShared);
      };
    }
  }, [roomId, socket]);

  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64String = reader.result.split(',')[1];
        resolve(base64String);
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setError('File size exceeds 10MB limit');
      return;
    }

    try {
      setUploading(true);
      setError(null);
      const base64Content = await fileToBase64(file);
      const payload = {
        name: file.name,
        content: base64Content,
        mimetype: file.type || 'application/octet-stream',
        size: file.size
      };
      const res = await filesApi.upload(roomId, payload);
      const newFile = res.data.file || res.data;
      
      setFiles((prev) => [newFile, ...prev]);
      
      if (socket) {
        socket.emit('file:share', newFile);
      }
    } catch (err) {
      setError(err.message || 'Failed to upload file');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDownload = async (fileId, filename) => {
    try {
      const res = await filesApi.download(fileId);
      const fileData = res.data || res;
      if (!fileData || !fileData.content) {
        throw new Error('Invalid file content received');
      }

      const byteCharacters = atob(fileData.content);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: fileData.mimetype || 'application/octet-stream' });

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename || fileData.name;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error(err);
      setError('Failed to download file');
    }
  };

  const handleDelete = async (fileId) => {  
    if (!window.confirm('Delete this file?')) return;
    try {
      await filesApi.delete(fileId);
      setFiles(files.filter(f => f._id !== fileId));
    } catch (err) {
      setError('Failed to delete file');
    }
  };

  const getFileIcon = (fileType) => {
    if (fileType?.startsWith('image/')) return <ImageIcon size={18} color="#f472b6" />;
    if (fileType?.includes('pdf') || fileType?.includes('document')) return <FileText size={18} color="#60a5fa" />;
    if (fileType?.includes('javascript') || fileType?.includes('json')) return <FileCode size={18} color="#fcd34d" />;
    return <File size={18} color="#94a3b8" />;
  };

  const formatSize = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <div className="files-panel">
      {/* Header */}
      <div className="panel-header" style={{ padding: '0.75rem 1rem', background: 'rgba(30,27,75,0.5)' }}>
        <div className="panel-header-title">
          <FolderUp size={16} color="#c084fc" />
          Room Files
        </div>
        
        <div>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            style={{ display: 'none' }}
          />
          <button
            className="btn btn-primary"
            style={{ padding: '0.4rem 0.75rem', fontSize: '0.75rem' }}
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? (
              <><Loader size={14} className="spinner-sm" /> Uploading...</>
            ) : (
              <><Upload size={14} /> Upload File</>
            )}
          </button>
        </div>
      </div>

      {error && (
        <div className="files-toast" style={{ paddingTop: '0.625rem' }}>
          <div className="inline-toast inline-toast-error">
            {error}
          </div>
        </div>
      )}

      {/* File List */}
      <div className="files-list">
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
            <div className="spinner" />
          </div>
        ) : files.length === 0 ? (
          <div className="files-empty">
            <FolderUp size={36} style={{ opacity: 0.2 }} />
            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>No files shared yet</div>
            <div style={{ fontSize: '0.75rem' }}>Upload notes, images, or PDFs to share with the room</div>
          </div>
        ) : (
          files.map((file) => {
            const isOwner = String(file.uploadedBy?._id || file.uploadedBy) === String(user._id);
            return (
              <div key={file._id} className="file-item animate-fade-in">
                <div className="file-icon-wrap" style={{ background: 'rgba(255,255,255,0.05)' }}>
                  {getFileIcon(file.fileType)}
                </div>
                
                <div className="file-info">
                  <div className="file-name" title={file.originalName}>{file.originalName}</div>
                  <div className="file-meta">
                    {formatSize(file.size)} • by {file.uploadedBy?.username || 'Unknown'}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.25rem' }}>
                  <button
                    className="file-download-btn"
                    onClick={() => handleDownload(file._id, file.originalName)}
                    title="Download"
                  >
                    <Download size={14} />
                  </button>
                  {isOwner && (
                    <button
                      className="file-download-btn"
                      onClick={() => handleDelete(file._id)}
                      title="Delete"
                      style={{ color: '#fca5a5', background: 'rgba(239,68,68,0.1)', borderColor: 'transparent' }}
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
