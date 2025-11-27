import { useState, useRef, useEffect } from 'react';
import { X, Upload, FileSpreadsheet, Sparkles, Check, AlertCircle, AlertTriangle, Users, Mail } from 'lucide-react';
import * as XLSX from 'xlsx';
import { useTranslation } from 'react-i18next';
import { supabase } from '../lib/supabase';
import { useImportProgress } from '../hooks/useImportProgress';
import { createPendingInvitation, sendTeamInvitation } from '../services/teamService';

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
  const { t } = useTranslation(['smartImport']);
  const [stage, setStage] = useState('upload'); // upload, analyzing, review, refining, importing, complete
  const [csvData, setCsvData] = useState(null);
  const [aiSuggestions, setAiSuggestions] = useState(null);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState(null);
  const [detectedPeople, setDetectedPeople] = useState([]);
  const [selectedPeople, setSelectedPeople] = useState(new Set());
  const [createTeam, setCreateTeam] = useState(false); // Whether to create a team
  const [teamName, setTeamName] = useState(''); // Team name if creating
  const [sendInvites, setSendInvites] = useState(true); // Whether to send email invitations immediately
  const teamCreatedRef = useRef(false); // Flag to prevent duplicate team creation
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
  
  // Progressive disclosure edit modes
  const [showColumnMapping, setShowColumnMapping] = useState(false);
  const [showRingsGroupsEditor, setShowRingsGroupsEditor] = useState(false);
  const [showDataPreview, setShowDataPreview] = useState(false);

  // Monitor import job completion
  useEffect(() => {
    if (!jobId) return;

    console.log('[SmartImport] Monitoring job:', jobId, 'status:', importJobProgress.status, 'progress:', importJobProgress.progress);

    if (importJobProgress.isComplete) {
      console.log('[SmartImport] Job completed:', importJobProgress.stats);
      
      // Create team and send invitations if requested (async)
      const finalizeImport = async () => {
        if (createTeam && selectedPeople.size > 0 && teamName.trim() && !teamCreatedRef.current) {
          teamCreatedRef.current = true; // Mark as created to prevent duplicates
          await handleTeamCreation();
        }
        
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
            inviteEmails: Array.from(selectedPeople).map(idx => detectedPeople[idx]?.email).filter(Boolean)
          });
        }

        setStage('complete');
        setProgress(null);
        setJobId(null);
        setIsBackgroundImport(false);
      };
      
      finalizeImport();
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
  }, [importJobProgress.isComplete, importJobProgress.isFailed, jobId, onImportComplete, selectedPeople, csvData, aiSuggestions, isBackgroundImport, createTeam, teamName, detectedPeople]);

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
      return t('importing.lessThanMinute');
    } else if (remaining < 120000) {
      return t('importing.aboutOneMinute');
    } else {
      const minutes = Math.ceil(remaining / 60000);
      return t('importing.aboutMinutes', { minutes });
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
    setProgress(t('importing.readingFile'));

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

      // Go directly to AI analysis
      setStage('analyzing');
      await analyzeWithAI(headers, rows);

    } catch (err) {
      console.error('[SmartImport] File upload error:', err);
      setError(err.message || 'Fel vid läsning av fil');
      setProgress(null);
    }
  };

  const analyzeWithAI = async (headers, rows) => {
    setProgress(t('importing.analyzingStructure'));

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
        activitiesCount: suggestions.activities?.length,
        totalActivitiesCount: suggestions.totalActivitiesCount // Total count (may be > activities.length for large imports)
      });
      
      // Store CSV rows for large import re-processing
      if (suggestions.totalActivitiesCount > suggestions.activities.length) {
        console.log(`[SmartImport] Large import detected: ${suggestions.totalActivitiesCount} total activities, only ${suggestions.activities.length} returned for preview`);
        // Store rows and headers for re-processing during import
        setAiSuggestions({ 
          ...suggestions, 
          csvRows: rows,
          csvHeaders: headers
        });
      } else {
        setAiSuggestions(suggestions);
      }
      
      setDetectedPeople(suggestions.detectedPeople || []);
      
      // Pre-select all people for invitation
      if (suggestions.detectedPeople && suggestions.detectedPeople.length > 0) {
        setSelectedPeople(new Set(suggestions.detectedPeople.map((_, idx) => idx)));
        setCreateTeam(true); // Auto-enable team creation if people found
        // Suggest team name from wheel title or CSV filename
        const suggestedName = suggestions.suggestedWheelTitle || csvData?.fileName?.replace(/\.(csv|xlsx|xls)$/i, '') || 'Mitt Team';
        setTeamName(suggestedName);
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
    setProgress(t('importing.preparingImport'));
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
      
      setProgress(t('importing.creatingStructure'));
      
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
      // For large imports where we only got a sample back, skip frontend processing
      // and send everything directly to batch-import-activities
      let itemsWithIds;
      
      if (effectiveSuggestions.csvRows && effectiveSuggestions.totalActivitiesCount > effectiveSuggestions.activities.length) {
        console.log(`[SmartImport] Large import detected: ${effectiveSuggestions.totalActivitiesCount} activities`);
        console.log('[SmartImport] Skipping frontend processing - will reprocess on server during import');
        
        // For large imports, we'll send the CSV rows + mapping to batch-import
        // The batch-import function will regenerate all activities server-side
        itemsWithIds = null; // Signal to use server-side reprocessing
        
      } else {
        // Normal flow: use activities from analyze response
        itemsWithIds = effectiveSuggestions.activities.map((activity, index) => {
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
      } // End of large import conditional

      
      console.log('[SmartImport] Generated structure:', {
        rings: ringsWithIds.length,
        groups: groupsWithIds.length,
        labels: labelsWithIds.length,
        items: itemsWithIds?.length || effectiveSuggestions.totalActivitiesCount,
        isLargeImport: itemsWithIds === null
      });
      
      // CRITICAL: Group items by year to create multi-year pages
      let pages;
      let totalItemCount;
      
      if (itemsWithIds === null) {
        // Large import: pages will be created server-side during batch-import
        console.log('[SmartImport] Large import - pages will be created server-side');
        pages = null; // Signal to batch-import to create pages from CSV
        totalItemCount = effectiveSuggestions.totalActivitiesCount;
      } else {
        // Normal flow: create pages from itemsWithIds
        const itemsByYear = {};
        itemsWithIds.forEach(item => {
          if (item.startDate && item.endDate) {
            const startYear = new Date(item.startDate).getFullYear();
            const endYear = new Date(item.endDate).getFullYear();
            
            console.log(`[SmartImport] Item: ${item.name}, Start: ${item.startDate} (${startYear}), End: ${item.endDate} (${endYear})`);
            
            if (startYear === endYear) {
              // Single year activity - add as-is
              if (!itemsByYear[startYear]) {
                itemsByYear[startYear] = [];
              }
              itemsByYear[startYear].push(item);
              console.log(`[SmartImport] → Single year activity, added to ${startYear}`);
            } else {
              // Multi-year activity - split into year segments
              console.log(`[SmartImport] → Splitting multi-year activity: ${item.name} (${startYear}-${endYear})`);
              
              for (let year = startYear; year <= endYear; year++) {
                if (!itemsByYear[year]) {
                  itemsByYear[year] = [];
                }
                
                // Calculate segment dates for this year
                const segmentStart = year === startYear 
                  ? item.startDate 
                  : `${year}-01-01`;
                
                const segmentEnd = year === endYear 
                  ? item.endDate 
                  : `${year}-12-31`;
                
                // Create a copy of the item for this year segment
                itemsByYear[year].push({
                  ...item,
                  startDate: segmentStart,
                  endDate: segmentEnd,
                  name: `${item.name}` // Keep original name
                });
                
                console.log(`[SmartImport] → Created segment for ${year}: ${segmentStart} to ${segmentEnd}`);
              }
            }
          } else {
            console.warn('[SmartImport] Item missing startDate or endDate:', item.name);
          }
        });
        
        // Sort years to create pages in chronological order
        const years = Object.keys(itemsByYear).map(Number).sort((a, b) => a - b);
        console.log('[SmartImport] Creating pages for years:', years);
        console.log('[SmartImport] Items per year:', years.map(y => ({ year: y, count: itemsByYear[y].length })));
        
        // Create a page for each year
        pages = years.map((year, index) => ({
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
        
        totalItemCount = itemsWithIds.length;
      }

      console.log('[SmartImport] Generated .yrw structure with', ringsWithIds.length, 'rings,', groupsWithIds.length, 'groups,', labelsWithIds.length, 'labels,', pages?.length || '(server-side)', 'pages,', totalItemCount, 'total items');

      // Show detailed progress for large imports
      const isLargeImport = totalItemCount > 200;
      if (isLargeImport) {
        setProgress(t('importing.preparingLargeImport', { count: totalItemCount }));
        await new Promise(resolve => setTimeout(resolve, 500)); // Brief pause to show message
      }
      
      // Use batch import Edge Function for performance
      setProgress(t('importing.savingActivities', { 
        count: totalItemCount, 
        email: isLargeImport ? t('importing.emailWhenComplete') : ''
      }));
      
      // Get user email for notification
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data: { session } } = await supabase.auth.getSession();
      
      // Build request payload
      const payload = {
        wheelId,
        importMode, // 'replace' or 'append'
        suggestedWheelTitle: aiSuggestions?.suggestedWheelTitle || null,
        structure: {
          rings: ringsWithIds,
          activityGroups: groupsWithIds,
          labels: labelsWithIds
        },
        notifyEmail: isLargeImport ? user?.email : null,
        fileName: csvData.fileName
      };
      
      // For large imports, send CSV data + mapping for server-side reprocessing
      if (itemsWithIds === null) {
        payload.csvData = {
          headers: effectiveSuggestions.csvHeaders || csvData.headers,
          rows: effectiveSuggestions.csvRows
        };
        payload.mapping = effectiveSuggestions.mapping;
      } else {
        // Normal flow: send pre-processed pages
        payload.pages = pages;
      }
      
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/batch-import-activities`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
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
        setProgress(t('importing.importStarted'));
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

  const handleTeamCreation = async () => {
    if (!createTeam || selectedPeople.size === 0 || !teamName.trim()) {
      console.log('[SmartImport] Skipping team creation - not requested or no team name');
      return;
    }

    try {
      console.log('[SmartImport] Creating team:', teamName, 'with', selectedPeople.size, 'members', sendInvites ? '(sending invites)' : '(preparing invites only)');
      
      // 1. Create the team
      const { data: { user } } = await supabase.auth.getUser();
      const { data: team, error: teamError } = await supabase
        .from('teams')
        .insert({
          name: teamName.trim(),
          description: `Team för Smart Import ${csvData?.fileName || ''}`,
          owner_id: user.id
        })
        .select()
        .single();

      if (teamError) throw teamError;
      console.log('[SmartImport] Team created:', team.id);

      // 2. Assign wheel to team
      const { error: wheelUpdateError } = await supabase
        .from('year_wheels')
        .update({ team_id: team.id })
        .eq('id', wheelId);

      if (wheelUpdateError) throw wheelUpdateError;
      console.log('[SmartImport] Wheel assigned to team');

      // 3. Prepare/send invitations - collect unique emails and names
      let invitesSent = 0;
      let pendingCreated = 0;

      console.log('[SmartImport] Selected people indices:', Array.from(selectedPeople));
      console.log('[SmartImport] Detected people array:', detectedPeople);

      // Deduplicate emails and names
      const uniqueEmails = new Set();
      const uniquePendingNames = new Set();

      for (const personIndex of Array.from(selectedPeople)) {
        const person = detectedPeople[personIndex];
        console.log('[SmartImport] Processing person at index', personIndex, ':', person);
        
        if (!person) {
          console.warn('[SmartImport] No person found at index', personIndex);
          continue;
        }
        
        if (person.email && sendInvites) {
          // Only send email invitations if sendInvites is enabled
          uniqueEmails.add(person.email.toLowerCase().trim());
        } else {
          // Always create pending invitation (either no email OR sendInvites disabled)
          uniquePendingNames.add(person.name.trim());
        }
      }

      // Send invitations for unique emails (only if sendInvites enabled)
      if (sendInvites) {
        for (const email of uniqueEmails) {
          await sendTeamInvitation(team.id, email);
          invitesSent++;
          console.log('[SmartImport] Sent invitation to:', email);
        }
      }

      // Create pending invitations for all names (either no email OR sendInvites disabled)
      for (const name of uniquePendingNames) {
        await createPendingInvitation(team.id, name);
        pendingCreated++;
        console.log('[SmartImport] Created pending invitation for:', name);
      }

      // Show success toast
      const message = sendInvites 
        ? t('teamSuccess.emailsSent', { sent: invitesSent, pending: pendingCreated })
        : t('teamSuccess.pendingOnly', { pending: pendingCreated });
      const event = new CustomEvent('showToast', {
        detail: {
          message,
          type: 'success'
        }
      });
      window.dispatchEvent(event);

    } catch (err) {
      console.error('[SmartImport] Team creation error:', err);
      // Non-blocking - show toast but don't fail the import
      const event = new CustomEvent('showToast', {
        detail: {
          message: t('errors.teamCreationError', { message: err.message }),
          type: 'error'
        }
      });
      window.dispatchEvent(event);
    }
  };

  const togglePersonSelection = (personIndex) => {
    setSelectedPeople(prevSelected => {
      const newSet = new Set(prevSelected);
      if (newSet.has(personIndex)) {
        newSet.delete(personIndex);
      } else {
        newSet.add(personIndex);
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
    teamCreatedRef.current = false; // Reset team creation flag
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
    
    const timeEstimate = estimateImportTime(csvData?.rowCount || 0);
    const isLargeImport = (csvData?.rowCount || 0) > 200;
    
    return (
      <div className="space-y-6">
        {/* Size Warning for Large Imports */}
        {isLargeImport && (
          <div className="bg-amber-50 border-2 border-amber-300 rounded-sm p-4">
            <div className="flex items-start gap-3">
              <Mail className="w-6 h-6 text-amber-600 flex-shrink-0" />
              <div>
                <h4 className="font-semibold text-amber-900 mb-1">Stor import ({csvData?.rowCount || 0} rader)</h4>
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
                <h3 className="font-semibold text-gray-900 mb-2">{t('review.importMode.heading')}</h3>
                <p className="text-sm text-gray-700 mb-4" dangerouslySetInnerHTML={{ __html: t('review.importMode.description', { rows: csvData?.rowCount || 0, fileName: csvData?.fileName || 'CSV-fil' }) }} />
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
                  <div className="font-medium text-gray-900">{t('review.importMode.replace.title')}</div>
                  <div className="text-sm text-gray-600 mt-1" dangerouslySetInnerHTML={{ __html: t('review.importMode.replace.description') }} />
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
                  <div className="font-medium text-gray-900">{t('review.importMode.append.title')}</div>
                  <div className="text-sm text-gray-600 mt-1">
                    {t('review.importMode.append.description')}
                  </div>
                </div>
              </label>
            </div>
            
            <div className="pt-4 border-t border-yellow-300">
              <p className="text-xs text-gray-500">
                {t('advancedMapping.tips.nextStep')}
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
          {t('buttons.back')}
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
          {t('upload.heading')}
        </h3>
        <p className="text-sm text-gray-500">
          {t('upload.description')}
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
          {t('upload.selectFile')}
        </button>
        <p className="mt-2 text-xs text-gray-500">
          {t('upload.acceptedFormats')}
        </p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-sm p-4">
        <div className="flex gap-3">
          <Sparkles className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800 space-y-2">
            <p className="font-medium">{t('upload.aiFeatures')}</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>{t('upload.features.identifyColumns')}</li>
              <li>{t('upload.features.createStructure')}</li>
              <li>{t('upload.features.mapActivities')}</li>
              <li>{t('upload.features.findPeople')}</li>
              <li>{t('upload.features.handleComments')}</li>
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
        {t('analyzing.heading')}
      </h3>
      <p className="text-sm text-gray-500">
        {progress || t('analyzing.progress')}
      </p>
      {csvData && (
        <div className="mt-4 text-xs text-gray-400">
          {t('analyzing.rowsAndColumns', { rows: csvData?.rowCount || 0, columns: csvData?.headers?.length || 0 })}
        </div>
      )}
    </div>
  );

  const renderReviewStage = () => {
    if (!aiSuggestions) return null;

    // Calculate validation status
    const hasValidationIssues = aiSuggestions.validation && 
      (!aiSuggestions.validation.hasCompleteMapping || aiSuggestions.validation.warnings?.length > 0);
    const hasErrors = aiSuggestions.suitabilityWarning?.severity === 'error' || !aiSuggestions.validation?.hasCompleteMapping;

    const { effectiveRings, effectiveGroups } = getEffectiveRingsAndGroups();

    return (
      <div className="space-y-6 max-h-[60vh] overflow-y-auto">
        {/* Suggested Wheel Title */}
        {aiSuggestions.suggestedWheelTitle && (
          <div className="bg-purple-50 border border-purple-200 rounded-sm p-4">
            <div className="flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-medium text-purple-900">{t('review.suggestedTitle')}</h4>
                <p className="text-lg font-semibold text-purple-900 mt-2">
                  "{aiSuggestions.suggestedWheelTitle}"
                </p>
                <p className="text-xs text-purple-700 mt-1">
                  {t('review.canChangeAfter')}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Summary Card - Progressive Disclosure */}
        <div className={`border rounded-sm p-4 ${hasErrors ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
          <div className="flex items-start gap-3">
            {hasErrors ? (
              <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            ) : (
              <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            )}
            <div className="flex-1">
              <h4 className={`font-semibold ${hasErrors ? 'text-red-900' : 'text-green-900'}`}>
                {hasErrors ? t('review.summary.actionNeeded') : t('review.summary.readyToImport')}
              </h4>
              <p className={`text-sm mt-1 ${hasErrors ? 'text-red-700' : 'text-green-700'}`}>
                {t('review.summary.quickStats', {
                  rings: effectiveRings.length,
                  groups: effectiveGroups.length,
                  activities: aiSuggestions.totalActivitiesCount || aiSuggestions.activities?.length || 0
                })}
              </p>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-2 mt-3">
                <button
                  onClick={() => setShowColumnMapping(!showColumnMapping)}
                  className="text-xs px-3 py-1.5 bg-white border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition-colors"
                >
                  {showColumnMapping ? t('review.summary.hideColumns') : t('review.summary.editColumns')}
                </button>
                <button
                  onClick={() => setShowRingsGroupsEditor(!showRingsGroupsEditor)}
                  className="text-xs px-3 py-1.5 bg-white border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition-colors"
                >
                  {showRingsGroupsEditor ? t('review.summary.hideRingsGroups') : t('review.summary.editRingsGroups')}
                </button>
                <button
                  onClick={() => setShowDataPreview(!showDataPreview)}
                  className="text-xs px-3 py-1.5 bg-white border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition-colors"
                >
                  {showDataPreview ? t('review.summary.hidePreview') : t('review.summary.viewPreview')}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Validation Warnings - Only show if there are issues */}
        {hasValidationIssues && (
          <div className="bg-red-50 border border-red-200 rounded-sm p-4">
            <h4 className="font-semibold text-red-900 mb-2 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              {t('validation.heading')}
            </h4>
            
            {!aiSuggestions.validation.hasCompleteMapping && (
              <div className="bg-red-100 border border-red-300 rounded p-3 mb-3">
                <p className="font-medium text-red-900">
                  {t('validation.incompleteMappingTitle')}
                </p>
                <p className="text-sm text-red-700 mt-1">
                  {t('validation.incompleteMappingDescription')}
                </p>
              </div>
            )}
            
            {aiSuggestions.validation.warnings?.map((warning, idx) => (
              <div key={idx} className="bg-yellow-50 border border-yellow-200 rounded p-2 mb-2">
                <p className="text-sm text-yellow-900">{warning}</p>
              </div>
            ))}
            
            {(aiSuggestions.validation.unmappedRingValues?.length > 0 || 
              aiSuggestions.validation.unmappedGroupValues?.length > 0) && (
              <div className="mt-3">
                <p className="font-medium text-red-800 mb-2">{t('validation.unmappedValues')}</p>
                
                {aiSuggestions.validation.unmappedRingValues?.length > 0 && (
                  <div className="mb-2">
                    <p className="text-sm font-medium text-red-700">{t('validation.rings')}</p>
                    <div className="text-xs text-red-600 ml-4">
                      {aiSuggestions.validation.unmappedRingValues.join(', ')}
                    </div>
                  </div>
                )}
                
                {aiSuggestions.validation.unmappedGroupValues?.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-red-700">{t('validation.activityGroups')}</p>
                    <div className="text-xs text-red-600 ml-4">
                      {aiSuggestions.validation.unmappedGroupValues.join(', ')}
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {aiSuggestions.validation.expectedActivityCount && (
              <div className="mt-3 p-2 bg-white rounded border border-red-200">
                <p className="text-sm text-red-900">
                  <span className="font-medium">{t('validation.expectedCount')}</span> {aiSuggestions.validation.expectedActivityCount}
                </p>
                <p className="text-sm text-red-900">
                  <span className="font-medium">{t('validation.importableCount')}</span> {aiSuggestions.activities?.length || 0}
                </p>
                {aiSuggestions.validation.expectedActivityCount > (aiSuggestions.activities?.length || 0) && (
                  <p className="text-sm font-medium text-red-800 mt-1">
                    {t('validation.willBeLost', { count: aiSuggestions.validation.expectedActivityCount - (aiSuggestions.activities?.length || 0) })}
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Data Suitability Warning - Only show if present */}
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
                                      if (!manualMapping.labels.includes(suggestion.filterColumn)) {
                                        setManualMapping(prev => ({
                                          ...prev,
                                          labels: [...prev.labels, suggestion.filterColumn]
                                        }));
                                      }
                                      setShowColumnMapping(true);
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
                          {t('advancedMapping.blockImportReason.heading')}
                        </p>
                        <p className="text-xs text-red-800" dangerouslySetInnerHTML={{ __html: t('advancedMapping.blockImportReason.description') }} />
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Column Mapping Section - Collapsible */}
        {showColumnMapping && csvData && (
          <div className="bg-blue-50 border border-blue-200 rounded-sm p-6 space-y-4">
            <div>
              <h3 className="font-semibold text-gray-900 mb-1">{t('advancedMapping.customizeColumnMapping')}</h3>
              <p className="text-sm text-gray-600">{t('advancedMapping.columnSelection')}</p>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              {/* Activity Name */}
              <div className="bg-white p-3 rounded-sm border border-gray-200">
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  {t('advancedMapping.activityName')} <span className="text-red-500">{t('advancedMapping.required')}</span>
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
                  <option value="">{t('advancedMapping.letAIChoose', { value: aiSuggestions.mapping.columns.activityName })}</option>
                  {csvData.headers.map((header, index) => (
                    <option key={index} value={header}>{header}</option>
                  ))}
                </select>
              </div>
              
              {/* Group */}
              <div className="bg-white p-3 rounded-sm border border-gray-200">
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  {t('advancedMapping.activityGroup')} <span className="text-red-500">{t('advancedMapping.required')}</span>
                </label>
                <select
                  value={manualMapping.group ?? ''}
                  onChange={(e) => setManualMapping(prev => ({ 
                    ...prev, 
                    group: e.target.value === '' ? null : e.target.value 
                  }))}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">{t('advancedMapping.letAIChoose', { value: aiSuggestions.mapping.columns.group || t('advancedMapping.letAIChooseNone').match(/\((.+)\)/)[1] })}</option>
                  {csvData.headers.map((header, index) => (
                    <option key={index} value={header}>{header}</option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">{t('advancedMapping.groupHelper')}</p>
              </div>
              
              {/* Start Date */}
              <div className="bg-white p-3 rounded-sm border border-gray-200">
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  {t('advancedMapping.startDate')} <span className="text-red-500">{t('advancedMapping.required')}</span>
                </label>
                <select
                  value={manualMapping.startDate ?? ''}
                  onChange={(e) => setManualMapping(prev => ({ 
                    ...prev, 
                    startDate: e.target.value === '' ? null : e.target.value 
                  }))}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">{t('advancedMapping.letAIChoose', { value: aiSuggestions.mapping.columns.startDate })}</option>
                  {csvData.headers.map((header, index) => (
                    <option key={index} value={header}>{header}</option>
                  ))}
                </select>
              </div>
              
              {/* End Date */}
              <div className="bg-white p-3 rounded-sm border border-gray-200">
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  {t('advancedMapping.endDate')}
                </label>
                <select
                  value={manualMapping.endDate ?? ''}
                  onChange={(e) => setManualMapping(prev => ({ 
                    ...prev, 
                    endDate: e.target.value === '' ? null : e.target.value 
                  }))}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">{t('advancedMapping.letAIChoose', { value: aiSuggestions.mapping.columns.endDate || aiSuggestions.mapping.columns.startDate })}</option>
                  {csvData.headers.map((header, index) => (
                    <option key={index} value={header}>{header}</option>
                  ))}
                </select>
              </div>
              
              {/* Ring Assignment */}
              <div className="bg-white p-3 rounded-sm border border-gray-200">
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  {t('advancedMapping.ring')}
                </label>
                <select
                  value={manualMapping.ring ?? ''}
                  onChange={(e) => setManualMapping(prev => ({ 
                    ...prev, 
                    ring: e.target.value === '' ? null : e.target.value 
                  }))}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">{aiSuggestions.mapping.columns.ring ? t('advancedMapping.letAIChoose', { value: aiSuggestions.mapping.columns.ring }) : t('advancedMapping.letAIChooseNone')}</option>
                  {csvData.headers.map((header, index) => (
                    <option key={index} value={header}>{header}</option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">{t('advancedMapping.ringHelper')}</p>
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
                  <option value="">{t('advancedMapping.letAIChoose', { value: aiSuggestions.mapping.columns.description || 'alla oanvända' })}</option>
                  {csvData.headers.map((header, index) => (
                    <option key={index} value={header}>{header}</option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">{t('advancedMapping.descriptionHelper')}</p>
              </div>
            </div>
            
            {/* Labels (Multi-select) */}
            <div className="bg-white p-3 rounded-sm border border-gray-200">
              <label className="block text-sm font-medium text-gray-900 mb-2">
                {t('advancedMapping.labels')}
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
              <p className="text-xs text-gray-500 mt-2">{t('advancedMapping.labelsHelper')}</p>
            </div>
          </div>
        )}

        {/* Rings & Groups Editor - Collapsible */}
        {showRingsGroupsEditor && (
          <div className="bg-purple-50 border border-purple-200 rounded-sm p-4 space-y-4">
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">{t('customization.heading')}</h3>
              <p className="text-sm text-gray-600">
                {customRings || customGroups ? (
                  <>{t('customization.current', { rings: effectiveRings.length, groups: effectiveGroups.length })}</>
                ) : (
                  <>{t('customization.suggested', { rings: aiSuggestions.rings.length, groups: aiSuggestions.activityGroups.length })}</>
                )}
                {effectiveGroups.length > 20 && (
                  <span className="text-amber-700 font-medium"> {t('customization.tooManyWarning', { count: effectiveGroups.length })}</span>
                )}
              </p>
            </div>
            
            {/* Custom Rings */}
            <div className="bg-white p-3 rounded-sm border border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <label className="font-medium text-gray-900">{t('customization.rings.label')}</label>
                  {customRings && ringOriginalNames && (
                    <p className="text-xs text-gray-500 mt-0.5">{t('customization.rings.editing')}</p>
                  )}
                </div>
                <button
                  onClick={() => {
                    if (customRings) {
                      setCustomRings(null);
                      setCustomRingTypes(null);
                      setRingOriginalNames(null);
                    } else {
                      setCustomRings(aiSuggestions.rings.map(r => r.name));
                      setCustomRingTypes(aiSuggestions.rings.map(r => r.type));
                      setRingOriginalNames(aiSuggestions.rings.map(r => r.name));
                    }
                  }}
                  className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded hover:bg-purple-200"
                >
                  {customRings ? t('customization.rings.resetToAI') : t('customization.rings.customize')}
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
                          title={t('advancedMapping.innerOuterTitle')}
                        >
                          <option value="inner">{t('customization.rings.inner')}</option>
                          <option value="outer">{t('customization.rings.outer')}</option>
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
                            {t('customization.rings.remove')}
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
                            setRingOriginalNames([...ringOriginalNames, null]);
                          }
                        }}
                        className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                      >
                        {t('customization.rings.addRing')}
                      </button>
                    )}
                    {customRings.length > 1 && (
                      <button
                        onClick={() => {
                          if (confirm(t('customization.rings.removeAllConfirm', { count: customRings.length }))) {
                            setCustomRings([customRings[0]]);
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
                  <label className="font-medium text-gray-900">{t('customization.groups.label')}</label>
                  {customGroups && groupOriginalNames && (
                    <p className="text-xs text-gray-500 mt-0.5">{t('customization.groups.editing')}</p>
                  )}
                </div>
                <button
                  onClick={() => {
                    if (customGroups) {
                      setCustomGroups(null);
                      setGroupOriginalNames(null);
                    } else {
                      setCustomGroups(aiSuggestions.activityGroups.map(g => g.name));
                      setGroupOriginalNames(aiSuggestions.activityGroups.map(g => g.name));
                    }
                  }}
                  className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded hover:bg-purple-200"
                >
                  {customGroups ? t('customization.groups.resetToAI') : t('customization.groups.customize')}
                </button>
              </div>
              
              {!customGroups ? (
                <div className="text-sm text-gray-600">
                  {t('customization.groups.summary', { count: aiSuggestions.activityGroups.length, names: aiSuggestions.activityGroups.slice(0, 5).map(g => g.name).join(', ') + (aiSuggestions.activityGroups.length > 5 ? '...' : '') })}
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
                        {t('customization.groups.remove')}
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() => {
                      setCustomGroups([...customGroups, `Grupp ${customGroups.length + 1}`]);
                      if (groupOriginalNames) {
                        setGroupOriginalNames([...groupOriginalNames, null]);
                      }
                    }}
                    className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                  >
                    {t('customization.groups.addGroup')}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Data Preview - Collapsible */}
        {showDataPreview && csvData && (aiSuggestions.mapping?.ringValueMapping || aiSuggestions.mapping?.groupValueMapping) && (() => {
          const ringColIndex = aiSuggestions.mapping?.columns?.ring 
            ? csvData.headers.indexOf(aiSuggestions.mapping.columns.ring)
            : -1;
          const groupColIndex = aiSuggestions.mapping?.columns?.group
            ? csvData.headers.indexOf(aiSuggestions.mapping.columns.group)
            : -1;
          
          return (
            <div className="bg-blue-50 border border-blue-200 rounded-sm p-4">
              <h4 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5" />
                {t('consolidation.heading')}
              </h4>
              
              {aiSuggestions.mapping?.ringValueMapping && ringColIndex >= 0 && (() => {
                const uniqueValues = Object.keys(aiSuggestions.mapping.ringValueMapping).length;
                const consolidatedCount = aiSuggestions.rings?.length || 0;
                return (
                  <div className="mb-4">
                    <h5 className="font-medium text-blue-800 mb-2">
                      {t('consolidation.rings', { unique: uniqueValues, consolidated: consolidatedCount })}
                    </h5>
                    <div className="space-y-2">
                      {aiSuggestions.rings?.map(ring => {
                        const mappedValues = Object.entries(aiSuggestions.mapping.ringValueMapping)
                          .filter(([_, target]) => target === ring.name)
                          .map(([source, _]) => source);
                        const count = mappedValues.reduce((sum, val) => 
                          sum + csvData.rows.filter(row => String(row[ringColIndex] || '') === val).length, 0
                        );
                        
                        if (mappedValues.length === 0) return null;
                        
                        return (
                          <div key={ring.id} className="bg-white rounded p-2">
                            <div className="font-medium text-gray-900">
                              {ring.name} <span className="text-sm text-gray-500">({t('consolidation.activities', { count })})</span>
                            </div>
                            <div className="text-xs text-gray-600 ml-4 mt-1">
                              ← {mappedValues.map(v => v === '' ? '(tom)' : v).join(', ')}
                            </div>
                          </div>
                        );
                      }).filter(Boolean)}
                    </div>
                  </div>
                );
              })()}
              
              {aiSuggestions.mapping?.groupValueMapping && groupColIndex >= 0 && (() => {
                const uniqueValues = Object.keys(aiSuggestions.mapping.groupValueMapping).length;
                const consolidatedCount = aiSuggestions.activityGroups?.length || 0;
                return (
                  <div>
                    <h5 className="font-medium text-blue-800 mb-2">
                      {t('consolidation.groups', { unique: uniqueValues, consolidated: consolidatedCount })}
                    </h5>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {aiSuggestions.activityGroups?.map(group => {
                        const mappedValues = Object.entries(aiSuggestions.mapping.groupValueMapping)
                          .filter(([_, target]) => target === group.name)
                          .map(([source, _]) => source);
                        const count = mappedValues.reduce((sum, val) => 
                          sum + csvData.rows.filter(row => String(row[groupColIndex] || '') === val).length, 0
                        );
                        
                        if (mappedValues.length === 0) return null;
                        
                        return (
                          <div key={group.id} className="bg-white rounded p-2">
                            <div className="font-medium text-gray-900 flex items-center gap-2">
                              <div className="w-4 h-4 rounded" style={{ backgroundColor: group.color }} />
                              {group.name} <span className="text-sm text-gray-500">({t('consolidation.activities', { count })})</span>
                            </div>
                            <div className="text-xs text-gray-600 ml-8 mt-1">
                              ← {mappedValues.slice(0, 10).map(v => v === '' ? '(tom)' : v).join(', ')}
                              {mappedValues.length > 10 && ` ... +${mappedValues.length - 10} fler`}
                            </div>
                          </div>
                        );
                      }).filter(Boolean)}
                    </div>
                  </div>
                );
              })()}
            </div>
          );
        })()}

        {/* Empty Value Status - Only show if there are empty values */}
        {csvData && (() => {
          const ringColIndex = aiSuggestions.mapping?.columns?.ring 
            ? csvData.headers.indexOf(aiSuggestions.mapping.columns.ring)
            : -1;
          const groupColIndex = aiSuggestions.mapping?.columns?.group
            ? csvData.headers.indexOf(aiSuggestions.mapping.columns.group)
            : -1;
          
          const emptyRingCount = ringColIndex >= 0 
            ? csvData.rows.filter(row => !row[ringColIndex] || String(row[ringColIndex]).trim() === '').length
            : 0;
          const emptyGroupCount = groupColIndex >= 0
            ? csvData.rows.filter(row => !row[groupColIndex] || String(row[groupColIndex]).trim() === '').length
            : 0;
          
          const ringFallback = aiSuggestions.mapping?.ringValueMapping?.[''] || 'Övrigt';
          const groupFallback = aiSuggestions.mapping?.groupValueMapping?.[''] || 'Allmänt';
          
          if (emptyRingCount === 0 && emptyGroupCount === 0) return null;
          
          return (
            <div className="bg-amber-50 border border-amber-200 rounded-sm p-4">
              <h5 className="font-medium text-amber-900 flex items-center gap-2 mb-2">
                <AlertCircle className="w-5 h-5" />
                Tomma värden upptäckta
              </h5>
              <ul className="text-sm text-amber-800 space-y-1">
                {emptyRingCount > 0 && (
                  <li>
                    {emptyRingCount} rader med tomt ringvärde → mappas till "{ringFallback}"
                  </li>
                )}
                {emptyGroupCount > 0 && (
                  <li>
                    {emptyGroupCount} rader med tomt gruppvärde → mappas till "{groupFallback}"
                  </li>
                )}
              </ul>
              <p className="text-xs text-amber-700 mt-2">
                ✅ Dessa {emptyRingCount + emptyGroupCount} rader kommer fortfarande att importeras.
              </p>
            </div>
          );
        })()}

        {/* Large Import Preview Notice */}
        {aiSuggestions.totalActivitiesCount > (aiSuggestions.activities?.length || 0) && (
          <div className="bg-blue-50 border border-blue-200 rounded-sm p-4">
            <h4 className="font-medium text-blue-900 mb-1">{t('review.dataPreview.title')}</h4>
            <p className="text-sm text-blue-800" dangerouslySetInnerHTML={{ __html: t('review.dataPreview.totalActivities', { total: aiSuggestions.totalActivitiesCount }) }} />
            <p className="text-sm text-blue-800 mt-1">
              {t('review.dataPreview.previewCount', { preview: aiSuggestions.activities?.length || 20 })}
            </p>
            <p className="text-sm text-blue-900 font-medium mt-2">
              {t('review.dataPreview.allWillImport', { total: aiSuggestions.totalActivitiesCount })}
            </p>
            {csvData.rowCount > 200 && (
              <p className="text-xs text-blue-700 mt-2">
                {t('review.dataPreview.timeEstimate', { time: csvData.rowCount < 500 ? '3-7 minuter' : csvData.rowCount < 1000 ? '7-15 minuter' : '> 15 minuter' })}
              </p>
            )}
          </div>
        )}

        {/* Import Mode Selection */}
        <div className="bg-gray-50 border border-gray-300 rounded-sm p-4">
          <div className="mb-3">
            <h4 className="font-semibold text-gray-900 mb-1">{t('review.importMode.heading')}</h4>
            <p className="text-sm text-gray-600" dangerouslySetInnerHTML={{ __html: t('review.importMode.description', { rows: csvData?.rowCount || 0, fileName: csvData?.fileName || 'CSV' }) }} />
            <p className="text-sm text-gray-600 mt-1" dangerouslySetInnerHTML={{ __html: t('review.importMode.willCreate', { rings: effectiveRings.length, groups: effectiveGroups.length, activities: aiSuggestions.totalActivitiesCount || aiSuggestions.activities?.length || 0 }) }} />
          </div>
          
          <div className="space-y-3">
            <label className="flex items-start gap-3 p-3 bg-white border-2 border-gray-200 rounded-sm cursor-pointer hover:border-blue-400 transition-colors">
              <input
                type="radio"
                name="importMode"
                value="replace"
                checked={importMode === 'replace'}
                onChange={(e) => setImportMode(e.target.value)}
                className="mt-0.5"
              />
              <div className="flex-1">
                <div className="font-medium text-gray-900">{t('review.importMode.replace.title')}</div>
                <div className="text-sm text-gray-600 mt-1" dangerouslySetInnerHTML={{ __html: t('review.importMode.replace.description') }} />
              </div>
            </label>
            
            <label className="flex items-start gap-3 p-3 bg-white border-2 border-gray-200 rounded-sm cursor-pointer hover:border-blue-400 transition-colors">
              <input
                type="radio"
                name="importMode"
                value="append"
                checked={importMode === 'append'}
                onChange={(e) => setImportMode(e.target.value)}
                className="mt-0.5"
              />
              <div className="flex-1">
                <div className="font-medium text-gray-900">{t('review.importMode.append.title')}</div>
                <div className="text-sm text-gray-600 mt-1">
                  {t('review.importMode.append.description')}
                </div>
              </div>
            </label>
          </div>
        </div>
      </div>
    );
  };
  const renderImportingStage = () => (
    <div className="text-center py-12">
      <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4 animate-pulse">
        <Sparkles className="w-8 h-8 text-blue-600" />
      </div>
      <h3 className="text-lg font-medium text-gray-900 mb-2">
        {t('importing.heading')}
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
          <span>{t('importing.progress', { percent: jobId && importJobProgress?.progress ? importJobProgress.progress : 0 })}</span>
          <span>
            {jobId && importJobProgress?.stats ? 
              t('importing.itemsProgress', { processed: importJobProgress.stats.processedItems || 0, total: importJobProgress.stats.totalItems || 0 }) :
              t('importing.itemsProgress', { processed: 0, total: 0 })
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
        {jobId && importJobProgress?.currentStep ? importJobProgress.currentStep : (progress || t('importing.creatingStructure'))}
      </p>

      {/* Stats preview */}
      {jobId && importJobProgress?.stats && (
        <div className="mt-6 grid grid-cols-2 gap-4 text-xs text-gray-600 max-w-sm mx-auto">
          {importJobProgress.stats.createdRings > 0 && (
            <div>{t('importing.createdRings', { count: importJobProgress.stats.createdRings })}</div>
          )}
          {importJobProgress.stats.createdGroups > 0 && (
            <div>{t('importing.createdGroups', { count: importJobProgress.stats.createdGroups })}</div>
          )}
          {importJobProgress.stats.createdLabels > 0 && (
            <div>{t('importing.createdLabels', { count: importJobProgress.stats.createdLabels })}</div>
          )}
          {importJobProgress.stats.createdPages > 0 && (
            <div>{t('importing.createdPages', { count: importJobProgress.stats.createdPages })}</div>
          )}
        </div>
      )}
      
      {/* Cancel and background buttons */}
      <div className="flex gap-3 justify-center mt-6">
        <button
          onClick={handleCancelImport}
          className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-sm hover:bg-gray-50"
        >
          {t('importing.cancelImport')}
        </button>
        <button
          onClick={handleCloseWithBackground}
          className="px-4 py-2 text-sm text-blue-600 bg-blue-50 border border-blue-200 rounded-sm hover:bg-blue-100"
        >
          {t('importing.continueBackground')}
        </button>
      </div>
    </div>
  );

  const renderCompleteStage = () => {
    const droppedActivities = importJobProgress?.stats?.droppedActivities || [];
    const validationWarnings = importJobProgress?.stats?.validationWarnings || [];
    
    return (
      <div className="text-center py-12">
        <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
          <Check className="w-8 h-8 text-green-600" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          {t('complete.heading')}
        </h3>
        <p className="text-sm text-gray-500">
          {t('complete.description')}
        </p>
        {createTeam && selectedPeople.size > 0 && (
          <p className="text-xs text-blue-600 mt-2">
            {t('complete.teamCreated', { teamName, count: selectedPeople.size })}
          </p>
        )}
        
        {/* Show dropped activities if any */}
        {droppedActivities.length > 0 && (
          <div className="mt-6 max-w-md mx-auto">
            <div className="bg-yellow-50 border border-yellow-200 rounded-sm p-4 text-left">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="w-5 h-5 text-yellow-600" />
                <h4 className="font-semibold text-yellow-900">
                  {t('complete.droppedActivities.heading', { count: droppedActivities.length })}
                </h4>
              </div>
              
              <div className="max-h-48 overflow-y-auto space-y-2">
                {droppedActivities.map((dropped, idx) => (
                  <div key={idx} className="bg-white border border-yellow-200 rounded p-2 text-sm">
                    <p className="font-medium text-gray-900">
                      {t('complete.droppedActivities.row', { index: dropped.index, name: dropped.name })}
                    </p>
                    <p className="text-xs text-yellow-700 mt-1">
                      {dropped.reason}
                    </p>
                  </div>
                ))}
              </div>
              
              <p className="text-xs text-yellow-700 mt-3">
                {t('complete.droppedActivities.tip')}
              </p>
            </div>
          </div>
        )}
        
        {/* Show validation warnings if any */}
        {validationWarnings.length > 0 && droppedActivities.length === 0 && (
          <div className="mt-6 max-w-md mx-auto">
            <div className="bg-blue-50 border border-blue-200 rounded-sm p-3 text-left">
              <p className="text-sm text-blue-900">
                ℹ️ {validationWarnings.join(', ')}
              </p>
            </div>
          </div>
        )}
        
        <button
          onClick={handleClose}
          className="mt-6 px-4 py-2 bg-blue-600 text-white rounded-sm hover:bg-blue-700"
        >
          {t('complete.close')}
        </button>
      </div>
    );
  };

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
              <h2 className="text-xl font-semibold text-gray-900">{t('title')}</h2>
              <p className="text-xs text-gray-500">{t('subtitle')}</p>
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
                    <p className="font-medium">{t('errors.heading')}</p>
                    <p>{error}</p>
                  </div>
                  {importJobProgress.canRetry && stage === 'review' && (
                    <button
                      onClick={handleImport}
                      className="mt-3 px-3 py-1.5 text-sm bg-red-600 text-white rounded-sm hover:bg-red-700"
                    >
                      {t('errors.tryAgain')}
                    </button>
                  )}
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
                    title={t('advancedMapping.blockedTitle')}
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
