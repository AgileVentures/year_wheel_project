import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';

/**
 * Hook to subscribe to realtime import job progress updates
 * @param {string|null} jobId - The import job ID to track
 * @returns {object} Job status with progress, currentStep, error, etc.
 */
export function useImportProgress(jobId) {
  const [job, setJob] = useState(null);
  const [error, setError] = useState(null);
  const channelRef = useRef(null);

  useEffect(() => {
    if (!jobId) {
      setJob(null);
      return;
    }

    let isSubscribed = true;

    // Fetch initial job state
    const fetchInitialJob = async () => {
      try {
        const { data, error: fetchError } = await supabase
          .from('import_jobs')
          .select('*')
          .eq('id', jobId)
          .single();

        if (fetchError) throw fetchError;
        if (isSubscribed) {
          setJob(data);
        }
      } catch (err) {
        console.error('[useImportProgress] Failed to fetch job:', err);
        if (isSubscribed) {
          setError(err.message);
        }
      }
    };

    fetchInitialJob();

    // Subscribe to realtime updates
    const channel = supabase
      .channel(`import_job_${jobId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'import_jobs',
          filter: `id=eq.${jobId}`
        },
        (payload) => {
          console.log('[useImportProgress] Realtime update:', payload.new);
          if (isSubscribed) {
            setJob(payload.new);
          }
        }
      )
      .subscribe((status) => {
        console.log('[useImportProgress] Subscription status:', status);
      });

    channelRef.current = channel;

    // Cleanup
    return () => {
      isSubscribed = false;
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [jobId]);

  return {
    job,
    status: job?.status || 'pending',
    progress: job?.progress || 0,
    currentStep: job?.current_step || 'Väntar...',
    error: error || job?.error_message,
    isComplete: job?.status === 'completed',
    isFailed: job?.status === 'failed',
    stats: {
      totalItems: job?.total_items || 0,
      processedItems: job?.processed_items || 0,
      createdRings: job?.created_rings || 0,
      createdGroups: job?.created_groups || 0,
      createdLabels: job?.created_labels || 0,
      createdPages: job?.created_pages || 0,
      createdItems: job?.created_items || 0
    },
    canRetry: job?.status === 'failed' && !job?.error_message?.includes('avbruten')
  };
}
