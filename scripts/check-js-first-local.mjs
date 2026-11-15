#!/usr/bin/env node
// Node-only preflight. A successful inventory check never writes a green stamp.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
export const stages = [
  ['lint', ['node scripts/sync-rust-assets.mjs --check', 'node scripts/prepare-bun-reverse-files.mjs --check', 'node scripts/prepare-bun-reverse-shard.mjs --check', 'node scripts/lint-js-first.mjs', 'node --test --test-concurrency=1 scripts/test/run-bun-forward-files.test.mjs scripts/test/run-bun-reverse-files.test.mjs scripts/test/bun-reverse-inputs.test.mjs', 'node --test scripts/test/check-js-first-workflows.test.mjs', 'node --test scripts/test/check-js-first-local.test.mjs', 'node --test scripts/test/run-node-test-shard.test.mjs', 'node --test scripts/test/bun-reverse-shard.test.mjs', 'node scripts/check-js-first-workflows.mjs']],
  ['node-tests', ['npm run native:test --prefix js']],
  ['bun-tests', ['npm run native:test:bun --prefix js']],
  ['typescript', ['node scripts/run-node-tests.mjs --outer-timeout-ms=180000 scripts/test/node-case-deadlines.test.mjs', 'npm run typecheck --prefix js', 'npm run native:typecheck --prefix js', 'node scripts/regenerate-native-typescript.mjs --check', 'node scripts/check-native-typescript.mjs', 'node scripts/run-node-tests.mjs --outer-timeout-ms=900000 tools/translation/js-to-rust/test/native-typescript.test.mjs', 'node js/node_modules/typescript/bin/tsc -p tools/translation/tsconfig.json', 'node tools/translation/check-typescript-fixtures.mjs', 'node scripts/check-profile-typescript.mjs', 'node scripts/check-owned-definition-typescript.mjs', 'node tools/translation/serialization-schema/native-descriptor.mjs --check', 'node tools/translation/serialization-schema/check-descriptor-typescript.mjs', 'node tools/translation/serialization-schema/bulk.mjs --check', 'node tools/translation/serialization-schema/check-bulk-typescript.mjs', 'node scripts/build-js-first-ui.mjs']],
  ['parity', ['node --test --test-concurrency=2 experiments/issue-759/acceptance/*.test.mjs', 'node scripts/check-router-parity.mjs --strict']],
  ['translation', ['node scripts/run-node-tests.mjs --outer-timeout-ms=3600000 --test-concurrency=2 tools/translation/test/*.test.mjs tools/translation/serialization-schema/*.test.mjs', 'node scripts/translate-router.mjs --check', 'node scripts/translate-router.mjs --retain-output-text --owned-core-definitions --check', 'node scripts/translate-router.mjs --profile-matrix --check', 'node scripts/translate-router.mjs --retain-output-text --owned-core-definitions --profile-matrix --check']],
  ['reverse-translation', ['node scripts/run-node-tests.mjs --outer-timeout-ms=900000 --test-concurrency=2 tools/translation/js-to-rust/test/*.test.mjs', 'node scripts/run-bun-reverse-files.mjs --output-root js/node_modules/.bun-reverse-files', 'node scripts/regenerate-js-first.mjs --check', 'node scripts/regenerate-js-first.mjs --owned-core-definitions --check', 'node scripts/regenerate-js-first.mjs --owned-core-definitions --profile-matrix --check']],
];
// Optional scalar diagnostics identify the exact silent child that is still
// running. Neither the command list nor the original failure handling changes.
export function runStageCommand(stage, command, { progress } = {}) {
  if (progress !== undefined && typeof progress !== 'function') throw new TypeError('Command progress must be a function.');
  const started = progress ? performance.now() : 0;
  progress?.({ stage, command, state: 'start' });
  const result = spawnSync(command, { shell: true, stdio: 'inherit' });
  progress?.({ stage, command, state: 'finish', elapsedMs: performance.now() - started,
    status: result.status, signal: result.signal, error: result.error?.message ?? null });
  return result;
}
function git(...args) {
  const result = spawnSync('git', args, { encoding: 'utf8' });
  if (result.status !== 0) throw new Error(result.error?.message || result.stderr || `git ${args[0]} failed (${result.status ?? result.signal}).`);
  return result.stdout.trim();
}
export function fingerprint(stampPath, { progress } = {}) {
  if (progress !== undefined && typeof progress !== 'function') throw new TypeError('Fingerprint progress must be a function.');
  const root = git('rev-parse', '--show-toplevel');
  const resolvedStamp = path.join(fs.realpathSync(path.dirname(path.resolve(stampPath))), path.basename(stampPath));
  // The conserved source and compressed evidence include tens of thousands of
  // paths. Keep a bounded buffer above Node's default 1 MiB listing limit.
  const result = spawnSync('git', ['ls-files', '-co', '--exclude-standard', '-z'], { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
  if (result.status !== 0) throw new Error(result.error?.message || result.stderr || `git ls-files failed (${result.status ?? result.signal}).`);
  const files = [...new Set(result.stdout.split('\0').filter(Boolean))].sort();
  let completedFiles = 0, completedBytes = 0;
  const observe = (relative, kind, bytes) => {
    if (!progress) return;
    completedFiles++; completedBytes += bytes;
    if (completedFiles % 512 === 0 || bytes >= 8 * 1024 * 1024) progress({state:'advance', relative, kind, bytes, completedFiles, completedBytes, totalFiles:files.length});
  };
  progress?.({state:'start', totalFiles:files.length});
  const hash = createHash('sha256');
  // Keep file-content allocation independent of the complete evidence size.
  // The length frame and hash bytes are identical to whole-buffer hashing.
  const chunk = Buffer.allocUnsafe(64 * 1024);
  for (const relative of files) {
    const absolute = path.resolve(root, relative);
    if (absolute === resolvedStamp) continue;
    let kind = 'deleted';
    let content = Buffer.alloc(0);
    if (fs.existsSync(absolute)) {
      const metadata = fs.lstatSync(absolute);
      kind = metadata.isSymbolicLink() ? 'symlink' : metadata.mode & 0o111 ? 'executable' : 'file';
      if (metadata.isSymbolicLink()) content = Buffer.from(fs.readlinkSync(absolute));
      else {
        if (progress && metadata.size >= 8 * 1024 * 1024) progress({state:'opening', relative, kind, bytes:metadata.size, completedFiles, completedBytes, totalFiles:files.length});
        const descriptor = fs.openSync(absolute, 'r');
        let length;
        try {
          length = fs.fstatSync(descriptor).size;
          hash.update(JSON.stringify([relative, kind, length]) + '\n');
          let position = 0;
          while (position < length) {
            const bytes = fs.readSync(descriptor, chunk, 0, Math.min(chunk.length, length - position), position);
            if (!bytes) throw new Error(`Source changed while fingerprinting: ${relative}`);
            hash.update(chunk.subarray(0, bytes));
            position += bytes;
          }
          if (fs.fstatSync(descriptor).size !== length) throw new Error(`Source changed while fingerprinting: ${relative}`);
        } finally { fs.closeSync(descriptor); }
        observe(relative, kind, length);
        continue;
      }
    }
    // Length framing prevents file bytes from masquerading as another path.
    // Executability and link targets are part of Git's source tree identity.
    hash.update(JSON.stringify([relative, kind, content.length]) + '\n').update(content);
    observe(relative, kind, content.length);
  }
  progress?.({state:'complete', completedFiles, completedBytes, totalFiles:files.length});
  return { headSha: git('rev-parse', 'HEAD'), treeHash: hash.digest('hex') };
}
export function verifyStamp(stampPath) {
  const stamp = JSON.parse(fs.readFileSync(stampPath, 'utf8'));
  const current = fingerprint(stampPath);
  if (stamp.version !== 1 || stamp.strictParity !== true || stamp.headSha !== current.headSha || stamp.treeHash !== current.treeHash || JSON.stringify(stamp.stages) !== JSON.stringify(stages.map(([id]) => id)) || !Number.isFinite(Date.parse(stamp.checkedAt))) throw new Error('Gate stamp is missing full strict checks or belongs to a different commit/tree.');
  return current;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const verify = process.argv.indexOf('--verify-stamp');
    if (verify !== -1) { verifyStamp(process.argv[verify + 1]); console.log('Strict JavaScript gate stamp matches this commit and worktree.'); }
    else {
      const option = process.argv.indexOf('--stamp');
      const stampPath = option !== -1 ? process.argv[option + 1] : path.join(os.tmpdir(), 'router-js-first-gate.json');
      fs.rmSync(stampPath, { force: true });
      const fingerprintOptions = process.env.ROUTER_JS_FIRST_FINGERPRINT_PROGRESS === '1'
        ? {progress:record=>process.stderr.write(JSON.stringify({event:'javascript-gate-fingerprint', ...record, memory:process.memoryUsage()}) + '\n')}
        : undefined;
      const before = fingerprint(stampPath, fingerprintOptions);
      const failures = [];
      const commandOptions = process.env.ROUTER_JS_FIRST_COMMAND_PROGRESS === '1'
        ? {progress:record=>process.stderr.write(JSON.stringify({event:'javascript-gate-command', ...record, memory:process.memoryUsage()}) + '\n')}
        : undefined;
      for (const [id, commands] of stages) {
        console.log(`\nJavaScript stage: ${id}`);
        for (const command of commands) {
          const result = runStageCommand(id, command, commandOptions);
          if (result.status !== 0) { failures.push(`${id}: ${command}`); break; }
        }
      }
      if (failures.length) throw new Error(`JavaScript preflight failed (no green stamp written):\n${failures.join('\n')}`);
      const after = fingerprint(stampPath, fingerprintOptions);
      if (JSON.stringify(before) !== JSON.stringify(after)) throw new Error('Source changed during checks. Run the full preflight again.');
      fs.writeFileSync(stampPath, JSON.stringify({ version: 1, ...after, checkedAt: new Date().toISOString(), stages: stages.map(([id]) => id), strictParity: true }, null, 2) + '\n');
      console.log(`Strict JavaScript gate passed; stamp: ${stampPath}`);
    }
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
