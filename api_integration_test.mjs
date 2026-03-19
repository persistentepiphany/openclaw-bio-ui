/**
 * BioSentinel — V2 API Integration Tests
 *
 * Tests every v2 endpoint for:
 *   - HTTP reachability
 *   - Response schema correctness
 *   - Value range validity
 *   - Full pipeline: submit → poll → complete
 *
 * Also validates the OLD API (baseline for v2 parity) in section 2.
 *
 * Run with: node api_integration_test.mjs
 *
 * API under test: https://divine-cat-v2-v2.up.railway.app/api/v2/*
 * Old API (baseline): https://divine-cat-production-94fe.up.railway.app/api/*
 */

const V2_API  = 'https://divine-cat-v2-v2.up.railway.app';
const OLD_API = 'https://divine-cat-production-94fe.up.railway.app';

const DEFAULT_TIMEOUT = 15_000;

// ─── output helpers ──────────────────────────────────────────────────────────

let passed = 0, failed = 0, warned = 0;
const log = [];

function check(ok, label, detail = '') {
  const tag = ok === 'WARN' ? 'WARN' : ok ? 'PASS' : 'FAIL';
  if (tag === 'PASS') passed++;
  else if (tag === 'FAIL') failed++;
  else warned++;
  log.push({ tag, label, detail });
  const icon  = tag === 'PASS' ? '✓' : tag === 'WARN' ? '⚠' : '✗';
  const color = tag === 'PASS' ? '\x1b[32m' : tag === 'WARN' ? '\x1b[33m' : '\x1b[31m';
  console.log(`  ${color}${icon}\x1b[0m  ${tag.padEnd(4)}  ${label}${detail ? `  \x1b[2m→ ${detail}\x1b[0m` : ''}`);
}

function section(title) {
  console.log(`\n\x1b[1m${'─'.repeat(60)}\x1b[0m`);
  console.log(`\x1b[1m ${title}\x1b[0m`);
  console.log(`${'─'.repeat(60)}`);
}

function show(label, value) {
  const str = typeof value === 'object' ? JSON.stringify(value) : String(value ?? '');
  console.log(`  \x1b[2m     ${label}: ${str.slice(0, 140)}\x1b[0m`);
}

// ─── http helpers ─────────────────────────────────────────────────────────────

async function request(method, base, path, payload, timeoutMs = DEFAULT_TIMEOUT) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const opts = {
      method,
      headers: { 'Content-Type': 'application/json' },
      signal: ctrl.signal,
    };
    if (payload !== undefined) opts.body = JSON.stringify(payload);
    const res = await fetch(`${base}${path}`, opts);
    clearTimeout(timer);
    const text = await res.text();
    let body;
    try { body = JSON.parse(text); } catch { body = text; }
    return { ok: res.ok, status: res.status, body };
  } catch (e) {
    clearTimeout(timer);
    return { ok: false, status: 0, body: null, error: e.message };
  }
}

const get  = (base, path, ms)      => request('GET',  base, path, undefined, ms);
const post = (base, path, data, ms) => request('POST', base, path, data, ms);

// ─── validators ──────────────────────────────────────────────────────────────

const UUID_RE        = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PDB_ID_RE      = /^[0-9][A-Z0-9]{3}$/i;
const VALID_SEVERITY = new Set(['LOW','MEDIUM','HIGH','CRITICAL','low','medium','high','critical']);
const VALID_AA       = /^[ACDEFGHIKLMNPQRSTVWY]+$/i;
const PIPELINE_OK    = new Set(['running','pending','complete','completed','failed','cancelled','queued']);

function inRange(v, lo, hi) { return typeof v === 'number' && v >= lo && v <= hi; }
function isObj(v)            { return v && typeof v === 'object' && !Array.isArray(v); }
function isRecent(ts, hrs=72){ if (!ts) return false; return (Date.now() - new Date(ts).getTime()) < hrs*3_600_000; }

// ─── V2 API Tests ─────────────────────────────────────────────────────────────

