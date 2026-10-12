import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {translateProject} from '../project.mjs';
import {translateSource} from '../translate.mjs';
import {parseProgram} from '../semantic-meta.mjs';
import {withPatternControlChecker} from '../extensions/pattern-control.mjs';
import {WHILE_LET_PROFILE,requireSourceWhileLet} from '../extensions/while-let-source.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';
const project=source=>translateProject({entry:'src/lib.rs',paths:['src/lib.rs'],readSource:()=>source});
function find(node,predicate) {
  if(!node||typeof node!=='object')return null;
  if(predicate(node))return node;
  for(const [key,value]of Object.entries(node))if(!['type','span','patternControl'].includes(key))for(const child of Array.isArray(value)?value:[value]){const result=find(child,predicate);if(result)return result;}
  return null;
}

test('original while-let subjects re-evaluate with scalar loop state until constructor failure',async()=>{
  const source='fn at(index:u8,limit:u8)->Option<u8>{if index<limit{Some(index)}else{None}} pub fn total(limit:u8)->u8{let mut index:u8=0;let mut total:u8=0;while let Some(value)=at(index,limit){total+=value;index+=1u8;}total}';
  const result=project(source);assert.deepEqual(result.meta.refused,[]);
  const checked=parseProgram(JSON.stringify(result.meta.checkedSemanticProgram));
  const node=find(checked.declarations.get('total').body,node=>node.patternControl?.kind==='while-let');
  requireSourceWhileLet(node);assert.equal(node.value.k,'call');assert.equal(node.patternControl.plan.refutable,true);
  assert.equal(node.patternControl.sourceCondition.profile,WHILE_LET_PROFILE.id);
  await verifyTypedTargets(result,api=>{assert.equal(api.total(0n),0n);assert.equal(api.total(1n),0n);assert.equal(api.total(4n),6n);assert.throws(()=>api.total(24n),/overflow/);});
});

test('literal and irrefutable while patterns keep original success and zero-iteration behavior',async()=>{
  const source='fn at(index:u8)->Option<u8>{if index<4u8{Some(index)}else{None}} pub fn literal()->u8{let mut index:u8=2;let mut count:u8=0;while let Some(2u8)=at(index){count+=1u8;index+=1u8;}count} pub fn never()->u8{let mut count:u8=0;while let None=at(0u8){count+=10u8/0u8;}count} pub fn scalar(value:u8)->u8{while let chosen=value{return chosen;}0}';
  const result=project(source);assert.deepEqual(result.meta.refused,[]);
  await verifyTypedTargets(result,api=>{assert.equal(api.literal(),1n);assert.equal(api.never(),0n);assert.equal(api.scalar(9n),9n);});
});

test('nested actual standard Result Option and tuple patterns bind each successful body scope',async()=>{
  const source='fn at(index:u8)->Result<Option<(u8,bool)>,u8>{if index<3u8{Ok(Some((index,true)))}else{Err(0u8)}} pub fn total()->u8{let mut index:u8=0;let mut total:u8=0;while let Ok(Some((value,true)))=at(index){total+=value;index+=1u8;}total}';
  const result=project(source);assert.deepEqual(result.meta.refused,[]);
  const checked=parseProgram(JSON.stringify(result.meta.checkedSemanticProgram)),node=find(checked.declarations.get('total').body,node=>node.patternControl?.kind==='while-let');
  const {plan,subjectType}=node.patternControl,binding=plan.bindings[0],Checker=withPatternControlChecker(class{}),checker=new Checker();checker.items=checked.declarations;
  const subject={k:'var',name:'actual_subject',type:subjectType,span:node.span};
  assert.equal(checker.patternProjection(subject,binding.projection,binding.type,plan.projectionPaths).type.kind,'fixed');
  assert.deepEqual(plan.projectionPaths.map(path=>path.projection),[[],['field0'],['field0','field0'],['field0','field0']]);
  for(const mutate of [paths=>{paths[0].ctor='Err';},paths=>{paths[0].data='fake.Result';},paths=>{paths[0].type={kind:'fixed',bits:8,signed:false};},paths=>{paths.length=0;}]) {
    const paths=structuredClone(plan.projectionPaths);mutate(paths);assert.throws(()=>checker.patternProjection(subject,binding.projection,binding.type,paths),error=>['type','unsupported'].includes(error.kind));
  }
  await verifyTypedTargets(result,api=>assert.equal(api.total(),3n));
});

test('while-let continue break return and nested ordinary loops retain original targets',async()=>{
  const source='fn at(index:u8)->Option<u8>{if index<4u8{Some(index)}else{None}} pub fn controls()->u8{let mut index:u8=0;let mut total:u8=0;while let Some(value)=at(index){index+=1u8;if value==0u8{continue;}let mut inner:u8=0;while inner<4u8{inner+=1u8;break;}if value==2u8{break;}total+=value+inner;}index+total} pub fn early()->u8{let mut index:u8=0;while let Some(value)=at(index){if value==2u8{return value;}index+=1u8;}9}';
  const result=project(source);assert.deepEqual(result.meta.refused,[]);
  await verifyTypedTargets(result,api=>{assert.equal(api.controls(),5n);assert.equal(api.early(),2n);});
});

