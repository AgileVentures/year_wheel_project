import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { 
  newsletterTemplate, 
  featureAnnouncementTemplate, 
  tipsTemplate, 
  simpleAnnouncementTemplate 
} from '../../utils/emailTemplates';
import { Send, Users, Mail, Clock, CheckCircle, AlertCircle, Copy, Trash2, Save, X, Eye, ArrowLeft } from 'lucide-react';
import NewsletterDetail from '../../components/NewsletterDetail';
import { useTranslation } from 'react-i18next';

export default function NewsletterManager() {
  const { t } = useTranslation('newsletter');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [saving, setSaving] = useState(false);
  const [history, setHistory] = useState([]);
  const [drafts, setDrafts] = useState([]);
  const [preview, setPreview] = useState(null);
  const [editingDraftId, setEditingDraftId] = useState(null);
  const [toast, setToast] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState(null);
  const [selectedNewsletter, setSelectedNewsletter] = useState(null);
  
  // Form state
  const [recipientType, setRecipientType] = useState('all');
  const [subject, setSubject] = useState('');
  const [templateType, setTemplateType] = useState('newsletter');
  const [customEmails, setCustomEmails] = useState('');
  const [tagline, setTagline] = useState('Visualisera och planera ditt år!');
  
  // Template fields
  const [newsletter, setNewsletter] = useState({
    heading: '',
    intro: '',
    sections: [{ title: '', content: '', showLink: false, link: { text: '', url: '' } }],
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
        html = newsletterTemplate({ ...newsletter, tagline });
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
      showToast(t('messages.subjectRequired'), 'error');
      return;
    }
    
    if (!preview) {
      showToast(t('messages.previewRequired'), 'error');
      return;
    }

    showConfirm(t('messages.sendConfirm', { type: recipientType }), async () => {
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
      console.log('Newsletter send result:', result);

      if (response.ok || response.status === 207) {
        // Success or partial success
        if (result.errorCount > 0) {
          // Partial success
          showToast(
            t('messages.sendPartial', { success: result.successCount, failed: result.errorCount }),
            'warning'
          );
          console.error('Failed batches:', result.errors);
        } else {
          // Full success
          showToast(t('messages.sendSuccess', { count: result.successCount }), 'success');
        }
        
        // If we were editing a draft, delete it since we sent it
        if (editingDraftId) {
          await supabase
            .from('newsletter_sends')
            .delete()
            .eq('id', editingDraftId);
          setEditingDraftId(null);
        }
        
        loadHistory();
        loadDrafts();
        // Reset form
        setSubject('');
        setPreview(null);
      } else {
        // Complete failure
        const errorMsg = result.message || result.error || 'Okänt fel';
        showToast(t('messages.sendError', { error: errorMsg }), 'error');
        
        if (result.errors && result.errors.length > 0) {
          console.error('Detailed errors:', result.errors);
          // Show first error in toast
          const firstError = result.errors[0];
          if (firstError.error.includes('domain') || firstError.error.includes('verified')) {
            showToast(t('messages.domainNotVerified'), 'error');
          } else if (firstError.error.includes('API key')) {
            showToast(t('messages.invalidApiKey'), 'error');
          }
        }
      }
    } catch (error) {
      console.error('Send error:', error);
      showToast(t('messages.sendGeneralError'), 'error');
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
      showToast(t('messages.noTemplateData'), 'error');
    }
  };

  const deleteNewsletter = async (id) => {
    showConfirm(t('messages.deleteConfirm'), async () => {
      try {
        const { error } = await supabase
          .from('newsletter_sends')
          .delete()
          .eq('id', id);

        if (error) throw error;

        loadHistory();
        loadDrafts();
        showToast(t('messages.deleted'), 'success');
      } catch (error) {
        console.error('Delete error:', error);
        showToast(t('messages.deleteError'), 'error');
      }
    });
  };

  const saveDraft = async () => {
    if (!subject) {
      showToast(t('messages.subjectRequired'), 'error');
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
        showToast(t('messages.draftUpdated'), 'success');
      } else {
        // Create new draft
        const { error } = await supabase
          .from('newsletter_sends')
          .insert([draftData]);

        if (error) throw error;
        showToast(t('messages.draftSaved'), 'success');
      }

      loadDrafts();
    } catch (error) {
      console.error('Save draft error:', error);
      showToast(t('messages.saveError'), 'error');
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
      {/* Header with back navigation */}
      <div className="mb-8">
        <Link
          to="/admin"
          className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-4 font-medium"
        >
          <ArrowLeft size={20} />
          {t('admin:backToDashboard')}
        </Link>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">{t('title')}</h1>
        <p className="text-gray-600">{t('subtitle', 'Skapa och skicka newsletters till dina användare')}</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Editor */}
        <div className="space-y-6">
          <div className="bg-white rounded-sm shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">{t('newNewsletter')}</h2>
            
            {/* Recipients */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('recipients')}
              </label>
              <select
                value={recipientType}
                onChange={(e) => setRecipientType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-sm focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">{t('recipientTypes.all')}</option>
                <option value="premium">{t('recipientTypes.premium')}</option>
                <option value="free">{t('recipientTypes.free')}</option>
                <option value="admins">{t('recipientTypes.admins')}</option>
                <option value="custom">{t('recipientTypes.custom')}</option>
              </select>
            </div>

            {recipientType === 'custom' && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('customEmailsLabel')}
                </label>
                <textarea
                  value={customEmails}
                  onChange={(e) => setCustomEmails(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-sm focus:ring-2 focus:ring-blue-500"
                  placeholder={t('customEmailsPlaceholder')}
                />
              </div>
            )}

            {/* Subject */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('subjectRequired')}
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-sm focus:ring-2 focus:ring-blue-500"
                placeholder={t('subjectPlaceholder')}
              />
            </div>

            {/* Template Type */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('template')}
              </label>
              <select
                value={templateType}
                onChange={(e) => setTemplateType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-sm focus:ring-2 focus:ring-blue-500"
              >
                <option value="newsletter">{t('templates.newsletter')}</option>
                <option value="feature">{t('templates.feature')}</option>
                <option value="tips">{t('templates.tips')}</option>
                <option value="announcement">{t('templates.announcement')}</option>
              </select>
            </div>

            {/* Dynamic Template Fields */}
            {templateType === 'newsletter' && (
              <div className="space-y-4">
                <input
                  type="text"
                  placeholder={t('taglinePlaceholder')}
                  value={tagline}
                  onChange={(e) => setTagline(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-sm"
                />
                <input
                  type="text"
                  placeholder={t('headingPlaceholder')}
                  value={newsletter.heading}
                  onChange={(e) => setNewsletter({ ...newsletter, heading: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-sm"
                />
                <textarea
                  placeholder={t('introPlaceholder')}
                  value={newsletter.intro}
                  onChange={(e) => setNewsletter({ ...newsletter, intro: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-sm"
                />
                
                {newsletter.sections.map((section, idx) => (
                  <div key={idx} className="p-4 border border-gray-200 rounded-sm space-y-2">
                    <input
                      type="text"
                      placeholder={t('sectionTitle')}
                      value={section.title}
                      onChange={(e) => {
                        const newSections = [...newsletter.sections];
                        newSections[idx].title = e.target.value;
                        setNewsletter({ ...newsletter, sections: newSections });
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-sm"
                    />
                    <textarea
                      placeholder={t('sectionContent')}
                      value={section.content}
                      onChange={(e) => {
                        const newSections = [...newsletter.sections];
                        newSections[idx].content = e.target.value;
                        setNewsletter({ ...newsletter, sections: newSections });
                      }}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-sm"
                    />
                    <div className="flex items-center space-x-2">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={section.showLink || false}
                          onChange={(e) => {
                            const newSections = [...newsletter.sections];
                            newSections[idx].showLink = e.target.checked;
                            setNewsletter({ ...newsletter, sections: newSections });
                          }}
                          className="mr-2"
                        />
                        <span className="text-sm text-gray-700">{t('showLink')}</span>
                      </label>
                    </div>
                    {section.showLink && (
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        <input
                          type="text"
                          placeholder={t('linkTextPlaceholder')}
                          value={section.link?.text || ''}
                          onChange={(e) => {
                            const newSections = [...newsletter.sections];
                            newSections[idx].link = { ...newSections[idx].link, text: e.target.value };
                            setNewsletter({ ...newsletter, sections: newSections });
                          }}
                          className="px-3 py-2 border border-gray-300 rounded-sm text-sm"
                        />
                        <input
                          type="text"
                          placeholder={t('linkUrl')}
                          value={section.link?.url || ''}
                          onChange={(e) => {
                            const newSections = [...newsletter.sections];
                            newSections[idx].link = { ...newSections[idx].link, url: e.target.value };
                            setNewsletter({ ...newsletter, sections: newSections });
                          }}
                          className="px-3 py-2 border border-gray-300 rounded-sm text-sm"
                        />
                      </div>
                    )}
                  </div>
                ))}
                
                <button
                  onClick={addSection}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  + {t('addSection')}
                </button>
                
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder={t('ctaText')}
                    value={newsletter.cta.text}
                    onChange={(e) => setNewsletter({ ...newsletter, cta: { ...newsletter.cta, text: e.target.value } })}
                    className="px-3 py-2 border border-gray-300 rounded-sm"
                  />
                  <input
                    type="text"
                    placeholder={t('ctaUrl')}
                    value={newsletter.cta.url}
                    onChange={(e) => setNewsletter({ ...newsletter, cta: { ...newsletter.cta, url: e.target.value } })}
                    className="px-3 py-2 border border-gray-300 rounded-sm"
                  />
                </div>
                
                <input
                  type="text"
                  placeholder={t('psOptional')}
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
                {saving ? t('saving') : editingDraftId ? t('update') : t('saveDraft')}
              </button>
              
              <button
                onClick={generatePreview}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-sm transition-colors"
              >
                <Mail size={18} />
                {t('preview')}
              </button>
              
              <button
                onClick={sendNewsletter}
                disabled={!preview || sending}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-medium rounded-sm transition-colors"
              >
                <Send size={18} />
                {sending ? t('sending') : t('send')}
              </button>
            </div>
          </div>

          {/* Drafts */}
          {drafts.length > 0 && (
            <div className="bg-white rounded-sm shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">{t('drafts')}</h2>
              <div className="space-y-3">
                {drafts.map(draft => (
                  <div key={draft.id} className="flex items-center justify-between p-3 bg-amber-50 rounded-sm hover:bg-amber-100 transition-colors border border-amber-200">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900 text-sm">{draft.subject}</p>
                      <p className="text-xs text-gray-600 mt-1">
                        {t('saved')} {new Date(draft.created_at).toLocaleDateString('sv-SE', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
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
                        title={t('editDraft')}
                      >
                        <Copy size={16} />
                      </button>
                      <button
                        onClick={() => deleteNewsletter(draft.id)}
                        className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                        title={t('delete')}
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
            <h2 className="text-xl font-semibold text-gray-900 mb-4">{t('history')}</h2>
            <div className="space-y-3">
              {history.map(send => (
                <div key={send.id} className="flex items-start justify-between p-4 bg-gray-50 rounded-sm hover:bg-gray-100 transition-colors">
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 text-sm">{send.subject}</p>
                    <p className="text-xs text-gray-600 mt-1">
                      {new Date(send.sent_at).toLocaleDateString('sv-SE', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                    {send.template_type && (
                      <span className="inline-block mt-1 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded">
                        {send.template_type}
                      </span>
                    )}
                    
                    {/* Email Stats */}
                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                      <div className="flex items-center gap-1.5">
                        <Send size={12} className="text-gray-500" />
                        <span className="text-gray-600">{t('stats.sent')}:</span>
                        <span className="font-semibold text-gray-900">{send.recipient_count}</span>
                      </div>
                      
                      {(send.delivered_count > 0 || send.opened_count > 0 || send.clicked_count > 0 || send.failed_count > 0) && (
                        <>
                          <div className="flex items-center gap-1.5">
                            <CheckCircle size={12} className="text-green-600" />
                            <span className="text-gray-600">{t('stats.delivered')}:</span>
                            <span className="font-semibold text-green-700">{send.delivered_count || 0}</span>
                          </div>
                          
                          <div className="flex items-center gap-1.5">
                            <Mail size={12} className="text-blue-600" />
                            <span className="text-gray-600">{t('stats.opened')}:</span>
                            <span className="font-semibold text-blue-700">
                              {send.opened_count || 0}
                              {send.delivered_count > 0 && send.opened_count > 0 && (
                                <span className="text-gray-500 ml-1">
                                  ({Math.round((send.opened_count / send.delivered_count) * 100)}%)
                                </span>
                              )}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-1.5">
                            <svg className="w-3 h-3 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                            </svg>
                            <span className="text-gray-600">{t('stats.clicked')}:</span>
                            <span className="font-semibold text-purple-700">{send.clicked_count || 0}</span>
                          </div>
                          
                          {send.failed_count > 0 && (
                            <div className="flex items-center gap-1.5">
                              <AlertCircle size={12} className="text-red-600" />
                              <span className="text-gray-600">{t('stats.failed')}:</span>
                              <span className="font-semibold text-red-700">{send.failed_count}</span>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 ml-4">
                    <button
                      onClick={() => setSelectedNewsletter(send)}
                      className="p-1.5 text-purple-600 hover:bg-purple-50 rounded transition-colors"
                      title={t('viewDetails')}
                    >
                      <Eye size={16} />
                    </button>
                    {send.template_data && (
                      <button
                        onClick={() => reuseNewsletter(send)}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        title={t('reuse')}
                      >
                        <Copy size={16} />
                      </button>
                    )}
                    <button
                      onClick={() => deleteNewsletter(send.id)}
                      className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                      title={t('delete')}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
              
              {history.length === 0 && (
                <p className="text-gray-500 text-sm text-center py-8">{t('noHistory')}</p>
              )}
            </div>
          </div>
        </div>

        {/* Preview */}
        <div className="lg:sticky lg:top-8 h-fit">
          <div className="bg-white rounded-sm shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">{t('previewTitle')}</h2>
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
                <p className="text-gray-500">{t('previewEmpty')}</p>
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

      {/* Newsletter Detail Modal */}
      {selectedNewsletter && (
        <NewsletterDetail
          send={selectedNewsletter}
          onClose={() => setSelectedNewsletter(null)}
        />
      )}
    </div>
  );
}
