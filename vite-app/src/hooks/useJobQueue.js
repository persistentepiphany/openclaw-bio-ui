/**
 * useJobQueue.js — Job submission + execution hook
 *
 * In live mode:  submits jobs via runPipeline API and polls fetchPipelineStatus
 * In demo mode:  uses local setTimeout simulation
 *
 * Provides:
 *   jobs           — array of job objects
 *   submitJob      — (toolId, config) → creates and runs job
 *   onJobComplete  — optional callback when a job finishes
 */

import { useState, useCallback, useRef, useEffect } from "react";
import { runPipeline, fetchPipelineStatus } from "../api/client";

let jobCounter = 0;

export default function useJobQueue({ onJobComplete, dashboardMode } = {}) {
  const [jobs, setJobs] = useState([]);
  const timersRef = useRef([]);
  const pollRefs = useRef({});

  // Cleanup timers and pollers on unmount
  useEffect(() => {
    return () => {
      timersRef.current.forEach(clearTimeout);
      Object.values(pollRefs.current).forEach(clearInterval);
    };
  }, []);

  const updateJob = useCallback((id, updates) => {
    setJobs((prev) => prev.map((j) => (j.id === id ? { ...j, ...updates } : j)));
  }, []);

  /* ── Real API job submission ── */
  const submitRealJob = useCallback(
    async (id, toolId, config) => {
      updateJob(id, { status: "running", progress: 5 });

      try {
        const result = await runPipeline({
          mode: "real",
          target_pdb: config.pdb || undefined,
          tasks: [toolId],
          num_candidates: config.numCandidates || 1,
        });

        if (!result || !result.job_id) {
          updateJob(id, {
            status: "failed",
            error: "API returned no job ID",
            completedAt: Date.now(),
          });
          return;
        }

        updateJob(id, { apiJobId: result.job_id, progress: 10 });

        // Poll for status (30 min max to prevent orphaned intervals)
        const stepMap = { detect: 20, characterize: 40, design: 60, validate: 80, report: 95 };
        const pollStartTime = Date.now();
        const MAX_POLL_DURATION = 30 * 60 * 1000; // 30 minutes
        let lostContactCount = 0;

        pollRefs.current[id] = setInterval(async () => {
          // Timeout guard — stop polling after 30 minutes
          if (Date.now() - pollStartTime > MAX_POLL_DURATION) {
            clearInterval(pollRefs.current[id]);
            delete pollRefs.current[id];
            updateJob(id, {
              status: "failed",
              error: "Job timed out after 30 minutes",
              completedAt: Date.now(),
            });
            return;
          }

          const status = await fetchPipelineStatus(result.job_id);

          if (!status) {
            lostContactCount++;
            if (lostContactCount >= 5) {
              clearInterval(pollRefs.current[id]);
              delete pollRefs.current[id];
              updateJob(id, {
                status: "failed",
                error: "Lost contact with API",
                completedAt: Date.now(),
              });
            }
            return;
          }
          lostContactCount = 0;

          // Update progress from API step
          if (status.current_step && stepMap[status.current_step]) {
            updateJob(id, { progress: stepMap[status.current_step] });
          } else if (typeof status.progress === "number") {
            updateJob(id, { progress: Math.round(status.progress * 100) });
          }

          if (status.status === "complete" || status.status === "completed") {
            clearInterval(pollRefs.current[id]);
            delete pollRefs.current[id];

            updateJob(id, { status: "complete", progress: 100, completedAt: Date.now() });
            onJobComplete?.({
              id,
              tool: toolId,
              resultPdb: config.pdb || "1CRN",
              resultMode:
                toolId === "rfdiffusion"
                  ? "trajectory"
                  : toolId === "boltz2"
                    ? "plddt"
                    : "sequence",
            });
          }

          if (status.status === "failed" || status.status === "cancelled") {
            clearInterval(pollRefs.current[id]);
            delete pollRefs.current[id];

            updateJob(id, {
              status: "failed",
              error: status.error || `Job ${status.status}`,
              completedAt: Date.now(),
            });
          }
        }, 2000);
      } catch (err) {
        updateJob(id, {
          status: "failed",
          error: err.message || "API request failed",
          completedAt: Date.now(),
        });
      }
    },
    [updateJob, onJobComplete]
  );

  /* ── Mock job simulation ── */
  const submitMockJob = useCallback(
    (id, toolId, config) => {
      // Simulate: queued → running after 500ms
      const t1 = setTimeout(() => {
        updateJob(id, { status: "running" });

        let progress = 0;
        const totalSteps = 10;
        const stepDelay = 500;

        for (let i = 1; i <= totalSteps; i++) {
          const t = setTimeout(() => {
            progress = Math.round((i / totalSteps) * 100);
            updateJob(id, { progress });

            if (i === totalSteps) {
              const completeTimer = setTimeout(() => {
                updateJob(id, { status: "complete", progress: 100, completedAt: Date.now() });
                onJobComplete?.({
                  id,
                  tool: toolId,
                  resultPdb: config.pdb || "1CRN",
                  resultMode:
                    toolId === "rfdiffusion"
                      ? "trajectory"
                      : toolId === "boltz2"
                        ? "plddt"
                        : "sequence",
                });
              }, 300);
              timersRef.current.push(completeTimer);
            }
          }, stepDelay * i);
          timersRef.current.push(t);
        }
      }, 500);
      timersRef.current.push(t1);
    },
    [updateJob, onJobComplete]
  );

  const submitJob = useCallback(
    (toolId, config) => {
      const id = `job-${Date.now()}-${++jobCounter}`;
      const newJob = {
        id,
        tool: toolId,
        config,
        status: "queued",
        progress: 0,
        startedAt: Date.now(),
        completedAt: null,
        error: null,
        apiJobId: null,
        resultPdb: config.pdb || "1CRN",
        resultMode:
          toolId === "rfdiffusion"
            ? "trajectory"
            : toolId === "boltz2"
              ? "plddt"
              : "sequence",
      };

      setJobs((prev) => [newJob, ...prev]);

      if (dashboardMode === "live") {
        submitRealJob(id, toolId, config);
      } else {
        submitMockJob(id, toolId, config);
      }

      return id;
    },
    [dashboardMode, submitRealJob, submitMockJob]
  );

  return { jobs, submitJob };
}
