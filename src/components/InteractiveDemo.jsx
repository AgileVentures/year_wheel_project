import { useState, useEffect, useRef, useMemo, memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Sparkles } from 'lucide-react';
import AIAssistantDemo from './AIAssistantDemo';
import ManualEditorDemo from './ManualEditorDemo';

function InteractiveDemo({ demoRef }) {
  const { t } = useTranslation(['landing']);
  const [activeDemo, setActiveDemo] = useState('wheel'); // 'wheel' or 'ai'

  // Auto-rotate between demos
  useEffect(() => {
    // Manual demo runs for 24 seconds, then switch to AI for 15 seconds, then loop
    const timer = setTimeout(() => {
      setActiveDemo(prev => prev === 'wheel' ? 'ai' : 'wheel');
    }, activeDemo === 'wheel' ? 24000 : 15000);

    return () => clearTimeout(timer);
  }, [activeDemo]);

  // Conversation animation state
  const [conversationStep, setConversationStep] = useState(0);
  const [inputText, setInputText] = useState('');
  const [isTypingInInput, setIsTypingInInput] = useState(false);
  const chatContainerRef = useRef(null);

  // Conversation sequence - using translations (memoized to prevent infinite re-renders)
  const conversationSequence = useMemo(() => [
    { type: 'input-typing', text: t('landing:aiDemo.userMessages.message1'), delay: 500 },
    { type: 'user-send', delay: 100 },
    { type: 'ai-response', delay: 800 },
    { type: 'input-typing', text: t('landing:aiDemo.userMessages.message2'), delay: 1500 },
    { type: 'user-send', delay: 100 },
    { type: 'ai-response', delay: 800 },
    { type: 'input-typing', text: t('landing:aiDemo.userMessages.message3'), delay: 1500 },
    { type: 'user-send', delay: 100 },
    { type: 'ai-response', delay: 800 },
    { type: 'reset', delay: 3500 }
  ], [t]);

  // Animation effect
  useEffect(() => {
    if (activeDemo !== 'ai') return;
    
    const currentStep = conversationSequence[conversationStep];
    if (!currentStep) return;

    const timer = setTimeout(() => {
      if (currentStep.type === 'input-typing') {
        // Type in input field
        setIsTypingInInput(true);
        setInputText('');
        let charIndex = 0;
        const typeInterval = setInterval(() => {
          if (charIndex <= currentStep.text.length) {
            setInputText(currentStep.text.slice(0, charIndex));
            charIndex++;
          } else {
            setIsTypingInInput(false);
            clearInterval(typeInterval);
            setConversationStep(prev => prev + 1);
          }
        }, 50);
        return () => clearInterval(typeInterval);
      } else if (currentStep.type === 'user-send') {
        // Clear input and move to next
        setInputText('');
        setConversationStep(prev => prev + 1);
      } else if (currentStep.type === 'ai-response' || currentStep.type === 'reset') {
        setConversationStep(prev => currentStep.type === 'reset' ? 0 : prev + 1);
      }
    }, currentStep.delay);

    return () => clearTimeout(timer);
  }, [conversationStep, activeDemo, conversationSequence]);

  // Reset on demo change
  useEffect(() => {
    if (activeDemo === 'ai') {
      setConversationStep(0);
      setInputText('');
      setIsTypingInInput(false);
    }
  }, [activeDemo]);

  // Auto-scroll chat to bottom when conversation progresses
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [conversationStep]);

  return (
    <section id="demo-section" ref={demoRef} className="hidden md:block py-20 px-4 sm:px-6 lg:px-8 bg-gray-900 text-white scroll-mt-16">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            {activeDemo === 'wheel' 
              ? t('landing:demo.manualTitle')
              : t('landing:demo.aiTitle')}
          </h2>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            {activeDemo === 'wheel'
              ? t('landing:demo.manualDescription')
              : t('landing:demo.aiDescription')}
          </p>
        </div>

        {/* Demo Content */}
        <div className="bg-gray-800 rounded-sm overflow-hidden shadow-2xl border border-gray-700">
          {activeDemo === 'wheel' && <ManualEditorDemo />}
          {activeDemo === 'ai' && <AIAssistantDemo />}
        </div>
      </div>
    </section>
  );
}

export default memo(InteractiveDemo);