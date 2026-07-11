import React, { useRef, useEffect } from 'react';
import { 
  FiBold, FiItalic, FiUnderline, 
  FiAlignLeft, FiAlignCenter, FiAlignRight, 
  FiList, FiTrash2 
} from 'react-icons/fi';

const WordEditor = ({ value, onChange, placeholder = "Write your content here..." }) => {
  const editorRef = useRef(null);

  // Sync value from parent to editor when it changes externally
  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value || '';
    }
  }, [value]);

  const executeCommand = (command, value = null) => {
    document.execCommand(command, false, value);
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  const handleInput = () => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  return (
    <div style={{
      border: '2px solid var(--color-black, #000)',
      borderRadius: '8px',
      background: '#f3f4f6',
      overflow: 'hidden',
      fontFamily: 'var(--font-sans, "Segoe UI", sans-serif)',
      boxShadow: '4px 4px 0 var(--color-black, #000)'
    }}>
      {/* MS Word style toolbar / ribbon */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        padding: '8px 12px',
        borderBottom: '2px solid var(--color-black, #000)',
        background: '#ffffff',
        flexWrap: 'wrap'
      }}>
        {/* Undo / Redo */}
        <button 
          type="button"
          onClick={() => executeCommand('undo')}
          title="Undo"
          className="word-toolbar-btn"
          style={btnStyle}
        >↶</button>
        <button 
          type="button"
          onClick={() => executeCommand('redo')}
          title="Redo"
          className="word-toolbar-btn"
          style={btnStyle}
        >↷</button>

        <div style={dividerStyle} />

        {/* Text Style formatting */}
        <button 
          type="button"
          onClick={() => executeCommand('bold')}
          title="Bold"
          className="word-toolbar-btn"
          style={btnStyle}
        >
          <FiBold size={14} />
        </button>
        <button 
          type="button"
          onClick={() => executeCommand('italic')}
          title="Italic"
          className="word-toolbar-btn"
          style={btnStyle}
        >
          <FiItalic size={14} />
        </button>
        <button 
          type="button"
          onClick={() => executeCommand('underline')}
          title="Underline"
          className="word-toolbar-btn"
          style={btnStyle}
        >
          <FiUnderline size={14} />
        </button>

        <div style={dividerStyle} />

        {/* Alignment */}
        <button 
          type="button"
          onClick={() => executeCommand('justifyLeft')}
          title="Align Left"
          className="word-toolbar-btn"
          style={btnStyle}
        >
          <FiAlignLeft size={14} />
        </button>
        <button 
          type="button"
          onClick={() => executeCommand('justifyCenter')}
          title="Align Center"
          className="word-toolbar-btn"
          style={btnStyle}
        >
          <FiAlignCenter size={14} />
        </button>
        <button 
          type="button"
          onClick={() => executeCommand('justifyRight')}
          title="Align Right"
          className="word-toolbar-btn"
          style={btnStyle}
        >
          <FiAlignRight size={14} />
        </button>

        <div style={dividerStyle} />

        {/* Lists */}
        <button 
          type="button"
          onClick={() => executeCommand('insertUnorderedList')}
          title="Bullet List"
          className="word-toolbar-btn"
          style={btnStyle}
        >
          <FiList size={14} />
        </button>

        <div style={dividerStyle} />

        {/* Clear formatting */}
        <button 
          type="button"
          onClick={() => executeCommand('removeFormat')}
          title="Clear Formatting"
          className="word-toolbar-btn"
          style={{ ...btnStyle, color: '#ef4444' }}
        >
          <FiTrash2 size={14} />
        </button>
      </div>

      {/* MS Word style canvas sheet */}
      <div style={{
        padding: '24px',
        display: 'flex',
        justifyContent: 'center',
        background: '#e5e7eb',
        minHeight: '320px',
        overflowY: 'auto'
      }}>
        <div 
          ref={editorRef}
          contentEditable
          onInput={handleInput}
          placeholder={placeholder}
          className="word-page-editor"
          style={{
            width: '100%',
            maxWidth: '800px',
            minHeight: '280px',
            background: '#ffffff',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
            border: '1px solid #d1d5db',
            borderRadius: '2px',
            padding: '40px 48px',
            boxSizing: 'border-box',
            outline: 'none',
            color: '#000000',
            fontSize: '14px',
            lineHeight: '1.6',
            textAlign: 'left'
          }}
        />
      </div>

      {/* Styled placeholder handling */}
      <style>{`
        .word-page-editor:empty:before {
          content: attr(placeholder);
          color: #9ca3af;
          pointer-events: none;
          display: block;
        }
        .word-toolbar-btn:hover {
          background-color: #f3f4f6 !important;
          border-color: #d1d5db !important;
        }
      `}</style>
    </div>
  );
};

const btnStyle = {
  background: 'none',
  border: '1.5px solid transparent',
  padding: '6px',
  borderRadius: '4px',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: '#374151',
  transition: 'all 0.15s ease',
  minWidth: '28px',
  height: '28px',
  fontWeight: 'bold',
  fontSize: '13px'
};

const dividerStyle = {
  width: '1.5px',
  height: '18px',
  background: '#d1d5db',
  margin: '0 4px'
};

export default WordEditor;