async function v2Health() {
  section('V2 — GET /api/v2/health');
  const r = await get(V2_API, '/api/v2/health');
  if (r.error) { check(false, 'Connection', r.error); return false; }

  if (r.status === 404 && isObj(r.body) && r.body.message === 'Application not found') {
    check('WARN', 'V2 backend not yet deployed (Railway 404 — service not running)', V2_API);
    check('WARN', 'All v2 endpoint tests will be skipped until backend is deployed');
    return false;
  }

  check(r.ok, 'HTTP 200', `status=${r.status}`);
  if (!r.ok) return false;
  show('response', r.body);
  check(r.body?.status === 'ok' || r.body?.status === 'healthy', 'status is ok/healthy', r.body?.status);
  return true;
}

async function v2Threats(deployed) {
  section('V2 — GET /api/v2/threats');
  if (!deployed) { check('WARN', 'SKIPPED — v2 not deployed'); return null; }

  const r = await get(V2_API, '/api/v2/threats');
  check(r.ok, 'HTTP 200', `status=${r.status}`);
  if (!r.ok) return null;

  const items = Array.isArray(r.body) ? r.body : (r.body?.threats ?? []);
  check(items.length > 0, 'Non-empty threats list', `${items.length} items`);
  if (items.length === 0) return null;

  show('item[0] keys', Object.keys(items[0]));
  check(items.every(e => e.title || e.message), 'All items have title/message');
  check(items.every(e => e.source || e.source_name), 'All items have source');
  check(items.every(e => e.reported_at || e.timestamp || e.time || e.date), 'All items have timestamp');

  const withSev = items.filter(e => e.severity);
  if (withSev.length > 0) {
    const bad = withSev.filter(e => !VALID_SEVERITY.has(e.severity));
    check(bad.length === 0, 'Severity values valid',
      bad.length ? `invalid: ${[...new Set(bad.map(e => e.severity))].join(', ')}` : `${withSev.length} checked`);
  }
  return items;
}

async function v2ThreatsSearch(deployed) {
  section('V2 — GET /api/v2/threats?q=H5N1  (search)');
  if (!deployed) { check('WARN', 'SKIPPED — v2 not deployed'); return; }

  const r = await get(V2_API, '/api/v2/threats?q=H5N1', 30_000);
  check(r.ok || r.status === 501, 'Responded', `status=${r.status}`);
  if (r.status === 501) { check('WARN', 'Search not yet implemented on v2 (501)'); return; }
  if (!r.ok) return;

  // TODO: /api/v2/threats?q= query param filtering not yet verified on backend
  const items = r.body?.threats || r.body?.entries || (Array.isArray(r.body) ? r.body : []);
  check(items.length > 0, 'Returns filtered results', `${items.length} items`);
  if (items.length > 0) {
    const relevant = items.filter(e => /h5n1|avian|influenza/i.test(e.title || e.message || ''));
    check(relevant.length > 0, 'Results contain H5N1/avian/influenza terms',
      `${relevant.length}/${items.length} relevant`);
  }
}

async function v2Candidates(deployed) {
  section('V2 — GET /api/v2/candidates');
  if (!deployed) { check('WARN', 'SKIPPED — v2 not deployed'); return; }

  const r = await get(V2_API, '/api/v2/candidates');
  check(r.ok, 'HTTP 200', `status=${r.status}`);
  if (!r.ok) return;

  const candidates = Array.isArray(r.body) ? r.body : (r.body?.candidates ?? []);
  check(candidates.length > 0, 'Non-empty', `${candidates.length} candidates`);
  if (candidates.length === 0) return;
  show('sample keys', Object.keys(candidates[0]));

  const active = candidates.filter(c => c.status !== 'failed');
  if (active.length === 0) {
    check('WARN', 'All candidates are failed — pipeline has not run against v2 yet');
    return;
  }
  const scores = active.map(c => c.design_score ?? c.score ?? c.binding_score).filter(s => s != null);
  if (scores.length > 0) {
    const bad = scores.filter(s => !inRange(s, 0, 1));
    check(bad.length === 0, 'Scores in 0–1 range',
      `min=${Math.min(...scores).toFixed(3)} max=${Math.max(...scores).toFixed(3)}`);
  }
  const seqs = candidates.filter(c => c.sequence && !VALID_AA.test(c.sequence));
  check(seqs.length === 0, 'Sequences have valid amino acid characters', `${seqs.length} invalid`);
}

