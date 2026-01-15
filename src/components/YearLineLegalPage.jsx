import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ArrowLeft } from 'lucide-react';
import LineLoader from './LineLoader';

function YearLineLegalPage() {
  const { document } = useParams(); // 'privacy' or 'terms'
  const navigate = useNavigate();
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadDocument = async () => {
      setLoading(true);
      setError(null);
      
      const fileName = document === 'privacy' 
        ? 'yearline-privacy-en.md'
        : 'yearline-terms-en.md';
      
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
  }, [document]);

  const title = document === 'privacy' ? 'Privacy Policy' : 'Terms of Service';

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-cyan-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm shadow-sm border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <Link to="/yearline/how-to" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                <img 
                  src="/year_line_logo.png" 
                  alt="YearLine" 
                  className="h-8 w-auto"
                />
              </Link>
              <span className="text-gray-400">|</span>
              <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
            </div>
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 font-medium transition-colors"
            >
              <ArrowLeft size={18} />
              <span className="hidden sm:inline">Back</span>
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {loading && (
          <div className="flex justify-center items-center py-20">
            <LineLoader size="md" />
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-sm p-6 text-center">
            <p className="text-red-800 font-medium mb-2">Error loading document</p>
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        {!loading && !error && (
          <div className="bg-white rounded-sm shadow-lg p-8 md:p-12">
            <article className="prose prose-slate max-w-none
              prose-headings:text-gray-900 
              prose-h1:text-4xl prose-h1:font-bold prose-h1:mb-8 prose-h1:bg-gradient-to-r prose-h1:from-purple-600 prose-h1:to-cyan-500 prose-h1:bg-clip-text prose-h1:text-transparent
              prose-h2:text-2xl prose-h2:font-semibold prose-h2:mt-12 prose-h2:mb-4 prose-h2:text-[#FF5A5F] prose-h2:border-b prose-h2:border-gray-200 prose-h2:pb-2
              prose-h3:text-xl prose-h3:font-semibold prose-h3:mt-8 prose-h3:mb-3
              prose-p:text-gray-700 prose-p:leading-relaxed prose-p:mb-4
              prose-a:text-[#FF5A5F] prose-a:no-underline hover:prose-a:underline
              prose-strong:text-gray-900 prose-strong:font-semibold
              prose-ul:my-4 prose-ul:list-disc prose-ul:pl-6
              prose-ol:my-4 prose-ol:list-decimal prose-ol:pl-6
              prose-li:text-gray-700 prose-li:my-2
              prose-code:text-purple-600 prose-code:bg-purple-50 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded
              prose-pre:bg-gray-50 prose-pre:border prose-pre:border-gray-200
              prose-blockquote:border-l-4 prose-blockquote:border-[#FF5A5F] prose-blockquote:pl-4 prose-blockquote:italic
              prose-table:border-collapse prose-table:w-full
              prose-th:bg-gradient-to-r prose-th:from-purple-100 prose-th:to-cyan-100 prose-th:p-3 prose-th:text-left prose-th:font-semibold
              prose-td:border prose-td:border-gray-200 prose-td:p-3
              prose-hr:border-gray-300 prose-hr:my-8"
            >
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {content}
              </ReactMarkdown>
            </article>

            {/* Quick Links */}
            <div className="mt-12 pt-8 border-t border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Related Documents</h3>
              <div className="flex flex-wrap gap-3">
                <Link
                  to="/yearline/legal/privacy"
                  className={`px-6 py-3 rounded-sm font-medium transition-colors ${
                    document === 'privacy'
                      ? 'bg-gradient-to-r from-purple-600 to-cyan-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Privacy Policy
                </Link>
                <Link
                  to="/yearline/legal/terms"
                  className={`px-6 py-3 rounded-sm font-medium transition-colors ${
                    document === 'terms'
                      ? 'bg-gradient-to-r from-purple-600 to-cyan-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Terms of Service
                </Link>
              </div>
            </div>

            {/* Contact */}
            <div className="mt-8 p-6 bg-gradient-to-r from-purple-50 to-cyan-50 rounded-sm border border-purple-200">
              <p className="text-gray-700 mb-2">
                <span className="font-semibold">Questions about this {title.toLowerCase()}?</span>
              </p>
              <p className="text-gray-600">
                Contact us at{' '}
                <a href="mailto:hey@communitaslabs.io" className="text-[#FF5A5F] font-medium hover:underline">
                  hey@communitaslabs.io
                </a>
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default YearLineLegalPage;
