import { useState, useEffect, useRef, useCallback, Fragment, useMemo } from "react";
import * as THREE from "three";

/* ═══════════════════════════════════════════════════════════════════════════
   PALETTE & TOKENS
   ═══════════════════════════════════════════════════════════════════════ */
const C = {
  bg:"#000", surface:"#0a0a0a", raised:"#111", hover:"#161616",
  border:"#1c1c1c", borderSub:"#141414",
  t1:"#f5f5f7", t2:"#86868b", t3:"#48484a",
  accent:"#30d158", accentDim:"rgba(48,209,88,0.10)", accentGlow:"rgba(48,209,88,0.06)",
  warn:"#ff9f0a", warnDim:"rgba(255,159,10,0.10)", red:"#ff453a",
};
const mono = "'DM Mono','SF Mono',Menlo,monospace";
const sans = "'DM Sans',-apple-system,BlinkMacSystemFont,sans-serif";

/* ═══════════════════════════════════════════════════════════════════════════
   MOCK DATA
   ═══════════════════════════════════════════════════════════════════════ */
const activities = [
  {src:"lab",msg:"New data arrived from sequencer",time:"2m",loc:"Site A"},
  {src:"sys",msg:"Calibration check passed",time:"5m"},
  {src:"lab",msg:"Sample batch #47 queued",time:"12m",loc:"Site B"},
  {src:"alert",msg:"Anomaly detected in run 312",time:"18m",loc:"Site A"},
  {src:"sys",msg:"Model weights updated",time:"25m"},
  {src:"lab",msg:"Environmental sensors nominal",time:"31m",loc:"Site C"},
  {src:"sys",msg:"Backup completed",time:"45m"},
  {src:"lab",msg:"New reagent lot verified",time:"1h",loc:"Site A"},
];
const dataItems = [
  {id:"ITEM001",score:.97,status:"pass"},{id:"ITEM002",score:.95,status:"pass"},
  {id:"ITEM003",score:.92,status:"pass"},{id:"ITEM004",score:.88,status:"pass"},
  {id:"ITEM005",score:.78,status:"warn"},{id:"ITEM006",score:.71,status:"pass"},
  {id:"ITEM007",score:.64,status:"warn"},{id:"ITEM008",score:.43,status:"warn"},
];
const hmap = {
  conds:["Cond A","Cond B","Cond C","Cond D"],rows:["001","002","003","004","005"],
  matrix:[[.92,.45,.88,.73],[.78,.95,.32,.61],[.64,.71,.83,.9],[.33,.58,.91,.44],[.87,.29,.76,.82]],
};
const wfSteps = ["Ingest","Validate","Analyze","Score","Report"];

/* ═══════════════════════════════════════════════════════════════════════════
   PROTEIN DEFINITIONS  
   Each definition encodes real structural data: residue count, chain count,
   secondary structure segments (based on PDB HELIX/SHEET records),
   ligands/ions, and visual parameters.
   ═══════════════════════════════════════════════════════════════════════ */
const PROTEINS = {
  "1CRN": {
    label:"Crambin", pdb:"1CRN", residues:46, chains:1, mw:"4.7 kDa",
    organism:"Crambe hispanica",
    desc:"Small plant protein · 46 residues · α+β fold · 3 disulfide bonds",
    // Secondary structure from PDB HELIX/SHEET records for 1CRN
    //   HELIX 1: 7-19 (α), HELIX 2: 23-30 (α), SHEET 1: 1-4 (β), SHEET 2: 32-35 (β)
    segments:[
      {type:"sheet",len:4},{type:"loop",len:3},{type:"helix",len:13},{type:"loop",len:3},
      {type:"helix",len:8},{type:"loop",len:1},{type:"sheet",len:4},{type:"loop",len:3},
      {type:"helix",len:7},
    ],
    ligands:[
      {type:"disulfide",positions:[[3,40],[4,32],[16,26]],color:0xffcc00},
    ],
    surfaceHue:0.38, scale:1.0, viewDist:1.15,
  },
  "4HHB": {
    label:"Hemoglobin", pdb:"4HHB", residues:141, chains:4, mw:"64.5 kDa",
    organism:"Homo sapiens",
    desc:"O₂ transport tetramer · α₂β₂ · 4 heme groups with Fe²⁺ centres",
    // Hemoglobin is almost entirely α-helical (A-H helices per chain)
    segments:[
      {type:"helix",len:15},{type:"loop",len:4},{type:"helix",len:20},{type:"loop",len:5},
      {type:"helix",len:7},{type:"loop",len:6},{type:"helix",len:18},{type:"loop",len:4},
      {type:"helix",len:20},{type:"loop",len:4},{type:"helix",len:7},{type:"loop",len:5},
      {type:"helix",len:18},{type:"loop",len:4},{type:"helix",len:4},
    ],
    ligands:[
      {type:"heme",count:4,color:0xff3b30},
    ],
    surfaceHue:0.0, scale:0.55, viewDist:1.1,
  },
  "1LYZ": {
    label:"Lysozyme", pdb:"1LYZ", residues:129, chains:1, mw:"14.3 kDa",
    organism:"Gallus gallus",
    desc:"Antimicrobial enzyme · 129 residues · α+β fold · cleaves peptidoglycan",
    // 1LYZ: 4 α-helices (A 5-15, B 25-36, C 89-99, D 109-115) + β-sheet domain
    segments:[
      {type:"loop",len:4},{type:"helix",len:11},{type:"loop",len:4},{type:"sheet",len:6},
      {type:"helix",len:12},{type:"loop",len:3},{type:"sheet",len:5},{type:"loop",len:4},
      {type:"sheet",len:5},{type:"loop",len:8},{type:"helix",len:6},{type:"loop",len:3},
      {type:"sheet",len:4},{type:"loop",len:6},{type:"helix",len:11},{type:"loop",len:4},
      {type:"helix",len:7},{type:"loop",len:5},{type:"helix",len:6},{type:"loop",len:5},
      {type:"sheet",len:4},{type:"loop",len:6},
    ],
    ligands:[
      {type:"substrate",count:1,color:0x5ac8fa,label:"NAG"},
    ],
    surfaceHue:0.72, scale:0.7, viewDist:1.15,
  },
  "1EMA": {
    label:"GFP", pdb:"1EMA", residues:238, chains:1, mw:"26.9 kDa",
    organism:"Aequorea victoria",
    desc:"Green fluorescent protein · 238 residues · β-barrel · autocatalytic chromophore",
    // GFP: 11-stranded β-barrel with central helix containing chromophore
    segments:[
      {type:"loop",len:6},{type:"sheet",len:11},{type:"loop",len:3},{type:"sheet",len:10},
      {type:"loop",len:3},{type:"sheet",len:11},{type:"loop",len:3},{type:"sheet",len:9},
      {type:"loop",len:3},{type:"sheet",len:10},{type:"loop",len:2},
      {type:"helix",len:12},  // central helix with chromophore
      {type:"loop",len:3},{type:"sheet",len:10},{type:"loop",len:3},{type:"sheet",len:11},
      {type:"loop",len:3},{type:"sheet",len:10},{type:"loop",len:3},{type:"sheet",len:11},
      {type:"loop",len:3},{type:"sheet",len:10},{type:"loop",len:3},{type:"sheet",len:11},
      {type:"loop",len:6},{type:"helix",len:8},{type:"loop",len:10},
    ],
    ligands:[
      {type:"chromophore",count:1,color:0x30d158,label:"CRO"},
    ],
    surfaceHue:0.38, scale:0.45, viewDist:1.05,
  },
  "4INS": {
    label:"Insulin", pdb:"4INS", residues:51, chains:2, mw:"5.8 kDa",
    organism:"Sus scrofa",
    desc:"Hormone dimer · A-chain 21 + B-chain 30 residues · 3 disulfide bonds",
    // Insulin: A chain (2 short helices), B chain (1 long helix)
    segments:[
      // A chain
      {type:"loop",len:2},{type:"helix",len:8},{type:"loop",len:4},{type:"helix",len:5},{type:"loop",len:2},
      // B chain
      {type:"loop",len:5},{type:"helix",len:12},{type:"loop",len:4},{type:"sheet",len:5},{type:"loop",len:4},
    ],
    ligands:[
      {type:"ion",count:2,color:0x5ac8fa,label:"Zn²⁺"},
      {type:"disulfide",positions:[[6,11],[7,20],[19,20]],color:0xffcc00},
    ],
    surfaceHue:0.8, scale:1.0, viewDist:1.2,
  },
};

