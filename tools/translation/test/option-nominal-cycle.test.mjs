import test from 'node:test';
import assert from 'node:assert/strict';
import {translateProject} from '../project.mjs';
import {parseProgram} from '../semantic-meta.mjs';
import {emitJavaScript,HostChecker} from '../extensions/host-contracts.mjs';
import {captureOptionNominals,checkedOptionNominal} from '../extensions/option-nominal-proof.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';
const tag=($,fields={})=>Object.freeze({$,...fields}),some=field0=>tag('Some',{field0}),none=tag('None');
const project=source=>translateProject({entry:'src/lib.rs',paths:['src/lib.rs'],readSource:()=>source});
const mode='#[derive(Clone,Copy)]pub enum Mode{Ready,Paused}';

test('original pinned eager and lazy Option bodies retain nominal types in JS and strict TS',async()=>{
  const source=mode+'pub fn eager(value:Option<Mode>)->Mode{value.unwrap_or(Mode::Paused)}pub fn lazy(value:Option<Mode>)->Mode{value.unwrap_or_else(||Mode::Paused)}pub fn alternate(value:Option<Mode>)->Option<Mode>{value.or_else(||Some(Mode::Paused))}fn failed()->Mode{panic!("fallback called")}pub fn eager_panic(value:Option<Mode>)->Mode{value.unwrap_or(failed())}pub fn lazy_panic(value:Option<Mode>)->Mode{value.unwrap_or_else(failed)}pub fn alternate_panic(value:Option<Mode>)->Option<Mode>{value.or_else(||Some(failed()))}';
  const result=project(source);assert.deepEqual(result.meta.refused,[]);
  assert.match(result.typescript,/Readonly<\{ readonly "\$": "Ready" \}>/);
  await verifyTypedTargets(result,api=>{
    for(const name of ['eager','lazy']){assert.deepEqual(api[name](none),tag('Paused'));assert.deepEqual(api[name](some(tag('Ready'))),tag('Ready'));assert.throws(()=>api[name](some(tag('Wrong'))),TypeError);}
    assert.deepEqual(api.alternate(none),some(tag('Paused')));assert.deepEqual(api.alternate(some(tag('Ready'))),some(tag('Ready')));
    for(const value of [none,some(tag('Ready'))])assert.throws(()=>api.eager_panic(value),/fallback called/);
    assert.deepEqual(api.lazy_panic(some(tag('Ready'))),tag('Ready'));assert.throws(()=>api.lazy_panic(none),/fallback called/);
    assert.deepEqual(api.alternate_panic(some(tag('Ready'))),some(tag('Ready')));assert.throws(()=>api.alternate_panic(none),/fallback called/);
  },{childTimeoutMs:15000});
});

test('checked captured locals survive reserved names, shadowing and lazy branch selection',async()=>{
  const source='pub fn capture(value:Option<u8>,default:u8)->u8{let default=default+1u8;value.unwrap_or_else(||default)}pub fn capture_option(value:Option<u8>,fallback:Option<u8>)->Option<u8>{value.or_else(||fallback)}';
  const result=project(source);assert.deepEqual(result.meta.refused,[]);
  await verifyTypedTargets(result,api=>{assert.equal(api.capture(none,8n),9n);assert.equal(api.capture(some(3n),8n),3n);assert.deepEqual(api.capture_option(none,some(7n)),some(7n));assert.deepEqual(api.capture_option(some(3n),none),some(3n));},{childTimeoutMs:15000});
});

test('source-resolved cross-module aliases preserve distinct nominal Option identities',async()=>{
  const source='mod left{#[derive(Clone,Copy)]pub enum Mode{Ready,Paused}}mod right{#[derive(Clone,Copy)]pub enum Mode{Ready,Paused}}use left::Mode as L;use right::Mode as R;pub fn left(value:Option<L>)->L{value.unwrap_or_else(||L::Paused)}pub fn right(value:Option<R>)->Option<R>{value.or_else(||Some(R::Ready))}pub fn wrong(value:Option<L>)->L{value.unwrap_or_else(||R::Paused)}';
  const result=project(source);assert.deepEqual(result.meta.refused.map(item=>item.name),['wrong']);
  await verifyTypedTargets(result,api=>{assert.deepEqual(api.left(none),tag('Paused'));assert.deepEqual(api.right(none),some(tag('Ready')));},{childTimeoutMs:15000});
});

