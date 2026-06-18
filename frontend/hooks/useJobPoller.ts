"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import type { BlueprintStatusResponse, JobStatus } from "@/types/analysis";

const TERMINAL: JobStatus[] = ["completed", "failed"];
const POLL_MS = 2_500;

interface UseJobPollerResult {
  status: BlueprintStatusResponse | null;
  isPolling: boolean;
  error: string | null;
  startPolling: (jobId: string) => void;
  stopPolling: () => void;
}

export function useJobPoller(): UseJobPollerResult {
  const [status, setStatus]     = useState<BlueprintStatusResponse | null>(null);
  const [isPolling, setPolling] = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const intervalRef             = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setPolling(false);
  }, []);

  const poll = useCallback(
    async (jobId: string) => {
      try {
        const data = await api.getJobStatus(jobId);
        setStatus(data);
        setError(null);
        if (TERMINAL.includes(data.status)) stopPolling();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Polling failed");
      }
    },
    [stopPolling]
  );

  const startPolling = useCallback(
    (jobId: string) => {
      stopPolling();
      setPolling(true);
      setError(null);
      poll(jobId);
      intervalRef.current = setInterval(() => poll(jobId), POLL_MS);
    },
    [poll, stopPolling]
  );

  useEffect(() => () => stopPolling(), [stopPolling]);

  return { status, isPolling, error, startPolling, stopPolling };
}
