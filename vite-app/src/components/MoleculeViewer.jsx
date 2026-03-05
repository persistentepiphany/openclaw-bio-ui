/**
 * MoleculeViewer.jsx — Dual-mode protein viewer
 *
 * Toggle between:
 *   "Structure"  — 3Dmol.js real PDB rendering (cartoon, surface, ligands)
 *   "Schematic"  — Three.js procedural backbone ribbon
 *
 * Both renderers mount on the same container and toggle visibility.
 * The hidden renderer pauses its animation loop to save GPU.
 *
 * Props:
 *   selectedMoleculeId — PDB code string ("1CRN", "4HHB", …)
 *   onLoad             — optional callback({ pdbId, label, … })
 */

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import "jquery";
import * as $3Dmol from "3dmol";
import AnalysisPanel from "./AnalysisPanel";

/* ═══════════════════════════════════════════════════════════════════
   PROTEIN DEFINITIONS
   ═══════════════════════════════════════════════════════════════════ */
const PROTEINS = {
  "1CRN": {
    label: "Crambin", pdb: "1CRN", residues: 46, chains: 1, mw: "4.7 kDa",
    organism: "Crambe hispanica",
    desc: "Small plant protein · 46 residues · α+β fold · 3 disulfide bonds",
    segments: [
      { type: "sheet", len: 4 }, { type: "loop", len: 3 }, { type: "helix", len: 13 }, { type: "loop", len: 3 },
      { type: "helix", len: 8 }, { type: "loop", len: 1 }, { type: "sheet", len: 4 }, { type: "loop", len: 3 },
      { type: "helix", len: 7 },
    ],
    ligands: [
      { type: "disulfide", positions: [[3, 40], [4, 32], [16, 26]], color: 0xffcc00 },
    ],
    surfaceHue: 0.38, scale: 1.0, viewDist: 1.15,
    surfaceColor: "#30d158", surfaceOpacity: 0.08, ligandResnames: [],
  },
  "4HHB": {
    label: "Hemoglobin", pdb: "4HHB", residues: 141, chains: 4, mw: "64.5 kDa",
    organism: "Homo sapiens",
    desc: "O₂ transport tetramer · α₂β₂ · 4 heme groups with Fe²⁺ centres",
    segments: [
      { type: "helix", len: 15 }, { type: "loop", len: 4 }, { type: "helix", len: 20 }, { type: "loop", len: 5 },
      { type: "helix", len: 7 }, { type: "loop", len: 6 }, { type: "helix", len: 18 }, { type: "loop", len: 4 },
      { type: "helix", len: 20 }, { type: "loop", len: 4 }, { type: "helix", len: 7 }, { type: "loop", len: 5 },
      { type: "helix", len: 18 }, { type: "loop", len: 4 }, { type: "helix", len: 4 },
    ],
    ligands: [
      { type: "heme", count: 4, color: 0xff3b30 },
    ],
    surfaceHue: 0.0, scale: 0.55, viewDist: 1.1,
    surfaceColor: "#ff453a", surfaceOpacity: 0.06, ligandResnames: ["HEM"],
  },
  "1LYZ": {
    label: "Lysozyme", pdb: "1LYZ", residues: 129, chains: 1, mw: "14.3 kDa",
    organism: "Gallus gallus",
    desc: "Antimicrobial enzyme · 129 residues · α+β fold · cleaves peptidoglycan",
    segments: [
      { type: "loop", len: 4 }, { type: "helix", len: 11 }, { type: "loop", len: 4 }, { type: "sheet", len: 6 },
      { type: "helix", len: 12 }, { type: "loop", len: 3 }, { type: "sheet", len: 5 }, { type: "loop", len: 4 },
      { type: "sheet", len: 5 }, { type: "loop", len: 8 }, { type: "helix", len: 6 }, { type: "loop", len: 3 },
      { type: "sheet", len: 4 }, { type: "loop", len: 6 }, { type: "helix", len: 11 }, { type: "loop", len: 4 },
      { type: "helix", len: 7 }, { type: "loop", len: 5 }, { type: "helix", len: 6 }, { type: "loop", len: 5 },
      { type: "sheet", len: 4 }, { type: "loop", len: 6 },
    ],
    ligands: [
      { type: "substrate", count: 1, color: 0x5ac8fa, label: "NAG" },
    ],
    surfaceHue: 0.72, scale: 0.7, viewDist: 1.15,
    surfaceColor: "#5e5ce6", surfaceOpacity: 0.07, ligandResnames: ["NAG", "NDG"],
  },
  "1EMA": {
    label: "GFP", pdb: "1EMA", residues: 238, chains: 1, mw: "26.9 kDa",
    organism: "Aequorea victoria",
    desc: "Green fluorescent protein · 238 residues · β-barrel · autocatalytic chromophore",
    segments: [
      { type: "loop", len: 6 }, { type: "sheet", len: 11 }, { type: "loop", len: 3 }, { type: "sheet", len: 10 },
      { type: "loop", len: 3 }, { type: "sheet", len: 11 }, { type: "loop", len: 3 }, { type: "sheet", len: 9 },
      { type: "loop", len: 3 }, { type: "sheet", len: 10 }, { type: "loop", len: 2 },
      { type: "helix", len: 12 },
      { type: "loop", len: 3 }, { type: "sheet", len: 10 }, { type: "loop", len: 3 }, { type: "sheet", len: 11 },
      { type: "loop", len: 3 }, { type: "sheet", len: 10 }, { type: "loop", len: 3 }, { type: "sheet", len: 11 },
      { type: "loop", len: 3 }, { type: "sheet", len: 10 }, { type: "loop", len: 3 }, { type: "sheet", len: 11 },
      { type: "loop", len: 6 }, { type: "helix", len: 8 }, { type: "loop", len: 10 },
    ],
    ligands: [
      { type: "chromophore", count: 1, color: 0x30d158, label: "CRO" },
    ],
    surfaceHue: 0.38, scale: 0.45, viewDist: 1.05,
    surfaceColor: "#30d158", surfaceOpacity: 0.06, ligandResnames: ["CRO"],
  },
  "4INS": {
    label: "Insulin", pdb: "4INS", residues: 51, chains: 2, mw: "5.8 kDa",
    organism: "Sus scrofa",
    desc: "Hormone dimer · A-chain 21 + B-chain 30 residues · 3 disulfide bonds",
    segments: [
      { type: "loop", len: 2 }, { type: "helix", len: 8 }, { type: "loop", len: 4 }, { type: "helix", len: 5 }, { type: "loop", len: 2 },
      { type: "loop", len: 5 }, { type: "helix", len: 12 }, { type: "loop", len: 4 }, { type: "sheet", len: 5 }, { type: "loop", len: 4 },
    ],
    ligands: [
      { type: "ion", count: 2, color: 0x5ac8fa, label: "Zn²⁺" },
      { type: "disulfide", positions: [[6, 11], [7, 20], [19, 20]], color: 0xffcc00 },
    ],
    surfaceHue: 0.8, scale: 1.0, viewDist: 1.2,
    surfaceColor: "#bf5af2", surfaceOpacity: 0.08, ligandResnames: ["ZN"],
  },
};

