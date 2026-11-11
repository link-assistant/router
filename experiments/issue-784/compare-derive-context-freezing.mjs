// Finite candidate comparison. Complete source and results remain diagnostic DATA.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdtempSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {pathToFileURL} from 'node:url';
import {loadDeriveDependencyProof} from '../../tools/translation/derive-dependencies.mjs';
import {PRODUCTION_PROFILE} from '../../tools/translation/cfg-profile.mjs';
import {writeCompleteEvidenceJson} from './complete-evidence-json.mjs';

const origin=new URL('../../tools/translation/derive-footprints.mjs',import.meta.url);
const before=readFileSync(origin,'utf8'),anchor="const contexts=new WeakMap(),certificates=new WeakMap()";
assert.equal(before.split(anchor).length,2);
let after=before.replace(anchor,"const freezeCompleted=createCompletedDataFreezer(freeze);\n"+anchor);
after="import {createCompletedDataFreezer} from './private-data-freeze.mjs';\n"+after;
// The unchanged original recursive closure remains the exact fallback.
const boundary=after.indexOf(anchor);
after=after.slice(0,boundary)+after.slice(boundary).replace(/\bfreeze\(/gu,'freezeCompleted(');
const directory=mkdtempSync(join(tmpdir(),'router-derive-freeze-comparison-'));
try{
 const load=async(source,label)=>{
  const relocations=[];
  const relocated=source.replace(/\bfrom (['"])(\.\.?\/[^'"]+)\1/gu,(whole,quote,path)=>{
   const replacement='from '+quote+new URL(path,origin).href+quote;
   relocations.push({before:whole,after:replacement});return replacement;
  });
  let inverse=relocated;
  for(const edit of [...relocations].reverse()){
   assert.equal(inverse.split(edit.after).length,2);inverse=inverse.replace(edit.after,()=>edit.before);
  }
  assert.equal(inverse,source);
  const path=join(directory,label+'.mjs');writeFileSync(path,relocated,{flag:'wx'});
  return {api:await import(pathToFileURL(path)),relocations};
 };
 const old=await load(before,'before'),candidate=await load(after,'candidate');
 const dependencies=loadDeriveDependencyProof({manifest:readFileSync('rust/Cargo.toml','utf8'),lock:readFileSync('Cargo.lock','utf8')});
 const source=Array.from({length:12},(_,index)=>'#[derive(Clone,Copy,Debug,PartialEq,Eq)] pub struct Item'+index+' { value:u8 }').join('\n');
 const modules=[{file:'src/lib.rs',path:[],source}],selection={modules,dependencies,compilationProfile:PRODUCTION_PROFILE};
 const expected=old.api.createDeriveFootprintContext(selection),actual=candidate.api.createDeriveFootprintContext(selection);
 assert.deepEqual(actual,expected);
 const runs=[],results=[];
 for(const label of ['before','candidate','candidate','before']){
  const api=label==='before'?old.api:candidate.api,started=performance.now();
  const result=api.createDeriveFootprintContext(selection);
  runs.push({label,milliseconds:performance.now()-started});assert.deepEqual(result,expected);results.push(result);
 }
 const report={before,after,relocations:{before:old.relocations,after:candidate.relocations},modules,
  expected,actual,runs,results,engine:process.version,productionChanged:false,fullCiDeadlineQualified:false};
 const output=writeCompleteEvidenceJson('ci-logs/issue-784-restart-2/current-derive-context-freezing-comparison.json',Buffer.from(JSON.stringify(report)));
 console.log(JSON.stringify({runs,certificates:actual.certificates.length,output}));
}finally{rmSync(directory,{recursive:true,force:true});}
