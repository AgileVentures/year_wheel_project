import { useState, useEffect, useRef } from 'react';
import { Sparkles } from 'lucide-react';

export default function AIAssistantDemo() {
  // Conversation animation state
  const [conversationStep, setConversationStep] = useState(0);
  const [inputText, setInputText] = useState('');
  const [isTypingInInput, setIsTypingInInput] = useState(false);
  const chatContainerRef = useRef(null);

  // Conversation sequence
  const conversationSequence = [
    { type: 'input-typing', text: "Skapa en kampanj i andra veckan i mars", delay: 500 },
    { type: 'user-send', delay: 100 },
    { type: 'ai-response', delay: 800 },
    { type: 'input-typing', text: "Förläng den till halva april", delay: 1500 },
    { type: 'user-send', delay: 100 },
    { type: 'ai-response', delay: 800 },
    { type: 'input-typing', text: "Kopiera den kampanjen och lägg den i september", delay: 1500 },
    { type: 'user-send', delay: 100 },
    { type: 'ai-response', delay: 800 },
    { type: 'reset', delay: 4000 }
  ];

  // Animation effect
  useEffect(() => {
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
  }, [conversationStep]);

  // Auto-scroll chat to bottom when conversation progresses
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [conversationStep]);

  return (
    <div className="aspect-video bg-white p-4">
      {/* Editor Mockup */}
      <div className="h-full flex">
        {/* Main Editor Area with Wheel */}
        <div className="flex-1 bg-gray-50 rounded-sm border border-gray-200 relative overflow-hidden">
          {/* Editor Header */}
          <div className="bg-white border-b border-gray-200 px-4 py-2 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src="/year_wheel_logo.svg" alt="YearWheel" className="h-6 w-auto" />
              <span className="text-sm font-medium text-gray-700">Marknadsplan 2026</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-xs text-gray-500">Auto-sparad</span>
            </div>
          </div>

          {/* Clean Wheel with Perfect Cake Slices */}
          <div className="flex-1 flex items-center justify-center py-12 px-8">
            <div className="relative">
              <svg width="640" height="640" viewBox="0 0 360 360" className="transform -rotate-90 drop-shadow-2xl">
                {/* Background */}
                <circle cx="180" cy="180" r="175" fill="#fafafa" />

                {/* Outer ring */}
                <circle cx="180" cy="180" r="165" fill="none" stroke="#f1f5f9" strokeWidth="28" />

                {/* Middle ring */}
                <circle cx="180" cy="180" r="132" fill="none" stroke="#f8fafc" strokeWidth="26" />

                {/* Inner ring */}
                <circle cx="180" cy="180" r="102" fill="none" stroke="#f1f5f9" strokeWidth="24" />

                {/* Month ring */}
                <circle cx="180" cy="180" r="86" fill="none" stroke="#e2e8f0" strokeWidth="12" />

                {/* Week ring */}
                <circle cx="180" cy="180" r="78" fill="none" stroke="#f3f4f6" strokeWidth="8" />

                {/* Center */}
                <circle cx="180" cy="180" r="72" fill="white" stroke="#e5e7eb" strokeWidth="2" />

                {/* Month dividers */}
                {Array.from({ length: 12 }, (_, i) => {
                  const angle = (i * 30) * (Math.PI / 180);
                  const x1 = 180 + 74 * Math.cos(angle);
                  const y1 = 180 + 74 * Math.sin(angle);
                  const x2 = 180 + 179 * Math.cos(angle);
                  const y2 = 180 + 179 * Math.sin(angle);
                  return (
                    <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#e5e7eb" strokeWidth="1" opacity="0.4" />
                  );
                })}

                {/* PERFECT CAKE SLICE ACTIVITIES */}
                {(() => {
                  // Helper function to create perfect arc segment
                  const createArcSegment = (startAngle, endAngle, innerRadius, outerRadius) => {
                    const startRad = (startAngle * Math.PI) / 180;
                    const endRad = (endAngle * Math.PI) / 180;
                    const largeArc = endAngle - startAngle > 180 ? 1 : 0;

                    const x1 = 180 + outerRadius * Math.cos(startRad);
                    const y1 = 180 + outerRadius * Math.sin(startRad);
                    const x2 = 180 + outerRadius * Math.cos(endRad);
                    const y2 = 180 + outerRadius * Math.sin(endRad);
                    const x3 = 180 + innerRadius * Math.cos(endRad);
                    const y3 = 180 + innerRadius * Math.sin(endRad);
                    const x4 = 180 + innerRadius * Math.cos(startRad);
                    const y4 = 180 + innerRadius * Math.sin(startRad);

                    return `M ${x1} ${y1} A ${outerRadius} ${outerRadius} 0 ${largeArc} 1 ${x2} ${y2} L ${x3} ${y3} A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${x4} ${y4} Z`;
                  };

                  return (
                    <>
                      {/* Outer Ring Activities */}
                      {/* January - Pink (broad, 3 weeks) */}
                      <path
                        d={createArcSegment(0, 20, 151, 179)}
                        fill="#ec4899"
                        opacity="0.9"
                      />

                      {/* April - Cyan (narrow, 1 week) */}
                      <path
                        d={createArcSegment(95, 102, 151, 179)}
                        fill="#06b6d4"
                        opacity="0.9"
                      />

                      {/* June - Pink (medium, 2 weeks) */}
                      <path
                        d={createArcSegment(148, 162, 151, 179)}
                        fill="#ec4899"
                        opacity="0.88"
                      />

                      {/* July-August - Cyan (very wide, 5 weeks) */}
                      <path
                        d={createArcSegment(182, 218, 151, 179)}
                        fill="#06b6d4"
                        opacity="0.9"
                      />

                      {/* September - Purple (broad, 4 weeks) */}
                      <path
                        d={createArcSegment(240, 268, 151, 179)}
                        fill="#8b5cf6"
                        opacity="0.9"
                      />

                      {/* Middle Ring Activities */}
                      {/* Late January/Feb - Purple (broad, 3 weeks) */}
                      <path
                        d={createArcSegment(30, 55, 119, 145)}
                        fill="#8b5cf6"
                        opacity="0.88"
                      />

                      {/* KAMPANJ in March (Blue) - Animated with bounce and growth */}
                      {conversationStep >= 2 && (
                        <path
                          d={createArcSegment(63, conversationStep >= 5 ? 105 : 73, 119, 145)}
                          fill="#3b82f6"
                          opacity="0.92"
                          className={conversationStep === 2 ? "animate-bounce-in" : conversationStep >= 5 ? "animate-grow-segment" : ""}
                          style={{
                            animationDuration: '0.6s',
                            animationTimingFunction: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
                            transition: conversationStep >= 5 ? 'all 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)' : 'none'
                          }}
                        />
                      )}

                      {/* COPIED Kampanj in September (Blue) - Animated with bounce */}
                      {/* September starts at 240°, placing it at week 2 of September = 243-285° (6 weeks) */}
                      {conversationStep >= 8 && (
                        <path
                          d={createArcSegment(243, 285, 119, 145)}
                          fill="#3b82f6"
                          opacity="0.92"
                          className="animate-bounce-in"
                          style={{ animationDuration: '0.6s', animationTimingFunction: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)' }}
                        />
                      )}

                      {/* May - Cyan (medium, 2.5 weeks) */}
                      <path
                        d={createArcSegment(125, 143, 119, 145)}
                        fill="#06b6d4"
                        opacity="0.88"
                      />

                      {/* November - Purple (broad, 3 weeks) */}
                      <path
                        d={createArcSegment(320, 343, 119, 145)}
                        fill="#8b5cf6"
                        opacity="0.88"
                      />

                      {/* Inner Ring Activities */}
                      {/* February - Cyan (medium, 2 weeks) */}
                      <path
                        d={createArcSegment(45, 59, 90, 114)}
                        fill="#06b6d4"
                        opacity="0.85"
                      />

                      {/* April - Purple (narrow, 1 week) */}
                      <path
                        d={createArcSegment(100, 107, 90, 114)}
                        fill="#8b5cf6"
                        opacity="0.85"
                      />

                      {/* July - Pink (broad, 3 weeks) */}
                      <path
                        d={createArcSegment(180, 202, 90, 114)}
                        fill="#ec4899"
                        opacity="0.85"
                      />

                      {/* October - Cyan (medium, 2 weeks) */}
                      <path
                        d={createArcSegment(275, 289, 90, 114)}
                        fill="#06b6d4"
                        opacity="0.85"
                      />
                    </>
                  );
                })()}
              </svg>

              {/* Center label */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="bg-white border border-gray-200 rounded-full px-4 py-2 text-lg font-semibold text-gray-900 shadow-sm">
                  2026
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* AI Assistant Panel */}
        <div className="w-80 bg-white border-l border-gray-200">
          {/* AI Header */}
          <div className="bg-blue-50 px-4 py-3 border-b border-blue-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                  <Sparkles size={16} className="text-white" />
                </div>
                <span className="text-sm font-medium text-gray-900">AI-assistant</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-xs text-gray-500">Online</span>
              </div>
            </div>
          </div>

          {/* Chat Messages */}
          <div ref={chatContainerRef} className="p-4 space-y-3 h-80 overflow-y-auto scroll-smooth">
            {/* Message 1: User command sent */}
            {conversationStep >= 1 && (
              <div className="flex justify-end animate-fadeIn">
                <div className="bg-blue-600 text-white rounded-sm px-3 py-2 max-w-[85%] text-xs">
                  Skapa en kampanj i andra veckan i mars
                </div>
              </div>
            )}

            {/* Message 2: AI Response 1 */}
            {conversationStep >= 2 && (
              <div className="flex justify-start animate-fadeIn">
                <div className="bg-gray-100 text-gray-900 rounded-sm px-3 py-2 max-w-[85%] text-xs">
                  <div className="flex items-start space-x-2">
                    <div className="flex-shrink-0 w-5 h-5 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-[10px] font-bold">
                      AI
                    </div>
                    <div className="flex-1 space-y-1">
                      <p>✓ Skapade aktivitet "Kampanj"</p>
                      <p>✓ Placerade i mars, vecka 2 (8-14 mars)</p>
                      <p>✓ Använde blå färg från Marknadsföring</p>
                      <p className="text-blue-600 font-medium mt-1">Vill du lägga till mer information?</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Message 3: User follow-up 1 - Extend activity */}
            {conversationStep >= 4 && (
              <div className="flex justify-end animate-fadeIn">
                <div className="bg-blue-600 text-white rounded-sm px-3 py-2 max-w-[80%] text-xs">
                  Förläng den till halva april
                </div>
              </div>
            )}

            {/* Message 4: AI Response 2 - Extended */}
            {conversationStep >= 5 && (
              <div className="flex justify-start animate-fadeIn">
                <div className="bg-gray-100 text-gray-900 rounded-sm px-3 py-2 max-w-[85%] text-xs">
                  <div className="flex items-start space-x-2">
                    <div className="flex-shrink-0 w-5 h-5 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-[10px] font-bold">
                      AI
                    </div>
                    <div className="flex-1 space-y-1">
                      <p>✓ Förlängde "Kampanj" till 15 april</p>
                      <p>✓ Kampanjen varar nu i 6 veckor</p>
                      <p>✓ Visuellt uppdaterad på hjulet</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Message 5: User follow-up 2 - Copy activity */}
            {conversationStep >= 7 && (
              <div className="flex justify-end animate-fadeIn">
                <div className="bg-blue-600 text-white rounded-sm px-3 py-2 max-w-[80%] text-xs">
                  Kopiera den kampanjen och lägg den i september
                </div>
              </div>
            )}

            {/* Message 6: AI Response 3 - Copied */}
            {conversationStep >= 8 && (
              <div className="flex justify-start animate-fadeIn">
                <div className="bg-gray-100 text-gray-900 rounded-sm px-3 py-2 max-w-[85%] text-xs">
                  <div className="flex items-start space-x-2">
                    <div className="flex-shrink-0 w-5 h-5 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-[10px] font-bold">
                      AI
                    </div>
                    <div className="flex-1 space-y-1">
                      <p>✓ Kopierade "Kampanj" till september</p>
                      <p>✓ Samma varaktighet (6 veckor)</p>
                      <p>✓ Båda kampanjerna är nu synliga</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Chat Input with Typing Animation */}
          <div className="border-t bg-gray-50 px-4 py-3">
            <div className="flex items-center space-x-3">
              <div className="flex-1 bg-white border border-gray-200 rounded-sm px-3 py-2 min-h-[32px] flex items-center">
                {inputText ? (
                  <div className="text-sm text-gray-900">
                    {inputText}
                    {isTypingInInput && (
                      <span className="inline-block w-0.5 h-4 bg-blue-600 ml-1 animate-pulse"></span>
                    )}
                  </div>
                ) : (
                  <div className="text-sm text-gray-400">
                    Skriv vad du vill planera...
                  </div>
                )}
              </div>
              <button className="bg-blue-600 text-white rounded-sm px-4 py-2 text-sm font-medium hover:bg-blue-700 transition-colors">
                Skicka
              </button>
            </div>
            <div className="mt-2 text-xs text-gray-400">
              + Naturligt språk • AI förstår kontext • Automatisk planering
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
