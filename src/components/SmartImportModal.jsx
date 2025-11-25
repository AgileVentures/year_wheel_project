import { useState, useRef, useEffect } from 'react';
import { X, Upload, FileSpreadsheet, Sparkles, Check, AlertCircle, Users, Mail } from 'lucide-react';
import * as XLSX from 'xlsx';
import { supabase } from '../lib/supabase';
import { useImportProgress } from '../hooks/useImportProgress';

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
  const [importMode, setImportMode] = useState('replace'); // 'replace' or 'append'
  const [showAdvancedMapping, setShowAdvancedMapping] = useState(false);
  const [jobId, setJobId] = useState(null); // Track async import job
  const [isBackgroundImport, setIsBackgroundImport] = useState(false); // Track if import running in background
  const [startTime, setStartTime] = useState(null); // Track import start time for estimation
  const importJobProgress = useImportProgress(jobId); // Subscribe to realtime progress
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
  const [customRings, setCustomRings] = useState(null); // null = use AI, array = custom
  const [customGroups, setCustomGroups] = useState(null); // null = use AI, array = custom
  const [customRingTypes, setCustomRingTypes] = useState(null); // null = use AI, array of 'inner'|'outer'
  const [ringOriginalNames, setRingOriginalNames] = useState(null); // Track which custom ring maps to which AI ring
  const [groupOriginalNames, setGroupOriginalNames] = useState(null); // Track which custom group maps to which AI group
  const fileInputRef = useRef(null);

  // Monitor import job completion
  useEffect(() => {
    if (!jobId) return;

    console.log('[SmartImport] Monitoring job:', jobId, 'status:', importJobProgress.status, 'progress:', importJobProgress.progress);

    if (importJobProgress.isComplete) {
      console.log('[SmartImport] Job completed:', importJobProgress.stats);
      
      // Show toast notification for background imports
      if (isBackgroundImport) {
        const event = new CustomEvent('showToast', {
          detail: {
            message: `Import klar! ${importJobProgress.stats.createdItems || 0} aktiviteter importerade.`,
            type: 'success'
          }
        });
        window.dispatchEvent(event);
      }
      
      // Trigger parent's completion handler
      if (onImportComplete) {
        onImportComplete({
          yrwData: {
            metadata: {
              title: csvData?.fileName?.replace(/\.(csv|xlsx|xls)$/i, '') || 'Import',
              year: aiSuggestions?.suggestedYear || new Date().getFullYear()
            },
            pages: [] // Pages are already in database
          },
          stats: importJobProgress.stats,
          inviteEmails: Array.from(selectedPeople)
        });
      }

      setStage('complete');
      setProgress(null);
      setJobId(null);
      setIsBackgroundImport(false);
    } else if (importJobProgress.isFailed) {
      console.error('[SmartImport] Job failed:', importJobProgress.error);
      
      // Show toast notification for background imports
      if (isBackgroundImport) {
        const event = new CustomEvent('showToast', {
          detail: {
            message: `Import misslyckades: ${importJobProgress.error || 'Okänt fel'}`,
            type: 'error'
          }
        });
        window.dispatchEvent(event);
      }
      
      setError(importJobProgress.error || 'Import misslyckades');
      setProgress(null);
      setStage('review');
      setJobId(null);
      setIsBackgroundImport(false);
    }
  }, [importJobProgress.isComplete, importJobProgress.isFailed, jobId, onImportComplete, selectedPeople, csvData, aiSuggestions, isBackgroundImport]);

  // Cancel import
  const handleCancelImport = async () => {
    if (!jobId) return;

    try {
      // Update job status to canceled
      const { error: cancelError } = await supabase
        .from('import_jobs')
        .update({ status: 'failed', error_message: 'Import avbruten av användaren' })
        .eq('id', jobId);

      if (cancelError) throw cancelError;

      setJobId(null);
      setProgress(null);
      setStartTime(null);
      setStage('review');
      setError('Import avbruten');
    } catch (err) {
      console.error('[SmartImport] Cancel failed:', err);
    }
  };

  // Close modal but keep import running in background
  const handleCloseWithBackground = () => {
    if (jobId && stage === 'importing') {
      setIsBackgroundImport(true);
      
      // Show toast notification
      const event = new CustomEvent('showToast', {
        detail: {
          message: 'Import fortsätter i bakgrunden. Du kommer att få ett meddelande när importen är klar.',
          type: 'info'
        }
      });
      window.dispatchEvent(event);
      
      onClose();
    } else {
      onClose();
    }
  };

  // Estimate remaining time based on progress
  const getTimeEstimate = () => {
    if (!startTime || !importJobProgress.progress || importJobProgress.progress === 0) {
      return null;
    }

    const elapsed = Date.now() - startTime;
    const progressPercent = importJobProgress.progress / 100;
    const totalEstimated = elapsed / progressPercent;
    const remaining = totalEstimated - elapsed;

    if (remaining < 60000) {
      return 'Mindre än 1 minut kvar...';
    } else if (remaining < 120000) {
      return 'Cirka 1 minut kvar...';
    } else {
      const minutes = Math.ceil(remaining / 60000);
      return `Cirka ${minutes} minuter kvar...`;
    }
  };

  // Helper: Get effective rings/groups (AI suggestions or custom overrides)
  const getEffectiveRingsAndGroups = () => {
    const effectiveRings = customRings
      ? customRings.map((name, index) => ({
          id: `ring-${index + 1}`,
          name,
          type: customRingTypes ? customRingTypes[index] : (index === 0 ? 'outer' : 'inner'),
          visible: true,
          orientation: 'vertical',
          isCustom: true
        }))
      : aiSuggestions.rings;

    const effectiveGroups = customGroups
      ? customGroups.map((name, index) => ({
          id: `ag-${index + 1}`,
          name,
          color: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316'][index % 8],
          visible: true,
          isCustom: true
        }))
      : aiSuggestions.activityGroups;

    return { effectiveRings, effectiveGroups };
  };

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
      console.log('[SmartImport] AI Suggestions received:', {
        suggestedWheelTitle: suggestions.suggestedWheelTitle,
        suitabilityWarning: suggestions.suitabilityWarning,
        ringsCount: suggestions.rings?.length,
        groupsCount: suggestions.activityGroups?.length,
        activitiesCount: suggestions.activities?.length
      });
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
    setStartTime(Date.now()); // Track start time for estimation
    setError(null); // Clear any previous errors

    try {
      // Apply user's manual overrides to AI suggestions before processing
      const effectiveSuggestions = { ...aiSuggestions };
      
      // Override column mappings if user customized them
      if (manualMapping.activityName !== null || manualMapping.startDate !== null || 
          manualMapping.endDate !== null || manualMapping.ring !== null || 
          manualMapping.group !== null || manualMapping.description !== null ||
          manualMapping.labels.length > 0) {
        console.log('[SmartImport] Applying manual column mappings:', manualMapping);
        effectiveSuggestions.mapping.columns = {
          ...effectiveSuggestions.mapping.columns,
          activityName: manualMapping.activityName || effectiveSuggestions.mapping.columns.activityName,
          startDate: manualMapping.startDate || effectiveSuggestions.mapping.columns.startDate,
          endDate: manualMapping.endDate || effectiveSuggestions.mapping.columns.endDate,
          ring: manualMapping.ring || effectiveSuggestions.mapping.columns.ring,
          group: manualMapping.group || effectiveSuggestions.mapping.columns.group,
          description: manualMapping.description || effectiveSuggestions.mapping.columns.description,
          labels: manualMapping.labels.length > 0 ? manualMapping.labels : effectiveSuggestions.mapping.columns.labels
        };
      }
      
      // Override rings if user customized them
      const oldToNewRingName = new Map(); // Track ring name changes for activity remapping
      if (customRings !== null && ringOriginalNames !== null) {
        console.log('[SmartImport] Applying custom rings:', customRings);
        console.log('[SmartImport] Original AI ring names:', ringOriginalNames);
        
        // Build mapping from ORIGINAL AI names to CURRENT custom names
        ringOriginalNames.forEach((originalName, index) => {
          if (originalName !== null && index < customRings.length) {
            const currentName = customRings[index];
            if (originalName !== currentName) {
              console.log(`[SmartImport] Ring mapping: "${originalName}" → "${currentName}"`);
              oldToNewRingName.set(originalName, currentName);
            }
          }
        });
        
        // Handle deleted rings: map them to the first ring as fallback
        const remainingOriginals = new Set(ringOriginalNames.filter(n => n !== null));
        aiSuggestions.rings.forEach(aiRing => {
          if (!remainingOriginals.has(aiRing.name)) {
            console.log(`[SmartImport] Deleted ring "${aiRing.name}" → fallback to "${customRings[0]}"`);
            oldToNewRingName.set(aiRing.name, customRings[0]);
          }
        });
        
        effectiveSuggestions.rings = customRings.map((name, index) => ({
          id: `ring-${index + 1}`,
          name,
          type: customRingTypes ? customRingTypes[index] : (index === 0 ? 'outer' : 'inner'),
          visible: true,
          orientation: 'vertical',
          description: `Anpassad ring: ${name}`,
          isCustom: true
        }));
      }
      
      // Override activity groups if user customized them
      const oldToNewGroupName = new Map(); // Track group name changes for activity remapping
      if (customGroups !== null && groupOriginalNames !== null) {
        console.log('[SmartImport] Applying custom activity groups:', customGroups);
        console.log('[SmartImport] Original AI group names:', groupOriginalNames);
        
        // Build mapping from ORIGINAL AI names to CURRENT custom names
        groupOriginalNames.forEach((originalName, index) => {
          if (originalName !== null && index < customGroups.length) {
            const currentName = customGroups[index];
            if (originalName !== currentName) {
              console.log(`[SmartImport] Group mapping: "${originalName}" → "${currentName}"`);
              oldToNewGroupName.set(originalName, currentName);
            }
          }
        });
        
        // Handle deleted groups: map them to the first group as fallback
        const remainingOriginals = new Set(groupOriginalNames.filter(n => n !== null));
        aiSuggestions.activityGroups.forEach(aiGroup => {
          if (!remainingOriginals.has(aiGroup.name)) {
            console.log(`[SmartImport] Deleted group "${aiGroup.name}" → fallback to "${customGroups[0]}"`);
            oldToNewGroupName.set(aiGroup.name, customGroups[0]);
          }
        });
        
        const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316'];
        effectiveSuggestions.activityGroups = customGroups.map((name, index) => ({
          id: `ag-${index + 1}`,
          name,
          color: colors[index % colors.length],
          visible: true,
          description: `Anpassad grupp: ${name}`,
          isCustom: true
        }));
      }
      
      // CRITICAL: Remap activities to use new ring/group names
      if (oldToNewRingName.size > 0 || oldToNewGroupName.size > 0) {
        console.log('[SmartImport] Remapping activities to new ring/group names');
        console.log('[SmartImport] Ring name mapping:', Object.fromEntries(oldToNewRingName));
        console.log('[SmartImport] Group name mapping:', Object.fromEntries(oldToNewGroupName));
        console.log('[SmartImport] Sample activities BEFORE remap:', effectiveSuggestions.activities.slice(0, 3).map(a => ({ name: a.name, ring: a.ring, group: a.group })));
        
        effectiveSuggestions.activities = effectiveSuggestions.activities.map(activity => ({
          ...activity,
          ring: oldToNewRingName.get(activity.ring) || activity.ring,
          group: oldToNewGroupName.get(activity.group) || activity.group
        }));
        
        console.log('[SmartImport] Sample activities AFTER remap:', effectiveSuggestions.activities.slice(0, 3).map(a => ({ name: a.name, ring: a.ring, group: a.group })));
      }
      
      console.log('[SmartImport] Effective suggestions after user overrides:', {
        columnMappings: effectiveSuggestions.mapping.columns,
        ringCount: effectiveSuggestions.rings.length,
        groupCount: effectiveSuggestions.activityGroups.length,
        activityCount: effectiveSuggestions.activities.length,
        sampleRingNames: effectiveSuggestions.rings.map(r => r.name),
        sampleGroupNames: effectiveSuggestions.activityGroups.map(g => g.name),
        sampleActivityRings: effectiveSuggestions.activities.slice(0, 3).map(a => a.ring),
        sampleActivityGroups: effectiveSuggestions.activities.slice(0, 3).map(a => a.group)
      });
      
      setProgress('Skapar struktur och aktiviteter...');
      
      // Generate consistent IDs for rings and groups (will be remapped by App.jsx import logic)
      const ringIdMap = new Map();
      const groupIdMap = new Map();
      
      // Assign consistent IDs to rings
      const ringsWithIds = effectiveSuggestions.rings.map((ring, index) => {
        const id = ring.id || `ring-${index + 1}`;
        ringIdMap.set(ring.name, id);
        return {
          ...ring,
          id,
          visible: true
        };
      });
      
      // Assign consistent IDs to activity groups
      const groupsWithIds = effectiveSuggestions.activityGroups.map((group, index) => {
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
      const labelsWithIds = (effectiveSuggestions.labels || []).map((label, index) => {
        const id = label.id || `label-${index + 1}`;
        labelIdMap.set(label.name, id);
        return {
          ...label,
          id,
          visible: true
        };
      });
      
      // Map activities to use proper ringId, activityId, and labelIds
      const itemsWithIds = effectiveSuggestions.activities.map((activity, index) => {
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
          showLabels: (effectiveSuggestions.labels?.length > 0) || (effectiveSuggestions.detectedPeople?.length > 0)
        },
        structure: {
          rings: ringsWithIds,
          activityGroups: groupsWithIds,
          labels: labelsWithIds
        },
        pages // Multi-year pages
      };

      console.log('[SmartImport] Generated .yrw structure with', ringsWithIds.length, 'rings,', groupsWithIds.length, 'groups,', labelsWithIds.length, 'labels,', pages.length, 'pages,', itemsWithIds.length, 'total items');

      // Show detailed progress for large imports
      const isLargeImport = itemsWithIds.length > 200;
      if (isLargeImport) {
        setProgress(`Förbereder stor import (${itemsWithIds.length} aktiviteter över ${pages.length} år)...`);
        await new Promise(resolve => setTimeout(resolve, 500)); // Brief pause to show message
      }
      
      // Use batch import Edge Function for performance
      setProgress(`Sparar ${itemsWithIds.length} aktiviteter till databas...${isLargeImport ? ' Email skickas när importen är klar.' : ''}`);
      
      // Get user email for notification
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/batch-import-activities`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          wheelId,
          importMode, // 'replace' or 'append'
          suggestedWheelTitle: aiSuggestions?.suggestedWheelTitle || null, // Apply AI-suggested title
          structure: {
            rings: ringsWithIds,
            activityGroups: groupsWithIds,
            labels: labelsWithIds
          },
          pages,
          notifyEmail: isLargeImport ? user?.email : null, // Send email for large imports
          fileName: csvData.fileName
        })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Batch import failed');
      }
      
      const result = await response.json();
      console.log('[SmartImport] Async job created:', result);

      // Store job ID to start tracking progress
      if (result.jobId) {
        console.log('[SmartImport] Setting jobId:', result.jobId);
        setJobId(result.jobId);
        setProgress('Import startad - följer framsteg...');
        // Don't set stage to complete here - let the useEffect handle it
      } else {
        throw new Error('No job ID returned from server');
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
    setStage('upload');
    onClose();
  };



  const renderConfirmStage = () => {
    // Estimate import time based on row count
    const estimateImportTime = (rows) => {
      if (rows < 100) return { time: '< 1 minut', fast: true };
      if (rows < 250) return { time: '1-3 minuter', fast: true };
      if (rows < 500) return { time: '3-7 minuter', fast: false };
      if (rows < 1000) return { time: '7-15 minuter', fast: false };
      return { time: '> 15 minuter', fast: false };
    };
    
    const timeEstimate = estimateImportTime(csvData.rowCount);
    const isLargeImport = csvData.rowCount > 200;
    
    return (
      <div className="space-y-6">
        {/* Size Warning for Large Imports */}
        {isLargeImport && (
          <div className="bg-amber-50 border-2 border-amber-300 rounded-sm p-4">
            <div className="flex items-start gap-3">
              <Mail className="w-6 h-6 text-amber-600 flex-shrink-0" />
              <div>
                <h4 className="font-semibold text-amber-900 mb-1">Stor import ({csvData.rowCount} rader)</h4>
                <p className="text-sm text-amber-800 mb-2">
                  Beräknad tid: <strong>{timeEstimate.time}</strong>
                </p>
                <p className="text-xs text-amber-700 mb-2">
                  Vi kommer att skicka ett email till dig när importen är klar.
                  Du kan stänga detta fönster och fortsätta arbeta.
                </p>
                <div className="bg-white border border-amber-200 rounded px-2 py-1 text-xs text-amber-900">
                  📧 Email skickas till din registrerade adress
                </div>
              </div>
            </div>
          </div>
        )}
        
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
        {/* Suggested Wheel Title */}
        {aiSuggestions.suggestedWheelTitle && (
          <div className="bg-purple-50 border border-purple-200 rounded-sm p-4">
            <div className="flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-medium text-purple-900">Förslag på hjultitel</h4>
                <p className="text-lg font-semibold text-purple-900 mt-2">
                  "{aiSuggestions.suggestedWheelTitle}"
                </p>
                <p className="text-xs text-purple-700 mt-1">
                  Du kan ändra titeln efter importen i hjulinställningarna
                </p>
              </div>
            </div>
          </div>
        )}
        
        <div className="bg-green-50 border border-green-200 rounded-sm p-4">
          <div className="flex items-start gap-3">
            <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-medium text-green-900">AI-analys klar!</h4>
              <p className="text-sm text-green-700 mt-1">
                {aiSuggestions.mapping.explanation}
              </p>
              
              {/* Show AI's grouping strategy */}
              {(aiSuggestions.mapping.suggestedRingStrategy || aiSuggestions.mapping.suggestedGroupingStrategy) && (
                <div className="mt-3 pt-3 border-t border-green-200 space-y-2">
                  {aiSuggestions.mapping.suggestedRingStrategy && (
                    <div>
                      <h5 className="text-xs font-semibold text-green-900 mb-1">Ringar (2-4 st):</h5>
                      <p className="text-xs text-green-700">{aiSuggestions.mapping.suggestedRingStrategy}</p>
                    </div>
                  )}
                  {aiSuggestions.mapping.suggestedGroupingStrategy && (
                    <div>
                      <h5 className="text-xs font-semibold text-green-900 mb-1">Aktivitetsgrupper:</h5>
                      <p className="text-xs text-green-700">{aiSuggestions.mapping.suggestedGroupingStrategy}</p>
                    </div>
                  )}
                </div>
              )}
              
              <div className="mt-3 pt-3 border-t border-green-200">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showAdvancedMapping}
                    onChange={(e) => setShowAdvancedMapping(e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-sm text-green-900 font-medium">Avancerad mappning</span>
                </label>
                <p className="text-xs text-green-700 ml-6 mt-1">
                  Anpassa AI:s val av kolumner, ringar och grupper
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Data Suitability Warning */}
        {aiSuggestions.suitabilityWarning && (
          <div className={`border rounded-sm p-4 ${
            aiSuggestions.suitabilityWarning.severity === 'error' 
              ? 'bg-red-50 border-red-300' 
              : aiSuggestions.suitabilityWarning.severity === 'warning'
              ? 'bg-amber-50 border-amber-300'
              : 'bg-blue-50 border-blue-300'
          }`}>
            <div className="flex items-start gap-3">
              <AlertCircle className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                aiSuggestions.suitabilityWarning.severity === 'error' 
                  ? 'text-red-600' 
                  : aiSuggestions.suitabilityWarning.severity === 'warning'
                  ? 'text-amber-600'
                  : 'text-blue-600'
              }`} />
              <div className="flex-1">
                <h4 className={`font-semibold ${
                  aiSuggestions.suitabilityWarning.severity === 'error' 
                    ? 'text-red-900' 
                    : aiSuggestions.suitabilityWarning.severity === 'warning'
                    ? 'text-amber-900'
                    : 'text-blue-900'
                }`}>
                  {aiSuggestions.suitabilityWarning.title}
                </h4>
                <p className={`text-sm mt-1 whitespace-pre-line ${
                  aiSuggestions.suitabilityWarning.severity === 'error' 
                    ? 'text-red-800' 
                    : aiSuggestions.suitabilityWarning.severity === 'warning'
                    ? 'text-amber-800'
                    : 'text-blue-800'
                }`}>
                  {aiSuggestions.suitabilityWarning.message}
                </p>
                
                {aiSuggestions.suitabilityWarning.suggestions && aiSuggestions.suitabilityWarning.suggestions.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-amber-200">
                    <h5 className="text-sm font-semibold text-amber-900 mb-2">
                      {aiSuggestions.suitabilityWarning.severity === 'error' 
                        ? '🚨 Nödvändiga åtgärder innan import:' 
                        : '💡 Rekommenderade åtgärder:'}
                    </h5>
                    <ul className="space-y-3">
                      {aiSuggestions.suitabilityWarning.suggestions.map((suggestion, idx) => (
                        <li key={idx} className="text-sm">
                          <div className="flex items-start gap-2">
                            <span className="font-medium text-amber-900 flex-shrink-0 mt-0.5">
                              {suggestion.multiWheelStrategy ? '🔗' : idx + 1 + '.'}
                            </span>
                            <div className="flex-1">
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1">
                                  <p className="font-medium text-amber-900">
                                    {suggestion.action}
                                    {suggestion.multiWheelStrategy && (
                                      <span className="ml-2 text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">
                                        Multi-Wheel
                                      </span>
                                    )}
                                    {suggestion.isFutureFeature && (
                                      <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                                        Kommande
                                      </span>
                                    )}
                                  </p>
                                  <p className="text-xs text-amber-700 mt-0.5">{suggestion.description}</p>
                                </div>
                                {suggestion.filterColumn && (
                                  <button
                                    onClick={() => {
                                      // Auto-select this column as a label for easy filtering
                                      if (!manualMapping.labels.includes(suggestion.filterColumn)) {
                                        setManualMapping(prev => ({
                                          ...prev,
                                          labels: [...prev.labels, suggestion.filterColumn]
                                        }));
                                      }
                                      setShowAdvancedMapping(true);
                                    }}
                                    className="text-xs px-2 py-1 bg-amber-200 text-amber-900 rounded hover:bg-amber-300 transition-colors flex-shrink-0"
                                  >
                                    📌 Använd för filtrering
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                    
                    {aiSuggestions.suitabilityWarning.severity === 'error' && (
                      <div className="mt-3 pt-3 border-t border-red-300 bg-red-100 rounded p-3">
                        <p className="text-xs font-semibold text-red-900 mb-1">
                          ⚠️ Varför blockerar vi importen?
                        </p>
                        <p className="text-xs text-red-800">
                          Ett årshjul med överlappande helårsstaplar ger ingen användbar visualisering. 
                          YearWheel är mest värdefullt när du kan <strong>se tidsmönster och identifiera konflikter</strong>. 
                          Genom att dela upp datan i flera fokuserade hjul får du betydligt bättre översikt.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Advanced Mapping Section */}
        {showAdvancedMapping && (
          <div className="bg-blue-50 border border-blue-200 rounded-sm p-6 space-y-4">
            <div>
              <h3 className="font-semibold text-gray-900 mb-1">Anpassa kolumnmappning</h3>
              <p className="text-sm text-gray-600">Välj vilka kolumner som ska användas för varje fält. Dina val används direkt vid import.</p>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              {/* Activity Name */}
              <div className="bg-white p-3 rounded-sm border border-gray-200">
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Aktivitetsnamn <span className="text-red-500">*</span>
                </label>
                <select
                  value={manualMapping.activityName ?? ''}
                  onChange={(e) => {
                    setManualMapping(prev => ({ 
                      ...prev, 
                      activityName: e.target.value === '' ? null : e.target.value 
                    }));
                  }}
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
            
            <div className="bg-blue-50 border border-blue-200 rounded-sm p-3">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-800">
                  <p className="font-medium mb-1">✨ Så här fungerar det</p>
                  <ul className="text-xs space-y-1 mt-2">
                    <li>• Ändra kolumnmappningar, ringar eller grupper efter behov</li>
                    <li>• Alla dina anpassningar sparas automatiskt</li>
                    <li>• När du ändrar ringnamn uppdateras aktiviteterna automatiskt</li>
                    <li>• Klicka "Importera" när du är klar</li>
                  </ul>
                </div>
              </div>
            </div>
            
            {/* Custom Ring/Group Editor */}
            <div className="bg-purple-50 border border-purple-200 rounded-sm p-4 space-y-4">
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Anpassa Ringar och Grupper</h3>
                <p className="text-sm text-gray-600">
                  {customRings || customGroups ? (
                    <>Dina anpassningar: {getEffectiveRingsAndGroups().effectiveRings.length} ringar och {getEffectiveRingsAndGroups().effectiveGroups.length} aktivitetsgrupper.</>
                  ) : (
                    <>AI:n har föreslagit {aiSuggestions.rings.length} ringar och {aiSuggestions.activityGroups.length} aktivitetsgrupper.</>
                  )}
                  {getEffectiveRingsAndGroups().effectiveGroups.length > 20 && (
                    <span className="text-amber-700 font-medium"> OBS: {getEffectiveRingsAndGroups().effectiveGroups.length} grupper kan bli rörigt - överväg att minska antalet.</span>
                  )}
                </p>
              </div>
              
              {/* Custom Rings */}
              <div className="bg-white p-3 rounded-sm border border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <label className="font-medium text-gray-900">Ringar (2-4 rekommenderat)</label>
                    {customRings && ringOriginalNames && (
                      <p className="text-xs text-gray-500 mt-0.5">Redigerar AI:s förslag – aktiviteter uppdateras automatiskt</p>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      if (customRings) {
                        // Reset to AI suggestions
                        setCustomRings(null);
                        setCustomRingTypes(null);
                        setRingOriginalNames(null);
                      } else {
                        // Enter edit mode - capture original mapping
                        setCustomRings(aiSuggestions.rings.map(r => r.name));
                        setCustomRingTypes(aiSuggestions.rings.map(r => r.type));
                        setRingOriginalNames(aiSuggestions.rings.map(r => r.name)); // Store original AI names
                      }
                    }}
                    className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded hover:bg-purple-200"
                  >
                    {customRings ? 'Återställ till AI:s förslag' : 'Anpassa'}
                  </button>
                </div>
                
                {!customRings ? (
                  <div className="text-sm text-gray-600 space-y-1">
                    {aiSuggestions.rings.map((ring, idx) => (
                      <div key={idx}>• {ring.name} <span className="text-xs text-gray-500">({ring.type === 'inner' ? 'Inner' : 'Outer'})</span></div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {customRings.map((ringName, idx) => {
                      const types = customRingTypes || customRings.map((_, i) => i === 0 ? 'outer' : 'inner');
                      return (
                        <div key={idx} className="flex gap-2">
                          <input
                            type="text"
                            value={ringName}
                            onChange={(e) => {
                              const updated = [...customRings];
                              updated[idx] = e.target.value;
                              setCustomRings(updated);
                            }}
                            placeholder={`Ring ${idx + 1}`}
                            className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded"
                          />
                          <select
                            value={types[idx]}
                            onChange={(e) => {
                              const updated = [...types];
                              updated[idx] = e.target.value;
                              setCustomRingTypes(updated);
                            }}
                            className="px-2 py-1 text-sm border border-gray-300 rounded"
                            title="Inner = huvudområde mellan center och månadscirkel, Outer = yttre kant"
                          >
                            <option value="inner">Inner</option>
                            <option value="outer">Outer</option>
                          </select>
                          {customRings.length > 1 && (
                            <button
                              onClick={() => {
                                setCustomRings(customRings.filter((_, i) => i !== idx));
                                if (customRingTypes) {
                                  setCustomRingTypes(customRingTypes.filter((_, i) => i !== idx));
                                }
                                if (ringOriginalNames) {
                                  setRingOriginalNames(ringOriginalNames.filter((_, i) => i !== idx));
                                }
                              }}
                              className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200"
                            >
                              Ta bort
                            </button>
                          )}
                        </div>
                      );
                    })}
                    <div className="flex gap-2">
                      {customRings.length < 4 && (
                        <button
                          onClick={() => {
                            setCustomRings([...customRings, `Ring ${customRings.length + 1}`]);
                            const types = customRingTypes || customRings.map((_, i) => i === 0 ? 'outer' : 'inner');
                            setCustomRingTypes([...types, 'inner']);
                            if (ringOriginalNames) {
                              setRingOriginalNames([...ringOriginalNames, null]); // New ring, no AI mapping
                            }
                          }}
                          className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                        >
                          + Lägg till ring
                        </button>
                      )}
                      {customRings.length > 1 && (
                        <button
                          onClick={() => {
                            if (confirm(`Ta bort alla ${customRings.length} ringar? Detta kan inte ångras.`)) {
                              setCustomRings([customRings[0]]); // Keep at least one
                              setCustomRingTypes(customRingTypes ? [customRingTypes[0]] : null);
                              setRingOriginalNames(ringOriginalNames ? [ringOriginalNames[0]] : null);
                            }
                          }}
                          className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200"
                        >
                          Ta bort alla
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
              
              {/* Custom Groups */}
              <div className="bg-white p-3 rounded-sm border border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <label className="font-medium text-gray-900">Aktivitetsgrupper</label>
                    {customGroups && groupOriginalNames && (
                      <p className="text-xs text-gray-500 mt-0.5">Redigerar AI:s förslag – aktiviteter uppdateras automatiskt</p>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      if (customGroups) {
                        setCustomGroups(null);
                        setGroupOriginalNames(null);
                      } else {
                        setCustomGroups(aiSuggestions.activityGroups.map(g => g.name));
                        setGroupOriginalNames(aiSuggestions.activityGroups.map(g => g.name)); // Store original AI names
                      }
                    }}
                    className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded hover:bg-purple-200"
                  >
                    {customGroups ? 'Återställ till AI:s förslag' : 'Anpassa'}
                  </button>
                </div>
                
                {!customGroups ? (
                  <div className="text-sm text-gray-600">
                    {aiSuggestions.activityGroups.length} grupper: {aiSuggestions.activityGroups.slice(0, 5).map(g => g.name).join(', ')}
                    {aiSuggestions.activityGroups.length > 5 && '...'}
                  </div>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {customGroups.map((groupName, idx) => (
                      <div key={idx} className="flex gap-2">
                        <input
                          type="text"
                          value={groupName}
                          onChange={(e) => {
                            const updated = [...customGroups];
                            updated[idx] = e.target.value;
                            setCustomGroups(updated);
                          }}
                          placeholder={`Grupp ${idx + 1}`}
                          className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded"
                        />
                        <button
                          onClick={() => {
                            setCustomGroups(customGroups.filter((_, i) => i !== idx));
                            if (groupOriginalNames) {
                              setGroupOriginalNames(groupOriginalNames.filter((_, i) => i !== idx));
                            }
                          }}
                          className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200"
                        >
                          Ta bort
                        </button>
                      </div>
                    ))}
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setCustomGroups([...customGroups, `Grupp ${customGroups.length + 1}`]);
                          if (groupOriginalNames) {
                            setGroupOriginalNames([...groupOriginalNames, null]); // New group, no AI mapping
                          }
                        }}
                        className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                      >
                        + Lägg till grupp
                      </button>
                      {customGroups.length > 1 && (
                        <button
                          onClick={() => {
                            if (confirm(`Ta bort alla ${customGroups.length} grupper? Detta kan inte ångras.`)) {
                              setCustomGroups([customGroups[0]]); // Keep at least one
                              setGroupOriginalNames(groupOriginalNames ? [groupOriginalNames[0]] : null);
                            }
                          }}
                          className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200"
                        >
                          Ta bort alla
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Rings Section */}
        <div>
          <h4 className="font-medium text-gray-900 mb-3">Ringar ({getEffectiveRingsAndGroups().effectiveRings.length})</h4>
          <div className="space-y-2">
            {getEffectiveRingsAndGroups().effectiveRings.map((ring, idx) => (
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
            Aktivitetsgrupper ({getEffectiveRingsAndGroups().effectiveGroups.length})
          </h4>
          <div className="space-y-2">
            {getEffectiveRingsAndGroups().effectiveGroups.map((group, idx) => (
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
      
      {/* Progress bar */}
      <div className="max-w-md mx-auto mt-6 mb-4">
        <div className="w-full bg-gray-200 rounded-full h-2.5">
          <div 
            className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
            style={{ width: `${jobId && importJobProgress?.progress ? importJobProgress.progress : 0}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-gray-500 mt-2">
          <span>{jobId && importJobProgress?.progress ? importJobProgress.progress : 0}%</span>
          <span>
            {jobId && importJobProgress?.stats ? 
              `${importJobProgress.stats.processedItems || 0} / ${importJobProgress.stats.totalItems || 0} objekt` :
              '0 / 0 objekt'
            }
          </span>
        </div>
        
        {/* Time estimation */}
        {getTimeEstimate() && (
          <p className="text-xs text-gray-500 text-center mt-2">
            {getTimeEstimate()}
          </p>
        )}
      </div>

      <p className="text-sm text-gray-500">
        {jobId && importJobProgress?.currentStep ? importJobProgress.currentStep : (progress || 'Skapar ringar, grupper och aktiviteter')}
      </p>

      {/* Stats preview */}
      {jobId && importJobProgress?.stats && (
        <div className="mt-6 grid grid-cols-2 gap-4 text-xs text-gray-600 max-w-sm mx-auto">
          {importJobProgress.stats.createdRings > 0 && (
            <div>✓ {importJobProgress.stats.createdRings} ringar</div>
          )}
          {importJobProgress.stats.createdGroups > 0 && (
            <div>✓ {importJobProgress.stats.createdGroups} grupper</div>
          )}
          {importJobProgress.stats.createdLabels > 0 && (
            <div>✓ {importJobProgress.stats.createdLabels} etiketter</div>
          )}
          {importJobProgress.stats.createdPages > 0 && (
            <div>✓ {importJobProgress.stats.createdPages} sidor</div>
          )}
        </div>
      )}
      
      {/* Cancel and background buttons */}
      <div className="flex gap-3 justify-center mt-6">
        <button
          onClick={handleCancelImport}
          className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-sm hover:bg-gray-50"
        >
          Avbryt import
        </button>
        <button
          onClick={handleCloseWithBackground}
          className="px-4 py-2 text-sm text-blue-600 bg-blue-50 border border-blue-200 rounded-sm hover:bg-blue-100"
        >
          Fortsätt i bakgrunden
        </button>
      </div>
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
                <div className="flex-1">
                  <div className="text-sm text-red-800">
                    <p className="font-medium">Fel uppstod</p>
                    <p>{error}</p>
                  </div>
                  {importJobProgress.canRetry && stage === 'review' && (
                    <button
                      onClick={handleImport}
                      className="mt-3 px-3 py-1.5 text-sm bg-red-600 text-white rounded-sm hover:bg-red-700"
                    >
                      Försök igen
                    </button>
                  )}
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
          <div className="border-t border-gray-200 bg-gray-50 p-6">
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setStage('upload')}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-sm hover:bg-gray-50"
              >
                Avbryt
              </button>
              {aiSuggestions.suitabilityWarning?.blockImport ? (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-red-600 font-medium">Import blockerad - se varningen ovan</span>
                  <button
                    disabled
                    className="px-4 py-2 bg-gray-300 text-gray-500 rounded-sm cursor-not-allowed flex items-center gap-2 font-medium"
                    title="Import är blockerad på grund av olämplig datastruktur"
                  >
                    <AlertCircle className="w-4 h-4" />
                    Import blockerad
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleImport}
                  className={`px-4 py-2 rounded-sm flex items-center gap-2 font-medium ${
                    aiSuggestions.suitabilityWarning?.severity === 'warning'
                      ? 'bg-amber-600 text-white hover:bg-amber-700'
                      : 'bg-green-600 text-white hover:bg-green-700'
                  }`}
                  title={`Importera ${csvData.rowCount} rader till ${getEffectiveRingsAndGroups().effectiveRings.length} ringar och ${getEffectiveRingsAndGroups().effectiveGroups.length} grupper`}
                >
                  <Check className="w-4 h-4" />
                  {aiSuggestions.suitabilityWarning?.severity === 'warning' 
                    ? `⚠️ Importera ändå (${csvData.rowCount})` 
                    : `Importera ${csvData.rowCount} aktiviteter`}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
