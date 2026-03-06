/**
 * useFilteredIncidents.js — Filter incidents by severity toggles + date range.
 */

import { useMemo } from "react";

export default function useFilteredIncidents(incidents, { severities, dateRange }) {
  return useMemo(() => {
    return incidents.filter((inc) => {
      // Severity filter
      if (!severities[inc.severity]) return false;

      // Date range filter
      if (dateRange) {
        const ts = new Date(inc.timestamp).getTime();
        if (ts < dateRange[0] || ts > dateRange[1]) return false;
      }

      return true;
    });
  }, [incidents, severities, dateRange]);
}
