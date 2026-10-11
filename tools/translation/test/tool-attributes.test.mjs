import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {sourceItems} from '../rust-structure.mjs';
import {PRODUCTION_PROFILE} from '../cfg-profile.mjs';
import {resolveModuleBindings} from '../module-bindings.mjs';
import {translateProject} from '../project.mjs';
import {HostRustParser} from '../extensions/host-contracts.mjs';
import {tokenizeRust} from '../extensions/lexical.mjs';
import {createToolAttributeContext,isToolAttributeCertificate,isToolAttributeContext,toolAttributeAt,inertInnerLintItem} from '../tool-attributes.mjs';
import {configureToolAttributes} from '../tool-attribute-layout.mjs';
import {deriveDependencyProfile} from '../derive-dependencies.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';
const hash=value=>createHash('sha256').update(value).digest('hex');
const module=source=>({file:'src/lib.rs',path:[],source,items:sourceItems(source)});
const context=source=>createToolAttributeContext({modules:[module(source)],compilationProfile:PRODUCTION_PROFILE});
const project=source=>translateProject({entry:'src/lib.rs',paths:['src/lib.rs'],readSource:()=>source,compilationProfile:PRODUCTION_PROFILE});

test('original tool-prelude ownership narrows only source-sealed outer attributes',()=>{
  const source='#[rustfmt::skip] pub fn value(v:u8)->u8{v}',original=module(source),proof=context(source),item=original.items[0];
  assert.equal(resolveModuleBindings({modules:[original]}).scopes[0].unresolvedTypeScope,true);
  assert.equal(isToolAttributeContext(proof),true);assert.equal(isToolAttributeContext(structuredClone(proof)),false);
  assert.equal(proof.certificates.length,1);assert.equal(isToolAttributeCertificate(proof.certificates[0]),true);assert.equal(isToolAttributeCertificate(structuredClone(proof.certificates[0])),false);
  assert.equal(proof.certificates[0].sourceSha256,hash(source));assert.equal(proof.certificates[0].sourceInputsVerified,true);
  const bound=resolveModuleBindings({modules:[original],toolContext:proof,compilationProfile:PRODUCTION_PROFILE});
  assert.equal(bound.scopes[0].unresolvedTypeScope,false);assert.equal(bound.scopes[0].unresolvedAttributeMacroScope,false);
  assert.throws(()=>resolveModuleBindings({modules:[original],toolContext:structuredClone(proof)}),/Unsealed/);
  assert.throws(()=>toolAttributeAt(proof,{...original,source:source+' '},item,proof.certificates[0].attribute),/source mismatch/);
  assert.throws(()=>toolAttributeAt(proof,{...original,path:['forged']},item,proof.certificates[0].attribute),/source mismatch/);
});

test('unchanged tool and inner lint tokens accompany typed execution',{timeout:30_000},async()=>{
  const source='#![allow(dead_code,clippy::float_cmp)]\n#[rustfmt::skip] pub fn value(v:u8)->u8{v}',result=project(source);
  assert.deepEqual(result.meta.refused,[]);assert.equal(result.meta.sources[0].sha256,hash(source));
  const cert=result.meta.toolAttributeFootprints.certificates[0];assert.equal(source.slice(cert.attribute.span.start,cert.attribute.span.end),'#[rustfmt::skip]');
  const serialized=JSON.stringify(result.meta.checkedSemanticProgram);assert.match(serialized,/toolAttributeProof/);assert.match(serialized,/rustfmt/);
  await verifyTypedTargets(result,api=>{assert.equal(api.value(7n),7n);assert.throws(()=>api.value(256n),RangeError);});
});

test('parser consumption requires original token capture and exact attribute spans',()=>{
  const source='#[rustfmt::skip] pub fn value()->u8{7}',original=module(source),item=original.items[0],proof=context(source);
  const parser=new HostRustParser(tokenizeRust(source));configureToolAttributes(parser,proof,original,item,source);
  const attrs=parser.attributes();assert.equal(attrs[0].kind,'tool');assert.deepEqual(attrs[0].tokens,['#','[','rustfmt','::','skip',']']);
  assert.throws(()=>configureToolAttributes(new HostRustParser(structuredClone(tokenizeRust(source))),proof,original,item,source),/tokenizer source/);
  assert.throws(()=>configureToolAttributes(new HostRustParser(tokenizeRust(source+' ')),proof,original,item,source+' '),/mismatched/);
  const changed=new HostRustParser(tokenizeRust(source));configureToolAttributes(changed,proof,original,item,source);changed.cursor.tokens[2]={...changed.cursor.tokens[2],value:'other'};
  assert.throws(()=>changed.attributes(),error=>error instanceof TypeError&&/tokenizer tokens changed before parsing/.test(error.message));
});