/* ═══════════════════════════════════════════════════════════════════
   FETCH PDB
   ═══════════════════════════════════════════════════════════════════ */
async function fetchPdb(pdbId) {
  // Try local first, fall back to RCSB
  for (const url of [`/pdbs/${pdbId}.pdb`, `https://files.rcsb.org/download/${pdbId}.pdb`]) {
    try {
      const r = await fetch(url);
      if (r.ok) return await r.text();
    } catch { /* try next */ }
  }
  return null;
}

/* ═══════════════════════════════════════════════════════════════════
   THREE.JS HELPERS
   ═══════════════════════════════════════════════════════════════════ */
function makeRng(seed) {
  let s = 0;
  for (let i = 0; i < seed.length; i++) s = ((s << 5) - s + seed.charCodeAt(i)) | 0;
  return () => { s = (s * 16807) % 2147483647; if (s < 0) s += 2147483647; return s / 2147483647; };
}

const ATOM_COLORS = [
  { p: 0.45, color: 0x909090 },
  { p: 0.20, color: 0x3478f6 },
  { p: 0.25, color: 0xff3b30 },
  { p: 0.10, color: 0xffcc00 },
];

function pickAtomColor(rand) {
  let r = rand(), cum = 0;
  for (const a of ATOM_COLORS) { cum += a.p; if (r < cum) return a.color; }
  return 0x909090;
}

function ssColor(type, chainIdx, t) {
  const c = new THREE.Color();
  if (type === "helix") c.setHSL(0.02 + chainIdx * 0.12, 0.75, 0.52 + t * 0.06);
  else if (type === "sheet") c.setHSL(0.57 + chainIdx * 0.08, 0.62, 0.48 + t * 0.05);
  else c.setHSL(0.1, 0.12, 0.42);
  return c;
}

function filterClosePoints(pts, minDist) {
  if (pts.length === 0) return [];
  const out = [pts[0]];
  for (let i = 1; i < pts.length; i++) {
    if (pts[i].distanceTo(out[out.length - 1]) > minDist) out.push(pts[i]);
  }
  return out;
}

/* ═══════════════════════════════════════════════════════════════════
   BUILD SINGLE CHAIN  (unit scale — no * scale anywhere)
   ═══════════════════════════════════════════════════════════════════ */
