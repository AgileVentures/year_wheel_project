import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewWrapper, NodeViewContent } from '@tiptap/react';
import React, { useState, useRef, useCallback } from 'react';

// Column Component with resize handles
const ColumnsComponent = ({ node, updateAttributes, deleteNode, selected }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [dragIndex, setDragIndex] = useState(null);
  const containerRef = useRef(null);
  
  const widths = node.attrs.widths || [50, 50];
  const gap = node.attrs.gap || 16;
  const verticalAlign = node.attrs.verticalAlign || 'stretch';

  // Handle resize start
  const handleResizeStart = useCallback((e, index) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
    setDragIndex(index);
    
    const startX = e.clientX;
    const container = containerRef.current;
    if (!container) return;
    
    const containerWidth = container.getBoundingClientRect().width - (gap * (widths.length - 1));
    const startWidths = [...widths];
    
    const handleMouseMove = (moveEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const deltaPercent = (deltaX / containerWidth) * 100;
      
      const newWidths = [...startWidths];
      newWidths[index] = Math.max(15, Math.min(85, startWidths[index] + deltaPercent));
      newWidths[index + 1] = Math.max(15, Math.min(85, startWidths[index + 1] - deltaPercent));
      
      // Normalize
      const total = newWidths.reduce((a, b) => a + b, 0);
      const normalized = newWidths.map(w => Math.round((w / total) * 1000) / 10);
      
      updateAttributes({ widths: normalized });
    };
    
    const handleMouseUp = () => {
      setIsDragging(false);
      setDragIndex(null);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [widths, gap, updateAttributes]);

  // Preset layouts
  const applyPreset = useCallback((preset) => {
    const presets = {
      '50-50': [50, 50],
      '33-33-33': [33.3, 33.4, 33.3],
      '25-25-25-25': [25, 25, 25, 25],
      '66-34': [66, 34],
      '34-66': [34, 66],
      '25-50-25': [25, 50, 25],
      '70-30': [70, 30],
      '30-70': [30, 70],
    };
    if (presets[preset]) {
      updateAttributes({ widths: presets[preset] });
    }
  }, [updateAttributes]);

  const alignOptions = {
    stretch: 'Stretch',
    start: 'Top',
    center: 'Center',
    end: 'Bottom',
  };

  return (
    <NodeViewWrapper 
      className={`resizable-columns-wrapper ${selected ? 'is-selected' : ''}`}
      data-drag-handle
    >
      {/* Control bar - only visible when selected or hovered */}
      <div 
        className="columns-toolbar" 
        contentEditable={false}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '6px 10px',
          marginBottom: '8px',
          background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
          borderRadius: '6px',
          border: '1px solid #e2e8f0',
          fontSize: '11px',
          userSelect: 'none',
          flexWrap: 'wrap',
        }}
      >
        {/* Preset buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ color: '#64748b', fontWeight: 500 }}>Preset:</span>
          {widths.length === 2 && (
            <>
              <button onClick={() => applyPreset('50-50')} className="columns-btn" title="50/50">½ ½</button>
              <button onClick={() => applyPreset('66-34')} className="columns-btn" title="66/34">⅔ ⅓</button>
              <button onClick={() => applyPreset('34-66')} className="columns-btn" title="34/66">⅓ ⅔</button>
              <button onClick={() => applyPreset('70-30')} className="columns-btn" title="70/30">70 30</button>
            </>
          )}
          {widths.length === 3 && (
            <>
              <button onClick={() => applyPreset('33-33-33')} className="columns-btn" title="33/33/33">⅓ ⅓ ⅓</button>
              <button onClick={() => applyPreset('25-50-25')} className="columns-btn" title="25/50/25">¼ ½ ¼</button>
            </>
          )}
          {widths.length === 4 && (
            <button onClick={() => applyPreset('25-25-25-25')} className="columns-btn" title="25/25/25/25">¼ ¼ ¼ ¼</button>
          )}
        </div>
        
        <span style={{ borderLeft: '1px solid #cbd5e1', height: '16px', margin: '0 4px' }} />
        
        {/* Vertical alignment */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ color: '#64748b' }}>V-align:</span>
          <select 
            value={verticalAlign}
            onChange={(e) => updateAttributes({ verticalAlign: e.target.value })}
            className="columns-select"
          >
            {Object.entries(alignOptions).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>
        
        {/* Gap size */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ color: '#64748b' }}>Gap:</span>
          <input 
            type="range" 
            min="0" 
            max="48" 
            step="4"
            value={gap}
            onChange={(e) => updateAttributes({ gap: parseInt(e.target.value) })}
            style={{ width: '60px', cursor: 'pointer' }}
          />
          <span style={{ minWidth: '28px', color: '#475569' }}>{gap}px</span>
        </div>
        
        {/* Delete button */}
        <button 
          onClick={deleteNode} 
          className="columns-btn columns-btn-delete"
          style={{ marginLeft: 'auto' }}
          title="Ta bort kolumner"
        >
          ✕ Ta bort
        </button>
      </div>

      {/* Columns container */}
      <div 
        ref={containerRef}
        className="columns-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: widths.map(w => `${w}%`).join(' '),
          gap: `${gap}px`,
          alignItems: verticalAlign,
          position: 'relative',
          minHeight: '80px',
        }}
      >
        {/* The actual editable content */}
        <NodeViewContent className="columns-content" />
        
        {/* Resize handles */}
        {widths.slice(0, -1).map((_, index) => {
          const leftPos = widths.slice(0, index + 1).reduce((a, b) => a + b, 0);
          return (
            <div
              key={`handle-${index}`}
              className={`resize-handle ${isDragging && dragIndex === index ? 'is-dragging' : ''}`}
              onMouseDown={(e) => handleResizeStart(e, index)}
              contentEditable={false}
              style={{
                position: 'absolute',
                left: `calc(${leftPos}% - 6px + ${(index * gap) - gap/2}px)`,
                top: 0,
                bottom: 0,
                width: '12px',
                cursor: 'col-resize',
                zIndex: 10,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <div className="resize-handle-bar" />
            </div>
          );
        })}
      </div>

      {/* Width indicators */}
      <div 
        className="width-indicators"
        contentEditable={false}
        style={{
          display: 'flex',
          gap: `${gap}px`,
          marginTop: '6px',
        }}
      >
        {widths.map((w, i) => (
          <div 
            key={i} 
            style={{ 
              flex: `0 0 ${w}%`, 
              textAlign: 'center',
              fontSize: '10px',
              color: '#94a3b8',
              fontWeight: 500,
            }}
          >
            {Math.round(w)}%
          </div>
        ))}
      </div>

      <style>{`
        .resizable-columns-wrapper {
          margin: 1.5rem 0;
          padding: 12px;
          border: 2px dashed #e2e8f0;
          border-radius: 8px;
          background: #fafbfc;
          transition: all 0.2s;
        }
        .resizable-columns-wrapper:hover {
          border-color: #94a3b8;
        }
        .resizable-columns-wrapper.is-selected {
          border-color: #3b82f6;
          border-style: solid;
          background: #f8fafc;
        }
        .columns-btn {
          padding: 3px 8px;
          border: 1px solid #cbd5e1;
          border-radius: 4px;
          background: white;
          cursor: pointer;
          font-size: 10px;
          font-weight: 500;
          color: #475569;
          transition: all 0.15s;
        }
        .columns-btn:hover {
          background: #e2e8f0;
          border-color: #94a3b8;
          color: #1e293b;
        }
        .columns-btn-delete {
          color: #dc2626;
          border-color: #fecaca;
          background: #fef2f2;
        }
        .columns-btn-delete:hover {
          background: #fee2e2;
          border-color: #f87171;
        }
        .columns-select {
          font-size: 10px;
          padding: 3px 6px;
          border-radius: 4px;
          border: 1px solid #cbd5e1;
          background: white;
          cursor: pointer;
        }
        .resize-handle {
          background: transparent;
          transition: background 0.15s;
        }
        .resize-handle:hover {
          background: rgba(59, 130, 246, 0.1);
        }
        .resize-handle.is-dragging {
          background: rgba(59, 130, 246, 0.2);
        }
        .resize-handle-bar {
          width: 4px;
          height: 32px;
          background: #cbd5e1;
          border-radius: 2px;
          transition: all 0.15s;
        }
        .resize-handle:hover .resize-handle-bar,
        .resize-handle.is-dragging .resize-handle-bar {
          background: #3b82f6;
          height: 48px;
        }
        .columns-content {
          display: contents;
        }
        .columns-content > div[data-type="column"] {
          min-height: 60px;
          padding: 12px;
          background: white;
          border: 1px dashed #d1d5db;
          border-radius: 6px;
          transition: all 0.15s;
        }
        .columns-content > div[data-type="column"]:hover {
          border-color: #93c5fd;
          background: #f8fafc;
        }
        .columns-content > div[data-type="column"]:focus-within {
          border-color: #3b82f6;
          border-style: solid;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }
      `}</style>
    </NodeViewWrapper>
  );
};

