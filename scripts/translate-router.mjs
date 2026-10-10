#!/usr/bin/env node
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { regenerate } from '../tools/translation/bulk.mjs';

const args = process.argv.slice(2);
if (args.some(arg => !['--check', '--root'].includes(arg) && args[args.indexOf(arg) - 1] !== '--root')) throw new Error('Usage: node scripts/translate-router.mjs [--check] [--root REPOSITORY]');
const root = args.includes('--root') ? resolve(args[args.indexOf('--root') + 1]) : resolve(dirname(fileURLToPath(import.meta.url)), '..');
const { manifest, failures } = regenerate({ root, check: args.includes('--check') });
console.log(JSON.stringify({ ...manifest.totals, runtimeParity: false, mode: args.includes('--check') ? 'check' : 'write' }));
if (failures.length) {
  console.error(failures.join('\n'));
  process.exitCode = 1;
}
