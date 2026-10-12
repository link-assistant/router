import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {translateProject} from '../project.mjs';
import {translateSource} from '../translate.mjs';
import {parseRust,checkProgram} from '../extensions/host-contracts.mjs';
import {roundTripProgram,parseProgram} from '../semantic-meta.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';

const project=source=>translateProject({entry:'src/lib.rs',paths:['src/lib.rs'],readSource:()=>source});
function find(node,predicate){
  if(!node||typeof node!=='object')return null;
  if(predicate(node))return node;
  for(const [key,value] of Object.entries(node))if(!['type','span'].includes(key)){
    for(const child of Array.isArray(value)?value:[value]){const result=find(child,predicate);if(result)return result;}
  }
  return null;
}

test('written shared-reference for patterns bind actual copied primitive items in JS and strict TS',async()=>{
  const source='pub fn total(values:&[u8])->u8{let mut total:u8=0;for &n in values.iter(){total+=n;}total} pub fn flags(values:&[bool])->u8{let mut total:u8=0;for &flag in values{if flag{total+=1;}}total}';
  const result=project(source);assert.deepEqual(result.meta.refused,[]);
  const checked=parseProgram(JSON.stringify(result.meta.checkedSemanticProgram));
  const loop=find(checked.declarations.get('total').body,node=>node.k==='routerFor');
  assert.equal(loop.sourceIterationPattern.reference,true);
  assert.deepEqual(loop.sourceIterationPattern.tokens.map(token=>token.value),['&','n']);
  const proof=loop.loopBody.value.sourceReferencePattern;
  assert.equal(proof.kind,'checked-shared-reference-pattern-copy');
  assert.equal(proof.itemType.rustReference.kind,'shared');
  assert.equal(proof.itemType.rustReference.pointee.rustPrimitiveName,'u8');
  assert.equal(proof.bindingType.rustPrimitiveName,'u8');assert.equal(proof.bindingType.rustReference,undefined);
  await verifyTypedTargets(result,api=>{
    assert.equal(api.total(Object.freeze([2n,3n,4n])),9n);assert.equal(api.total(Object.freeze([])),0n);
    assert.equal(api.flags(Object.freeze([true,false,true])),2n);
    assert.throws(()=>api.total(Object.freeze([255n,1n])),/overflow/);
  });
});

test('for tuple and wildcard bindings reuse checked irrefutable layouts without rewriting callback bodies',async()=>{
  const source=`pub fn sum()->u8{let mut total:u8=0;for (left,right) in (0u8..3u8).map(|n|(n,n+1u8)){total+=left+right;}total}
pub fn nested()->u8{let mut total:u8=0;for (left,(right,flag)) in (0u8..3u8).map(|n|(n,(n+1u8,true))){if flag{total+=left+right;}}total}
pub fn wild()->u8{let mut count:u8=0;for _ in 0u8..4u8{count+=1;}count}`;
  const result=project(source);assert.deepEqual(result.meta.refused,[]);
  const checked=parseProgram(JSON.stringify(result.meta.checkedSemanticProgram));
  const loop=find(checked.declarations.get('sum').body,node=>node.k==='routerFor');
  assert.equal(loop.sourceIterationPattern.reference,false);
  assert.deepEqual(loop.sourceIterationPattern.tokens.map(token=>token.value),['(','left',',','right',')']);
  const binding=find(loop.loopBody,node=>node.patternControl?.kind==='tuple-let');
  assert.equal(binding.patternControl.plan.refutable,false);
  assert.deepEqual(binding.patternControl.plan.bindings.map(binding=>binding.name),['left','right']);
  await verifyTypedTargets(result,api=>{assert.equal(api.sum(),9n);assert.equal(api.nested(),9n);assert.equal(api.wild(),4n);});
});

test('constructor loop syntax preserves original tokens while nominal iterator moves remain carried',()=>{
  for(const [source,kind,pattern] of [
    ['struct Wrap(u8);pub fn wrapped()->u8{let mut total:u8=0;for Wrap(n) in (0u8..3u8).map(|n|Wrap(n)){total+=n;}total}','ctor','Wrap(n)'],
    ['struct Pair{left:u8,right:u8}pub fn record()->u8{let mut total:u8=0;for Pair{left,right} in (0u8..3u8).map(|n|Pair{left:n,right:n+1u8}){total+=left+right;}total}','routerRecordPattern','Pair{left,right}'],
  ]){
    const loop=find(parseRust(source+' fn main(){}'),node=>node.k==='routerFor');
    assert.equal(loop.pattern.k,kind);
    assert.equal(source.slice(loop.sourceIterationPattern.span.start,loop.sourceIterationPattern.span.end),pattern);
    for(const token of loop.sourceIterationPattern.tokens)assert.equal(source.slice(token.span.start,token.span.end),token.value);
    const result=translateSource(source),item=result.ir.items.find(item=>['wrapped','record'].includes(item.name));
    assert.equal(item.status,'carried');assert.equal(result.ir.items.map(item=>item.source).join(''),source);
  }
});

