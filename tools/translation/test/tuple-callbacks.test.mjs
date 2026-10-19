import assert from 'node:assert/strict';
import test from 'node:test';
import {mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {translateSource} from '../translate.mjs';
import {translateProject} from '../project.mjs';
import {parseRust,checkProgram} from '../extensions/host-contracts.mjs';
import {serializeProgram,parseProgram} from '../semantic-meta.mjs';
import {writeRuntimeAssets} from './artifact-loader.mjs';
const tag=($,fields={})=>Object.freeze({$,...fields}),some=field0=>tag('Some',{field0}),none=tag('None');
const tuple=(...fields)=>tag('Tuple',Object.fromEntries(fields.map((value,index)=>['field'+index,value])));
async function artifacts(result) {
  execFileSync('node',['--input-type=module','--check'],{input:result.javascript,encoding:'utf8',timeout:10000});
  const directory=mkdtempSync(join(tmpdir(),'router-tuple-callbacks-'));
  try {
    writeRuntimeAssets(directory);const path=join(directory,'src/module.ts');
    writeFileSync(join(directory,'src/module.mjs'),result.javascript);writeFileSync(path,result.typescript);
    const javascript=(await import(pathToFileURL(join(directory,'src/module.mjs')).href)).translated;
    execFileSync(process.env.ROUTER_TRANSLATION_TSC??'tsc',['--strict','--target','ES2022','--module','NodeNext','--moduleResolution','NodeNext',path],{encoding:'utf8',timeout:30000});
    const typescript=(await import(pathToFileURL(join(directory,'src/module.js')).href)).translated;
    return [javascript,typescript];
  }finally{rmSync(directory,{recursive:true,force:true});}
}
function compiled(source) {
  const checked=checkProgram(parseRust(source+'\nfn main() {}'));
  const serialized=serializeProgram(checked);assert.equal(serializeProgram(parseProgram(serialized)),serialized);
  const result=translateSource(source,'src/module.rs');
  assert.equal(result.ir.counts.carried,0);assert.equal(result.ir.runtimeParity,false);
  return {result,checked};
}
const refuse=source=>{
  const result=translateSource(source,'src/module.rs');
  assert.ok(result.ir.items.some(item=>item.name==='bad'&&item.status==='carried'),source);
  assert.equal(result.ir.items.some(item=>item.name==='bad'&&item.status==='executable'),false,source);
};

test('standard Option tuple callbacks bind scalar projections with checked scopes and nested products',async()=>{
  const source="pub fn pick(value:Option<(&'static str,&'static str)>)->Option<&'static str>{value.map(|(_,right)|right)} pub fn equal(value:Option<(&str,&str)>,outer:&str)->Option<bool>{value.map(|(outer,right)|outer==right)} pub fn deep(value:Option<(u8,(bool,&str))>)->Option<u8>{value.map(|(n,(flag,text))|if flag&&text==\"Ω\"{n}else{0})} pub fn scalar(value:Option<u8>)->Option<u8>{value.map(|n|n+1)}";
  const {result,checked}=compiled(source);
  const body=checked.declarations.get('pick').body;
  assert.equal(body.callback.patternControl.kind,'tuple-callback');
  assert.equal(body.callback.patternControl.ownership,'checked-by-value-option');
  assert.equal(body.callback.binding.body.k,'routerDiscard');
  assert.equal(body.callback.binding.body.value.k,'routerPatternImmutable');
  for(const api of await artifacts(result)) {
    assert.deepEqual(api.pick(some(tuple('left','Ω'))),some('Ω'));assert.deepEqual(api.pick(none),none);
    assert.deepEqual(api.equal(some(tuple('Ω','Ω')),'ignored'),some(true));assert.deepEqual(api.equal(some(tuple('Ω','ω')),'Ω'),some(false));
    assert.deepEqual(api.deep(some(tuple(9n,tuple(true,'Ω')))),some(9n));assert.deepEqual(api.deep(some(tuple(9n,tuple(false,'Ω')))),some(0n));assert.deepEqual(api.deep(none),none);
    assert.deepEqual(api.scalar(some(5n)),some(6n));assert.deepEqual(api.scalar(none),none);assert.throws(()=>api.scalar(some(255n)),RangeError);
  }
});

test('tuple callback patterns preserve actual standard aliases and nested constructor owner proofs',async()=>{
  const source='use std::option::Option as Maybe; pub fn pick(value:Maybe<(bool,u8)>)->Maybe<u8>{value.map(|(true|false,n)|n)}';
  const result=translateProject({entry:'src/module.rs',paths:['src/module.rs'],readSource:()=>source});
  assert.deepEqual(result.meta.refused,[]);assert.deepEqual(result.meta.moduleDiagnostics,[]);assert.equal(result.meta.runtimeParity,false);
  for(const api of await artifacts(result)){assert.deepEqual(api.pick(some(tuple(true,8n))),some(8n));assert.deepEqual(api.pick(some(tuple(false,9n))),some(9n));assert.deepEqual(api.pick(none),none);}
});

test('tuple callbacks preserve captures, eager map_or defaults and lazy selected branches',async()=>{
  const {result}=compiled('pub fn eager(value:Option<(u8,bool)>,outer:u8)->u8{value.map_or(outer+1,|(n,_)|n)} pub fn lazy(value:Option<(u8,bool)>,outer:u8)->Option<u8>{value.map(|(n,enabled)|if enabled{n+outer}else{n})}');
  for(const api of await artifacts(result)) {
    assert.equal(api.eager(some(tuple(6n,true)),8n),6n);assert.equal(api.eager(none,8n),9n);
    assert.throws(()=>api.eager(some(tuple(6n,true)),255n),RangeError);assert.throws(()=>api.eager(none,255n),RangeError);
    assert.deepEqual(api.lazy(some(tuple(3n,true)),5n),some(8n));assert.deepEqual(api.lazy(some(tuple(255n,false)),255n),some(255n));assert.deepEqual(api.lazy(none,255n),none);
    assert.throws(()=>api.lazy(some(tuple(255n,true)),1n),RangeError);
  }
});

test('tuple callback input guards precede layout reads and projections',async()=>{
  const {result}=compiled('pub fn pick(value:Option<(u8,bool)>)->Option<u8>{value.map(|(n,_)|n)}');
  const early=result.javascript.indexOf('ml_pattern_immutable(value);'),layout=result.javascript.indexOf('ml_validate_rust_value(value,');
  assert.ok(early>=0&&layout>early);
  for(const api of await artifacts(result)) {
    assert.deepEqual(api.pick(some(tuple(7n,true))),some(7n));
    assert.throws(()=>api.pick(some(Object.freeze([7n,true]))),TypeError);
    assert.throws(()=>api.pick(some(tag('Pair',{field0:7n,field1:true}))),TypeError);
    let reads=0;const proxy=new Proxy(tuple(7n,true),{get(){reads++;},ownKeys(){reads++;return[];},getOwnPropertyDescriptor(){reads++;},getPrototypeOf(){reads++;return null;}});
    assert.throws(()=>api.pick(some(proxy)),TypeError);assert.equal(reads,0);
    const getter=Object.freeze(Object.defineProperty({},'field0',{get(){reads++;return 7n;}}));
    assert.throws(()=>api.pick(some(getter)),TypeError);assert.equal(reads,0);
  }
});

test('tuple callbacks refuse unresolved moves, references, aggregates, annotations and exits',()=>{
  for(const source of [
    'fn bad(value:Option<(&str,&str)>)->Option<&str>{value.map(|(_,right)|right)}',
    'fn bad(value:&Option<(u8,u8)>)->Option<u8>{value.map(|(n,_)|n)}',
    'fn bad(value:[(u8,u8);1])->u64{value.iter().map(|(n,_)|n).count()}',
    'fn bad(value:Option<(u8,u8)>)->Option<u8>{value.map(|&(n,_)|n)}',
    'fn bad(value:Option<(u8,u8)>)->Option<u8>{value.map(move |(n,_)|n)}',
    'fn bad(value:Option<(u8,u8)>)->Option<u8>{value.map(|(mut n,_)|n)}',
    'fn bad(value:Option<(u8,u8)>)->Option<u8>{value.map(|(ref n,_)|0)}',
    'fn bad(value:Option<(bool,u8)>)->Option<u8>{value.map(|(true,n)|n)}',
    'fn bad(value:Option<(u8,u8)>)->Option<u8>{value.map(|(n,n)|n)}',
    'fn bad(value:Option<(u8,u8)>)->Option<u8>{value.map(|(n,)|n)}',
    'fn bad(value:Option<(u8,u8)>)->Option<u8>{value.map(|(n,_):(u8,u8)|n)}',
    'fn bad(value:Option<((u8,u8),u8)>)->Option<u8>{value.map(|(aggregate,n)|n)}',
    'fn bad(value:Option<(String,u8)>)->Option<u8>{value.map(|(_,n)|n)}',
    'struct Pair(u8,u8); fn bad(value:Option<Pair>)->Option<u8>{value.map(|(Pair(n,_))|n)}',
    'fn bad(value:Option<(u8,u8)>)->Option<u8>{value.map(|(n,_)|return n)}',
    'fn bad(value:Option<(u8,u8)>)->Option<u8>{value.map(|(n,_)|break)}',
    'fn bad(value:Option<(u8,u8)>)->Option<u8>{value.map(|(n,_)|missing)}',
    'fn bad(value:Option<(u8,u8)>,outer:&u8)->Option<u8>{value.map(|(n,_)|n+outer)}',
    'fn bad(value:Option<(u8,u8)>,outer:(u8,u8))->Option<u8>{value.map(|(n,_)|n+outer.0)}',
    'fn bad(value:Option<(u8,u8)>)->Option<u8>{let mut outer=0;value.map(|(n,_)|{outer=n;outer})}',
  ])refuse(source);
});

test('pattern syntax treats quoted grammar characters as opaque original tokens',async()=>{
  const {result}=compiled('pub fn pick(value:Option<&str>)->bool{let Some(text)=value else{return false;};text=="("} pub fn branch(value:Option<&str>)->bool{if let Some(text)=value{text=="&&"}else{false}} pub fn ordinary()->bool{let text="else";text=="else"} pub fn brace()->bool{let text="}" else{return false;};text=="}"} pub fn lazy()->bool{let text="&&" else{return false;};text=="&&"}');
  for(const api of await artifacts(result)){assert.equal(api.pick(some('(')),true);assert.equal(api.pick(some(')')),false);assert.equal(api.pick(none),false);assert.equal(api.branch(some('&&')),true);assert.equal(api.branch(none),false);assert.equal(api.ordinary(),true);assert.equal(api.brace(),true);assert.equal(api.lazy(),true);}
});
