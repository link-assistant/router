#!/usr/bin/env node
// Source-drafted opt-in bootstrap. It does not import/run a receiving compiler.
import {createCompactSparseGitSourceBank} from '../tools/translation/compact-sparse-git-bank-20261102.mjs';
const options={hotPaths:[]},args=process.argv.slice(2);
for(let at=0;at<args.length;at++){
 const key=args[at],value=args[++at];if(!value||value.startsWith('--'))throw TypeError('Usage: --vault ORIGINAL_VAULT --output FRESH_BANK [--hot EXACT_PATH ...] [--format sha1|sha256]');
 if(key==='--hot')options.hotPaths.push(value);else{const name=key==='--vault'?'vaultDirectory':key==='--output'?'output':key==='--format'?'objectFormat':null;if(!name||Object.hasOwn(options,name))throw TypeError('Unknown or repeated source-bank option');options[name]=value;}
}
console.log(JSON.stringify(createCompactSparseGitSourceBank(options)));
