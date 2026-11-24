// One synchronous source operation only. No saved verdict, semantic project or
// source cache survives its closing fence. SOURCE ONLY; ALL UNRUN.
import {types} from 'node:util';
import {translateProject} from '../project.mjs';
import {PRODUCTION_PROFILE} from '../cfg-profile.mjs';
import {jsonMacroDependencyProfile} from '../json-macro-inputs.mjs';
import {deriveDependencyProfile} from '../derive-dependencies.mjs';
import {ownedPlainData,ownedSourcePath} from './owned-vector-candidate-source.mjs';
import {assertReverseConcreteSourceHost} from './concrete-source.mjs';
let active=null;
const fail=message=>{throw new TypeError('Owned native source operation: '+message);};
function synchronous(value){
 if(types.isPromise(value)||types.isProxy(value))fail('synchronous ordinary operation result required');
 if(value&&(typeof value==='object'||typeof value==='function')){const then=Object.getOwnPropertyDescriptor(value,'then');if(then&&(!Object.hasOwn(then,'value')||typeof then.value==='function'))fail('asynchronous operation result refused');}return value;
}
function dependencies(inputs){
 const json=jsonMacroDependencyProfile(inputs).proof,derive=deriveDependencyProfile(inputs).proof;
 // These are newly issued original package-source proofs, never input digests.
 return {json,derive,signature:JSON.stringify([json?.digest??null,derive?.digest??null,PRODUCTION_PROFILE])};
}
export function withOwnedNativeProjectOperation(run){
 if(typeof run!=='function'||types.isProxy(run)||types.isAsyncFunction(run))fail('synchronous source operation callback required');
 assertReverseConcreteSourceHost();const frame=active??{depth:0,entry:null,compilations:0,reuses:0},owner=active===null;if(frame.depth>=64)fail('bounded nested source operation required');active=frame;frame.depth++;let primaryFailed=false;
 try{return synchronous(run());}catch(error){primaryFailed=true;throw error;}finally{
  let failed=false,fenceError;try{assertReverseConcreteSourceHost();if(owner&&frame.entry&&dependencies(frame.entry.inputs).signature!==frame.entry.signature)fail('original dependency source changed before operation close');}catch(error){failed=true;fenceError=error;}finally{frame.depth--;if(owner){frame.entry=null;frame.compilations=0;frame.reuses=0;active=null;}}
  if(!primaryFailed&&failed)throw fenceError;
 }
}
/** Native source and Cargo bytes only; checked receiving items are never saved. */
function readProject(input,reader){
 assertReverseConcreteSourceHost();const data=ownedPlainData(input),files=new Map();
 if(!Array.isArray(data)||!data.length||data.length>4096)fail('bounded complete source file rows required');
 for(const row of data){if(!row||typeof row!=='object'||Object.keys(row).length!==2||!Object.hasOwn(row,'path')||!Object.hasOwn(row,'source')||typeof row.source!=='string')fail('complete own source path and bytes required');ownedSourcePath(row.path);if(files.has(row.path))fail('duplicate native source row');if(row.path.endsWith('.rs')||['Cargo.toml','Cargo.lock'].includes(row.path))files.set(row.path,row.source);}
 const rows=[...files].sort(([a],[b])=>a<b?-1:a>b?1:0),inputs={manifest:files.get('Cargo.toml'),lock:files.get('Cargo.lock')};let primaryFailed=false,current;
 try{
  if(!files.has('src/lib.rs')||typeof inputs.manifest!=='string'||typeof inputs.lock!=='string')fail('complete current Rust entry and Cargo source required');
  current=dependencies(inputs);const frame=active,old=frame?.entry,same=old&&old.reader===reader&&old.signature===current.signature&&old.rows.length===rows.length&&rows.every(([path,source],index)=>old.rows[index][0]===path&&old.rows[index][1]===source);
  if(same){frame.reuses++;assertReverseConcreteSourceHost();return old.project;}
  const sourceMap=new Map(rows),project=translateProject({entry:'src/lib.rs',paths:rows.map(([path])=>path).filter(path=>path.endsWith('.rs')),readSource:path=>{if(!sourceMap.has(path))fail('project requested an untracked native input');return sourceMap.get(path);},compilationProfile:PRODUCTION_PROFILE,cargoManifest:inputs.manifest,jsonMacroDependencies:current.json,deriveDependencies:current.derive});
  if(frame){frame.compilations++;frame.entry={reader,rows,inputs,signature:current.signature,project};}return project;
 }catch(error){primaryFailed=true;throw error;}finally{
  let failed=false,fenceError;try{assertReverseConcreteSourceHost();if(current&&dependencies(inputs).signature!==current.signature)fail('current dependency source changed during native project read');}catch(error){failed=true;fenceError=error;}finally{files.clear();if((primaryFailed||failed)&&active)active.entry=null;}
  if(!primaryFailed&&failed)throw fenceError;
 }
}
// A consumer retains this reader privately. A foreign reader cannot expose or
// poison its project by supplying equal source bytes or diagnostic metadata.
export function createOwnedNativeProjectReader(){const reader=Object.freeze({});return input=>readProject(input,reader);}
export const readOwnedNativeProjectForSource=createOwnedNativeProjectReader();
/** Diagnostic counters only. They grant no source or executable permission. */
export function ownedNativeProjectOperationStatistics(){return active?{compilations:active.compilations,reuses:active.reuses,retainedProjects:active.entry?1:0,sourceAuthority:false,semanticAuthority:false,crossInvocationCache:false}:null;}