/* ═══════════════════════════════════════════════════════════════════════════
   SEEDED RNG
   ═══════════════════════════════════════════════════════════════════════ */
function makeRng(seed) {
  let s = 0;
  for (let i = 0; i < seed.length; i++) s = ((s << 5) - s + seed.charCodeAt(i)) | 0;
  return () => { s = (s * 16807) % 2147483647; if (s < 0) s += 2147483647; return s / 2147483647; };
}

/* ═══════════════════════════════════════════════════════════════════════════
   ATOM COLOURS (CPK convention)
   ═══════════════════════════════════════════════════════════════════════ */
const ATOM_COLORS = [
  {p:0.45, color:0x909090, name:"C"},  // carbon
  {p:0.20, color:0x3478f6, name:"N"},  // nitrogen
  {p:0.25, color:0xff3b30, name:"O"},  // oxygen
  {p:0.10, color:0xffcc00, name:"S"},  // sulfur
];

function pickAtomColor(rand) {
  let r = rand(), cum = 0;
  for (const a of ATOM_COLORS) { cum += a.p; if (r < cum) return a.color; }
  return 0x909090;
}

/* ═══════════════════════════════════════════════════════════════════════════
   SECONDARY STRUCTURE COLOURS
   ═══════════════════════════════════════════════════════════════════════ */
// Helix: warm red-orange, Sheet: cool blue-cyan, Loop: muted
function ssColor(type, chainIdx, t) {
  const c = new THREE.Color();
  if (type === "helix") c.setHSL(0.02 + chainIdx * 0.12, 0.75, 0.52 + t * 0.06);
  else if (type === "sheet") c.setHSL(0.57 + chainIdx * 0.08, 0.62, 0.48 + t * 0.05);
  else c.setHSL(0.1, 0.12, 0.42);
  return c;
}

/* ═══════════════════════════════════════════════════════════════════════════
   BUILD SINGLE CHAIN
   ═══════════════════════════════════════════════════════════════════════ */
