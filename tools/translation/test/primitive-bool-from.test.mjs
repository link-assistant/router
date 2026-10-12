import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {HostRustParser} from '../extensions/host-contracts.mjs';
import {primitiveBoolFrom} from '../extensions/primitive-bool-from-runtime.mjs';
import {PRIMITIVE_BOOL_FROM_PROFILE,pinnedPrimitiveBoolFrom,parsePrimitiveBoolFromBody,requirePrimitiveBoolFromBody,capturePrimitiveBoolFromScope,requirePrimitiveBoolFromScope} from '../extensions/primitive-bool-from-source.mjs';
import {rustFixedType} from '../checked-types.mjs';
import {translateProject} from '../project.mjs';
import {loadJavaScript} from './artifact-loader.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';
const targets=['u8','u16','u32','u64','u128','usize','i8','i16','i32','i64','i128','isize'],type=name=>({...rustFixedType(name),rustPrimitiveName:name}),hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const project=source=>translateProject({entry:'src/lib.rs',paths:['src/lib.rs'],readSource:()=>source});
function find(node,predicate){if(!node||typeof node!=='object')return null;if(predicate(node))return node;for(const [key,value]of Object.entries(node))if(!['sourcePrimitiveBoolFromBody','sourceBoolFromScope'].includes(key))for(const child of Array.isArray(value)?value:[value]){const result=find(child,predicate);if(result)return result;}return null;}

test('exact original numeric trait prelude reexports and licensed source pins remain byte complete',()=>{
  const root=new URL('../source-profiles/primitive-bool-from/',import.meta.url);
  for(const pin of PRIMITIVE_BOOL_FROM_PROFILE.sources){const encoded=readFileSync(new URL(pin.file,root)),raw=gunzipSync(encoded);assert.equal(encoded.length,pin.compressedBytes);assert.equal(hash(encoded),pin.compressedSha256);assert.equal(raw.length,pin.bytes);assert.equal(hash(raw),pin.sha256);assert.equal(createHash('sha1').update(Buffer.concat([Buffer.from(`blob ${raw.length}\0`),raw])).digest('hex'),pin.gitBlobSha);}
  assert.equal(PRIMITIVE_BOOL_FROM_PROFILE.constTraitCall,false);assert.equal(PRIMITIVE_BOOL_FROM_PROFILE.wholeTraitAuthority,false);assert.equal(PRIMITIVE_BOOL_FROM_PROFILE.runtimeParity,false);
});

test('original macro expansion and parsed bool cast bind each actually declared primitive Self',()=>{
  for(const target of targets){const selection=pinnedPrimitiveBoolFrom(type(target)),proof=parsePrimitiveBoolFromBody(HostRustParser,selection);assert.equal(requirePrimitiveBoolFromBody(proof,type(target)),proof);assert.equal(selection.target.rustPrimitiveName,target);assert.equal(proof.checkedOperation.input,'actual by-value bool');assert.equal(proof.constTraitCall,false);assert.equal(selection.namespace.commonPreludeEditions.length,8);assert.equal(selection.namespace.callerCargoEditionInferred,false);}
  assert.throws(()=>pinnedPrimitiveBoolFrom({...type('u64'),bits:128}),/actual checked primitive/);assert.throws(()=>pinnedPrimitiveBoolFrom({kind:'float',rustPrimitiveName:'f64'}),/actual checked primitive/);
});

test('copied original selections and body witnesses cannot authorize a forged primitive conversion',()=>{
  const selection=pinnedPrimitiveBoolFrom(type('u64')),proof=parsePrimitiveBoolFromBody(HostRustParser,selection);
  assert.throws(()=>parsePrimitiveBoolFromBody(HostRustParser,structuredClone(selection)),/private original/);assert.throws(()=>requirePrimitiveBoolFromBody(structuredClone(proof),type('u64')),/private unmodified/);assert.throws(()=>requirePrimitiveBoolFromBody(proof,type('i64')),/private unmodified/);
});