test('each original condition effect occurs once including failure and stops at source break',async()=>{
  const source='fn mark()->bool{std::fs::read_to_string("condition").is_ok()} fn at(index:u8)->Option<u8>{let ignored=mark();if index<2u8{Some(index)}else{None}} pub fn exhausted()->u8{let mut index:u8=0;while let Some(_)=at(index){index+=1u8;}index} pub fn early()->u8{let mut index:u8=0;while let Some(value)=at(index){if value==0u8{break;}index+=1u8;}index}';
  const result=project(source);assert.deepEqual(result.meta.refused,[]);
  await verifyTypedTargets(result,(api,_result,_module,{effects:{withEffectCapabilities}})=>{
    const calls=[],capability={fs:{sync:{readFileSync(path){calls.push(path);return new Uint8Array();}}}};
    assert.equal(withEffectCapabilities(capability,()=>api.exhausted()),2n);assert.deepEqual(calls,['condition','condition','condition']);
    calls.length=0;assert.equal(withEffectCapabilities(capability,()=>api.early()),0n);assert.deepEqual(calls,['condition']);
  });
});

test('while-let body binders shadow outer names only inside their original project closure',async()=>{
  const source='fn at(index:u8)->Option<u8>{if index<3u8{Some(index)}else{None}} pub fn total()->u8{let value:u8=9;let ml_pattern_0:u8=7;let mut index:u8=0;let mut total:u8=0;while let Some(value)=at(index){total+=value;index+=1u8;}value+ml_pattern_0+total}';
  const result=project(source);assert.deepEqual(result.meta.refused,[]);
  const file=translateSource(source,'src/lib.rs',{projectDeclarations:result.executableDeclarations,projectSourceScopes:result.sourceScopes});
  assert.equal(file.ir.items.map(item=>item.source).join(''),source);assert.equal(file.ir.counts.executableFunctions,2);
  await verifyTypedTargets(file,api=>assert.equal(api.total(),19n));
});

test('while-let preserves unresolved owner borrow mutation chain and escaping binder refusals',()=>{
  for(const source of [
    'pub fn bad(value:Option<u8>)->u8{while let Some(n)=value{break;}n}',
    'pub fn bad(value:Option<u8>)->u8{while let Some(n)=value{n+=1u8;break;}0}',
    'pub fn bad(value:Option<u8>)->u8{while let Some(mut n)=value{n+=1u8;break;}0}',
    'pub fn bad(value:Option<u8>)->u8{while let Some(ref n)=value{break;}0}',
    'pub fn bad(value:Option<&mut u8>)->u8{while let Some(n)=value{break;}0}',
    'pub fn bad(value:Option<Vec<u8>>)->u8{while let Some(n)=value{break;}0}',
    'pub fn bad(value:Option<u8>)->u8{while let Some(n)=value&&n>0u8{break;}0}',
    'pub fn bad(value:Option<u8>)->u8{while let Some(n)=value{break n;}0}',
    'const LIMIT:u8=1;pub fn bad(value:Option<u8>)->u8{while let Some(LIMIT)=value{break;}0}',
    'mod fake{pub enum Option{Some(u8),None}}pub fn bad(value:fake::Option)->u8{while let Some(n)=value{break;}0}',
  ]){const result=translateSource(source),item=result.ir.items.find(item=>item.name==='bad');assert.equal(item.status,'carried',source);assert.equal(result.ir.items.map(item=>item.source).join(''),source);}
});

test('full compiler source and actual condition spans survive meta with exact incomplete proofs',()=>{
  const root=new URL('../source-profiles/while-let/',import.meta.url),manifest=JSON.parse(readFileSync(new URL('manifest.json',root),'utf8'));
  for(const input of manifest.sources){const encoded=readFileSync(new URL(input.file,root)),raw=gunzipSync(encoded);assert.equal(raw.length,input.bytes);assert.equal(createHash('sha256').update(encoded).digest('hex'),input.compressedSha256);assert.equal(createHash('sha256').update(raw).digest('hex'),input.sha256);assert.equal(createHash('sha1').update(Buffer.concat([Buffer.from(`blob ${raw.length}\0`),raw])).digest('hex'),input.gitBlobSha);}
  const source='fn at(index:u8)->Option<u8>{if index<2u8{Some(index)}else{None}}pub fn count()->u8{let mut index:u8=0;while let Some(value)=at(index){index+=1u8;}index}';
  const result=project(source);assert.deepEqual(result.meta.refused,[]);
  const node=find(parseProgram(JSON.stringify(result.meta.checkedSemanticProgram)).declarations.get('count').body,node=>node.patternControl?.kind==='while-let');requireSourceWhileLet(node);
  const proof=node.patternControl.sourceCondition;assert.match(source.slice(proof.condition.span.start,proof.condition.span.end),/^while let Some\(value\)=at\(index\)/u);
  for(const token of proof.tokens)assert.equal(source.slice(token.span.start,token.span.end),token.raw);
  for(const mutate of [
    node=>{node.patternControl.sourceCondition.namespaceComplete=true;},
    node=>{node.patternControl.sourceCondition.dropSemanticsComplete=true;},
    node=>{node.patternControl.sourceCondition.subject.span.start++;},
    node=>{node.patternControl.sourceCondition.sourceInputs[0].sha256='0'.repeat(64);},
    node=>{node.patternControl.sourceCondition.evaluationOrder.reverse();},
    node=>{node.patternControl.sourceCondition.tokens[0].value='if';},
  ]){const altered=structuredClone(node);mutate(altered);assert.throws(()=>requireSourceWhileLet(altered),/missing actual checked/u);}
});
