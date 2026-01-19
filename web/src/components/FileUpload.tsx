import { useState, useCallback, useRef } from 'react';
import { Upload, FileText } from 'lucide-react';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  error: string | null;
}

export default function FileUpload({ onFileSelect, error }: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      if (file.type === 'application/pdf') {
        onFileSelect(file);
      }
    }
  }, [onFileSelect]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      onFileSelect(files[0]);
    }
  }, [onFileSelect]);

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6">
      <div className="text-center mb-8">
        <div className="flex items-center justify-center gap-3 mb-4">
          <FileText className="w-10 h-10" style={{ color: 'var(--text-primary)' }} />
          <h1 className="text-3xl md:text-4xl font-serif font-bold">
            Reflow PDF Reader
          </h1>
        </div>
        <p className="text-lg" style={{ color: 'var(--text-secondary)' }}>
          Transform any PDF into a clean, continuous reading experience
        </p>
      </div>

      <div
        onClick={handleClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          w-full max-w-lg p-12 rounded-2xl border-2 border-dashed cursor-pointer
          transition-all duration-200 text-center
          ${isDragging ? 'scale-105' : 'hover:scale-102'}
        `}
        style={{
          borderColor: isDragging ? 'var(--text-primary)' : 'var(--border)',
          backgroundColor: isDragging ? 'var(--bg-secondary)' : 'transparent',
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,application/pdf"
          onChange={handleFileInput}
          className="hidden"
        />
        
        <Upload 
          className="w-12 h-12 mx-auto mb-4" 
          style={{ color: 'var(--text-secondary)' }}
        />
        
        <p className="text-lg font-medium mb-2">
          {isDragging ? 'Drop your PDF here' : 'Drag & drop a PDF file'}
        </p>
        <p style={{ color: 'var(--text-secondary)' }}>
          or click to browse
        </p>
      </div>

      {error && (
        <div className="mt-6 p-4 rounded-lg bg-red-100 text-red-700 max-w-lg w-full text-center">
          {error}
        </div>
      )}

      <div className="mt-12 text-center max-w-md" style={{ color: 'var(--text-secondary)' }}>
        <p className="text-sm">
          Your PDF is processed entirely in your browser. 
          No files are uploaded to any server.
        </p>
      </div>
    </div>
  );
}
