import {repositorySourceURL} from "./fixtures/repository-paths.mjs";
// Production body selection under an explicit profile; no source substitutions.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {execFileSync} from 'node:child_process';
import {PRODUCTION_PROFILE} from '../cfg-profile.mjs';
import {sourceItems} from '../rust-structure.mjs';
import {translateProject} from '../project.mjs';
import {translateSource,sha256} from '../translate.mjs';
import {writeRuntimeAssets} from './artifact-loader.mjs';
const root=new URL('../../../',import.meta.url);
const pins=[
  ['src/clients/types.rs',106,154,'1a25cd77f2d5a2a2a4ab738653bc0f4f1fa4fc02d84b98567021ca2e4c328d12'],
  ['src/clients/repair.rs',351,488,'fe20cbbc1822a8656522e51ad519dce07a47fa0e184299f015453fe956dc6996'],
  ['src/clients/repair.rs',490,763,'a0e60a8c04ca3f9ac18610a456773168b82de312dd44ee9990cc86408812dca3'],
  ['src/clients/repair.rs',765,924,'542b470042712269128fb28c9889f5bc22db3616dc0c07b98c120ade7bb22f90'],
];
function originalDeclarations(){
  return pins.map(([path,start,end,hash])=>{const source=readFileSync(repositorySourceURL(path,root),'utf8'),item=sourceItems(source).find(item=>item.start===start&&item.end===end);assert.ok(item,path);const text=source.slice(start,end);assert.equal(sha256(text),hash,path);return text;});
}
const compile=(source,profile)=>translateProject({entry:'src/lib.rs',paths:['src/lib.rs'],readSource:()=>source,compilationProfile:profile});
async function bothTargets(result,assertions){
  const directory=mkdtempSync(join(tmpdir(),'router-cfg-source-'));
  try{
    writeRuntimeAssets(directory);const js=join(directory,'src/module.mjs'),ts=join(directory,'src/module.ts');writeFileSync(js,result.javascript);writeFileSync(ts,result.typescript);
    execFileSync(process.execPath,['--check',js],{timeout:30_000});
    execFileSync(process.env.ROUTER_TRANSLATION_TSC??'tsc',['--strict','--target','ES2022','--module','NodeNext','--moduleResolution','NodeNext','--outDir',join(directory,'compiled'),ts],{encoding:'utf8',timeout:30_000});
    for(const path of [js,join(directory,'compiled/module.js')])assertions((await import(pathToFileURL(path).href)).translated);
  }finally{rmSync(directory,{recursive:true,force:true});}
}
test('actual production transaction checkpoint retains all original conditional variants and executes both targets',{timeout:30_000},async()=>{
  const declarations=originalDeclarations(),source=declarations.join('\n')+'\npub fn invoke(stage:&\'static str)->Result<(),ClientError>{transaction_checkpoint(stage)}';
  const result=compile(source,PRODUCTION_PROFILE);assert.deepEqual(result.meta.refused,[]);
  // invoke is a fixture carrier, excluded from original production body counts.
  assert.deepEqual(result.meta.executable.filter(entry=>entry.term==='fn').map(entry=>entry.name),['transaction_checkpoint','invoke']);
  const expectedSpan={start:source.indexOf(declarations[3]),end:source.indexOf(declarations[3])+declarations[3].length};
  assert.deepEqual(result.meta.executable.find(entry=>entry.name==='transaction_checkpoint').span,expectedSpan);assert.equal(sha256(source.slice(expectedSpan.start,expectedSpan.end)),pins[3][3]);
  assert.equal(result.meta.checkedSemanticProgram.program.declarations.$map.some(([,entry])=>entry.name==='transaction_checkpoint'&&entry.constFunction===true),true);
  assert.equal(result.meta.compilationProfile.flags.test,false);assert.equal(Object.isFrozen(result.sourceScopes[0].scope.compilationProfile.flags),true);
  const evidence=result.meta.configurationEvidence[0].items;assert.equal(evidence.filter(entry=>entry.status==='inactive').length,2);assert.equal(evidence.find(entry=>entry.span.start===expectedSpan.start).attributes[0].tokens.join(''),'#[cfg(not(test))]');
  await bothTargets(result,api=>{for(const stage of ['write','backup','', '\u0085stage','arbitrary bearer-like stage'])assert.deepEqual(api.invoke(stage),{$:'Ok',field0:null});assert.throws(()=>api.invoke(1),TypeError);});
  const local=translateSource(source,'src/lib.rs',{projectDeclarations:result.executableDeclarations,projectSourceScopes:result.sourceScopes});
  assert.equal(local.ir.sourceSha256,sha256(source));assert.equal(local.ir.items.map(item=>item.source).join(''),source);assert.equal(local.ir.counts.executableFunctions,2);assert.equal(local.ir.items.filter(item=>item.configuration?.status==='inactive').every(item=>item.status==='carried'),true);
  await bothTargets(local,api=>assert.deepEqual(api.invoke('write'),{$:'Ok',field0:null}));
});
test('unknown and test profiles never select the production checkpoint body',()=>{
  const source=originalDeclarations().join('\n')+'\npub fn invoke(stage:&\'static str)->Result<(),ClientError>{transaction_checkpoint(stage)}';
  for(const profile of [null,{flags:{test:true}},{flags:{unix:true}}]){const result=compile(source,profile);assert.equal(result.meta.executable.some(entry=>entry.name==='transaction_checkpoint'||entry.name==='invoke'),false);}
});
test('per-source profile evidence cannot restore inactive or unknown crate bodies',()=>{
  for(const predicate of ['test','unix']){const source=`#![cfg(${predicate})]\npub fn invented()->u8{7}`,result=compile(source,PRODUCTION_PROFILE),local=translateSource(source,'src/lib.rs',{projectDeclarations:result.executableDeclarations,projectSourceScopes:result.sourceScopes});assert.equal(local.ir.counts.executableFunctions,0);assert.equal(local.ir.items.map(item=>item.source).join(''),source);assert.equal(local.ir.compilationProfile.flags.test,false);}
});
test('tracked generation records its explicit profile and keeps every inactive file byte',{timeout:30_000},async()=>{
  const {mkdirSync}=await import('node:fs'),{regenerate}=await import('../bulk.mjs'),directory=mkdtempSync(join(tmpdir(),'router-cfg-repository-'));
  const source='#[cfg(test)] mod tests; #[cfg(not(test))] pub fn selected()->u8{3} #[cfg(test)] pub fn selected()->u8{9}',testSource='macro_rules! format {()=>{}}';
  try{
    mkdirSync(join(directory,'src'));writeFileSync(join(directory,'src/lib.rs'),source);writeFileSync(join(directory,'src/tests.rs'),testSource);
    execFileSync('git',['init','--quiet'],{cwd:directory});execFileSync('git',['add','src'],{cwd:directory});
    regenerate({root:directory});assert.deepEqual(regenerate({root:directory,check:true}).failures,[]);
    const inventory=JSON.parse(readFileSync(join(directory,'parity/rust-source-inventory.json'),'utf8'));assert.equal(inventory.totals.sources,2);assert.equal(inventory.compilationProfile.flags.test,false);assert.ok(inventory.implementationHashes['tools/translation/cfg-profile.mjs']);
    for(const [path,original] of [['src/lib',source],['src/tests',testSource]]){const meta=JSON.parse(readFileSync(join(directory,`tools/translation/meta/${path}.meta.json`),'utf8'));assert.equal(meta.items.map(item=>item.source).join(''),original);}
    const result={javascript:readFileSync(join(directory,'js/generated/rust-draft/src/lib.mjs'),'utf8'),typescript:readFileSync(join(directory,'ts/generated/rust-draft/src/lib.ts'),'utf8')};await bothTargets(result,api=>assert.equal(api.selected(),3n));
  }finally{rmSync(directory,{recursive:true,force:true});}
});

test('an elided fixture carrier cannot forward a borrow to a written static parameter',()=>{
  const source=originalDeclarations().join('\n')+'\npub fn invoke(stage:&str)->Result<(),ClientError>{transaction_checkpoint(stage)}';
  const result=compile(source,PRODUCTION_PROFILE);assert.ok(result.meta.refused.some(entry=>entry.name==='invoke'&&/static source parameter/.test(entry.message)));
});
