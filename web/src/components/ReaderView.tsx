import { useState } from 'react';
import { ArrowLeft, Minus, Plus, Sun, Moon, BookOpen } from 'lucide-react';
import type { Theme } from '../App';

interface ReaderViewProps {
  content: {
    paragraphs: string[];
    fileName: string;
  };
  theme: Theme;
  fontSize: number;
  onThemeChange: (theme: Theme) => void;
  onFontSizeChange: (size: number) => void;
  onBack: () => void;
}

export default function ReaderView({
  content,
  theme,
  fontSize,
  onThemeChange,
  onFontSizeChange,
  onBack,
}: ReaderViewProps) {
  const [controlsVisible, setControlsVisible] = useState(true);

  const increaseFontSize = () => {
    if (fontSize < 28) onFontSizeChange(fontSize + 2);
  };

  const decreaseFontSize = () => {
    if (fontSize > 14) onFontSizeChange(fontSize - 2);
  };

  const themeButtons: { value: Theme; icon: React.ReactNode; label: string }[] = [
    { value: 'light', icon: <Sun className="w-4 h-4" />, label: 'Light' },
    { value: 'dark', icon: <Moon className="w-4 h-4" />, label: 'Dark' },
    { value: 'sepia', icon: <BookOpen className="w-4 h-4" />, label: 'Sepia' },
  ];

  return (
    <div className="min-h-screen">
      <header 
        className={`
          sticky top-0 z-50 backdrop-blur-md transition-opacity duration-300
          ${controlsVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'}
        `}
        style={{ backgroundColor: 'var(--bg-primary)', borderBottom: '1px solid var(--border)' }}
      >
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <button
            onClick={onBack}
            className="flex items-center gap-2 px-3 py-2 rounded-lg transition-colors hover:bg-opacity-10"
            style={{ color: 'var(--text-primary)' }}
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="hidden sm:inline">Back</span>
          </button>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1 rounded-lg p-1" style={{ backgroundColor: 'var(--bg-secondary)' }}>
              <button
                onClick={decreaseFontSize}
                className="p-2 rounded-md transition-colors hover:bg-opacity-50"
                style={{ color: 'var(--text-primary)' }}
                disabled={fontSize <= 14}
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="px-2 text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                {fontSize}
              </span>
              <button
                onClick={increaseFontSize}
                className="p-2 rounded-md transition-colors hover:bg-opacity-50"
                style={{ color: 'var(--text-primary)' }}
                disabled={fontSize >= 28}
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center gap-1 rounded-lg p-1" style={{ backgroundColor: 'var(--bg-secondary)' }}>
              {themeButtons.map((btn) => (
                <button
                  key={btn.value}
                  onClick={() => onThemeChange(btn.value)}
                  className={`
                    p-2 rounded-md transition-all flex items-center gap-1
                    ${theme === btn.value ? 'ring-2 ring-offset-1' : ''}
                  `}
                  style={{ 
                    color: 'var(--text-primary)',
                    backgroundColor: theme === btn.value ? 'var(--bg-primary)' : 'transparent',
                  }}
                  title={btn.label}
                >
                  {btn.icon}
                  <span className="hidden md:inline text-sm">{btn.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      <main 
        className="px-4 sm:px-6 py-8 sm:py-12"
        onClick={() => setControlsVisible(!controlsVisible)}
      >
        <article className="max-w-prose mx-auto reader-content font-serif">
          <h1 
            className="text-2xl sm:text-3xl font-bold mb-8 text-center"
            style={{ fontSize: `${fontSize + 8}px` }}
          >
            {content.fileName.replace('.pdf', '')}
          </h1>

          <div style={{ fontSize: `${fontSize}px` }}>
            {content.paragraphs.map((paragraph, index) => (
              <p key={index}>{paragraph}</p>
            ))}
          </div>
        </article>
      </main>

      <footer 
        className="py-8 text-center text-sm"
        style={{ color: 'var(--text-secondary)' }}
      >
        End of document
      </footer>
    </div>
  );
}
