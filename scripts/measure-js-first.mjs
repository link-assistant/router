#!/usr/bin/env node
// Read archived GitHub REST/gh JSON only; never fetch data or infer missing telemetry.
import { readdir, stat, writeFile } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { createGunzip } from 'node:zlib';
import { StringDecoder } from 'node:string_decoder';
import path from 'node:path';

const args = process.argv.slice(2);
if (!args.length || args.includes('--help')) {
  console.log('Usage: node scripts/measure-js-first.mjs ARCHIVE.json|DIRECTORY [...] [--output report.json]\nArchives: GitHub runs/jobs/PRs, gh run view/list JSON, and optional resourceSamples.');
  process.exit(args.length ? 0 : 2);
}
let output;
const inputs = [];
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--output') {
    if (!args[++i]) throw new Error('--output needs a path');
    output = args[i];
  } else if (args[i].startsWith('--')) throw new Error(`Unknown option: ${args[i]}`);
  else inputs.push(args[i]);
}
if (!inputs.length) throw new Error('At least one archive is required');
async function files(entry) {
  if (!(await stat(entry)).isDirectory()) return [entry];
  const result = [];
  for (const child of (await readdir(entry)).sort()) {
    const nested = path.join(entry, child);
    if ((await stat(nested)).isDirectory()) result.push(...await files(nested));
    else if (child.endsWith('.json') || child.endsWith('.json.gz')) result.push(nested);
  }
  return result;
}
const runs = new Map(), jobs = new Map(), prs = new Map(), samples = [];
const sources = [], warnings = [], synchronizeEvents = new Map();
function identity(value) { return value.databaseId ?? value.id ?? value.html_url ?? value.url; }
function seconds(start, end) {
  const a = Date.parse(start), b = Date.parse(end);
  return Number.isFinite(a) && Number.isFinite(b) && b >= a ? (b - a) / 1000 : null;
}
function collect(value, source, parentRun) {
  if (Array.isArray(value)) { value.forEach(item => collect(item, source, parentRun)); return; }
  if (!value || typeof value !== 'object') return;
  const jobLike = value.steps != null && (value.started_at != null || value.startedAt != null) || value.run_id != null && value.name != null;
  const runLike = !jobLike && (value.workflow_id != null || value.workflowName != null || value.run_attempt != null || value.headSha != null && value.event != null);
  const runId = runLike ? identity(value) : parentRun;
  if (runLike && runId != null) {
    const attempt = value.run_attempt ?? value.attempt ?? 1;
    const key = `${runId}:${attempt}`;
    const fields = Object.fromEntries(['name', 'workflowName', 'head_sha', 'headSha', 'status', 'conclusion', 'run_started_at', 'startedAt', 'completed_at', 'completedAt', 'created_at', 'createdAt', 'updated_at', 'updatedAt'].filter(field => value[field] != null).map(field => [field, value[field]]));
    runs.set(key, { ...runs.get(key), ...fields, archiveSource: source, archiveRunId: runId, archiveAttempt: attempt, archiveAttemptKnown: value.run_attempt != null || value.attempt != null || runs.get(key)?.archiveAttemptKnown === true });
  }
  if (jobLike) {
    const jobId = identity(value) ?? `${value.run_id ?? parentRun}:${value.name}:${value.started_at ?? value.startedAt}`;
    const fields = Object.fromEntries(['id', 'databaseId', 'html_url', 'url', 'name', 'conclusion', 'started_at', 'startedAt', 'completed_at', 'completedAt'].filter(field => value[field] != null).map(field => [field, value[field]]));
    jobs.set(String(jobId), { ...jobs.get(String(jobId)), ...fields, archiveSource: source, archiveRunId: value.run_id ?? parentRun });
  }
  if (value.number != null && (value.head != null && value.base != null || value.headRefOid != null)) {
    const key = String(identity(value) ?? value.number);
    const fields = Object.fromEntries(['number', 'html_url', 'url', 'head', 'headRefOid', 'created_at', 'createdAt', 'commits'].filter(field => value[field] != null).map(field => [field, value[field]]));
    prs.set(key, { ...prs.get(key), ...fields, archiveSource: source });
  }
  if (value.event === 'synchronize' || value.action === 'synchronize') {
    synchronizeEvents.set(String(identity(value) ?? `${source}:${value.created_at}`), value);
  }
  if (value.peakRssBytes != null || value.peakTargetDiskBytes != null) samples.push({ ...value, archiveSource: source });
  for (const [key, child] of Object.entries(value)) {
    if (['workflow_runs', 'runs', 'jobs', 'pull_requests', 'pullRequests', 'resourceSamples', 'timeline', 'events'].includes(key)) collect(child, source, runId);
  }
}
async function consumeArchive(file) {
  const input = createReadStream(file);
  const decoded = file.endsWith('.gz') ? input.pipe(createGunzip()) : input;
  // Stream top-level arrays one element at a time. Bound each value and total gzip expansion.
  const decoder = new StringDecoder('utf8');
  let size = 0, buffer = '', mode, depth = 0, quoted = false, escaped = false, done = false;
  function consume(chunk) {
    for (const character of chunk) {
      if (mode == null) {
        if (/\s/.test(character)) continue;
        mode = character === '[' ? 'array' : 'object';
        if (mode === 'array') continue;
      }
      if (mode === 'object') { buffer += character; continue; }
      if (done) { if (!/\s/.test(character)) throw new Error(`Trailing JSON in ${file}`); continue; }
      if (!quoted && depth === 0 && (character === ',' || character === ']')) {
        if (buffer.trim()) collect(JSON.parse(buffer), file);
        buffer = '';
        if (character === ']') done = true;
        continue;
      }
      buffer += character;
      if (buffer.length > 32 * 1024 * 1024) throw new Error(`Archive value exceeds 32 MiB character bound: ${file}`);
      if (quoted) {
        if (escaped) escaped = false;
        else if (character === '\\') escaped = true;
        else if (character === '"') quoted = false;
      } else if (character === '"') quoted = true;
      else if (character === '{' || character === '[') depth++;
      else if (character === '}' || character === ']') depth--;
    }
    if (buffer.length > 32 * 1024 * 1024) throw new Error(`Archive value exceeds 32 MiB character bound: ${file}`);
  }
  try {
    for await (const chunk of decoded) {
      size += chunk.length;
      if (size > 512 * 1024 * 1024) throw new Error(`Archive exceeds 512 MiB decoded bound: ${file}`);
      consume(decoder.write(chunk));
    }
    consume(decoder.end());
    if (mode === 'array' && !done) throw new Error(`Incomplete JSON array: ${file}`);
    if (mode === 'object') collect(JSON.parse(buffer), file);
    if (mode == null) throw new Error(`Empty JSON archive: ${file}`);
  } finally { input.destroy(); decoded.destroy(); }
}
for (const entry of inputs) {
  for (const file of await files(entry)) {
    if (sources.includes(file)) continue;
    sources.push(file);
    await consumeArchive(file);
  }
}
const runRows = [...runs.values()].map(run => ({
  id: run.archiveRunId, attempt: run.archiveAttemptKnown ? run.archiveAttempt : null,
  headSha: run.head_sha ?? run.headSha ?? null,
  workflow: run.name ?? run.workflowName ?? null,
  status: run.status ?? null, conclusion: run.conclusion ?? null,
  // REST updated_at includes non-execution changes: retain it as a separate span.
  executionSeconds: seconds(run.run_started_at ?? run.startedAt, run.completed_at ?? run.completedAt),
  archiveSpanSeconds: seconds(run.created_at ?? run.createdAt, run.updated_at ?? run.updatedAt),
  source: run.archiveSource,
  completedAt: run.completed_at ?? run.completedAt ?? null,
}));
const jobRows = [...jobs.values()].map(job => ({
  id: identity(job) ?? null, runId: job.archiveRunId ?? null, name: job.name,
  conclusion: job.conclusion ?? null,
  executionSeconds: seconds(job.started_at ?? job.startedAt, job.completed_at ?? job.completedAt),
  source: job.archiveSource,
}));
const measuredJobs = jobRows.filter(job => job.executionSeconds != null);
const uniqueRuns = new Set(runRows.map(run => String(run.id)));
const heads = new Set(runRows.map(run => run.headSha).filter(Boolean));
function maxMeasured(field) {
  const numbers = samples.map(sample => sample[field]).filter(value => typeof value === 'number' && Number.isFinite(value) && value >= 0);
  return numbers.length ? Math.max(...numbers) : null;
}
if (!runs.size) warnings.push('No recognized workflow runs: job-only archives do not establish push cycles.');
if (!jobs.size) warnings.push('No jobs: cannot measure cumulative job execution time.');
if (measuredJobs.length !== jobRows.length) warnings.push('Some jobs lack valid start/end timestamps; time totals cover measured jobs only.');
if (!synchronizeEvents.size) warnings.push('No archived synchronize events: push cycles remain unknown; commits and unique CI heads are only proxies.');
const report = {
  schemaVersion: 1, sources,
  summary: {
    workflowRunCount: uniqueRuns.size, archivedRunAttempts: runs.size,
    observedRerunAttempts: runRows.filter(run => run.attempt != null && run.attempt > 1).length,
    recordsWithUnknownAttempt: runRows.filter(run => run.attempt == null).length,
    uniqueCiHeadCount: heads.size,
    workflowConclusions: Object.fromEntries([...new Set(runRows.map(run => run.conclusion ?? 'unknown'))].map(value => [value, runRows.filter(run => (run.conclusion ?? 'unknown') === value).length])),
    jobCount: jobRows.length, timedJobCount: measuredJobs.length,
    cumulativeJobExecutionSeconds: measuredJobs.length ? measuredJobs.reduce((sum, job) => sum + job.executionSeconds, 0) : null,
    pullRequestCount: prs.size,
    archivedSynchronizeEvents: synchronizeEvents.size || null,
    peakRssBytes: maxMeasured('peakRssBytes'), peakTargetDiskBytes: maxMeasured('peakTargetDiskBytes'),
    billedMinutes: null, monetaryCost: null,
    firstFullyGreenRunSeconds: null,
  },
  limitations: [
    'Cumulative job execution seconds sum concurrent jobs; this is neither wall-clock latency nor billed minutes.',
    'Unique CI heads are not pushes: one push can include multiple commits and one head can have multiple workflows.',
    'Only archived attempts are counted; a latest-attempt response does not reconstruct earlier attempts.',
    'RSS and target disk are null unless explicit resource samples are supplied. GitHub run/job metadata does not provide them.',
    'No cost estimate: runner prices, billable rounding, private/public billing, caches and usage records are not supplied.',
    'First fully green latency is unknown: required workflow identities and complete same-head check coverage have not been declared.',
    'Per-workflow success latency uses PR creation to exact archived completion for the current PR head; it is not the latency to all required checks passing.',
  ],
  warnings, runs: runRows, jobs: jobRows,
  pullRequests: [...prs.values()].map(pr => {
    const headSha = pr.head?.sha ?? pr.headRefOid ?? null;
    const firstSuccessfulWorkflowSeconds = {};
    for (const run of runRows) {
      if (!headSha || run.headSha !== headSha || run.conclusion !== 'success') continue;
      const elapsed = seconds(pr.created_at ?? pr.createdAt, run.completedAt);
      if (elapsed != null) firstSuccessfulWorkflowSeconds[run.workflow ?? 'unknown'] = Math.min(firstSuccessfulWorkflowSeconds[run.workflow ?? 'unknown'] ?? Infinity, elapsed);
    }
    return { number: pr.number, url: pr.html_url ?? pr.url ?? null, headSha, commitCount: typeof pr.commits === 'number' ? pr.commits : pr.commits?.length ?? null, firstFullyGreenRunSeconds: null, firstSuccessfulWorkflowSeconds, source: pr.archiveSource };
  }),
  resourceSamples: samples,
};
const serialized = `${JSON.stringify(report, null, 2)}\n`;
if (output) await writeFile(output, serialized);
else process.stdout.write(serialized);
