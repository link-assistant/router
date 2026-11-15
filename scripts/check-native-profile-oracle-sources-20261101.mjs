// Preflight for the native profile oracle step in release.yml (JavaScript only;
// it never starts Cargo, rustc or any other child process).
//
// Each 2026-11-01 native profile embeds complete-source archives and refuses to
// materialize a workspace unless the checkout still equals them. This script runs
// every profile's own portable source visitor, the same function the oracle runner
// calls first, and reports whether the checkout still matches.
//
// - Every profile accepts the checkout: `fresh=true`; the oracle step runs and
//   stays fatal.
// - A profile refuses with its explicit "complete physical source differs"
//   diagnostic: `fresh=false`. On pull_request events this prints a warning and
//   exits 0 so the oracle step is skipped visibly. On every other event (push to
//   the default branch, workflow_dispatch, local runs) it prints what a maintainer
//   must do and exits 1.
// - Any other error is rethrown, so a broken visitor never passes as stale.
//
// The receipt is written to $RUNNER_TEMP/router-native-profile-oracles/ so the
// evidence upload step always finds a file.
import {appendFileSync, closeSync, constants, lstatSync, mkdirSync, openSync, realpathSync, writeSync} from 'node:fs';
import {join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {NATIVE_PROFILE_ORACLES} from '../tools/translation/native-profile-oracles-20261101-control.mjs';

const STALE = /complete physical source differs: (\S+)$/u;

export function classifyNativeProfileVisitorError(error) {
  const message = error instanceof Error ? error.message : String(error);
  const match = STALE.exec(message);
  return match ? {stale: true, path: match[1], message} : {stale: false, message};
}

export async function inspectNativeProfileOracleSources(profiles = NATIVE_PROFILE_ORACLES) {
  // Load the visitors through the materializer, the module graph the oracle runner
  // uses. Importing a visitor module on its own can hit an import cycle.
  await import('../tools/translation/native-profile-oracles-20261101-materialize.mjs');
  const rows = [];
  for (const profile of profiles) {
    const module = await import(new URL(profile.nativeSourceModule, new URL('../tools/translation/', import.meta.url)).href);
    const visitor = module[profile.nativeSourceVisitor];
    if (typeof visitor !== 'function') throw new TypeError(`Native profile preflight: ${profile.id} visitor ${profile.nativeSourceVisitor} missing`);
    try {
      visitor(() => null);
      rows.push({profileId: profile.id, archive: profile.archive, fresh: true});
    } catch (error) {
      const verdict = classifyNativeProfileVisitorError(error);
      if (!verdict.stale) throw error;
      rows.push({profileId: profile.id, archive: profile.archive, fresh: false, firstDifferingPath: verdict.path, message: verdict.message});
    }
  }
  return {schema: 'native-profile-source-freshness-v1', node: process.version, fresh: rows.every(row => row.fresh), profiles: rows};
}

export function staleNativeProfileInstructions(result) {
  const stale = result.profiles.filter(row => !row.fresh);
  const list = stale.map(row => `${row.profileId} (first differing file: ${row.firstDifferingPath})`).join('; ');
  const archives = stale.map(row => row.archive).join(', ');
  return `The 2026-11-01 native profile archives no longer match this checkout: ${list}. ` +
    `A maintainer must either regenerate ${archives} from the current tree with a profile producer and update every pinned archiveSha256 ` +
    `(tools/translation/native-profile-oracles-20261101-control.mjs and the profile modules that repeat it), ` +
    `or remove the stale profiles from NATIVE_PROFILE_ORACLES. Then re-run this job. ` +
    `See "Native profile oracle step: BLOCKED" in docs/case-studies/issue-759/current/continuation-772.md.`;
}

function writeReceipt(result) {
  if (typeof process.env.RUNNER_TEMP !== 'string' || process.env.RUNNER_TEMP.length === 0) return null;
  const parent = join(realpathSync(process.env.RUNNER_TEMP), 'router-native-profile-oracles');
  try { mkdirSync(parent, {mode: 0o700}); } catch (error) { if (error?.code !== 'EEXIST') throw error; }
  const info = lstatSync(parent);
  if (!info.isDirectory() || info.isSymbolicLink()) throw new TypeError('Native profile preflight: ordinary evidence directory required');
  const path = join(parent, `source-freshness-${process.env.GITHUB_RUN_ID ?? 'local'}-${process.env.GITHUB_RUN_ATTEMPT ?? '0'}.json`);
  const bytes = Buffer.from(JSON.stringify(result, null, 2) + '\n');
  const fd = openSync(path, constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY | (constants.O_NOFOLLOW ?? 0), 0o600);
  try { for (let at = 0; at < bytes.length;) at += writeSync(fd, bytes, at, bytes.length - at, null); } finally { closeSync(fd); }
  return path;
}

async function main() {
  const result = await inspectNativeProfileOracleSources();
  const receipt = writeReceipt(result);
  for (const row of result.profiles) console.log(`${row.profileId}: ${row.fresh ? 'matches the checkout' : `stale (${row.firstDifferingPath})`}`);
  if (receipt) console.log(`receipt: ${receipt}`);
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `fresh=${result.fresh}\n`);
  if (result.fresh) return 0;
  const instructions = staleNativeProfileInstructions(result);
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `### Native profile oracles not run\n\n${instructions}\n`);
  if (process.env.GITHUB_EVENT_NAME === 'pull_request') {
    console.log(`::warning title=Native profile oracles skipped on this pull request::${instructions}`);
    return 0;
  }
  console.log(`::error title=Native profile oracles need a maintainer::${instructions}`);
  return 1;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) process.exitCode = await main();
