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
  const [authMode, setAuthMode] = useState('signup');

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

  return (
    <div className="min-h-screen bg-white">
      <LandingNavigation 
        scrollToFeatures={scrollToFeatures}
        scrollToPricing={scrollToPricing}
        scrollToAbout={scrollToAbout}
        switchToLogin={switchToLogin}
        switchToSignup={switchToSignup}
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

        <TemplateShowcase />
        
        <div ref={aboutRef}>
          <PhilosophySection />
        </div>

        <ComparisonTable />

        <AuthSection 
          authMode={authMode}
          switchToLogin={switchToLogin}
          switchToSignup={switchToSignup}
        />
      </main>

      <Footer />
    </div>
  );
};

export default LandingPage;
