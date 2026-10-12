import test from 'node:test';
import assert from 'node:assert/strict';
import {HostRustParser,HostChecker} from '../extensions/host-contracts.mjs';
import {primitiveFromPinnedSource} from '../extensions/primitive-from-source.mjs';
import {inspectPrimitiveIdentityFromSource,pinnedPrimitiveIdentityFrom,parsePrimitiveIdentityFromBody,requirePrimitiveIdentityFromBody,requirePrimitiveIdentityFromEvidence} from '../extensions/primitive-identity-from-source.mjs';
import {capturePrimitiveBoolFromScope,requirePrimitiveBoolFromScope} from '../extensions/primitive-bool-from-source.mjs';
import {rustFixedType,fixedBounds} from '../checked-types.mjs';
import {translateProject} from '../project.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';
import {standaloneMatchesMacroContext,configureMatchesMacroParser} from '../matches-macro-context.mjs';
import {tokenizeRust} from '../extensions/lexical.mjs';
const names=['u8','u16','u32','u64','u128','i8','i16','i32','i64','i128'];
const type=name=>name==='bool'?{kind:'bool',rustPrimitiveName:'bool'}:{...rustFixedType(name),rustPrimitiveName:name};
const source=()=>primitiveFromPinnedSource('library/core/src/convert/mod.rs').source;
const project=source=>translateProject({entry:'src/lib.rs',paths:['src/lib.rs'],readSource:()=>source});
const checker=()=>{const value=new HostChecker('rust',[]);value.program({language:'rust',items:[],main:null});return value;};
const refuse=source=>{const result=project(source);assert.equal(result.meta.executable.some(entry=>entry.name==='bad'),false,source);assert.notEqual(result.meta.refused.length,0,source);};
function find(value,predicate){if(!value||typeof value!=='object')return null;if(predicate(value))return value;for(const child of Object.values(value))for(const item of Array.isArray(child)?child:[child]){const result=find(item,predicate);if(result)return result;}return null;}