function buildChain(group, segments, chainIdx, chainCount, rand) {
  const chainAngle = (chainIdx / chainCount) * Math.PI * 2;
  const chainRadius = chainCount > 1 ? 3.5 : 0;
  const chainOffset = new THREE.Vector3(
    Math.cos(chainAngle) * chainRadius,
    (rand() - 0.5) * 2,
    Math.sin(chainAngle) * chainRadius,
  );

  const backbone = [];
  let pos = new THREE.Vector3(0, 0, 0);
  let dir = new THREE.Vector3(rand() - 0.5, rand() - 0.5, rand() - 0.5).normalize();
  let segIdx = 0, inSeg = 0;
  const totalRes = segments.reduce((a, s) => a + s.len, 0);

  for (let i = 0; i < totalRes; i++) {
    while (segIdx < segments.length - 1 && inSeg >= segments[segIdx].len) {
      segIdx++; inSeg = 0;
    }
    const seg = segments[segIdx];
    const t = i / totalRes;

    if (seg.type === "helix") {
      const helixPhase = inSeg * (2 * Math.PI / 3.6);
      const helixAxis = dir.clone();
      const perpA = new THREE.Vector3(1, 0, 0);
      if (Math.abs(perpA.dot(helixAxis)) > 0.9) perpA.set(0, 1, 0);
      perpA.cross(helixAxis).normalize();
      const perpB = perpA.clone().cross(helixAxis).normalize();
      const coil = perpA.clone().multiplyScalar(Math.cos(helixPhase) * 0.35)
        .add(perpB.clone().multiplyScalar(Math.sin(helixPhase) * 0.35));
      pos = pos.clone().add(dir.clone().multiplyScalar(0.38)).add(coil.multiplyScalar(0.15));
      const driftAxis = new THREE.Vector3(rand() - 0.5, rand() - 0.5, rand() - 0.5).normalize();
      dir.applyAxisAngle(driftAxis, 0.04 + rand() * 0.03).normalize();
    } else if (seg.type === "sheet") {
      const pleat = Math.sin(inSeg * Math.PI) * 0.08;
      pos = pos.clone().add(dir.clone().multiplyScalar(0.55)).add(new THREE.Vector3(0, pleat, 0));
      const driftAxis = new THREE.Vector3(rand() - 0.5, rand() - 0.5, rand() - 0.5).normalize();
      dir.applyAxisAngle(driftAxis, 0.025 + rand() * 0.02).normalize();
    } else {
      const loopTwist = 0.15 + rand() * 0.4;
      const loopStep = 0.32 + rand() * 0.25;
      const axis = new THREE.Vector3(rand() - 0.5, rand() - 0.5, rand() - 0.5).normalize();
      dir.applyAxisAngle(axis, loopTwist).normalize();
      pos = pos.clone().add(dir.clone().multiplyScalar(loopStep));
    }

    backbone.push({ pos: pos.clone(), type: seg.type, t });
    inSeg++;
  }

  const centre = new THREE.Vector3();
  backbone.forEach(b => centre.add(b.pos));
  centre.divideScalar(backbone.length);
  backbone.forEach(b => b.pos.sub(centre).add(chainOffset));

  // Backbone ribbon tube
  const tubePts = filterClosePoints(backbone.map(b => b.pos), 0.05);
  if (tubePts.length >= 4) {
    const curve = new THREE.CatmullRomCurve3(tubePts, false, "catmullrom", 0.35);
    const tubeSeg = Math.max(tubePts.length * 5, 30);
    const tubeGeo = new THREE.TubeGeometry(curve, tubeSeg, 0.15, 8, false);

    const vColors = [];
    const pAttr = tubeGeo.attributes.position;
    for (let vi = 0; vi < pAttr.count; vi++) {
      const frac = vi / pAttr.count;
      const bIdx = Math.min(Math.floor(frac * backbone.length), backbone.length - 1);
      const c = ssColor(backbone[bIdx].type, chainIdx, backbone[bIdx].t);
      vColors.push(c.r, c.g, c.b);
    }
    tubeGeo.setAttribute("color", new THREE.Float32BufferAttribute(vColors, 3));

    const tubeMat = new THREE.MeshPhongMaterial({
      vertexColors: true, shininess: 45, transparent: true, opacity: 0.88, side: THREE.DoubleSide,
    });
    group.add(new THREE.Mesh(tubeGeo, tubeMat));
  }

  // Helix / sheet overlays from contiguous type runs
  let ri = 0;
  while (ri < backbone.length) {
    const runType = backbone[ri].type;
    let rj = ri;
    while (rj < backbone.length && backbone[rj].type === runType) rj++;
    const run = backbone.slice(ri, rj);

    if (runType === "helix" && run.length >= 4) {
      const pts = filterClosePoints(run.map(b => b.pos), 0.05);
      if (pts.length >= 4) {
        const hCurve = new THREE.CatmullRomCurve3(pts, false, "catmullrom", 0.5);
        const hGeo = new THREE.TubeGeometry(hCurve, pts.length * 3, 0.4, 12, false);
        const hCol = ssColor("helix", chainIdx, run[0].t);
        const hMat = new THREE.MeshPhongMaterial({
          color: hCol, transparent: true, opacity: 0.22, shininess: 20,
          side: THREE.DoubleSide, depthWrite: false,
        });
        group.add(new THREE.Mesh(hGeo, hMat));
      }
    }

    if (runType === "sheet" && run.length >= 4) {
      const pts = filterClosePoints(run.map(b => b.pos), 0.05);
      if (pts.length >= 4) {
        const sCurve = new THREE.CatmullRomCurve3(pts, false, "catmullrom", 0.5);
        const sGeo = new THREE.TubeGeometry(sCurve, pts.length * 3, 0.5, 4, false);
        const sCol = ssColor("sheet", chainIdx, run[0].t);
        const sMat = new THREE.MeshPhongMaterial({
          color: sCol, transparent: true, opacity: 0.18, shininess: 10,
          flatShading: true, side: THREE.DoubleSide, depthWrite: false,
        });
        group.add(new THREE.Mesh(sGeo, sMat));
      }
    }

    ri = rj;
  }

  // Cα atoms + side-chain branches
  const caGeo = new THREE.SphereGeometry(0.09, 6, 5);
  const scGeo = new THREE.SphereGeometry(0.065, 5, 4);
  const sc2Geo = new THREE.SphereGeometry(0.05, 4, 3);

  for (let i = 0; i < backbone.length; i++) {
    const b = backbone[i];
    const bCol = ssColor(b.type, chainIdx, b.t);

    const caMat = new THREE.MeshPhongMaterial({ color: bCol, transparent: true, opacity: 0.45 });
    const ca = new THREE.Mesh(caGeo, caMat);
    ca.position.copy(b.pos);
    group.add(ca);

    if (rand() > 0.25) {
      const branchDir = new THREE.Vector3(rand() - 0.5, rand() - 0.5, rand() - 0.5).normalize();
      const branchLen = 0.35 + rand() * 0.85;
      const scPos = b.pos.clone().add(branchDir.clone().multiplyScalar(branchLen));

      const bondGeo = new THREE.BufferGeometry().setFromPoints([b.pos, scPos]);
      group.add(new THREE.Line(bondGeo, new THREE.LineBasicMaterial({ color: bCol, transparent: true, opacity: 0.15 })));

      const scColor = pickAtomColor(rand);
      const scMesh = new THREE.Mesh(scGeo, new THREE.MeshPhongMaterial({ color: scColor, transparent: true, opacity: 0.45 }));
      scMesh.position.copy(scPos);
      group.add(scMesh);

      if (rand() > 0.5) {
        const br2Dir = branchDir.clone().applyAxisAngle(
          new THREE.Vector3(rand() - 0.5, rand() - 0.5, rand() - 0.5).normalize(), 0.7 + rand() * 0.5
        ).normalize();
        const sc2Pos = scPos.clone().add(br2Dir.multiplyScalar(0.25));
        group.add(new THREE.Line(
          new THREE.BufferGeometry().setFromPoints([scPos, sc2Pos]),
          new THREE.LineBasicMaterial({ color: scColor, transparent: true, opacity: 0.1 }),
        ));
        const sc2 = new THREE.Mesh(sc2Geo, new THREE.MeshPhongMaterial({ color: pickAtomColor(rand), transparent: true, opacity: 0.4 }));
        sc2.position.copy(sc2Pos);
        group.add(sc2);

        if (rand() > 0.7) {
          const br3Dir = br2Dir.clone().applyAxisAngle(
            new THREE.Vector3(rand() - 0.5, rand() - 0.5, rand() - 0.5).normalize(), 0.6
          ).normalize();
          const sc3Pos = sc2Pos.clone().add(br3Dir.multiplyScalar(0.18));
          group.add(new THREE.Line(
            new THREE.BufferGeometry().setFromPoints([sc2Pos, sc3Pos]),
            new THREE.LineBasicMaterial({ color: 0x666666, transparent: true, opacity: 0.08 }),
          ));
          const sc3 = new THREE.Mesh(sc2Geo, new THREE.MeshPhongMaterial({ color: pickAtomColor(rand), transparent: true, opacity: 0.4 }));
          sc3.position.copy(sc3Pos);
          group.add(sc3);
        }
      }
    }
  }

  return { backbone };
}

