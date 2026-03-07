/**
 * useProteinDiscovery.js — State hook for the protein discovery flow.
 *
 * Manages suggested proteins (from scraper reports + server API)
 * and selected proteins (user-approved for pipeline use).
 */
import { useState, useCallback } from "react";
import { extractProteinsFromReport, normalizeApiProtein } from "../utils/pathogenProteinMap";
import { fetchProteinList } from "../api/client";

export default function useProteinDiscovery() {
  const [selectedProteins, setSelectedProteins] = useState([]);
  const [suggestedProteins, setSuggestedProteins] = useState([]);

  /**
   * Feed a scraper report into extraction — produces protein suggestions.
   */
  const processReport = useCallback((report) => {
    const extracted = extractProteinsFromReport(report);
    if (extracted.length === 0) return;

    setSuggestedProteins((prev) => {
      const existing = new Set(prev.map((p) => p.pdbId));
      const novel = extracted.filter((p) => !existing.has(p.pdbId));
      return novel.length > 0 ? [...prev, ...novel] : prev;
    });
  }, []);

  /**
   * Move suggestions → selected (deduped).
   */
  const addProteins = useCallback((proteins) => {
    setSelectedProteins((prev) => {
      const existing = new Set(prev.map((p) => p.pdbId));
      const novel = proteins.filter((p) => !existing.has(p.pdbId));
      return novel.length > 0 ? [...prev, ...novel] : prev;
    });
  }, []);

  /**
   * Remove a protein from selected list.
   */
  const removeProtein = useCallback((pdbId) => {
    setSelectedProteins((prev) => prev.filter((p) => p.pdbId !== pdbId));
  }, []);

  /**
   * Fetch server protein catalog and merge into suggestions.
   */
  const fetchServerProteins = useCallback(async () => {
    const apiList = await fetchProteinList();
    if (!apiList || !Array.isArray(apiList)) return;

    const normalized = apiList.map(normalizeApiProtein);
    setSuggestedProteins((prev) => {
      const existing = new Set(prev.map((p) => p.pdbId));
      const novel = normalized
        .filter((p) => !existing.has(p.pdbId))
        .map((p) => ({ ...p, source: "server" }));
      return novel.length > 0 ? [...prev, ...novel] : prev;
    });
  }, []);

  /**
   * Reset state — used on mode switch.
   */
  const reset = useCallback((initialProteins = []) => {
    setSelectedProteins(initialProteins);
    setSuggestedProteins([]);
  }, []);

  return {
    selectedProteins,
    suggestedProteins,
    hasSuggestions: suggestedProteins.length > 0,
    processReport,
    addProteins,
    removeProtein,
    fetchServerProteins,
    reset,
  };
}
