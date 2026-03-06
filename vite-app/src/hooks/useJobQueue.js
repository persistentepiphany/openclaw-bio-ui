/**
 * useJobQueue.js — Job submission + mock execution hook
 *
 * Provides:
 *   jobs           — array of job objects
 *   submitJob      — (toolId, config) → creates and runs mock job
 *   onJobComplete  — optional callback when a job finishes
 */

import { useState, useCallback, useRef, useEffect } from "react";

let jobCounter = 0;

export default function useJobQueue({ onJobComplete } = {}) {
  const [jobs, setJobs] = useState([]);
  const timersRef = useRef([]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => timersRef.current.forEach(clearTimeout);
  }, []);

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
        resultPdb: config.pdb || "1CRN",
        resultMode:
          toolId === "rfdiffusion"
            ? "trajectory"
            : toolId === "boltz2"
              ? "plddt"
              : "sequence",
      };

      setJobs((prev) => [newJob, ...prev]);

      // Simulate: queued → running after 500ms
      const t1 = setTimeout(() => {
        setJobs((prev) =>
          prev.map((j) => (j.id === id ? { ...j, status: "running" } : j))
        );

        // Progress increments every 500ms
        let progress = 0;
        const totalSteps = 10;
        const stepDelay = 500;

        for (let i = 1; i <= totalSteps; i++) {
          const t = setTimeout(() => {
            progress = Math.round((i / totalSteps) * 100);
            setJobs((prev) =>
              prev.map((j) => (j.id === id ? { ...j, progress } : j))
            );

            // Complete on last step
            if (i === totalSteps) {
              const completeTimer = setTimeout(() => {
                setJobs((prev) =>
                  prev.map((j) =>
                    j.id === id
                      ? { ...j, status: "complete", progress: 100, completedAt: Date.now() }
                      : j
                  )
                );
                onJobComplete?.({
                  id,
                  tool: toolId,
                  resultPdb: newJob.resultPdb,
                  resultMode: newJob.resultMode,
                });
              }, 300);
              timersRef.current.push(completeTimer);
            }
          }, stepDelay * i);
          timersRef.current.push(t);
        }
      }, 500);
      timersRef.current.push(t1);

      return id;
    },
    [onJobComplete]
  );

  return { jobs, submitJob };
}
