/**
 * mockDesignData.js — Mock data + generators for protein design tools
 *
 * Provides pLDDT, PAE, trajectory, sequence design data and job management.
 */

/* ── pLDDT: per-residue confidence ── */
export function generateMockPlddt(residueCount) {
  const results = [];
  for (let i = 1; i <= residueCount; i++) {
    const frac = i / residueCount;
    let plddt;
    // Helical cores: high confidence
    if (frac > 0.15 && frac < 0.4) plddt = 88 + Math.random() * 9;
    else if (frac > 0.55 && frac < 0.8) plddt = 85 + Math.random() * 12;
    // Loops: medium confidence
    else if (frac > 0.4 && frac < 0.55) plddt = 65 + Math.random() * 20;
    // Termini: lower confidence
    else plddt = 50 + Math.random() * 25;
    results.push({ resNum: i, chain: "A", plddt: Math.min(100, plddt) });
  }
  return results;
}

/* ── PAE: NxN predicted aligned error matrix ── */
export function generateMockPae(residueCount) {
  const matrix = [];
  // Define two "domains"
  const domainBoundary = Math.floor(residueCount * 0.55);
  for (let i = 0; i < residueCount; i++) {
    const row = [];
    for (let j = 0; j < residueCount; j++) {
      const dist = Math.abs(i - j);
      const sameDomain =
        (i < domainBoundary && j < domainBoundary) ||
        (i >= domainBoundary && j >= domainBoundary);
      let val;
      if (dist === 0) val = 0.2 + Math.random() * 1.5;
      else if (dist < 5) val = 1 + Math.random() * 3;
      else if (sameDomain) val = 2 + Math.random() * 6;
      else val = 10 + Math.random() * 15;
      row.push(Math.round(val * 10) / 10);
    }
    matrix.push(row);
  }
  return matrix;
}

/* ── Trajectory: generate perturbed PDB frames ── */
export function generateMockTrajectory(pdbText, numFrames = 20) {
  const frames = [pdbText];
  const displacements = [[]];

  // Parse ATOM lines to get coordinates
  const atomLines = pdbText.split("\n").filter((l) => l.startsWith("ATOM"));
  const baseCoords = atomLines.map((l) => ({
    x: parseFloat(l.substring(30, 38)),
    y: parseFloat(l.substring(38, 46)),
    z: parseFloat(l.substring(46, 54)),
  }));

  for (let f = 1; f < numFrames; f++) {
    const noiseScale = (1 - f / numFrames) * 3.0; // decreasing noise (diffusion converging)
    const frameDisp = [];
    let pdbLines = pdbText.split("\n");
    let atomIdx = 0;

    pdbLines = pdbLines.map((line) => {
      if (!line.startsWith("ATOM")) return line;
      const base = baseCoords[atomIdx];
      if (!base) { atomIdx++; return line; }

      const dx = (Math.random() - 0.5) * noiseScale;
      const dy = (Math.random() - 0.5) * noiseScale;
      const dz = (Math.random() - 0.5) * noiseScale;
      const disp = Math.sqrt(dx * dx + dy * dy + dz * dz);
      frameDisp.push(disp);

      const nx = (base.x + dx).toFixed(3).padStart(8);
      const ny = (base.y + dy).toFixed(3).padStart(8);
      const nz = (base.z + dz).toFixed(3).padStart(8);

      const newLine = line.substring(0, 30) + nx + ny + nz + line.substring(54);
      atomIdx++;
      return newLine;
    });

    frames.push(pdbLines.join("\n"));
    displacements.push(frameDisp);
  }

  return { frames, displacements };
}

/* ── Sequence design: ~30% designed residues with confidence ── */
const AA_CODES = "ACDEFGHIKLMNPQRSTVWY";

