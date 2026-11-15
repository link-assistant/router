import test,{after} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {pathToFileURL,fileURLToPath} from 'node:url';
import * as current from '../derive-footprints.mjs';
import {loadDeriveDependencyProof} from '../derive-dependencies.mjs';
import {resolveModuleGraph} from '../project.mjs';
import {PRODUCTION_PROFILE} from '../cfg-profile.mjs';
import {rustPackageSourcePath} from '../repository-layout.mjs';

const root=new URL('../../../',import.meta.url),base=new URL('../',import.meta.url);
const profile=new URL('../source-profiles/derive-path-index-reentry/',import.meta.url);
const hash=value=>createHash('sha256').update(value).digest('hex');
const json=JSON.stringify,apply=Reflect.apply;
const manifestBytes=readFileSync(new URL('manifest.json',profile));
assert.equal(hash(manifestBytes),'4352d05424c56ab78a6b0620f236253b4b324630b34b9c78ed089bfc17389405');
const manifest=JSON.parse(manifestBytes),packed=readFileSync(new URL(manifest.archive,profile));
assert.equal(packed.length,manifest.archiveBytes);
assert.equal(hash(packed),manifest.archiveSha256);
const original=gunzipSync(packed,{maxOutputLength:262144});
assert.equal(original.length,manifest.bytes);
assert.equal(hash(original),manifest.sha256);
// Execute the complete immediate predecessor with the same active issuers.
// Only actual relative import locations change; every original body is intact.
const relocations=[],relocated=original.toString().replace(/\bfrom (['"])(\.\/[^'"]+)\1/g,(whole,quote,path)=>{
 const target=new URL(path,base).href;relocations.push({path,target});
 return 'from '+quote+target+quote;
});
assert.ok(relocations.length>0);
assert.equal(relocated.replace(/\bfrom (['"])(file:[^'"]+)\1/g,(whole,quote,target)=>{
 const row=relocations.find(row=>row.target===target);
 return row?'from '+quote+row.path+quote:whole;
}),original.toString());
const directory=mkdtempSync(join(tmpdir(),'router-derive-path-reentry-'));
after(()=>rmSync(directory,{recursive:true,force:true}));
const oldPath=join(directory,'complete-original.mjs');writeFileSync(oldPath,relocated);
const previous=await import(pathToFileURL(oldPath).href);
const dependencies=loadDeriveDependencyProof({
 manifest:readFileSync(new URL(rustPackageSourcePath(fileURLToPath(root),'Cargo.toml'),root),'utf8'),
 lock:readFileSync(new URL(rustPackageSourcePath(fileURLToPath(root),'Cargo.lock'),root),'utf8'),
});

function fixture(){
 const source='extern crate self as link_assistant_router;\n'
  +'#[cfg(unix)]mod optional;\nmod tail;\n'
  +Array.from({length:4},(_,index)=>'mod child_'+index+'{#[derive(Clone,Debug)]pub struct Payload_'+index+'{value:u8}}').join('\n');
 const sources=new Map([['src/lib.rs',source],['src/optional.rs','pub struct Hidden;'],
  ['src/tail.rs','#[derive(Clone,Debug)]pub struct Tail{value:u8}']]);
 const graph=resolveModuleGraph({entry:'src/lib.rs',paths:[...sources.keys()],
  readSource:path=>sources.get(path),compilationProfile:PRODUCTION_PROFILE});
 return {sources,graph};
}
function run(implementation,row){
 return implementation.createDeriveFootprintContext({modules:row.graph.modules,
  dependencies,compilationProfile:PRODUCTION_PROFILE});
}
function equal(expected,actual){assert.deepEqual(actual,expected);assert.equal(json(actual),json(expected));}

test('resolved paths after a genuine unknown conditional sibling retain every original context and private proof',{timeout:10000},()=>{
 const a=fixture(),b=fixture(),expected=run(previous,a),actual=run(current,b);
 equal(expected,actual);
 assert.deepEqual(actual.diagnostics,[]);
 assert.equal(actual.certificates.filter(row=>row.standardInput).length,5);
 for(const certificate of actual.certificates){
  const scope=certificate.standardInput.originalScopes.find(row=>row.module.length===0);
  assert.equal(scope.requestedOwnersClosed,true);
  assert.equal(scope.conditionalSiblingScopeProofs.length,1);
  assert.equal(scope.conditionalSiblingScopeProofs[0].conditionalAvailabilitySelected,false);
  assert.equal(current.isDeriveFootprintCertificate(certificate),true);
  assert.equal(previous.isDeriveFootprintCertificate(certificate),false);
  assert.equal(current.isDeriveFootprintCertificate(structuredClone(certificate)),false);
 }
 assert.ok(b.graph.modules.some(row=>row.path[0]==='optional'&&row.configurationCondition==='unknown'));
});

test('fresh reentry refuses observable serializers and mutable path hooks with the complete original callback order',{timeout:10000},()=>{
 function observe(implementation,kind){
  const row=fixture(),tail=row.graph.modules.find(row=>row.path[0]==='tail'),tape=[];
  const descriptor=Object.getOwnPropertyDescriptor(JSON,'stringify');let mutated=false,context;
  if(kind==='getter')Object.defineProperty(tail.path,0,{enumerable:true,configurable:true,
   get(){tape.push('path-get');return 'tail';}});
  try{
   Object.defineProperty(JSON,'stringify',{...descriptor,value(...args){
    const result=apply(json,this,args);tape.push(result);
    if(kind==='mutation'&&!mutated&&args[0]?.name==='optional'){
     mutated=true;tail.path[0]='changed';
    }
    return result;
   }});
   context=run(implementation,row);
  }finally{Object.defineProperty(JSON,'stringify',descriptor);}
  return {tape,context,mutated,path:[...tail.path]};
 }
 for(const kind of ['serializer','getter','mutation']){
  const expected=observe(previous,kind),actual=observe(current,kind);
  equal(expected,actual);assert.ok(actual.tape.length>0);
  if(kind==='mutation'){assert.equal(actual.mutated,true);assert.deepEqual(actual.path,['changed']);}
  if(kind==='getter')assert.ok(actual.tape.includes('path-get'));
 }
});
