// All constructor and resolver work is observed; no cache warming is hidden.
import {readFileSync} from 'node:fs';
import {Hash} from 'node:crypto';
import {repositorySourceURL} from './repository-paths.mjs';
import {loadDeriveDependencyProof} from '../../derive-dependencies.mjs';
import {createDeriveFootprintContext,deriveFootprintExternalModules} from '../../derive-footprints.mjs';
import {PRODUCTION_PROFILE} from '../../cfg-profile.mjs';
import {createDeriveBangContext} from '../../whole-owner-derive-bang-context-candidate.mjs';
import {resolveModuleBindings,resolveWholeOwnerModuleBindings} from '../../whole-owner-resolver-candidate.mjs';
const root=new URL('../../../../',import.meta.url),dependencies=loadDeriveDependencyProof({manifest:readFileSync(repositorySourceURL('Cargo.toml',root),'utf8'),lock:readFileSync(repositorySourceURL('Cargo.lock',root),'utf8')}),get=Object.getOwnPropertyDescriptor,define=Object.defineProperty,apply=Reflect.apply,json=JSON.stringify;
const resolver={legacy:resolveModuleBindings,whole:resolveWholeOwnerModuleBindings}[process.argv[2]],kind=process.argv[3];if(!resolver||!['json-hook','hash-hook'].includes(kind)||process.argv.length!==4)throw TypeError('Complete legacy|whole and JSON|Hash resolver fixture required');
function setup(){const modules=[{file:'src/lib.rs',path:[],source:'mod model;'},{file:'src/model.rs',path:['model'],source:'#[derive(Clone)] pub struct Empty;'}],deriveContext=createDeriveFootprintContext({modules,dependencies,compilationProfile:PRODUCTION_PROFILE}),input={modules,deriveContext,externalModules:deriveFootprintExternalModules(deriveContext),compilationProfile:PRODUCTION_PROFILE};return {...input,deriveBangContext:createDeriveBangContext(input)};}
function outcome(run){try{return {value:run()};}catch(error){return {error:{name:error.name,message:error.message}};}}
function observe(run){
 const stringify=get(JSON,'stringify'),update=get(Hash.prototype,'update'),digest=get(Hash.prototype,'digest'),tape=[];
 try{
  if(kind==='json-hook')define(JSON,'stringify',{...stringify,value:function(...args){const value=apply(stringify.value,this,args);tape[tape.length]={operation:'JSON.stringify',args:apply(json,JSON,[args]),value};return value;}});
  else{define(Hash.prototype,'update',{...update,value:function(...args){tape[tape.length]={operation:'Hash.update',args};return apply(update.value,this,args);}});define(Hash.prototype,'digest',{...digest,value:function(...args){const value=apply(digest.value,this,args);tape[tape.length]={operation:'Hash.digest',args,value};return value;}});}
  return {result:outcome(run),tape};
 }finally{define(JSON,'stringify',stringify);define(Hash.prototype,'update',update);define(Hash.prototype,'digest',digest);}
}
let first;const workloads=[];
workloads.push({state:'cold-complete-creation-and-resolver',...observe(()=>{first=setup();return {deriveContext:first.deriveContext,deriveBangContext:first.deriveBangContext,bindings:resolver(first)};})});
workloads.push({state:'warm-fresh-complete-creation-and-resolver',...observe(()=>{const input=setup();return {deriveContext:input.deriveContext,deriveBangContext:input.deriveBangContext,bindings:resolver(input)};})});
workloads.push({state:'same-context-resolver',...observe(()=>resolver(first))});
process.stdout.write(apply(json,JSON,[{schema:'complete-whole-owner-resolver-hook-wire-v1',kind,engine:{execPath:process.execPath,node:process.versions.node,bun:process.versions.bun??null},workloads}]));
