export default function LoadingSpinner() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center">
      <div className="relative">
        <div 
          className="w-16 h-16 rounded-full border-4 animate-spin"
          style={{ 
            borderColor: 'var(--border)',
            borderTopColor: 'var(--text-primary)',
          }}
        />
      </div>
      <p className="mt-6 text-lg" style={{ color: 'var(--text-secondary)' }}>
        Extracting text from PDF...
      </p>
      <p className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
        This may take a moment for large documents
      </p>
    </div>
  );
}
