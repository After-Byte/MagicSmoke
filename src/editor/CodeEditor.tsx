import React, { useEffect, useRef } from 'react';
import * as monaco from 'monaco-editor';

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  readOnly?: boolean;
}

export const CodeEditor: React.FC<CodeEditorProps> = ({ value, onChange, readOnly = false }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Define industrial dark theme matching Taste Skill
    monaco.editor.defineTheme('magicsmoke-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '64748b', fontStyle: 'italic' },
        { token: 'keyword', foreground: '00f0ff', fontStyle: 'bold' },
        { token: 'identifier', foreground: 'e2e8f0' },
        { token: 'number', foreground: 'f59e0b' },
        { token: 'string', foreground: '10b981' },
      ],
      colors: {
        'editor.background': '#0f1117',
        'editor.foreground': '#e2e8f0',
        'editor.lineHighlightBackground': '#161d27',
        'editorLineNumber.foreground': '#475569',
        'editorLineNumber.activeForeground': '#00f0ff',
        'editorCursor.foreground': '#00f0ff',
      },
    });

    editorRef.current = monaco.editor.create(containerRef.current, {
      value,
      language: 'cpp',
      theme: 'magicsmoke-dark',
      automaticLayout: true,
      fontSize: 13,
      fontFamily: "'JetBrains Mono', monospace",
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      renderLineHighlight: 'all',
      readOnly,
      lineNumbers: 'on',
      padding: { top: 12, bottom: 12 },
    });

    editorRef.current.onDidChangeModelContent(() => {
      onChange(editorRef.current?.getValue() || '');
    });

    return () => {
      editorRef.current?.dispose();
    };
  }, []);

  return <div ref={containerRef} className="w-full h-full border border-[#1e2430]" />;
};
