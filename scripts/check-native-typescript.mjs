#!/usr/bin/env node
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {nativeTypeScriptCLIArguments} from '../tools/translation/layout-ownership-bulk-20261101-cli.mjs';
const implementationRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const args = process.argv.slice(2);
const {root,sourceRoot,outDir}=nativeTypeScriptCLIArguments(args,implementationRoot,{compile:true});
process.env.ROUTER_NATIVE_TS_SOURCE_ROOT=sourceRoot;
const {compileNativeTypeScript}=await import('../tools/translation/js-to-rust/native-typescript.mjs');
const result = compileNativeTypeScript(root, { sourceRoot, outDir, emit: Boolean(outDir) });
console.log(`Strict native TypeScript compilation passed: ${result.files} files; TypeScript ${result.compiler}.`);