function buildChain(group, def, chainIdx, chainCount, rand) {
  const { segments, residues, scale } = def;

  // Chain offset for multi-chain proteins
  const chainAngle = (chainIdx / chainCount) * Math.PI * 2;
  const chainRadius = chainCount > 1 ? 3.5 * scale : 0;
  const chainOffset = new THREE.Vector3(
    Math.cos(chainAngle) * chainRadius,
    (rand() - 0.5) * 2 * scale,
    Math.sin(chainAngle) * chainRadius,
  );

  // Build backbone points with secondary-structure-aware geometry
  const backbone = []; // {pos, type, t}
  let pos = chainOffset.clone();
  let dir = new THREE.Vector3(rand()-0.5, rand()-0.5, rand()-0.5).normalize();
  let segIdx = 0, inSeg = 0;

  const totalRes = segments.reduce((a, s) => a + s.len, 0);

  for (let i = 0; i < totalRes; i++) {
    // Advance segment
    while (segIdx < segments.length - 1 && inSeg >= segments[segIdx].len) {
      segIdx++; inSeg = 0;
    }
    const seg = segments[segIdx];
    const t = i / totalRes;

    // Geometry depends on secondary structure type
    let twist, step;
    if (seg.type === "helix") {
      // α-helix: 3.6 residues per turn, rise 1.5Å per residue
      // Model as tight regular spiral
      const helixPhase = inSeg * (2 * Math.PI / 3.6);
      const helixAxis = dir.clone();
      const perpA = new THREE.Vector3(1, 0, 0);
      if (Math.abs(perpA.dot(helixAxis)) > 0.9) perpA.set(0, 1, 0);
      perpA.cross(helixAxis).normalize();
      const perpB = perpA.clone().cross(helixAxis).normalize();

      const helixR = 0.35 * scale;
      const coil = perpA.clone().multiplyScalar(Math.cos(helixPhase) * helixR)
        .add(perpB.clone().multiplyScalar(Math.sin(helixPhase) * helixR));

      const advance = dir.clone().multiplyScalar(0.38 * scale); // ~1.5Å rise
      pos = pos.clone().add(advance).add(coil.multiplyScalar(0.15));

      // Gradual direction drift
      const driftAxis = new THREE.Vector3(rand()-0.5, rand()-0.5, rand()-0.5).normalize();
      dir.applyAxisAngle(driftAxis, 0.04 + rand() * 0.03).normalize();
    } else if (seg.type === "sheet") {
      // β-sheet: extended conformation, ~3.4Å rise, slight pleating
      const pleat = Math.sin(inSeg * Math.PI) * 0.08 * scale;
      const up = new THREE.Vector3(0, pleat, 0);
      const advance = dir.clone().multiplyScalar(0.55 * scale);
      pos = pos.clone().add(advance).add(up);

      const driftAxis = new THREE.Vector3(rand()-0.5, rand()-0.5, rand()-0.5).normalize();
      dir.applyAxisAngle(driftAxis, 0.025 + rand() * 0.02).normalize();
    } else {
      // Loop: irregular, more random
      const loopTwist = 0.15 + rand() * 0.4;
      const loopStep = 0.32 + rand() * 0.25;
      const axis = new THREE.Vector3(rand()-0.5, rand()-0.5, rand()-0.5).normalize();
      dir.applyAxisAngle(axis, loopTwist).normalize();
      pos = pos.clone().add(dir.clone().multiplyScalar(loopStep * scale));
    }

    backbone.push({ pos: pos.clone(), type: seg.type, t });
    inSeg++;
  }

  // Centre the chain
  const centre = new THREE.Vector3();
  backbone.forEach(b => centre.add(b.pos));
  centre.divideScalar(backbone.length);
  backbone.forEach(b => b.pos.sub(centre));

  // ── Backbone ribbon (CatmullRom tube with per-vertex SS colouring) ──
  const pts = backbone.map(b => b.pos);
  if (pts.length < 3) return { backbone };

  const curve = new THREE.CatmullRomCurve3(pts, false, "catmullrom", 0.35);
  const tubeSeg = Math.max(backbone.length * 5, 30);
  const tubeGeo = new THREE.TubeGeometry(curve, tubeSeg, 0.13 * scale, 8, false);
  const vColors = [];
  const pAttr = tubeGeo.attributes.position;
  for (let i = 0; i < pAttr.count; i++) {
    const frac = i / pAttr.count;
    const bIdx = Math.min(Math.floor(frac * backbone.length), backbone.length - 1);
    const c = ssColor(backbone[bIdx].type, chainIdx, backbone[bIdx].t);
    vColors.push(c.r, c.g, c.b);
  }
  tubeGeo.setAttribute("color", new THREE.Float32BufferAttribute(vColors, 3));
  const tubeMat = new THREE.MeshPhongMaterial({
    vertexColors:true, shininess:45, transparent:true, opacity:0.88, side:THREE.DoubleSide,
  });
  group.add(new THREE.Mesh(tubeGeo, tubeMat));

  // ── Helix wide cylinders (translucent overlay showing helical regions) ──
  let runStart = 0;
  for (const seg of segments) {
    if (seg.type === "helix" && seg.len >= 4) {
      const helixPts = [];
      for (let j = runStart; j < Math.min(runStart + seg.len, backbone.length); j++) {
        helixPts.push(backbone[j].pos);
      }
      if (helixPts.length >= 3) {
        const hCurve = new THREE.CatmullRomCurve3(helixPts, false, "catmullrom", 0.5);
        const hGeo = new THREE.TubeGeometry(hCurve, helixPts.length * 3, 0.42 * scale, 12, false);
        const hCol = ssColor("helix", chainIdx, runStart / backbone.length);
        const hMat = new THREE.MeshPhongMaterial({
          color:hCol, transparent:true, opacity:0.22, shininess:20,
          side:THREE.DoubleSide, depthWrite:false,
        });
        group.add(new THREE.Mesh(hGeo, hMat));
      }
    }
    if (seg.type === "sheet" && seg.len >= 3) {
      const sPts = [];
      for (let j = runStart; j < Math.min(runStart + seg.len, backbone.length); j++) {
        sPts.push(backbone[j].pos);
      }
      if (sPts.length >= 3) {
        const sCurve = new THREE.CatmullRomCurve3(sPts, false, "catmullrom", 0.5);
        const sGeo = new THREE.TubeGeometry(sCurve, sPts.length * 3, 0.52 * scale, 4, false);
        const sCol = ssColor("sheet", chainIdx, runStart / backbone.length);
        const sMat = new THREE.MeshPhongMaterial({
          color:sCol, transparent:true, opacity:0.18, shininess:10,
          flatShading:true, side:THREE.DoubleSide, depthWrite:false,
        });
        group.add(new THREE.Mesh(sGeo, sMat));
      }
    }
    runStart += seg.len;
  }

  // ── Cα atoms + side-chain branches ──
  const caGeo = new THREE.SphereGeometry(0.09 * scale, 6, 5);
  const scGeo = new THREE.SphereGeometry(0.065 * scale, 5, 4);
  const sc2Geo = new THREE.SphereGeometry(0.05 * scale, 4, 3);

  for (let i = 0; i < backbone.length; i++) {
    const b = backbone[i];
    const bCol = ssColor(b.type, chainIdx, b.t);

    // Cα sphere
    const caMat = new THREE.MeshPhongMaterial({ color:bCol, transparent:true, opacity:0.45 });
    const ca = new THREE.Mesh(caGeo, caMat);
    ca.position.copy(b.pos);
    group.add(ca);

    // Side chain (skip some for visual clarity)
    if (rand() > 0.25) {
      const branchDir = new THREE.Vector3(rand()-0.5, rand()-0.5, rand()-0.5).normalize();
      const branchLen = (0.35 + rand() * 0.85) * scale;
      const scPos = b.pos.clone().add(branchDir.clone().multiplyScalar(branchLen));

      // Bond
      const bondGeo = new THREE.BufferGeometry().setFromPoints([b.pos, scPos]);
      const bondMat = new THREE.LineBasicMaterial({ color:bCol, transparent:true, opacity:0.15 });
      group.add(new THREE.Line(bondGeo, bondMat));

      // Side-chain atom (CPK coloured)
      const scColor = pickAtomColor(rand);
      const scMat = new THREE.MeshPhongMaterial({ color:scColor, transparent:true, opacity:0.4 });
      const scMesh = new THREE.Mesh(scGeo, scMat);
      scMesh.position.copy(scPos);
      group.add(scMesh);

      // Longer side chains get a second atom
      if (rand() > 0.5) {
        const br2Dir = branchDir.clone().applyAxisAngle(
          new THREE.Vector3(rand()-0.5, rand()-0.5, rand()-0.5).normalize(), 0.7 + rand() * 0.5
        ).normalize();
        const sc2Pos = scPos.clone().add(br2Dir.multiplyScalar(0.25 * scale));
        const bond2Geo = new THREE.BufferGeometry().setFromPoints([scPos, sc2Pos]);
        group.add(new THREE.Line(bond2Geo, new THREE.LineBasicMaterial({ color:scColor, transparent:true, opacity:0.1 })));
        const sc2Mat = new THREE.MeshPhongMaterial({ color:pickAtomColor(rand), transparent:true, opacity:0.35 });
        const sc2 = new THREE.Mesh(sc2Geo, sc2Mat);
        sc2.position.copy(sc2Pos);
        group.add(sc2);

        // Occasionally a third
        if (rand() > 0.7) {
          const br3Dir = br2Dir.clone().applyAxisAngle(
            new THREE.Vector3(rand()-0.5,rand()-0.5,rand()-0.5).normalize(), 0.6
          ).normalize();
          const sc3Pos = sc2Pos.clone().add(br3Dir.multiplyScalar(0.18 * scale));
          const bond3Geo = new THREE.BufferGeometry().setFromPoints([sc2Pos, sc3Pos]);
          group.add(new THREE.Line(bond3Geo, new THREE.LineBasicMaterial({ color:0x666666, transparent:true, opacity:0.08 })));
          const sc3 = new THREE.Mesh(sc2Geo, new THREE.MeshPhongMaterial({ color:pickAtomColor(rand), transparent:true, opacity:0.3 }));
          sc3.position.copy(sc3Pos);
          group.add(sc3);
        }
      }
    }
  }

  return { backbone };
}

