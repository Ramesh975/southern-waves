import React, { useRef, useEffect } from 'react';
import {
  FiBold, FiItalic, FiUnderline,
  FiAlignLeft, FiAlignCenter, FiAlignRight, FiAlignJustify,
  FiList, FiTrash2, FiCode, FiLink, FiType, FiMinus
} from 'react-icons/fi';

const WordEditor = ({
  value,
  onChange,
  placeholder = 'Write your content here…',
  minHeight = 360,
}) => {
  const editorRef = useRef(null);

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value || '';
    }
  }, [value]);

  // Listen for external tag-insert events (from story image panel)
  useEffect(() => {
    const handleExternalInsert = (e) => {
      const { tag } = e.detail || {};
      if (!tag || !editorRef.current) return;
      editorRef.current.focus();
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0) {
        const range = sel.getRangeAt(0);
        range.deleteContents();
        const node = document.createTextNode(` ${tag} `);
        range.insertNode(node);
        range.setStartAfter(node);
        range.setEndAfter(node);
        sel.removeAllRanges();
        sel.addRange(range);
      } else {
        document.execCommand('insertText', false, ` ${tag} `);
      }
      handleInput();
    };
    window.addEventListener('wordeditor-insert', handleExternalInsert);
    return () => window.removeEventListener('wordeditor-insert', handleExternalInsert);
  }, []);

  const exec = (command, val = null) => {
    document.execCommand(command, false, val);
    editorRef.current && onChange(editorRef.current.innerHTML);
  };

  const handleInput = () => {
    editorRef.current && onChange(editorRef.current.innerHTML);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const data = e.dataTransfer.getData('text/plain');
    if (!data) return;
    if (document.caretRangeFromPoint) {
      const range = document.caretRangeFromPoint(e.clientX, e.clientY);
      if (range) {
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
      }
    }
    document.execCommand('insertText', false, ` ${data} `);
    handleInput();
  };

  const handleKeyDown = (e) => {
    // Tab inserts spaces
    if (e.key === 'Tab') {
      e.preventDefault();
      exec('insertText', '    ');
    }
  };

  const insertLink = () => {
    const url = prompt('Enter URL:');
    if (url) exec('createLink', url);
  };

  const insertHeading = (level) => {
    exec('formatBlock', `h${level}`);
  };

  const insertHR = () => exec('insertHorizontalRule');

  const insertCode = () => {
    const sel = window.getSelection();
    if (sel && sel.toString()) {
      exec('insertHTML', `<code style="background:#f3f4f6;padding:2px 6px;border-radius:4px;font-family:monospace;font-size:13px">${sel.toString()}</code>`);
    } else {
      exec('insertHTML', '<code style="background:#f3f4f6;padding:2px 6px;border-radius:4px;font-family:monospace;font-size:13px">code here</code>');
    }
  };

  const insertBlockquote = () => exec('formatBlock', 'blockquote');

  const insertOrderedList = () => exec('insertOrderedList');

  return (
    <div className="we-wrapper">
      {/* Sticky Toolbar */}
      <div className="we-toolbar">
        {/* Undo / Redo */}
        <button type="button" className="we-btn" onClick={() => exec('undo')} title="Undo (Ctrl+Z)">↶</button>
        <button type="button" className="we-btn" onClick={() => exec('redo')} title="Redo (Ctrl+Y)">↷</button>
        <div className="we-divider" />

        {/* Headings */}
        <button type="button" className="we-btn we-btn-text" onClick={() => insertHeading(2)} title="Heading 2">H2</button>
        <button type="button" className="we-btn we-btn-text" onClick={() => insertHeading(3)} title="Heading 3">H3</button>
        <button type="button" className="we-btn we-btn-text" onClick={() => exec('formatBlock', 'p')} title="Paragraph">
          <FiType size={13} />
        </button>
        <div className="we-divider" />

        {/* Text style */}
        <button type="button" className="we-btn we-btn-text-bold" onClick={() => exec('bold')} title="Bold (Ctrl+B)">
          <FiBold size={13} />
        </button>
        <button type="button" className="we-btn" onClick={() => exec('italic')} title="Italic (Ctrl+I)">
          <FiItalic size={13} />
        </button>
        <button type="button" className="we-btn" onClick={() => exec('underline')} title="Underline (Ctrl+U)">
          <FiUnderline size={13} />
        </button>
        <button type="button" className="we-btn" onClick={insertCode} title="Inline code">
          <FiCode size={13} />
        </button>
        <div className="we-divider" />

        {/* Alignment */}
        <button type="button" className="we-btn" onClick={() => exec('justifyLeft')} title="Align Left">
          <FiAlignLeft size={13} />
        </button>
        <button type="button" className="we-btn" onClick={() => exec('justifyCenter')} title="Align Center">
          <FiAlignCenter size={13} />
        </button>
        <button type="button" className="we-btn" onClick={() => exec('justifyRight')} title="Align Right">
          <FiAlignRight size={13} />
        </button>
        <button type="button" className="we-btn" onClick={() => exec('justifyFull')} title="Justify">
          <FiAlignJustify size={13} />
        </button>
        <div className="we-divider" />

        {/* Lists */}
        <button type="button" className="we-btn" onClick={() => exec('insertUnorderedList')} title="Bullet list">
          <FiList size={13} />
        </button>
        <button type="button" className="we-btn we-btn-text" onClick={insertOrderedList} title="Numbered list">1.</button>
        <button type="button" className="we-btn we-btn-text" onClick={insertBlockquote} title="Blockquote">"</button>
        <div className="we-divider" />

        {/* Insert */}
        <button type="button" className="we-btn" onClick={insertLink} title="Insert link">
          <FiLink size={13} />
        </button>
        <button type="button" className="we-btn" onClick={insertHR} title="Horizontal rule">
          <FiMinus size={13} />
        </button>
        <div className="we-divider" />

        {/* Clear */}
        <button type="button" className="we-btn we-btn-danger" onClick={() => exec('removeFormat')} title="Clear formatting">
          <FiTrash2 size={13} />
        </button>
      </div>

      {/* Editor Canvas */}
      <div className="we-canvas-wrap">
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          onInput={handleInput}
          onKeyDown={handleKeyDown}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          placeholder={placeholder}
          className="we-canvas"
          style={{ minHeight }}
        />
      </div>

      <style>{`
        .we-wrapper {
          display: flex;
          flex-direction: column;
          border: 1.5px solid var(--color-gray-200, #e5e7eb);
          border-radius: 12px;
          overflow: hidden;
          background: #fff;
          transition: border-color 0.2s;
        }
        .we-wrapper:focus-within {
          border-color: var(--accent-color, #0055a4);
          box-shadow: 0 0 0 3px rgba(0,85,164,0.08);
        }
        [data-theme="dark"] .we-wrapper {
          background: #1a1a24;
          border-color: rgba(255,255,255,0.1);
        }
        [data-theme="dark"] .we-wrapper:focus-within {
          border-color: rgba(0,85,164,0.6);
        }
        .we-toolbar {
          display: flex;
          align-items: center;
          gap: 2px;
          padding: 8px 12px;
          background: var(--color-gray-50, #f9fafb);
          border-bottom: 1px solid var(--color-gray-200, #e5e7eb);
          flex-wrap: wrap;
          position: sticky;
          top: 0;
          z-index: 10;
        }
        [data-theme="dark"] .we-toolbar {
          background: #141420;
          border-bottom-color: rgba(255,255,255,0.07);
        }
        .we-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 28px;
          height: 28px;
          border: none;
          background: transparent;
          border-radius: 6px;
          cursor: pointer;
          color: var(--color-gray-700, #374151);
          font-size: 13px;
          font-weight: 600;
          transition: background 0.15s, color 0.15s;
          flex-shrink: 0;
        }
        [data-theme="dark"] .we-btn {
          color: rgba(255,255,255,0.7);
        }
        .we-btn:hover {
          background: var(--color-gray-200, #e5e7eb);
          color: var(--color-black, #0d0d0d);
        }
        [data-theme="dark"] .we-btn:hover {
          background: rgba(255,255,255,0.1);
          color: #fff;
        }
        .we-btn-text { font-size: 11px; font-weight: 700; width: auto; padding: 0 6px; }
        .we-btn-text-bold { font-weight: 900; }
        .we-btn-danger { color: #ef4444 !important; }
        .we-btn-danger:hover { background: #fee2e2 !important; }
        .we-divider {
          width: 1px;
          height: 18px;
          background: var(--color-gray-200, #e5e7eb);
          margin: 0 4px;
          flex-shrink: 0;
        }
        [data-theme="dark"] .we-divider { background: rgba(255,255,255,0.08); }

        .we-canvas-wrap {
          flex: 1;
          padding: 0;
          overflow-y: auto;
        }
        .we-canvas {
          display: block;
          width: 100%;
          padding: 28px 32px;
          box-sizing: border-box;
          outline: none;
          font-family: var(--font-serif, 'Playfair Display', Georgia, serif);
          font-size: 16px;
          line-height: 1.75;
          color: var(--color-black, #0d0d0d);
          background: transparent;
        }
        [data-theme="dark"] .we-canvas {
          color: rgba(255,255,255,0.88);
        }
        .we-canvas:empty:before {
          content: attr(placeholder);
          color: var(--color-gray-400, #9ca3af);
          pointer-events: none;
          display: block;
          font-family: var(--font-sans, sans-serif);
          font-style: italic;
          font-size: 15px;
        }
        .we-canvas h2 {
          font-family: var(--font-display, 'Outfit', sans-serif);
          font-size: 22px;
          font-weight: 800;
          margin: 24px 0 8px;
          line-height: 1.3;
        }
        .we-canvas h3 {
          font-family: var(--font-display, 'Outfit', sans-serif);
          font-size: 18px;
          font-weight: 700;
          margin: 20px 0 6px;
        }
        .we-canvas blockquote {
          border-left: 3px solid var(--accent-color, #0055a4);
          margin: 16px 0;
          padding: 8px 20px;
          color: var(--color-gray-600, #4b5563);
          font-style: italic;
          background: var(--color-gray-50, #f9fafb);
          border-radius: 0 8px 8px 0;
        }
        [data-theme="dark"] .we-canvas blockquote {
          background: rgba(255,255,255,0.04);
          color: rgba(255,255,255,0.6);
        }
        .we-canvas ul, .we-canvas ol {
          padding-left: 24px;
          margin: 12px 0;
        }
        .we-canvas li { margin: 4px 0; }
        .we-canvas hr {
          border: none;
          border-top: 2px solid var(--color-gray-200, #e5e7eb);
          margin: 24px 0;
        }
        .we-canvas a { color: var(--accent-color, #0055a4); text-decoration: underline; }
        .we-canvas code {
          background: var(--color-gray-100, #f3f4f6);
          padding: 2px 6px;
          border-radius: 4px;
          font-family: 'Fira Mono', 'Courier New', monospace;
          font-size: 13px;
        }
        [data-theme="dark"] .we-canvas code { background: rgba(255,255,255,0.08); }

        .article-inline-image { margin: 28px 0; text-align: center; }
      `}</style>
    </div>
  );
};

export default WordEditor;