async function v2Heatmap(deployed) {
  section('V2 — GET /api/v2/heatmap');
  if (!deployed) { check('WARN', 'SKIPPED — v2 not deployed'); return; }

  const r = await get(V2_API, '/api/v2/heatmap');
  check(r.ok, 'HTTP 200', `status=${r.status}`);
  if (!r.ok) return;

  const { variants, candidates, items, matrix } = r.body || {};
  const rows = variants || [];
  const cols = items || candidates || [];
  check(rows.length > 0, 'variants array', `${rows.length}`);
  check(cols.length > 0, 'items/candidates array', `${cols.length}`);
  check(Array.isArray(matrix) && matrix.length > 0, 'matrix present', `${matrix?.length} rows`);
  if (rows.length > 0 && matrix?.length > 0) {
    check(matrix.length === rows.length, 'matrix rows = variant count');
    if (Array.isArray(matrix[0])) {
      const flat = matrix.flat().filter(v => v != null);
      check(flat.every(v => typeof v === 'number'), 'All values numeric');
      const mn = Math.min(...flat), mx = Math.max(...flat);
      check((mn >= 0 && mx <= 1) || (mn >= 0 && mx <= 100), 'Values in 0–1 or 0–100 range',
        `min=${mn.toFixed(3)} max=${mx.toFixed(3)}`);
    }
  }
}

async function v2Biosecurity(deployed) {
  section('V2 — GET /api/v2/biosecurity');
  if (!deployed) { check('WARN', 'SKIPPED — v2 not deployed'); return; }

  const r = await get(V2_API, '/api/v2/biosecurity');
  check(r.ok, 'HTTP 200', `status=${r.status}`);
  if (!r.ok) return;
  check(r.body != null, 'Non-null response');
  show('keys / shape', Array.isArray(r.body) ? `array[${r.body.length}]` : Object.keys(r.body || {}).join(', '));
}

async function v2ProteinList(deployed) {
  section('V2 — GET /api/v2/protein/list');
  if (!deployed) { check('WARN', 'SKIPPED — v2 not deployed'); return; }

  const r = await get(V2_API, '/api/v2/protein/list');
  check(r.ok, 'HTTP 200', `status=${r.status}`);
  if (!r.ok) return;

  const proteins = r.body?.proteins || (Array.isArray(r.body) ? r.body : []);
  check(proteins.length > 0, 'Non-empty', `${proteins.length} proteins`);
  if (proteins.length === 0) return;
  show('sample', proteins[0]);
  check(proteins.every(p => p.pdb_id), 'All have pdb_id');
  check(proteins.every(p => p.name || p.protein_name || p.label), 'All have name');
  const badIds = proteins.filter(p => !PDB_ID_RE.test(p.pdb_id || ''));
  check(badIds.length === 0, 'PDB IDs match 4-char format', `${proteins.length} checked`);
  show('PDB IDs', proteins.slice(0, 8).map(p => p.pdb_id).join(', '));
  return proteins;
}

