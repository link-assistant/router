#!/usr/bin/env node
// Node-only preflight. A successful inventory check never writes a green stamp.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
export const stages = [
  ['lint', ['node scripts/lint-js-first.mjs', 'node --test scripts/test/check-js-first-workflows.test.mjs', 'node --test scripts/test/check-js-first-local.test.mjs', 'node scripts/check-js-first-workflows.mjs']],
  ['node-tests', ['npm run native:test --prefix packages/javascript']],
  ['bun-tests', ['npm run native:test:bun --prefix packages/javascript']],
  ['typescript', ['npm run typecheck --prefix packages/javascript', 'npm run native:typecheck --prefix packages/javascript', 'node scripts/regenerate-native-typescript.mjs --check', 'node scripts/check-native-typescript.mjs', 'node --test tools/translation/js-to-rust/test/native-typescript.test.mjs', 'node packages/javascript/node_modules/typescript/bin/tsc -p tools/translation/tsconfig.json', 'node tools/translation/check-typescript-fixtures.mjs', 'node scripts/build-js-first-ui.mjs']],
  ['parity', ['node --test experiments/issue-759/acceptance/*.test.mjs', 'node scripts/check-router-parity.mjs --strict']],
  ['translation', ['node --test tools/translation/test/*.test.mjs', 'node scripts/translate-router.mjs --check']],
  ['reverse-translation', ['node --test tools/translation/js-to-rust/test/translator.test.mjs', 'node scripts/regenerate-js-first.mjs --check']],
];
function git(...args) {
  const result = spawnSync('git', args, { encoding: 'utf8' });
  if (result.status !== 0) throw new Error(result.stderr);
  return result.stdout.trim();
}
export function fingerprint(stampPath) {
  const root = git('rev-parse', '--show-toplevel');
  const resolvedStamp = path.join(fs.realpathSync(path.dirname(path.resolve(stampPath))), path.basename(stampPath));
  const result = spawnSync('git', ['ls-files', '-co', '--exclude-standard', '-z'], { encoding: 'utf8' });
  if (result.status !== 0) throw new Error(result.stderr);
  const files = [...new Set(result.stdout.split('\0').filter(Boolean))].sort();
  const hash = createHash('sha256');
  for (const relative of files) {
    const absolute = path.resolve(root, relative);
    if (absolute === resolvedStamp) continue;
    let kind = 'deleted';
    let content = Buffer.alloc(0);
    if (fs.existsSync(absolute)) {
      const metadata = fs.lstatSync(absolute);
      kind = metadata.isSymbolicLink() ? 'symlink' : metadata.mode & 0o111 ? 'executable' : 'file';
      content = metadata.isSymbolicLink() ? Buffer.from(fs.readlinkSync(absolute)) : fs.readFileSync(absolute);
    }
    // Length framing prevents file bytes from masquerading as another path.
    // Executability and link targets are part of Git's source tree identity.
    hash.update(JSON.stringify([relative, kind, content.length]) + '\n').update(content);
  }
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
      const before = fingerprint(stampPath);
      const failures = [];
      for (const [id, commands] of stages) {
        console.log(`\nJavaScript stage: ${id}`);
        for (const command of commands) {
          const result = spawnSync(command, { shell: true, stdio: 'inherit' });
          if (result.status !== 0) { failures.push(`${id}: ${command}`); break; }
        }
      }
      if (failures.length) throw new Error(`JavaScript preflight failed (no green stamp written):\n${failures.join('\n')}`);
      const after = fingerprint(stampPath);
      if (JSON.stringify(before) !== JSON.stringify(after)) throw new Error('Source changed during checks. Run the full preflight again.');
      fs.writeFileSync(stampPath, JSON.stringify({ version: 1, ...after, checkedAt: new Date().toISOString(), stages: stages.map(([id]) => id), strictParity: true }, null, 2) + '\n');
      console.log(`Strict JavaScript gate passed; stamp: ${stampPath}`);
    }
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
