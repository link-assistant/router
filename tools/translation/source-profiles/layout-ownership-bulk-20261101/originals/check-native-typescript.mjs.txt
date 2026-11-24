#!/usr/bin/env node
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { compileNativeTypeScript } from '../tools/translation/js-to-rust/native-typescript.mjs';
const root = dirname(dirname(fileURLToPath(import.meta.url)));
const args = process.argv.slice(2);
const sourceIndex = args.indexOf('--source-root');
const sourceRoot = sourceIndex >= 0 ? resolve(args[sourceIndex + 1]) : root;
const outputIndex = args.indexOf('--out-dir');
const outDir = outputIndex >= 0 ? resolve(root, args[outputIndex + 1]) : undefined;
const result = compileNativeTypeScript(root, { sourceRoot, outDir, emit: Boolean(outDir) });
console.log(`Strict native TypeScript compilation passed: ${result.files} files; TypeScript ${result.compiler}.`);
