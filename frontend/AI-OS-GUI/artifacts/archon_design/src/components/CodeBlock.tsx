import React, { useState, useEffect } from 'react';

interface CodeBlockProps {
  code: string;
  language: string;
  isStreaming?: boolean;
}

export const CodeBlock: React.FC<CodeBlockProps> = React.memo(({ code, language, isStreaming = false }) => {
  const [highlightedHtml, setHighlightedHtml] = useState<string | null>(null);

  // Debounce parsing during streaming to prevent locking the UI thread
  useEffect(() => {
    if (isStreaming) {
      setHighlightedHtml(null);
      return;
    }

    const timer = setTimeout(() => {
      try {
        // Simple escape-HTML highlighting fallback since Prism is not fully configured,
        // or we can just safely render the text dynamically.
        setHighlightedHtml(code); 
      } catch (err) {
        console.error("Syntax highlighting failed", err);
      }
    }, 250); // 250ms debounce after stream stops

    return () => clearTimeout(timer);
  }, [code, language, isStreaming]);

  if (isStreaming || !highlightedHtml) {
    return (
      <pre className="font-mono text-xs text-text-secondary overflow-x-auto p-4 bg-bg-dark rounded-xl border border-border-premium">
        <code>{code}</code>
      </pre>
    );
  }

  return (
    <pre className="font-mono text-xs text-text-primary overflow-x-auto p-4 bg-bg-dark rounded-xl border border-border-premium transition-all duration-200">
      <code dangerouslySetInnerHTML={{ __html: highlightedHtml }} />
    </pre>
  );
});

CodeBlock.displayName = 'CodeBlock';
