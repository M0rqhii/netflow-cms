import React, { useRef, useEffect } from 'react';
import { clsx } from 'clsx';

export interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  placeholder = 'Enter text...',
  className,
  disabled,
}) => {
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!editorRef.current) return;
    if (editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value || '';
    }
  }, [value]);

  const handleInput = () => {
    if (!editorRef.current) return;
    onChange(editorRef.current.innerHTML);
  };

  const execCommand = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
    handleInput();
  };

  return (
    <div className={clsx('border border-border rounded-md bg-card', className)}>
      <div className="flex items-center gap-1 p-2 border-b border-border bg-surface">
        <button
          type="button"
          className="p-1 hover:bg-border/60 rounded"
          onClick={() => execCommand('bold')}
          title="Bold"
          disabled={disabled}
        >
          <strong>B</strong>
        </button>
        <button
          type="button"
          className="p-1 hover:bg-border/60 rounded"
          onClick={() => execCommand('italic')}
          title="Italic"
          disabled={disabled}
        >
          <em>I</em>
        </button>
        <button
          type="button"
          className="p-1 hover:bg-border/60 rounded"
          onClick={() => execCommand('underline')}
          title="Underline"
          disabled={disabled}
        >
          <u>U</u>
        </button>
        <div className="w-px h-6 bg-border mx-1" />
        <button
          type="button"
          className="p-1 hover:bg-border/60 rounded"
          onClick={() => execCommand('formatBlock', 'h2')}
          title="Heading"
          disabled={disabled}
        >
          H2
        </button>
        <button
          type="button"
          className="p-1 hover:bg-border/60 rounded"
          onClick={() => execCommand('insertUnorderedList')}
          title="Bullet List"
          disabled={disabled}
        >
          •
        </button>
        <button
          type="button"
          className="p-1 hover:bg-border/60 rounded"
          onClick={() => execCommand('insertOrderedList')}
          title="Numbered List"
          disabled={disabled}
        >
          1.
        </button>
        <div className="w-px h-6 bg-border mx-1" />
        <button
          type="button"
          className="p-1 hover:bg-border/60 rounded"
          onClick={() => execCommand('createLink', prompt('Enter URL:') || undefined)}
          title="Link"
          disabled={disabled}
        >
          🔗
        </button>
      </div>
      <div
        ref={editorRef}
        contentEditable={!disabled}
        onInput={handleInput}
        className="min-h-[150px] p-3 focus:outline-none text-foreground"
        style={{ whiteSpace: 'pre-wrap' }}
        data-placeholder={placeholder}
        suppressContentEditableWarning
      />
      <style jsx>{`
        [contenteditable][data-placeholder]:empty:before {
          content: attr(data-placeholder);
          color: rgb(148, 163, 184);
          cursor: text;
        }
      `}</style>
    </div>
  );
};




