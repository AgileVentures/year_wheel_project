import { useState } from 'react';
import { X, Check, Crown, Zap, Sparkles } from 'lucide-react';
import { loadStripe } from '@stripe/stripe-js';
import { createCheckoutSession } from '../../services/subscriptionService';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

export default function SubscriptionModal({ onClose, currentPlan = 'free' }) {
  const [loading, setLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState('yearly');

  const handleUpgrade = async (planType) => {
    try {
      setLoading(true);

      // Get price ID from environment
      const priceId = planType === 'monthly' 
        ? import.meta.env.VITE_STRIPE_MONTHLY_PRICE_ID
        : import.meta.env.VITE_STRIPE_YEARLY_PRICE_ID;

      // Create checkout session
      const { sessionId, url } = await createCheckoutSession(
        priceId,
        `${window.location.origin}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
        `${window.location.origin}/dashboard`
      );

      // Redirect to Stripe Checkout using the URL
      // Modern Stripe.js no longer uses redirectToCheckout
      if (url) {
        window.location.href = url;
      } else {
        throw new Error('No checkout URL received');
      }
    } catch (error) {
      console.error('Error starting checkout:', error);
      alert('Något gick fel. Försök igen senare.');
    } finally {
      setLoading(false);
    }
  };

  const plans = [
    {
      id: 'free',
      name: 'Gratis',
      price: '0',
      period: '',
      description: 'Perfekt för att komma igång',
      features: [
        '3 årshjul',
        '1 team med 3 medlemmar',
        'Export som PNG och SVG',
        'Grundläggande funktioner'
      ],
      disabled: currentPlan !== 'free',
      buttonText: currentPlan === 'free' ? 'Nuvarande plan' : 'Inte tillgänglig',
      icon: null
    },
    {
      id: 'monthly',
      name: 'Premium Månadsvis',
      price: '79',
      period: '/månad',
      description: 'För flexibilitet',
      features: [
        'AI-assisterad design och planering',
        'Obegränsade årshjul',
        'Obegränsade team och medlemmar',
        'Alla exportformat (PNG, SVG, PDF, JPG)',
        'Versionshistorik - se och återställ ändringar',
        'Dela hjul och samarbeta i realtid',
        'Prioriterad support'
      ],
      highlighted: false,
      buttonText: 'Uppgradera nu',
      icon: Zap
    },
    {
      id: 'yearly',
      name: 'Premium Årlig',
      price: '768',
      period: '/år',
      pricePerMonth: '64 kr/månad',
      savings: 'Spara 19%!',
      description: 'Bästa värdet',
      features: [
        'AI-assisterad design och planering',
        'Obegränsade årshjul',
        'Obegränsade team och medlemmar',
        'Alla exportformat (PNG, SVG, PDF, JPG)',
        'Versionshistorik - se och återställ ändringar',
        'Dela hjul och samarbeta i realtid',
        'Prioriterad support'
      ],
      highlighted: true,
      buttonText: 'Uppgradera nu',
      icon: Crown
    }
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-sm shadow-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Välj din plan</h2>
            <p className="text-sm text-gray-600 mt-1">
              Uppgradera för obegränsade möjligheter
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Plans Grid */}
        <div className="p-6">
          <div className="grid md:grid-cols-3 gap-6">
            {plans.map((plan) => {
              const Icon = plan.icon;
              const isHighlighted = plan.highlighted;
              
              return (
                <div
                  key={plan.id}
                  className={`
                    relative rounded-sm border-2 p-6
                    ${isHighlighted 
                      ? 'border-blue-500 shadow-lg scale-105' 
                      : 'border-gray-200'
                    }
                    ${plan.disabled ? 'opacity-60' : ''}
                  `}
                >
                  {/* Savings Badge */}
                  {plan.savings && (
                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                      <span className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-md">
                        {plan.savings}
                      </span>
                    </div>
                  )}

                  {/* Plan Header */}
                  <div className="text-center mb-6">
                    {Icon && (
                      <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-100 rounded-full mb-3">
                        <Icon className="text-blue-600" size={24} />
                      </div>
                    )}
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                      {plan.name}
                    </h3>
                    <p className="text-sm text-gray-600 mb-4">
                      {plan.description}
                    </p>
                    
                    {/* Price */}
                    <div className="mb-2">
                      <span className="text-4xl font-bold text-gray-900">
                        {plan.price} kr
                      </span>
                      <span className="text-gray-600">
                        {plan.period}
                      </span>
                    </div>
                    
                    {plan.pricePerMonth && (
                      <p className="text-sm text-gray-600">
                        ({plan.pricePerMonth})
                      </p>
                    )}
                  </div>

                  {/* Features */}
                  <ul className="space-y-3 mb-6">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-start">
                        <Check 
                          className={`
                            ${isHighlighted ? 'text-blue-600' : 'text-green-600'}
                            mr-3 flex-shrink-0 mt-0.5
                          `}
                          size={18}
                        />
                        <span className="text-sm text-gray-700">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  {/* Button */}
                  <button
                    onClick={() => !plan.disabled && handleUpgrade(plan.id)}
                    disabled={plan.disabled || loading}
                    className={`
                      w-full py-3 px-4 rounded-sm font-semibold transition-colors
                      ${isHighlighted
                        ? 'bg-blue-600 hover:bg-blue-700 text-white'
                        : 'bg-gray-100 hover:bg-gray-200 text-gray-900'
                      }
                      ${plan.disabled ? 'cursor-not-allowed opacity-60' : ''}
                      ${loading ? 'opacity-50 cursor-wait' : ''}
                    `}
                  >
                    {loading && !plan.disabled ? 'Behandlar...' : plan.buttonText}
                  </button>
                </div>
              );
            })}
          </div>

          {/* FAQ/Info Section */}
          <div className="mt-12 bg-gray-50 rounded-sm p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              Vanliga frågor
            </h3>
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold text-gray-900 mb-1">
                  Kan jag avbryta när som helst?
                </h4>
                <p className="text-sm text-gray-600">
                  Ja, du kan avbryta din prenumeration när som helst. 
                  Både månadsprenumerationen och årsprenumerationen löper till periodens slut. 
                  Du behåller full åtkomst till premium-funktioner fram till slutdatumet.
                </p>
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 mb-1">
                  Vad händer när prenumerationen tar slut?
                </h4>
                <p className="text-sm text-gray-600">
                  Du återgår automatiskt till gratisplanen. Dina hjul sparas, men du kan 
                  bara ha 2 aktiva hjul och 3 teammedlemmar. Ingen återbetalning sker för resterande tid.
                </p>
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 mb-1">
                  Är betalningen säker?
                </h4>
                <p className="text-sm text-gray-600">
                  Ja, vi använder Stripe för säkra betalningar. 
                  Din kortinformation lagras aldrig på våra servrar.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