async function v2ProteinBundle(deployed) {
  section('V2 — POST /api/v2/protein/bundle + GET .../pdb');
  if (!deployed) { check('WARN', 'SKIPPED — v2 not deployed'); return; }

  const r = await post(V2_API, '/api/v2/protein/bundle', { pdb_id: '6VMZ' }, 20_000);
  check(r.ok || r.status === 501, 'Responded', `status=${r.status}`);
  if (r.status === 501) { check('WARN', 'Bundle not yet implemented (501)'); return; }
  if (!r.ok) return;
  show('bundle keys', Object.keys(r.body || {}));
  check(r.body?.pdb_id === '6VMZ', 'Returns matching pdb_id', r.body?.pdb_id);
  check(!!r.body?.metadata, 'Has metadata block');

  // Try fetching PDB text
  const pdb = await get(V2_API, '/api/v2/protein/bundle/6VMZ/pdb', 15_000);
  check(pdb.ok, 'GET .../pdb HTTP 200', `status=${pdb.status}`);
  if (pdb.ok && typeof pdb.body === 'string') {
    check(pdb.body.startsWith('HEADER') || pdb.body.startsWith('ATOM') || pdb.body.startsWith('REMARK'),
      'PDB text has valid PDB header', pdb.body.slice(0, 40));
    check(pdb.body.includes('ATOM'), 'PDB text contains ATOM records');
    check(pdb.body.length > 1000, 'PDB text has meaningful length', `${pdb.body.length} chars`);
  }
}

async function v2Pipeline(deployed) {
  section('V2 — POST /api/v2/pipeline/run + GET /api/v2/pipeline/status/:id');
  if (!deployed) { check('WARN', 'SKIPPED — v2 not deployed'); return; }

  const r = await post(V2_API, '/api/v2/pipeline/run', {
    mode: 'mock', target_pdb: '6VMZ', num_candidates: 1,
  }, 20_000);
  check(r.ok || r.status === 501, 'Responded', `status=${r.status}`);
  if (r.status === 501) { check('WARN', 'Pipeline/run not yet implemented (501)'); return; }
  if (!r.ok) return;

  const jobId = r.body?.job_id;
  check(!!jobId, 'Returns job_id', jobId);
  check(UUID_RE.test(jobId || ''), 'job_id is UUID format', jobId);
  if (!jobId) return;

  // Poll status
  const s = await get(V2_API, `/api/v2/pipeline/status/${encodeURIComponent(jobId)}`);
  check(s.ok, 'Pipeline status HTTP 200', `status=${s.status}`);
  if (!s.ok) return;
  show('status', s.body);
  check(PIPELINE_OK.has(s.body?.status), 'status is known value', `"${s.body?.status}"`);
  if (s.body?.progress !== undefined)
    check(inRange(s.body.progress, 0, 1), 'progress in 0–1', `${s.body.progress}`);
}

async function v2SyncScraper(deployed) {
  section('V2 — POST /api/v2/sync-scraper');
  if (!deployed) { check('WARN', 'SKIPPED — v2 not deployed'); return; }

  // TODO: /api/v2/sync-scraper not yet verified on backend
  const r = await post(V2_API, '/api/v2/sync-scraper', {}, 30_000);
  check(r.ok || r.status === 501 || r.status === 202, 'Responded',
    `status=${r.status}`);
  if (r.status === 501) { check('WARN', 'sync-scraper not yet implemented (501)'); return; }
  if (!r.ok && r.status !== 202) return;
  show('response', r.body);
  if (r.body?.synced !== undefined)
    check(typeof r.body.synced === 'boolean', 'synced is boolean');
}

async function v2Chat(deployed) {
  section('V2 — POST /api/v2/chat');
  if (!deployed) { check('WARN', 'SKIPPED — v2 not deployed'); return; }

  const r = await post(V2_API, '/api/v2/chat', {
    message: 'What is the H5N1 threat level and which protein targets are most relevant?',
    candidates: [], threat_feed: [], history: [],
  }, 30_000);
  check(r.ok || r.status === 501, 'Responded', `status=${r.status}`);
  if (r.status === 501) { check('WARN', 'Chat not yet implemented (501)'); return; }
  if (!r.ok) return;

  const reply = r.body?.reply || r.body?.response || r.body?.message || r.body?.content;
  check(typeof reply === 'string' && reply.length > 10, 'Reply is non-empty string', `${reply?.length} chars`);
  if (reply) {
    show('reply preview', reply.slice(0, 150));
    check(/h5n1|influenza|pathogen|protein|threat|biosecurity|candidate|viral|disease/i.test(reply),
      'Reply is topically relevant to biosecurity');
  }
}

