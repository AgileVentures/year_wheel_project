import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import TemplateManager from '../components/TemplateManager';

/**
 * ReportTemplatesPage - Standalone page for managing report templates
 * Accessible via /templates route
 */
export default function ReportTemplatesPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link 
                to="/dashboard" 
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                <span className="text-sm font-medium">Tillbaka till Dashboard</span>
              </Link>
            </div>
            <h1 className="text-lg font-semibold text-gray-900">Rapportmallar</h1>
            <div className="w-40" /> {/* Spacer for centering */}
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden" style={{ height: 'calc(100vh - 160px)' }}>
          <TemplateManager
            wheelData={null}
            pageData={null}
            organizationData={null}
            onClose={() => navigate('/dashboard')}
          />
        </div>
      </main>
    </div>
  );
}
