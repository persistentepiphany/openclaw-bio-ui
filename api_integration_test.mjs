/**
 * BioSentinel — V2 API Integration Tests
 *
 * Tests every v2 endpoint against the real schema discovered from the live API:
 *   GET  /api/v2/threats                     → { events:[...], count, fetched_at }
 *   GET  /api/v2/threats/{event_id}/targets  → { event_id, pathogen_name, targets:[...] }
 *   POST /api/v2/threats/{event_id}/design   → { job_id, status, event_id, pathogen_name }
 *   GET  /api/v2/pipeline/design/{job_id}    → { job_id, status, steps, candidates, error }
 *   GET  /api/v2/pdb/{filename}.pdb          → raw PDB text
 *
 * NOTE: /health returns 500, /candidates /heatmap /biosecurity /chat
 *       /protein/list /protein/bundle /report /sync-scraper do NOT exist on v2.
 *
 * Run: node api_integration_test.mjs
 */

const V2_API = 'https://divine-cat-v2-v2.up.railway.app';
const DEFAULT_TIMEOUT = 60_000; // first call fetches live WHO data

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
  console.log(`  \x1b[2m     ${label}: ${str.slice(0, 160)}\x1b[0m`);
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

const get  = (base, path, ms)       => request('GET',  base, path, undefined, ms);
const post = (base, path, data, ms) => request('POST', base, path, data, ms);

// ─── validators ──────────────────────────────────────────────────────────────

const VALID_SEVERITY  = new Set(['low', 'medium', 'high', 'critical']);
const VALID_AA        = /^[ACDEFGHIKLMNPQRSTVWY]+$/i;
const PIPELINE_STATUS = new Set(['queued', 'running', 'completed', 'failed', 'cancelled']);
const STEP_STATUS     = new Set(['pending', 'running', 'done', 'failed', 'skipped']);

function inRange(v, lo, hi) { return typeof v === 'number' && v >= lo && v <= hi; }
function isObj(v)            { return v && typeof v === 'object' && !Array.isArray(v); }

// ─── V2 Threats ───────────────────────────────────────────────────────────────

async function v2Threats() {
  section('V2 — GET /api/v2/threats');

  console.log('  \x1b[2m(first call fetches live WHO data — up to 60 s)\x1b[0m');
  const r = await get(V2_API, '/api/v2/threats', 90_000);

  if (r.error) {
    check(false, 'Connection', r.error);
    return null;
  }

  // Railway not-deployed detection
  if (!r.ok && isObj(r.body) && r.body.message === 'Application not found') {
    check('WARN', 'V2 backend not deployed (Railway 404). All v2 tests will be skipped.', V2_API);
    return null;
  }

  check(r.ok, 'HTTP 200', `status=${r.status}`);
  if (!r.ok) { show('body', r.body); return null; }

  // v2 real shape: { events:[...], count, fetched_at }
  check(isObj(r.body), 'Response is an object');
  check(Array.isArray(r.body.events), 'Has events array');
  check(typeof r.body.count === 'number', 'Has numeric count', `${r.body.count}`);
  check(typeof r.body.fetched_at === 'string', 'Has fetched_at timestamp', r.body.fetched_at);

  const events = r.body.events ?? [];
  check(events.length > 0, 'Non-empty events list', `${events.length} events`);
  if (events.length === 0) return null;

  const e0 = events[0];
  show('event[0] keys', Object.keys(e0).join(', '));
  show('event[0]', e0);

  // Schema checks on every event
  check(events.every(e => typeof e.event_id === 'string'), 'All events have event_id (string)');
  check(events.every(e => typeof e.pathogen_name === 'string'), 'All events have pathogen_name');
  check(events.every(e => typeof e.country_iso3 === 'string' && e.country_iso3.length === 3),
    'All events have 3-char country_iso3');
  check(events.every(e => e.cases === null || typeof e.cases === 'number'), 'All events have numeric or null cases');
  check(events.every(e => e.deaths === null || typeof e.deaths === 'number'), 'All events have numeric or null deaths');
  check(events.every(e => VALID_SEVERITY.has(e.severity)),
    'All severities are valid (low/medium/high/critical)',
    `sample: ${e0.severity}`);
  check(events.every(e => typeof e.confidence === 'number' && inRange(e.confidence, 0, 1)),
    'All confidence values in 0–1', `sample: ${e0.confidence}`);
  check(events.every(e => typeof e.date_reported === 'string'), 'All events have date_reported');

  const highRisk = events.filter(e => e.severity === 'critical' || e.severity === 'high');
  show('high/critical count', highRisk.length);
  show('pathogen sample', events.slice(0, 5).map(e => e.pathogen_name).join(', '));

  return events;
}

// ─── V2 Targets ──────────────────────────────────────────────────────────────