test('the actual generic impl and member retain original attrs coordinates and unchanged body',()=>{
  const original=inspectPrimitiveIdentityFromSource(source());assert.equal(original.originalSourceSha256,'0b05be0bc9c7d92d788abd6817d648b4479ed6e29ffe24cfd6879e09ee9fbdab');assert.equal(original.implOriginalSource,source().slice(original.implOriginalSpan.start,original.implOriginalSpan.end));assert.equal(original.memberOriginalSource,source().slice(original.memberOriginalSpan.start,original.memberOriginalSpan.end));assert.match(original.implOriginalSource,/#\[stable\(feature = "rust1", since = "1.0.0"\)\]/u);assert.match(original.memberOriginalSource,/#\[inline\(always\)\]/u);assert.equal(original.implicitSized,true);assert.equal(original.sourceAuthority,false);
});
test('all ten fixed and bool bindings specialize the same original member through the normal checker',()=>{
  let member;for(const name of [...names,'bool']){const selection=pinnedPrimitiveIdentityFrom(type(name)),proof=parsePrimitiveIdentityFromBody(HostRustParser,checker(),selection);member??=selection.original.parsedMemberSource;assert.equal(selection.original.parsedMemberSource,member);assert.equal(selection.bindings.T.rustPrimitiveName,name);assert.equal(selection.bindings.Self.rustPrimitiveName,name);assert.equal(proof.operation,'primitive-source-identity');assert.equal(proof.constTraitCall,false);assert.equal(requirePrimitiveIdentityFromBody(proof,type(name)),proof);}
});
test('primitive Sized is an explicit original lang-item assumption without whole marker or trait authority',()=>{
  const selection=pinnedPrimitiveIdentityFrom(type('u128'));assert.equal(selection.sized.sourceSha256,'db5d413946a48f816af89e83f99741693d1aaf088633db60c8d372a555ff8809');assert.match(selection.sized.originalDeclaration,/rustc_deny_explicit_impl/u);assert.equal(selection.sized.langItem,'sized');assert.equal(selection.sized.compilerProvidedPrimitiveSizedAssumed,true);assert.equal(selection.sized.sizedTraitImplementationTranslated,false);assert.equal(selection.wholeTraitAuthority,false);assert.equal(selection.runtimeParity,false);
});
test('all genuine fixed identities preserve boundaries and reject wrong integer ABI in JS and strict TS',{timeout:90_000},async()=>{
  const result=project(names.map(name=>`pub fn identity_${name}(value:${name})->${name}{${name}::from(value)}`).join(' '));assert.deepEqual(result.meta.refused,[]);await verifyTypedTargets(result,api=>{for(const name of names){const bounds=fixedBounds(type(name));for(const value of new Set([bounds.min,bounds.min+1n,0n,1n,bounds.max-1n,bounds.max]))assert.equal(api['identity_'+name](value),value);for(const value of [bounds.min-1n,bounds.max+1n,0,1,'1',true,{},null])assert.throws(()=>api['identity_'+name](value));}},{childTimeoutMs:30_000});
});
test('bool identity independently proves its original bool namespace and exact boolean ABI in both targets',{timeout:90_000},async()=>{
  const result=project('pub fn identity(value:bool)->bool{bool::from(value)}');assert.deepEqual(result.meta.refused,[]);await verifyTypedTargets(result,api=>{assert.equal(api.identity(false),false);assert.equal(api.identity(true),true);for(const value of [0n,1n,0,1,'true',{},new Boolean(true),null])assert.throws(()=>api.identity(value));},{childTimeoutMs:30_000});const node=find(result.meta.checkedSemanticProgram,n=>n.k==='routerPrimitiveIdentityFrom');assert.equal(node.sourceCallerTraitScope.target.rustPrimitiveName,'bool');assert.deepEqual(node.sourceCallerTraitScope.trait,['core','convert','From']);
});
test('identity source calls remain nonconst independently of the unchanged value body',()=>{
  for(const name of [...names,'bool']){refuse(`pub const fn bad(value:${name})->${name}{${name}::from(value)}`);refuse(`pub const bad:${name}=${name}::from(${name==='bool'?'true':'1'+name});`);}
});
test('architecture dependent pointer and float instances cannot receive generic primitive source witnesses',()=>{
  for(const name of ['usize','isize'])assert.throws(()=>pinnedPrimitiveIdentityFrom(type(name)),/actual by-value/);for(const value of [{kind:'float',rustPrimitiveName:'f64'},{kind:'float',rustPrimitiveName:'f32'},{kind:'string'},{kind:'data',name:'T'}])assert.throws(()=>pinnedPrimitiveIdentityFrom(value),/actual by-value/);
});
test('borrowed owned unresolved and fabricated source identities cannot bind original T',()=>{
  for(const value of [{...type('u8'),bits:16},{...type('u8'),signed:true},{...type('u8'),rustPrimitiveName:undefined},{...type('u8'),rustReference:{kind:'shared'}},{...type('u8'),rustOwnership:{kind:'owned'}},{...type('bool'),rustReference:{kind:'shared'}},{...type('bool'),rustPrimitiveName:'Fake'},{...type('u8'),rustGenericIdentityUnresolved:true}])assert.throws(()=>pinnedPrimitiveIdentityFrom(value),/actual by-value/);refuse('pub fn bad(value:&u8)->u8{u8::from(value)}');refuse('pub fn bad(value:&bool)->bool{bool::from(value)}');refuse('pub fn bad<T>(value:T)->u64{u64::from(value)}');
});
test('source mutations to actual impl binder attributes conditions and member refuse structural proof',()=>{
  const original=source();for(const [before,after]of [['#![stable(feature = "rust1", since = "1.0.0")]','#![cfg(any())]\n#![stable(feature = "rust1", since = "1.0.0")]'],['impl<T> From<T> for T {','impl<T: Copy> From<T> for T {'],['impl<T> From<T> for T {','impl<T> From<T> for u64 {'],['impl<T> From<T> for T {','#[cfg(any())] impl<T> From<T> for T {'],['#[inline(always)]\n    fn from(t: T) -> T {','#[inline(never)]\n    fn from(t: T) -> T {'],['fn from(t: T) -> T {\n        t','const fn from(t: T) -> T {\n        t'],['fn from(t: T) -> T {\n        t','fn from(t: T) -> T {\n        unknown(t)']]){assert.equal(original.includes(before),true);assert.throws(()=>inspectPrimitiveIdentityFromSource(original.replace(before,after)),/Identity From/);}
});
test('inspection metadata and cloned false selections cannot authorize a private body',()=>{
  const selection=pinnedPrimitiveIdentityFrom(type('i128'));for(const fake of [structuredClone(selection),inspectPrimitiveIdentityFromSource(source()),{...selection,bindings:{T:type('u8'),Self:type('u8')}}])assert.throws(()=>parsePrimitiveIdentityFromBody(HostRustParser,checker(),fake),/private original/);assert.throws(()=>{selection.bindings.T=type('u8');},TypeError);
});
test('false parser or checker bodies and callback proxies cannot issue checked identity evidence',()=>{
  const selection=pinnedPrimitiveIdentityFrom(type('u8'));class FakeParser{fn(){return {};}}assert.throws(()=>parsePrimitiveIdentityFromBody(FakeParser,checker(),selection),/private original/);assert.throws(()=>parsePrimitiveIdentityFromBody(HostRustParser,{expr:()=>({k:'var',name:'t',type:type('u8')})},selection),/actual checker/);let calls=0;const fake=new Proxy(checker(),{get(){calls++;throw Error('get');},getPrototypeOf(){calls++;throw Error('prototype');}});assert.throws(()=>parsePrimitiveIdentityFromBody(HostRustParser,fake,selection),/actual checker/);assert.equal(calls,0);
});
test('private body witness clones mutations and other input identities refuse while genuine meta replay stays exact',()=>{
  const proof=parsePrimitiveIdentityFromBody(HostRustParser,checker(),pinnedPrimitiveIdentityFrom(type('u32')));assert.throws(()=>requirePrimitiveIdentityFromBody(structuredClone(proof),type('u32')),/private unmodified/);assert.throws(()=>requirePrimitiveIdentityFromBody(proof,type('i32')),/private unmodified/);assert.equal(requirePrimitiveIdentityFromEvidence(structuredClone(proof),type('u32')),proof);for(const replacement of [{...proof,operation:'cast'},{...proof,selection:{...proof.selection,type:type('u64')}},{...proof,digest:'0'.repeat(64)}])assert.throws(()=>requirePrimitiveIdentityFromEvidence(replacement,type('u32')),/common source evidence/);
});
test('local alternative From aliases imported traits and primitive shadows stay refused for identities',()=>{
  for(const source of ['trait From<T>{fn from(value:T)->Self;}pub fn bad(v:bool)->bool{bool::from(v)}','trait Other{fn from(value:bool)->Self;}pub fn bad(v:bool)->bool{bool::from(v)}','use missing::From as Alias;pub fn bad(v:u64)->u64{u64::from(v)}','type bool=u8;pub fn bad(v:bool)->bool{bool::from(v)}','type u64=u8;pub fn bad(v:u64)->u64{u64::from(v)}','#![no_implicit_prelude]pub fn bad(v:bool)->bool{bool::from(v)}'])refuse(source);
});
test('actual caller CFG and local false binding cannot borrow another source frame authority',()=>{
  const inactive=project('#[cfg(any())]pub fn bad(v:u64)->u64{u64::from(v)}');assert.equal(inactive.meta.executable.some(entry=>entry.name==='bad'),false);refuse('pub fn bad(v:bool)->bool{trait Other{fn from(v:bool)->Self;}bool::from(v)}');
});
test('private caller proof remains bound to bool rather than integer widths or exposed tokens',()=>{
  const input='pub fn identity(v:bool)->bool{bool::from(v)}',parser=new HostRustParser(tokenizeRust(input));configureMatchesMacroParser(parser,standaloneMatchesMacroContext(input),{file:'src/module.rs'});const proof=capturePrimitiveBoolFromScope(parser,type('bool'),input.indexOf('bool::from'));assert.equal(requirePrimitiveBoolFromScope(proof,type('bool')),proof);assert.throws(()=>requirePrimitiveBoolFromScope(proof,type('u8')),/issued original/);const copied=new HostRustParser(structuredClone(tokenizeRust(input)));assert.throws(()=>configureMatchesMacroParser(copied,standaloneMatchesMacroContext(input),{file:'src/module.rs'}),/tokenizer source/);
});
test('legacy pointer identity behavior stays executable without new generic source authority',{timeout:90_000},async()=>{
  const result=project('pub fn unsigned(v:usize)->usize{usize::from(v)}pub fn signed(v:isize)->isize{isize::from(v)}');assert.deepEqual(result.meta.refused,[]);assert.equal(find(result.meta.checkedSemanticProgram,n=>n.k==='routerPrimitiveIdentityFrom'),null);await verifyTypedTargets(result,api=>{assert.equal(api.unsigned(9n),9n);assert.equal(api.signed(-9n),-9n);},{childTimeoutMs:30_000});
});
