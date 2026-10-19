#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
const roots = ['packages/javascript', 'tools/translation', 'scripts'];
let count = 0;
function walk(directory) {
  if (!fs.existsSync(directory)) return;
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (['node_modules', 'generated', 'fixtures'].includes(entry.name)) continue;
    const filename = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(filename);
    else if (/\.(?:mjs|cjs|js)$/.test(entry.name)) {
      const result = spawnSync(process.execPath, ['--check', filename], { stdio: 'inherit' });
      if (result.status !== 0) process.exit(result.status ?? 1);
      count++;
    }
  }
}
roots.forEach(walk);
console.log(`Syntax checked ${count} JavaScript source files.`);