export function generateMockSequenceDesign(residueCount) {
  const residues = [];
  let designedCount = 0;
  let totalConf = 0;

  for (let i = 1; i <= residueCount; i++) {
    const isDesigned = Math.random() < 0.3;
    const original = AA_CODES[Math.floor(Math.random() * AA_CODES.length)];
    const designed = isDesigned
      ? AA_CODES[Math.floor(Math.random() * AA_CODES.length)]
      : original;
    const confidence = isDesigned
      ? 0.5 + Math.random() * 0.5
      : 0.85 + Math.random() * 0.15;

    if (isDesigned) designedCount++;
    totalConf += confidence;

    residues.push({
      resNum: i,
      chain: "A",
      original,
      designed,
      isDesigned,
      confidence: Math.round(confidence * 100) / 100,
    });
  }

  return {
    residues,
    stats: {
      totalResidues: residueCount,
      designedResidues: designedCount,
      conservedResidues: residueCount - designedCount,
      avgConfidence: Math.round((totalConf / residueCount) * 100) / 100,
      designFraction: Math.round((designedCount / residueCount) * 100) / 100,
    },
  };
}

/* ── Tool catalog ── */
export const toolCatalog = [
  {
    id: "rfdiffusion",
    name: "RFdiffusion",
    description: "Generative protein backbone design via denoising diffusion",
    estimatedTime: "2-5 min",
    icon: "🧬",
    accentColor: "#5e5ce6",
  },
  {
    id: "proteinmpnn",
    name: "ProteinMPNN",
    description: "Sequence design for fixed backbones using message passing",
    estimatedTime: "30-60 sec",
    icon: "🔤",
    accentColor: "#30d158",
  },
  {
    id: "boltz2",
    name: "Boltz-2",
    description: "Structure prediction with confidence scoring (pLDDT + PAE)",
    estimatedTime: "1-3 min",
    icon: "🔮",
    accentColor: "#ff9f0a",
  },
];

/* ── Mock jobs ── */
export const mockJobs = [
  {
    id: "job-001",
    tool: "rfdiffusion",
    config: { pdb: "1CRN", numDesigns: 4, steps: 50, contigs: "A1-46" },
    status: "complete",
    progress: 100,
    startedAt: Date.now() - 180000,
    completedAt: Date.now() - 60000,
    resultPdb: "1CRN",
    resultMode: "trajectory",
  },
  {
    id: "job-002",
    tool: "boltz2",
    config: { inputType: "sequence", input: "MKTAYIAKQRQISFVKSHFSRQLE..." },
    status: "complete",
    progress: 100,
    startedAt: Date.now() - 300000,
    completedAt: Date.now() - 240000,
    resultPdb: "1LYZ",
    resultMode: "plddt",
  },
  {
    id: "job-003",
    tool: "proteinmpnn",
    config: { pdb: "4HHB", temperature: 0.1, numSequences: 8 },
    status: "running",
    progress: 65,
    startedAt: Date.now() - 45000,
  },
  {
    id: "job-004",
    tool: "rfdiffusion",
    config: { pdb: "1EMA", numDesigns: 2, steps: 100, contigs: "A1-238" },
    status: "failed",
    progress: 32,
    startedAt: Date.now() - 600000,
    error: "CUDA out of memory",
  },
];

/* ── pLDDT color function (AlphaFold convention) ── */
export function plddtColor(score) {
  if (score > 90) return "#0053d6";
  if (score > 70) return "#65cbf3";
  if (score > 50) return "#ffdb13";
  return "#ff7d45";
}

/* ── PAE color function (blue → white → red) ── */
export function paeColor(value) {
  if (value <= 15) {
    const t = value / 15;
    const r = Math.round(t * 255);
    const g = Math.round(t * 255);
    const b = Math.round(255 - t * 55);
    return `rgb(${r},${g},${b})`;
  }
  const t = Math.min((value - 15) / 15, 1);
  const r = 255;
  const g = Math.round(255 - t * 255);
  const b = Math.round(200 - t * 200);
  return `rgb(${r},${g},${b})`;
}