test('destructured iterator bodies retain lazy overflow timing, loop control and lexical shadowing',async()=>{
  const source='pub fn early()->u8{let mut total:u8=0;for (left,right) in (0u8..=255u8).map(|n|(n,n+1u8)){if left==2u8{break;}if left==0u8{continue;}total+=right;}total} pub fn shadow()->u8{let left:u8=10;let router_for_item_0:u8=3;let mut total:u8=0;for (left,_) in (0u8..3u8).map(|n|(n,true)){total+=left;}left+router_for_item_0+total}';
  const result=project(source);assert.deepEqual(result.meta.refused,[]);
  const checked=parseProgram(JSON.stringify(result.meta.checkedSemanticProgram));
  const loop=find(checked.declarations.get('shadow').body,node=>node.k==='routerFor');
  assert.notEqual(loop.loopBody.name,'router_for_item_0');
  await verifyTypedTargets(result,api=>{assert.equal(api.early(),2n);assert.equal(api.shadow(),16n);});
});

test('reference-pattern syntax cannot manufacture a shared Item from an owned iterator',()=>{
  for(const source of [
    'pub fn bad(values:Vec<u8>)->u8{let mut total:u8=0;for &n in values{total+=n;}total}',
    'pub fn bad()->u8{let mut total:u8=0;for &n in 0u8..3u8{total+=n;}total}',
    'pub fn bad(values:&[u8])->u8{let mut total:u8=0;for &mut n in values{total+=n;}total}',
    'pub fn bad(values:&[(u8,u8)])->u8{let mut total:u8=0;for &(left,right) in values{total+=left+right;}total}',
    'pub fn bad(values:&[(u8,u8)])->u8{let mut total:u8=0;for (left,right) in values{total+=left+right;}total}',
  ]){
    const result=translateSource(source),item=result.ir.items.find(item=>item.name==='bad');
    assert.equal(item.status,'carried',source);assert.equal(result.ir.items.map(item=>item.source).join(''),source);
  }
});

test('refutable, repeated, mutable and ownership-bearing pattern bindings retain refusals',()=>{
  for(const source of [
    'pub fn bad()->u8{for (n,n) in (0u8..2u8).map(|n|(n,n)){}0}',
    'pub fn bad()->u8{for (n,true) in (0u8..2u8).map(|n|(n,true)){}0}',
    'pub fn bad()->u8{for (mut n,_) in (0u8..2u8).map(|n|(n,true)){n+=1;}0}',
    'pub fn bad()->u8{for (ref n,_) in (0u8..2u8).map(|n|(n,true)){}0}',
    'pub fn bad(values:&[String])->u8{for &text in values{}0}',
    'pub fn bad()->u8{for true in (0u8..2u8).map(|n|n==0u8){}0}',
  ]){
    const result=translateSource(source),item=result.ir.items.find(item=>item.name==='bad');
    assert.equal(item.status,'carried',source);assert.equal(result.ir.items.map(item=>item.source).join(''),source);
  }
});

test('actual constant and unit-constructor names cannot become fresh scalar iteration binders',()=>{
  for(const source of [
    'const LIMIT:u8=1;pub fn bad()->u8{for LIMIT in 0u8..3u8{}0}',
    'const LIMIT:u8=1;pub fn bad()->u8{for (LIMIT,_) in (0u8..3u8).map(|n|(n,true)){}0}',
    'const LIMIT:u8=1;pub fn bad(values:&[u8])->u8{for &LIMIT in values{}0}',
    'enum Choice{End,More}pub fn bad()->u8{for Choice::End in 0u8..3u8{}0}',
  ]){
    const result=project(source);
    assert.ok(result.meta.refused.some(item=>item.name==='bad'),source);
    assert.ok(!result.executableDeclarations.some(item=>item.name==='bad'),source);
  }
});

test('source pattern tokens survive checked semantic meta round trips and per-file bulk selection',async()=>{
  const source='pub fn sum()->u8{let mut total:u8=0;for (left, _) in (0u8..3u8).map(|n|(n,true)){total+=left;}total}';
  const checked=roundTripProgram(checkProgram(parseRust(source+' fn main(){}')));
  const loop=find(checked.declarations.get('sum').body,node=>node.k==='routerFor');
  assert.equal(source.slice(loop.sourceIterationPattern.span.start,loop.sourceIterationPattern.span.end),'(left, _)');
  for(const token of loop.sourceIterationPattern.tokens)assert.equal(source.slice(token.span.start,token.span.end),token.value);
  const result=project(source);assert.deepEqual(result.meta.refused,[]);
  const perSource=translateSource(source,'src/lib.rs',{projectDeclarations:result.executableDeclarations,projectSourceScopes:result.sourceScopes});
  assert.equal(perSource.ir.counts.executableFunctions,1);
  await verifyTypedTargets(perSource,api=>assert.equal(api.sum(),3n));
});

test('unchanged complete Router declarations remain carried with their unresolved provider and formatting dependencies',()=>{
  const source=readFileSync(new URL('../../../src/bridge_controls.rs',import.meta.url),'utf8');
  const result=translateSource(source,'src/bridge_controls.rs');
  for(const name of ['untranslatable_chat_participant_name','codex_instruction_cache_breakpoint']){
    const item=result.ir.items.find(item=>item.name===name);
    assert.equal(item.status,'carried');assert.match(item.source,/for \(index, message\)/u);
    assert.ok(item.diagnostic?.message);assert.doesNotMatch(item.diagnostic.message,/iteration binding/u);
  }
  assert.equal(result.ir.items.map(item=>item.source).join(''),source);
});