/* ═══════════════════════════════════════════════════════════════════════════
   BUILD FULL PROTEIN (all chains + ligands + water + surface)
   ═══════════════════════════════════════════════════════════════════════ */
function buildProtein(group, def, rand) {
  const chainCount = def.chains;
  const allBackbones = [];

  for (let ch = 0; ch < chainCount; ch++) {
    const { backbone } = buildChain(group, def, ch, chainCount, rand);
    allBackbones.push(backbone);
  }

  // ── Ligands ──
  const flat = allBackbones.flat();
  const protBox = new THREE.Box3();
  flat.forEach(b => protBox.expandByPoint(b.pos));
  const protCentre = protBox.getCenter(new THREE.Vector3());
  const protSize = protBox.getSize(new THREE.Vector3());

  if (def.ligands) {
    for (const lig of def.ligands) {
      if (lig.type === "heme") {
        // Place heme groups near each chain centre
        for (let h = 0; h < (lig.count || 1); h++) {
          const angle = (h / (lig.count || 1)) * Math.PI * 2;
          const hPos = new THREE.Vector3(
            Math.cos(angle) * protSize.x * 0.25,
            (rand() - 0.5) * protSize.y * 0.3,
            Math.sin(angle) * protSize.z * 0.25,
          );
          // Porphyrin ring
          const ringGeo = new THREE.TorusGeometry(0.7 * def.scale, 0.1 * def.scale, 8, 20);
          const ringMat = new THREE.MeshPhongMaterial({ color:lig.color, transparent:true, opacity:0.65, shininess:60 });
          const ring = new THREE.Mesh(ringGeo, ringMat);
          ring.position.copy(hPos);
          ring.rotation.x = Math.PI/2 + (rand()-0.5)*0.4;
          ring.rotation.z = rand() * Math.PI;
          group.add(ring);

          // Fe²⁺ centre
          const feGeo = new THREE.SphereGeometry(0.18 * def.scale, 8, 6);
          const feMat = new THREE.MeshPhongMaterial({ color:0xff6b35, emissive:0x331100, shininess:80 });
          const fe = new THREE.Mesh(feGeo, feMat);
          fe.position.copy(hPos);
          group.add(fe);

          // Glow
          const glowGeo = new THREE.SphereGeometry(1.0 * def.scale, 10, 8);
          const glowMat = new THREE.MeshBasicMaterial({ color:lig.color, transparent:true, opacity:0.04 });
          const glow = new THREE.Mesh(glowGeo, glowMat);
          glow.position.copy(hPos);
          group.add(glow);
        }
      } else if (lig.type === "chromophore") {
        // Central glowing chromophore
        const crGeo = new THREE.TorusGeometry(0.55 * def.scale, 0.14 * def.scale, 8, 14);
        const crMat = new THREE.MeshPhongMaterial({ color:lig.color, emissive:0x0a3010, transparent:true, opacity:0.75, shininess:80 });
        const cr = new THREE.Mesh(crGeo, crMat);
        cr.position.copy(protCentre);
        group.add(cr);

        // Strong glow effect
        for (let g = 0; g < 3; g++) {
          const glowGeo = new THREE.SphereGeometry((0.8 + g * 0.6) * def.scale, 12, 8);
          const glowMat = new THREE.MeshBasicMaterial({ color:lig.color, transparent:true, opacity:0.04 - g * 0.01 });
          const glow = new THREE.Mesh(glowGeo, glowMat);
          glow.position.copy(protCentre);
          group.add(glow);
        }
      } else if (lig.type === "ion") {
        for (let n = 0; n < (lig.count || 1); n++) {
          const ionPos = new THREE.Vector3(
            protCentre.x + (rand()-0.5) * protSize.x * 0.4,
            protCentre.y + (rand()-0.5) * protSize.y * 0.4,
            protCentre.z + (rand()-0.5) * protSize.z * 0.4,
          );
          const ionGeo = new THREE.SphereGeometry(0.2 * def.scale, 8, 6);
          const ionMat = new THREE.MeshPhongMaterial({
            color:lig.color, emissive:new THREE.Color(lig.color).multiplyScalar(0.2), shininess:90
          });
          const ion = new THREE.Mesh(ionGeo, ionMat);
          ion.position.copy(ionPos);
          group.add(ion);
        }
      } else if (lig.type === "disulfide") {
        // S-S bonds as yellow dumbbell shapes
        for (const pair of (lig.positions || [])) {
          const a = flat[Math.min(pair[0], flat.length-1)]?.pos;
          const b = flat[Math.min(pair[1], flat.length-1)]?.pos;
          if (a && b) {
            const bondGeo = new THREE.BufferGeometry().setFromPoints([a, b]);
            const bondMat = new THREE.LineBasicMaterial({ color:lig.color, transparent:true, opacity:0.5, linewidth:2 });
            group.add(new THREE.Line(bondGeo, bondMat));
            // Sulfur atoms at each end
            for (const p of [a, b]) {
              const sGeo = new THREE.SphereGeometry(0.14 * def.scale, 6, 5);
              const sMat = new THREE.MeshPhongMaterial({ color:0xffcc00, transparent:true, opacity:0.6 });
              const s = new THREE.Mesh(sGeo, sMat);
              s.position.copy(p);
              group.add(s);
            }
          }
        }
      } else if (lig.type === "substrate") {
        // Small molecule near active site
        for (let n = 0; n < (lig.count || 1); n++) {
          const sPos = protCentre.clone().add(new THREE.Vector3((rand()-0.5)*2, (rand()-0.5)*2, (rand()-0.5)*2));
          // Ring structure
          const rGeo = new THREE.TorusGeometry(0.3 * def.scale, 0.06 * def.scale, 6, 8);
          const rMat = new THREE.MeshPhongMaterial({ color:lig.color, transparent:true, opacity:0.6, shininess:40 });
          const r = new THREE.Mesh(rGeo, rMat);
          r.position.copy(sPos);
          r.rotation.set(rand()*Math.PI, rand()*Math.PI, 0);
          group.add(r);
        }
      }
    }
  }

  // ── Water molecules (scattered small blue dots) ──
  const waterGeo = new THREE.SphereGeometry(0.035 * def.scale, 4, 3);
  const waterMat = new THREE.MeshBasicMaterial({ color:0x3478f6, transparent:true, opacity:0.12 });
  const waterCount = Math.min(def.residues, 60);
  for (let i = 0; i < waterCount; i++) {
    const w = new THREE.Mesh(waterGeo, waterMat);
    w.position.set(
      protCentre.x + (rand()-0.5) * protSize.x * 1.5,
      protCentre.y + (rand()-0.5) * protSize.y * 1.5,
      protCentre.z + (rand()-0.5) * protSize.z * 1.5,
    );
    group.add(w);
  }

  // ── Transparent molecular surface ──
  const surfRadius = protSize.length() * 0.38;
  const surfGeo = new THREE.SphereGeometry(surfRadius, 32, 24);
  const surfCol = new THREE.Color().setHSL(def.surfaceHue, 0.5, 0.5);
  const surfMat = new THREE.MeshPhongMaterial({
    color:surfCol, transparent:true, opacity:0.035, shininess:8,
    side:THREE.DoubleSide, depthWrite:false,
  });
  const surf = new THREE.Mesh(surfGeo, surfMat);
  surf.position.copy(protCentre);
  group.add(surf);

  // Wireframe overlay
  const wireGeo = new THREE.SphereGeometry(surfRadius * 1.01, 20, 16);
  const wireMat = new THREE.MeshBasicMaterial({
    color:surfCol, wireframe:true, transparent:true, opacity:0.02,
  });
  const wire = new THREE.Mesh(wireGeo, wireMat);
  wire.position.copy(protCentre);
  group.add(wire);
}


