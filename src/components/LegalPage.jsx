import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useCanonicalUrl } from '../hooks/useCanonicalUrl';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ArrowLeft } from 'lucide-react';
import LanguageSwitcher from './LanguageSwitcher';
import Footer from './Footer';
import WheelLoader from './WheelLoader';

function LegalPage() {
  const { i18n } = useTranslation();
  const { document } = useParams(); // 'privacy' or 'terms'
  const navigate = useNavigate();
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Set canonical URL for legal pages
  useCanonicalUrl(`https://yearwheel.se/legal/${document}`);

  useEffect(() => {
    const loadDocument = async () => {
      setLoading(true);
      setError(null);
      
      const lang = i18n.language === 'en' ? 'en' : 'sv';
      const fileName = document === 'privacy' 
        ? `privacy-policy-${lang}.md`
        : `terms-of-service-${lang}.md`;
      
      try {
        const response = await fetch(`/legal/${fileName}`);
        if (!response.ok) {
          throw new Error('Document not found');
        }
        const text = await response.text();
        setContent(text);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadDocument();
  }, [document, i18n.language]);

  const title = document === 'privacy' 
    ? (i18n.language === 'en' ? 'Privacy Policy' : 'Integritetspolicy')
    : (i18n.language === 'en' ? 'Terms of Service' : 'Användarvillkor');

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm shadow-sm border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <Link to="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                <img 
                  src="/year_wheel_logo.svg" 
                  alt="YearWheel" 
                  className="h-8 w-auto"
                />
              </Link>
              <span className="text-gray-400">|</span>
              <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
            </div>
            <div className="flex items-center gap-2">
              <LanguageSwitcher />
              <button
                onClick={() => navigate(-1)}
                className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 font-medium transition-colors"
              >
                <ArrowLeft size={18} />
                <span className="hidden sm:inline">
                  {i18n.language === 'en' ? 'Back' : 'Tillbaka'}
                </span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {loading && (
          <div className="flex justify-center items-center py-20">
            <WheelLoader size="sm" />
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-sm p-6 text-center">
            <p className="text-red-800 font-medium mb-2">
              {i18n.language === 'en' ? 'Error loading document' : 'Fel vid laddning av dokument'}
            </p>
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        {!loading && !error && (
          <article className="bg-white rounded-sm shadow-lg p-8 md:p-12">
            <div className="prose prose-slate max-w-none
              prose-headings:font-bold prose-headings:text-gray-900
              prose-h1:text-3xl prose-h1:mb-8 prose-h1:mt-0 prose-h1:border-b-2 prose-h1:border-gray-200 prose-h1:pb-4
              prose-h2:text-2xl prose-h2:mt-12 prose-h2:mb-4 prose-h2:text-[#00A4A6]
              prose-h3:text-lg prose-h3:mt-6 prose-h3:mb-3 prose-h3:font-semibold prose-h3:text-gray-800
              prose-p:text-base prose-p:text-gray-700 prose-p:leading-relaxed prose-p:mb-4
              prose-a:text-[#00A4A6] prose-a:font-medium prose-a:no-underline hover:prose-a:underline hover:prose-a:text-[#2E9E97]
              prose-strong:text-gray-900 prose-strong:font-bold
              prose-ul:my-4 prose-ul:space-y-2
              prose-ol:my-4 prose-ol:space-y-2
              prose-li:text-base prose-li:text-gray-700 prose-li:leading-relaxed
              prose-li:marker:text-[#00A4A6]
              prose-hr:my-12 prose-hr:border-gray-200
              prose-blockquote:border-l-4 prose-blockquote:border-[#00A4A6] prose-blockquote:pl-4 prose-blockquote:py-2 prose-blockquote:italic prose-blockquote:text-gray-600 prose-blockquote:bg-gray-50"
            >
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {content}
              </ReactMarkdown>
            </div>
          </article>
        )}

        {/* Quick Links */}
        {!loading && !error && (
          <div className="mt-8 bg-gray-50 rounded-sm p-6 border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {i18n.language === 'en' ? 'Legal Documents' : 'Juridiska dokument'}
            </h3>
            <div className="flex flex-wrap gap-4">
              <Link
                to="/legal/privacy"
                className={`px-4 py-2 rounded-sm font-medium transition-colors ${
                  document === 'privacy'
                    ? 'bg-[#00A4A6] text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
                }`}
              >
                {i18n.language === 'en' ? 'Privacy Policy' : 'Integritetspolicy'}
              </Link>
              <Link
                to="/legal/terms"
                className={`px-4 py-2 rounded-sm font-medium transition-colors ${
                  document === 'terms'
                    ? 'bg-[#00A4A6] text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
                }`}
              >
                {i18n.language === 'en' ? 'Terms of Service' : 'Användarvillkor'}
              </Link>
            </div>
          </div>
        )}
      </main>

      <Footer variant="legal" />
    </div>
  );
}

export default LegalPage;