/* ═══════════════════════════════════════════════════════════════════
   BUILD FULL PROTEIN  (all chains + ligands + water + envelope)
   ═══════════════════════════════════════════════════════════════════ */
function buildProtein(group, def, rand) {
  const chainCount = def.chains;
  const allBackbones = [];

  for (let ch = 0; ch < chainCount; ch++) {
    const { backbone } = buildChain(group, def.segments, ch, chainCount, rand);
    allBackbones.push(backbone);
  }

  const flat = allBackbones.flat();
  const protBox = new THREE.Box3();
  flat.forEach(b => protBox.expandByPoint(b.pos));
  const protCentre = protBox.getCenter(new THREE.Vector3());
  const protSize = protBox.getSize(new THREE.Vector3());

  // Ligands
  if (def.ligands) {
    for (const lig of def.ligands) {
      if (lig.type === "heme") {
        for (let h = 0; h < (lig.count || 1); h++) {
          const angle = (h / (lig.count || 1)) * Math.PI * 2;
          const hPos = new THREE.Vector3(
            Math.cos(angle) * protSize.x * 0.25,
            (rand() - 0.5) * protSize.y * 0.3,
            Math.sin(angle) * protSize.z * 0.25,
          );
          const ringGeo = new THREE.TorusGeometry(0.7, 0.1, 8, 20);
          const ring = new THREE.Mesh(ringGeo, new THREE.MeshPhongMaterial({ color: lig.color, transparent: true, opacity: 0.65, shininess: 60 }));
          ring.position.copy(hPos);
          ring.rotation.x = Math.PI / 2 + (rand() - 0.5) * 0.4;
          ring.rotation.z = rand() * Math.PI;
          group.add(ring);

          const fe = new THREE.Mesh(
            new THREE.SphereGeometry(0.18, 8, 6),
            new THREE.MeshPhongMaterial({ color: 0xff6b35, emissive: 0x331100, shininess: 80 }),
          );
          fe.position.copy(hPos);
          group.add(fe);

          const glow = new THREE.Mesh(
            new THREE.SphereGeometry(1.0, 10, 8),
            new THREE.MeshBasicMaterial({ color: lig.color, transparent: true, opacity: 0.04 }),
          );
          glow.position.copy(hPos);
          group.add(glow);
        }
      } else if (lig.type === "chromophore") {
        const cr = new THREE.Mesh(
          new THREE.TorusGeometry(0.55, 0.14, 8, 14),
          new THREE.MeshPhongMaterial({ color: lig.color, emissive: 0x0a3010, transparent: true, opacity: 0.75, shininess: 80 }),
        );
        cr.position.copy(protCentre);
        group.add(cr);

        for (let g = 0; g < 3; g++) {
          const gl = new THREE.Mesh(
            new THREE.SphereGeometry(0.8 + g * 0.6, 12, 8),
            new THREE.MeshBasicMaterial({ color: lig.color, transparent: true, opacity: 0.04 - g * 0.01 }),
          );
          gl.position.copy(protCentre);
          group.add(gl);
        }
      } else if (lig.type === "ion") {
        for (let n = 0; n < (lig.count || 1); n++) {
          const ionPos = new THREE.Vector3(
            protCentre.x + (rand() - 0.5) * protSize.x * 0.4,
            protCentre.y + (rand() - 0.5) * protSize.y * 0.4,
            protCentre.z + (rand() - 0.5) * protSize.z * 0.4,
          );
          const ion = new THREE.Mesh(
            new THREE.SphereGeometry(0.2, 8, 6),
            new THREE.MeshPhongMaterial({ color: lig.color, emissive: new THREE.Color(lig.color).multiplyScalar(0.2), shininess: 90 }),
          );
          ion.position.copy(ionPos);
          group.add(ion);
        }
      } else if (lig.type === "disulfide") {
        for (const pair of (lig.positions || [])) {
          const a = flat[Math.min(pair[0], flat.length - 1)]?.pos;
          const b = flat[Math.min(pair[1], flat.length - 1)]?.pos;
          if (a && b) {
            group.add(new THREE.Line(
              new THREE.BufferGeometry().setFromPoints([a, b]),
              new THREE.LineBasicMaterial({ color: lig.color, transparent: true, opacity: 0.5 }),
            ));
            for (const p of [a, b]) {
              const s = new THREE.Mesh(
                new THREE.SphereGeometry(0.14, 6, 5),
                new THREE.MeshPhongMaterial({ color: 0xffcc00, transparent: true, opacity: 0.6 }),
              );
              s.position.copy(p);
              group.add(s);
            }
          }
        }
      } else if (lig.type === "substrate") {
        for (let n = 0; n < (lig.count || 1); n++) {
          const sPos = protCentre.clone().add(new THREE.Vector3((rand() - 0.5) * 2, (rand() - 0.5) * 2, (rand() - 0.5) * 2));
          const r = new THREE.Mesh(
            new THREE.TorusGeometry(0.3, 0.06, 6, 8),
            new THREE.MeshPhongMaterial({ color: lig.color, transparent: true, opacity: 0.6, shininess: 40 }),
          );
          r.position.copy(sPos);
          r.rotation.set(rand() * Math.PI, rand() * Math.PI, 0);
          group.add(r);
        }
      }
    }
  }

  // Water molecules
  const waterGeo = new THREE.SphereGeometry(0.035, 4, 3);
  const waterMat = new THREE.MeshBasicMaterial({ color: 0x3478f6, transparent: true, opacity: 0.4 });
  const waterCount = Math.min(def.residues, 60);
  for (let i = 0; i < waterCount; i++) {
    const w = new THREE.Mesh(waterGeo, waterMat);
    w.position.set(
      protCentre.x + (rand() - 0.5) * protSize.x * 1.5,
      protCentre.y + (rand() - 0.5) * protSize.y * 1.5,
      protCentre.z + (rand() - 0.5) * protSize.z * 1.5,
    );
    group.add(w);
  }

  // Wireframe spherical envelope
  const surfRadius = protSize.length() * 0.39;
  const surfCol = new THREE.Color().setHSL(def.surfaceHue, 0.5, 0.5);

  const surf = new THREE.Mesh(
    new THREE.SphereGeometry(surfRadius, 32, 24),
    new THREE.MeshPhongMaterial({
      color: surfCol, transparent: true, opacity: 0.035, shininess: 8,
      side: THREE.DoubleSide, depthWrite: false,
    }),
  );
  surf.position.copy(protCentre);
  group.add(surf);

  const wire = new THREE.Mesh(
    new THREE.SphereGeometry(surfRadius * 1.01, 20, 16),
    new THREE.MeshBasicMaterial({ color: surfCol, wireframe: true, transparent: true, opacity: 0.022 }),
  );
  wire.position.copy(protCentre);
  group.add(wire);
}

