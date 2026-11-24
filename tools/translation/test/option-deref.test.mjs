// SOURCE-ONLY DRAFT. All new cases are unrun until a coherent Gate window.
import test from 'node:test';
import assert from 'node:assert/strict';
import {optionStringAsDeref} from '../extensions/option-deref-runtime.mjs';
import {OPTION_DEREF_PROFILE} from '../extensions/option-deref.mjs';
import {translateProject} from '../project.mjs';
import {parseRust,checkProgram,emitJavaScript} from '../extensions/host-contracts.mjs';
import {bindCheckedSourceLinks,checkedSourceContext} from '../extensions/source-links.mjs';
import {PRODUCTION_PROFILE} from '../cfg-profile.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';
import {checkedDeclarationTargets} from './original-csv-context.mjs';
const some=field0=>Object.freeze({$:'Some',field0}),none=Object.freeze({$:'None'});
const project=source=>translateProject({entry:'src/lib.rs',paths:['src/lib.rs'],readSource:()=>source,compilationProfile:PRODUCTION_PROFILE});
test('pinned Option String Deref preserves None, empty String and Unicode scalar content',()=>{
  assert.equal(OPTION_DEREF_PROFILE.rust,'1.89.0');assert.equal(OPTION_DEREF_PROFILE.constEligible,false);
  assert.deepEqual(optionStringAsDeref(none),none);
  for(const value of ['','x','😀Ω','\0','\u0085\uFEFF'])assert.deepEqual(optionStringAsDeref(some(value)),some(value));
  for(const value of [some('\ud800'),some('\udfff'),some(new String('x')),some(1n)])assert.throws(()=>optionStringAsDeref(value),TypeError);
});
test('Option Deref rejects proxies, accessors, prototypes and fake variants without calling code',()=>{
  let reads=0;const proxy=new Proxy(some('x'),{get(){reads++;throw Error('get');},ownKeys(){reads++;throw Error('keys');},getPrototypeOf(){reads++;throw Error('prototype');}});
  assert.throws(()=>optionStringAsDeref(proxy),TypeError);assert.equal(reads,0);
  const accessor=Object.freeze({$: 'Some',get field0(){reads++;return 'x';}}),tag=Object.freeze({get $(){reads++;return 'None';}});
  for(const value of [accessor,tag,{$:'Some',field0:'x'},Object.freeze(Object.create(some('x'))),Object.freeze({$:'Other'}),Object.freeze({$:'None',field0:'x'}),Object.freeze({$:'Some',field0:'x',extra:1})])assert.throws(()=>optionStringAsDeref(value),TypeError);
  assert.equal(reads,0);
});
test('actual shared Option<String> receiver produces a borrowed result in both targets',{timeout:60_000},async()=>{
  const result=project('pub fn read(v:&Option<String>)->Option<&str>{v.as_deref()}pub fn explicit(v:&std::option::Option<String>)->std::option::Option<&str>{v.as_deref()}');assert.deepEqual(result.meta.refused,[]);
  await verifyTypedTargets(result,api=>{for(const name of ['read','explicit']){assert.deepEqual(api[name](none),none);for(const value of ['','secret','😀'])assert.deepEqual(api[name](some(value)),some(value));let reads=0;const proxy=new Proxy(some('secret'),{get(){reads++;throw Error('get');},ownKeys(){reads++;throw Error('keys');},getOwnPropertyDescriptor(){reads++;throw Error('descriptor');}});assert.throws(()=>api[name](proxy),TypeError);assert.equal(reads,0);}});
});
test('actual checked inherent method facade retains shared declaration type without a Rust wrapper',{timeout:60_000},async()=>{
  const result=project('struct Holder{value:Option<String>}impl Holder{fn view(&self)->Option<&str>{self.value.as_deref()}}');assert.deepEqual(result.meta.refused,[]);assert.equal(result.meta.executable.length,0);assert.equal(result.executableDeclarations.length,0);
  const method=result.checkedMethodDeclarations.find(entry=>entry.displayName==='Holder.view');assert.ok(method);assert.equal(method.term,'method');assert.equal(method.signature.params[0].type.rustReference.kind,'shared');assert.equal(method.signature.ret.rustStandardGeneric.arguments[0].rustOwnership.source,'str');
  await verifyTypedTargets(checkedDeclarationTargets(method),api=>{for(const value of [none,some(''),some('Ω')])assert.deepEqual(api.view(Object.freeze({$:'Holder',value})),value);});
});
test('owned temporaries, local String borrows, custom Option/Deref and unknown aliases remain carried',()=>{
  for(const source of [
    'pub fn bad(v:Option<String>)->Option<&str>{v.as_deref()}',
    'pub fn bad(v:Option<String>)->Option<&\'static str>{v.as_deref()}',
    'pub fn bad()->Option<&\'static str>{Some(String::from("temporary")).as_deref()}',
    'pub fn bad(v:&Option<String>)->Option<&\'static str>{v.as_deref()}',
    'pub fn bad(v:&Option<&String>)->Option<&str>{v.as_deref()}',
    'pub fn bad(v:&mut Option<String>)->Option<&str>{v.as_deref()}',
    'enum Option{None,Some(String)}pub fn bad(v:&Option)->std::option::Option<&str>{v.as_deref()}',
    'struct String{value:u8}pub fn bad(v:&Option<String>)->Option<&str>{v.as_deref()}',
    'struct Custom{value:u8}impl std::ops::Deref for Custom{type Target=str;fn deref(&self)->&str{"custom"}}pub fn bad(v:&Option<Custom>)->Option<&str>{v.as_deref()}',
    'use external::String as Text;pub fn bad(v:&Option<Text>)->Option<&str>{v.as_deref()}',
    'pub const fn bad(v:&Option<String>)->Option<&str>{v.as_deref()}',
  ]){const result=project(source);assert.ok(result.meta.refused.some(entry=>entry.name==='bad'),source);assert.equal(result.meta.executable.some(entry=>entry.name==='bad'),false,source);}
});
const find=(value,kind)=>{if(!value||typeof value!=='object')return null;if(value.k===kind)return value;for(const child of Object.values(value)){const result=find(child,kind);if(result)return result;}return null;};
test('checked-body freshness and actual shared proof survive only unchanged emission',()=>{
  const source='pub fn read(v:&Option<String>)->Option<&str>{v.as_deref()}fn main(){}',program=checkProgram(parseRust(source)),context=checkedSourceContext(program),node=find(program.declarations.get('read').body,'routerOptionAsDeref');assert.ok(node);
  node.optionDerefProof.receiver='invented-local-borrow';assert.throws(()=>bindCheckedSourceLinks(program,context,{targetProfile:{id:'option-freshness'}}),/changed before source binding/);assert.throws(()=>emitJavaScript(program),/missing checked standard shared Option/);
});
