import { useState, useEffect, useRef } from 'react';
import { Sparkles, X, Send, Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useTranslation } from 'react-i18next';
import { supabase } from '../lib/supabase';

function AIAssistant({ wheelId, currentPageId, onWheelUpdate, onPageChange, isOpen, onToggle }) {
  const { t } = useTranslation(['editor']);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const [wheelContext, setWheelContext] = useState(null);
  const [position, setPosition] = useState({ x: window.innerWidth - 440, y: 20 });
  const [size, setSize] = useState({ width: 420, height: 650 });
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeDirection, setResizeDirection] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const chatWindowRef = useRef(null);

  useEffect(() => {
    if (wheelId && isOpen) {
      loadWheelContext();
    }
  }, [wheelId, isOpen]);

  const loadWheelContext = async () => {
    try {
      // Fetch wheel info
      const { data: wheel, error: wheelError } = await supabase
        .from('year_wheels')
        .select('title')
        .eq('id', wheelId)
        .single();
      
      if (wheelError) {
        console.error('[AIAssistant] Wheel query error:', wheelError);
        return;
      }
      
      // Fetch current page info
      const { data: page, error: pageError } = await supabase
        .from('wheel_pages')
        .select('year')
        .eq('id', currentPageId)
        .single();
      
      if (pageError) {
        console.error('[AIAssistant] Page query error:', pageError);
        return;
      }
      
      // Fetch rings count (SHARED across all pages in wheel)
      const { count: ringsCount } = await supabase
        .from('wheel_rings')
        .select('*', { count: 'exact', head: true })
        .eq('wheel_id', wheelId);
      
      // Fetch activity groups count (SHARED across all pages in wheel)
      const { count: groupsCount } = await supabase
        .from('activity_groups')
        .select('*', { count: 'exact', head: true })
        .eq('wheel_id', wheelId);
      
      // Fetch items count for current page (page-specific)
      const { count: itemsCount } = await supabase
        .from('items')
        .select('*', { count: 'exact', head: true })
        .eq('page_id', currentPageId);
      
      if (wheel && page) {
        console.log('[AIAssistant] Loaded context:', { 
          title: wheel.title, 
          year: page.year,
          rings: ringsCount,
          groups: groupsCount,
          items: itemsCount
        });
        setWheelContext({
          title: wheel.title,
          year: page.year,
          stats: {
            rings: ringsCount || 0,
            activityGroups: groupsCount || 0,
            items: itemsCount || 0
          }
        });
      }
    } catch (error) {
      console.error('[AIAssistant] Error loading wheel context:', error);
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Constrain position to viewport boundaries
  const constrainToViewport = (pos, currentSize) => {
    const margin = 10; // Minimum margin from edges
    return {
      x: Math.max(margin, Math.min(pos.x, window.innerWidth - currentSize.width - margin)),
      y: Math.max(margin, Math.min(pos.y, window.innerHeight - currentSize.height - margin))
    };
  };

  // Handle viewport resize - keep window visible
  useEffect(() => {
    const handleResize = () => {
      setPosition(prev => constrainToViewport(prev, size));
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [size]);

  // Dragging and resizing handlers
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (isDragging) {
        const newPos = {
          x: e.clientX - dragOffset.x,
          y: e.clientY - dragOffset.y
        };
        setPosition(constrainToViewport(newPos, size));
      } else if (isResizing && resizeDirection) {
        const deltaX = e.clientX - resizeStart.x;
        const deltaY = e.clientY - resizeStart.y;
        
        let newWidth = resizeStart.width;
        let newHeight = resizeStart.height;
        let newX = position.x;
        let newY = position.y;

        // Apply constraints
        const minWidth = 320;
        const minHeight = 400;
        const maxWidth = window.innerWidth - 40;
        const maxHeight = window.innerHeight - 40;

        // Handle different resize directions
        if (resizeDirection.includes('e')) {
          newWidth = Math.max(minWidth, Math.min(maxWidth, resizeStart.width + deltaX));
        }
        if (resizeDirection.includes('w')) {
          const potentialWidth = resizeStart.width - deltaX;
          if (potentialWidth >= minWidth && potentialWidth <= maxWidth) {
            newWidth = potentialWidth;
            newX = resizeStart.x + deltaX;
          }
        }
        if (resizeDirection.includes('s')) {
          newHeight = Math.max(minHeight, Math.min(maxHeight, resizeStart.height + deltaY));
        }
        if (resizeDirection.includes('n')) {
          const potentialHeight = resizeStart.height - deltaY;
          if (potentialHeight >= minHeight && potentialHeight <= maxHeight) {
            newHeight = potentialHeight;
            newY = resizeStart.y + deltaY;
          }
        }

        setSize({ width: newWidth, height: newHeight });
        setPosition(constrainToViewport({ x: newX, y: newY }, { width: newWidth, height: newHeight }));
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setIsResizing(false);
      setResizeDirection(null);
    };

    if (isDragging || isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, isResizing, dragOffset, resizeDirection, resizeStart, position, size]);

  const handleMouseDown = (e) => {
    if (chatWindowRef.current && e.target.closest('.drag-handle')) {
      const rect = chatWindowRef.current.getBoundingClientRect();
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      });
      setIsDragging(true);
    }
  };

  const handleResizeStart = (e, direction) => {
    e.preventDefault();
    e.stopPropagation();
    setResizeDirection(direction);
    setResizeStart({
      x: e.clientX,
      y: e.clientY,
      width: size.width,
      height: size.height
    });
    setResizeStart(prev => ({
      ...prev,
      x: e.clientX,
      y: e.clientY
    }));
    setIsResizing(true);
  };

  useEffect(() => {
    if (isOpen && messages.length === 0 && wheelContext) {
      const greeting = {
        id: Date.now(),
        role: 'assistant',
        content: t('editor:aiAssistant.greeting', {
          title: wheelContext.title,
          year: wheelContext.year,
          rings: wheelContext.stats.rings,
          activityGroups: wheelContext.stats.activityGroups,
          items: wheelContext.stats.items
        })
      };
      setMessages([greeting]);
    }
  }, [isOpen, wheelContext, t]);

  // Clean up AI responses - remove technical details that shouldn't be shown to users
  const cleanAIResponse = (text) => {
    if (!text) return text;
    
    // Remove UUID patterns (e.g., "ID: 7a7fe4e2-0fb0-4b7b-9242-1fd544b28f8d")
    text = text.replace(/\(?\s*ID:\s*[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\s*\)?/gi, '');
    
    // Remove standalone UUIDs that might leak through
    text = text.replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '[removed]');
    
    // Clean up double spaces and trailing commas that might result
    text = text.replace(/\s+/g, ' ').replace(/,\s*\)/g, ')').replace(/\(\s*\)/g, '');
    
    return text.trim();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = {
      id: Date.now(),
      role: 'user',
      content: input.trim()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      console.log('[AI] Calling edge function...');
      console.log('[AI] User:', userMessage.content);
      
      // Get current session token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error(t('editor:aiAssistant.noSession'));
      }

      // Call AI Assistant V2 edge function (using OpenAI Agents SDK)
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-assistant-v2`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userMessage: userMessage.content,
          conversationHistory: messages, // Send all messages including current one
          wheelId,
          currentPageId
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('🔴 [AI Assistant] Edge function error:', errorData);
        throw new Error(errorData.error || t('editor:aiAssistant.edgeFunctionError'));
      }

      const result = await response.json();
      console.log('✨ [AI Assistant] Complete!', result);

      let assistantMessage = '';
      if (result.message) {
        assistantMessage = result.message;
      } else if (typeof result.result === 'string') {
        try {
          const parsed = JSON.parse(result.result);
          assistantMessage = parsed.message || parsed.content || result.result;
        } catch {
          assistantMessage = result.result;
        }
      } else if (result.result && typeof result.result === 'object') {
        assistantMessage = result.result.message || result.result.content || JSON.stringify(result.result, null, 2);
      } else {
        assistantMessage = 'Klart!';
      }

      // Clean up the response before displaying
      assistantMessage = cleanAIResponse(assistantMessage);

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: assistantMessage,
        id: Date.now()
      }]);

      console.log('[AI] Reloading...');
      if (onWheelUpdate) await onWheelUpdate();
      await loadWheelContext();

    } catch (error) {
      console.error('[AI] Error:', error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: t('editor:aiAssistant.error', { message: error.message }),
        isError: true,
        id: Date.now()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      ref={chatWindowRef}
      data-onboarding="ai-assistant-window"
      style={{ 
        left: `${position.x}px`, 
        top: `${position.y}px`,
        width: `${size.width}px`,
        height: `${size.height}px`,
        cursor: isDragging ? 'grabbing' : 'default' 
      }}
      className="fixed bg-white rounded-sm shadow-xl flex flex-col z-50 border border-gray-200"
      onMouseDown={handleMouseDown}
    >
      {/* Resize handles */}
      {/* Top edge */}
      <div 
        className="absolute top-0 left-0 right-0 h-1 cursor-n-resize hover:bg-purple-200 transition-colors"
        onMouseDown={(e) => handleResizeStart(e, 'n')}
      />
      {/* Bottom edge */}
      <div 
        className="absolute bottom-0 left-0 right-0 h-1 cursor-s-resize hover:bg-purple-200 transition-colors"
        data-onboarding="ai-resize-handle"
        onMouseDown={(e) => handleResizeStart(e, 's')}
      />
      {/* Left edge */}
      <div 
        className="absolute left-0 top-0 bottom-0 w-1 cursor-w-resize hover:bg-purple-200 transition-colors"
        onMouseDown={(e) => handleResizeStart(e, 'w')}
      />
      {/* Right edge */}
      <div 
        className="absolute right-0 top-0 bottom-0 w-1 cursor-e-resize hover:bg-purple-200 transition-colors"
        onMouseDown={(e) => handleResizeStart(e, 'e')}
      />
      {/* Corners */}
      <div 
        className="absolute top-0 left-0 w-3 h-3 cursor-nw-resize hover:bg-purple-300 transition-colors rounded-tl-sm"
        onMouseDown={(e) => handleResizeStart(e, 'nw')}
      />
      <div 
        className="absolute top-0 right-0 w-3 h-3 cursor-ne-resize hover:bg-purple-300 transition-colors rounded-tr-sm"
        onMouseDown={(e) => handleResizeStart(e, 'ne')}
      />
      <div 
        className="absolute bottom-0 left-0 w-3 h-3 cursor-sw-resize hover:bg-purple-300 transition-colors rounded-bl-sm"
        onMouseDown={(e) => handleResizeStart(e, 'sw')}
      />
      <div 
        className="absolute bottom-0 right-0 w-3 h-3 cursor-se-resize hover:bg-purple-300 transition-colors rounded-br-sm"
        onMouseDown={(e) => handleResizeStart(e, 'se')}
      />
      <div 
        className="drag-handle bg-white border-b border-gray-200 p-4 flex justify-between items-center cursor-grab active:cursor-grabbing"
        data-onboarding="ai-drag-handle"
      >
        <div className="flex items-center gap-2 pointer-events-none">
          <Sparkles size={16} className="text-amber-500" />
          <h3 className="text-base font-semibold text-gray-900">{t('editor:aiAssistant.title')}</h3>
        </div>
        <button onClick={onToggle} className="hover:bg-gray-100 rounded-sm p-1.5 transition-colors pointer-events-auto text-gray-600">
          <X size={16} />
        </button>
      </div>

      <div 
        className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 border-b border-gray-200"
        data-onboarding="ai-chat-messages"
      >
        {messages.map(m => (
          <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-lg p-3 shadow-sm ${
                m.role === 'user' ? 'bg-blue-600 text-white' :
                m.isError ? 'bg-red-50 text-red-800 border border-red-200' :
                'bg-white text-gray-900 border border-gray-200'
              }`}>
              <div className={`text-sm leading-relaxed ${
                m.role === 'user' ? 'text-white' : 'prose prose-sm max-w-none prose-headings:text-gray-900 prose-p:text-gray-800 prose-strong:text-gray-900 prose-code:text-gray-900'
              }`}>
                {m.role === 'user' ? (
                  <div className="whitespace-pre-wrap text-white">{m.content}</div>
                ) : (
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown>
                )}
              </div>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white rounded-sm p-3 border border-gray-200">
              <div className="flex gap-2 items-center">
                <Loader2 size={16} className="animate-spin text-purple-500" />
                <span className="text-sm text-gray-600">{t('editor:aiAssistant.loading')}</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSubmit} className="p-4 bg-white">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t('editor:aiAssistant.placeholder')}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm bg-white"
            disabled={isLoading}
            data-onboarding="ai-input-field"
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="bg-purple-600 text-white px-4 py-2 rounded-sm hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
          >
            {isLoading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
          </button>
        </div>
        {/* <p className="text-xs text-gray-500 mt-2">💡 Tips: "skapa julkampanj 2025-12-15 till 2026-01-30"</p> */}
      </form>
    </div>
  );
}

export default AIAssistant;
