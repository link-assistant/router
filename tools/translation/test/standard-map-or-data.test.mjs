import test from 'node:test';
import assert from 'node:assert/strict';
import {translateProject} from '../project.mjs';
import {parseRust,checkProgram,HostChecker} from '../extensions/host-contracts.mjs';
import {captureOriginalStandardCalls,requireOriginalStandardCall} from '../extensions/original-standard-calls.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';
const tag=($,fields={})=>Object.freeze({$,...fields}),some=field0=>tag('Some',{field0}),none=tag('None'),ok=field0=>tag('Ok',{field0});
const project=source=>translateProject({entry:'src/lib.rs',paths:['src/lib.rs'],readSource:()=>source});
const mode='#[derive(Copy,Clone)]pub enum Mode{Ready,Paused}';
test('Option.map_or data output has one actual U and preserves checked nominal constructors in both targets',{timeout:60000},async()=>{
 const r=project(mode+'pub fn chosen(value:Option<u8>)->Mode{value.map_or(Mode::Paused,|n|if n>0u8{Mode::Ready}else{Mode::Paused})}pub fn nested(value:Option<u8>)->Option<u8>{value.map_or(None,Some)}pub fn result(value:Option<u8>)->Result<u8,bool>{value.map_or(Err(false),|n|Ok(n))}');assert.deepEqual(r.meta.refused,[]);assert.match(r.typescript,/Readonly<\{ readonly "\$": "Ready" \}>/);
 await verifyTypedTargets(r,api=>{assert.deepEqual(api.chosen(none),tag('Paused'));assert.deepEqual(api.chosen(some(0n)),tag('Paused'));assert.deepEqual(api.chosen(some(1n)),tag('Ready'));assert.deepEqual(api.nested(none),none);assert.deepEqual(api.nested(some(255n)),some(255n));assert.deepEqual(api.result(none),tag('Err',{field0:false}));assert.deepEqual(api.result(some(255n)),ok(255n));},{childTimeoutMs:20000});
});
test('data default is eager once and callback is lazy once, with real ordered effects',{timeout:60000},async()=>{
 const r=project(mode+'fn mark(path:&str)->bool{std::fs::read_to_string(path).is_ok()}fn receiver(flag:bool)->Option<u8>{let seen=mark("receiver");if flag{Some(1u8)}else{None}}fn fallback()->Mode{let seen=mark("default");Mode::Paused}pub fn ordered(flag:bool)->Mode{receiver(flag).map_or(fallback(),|n|{let seen=mark("callback");Mode::Ready})}fn failure()->Mode{panic!("default")}pub fn failed(value:Option<u8>)->Mode{value.map_or(failure(),|n|Mode::Ready)}pub fn callback(value:Option<u8>)->Mode{value.map_or(Mode::Paused,|n|panic!("callback"))}');assert.deepEqual(r.meta.refused,[]);
 await verifyTypedTargets(r,(api,_r,_m,{effects})=>{const seen=[],capability={fs:{sync:{readFileSync(path){seen.push(path);return new Uint8Array();}}}};assert.deepEqual(effects.withEffectCapabilities(capability,()=>api.ordered(true)),tag('Ready'));assert.deepEqual(seen,['receiver','default','callback']);seen.length=0;assert.deepEqual(effects.withEffectCapabilities(capability,()=>api.ordered(false)),tag('Paused'));assert.deepEqual(seen,['receiver','default']);for(const value of [none,some(1n)])assert.throws(()=>api.failed(value),/default/);assert.deepEqual(api.callback(none),tag('Paused'));assert.throws(()=>api.callback(some(1n)),/callback/);},{childTimeoutMs:20000});
});
test('qualified imported nested nominal output keeps original declaration identity',{timeout:60000},async()=>{
 const source='mod left{#[derive(Copy,Clone)]pub enum Mode{Ready,Paused}}mod right{#[derive(Copy,Clone)]pub enum Mode{Ready,Paused}}use left::Mode as L;use right::Mode as R;pub fn left(value:Option<u8>)->L{value.map_or(L::Paused,|n|L::Ready)}pub fn nested(value:Result<u8,bool>)->Result<Option<R>,bool>{value.map(|n|Some(R::Ready))}pub fn wrong(value:Option<u8>)->L{value.map_or(L::Paused,|n|R::Ready)}';const r=project(source);assert.deepEqual(r.meta.refused.map(row=>row.name),['wrong']);
 await verifyTypedTargets(r,api=>{assert.deepEqual(api.left(none),tag('Paused'));assert.deepEqual(api.left(some(7n)),tag('Ready'));assert.deepEqual(api.nested(ok(1n)),ok(some(tag('Ready'))));},{childTimeoutMs:20000});
});
test('private actual caller capture cannot be copied from a parser surface or a public source digest',()=>{
 const source=mode+'pub fn chosen(value:Option<u8>)->Mode{value.map_or(Mode::Paused,|n|Mode::Ready)}';const surface=parseRust(source+'fn main(){}'),clone=structuredClone(surface);assert.throws(()=>checkProgram(clone),/privately captured/);
 const checker=new HostChecker('Rust',[]),fake={k:'routerDispatchMethod',method:'map_or',object:{k:'name',path:['value']},args:[],span:{start:0,end:1}};captureOriginalStandardCalls(checker,{items:[{k:'fn',body:fake,sourceProof:{sha256:'original'}}]});assert.throws(()=>requireOriginalStandardCall(checker,fake),/privately captured/);
});
test('data map_or rejects unknown or Drop layouts, mutable captures, lifetime mismatches and erased U',()=>{
 for(const source of [
 'enum Mode{Ready,Paused}pub fn bad(value:Option<u8>)->Mode{value.map_or(Mode::Paused,|n|Mode::Ready)}',
 mode+'impl Drop for Mode{fn drop(&mut self){}}pub fn bad(value:Option<u8>)->Mode{value.map_or(Mode::Paused,|n|Mode::Ready)}',
 '#[derive(Copy,Clone)]struct Item{n:String}pub fn bad(value:Option<u8>)->Item{value.map_or(Item{n:"a".to_owned()},|n|Item{n:"b".to_owned()})}',
 mode+'pub fn bad(value:Option<String>)->Mode{value.map_or(Mode::Paused,|n|Mode::Ready)}',
 mode+'pub fn bad(value:Option<u8>)->Mode{let mut fallback=Mode::Paused;value.map_or(Mode::Paused,|n|fallback)}',
 mode+'pub fn bad(value:Option<u8>,owned:String)->Mode{value.map_or(Mode::Paused,|n|{let ignored=owned;Mode::Ready})}',
 'pub fn bad(value:Option<u8>)->Option<usize>{value.map_or(Some(1u64),|n|Some(1usize))}',
 "pub fn bad<'a>(value:Option<&'a u8>,fallback:&u8)->Option<&'a u8>{value.map_or(Some(fallback),Some)}",
 mode+'pub fn bad(value:Option<u8>)->Mode{value.map_or({return Mode::Paused;},|n|Mode::Ready)}',
 mode+'pub const fn bad(value:Option<u8>)->Mode{value.map_or(Mode::Paused,|n|Mode::Ready)}',
 ]){const r=project(source);assert.equal(r.meta.executable.some(row=>row.name==='bad'),false,source);assert.ok(r.meta.refused.length,source);}
});
