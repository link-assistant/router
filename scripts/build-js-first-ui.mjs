#!/usr/bin/env node
// Compile JavaScript UI without changing tracked ui/dist or retaining artifacts.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
const output = fs.mkdtempSync(path.join(os.tmpdir(), 'router-js-first-ui-'));
try {
  const result = spawnSync('npm', ['run', 'build', '--prefix', 'ui', '--', '--outDir', output, '--emptyOutDir'], { stdio: 'inherit' });
  process.exitCode = result.status ?? 1;
} finally { fs.rmSync(output, { recursive: true, force: true }); }
