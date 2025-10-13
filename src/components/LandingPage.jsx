import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../hooks/useAuth';
import { Crown, Check, Sparkles, Zap, Users, Calendar, Download, TrendingUp, ArrowRight, Play, Share2 } from 'lucide-react';
import LoginForm from './auth/LoginForm';
import SignupForm from './auth/SignupForm';
import AIAssistantDemo from './AIAssistantDemo';
import ManualEditorDemo from './ManualEditorDemo';
import Hero from './Hero';
import LanguageSwitcher from './LanguageSwitcher';

function LandingPage() {
  const { t } = useTranslation(['landing', 'common']);
  const navigate = useNavigate();
  const { user } = useAuth();
  const [authMode, setAuthMode] = useState('signup'); // 'login' or 'signup'
  const [activeDemo, setActiveDemo] = useState('wheel'); // 'wheel' or 'ai'
  const [billingCycle, setBillingCycle] = useState('yearly'); // 'monthly' or 'yearly'
  const demoRef = useRef(null);

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

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

  // Conversation sequence
  const conversationSequence = [
    { type: 'input-typing', text: "Skapa Kampanj i andra veckan i mars", delay: 500 },
    { type: 'user-send', delay: 100 },
    { type: 'ai-response', delay: 800 },
    { type: 'input-typing', text: "Förläng den till halva april", delay: 1500 },
    { type: 'user-send', delay: 100 },
    { type: 'ai-response', delay: 800 },
    { type: 'input-typing', text: "Kopiera kampanjen och lägg den i september", delay: 1500 },
    { type: 'user-send', delay: 100 },
    { type: 'ai-response', delay: 800 },
    { type: 'reset', delay: 3500 }
  ];

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
  }, [conversationStep, activeDemo]);

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

  const scrollToAuth = () => {
    const authSection = document.getElementById('auth-section');
    authSection?.scrollIntoView({ behavior: 'smooth' });
  };

  const scrollToDemo = () => {
    demoRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const scrollToFeatures = () => {
    const featuresSection = document.getElementById('features-section');
    featuresSection?.scrollIntoView({ behavior: 'smooth' });
  };

  const scrollToPricing = () => {
    const pricingSection = document.getElementById('pricing-section');
    pricingSection?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 bg-white/80 backdrop-blur-md border-b border-gray-200 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <img src="/year_wheel_logo.svg" alt="YearWheel" className="h-8 w-auto" />
            </div>
            <div className="hidden md:flex items-center gap-8">
              <button onClick={scrollToFeatures} className="text-gray-600 hover:text-gray-900 font-medium transition-colors">
                {t('landing:nav.features')}
              </button>
              <button onClick={scrollToPricing} className="text-gray-600 hover:text-gray-900 font-medium transition-colors">
                {t('landing:nav.pricing')}
              </button>
              <button onClick={scrollToAuth} className="text-gray-600 hover:text-gray-900 font-medium transition-colors">
                {t('landing:nav.login')}
              </button>
              <LanguageSwitcher />
              <button
                onClick={scrollToAuth}
                className="px-5 py-2.5 bg-[#00A4A6] text-white rounded-sm hover:bg-[#2E9E97] font-semibold transition-colors"
              >
                {t('landing:nav.getStarted')}
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <Hero />

      {/* Mobile Demo Message */}
      <section className="md:hidden py-16 px-4 bg-gradient-to-br from-[#A4E6E0] via-[#36C2C6] to-[#00A4A6] text-white">
        <div className="max-w-2xl mx-auto text-center">
          <div className="bg-white/10 backdrop-blur-sm rounded-sm p-8 border border-white/20">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold mb-3">
              {t('landing:mobileMessage.title')}
            </h2>
            <p className="text-lg text-white/90 mb-6">
              {t('landing:mobileMessage.description')}
            </p>
            <p className="text-sm text-white/80">
              {t('landing:mobileMessage.demoNote')}
            </p>
          </div>
        </div>
      </section>

      {/* Interactive Demo Section (Inspired by lexlegal.ai) */}
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
            {activeDemo === 'old-ai' && (
              <div className="aspect-video bg-white p-4">
                {/* Editor Mockup */}
                <div className="h-full flex">
                  {/* Main Editor Area with Wheel */}
                  <div className="flex-1 bg-gray-50 rounded-sm border border-gray-200 relative overflow-hidden">
                    {/* Editor Header */}
                    <div className="bg-white border-b border-gray-200 px-4 py-2 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <img src="/year_wheel_logo.svg" alt="YearWheel" className="h-6 w-auto" />
                        <span className="text-sm font-medium text-gray-700">{t('landing:demo.wheelTitle')}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span className="text-xs text-gray-500">Auto-sparad</span>
                      </div>
                    </div>
                    
                    {/* Clean Wheel with Perfect Cake Slices */}
                    <div className="flex-1 flex items-center justify-center p-8">
                      <div className="relative w-full max-w-md">
                        <svg viewBox="0 0 360 360" className="transform -rotate-90 drop-shadow-xl w-full h-auto">
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
                            Skapa Kampanj i andra veckan i mars
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
                            Kopiera kampanjen och lägg den i september
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
            )}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      {/* Features Section */}
      <section id="features-section" className="py-20 px-4 sm:px-6 lg:px-8 scroll-mt-16">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Allt du behöver för professionell planering
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Från strategi till genomförande – YearWheel ger dig verktygen för att hålla teamet synkat
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Feature 1 - AI Assistant (PREMIUM) */}
            <div className="bg-gradient-to-br from-[#A4E6E0]/20 to-white p-8 rounded-sm border-2 border-[#36C2C6] hover:shadow-xl transition-all relative overflow-hidden">
              <div className="absolute top-3 right-3 bg-[#9FCB3E] text-[#336B3E] px-3 py-1 text-xs font-bold rounded-full flex items-center gap-1">
                <Crown size={12} />
                {t('landing:features.premium')}
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-[#00A4A6] to-[#2D4EC8] rounded-sm flex items-center justify-center mb-6">
                <Sparkles className="text-white" size={24} />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">
                {t('landing:features.aiAssistant.title')}
              </h3>
              <p className="text-gray-600">
                {t('landing:features.aiAssistant.description')}
              </p>
            </div>

            {/* Feature 2 - Google Integration (PREMIUM) */}
            <div className="bg-gradient-to-br from-[#A4E6E0]/20 to-white p-8 rounded-sm border-2 border-[#2D4EC8] hover:shadow-xl transition-all relative overflow-hidden">
              <div className="absolute top-3 right-3 bg-[#9FCB3E] text-[#336B3E] px-3 py-1 text-xs font-bold rounded-full flex items-center gap-1">
                <Crown size={12} />
                {t('landing:features.premium')}
              </div>
              <div className="w-12 h-12 bg-[#2D4EC8] rounded-sm flex items-center justify-center mb-6">
                <Calendar className="text-white" size={24} />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">
                {t('landing:features.googleIntegration.title')}
              </h3>
              <p className="text-gray-600">
                {t('landing:features.googleIntegration.description')}
              </p>
            </div>

            {/* Feature 3 - Circular Overview */}
            <div className="bg-gradient-to-br from-[#A4E6E0]/20 to-white p-8 rounded-sm border border-[#36C2C6]/30 hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-[#00A4A6] rounded-sm flex items-center justify-center mb-6">
                <TrendingUp className="text-white" size={24} />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">
                {t('landing:features.circularOverview.title')}
              </h3>
              <p className="text-gray-600">
                {t('landing:features.circularOverview.description')}
              </p>
            </div>

            {/* Feature 4 - Real-time Collaboration */}
            <div className="bg-gradient-to-br from-[#9FCB3E]/20 to-white p-8 rounded-sm border border-[#9FCB3E]/30 hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-[#336B3E] rounded-sm flex items-center justify-center mb-6">
                <Users className="text-white" size={24} />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">
                {t('landing:features.realTimeCollaboration.title')}
              </h3>
              <p className="text-gray-600">
                {t('landing:features.realTimeCollaboration.description')}
              </p>
            </div>

            {/* Feature 5 - Smart Rings */}
            <div className="bg-gradient-to-br from-[#A4E6E0]/20 to-white p-8 rounded-sm border border-[#2E9E97]/30 hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-[#2E9E97] rounded-sm flex items-center justify-center mb-6">
                <Zap className="text-white" size={24} />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">
                {t('landing:features.smartRings.title')}
              </h3>
              <p className="text-gray-600">
                {t('landing:features.smartRings.description')}
              </p>
            </div>

            {/* Feature 6 - High Quality Export */}
            <div className="bg-gradient-to-br from-[#A4E6E0]/20 to-white p-8 rounded-sm border border-[#36C2C6]/30 hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-[#36C2C6] rounded-sm flex items-center justify-center mb-6">
                <Download className="text-white" size={24} />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">
                {t('landing:features.highQualityExport.title')}
              </h3>
              <p className="text-gray-600">
                {t('landing:features.highQualityExport.description')}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      {/* Pricing Section */}
      <section id="pricing-section" className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50 scroll-mt-16">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Enkel prissättning
            </h2>
            <p className="text-xl text-gray-600 mb-8">
              Börja gratis, uppgradera när du behöver mer
            </p>

            {/* Billing Toggle */}
            <div className="flex items-center justify-center gap-4 mb-12">
              <span className={`text-sm font-medium ${billingCycle === 'monthly' ? 'text-gray-900' : 'text-gray-500'}`}>
                {t('landing:pricing.monthly')}
              </span>
              <button
                onClick={() => setBillingCycle(billingCycle === 'monthly' ? 'yearly' : 'monthly')}
                className="relative inline-flex h-6 w-11 items-center rounded-full bg-[#00A4A6] transition-colors"
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    billingCycle === 'yearly' ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
              <span className={`text-sm font-medium ${billingCycle === 'yearly' ? 'text-gray-900' : 'text-gray-500'}`}>
                {t('landing:pricing.yearly')}
              </span>
              {billingCycle === 'yearly' && (
                <span className="inline-flex items-center px-2 py-1 bg-[#9FCB3E]/20 text-[#336B3E] text-xs font-bold rounded-full border border-[#9FCB3E]/30">
                  {t('landing:pricing.yearlyDiscount')}
                </span>
              )}
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {/* Free Plan */}
            <div className="bg-white rounded-sm p-8 border-2 border-gray-200 hover:border-gray-300 transition-colors">
              <div className="mb-6">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">{t('landing:pricing.free.name')}</h3>
                <div className="flex items-baseline gap-2">
                  <span className="text-5xl font-bold text-gray-900">{t('landing:pricing.free.price')}</span>
                  <span className="text-gray-600">{t('landing:pricing.premium.period')}</span>
                </div>
              </div>

              <ul className="space-y-4 mb-8">
                <li className="flex items-start gap-3">
                  <Check className="text-green-600 flex-shrink-0 mt-1" size={20} />
                  <span className="text-gray-700">{t('subscription:plans.free.features.wheels')}</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="text-green-600 flex-shrink-0 mt-1" size={20} />
                  <span className="text-gray-700">{t('subscription:plans.free.features.team')}</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="text-green-600 flex-shrink-0 mt-1" size={20} />
                  <span className="text-gray-700">{t('subscription:plans.free.features.export')}</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="text-green-600 flex-shrink-0 mt-1" size={20} />
                  <span className="text-gray-700">{t('landing:pricing.free.features')}</span>
                </li>
              </ul>

              <button
                onClick={scrollToAuth}
                className="w-full py-3 px-6 bg-gray-100 hover:bg-gray-200 text-gray-900 rounded-sm font-semibold transition-colors"
              >
                {t('landing:pricing.free.cta')}
              </button>
            </div>

            {/* Premium Plan */}
            <div className="bg-gradient-to-br from-[#1B2A63] via-[#2D4EC8] to-[#2E9E97] rounded-sm p-8 border-2 border-[#36C2C6]/50 relative overflow-hidden shadow-2xl">
              <div className="absolute top-0 right-0 bg-[#9FCB3E] text-[#336B3E] px-4 py-1 text-xs font-bold rounded-bl-lg">
                {t('landing:pricing.premium.popular')}
              </div>

              <div className="mb-6">
                <div className="flex items-center gap-2 mb-2">
                  <Crown className="text-[#9FCB3E]" size={24} />
                  <h3 className="text-2xl font-bold text-white">{t('landing:pricing.premium.name')}</h3>
                </div>
                {billingCycle === 'monthly' ? (
                  <div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-5xl font-bold text-white">{t('landing:pricing.premium.priceMonthly')}</span>
                      <span className="text-[#A4E6E0]">{t('landing:pricing.premium.period')}</span>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-5xl font-bold text-white">{t('landing:pricing.premium.priceYearly')}</span>
                      <span className="text-[#A4E6E0]">{t('landing:pricing.premium.period')}</span>
                    </div>
                    <p className="text-sm text-[#A4E6E0] mt-1">({t('landing:pricing.premium.yearlyTotal')} - {t('landing:pricing.premium.saveText')})</p>
                  </div>
                )}
              </div>

              <ul className="space-y-4 mb-8">
                {t('landing:pricing.premium.features', { returnObjects: true }).map((feature, index) => {
                  // Special icons for first two features (AI and Google Integration)
                  const getIcon = () => {
                    if (index === 0) {
                      return (
                        <div className="w-5 h-5 bg-white rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Sparkles className="text-[#00A4A6]" size={12} />
                        </div>
                      );
                    }
                    if (index === 1) {
                      return (
                        <div className="w-5 h-5 bg-white rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Calendar className="text-[#00A4A6]" size={12} />
                        </div>
                      );
                    }
                    return <Check className="text-white flex-shrink-0 mt-1" size={20} />;
                  };

                  return (
                    <li key={index} className="flex items-start gap-3">
                      {getIcon()}
                      <span className={`text-white ${index < 2 ? 'font-semibold' : ''}`}>{feature}</span>
                    </li>
                  );
                })}
              </ul>

              <button
                onClick={scrollToAuth}
                className="w-full py-3 px-6 bg-white hover:bg-[#A4E6E0] text-[#1B2A63] rounded-sm font-semibold transition-colors shadow-lg"
              >
                {t('landing:pricing.premium.cta')}
              </button>
            </div>
          </div>

          <div className="text-center mt-8">
            <a href="/pricing" className="text-[#00A4A6] hover:text-[#2E9E97] font-semibold">
              Se alla detaljer och FAQ →
            </a>
          </div>

          {/* NGO/Non-profit Discount Banner */}
          <div className="mt-12 max-w-3xl mx-auto">
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-lg p-6 shadow-sm">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {t('landing:pricing.ngoDiscount.title')}
                  </h3>
                  <p className="text-gray-700 mb-3" dangerouslySetInnerHTML={{ __html: t('landing:pricing.ngoDiscount.description') }} />
                  <a 
                    href="mailto:hey@communitaslabs.io?subject=NGO%20Rabatt%20-%20YearWheel&body=Hej!%0A%0AVi%20är%20en%20ideell%20organisation%2FNGO%20och%20skulle%20vilja%20veta%20mer%20om%20er%2050%25%20rabatt%20på%20Premium-planen.%0A%0AOrganisation%3A%20%0AWebbplats%3A%20%0A%0ATack!"
                    className="inline-flex items-center gap-2 text-green-700 hover:text-green-800 font-medium transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    hey@communitaslabs.io
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Auth Section */}
      <section id="auth-section" className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-indigo-50 via-white to-cyan-50 scroll-mt-16">
        <div className="max-w-md mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              {authMode === 'signup' ? t('landing:auth.title') : t('landing:auth.titleLogin')}
            </h2>
            <p className="text-gray-600">
              {authMode === 'signup' 
                ? t('auth:signup.noCreditCard')
                : t('auth:login.welcomeBack')}
            </p>
          </div>

          <div className="bg-white rounded-sm shadow-xl p-8 border border-gray-200">
            {authMode === 'login' ? (
              <LoginForm onToggleMode={() => setAuthMode('signup')} />
            ) : (
              <SignupForm onToggleMode={() => setAuthMode('login')} />
            )}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-50 border-t border-gray-200 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <img src="/year_wheel_logo.svg" alt="YearWheel" className="h-6 w-auto" />
              </div>
              <p className="text-sm text-gray-600">
                Gör årsplanering enkel, tydlig och effektiv för hela teamet.
              </p>
            </div>

            <div>
              <h4 className="text-gray-900 font-semibold mb-4">{t('landing:footer.product')}</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="/pricing" className="text-gray-600 hover:text-[#00A4A6] transition-colors">{t('landing:footer.pricing')}</a></li>
                <li><a href="/auth" className="text-gray-600 hover:text-[#00A4A6] transition-colors">{t('landing:nav.getStarted')}</a></li>
              </ul>
            </div>

            <div>
              <h4 className="text-gray-900 font-semibold mb-4">{t('landing:footer.company')}</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="https://communitaslabs.io" target="_blank" rel="noopener noreferrer" className="text-gray-600 hover:text-[#00A4A6] transition-colors">{t('landing:footer.about')}</a></li>
                <li><a href="https://communitaslabs.io" target="_blank" rel="noopener noreferrer" className="text-gray-600 hover:text-[#00A4A6] transition-colors">{t('landing:footer.contact')}</a></li>
              </ul>
            </div>

            <div>
              <h4 className="text-gray-900 font-semibold mb-4">{t('landing:footer.legal')}</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="https://communitaslabs.io/privacy" target="_blank" rel="noopener noreferrer" className="text-gray-600 hover:text-[#00A4A6] transition-colors">{t('landing:footer.privacy')}</a></li>
                <li><a href="https://communitaslabs.io/terms" target="_blank" rel="noopener noreferrer" className="text-gray-600 hover:text-[#00A4A6] transition-colors">{t('landing:footer.terms')}</a></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-200 pt-8 text-center text-sm text-gray-600">
            <p>
              YearWheel Planner är en SaaS-tjänst skapad och driven av <a href="https://communitaslabs.io" target="_blank" rel="noopener noreferrer" className="text-[#00A4A6] hover:text-[#2E9E97] font-medium transition-colors">CommunitasLabs Inc</a>
            </p>
          </div>
        </div>
      </footer>

      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fadeIn {
          animation: fadeIn 0.5s ease-out;
        }

        @keyframes spin-slow {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }

        .animate-spin-slow {
          animation: spin-slow 20s linear infinite;
        }
      `}</style>
    </div>
  );
}

export default LandingPage;
