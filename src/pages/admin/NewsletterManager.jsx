import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { 
  newsletterTemplate, 
  featureAnnouncementTemplate, 
  tipsTemplate, 
  simpleAnnouncementTemplate 
} from '../../utils/emailTemplates';
import { Send, Users, Mail, Clock, CheckCircle, AlertCircle } from 'lucide-react';

export default function NewsletterManager() {
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [history, setHistory] = useState([]);
  const [preview, setPreview] = useState(null);
  
  // Form state
  const [recipientType, setRecipientType] = useState('all');
  const [subject, setSubject] = useState('');
  const [templateType, setTemplateType] = useState('newsletter');
  const [customEmails, setCustomEmails] = useState('');
  
  // Template fields
  const [newsletter, setNewsletter] = useState({
    heading: '',
    intro: '',
    sections: [{ title: '', content: '', link: { text: '', url: '' } }],
    cta: { text: '', url: '' },
    ps: ''
  });
  
  const [feature, setFeature] = useState({
    feature: '',
    description: '',
    benefits: [''],
    screenshot: '',
    cta: { text: '', url: '' }
  });
  
  const [tips, setTips] = useState({
    title: '',
    intro: '',
    tips: [{ title: '', description: '', link: { text: '', url: '' } }],
    cta: { text: '', url: '' }
  });
  
  const [announcement, setAnnouncement] = useState({
    title: '',
    message: '',
    cta: { text: '', url: '' }
  });

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    const { data, error } = await supabase
      .from('newsletter_sends')
      .select('*')
      .order('sent_at', { ascending: false })
      .limit(20);
    
    if (!error && data) {
      setHistory(data);
    }
  };

  const generatePreview = () => {
    let html = '';
    
    switch (templateType) {
      case 'newsletter':
        html = newsletterTemplate(newsletter);
        break;
      case 'feature':
        html = featureAnnouncementTemplate(feature);
        break;
      case 'tips':
        html = tipsTemplate(tips);
        break;
      case 'announcement':
        html = simpleAnnouncementTemplate(announcement);
        break;
    }
    
    setPreview(html);
  };

  const sendNewsletter = async () => {
    if (!subject) {
      alert('Ange en ämnesrad');
      return;
    }
    
    if (!preview) {
      alert('Generera en förhandsgranskning först');
      return;
    }

    if (!confirm(`Är du säker på att du vill skicka till "${recipientType}" mottagare?`)) {
      return;
    }

    setSending(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-newsletter`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`
          },
          body: JSON.stringify({
            recipientType,
            customEmails: recipientType === 'custom' ? customEmails.split(',').map(e => e.trim()) : undefined,
            subject,
            htmlContent: preview
          })
        }
      );

      const result = await response.json();

      if (response.ok) {
        alert(`✅ Newsletter skickat till ${result.totalRecipients} mottagare!`);
        loadHistory();
        // Reset form
        setSubject('');
        setPreview(null);
      } else {
        alert(`❌ Fel: ${result.error}`);
      }
    } catch (error) {
      console.error('Send error:', error);
      alert('Ett fel uppstod vid skickning');
    } finally {
      setSending(false);
    }
  };

  const addSection = () => {
    setNewsletter({
      ...newsletter,
      sections: [...newsletter.sections, { title: '', content: '', link: { text: '', url: '' } }]
    });
  };

  const addBenefit = () => {
    setFeature({
      ...feature,
      benefits: [...feature.benefits, '']
    });
  };

  const addTip = () => {
    setTips({
      ...tips,
      tips: [...tips.tips, { title: '', description: '', link: { text: '', url: '' } }]
    });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Newsletter Manager</h1>
        <p className="text-gray-600">Skapa och skicka newsletters till dina användare</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Editor */}
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Nytt Newsletter</h2>
            
            {/* Recipients */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Mottagare
              </label>
              <select
                value={recipientType}
                onChange={(e) => setRecipientType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Alla användare</option>
                <option value="premium">Premium-användare</option>
                <option value="free">Gratis-användare</option>
                <option value="admins">Admins</option>
                <option value="custom">Anpassad lista</option>
              </select>
            </div>

            {recipientType === 'custom' && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email-adresser (komma-separerade)
                </label>
                <textarea
                  value={customEmails}
                  onChange={(e) => setCustomEmails(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  placeholder="user1@example.com, user2@example.com"
                />
              </div>
            )}

            {/* Subject */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ämnesrad *
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                placeholder="YearWheel - Nya funktioner denna månad"
              />
            </div>

            {/* Template Type */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Mall
              </label>
              <select
                value={templateType}
                onChange={(e) => setTemplateType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              >
                <option value="newsletter">Newsletter (med sektioner)</option>
                <option value="feature">Ny funktion</option>
                <option value="tips">Tips & Tricks</option>
                <option value="announcement">Enkelt meddelande</option>
              </select>
            </div>

            {/* Dynamic Template Fields */}
            {templateType === 'newsletter' && (
              <div className="space-y-4">
                <input
                  type="text"
                  placeholder="Huvudrubrik"
                  value={newsletter.heading}
                  onChange={(e) => setNewsletter({ ...newsletter, heading: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
                <textarea
                  placeholder="Intro-text"
                  value={newsletter.intro}
                  onChange={(e) => setNewsletter({ ...newsletter, intro: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
                
                {newsletter.sections.map((section, idx) => (
                  <div key={idx} className="p-4 border border-gray-200 rounded-md space-y-2">
                    <input
                      type="text"
                      placeholder="Sektion-rubrik"
                      value={section.title}
                      onChange={(e) => {
                        const newSections = [...newsletter.sections];
                        newSections[idx].title = e.target.value;
                        setNewsletter({ ...newsletter, sections: newSections });
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                    <textarea
                      placeholder="Sektion-innehåll"
                      value={section.content}
                      onChange={(e) => {
                        const newSections = [...newsletter.sections];
                        newSections[idx].content = e.target.value;
                        setNewsletter({ ...newsletter, sections: newSections });
                      }}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                ))}
                
                <button
                  onClick={addSection}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  + Lägg till sektion
                </button>
                
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="CTA Text"
                    value={newsletter.cta.text}
                    onChange={(e) => setNewsletter({ ...newsletter, cta: { ...newsletter.cta, text: e.target.value } })}
                    className="px-3 py-2 border border-gray-300 rounded-md"
                  />
                  <input
                    type="text"
                    placeholder="CTA URL"
                    value={newsletter.cta.url}
                    onChange={(e) => setNewsletter({ ...newsletter, cta: { ...newsletter.cta, url: e.target.value } })}
                    className="px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                
                <input
                  type="text"
                  placeholder="P.S. (valfritt)"
                  value={newsletter.ps}
                  onChange={(e) => setNewsletter({ ...newsletter, ps: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
            )}

            {templateType === 'announcement' && (
              <div className="space-y-4">
                <input
                  type="text"
                  placeholder="Titel"
                  value={announcement.title}
                  onChange={(e) => setAnnouncement({ ...announcement, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
                <textarea
                  placeholder="Meddelande (HTML stöds)"
                  value={announcement.message}
                  onChange={(e) => setAnnouncement({ ...announcement, message: e.target.value })}
                  rows={6}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="CTA Text (valfritt)"
                    value={announcement.cta.text}
                    onChange={(e) => setAnnouncement({ ...announcement, cta: { ...announcement.cta, text: e.target.value } })}
                    className="px-3 py-2 border border-gray-300 rounded-md"
                  />
                  <input
                    type="text"
                    placeholder="CTA URL (valfritt)"
                    value={announcement.cta.url}
                    onChange={(e) => setAnnouncement({ ...announcement, cta: { ...announcement.cta, url: e.target.value } })}
                    className="px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
              </div>
            )}

            <div className="flex gap-3 mt-6">
              <button
                onClick={generatePreview}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md transition-colors"
              >
                <Mail size={18} />
                Förhandsgranska
              </button>
              
              <button
                onClick={sendNewsletter}
                disabled={!preview || sending}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-medium rounded-md transition-colors"
              >
                <Send size={18} />
                {sending ? 'Skickar...' : 'Skicka'}
              </button>
            </div>
          </div>

          {/* History */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Historik</h2>
            <div className="space-y-3">
              {history.map(send => (
                <div key={send.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                  <div>
                    <p className="font-medium text-gray-900 text-sm">{send.subject}</p>
                    <p className="text-xs text-gray-600 mt-1">
                      {send.recipient_count} mottagare • {new Date(send.sent_at).toLocaleDateString('sv-SE')}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle size={16} className="text-green-600" />
                    <span className="text-sm text-gray-600">{send.success_count}</span>
                  </div>
                </div>
              ))}
              
              {history.length === 0 && (
                <p className="text-gray-500 text-sm text-center py-8">Ingen historik ännu</p>
              )}
            </div>
          </div>
        </div>

        {/* Preview */}
        <div className="lg:sticky lg:top-8 h-fit">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Förhandsgranskning</h2>
            {preview ? (
              <div className="border border-gray-200 rounded-md overflow-hidden">
                <iframe
                  srcDoc={preview}
                  className="w-full h-[600px]"
                  title="Email Preview"
                  sandbox="allow-same-origin"
                />
              </div>
            ) : (
              <div className="flex items-center justify-center h-64 bg-gray-50 rounded-md">
                <p className="text-gray-500">Fyll i formuläret och klicka på "Förhandsgranska"</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
