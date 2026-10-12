// Test-only cache: actual source bytes/Cargo/profile are captured once. No
// semantic program, profile namespace or private compiler token is transferred
// between processes, runtime engines, entries or compilation profiles.
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {translateProject} from '../project.mjs';
import {loadDeriveDependencyProof} from '../derive-dependencies.mjs';
import {PRODUCTION_PROFILE} from '../cfg-profile.mjs';
import {annotateRuntimeTypes} from '../translate.mjs';
const root=fileURLToPath(new URL('../../../',import.meta.url));
const hash=value=>createHash('sha256').update(value).digest('hex');
let context;
export function originalCsvContext(){
  if(context)return context;
  const sourceHead=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8',timeout:30_000}).trim();
  if(!/^[a-f0-9]{40}$/.test(sourceHead))throw new TypeError('Original CSV context requires one exact source commit');
  const paths=execFileSync('git',['ls-files','-z','--','*.rs'],{cwd:root,encoding:'utf8',timeout:30_000}).split('\0').filter(Boolean).sort();
  if(paths.length>20_000||new Set(paths).size!==paths.length)throw new TypeError('Original CSV source set exceeds its unique-path budget');
  const sources=new Map(),receipt=[];let total=0;
  const capture=file=>{
    if(file.startsWith('/')||file.includes('\\')||file.split('/').some(part=>!part||part==='.'||part==='..'))throw new TypeError('Original CSV source path must stay inside its repository');
    let raw,readOrigin='working-tree';try{raw=readFileSync(join(root,file));}catch(error){
      if(error.code!=='ENOENT'||!paths.includes(file))throw error;
      // Sparse worker checkouts omit tracked evidence files. Read their exact
      // original commit bytes; never replace/remove any tracked Rust input.
      readOrigin='captured-commit-blob';raw=execFileSync('git',['show',sourceHead+':'+file],{cwd:root,timeout:30_000,maxBuffer:8*1024*1024});
    }
    if(raw.length>8*1024*1024||(total+=raw.length)>64*1024*1024)throw new TypeError('Original CSV source set exceeds its byte budget');
    const text=raw.toString('utf8');if(!Buffer.from(text).equals(raw))throw new TypeError('Original Rust source must be lossless UTF-8');
    sources.set(file,text);receipt.push(Object.freeze({source:file,bytes:raw.length,sha256:hash(raw),readOrigin}));return text;
  };
  for(const file of paths)capture(file);
  const manifest=capture('Cargo.toml'),lock=capture('Cargo.lock');
  const source=file=>{if(!sources.has(file))throw new TypeError('Original CSV context has no captured tracked source: '+file);return sources.get(file);};
  const inputs=Object.freeze({entry:'src/lib.rs',sourceHead,compilationProfile:PRODUCTION_PROFILE,sources:Object.freeze(receipt),originalBytes:total,digest:hash(JSON.stringify({entry:'src/lib.rs',sourceHead,compilationProfile:PRODUCTION_PROFILE,sources:receipt}))});
  let attempted=false,failed=false,result,failure;
  context=Object.freeze({source,inputs,get result(){
    if(!attempted){attempted=true;try{const deriveDependencies=loadDeriveDependencyProof({manifest,lock});result=translateProject({entry:inputs.entry,paths:Object.freeze([...paths]),readSource:source,compilationProfile:inputs.compilationProfile,deriveDependencies});}catch(error){failed=true;failure=error;}}
    if(failed)throw failure;return result;
  }});
  return context;
}
export function checkedDeclarationTargets(declaration){
  const lowered=declaration.lower({runtimeModule:'../runtime/effects.mjs'}),emitted=lowered.emitted,alias=emitted.mappings.find(mapping=>mapping.source===declaration.name);
  if(!alias)throw new Error('Checked original declaration has no emitted target mapping');
  const dataTypes=[...lowered.program.declarations.values()].filter(entry=>entry.k==='data');
  const javascript=emitted.text+'\nexport const translated=Object.freeze({'+JSON.stringify(declaration.name)+':'+alias.target+'});\n';
  const typescript=annotateRuntimeTypes(javascript,new Map(emitted.signatures.map(entry=>[entry.target,entry.params])),dataTypes,new Map(emitted.signatures.map(entry=>[entry.target,entry.ret])));
  return {meta:{entry:'src/lib.rs',runtimeParity:false},javascript,typescript,lowered};
}
