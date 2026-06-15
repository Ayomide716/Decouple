"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { AnalysisJobDetail, JobStatus } from "@/types/analysis";

const TERMINAL_STATUSES: JobStatus[] = ["completed", "failed"];
const POLL_INTERVAL_MS = 2_500;

interface UseJobPollerResult {
  job: AnalysisJobDetail | null;
  isPolling: boolean;
  error: string | null;
  startPolling: (jobId: string) => void;
  stopPolling: () => void;
}

export function useJobPoller(): UseJobPollerResult {
  const [job, setJob] = useState<AnalysisJobDetail | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const jobIdRef = useRef<string | null>(null);

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsPolling(false);
  }, []);

  const fetchJob = useCallback(async (jobId: string) => {
    try {
      const res = await fetch(`/api/v1/analysis/${jobId}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: AnalysisJobDetail = await res.json();
      setJob(data);
      setError(null);
      if (TERMINAL_STATUSES.includes(data.status)) {
        stopPolling();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Polling failed");
    }
  }, [stopPolling]);

  const startPolling = useCallback(
    (jobId: string) => {
      stopPolling();
      jobIdRef.current = jobId;
      setIsPolling(true);
      setError(null);
      fetchJob(jobId);
      intervalRef.current = setInterval(() => {
        fetchJob(jobId);
      }, POLL_INTERVAL_MS);
    },
    [fetchJob, stopPolling]
  );

  useEffect(() => () => stopPolling(), [stopPolling]);

  return { job, isPolling, error, startPolling, stopPolling };
}
