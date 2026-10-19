import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {translateProject} from '../project.mjs';
import {annotateRuntimeTypes} from '../translate.mjs';
import {emitJavaScript} from '../extensions/host-contracts.mjs';
import {sourceItems} from '../rust-structure.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';
const root=new URL('../../../',import.meta.url),hash=value=>createHash('sha256').update(value).digest('hex');
const tag=($,fields={})=>Object.freeze({$,...fields}),some=field0=>tag('Some',{field0}),none=tag('None');
const project=source=>translateProject({entry:'src/lib.rs',paths:['src/lib.rs'],readSource:()=>source});

test('generic unwrap keeps string payload types through ASCII folds and equality',async()=>{
  const source='pub fn lower(value:Option<&str>)->String{value.unwrap_or("fallback").trim().to_ascii_lowercase()} pub fn upper(value:Option<&str>)->String{value.unwrap_or("fallback").to_ascii_uppercase()} pub fn equal(value:Option<&str>)->bool{value.unwrap_or("fallback").eq_ignore_ascii_case("FALLBACK")}';
  const result=project(source);assert.deepEqual(result.meta.refused,[]);
  await verifyTypedTargets(result,api=>{
    for(const [value,lower,upper,equal]of [[none,'fallback','FALLBACK',true],[some(' MiXeD 😀 É '),'mixed 😀 É',' MIXED 😀 É ',false],[some('FaLlBaCk'),'fallback','FALLBACK',true],[some(''),'','',false]]){assert.equal(api.lower(value),lower);assert.equal(api.upper(value),upper);assert.equal(api.equal(value),equal);}
  });
});

test('unchanged scalar and nominal unwrap preserve eager fallback and checked Copy payloads',async()=>{
  const source='pub fn number(value:Option<u8>)->u8{value.unwrap_or(7)} pub fn text(value:Result<&str,u8>)->String{value.unwrap_or("fallback").to_ascii_lowercase()} #[derive(Clone,Copy)]pub enum Mode{Ready,Paused} pub fn mode(value:Option<Mode>)->Mode{value.unwrap_or(Mode::Paused)} fn fallback()->u8{panic!("eager fallback")} pub fn eager(value:Option<u8>)->u8{value.unwrap_or(fallback())}';
  const result=project(source);
  assert.deepEqual(result.meta.refused,[]);
  assert.equal(result.meta.executable.some(item=>item.name==='mode'),true);
  assert.equal(result.meta.sources[0].sha256,hash(source));
  await verifyTypedTargets(result,api=>{
    assert.equal(api.number(none),7n);assert.equal(api.number(some(0n)),0n);assert.equal(api.number(some(255n)),255n);
    assert.equal(api.text(tag('Ok',{field0:'ASCII É'})),'ascii É');assert.equal(api.text(tag('Err',{field0:9n})),'fallback');
    assert.deepEqual(api.mode(none),tag('Paused'));assert.deepEqual(api.mode(some(tag('Ready'))),tag('Ready'));
    assert.throws(()=>api.mode(some(tag('Unknown'))),TypeError);
    assert.throws(()=>api.eager(some(3n)),/eager fallback/);assert.throws(()=>api.eager(none),/eager fallback/);
  });
});

test('retained original login-provider semantic meta reemits both typed targets without body replacement',async()=>{
  const path='src/login_api.rs',source=readFileSync(new URL(path,root),'utf8');
  assert.equal(hash(source),'b60b17c7777dc6c3fc6bfea570baed1f8d7adf40737f431a4cf7d04697ca55b0');
  const original=sourceItems(source).find(item=>item.term==='fn'&&item.name==='requested_provider');
  assert.deepEqual([original.start,original.end],[3154,3482]);assert.equal(hash(source.slice(original.start,original.end)),'32d5d1d8e9593906ae0e02ecf7c52227e3813bb6a46197f19b5e286ad9df729e');
  // Reemit committed semantic meta produced from the complete original crate.
  // This regression exercises target typing, not a new source-proof admission.
  const inventory=JSON.parse(execFileSync('git',['show','HEAD:tools/translation/meta/src/login_api.meta.json'],{cwd:root,encoding:'utf8',maxBuffer:2_000_000}));
  assert.equal(inventory.sourceSha256,hash(source));const retained=inventory.items.find(item=>item.name==='requested_provider');
  assert.equal(retained.status,'executable');assert.equal(retained.sha256,hash(source.slice(original.start,original.end)));
  const semantic=retained.semantic,entries=[...semantic.dataTypes,semantic.checkedIR],declarations=new Map(entries.map(entry=>[entry.fullName??entry.name,entry]));
  const emitted=emitJavaScript({language:'Rust',declarations,items:entries,main:null},{runtimeModule:'../runtime/effects.mjs'});
  const target=emitted.mappings.find(mapping=>mapping.kind==='function'&&mapping.source===semantic.checkedIR.fullName)?.target;assert.ok(target);
  const params=new Map([[target,semantic.params]]),returns=new Map([[target,semantic.returns]]),alias=`\nexport const translated={requested_provider:${target}};`;
  const result={meta:{entry:path},javascript:emitted.text+alias,typescript:annotateRuntimeTypes(emitted.text,params,semantic.dataTypes,returns)+alias};
  await verifyTypedTargets(result,api=>{
    for(const [value,name]of [[none,'Claude'],[some('CLAUDE'),'Claude'],[some('  codex  '),'Codex'],[some('chatgpt'),null],[some('gemini'),null],[some(''),null],[some('ClAuDe😀'),null]])assert.deepEqual(api.requested_provider(value),name===null?none:some(tag(name)));
    assert.throws(()=>api.requested_provider(some(5n)),TypeError);
  });
});