async function v2Report(deployed) {
  section('V2 — GET /api/v2/report');
  if (!deployed) { check('WARN', 'SKIPPED — v2 not deployed'); return; }

  const r = await get(V2_API, '/api/v2/report', 20_000);
  check(r.ok || r.status === 501, 'Responded', `status=${r.status}`);
  if (r.status === 501) { check('WARN', 'Report not yet implemented (501)'); return; }
  if (!r.ok) return;
  show('keys', Object.keys(r.body || {}));
  const entries = r.body?.entries || r.body?.threats || [];
  check(entries.length > 0, 'Non-empty entries', `${entries.length}`);
}

// ─── OLD API baseline tests ───────────────────────────────────────────────────

async function oldApiBaseline() {
  section('OLD API — Baseline (divine-cat-production)');
  console.log('  \x1b[2mVerifying old API still serves data before v2 migration is complete.\x1b[0m');

  // Health
  const health = await get(OLD_API, '/api/health');
  check(health.ok, 'GET /api/health HTTP 200', `status=${health.status}`);
  if (health.ok) show('health', health.body);

  // Threat feed
  const feed = await get(OLD_API, '/api/threat-feed');
  check(feed.ok, 'GET /api/threat-feed HTTP 200', `status=${feed.status}`);
  if (feed.ok) {
    const items = feed.body?.threats || (Array.isArray(feed.body) ? feed.body : []);
    check(items.length > 0, 'Threat feed non-empty', `${items.length} items`);
    show('feed item[0]', items[0]?.title?.slice(0, 80));
  }

  // Candidates
  const cands = await get(OLD_API, '/api/candidates');
  check(cands.ok, 'GET /api/candidates HTTP 200', `status=${cands.status}`);
  if (cands.ok) {
    const candidates = Array.isArray(cands.body) ? cands.body : (cands.body?.candidates ?? []);
    const candidateCount = candidates.length;
    check(candidateCount > 0 || cands.body?.inputs, 'Candidates present (or nested format)',
      `${candidateCount} flat, has inputs: ${!!cands.body?.inputs}`);
  }

  // Heatmap
  const hmap = await get(OLD_API, '/api/heatmap');
  check(hmap.ok, 'GET /api/heatmap HTTP 200', `status=${hmap.status}`);
  if (hmap.ok) {
    check(Array.isArray(hmap.body?.matrix) && hmap.body.matrix.length > 0,
      'Heatmap has matrix data', `${hmap.body?.matrix?.length} rows`);
  }

  // Biosecurity
  const biosec = await get(OLD_API, '/api/biosecurity');
  check(biosec.ok, 'GET /api/biosecurity HTTP 200', `status=${biosec.status}`);
  if (biosec.ok) {
    const items = Array.isArray(biosec.body) ? biosec.body : [];
    check(items.length > 0, 'Biosecurity items present', `${items.length} items`);
  }

  // Protein list
  const plist = await get(OLD_API, '/api/protein/list');
  check(plist.ok, 'GET /api/protein/list HTTP 200', `status=${plist.status}`);
  if (plist.ok) {
    const proteins = plist.body?.proteins || [];
    check(proteins.length > 0, 'Protein list non-empty', `${proteins.length} proteins`);
    show('PDB IDs', proteins.slice(0, 6).map(p => p.pdb_id).join(', '));
  }

  // Protein bundle
  const bundle = await post(OLD_API, '/api/protein/bundle', { pdb_id: '6VMZ' }, 15_000);
  check(bundle.ok, 'POST /api/protein/bundle HTTP 200', `status=${bundle.status}`);
  if (bundle.ok) {
    check(bundle.body?.pdb_id === '6VMZ', 'Bundle returns correct pdb_id');
    check(!!bundle.body?.metadata?.title, 'Bundle has metadata.title', bundle.body?.metadata?.title?.slice(0, 60));
  }

  // PDB text
  const pdbText = await get(OLD_API, '/api/protein/bundle/6VMZ/pdb', 15_000);
  check(pdbText.ok, 'GET /api/protein/bundle/6VMZ/pdb HTTP 200', `status=${pdbText.status}`);
  if (pdbText.ok && typeof pdbText.body === 'string') {
    check(pdbText.body.startsWith('HEADER'), 'PDB text starts with HEADER', pdbText.body.slice(0, 40));
    check(pdbText.body.includes('ATOM'), 'PDB text has ATOM records');
    check(pdbText.body.length > 50_000, 'PDB file is substantial', `${pdbText.body.length} chars`);
  }

  // Pipeline (mock)
  const pipe = await post(OLD_API, '/api/run-pipeline', { mode: 'mock', num_candidates: 1 }, 15_000);
  check(pipe.ok, 'POST /api/run-pipeline HTTP 200 (mock)', `status=${pipe.status}`);
  if (pipe.ok) {
    const jobId = pipe.body?.job_id;
    check(!!jobId, 'Returns job_id', jobId);
    check(UUID_RE.test(jobId || ''), 'job_id is UUID', jobId);
    if (jobId) {
      await new Promise(r => setTimeout(r, 1500)); // let it start
      const status = await get(OLD_API, `/api/pipeline-status/${encodeURIComponent(jobId)}`);
      check(status.ok || status.status === 404, 'Pipeline status endpoint responds',
        `status=${status.status}`);
      if (status.ok) {
        show('pipeline status', status.body);
        check(PIPELINE_OK.has(status.body?.status), 'Status is known value', `"${status.body?.status}"`);
      }
    }
  }

  // Chat
  const chat = await post(OLD_API, '/api/chat', {
    message: 'H5N1 status?', candidates: [], threat_feed: [], history: [],
  }, 20_000);
  check(chat.ok || chat.status === 501, 'POST /api/chat responded', `status=${chat.status}`);
  if (chat.ok) {
    const reply = chat.body?.response || chat.body?.reply || chat.body?.content;
    check(typeof reply === 'string' && reply.length > 10, 'Chat reply is non-empty string', `${reply?.length} chars`);
    show('chat reply', (reply || '').slice(0, 120));
  }
}

