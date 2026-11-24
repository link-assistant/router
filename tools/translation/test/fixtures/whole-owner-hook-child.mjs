// Complete observer workloads in one fresh engine process. No warmup is hidden.
import {readFileSync} from 'node:fs';
import {Hash} from 'node:crypto';
import {repositorySourceURL} from './repository-paths.mjs';
import {loadDeriveDependencyProof} from '../../derive-dependencies.mjs';
import {createDeriveFootprintContext} from '../../derive-footprints.mjs';
import {PRODUCTION_PROFILE} from '../../cfg-profile.mjs';
import {createDeriveBangContext,createWholeOwnerDeriveBangContext,originalAttributeOwnerBulkCryptoReady} from '../../whole-owner-derive-candidate.mjs';
const root=new URL('../../../../',import.meta.url),dependencies=loadDeriveDependencyProof({manifest:readFileSync(repositorySourceURL('Cargo.toml',root),'utf8'),lock:readFileSync(repositorySourceURL('Cargo.lock',root),'utf8')}),get=Object.getOwnPropertyDescriptor,define=Object.defineProperty,apply=Reflect.apply,json=JSON.stringify;
const creator={legacy:createDeriveBangContext,whole:createWholeOwnerDeriveBangContext}[process.argv[2]],kind=process.argv[3];if(!creator||!['json-hook','callback-installed-hook'].includes(kind)||process.argv.length!==4)throw TypeError('Exactly one complete legacy|whole and observer fixture required');
function setup(){return {deriveContext:createDeriveFootprintContext({modules:[{file:'src/lib.rs',path:[],source:'mod model;'},{file:'src/model.rs',path:['model'],source:kind==='json-hook'?'#[derive(Clone)] pub struct Empty;':'#[derive(Clone)] pub struct Other;'}],dependencies,compilationProfile:PRODUCTION_PROFILE})};}
function outcome(run){try{return {value:run()};}catch(error){return {error:{name:error.name,message:error.message}};}}
function observe(kind,input){
 const stringify=get(JSON,'stringify'),update=get(Hash.prototype,'update'),digest=get(Hash.prototype,'digest'),tape=[];let first=true;
 const observedStringify=function(...args){const value=apply(stringify.value,this,args);tape[tape.length]={operation:'JSON.stringify',args:apply(json,JSON,[args]),value};return value;};
 try{
  if(kind==='json-hook')define(JSON,'stringify',{...stringify,value:observedStringify});
  else if(kind==='callback-installed-hook'){
   define(Hash.prototype,'update',{...update,value:function(...args){if(first){first=false;define(JSON,'stringify',{...stringify,value:observedStringify});}tape[tape.length]={operation:'Hash.update',args};return apply(update.value,this,args);}});
   define(Hash.prototype,'digest',{...digest,value:function(...args){const value=apply(digest.value,this,args);tape[tape.length]={operation:'Hash.digest',args,value};return value;}});
  }else throw TypeError('Complete original observer kind required');
  return {kind,result:outcome(()=>creator(input)),tape};
 }finally{define(JSON,'stringify',stringify);define(Hash.prototype,'update',update);define(Hash.prototype,'digest',digest);}
}
const eligible=originalAttributeOwnerBulkCryptoReady(),workloads=[],first=setup();workloads.push({state:'first-observed-context',...observe(kind,first)});
workloads.push({state:'fresh-context-after-observed-work',...observe(kind,setup())});
workloads.push({state:'same-context-after-observed-work',...observe(kind,first)});
// Transport every full result, argument and return value by declared JSON wire;
// the parent compares every field of both complete child streams.
process.stdout.write(apply(json,JSON,[{schema:'complete-whole-owner-hook-wire-v1',engine:{execPath:process.execPath,node:process.versions.node,bun:process.versions.bun??null},eligible,workloads}]));
