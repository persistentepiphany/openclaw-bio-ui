/**
 * mockData.js — Central mock data for BioSentinel dashboard
 *
 * In production these would be replaced by API calls.
 */

/* ── Threat Feed ── */
export const feedItems = [
  { sourceType: "twitter", message: "Novel CRISPR variant discussed in preprint thread", confidence: 87, timestamp: "2m ago", time: "14:32" },
  { sourceType: "rss", message: "WHO alert: H5N1 clade 2.3.4.4b in dairy cattle", confidence: 94, timestamp: "5m ago", time: "14:29" },
  { sourceType: "lab", message: "Sequencing data received from Site Alpha", confidence: 100, timestamp: "8m ago", time: "14:26" },
  { sourceType: "alert", message: "Unexpected mutation in sample run #312", confidence: 76, timestamp: "12m ago", time: "14:22" },
  { sourceType: "system", message: "ML model retrained — accuracy +1.2%", confidence: 100, timestamp: "18m ago", time: "14:16" },
  { sourceType: "twitter", message: "Gain-of-function concerns raised by research lab", confidence: 62, timestamp: "25m ago", time: "14:09" },
  { sourceType: "rss", message: "CDC weekly biosurveillance digest published", confidence: 91, timestamp: "31m ago", time: "14:03" },
  { sourceType: "lab", message: "Environmental sensors nominal — all sites", confidence: 100, timestamp: "45m ago", time: "13:49" },
  { sourceType: "system", message: "Automated backup completed", confidence: 100, timestamp: "1h ago", time: "13:34" },
  { sourceType: "alert", message: "Elevated signal in wastewater sample WS-47", confidence: 71, timestamp: "1.5h ago", time: "13:04" },
];

export const systemStatus = { status: "Monitoring", confidence: 92 };

/* ── Candidates ── */
export const candidates = [
  { id: "CLW-0117", name: "Zanamivir-R", score: 0.97, target: "NA", status: "pass", pdb: "6VMZ" },
  { id: "CLW-0234", name: "Baloxavir-M", score: 0.95, target: "PA", status: "pass", pdb: "4HHB" },
  { id: "CLW-0089", name: "Favipiravir-D", score: 0.92, target: "RdRp", status: "pass", pdb: "1LYZ" },
  { id: "CLW-0412", name: "Oseltamivir-X", score: 0.88, target: "NA", status: "pass", pdb: "6VMZ" },
  { id: "CLW-0156", name: "Laninamivir-K", score: 0.78, target: "NA", status: "warn", pdb: "1EMA" },
  { id: "CLW-0298", name: "Pimodivir-Q", score: 0.71, target: "PB2", status: "pass", pdb: "4INS" },
  { id: "CLW-0371", name: "Compound-7G", score: 0.64, target: "HA", status: "warn", pdb: "1CRN" },
  { id: "CLW-0445", name: "Umifenovir-S", score: 0.43, target: "HA", status: "warn", pdb: "4HHB" },
];

/* ── Heatmap (cross-variant interaction matrix) ── */
export const heatmapData = {
  variants: ["WT", "D198N", "H275Y", "R292K"],
  items: ["0117", "0234", "0089", "0412", "0156"],
  matrix: [
    [0.92, 0.45, 0.88, 0.73],
    [0.78, 0.95, 0.32, 0.61],
    [0.64, 0.71, 0.83, 0.90],
    [0.33, 0.58, 0.91, 0.44],
    [0.87, 0.29, 0.76, 0.82],
  ],
};

/* ── Pipeline ── */
export const pipelineSteps = ["Detect", "Characterize", "Design", "Validate", "Report"];
export const initialStep = 2;

/**
 * Generate slightly randomised data to simulate a fresh pipeline run.
 */
export function generateFreshData() {
  const items = candidates.map((d) => {
    const s = Math.min(0.99, Math.max(0.15, d.score + (Math.random() - 0.5) * 0.18));
    const rounded = Math.round(s * 100) / 100;
    return { ...d, score: rounded, status: rounded >= 0.65 ? "pass" : "warn" };
  });
  items.sort((a, b) => b.score - a.score);

  const matrix = heatmapData.matrix.map((row) =>
    row.map((v) => {
      const nv = Math.min(0.99, Math.max(0.05, v + (Math.random() - 0.5) * 0.25));
      return Math.round(nv * 100) / 100;
    })
  );

  return { candidates: items, heatmap: { ...heatmapData, matrix } };
}

/* ── Protein list (for MoleculeViewer dropdown) ── */
export const proteinList = [
  { pdbId: "1CRN", label: "Crambin", desc: "Small plant protein \u00b7 46 residues \u00b7 \u03b1+\u03b2 fold", organism: "Crambe hispanica", mw: "4.7 kDa" },
  { pdbId: "4HHB", label: "Hemoglobin", desc: "O\u2082 transport tetramer \u00b7 \u03b1\u2082\u03b2\u2082 \u00b7 4 heme groups", organism: "Homo sapiens", mw: "64.5 kDa" },
  { pdbId: "1LYZ", label: "Lysozyme", desc: "Antimicrobial enzyme \u00b7 129 residues", organism: "Gallus gallus", mw: "14.3 kDa" },
  { pdbId: "1EMA", label: "GFP", desc: "Green fluorescent protein \u00b7 \u03b2-barrel + chromophore", organism: "Aequorea victoria", mw: "26.9 kDa" },
  { pdbId: "4INS", label: "Insulin", desc: "Hormone dimer \u00b7 A 21 + B 30 residues", organism: "Sus scrofa", mw: "5.8 kDa" },
  { pdbId: "6VMZ", label: "SARS-CoV-2 Mpro", desc: "Main protease \u00b7 306 residues \u00b7 cysteine protease", organism: "SARS-CoV-2", mw: "33.8 kDa" },
];
