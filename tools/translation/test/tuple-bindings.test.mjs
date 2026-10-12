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
  const directory=mkdtempSync(join(tmpdir(),'router-tuple-bindings-'));
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

test('ordinary tuple let binds actual scalar products with nested scopes, unit and one-element arity',async()=>{
  const source='pub fn pair(value:(&str,&str),left:&str)->bool{let (left,right)=value;left==right} pub fn deep(value:(u8,(bool,&str)),text:&str)->u8{let (n,(flag,text))=value;if flag&&text=="Ω"{n}else{0}} pub fn one(value:(u8,))->u8{let (n,)=value;n} pub fn unit(value:())->bool{let ()=value;true} pub fn exhaustive(value:(bool,u8))->u8{let (true|false,n)=value;n}';
  const {result,checked}=compiled(source),body=checked.declarations.get('pair').body;
  assert.equal(body.patternControl.kind,'tuple-let');assert.equal(body.patternControl.plan.refutable,false);
  assert.deepEqual(body.patternControl.plan.bindings.map(binding=>binding.projection),[['field0'],['field1']]);
  assert.equal(body.body.k,'routerDiscard');assert.equal(body.body.value.k,'routerPatternImmutable');
  for(const api of await artifacts(result)) {
    assert.equal(api.pair(tuple('Ω','Ω'),'unused'),true);assert.equal(api.pair(tuple('Ω','ω'),'Ω'),false);
    assert.equal(api.deep(tuple(7n,tuple(true,'Ω')),'ignored'),7n);assert.equal(api.deep(tuple(7n,tuple(false,'Ω')),'Ω'),0n);assert.equal(api.deep(tuple(7n,tuple(true,'ω')),'Ω'),0n);
    assert.equal(api.one(tuple(255n)),255n);assert.equal(api.unit(null),true);
    assert.equal(api.exhaustive(tuple(true,3n)),3n);assert.equal(api.exhaustive(tuple(false,4n)),4n);
  }
});

test('nested actual standard Option and Result layouts bind borrowed tuple scalars in let-else',async()=>{
  const source='use std::option::Option::{Some as Present,None as Absent}; use std::result::Result as R; pub fn option(value:Option<(&str,&str)>)->bool{let Present((left,right))=value else{return false;};left==right} pub fn nested(value:Option<Option<(u8,bool)>>)->u8{let Present(Present((n,true)))=value else{return 9;};n} pub fn result(value:R<(u8,bool),(u8,bool)>)->u8{let R::Ok((n,enabled))=value else{return 8;};if enabled{n}else{0}}';
  const result=translateProject({entry:'src/module.rs',paths:['src/module.rs'],readSource:()=>source});
  assert.deepEqual(result.meta.refused,[]);assert.deepEqual(result.meta.moduleDiagnostics,[]);assert.equal(result.meta.runtimeParity,false);
  for(const api of await artifacts(result)) {
    assert.equal(api.option(some(tuple('😀','😀'))),true);assert.equal(api.option(some(tuple('😀','Ω'))),false);assert.equal(api.option(none),false);
    assert.equal(api.nested(some(some(tuple(6n,true)))),6n);assert.equal(api.nested(some(some(tuple(6n,false)))),9n);assert.equal(api.nested(some(none)),9n);assert.equal(api.nested(none),9n);
    assert.equal(api.result(tag('Ok',{field0:tuple(5n,true)})),5n);assert.equal(api.result(tag('Ok',{field0:tuple(5n,false)})),0n);assert.equal(api.result(tag('Err',{field0:tuple(5n,true)})),8n);
  }
});

test('tuple binding retains existing typed Option propagation and early function exit',async()=>{
  const {result}=compiled("pub fn propagated(value:Option<(&'static str,&'static str)>)->Option<&'static str>{let (left,_)=value?;Some(left)}");
  for(const api of await artifacts(result)) {
    assert.deepEqual(api.propagated(some(tuple('Ω','ignored'))),some('Ω'));
    assert.deepEqual(api.propagated(none),none);
  }
});

