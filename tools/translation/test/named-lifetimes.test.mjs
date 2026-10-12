import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {translateProject} from '../project.mjs';
import {HostRustParser,parseRust,checkProgram} from '../extensions/host-contracts.mjs';
import {tokenizeRust} from '../extensions/lexical.mjs';
import {sourceItems} from '../rust-structure.mjs';
import {verifyCohortTargets} from './cohort-targets.mjs';
const ORIGINAL_SOURCE_SHA='1eafa26a131345dc3ce171a3ec1cc6833a801a794ecc76d545bca3d96eacf09c';
const ORIGINAL_ITEM_SHA='69c0ed38eea80cf9a018362cdef6bc1414fd31b6da8c09b3cc078b4632207574';
const ORIGINAL_ITEM_SPAN={start:146,end:574};
const project=source=>translateProject({entry:'src/lib.rs',paths:['src/lib.rs'],readSource:()=>source});
const some=field0=>Object.freeze({$:'Some',field0});

test('actual named shared lifetimes preserve identity and borrow string values',{timeout:30000},async()=>{
  const result=project("pub fn echo<'a>(value:&'a str)->&'a str{value} pub fn local<'a>(value:&'a str)->&'a str{let held:&'a str=value;held}");
  assert.deepEqual(result.meta.refused,[]);
  const proof=result.meta.checkedSemanticProgram.items.find(item=>item.name==='echo').sourceLifetimeProof;
  assert.equal(proof.params[0][0].identity,proof.outputs[0].identity);
  await verifyCohortTargets(result,api=>{assert.equal(api.echo('Ω😀'),'Ω😀');assert.equal(api.local('leaf'),'leaf');});
});

test('one named input lifetime can occur in multiple parameters and elided output',{timeout:30000},async()=>{
  const result=project("pub fn choose<'a>(first:&'a str,second:&'a str,which:bool)->&str{if which{first}else{second}}");
  assert.deepEqual(result.meta.refused,[]);
  await verifyCohortTargets(result,api=>{assert.equal(api.choose('left','right',true),'left');assert.equal(api.choose('left','right',false),'right');});
});

test('nested Option and product outputs retain separate actual lifetime leaves',{timeout:30000},async()=>{
  const result=project("pub fn pair<'a,'b>(first:&'a str,second:&'b str)->(&'a str,&'b str){(first,second)} pub fn option<'a>(value:&'a str)->Option<&'a str>{Some(value)}");
  assert.deepEqual(result.meta.refused,[]);
  await verifyCohortTargets(result,api=>{assert.deepEqual(api.pair('a','b'),Object.freeze({$:'Tuple',field0:'a',field1:'b'}));assert.deepEqual(api.option('a'),some('a'));});
});

test('different named inputs and named local annotations cannot exchange borrow origins',()=>{
  for(const source of [
    "pub fn bad<'a,'b>(first:&'a str,second:&'b str)->&'a str{second}",
    "pub fn bad<'a,'b>(first:&'a str,second:&'b str)->u8{let held:&'a str=second;0}",
    "pub fn bad<'a>(first:&str)->&'a str{first}",
    "pub fn bad<'a>(first:&'a str)->&'static str{first}",
  ]) {const result=project(source);assert.equal(result.meta.executable.some(item=>item.name==='bad'),false,source);assert.ok(result.meta.refused.some(item=>item.name==='bad'&&/borrow|lifetime/.test(item.message)),source);}
});

test('call results retain every input constraint of an instantiated named lifetime',{timeout:30000},async()=>{
  const helper="fn second<'a>(first:&'a str,last:&'a str)->&'a str{last}";
  const bad=project(helper+"pub fn bad<'a,'b>(first:&'a str,last:&'b str)->&'a str{second(first,last)}");
  assert.equal(bad.meta.executable.some(item=>item.name==='bad'),false);
  assert.ok(bad.meta.refused.some(item=>item.name==='bad'&&/escaping source borrow/.test(item.message)));
  const good=project(helper+"pub fn good<'a>(first:&'a str,last:&'a str)->&'a str{second(first,last)}");
  assert.deepEqual(good.meta.refused,[]);
  await verifyCohortTargets(good,api=>assert.equal(api.good('first','last'),'last'));
});

