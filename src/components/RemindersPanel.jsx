/**
 * RemindersPanel Component
 * Manages email reminders for activities
 */

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Bell, Clock, Users, User, Plus, Trash2, AlertCircle } from 'lucide-react';
import { useTeamMembers } from '../hooks/useTeamMembers';
import { useAuth } from '../hooks/useAuth';
import {
  getItemReminders,
  createReminder,
  deleteReminder,
  updateItemStatus
} from '../services/reminderService';
import { showConfirmDialog, showToast } from '../utils/dialogs';
import WheelLoader from './WheelLoader';

const REMINDER_TYPES = [
  { value: 'before_start', label: 'Före start', icon: '📅' },
  { value: 'after_start', label: 'Efter start', icon: '🚀' },
  { value: 'after_completion', label: 'Efter slutdatum', icon: '✅' }
];

const DAYS_OPTIONS = [1, 2, 3, 5, 7, 14, 30];

const STATUS_OPTIONS = [
  { value: 'planned', label: 'Planerad', color: 'bg-gray-100 text-gray-700' },
  { value: 'not_started', label: 'Ej påbörjad', color: 'bg-yellow-100 text-yellow-700' },
  { value: 'started', label: 'Påbörjad', color: 'bg-blue-100 text-blue-700' },
  { value: 'in_progress', label: 'Pågående', color: 'bg-indigo-100 text-indigo-700' },
  { value: 'done', label: 'Klar', color: 'bg-green-100 text-green-700' }
];