/* ═══════════════════════════════════════════════════════════════════════════
   PROTEIN VIEWER COMPONENT
   ═══════════════════════════════════════════════════════════════════════ */
function ProteinViewer({ pdbId }) {
  const mountRef = useRef(null);
  const stateRef = useRef({ isDragging:false, prevMouse:{x:0,y:0}, rotX:0, rotY:0, targetZ:30 });

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;
    const def = PROTEINS[pdbId];
    if (!def) return;
    const rand = makeRng(pdbId + def.label);

    const w = container.clientWidth || 600;
    const h = container.clientHeight || 400;

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x030305);
    scene.fog = new THREE.FogExp2(0x030305, 0.008);

    const camera = new THREE.PerspectiveCamera(42, w/h, 0.1, 400);
    camera.position.set(0, 0, 30);

    const renderer = new THREE.WebGLRenderer({ antialias:true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    container.innerHTML = "";
    container.appendChild(renderer.domElement);

    // Lighting (3-point)
    scene.add(new THREE.AmbientLight(0x303040, 0.45));
    const keyLight = new THREE.DirectionalLight(0xffffff, 0.85);
    keyLight.position.set(15, 20, 18);
    scene.add(keyLight);
    const fillLight = new THREE.DirectionalLight(0x6688cc, 0.25);
    fillLight.position.set(-12, -6, 10);
    scene.add(fillLight);
    const surfCol = new THREE.Color().setHSL(def.surfaceHue, 0.6, 0.5);
    const rimLight = new THREE.DirectionalLight(surfCol, 0.18);
    rimLight.position.set(-8, -10, -15);
    scene.add(rimLight);

    // Build protein
    const group = new THREE.Group();
    scene.add(group);
    buildProtein(group, def, rand);

    // Fit camera
    const box = new THREE.Box3().setFromObject(group);
    const sz = box.getSize(new THREE.Vector3()).length();
    const camZ = sz * (def.viewDist || 1.15);
    camera.position.z = camZ;
    stateRef.current.targetZ = camZ;
    stateRef.current.rotX = 0;
    stateRef.current.rotY = 0;

    // ── Mouse/touch interaction ──
    const st = stateRef.current;
    const onDown = e => {
      st.isDragging = true;
      const cx = e.clientX ?? e.touches?.[0]?.clientX ?? 0;
      const cy = e.clientY ?? e.touches?.[0]?.clientY ?? 0;
      st.prevMouse = {x:cx, y:cy};
    };
    const onUp = () => { st.isDragging = false; };
    const onMove = e => {
      if (!st.isDragging) return;
      const cx = e.clientX ?? e.touches?.[0]?.clientX ?? 0;
      const cy = e.clientY ?? e.touches?.[0]?.clientY ?? 0;
      st.rotY += (cx - st.prevMouse.x) * 0.006;
      st.rotX += (cy - st.prevMouse.y) * 0.006;
      st.rotX = Math.max(-Math.PI/2, Math.min(Math.PI/2, st.rotX));
      st.prevMouse = {x:cx, y:cy};
    };
    const onWheel = e => {
      e.preventDefault();
      st.targetZ = Math.max(sz * 0.4, Math.min(sz * 3, st.targetZ + e.deltaY * 0.04));
    };

    const canvas = renderer.domElement;
    canvas.addEventListener("mousedown", onDown);
    canvas.addEventListener("touchstart", onDown, {passive:true});
    window.addEventListener("mouseup", onUp);
    window.addEventListener("touchend", onUp);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("touchmove", onMove, {passive:true});
    canvas.addEventListener("wheel", onWheel, {passive:false});

    // ── Animation loop ──
    let frame;
    const clock = new THREE.Clock();
    const animate = () => {
      frame = requestAnimationFrame(animate);
      const dt = clock.getDelta();

      // Auto-rotate (paused while dragging)
      if (!st.isDragging) st.rotY += dt * 0.12;

      group.rotation.y = st.rotY;
      group.rotation.x = st.rotX;

      // Smooth zoom
      camera.position.z += (st.targetZ - camera.position.z) * 0.08;

      renderer.render(scene, camera);
    };
    animate();

    const onResize = () => {
      const nw = container.clientWidth;
      const nh = container.clientHeight;
      if (nw > 0 && nh > 0) {
        camera.aspect = nw/nh;
        camera.updateProjectionMatrix();
        renderer.setSize(nw, nh);
      }
    };
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(frame);
      canvas.removeEventListener("mousedown", onDown);
      canvas.removeEventListener("touchstart", onDown);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("touchend", onUp);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("touchmove", onMove);
      canvas.removeEventListener("wheel", onWheel);
      window.removeEventListener("resize", onResize);
      renderer.dispose();
    };
  }, [pdbId]);

  return <div ref={mountRef} style={{width:"100%",height:"100%",background:"#030305",cursor:"grab"}} />;
}