test('shared fixed pointees retain named reference source tokens',{timeout:30000},async()=>{
  const result=project("pub fn echo<'a>(value:&'a u64)->&'a u64{value} pub fn copy<'a>(value:&'a u64)->u64{*value}");
  assert.deepEqual(result.meta.refused,[]);
  await verifyCohortTargets(result,api=>{assert.equal(api.echo(9n),9n);assert.equal(api.copy(9n),9n);});
});

test('undeclared names bounds generics mutation and forged syntax retain refusal',()=>{
  for(const source of [
    "pub fn bad(value:&'a str)->u8{0}","pub fn bad<'a>(value:&'b str)->u8{0}",
    "pub fn bad<'a,'a>(value:&'a str)->u8{0}","pub fn bad<'static>(value:&'static str)->u8{0}",
    "pub fn bad<'_>(value:&str)->u8{0}","pub fn bad<'a:'b,'b>(value:&'a str)->u8{0}",
    "pub fn bad<'a,T>(value:&'a str)->u8{0}","pub fn bad<'a>(value:&'a mut u64)->u8{0}",
    "pub fn bad<'a>(value:&'a str)->u8 where 'a:'static{0}",
  ]) {const result=project(source);assert.equal(result.meta.executable.some(item=>item.name==='bad'),false,source);assert.ok(result.meta.refused.some(item=>item.name==='bad'),source);}
  const surface=parseRust("fn echo<'a>(value:&'a str)->&'a str{value}fn main(){}");
  surface.items.find(item=>item.name==='echo').sourceLifetimeParameters.names[0]='b';
  assert.throws(()=>checkProgram(surface),/source capture|source binder|source function binder/);
});

test('named str borrows require primitive type identity despite nominal imports or unknown scopes',()=>{
  for(const prefix of [
    'pub struct str{pub value:u8}',
    'mod owner{pub struct Kind{pub value:u8}} use owner::Kind as str;',
    'use unknown::str;',
    'use unknown::*;',
  ]) {
    const source=prefix+" pub fn bad<'a>(value:&'a str)->&'a str{value}",result=project(source);
    assert.equal(result.meta.executable.some(item=>item.name==='bad'),false,source);
    assert.ok(result.meta.refused.some(item=>item.name==='bad'&&/shadowed borrowed str type/.test(item.message)),source);
  }
});

test('value-only str names preserve actual primitive named string borrows',{timeout:30000},async()=>{
  const result=project("pub fn str()->u8{7} pub fn echo<'a>(value:&'a str)->&'a str{value}");
  assert.deepEqual(result.meta.refused,[]);
  await verifyCohortTargets(result,api=>{assert.equal(api.str(),7n);assert.equal(api.echo('Ω😀'),'Ω😀');});
});

test('original OpenAI model function retains its complete named lifetime syntax',()=>{
  const source=readFileSync(new URL('../../../src/proxy_openai_resource.rs',import.meta.url),'utf8');
  assert.equal(createHash('sha256').update(source).digest('hex'),ORIGINAL_SOURCE_SHA);
  const original=sourceItems(source).find(item=>item.term==='fn'&&item.name==='canonical_openai_model');
  const text=source.slice(original.start,original.end),parser=new HostRustParser(tokenizeRust(text));
  parser.attributes();parser.visibility();const fn=parser.fn([]);
  assert.equal(fn.sourceLifetimeParameters.names.join(','),'a');
  assert.equal(fn.ret.rustBorrowLifetime.kind,'named:a');
  assert.equal(createHash('sha256').update(text).digest('hex'),ORIGINAL_ITEM_SHA);
  assert.deepEqual({start:original.start,end:original.end},ORIGINAL_ITEM_SPAN);
  // Syntax preservation supplies no provider enum dispatch or whole-runtime
  // authority. The full original graph still needs independent generation.
});