/* ═══════════════════════════════════════════════════════════════════
   COMPONENT
   ═══════════════════════════════════════════════════════════════════ */
export default function MoleculeViewer({ selectedMoleculeId = "1CRN", onLoad }) {
  const structureRef = useRef(null);   // 3Dmol container
  const schematicRef = useRef(null);   // Three.js container
  const stateRef = useRef({ isDragging: false, prevMouse: { x: 0, y: 0 }, rotX: 0, rotY: 0, targetZ: 30 });
  const onLoadRef = useRef(onLoad);
  onLoadRef.current = onLoad;
  const modeRef = useRef("structure");

  const [mode, setMode] = useState("structure"); // "structure" | "schematic" | "analysis"
  const [info, setInfo] = useState(null);

  // Keep modeRef in sync
  useEffect(() => { modeRef.current = mode; }, [mode]);

  /* ── 3Dmol.js viewer — single effect: lazy-create + load ──
   *
   * The viewer is created once and stored in molViewerRef. It is NEVER
   * destroyed in the effect cleanup — only in-flight fetches are cancelled
   * and the spin is stopped. This survives React 18 StrictMode's
   * mount → cleanup → remount cycle: the second mount sees the viewer
   * already in the ref and skips creation.
   */
  const molViewerRef = useRef(null);
  const molObserverRef = useRef(null);

  useEffect(() => {
    const container = structureRef.current;
    if (!container) return;
    const def = PROTEINS[selectedMoleculeId];
    if (!def) return;

    let cancelled = false;

    // ── Lazy-create viewer (once, persists in ref) ──
    if (!molViewerRef.current) {
      const viewerDiv = document.createElement("div");
      viewerDiv.style.cssText = "width:100%;height:100%;position:relative;";
      container.appendChild(viewerDiv);

      molViewerRef.current = $3Dmol.createViewer(viewerDiv, {
        backgroundColor: "black",
        antialias: true,
        disableFog: true,
      });
    }

    const viewer = molViewerRef.current;

    // ── ResizeObserver for 3Dmol (replace previous if any) ──
    if (molObserverRef.current) molObserverRef.current.disconnect();
    const resizeObs = new ResizeObserver(() => {
      if (molViewerRef.current) {
        molViewerRef.current.resize();
        molViewerRef.current.render();
      }
    });
    resizeObs.observe(container);
    molObserverRef.current = resizeObs;

    // ── Load structure ──
    (async () => {
      // Stop any running spin before clearing
      viewer.spin(false);
      viewer.removeAllSurfaces();
      viewer.removeAllModels();
      viewer.render();

      const pdbData = await fetchPdb(def.pdb);
      if (cancelled || !pdbData) return;

      viewer.addModel(pdbData, "pdb");

      // Cartoon ribbon with spectrum coloring
      viewer.setStyle({}, {
        cartoon: { color: "spectrum", opacity: 0.92 },
      });

      // Sulfur atoms as small spheres (overlay, not replace)
      viewer.addStyle({ elem: "S" }, {
        sphere: { radius: 0.4, color: "yellow", opacity: 0.7 },
      });

      // Ligands as ball-and-stick
      if (def.ligandResnames.length > 0) {
        viewer.addStyle({ resn: def.ligandResnames }, {
          stick: { radius: 0.15, colorscheme: "default" },
          sphere: { radius: 0.3, colorscheme: "default" },
        });
      }

      // Transparent surface (addSurface is async internally)
      try {
        viewer.addSurface($3Dmol.SurfaceType.VDW, {
          opacity: def.surfaceOpacity,
          color: def.surfaceColor,
        });
      } catch { /* surface is optional — render without it */ }

      if (cancelled) return;

      viewer.zoomTo();
      viewer.render();
      viewer.resize();

      // Start spin only if we're in structure mode
      if (modeRef.current === "structure") {
        viewer.spin("y", 0.35);
      }

      // Get atom count from real model
      const atoms = viewer.getModel(0)?.selectedAtoms({}) || [];
      const loadInfo = {
        pdbId: def.pdb,
        label: def.label,
        desc: def.desc,
        organism: def.organism,
        mw: def.mw,
        atomCount: atoms.length || def.residues * 7,
        chains: def.chains,
        residues: def.residues,
      };
      if (!cancelled) {
        setInfo(loadInfo);
        onLoadRef.current?.(loadInfo);
      }
    })();

    return () => {
      cancelled = true;
      // Stop spin but do NOT destroy the viewer — it lives in the ref
      if (molViewerRef.current) {
        molViewerRef.current.spin(false);
      }
    };
  }, [selectedMoleculeId]);

  /* ── Three.js viewer — single effect: lazy-create renderer + build scene ──
   *
   * Same pattern as 3Dmol: renderer is created once and persists in a ref.
   * Cleanup only stops the animation loop and removes event listeners.
   */
  const threeRunningRef = useRef(false);
  const threeAnimateRef = useRef(null);
  const threeRendererRef = useRef(null);
  const threeObserverRef = useRef(null);

  useEffect(() => {
    const container = schematicRef.current;
    if (!container) return;
    const def = PROTEINS[selectedMoleculeId];
    if (!def) return;

    let cancelled = false;

    // ── Lazy-create renderer (once, persists in ref) ──
    if (!threeRendererRef.current) {
      const renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.15;
      container.appendChild(renderer.domElement);
      threeRendererRef.current = renderer;
    }

    const renderer = threeRendererRef.current;
    const rand = makeRng(selectedMoleculeId + def.label);
    const w = container.clientWidth || 600;
    const h = container.clientHeight || 400;
    renderer.setSize(w, h);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x030305);

    const camera = new THREE.PerspectiveCamera(42, w / h, 0.1, 500);

    // Lighting
    scene.add(new THREE.AmbientLight(0x303040, 0.45));
    const keyLight = new THREE.DirectionalLight(0xffffff, 0.85);
    keyLight.position.set(15, 20, 18);
    scene.add(keyLight);
    const fillLight = new THREE.DirectionalLight(0x6688cc, 0.25);
    fillLight.position.set(-12, -6, 10);
    scene.add(fillLight);
    const accentCol = new THREE.Color().setHSL(def.surfaceHue, 0.6, 0.5);
    const rimLight = new THREE.DirectionalLight(accentCol, 0.18);
    rimLight.position.set(-8, -10, -15);
    scene.add(rimLight);

    // Build protein at unit scale
    const group = new THREE.Group();
    scene.add(group);
    buildProtein(group, def, rand);

    // Centre at origin
    const rawBox = new THREE.Box3().setFromObject(group);
    const rawCentre = rawBox.getCenter(new THREE.Vector3());
    group.children.forEach(child => {
      if (child.position) child.position.sub(rawCentre);
    });

    // Apply protein-specific scale
    group.scale.setScalar(def.scale);

    // Camera fitting
    const finalBox = new THREE.Box3().setFromObject(group);
    const sz = finalBox.getSize(new THREE.Vector3()).length();
    const camZ = Math.max(sz * 1.3, 12);
    camera.position.set(0, 0, camZ);
    camera.near = 0.1;
    camera.far = Math.max(sz * 5, 100);
    camera.updateProjectionMatrix();

    scene.fog = new THREE.FogExp2(0x030305, 0.005);

    // Resize observer (replace previous if any)
    if (threeObserverRef.current) threeObserverRef.current.disconnect();
    const observer = new ResizeObserver(() => {
      const nw = container.clientWidth;
      const nh = container.clientHeight;
      if (nw > 0 && nh > 0) {
        renderer.setSize(nw, nh);
        camera.aspect = nw / nh;
        camera.updateProjectionMatrix();
      }
    });
    observer.observe(container);
    threeObserverRef.current = observer;

    // Interaction
    const st = stateRef.current;
    st.targetZ = camZ;
    st.rotX = 0;
    st.rotY = 0;

    const minZ = Math.max(sz * 0.4, 3);
    const maxZ = sz * 3;

    const onDown = (e) => {
      st.isDragging = true;
      st.prevMouse = { x: e.clientX ?? e.touches?.[0]?.clientX ?? 0, y: e.clientY ?? e.touches?.[0]?.clientY ?? 0 };
    };
    const onUp = () => { st.isDragging = false; };
    const onMove = (e) => {
      if (!st.isDragging) return;
      const cx = e.clientX ?? e.touches?.[0]?.clientX ?? 0;
      const cy = e.clientY ?? e.touches?.[0]?.clientY ?? 0;
      st.rotY += (cx - st.prevMouse.x) * 0.006;
      st.rotX += (cy - st.prevMouse.y) * 0.006;
      st.rotX = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, st.rotX));
      st.prevMouse = { x: cx, y: cy };
    };
    const onWheel = (e) => {
      e.preventDefault();
      st.targetZ = Math.max(minZ, Math.min(maxZ, st.targetZ + e.deltaY * 0.04));
    };

    const canvas = renderer.domElement;
    canvas.addEventListener("mousedown", onDown);
    canvas.addEventListener("touchstart", onDown, { passive: true });
    window.addEventListener("mouseup", onUp);
    window.addEventListener("touchend", onUp);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("touchmove", onMove, { passive: true });
    canvas.addEventListener("wheel", onWheel, { passive: false });

    // Animation loop
    let frame;
    const clock = new THREE.Clock();

    const animate = () => {
      if (!threeRunningRef.current || cancelled) return;
      frame = requestAnimationFrame(animate);
      const dt = clock.getDelta();
      if (!st.isDragging) st.rotY += dt * 0.12;
      group.rotation.y = st.rotY;
      group.rotation.x = st.rotX;
      camera.position.z += (st.targetZ - camera.position.z) * 0.08;
      renderer.render(scene, camera);
    };

    threeAnimateRef.current = animate;

    // Start if in schematic mode, otherwise render one frame
    if (modeRef.current === "schematic") {
      threeRunningRef.current = true;
      animate();
    } else {
      frame = requestAnimationFrame(() => {
        if (!cancelled) renderer.render(scene, camera);
      });
    }

    return () => {
      cancelled = true;
      threeRunningRef.current = false;
      cancelAnimationFrame(frame);
      canvas.removeEventListener("mousedown", onDown);
      canvas.removeEventListener("touchstart", onDown);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("touchend", onUp);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("touchmove", onMove);
      canvas.removeEventListener("wheel", onWheel);
      // Do NOT destroy renderer — it persists in the ref
    };
  }, [selectedMoleculeId]);

  /* ── Mode switch effect ── */
  useEffect(() => {
    if (mode === "structure") {
      // Resume 3Dmol spin
      if (molViewerRef.current) {
        molViewerRef.current.spin("y", 0.35);
      }
      // Pause Three.js
      threeRunningRef.current = false;
    } else if (mode === "schematic") {
      // Pause 3Dmol spin
      if (molViewerRef.current) {
        molViewerRef.current.spin(false);
      }
      // Resume Three.js
      if (!threeRunningRef.current && threeAnimateRef.current) {
        threeRunningRef.current = true;
        threeAnimateRef.current();
      }
    } else {
      // analysis mode — pause both
      if (molViewerRef.current) {
        molViewerRef.current.spin(false);
      }
      threeRunningRef.current = false;
    }
  }, [mode]);

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      {/* 3Dmol container */}
      <div
        ref={structureRef}
        style={{
          width: "100%", height: "100%", position: "absolute", top: 0, left: 0,
          visibility: mode === "structure" ? "visible" : "hidden",
          cursor: "grab",
        }}
      />

      {/* Three.js container */}
      <div
        ref={schematicRef}
        style={{
          width: "100%", height: "100%", position: "absolute", top: 0, left: 0,
          visibility: mode === "schematic" ? "visible" : "hidden",
          cursor: "grab",
        }}
      />

      {/* Analysis panel */}
      <div
        style={{
          width: "100%", height: "100%", position: "absolute", top: 0, left: 0,
          visibility: mode === "analysis" ? "visible" : "hidden",
        }}
      >
        {mode === "analysis" && <AnalysisPanel pdbId={selectedMoleculeId} />}
      </div>

      {info && (
        <>
          {/* SS colour legend (hidden in analysis mode) */}
          {mode !== "analysis" && (
            <div style={{ position: "absolute", top: 10, left: 10, display: "flex", flexDirection: "column", gap: 3, zIndex: 5 }}>
              {[
                { color: "hsl(2,75%,52%)", label: "α-helix" },
                { color: "hsl(206,62%,48%)", label: "β-sheet" },
                { color: "hsl(36,12%,42%)", label: "Loop/coil" },
                { color: "#ffcc00", label: "S-S bond" },
                { color: "#3478f6", label: "Water" },
              ].map((l, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 5, padding: "2px 8px", borderRadius: 4, background: "rgba(0,0,0,0.55)" }}>
                  <span style={{ width: 8, height: 3, borderRadius: 1, background: l.color }} />
                  <span style={{ fontFamily: "monospace", fontSize: 8, color: "#48484a" }}>{l.label}</span>
                </div>
              ))}
            </div>
          )}

          {/* Mode toggle pill */}
          <div style={{
            position: "absolute", top: mode === "analysis" ? 10 : 130, left: 10, zIndex: 5,
            display: "flex", borderRadius: 8, overflow: "hidden",
            border: "1px solid rgba(255,255,255,0.08)",
            background: "rgba(0,0,0,0.6)",
          }}>
            {[
              { key: "structure", label: "Structure" },
              { key: "schematic", label: "Schematic" },
              { key: "analysis", label: "Analysis" },
            ].map(m => (
              <button
                key={m.key}
                onClick={() => setMode(m.key)}
                style={{
                  padding: "4px 12px",
                  border: "none",
                  cursor: "pointer",
                  fontFamily: "monospace",
                  fontSize: 9,
                  letterSpacing: 0.3,
                  background: mode === m.key ? "rgba(48,209,88,0.2)" : "transparent",
                  color: mode === m.key ? "#30d158" : "#48484a",
                  transition: "all 0.2s",
                }}
              >
                {m.label}
              </button>
            ))}
          </div>

          {/* Metadata chips (hidden in analysis mode) */}
          {mode !== "analysis" && (
            <div style={{ position: "absolute", bottom: 10, left: 10, display: "flex", gap: 5, flexWrap: "wrap", zIndex: 5 }}>
              {[
                { text: `PDB: ${info.pdbId}`, accent: true },
                { text: `${info.residues} residues` },
                { text: `${info.chains} chain${info.chains > 1 ? "s" : ""}` },
                { text: info.mw },
              ].filter(c => c.text).map((c, i) => (
                <span key={i} style={{
                  padding: "3px 9px", borderRadius: 5, background: "rgba(0,0,0,0.6)",
                  fontFamily: "monospace", fontSize: 9,
                  color: c.accent ? "#30d158" : "#48484a",
                  border: "1px solid rgba(255,255,255,0.04)",
                }}>{c.text}</span>
              ))}
            </div>
          )}

          {/* Description (hidden in analysis mode) */}
          {mode !== "analysis" && (
            <div style={{
              position: "absolute", bottom: 10, right: 10, padding: "5px 10px", borderRadius: 6,
              background: "rgba(0,0,0,0.6)", fontFamily: "monospace", fontSize: 8.5, color: "#48484a",
              border: "1px solid rgba(255,255,255,0.04)", maxWidth: 200, lineHeight: 1.4, zIndex: 5,
            }}>
              {info.desc}<br /><span style={{ opacity: 0.6 }}>{info.organism}</span>
            </div>
          )}
        </>
      )}
    </div>
  );
}