export default function RemindersPanel({ item, wheel }) {
  const { t } = useTranslation('editor');
  const { user } = useAuth();
  const { teamMembers } = useTeamMembers(wheel, user);
  
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
  
  // Item status
  const [itemStatus, setItemStatus] = useState(item?.status || 'planned');

  // Load reminders
  useEffect(() => {
    loadReminders();
  }, [item?.id]);

  const loadReminders = async () => {
    if (!item?.id) return;
    
    setLoading(true);
    const { data, error } = await getItemReminders(item.id);
    
    if (error) {
      showToast('Kunde inte ladda påminnelser', 'error');
    } else {
      setReminders(data || []);
    }
    setLoading(false);
  };

  const handleCreateReminder = async () => {
    if (recipientType === 'user' && !recipientUserId) {
      showToast('Välj en mottagare', 'error');
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

      showToast('Påminnelse skapad!', 'success');
      setShowForm(false);
      resetForm();
      loadReminders();
    } catch (error) {
      console.error('Error creating reminder:', error);
      showToast('Kunde inte skapa påminnelse', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteReminder = async (reminderId) => {
    const confirmed = await showConfirmDialog(
      'Ta bort påminnelse?',
      'Vill du verkligen ta bort denna påminnelse?'
    );

    if (!confirmed) return;

    const { error } = await deleteReminder(reminderId);
    
    if (error) {
      showToast('Kunde inte ta bort påminnelse', 'error');
    } else {
      showToast('Påminnelse borttagen', 'success');
      loadReminders();
    }
  };

  const handleStatusChange = async (newStatus) => {
    const { data, error } = await updateItemStatus(item.id, newStatus);
    
    if (error) {
      showToast('Kunde inte uppdatera status', 'error');
    } else {
      setItemStatus(newStatus);
      showToast('Status uppdaterad', 'success');
      // Notify parent if needed
      if (window.dispatchEvent) {
        window.dispatchEvent(new CustomEvent('itemUpdated', { detail: { itemId: item.id } }));
      }
    }
  };

  const resetForm = () => {
    setReminderType('before_start');
    setDaysOffset(3);
    setRecipientType('team');
    setRecipientUserId('');
    setCustomMessage('');
    setAppliesToAllOccurrences(false);
  };

  const formatReminderDescription = (reminder) => {
    const typeLabel = REMINDER_TYPES.find(t => t.value === reminder.reminder_type)?.label || '';
    const recipient = reminder.recipient_type === 'team' 
      ? 'Hela teamet' 
      : reminder.recipient_profile?.full_name || reminder.recipient_profile?.email || 'Användare';
    
    return `${typeLabel}, ${reminder.days_offset} dag${reminder.days_offset !== 1 ? 'ar' : ''} → ${recipient}`;
  };

  const currentStatusOption = STATUS_OPTIONS.find(s => s.value === itemStatus);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <WheelLoader size="sm" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Activity Status */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Status
        </label>
        <div className="flex gap-2 flex-wrap">
          {STATUS_OPTIONS.map(status => (
            <button
              key={status.value}
              onClick={() => handleStatusChange(status.value)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                itemStatus === status.value
                  ? status.color + ' ring-2 ring-offset-1 ring-gray-400'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {status.label}
            </button>
          ))}
        </div>
      </div>

      {/* Existing Reminders */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-gray-700">
            Aktiva påminnelser ({reminders.filter(r => r.status === 'pending').length})
          </label>
          <button
            onClick={() => setShowForm(!showForm)}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
          >
            <Plus size={16} />
            Lägg till
          </button>
        </div>

        {reminders.length === 0 ? (
          <div className="text-center py-6 bg-gray-50 rounded-sm border border-gray-200">
            <Bell size={32} className="mx-auto text-gray-300 mb-2" />
            <p className="text-sm text-gray-500">Inga påminnelser ännu</p>
          </div>
        ) : (
          <div className="space-y-2">
            {reminders.filter(r => r.status === 'pending').map(reminder => (
              <div
                key={reminder.id}
                className="flex items-start justify-between p-3 bg-gray-50 rounded-sm border border-gray-200"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Bell size={14} className="text-blue-600" />
                    <span className="text-sm font-medium text-gray-900">
                      {formatReminderDescription(reminder)}
                    </span>
                  </div>
                  {reminder.custom_message && (
                    <p className="text-xs text-gray-600 ml-5 mt-1">
                      "{reminder.custom_message}"
                    </p>
                  )}
                  <p className="text-xs text-gray-500 ml-5 mt-1">
                    Skickas: {new Date(reminder.scheduled_date).toLocaleDateString('sv-SE')}
                  </p>
                </div>
                <button
                  onClick={() => handleDeleteReminder(reminder.id)}
                  className="text-red-600 hover:text-red-700 p-1"
                  title="Ta bort påminnelse"
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
            Ny påminnelse
          </h4>

          {/* Reminder Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Typ
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
                  {type.icon} {type.label}
                </button>
              ))}
            </div>
          </div>

          {/* Days Offset */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Antal dagar
            </label>
            <select
              value={daysOffset}
              onChange={(e) => setDaysOffset(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {DAYS_OPTIONS.map(days => (
                <option key={days} value={days}>
                  {days} dag{days !== 1 ? 'ar' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Recipient */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Skicka till
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
                  Hela teamet
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
                  Specifik person
                </button>
              </div>

              {recipientType === 'user' && (
                <select
                  value={recipientUserId}
                  onChange={(e) => setRecipientUserId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Välj person...</option>
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
              Egen text (valfritt)
            </label>
            <textarea
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              placeholder="Lägg till ett meddelande som ska visas i påminnelsen..."
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
              Gäller för alla förekomster av denna aktivitet (om återkommande)
            </label>
          </div>

          {/* Info Box */}
          <div className="flex items-start gap-2 p-2 bg-blue-100 rounded-sm">
            <AlertCircle size={16} className="text-blue-600 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-blue-800">
              Påminnelser skickas automatiskt via e-post till valda mottagare. 
              Du kan hantera påminnelser här när som helst.
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={handleCreateReminder}
              disabled={submitting || (recipientType === 'user' && !recipientUserId)}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-sm font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              {submitting ? 'Skapar...' : 'Skapa påminnelse'}
            </button>
            <button
              onClick={() => {
                setShowForm(false);
                resetForm();
              }}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-sm font-medium hover:bg-gray-200"
            >
              Avbryt
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