/* ═══════════════════════════════════════════════════════════════════════════
   WORKFLOW BAR
   ═══════════════════════════════════════════════════════════════════════ */
function WorkflowBar({ step }) {
  return (
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",padding:"10px 20px",borderTop:`1px solid ${C.borderSub}`,background:C.surface}}>
      {wfSteps.map((s,i) => {
        const d = i<step?"done":i===step?"active":"pending";
        return (
          <Fragment key={i}>
            <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
              <div style={{
                width:20,height:20,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",
                fontFamily:mono,fontSize:9,fontWeight:500,transition:"all 0.35s",
                background:d==="done"?C.accentDim:d==="active"?C.accent:C.raised,
                color:d==="done"?C.accent:d==="active"?"#000":C.t3,
                border:`1.5px solid ${d==="done"?"rgba(48,209,88,0.25)":d==="active"?C.accent:C.border}`,
                boxShadow:d==="active"?"0 0 8px rgba(48,209,88,0.2)":"none",
              }}>{d==="done"?"✓":i+1}</div>
              <span style={{fontSize:9,fontFamily:mono,color:d==="active"?C.accent:d==="done"?"rgba(48,209,88,0.5)":C.t3}}>{s}</span>
            </div>
            {i<wfSteps.length-1&&<div style={{width:28,height:1,margin:"0 4px",marginBottom:16,background:i<step?"rgba(48,209,88,0.2)":C.border}}/>}
          </Fragment>
        );
      })}
    </div>
  );
}


/* ═══════════════════════════════════════════════════════════════════════════
   CHAT
   ═══════════════════════════════════════════════════════════════════════ */
