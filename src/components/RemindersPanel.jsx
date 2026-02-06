/**
 * RemindersPanel Component
 * Manages email reminders for activities
 */

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Bell, Clock, Users, User, Plus, Trash2, AlertCircle, Crown } from 'lucide-react';
import { useTeamMembers } from '../hooks/useTeamMembers';
import { useAuth } from '../hooks/useAuth';
import { useSubscription } from '../hooks/useSubscription';
import {
  getItemReminders,
  createReminder,
  deleteReminder
} from '../services/reminderService';
import { showConfirmDialog, showToast } from '../utils/dialogs';
import WheelLoader from './WheelLoader';

export default function RemindersPanel({ item, wheel }) {
  const { t } = useTranslation('editor');
  const { user } = useAuth();
  const { teamMembers } = useTeamMembers(wheel, user);
  const { isPremium, isAdmin } = useSubscription();
  
  // Constants with translations
  const REMINDER_TYPES = [
    { value: 'before_start', label: t('reminders.types.before_start') },
    { value: 'after_start', label: t('reminders.types.after_start') },
    { value: 'after_completion', label: t('reminders.types.after_completion') }
  ];

  const DAYS_OPTIONS = [1, 2, 3, 5, 7, 14, 30];
  
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  
  // Form state
  const [reminderType, setReminderType] = useState('before_start');
  const [daysOffset, setDaysOffset] = useState(3);
  const [recipientType, setRecipientType] = useState('team');
  const [recipientUserId, setRecipientUserId] = useState('');
  const [customMessage, setCustomMessage] = useState('');
  const [appliesToAllOccurrences, setAppliesToAllOccurrences] = useState(false);
  const [remindNow, setRemindNow] = useState(false);

  // Load reminders
  useEffect(() => {
    loadReminders();
  }, [item?.id]);

  const loadReminders = async () => {
    if (!item?.id) return;
    
    setLoading(true);
    const { data, error } = await getItemReminders(item.id);
    
    if (error) {
      showToast(t('reminders.toasts.loadError'), 'error');
    } else {
      setReminders(data || []);
    }
    setLoading(false);
  };

  const handleCreateReminder = async () => {
    if (recipientType === 'user' && !recipientUserId) {
      showToast(t('reminders.selectRecipient'), 'error');
      return;
    }

    setSubmitting(true);
    try {
      const { data, error } = await createReminder({
        itemId: item.id,
        wheelId: wheel.id,
        reminderType,
        daysOffset,
        recipientType,
        recipientUserId: recipientType === 'user' ? recipientUserId : null,
        customMessage: customMessage.trim() || null,
        appliesToAllOccurrences
      });

      if (error) throw error;

      showToast(t('reminders.toasts.createSuccess'), 'success');
      
      setShowForm(false);
      resetForm();
      
      // If "remind now" is checked, trigger the edge function immediately
      if (remindNow && data) {
        try {
          const response = await fetch(
            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/check-activity-reminders`,
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
                'Content-Type': 'application/json'
              }
            }
          );
          
          if (response.ok) {
            showToast(t('reminders.toasts.sentNow'), 'success');
          }
        } catch (sendError) {
          console.error('Error triggering immediate send:', sendError);
          showToast(t('reminders.toasts.sentNowError'), 'warning');
        }
      }
      
      // Reload reminders after edge function completes (to get updated status)
      await loadReminders();
    } catch (error) {
      console.error('Error creating reminder:', error);
      showToast(t('reminders.toasts.createError'), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteReminder = async (reminderId) => {
    const confirmed = await showConfirmDialog(
      t('reminders.delete'),
      t('reminders.deleteConfirm')
    );

    if (!confirmed) return;

    const { error } = await deleteReminder(reminderId);
    
    if (error) {
      showToast(t('reminders.toasts.deleteError'), 'error');
    } else {
      showToast(t('reminders.toasts.deleteSuccess'), 'success');
      loadReminders();
    }
  };

  const resetForm = () => {
    setReminderType('before_start');
    setDaysOffset(3);
    setRecipientType('team');
    setRecipientUserId('');
    setCustomMessage('');
    setAppliesToAllOccurrences(false);
    setRemindNow(false);
  };

  const formatReminderDescription = (reminder) => {
    const typeLabel = REMINDER_TYPES.find(t => t.value === reminder.reminder_type)?.label || '';
    const recipient = reminder.recipient_type === 'team' 
      ? t('reminders.wholeTeam')
      : reminder.recipient_profile?.full_name || reminder.recipient_profile?.email || t('reminders.specificPerson');
    
    const daysText = t('reminders.days', { count: reminder.days_offset });
    return `${typeLabel}, ${daysText} → ${recipient}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <WheelLoader size="sm" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Existing Reminders */}
      <div>
        {/* Premium Feature Gate */}
        {!isPremium && !isAdmin && (
          <div className="mb-4 p-4 bg-gradient-to-r from-yellow-50 to-orange-50 border-2 border-yellow-300 rounded-lg">
            <div className="flex items-start gap-3">
              <Crown size={24} className="text-yellow-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h4 className="text-sm font-semibold text-gray-900 mb-1">
                  {t('reminders.premiumFeature', 'Påminnelser är en Premium-funktion')}
                </h4>
                <p className="text-xs text-gray-700 mb-3">
                  {t('reminders.premiumDescription', 'Uppgradera till Premium för att skapa automatiska e-postpåminnelser för dina aktiviteter.')}
                </p>
                <a
                  href="/pricing"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-yellow-500 to-orange-500 text-white text-sm font-semibold rounded-lg hover:from-yellow-600 hover:to-orange-600 transition-all"
                >
                  <Crown size={16} />
                  {t('reminders.upgradeToPremium', 'Uppgradera till Premium')}
                </a>
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-gray-700">
            {t('reminders.activeReminders', { count: reminders.filter(r => ['pending', 'sent'].includes(r.status)).length })}
          </label>
          {(isPremium || isAdmin) && (
            <button
              onClick={() => setShowForm(!showForm)}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
            >
              <Plus size={16} />
              {t('reminders.addReminder')}
            </button>
          )}
        </div>

        {reminders.length === 0 ? (
          <div className="text-center py-6 bg-gray-50 rounded-sm border border-gray-200">
            <Bell size={32} className="mx-auto text-gray-300 mb-2" />
            <p className="text-sm text-gray-500">{t('reminders.noReminders')}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {reminders.filter(r => ['pending', 'sent'].includes(r.status)).map(reminder => (
              <div
                key={reminder.id}
                className={`flex items-start justify-between p-3 rounded-sm border ${
                  reminder.status === 'sent' 
                    ? 'bg-green-50 border-green-200' 
                    : 'bg-gray-50 border-gray-200'
                }`}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    {reminder.status === 'sent' ? (
                      <svg className="w-3.5 h-3.5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    ) : (
                      <Bell size={14} className="text-blue-600" />
                    )}
                    <span className="text-sm font-medium text-gray-900">
                      {formatReminderDescription(reminder)}
                    </span>
                    {reminder.status === 'sent' && (
                      <span className="px-2 py-0.5 text-xs font-medium text-green-700 bg-green-100 rounded-full">
                        {t('reminders.sent', 'Skickad')}
                      </span>
                    )}
                  </div>
                  {reminder.custom_message && (
                    <p className="text-xs text-gray-600 ml-5 mt-1">
                      "{reminder.custom_message}"
                    </p>
                  )}
                  <p className="text-xs text-gray-500 ml-5 mt-1">
                    {t('reminders.sentOn', { date: new Date(reminder.scheduled_date).toLocaleDateString('sv-SE') })}
                  </p>
                </div>
                <button
                  onClick={() => handleDeleteReminder(reminder.id)}
                  className="text-red-600 hover:text-red-700 p-1"
                  title={t('reminders.delete')}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Reminder Form */}
      {showForm && (
        <div className="border border-blue-200 bg-blue-50 rounded-sm p-4 space-y-3">
          <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
            <Plus size={16} />
            {t('reminders.newReminder')}
          </h4>

          {/* Reminder Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('reminders.type')}
            </label>
            <div className="grid grid-cols-3 gap-2">
              {REMINDER_TYPES.map(type => (
                <button
                  key={type.value}
                  onClick={() => setReminderType(type.value)}
                  className={`px-3 py-2 rounded-sm text-sm font-medium transition-colors ${
                    reminderType === type.value
                      ? 'bg-blue-600 text-white'
                      : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {type.label}
                </button>
              ))}
            </div>
          </div>

          {/* Days Offset */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('reminders.daysCount')}
            </label>
            <select
              value={daysOffset}
              onChange={(e) => setDaysOffset(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {DAYS_OPTIONS.map(days => (
                <option key={days} value={days}>
                  {t('reminders.days', { count: days })}
                </option>
              ))}
            </select>
          </div>

          {/* Recipient */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('reminders.sendTo')}
            </label>
            <div className="space-y-2">
              <div className="flex gap-2">
                <button
                  onClick={() => setRecipientType('team')}
                  className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-sm text-sm font-medium transition-colors ${
                    recipientType === 'team'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Users size={16} />
                  {t('reminders.wholeTeam')}
                </button>
                <button
                  onClick={() => setRecipientType('user')}
                  className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-sm text-sm font-medium transition-colors ${
                    recipientType === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <User size={16} />
                  {t('reminders.specificPerson')}
                </button>
              </div>

              {recipientType === 'user' && (
                <select
                  value={recipientUserId}
                  onChange={(e) => setRecipientUserId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">{t('reminders.selectPerson')}</option>
                  {teamMembers.map(member => (
                    <option key={member.id} value={member.id}>
                      {member.full_name || member.email}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* Custom Message */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('reminders.customMessage')}
            </label>
            <textarea
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              placeholder={t('reminders.customMessagePlaceholder')}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>

          {/* Recurring Option */}
          <div className="flex items-start gap-2">
            <input
              type="checkbox"
              id="recurring"
              checked={appliesToAllOccurrences}
              onChange={(e) => setAppliesToAllOccurrences(e.target.checked)}
              className="mt-1"
            />
            <label htmlFor="recurring" className="text-sm text-gray-700 cursor-pointer">
              {t('reminders.recurring')}
            </label>
          </div>

          {/* Remind Now Option */}
          <div className="flex items-start gap-2">
            <input
              type="checkbox"
              id="remindNow"
              checked={remindNow}
              onChange={(e) => setRemindNow(e.target.checked)}
              className="mt-1"
            />
            <label htmlFor="remindNow" className="text-sm text-gray-700 cursor-pointer">
              {t('reminders.remindNow')}
            </label>
          </div>

          {/* Info Box */}
          <div className="flex items-start gap-2 p-2 bg-blue-100 rounded-sm">
            <AlertCircle size={16} className="text-blue-600 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-blue-800">
              {t('reminders.infoText')}
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={handleCreateReminder}
              disabled={submitting || (recipientType === 'user' && !recipientUserId)}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-sm font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              {submitting ? t('reminders.creating') : t('reminders.create')}
            </button>
            <button
              onClick={() => {
                setShowForm(false);
                resetForm();
              }}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-sm font-medium hover:bg-gray-200"
            >
              {t('reminders.cancel')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
