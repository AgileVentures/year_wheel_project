import { useState } from 'react';
import { CheckCircle, ArrowRight, ArrowLeft, Sparkles, Target } from 'lucide-react';

/**
 * Interactive Persona Quiz Component
 * Lead generation tool that qualifies users and provides personalized recommendations
 * 
 * Quiz Flow:
 * 1. Best practices understanding (3 questions)
 * 2. Current situation assessment (2 questions)
 * 3. Desired outcome (2 questions)
 * 4. Obstacles identification (2 questions)
 * 5. Solution fit (1 question)
 * 6. Open feedback (optional)
 */
export default function PersonaQuiz({ 
  persona, // 'marketing', 'project', 'education'
  onComplete, // Callback with quiz results
  questions, // Array of question objects
  resultMessages // Object with result-based messages
}) {
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [showResults, setShowResults] = useState(false);
  const [email, setEmail] = useState('');

  const handleAnswer = (questionId, answer) => {
    setAnswers(prev => ({ ...prev, [questionId]: answer }));
  };

  const handleNext = () => {
    if (currentStep < questions.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      calculateResults();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const calculateResults = () => {
    // Calculate pain score and readiness
    const painScore = Object.entries(answers)
      .filter(([key]) => key.startsWith('pain_'))
      .reduce((sum, [_, value]) => sum + (value?.score || 0), 0);
    
    const readinessScore = Object.entries(answers)
      .filter(([key]) => key.startsWith('readiness_'))
      .reduce((sum, [_, value]) => sum + (value?.score || 0), 0);

    setShowResults(true);
    
    // Track quiz completion (can integrate with analytics)
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'quiz_completed', {
        persona,
        pain_score: painScore,
        readiness_score: readinessScore
      });
    }
  };

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    
    // Submit to backend
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/submit-quiz`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
          },
          body: JSON.stringify({
            email,
            persona,
            answers,
            sourceUrl: window.location.href
          })
        }
      );

      const result = await response.json();
      if (!response.ok) {
        console.error('Quiz submission error:', result);
      }
    } catch (error) {
      console.error('Failed to submit quiz:', error);
    }
    
    // Track lead generation
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'generate_lead', {
        value: 1,
        currency: 'SEK',
        method: 'quiz'
      });
    }
    
    // Call parent callback
    if (onComplete) {
      onComplete({ answers, email, persona });
    }
  };

  const currentQuestion = questions[currentStep];
  const progress = ((currentStep + 1) / questions.length) * 100;
  const canProceed = answers[currentQuestion?.id];

  if (showResults) {
    const painScore = Object.entries(answers)
      .filter(([key]) => key.startsWith('pain_'))
      .reduce((sum, [_, value]) => sum + (value?.score || 0), 0);

    const message = painScore > 15 
      ? resultMessages.high 
      : painScore > 8 
      ? resultMessages.medium 
      : resultMessages.low;

    return (
      <div className="bg-white rounded-sm shadow-xl p-8 max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-4">
            Tack för dina svar!
          </h3>
          <p className="text-lg text-gray-700 mb-6">
            {message}
          </p>
        </div>

        <form onSubmit={handleEmailSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Få din personliga rekommendation via email:
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="din@email.se"
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <button
            type="submit"
            className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-sm transition-colors"
          >
            Få min rekommendation
            <ArrowRight size={20} />
          </button>
          
          <p className="text-xs text-gray-500 text-center">
            Vi skickar dig tips och en personlig demo baserat på dina svar. Ingen spam!
          </p>
        </form>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-sm shadow-xl p-8 max-w-2xl mx-auto">
      {/* Progress Bar */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-600">
            Fråga {currentStep + 1} av {questions.length}
          </span>
          <span className="text-sm font-medium text-blue-600">
            {Math.round(progress)}%
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Question */}
      <div className="mb-8">
        {currentQuestion?.category && (
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium mb-4">
            <Target size={16} />
            {currentQuestion.category}
          </div>
        )}
        
        <h3 className="text-2xl font-bold text-gray-900 mb-6">
          {currentQuestion?.question}
        </h3>

        {currentQuestion?.type === 'single' && (
          <div className="space-y-3">
            {currentQuestion?.options.map((option, idx) => (
              <button
                key={idx}
                onClick={() => handleAnswer(currentQuestion.id, option)}
                className={`w-full text-left p-4 border-2 rounded-sm transition-all ${
                  answers[currentQuestion.id]?.text === option.text
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center mt-0.5 ${
                    answers[currentQuestion.id]?.text === option.text
                      ? 'border-blue-600 bg-blue-600'
                      : 'border-gray-300'
                  }`}>
                    {answers[currentQuestion.id]?.text === option.text && (
                      <CheckCircle className="w-4 h-4 text-white" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{option.text}</p>
                    {option.subtext && (
                      <p className="text-sm text-gray-600 mt-1">{option.subtext}</p>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        {currentQuestion?.type === 'multiple' && (
          <div className="space-y-3">
            {currentQuestion?.options.map((option, idx) => {
              const isSelected = (answers[currentQuestion.id] || []).some(
                selected => selected.text === option.text
              );
              
              return (
                <button
                  key={idx}
                  onClick={() => {
                    const current = answers[currentQuestion.id] || [];
                    const newValue = isSelected
                      ? current.filter(item => item.text !== option.text)
                      : [...current, option];
                    handleAnswer(currentQuestion.id, newValue);
                  }}
                  className={`w-full text-left p-4 border-2 rounded-sm transition-all ${
                    isSelected
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`flex-shrink-0 w-6 h-6 rounded border-2 flex items-center justify-center mt-0.5 ${
                      isSelected
                        ? 'border-blue-600 bg-blue-600'
                        : 'border-gray-300'
                    }`}>
                      {isSelected && (
                        <CheckCircle className="w-4 h-4 text-white" />
                      )}
                    </div>
                    <p className="font-medium text-gray-900">{option.text}</p>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {currentQuestion?.type === 'text' && (
          <textarea
            value={answers[currentQuestion.id] || ''}
            onChange={(e) => handleAnswer(currentQuestion.id, e.target.value)}
            placeholder="Skriv ditt svar här..."
            rows={4}
            className="w-full px-4 py-3 border border-gray-300 rounded-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        )}
      </div>

      {/* Navigation */}
      <div className="flex justify-between items-center">
        <button
          onClick={handleBack}
          disabled={currentStep === 0}
          className={`flex items-center gap-2 px-6 py-3 rounded-sm font-medium transition-colors ${
            currentStep === 0
              ? 'text-gray-400 cursor-not-allowed'
              : 'text-gray-700 hover:bg-gray-100'
          }`}
        >
          <ArrowLeft size={20} />
          Föregående
        </button>

        <button
          onClick={handleNext}
          disabled={!canProceed}
          className={`flex items-center gap-2 px-6 py-3 rounded-sm font-semibold transition-colors ${
            canProceed
              ? 'bg-blue-600 hover:bg-blue-700 text-white'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          }`}
        >
          {currentStep === questions.length - 1 ? 'Se resultat' : 'Nästa'}
          <ArrowRight size={20} />
        </button>
      </div>
    </div>
  );
}