function Chat({ pdbId }) {
  const [msgs,setMsgs] = useState([{role:"sys",text:"BioSentinel assistant ready. Ask about proteins, scores, or workflow."}]);
  const [input,setInput] = useState("");
  const endRef = useRef(null);
  useEffect(()=>{endRef.current?.scrollIntoView({behavior:"smooth"})}, [msgs]);

  const send = () => {
    const q = input.trim(); if (!q) return;
    setMsgs(p=>[...p,{role:"user",text:q}]); setInput("");
    setTimeout(()=>{
      const l = q.toLowerCase();
      const def = PROTEINS[pdbId];
      let r = "I can help with proteins, scores, items, or workflow status.";
      if (l.includes("score")) r = "ITEM001 leads at 0.97. Three items above 0.90 — strong confidence across the board.";
      else if (l.includes("item")) r = `${dataItems.length} items total. ${dataItems.filter(d=>d.status==="pass").length} passed QC, ${dataItems.filter(d=>d.status==="warn").length} flagged for review.`;
      else if (l.includes("workflow")||l.includes("step")) r = "Pipeline: Ingest → Validate → Analyze → Score → Report. Currently in the Analyze phase.";
      else if (l.includes("protein")||l.includes("structure")||l.includes("pdb")) r = def ? `Viewing ${def.label} (${def.pdb}): ${def.desc}. ${def.mw}, from ${def.organism}. Drag to orbit, scroll to zoom.` : "Select a protein from the dropdown.";
      else if (l.includes("heatmap")||l.includes("cond")) r = "Peak interaction: 0.95 at 002 × Cond B. The matrix suggests strong binding specificity for conditions B and C.";
      else if (l.includes("hemoglobin")) r = "Hemoglobin (4HHB) is a 64.5 kDa tetramer with α₂β₂ subunit architecture. Each subunit binds one heme group with an Fe²⁺ centre for O₂ transport.";
      else if (l.includes("gfp")||l.includes("green")) r = "GFP (1EMA) from Aequorea victoria features an 11-stranded β-barrel enclosing an autocatalytic chromophore formed from residues Ser65-Tyr66-Gly67.";
      else if (l.includes("hi")||l.includes("hello")) r = "Hello! Ask me about any loaded protein, the scoring data, or workflow status.";
      setMsgs(p=>[...p,{role:"sys",text:r}]);
    }, 400);
  };

  return (
    <div style={{display:"flex",flexDirection:"column",height:"100%"}}>
      <div style={{padding:"6px 20px",borderBottom:`1px solid ${C.borderSub}`,display:"flex",alignItems:"center",gap:8,fontFamily:mono,fontSize:10,color:C.t3}}>
        <span style={{width:5,height:5,borderRadius:"50%",background:C.accent,boxShadow:"0 0 4px rgba(48,209,88,0.3)"}}/>Assistant
      </div>
      <div style={{flex:1,overflowY:"auto",padding:"8px 20px",display:"flex",flexDirection:"column",gap:5}}>
        {msgs.map((m,i)=>(
          <div key={i} style={{
            alignSelf:m.role==="user"?"flex-end":"flex-start",
            maxWidth:"65%",padding:"7px 13px",borderRadius:12,fontSize:12,lineHeight:1.5,
            background:m.role==="user"?C.accent:C.raised,color:m.role==="user"?"#000":C.t2,
            borderBottomRightRadius:m.role==="user"?4:12,borderBottomLeftRadius:m.role!=="user"?4:12,
            border:m.role!=="user"?`1px solid ${C.border}`:"none",
          }}>{m.text}</div>
        ))}
        <div ref={endRef}/>
      </div>
      <div style={{display:"flex",gap:8,padding:"8px 20px 10px"}}>
        <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&send()}
          placeholder="Ask about proteins, scores, workflow…"
          style={{flex:1,background:C.raised,border:`1px solid ${C.border}`,borderRadius:10,padding:"8px 14px",fontFamily:sans,fontSize:12,color:C.t1,outline:"none"}}
          onFocus={e=>e.target.style.borderColor="rgba(48,209,88,0.25)"}
          onBlur={e=>e.target.style.borderColor=C.border}/>
        <button onClick={send} style={{width:34,height:34,borderRadius:10,background:C.accent,border:"none",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",color:"#000",flexShrink:0}}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
        </button>
      </div>
    </div>
  );
}


/* ═══════════════════════════════════════════════════════════════════════════
   APP
   ═══════════════════════════════════════════════════════════════════════ */
export default function App() {
  const [selected,setSelected] = useState(null);
  const [step,setStep] = useState(2);
  const [pdbId,setPdbId] = useState("1CRN");
  const [running,setRunning] = useState(false);
  const [tooltip,setTooltip] = useState(null);
  const def = PROTEINS[pdbId];

  const run = useCallback(()=>{
    setRunning(true);
    setStep(s=>Math.min(s+1,wfSteps.length-1));
    setTimeout(()=>setRunning(false),1400);
  },[]);

  return (
    <div style={{width:"100vw",height:"100vh",background:C.bg,display:"grid",gridTemplateColumns:"248px 1fr 280px",gridTemplateRows:"44px 1fr 168px",fontFamily:sans,WebkitFontSmoothing:"antialiased",overflow:"hidden"}}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600&display=swap');*{margin:0;padding:0;box-sizing:border-box}::-webkit-scrollbar{width:0}`}</style>

      {/* ── Header ── */}
      <div style={{gridColumn:"1/-1",background:C.surface,display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 20px",borderBottom:`1px solid ${C.borderSub}`}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:22,height:22,borderRadius:5,background:C.accent,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:600,color:"#000"}}>B</div>
          <span style={{fontSize:13,fontWeight:500,color:C.t1}}>BioSentinel</span>
          <span style={{fontFamily:mono,fontSize:10,color:C.t3}}>v2.4</span>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:14}}>
          <span style={{width:5,height:5,borderRadius:"50%",background:C.accent,boxShadow:"0 0 6px rgba(48,209,88,0.25)"}}/>
          <span style={{fontFamily:mono,fontSize:10,color:C.t3}}>{new Date().toLocaleString("en-GB",{day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"})}</span>
        </div>
      </div>

      {/* ── Left sidebar ── */}
      <div style={{background:C.surface,display:"flex",flexDirection:"column",overflow:"hidden",borderRight:`1px solid ${C.borderSub}`}}>
        <div style={{padding:"10px 16px",display:"flex",alignItems:"center",justifyContent:"space-between",borderBottom:`1px solid ${C.borderSub}`}}>
          <div style={{display:"inline-flex",alignItems:"center",gap:5,padding:"3px 9px",borderRadius:100,fontFamily:mono,fontSize:10,fontWeight:500,background:running?C.warnDim:C.accentDim,color:running?C.warn:C.accent}}>
            <span style={{width:4,height:4,borderRadius:"50%",background:"currentColor"}}/>
            {running?"Running":"Idle"}
          </div>
          <span style={{fontFamily:mono,fontSize:12,fontWeight:500,color:C.t1}}>85<span style={{fontSize:10,color:C.t3}}>%</span></span>
        </div>
        <button onClick={run} disabled={running} style={{margin:"8px 16px",padding:"7px 0",borderRadius:7,border:running?`1px solid ${C.border}`:"1px solid transparent",cursor:running?"default":"pointer",fontFamily:sans,fontSize:11.5,fontWeight:500,background:running?C.raised:C.accent,color:running?C.accent:"#000",transition:"all 0.2s"}}>
          {running?"Running…":"Run Workflow"}
        </button>
        <div style={{fontFamily:mono,fontSize:9,fontWeight:500,color:C.t3,textTransform:"uppercase",letterSpacing:"0.06em",padding:"10px 16px 6px"}}>Activity</div>
        <div style={{flex:1,overflowY:"auto",paddingBottom:8}}>
          {activities.map((a,i)=>(
            <div key={i} style={{padding:"8px 16px",display:"flex",gap:9,alignItems:"flex-start",cursor:"default",transition:"background 0.12s"}}
              onMouseEnter={e=>e.currentTarget.style.background=C.hover}
              onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
              <div style={{width:24,height:24,borderRadius:5,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:10,background:a.src==="alert"?C.warnDim:C.raised,color:a.src==="alert"?C.warn:C.t3}}>
                {a.src==="lab"?"◉":a.src==="alert"?"△":"⊡"}
              </div>
              <div>
                <div style={{fontSize:11.5,color:C.t2,lineHeight:1.4}}>{a.msg}</div>
                <div style={{display:"flex",gap:8,marginTop:2,fontFamily:mono,fontSize:9.5,color:C.t3}}>
                  <span>{a.time}</span>
                  {a.loc&&<span style={{color:C.accent,opacity:0.6}}>{a.loc}</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Centre: Viewer ── */}
      <div style={{background:"#030305",display:"flex",flexDirection:"column",overflow:"hidden"}}>
        <div style={{flex:1,position:"relative"}}>
          <ProteinViewer pdbId={pdbId} />

          {/* Top-left: SS legend */}
          <div style={{position:"absolute",top:10,left:10,display:"flex",flexDirection:"column",gap:3}}>
            {[{color:"hsl(2,75%,52%)",label:"α-helix"},{color:"hsl(206,62%,48%)",label:"β-sheet"},{color:"hsl(36,12%,42%)",label:"Loop/coil"},{color:"#ffcc00",label:"S-S bond"},{color:"#3478f6",label:"Water"}].map((l,i)=>(
              <div key={i} style={{display:"flex",alignItems:"center",gap:5,padding:"2px 8px",borderRadius:4,background:"rgba(0,0,0,0.55)",backdropFilter:"blur(6px)"}}>
                <span style={{width:8,height:3,borderRadius:1,background:l.color}}/>
                <span style={{fontFamily:mono,fontSize:8,color:C.t3}}>{l.label}</span>
              </div>
            ))}
          </div>

          {/* Top-right: protein selector */}
          <div style={{position:"absolute",top:10,right:10}}>
            <select value={pdbId} onChange={e=>setPdbId(e.target.value)} style={{background:"rgba(0,0,0,0.6)",backdropFilter:"blur(8px)",border:"1px solid rgba(255,255,255,0.06)",borderRadius:7,padding:"6px 10px",fontFamily:mono,fontSize:10.5,color:C.t2,cursor:"pointer",outline:"none",WebkitAppearance:"none"}}>
              {Object.entries(PROTEINS).map(([k,v])=><option key={k} value={k} style={{background:"#111"}}>{v.label} ({k})</option>)}
            </select>
          </div>

          {/* Bottom-left: metadata chips */}
          <div style={{position:"absolute",bottom:10,left:10,display:"flex",gap:5,flexWrap:"wrap"}}>
            {[`PDB: ${def.pdb}`, `${def.residues} residues`, `${def.chains} chain${def.chains>1?"s":""}`, def.mw].map((l,i)=>(
              <span key={i} style={{padding:"3px 9px",borderRadius:5,background:"rgba(0,0,0,0.6)",backdropFilter:"blur(8px)",fontFamily:mono,fontSize:9,color:i===0?C.accent:C.t3,border:"1px solid rgba(255,255,255,0.04)"}}>{l}</span>
            ))}
          </div>

          {/* Bottom-right: description */}
          <div style={{position:"absolute",bottom:10,right:10,padding:"5px 10px",borderRadius:6,background:"rgba(0,0,0,0.6)",backdropFilter:"blur(8px)",fontFamily:mono,fontSize:8.5,color:C.t3,border:"1px solid rgba(255,255,255,0.04)",maxWidth:200,lineHeight:1.4}}>
            {def.desc}<br/><span style={{color:C.t3,opacity:0.6}}>{def.organism}</span>
          </div>

          {/* Centre hint (fades) */}
          <div style={{position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%)",pointerEvents:"none",fontFamily:mono,fontSize:10,color:"rgba(255,255,255,0.06)",textAlign:"center"}}>
            drag to orbit · scroll to zoom
          </div>
        </div>
        <WorkflowBar step={step} />
      </div>

      {/* ── Right sidebar ── */}
      <div style={{background:C.surface,display:"flex",flexDirection:"column",overflow:"hidden",borderLeft:`1px solid ${C.borderSub}`}}>
        <div style={{flex:1,overflowY:"auto"}}>
          <div style={{fontFamily:mono,fontSize:9,fontWeight:500,color:C.t3,textTransform:"uppercase",letterSpacing:"0.06em",padding:"12px 16px 6px"}}>Items</div>
          <table style={{width:"100%",borderCollapse:"collapse"}}>
            <thead><tr>{["#","ID","Score",""].map((h,i)=>(
              <th key={i} style={{textAlign:i===2?"right":"left",padding:"5px 16px",fontFamily:mono,fontSize:9,fontWeight:500,color:C.t3,textTransform:"uppercase",letterSpacing:"0.04em",borderBottom:`1px solid ${C.borderSub}`,position:"sticky",top:0,background:C.surface,zIndex:1}}>{h}</th>
            ))}</tr></thead>
            <tbody>{dataItems.map((d,i)=>{
              const sel = d.id===selected;
              return (
                <tr key={d.id} onClick={()=>setSelected(d.id)} style={{cursor:"pointer",background:sel?C.accentGlow:"transparent",transition:"background 0.12s"}}
                  onMouseEnter={e=>{if(!sel)e.currentTarget.style.background=C.hover}}
                  onMouseLeave={e=>{e.currentTarget.style.background=sel?C.accentGlow:"transparent"}}>
                  <td style={{padding:"6px 16px",fontFamily:mono,fontSize:10,color:C.t3}}>{i+1}</td>
                  <td style={{padding:"6px 16px",fontFamily:mono,fontSize:11,fontWeight:500,color:sel?C.accent:C.t1}}>{d.id}</td>
                  <td style={{padding:"6px 16px",fontFamily:mono,fontSize:11,fontWeight:500,color:sColor(d.score),textAlign:"right"}}>{d.score.toFixed(2)}</td>
                  <td style={{padding:"6px 16px",fontSize:11,textAlign:"center",color:d.status==="pass"?C.accent:C.warn,opacity:0.7}}>{d.status==="pass"?"✓":"⚠"}</td>
                </tr>
              );
            })}</tbody>
          </table>
        </div>
        <div style={{borderTop:`1px solid ${C.borderSub}`}}>
          <div style={{fontFamily:mono,fontSize:9,fontWeight:500,color:C.t3,textTransform:"uppercase",letterSpacing:"0.06em",padding:"10px 16px 6px"}}>Heatmap</div>
          <div style={{display:"grid",gridTemplateColumns:`42px repeat(${hmap.conds.length},1fr)`,gap:2,padding:"0 16px 12px"}}>
            <div/>
            {hmap.conds.map((c,i)=><div key={i} style={{textAlign:"center",fontFamily:mono,fontSize:8.5,color:C.t3,padding:"3px 0"}}>{c}</div>)}
            {hmap.matrix.map((row,ri)=>(
              <Fragment key={ri}>
                <div style={{fontFamily:mono,fontSize:8.5,color:C.t3,display:"flex",alignItems:"center"}}>{hmap.rows[ri]}</div>
                {row.map((v,ci)=>(
                  <div key={ci}
                    onMouseEnter={e=>setTooltip({v,row:hmap.rows[ri],cond:hmap.conds[ci],x:e.clientX,y:e.clientY})}
                    onMouseLeave={()=>setTooltip(null)}
                    style={{background:hmBg(v),borderRadius:3,height:26,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:mono,fontSize:9,fontWeight:500,color:v>0.7?"rgba(255,255,255,0.8)":"rgba(255,255,255,0.35)",cursor:"default",transition:"transform 0.1s"}}
                    onMouseOver={e=>e.currentTarget.style.transform="scale(1.08)"}
                    onMouseOut={e=>e.currentTarget.style.transform="scale(1)"}
                  >{v.toFixed(2)}</div>
                ))}
              </Fragment>
            ))}
          </div>
        </div>
      </div>

      {/* ── Bottom: Chat ── */}
      <div style={{gridColumn:"1/-1",background:C.surface,borderTop:`1px solid ${C.borderSub}`,overflow:"hidden"}}>
        <Chat pdbId={pdbId} />
      </div>

      {/* Tooltip */}
      {tooltip&&(
        <div style={{position:"fixed",left:tooltip.x+12,top:tooltip.y-42,zIndex:100,background:C.raised,border:`1px solid ${C.border}`,borderRadius:7,padding:"6px 10px",fontFamily:mono,fontSize:10,color:C.t1,boxShadow:"0 6px 24px rgba(0,0,0,0.5)",pointerEvents:"none"}}>
          <div style={{fontSize:9,color:C.t3,marginBottom:1}}>{tooltip.row} × {tooltip.cond}</div>
          <div style={{fontSize:13,fontWeight:500,color:sColor(tooltip.v)}}>{tooltip.v.toFixed(3)}</div>
        </div>
      )}
    </div>
  );
}