test('shared boolean ABI returns exact zero or one and rejects every coercion domain',()=>{
  assert.equal(primitiveBoolFrom(false),0n);assert.equal(primitiveBoolFrom(true),1n);
  for(const value of [0,1,0n,1n,'false','true',null,undefined,[],{},Symbol('true')])assert.throws(()=>primitiveBoolFrom(value),TypeError);
  let calls=0;assert.throws(()=>primitiveBoolFrom({valueOf(){calls++;return true}}),TypeError);assert.equal(calls,0);
});

test('ordinary source callers of all genuine integer From<bool> impls execute in JS and strict compiled TS',async()=>{
  const source=targets.map(target=>`pub fn as_${target}(value:bool)->${target}{${target}::from(value)}`).join(''),result=project(source);assert.deepEqual(result.meta.refused,[]);
  await verifyTypedTargets(result,api=>{for(const target of targets){assert.equal(api['as_'+target](false),0n);assert.equal(api['as_'+target](true),1n);assert.throws(()=>api['as_'+target](1n));assert.throws(()=>api['as_'+target]('true'));}},{childTimeoutMs:30000});
});

test('genuine numeric comparisons produce primitive bool even when a source alias hides its type spelling',async()=>{
  const result=project('type bool=u8;pub fn carry(left:u64,right:u64)->u64{u64::from(left<right)}pub fn aliased(value:bool)->u64{u64::from(value<1)}pub fn negated(value:u8)->u64{u64::from(!(value<1))}');assert.deepEqual(result.meta.refused,[]);const api=(await loadJavaScript(result.javascript)).translated;
  assert.equal(api.carry(0n,1n),1n);assert.equal(api.carry(1n,1n),0n);assert.equal(api.aliased(0n),1n);assert.equal(api.aliased(1n),0n);assert.throws(()=>api.aliased(true));assert.equal(api.negated(0n),0n);assert.equal(api.negated(1n),1n);
});

test('From trait calls refuse stable const functions and constant initializers despite a pure cast body',()=>{
  const result=project('pub const fn invalid(value:bool)->u64{u64::from(value)}const INVALID:u8=u8::from(true);pub fn ordinary(value:bool)->u8{u8::from(value)}');
  assert.equal(result.meta.executable.some(entry=>entry.name==='invalid'),false);assert.equal(result.meta.executable.some(entry=>entry.name==='INVALID'),false);assert.equal(result.meta.executable.some(entry=>entry.name==='ordinary'),true);
  assert.equal(result.meta.refused.some(entry=>entry.name==='invalid'&&/const/i.test(entry.message)),true);assert.equal(result.meta.refused.some(entry=>entry.name==='INVALID'),true);
});

test('reference inputs are not erased into From<bool> while explicit primitive reads remain distinct',async()=>{
  const result=project('pub fn invalid(value:&bool)->u64{u64::from(value)}pub fn actual(value:&bool)->u64{u64::from(*value)}');assert.equal(result.meta.executable.some(entry=>entry.name==='invalid'),false);
  const api=(await loadJavaScript(result.javascript)).translated;assert.equal(api.actual(false),0n);assert.equal(api.actual(true),1n);
});

test('local From masks and differently named visible from traits remain actual source refusals',()=>{
  for(const source of ['trait From<T>{fn from(value:T)->Self;}pub fn bad(value:bool)->u64{u64::from(value)}','trait Alternate{fn from(value:bool)->Self;}pub fn bad(value:bool)->u64{u64::from(value)}','mod other{pub trait Alternate{fn from(value:bool)->Self;}}use other::Alternate as Renamed;pub fn bad(value:bool)->u64{u64::from(value)}']){
    const result=project(source);assert.equal(result.meta.executable.some(entry=>entry.name==='bad'),false);assert.notEqual(result.meta.refused.length,0);
  }
});

