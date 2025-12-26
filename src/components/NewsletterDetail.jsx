import { useState, useEffect } from 'react';
import { X, Mail, CheckCircle, AlertCircle, MousePointer, UserMinus, ExternalLink, Clock } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { newsletterTemplate, featureAnnouncementTemplate, tipsTemplate, simpleAnnouncementTemplate, compositeTemplate } from '../utils/emailTemplates';
import WheelLoader from './WheelLoader';

export default function NewsletterDetail({ send: initialSend, onClose }) {
  const [send, setSend] = useState(initialSend);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [preview, setPreview] = useState('');

  useEffect(() => {
    loadNewsletterData();
    loadEvents();
    generatePreview();
  }, [initialSend.id]);

  // Refresh newsletter data to get latest stats
  const loadNewsletterData = async () => {
    try {
      const { data, error } = await supabase
        .from('newsletter_sends')
        .select('*')
        .eq('id', initialSend.id)
        .single();

      if (error) throw error;
      if (data) setSend(data);
    } catch (error) {
      console.error('Error loading newsletter data:', error);
    }
  };

  const loadEvents = async () => {
    try {
      const { data, error } = await supabase
        .from('newsletter_events')
        .select('*')
        .eq('newsletter_send_id', initialSend.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setEvents(data || []);
    } catch (error) {
      console.error('Error loading events:', error);
    } finally {
      setLoading(false);
    }
  };

  const generatePreview = () => {
    if (!send.template_data) {
      setPreview('<p>Ingen förhandsgranskning tillgänglig</p>');
      return;
    }

    let html = '';
    switch (send.template_type) {
      case 'composite':
        html = compositeTemplate(send.template_data);
        break;
      case 'newsletter':
        html = newsletterTemplate(send.template_data);
        break;
      case 'feature':
        html = featureAnnouncementTemplate(send.template_data);
        break;
      case 'tips':
        html = tipsTemplate(send.template_data);
        break;
      case 'announcement':
        html = simpleAnnouncementTemplate(send.template_data);
        break;
      default:
        html = '<p>Okänd malltyp: ' + send.template_type + '</p>';
    }
    setPreview(html);
  };

  // Group events by type
  const deliveredEvents = events.filter(e => e.event_type === 'delivered');
  const openedEvents = events.filter(e => e.event_type === 'opened');
  const clickedEvents = events.filter(e => e.event_type === 'clicked');
  const bouncedEvents = events.filter(e => e.event_type === 'bounced' || e.event_type === 'complained');

  // Track unsubscribe clicks specifically
  const unsubscribeClicks = clickedEvents.filter(e => {
    const url = e.event_data?.click?.link || e.event_data?.click?.url || '';
    return url.includes('/unsubscribe') || url.includes('avregistrera');
  });

  // Get unique link clicks (grouped by URL)
  const linkClickStats = clickedEvents.reduce((acc, event) => {
    // Try different possible locations for the URL in the event data
    const url = event.event_data?.click?.link || 
                event.event_data?.click?.url || 
                event.event_data?.link || 
                event.event_data?.url || 
                'Unknown URL';
    if (!acc[url]) {
      acc[url] = { url, count: 0, recipients: new Set() };
    }
    acc[url].count++;
    acc[url].recipients.add(event.recipient);
    return acc;
  }, {});

  const linkClickArray = Object.values(linkClickStats).map(stat => ({
    ...stat,
    uniqueClicks: stat.recipients.size
  }));

  // Calculate rates - use sent count as base for all calculations to avoid division by zero
  const deliveryRate = send.recipient_count > 0 ? ((send.delivered_count / send.recipient_count) * 100).toFixed(1) : 0;
  const openRate = send.recipient_count > 0 ? ((send.opened_count / send.recipient_count) * 100).toFixed(1) : 0;
  const clickRate = send.recipient_count > 0 ? ((send.clicked_count / send.recipient_count) * 100).toFixed(1) : 0;
  const unsubscribeRate = send.recipient_count > 0 ? ((unsubscribeClicks.length / send.recipient_count) * 100).toFixed(2) : 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-sm shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-gray-200">
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-gray-900">{send.subject}</h2>
            <p className="text-sm text-gray-600 mt-1">
              Skickad {new Date(send.sent_at).toLocaleDateString('sv-SE', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric', 
                hour: '2-digit', 
                minute: '2-digit' 
              })}
            </p>
            {send.template_type && (
              <span className="inline-block mt-2 px-3 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded">
                {send.template_type}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 px-6">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-3 font-medium text-sm border-b-2 transition-colors ${
              activeTab === 'overview'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Översikt
          </button>
          <button
            onClick={() => setActiveTab('clicks')}
            className={`px-4 py-3 font-medium text-sm border-b-2 transition-colors ${
              activeTab === 'clicks'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Klick ({clickedEvents.length})
          </button>
          <button
            onClick={() => setActiveTab('events')}
            className={`px-4 py-3 font-medium text-sm border-b-2 transition-colors ${
              activeTab === 'events'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Alla händelser ({events.length})
          </button>
          <button
            onClick={() => setActiveTab('preview')}
            className={`px-4 py-3 font-medium text-sm border-b-2 transition-colors ${
              activeTab === 'preview'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Förhandsgranskning
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <WheelLoader size="sm" />
            </div>
          ) : (
            <>
              {/* Overview Tab */}
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  {/* Stats Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-blue-50 rounded-sm p-4">
                      <div className="flex items-center gap-2 text-blue-600 mb-2">
                        <Mail size={20} />
                        <span className="text-sm font-medium">Skickade</span>
                      </div>
                      <p className="text-3xl font-bold text-blue-900">{send.recipient_count}</p>
                    </div>

                    <div className="bg-green-50 rounded-sm p-4">
                      <div className="flex items-center gap-2 text-green-600 mb-2">
                        <CheckCircle size={20} />
                        <span className="text-sm font-medium">Levererade</span>
                      </div>
                      <p className="text-3xl font-bold text-green-900">{send.delivered_count}</p>
                      <p className="text-xs text-green-700 mt-1">{deliveryRate}% av skickade</p>
                    </div>

                    <div className="bg-purple-50 rounded-sm p-4">
                      <div className="flex items-center gap-2 text-purple-600 mb-2">
                        <Mail size={20} />
                        <span className="text-sm font-medium">Öppnade</span>
                      </div>
                      <p className="text-3xl font-bold text-purple-900">{send.opened_count}</p>
                      <p className="text-xs text-purple-700 mt-1">{openRate}% av skickade</p>
                    </div>

                    <div className="bg-indigo-50 rounded-sm p-4">
                      <div className="flex items-center gap-2 text-indigo-600 mb-2">
                        <MousePointer size={20} />
                        <span className="text-sm font-medium">Klick</span>
                      </div>
                      <p className="text-3xl font-bold text-indigo-900">{send.clicked_count}</p>
                      <p className="text-xs text-indigo-700 mt-1">{clickRate}% av skickade</p>
                    </div>
                  </div>

                  {/* Unsubscribe & Failed Stats */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-orange-50 rounded-sm p-4 border border-orange-200">
                      <div className="flex items-center gap-2 text-orange-600 mb-2">
                        <UserMinus size={20} />
                        <span className="text-sm font-medium">Avregistreringar</span>
                      </div>
                      <p className="text-2xl font-bold text-orange-900">{unsubscribeClicks.length}</p>
                      <p className="text-xs text-orange-700 mt-1">{unsubscribeRate}% av skickade</p>
                    </div>

                    {send.failed_count > 0 && (
                      <div className="bg-red-50 rounded-sm p-4 border border-red-200">
                        <div className="flex items-center gap-2 text-red-600 mb-2">
                          <AlertCircle size={20} />
                          <span className="text-sm font-medium">Misslyckade</span>
                        </div>
                        <p className="text-2xl font-bold text-red-900">{send.failed_count}</p>
                        <p className="text-xs text-red-700 mt-1">Studsar och klagomål</p>
                      </div>
                    )}
                  </div>

                  {/* Top Links */}
                  {linkClickArray.length > 0 && (
                    <div className="bg-white border border-gray-200 rounded-sm p-4">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Mest klickade länkar</h3>
                      <div className="space-y-3">
                        {linkClickArray.slice(0, 5).map((link, idx) => (
                          <div key={idx} className="flex items-start gap-3 p-3 bg-gray-50 rounded">
                            <ExternalLink size={16} className="text-gray-400 mt-0.5 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-gray-900 truncate">{link.url}</p>
                              <p className="text-xs text-gray-600 mt-1">
                                {link.count} klick från {link.uniqueClicks} unika mottagare
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Clicks Tab */}
              {activeTab === 'clicks' && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900">Alla länkklick ({clickedEvents.length})</h3>
                  {clickedEvents.length === 0 ? (
                    <p className="text-gray-500 text-center py-12">Inga klick registrerade ännu</p>
                  ) : (
                    <div className="space-y-2">
                      {clickedEvents.map((event, idx) => (
                        <div key={idx} className="border border-gray-200 rounded-sm p-4 hover:bg-gray-50 transition-colors">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <ExternalLink size={14} className="text-blue-600" />
                                <span className="text-sm font-medium text-gray-900">{event.recipient}</span>
                                {(event.event_data?.click?.link?.includes('unsubscribe') || 
                                  event.event_data?.click?.url?.includes('unsubscribe') ||
                                  event.event_data?.link?.includes('unsubscribe') ||
                                  event.event_data?.url?.includes('unsubscribe')) && (
                                  <span className="px-2 py-0.5 bg-orange-100 text-orange-700 text-xs rounded">
                                    Avregistrering
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-gray-600 break-all">
                                {event.event_data?.click?.link || 
                                 event.event_data?.click?.url || 
                                 event.event_data?.link || 
                                 event.event_data?.url || 
                                 'URL ej tillgänglig'}
                              </p>
                            </div>
                            <div className="text-xs text-gray-500 ml-4 flex items-center gap-1">
                              <Clock size={12} />
                              {new Date(event.created_at).toLocaleString('sv-SE')}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Events Tab */}
              {activeTab === 'events' && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900">Alla händelser ({events.length})</h3>
                  {events.length === 0 ? (
                    <p className="text-gray-500 text-center py-12">Inga händelser registrerade ännu</p>
                  ) : (
                    <div className="space-y-2">
                      {events.map((event, idx) => (
                        <div key={idx} className="border border-gray-200 rounded-sm p-3 hover:bg-gray-50 transition-colors">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              {event.event_type === 'delivered' && <CheckCircle size={16} className="text-green-600" />}
                              {event.event_type === 'opened' && <Mail size={16} className="text-blue-600" />}
                              {event.event_type === 'clicked' && <MousePointer size={16} className="text-purple-600" />}
                              {(event.event_type === 'bounced' || event.event_type === 'complained') && <AlertCircle size={16} className="text-red-600" />}
                              
                              <div>
                                <span className="text-sm font-medium text-gray-900 capitalize">{event.event_type}</span>
                                <span className="text-sm text-gray-600 ml-2">→ {event.recipient}</span>
                              </div>
                            </div>
                            <span className="text-xs text-gray-500">
                              {new Date(event.created_at).toLocaleString('sv-SE')}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Preview Tab */}
              {activeTab === 'preview' && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Email-förhandsgranskning</h3>
                  <div className="border border-gray-200 rounded-sm overflow-hidden">
                    <iframe
                      srcDoc={preview}
                      className="w-full h-[600px]"
                      title="Newsletter Preview"
                      sandbox="allow-same-origin"
                    />
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
