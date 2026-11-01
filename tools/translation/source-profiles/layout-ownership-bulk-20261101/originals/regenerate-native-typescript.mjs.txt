#!/usr/bin/env node
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { regenerateNativeTypeScript } from '../tools/translation/js-to-rust/native-typescript.mjs';
const root = dirname(dirname(fileURLToPath(import.meta.url)));
const args = process.argv.slice(2);
const sourceIndex = args.indexOf('--source-root');
const sourceRoot = sourceIndex >= 0 ? resolve(args[sourceIndex + 1]) : root;
const result = regenerateNativeTypeScript(root, { sourceRoot, check: args.includes('--check') });
if (args.includes('--check') && (result.changed.length || result.unexpected.length)) {
  console.error(`Native TypeScript artifacts differ: ${result.changed.length} stale/missing, ${result.unexpected.length} unexpected; run node scripts/regenerate-native-typescript.mjs.`);
  process.exitCode = 1;
} else console.log(`Native TypeScript AST cycle: ${result.bytes} bytes; ${result.changed.length} changed, ${result.unexpected.length} unexpected artifacts.`);
