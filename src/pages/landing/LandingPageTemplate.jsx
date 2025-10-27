import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CheckCircle, ArrowRight, Sparkles } from 'lucide-react';
import LandingNavigation from '../../components/LandingNavigation';
import Footer from '../../components/Footer';

/**
 * Reusable Landing Page Template
 * Used for keyword-optimized landing pages targeting specific segments
 */
export default function LandingPageTemplate({
  // SEO
  metaTitle,
  metaDescription,
  keywords,
  
  // Hero Section
  heroTitle,
  heroSubtitle,
  heroImage,
  heroCTA = 'Prova gratis',
  
  // Pain Points / Benefits
  painPoints = [],
  benefits = [],
  
  // Features (specific to this segment)
  features = [],
  
  // Social Proof
  testimonial,
  
  // Use Cases
  useCases = [],
  
  // Templates
  templates = [],
  
  // Custom content sections
  customSections = [],
  
  // Schema.org data
  schemaData
}) {
  const navigate = useNavigate();
  const { t } = useTranslation(['landing', 'common']);

  // Set meta tags for SEO
  useEffect(() => {
    document.title = metaTitle || 'YearWheel - Årsplanering gjord enkel';
    
    // Meta description
    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
      metaDesc = document.createElement('meta');
      metaDesc.name = 'description';
      document.head.appendChild(metaDesc);
    }
    metaDesc.content = metaDescription || '';
    
    // Keywords
    if (keywords) {
      let metaKeywords = document.querySelector('meta[name="keywords"]');
      if (!metaKeywords) {
        metaKeywords = document.createElement('meta');
        metaKeywords.name = 'keywords';
        document.head.appendChild(metaKeywords);
      }
      metaKeywords.content = keywords;
    }
    
    // Schema.org structured data
    if (schemaData) {
      let scriptTag = document.getElementById('schema-org');
      if (!scriptTag) {
        scriptTag = document.createElement('script');
        scriptTag.id = 'schema-org';
        scriptTag.type = 'application/ld+json';
        document.head.appendChild(scriptTag);
      }
      scriptTag.textContent = JSON.stringify(schemaData);
    }
  }, [metaTitle, metaDescription, keywords, schemaData]);

  const handleCTA = () => {
    navigate('/auth?mode=signup');
  };

  return (
    <div className="min-h-screen bg-white">
      <LandingNavigation />
      
      {/* Hero Section */}
      <section className="pt-20 pb-16 bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 mb-6 leading-tight">
                {heroTitle}
              </h1>
              <p className="text-xl text-gray-600 mb-8 leading-relaxed">
                {heroSubtitle}
              </p>
              
              {/* Pain Points */}
              {painPoints.length > 0 && (
                <div className="mb-8 space-y-3">
                  {painPoints.map((point, idx) => (
                    <div key={idx} className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-red-100 text-red-600 flex items-center justify-center text-sm font-bold mt-0.5">
                        ✗
                      </div>
                      <p className="text-gray-700">{point}</p>
                    </div>
                  ))}
                </div>
              )}
              
              <button
                onClick={handleCTA}
                className="inline-flex items-center gap-2 px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white text-lg font-semibold rounded-sm shadow-lg hover:shadow-xl transition-all"
              >
                {heroCTA}
                <ArrowRight size={20} />
              </button>
              
              <p className="mt-4 text-sm text-gray-500">
                Inget kreditkort krävs • 2 gratis årshjul
              </p>
            </div>
            
            {heroImage && (
              <div className="relative">
                <img 
                  src={heroImage} 
                  alt={heroTitle}
                  className="w-full h-auto rounded-lg shadow-2xl"
                />
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      {benefits.length > 0 && (
        <section className="py-16 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-12 text-center">
              Så hjälper YearWheel dig
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {benefits.map((benefit, idx) => (
                <div key={idx} className="flex items-start gap-4">
                  <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">{benefit.title}</h3>
                    <p className="text-gray-600">{benefit.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Features Section */}
      {features.length > 0 && (
        <section className="py-16 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-12 text-center">
              Funktioner som passar dina behov
            </h2>
            <div className="grid md:grid-cols-2 gap-8">
              {features.map((feature, idx) => (
                <div key={idx} className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                    {feature.icon}
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">{feature.title}</h3>
                  <p className="text-gray-600">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Use Cases Section */}
      {useCases.length > 0 && (
        <section className="py-16 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-12 text-center">
              Användningsområden
            </h2>
            <div className="grid md:grid-cols-3 gap-8">
              {useCases.map((useCase, idx) => (
                <div key={idx} className="text-center">
                  <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    {useCase.icon}
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">{useCase.title}</h3>
                  <p className="text-gray-600 text-sm">{useCase.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Templates Section */}
      {templates.length > 0 && (
        <section className="py-16 bg-gradient-to-br from-purple-50 to-blue-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-white rounded-full shadow-sm mb-4">
                <Sparkles className="w-5 h-5 text-purple-600" />
                <span className="text-sm font-semibold text-purple-600">Färdiga mallar</span>
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                Kom igång på sekunder
              </h2>
              <p className="text-xl text-gray-600">
                Välj en mall och anpassa efter dina behov
              </p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-8">
              {templates.map((template, idx) => (
                <div key={idx} className="bg-white p-6 rounded-lg shadow-md hover:shadow-xl transition-shadow">
                  <h3 className="font-semibold text-gray-900 mb-2">{template.name}</h3>
                  <p className="text-gray-600 text-sm mb-4">{template.description}</p>
                  <button
                    onClick={handleCTA}
                    className="text-blue-600 hover:text-blue-700 font-medium text-sm"
                  >
                    Använd mall →
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Testimonial Section */}
      {testimonial && (
        <section className="py-16 bg-white">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="bg-gradient-to-br from-blue-50 to-purple-50 p-8 rounded-lg">
              <p className="text-xl text-gray-800 italic mb-6">
                "{testimonial.quote}"
              </p>
              <div className="flex items-center gap-4">
                {testimonial.avatar && (
                  <img 
                    src={testimonial.avatar} 
                    alt={testimonial.author}
                    className="w-12 h-12 rounded-full"
                  />
                )}
                <div>
                  <p className="font-semibold text-gray-900">{testimonial.author}</p>
                  <p className="text-sm text-gray-600">{testimonial.role}</p>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Custom Sections */}
      {customSections.map((section, idx) => (
        <section key={idx} className={section.className || 'py-16'}>
          {section.content}
        </section>
      ))}

      {/* Final CTA Section */}
      <section className="py-20 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Redo att komma igång?
          </h2>
          <p className="text-xl mb-8 text-blue-100">
            Skapa ditt första årshjul idag - helt gratis
          </p>
          <button
            onClick={handleCTA}
            className="inline-flex items-center gap-2 px-8 py-4 bg-white text-blue-600 hover:bg-gray-100 text-lg font-semibold rounded-sm shadow-lg hover:shadow-xl transition-all"
          >
            Kom igång gratis
            <ArrowRight size={20} />
          </button>
          <p className="mt-4 text-sm text-blue-100">
            Inget kreditkort krävs • Aktivera Premium när du är redo
          </p>
        </div>
      </section>

      <Footer />
    </div>
  );
}