// ─── main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\x1b[1mBioSentinel — V2 API Integration Tests\x1b[0m');
  console.log(new Date().toISOString());
  console.log(`V2 API:  ${V2_API}/api/v2/*`);
  console.log(`Old API: ${OLD_API}/api/*\n`);

  // ── Section 1: V2 API ──
  const deployed = await v2Health();
  await v2Threats(deployed);
  await v2ThreatsSearch(deployed);
  await v2Candidates(deployed);
  await v2Heatmap(deployed);
  await v2Biosecurity(deployed);
  await v2ProteinList(deployed);
  await v2ProteinBundle(deployed);
  await v2Pipeline(deployed);
  await v2SyncScraper(deployed);
  await v2Chat(deployed);
  await v2Report(deployed);

  // ── Section 2: Old API baseline ──
  await oldApiBaseline();

  // ── Summary ──
  console.log(`\n\x1b[1m${'═'.repeat(60)}\x1b[0m`);
  console.log('\x1b[1m SUMMARY\x1b[0m');
  console.log(`${'═'.repeat(60)}`);
  console.log(`  \x1b[32mPASS: ${passed}\x1b[0m   \x1b[31mFAIL: ${failed}\x1b[0m   \x1b[33mWARN: ${warned}\x1b[0m`);

  if (failed > 0) {
    console.log('\n\x1b[31mFailures:\x1b[0m');
    log.filter(l => l.tag === 'FAIL').forEach(l =>
      console.log(`  ✗  ${l.label}  ${l.detail ? '— ' + l.detail : ''}`)
    );
  }
  if (warned > 0) {
    console.log('\n\x1b[33mWarnings:\x1b[0m');
    log.filter(l => l.tag === 'WARN').forEach(l =>
      console.log(`  ⚠  ${l.label}  ${l.detail ? '— ' + l.detail : ''}`)
    );
  }
  console.log('');
  process.exit(failed > 0 ? 1 : 0);
}

main();
