import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdtempSync,writeFileSync,readFileSync,cpSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {translateSource,sha256} from '../translate.mjs';
import {sourceItems} from '../rust-structure.mjs';
import {parseRust,checkProgram} from '../extensions/data.mjs';
import {roundTripProgram} from '../semantic-meta.mjs';
import {writeRuntimeAssets} from './artifact-loader.mjs';

async function targets(source,verify) {
  const result=translateSource(source),directory=mkdtempSync(join(tmpdir(),'router-named-variants-'));
  try {
    writeRuntimeAssets(directory);
    assert.equal(result.ir.items.map(item=>item.source).join(''),source);
    assert.equal(result.ir.counts.carried,0,JSON.stringify(result.ir.items.filter(item=>item.status==='carried')));
    writeFileSync(join(directory,'src/module.mjs'),result.javascript);
    writeFileSync(join(directory,'src/module.ts'),result.typescript);
    execFileSync(process.execPath,['--check',join(directory,'src/module.mjs')],{stdio:'pipe'});
    const compiled=join(directory,'compiled');
    execFileSync(process.env.ROUTER_TRANSLATION_TSC??'tsc',['--strict','--target','ES2022','--module','NodeNext','--moduleResolution','NodeNext','--skipLibCheck','--rootDir',directory,'--outDir',compiled,join(directory,'src/module.ts')],{stdio:'pipe'});
    cpSync(join(directory,'runtime'),join(compiled,'src/runtime'),{recursive:true});
    for(const path of [join(directory,'src/module.mjs'),join(compiled,'src/module.js')])verify((await import(pathToFileURL(path))).translated,result);
  } finally {rmSync(directory,{recursive:true,force:true});}
}

test('named variants construct exact tags and fields with contextual types in both emitted targets',async()=>{
  await targets('pub enum Event { Empty {}, Unit, Value { count:u8, valid:bool } } pub fn build(count:u8)->Event {Event::Value {valid:true,count}} pub fn empty()->Event {Event::Empty {}} pub fn unit()->Event {Event::Unit {}}',api=>{
    assert.deepEqual(api.build(7n),{$:'Value',count:7n,valid:true});assert.equal(Object.isFrozen(api.build(7n)),true);
    assert.deepEqual(api.empty(),{$:'Empty'});assert.deepEqual(api.unit(),{$:'Unit'});
    assert.throws(()=>api.build(256n),RangeError);
  });
});

test('written field evaluation order is retained independently of declaration order',async()=>{
  await targets('enum Event { Value { left:u8,right:u8 } } pub fn ordered()->Event { Event::Value {right:255u8+1u8,left:1u8/0u8} }',api=>{
    assert.throws(()=>api.ordered(),error=>error instanceof RangeError && /overflow|out of|outside/u.test(error.message) && !/division|zero/u.test(error.message));
  });
});

test('named source fields use own data properties even for JavaScript prototype spellings',async()=>{
  await targets('pub enum Event { Value { __proto__:u8,constructor:bool } } pub fn build()->Event {Event::Value {constructor:true,__proto__:3}}',api=>{
    const value=api.build();assert.equal(Object.hasOwn(value,'__proto__'),true);assert.equal(value.__proto__,3n);assert.equal(value.constructor,true);
    assert.equal(Object.getPrototypeOf(value),Object.prototype);assert.equal(Object.isFrozen(value),true);
  });
});

test('original production ThresholdDecision declaration translates unchanged without inventing trait methods',async()=>{
  const source=readFileSync(new URL('../../../src/account_limits.rs',import.meta.url),'utf8');
  const selected=sourceItems(source).find(item=>item.term==='enum'&&item.name==='ThresholdDecision');
  assert.ok(selected);const original=source.slice(selected.start,selected.end);
  await targets(original,(api,result)=>{
    const item=result.ir.items.find(item=>item.name==='ThresholdDecision');assert.equal(item.sha256,sha256(original));
    assert.deepEqual(api.ThresholdDecision.Pause(18446744073709551615n,'day'),{$:'Pause',until_unix:18446744073709551615n,window:'day'});
    assert.deepEqual(api.ThresholdDecision.Clear(),{$:'Clear'});assert.deepEqual(api.ThresholdDecision.Ignore(),{$:'Ignore'});
    assert.throws(()=>api.ThresholdDecision.Pause(18446744073709551616n,'day'),RangeError);
    assert.equal(api.clone,undefined);assert.equal(api.eq,undefined);
  });
});

test('named variant metadata survives checked semantic serialization',()=>{
  const checked=checkProgram(parseRust('#[derive(Clone,Copy)] enum Event { Value { #[allow(unused)] number:u16 } } fn main() {}'));
  const restored=roundTripProgram(checked),ctor=restored.declarations.get('Event').ctors[0];
  assert.equal(ctor.ctorStyle,'named');assert.equal(ctor.fields[0].name,'number');
  assert.deepEqual(ctor.fields[0].rustTypeSyntax,['u16']);assert.equal(ctor.fields[0].rustAttributes[0].name,'allow');
});

test('missing, duplicate, foreign and private ABI constructors remain source-bearing refusals',()=>{
  for(const source of [
    'enum Event { Value {x:u8,y:bool} } fn bad()->Event {Event::Value {x:1}}',
    'enum Event { Value {x:u8} } fn bad()->Event {Event::Value {x:1,x:2}}',
    'enum Event { Value {x:u8} } fn bad()->Event {Event::Value {other:1}}',
    'enum Event { Value {x:u8} } fn bad()->Event {Event {x:1}}',
    'enum Event { Value {x:u8} } fn bad()->Event {Event::Value(1)}',
    'struct Named {x:u8} fn bad()->Named {Named(1)}',
    'struct Tuple(u8); fn bad()->Tuple {Tuple {field0:1}}',
    'fn bad()->std::time::Duration {std::time::Duration {secs:1,nanos:0}}',
  ]) {
    const result=translateSource(source),item=result.ir.items.find(item=>item.name==='bad');
    assert.equal(item.status,'carried',source);assert.ok(item.diagnostic);assert.equal(result.ir.items.map(item=>item.source).join(''),source);
  }
});
