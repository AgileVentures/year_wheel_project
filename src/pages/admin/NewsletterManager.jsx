import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { 
  newsletterTemplate, 
  featureAnnouncementTemplate, 
  tipsTemplate, 
  simpleAnnouncementTemplate 
} from '../../utils/emailTemplates';
import { Send, Users, Mail, Clock, CheckCircle, AlertCircle, Copy, Trash2, Save, X } from 'lucide-react';

export default function NewsletterManager() {
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [saving, setSaving] = useState(false);
  const [history, setHistory] = useState([]);
  const [drafts, setDrafts] = useState([]);
  const [preview, setPreview] = useState(null);
  const [editingDraftId, setEditingDraftId] = useState(null);
  const [toast, setToast] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState(null);
  
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

  // Helper functions for UI feedback
  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const showConfirm = (message, onConfirm) => {
    setConfirmDialog({ message, onConfirm });
  };

  useEffect(() => {
    loadHistory();
    loadDrafts();
  }, []);

  const loadHistory = async () => {
    const { data, error } = await supabase
      .from('newsletter_sends')
      .select('*')
      .eq('is_draft', false)
      .order('sent_at', { ascending: false })
      .limit(20);
    
    if (!error && data) {
      setHistory(data);
    }
  };

  const loadDrafts = async () => {
    const { data, error } = await supabase
      .from('newsletter_sends')
      .select('*')
      .eq('is_draft', true)
      .order('created_at', { ascending: false });
    
    if (!error && data) {
      setDrafts(data);
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
      showToast('Ange en ämnesrad', 'error');
      return;
    }
    
    if (!preview) {
      showToast('Generera en förhandsgranskning först', 'error');
      return;
    }

    showConfirm(`Är du säker på att du vill skicka till "${recipientType}" mottagare?`, async () => {
      setSending(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      // Get current template data based on type
      let currentTemplateData = null;
      switch (templateType) {
        case 'newsletter':
          currentTemplateData = newsletter;
          break;
        case 'feature':
          currentTemplateData = feature;
          break;
        case 'tips':
          currentTemplateData = tips;
          break;
        case 'announcement':
          currentTemplateData = announcement;
          break;
      }
      
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
            htmlContent: preview,
            templateType,
            templateData: currentTemplateData
          })
        }
      );

      const result = await response.json();

      if (response.ok) {
        // If we were editing a draft, delete it since we sent it
        if (editingDraftId) {
          await supabase
            .from('newsletter_sends')
            .delete()
            .eq('id', editingDraftId);
          setEditingDraftId(null);
        }
        
        showToast(`Newsletter skickat till ${result.totalRecipients} mottagare!`, 'success');
        loadHistory();
        loadDrafts();
        // Reset form
        setSubject('');
        setPreview(null);
      } else {
        showToast(`Fel: ${result.error}`, 'error');
      }
    } catch (error) {
      console.error('Send error:', error);
      showToast('Ett fel uppstod vid skickning', 'error');
    } finally {
      setSending(false);
    }
    });
  };

  const reuseNewsletter = (send) => {
    // Load the template data
    if (send.template_type && send.template_data) {
      setTemplateType(send.template_type);
      setSubject(send.is_draft ? send.subject : `${send.subject} (Kopia)`);
      setRecipientType(send.recipient_type);
      setEditingDraftId(send.is_draft ? send.id : null);
      
      switch (send.template_type) {
        case 'newsletter':
          setNewsletter(send.template_data);
          break;
        case 'feature':
          setFeature(send.template_data);
          break;
        case 'tips':
          setTips(send.template_data);
          break;
        case 'announcement':
          setAnnouncement(send.template_data);
          break;
      }
      
      // Scroll to top
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      showToast('Denna newsletter har ingen mall-data att återanvända', 'error');
    }
  };

  const deleteNewsletter = async (id) => {
    showConfirm('Är du säker på att du vill ta bort denna newsletter från historiken?', async () => {
      try {
        const { error } = await supabase
          .from('newsletter_sends')
          .delete()
          .eq('id', id);

        if (error) throw error;

        loadHistory();
        loadDrafts();
        showToast('Newsletter borttagen', 'success');
      } catch (error) {
        console.error('Delete error:', error);
        showToast('Ett fel uppstod vid borttagning', 'error');
      }
    });
  };

  const saveDraft = async () => {
    if (!subject) {
      showToast('Ange en ämnesrad', 'error');
      return;
    }

    setSaving(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      // Get current template data based on type
      let currentTemplateData = null;
      switch (templateType) {
        case 'newsletter':
          currentTemplateData = newsletter;
          break;
        case 'feature':
          currentTemplateData = feature;
          break;
        case 'tips':
          currentTemplateData = tips;
          break;
        case 'announcement':
          currentTemplateData = announcement;
          break;
      }

      const draftData = {
        sent_by: session.user.id,
        recipient_type: recipientType,
        subject: subject,
        recipient_count: 0,
        success_count: 0,
        error_count: 0,
        template_type: templateType,
        template_data: currentTemplateData,
        is_draft: true,
        created_at: new Date().toISOString()
      };

      if (editingDraftId) {
        // Update existing draft
        const { error } = await supabase
          .from('newsletter_sends')
          .update(draftData)
          .eq('id', editingDraftId);

        if (error) throw error;
        showToast('Utkast uppdaterat!', 'success');
      } else {
        // Create new draft
        const { error } = await supabase
          .from('newsletter_sends')
          .insert([draftData]);

        if (error) throw error;
        showToast('Utkast sparat!', 'success');
      }

      loadDrafts();
    } catch (error) {
      console.error('Save draft error:', error);
      showToast('Ett fel uppstod vid sparande', 'error');
    } finally {
      setSaving(false);
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
          <div className="bg-white rounded-sm shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Nytt Newsletter</h2>
            
            {/* Recipients */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Mottagare
              </label>
              <select
                value={recipientType}
                onChange={(e) => setRecipientType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-sm focus:ring-2 focus:ring-blue-500"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-sm focus:ring-2 focus:ring-blue-500"
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
                className="w-full px-3 py-2 border border-gray-300 rounded-sm focus:ring-2 focus:ring-blue-500"
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
                className="w-full px-3 py-2 border border-gray-300 rounded-sm focus:ring-2 focus:ring-blue-500"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-sm"
                />
                <textarea
                  placeholder="Intro-text"
                  value={newsletter.intro}
                  onChange={(e) => setNewsletter({ ...newsletter, intro: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-sm"
                />
                
                {newsletter.sections.map((section, idx) => (
                  <div key={idx} className="p-4 border border-gray-200 rounded-sm space-y-2">
                    <input
                      type="text"
                      placeholder="Sektion-rubrik"
                      value={section.title}
                      onChange={(e) => {
                        const newSections = [...newsletter.sections];
                        newSections[idx].title = e.target.value;
                        setNewsletter({ ...newsletter, sections: newSections });
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-sm"
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
                      className="w-full px-3 py-2 border border-gray-300 rounded-sm"
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
                    className="px-3 py-2 border border-gray-300 rounded-sm"
                  />
                  <input
                    type="text"
                    placeholder="CTA URL"
                    value={newsletter.cta.url}
                    onChange={(e) => setNewsletter({ ...newsletter, cta: { ...newsletter.cta, url: e.target.value } })}
                    className="px-3 py-2 border border-gray-300 rounded-sm"
                  />
                </div>
                
                <input
                  type="text"
                  placeholder="P.S. (valfritt)"
                  value={newsletter.ps}
                  onChange={(e) => setNewsletter({ ...newsletter, ps: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-sm"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-sm"
                />
                <textarea
                  placeholder="Meddelande (HTML stöds)"
                  value={announcement.message}
                  onChange={(e) => setAnnouncement({ ...announcement, message: e.target.value })}
                  rows={6}
                  className="w-full px-3 py-2 border border-gray-300 rounded-sm"
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="CTA Text (valfritt)"
                    value={announcement.cta.text}
                    onChange={(e) => setAnnouncement({ ...announcement, cta: { ...announcement.cta, text: e.target.value } })}
                    className="px-3 py-2 border border-gray-300 rounded-sm"
                  />
                  <input
                    type="text"
                    placeholder="CTA URL (valfritt)"
                    value={announcement.cta.url}
                    onChange={(e) => setAnnouncement({ ...announcement, cta: { ...announcement.cta, url: e.target.value } })}
                    className="px-3 py-2 border border-gray-300 rounded-sm"
                  />
                </div>
              </div>
            )}

            <div className="flex gap-3 mt-6">
              <button
                onClick={saveDraft}
                disabled={saving}
                className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-medium rounded-sm transition-colors"
              >
                <Save size={18} />
                {saving ? 'Sparar...' : editingDraftId ? 'Uppdatera' : 'Spara'}
              </button>
              
              <button
                onClick={generatePreview}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-sm transition-colors"
              >
                <Mail size={18} />
                Förhandsgranska
              </button>
              
              <button
                onClick={sendNewsletter}
                disabled={!preview || sending}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-medium rounded-sm transition-colors"
              >
                <Send size={18} />
                {sending ? 'Skickar...' : 'Skicka'}
              </button>
            </div>
          </div>

          {/* Drafts */}
          {drafts.length > 0 && (
            <div className="bg-white rounded-sm shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Utkast</h2>
              <div className="space-y-3">
                {drafts.map(draft => (
                  <div key={draft.id} className="flex items-center justify-between p-3 bg-amber-50 rounded-sm hover:bg-amber-100 transition-colors border border-amber-200">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900 text-sm">{draft.subject}</p>
                      <p className="text-xs text-gray-600 mt-1">
                        Sparat {new Date(draft.created_at).toLocaleDateString('sv-SE', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </p>
                      {draft.template_type && (
                        <span className="inline-block mt-1 px-2 py-0.5 bg-amber-200 text-amber-800 text-xs rounded">
                          {draft.template_type}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => reuseNewsletter(draft)}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        title="Redigera utkast"
                      >
                        <Copy size={16} />
                      </button>
                      <button
                        onClick={() => deleteNewsletter(draft.id)}
                        className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                        title="Ta bort utkast"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* History */}
          <div className="bg-white rounded-sm shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Historik</h2>
            <div className="space-y-3">
              {history.map(send => (
                <div key={send.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-sm hover:bg-gray-100 transition-colors">
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 text-sm">{send.subject}</p>
                    <p className="text-xs text-gray-600 mt-1">
                      {send.recipient_count} mottagare • {new Date(send.sent_at).toLocaleDateString('sv-SE', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                    {send.template_type && (
                      <span className="inline-block mt-1 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded">
                        {send.template_type}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1">
                      <CheckCircle size={14} className="text-green-600" />
                      <span className="text-sm text-gray-600">{send.success_count}</span>
                    </div>
                    {send.template_data && (
                      <button
                        onClick={() => reuseNewsletter(send)}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        title="Återanvänd denna mall"
                      >
                        <Copy size={16} />
                      </button>
                    )}
                    <button
                      onClick={() => deleteNewsletter(send.id)}
                      className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                      title="Ta bort"
                    >
                      <Trash2 size={16} />
                    </button>
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
          <div className="bg-white rounded-sm shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Förhandsgranskning</h2>
            {preview ? (
              <div className="border border-gray-200 rounded-sm overflow-hidden">
                <iframe
                  srcDoc={preview}
                  className="w-full h-[600px]"
                  title="Email Preview"
                  sandbox="allow-same-origin"
                />
              </div>
            ) : (
              <div className="flex items-center justify-center h-64 bg-gray-50 rounded-sm">
                <p className="text-gray-500">Fyll i formuläret och klicka på "Förhandsgranska"</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-8 right-8 z-50 animate-slide-up">
          <div className={`flex items-center gap-3 px-6 py-4 rounded-sm shadow-lg ${
            toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'
          } text-white min-w-[320px]`}>
            {toast.type === 'success' ? (
              <CheckCircle size={24} />
            ) : (
              <AlertCircle size={24} />
            )}
            <span className="flex-1 font-medium">{toast.message}</span>
            <button
              onClick={() => setToast(null)}
              className="hover:bg-white/20 rounded p-1 transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>
      )}

      {/* Confirm Dialog */}
      {confirmDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-sm shadow-xl max-w-md w-full mx-4 overflow-hidden">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Bekräfta åtgärd</h3>
              <p className="text-gray-600">{confirmDialog.message}</p>
            </div>
            <div className="flex gap-3 px-6 pb-6">
              <button
                onClick={() => setConfirmDialog(null)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-sm text-gray-700 hover:bg-gray-50 font-medium transition-colors"
              >
                Avbryt
              </button>
              <button
                onClick={() => {
                  confirmDialog.onConfirm();
                  setConfirmDialog(null);
                }}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-sm font-medium transition-colors"
              >
                Bekräfta
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
