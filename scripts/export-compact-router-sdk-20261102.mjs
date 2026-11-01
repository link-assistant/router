#!/usr/bin/env node
// Optional future source-package export; never loads or runs TypeScript.
import {exportCompactInstalledTypeScriptVault} from '../tools/translation/compact-typescript-source-vault-20261102.mjs';
const options={},args=process.argv.slice(2);
for(let at=0;at<args.length;at++){
 const key=args[at],value=args[++at],name=key==='--root'?'sourceRoot':key==='--output'?'output':null;
 if(!name||!value||value.startsWith('--')||Object.hasOwn(options,name))throw TypeError('Usage: --root ORIGINAL_REPOSITORY --output FRESH_SEPARATE_DIRECTORY');
 options[name]=value;
}
console.log(JSON.stringify(exportCompactInstalledTypeScriptVault(options)));
