import test from 'node:test';
import assert from 'node:assert/strict';
import {staticSourcePinnedOutputLimiterTextData} from './real-source-fixtures.mjs';
import {createHash} from 'node:crypto';
import {translateProject,originalProjectMethodFieldEvidence} from '../project.mjs';
import {registeredStandardHostBindings} from '../standard-host-bindings.mjs';
import {moduleScopeKey,captureSourceModuleViews} from '../source-module-views.mjs';
import {originalMethodTransformFacts,createOriginalMethodTokenTransform} from '../source-method-transforms.mjs';
import {createMatchesMacroContext,originalMethodParserNamespace} from '../matches-macro-context.mjs';
import {extractImplDeclarations,lowerSharedMethodTokens} from '../impl-resolver.mjs';
import {parseOriginalMethodTransform,originalMethodParsedFacts} from '../source-method-parser.mjs';
import {originalMethodSemantic,relocateOriginalMethodSemantic} from '../source-method-admission.mjs';
import {metadataDigest,copyMetadata,linkProjectMethodDeclaration} from '../extensions/source-links.mjs';
import {parseProgram} from '../semantic-meta.mjs';
import {PRODUCTION_PROFILE} from '../cfg-profile.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';
const hash=value=>createHash('sha256').update(value).digest('hex');
const project=files=>translateProject({entry:'src/lib.rs',paths:Object.keys(files),readSource:path=>files[path],compilationProfile:PRODUCTION_PROFILE});
const counter='pub struct Counter{value:u8}impl Counter{pub fn small(&self)->bool{matches!(self.value,1|2)}}pub fn run(value:u8)->bool{Counter{value}.small()}';
function sameOriginalScopes(result) {
  for(const facade of result.checkedMethodDeclarations){
    const origin=originalProjectMethodFieldEvidence(facade),state=originalMethodTransformFacts(origin.transform),namespace=originalMethodParserNamespace(state.context,state.method);
    const external=result.sourceScopes.find(row=>row.source===facade.source&&row.module.join('.')===state.member.modulePath.join('.'));
    assert.ok(external);assert.equal(metadataDigest(external.scope),origin.transform.owner.scopeMetadataSha256);
    assert.deepEqual(copyMetadata(external.scope),copyMetadata(namespace.scope));
    const outer=new Map(external.scopes.map(scope=>[moduleScopeKey(scope),scope]));
    assert.equal(outer.size,namespace.scopes.length);
    for(const scope of namespace.scopes)assert.deepEqual(copyMetadata(outer.get(moduleScopeKey(scope))),copyMetadata(scope),'complete scope including every binding');
  }
}
test('shared source registry keeps complete imported json scope identical to genuine original method capture',()=>{
  const registry=registeredStandardHostBindings();assert.ok([...registry.values()].every(table=>table.complete===false));
  const json=registry.get('serde_json').bindings.find(binding=>binding.namespace==='macro'&&binding.name==='json');assert.equal(json.macroKind,'bang');
  const result=project({'src/lib.rs':'use serde_json::json;'+counter});
  assert.ok(result.meta.checkedMethods.some(entry=>entry.name==='Counter.small'));sameOriginalScopes(result);
  const scope=result.sourceScopes[0].scope,binding=scope.bindings.find(row=>row.name==='json'&&row.namespace==='macro');assert.equal(binding.macroKind,'bang');assert.equal(binding.status,'resolved');
  assert.equal(result.meta.runtimeParity,false);assert.equal(result.sourceScopes[0].jsonParserProfile.parseAvailable,false);
});
test('import aliases and reexports retain actual original matches bodies in JavaScript and strict TypeScript',{timeout:30000},async()=>{
  for(const files of [
    {'src/lib.rs':'use serde_json::json;'+counter},
    {'src/lib.rs':'use serde_json::json as unused_json;use std::matches as classify;'+counter.replace('matches!','classify!')},
    {'src/lib.rs':'mod macros;use crate::macros::emit as unused_json;use crate::macros::classify;'+counter.replace('matches!','classify!'),'src/macros.rs':'pub use serde_json::json as emit;pub use std::matches as classify;'},
  ]){
    const result=project(files);assert.ok(result.meta.checkedMethods.some(entry=>entry.name==='Counter.small'));assert.ok(result.meta.executable.some(entry=>entry.name==='run'));sameOriginalScopes(result);
    const method=result.checkedMethodDeclarations.find(entry=>entry.displayName==='Counter.small');assert.equal(method.sourceSha256,hash(files[method.source]));assert.equal(files[method.source].slice(method.span.start,method.span.end).includes('self.value,1|2'),true);
    await verifyTypedTargets(result,api=>{for(const [value,expected]of [[0n,false],[1n,true],[2n,true],[3n,false],[255n,false]])assert.equal(api.run(value),expected);assert.throws(()=>api.run(256n),RangeError);});
  }
});
test('full unchanged output limiter selectors with imported json preserve actual source spans and execute both targets',{timeout:30000},async()=>{
  const original=staticSourcePinnedOutputLimiterTextData(),source=original.source('src/output_limit.rs');assert.equal(hash(source),'b165be6e33444a5811b33e52567de74ca144e7208a24c161b231bd332cf899e0');
  const result=translateProject({entry:'src/output_limit.rs',paths:['src/output_limit.rs'],readSource:()=>source,compilationProfile:PRODUCTION_PROFILE});
  const pins=[['enabled',1823,1915,'6bb8ce48f8bf04239125d9b8c97f3fa4b63b37fce5bad7d15c5cf21e06f9bc86'],['stopped',1976,2056,'9d994a646a6c30f823325bb81a3a8a788005d5305fcbaa4479eff892d3590651']];
  const target=parseProgram(JSON.stringify(result.meta.targetSemanticProgram)),exports=[];
  const limiter=[...target.declarations.values()].find(entry=>entry.k==='data'&&entry.ctors.some(ctor=>ctor.name==='OutputTokenLimiter'));
  const remaining=limiter.ctors.find(ctor=>ctor.name==='OutputTokenLimiter').fields.find(field=>field.name==='remaining');
  assert.equal(remaining.type.kind,'data');const option=target.declarations.get(remaining.type.name);
  assert.equal(option.standardGeneric.kind,'Option');assert.equal(option.standardGeneric.arguments[0].kind,'fixed');assert.equal(option.standardGeneric.arguments[0].rustPrimitiveName,'u64');assert.equal(option.standardGeneric.arguments[0].bits,64);assert.equal(option.standardGeneric.arguments[0].signed,false);
  assert.deepEqual(option.ctors.find(ctor=>ctor.name==='Some').fields.map(field=>field.name),['field0']);
  assert.equal(option.ctors.find(ctor=>ctor.name==='None').fields.length,0);
  for(const [name,start,end,digest]of pins){
    assert.equal(hash(source.slice(start,end)),digest);const facade=result.checkedMethodDeclarations.find(entry=>entry.displayName==='OutputTokenLimiter.'+name);assert.ok(facade,name);assert.deepEqual(facade.span,{start,end});
    const own=[...target.declarations.values()].find(entry=>entry.impl?.method===name);assert.ok(own,name);exports.push(`${own.name} as original_${name}`);
  }
  sameOriginalScopes(result);assert.equal(result.meta.checkedMethods.some(entry=>entry.name==='OutputTokenLimiter.push'),false,'mutable receiver obligation is retained');assert.equal(result.meta.runtimeParity,false);
  const suffix='\nexport {'+exports.join(',')+'};\n',artifact={...result,javascript:result.javascript+suffix,typescript:result.typescript+suffix};
  await verifyTypedTargets(artifact,(_api,_result,module)=>{
    for(const [remaining,stopped,enabled]of [[{$:'None'},false,false],[{$:'Some',field0:0n},false,true],[{$:'Some',field0:8n},true,true]]){
      const value=Object.freeze({$:'OutputTokenLimiter',remaining:Object.freeze(remaining),stopped});assert.equal(module.original_enabled(value),enabled);assert.equal(module.original_stopped(value),stopped);
    }
  });
});
test('custom macro owners duplicate imports unknown globs and unknown cfg keep genuine denials',()=>{
  for(const source of [
    'use serde_json::json;macro_rules! matches{($($tokens:tt)*)=>{true}}'+counter,
    'use serde_json::json;use unknown::*;'+counter,
    'use serde_json::json;macro_rules! classify{($($tokens:tt)*)=>{true}}use std::matches as classify;'+counter.replace('matches!','classify!'),
    'use serde_json::json;'+counter.replace('impl Counter','#[cfg(unix)]impl Counter'),
  ]){
    const result=project({'src/lib.rs':source});assert.equal(result.meta.executable.some(entry=>entry.name==='run'),false,source);assert.equal(result.meta.checkedMethods.some(entry=>entry.name==='Counter.small'),false,source);assert.ok(result.meta.refused.length,source);
  }
});
test('a source-local json bang macro can coexist unused while its unproved expansion stays refused',{timeout:30000},async()=>{
  const source='macro_rules! json{($($tokens:tt)*)=>{false}}'+counter,result=project({'src/lib.rs':source});
  assert.ok(result.meta.checkedMethods.some(entry=>entry.name==='Counter.small'));sameOriginalScopes(result);
  await verifyTypedTargets(result,api=>{assert.equal(api.run(1n),true);assert.equal(api.run(3n),false);});
  const invoked=project({'src/lib.rs':'macro_rules! json{($($tokens:tt)*)=>{false}}struct Counter;impl Counter{fn custom(&self)->bool{json!()}}pub fn run(v:Counter)->bool{v.custom()}'});
  assert.equal(invoked.meta.checkedMethods.some(entry=>entry.name==='Counter.custom'),false);assert.equal(invoked.meta.executable.some(entry=>entry.name==='run'),false);
});
test('scope corruption diagnostic names original member and binding key without accepting caller evidence or getters',()=>{
  const source='use serde_json::json;struct Counter{value:u8}impl Counter{fn read(&self)->u8{self.value}}',sourceView=captureSourceModuleViews({source,sourcePath:'src/lib.rs',compilationProfile:PRODUCTION_PROFILE}).views[0],module={file:'src/lib.rs',path:[],source,sourceView,compilationProfile:PRODUCTION_PROFILE};
  const context=createMatchesMacroContext({modules:[module],compilationProfile:PRODUCTION_PROFILE}),method=extractImplDeclarations(source,{sourcePath:module.file,sourceView,compilationProfile:PRODUCTION_PROFILE}).implementations[0].methods[0],transform=createOriginalMethodTokenTransform(context,method,lowerSharedMethodTokens(method,['crate','Counter'])),parsed=parseOriginalMethodTransform(transform),capture=originalMethodParsedFacts(parsed),normalized=originalMethodSemantic(parsed),semantic=relocateOriginalMethodSemantic(normalized,0),scope=copyMetadata(originalMethodParserNamespace(context,method).scope);
  scope.bindings.find(binding=>binding.name==='json'&&binding.namespace==='macro').macroKind='unknown';
  const options={source,sourcePath:'src/lib.rs',memberSpan:method.span,bodySpan:method.bodySpan,scope:{bindingEvidence:scope,compilationProfile:PRODUCTION_PROFILE}};
  assert.throws(()=>linkProjectMethodDeclaration(capture.parser,parsed.entry,normalized,semantic,options),error=>error instanceof TypeError&&error.message.includes('src/lib.rs')&&error.message.includes(`${method.span.start}..${method.span.end}`)&&error.message.includes('read')&&error.message.includes('json.macroKind'));
  let calls=0;const original=Object.getOwnPropertyDescriptor(capture.parser,'sourceNamespaceBindingEvidence');Object.defineProperty(capture.parser,'sourceNamespaceBindingEvidence',{configurable:true,get(){calls++;return new Map();}});
  try{assert.throws(()=>linkProjectMethodDeclaration(capture.parser,parsed.entry,normalized,semantic,options),/method binding scope differs/);assert.equal(calls,0);}finally{Object.defineProperty(capture.parser,'sourceNamespaceBindingEvidence',original);}
});