test('ordinary tuple destructuring checks immutable and actual product domains before any projection',async()=>{
  const {result}=compiled('pub fn pair(value:(&str,&str))->bool{let (a,b)=value;a==b}');
  const early=result.javascript.indexOf('ml_pattern_immutable(value);'),layout=result.javascript.indexOf('ml_validate_rust_value(value,');
  assert.ok(early>=0&&layout>early);
  for(const api of await artifacts(result)) {
    assert.equal(api.pair(tuple('a','a')),true);
    assert.throws(()=>api.pair({$: 'Tuple',field0:'a',field1:'a'}),TypeError);
    assert.throws(()=>api.pair(tag('Pair',{field0:'a',field1:'a'})),TypeError);
    assert.throws(()=>api.pair(Object.freeze(['a','a'])),TypeError);
    let reads=0;
    const proxy=new Proxy(tuple('a','a'),{get(){reads++;},ownKeys(){reads++;return[];},getOwnPropertyDescriptor(){reads++;},getPrototypeOf(){reads++;return null;}});
    assert.throws(()=>api.pair(proxy),TypeError);assert.equal(reads,0);
    const getter=Object.freeze(Object.defineProperty({},'field0',{get(){reads++;return 'a';}}));
    assert.throws(()=>api.pair(getter),TypeError);assert.equal(reads,0);
  }
});

test('selected Result tuple projections retain an unrelated scalar error payload',async()=>{
  const source='fn bad(value:Result<(u8,bool),bool>)->u8{let Ok((n,_))=value else{return 0;};n}';
  const {result,checked}=compiled(source),plan=checked.declarations.get('bad').body.patternControl.plan;
  assert.deepEqual(plan.projectionPaths.map(path=>path.projection),[[],['field0'],['field0']]);
  assert.equal(result.ir.items.map(item=>item.source).join(''),source);
  for(const api of await artifacts(result)) {
    assert.equal(api.bad(tag('Ok',{field0:tuple(255n,true)})),255n);
    assert.equal(api.bad(tag('Ok',{field0:tuple(0n,false)})),0n);
    assert.equal(api.bad(tag('Err',{field0:true})),0n);assert.equal(api.bad(tag('Err',{field0:false})),0n);
    assert.throws(()=>api.bad(tag('Err',{field0:tuple(7n,true)})),TypeError);
    assert.throws(()=>api.bad(tag('Ok',{field0:tag('Tuple',{field0:7n})})),TypeError);
    assert.throws(()=>api.bad({$:'Ok',field0:tuple(7n,true)}),TypeError);
    let reads=0;const proxy=new Proxy(tag('Ok',{field0:tuple(7n,true)}),{get(){reads++;},ownKeys(){reads++;return[];},getOwnPropertyDescriptor(){reads++;},getPrototypeOf(){reads++;return null;}});
    assert.throws(()=>api.bad(proxy),TypeError);assert.equal(reads,0);
  }
});

test('source tuple patterns refuse forged ABI fields, refutable lets and unresolved ownership',()=>{
  for(const source of [
    'fn bad(value:Option<(&str,&str)>)->Option<&str>{let (left,_)=value?;Some(left)}',
    'struct Pair(u8,bool); fn bad(value:Pair)->u8{let (n,_)=value;n}',
    'struct Pair{field0:u8,field1:bool} fn bad(value:Pair)->u8{let (n,_)=value;n}',
    'fn bad(value:(bool,u8))->u8{let (true,n)=value;n}',
    'fn bad(value:(u8,u8))->u8{let (n,n)=value;n}',
    'fn bad(value:(u8,u8))->u8{let (n,)=value;n}',
    'fn bad(value:Option<(u8,u8)>)->u8{let (Some((n,_)))=value;n}',
    'fn bad(value:(Option<u8>,u8))->u8{let (Some(n),_)=value;n}',
    'fn bad(value:((u8,u8),u8))->u8{let (aggregate,n)=value;n}',
    'fn bad(value:(String,u8))->u8{let (text,n)=value;n}',
    'fn bad(value:&(u8,u8))->u8{let (n,_)=value;n}',
    'fn bad(value:(u8,u8))->u8{let (mut n,_)=value;n}',
    'fn bad(value:(u8,u8))->u8{let (ref n,_)=value;0}',
    'fn bad(value:(u8,u8))->u8{let (n,..)=value;n}',
    'fn bad(value:(u8,u8))->u8{let all @ (n,_)=value;n}',
    'fn bad(value:(u8,u8))->u8{let (n,_):(u8,u8)=value;n}',
    'fn bad(value:(u8,u8))->u8{let (n,_)=(if true{return 1;}else{value});n}',
    'fn bad(value:Option<(u8,u8)>)->u8{let Some((n,_))=value else{return 0;};missing}',
  ])refuse(source);
});
