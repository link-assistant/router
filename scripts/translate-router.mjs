#!/usr/bin/env node
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { regenerate } from '../tools/translation/bulk.mjs';

const args = process.argv.slice(2);
let root = resolve(dirname(fileURLToPath(import.meta.url)), '..'), check = false;
const entries = [];
for (let index = 0; index < args.length; index++) {
  const argument = args[index];
  if (argument === '--check') check = true;
  else if (['--root', '--entry'].includes(argument) && args[index + 1] && !args[index + 1].startsWith('--')) {
    const value = args[++index];
    if (argument === '--root') root = resolve(value); else entries.push(value);
  } else throw new Error('Usage: node scripts/translate-router.mjs [--check] [--root REPOSITORY] [--entry TRACKED_RS]');
}
const { manifest, failures } = regenerate({ root, check, entries: entries.length ? entries : undefined });
console.log(JSON.stringify({ ...manifest.totals, projects: manifest.projects, runtimeParity: false, mode: check ? 'check' : 'write' }));
if (failures.length) {
  console.error(failures.join('\n'));
  process.exitCode = 1;
}
