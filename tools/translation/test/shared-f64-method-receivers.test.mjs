import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {translateProject} from '../project.mjs';
import {translateSource} from '../translate.mjs';
import {parseProgram} from '../semantic-meta.mjs';
import {sourceItems} from '../rust-structure.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';
import {sharedF64DereferenceSource} from '../extensions/shared-f64-method-source.mjs';
import {prepareSharedF64MethodReceivers} from '../prepare-shared-f64-method-receivers.mjs';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';

const compile=source=>translateProject({entry:'src/lib.rs',paths:['src/lib.rs'],readSource:()=>source});
const find=(node,predicate)=>{
 if(!node||typeof node!=='object')return null;
 if(predicate(node))return node;
 for(const [key,child]of Object.entries(node))if(!['type','span','dereferenceProof'].includes(key)){
  for(const value of Array.isArray(child)?child:[child]){const result=find(value,predicate);if(result)return result;}
 }
 return null;
};

test('shared primitive f64 inherent receivers copy each actual reference layer for JS and strict TS',{timeout:60000},async()=>{
 const source='pub fn finite(value:&f64)->bool{value.is_finite()}pub fn nan(value:&&f64)->bool{value.is_nan()}pub fn floor(value:&&f64)->f64{value.floor()}pub fn borrowed(value:f64)->bool{let reference=&value;reference.is_finite()}',result=compile(source);
 assert.deepEqual(result.meta.refused,[]);
 const checked=parseProgram(JSON.stringify(result.meta.checkedSemanticProgram));
 const dereference=find(checked.declarations.get('nan').body,node=>node.k==='routerPrimitiveDereference');
 assert.ok(dereference);assert.equal(dereference.sourceFeature,'inherent-f64-receiver-autoderef');
 assert.equal(dereference.type.rustReference,undefined);assert.equal(dereference.value.type.rustReference.kind,'shared');
 assert.equal(dereference.dereferenceProof.source.profile,'original-standard-shared-f64-inherent-receiver-v1');
 assert.equal(dereference.dereferenceProof.source.traitDispatchAuthority,false);
 assert.equal(sharedF64DereferenceSource(dereference).method,'is_nan');
 const originalProof=dereference.sourceSharedF64MethodScope;
 assert.equal(typeof originalProof,'string');
 for(const changed of [originalProof+' ',JSON.stringify({...JSON.parse(originalProof),method:'is_finite'})]){
  assert.throws(()=>sharedF64DereferenceSource({...dereference,sourceSharedF64MethodScope:changed}),/original visible-trait and prelude closure/);
 }
 assert.throws(()=>sharedF64DereferenceSource({...dereference,sourceMethod:'is_finite'}),/original visible-trait and prelude closure/);
 await verifyTypedTargets(result,api=>{
  for(const value of [NaN,Infinity,-Infinity,-0,0,Number.MIN_VALUE,-Number.MIN_VALUE,Number.MAX_VALUE,1.5,-2.5]){
   assert.equal(api.finite(value),Number.isFinite(value));assert.equal(api.borrowed(value),Number.isFinite(value));
   assert.equal(api.nan(value),Number.isNaN(value));assert.ok(Object.is(api.floor(value),Math.floor(value)));
  }
  let calls=0;const hostile={valueOf(){calls++;throw Error('conversion');}};
  for(const value of [null,undefined,1n,'1',new Number(1),hostile,true])assert.throws(()=>api.finite(value),TypeError);
  assert.equal(calls,0);
 },{childTimeoutMs:20000});
});

test('unchanged actual safe_number body admits its shared filter receiver in an independent small project',{timeout:60000},async()=>{
 const original=readFileSync(new URL('../../../rust/src/subscription_usage_normalize.rs',import.meta.url),'utf8');
 const item=sourceItems(original).find(row=>row.term==='fn'&&row.name==='safe_number');assert.ok(item);
 const body=original.slice(item.start,item.end);
 assert.equal(createHash('sha256').update(body).digest('hex'),'0f6e667a69815ab806ed7e03e1c225d5f0a720d5d8d6ad423ff1f2263d93b301');
 const source='use serde_json::Value;\n'+body+'\npub fn run(value:Option<&Value>)->Option<f64>{safe_number(value)}';
 const result=compile(source);assert.deepEqual(result.meta.refused,[]);assert.equal(result.meta.runtimeParity,false);
 const none=Object.freeze({$:'None'}),some=field0=>Object.freeze({$:'Some',field0});
 const number=field0=>Object.freeze({$:'Number',field0:Object.freeze({$:'Float',field0})});
 await verifyTypedTargets(result,api=>{
  assert.deepEqual(api.run(none),none);assert.deepEqual(api.run(some(Object.freeze({$:'Null'}))),none);
  for(const value of [-1,-Number.MIN_VALUE,-0.5])assert.deepEqual(api.run(some(number(value))),none);
  for(const value of [-0,0,Number.MIN_VALUE,Number.MAX_VALUE]){
   const actual=api.run(some(number(value)));assert.equal(actual.$,'Some');assert.ok(Object.is(actual.field0,value));
  }
 },{childTimeoutMs:20000});
});

