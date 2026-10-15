import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {translateProject,originalProjectMethodFieldEvidence} from '../project.mjs';
import {serializeProgram} from '../semantic-meta.mjs';
import {PRODUCTION_PROFILE} from '../cfg-profile.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';
const hash=value=>createHash('sha256').update(value).digest('hex');
const original=readFileSync(new URL('../fixtures/project-before-rule-pipeline-000151.mjs.txt',import.meta.url),'utf8');
assert.equal(hash(original),'f9ea0ff4818f913f3384a7053c0eda24149420aedab6711f0dd08ca8f69561e0');
// Only static dependency specifiers change. The complete original function and
// its private issuer Maps remain owned by this independently loaded module.
const resolvedOriginal=original.replace(/(\bfrom\s*['"])(\.[^'"]+)(['"])/gu,(_,prefix,path,suffix)=>prefix+new URL(path,new URL('../project.mjs',import.meta.url)).href+suffix);
const prior=await import('data:text/javascript;base64,'+Buffer.from(resolvedOriginal).toString('base64'));
const retain=(name,value)=>{
  const directory=process.env.ROUTER_PROJECT_RULE_VECTOR_DIR;if(!directory)return;
  mkdirSync(directory,{recursive:true});writeFileSync(directory+'/'+name+'.json',JSON.stringify(value,(_,item)=>typeof item==='bigint'?{$bigint:String(item)}:item)+'\n');
};
const options=(files,events=[])=>({entry:'src/lib.rs',paths:Object.keys(files),readSource:path=>{events.push({read:path});assert.ok(Object.hasOwn(files,path));return files[path];},progress:record=>events.push({progress:record})});
function snapshot(result){return {meta:result.meta,javascript:result.javascript,typescript:result.typescript,sourceScopes:result.sourceScopes,executableDeclarations:result.executableDeclarations.map(({lower,...fields})=>fields),checkedMethodDeclarations:result.checkedMethodDeclarations.map(({lower,...fields})=>fields),checkedGeneratedMethodDeclarations:result.checkedGeneratedMethodDeclarations.map(({lower,...fields})=>fields)};}
function compare(files,name,extra={}){
  const beforeEvents=[],afterEvents=[],before=prior.translateProject({...options(files,beforeEvents),...extra}),after=translateProject({...options(files,afterEvents),...extra});
  assert.deepEqual(snapshot(after),snapshot(before));assert.deepEqual(afterEvents,beforeEvents);
  retain(name,{files,extra,original,resolvedOriginal,before:snapshot(before),after:snapshot(after),beforeEvents,afterEvents});return {before,after};
}
const siblings={
  'src/lib.rs':'pub mod math; pub mod nested; pub fn root(value:u8)->u8{math::increment(value)}',
  'src/math.rs':'pub const OFFSET:u8=2; pub fn increment(value:u8)->u8{value+OFFSET}',
  'src/nested/mod.rs':'pub mod child; use crate::math::increment as plus; pub fn parent(value:u8)->u8{plus(value)}',
  'src/nested/child.rs':'use super::parent; pub fn run(value:u8)->u8{parent(value)+crate::math::OFFSET}',
};
test('full sibling project retains every meta JS TS source scope and callback byte',{timeout:30000},async()=>{
  const {after}=compare(siblings,'complete-siblings');
  await verifyTypedTargets(after,api=>{assert.equal(api.root(3n),5n);assert.equal(api['nested.child.run'](3n),7n);assert.throws(()=>api.root(255n),RangeError);});
});
test('generic layouts and nominal fields retain their complete checked and target programs',()=>{
  const files={'src/lib.rs':'pub mod model; use crate::model::Record; pub fn make(value:u8)->Option<Record>{Some(Record{value})} pub fn amount(value:Record)->u8{value.value}', 'src/model.rs':'pub struct Record{pub value:u8}'};
  const {after}=compare(files,'complete-generic-layouts');assert.equal(after.meta.refused.length,0);
});
test('all fixed point refusal batches and transitive callers keep the original ordering',()=>{
  const files={'src/lib.rs':'pub mod remote; pub fn good(value:u64)->u64{value+1} pub fn caller()->String{remote::fetch()}', 'src/remote.rs':'pub fn fetch()->String{std::fs::read_to_string("secret").unwrap()} pub fn middle()->String{fetch()}'};
  const {after}=compare(files,'complete-refusal-batches');assert.ok(after.meta.refused.length);assert.deepEqual(after.meta.executable.map(row=>row.name),['good']);
  compare({'src/lib.rs':'pub mod child; pub fn caller()->u64{child::same()}','src/child.rs':'pub fn same()->u64{1} pub fn same()->u64{2}'},'complete-duplicate-refusals');
});
test('conditional and inline original views retain the exact configured source scope census',()=>{
  const files={'src/lib.rs':'#[cfg(test)]mod tests;mod inline{pub fn add(value:u8)->u8{value+1}}pub fn run(value:u8)->u8{inline::add(value)}','src/tests.rs':'panic!("unparsed inactive module");'};
  const {after}=compare(files,'complete-conditional-views',{compilationProfile:PRODUCTION_PROFILE});assert.equal(after.meta.runtimeParity,false);assert.ok(after.sourceScopes.some(row=>row.module.includes('inline')));
});
test('lazy declaration closures keep their full programs emitters and signatures',()=>{
  const {before,after}=compare(siblings,'lazy-project');const observations=[];
  for(let index=0;index<before.executableDeclarations.length;index++){
    const left=before.executableDeclarations[index].lower(),right=after.executableDeclarations[index].lower();
    const actual={own:right.own,program:serializeProgram(right.program),emitted:right.emitted},expected={own:left.own,program:serializeProgram(left.program),emitted:left.emitted};
    assert.deepEqual(actual,expected);observations.push({actual,expected});
  }
  retain('complete-lazy-facades',{observations});
});
test('genuine method facades use their own issuer and copied or cross-analysis evidence still refuses',{timeout:30000},async()=>{
  const source='pub struct Counter{value:u8}impl Counter{pub fn make(value:u8)->Self{Self{value}}pub fn small(&self)->bool{matches!(self.value,1 | 2)}}pub fn run(value:u8)->bool{Counter::make(value).small()}';
  const files={'src/lib.rs':source},result=translateProject(options(files)),second=translateProject(options(files));
  const facade=result.checkedMethodDeclarations.find(row=>row.name==='small'),foreign=second.checkedMethodDeclarations.find(row=>row.name==='small');assert.ok(facade);assert.ok(foreign);
  const own=originalProjectMethodFieldEvidence(facade),other=originalProjectMethodFieldEvidence(foreign);
  assert.throws(()=>originalProjectMethodFieldEvidence({...facade}),/copied, unissued|caller fabricated/);
  assert.throws(()=>originalProjectMethodFieldEvidence({...own.token},own.transform),/copied, unissued|caller fabricated/);
  assert.throws(()=>originalProjectMethodFieldEvidence(own.token,other.transform),/another genuine transform/);
  assert.equal(originalProjectMethodFieldEvidence(own.token,own.transform),own);
  const lowered=facade.lower();assert.ok(lowered.own);assert.ok(lowered.emitted.text.length);
  retain('genuine-private-method-facades',{source,result:snapshot(result),second:snapshot(second),fields:own.fields,otherFields:other.fields,lowered:{own:lowered.own,program:serializeProgram(lowered.program),emitted:lowered.emitted},copiedRefused:true,crossAnalysisRefused:true,baselineMethodScope:'No baseline facade is passed through the independently issued current module.'});
  await verifyTypedTargets(result,api=>{for(const [value,expected]of [[0n,false],[1n,true],[2n,true],[3n,false],[255n,false]])assert.equal(api.run(value),expected);});
});
test('original callback errors propagate at the same stage before later work',()=>{
  const observations=[];
  for(const stage of ['project-graph','target-emit','project-serialize'])for(const state of ['start','end']){
    const expected=new Error(stage+':'+state),traces=[];
    for(const implementation of [prior.translateProject,translateProject]){
      const events=[],input=options({'src/lib.rs':'pub fn run(value:u8)->u8{value+1}'},events);
      input.progress=record=>{events.push({progress:record});if(record.stage===stage&&record.state===state)throw expected;};
      assert.throws(()=>implementation(input),error=>error===expected);traces.push(events);
    }
    assert.deepEqual(traces[0],traces[1]);observations.push({stage,state,traces});
  }
  retain('callback-error-order',observations);
});
test('nested project calls remain independent without replacing the outer private program',()=>{
  const files={'src/lib.rs':'pub fn run(value:u8)->u8{value+1}'},observations=[];
  for(const implementation of [prior.translateProject,translateProject]){
    const events=[],input=options(files,events);let nested=null;
    input.progress=record=>{events.push({progress:record});if(record.stage==='namespace'&&record.state==='end'&&!nested)nested=implementation(options({'src/lib.rs':'pub const INNER:u8=9;'}));};
    const result=implementation(input);assert.ok(nested);assert.equal(result.meta.executable.length,1);assert.equal(nested.meta.executable.length,1);observations.push({result:snapshot(result),nested:snapshot(nested),events});
  }
  assert.deepEqual(observations[0],observations[1]);retain('reentrant-projects',observations);
});
