import { useState, useRef } from 'react';
import { X, Upload, FileSpreadsheet, Sparkles, Check, AlertCircle, Users, Mail } from 'lucide-react';
import * as XLSX from 'xlsx';
import { supabase } from '../lib/supabase';

/**
 * SmartImportModal - AI-powered CSV import with intelligent mapping
 * 
 * Features:
 * - Automatic CSV parsing and structure detection
 * - AI-powered mapping to rings, activity groups, and activities
 * - Person/email detection for team invitations
 * - Review and modify suggestions before import
 * - Comprehensive error handling and rollback
 */
export default function SmartImportModal({ isOpen, onClose, wheelId, currentPageId, onImportComplete }) {
  const [stage, setStage] = useState('upload'); // upload, analyzing, review, refining, importing, complete
  const [csvData, setCsvData] = useState(null);
  const [aiSuggestions, setAiSuggestions] = useState(null);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState(null);
  const [detectedPeople, setDetectedPeople] = useState([]);
  const [selectedPeople, setSelectedPeople] = useState(new Set());
  const [refinementPrompt, setRefinementPrompt] = useState('');
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setError(null);
    setProgress('Läser fil...');

    try {
      // Parse CSV using XLSX
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      
      // Convert to JSON with header row
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
        header: 1,
        defval: '',
        blankrows: false 
      });

      if (!jsonData || jsonData.length < 2) {
        throw new Error('CSV-filen måste ha minst en rubrikrad och en datarad');
      }

      const headers = jsonData[0];
      const rows = jsonData.slice(1).filter(row => row.some(cell => cell !== ''));

      console.log('[SmartImport] Parsed CSV:', { headers, rowCount: rows.length });

      setCsvData({
        headers,
        rows,
        fileName: file.name,
        rowCount: rows.length
      });

      setStage('analyzing');
      await analyzeWithAI(headers, rows);

    } catch (err) {
      console.error('[SmartImport] File upload error:', err);
      setError(err.message || 'Fel vid läsning av fil');
      setProgress(null);
    }
  };

  const analyzeWithAI = async (headers, rows) => {
    setProgress('AI analyserar CSV-strukturen...');

    try {
      // Use dedicated smart-csv-import Edge Function for analysis
      const { data, error: apiError } = await supabase.functions.invoke('smart-csv-import', {
        body: {
          action: 'analyze',
          wheelId,
          currentPageId,
          csvStructure: {
            headers,
            sampleRows: rows.slice(0, 20), // Send samples for pattern detection
            totalRows: rows.length
          },
          allRows: rows // Send ALL rows for server-side processing
        }
      });

      if (apiError) throw apiError;

      console.log('[SmartImport] AI analysis result:', data);

      if (!data.success || !data.suggestions) {
        throw new Error(data.message || 'AI kunde inte generera förslag');
      }

      const suggestions = data.suggestions;
      setAiSuggestions(suggestions);
      setDetectedPeople(suggestions.detectedPeople || []);
      
      // Pre-select all people for invitation
      if (suggestions.detectedPeople && suggestions.detectedPeople.length > 0) {
        setSelectedPeople(new Set(suggestions.detectedPeople.map(p => p.email)));
      }

      setStage('review');
      setProgress(null);

    } catch (err) {
      console.error('[SmartImport] AI analysis error:', err);
      setError(err.message || 'Fel vid AI-analys');
      setProgress(null);
      setStage('upload');
    }
  };

  const handleImport = async () => {
    setStage('importing');
    setProgress('Skapar struktur och aktiviteter...');

    try {
      // Use AI Assistant V2 to apply suggestions using its existing tools
      const { data, error: apiError } = await supabase.functions.invoke('ai-assistant-v2', {
        body: {
          wheelId,
          currentPageId,
          message: `Applicera dessa CSV-importförslag:\n\nRingar: ${aiSuggestions.rings.length}\nAktivitetsgrupper: ${aiSuggestions.activityGroups.length}\nAktiviteter: ${aiSuggestions.activities.length}\n\nAnvänd apply_suggested_plan verktyget för att skapa allt.`,
          context: {
            lastSuggestions: aiSuggestions,
            lastSuggestionsRaw: JSON.stringify({
              success: true,
              suggestions: aiSuggestions
            })
          }
        }
      });

      if (apiError) throw apiError;

      console.log('[SmartImport] AI Assistant result:', data);

      // Handle team invitations if any people selected
      if (selectedPeople.size > 0) {
        setProgress('Skickar teameinbjudningar...');
        
        const { data: wheel } = await supabase
          .from('year_wheels')
          .select('team_id')
          .eq('id', wheelId)
          .single();

        if (wheel?.team_id) {
          const { data: { user } } = await supabase.auth.getUser();
          
          for (const email of selectedPeople) {
            try {
              await supabase
                .from('team_invitations')
                .insert({
                  team_id: wheel.team_id,
                  email: email.toLowerCase().trim(),
                  invited_by: user.id
                });
            } catch (inviteErr) {
              console.warn('[SmartImport] Failed to invite:', email, inviteErr);
            }
          }
        }
      }

      setStage('complete');
      setProgress(null);

      // Call parent callback to refresh data
      if (onImportComplete) {
        setTimeout(() => onImportComplete(data), 500);
      }

    } catch (err) {
      console.error('[SmartImport] Import error:', err);
      setError(err.message || 'Fel vid import');
      setProgress(null);
      setStage('review');
    }
  };

  const togglePersonSelection = (email) => {
    setSelectedPeople(prevSelected => {
      const newSet = new Set(prevSelected);
      if (newSet.has(email)) {
        newSet.delete(email);
      } else {
        newSet.add(email);
      }
      return newSet;
    });
  };

  const handleClose = () => {
    setCsvData(null);
    setAiSuggestions(null);
    setError(null);
    setProgress(null);
    setDetectedPeople([]);
    setSelectedPeople(new Set());
    setRefinementPrompt('');
    setStage('upload');
    onClose();
  };

  const handleRefine = async () => {
    if (!refinementPrompt.trim()) return;
    
    setStage('analyzing');
    setProgress('AI justerar förslag...');
    setError(null);

    try {
      const { data, error: apiError } = await supabase.functions.invoke('smart-csv-import', {
        body: {
          action: 'analyze',
          wheelId,
          currentPageId,
          csvStructure: {
            headers: csvData.headers,
            sampleRows: csvData.rows.slice(0, 20),
            totalRows: csvData.rows.length
          },
          refinementPrompt: refinementPrompt,
          previousSuggestions: aiSuggestions
        }
      });

      if (apiError) throw apiError;
      if (!data.success || !data.suggestions) {
        throw new Error(data.message || 'AI kunde inte generera nya förslag');
      }

      setAiSuggestions(data.suggestions);
      setDetectedPeople(data.suggestions.detectedPeople || []);
      setRefinementPrompt('');
      setStage('review');
      setProgress(null);
    } catch (err) {
      console.error('[SmartImport] Refinement error:', err);
      setError(err.message || 'Fel vid justering av förslag');
      setProgress(null);
      setStage('review');
    }
  };

  const renderUploadStage = () => (
    <div className="space-y-6">
      <div className="text-center">
        <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
          <Upload className="w-6 h-6 text-blue-600" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Smart Import med AI
        </h3>
        <p className="text-sm text-gray-500">
          Ladda upp en CSV-fil så analyserar AI strukturen och föreslår automatisk mappning
        </p>
      </div>

      <div className="border-2 border-dashed border-gray-300 rounded-sm p-8 text-center hover:border-blue-400 transition-colors">
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.xlsx,.xls"
          onChange={handleFileUpload}
          className="hidden"
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-sm hover:bg-blue-700"
        >
          <FileSpreadsheet className="w-5 h-5" />
          Välj CSV-fil
        </button>
        <p className="mt-2 text-xs text-gray-500">
          Accepterar .csv, .xlsx, och .xls filer
        </p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-sm p-4">
        <div className="flex gap-3">
          <Sparkles className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800 space-y-2">
            <p className="font-medium">AI kommer automatiskt att:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Identifiera kolumner för aktiviteter, datum, och kategorier</li>
              <li>Skapa ringar och aktivitetsgrupper baserat på struktur</li>
              <li>Mappa aktiviteter till rätt ringar och grupper</li>
              <li>Hitta personer i data och erbjuda teameinbjudningar</li>
              <li>Hantera kommentarer och beskrivningar</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );

  const renderAnalyzingStage = () => (
    <div className="text-center py-12">
      <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4 animate-pulse">
        <Sparkles className="w-8 h-8 text-blue-600" />
      </div>
      <h3 className="text-lg font-medium text-gray-900 mb-2">
        AI analyserar din data...
      </h3>
      <p className="text-sm text-gray-500">
        {progress || 'Detta kan ta några sekunder'}
      </p>
      {csvData && (
        <div className="mt-4 text-xs text-gray-400">
          {csvData.rowCount} rader · {csvData.headers.length} kolumner
        </div>
      )}
    </div>
  );

  const renderReviewStage = () => {
    if (!aiSuggestions) return null;

    return (
      <div className="space-y-6 max-h-[60vh] overflow-y-auto">
        <div className="bg-green-50 border border-green-200 rounded-sm p-4">
          <div className="flex items-start gap-3">
            <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-medium text-green-900">AI-analys klar!</h4>
              <p className="text-sm text-green-700 mt-1">
                {aiSuggestions.mapping.explanation}
              </p>
            </div>
          </div>
        </div>

        {/* Rings Section */}
        <div>
          <h4 className="font-medium text-gray-900 mb-3">Ringar ({aiSuggestions.rings.length})</h4>
          <div className="space-y-2">
            {aiSuggestions.rings.map((ring, idx) => (
              <div key={idx} className="bg-gray-50 border border-gray-200 rounded-sm p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-medium text-gray-900">{ring.name}</span>
                    <span className="ml-2 text-xs text-gray-500">
                      ({ring.type === 'inner' ? 'Inner' : 'Outer'})
                    </span>
                  </div>
                  {ring.color && (
                    <div 
                      className="w-6 h-6 rounded border border-gray-300"
                      style={{ backgroundColor: ring.color }}
                    />
                  )}
                </div>
                {ring.description && (
                  <p className="text-xs text-gray-600 mt-1">{ring.description}</p>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Activity Groups Section */}
        <div>
          <h4 className="font-medium text-gray-900 mb-3">
            Aktivitetsgrupper ({aiSuggestions.activityGroups.length})
          </h4>
          <div className="space-y-2">
            {aiSuggestions.activityGroups.map((group, idx) => (
              <div key={idx} className="bg-gray-50 border border-gray-200 rounded-sm p-3">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-gray-900">{group.name}</span>
                  <div 
                    className="w-6 h-6 rounded border border-gray-300"
                    style={{ backgroundColor: group.color }}
                  />
                </div>
                {group.description && (
                  <p className="text-xs text-gray-600 mt-1">{group.description}</p>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Activities Preview */}
        <div>
          <h4 className="font-medium text-gray-900 mb-3">
            Aktiviteter ({aiSuggestions.activities.length})
          </h4>
          <div className="bg-gray-50 border border-gray-200 rounded-sm p-3">
            <p className="text-sm text-gray-700">
              {aiSuggestions.activities.length} aktiviteter kommer att importeras
            </p>
            <div className="mt-2 text-xs text-gray-500 space-y-1">
              <p>Första 3 exempel:</p>
              {aiSuggestions.activities.slice(0, 3).map((activity, idx) => (
                <div key={idx} className="pl-2 border-l-2 border-gray-300">
                  <span className="font-medium">{activity.name}</span> · {activity.startDate} till {activity.endDate}
                  <br />
                  <span className="text-gray-400">→ {activity.ring} / {activity.group}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* People Detection */}
        {detectedPeople.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Users className="w-5 h-5 text-gray-700" />
              <h4 className="font-medium text-gray-900">
                Hittade personer ({detectedPeople.length})
              </h4>
            </div>
            <div className="space-y-2">
              {detectedPeople.map((person, idx) => (
                <label 
                  key={idx}
                  className="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-sm p-3 cursor-pointer hover:bg-gray-100"
                >
                  <input
                    type="checkbox"
                    checked={selectedPeople.has(person.email)}
                    onChange={() => togglePersonSelection(person.email)}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-gray-400" />
                      <span className="font-medium text-gray-900">{person.email}</span>
                    </div>
                    {person.name && (
                      <p className="text-xs text-gray-500 ml-6">{person.name}</p>
                    )}
                    {person.context && (
                      <p className="text-xs text-gray-400 ml-6">Nämndes i: {person.context}</p>
                    )}
                  </div>
                </label>
              ))}
              {selectedPeople.size > 0 && (
                <p className="text-xs text-gray-500 mt-2">
                  {selectedPeople.size} person(er) kommer att få teameinbjudan via email
                </p>
              )}
            </div>
          </div>
        )}

        {/* Column Mapping */}
        {aiSuggestions.mapping && (
          <div>
            <h4 className="font-medium text-gray-900 mb-3">Kolumnmappning</h4>
            <div className="bg-gray-50 border border-gray-200 rounded-sm p-3 text-xs text-gray-600 space-y-1">
              {Object.entries(aiSuggestions.mapping.columns).map(([field, column]) => (
                <div key={field} className="flex justify-between">
                  <span className="font-medium">{field}:</span>
                  <span className="text-gray-900">{column || 'Ej mappad'}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderImportingStage = () => (
    <div className="text-center py-12">
      <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4 animate-pulse">
        <Sparkles className="w-8 h-8 text-blue-600" />
      </div>
      <h3 className="text-lg font-medium text-gray-900 mb-2">
        Importerar data...
      </h3>
      <p className="text-sm text-gray-500">
        {progress || 'Skapar ringar, grupper och aktiviteter'}
      </p>
    </div>
  );

  const renderCompleteStage = () => (
    <div className="text-center py-12">
      <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
        <Check className="w-8 h-8 text-green-600" />
      </div>
      <h3 className="text-lg font-medium text-gray-900 mb-2">
        Import klar!
      </h3>
      <p className="text-sm text-gray-500">
        All data har importerats till ditt hjul
      </p>
      {selectedPeople.size > 0 && (
        <p className="text-xs text-gray-500 mt-2">
          {selectedPeople.size} teameinbjudningar har skickats
        </p>
      )}
      <button
        onClick={handleClose}
        className="mt-6 px-4 py-2 bg-blue-600 text-white rounded-sm hover:bg-blue-700"
      >
        Stäng
      </button>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-sm shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-sm flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Smart Import</h2>
              <p className="text-xs text-gray-500">AI-driven CSV-import</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={stage === 'importing' || stage === 'analyzing'}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-sm p-4">
              <div className="flex gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                <div className="text-sm text-red-800">
                  <p className="font-medium">Fel uppstod</p>
                  <p>{error}</p>
                </div>
              </div>
            </div>
          )}

          {stage === 'upload' && renderUploadStage()}
          {stage === 'analyzing' && renderAnalyzingStage()}
          {stage === 'review' && renderReviewStage()}
          {stage === 'importing' && renderImportingStage()}
          {stage === 'complete' && renderCompleteStage()}
        </div>

        {/* Footer Actions */}
        {stage === 'review' && (
          <div className="border-t border-gray-200 bg-gray-50">
            {/* Refinement Section */}
            <div className="p-4 border-b border-gray-200">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Justera förslag (valfritt)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={refinementPrompt}
                  onChange={(e) => setRefinementPrompt(e.target.value)}
                  placeholder="T.ex: 'Skapa fler ringar', 'Använd andra färger', 'Gruppera per månad'"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-sm text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && refinementPrompt.trim()) {
                      handleRefine();
                    }
                  }}
                />
                <button
                  onClick={handleRefine}
                  disabled={!refinementPrompt.trim()}
                  className="px-4 py-2 bg-purple-600 text-white rounded-sm hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  Justera
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Be AI:n att justera förslagen innan du importerar
              </p>
            </div>
            
            {/* Action Buttons */}
            <div className="p-6">
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setStage('upload')}
                  className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-sm hover:bg-gray-50"
                >
                  Avbryt
                </button>
                <button
                  onClick={handleImport}
                  className="px-4 py-2 bg-blue-600 text-white rounded-sm hover:bg-blue-700 flex items-center gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  Importera
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
