/**
 * Ring Integration Settings Modal
 * Configure Google Calendar or Google Sheets sync for a ring
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { X, Calendar, Sheet, Loader2, AlertCircle, CheckCircle, RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  getRingIntegrationByType,
  upsertRingIntegration,
  deleteRingIntegration,
  listGoogleCalendars,
  validateGoogleSheet,
  syncRingData,
  getUserIntegrationByProvider
} from '../services/integrationService';

function RingIntegrationModal({ ring, onClose, onSyncComplete }) {
  const { t, i18n } = useTranslation(['integration']);
  
  // Validate that ring has a proper UUID before allowing integration
  const isValidUUID = (id) => {
    return id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
  };

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Integration state
  const [hasGoogleCalendar, setHasGoogleCalendar] = useState(false);
  const [hasGoogleSheets, setHasGoogleSheets] = useState(false);
  const [calendarIntegration, setCalendarIntegration] = useState(null);
  const [sheetIntegration, setSheetIntegration] = useState(null);
  
  // Configuration state
  const [integrationType, setIntegrationType] = useState(''); // 'calendar' or 'sheet'
  const [calendars, setCalendars] = useState([]);
  const [selectedCalendarId, setSelectedCalendarId] = useState('');
  const [aggregateByWeek, setAggregateByWeek] = useState(true); // New: week aggregation toggle
  const [spreadsheetId, setSpreadsheetId] = useState('');
  const [sheetName, setSheetName] = useState('Sheet1');
  const [validatedSheet, setValidatedSheet] = useState(null);
  
  // Sync state
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    if (!isValidUUID(ring.id)) {
      setError(t('integration:ringIntegrationModal.invalidUUID'));
      setLoading(false);
      return;
    }
    loadIntegrations();
  }, [ring.id, t]);

  const loadIntegrations = async () => {
    try {
      setLoading(true);
      setError('');

      // Check if user has connected Google accounts
      const calendarAuth = await getUserIntegrationByProvider('google_calendar');
      const sheetsAuth = await getUserIntegrationByProvider('google_sheets');
      
      setHasGoogleCalendar(!!calendarAuth);
      setHasGoogleSheets(!!sheetsAuth);

      // Load existing ring integrations
      const calendarInt = await getRingIntegrationByType(ring.id, 'calendar');
      const sheetInt = await getRingIntegrationByType(ring.id, 'sheet');
      
      setCalendarIntegration(calendarInt);
      setSheetIntegration(sheetInt);

      // If calendar integration exists, load its config
      if (calendarInt) {
        setIntegrationType('calendar');
        setSelectedCalendarId(calendarInt.config.calendar_id || '');
        setAggregateByWeek(calendarInt.config.aggregate_by_week !== false); // Default true
      } else if (sheetInt) {
        setIntegrationType('sheet');
        setSpreadsheetId(sheetInt.config.spreadsheet_id || '');
        setSheetName(sheetInt.config.sheet_name || 'Sheet1');
      }

    } catch (err) {
      console.error('Error loading integrations:', err);
      setError(t('integration:ringIntegrationModal.errors.loadFailed') + ': ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadCalendars = async () => {
    try {
      const cals = await listGoogleCalendars();
      setCalendars(cals);
    } catch (err) {
      setError(t('integration:ringIntegrationModal.errors.loadCalendarsFailed') + ': ' + err.message);
    }
  };

  const handleValidateSheet = async () => {
    if (!spreadsheetId) {
      setError(t('integration:ringIntegrationModal.sheets.enterSpreadsheetIdError'));
      return;
    }

    try {
      setError('');
      const result = await validateGoogleSheet(spreadsheetId);
      setValidatedSheet(result.spreadsheet);
      
      // Automatically select the first sheet if available
      if (result.spreadsheet.sheets && result.spreadsheet.sheets.length > 0) {
        const firstSheetName = result.spreadsheet.sheets[0].title;
        console.log('[RingIntegration] Auto-selecting first sheet:', firstSheetName);
        setSheetName(firstSheetName);
      }
      
      setSuccess(t('integration:ringIntegrationModal.success.validated'));
    } catch (err) {
      setError(t('integration:ringIntegrationModal.errors.validateSheetFailed') + ': ' + err.message);
      setValidatedSheet(null);
    }
  };

  const handleSaveIntegration = async () => {
    try {
      setError('');
      setSuccess('');
      setSyncing(true);

      const calendarAuth = await getUserIntegrationByProvider('google_calendar');
      const sheetsAuth = await getUserIntegrationByProvider('google_sheets');

      console.log('[RingIntegration] Auth status:', { 
        calendarAuth: !!calendarAuth, 
        sheetsAuth: !!sheetsAuth,
        integrationType 
      });

      if (integrationType === 'calendar') {
        if (!selectedCalendarId) {
          setError(t('integration:ringIntegrationModal.calendar.selectCalendarError'));
          setSyncing(false);
          return;
        }
        if (!calendarAuth) {
          setError(t('integration:ringIntegrationModal.calendar.notConnectedError'));
          setSyncing(false);
          return;
        }

        console.log('[RingIntegration] Saving calendar integration:', {
          ring_id: ring.id,
          user_integration_id: calendarAuth.id,
          calendar_id: selectedCalendarId
        });

        // Create or update calendar integration
        const integration = await upsertRingIntegration({
          ring_id: ring.id,
          user_integration_id: calendarAuth.id,
          integration_type: 'calendar',
          config: {
            calendar_id: selectedCalendarId,
            aggregate_by_week: aggregateByWeek
          },
          sync_enabled: true
        });

        console.log('[RingIntegration] Calendar integration saved:', integration);
        setCalendarIntegration(integration);
        setSuccess(t('integration:ringIntegrationModal.success.calendarSaved'));

        // Auto-sync after save
        await handleSync(integration.id);

      } else if (integrationType === 'sheet') {
        if (!spreadsheetId || !sheetName) {
          setError(t('integration:ringIntegrationModal.sheets.enterDetailsError'));
          setSyncing(false);
          return;
        }
        if (!sheetsAuth) {
          setError(t('integration:ringIntegrationModal.sheets.notConnectedError'));
          setSyncing(false);
          return;
        }

        console.log('[RingIntegration] Saving sheet integration:', {
          ring_id: ring.id,
          user_integration_id: sheetsAuth.id,
          spreadsheet_id: spreadsheetId,
          sheet_name: sheetName
        });

        // Create or update sheet integration
        const integrationData = {
          ring_id: ring.id,
          user_integration_id: sheetsAuth.id,
          integration_type: 'sheet',
          config: {
            spreadsheet_id: spreadsheetId,
            sheet_name: sheetName,
            range: 'A:D' // Default range
          },
          sync_enabled: true
        };

        console.log('[RingIntegration] Saving sheet integration with data:', integrationData);
        
        const integration = await upsertRingIntegration(integrationData);

        if (!integration) {
          throw new Error(t('integration:ringIntegrationModal.errors.upsertNull'));
        }

        console.log('[RingIntegration] Sheet integration saved successfully:', integration);
        setSheetIntegration(integration);
        setSuccess(t('integration:ringIntegrationModal.success.sheetSaved'));

        // Auto-sync after save
        console.log('[RingIntegration] Starting auto-sync for integration:', integration.id);
        await handleSync(integration.id);
      }

    } catch (err) {
      setError(t('integration:ringIntegrationModal.errors.saveFailed') + ': ' + err.message);
      console.error('[RingIntegration] Save error:', err);
      console.error('[RingIntegration] Error details:', {
        message: err.message,
        code: err.code,
        details: err.details,
        hint: err.hint
      });
    } finally {
      setSyncing(false);
    }
  };

  const handleSync = async (integrationId) => {
    try {
      setSyncing(true);
      setError('');
      
      console.log('[RingIntegration] Starting sync for integration:', integrationId);
      const result = await syncRingData(integrationId);
      console.log('[RingIntegration] Sync result:', result);
      
      setSuccess(t('integration:ringIntegrationModal.sync.syncComplete', { count: result.itemCount }));
      
      if (onSyncComplete) {
        onSyncComplete();
      }
    } catch (err) {
      console.error('[RingIntegration] Sync error:', err);
      setError(t('integration:ringIntegrationModal.errors.syncFailed') + ': ' + err.message);
    } finally {
      setSyncing(false);
    }
  };

  const handleRemoveIntegration = async (type) => {
    if (!confirm(t('integration:ringIntegrationModal.actions.removeConfirm'))) {
      return;
    }

    try {
      const integration = type === 'calendar' ? calendarIntegration : sheetIntegration;
      if (integration) {
        await deleteRingIntegration(integration.id);
        
        if (type === 'calendar') {
          setCalendarIntegration(null);
          setSelectedCalendarId('');
        } else {
          setSheetIntegration(null);
          setSpreadsheetId('');
          setValidatedSheet(null);
        }
        
        setSuccess(t('integration:ringIntegrationModal.actions.removed'));
        setIntegrationType('');
      }
    } catch (err) {
      setError(t('integration:ringIntegrationModal.errors.removeFailed') + ': ' + err.message);
    }
  };

  const handleTypeChange = async (type) => {
    setIntegrationType(type);
    setError('');
    setSuccess('');

    if (type === 'calendar' && calendars.length === 0) {
      await loadCalendars();
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-sm shadow-xl p-6 max-w-md w-full mx-4">
          <div className="flex items-center gap-3 justify-center">
            <Loader2 size={20} className="animate-spin text-blue-600" />
            <span className="text-gray-700">{t('integration:ringIntegrationModal.loading')}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-sm shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              {t('integration:ringIntegrationModal.title', { ringName: ring.name })}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {t('integration:ringIntegrationModal.description')}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-sm transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Error/Success Messages */}
          {error && (
            <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-sm text-red-700 text-sm">
              <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="flex items-start gap-2 p-3 bg-green-50 border border-green-200 rounded-sm text-green-700 text-sm">
              <CheckCircle size={18} className="flex-shrink-0 mt-0.5" />
              <span>{success}</span>
            </div>
          )}

          {/* Check if user has connected accounts */}
          {!hasGoogleCalendar && !hasGoogleSheets && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-sm">
              <p className="text-sm text-blue-800">
                {t('integration:ringIntegrationModal.connectAccountPrompt')}{' '}
                <Link to="/profile" className="underline font-medium hover:text-blue-900" onClick={onClose}>
                  {t('integration:ringIntegrationModal.profileIntegrations')}
                </Link>
              </p>
            </div>
          )}

          {/* Integration Type Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('integration:ringIntegrationModal.selectDataSource')}
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => handleTypeChange('calendar')}
                disabled={!hasGoogleCalendar}
                className={`p-4 border-2 rounded-sm transition-all ${
                  integrationType === 'calendar'
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                } ${!hasGoogleCalendar ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <Calendar size={24} className={integrationType === 'calendar' ? 'text-blue-600' : 'text-gray-400'} />
                <div className="mt-2 text-sm font-medium text-gray-900">{t('integration:ringIntegrationModal.googleCalendar')}</div>
                {!hasGoogleCalendar && (
                  <div className="mt-1 text-xs text-red-600">{t('integration:ringIntegrationModal.notConnected')}</div>
                )}
              </button>

              <button
                onClick={() => handleTypeChange('sheet')}
                disabled={!hasGoogleSheets}
                className={`p-4 border-2 rounded-sm transition-all ${
                  integrationType === 'sheet'
                    ? 'border-green-600 bg-green-50'
                    : 'border-gray-200 hover:border-gray-300'
                } ${!hasGoogleSheets ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <Sheet size={24} className={integrationType === 'sheet' ? 'text-green-600' : 'text-gray-400'} />
                <div className="mt-2 text-sm font-medium text-gray-900">{t('integration:ringIntegrationModal.googleSheets')}</div>
                {!hasGoogleSheets && (
                  <div className="mt-1 text-xs text-red-600">{t('integration:ringIntegrationModal.notConnected')}</div>
                )}
              </button>
            </div>
          </div>

          {/* Calendar Configuration */}
          {integrationType === 'calendar' && hasGoogleCalendar && (
            <div className="space-y-4">
              {/* Show current integration info */}
              {calendarIntegration && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar size={18} className="text-blue-600" />
                    <span className="font-medium text-blue-900">{t('integration:ringIntegrationModal.calendar.existingIntegration')}</span>
                  </div>
                  <div className="text-sm text-blue-800">
                    <div>{t('integration:ringIntegrationModal.calendar.calendarId')}: <code className="bg-blue-100 px-1 rounded">{calendarIntegration.config.calendar_id}</code></div>
                    {calendarIntegration.last_synced_at && (
                      <div className="mt-1 text-xs text-blue-700">
                        {t('integration:ringIntegrationModal.calendar.lastSynced')}: {new Date(calendarIntegration.last_synced_at).toLocaleString(i18n.language === 'en' ? 'en-GB' : 'sv-SE')}
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {calendarIntegration ? t('integration:ringIntegrationModal.calendar.changeCalendar') : t('integration:ringIntegrationModal.calendar.selectCalendar')}
                </label>
                <select
                  value={selectedCalendarId}
                  onChange={(e) => setSelectedCalendarId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">{t('integration:ringIntegrationModal.calendar.selectPlaceholder')}</option>
                  {calendars.map(cal => (
                    <option key={cal.id} value={cal.id}>
                      {cal.summary} {cal.primary ? t('integration:ringIntegrationModal.calendar.primaryLabel') : ''}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-gray-500">
                  {t('integration:ringIntegrationModal.calendar.importDescription')}
                </p>
              </div>

              {/* Week Aggregation Toggle */}
              <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-sm border border-gray-200">
                <input
                  type="checkbox"
                  id="aggregate-by-week"
                  checked={aggregateByWeek}
                  onChange={(e) => setAggregateByWeek(e.target.checked)}
                  className="mt-1 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <div className="flex-1">
                  <label htmlFor="aggregate-by-week" className="block text-sm font-medium text-gray-700 cursor-pointer">
                    Group events by week
                  </label>
                  <p className="text-xs text-gray-600 mt-1">
                    When enabled, all events within each week are bundled into a single item showing the total count. 
                    This prevents clutter on the year view while maintaining readability.
                  </p>
                  <p className="text-xs text-gray-500 mt-1 italic">
                    Recommended: Enabled (default)
                  </p>
                </div>
              </div>

              {calendarIntegration && (
                <div className="p-3 bg-gray-50 rounded-sm text-sm">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-gray-700">{t('integration:ringIntegrationModal.calendar.status')}:</span>
                    <span className={`px-2 py-0.5 rounded text-xs ${
                      calendarIntegration.last_sync_status === 'success'
                        ? 'bg-green-100 text-green-700'
                        : calendarIntegration.last_sync_status === 'error'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-gray-200 text-gray-700'
                    }`}>
                      {calendarIntegration.last_sync_status || t('integration:ringIntegrationModal.calendar.notSynced')}
                    </span>
                  </div>
                  {calendarIntegration.last_synced_at && (
                    <div className="text-xs text-gray-600">
                      {t('integration:ringIntegrationModal.calendar.lastSynced')}: {new Date(calendarIntegration.last_synced_at).toLocaleString(i18n.language === 'en' ? 'en-GB' : 'sv-SE')}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Sheets Configuration */}
          {integrationType === 'sheet' && hasGoogleSheets && (
            <div className="space-y-4">
              {/* Show current integration info */}
              {sheetIntegration && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <Sheet size={18} className="text-green-600" />
                    <span className="font-medium text-green-900">{t('integration:ringIntegrationModal.sheets.existingIntegration')}</span>
                  </div>
                  <div className="text-sm text-green-800">
                    <div>{t('integration:ringIntegrationModal.sheets.spreadsheetId')}: <code className="bg-green-100 px-1 rounded">{sheetIntegration.config.spreadsheet_id}</code></div>
                    <div>{t('integration:ringIntegrationModal.sheets.sheetName')}: <strong>{sheetIntegration.config.sheet_name}</strong></div>
                    {sheetIntegration.last_synced_at && (
                      <div className="mt-1 text-xs text-green-700">
                        {t('integration:ringIntegrationModal.sheets.lastSynced')}: {new Date(sheetIntegration.last_synced_at).toLocaleString(i18n.language === 'en' ? 'en-GB' : 'sv-SE')}
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {sheetIntegration ? t('integration:ringIntegrationModal.sheets.changeSpreadsheetId') : t('integration:ringIntegrationModal.sheets.spreadsheetIdLabel')}
                </label>
                <input
                  type="text"
                  value={spreadsheetId}
                  onChange={(e) => setSpreadsheetId(e.target.value)}
                  placeholder={t('integration:ringIntegrationModal.sheets.placeholder')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
                <p className="mt-1 text-xs text-gray-500">
                  {t('integration:ringIntegrationModal.sheets.urlHint')}<strong>{t('integration:ringIntegrationModal.sheets.urlHintBold')}</strong>{t('integration:ringIntegrationModal.sheets.urlHintEnd')}
                </p>
                <button
                  onClick={handleValidateSheet}
                  disabled={!spreadsheetId}
                  className="mt-2 text-sm text-blue-600 hover:text-blue-700 disabled:opacity-50"
                >
                  {t('integration:ringIntegrationModal.sheets.validateButton')}
                </button>
              </div>

              {validatedSheet && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-sm">
                  <div className="text-sm font-medium text-green-800">{validatedSheet.title}</div>
                  <div className="text-xs text-green-700 mt-1">
                    {t('integration:ringIntegrationModal.sheets.validatedTitle')}: {validatedSheet.sheets.map(s => s.title).join(', ')}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('integration:ringIntegrationModal.sheets.sheetNameLabel')}
                </label>
                {validatedSheet ? (
                  <select
                    value={sheetName}
                    onChange={(e) => setSheetName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    {validatedSheet.sheets.map(sheet => (
                      <option key={sheet.id} value={sheet.title}>
                        {sheet.title}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={sheetName}
                    onChange={(e) => setSheetName(e.target.value)}
                    placeholder={t('integration:ringIntegrationModal.sheets.sheetPlaceholder')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                )}
              </div>

              <div className="p-3 bg-blue-50 rounded-sm text-sm text-blue-800">
                <div className="font-medium mb-1">{t('integration:ringIntegrationModal.sheets.expectedFormat')}</div>
                <table className="w-full text-xs border border-blue-200 bg-white">
                  <thead>
                    <tr className="bg-blue-100">
                      <th className="border border-blue-200 px-2 py-1">{t('integration:ringIntegrationModal.sheets.columnName')}</th>
                      <th className="border border-blue-200 px-2 py-1">{t('integration:ringIntegrationModal.sheets.columnStartDate')}</th>
                      <th className="border border-blue-200 px-2 py-1">{t('integration:ringIntegrationModal.sheets.columnEndDate')}</th>
                      <th className="border border-blue-200 px-2 py-1">{t('integration:ringIntegrationModal.sheets.columnNotes')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="border border-blue-200 px-2 py-1">{t('integration:ringIntegrationModal.sheets.exampleName')}</td>
                      <td className="border border-blue-200 px-2 py-1">{t('integration:ringIntegrationModal.sheets.exampleStartDate')}</td>
                      <td className="border border-blue-200 px-2 py-1">{t('integration:ringIntegrationModal.sheets.exampleEndDate')}</td>
                      <td className="border border-blue-200 px-2 py-1">{t('integration:ringIntegrationModal.sheets.exampleNotes')}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {sheetIntegration && (
                <div className="p-3 bg-gray-50 rounded-sm text-sm">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-gray-700">{t('integration:ringIntegrationModal.sheets.status')}:</span>
                    <span className={`px-2 py-0.5 rounded text-xs ${
                      sheetIntegration.last_sync_status === 'success'
                        ? 'bg-green-100 text-green-700'
                        : sheetIntegration.last_sync_status === 'error'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-gray-200 text-gray-700'
                    }`}>
                      {sheetIntegration.last_sync_status || t('integration:ringIntegrationModal.sheets.notSynced')}
                    </span>
                  </div>
                  {sheetIntegration.last_synced_at && (
                    <div className="text-xs text-gray-600">
                      {t('integration:ringIntegrationModal.sheets.lastSynced')}: {new Date(sheetIntegration.last_synced_at).toLocaleString(i18n.language === 'en' ? 'en-GB' : 'sv-SE')}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50">
          <div>
            {(calendarIntegration || sheetIntegration) && integrationType && (
              <button
                onClick={() => handleRemoveIntegration(integrationType)}
                className="text-sm text-red-600 hover:text-red-700"
              >
                {t('integration:ringIntegrationModal.actions.removeIntegration')}
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-sm transition-colors"
            >
              {t('integration:ringIntegrationModal.actions.close')}
            </button>
            {integrationType && (
              <>
                {(calendarIntegration || sheetIntegration) && (
                  <button
                    onClick={() => handleSync((calendarIntegration || sheetIntegration).id)}
                    disabled={syncing}
                    className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-sm transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    {syncing ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        {t('integration:ringIntegrationModal.sync.syncing')}
                      </>
                    ) : (
                      <>
                        <RefreshCw size={16} />
                        {t('integration:ringIntegrationModal.sync.syncNow')}
                      </>
                    )}
                  </button>
                )}
                <button
                  onClick={handleSaveIntegration}
                  disabled={syncing}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-sm transition-colors disabled:opacity-50"
                >
                  {syncing ? t('integration:ringIntegrationModal.actions.saving') : t('integration:ringIntegrationModal.actions.save')}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default RingIntegrationModal;