test('disabled preludes imported ambiguity macro-bearing and inherited trait routes remain fail closed',()=>{
  for(const source of ['#![no_core]pub fn bad(value:bool)->u64{u64::from(value)}','#![no_implicit_prelude]pub fn bad(value:bool)->u64{u64::from(value)}','pub fn bad(value:bool)->u64{trait Local{fn from(value:bool)->Self;}u64::from(value)}','pub fn bad(value:bool)->u64{use missing::Trait;u64::from(value)}','use missing::From as Alias;pub fn bad(value:bool)->u64{u64::from(value)}','trait Marker{unknown!();}pub fn bad(value:bool)->u64{u64::from(value)}','trait Marker:Copy{}pub fn bad(value:bool)->u64{u64::from(value)}']){
    const result=project(source);assert.equal(result.meta.executable.some(entry=>entry.name==='bad'),false);assert.notEqual(result.meta.refused.length,0);
  }
});

test('genuine unrelated trait declarations do not silently close or broaden the original From scope',async()=>{
  const result=project('trait Marker{}pub fn good(value:bool)->u64{u64::from(value)}');const api=(await loadJavaScript(result.javascript)).translated;assert.equal(api.good(true),1n);assert.equal(api.good(false),0n);
  const proof=find(result.meta.checkedSemanticProgram,node=>node.k==='routerPrimitiveBoolFrom').sourceBoolFromScope;assert.equal(proof.visibleOriginalTraits[0].fromMemberAbsent,true);assert.equal(proof.wholeTraitAuthority,false);
});

test('ordinary local identifiers cannot fabricate a no_implicit_prelude attribute',async()=>{
  const result=project('pub fn good(value:bool)->u64{let no_implicit_prelude=value;u64::from(no_implicit_prelude)}');
  const api=(await loadJavaScript(result.javascript)).translated;assert.equal(api.good(false),0n);assert.equal(api.good(true),1n);
});

test('unproved target aliases and float or nominal conversions never inherit integer From<bool> authority',()=>{
  for(const source of ['type u64=u8;pub fn bad(value:bool)->u64{u64::from(value)}','struct Word{value:u64}pub fn bad(value:bool)->Word{Word::from(value)}','pub fn bad(value:bool)->f64{f64::from(value)}','use std::primitive::u64 as Word;pub fn bad(value:bool)->Word{Word::from(value)}']){
    const result=project(source);assert.equal(result.meta.executable.some(entry=>entry.name==='bad'),false);assert.notEqual(result.meta.refused.length,0);
  }
});

test('common conversion meta replays only issued original scopes and cannot use public closed flags',()=>{
  assert.throws(()=>capturePrimitiveBoolFromScope({closed:true,sourceNamespaceClosed:true},type('u64'),0),/private source association/);
  const result=project('pub fn good(value:bool)->u64{u64::from(value)}'),node=find(result.meta.checkedSemanticProgram,item=>item.k==='routerPrimitiveBoolFrom'),proof=node.sourceBoolFromScope;
  assert.equal(requirePrimitiveBoolFromScope(proof,type('u64')).digest,proof.digest);assert.throws(()=>requirePrimitiveBoolFromScope({...proof,sourceSha256:'0'.repeat(64)},type('u64')),/issued original/);assert.throws(()=>requirePrimitiveBoolFromScope({...proof,target:type('i64')},type('i64')),/issued original/);
  let reads=0;const accessor={...proof};Object.defineProperty(accessor,'digest',{enumerable:true,get(){reads++;return proof.digest;}});assert.throws(()=>requirePrimitiveBoolFromScope(accessor,type('u64')),/issued original/);assert.equal(reads,0);assert.throws(()=>requirePrimitiveBoolFromScope(new Proxy(proof,{}),type('u64')),/issued original/);
  assert.equal(node.constEligible,false);assert.equal(node.sourcePrimitiveBoolFromBody.selection.member.constTraitCall,false);
});
