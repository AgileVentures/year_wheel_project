import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../hooks/useAuth";
import { useCanonicalUrl } from "../hooks/useCanonicalUrl";
import Hero from "./Hero";
import LandingNavigation from "./LandingNavigation";
import MobileDemoMessage from "./MobileDemoMessage";
import InteractiveDemo from "./InteractiveDemo";
import FeaturesSection from "./FeaturesSection";
import ViewsSection from "./ViewsSection";
import PricingSection from "./PricingSection";
import AuthSection from "./AuthSection";
import TemplateShowcase from "./TemplateShowcase";
// import ComparisonTable from './ComparisonTable';
import Footer from "./Footer";
import PhilosophySection from "./PhilosophySection";
import WheelLoader from "./WheelLoader";

const LandingPage = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();

  // Loading state with delay for examining the loader
  const [isLoading, setIsLoading] = useState(true);

  // Set canonical URL for main landing page
  useCanonicalUrl("https://yearwheel.se/");
  const featuresRef = useRef(null);
  const pricingRef = useRef(null);
  const aboutRef = useRef(null);
  const templatesRef = useRef(null);
  const authRef = useRef(null);
  const [authMode, setAuthMode] = useState("signup");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [billingCycle, setBillingCycle] = useState("yearly"); // Default to yearly to show savings

  useEffect(() => {
    if (user) {
      navigate("/dashboard");
    }
  }, [user, navigate]);

  // Brief loading state to show the branded loader
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 800);
    return () => clearTimeout(timer);
  }, []);

  const scrollToFeatures = useCallback(() => {
    featuresRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  const scrollToPricing = useCallback(() => {
    pricingRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  const scrollToAbout = useCallback(() => {
    aboutRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  const switchToLogin = useCallback(() => {
    setAuthMode("login");
  }, []);

  const switchToSignup = useCallback(() => {
    setAuthMode("signup");
  }, []);

  const scrollToTemplates = useCallback(() => {
    templatesRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  const scrollToAuth = useCallback(() => {
    authRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  // Show loader while loading
  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <WheelLoader size="sm" className="mx-auto" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <LandingNavigation
        mobileMenuOpen={mobileMenuOpen}
        setMobileMenuOpen={setMobileMenuOpen}
        setAuthMode={setAuthMode}
        scrollToFeatures={scrollToFeatures}
        scrollToTemplates={scrollToTemplates}
        scrollToPricing={scrollToPricing}
        scrollToAuth={scrollToAuth}
      />

      <main>
        <Hero />
        <MobileDemoMessage />
        <InteractiveDemo />

        <div ref={featuresRef}>
          <FeaturesSection />
        </div>

        <ViewsSection />

        <div ref={pricingRef}>
          <PricingSection
            billingCycle={billingCycle}
            setBillingCycle={setBillingCycle}
            setAuthMode={setAuthMode}
            scrollToAuth={scrollToAuth}
          />
        </div>
        <div ref={aboutRef}>
          <PhilosophySection />
        </div>

        <div ref={templatesRef}>
          <TemplateShowcase />
        </div>
        {/* <div ref={comparisonRef}>
          <ComparisonTable />
        </div> */}
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
