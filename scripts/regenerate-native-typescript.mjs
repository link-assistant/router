#!/usr/bin/env node
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {nativeTypeScriptCLIArguments} from '../tools/translation/layout-ownership-bulk-20261101-cli.mjs';
const implementationRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const args = process.argv.slice(2);
const {root,sourceRoot,check}=nativeTypeScriptCLIArguments(args,implementationRoot);
process.env.ROUTER_NATIVE_TS_SOURCE_ROOT=sourceRoot;
const {regenerateNativeTypeScript}=await import('../tools/translation/js-to-rust/native-typescript.mjs');
const result = regenerateNativeTypeScript(root, { sourceRoot, check });
if (check && (result.changed.length || result.unexpected.length)) {
  console.error(`Native TypeScript artifacts differ: ${result.changed.length} stale/missing, ${result.unexpected.length} unexpected; run node scripts/regenerate-native-typescript.mjs.`);
  process.exitCode = 1;
} else console.log(`Native TypeScript AST cycle: ${result.bytes} bytes; ${result.changed.length} changed, ${result.unexpected.length} unexpected artifacts.`);
