import { useState, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import FileUpload from './components/FileUpload';
import ReaderView from './components/ReaderView';
import LoadingSpinner from './components/LoadingSpinner';

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

export type Theme = 'light' | 'dark' | 'sepia';

interface ExtractedContent {
  text: string;
  paragraphs: string[];
  fileName: string;
}

function App() {
  const [content, setContent] = useState<ExtractedContent | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [theme, setTheme] = useState<Theme>('light');
  const [fontSize, setFontSize] = useState(18);

  const extractTextFromPdf = useCallback(async (file: File) => {
    setLoading(true);
    setError(null);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      
      const allTextItems: { text: string; y: number; pageNum: number }[] = [];
      
      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        
        textContent.items.forEach((item: any) => {
          if (item.str && item.str.trim()) {
            allTextItems.push({
              text: item.str,
              y: item.transform ? item.transform[5] : 0,
              pageNum,
            });
          }
        });
      }

      const paragraphs = formatTextToParagraphs(allTextItems);
      
      setContent({
        text: paragraphs.join('\n\n'),
        paragraphs,
        fileName: file.name,
      });
    } catch (err: any) {
      console.error('PDF extraction error:', err);
      setError(err.message || 'Failed to extract text from PDF');
    } finally {
      setLoading(false);
    }
  }, []);

  const formatTextToParagraphs = (items: { text: string; y: number; pageNum: number }[]): string[] => {
    if (items.length === 0) return [];

    const paragraphs: string[] = [];
    let currentParagraph = '';
    let lastY = items[0].y;
    let lastPage = items[0].pageNum;

    for (const item of items) {
      const yDiff = Math.abs(item.y - lastY);
      const isNewPage = item.pageNum !== lastPage;
      const isLargeGap = yDiff > 20;

      if (isNewPage || isLargeGap) {
        if (currentParagraph.trim()) {
          paragraphs.push(cleanParagraph(currentParagraph));
        }
        currentParagraph = item.text;
      } else {
        if (currentParagraph.endsWith('-')) {
          currentParagraph = currentParagraph.slice(0, -1) + item.text;
        } else {
          currentParagraph += (currentParagraph ? ' ' : '') + item.text;
        }
      }

      lastY = item.y;
      lastPage = item.pageNum;
    }

    if (currentParagraph.trim()) {
      paragraphs.push(cleanParagraph(currentParagraph));
    }

    return paragraphs.filter(p => p.length > 10);
  };

  const cleanParagraph = (text: string): string => {
    return text
      .replace(/\s+/g, ' ')
      .replace(/- /g, '')
      .trim();
  };

  const handleFileSelect = (file: File) => {
    extractTextFromPdf(file);
  };

  const handleBack = () => {
    setContent(null);
    setError(null);
  };

  const themeClass = `theme-${theme}`;

  return (
    <div className={`min-h-screen transition-colors duration-300 ${themeClass}`}
         style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
      {loading ? (
        <LoadingSpinner />
      ) : content ? (
        <ReaderView
          content={content}
          theme={theme}
          fontSize={fontSize}
          onThemeChange={setTheme}
          onFontSizeChange={setFontSize}
          onBack={handleBack}
        />
      ) : (
        <FileUpload onFileSelect={handleFileSelect} error={error} />
      )}
    </div>
  );
}

export default App;