async function v2Targets(events) {
  section('V2 — GET /api/v2/threats/{event_id}/targets');
  if (!events) { check('WARN', 'SKIPPED — no events from previous test'); return null; }

  // Pick a high-severity event as test subject
  const testEvent = events.find(e => e.severity === 'critical' || e.severity === 'high') || events[0];
  const eventId = testEvent.event_id;
  show('testing event', `${testEvent.pathogen_name} (${eventId.slice(0, 12)}…)`);

  const r = await get(V2_API, `/api/v2/threats/${encodeURIComponent(eventId)}/targets`, 30_000);
  check(r.ok, 'HTTP 200', `status=${r.status}`);
  if (!r.ok) return null;

  check(isObj(r.body), 'Response is an object');
  check(r.body.event_id === eventId, 'event_id matches', r.body.event_id?.slice(0, 12));
  check(typeof r.body.pathogen_name === 'string', 'Has pathogen_name', r.body.pathogen_name);
  check(Array.isArray(r.body.targets), 'Has targets array');

  const targets = r.body.targets ?? [];
  show('targets count', targets.length);
  if (targets.length > 0) {
    const t0 = targets[0];
    show('target[0]', t0);
    check(targets.every(t => typeof t.target_name === 'string'), 'All targets have target_name');
    check(targets.every(t => typeof t.has_sequence === 'boolean'), 'All targets have has_sequence bool');
    check(targets.every(t => typeof t.has_pdb === 'boolean'), 'All targets have has_pdb bool');
    const withPdb = targets.filter(t => t.has_pdb && t.pdb_id);
    show('targets with PDB', withPdb.length);
  }

  return { eventId, targets };
}

// ─── V2 PDB ──────────────────────────────────────────────────────────────────

async function v2Pdb(targetsResult) {
  section('V2 — GET /api/v2/pdb/{filename}.pdb');

  // Try a known PDB from targets, or fall back to a common one
  let pdbId = null;
  if (targetsResult?.targets) {
    const withPdb = targetsResult.targets.find(t => t.has_pdb && t.pdb_id);
    pdbId = withPdb?.pdb_id;
  }

  if (!pdbId) {
    check('WARN', 'No PDB ID from targets — trying 6VMZ as fallback');
    pdbId = '6VMZ';
  }
  show('testing pdb_id', pdbId);

  const r = await get(V2_API, `/api/v2/pdb/${encodeURIComponent(pdbId)}.pdb`, 20_000);
  check(r.ok || r.status === 404, 'Responded', `status=${r.status}`);
  if (r.status === 404) {
    check('WARN', `${pdbId}.pdb not in v2 cache — will fall back to RCSB in client`);
    return;
  }
  if (!r.ok) return;

  const text = typeof r.body === 'string' ? r.body : '';
  check(text.length > 1000, 'PDB text is non-trivial', `${text.length} chars`);
  check(text.includes('ATOM'), 'Contains ATOM records');
  check(
    text.startsWith('HEADER') || text.startsWith('ATOM') || text.startsWith('REMARK'),
    'Starts with valid PDB marker', text.slice(0, 30)
  );
}

// ─── V2 Design (Pipeline) ────────────────────────────────────────────────────

async function v2Design(events) {
  section('V2 — POST /api/v2/threats/{event_id}/design');
  if (!events) { check('WARN', 'SKIPPED — no events'); return null; }

  const testEvent = events.find(e => e.severity === 'critical' || e.severity === 'high') || events[0];
  const eventId = testEvent.event_id;
  show('submitting design for', `${testEvent.pathogen_name} (${eventId.slice(0, 12)}…)`);

  const r = await post(V2_API, `/api/v2/threats/${encodeURIComponent(eventId)}/design`, {
    num_designs: 1,
    hotspot_res: null,
  }, 30_000);

  check(r.ok, 'HTTP 200', `status=${r.status}`);
  if (!r.ok) { show('error body', r.body); return null; }

  check(isObj(r.body), 'Response is an object');
  check(typeof r.body.job_id === 'string' && r.body.job_id.length > 0, 'Has job_id', r.body.job_id);
  check(PIPELINE_STATUS.has(r.body.status), 'status is known value', `"${r.body.status}"`);
  check(r.body.event_id === eventId || typeof r.body.event_id === 'string',
    'Has event_id', r.body.event_id?.slice(0, 12));

  show('response', r.body);
  return r.body.job_id;
}

// ─── V2 Pipeline Status ──────────────────────────────────────────────────────