test('shared inherent receiver effects run once and preserve thrown capability identity',{timeout:60000},async()=>{
 const source="fn receive<'a,'b>(value:&'a &'b f64)->&'a &'b f64{let ignored=std::fs::read_to_string(\"receiver\").is_ok();value}pub fn finite(value:&&f64)->bool{receive(value).is_finite()}",result=compile(source);
 assert.deepEqual(result.meta.refused,[]);
 await verifyTypedTargets(result,(api,_result,_module,{effects:{withEffectCapabilities}})=>{
  const calls=[],capability={fs:{sync:{readFileSync(path){calls.push(path);return new Uint8Array();}}}};
  assert.equal(withEffectCapabilities(capability,()=>api.finite(1.5)),true);assert.deepEqual(calls,['receiver']);
  const defect=new Error('actual capability defect'),broken={fs:{sync:{readFileSync(){throw defect;}}}};
  assert.throws(()=>withEffectCapabilities(broken,()=>api.finite(1.5)),error=>error===defect);
 },{childTimeoutMs:20000});
});

test('mutable generic nominal UFCS and unresolved receiver operations retain refusals',()=>{
 for(const source of [
  'fn bad(value:&mut f64)->bool{value.is_finite()}',
  'fn bad(value:&f32)->bool{value.is_finite()}',
  'fn bad<T>(value:&T)->bool{value.is_finite()}',
  'struct f64{n:u8}fn bad(value:&f64)->bool{value.is_finite()}',
  'fn bad(value:&f64)->bool{f64::is_finite(value)}',
  'fn bad(value:&f64)->bool{value.is_sign_negative()}',
  'fn bad(value:&f64)->f64{value}',
  "fn bad(value:&f64)->&'static f64{value}",
 ]){
  const result=translateSource(source);assert.equal(result.ir.items.map(row=>row.source).join(''),source);
  assert.equal(result.ir.items.find(row=>row.name==='bad')?.status,'carried',source);
 }
});

test('visible competing inherited anonymous and function-local traits retain refusal',()=>{
 for(const source of [
  'trait Rival{fn is_finite(self)->bool;}impl Rival for &f64{fn is_finite(self)->bool{false}}fn bad(value:&f64)->bool{value.is_finite()}',
  'mod traits{pub trait Rival{fn is_nan(self)->bool;}}use crate::traits::Rival as _;fn bad(value:&f64)->bool{value.is_nan()}',
  'trait Parent{fn floor(self)->f64;}trait Rival:Parent{}fn bad(value:&f64)->f64{value.floor()}',
  'use unknown::Rival;fn bad(value:&f64)->bool{value.is_finite()}',
  'fn bad(value:&f64)->bool{trait Rival{fn is_finite(self)->bool;}value.is_finite()}',
  'fn bad(value:&f64)->bool{use unknown::Rival as _;value.is_finite()}',
  '#![no_implicit_prelude]fn bad(value:&f64)->bool{value.is_finite()}',
 ]){
  const result=translateSource(source);assert.equal(result.ir.items.map(row=>row.source).join(''),source);
  assert.equal(result.ir.items.find(row=>row.name==='bad')?.status,'carried',source);
 }
 const unrelated='trait Unrelated{fn other(self)->bool;}pub fn finite(value:&f64)->bool{value.is_finite()}';
 assert.deepEqual(compile(unrelated).meta.refused.filter(row=>row.name==='finite'),[]);
});

test('existing named static string and fixed joint reference forms remain executable',{timeout:60000},async()=>{
 const source="pub fn static_float(value:&&'static f64)->f64{**value}pub fn static_fixed(value:&&'static u32)->u32{**value}pub fn named_float<'a>(value:&&'a f64)->f64{**value}pub fn named_fixed<'a>(value:&&'a u32)->u32{**value}pub fn text(value:&&'static str)->&'static str{*value}";
 const result=compile(source);assert.deepEqual(result.meta.refused,[]);
 await verifyTypedTargets(result,api=>{
  for(const value of [NaN,-0,Infinity,Number.MIN_VALUE]){
   assert.ok(Object.is(api.static_float(value),value));assert.ok(Object.is(api.named_float(value),value));
  }
  assert.equal(api.static_fixed(9n),9n);assert.equal(api.named_fixed(11n),11n);assert.equal(api.text('Ω😀'),'Ω😀');
 },{childTimeoutMs:20000});
});

test('complete receiver source proposal retains both CST phases inverses and fresh native bindings',{timeout:60000},()=>{
 const plan=prepareSharedF64MethodReceivers();assert.equal(plan.typescriptVersion,'5.9.3');assert.equal(plan.files.length,5);
 assert.equal(plan.productionExecutableGain,0);assert.equal(plan.receivingQualified,false);assert.equal(plan.semanticAuthority,false);
 assert.equal(plan.files.filter(row=>row.before!==row.after).length,2);
 for(const row of plan.files){
  assert.equal(row.current,row.after);assert.equal(row.equation.inverse,row.before);
  assert.deepEqual(row.equation.stages.map(stage=>stage.phase),['language','repository']);
  for(const stage of row.equation.stages){
   assert.equal(stage.inverse,stage.before);assert.equal(transportConcreteSyntaxMeta(stage.beforeMeta).source,stage.before);
   assert.equal(transportConcreteSyntaxMeta(stage.afterMeta).source,stage.after);
  }
  assert.equal(row.nativeBindings.length,2);assert.ok(row.nativeBindings.every(binding=>binding.nativeSemanticScopeChecked&&binding.typescriptVersion==='5.9.3'));
 }
});