// Single Column Node
export const Column = Node.create({
  name: 'column',
  group: 'block',
  content: 'block+',
  defining: true,
  isolating: true,
  
  parseHTML() {
    return [{ tag: 'div[data-type="column"]' }];
  },
  
  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'column', class: 'column' }), 0];
  },
});

// Resizable Columns Container
export const ResizableColumns = Node.create({
  name: 'resizableColumns',
  group: 'block',
  content: 'column{2,6}', // 2-6 columns allowed
  defining: true,
  isolating: true,
  draggable: true,
  
  addAttributes() {
    return {
      widths: {
        default: [50, 50],
        parseHTML: element => {
          const widths = element.getAttribute('data-widths');
          return widths ? JSON.parse(widths) : [50, 50];
        },
        renderHTML: attributes => ({
          'data-widths': JSON.stringify(attributes.widths),
        }),
      },
      gap: {
        default: 16,
        parseHTML: element => parseInt(element.getAttribute('data-gap')) || 16,
        renderHTML: attributes => ({
          'data-gap': attributes.gap,
        }),
      },
      verticalAlign: {
        default: 'stretch',
        parseHTML: element => element.getAttribute('data-valign') || 'stretch',
        renderHTML: attributes => ({
          'data-valign': attributes.verticalAlign,
        }),
      },
    };
  },
  
  parseHTML() {
    return [{ tag: 'div[data-type="resizable-columns"]' }];
  },
  
  renderHTML({ HTMLAttributes, node }) {
    const { widths, gap, verticalAlign } = node.attrs;
    return [
      'div', 
      mergeAttributes(HTMLAttributes, { 
        'data-type': 'resizable-columns',
        class: 'resizable-columns',
        style: `display: grid; grid-template-columns: ${widths.map(w => `${w}%`).join(' ')}; gap: ${gap}px; align-items: ${verticalAlign};`
      }), 
      0
    ];
  },
  
  addNodeView() {
    return ReactNodeViewRenderer(ColumnsComponent);
  },
  
  addCommands() {
    return {
      insertColumns: (columnCount = 2) => ({ commands }) => {
        const widths = Array(columnCount).fill(Math.round(1000 / columnCount) / 10);
        const columns = Array(columnCount).fill(null).map(() => ({
          type: 'column',
          content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Skriv här...' }] }],
        }));
        
        return commands.insertContent({
          type: 'resizableColumns',
          attrs: { widths },
          content: columns,
        });
      },
      
      insertColumnsPreset: (preset) => ({ commands }) => {
        const presets = {
          '50-50': { widths: [50, 50], count: 2 },
          '33-33-33': { widths: [33.3, 33.4, 33.3], count: 3 },
          '25-25-25-25': { widths: [25, 25, 25, 25], count: 4 },
          '66-33': { widths: [66, 34], count: 2 },
          '33-66': { widths: [34, 66], count: 2 },
          '25-50-25': { widths: [25, 50, 25], count: 3 },
        };
        
        const config = presets[preset] || presets['50-50'];
        const columns = Array(config.count).fill(null).map(() => ({
          type: 'column',
          content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Skriv här...' }] }],
        }));
        
        return commands.insertContent({
          type: 'resizableColumns',
          attrs: { widths: config.widths },
          content: columns,
        });
      },
    };
  },
});

// Re-export as ColumnItem for backwards compatibility
export const ColumnItem = Column;

export default ResizableColumns;
