// Fresh complete input fingerprints for optional output DATA custody only.
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {existsSync,lstatSync,readFileSync,readdirSync} from 'node:fs';
import {dirname,join,relative,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {captureSourceCorpus} from './source-corpus.mjs';
import {discoverCompilerSourceInputs} from './compiler-source-inputs.mjs';
import {discoverSourceProfileInputs} from './source-profile-inputs.mjs';
const compilerRoot=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
function installedTypes(){
 const base=join(compilerRoot,'js/node_modules/typescript'),rows=[];let total=0;
 function walk(path){for(const entry of readdirSync(path,{withFileTypes:true})){
  const full=join(path,entry.name),stat=lstatSync(full);
  if(stat.isSymbolicLink())throw TypeError('Bulk draft TypeScript source is linked');
  if(stat.isDirectory())walk(full);
  else{
   if(!stat.isFile()||stat.size>32*1024*1024||rows.length>=512||(total+=stat.size)>64*1024*1024)throw RangeError('Bulk draft installed TypeScript input bound');
   const bytes=readFileSync(full);if(bytes.length!==stat.size)throw TypeError('Bulk draft TypeScript input changed');
   rows.push({path:relative(base,full),bytes:bytes.length,sha256:hash(bytes)});
  }
 }}
 walk(base);return rows.sort((a,b)=>a.path<b.path?-1:a.path>b.path?1:0);
}
export function captureBulkDraftInputs({root=compilerRoot,sources}={}){
 root=resolve(root);
 const git=(...args)=>execFileSync('git',args,{cwd:root,encoding:'utf8',maxBuffer:8*1024*1024});
 const hasGit=existsSync(join(root,'.git'));
 const tracked=hasGit?git('ls-files','-z','--','*.rs').split('\0').filter(Boolean).sort():null;
 if(sources===undefined&&!tracked)throw TypeError('Bulk draft needs an actual tracked or explicit source selection');
 const corpus=captureSourceCorpus({root,paths:sources??tracked});
 return {head:hasGit?git('rev-parse','HEAD').trim():null,tracked,corpus,
  compiler:discoverCompilerSourceInputs({root:compilerRoot}),
  profiles:discoverSourceProfileInputs({root:compilerRoot}),typescript:installedTypes(),
  sourceAuthority:false,semanticAuthority:false,runtimeParity:false};
}
export function assertBulkDraftInputs(before,options){
 const after=captureBulkDraftInputs(options);
 if(JSON.stringify(after)!==JSON.stringify(before))throw TypeError('Complete bulk draft source/compiler/TypeScript/Git inputs changed');
 return after;
}
