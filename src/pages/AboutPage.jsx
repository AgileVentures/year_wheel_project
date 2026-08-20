import { ArrowLeft, ArrowUpRight, BriefcaseBusiness, Building2, Code2, Layers3, Mail } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useCanonicalUrl } from '../hooks/useCanonicalUrl';
import Footer from '../components/Footer';
import LanguageSwitcher from '../components/LanguageSwitcher';
import WheelVisualization from '../components/WheelVisualization';

function AboutPage() {
  const { i18n } = useTranslation();
  const isEnglish = i18n.language === 'en';
  useCanonicalUrl('https://yearwheel.se/about');

  const copy = isEnglish
    ? {
        back: 'Back to YearWheel',
        eyebrow: 'Auctum product family',
        title: 'Tools that make the work around a business easier to see.',
        intro: 'YearWheel is part of Auctum Solutions AB, a Swedish software company building practical tools for important everyday work.',
        buildTitle: 'What we build',
        buildText: 'We believe good software should reduce the distance between a plan and the people who make it happen. Our products turn complex information into clear, usable views that teams can return to every day.',
        familyTitle: 'Products and services that move work forward',
        familyText: 'Auctum brings together two products and a practical professional-services team. Each part can stand alone, or work together when a business needs both a better system and a clearer way to plan.',
        wheelTitle: 'YearWheel Planner',
        wheelText: 'A visual yearly planning workspace for teams, projects and recurring work. See the whole year, connect activities and keep the important context in view.',
        accountingTitle: 'Auctum Affärssystem',
        accountingText: 'A cloud business system for invoicing, accounting, payroll and VAT reporting. Built to make everyday administration more connected and easier to run.',
        servicesTitle: 'Professional services',
        servicesText: 'Hands-on help with digitalization, GDPR compliance, software development and the practical work of turning good ideas into reliable systems.',
        mondayTitle: 'For monday.com',
        mondayText: 'Our monday.com offering includes versions of both YearWheel and YearLine, bringing visual planning and timeline thinking into the tools teams already use.',
        companyTitle: 'The company',
        companyText: 'Auctum Solutions AB is a Swedish technology company focused on business-critical software for Nordic markets.',
        contact: 'Questions about YearWheel or the product family?',
        email: 'Email us at',
        openAuctum: 'Visit Auctum',
        org: 'Auctum Solutions AB — Company no. 556486-3206',
      }
    : {
        back: 'Tillbaka till YearWheel',
        eyebrow: 'Auctums produktfamilj',
        title: 'Verktyg som gör arbetet runt en verksamhet enklare att se.',
        intro: 'YearWheel är en del av Auctum Solutions AB, ett svenskt teknikbolag som bygger praktiska verktyg för viktigt arbete i vardagen.',
        buildTitle: 'Vad vi bygger',
        buildText: 'Vi tror att bra mjukvara ska minska avståndet mellan en plan och människorna som ska genomföra den. Våra produkter gör komplex information tydlig och användbar, så att team kan återvända till den varje dag.',
        familyTitle: 'Produkter och tjänster som får arbetet att gå framåt',
        familyText: 'Auctum samlar två produkter och ett praktiskt Professional Services-team. Varje del kan stå för sig, eller kombineras när en verksamhet behöver både ett bättre system och tydligare planering.',
        wheelTitle: 'YearWheel Planner',
        wheelText: 'En visuell planeringsyta för team, projekt och återkommande arbete. Se hela året, koppla ihop aktiviteter och behåll det viktiga sammanhanget i bilden.',
        accountingTitle: 'Auctum Affärssystem',
        accountingText: 'Ett molnbaserat affärssystem för fakturering, bokföring, löner och momsdeklarationer. Byggt för att göra den dagliga administrationen mer sammanhängande och enklare att driva.',
        servicesTitle: 'Professional Services',
        servicesText: 'Praktisk hjälp med digitalisering, GDPR-compliance, mjukvaruutveckling och arbetet med att göra bra idéer till pålitliga system.',
        mondayTitle: 'För monday.com',
        mondayText: 'Vårt monday.com-erbjudande innehåller versioner av både YearWheel och YearLine, så att team kan få visuell planering och tydliga tidslinjer direkt i verktygen de redan använder.',
        companyTitle: 'Bolaget',
        companyText: 'Auctum Solutions AB är ett svenskt teknikbolag med fokus på affärskritisk mjukvara för nordiska marknader.',
        contact: 'Frågor om YearWheel eller produktfamiljen?',
        email: 'Kontakta oss på',
        openAuctum: 'Besök Auctum',
        org: 'Auctum Solutions AB — Org.nr 556486-3206',
      };

  return (
    <div className="min-h-screen bg-[#F7FBFC] text-[#1B2A63]">
      <header className="border-b border-[#D9EEF0] bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-8">
          <Link to="/" className="flex items-center gap-3" aria-label={copy.back}>
            <img src="/year_wheel_logo.svg" alt="YearWheel" className="h-8 w-auto" />
          </Link>
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition-colors hover:text-[#1B2A63]"
            >
              <ArrowLeft size={16} aria-hidden="true" />
              {copy.back}
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden border-b border-[#D9EEF0]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_72%_45%,rgba(54,194,198,0.18),transparent_32%),linear-gradient(135deg,#F7FBFC_0%,#FFFFFF_58%,#E7F6F6_100%)]" />
          <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-5 py-20 sm:px-8 lg:grid-cols-[1.1fr_0.9fr] lg:py-28">
            <div className="max-w-3xl">
              <div className="mb-8 inline-flex items-center gap-3 text-sm font-semibold uppercase tracking-[0.16em] text-[#00A4A6]">
                <span className="flex h-9 items-center border border-[#1B2A63] bg-[#1B2A63] px-3 text-xs font-bold tracking-[0.28em] text-white">
                  AUCTUM
                </span>
                <span>{copy.eyebrow}</span>
              </div>
              <h1 className="max-w-4xl text-4xl font-semibold leading-tight tracking-tight text-[#1B2A63] sm:text-6xl">
                {copy.title}
              </h1>
              <p className="mt-8 max-w-2xl text-lg leading-8 text-slate-600 sm:text-xl">
                {copy.intro}
              </p>
              <a
                href="https://auctum.se/about"
                className="mt-10 inline-flex items-center gap-2 bg-[#00A4A6] px-5 py-3 font-semibold text-white transition-colors hover:bg-[#2E9E97]"
              >
                {copy.openAuctum}
                <ArrowUpRight size={17} aria-hidden="true" />
              </a>
            </div>
            <div className="relative flex min-h-[290px] items-center justify-center border border-[#A4E6E0] bg-white px-8 py-10 shadow-sm">
              <WheelVisualization variant="full" className="w-full max-w-[390px]" />
              <div className="absolute bottom-5 left-5 text-xs uppercase tracking-[0.18em] text-slate-500">YearWheel Planner</div>
            </div>
          </div>
        </section>

        <section className="bg-slate-50 text-slate-900">
          <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:py-24">
            <div className="grid gap-12 lg:grid-cols-[0.7fr_1.3fr]">
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#0f9fa4]">Auctum</p>
                <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">{copy.buildTitle}</h2>
              </div>
              <p className="max-w-3xl text-xl leading-9 text-slate-600">{copy.buildText}</p>
            </div>

            <div className="mt-20 border-t border-slate-200 pt-10">
              <div className="max-w-2xl">
                <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#0f9fa4]">{copy.eyebrow}</p>
                <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">{copy.familyTitle}</h2>
                <p className="mt-5 text-lg leading-8 text-slate-600">{copy.familyText}</p>
              </div>
              <div className="mt-10 grid gap-5 md:grid-cols-2">
                <article className="border border-[#D9EEF0] bg-white p-7 shadow-sm">
                  <div className="flex items-center gap-3 text-[#0f9fa4]">
                    <Layers3 size={21} aria-hidden="true" />
                    <span className="text-sm font-bold uppercase tracking-[0.14em]">YearWheel</span>
                  </div>
                  <h3 className="mt-6 text-2xl font-semibold text-slate-900">{copy.wheelTitle}</h3>
                  <p className="mt-4 leading-7 text-slate-600">{copy.wheelText}</p>
                  <Link to="/" className="mt-7 inline-flex items-center gap-2 font-semibold text-[#0f8f94] hover:text-[#0c6f73]">
                    YearWheel.se <ArrowUpRight size={16} aria-hidden="true" />
                  </Link>
                </article>
                <article className="border border-[#D9EEF0] bg-white p-7 shadow-sm">
                  <div className="flex items-center gap-3 text-[#2D4EC8]">
                    <Building2 size={21} aria-hidden="true" />
                    <span className="text-sm font-bold uppercase tracking-[0.14em]">Auctum</span>
                  </div>
                  <h3 className="mt-6 text-2xl font-semibold text-slate-900">{copy.accountingTitle}</h3>
                  <p className="mt-4 leading-7 text-slate-600">{copy.accountingText}</p>
                  <a href="https://auctum.se" className="mt-7 inline-flex items-center gap-2 font-semibold text-[#2D4EC8] hover:text-[#1E1EBE]">
                    Auctum.se <ArrowUpRight size={16} aria-hidden="true" />
                  </a>
                </article>
                <article className="border border-[#D9EEF0] bg-white p-7 shadow-sm">
                  <div className="flex items-center gap-3 text-[#00A4A6]">
                    <BriefcaseBusiness size={21} aria-hidden="true" />
                    <span className="text-sm font-bold uppercase tracking-[0.14em]">Auctum services</span>
                  </div>
                  <h3 className="mt-6 text-2xl font-semibold text-slate-900">{copy.servicesTitle}</h3>
                  <p className="mt-4 leading-7 text-slate-600">{copy.servicesText}</p>
                  <a href="mailto:info@auctum.se" className="mt-7 inline-flex items-center gap-2 font-semibold text-[#0f8f94] hover:text-[#0c6f73]">
                    {copy.email} <ArrowUpRight size={16} aria-hidden="true" />
                  </a>
                </article>
                <article className="border border-[#D9EEF0] bg-white p-7 shadow-sm">
                  <div className="flex items-center gap-3 text-[#1E1EBE]">
                    <Code2 size={21} aria-hidden="true" />
                    <span className="text-sm font-bold uppercase tracking-[0.14em]">monday.com</span>
                  </div>
                  <h3 className="mt-6 text-2xl font-semibold text-slate-900">{copy.mondayTitle}</h3>
                  <p className="mt-4 leading-7 text-slate-600">{copy.mondayText}</p>
                  <a href="https://auctum.se" className="mt-7 inline-flex items-center gap-2 font-semibold text-[#1E1EBE] hover:text-[#1515A0]">
                    monday.com <ArrowUpRight size={16} aria-hidden="true" />
                  </a>
                </article>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-white text-slate-900">
          <div className="mx-auto grid max-w-7xl gap-12 px-5 py-20 sm:px-8 lg:grid-cols-[1fr_1fr] lg:py-24">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#0f9fa4]">Auctum Solutions AB</p>
              <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">{copy.companyTitle}</h2>
              <p className="mt-6 max-w-xl text-lg leading-8 text-slate-600">{copy.companyText}</p>
            </div>
            <div className="border-l-2 border-[#00A4A6] pl-7 lg:pl-10">
              <p className="text-lg font-semibold text-slate-900">{copy.contact}</p>
              <p className="mt-5 text-sm uppercase tracking-[0.14em] text-slate-500">{copy.email}</p>
              <a href="mailto:info@auctum.se" className="mt-2 inline-flex items-center gap-2 text-xl font-semibold text-[#0f8f94] hover:underline">
                <Mail size={20} aria-hidden="true" />
                info@auctum.se
              </a>
              <p className="mt-6 text-sm text-slate-500">{copy.org}</p>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

export default AboutPage;
