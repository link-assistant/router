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
//   diagnostic: `fresh=false`. It prints a warning and exits 0 so the oracle step
//   is skipped visibly. Automated translation is temporarily not a release
//   requirement (issue #797); opting in with
//   ROUTER_REQUIRE_NATIVE_PROFILE_ORACLES=1 makes stale archives fatal.
// - The runtime has no O_NOFOLLOW (Windows) and the translator's source custody
//   reader refuses to load for exactly that reason: `supported=false`, handled
//   like a stale archive.
// - Any other error is recorded in the receipt and rethrown, so a broken visitor
//   never passes as stale.
//
// The receipt is written to $RUNNER_TEMP/router-native-profile-oracles/ so the
// evidence upload step always finds a file.
import {appendFileSync, closeSync, constants, lstatSync, mkdirSync, openSync, realpathSync, writeSync} from 'node:fs';
import {join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {NATIVE_PROFILE_ORACLES} from '../tools/translation/native-profile-oracles-20261101-control.mjs';

const STALE = /complete physical source differs: (\S+)$/u;
const NO_FOLLOW_REQUIRED = 'Compact sparse source Git IO: bounded ordinary precise no-follow source file required';

export function noFollowReadsAvailable(fsConstants = constants) {
  return Number.isInteger(fsConstants.O_NOFOLLOW) && fsConstants.O_NOFOLLOW > 0 && Number.isInteger(fsConstants.O_NONBLOCK) && fsConstants.O_NONBLOCK > 0;
}

// True only for the custody reader's own refusal on a runtime that really lacks
// no-follow/nonblocking descriptors; the same message on a POSIX runtime stays fatal.
export function isUnsupportedPlatformError(error, fsConstants = constants) {
  return error instanceof Error && error.message === NO_FOLLOW_REQUIRED && !noFollowReadsAvailable(fsConstants);
}

export function classifyNativeProfileVisitorError(error) {
  const message = error instanceof Error ? error.message : String(error);
  const match = STALE.exec(message);
  return match ? {stale: true, path: match[1], message} : {stale: false, message};
}

export async function inspectNativeProfileOracleSources(profiles = NATIVE_PROFILE_ORACLES) {
  // Load the visitors through the materializer, the module graph the oracle runner
  // uses. Importing a visitor module on its own can hit an import cycle.
  const rows = [];
  const base = {schema: 'native-profile-source-freshness-v1', node: process.version, platform: process.platform};
  try {
    await import('../tools/translation/native-profile-oracles-20261101-materialize.mjs');
    for (const profile of profiles) await import(new URL(profile.nativeSourceModule, new URL('../tools/translation/', import.meta.url)).href);
  } catch (error) {
    if (!isUnsupportedPlatformError(error)) throw error;
    return {...base, supported: false, fresh: false, reason: error.message, profiles: rows};
  }
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
  return {...base, supported: true, fresh: rows.every(row => row.fresh), profiles: rows};
}

export function unsupportedNativeProfileInstructions(result) {
  return `The native profile oracles cannot load on ${result.platform} (${result.node}): this runtime has no O_NOFOLLOW/O_NONBLOCK, ` +
    `and readCompactSparsePhysicalFile in tools/translation/compact-sparse-git-io-20261102.mjs refuses to read sources without them ("${result.reason}"). ` +
    `A maintainer who owns the translator source custody must either decide that this runner may read sources without no-follow descriptors ` +
    `(as native-profile-oracles-20261101-materialize.mjs already does on win32), port that reader and re-pin ` +
    `tools/translation/source-profiles/exact-source-successor-adoption-20261103/index.json, ` +
    `or limit the native profile steps in .github/workflows/release.yml to runners with no-follow reads. Then re-run this job. ` +
    `See "Native profile oracle step: BLOCKED" in docs/case-studies/issue-759/current/continuation-772.md.`;
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
  let result;
  try {
    result = await inspectNativeProfileOracleSources();
  } catch (error) {
    // Keep evidence of the fatal error for the upload step, then fail.
    try { writeReceipt({schema: 'native-profile-source-freshness-v1', node: process.version, platform: process.platform, error: String(error?.stack ?? error)}); } catch {}
    throw error;
  }
  const receipt = writeReceipt(result);
  if (!result.supported) console.log(`unsupported runtime: ${result.reason}`);
  for (const row of result.profiles) console.log(`${row.profileId}: ${row.fresh ? 'matches the checkout' : `stale (${row.firstDifferingPath})`}`);
  if (receipt) console.log(`receipt: ${receipt}`);
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `fresh=${result.fresh}\n`);
  if (result.fresh) return 0;
  const instructions = result.supported ? staleNativeProfileInstructions(result) : unsupportedNativeProfileInstructions(result);
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `### Native profile oracles not run\n\n${instructions}\n`);
  if (process.env.ROUTER_REQUIRE_NATIVE_PROFILE_ORACLES !== '1') {
    console.log(`::warning title=Native profile oracles skipped::${instructions}`);
    return 0;
  }
  console.log(`::error title=Native profile oracles need a maintainer::${instructions}`);
  return 1;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) process.exitCode = await main();