test('Copy tuple/record payload layouts retain exact fields and widths',async()=>{
  const source='#[derive(Clone,Copy)]pub struct Item{n:u8}pub fn chosen(value:Option<Item>)->Item{value.unwrap_or_else(||Item{n:9u8})}';
  const result=project(source);assert.deepEqual(result.meta.refused,[]);
  await verifyTypedTargets(result,api=>{assert.deepEqual(api.chosen(none),tag('Item',{n:9n}));assert.deepEqual(api.chosen(some(tag('Item',{n:3n}))),tag('Item',{n:3n}));assert.throws(()=>api.chosen(some(tag('Item',{n:256n}))),TypeError);assert.throws(()=>api.chosen(some(tag('Item'))),TypeError);},{childTimeoutMs:15000});
});

test('public source/certificate/layout clones cannot issue nominal Option authority',()=>{
  const result=project(mode+'pub fn chosen(value:Option<Mode>)->Mode{value.unwrap_or(Mode::Paused)}');
  const original=parseProgram(JSON.stringify(result.meta.checkedSemanticProgram));
  const surface={language:'Rust',items:[...original.declarations.values()].filter(entry=>entry.k==='data').map(entry=>structuredClone(entry)),main:null};
  const checker=new HostChecker('Rust',[]);captureOptionNominals(checker,surface);
  assert.throws(()=>checkedOptionNominal(checker,{kind:'data',name:'Mode'},{start:0,end:1}),/private original checked Copy/);
  const semantic=parseProgram(JSON.stringify(result.meta.targetSemanticProgram)),entry=[...semantic.declarations.values()].find(item=>item.k==='data'&&item.ctors?.some(ctor=>ctor.name==='Paused'));
  entry.ctors[0].fields.push({name:'field0',type:{kind:'bool'},rustTypeSyntax:['bool']});
  assert.throws(()=>emitJavaScript(semantic),/private original checked Copy|actual checked layout|source owner/);
});

test('nested nominal dependency layout drift cannot reuse a root Copy proof',()=>{
  const result=project('#[derive(Clone,Copy)]pub struct Inner{n:u8}#[derive(Clone,Copy)]pub struct Outer{inner:Inner}pub fn chosen(value:Option<Outer>)->Outer{value.unwrap_or_else(||Outer{inner:Inner{n:9u8}})}');assert.deepEqual(result.meta.refused,[]);
  const semantic=parseProgram(JSON.stringify(result.meta.targetSemanticProgram)),inner=[...semantic.declarations.values()].find(item=>item.k==='data'&&item.ctors?.some(ctor=>ctor.name==='Inner'));
  inner.ctors[0].fields[0].type={kind:'fixed',bits:16,signed:false,rustPrimitiveName:'u16',rustSourceType:true};
  assert.throws(()=>emitJavaScript(semantic),/exact private checked Copy\/no-Drop/);
});

test('Drop, missing Copy, unknown ownership, borrowed owners and nominal Default remain refused',()=>{
  for(const source of [
    'pub enum Mode{Ready,Paused}pub fn bad(value:Option<Mode>)->Mode{value.unwrap_or(Mode::Paused)}',
    mode+'impl Drop for Mode{fn drop(&mut self){}}pub fn bad(value:Option<Mode>)->Mode{value.unwrap_or_else(||Mode::Paused)}',
    '#[derive(Clone,Copy)]pub struct Item{n:String}pub fn bad(value:Option<Item>)->Item{value.unwrap_or_else(||Item{n:String::from("x")})}',
    mode+'pub fn bad(value:&Option<Mode>)->Mode{value.unwrap_or(Mode::Paused)}',
    mode+'pub fn bad(value:Option<Mode>)->Mode{value.unwrap_or_default()}',
    'pub fn bad(value:Option<u8>,owned:String)->u8{value.unwrap_or_else(||{let ignored=owned;1u8})}',
    'pub const fn bad(value:Option<u8>)->u8{value.unwrap_or_else(||1u8)}',
  ]){const result=project(source);assert.equal(result.meta.executable.some(item=>item.name==='bad'),false,source);assert.ok(result.meta.refused.length,source);}
});
