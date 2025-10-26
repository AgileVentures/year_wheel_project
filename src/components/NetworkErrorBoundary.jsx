import { Component } from 'react';
import { AlertTriangle, RefreshCw, HelpCircle } from 'lucide-react';

/**
 * NetworkErrorBoundary Component
 * 
 * Catches network-level errors including SSL/TLS issues from corporate firewalls
 * like Fortinet, Zscaler, etc.
 */
class NetworkErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      isNetworkError: false,
      isSSLError: false,
    };
  }

  static getDerivedStateFromError(error) {
    // Detect network and SSL errors
    const errorMessage = error?.message?.toLowerCase() || '';
    const isNetworkError = 
      errorMessage.includes('network') ||
      errorMessage.includes('fetch') ||
      errorMessage.includes('connection') ||
      errorMessage.includes('cors') ||
      error?.name === 'NetworkError' ||
      error?.name === 'TypeError';
    
    const isSSLError = 
      errorMessage.includes('ssl') ||
      errorMessage.includes('tls') ||
      errorMessage.includes('certificate') ||
      errorMessage.includes('fortinet') ||
      errorMessage.includes('zscaler') ||
      errorMessage.includes('firewall');

    return {
      hasError: true,
      error,
      isNetworkError,
      isSSLError,
    };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    console.error('NetworkErrorBoundary caught error:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      isNetworkError: false,
      isSSLError: false,
    });
  };

  render() {
    if (this.state.hasError) {
      const { isNetworkError, isSSLError, error } = this.state;

      // SSL/Corporate Firewall Error
      if (isSSLError) {
        return (
          <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 flex items-center justify-center p-4">
            <div className="max-w-2xl w-full bg-white rounded-sm shadow-2xl p-8">
              <div className="flex items-start gap-4 mb-6">
                <div className="flex-shrink-0">
                  <AlertTriangle className="w-12 h-12 text-orange-500" />
                </div>
                <div className="flex-1">
                  <h1 className="text-2xl font-bold text-gray-900 mb-2">
                    Network Security Configuration Issue
                  </h1>
                  <p className="text-gray-600 mb-4">
                    Your network's security software (like Fortinet, Zscaler, or similar) is blocking secure connections.
                  </p>
                </div>
              </div>

              <div className="bg-orange-50 border border-orange-200 rounded-sm p-4 mb-6">
                <h2 className="font-semibold text-orange-900 mb-2 flex items-center gap-2">
                  <HelpCircle className="w-5 h-5" />
                  What's happening?
                </h2>
                <p className="text-orange-800 text-sm mb-3">
                  Your organization's firewall performs SSL/TLS inspection, which can interfere with secure connections. 
                  This is common in corporate networks.
                </p>
                <p className="text-orange-800 text-sm font-medium">
                  Error: {error?.message || 'Security certificate validation failed'}
                </p>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-sm p-4 mb-6">
                <h2 className="font-semibold text-blue-900 mb-3">Solutions:</h2>
                <ol className="list-decimal list-inside space-y-2 text-sm text-blue-900">
                  <li>
                    <strong>Contact your IT administrator</strong> - They can add an exception for this application
                  </li>
                  <li>
                    <strong>Use a different network</strong> - Try connecting from home or a mobile hotspot
                  </li>
                  <li>
                    <strong>Install security certificates</strong> - Your IT department may need to install proper certificates
                  </li>
                  <li>
                    <strong>Use a different browser</strong> - Some browsers handle corporate proxies better
                  </li>
                </ol>
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded-sm p-4 mb-6">
                <h3 className="font-semibold text-gray-900 mb-2">For IT Administrators:</h3>
                <p className="text-sm text-gray-700 mb-2">
                  This application is hosted on <strong>Netlify</strong> using Let's Encrypt SSL certificates.
                  Please whitelist the following in your firewall:
                </p>
                <ul className="list-disc list-inside text-sm text-gray-700 space-y-1 font-mono bg-white p-3 rounded border border-gray-200">
                  <li>{window.location.hostname}</li>
                  <li>*.netlify.app</li>
                  <li>*.netlify.com</li>
                  <li>*.supabase.co</li>
                  <li>*.supabase.com</li>
                  <li>googleapis.com</li>
                  <li>openai.com</li>
                </ul>
                <p className="text-sm text-gray-700 mt-3">
                  <strong>Common issues:</strong>
                </p>
                <ul className="list-disc list-inside text-sm text-gray-700 space-y-1 mt-1">
                  <li>Let's Encrypt certificates may need to be trusted</li>
                  <li>TLS 1.3 must be enabled on firewall</li>
                  <li>Certificate Transparency logs must be accessible</li>
                  <li>Netlify CDN IP ranges may need whitelisting</li>
                </ul>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={this.handleReload}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-sm font-medium transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  Retry Connection
                </button>
                <button
                  onClick={this.handleReset}
                  className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-sm font-medium transition-colors"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        );
      }

      // Generic Network Error
      if (isNetworkError) {
        return (
          <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center p-4">
            <div className="max-w-lg w-full bg-white rounded-sm shadow-2xl p-8">
              <div className="flex items-start gap-4 mb-6">
                <div className="flex-shrink-0">
                  <AlertTriangle className="w-10 h-10 text-blue-500" />
                </div>
                <div className="flex-1">
                  <h1 className="text-2xl font-bold text-gray-900 mb-2">
                    Connection Issue
                  </h1>
                  <p className="text-gray-600">
                    Unable to connect to the server. Please check your internet connection.
                  </p>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-sm p-4 mb-6">
                <p className="text-sm text-blue-900">
                  {error?.message || 'Network request failed'}
                </p>
              </div>

              <div className="space-y-2 mb-6 text-sm text-gray-700">
                <p><strong>Try:</strong></p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>Check your internet connection</li>
                  <li>Disable VPN if active</li>
                  <li>Reload the page</li>
                  <li>Clear browser cache</li>
                </ul>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={this.handleReload}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-sm font-medium transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  Reload Page
                </button>
                <button
                  onClick={this.handleReset}
                  className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-sm font-medium transition-colors"
                >
                  Try Again
                </button>
              </div>
            </div>
          </div>
        );
      }

      // Generic Error Fallback
      return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
          <div className="max-w-lg w-full bg-white rounded-sm shadow-2xl p-8">
            <div className="flex items-start gap-4 mb-6">
              <div className="flex-shrink-0">
                <AlertTriangle className="w-10 h-10 text-red-500" />
              </div>
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-gray-900 mb-2">
                  Something Went Wrong
                </h1>
                <p className="text-gray-600">
                  An unexpected error occurred. Please try reloading the page.
                </p>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-sm p-4 mb-6">
                <p className="text-sm text-red-900 font-mono">
                  {error.toString()}
                </p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={this.handleReload}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-sm font-medium transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Reload Page
              </button>
              <button
                onClick={this.handleReset}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-sm font-medium transition-colors"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default NetworkErrorBoundary;