test('tool shadows, disabled preludes, unknown expansion and non-profile inputs stay refused',()=>{
  for(const source of [
    'mod rustfmt{} #[rustfmt::skip] pub fn bad()->u8{7}',
    'use unknown::rustfmt; #[rustfmt::skip] pub fn bad()->u8{7}',
    'use unknown::*; #[rustfmt::skip] pub fn bad()->u8{7}',
    '#![no_implicit_prelude] #[rustfmt::skip] pub fn bad()->u8{7}',
    '#[unknown] pub struct Carrier; #[rustfmt::skip] pub fn bad()->u8{7}',
    'make_items!(); #[rustfmt::skip] pub fn bad()->u8{7}',
    '#[cfg(unix)] mod rustfmt; #[rustfmt::skip] pub fn bad()->u8{7}',
    '#[rustfmt::skip()] pub fn bad()->u8{7}',
    '#[rustfmt::other] pub fn bad()->u8{7}',
  ]){const result=project(source);assert.equal(result.meta.executable.some(item=>item.name==='bad'),false,source);assert.equal(context(source).certificates.length,0,source);}
  const orphan={file:'src/child.rs',path:['child'],source:'#[rustfmt::skip] pub fn bad()->u8{7}'};
  assert.equal(createToolAttributeContext({modules:[orphan]}).certificates.length,0);
});

test('an unrelated conditional module cannot shadow the independently resolved tool prefix',{timeout:30_000},async()=>{
  const source='#[cfg(unix)] mod uncertain; #[rustfmt::skip] pub fn good()->u8{7}',result=project(source);
  assert.equal(result.meta.toolAttributeFootprints.certificates.length,1);assert.equal(result.meta.bindingEvidence.scopes[0].bindings.find(binding=>binding.name==='uncertain').status,'unresolved');
  assert.ok(result.meta.executable.some(item=>item.name==='good'));assert.ok(result.meta.moduleDiagnostics.length);
  await verifyTypedTargets(result,api=>assert.equal(api.good(),7n));
});

test('inner lint scope uses original bounded builtin syntax and retains conflicting macro owners',()=>{
  for(const source of ['#![allow()]','#![warn(dead_code,clippy::float_cmp,)]','#![deny(dead_code)]','#![forbid(unsafe_code)]'])assert.ok(inertInnerLintItem(module(source).items[0],source),source);
  for(const source of ['#![allow(helper!())]','#![allow(dead_code,,unused)]','#![allow(dead_code,reason="why")]','#![unknown(dead_code)]','#![no_implicit_prelude]'])assert.equal(inertInnerLintItem(module(source).items[0],source),null,source);
  const source='#![allow(dead_code)] use custom::allow; pub fn value()->u8{7}';
  const result=resolveModuleBindings({modules:[module(source)],externalModules:new Map([['custom',{complete:false,bindings:[{name:'allow',namespace:'macro',macroKind:'attribute',target:['custom','allow'],kind:'macro'}]}]])});
  assert.equal(result.scopes[0].unresolvedTypeScope,true);assert.ok(result.diagnostics.some(item=>/conflicting source macro owner/.test(item.message)));
  const actual='#![allow(dead_code)]',fake={...module(actual).items[0],start:0,end:actual.length};
  assert.equal(inertInnerLintItem(fake,'#[unknown] struct A;'),null);
});

test('actual builtin root lints retain independently locked derive namespace evidence',()=>{
  const source='#![allow(clippy::redundant_pub_crate)]\n#[derive(serde::Serialize)] pub struct Entry{value:u8} pub fn valid(value:u8)->u8{value}';
  const dependencies=deriveDependencyProfile({manifest:readFileSync(new URL('../../../Cargo.toml',import.meta.url),'utf8'),lock:readFileSync(new URL('../../../Cargo.lock',import.meta.url),'utf8')}).proof;
  const result=translateProject({entry:'src/lib.rs',paths:['src/lib.rs'],readSource:()=>source,deriveDependencies:dependencies,compilationProfile:PRODUCTION_PROFILE});
  assert.equal(result.meta.deriveNamespaceFootprints.certificates.length,1);assert.equal(result.meta.bindingEvidence.scopes[0].unresolvedTypeScope,false);assert.equal(result.meta.bindingEvidence.scopes[0].unresolvedBangMacroScope,true);
});

test('unchanged reverse-generated policy retains original tool syntax and executes its decimal status predicate',{timeout:30_000},async()=>{
  const path='src/generated_js_first/policy.rs',source=readFileSync(new URL('../../../'+path,import.meta.url),'utf8');assert.equal(hash(source),'c5d5cec07bf54be29de7beed707263256afa6ba1ee87c89695b237d5626f5673');
  const item=sourceItems(source).find(item=>item.name==='retryable_status');assert.deepEqual([item.start,item.end],[3019,3183]);assert.equal(hash(source.slice(item.start,item.end)),'ac6c63fc33f2cbac3f4749bf88eabab3f058238c99260d938ff462816584d2cc');
  const result=translateProject({entry:path,paths:[path],readSource:()=>source,compilationProfile:PRODUCTION_PROFILE});
  assert.ok(result.meta.executable.some(entry=>entry.name==='retryable_status'&&entry.span.start===item.start&&entry.span.end===item.end));
  const cert=result.meta.toolAttributeFootprints.certificates.find(proof=>proof.itemSpan.start===item.start);assert.equal(cert.sourceSha256,hash(source));
  await verifyTypedTargets(result,api=>{for(const [status,expected]of [[407,false],[408,true],[409,false],[429,true],[499,false],[500,true],[599,true],[600,false],[NaN,false],[Infinity,false]])assert.equal(api.retryable_status(status),expected);});
});
