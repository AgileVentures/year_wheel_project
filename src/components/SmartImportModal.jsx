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
  const [stage, setStage] = useState('upload'); // upload, analyzing, review, refining, importing, complete, confirm-delete
  const [csvData, setCsvData] = useState(null);
  const [aiSuggestions, setAiSuggestions] = useState(null);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState(null);
  const [detectedPeople, setDetectedPeople] = useState([]);
  const [selectedPeople, setSelectedPeople] = useState(new Set());
  const [refinementPrompt, setRefinementPrompt] = useState('');
  const [importMode, setImportMode] = useState('replace'); // 'replace' or 'append'
  const [showAdvancedMapping, setShowAdvancedMapping] = useState(false);
  const [manualMapping, setManualMapping] = useState({
    activityName: null,
    startDate: null,
    endDate: null,
    description: null,
    descriptionColumns: [],
    ring: null,
    group: null,
    labels: []
  });
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

      // Show confirmation dialog before proceeding
      setStage('confirm-delete');

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
          allRows: rows, // Send ALL rows for server-side processing
          manualMapping: showAdvancedMapping ? manualMapping : null // Override AI if manual mapping provided
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
    setProgress('Förbereder import...');

    try {
      // If manual mapping is active, re-analyze with overrides before importing
      if (showAdvancedMapping && manualMapping) {
        console.log('[SmartImport] Re-analyzing with manual mapping before import:', manualMapping);
        setProgress('Applicerar manuella mappningar...');
        
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
            allRows: csvData.rows,
            manualMapping: manualMapping // Apply user overrides
          }
        });

        if (apiError) throw apiError;

        if (!data.success || !data.suggestions) {
          throw new Error(data.message || 'Fel vid applicering av manuella mappningar');
        }

        // Update aiSuggestions with remapped data
        setAiSuggestions(data.suggestions);
        console.log('[SmartImport] Updated aiSuggestions with manual mapping:', data.suggestions);
      }
      
      setProgress('Skapar struktur och aktiviteter...');
      
      // Generate consistent IDs for rings and groups (will be remapped by App.jsx import logic)
      const ringIdMap = new Map();
      const groupIdMap = new Map();
      
      // Assign consistent IDs to rings
      const ringsWithIds = aiSuggestions.rings.map((ring, index) => {
        const id = ring.id || `ring-${index + 1}`;
        ringIdMap.set(ring.name, id);
        return {
          ...ring,
          id,
          visible: true
        };
      });
      
      // Assign consistent IDs to activity groups
      const groupsWithIds = aiSuggestions.activityGroups.map((group, index) => {
        const id = group.id || `ag-${index + 1}`;
        groupIdMap.set(group.name, id);
        return {
          ...group,
          id,
          visible: true
        };
      });
      
      // Assign consistent IDs to labels
      const labelIdMap = new Map();
      const labelsWithIds = (aiSuggestions.labels || []).map((label, index) => {
        const id = label.id || `label-${index + 1}`;
        labelIdMap.set(label.name, id);
        return {
          ...label,
          id,
          visible: true
        };
      });
      
      // Map activities to use proper ringId, activityId, and labelIds
      const itemsWithIds = aiSuggestions.activities.map((activity, index) => {
        const ringId = ringIdMap.get(activity.ring);
        const activityId = groupIdMap.get(activity.group);
        
        // Map label names to label IDs
        const labelIds = (activity.labels || [])
          .map(labelName => labelIdMap.get(labelName))
          .filter(Boolean);
        
        if (!ringId) {
          console.error('[SmartImport] ERROR: No ring ID found for activity:', {
            activityName: activity.name,
            requestedRing: activity.ring,
            availableRings: Array.from(ringIdMap.keys()),
            ringIdMapSize: ringIdMap.size
          });
        }
        if (!activityId) {
          console.error('[SmartImport] ERROR: No activity group ID found for activity:', {
            activityName: activity.name,
            requestedGroup: activity.group,
            availableGroups: Array.from(groupIdMap.keys()),
            groupIdMapSize: groupIdMap.size
          });
        }
        
        return {
          id: `item-${index + 1}`,
          name: activity.name,
          startDate: activity.startDate,
          endDate: activity.endDate,
          ringId,
          activityId,
          labelIds: labelIds.length > 0 ? labelIds : null,
          labelId: labelIds[0] || null, // Keep legacy single labelId for backwards compatibility
          description: activity.description || null
        };
      });
      
      console.log('[SmartImport] Generated structure:', {
        rings: ringsWithIds.length,
        groups: groupsWithIds.length,
        labels: labelsWithIds.length,
        items: itemsWithIds.length,
        sampleRings: ringsWithIds.slice(0, 2),
        sampleGroups: groupsWithIds.slice(0, 2),
        sampleLabels: labelsWithIds.slice(0, 3),
        sampleItems: itemsWithIds.slice(0, 2)
      });
      
      // CRITICAL: Group items by year to create multi-year pages
      const itemsByYear = {};
      itemsWithIds.forEach(item => {
        if (item.startDate) {
          const year = new Date(item.startDate).getFullYear();
          if (!itemsByYear[year]) {
            itemsByYear[year] = [];
          }
          itemsByYear[year].push(item);
        }
      });
      
      // Sort years to create pages in chronological order
      const years = Object.keys(itemsByYear).map(Number).sort((a, b) => a - b);
      console.log('[SmartImport] Creating pages for years:', years, 'with item counts:', years.map(y => itemsByYear[y].length));
      
      // Create a page for each year
      const pages = years.map((year, index) => ({
        id: `page-${index + 1}`,
        year,
        pageOrder: index + 1,
        title: `${year}`,
        items: itemsByYear[year]
      }));
      
      // If no items have valid dates, create single page with current year
      if (pages.length === 0) {
        console.warn('[SmartImport] No valid dates found, creating single page for current year');
        pages.push({
          id: 'page-1',
          year: new Date().getFullYear(),
          pageOrder: 1,
          title: `${new Date().getFullYear()}`,
          items: itemsWithIds
        });
      }
      
      // Generate a .yrw-compatible structure from AI suggestions
      const yrwData = {
        version: '2.0',
        metadata: {
          title: csvData.fileName.replace(/\.(csv|xlsx|xls)$/i, ''),
          year: pages[0].year, // Use first page year as wheel year
          createdAt: new Date().toISOString().split('T')[0],
          description: `Importerad från ${csvData.fileName}`
        },
        settings: {
          showWeekRing: true,
          showMonthRing: true,
          showRingNames: true,
          weekRingDisplayMode: 'week-numbers',
          showLabels: (aiSuggestions.labels?.length > 0) || (aiSuggestions.detectedPeople?.length > 0)
        },
        structure: {
          rings: ringsWithIds,
          activityGroups: groupsWithIds,
          labels: labelsWithIds
        },
        pages // Multi-year pages
      };

      console.log('[SmartImport] Generated .yrw structure with', ringsWithIds.length, 'rings,', groupsWithIds.length, 'groups,', labelsWithIds.length, 'labels,', pages.length, 'pages,', itemsWithIds.length, 'total items');

      // Use batch import Edge Function for performance
      setProgress('Sparar till databas (batch import)...');
      
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/batch-import-activities`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          wheelId,
          structure: {
            rings: ringsWithIds,
            activityGroups: groupsWithIds,
            labels: labelsWithIds
          },
          pages
        })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Batch import failed');
      }
      
      const result = await response.json();
      console.log('[SmartImport] Batch import result:', result);

      // Trigger the parent's completion handler if provided
      if (onImportComplete) {
        setProgress('Uppdaterar gränssnittet...');
        await onImportComplete({ 
          yrwData: {
            metadata: {
              title: csvData.fileName.replace(/\.(csv|xlsx|xls)$/i, ''),
              year: pages[0].year
            },
            structure: {
              rings: ringsWithIds,
              activityGroups: groupsWithIds,
              labels: labelsWithIds
            },
            pages
          }, 
          inviteEmails: Array.from(selectedPeople) 
        });
      }

      setStage('complete');
      setProgress(null);

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

  const renderConfirmStage = () => (
    <div className="space-y-6">
      <div className="bg-yellow-50 border border-yellow-200 rounded-sm p-6">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div className="space-y-3">
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Välj importmetod</h3>
              <p className="text-sm text-gray-700 mb-4">
                Du har laddat upp <strong>{csvData.rowCount} rader</strong> från <strong>{csvData.fileName}</strong>
              </p>
            </div>
            
            <div className="space-y-3">
              <label className="flex items-start gap-3 p-4 border-2 rounded-sm cursor-pointer hover:bg-yellow-100/50 transition-colors"
                style={{ borderColor: importMode === 'replace' ? '#EAB308' : '#E5E7EB' }}>
                <input
                  type="radio"
                  name="importMode"
                  value="replace"
                  checked={importMode === 'replace'}
                  onChange={(e) => setImportMode(e.target.value)}
                  className="mt-0.5"
                />
                <div className="flex-1">
                  <div className="font-medium text-gray-900">Ersätt alla data</div>
                  <div className="text-sm text-gray-600 mt-1">
                    <strong>VARNING:</strong> Alla befintliga ringar, aktivitetsgrupper, etiketter och aktiviteter kommer att raderas permanent.
                    Endast sidor kommer att behållas för att bevara sidstrukturen.
                  </div>
                </div>
              </label>
              
              <label className="flex items-start gap-3 p-4 border-2 rounded-sm cursor-pointer hover:bg-green-50 transition-colors"
                style={{ borderColor: importMode === 'append' ? '#10B981' : '#E5E7EB' }}>
                <input
                  type="radio"
                  name="importMode"
                  value="append"
                  checked={importMode === 'append'}
                  onChange={(e) => setImportMode(e.target.value)}
                  className="mt-0.5"
                />
                <div className="flex-1">
                  <div className="font-medium text-gray-900">Lägg till befintliga data</div>
                  <div className="text-sm text-gray-600 mt-1">
                    Nya ringar, grupper och aktiviteter läggs till utan att radera befintliga data.
                    Duplicerade namn kan uppstå.
                  </div>
                </div>
              </label>
            </div>
            
            <div className="pt-4 border-t border-yellow-300">
              <p className="text-xs text-gray-500">
                Nästa steg: AI kommer att analysera din CSV-fil och föreslå mappningar automatiskt.
                Du kan sedan granska och justera förslagen innan import.
              </p>
            </div>
          </div>
        </div>
      </div>
      
      <div className="flex gap-3 justify-end">
        <button
          onClick={() => setStage('upload')}
          className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-sm hover:bg-gray-50"
        >
          Tillbaka
        </button>
        <button
          onClick={async () => {
            setStage('analyzing');
            await analyzeWithAI(csvData.headers, csvData.rows);
          }}
          className="px-4 py-2 bg-blue-600 text-white rounded-sm hover:bg-blue-700 flex items-center gap-2"
        >
          <Sparkles className="w-4 h-4" />
          Fortsätt till AI-analys
        </button>
      </div>
    </div>
  );

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
            <div className="flex-1">
              <h4 className="font-medium text-green-900">AI-analys klar!</h4>
              <p className="text-sm text-green-700 mt-1">
                {aiSuggestions.mapping.explanation}
              </p>
              
              <div className="mt-3 pt-3 border-t border-green-200">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showAdvancedMapping}
                    onChange={(e) => setShowAdvancedMapping(e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-sm text-green-900 font-medium">Avancerad kolumnmappning</span>
                </label>
                <p className="text-xs text-green-700 ml-6 mt-1">
                  Anpassa AI:s val av kolumner manuellt
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Advanced Mapping Section */}
        {showAdvancedMapping && (
          <div className="bg-blue-50 border border-blue-200 rounded-sm p-6 space-y-4">
            <div>
              <h3 className="font-semibold text-gray-900 mb-1">Kolumnmappning</h3>
              <p className="text-sm text-gray-600">Välj vilka kolumner som ska användas för varje fält. Låt AI:n välja = använd AI:s förslag</p>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              {/* Activity Name */}
              <div className="bg-white p-3 rounded-sm border border-gray-200">
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Aktivitetsnamn <span className="text-red-500">*</span>
                </label>
                <select
                  value={manualMapping.activityName ?? ''}
                  onChange={(e) => setManualMapping(prev => ({ 
                    ...prev, 
                    activityName: e.target.value === '' ? null : e.target.value 
                  }))}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Låt AI:n välja ({aiSuggestions.mapping.columns.activityName})</option>
                  {csvData.headers.map((header, index) => (
                    <option key={index} value={header}>{header}</option>
                  ))}
                </select>
              </div>
              
              {/* Group */}
              <div className="bg-white p-3 rounded-sm border border-gray-200">
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Aktivitetsgrupp <span className="text-red-500">*</span>
                </label>
                <select
                  value={manualMapping.group ?? ''}
                  onChange={(e) => setManualMapping(prev => ({ 
                    ...prev, 
                    group: e.target.value === '' ? null : e.target.value 
                  }))}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Låt AI:n välja ({aiSuggestions.mapping.columns.group || 'ingen'})</option>
                  {csvData.headers.map((header, index) => (
                    <option key={index} value={header}>{header}</option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">Kolumn med kategorier för färgkodning</p>
              </div>
              
              {/* Start Date */}
              <div className="bg-white p-3 rounded-sm border border-gray-200">
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Startdatum <span className="text-red-500">*</span>
                </label>
                <select
                  value={manualMapping.startDate ?? ''}
                  onChange={(e) => setManualMapping(prev => ({ 
                    ...prev, 
                    startDate: e.target.value === '' ? null : e.target.value 
                  }))}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Låt AI:n välja ({aiSuggestions.mapping.columns.startDate})</option>
                  {csvData.headers.map((header, index) => (
                    <option key={index} value={header}>{header}</option>
                  ))}
                </select>
              </div>
              
              {/* End Date */}
              <div className="bg-white p-3 rounded-sm border border-gray-200">
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Slutdatum
                </label>
                <select
                  value={manualMapping.endDate ?? ''}
                  onChange={(e) => setManualMapping(prev => ({ 
                    ...prev, 
                    endDate: e.target.value === '' ? null : e.target.value 
                  }))}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Låt AI:n välja ({aiSuggestions.mapping.columns.endDate || aiSuggestions.mapping.columns.startDate})</option>
                  {csvData.headers.map((header, index) => (
                    <option key={index} value={header}>{header}</option>
                  ))}
                </select>
              </div>
              
              {/* Ring Assignment */}
              <div className="bg-white p-3 rounded-sm border border-gray-200">
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Ringtilldelning
                </label>
                <select
                  value={manualMapping.ring ?? ''}
                  onChange={(e) => setManualMapping(prev => ({ 
                    ...prev, 
                    ring: e.target.value === '' ? null : e.target.value 
                  }))}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Låt AI:n välja ({aiSuggestions.mapping.columns.ring || 'ingen'})</option>
                  {csvData.headers.map((header, index) => (
                    <option key={index} value={header}>{header}</option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">Kolumn för att skapa ringar (valfritt)</p>
              </div>
              
              {/* Description */}
              <div className="bg-white p-3 rounded-sm border border-gray-200">
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Beskrivning
                </label>
                <select
                  value={manualMapping.description ?? ''}
                  onChange={(e) => setManualMapping(prev => ({ 
                    ...prev, 
                    description: e.target.value === '' ? null : e.target.value 
                  }))}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Låt AI:n välja ({aiSuggestions.mapping.columns.description || 'alla oanvända'})</option>
                  {csvData.headers.map((header, index) => (
                    <option key={index} value={header}>{header}</option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">Primär beskrivningskolumn</p>
              </div>
            </div>
            
            {/* Labels (Multi-select) */}
            <div className="bg-white p-3 rounded-sm border border-gray-200">
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Etiketter (filtreringskolumner)
              </label>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {csvData.headers.map((header, index) => (
                  <label key={index} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-gray-50 p-1 rounded">
                    <input
                      type="checkbox"
                      checked={manualMapping.labels.includes(header)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setManualMapping(prev => ({ 
                            ...prev, 
                            labels: [...prev.labels, header] 
                          }));
                        } else {
                          setManualMapping(prev => ({ 
                            ...prev, 
                            labels: prev.labels.filter(l => l !== header) 
                          }));
                        }
                      }}
                      className="rounded"
                    />
                    <span className="text-gray-700">{header}</span>
                    {aiSuggestions.mapping.columns.labels?.includes(header) && (
                      <span className="text-xs text-blue-600">(AI valde denna)</span>
                    )}
                  </label>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-2">Välj kolumner med personer, status eller taggar</p>
            </div>
            
            <div className="bg-yellow-50 border border-yellow-200 rounded-sm p-3">
              <p className="text-sm text-yellow-800">
                <strong>Tips:</strong> Dina ändringar kommer att appliceras automatiskt när du klickar på "Importera" nedan.
              </p>
            </div>
          </div>
        )}

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
          {stage === 'confirm-delete' && renderConfirmStage()}
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
