import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../hooks/useAuth';
import Hero from './Hero';
import LandingNavigation from './LandingNavigation';
import MobileDemoMessage from './MobileDemoMessage';
import InteractiveDemo from './InteractiveDemo';
import FeaturesSection from './FeaturesSection';
import PricingSection from './PricingSection';
import AuthSection from './AuthSection';
import TemplateShowcase from './TemplateShowcase';
import ComparisonTable from './ComparisonTable';
import Footer from './Footer';
import PhilosophySection from './PhilosophySection';

const LandingPage = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const featuresRef = useRef(null);
  const pricingRef = useRef(null);
  const aboutRef = useRef(null);
  const templatesRef = useRef(null);
  const comparisonRef = useRef(null);
  const authRef = useRef(null);
  const [authMode, setAuthMode] = useState('signup');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const scrollToFeatures = useCallback(() => {
    featuresRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const scrollToPricing = useCallback(() => {
    pricingRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const scrollToAbout = useCallback(() => {
    aboutRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const switchToLogin = useCallback(() => {
    setAuthMode('login');
  }, []);

  const switchToSignup = useCallback(() => {
    setAuthMode('signup');
  }, []);

  const scrollToTemplates = useCallback(() => {
    templatesRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const scrollToComparison = useCallback(() => {
    comparisonRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const scrollToAuth = useCallback(() => {
    authRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  return (
    <div className="min-h-screen bg-white">
      <LandingNavigation 
        mobileMenuOpen={mobileMenuOpen}
        setMobileMenuOpen={setMobileMenuOpen}
        setAuthMode={setAuthMode}
        scrollToFeatures={scrollToFeatures}
        scrollToTemplates={scrollToTemplates}
        scrollToPricing={scrollToPricing}
        scrollToComparison={scrollToComparison}
        scrollToAuth={scrollToAuth}
      />
      
      <main>
        <Hero />
        <MobileDemoMessage />
        <InteractiveDemo />
        
        <div ref={featuresRef}>
          <FeaturesSection />
        </div>
        
        <div ref={pricingRef}>
          <PricingSection />
        </div>

        <div ref={templatesRef}>
          <TemplateShowcase />
        </div>
        
        <div ref={aboutRef}>
          <PhilosophySection />
        </div>

        <div ref={comparisonRef}>
          <ComparisonTable />
        </div>

        <div ref={authRef}>
          <AuthSection 
            authMode={authMode}
            switchToLogin={switchToLogin}
            switchToSignup={switchToSignup}
          />
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default LandingPage;
