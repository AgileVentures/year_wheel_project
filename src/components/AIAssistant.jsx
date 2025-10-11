import { useState, useEffect, useRef } from 'react';
import { Sparkles, X, Send, Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { supabase } from '../lib/supabase';

function AIAssistant({ wheelId, currentPageId, onWheelUpdate, onPageChange, isOpen, onToggle }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const [wheelContext, setWheelContext] = useState(null);
  const [position, setPosition] = useState({ x: window.innerWidth - 440, y: 20 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
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
      
      // Fetch rings count (for THIS PAGE)
      const { count: ringsCount } = await supabase
        .from('wheel_rings')
        .select('*', { count: 'exact', head: true })
        .eq('page_id', currentPageId);
      
      // Fetch activity groups count (for THIS PAGE)
      const { count: groupsCount } = await supabase
        .from('activity_groups')
        .select('*', { count: 'exact', head: true })
        .eq('page_id', currentPageId);
      
      // Fetch items count for current page
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

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (isDragging) {
        setPosition({
          x: e.clientX - dragOffset.x,
          y: e.clientY - dragOffset.y
        });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset]);

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

  useEffect(() => {
    if (isOpen && messages.length === 0 && wheelContext) {
      const greeting = {
        id: Date.now(),
        role: 'assistant',
        content: `Hej! ✨ **Flows AI är aktiverat!**

Jag kan hjälpa dig med ditt årshjul **"${wheelContext.title}"** (${wheelContext.year}).

🎯 **Jag kan:**
- Skapa aktiviteter (även över årsskiften!)
- Uppdatera och ta bort aktiviteter
- Visa och söka aktiviteter
- Hantera ringar och grupper

**Struktur:**
- 🔵 Ringar: ${wheelContext.stats.rings}
- 🟢 Grupper: ${wheelContext.stats.activityGroups}
- 📅 Aktiviteter: ${wheelContext.stats.items}

Vad vill du göra?`
      };
      setMessages([greeting]);
    }
  }, [isOpen, wheelContext]);

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
      console.log('\n🚀 [Flows AI] Calling edge function...');
      console.log('📝 [Flows AI] User:', userMessage.content);
      
      // Get current session token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session');
      }

      // Call AI Assistant edge function
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-assistant`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userMessage: userMessage.content,
          conversationHistory: messages.slice(0, -1), // Send all previous messages
          wheelId,
          currentPageId
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('🔴 [AI Assistant] Edge function error:', errorData);
        throw new Error(errorData.error || 'Edge function call failed');
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

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: assistantMessage,
        id: Date.now()
      }]);

      console.log('🔄 [Flows AI] Reloading...');
      if (onWheelUpdate) await onWheelUpdate();
      await loadWheelContext();

    } catch (error) {
      console.error('❌ [Flows AI] Error:', error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `❌ **Fel:** ${error.message}\n\nFörsök igen.`,
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
      style={{ left: `${position.x}px`, top: `${position.y}px`, cursor: isDragging ? 'grabbing' : 'default' }}
      className="fixed w-[420px] h-[650px] bg-white rounded-sm shadow-xl flex flex-col z-50 border border-gray-200"
      onMouseDown={handleMouseDown}
    >
      <div className="drag-handle bg-white border-b border-gray-200 p-4 flex justify-between items-center cursor-grab active:cursor-grabbing">
        <div className="flex items-center gap-2 pointer-events-none">
          <Sparkles size={16} className="text-amber-500" />
          <h3 className="text-base font-semibold text-gray-900">AI Assistent</h3>
          <span className="text-xs text-purple-600 font-semibold">Flows AI</span>
        </div>
        <button onClick={onToggle} className="hover:bg-gray-100 rounded-sm p-1.5 transition-colors pointer-events-auto text-gray-600">
          <X size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 border-b border-gray-200">
        {messages.map(m => (
          <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-sm p-3 ${
                m.role === 'user' ? 'bg-blue-600 text-white' :
                m.isError ? 'bg-red-50 text-red-800 border border-red-200' :
                'bg-white text-gray-800 border border-gray-200'
              }`}>
              <div className="text-sm leading-relaxed prose prose-sm max-w-none">
                {m.role === 'user' ? (
                  <div className="whitespace-pre-wrap">{m.content}</div>
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
                <span className="text-sm text-gray-600">Kör Flows AI...</span>
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
            placeholder="Vad vill du göra? (t.ex. skapa julkampanj...)"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm bg-white"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="bg-purple-600 text-white px-4 py-2 rounded-sm hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
          >
            {isLoading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-2">💡 Tips: "skapa julkampanj 2025-12-15 till 2026-01-30"</p>
      </form>
    </div>
  );
}

export default AIAssistant;
