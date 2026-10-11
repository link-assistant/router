import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,readFileSync,rmSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {pathToFileURL} from 'node:url';
import {translateProject} from '../project.mjs';
import {translateSource} from '../translate.mjs';
import {sourceItems} from '../rust-structure.mjs';
import {extractImplDeclarations} from '../impl-resolver.mjs';
import {writeRuntimeAssets} from './artifact-loader.mjs';
import {assertImmutableCopy} from '../extensions/copy-runtime.mjs';
const project=files=>translateProject({entry:'src/lib.rs',paths:Object.keys(files),readSource:path=>files[path]});
async function artifacts(result,operation){
  assert.deepEqual(result.meta.refused,[]);
  const directory=mkdtempSync(join(tmpdir(),'router-copy-meta-'));
  try{writeRuntimeAssets(directory);const js=join(directory,'src/fixture.mjs'),ts=join(directory,'src/fixture.ts');writeFileSync(js,result.javascript);writeFileSync(ts,result.typescript);execFileSync(process.execPath,['--check',js],{encoding:'utf8'});
    execFileSync(process.env.ROUTER_TRANSLATION_TSC??'tsc',['--strict','--target','ES2022','--module','NodeNext','--moduleResolution','NodeNext','--outDir',join(directory,'compiled'),ts],{encoding:'utf8'});
    for(const path of [js,join(directory,'compiled/fixture.js')])operation((await import(pathToFileURL(path).href)).translated);
  }finally{rmSync(directory,{recursive:true,force:true});}
}
test('original consuming FailureKind.message checks its original enum, constant and const method',async()=>{
  const source=readFileSync(new URL('../../../src/stream_termination.rs',import.meta.url),'utf8');
  const items=sourceItems(source),enumItem=items.find(item=>item.term==='enum'&&item.name==='FailureKind'),constant=items.find(item=>item.term==='const'&&item.name==='INCOMPLETE_STREAM_MESSAGE');
  const method=extractImplDeclarations(source).implementations.find(impl=>impl.typePath.join('.')==='FailureKind').methods.find(method=>method.name==='message');
  const result=project({'src/lib.rs':[source.slice(enumItem.start,enumItem.end),source.slice(constant.start,constant.end),'impl FailureKind { '+source.slice(method.span.start,method.span.end)+' }','pub fn message(kind:FailureKind)->&\'static str{kind.message()}'].join('\n')});
  assert.equal(result.meta.checkedMethods.length,1);assert.equal(result.meta.checkedMethods[0].receiver,'value');
  const declarations=new Map(result.meta.checkedSemanticProgram.program.declarations.$map),entry=[...declarations.values()].find(entry=>entry.impl?.method==='message');
  assert.equal(entry.constFunction,true);assert.equal(entry.impl.copyCertificate.verified,true);assert.equal(entry.params[0].copyReceiver,true);
  const draft=translateSource('pub fn message(kind:FailureKind)->&\'static str{kind.message()}', 'src/lib.rs');assert.equal(draft.ir.counts.executableFunctions,0);
  for(const entry of result.executableDeclarations.filter(entry=>entry.name==='message'))assert.ok(entry.lower().emitted.text.includes('ml_assert_immutable_copy'));
  await artifacts(result,api=>{
    for(const [kind,message] of [['Stalled','upstream stream stalled past the idle timeout before completion'],['Interrupted','upstream stream was interrupted before completion'],['Truncated','upstream stream ended before completion']])assert.equal(api.message(Object.freeze({$:kind})),message);
    assert.throws(()=>api.message({$:'Stalled'}),TypeError);let observed=0;const proxy=new Proxy(Object.freeze({$:'Stalled'}),{ownKeys(){observed++;return ['$'];}});assert.throws(()=>api.message(proxy),TypeError);assert.equal(observed,0);assert.throws(()=>api.message(Object.freeze({$:'Wrong'})),TypeError);
  });
});
test('nested Copy fields and method callers keep immutable receiver identity',async()=>{
  const result=project({'src/lib.rs':'mod inner; pub fn run(value:inner::Outer)->u8{value.read()}', 'src/inner.rs':'#[derive(Clone,Copy)] pub struct Inner {pub value:u8} #[derive(Clone,Copy)] pub struct Outer {pub item:Inner} impl Outer {pub fn read(self)->u8{self.item.value}}'});
  await artifacts(result,api=>{
    const inner=Object.freeze({$:'Inner',value:7n}),outer=Object.freeze({$:'Outer',item:inner});assert.equal(api.run(outer),7n);assert.equal(outer.item,inner);
    assert.throws(()=>api.run(Object.freeze({$:'Outer',item:{$:'Inner',value:7n}})),TypeError);
  });
});
test('unproven consuming, owned-field and trait implementation obligations stay refused',()=>{
  for(const source of ['struct Kind(u8);','#[derive(Clone,Copy)] struct Kind(Box<u8>);','#[derive(Clone,Copy)] struct Kind(Vec<u8>);','#[derive(Clone,Copy)] struct Kind(String);']){
    const result=project({'src/lib.rs':source+' impl Kind {fn read(self)->u8{1}} pub fn invented(v:Kind)->u8{v.read()}'});assert.equal(result.meta.executable.some(item=>item.name==='invented'),false,source);
  }
  for(const extra of ['impl Drop for Kind {fn drop(&mut self){}}','impl Drop for Missing {fn drop(&mut self){}}','use custom::Copy;','macro_rules! Copy {()=>{}}']){
    const result=project({'src/lib.rs':extra+' #[derive(Clone,Copy)] enum Kind{A} impl Kind {fn read(self)->u8{1}} pub fn invented(v:Kind)->u8{v.read()}'});assert.equal(result.meta.executable.some(item=>item.name==='invented'),false,extra);
  }
});
test('Copy runtime rejects proxies and accessors without observing their traps',()=>{
  let observed=0;const proxy=new Proxy(Object.freeze({$:'A'}),{ownKeys(){observed++;return ['$'];}});assert.throws(()=>assertImmutableCopy(proxy),TypeError);assert.equal(observed,0);
  const getter=Object.freeze(Object.defineProperty({},'value',{get(){observed++;return 1n;}}));assert.throws(()=>assertImmutableCopy(getter),TypeError);assert.equal(observed,0);
  const cycle={};cycle.value=cycle;Object.freeze(cycle);assert.throws(()=>assertImmutableCopy(cycle),TypeError);
  const shared=Object.freeze({$:'A'});assert.equal(assertImmutableCopy(Object.freeze({left:shared,right:shared})),true);
});
