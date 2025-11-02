import { useState, useEffect, useRef } from 'react';
import { Sparkles, X, Send, Loader2, Crown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../lib/supabase';
import { marked } from 'marked';
import DOMPurify from 'dompurify';

// Configure marked for clean, predictable output
marked.use({ 
  breaks: false, 
  gfm: true, 
  mangle: false, 
  headerIds: false 
});

// Parse markdown to HTML safely
const formatMessageHTML = (text) => {
  if (!text) return '';
  
  // Convert literal \n to actual newlines
  text = text.replace(/\\n/g, '\n');
  
  // Parse markdown to HTML
  const html = marked.parse(text);
  
  // Sanitize to prevent XSS
  const safeHtml = DOMPurify.sanitize(html, {
    USE_PROFILES: { html: true }
  });
  
  return safeHtml;
};

function AIAssistant({ wheelId, currentPageId, onWheelUpdate, onPageChange, isOpen, onToggle, isPremium = false }) {
  const { t } = useTranslation(['editor', 'subscription']);
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
  
  // OpenAI Agents SDK server-side conversation management
  // Store the last response ID to chain context across turns
  const [lastResponseId, setLastResponseId] = useState(null);
  
  // Reset conversation when switching wheels or pages
  useEffect(() => {
    setLastResponseId(null);
    setMessages([]);
  }, [wheelId, currentPageId]);
  
  useEffect(() => {
    if (wheelId && isOpen) {
      loadWheelContext();
    }
  }, [wheelId, isOpen]);  const loadWheelContext = async () => {
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
        }),
        sdkFormat: false // Initial greeting is not from SDK
      };
      setMessages([greeting]);
    }
  }, [isOpen, wheelContext, t]);

  // Clean AI response - MINIMAL processing, preserve newlines for marked
  const cleanAIResponse = (text) => {
    if (!text) return text;
    
    // Remove UUID patterns (preserve newlines!)
    text = text.replace(/\(?\s*ID:\s*[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\s*\)?/gi, '');
    text = text.replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '');
    text = text.replace(/\b(page_id|pageId):\s*[^\s,)]+/gi, '');
    
    // Remove ALL emojis (but NOT newlines!)
    text = text.replace(/[\u{1F600}-\u{1F64F}]/gu, '');
    text = text.replace(/[\u{1F300}-\u{1F5FF}]/gu, '');
    text = text.replace(/[\u{1F680}-\u{1F6FF}]/gu, '');
    text = text.replace(/[\u{1F1E0}-\u{1F1FF}]/gu, '');
    text = text.replace(/[\u{2600}-\u{26FF}]/gu, '');
    text = text.replace(/[\u{2700}-\u{27BF}]/gu, '');
    text = text.replace(/[\u{1F900}-\u{1F9FF}]/gu, '');
    text = text.replace(/[\u{1FA00}-\u{1FAFF}]/gu, '');
    text = text.replace(/[\u{FE00}-\u{FE0F}]/gu, '');
    
    // ONLY trim whitespace from start/end, NOT internal newlines!
    return text.trim();
  };

  // Make error messages more user-friendly
  const makeErrorFriendly = (errorText) => {
    if (!errorText) return 'Ett oväntat fel inträffade. Försök igen.';
    
    // Common database errors
    if (errorText.includes('foreign key') || errorText.includes('FK')) {
      return 'Det finns ett strukturellt problem med att skapa aktiviteterna. Se till att alla nödvändiga sidor och strukturer finns för 2025 innan du försöker igen. Om problemet kvarstår, vänligen kontakta support.';
    }
    
    if (errorText.includes('duplicate') || errorText.includes('unique constraint')) {
      return 'Detta objekt finns redan. Försök med ett annat namn eller ta bort det befintliga först.';
    }
    
    if (errorText.includes('authentication') || errorText.includes('unauthorized')) {
      return 'Din session har gått ut. Vänligen ladda om sidan och logga in igen.';
    }
    
    if (errorText.includes('timeout')) {
      return 'Begäran tog för lång tid. Försök igen med en enklare fråga.';
    }
    
    // Clean up the error but keep it informative
    return cleanAIResponse(errorText);
  };

  // State for streaming status
  const [streamingStatus, setStreamingStatus] = useState(null);

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
    setStreamingStatus('Ansluter...');

    try {
      // Get current session token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error(t('editor:aiAssistant.noSession'));
      }

      // OPENAI AGENTS SDK + SSE STREAMING
      // Use previousResponseId for server-side conversation state
      // SSE provides real-time updates during AI execution
      
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-assistant-v2`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userMessage: userMessage.content,
          previousResponseId: lastResponseId,
          wheelId,
          currentPageId
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Network error' }));
        console.error('🔴 [AI Assistant] Edge function error:', errorData);
        throw new Error(errorData.error || t('editor:aiAssistant.edgeFunctionError'));
      }

      // Handle SSE stream
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let finalResult = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          
          try {
            const data = JSON.parse(line.slice(6));

            switch (data.type) {
              case 'status':
                setStreamingStatus(data.message);
                break;
              
              case 'agent':
                setStreamingStatus(`🤖 ${data.message}`);
                break;
              
              case 'tool':
                setStreamingStatus(`🔧 ${data.message}`);
                break;
              
              case 'tool_result':
                // Optional: show tool completion briefly
                setStreamingStatus(`✓ ${data.message}`);
                break;
              
              case 'complete':
                finalResult = data;
                setStreamingStatus(null);
                break;
              
              case 'error':
                throw new Error(data.message);
            }
          } catch (parseError) {
            console.error('[AI SSE] Parse error:', parseError, 'Line:', line);
          }
        }
      }

      if (!finalResult || !finalResult.success) {
        throw new Error('No final result received from AI');
      }

      // Process the final result
      let assistantMessage = finalResult.message || '';

      // CRITICAL: Convert escaped newlines to actual newlines FIRST
      if (typeof assistantMessage === 'string') {
        assistantMessage = assistantMessage.replace(/\\n/g, '\n');
      }

      // Clean up the response
      assistantMessage = cleanAIResponse(assistantMessage);

      // Store the response ID for the next turn
      if (finalResult.lastResponseId) {
        setLastResponseId(finalResult.lastResponseId);
      }

      // Append the assistant's message
      if (assistantMessage && assistantMessage.trim().length > 0) {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: assistantMessage,
          id: Date.now()
        }]);
      }

      if (onWheelUpdate) await onWheelUpdate();
      await loadWheelContext();

    } catch (error) {
      console.error('AI Assistant Error:', error);
      
      const friendlyError = makeErrorFriendly(error.message);
      
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `${friendlyError}\n\n**Tips:** Du kan:\n- Försöka formulera din fråga på ett annat sätt\n- Kolla att alla nödvändiga sidor och strukturer finns\n- Försöka med en enklare uppgift först`,
        isError: true,
        id: Date.now(),
        canRetry: true
      }]);
    } finally {
      setIsLoading(false);
      setStreamingStatus(null);
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
          <div key={m.id} className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
            <div className={`max-w-[85%] rounded-sm p-3 shadow-sm ${
                m.role === 'user' ? 'bg-blue-600 text-white' :
                m.isError ? 'bg-red-50 text-red-800 border border-red-200' :
                'bg-white text-gray-900 border border-gray-200'
              }`}>
              <div className="text-sm leading-relaxed">
                {m.role === 'user' ? (
                  <div className="whitespace-pre-wrap text-white">{m.content}</div>
                ) : (
                  <div 
                    className="markdown-content text-gray-800"
                    dangerouslySetInnerHTML={{ __html: formatMessageHTML(m.content) }} 
                  />
                )}
              </div>
              {m.isError && m.canRetry && (
                <button
                  onClick={() => {
                    // Find the last user message before this error
                    const lastUserMsgIndex = messages.findIndex(msg => msg.id === m.id) - 1;
                    if (lastUserMsgIndex >= 0 && messages[lastUserMsgIndex].role === 'user') {
                      setInput(messages[lastUserMsgIndex].content);
                    }
                  }}
                  className="mt-2 text-xs text-red-700 hover:text-red-900 underline"
                >
                  Försök igen
                </button>
              )}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-sm p-3 border border-purple-200">
              <div className="flex gap-2 items-center">
                <Loader2 size={16} className="animate-spin text-purple-600" />
                <span className="text-sm text-gray-700 font-medium">
                  {t('editor:aiAssistant.loading')}
                </span>
              </div>
              {streamingStatus && (
                <div className="text-xs text-gray-600 mt-1 animate-pulse">
                  {streamingStatus}
                </div>
              )}
              {!streamingStatus && (
                <div className="text-xs text-gray-600 mt-1">
                  AI-assistenten arbetar...
                </div>
              )}
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {!isPremium ? (
        <div className="p-4 bg-gradient-to-r from-amber-50 to-orange-50 border-t border-amber-200">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center">
              <Crown size={20} className="text-white" />
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-gray-900 mb-1">
                {t('subscription:upgradePrompt.defaultTitle')}
              </h4>
              <p className="text-xs text-gray-700 mb-3">
                {t('subscription:upgradePrompt.aiAssistant')}
              </p>
              <button
                onClick={() => {
                  // Navigate to pricing or show subscription modal
                  window.location.href = '/pricing';
                }}
                className="w-full bg-gradient-to-r from-amber-500 to-orange-600 text-white px-4 py-2  rounded-sm hover:from-amber-600 hover:to-orange-700 transition-all text-sm font-medium shadow-sm hover:shadow-md"
              >
                {t('subscription:upgrade')}
              </button>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-amber-200">
            <input
              value=""
              placeholder={t('editor:aiAssistant.placeholder')}
              className="w-full px-3 py-2 border border-gray-300 rounded-sm text-sm bg-gray-100 cursor-not-allowed opacity-60"
              disabled
            />
          </div>
        </div>
      ) : (
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
        </form>
      )}
    </div>
  );
}

export default AIAssistant;
