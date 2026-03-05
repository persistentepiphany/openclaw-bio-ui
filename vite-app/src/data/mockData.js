/**
 * mockData.js — Central mock data for BioSentinel dashboard
 *
 * In production, this would be replaced by API calls.
 */

export const activityItems = [
  { source: "lab", message: "New data arrived from sequencer", time: "2m", location: "Site A" },
  { source: "sys", message: "Calibration check passed", time: "5m", location: null },
  { source: "lab", message: "Sample batch #47 queued", time: "12m", location: "Site B" },
  { source: "alert", message: "Anomaly detected in run 312", time: "18m", location: "Site A" },
  { source: "sys", message: "Model weights updated", time: "25m", location: null },
  { source: "lab", message: "Environmental sensors nominal", time: "31m", location: "Site C" },
  { source: "sys", message: "Backup completed", time: "45m", location: null },
  { source: "lab", message: "New reagent lot verified", time: "1h", location: "Site A" },
];

export const systemStatus = { status: "Idle", confidence: 85 };

export const dataItems = [
  { id: "ITEM001", score: 0.97, status: "pass" },
  { id: "ITEM002", score: 0.95, status: "pass" },
  { id: "ITEM003", score: 0.92, status: "pass" },
  { id: "ITEM004", score: 0.88, status: "pass" },
  { id: "ITEM005", score: 0.78, status: "warn" },
  { id: "ITEM006", score: 0.71, status: "pass" },
  { id: "ITEM007", score: 0.64, status: "warn" },
  { id: "ITEM008", score: 0.43, status: "warn" },
];

export const heatmapData = {
  conditions: ["Cond A", "Cond B", "Cond C", "Cond D"],
  items: ["001", "002", "003", "004", "005"],
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
 * Protein list for the MoleculeViewer dropdown.
 * pdbId is passed to MoleculeViewer.selectedMoleculeId.
 * The viewer fetches the PDB file from public/pdbs/ or RCSB.
 */
export const proteinList = [
  {
    pdbId: "1CRN",
    label: "Crambin",
    desc: "Small plant protein · 46 residues · α+β fold",
    organism: "Crambe hispanica",
    mw: "4.7 kDa",
  },
  {
    pdbId: "4HHB",
    label: "Hemoglobin",
    desc: "O₂ transport tetramer · α₂β₂ · 4 heme groups",
    organism: "Homo sapiens",
    mw: "64.5 kDa",
  },
  {
    pdbId: "1LYZ",
    label: "Lysozyme",
    desc: "Antimicrobial enzyme · 129 residues",
    organism: "Gallus gallus",
    mw: "14.3 kDa",
  },
  {
    pdbId: "1EMA",
    label: "GFP",
    desc: "Green fluorescent protein · β-barrel + chromophore",
    organism: "Aequorea victoria",
    mw: "26.9 kDa",
  },
  {
    pdbId: "4INS",
    label: "Insulin",
    desc: "Hormone dimer · A 21 + B 30 residues",
    organism: "Sus scrofa",
    mw: "5.8 kDa",
  },
];
