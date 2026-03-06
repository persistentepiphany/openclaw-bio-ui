/**
 * mockData.js — Central mock data for BioSentinel dashboard
 *
 * In production, this would be replaced by API calls.
 */

export const activityItems = [
  { source: "twitter", message: "Novel CRISPR variant discussed in preprint thread", time: "2m ago", timestamp: "14:32", confidence: 87 },
  { source: "rss", message: "WHO alert: H5N1 clade 2.3.4.4b in dairy cattle", time: "5m ago", timestamp: "14:29", confidence: 94 },
  { source: "lab", message: "Sequencing data received from Site Alpha", time: "8m ago", timestamp: "14:26", confidence: 100 },
  { source: "alert", message: "Unexpected mutation in sample run #312", time: "12m ago", timestamp: "14:22", confidence: 76 },
  { source: "sys", message: "ML model retrained — accuracy +1.2%", time: "18m ago", timestamp: "14:16", confidence: 100 },
  { source: "twitter", message: "Gain-of-function concerns raised by research lab", time: "25m ago", timestamp: "14:09", confidence: 62 },
  { source: "rss", message: "CDC weekly biosurveillance digest published", time: "31m ago", timestamp: "14:03", confidence: 91 },
  { source: "lab", message: "Environmental sensors nominal — all sites", time: "45m ago", timestamp: "13:49", confidence: 100 },
  { source: "sys", message: "Automated backup completed", time: "1h ago", timestamp: "13:34", confidence: 100 },
  { source: "alert", message: "Elevated signal in wastewater sample WS-47", time: "1.5h ago", timestamp: "13:04", confidence: 71 },
];

export const systemStatus = { status: "Monitoring", confidence: 92 };

export const dataItems = [
  { id: "CLW-0117", name: "Zanamivir-R", score: 0.97, status: "pass", target: "NA" },
  { id: "CLW-0234", name: "Baloxavir-M", score: 0.95, status: "pass", target: "PA" },
  { id: "CLW-0089", name: "Favipiravir-D", score: 0.92, status: "pass", target: "RdRp" },
  { id: "CLW-0412", name: "Oseltamivir-X", score: 0.88, status: "pass", target: "NA" },
  { id: "CLW-0156", name: "Laninamivir-K", score: 0.78, status: "warn", target: "NA" },
  { id: "CLW-0298", name: "Pimodivir-Q", score: 0.71, status: "pass", target: "PB2" },
  { id: "CLW-0371", name: "Compound-7G", score: 0.64, status: "warn", target: "HA" },
  { id: "CLW-0445", name: "Umifenovir-S", score: 0.43, status: "warn", target: "HA" },
];

export const heatmapData = {
  conditions: ["WT", "D198N", "H275Y", "R292K"],
  items: ["0117", "0234", "0089", "0412", "0156"],
  matrix: [
    [0.92, 0.45, 0.88, 0.73],
    [0.78, 0.95, 0.32, 0.61],
    [0.64, 0.71, 0.83, 0.90],
    [0.33, 0.58, 0.91, 0.44],
    [0.87, 0.29, 0.76, 0.82],
  ],
};

export const workflowSteps = ["Ingest", "Validate", "Analyze", "Score", "Report"];
export const initialStep = 2;

/**
 * Generate slightly randomized data simulating a fresh pipeline run.
 */
export function generateFreshData() {
  const items = dataItems.map((d) => {
    const newScore = Math.min(0.99, Math.max(0.15, d.score + (Math.random() - 0.5) * 0.18));
    const rounded = Math.round(newScore * 100) / 100;
    return {
      ...d,
      score: rounded,
      status: rounded >= 0.65 ? "pass" : "warn",
    };
  });
  items.sort((a, b) => b.score - a.score);

  const matrix = heatmapData.matrix.map((row) =>
    row.map((v) => {
      const nv = Math.min(0.99, Math.max(0.05, v + (Math.random() - 0.5) * 0.25));
      return Math.round(nv * 100) / 100;
    })
  );

  return {
    items,
    heatmap: { ...heatmapData, matrix },
  };
}

/**
 * Protein list for the MoleculeViewer dropdown.
 */
export const proteinList = [
  {
    pdbId: "1CRN",
    label: "Crambin",
    desc: "Small plant protein \u00b7 46 residues \u00b7 \u03b1+\u03b2 fold",
    organism: "Crambe hispanica",
    mw: "4.7 kDa",
  },
  {
    pdbId: "4HHB",
    label: "Hemoglobin",
    desc: "O\u2082 transport tetramer \u00b7 \u03b1\u2082\u03b2\u2082 \u00b7 4 heme groups",
    organism: "Homo sapiens",
    mw: "64.5 kDa",
  },
  {
    pdbId: "1LYZ",
    label: "Lysozyme",
    desc: "Antimicrobial enzyme \u00b7 129 residues",
    organism: "Gallus gallus",
    mw: "14.3 kDa",
  },
  {
    pdbId: "1EMA",
    label: "GFP",
    desc: "Green fluorescent protein \u00b7 \u03b2-barrel + chromophore",
    organism: "Aequorea victoria",
    mw: "26.9 kDa",
  },
  {
    pdbId: "4INS",
    label: "Insulin",
    desc: "Hormone dimer \u00b7 A 21 + B 30 residues",
    organism: "Sus scrofa",
    mw: "5.8 kDa",
  },
];
