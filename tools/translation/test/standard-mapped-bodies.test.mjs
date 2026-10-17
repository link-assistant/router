import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {translateProject} from '../project.mjs';
import {parseProgram} from '../semantic-meta.mjs';
import {emitJavaScript,HostRustParser} from '../extensions/host-contracts.mjs';
import {pinnedMappedBody,parsePinnedBody,parsedPinnedBodyEvidence} from '../extensions/standard-body-source.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';
const tag=($,fields={})=>Object.freeze({$,...fields}),ok=field0=>tag('Ok',{field0}),err=field0=>tag('Err',{field0}),some=field0=>tag('Some',{field0});
const project=source=>translateProject({entry:'src/lib.rs',paths:['src/lib.rs'],readSource:()=>source});
const find=(node,k)=>node&&typeof node==='object'?(node.k===k?node:Object.values(node).map(value=>find(value,k)).find(Boolean)):null;
const scalar='pub fn widen(value:Result<u8,bool>)->Result<u16,bool>{value.map(|n|n as u16)}';
test('inline FnOnce generic parentheses precede the real original member parameter group',()=>{
 const selected=pinnedMappedBody('Result','map');assert.deepEqual(selected.method.parameters.map(value=>[value.name,value.rustTypeSyntax]),[['self',['Self']],['op',['F']]]);
 assert.match(selected.method.signatureSource,/FnOnce\(T\).*\(self, op: F\)/);
 assert.equal(parsedPinnedBodyEvidence(parsePinnedBody(HostRustParser,selected)).selection,selected);
 assert.throws(()=>parsePinnedBody(HostRustParser,structuredClone(selected)),/privately selected/);
 assert.throws(()=>pinnedMappedBody('Fake','map'),/canonical/);
});
test('parsed Result.map preserves success/error identities and ordinary let/match IR in both targets',{timeout:60000},async()=>{
 const r=project(scalar+'pub fn nested(value:Result<u8,bool>)->Result<Option<u8>,bool>{value.map(Some)}pub fn item(value:Result<u8,bool>)->Result<u16,bool>{value.map(widen_item)}fn widen_item(value:u8)->u16{value as u16}');assert.deepEqual(r.meta.refused,[]);
 const node=find(r.meta.checkedSemanticProgram,'routerOriginalMappedBody');assert.equal(node.pinnedStandardBodyProof.kind,'Result');assert.match(node.pinnedStandardBodyProof.selection.method.bodySource,/Ok\(op\(t\)\)/);assert.ok(find(node.body,'match'));assert.equal(node.constEligible,false);
 await verifyTypedTargets(r,api=>{for(const value of [0n,255n]){assert.deepEqual(api.widen(ok(value)),ok(value));assert.deepEqual(api.nested(ok(value)),ok(some(value)));assert.deepEqual(api.item(ok(value)),ok(value));}for(const value of [true,false]){assert.deepEqual(api.widen(err(value)),err(value));assert.deepEqual(api.nested(err(value)),err(value));}assert.throws(()=>api.widen(ok(256n)),TypeError);assert.throws(()=>api.widen(ok(-1n)),TypeError);assert.throws(()=>api.widen({$: 'Ok',field0:1n}),/immutable/);},{childTimeoutMs:20000});
});
test('Result.map callback runs once for Ok and does not run for Err',{timeout:60000},async()=>{
 const r=project('pub fn overflow(value:Result<u8,bool>)->Result<u8,bool>{value.map(|n|n+1u8)}pub fn failed(value:Result<u8,bool>)->Result<u8,bool>{value.map(|n|panic!("callback"))}fn mark(path:&str)->bool{std::fs::read_to_string(path).is_ok()}fn receiver(flag:bool)->Result<u8,bool>{let seen=mark("receiver");if flag{Ok(7u8)}else{Err(false)}}pub fn ordered(flag:bool)->Result<u8,bool>{receiver(flag).map(|n|{let seen=mark("callback");n})}');assert.deepEqual(r.meta.refused,[]);
 await verifyTypedTargets(r,(api,_r,_m,{effects})=>{assert.deepEqual(api.overflow(ok(254n)),ok(255n));assert.throws(()=>api.overflow(ok(255n)),RangeError);assert.deepEqual(api.overflow(err(false)),err(false));assert.deepEqual(api.failed(err(true)),err(true));assert.throws(()=>api.failed(ok(1n)),/callback/);const seen=[],capability={fs:{sync:{readFileSync(path){seen.push(path);return new Uint8Array();}}}};assert.deepEqual(effects.withEffectCapabilities(capability,()=>api.ordered(true)),ok(7n));assert.deepEqual(seen,['receiver','callback']);seen.length=0;assert.deepEqual(effects.withEffectCapabilities(capability,()=>api.ordered(false)),err(false));assert.deepEqual(seen,['receiver']);},{childTimeoutMs:20000});
});
test('Result.map carries actual shared depth and input lifetime origins without pointee Copy',{timeout:60000},async()=>{
 const r=project("enum Item{Ready,Paused}pub fn borrowed<'a>(value:Result<&'a Item,bool>)->Result<&'a Item,bool>{value.map(|n|n)}pub fn depth<'a>(value:Result<&'a &'a u8,bool>)->Result<&'a &'a u8,bool>{value.map(|n|n)}pub fn text<'a>(value:Result<&'a str,bool>)->Result<&'a str,bool>{value.map(|n|n)}");assert.deepEqual(r.meta.refused,[]);
 await verifyTypedTargets(r,api=>{const item=tag('Ready');assert.equal(api.borrowed(ok(item)).field0,item);assert.deepEqual(api.borrowed(err(false)),err(false));assert.deepEqual(api.depth(ok(255n)),ok(255n));assert.deepEqual(api.text(ok('😀é')),ok('😀é'));assert.throws(()=>api.text(ok('\ud800')),/scalar|Unicode|string/);assert.throws(()=>api.borrowed(ok({$: 'Ready'})),/immutable/);},{childTimeoutMs:20000});
});
test('private original Copy success and error nominal layouts stay exact in Result.map',{timeout:60000},async()=>{
 const r=project('#[derive(Copy,Clone)]pub struct Item{n:u8}#[derive(Copy,Clone)]pub enum Error{Retry,Failed}pub fn mapped(value:Result<Item,Error>)->Result<Item,Error>{value.map(|n|n)}');assert.deepEqual(r.meta.refused,[]);
 await verifyTypedTargets(r,api=>{assert.deepEqual(api.mapped(ok(tag('Item',{n:255n}))),ok(tag('Item',{n:255n})));assert.deepEqual(api.mapped(err(tag('Retry'))),err(tag('Retry')));assert.throws(()=>api.mapped(ok(tag('Item',{n:256n}))),TypeError);assert.throws(()=>api.mapped(err(tag('Other'))),TypeError);},{childTimeoutMs:20000});
 const forged=parseProgram(JSON.stringify(r.meta.targetSemanticProgram)),item=[...forged.declarations.values()].find(value=>value.k==='data'&&value.ctors.some(ctor=>ctor.name==='Item'));item.ctors[0].fields[0].type={kind:'fixed',bits:16,signed:false,rustPrimitiveName:'u16',rustSourceType:true};assert.throws(()=>emitJavaScript(forged),/private|layout|identity/);
});
test('mapped private body/source/callback/layout commitments reject changed semantic metadata',()=>{
 const r=project(scalar);for(const mutate of [node=>{node.pinnedStandardBodyProof.selection.method.bodySource='{ Err(false) }';},node=>{node.pinnedStandardBodyProof.callbackInvocation='never';},node=>{node.body.body.cases[0].body.type.rustPrimitiveName='usize';},node=>{node.type.rustStandardGeneric.arguments[1]={kind:'fixed',bits:8,signed:false,rustPrimitiveName:'u8'};}]){const p=parseProgram(JSON.stringify(r.meta.targetSemanticProgram));mutate(find([...p.declarations.values()],'routerOriginalMappedBody'));assert.throws(()=>emitJavaScript(p),/privately checked|Mapped/);}
 const changedCaller=parseProgram(JSON.stringify(r.meta.targetSemanticProgram)),caller=[...changedCaller.declarations.values()].find(value=>value.k==='fn'&&find(value.body,'routerOriginalMappedBody'));caller.params[0].type.rustStandardGeneric.arguments[0].rustPrimitiveName='usize';assert.throws(()=>emitJavaScript(changedCaller),/caller signature/);
 const p=parseProgram(JSON.stringify(r.meta.targetSemanticProgram)),data=[...p.declarations.values()].find(value=>value.k==='data'&&value.standardGeneric?.kind==='Result');data.ctors[0].fields[0].type={kind:'bool'};assert.throws(()=>emitJavaScript(p),/identity|layout|payload|generic/i);
});
test('fresh source reconstructs private mapped frames and fresh serialized meta has no issuer authority',()=>{
 const root=new URL('../',import.meta.url),script=`import {translateProject} from ${JSON.stringify(new URL('project.mjs',root).href)};const source=${JSON.stringify(scalar)};const r=translateProject({entry:'src/lib.rs',paths:['src/lib.rs'],readSource:()=>source});if(r.meta.refused.length)throw new Error(JSON.stringify(r.meta.refused));console.log(r.javascript.includes('function'));`;
 assert.match(execFileSync(process.execPath,['--input-type=module','-e',script],{encoding:'utf8',timeout:20000}),/true/);
 const r=project(scalar),emit=`import {emitJavaScript} from ${JSON.stringify(new URL('extensions/host-contracts.mjs',root).href)};import {parseProgram} from ${JSON.stringify(new URL('semantic-meta.mjs',root).href)};let s='';for await(const x of process.stdin)s+=x;try{emitJavaScript(parseProgram(s));throw new Error('unexpected authority');}catch(error){if(!/privately checked/.test(error.message))throw error;console.log('private refusal');}`;
 assert.match(execFileSync(process.execPath,['--input-type=module','-e',emit],{input:JSON.stringify(r.meta.targetSemanticProgram),encoding:'utf8',timeout:20000}),/private refusal/);
});
test('owned payloads unknown nominal errors mutable captures false namespaces and escaping lifetimes stay refused',()=>{
 for(const source of [
 'pub fn bad(value:Result<String,bool>)->Result<String,bool>{value.map(|n|n)}',
 'enum Error{Failure}pub fn bad(value:Result<u8,Error>)->Result<u8,Error>{value.map(|n|n)}',
 '#[derive(Copy,Clone)]enum Error{Failure}impl Drop for Error{fn drop(&mut self){}}pub fn bad(value:Result<u8,Error>)->Result<u8,Error>{value.map(|n|n)}',
 'pub fn bad(value:Result<u8,bool>,owned:String)->Result<u8,bool>{value.map(|n|{let ignored=owned;n})}',
 'pub fn bad(value:Result<u8,bool>)->Result<u8,bool>{let mut local=1u8;value.map(|n|n+local)}',
 'pub fn bad(value:Result<u8,bool>)->Result<u8,bool>{let mut local=1u8;value.map(|n|{local=2u8;n})}',
 'pub fn bad(value:&mut Result<u8,bool>)->Result<u8,bool>{value.map(|n|n)}',
 'pub fn bad(value:&Result<u8,bool>)->Result<u8,bool>{value.map(|n|n)}',
 'pub fn bad(value:Result<usize,bool>)->Result<u64,bool>{value.map(|n|n)}',
 'pub fn bad(value:Result<u8,bool>)->Result<u8,u8>{value.map(|n|n)}',
 "pub fn bad<'a>(value:Result<&'a u8,bool>,other:&u8)->Result<&'a u8,bool>{value.map(|n|other)}",
 'enum Result{Ok(u8),Err(bool)}pub fn bad(value:Result)->Result{value.map(|n|n)}',
 'mod std{}pub fn bad(value:std::result::Result<u8,bool>)->Result<u8,bool>{value.map(|n|n)}',
 'pub const fn bad(value:Result<u8,bool>)->Result<u8,bool>{value.map(|n|n)}',
 'pub fn bad(value:Result<u8,bool>)->Result<u8,bool>{value.map(|n|{return n;})}',
 ]){const r=project(source);assert.equal(r.meta.executable.some(row=>row.name==='bad'),false,source);assert.ok(r.meta.refused.length,source);}
});
