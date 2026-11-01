#!/usr/bin/env node
// Source-drafted opt-in DATA export. Does not replace the original exporter.
import {exportCompactCommittedSourceVault} from '../tools/translation/compact-committed-source-vault-20261102.mjs';
const args=process.argv.slice(2),options={extraPaths:[]};
for(let at=0;at<args.length;at++){
 const key=args[at],value=args[++at];
 if(!['--root','--output','--include'].includes(key)||!value||value.startsWith('--'))throw TypeError('Usage: --root COMMITTED_REPOSITORY --output FRESH_SEPARATE_DIRECTORY [--include EXACT_TRACKED_PATH ...]');
 if(key==='--include')options.extraPaths.push(value);else{const name=key==='--root'?'sourceRoot':'output';if(Object.hasOwn(options,name))throw TypeError('Duplicate export option');options[name]=value;}
}
console.log(JSON.stringify(exportCompactCommittedSourceVault(options)));