async function v2PipelineStatus(jobId) {
  section('V2 — GET /api/v2/pipeline/design/{job_id}');
  if (!jobId) { check('WARN', 'SKIPPED — no job_id from design step'); return; }

  show('polling job', jobId);
  const r = await get(V2_API, `/api/v2/pipeline/design/${encodeURIComponent(jobId)}`, 20_000);
  check(r.ok, 'HTTP 200', `status=${r.status}`);
  if (!r.ok) { show('error body', r.body); return; }

  check(isObj(r.body), 'Response is an object');
  check(r.body.job_id === jobId, 'job_id matches', r.body.job_id);
  check(PIPELINE_STATUS.has(r.body.status), 'status is known value', `"${r.body.status}"`);

  // Steps object schema
  if (r.body.steps && isObj(r.body.steps)) {
    const STEP_NAMES = ['fold', 'binder_design', 'sequence_design', 'validation_fold'];
    const presentSteps = STEP_NAMES.filter(s => r.body.steps[s]);
    show('steps present', presentSteps.join(', ') || '(none yet)');
    for (const step of presentSteps) {
      const sv = r.body.steps[step];
      check(STEP_STATUS.has(sv.status), `steps.${step}.status valid`, `"${sv.status}"`);
    }
  }

  // Candidates (may be empty if job is still running)
  if (Array.isArray(r.body.candidates) && r.body.candidates.length > 0) {
    const c0 = r.body.candidates[0];
    show('candidate[0]', c0);
    check(typeof c0.rank === 'number', 'Candidates have rank');
    check(typeof c0.confidence === 'number' && inRange(c0.confidence, 0, 1),
      'Candidate confidence in 0–1', `${c0.confidence}`);
    if (c0.sequence) {
      check(VALID_AA.test(c0.sequence), 'Candidate sequence is valid AA string',
        `${c0.sequence.slice(0, 30)}…`);
    }
  } else {
    check('WARN', 'No candidates yet (job likely still queued/running)');
  }

  show('full status', { status: r.body.status, steps: r.body.steps, candidateCount: r.body.candidates?.length });
}

// ─── V2 Client-side search (v2 filter verification) ──────────────────────────

async function v2SearchBehavior(events) {
  section('V2 — Client-side filtering behavior (q= param does not filter server-side)');
  if (!events) { check('WARN', 'SKIPPED — no events'); return; }

  const r = await get(V2_API, '/api/v2/threats?q=H5N1', 90_000);
  check(r.ok, 'HTTP 200 with q=H5N1', `status=${r.status}`);
  if (!r.ok) return;

  check(Array.isArray(r.body?.events), 'Still returns events array');
  const filteredCount = r.body?.events?.length ?? 0;
  const totalCount = events.length;

  // v2 ?q= does NOT filter — returns same full list
  if (filteredCount === totalCount) {
    check(true, 'Confirmed: q= param does NOT filter server-side (full list returned)',
      `${filteredCount} events (same as unfiltered ${totalCount})`);
    check('WARN', 'Client-side filtering must be used (already implemented in searchThreats())');
  } else {
    check(true, 'q= param filters server-side', `${filteredCount}/${totalCount} returned`);
  }
}

// ─── V2 Absent endpoints ─────────────────────────────────────────────────────

async function v2ProteinList() {
  section('V2 — GET /api/v2/protein/list (discovered live)');

  const r = await get(V2_API, '/api/v2/protein/list', 20_000);
  check(r.ok, 'HTTP 200', `status=${r.status}`);
  if (!r.ok) return;

  // Inspect actual shape
  const proteins = r.body?.proteins || (Array.isArray(r.body) ? r.body : []);
  show('response keys', Object.keys(r.body || {}).join(', '));
  show('proteins count', proteins.length);
  if (proteins.length > 0) {
    show('protein[0]', proteins[0]);
    check(proteins.every(p => p.pdb_id || p.name), 'Proteins have pdb_id or name');
  } else {
    check('WARN', '/api/v2/protein/list returned 200 but empty proteins array');
  }
}

async function v2AbsentEndpoints() {
  section('V2 — Confirming absent endpoints (expected non-2xx)');

  // /candidates, /heatmap, /biosecurity return 500 (unimplemented route on v2)
  // /report, /sync-scraper return 404
  // /chat returns 422 (FastAPI validation error — endpoint exists but missing required fields)
  const absent = [
    ['/api/v2/candidates',   'GET',  [404, 500, 501]],
    ['/api/v2/heatmap',      'GET',  [404, 500, 501]],
    ['/api/v2/biosecurity',  'GET',  [404, 500, 501]],
    ['/api/v2/report',       'GET',  [404, 500, 501]],
    ['/api/v2/chat',         'POST', [404, 422, 500, 501]],
    ['/api/v2/sync-scraper', 'POST', [404, 422, 500, 501]],
  ];

  for (const [path, method, allowedStatuses] of absent) {
    const r = method === 'GET'
      ? await get(V2_API, path, 10_000)
      : await post(V2_API, path, {}, 10_000);
    const isAbsent = !r.ok && allowedStatuses.includes(r.status);
    check(isAbsent, `${method} ${path} → absent (expected)`, `status=${r.status}`);
  }
}

// ─── main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\x1b[1mBioSentinel — V2 API Integration Tests (real schema)\x1b[0m');
  console.log(new Date().toISOString());
  console.log(`V2 API:  ${V2_API}/api/v2/*\n`);

  const events        = await v2Threats();
  const targetsResult = await v2Targets(events);
  await v2Pdb(targetsResult);
  await v2ProteinList();
  const jobId         = await v2Design(events);
  await v2PipelineStatus(jobId);
  await v2SearchBehavior(events);
  await v2AbsentEndpoints();

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
