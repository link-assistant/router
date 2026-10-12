import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {translateProject,originalProjectMethodFieldEvidence} from '../project.mjs';
import {captureSourceModuleViews} from '../source-module-views.mjs';
import {extractImplDeclarations,lowerSharedMethodTokens,validCopyCertificate} from '../impl-resolver.mjs';
import {createMatchesMacroContext} from '../matches-macro-context.mjs';
import {createOriginalMethodTokenTransform} from '../source-method-transforms.mjs';
import {parseOriginalMethodTransform,originalMethodParsedFacts} from '../source-method-parser.mjs';
import {originalMethodSemantic,originalMethodSemanticFacts,relocateOriginalMethodSemantic} from '../source-method-admission.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';

const source='#[derive(Clone,Copy)]pub enum Kind{Ready,Waiting}pub struct Holder{value:Kind}impl Holder{pub fn read(&self)->Kind{self.value}pub fn number(&self)->u8{1}}pub fn make_ready()->Holder{Holder{value:Kind::Ready}}pub fn make_waiting()->Holder{Holder{value:Kind::Waiting}}pub fn get(v:&Holder)->Kind{v.read()}pub fn ready(v:Kind)->bool{matches!(v,Kind::Ready)}';
const project=text=>translateProject({entry:'src/lib.rs',paths:['src/lib.rs'],readSource:()=>text});
function origins() {
  const result=project(source),facade=result.checkedMethodDeclarations.find(entry=>entry.displayName==='Holder.read');
  assert.ok(facade,'the actual source Copy getter must be checked');
  return {result,facade,origin:originalProjectMethodFieldEvidence(facade)};
}
function parsedOriginal(text) {
  const sourceView=captureSourceModuleViews({source:text,sourcePath:'src/lib.rs'}).views[0];
  const context=createMatchesMacroContext({modules:[{file:'src/lib.rs',path:[],source:text,sourceView}]});
  const method=extractImplDeclarations(text,{sourcePath:'src/lib.rs',sourceView}).implementations[0].methods[0];
  return parseOriginalMethodTransform(createOriginalMethodTokenTransform(context,method,lowerSharedMethodTokens(method,['crate',...method.typePath])));
}
test('genuine checked project origin preserves actual Copy bytes and executes both targets',{timeout:30000},async()=>{
  const {result,facade,origin}=origins(),parsed=parseOriginalMethodTransform(origin.transform);
  assert.ok(Object.isFrozen(origin));assert.ok(Object.isFrozen(origin.token));assert.ok(Object.isFrozen(origin.fields));
  assert.ok(Object.isFrozen(facade.signature));assert.ok(Object.isFrozen(facade.signature.params));
  assert.equal(originalProjectMethodFieldEvidence(origin.token,origin.transform),origin);
  const field=origin.fields.find(entry=>entry.field==='value');assert.ok(field);assert.equal(validCopyCertificate(field.copyCertificate,field.copyCertificate.type),true);
  const semantic=originalMethodSemantic(parsed,{fieldEvidence:origin.token});
  for(const value of [semantic,relocateOriginalMethodSemantic(semantic,10)]){
    const proof=value.params[0].type.rustReference.pointee.rustSharedFieldCopies.find(entry=>entry.field==='value').copyCertificate;
    assert.equal(JSON.stringify(proof),JSON.stringify(field.copyCertificate));assert.equal(validCopyCertificate(proof,proof.type),true);
    assert.equal(value.sourceMethodProof.copyAuthority,false);assert.equal(value.sourceMethodProof.runtimeParity,false);originalMethodSemanticFacts(value);
  }
  assert.throws(()=>{field.copyCertificate.verified=false;},TypeError);
  await verifyTypedTargets(result,api=>{
    assert.equal(api.ready(api.get(api.make_ready())),true);
    assert.equal(api.ready(api.get(api.make_waiting())),false);
    const ready=Object.freeze({$: 'Holder',value:Object.freeze({$: 'Ready'})});
    const unproved=Object.freeze({$: 'Holder',value:Object.freeze({$: 'Unproved'})});
    assert.equal(api.ready(api.get(ready)),true);
    assert.throws(()=>api.get(unproved),TypeError);
    assert.throws(()=>api.ready(api.get({$: 'Holder',value:{$: 'Ready'}})),/Copy receiver requires immutable/);
  });
});
test('public resealed nominal certificates cannot admit an original non-Copy field move',()=>{
  const text='struct Payload{n:u8}struct Holder{value:Payload}impl Holder{fn take(&self)->Payload{self.value}}pub fn bad(v:Holder)->Payload{v.take()}',result=project(text),parsed=parsedOriginal(text);
  assert.equal(result.meta.checkedMethods.some(entry=>entry.name==='Holder.take'),false);assert.equal(result.meta.executable.some(entry=>entry.name==='bad'),false);
  assert.ok(result.meta.refused.some(entry=>entry.term==='method'));
  const evidence={version:1,profile:'checked-rust-copy-layout-v1',type:{kind:'data',name:'Payload'},verified:true,proofs:[],diagnostics:[],obligations:[]};
  const certificate={...evidence,digest:createHash('sha256').update(JSON.stringify(evidence)).digest('hex')};
  // Integrity succeeds: the denial must therefore come from producer identity.
  assert.equal(validCopyCertificate(certificate,evidence.type),true);
  assert.throws(()=>originalMethodSemantic(parsed,{fieldCertificates:[{ctor:'Holder',field:'value',copyCertificate:certificate}]}),/caller fieldCertificates/);
  assert.throws(()=>originalMethodSemantic(parsed,{fieldEvidence:Object.freeze({schema:'original-project-method-field-evidence-v1'})}),/unissued|fabricated/);
});
test('a real token is confined to its exact genuine transform and cannot be cloned or resealed',()=>{
  const {result,facade,origin}=origins(),other=result.checkedMethodDeclarations.find(entry=>entry.displayName==='Holder.number');assert.ok(other);
  const second=originalProjectMethodFieldEvidence(other),parsed=parseOriginalMethodTransform(second.transform);
  assert.notEqual(origin.transform,second.transform);
  assert.throws(()=>originalProjectMethodFieldEvidence(origin.token,second.transform),/another genuine transform/);
  assert.throws(()=>originalMethodSemantic(parsed,{fieldEvidence:origin.token}),/another genuine transform/);
  assert.throws(()=>originalProjectMethodFieldEvidence({...facade}),/facade.*unissued/);
  assert.throws(()=>originalProjectMethodFieldEvidence(structuredClone(origin.token),origin.transform),/unissued|fabricated/);
  assert.throws(()=>originalProjectMethodFieldEvidence(origin.token,structuredClone(origin.transform)),/another genuine transform/);
  assert.throws(()=>originalMethodSemantic(parsed,{fieldEvidence:structuredClone(second.token)}),/unissued|fabricated/);
  assert.equal(originalProjectMethodFieldEvidence(facade),origin);
});
test('facade token and option getters or proxies fail private validation before any callback',()=>{
  const {origin}=origins(),parsed=parseOriginalMethodTransform(origin.transform);let calls=0;
  const options={};Object.defineProperty(options,'fieldEvidence',{enumerable:true,get(){calls++;return origin.token;}});
  assert.throws(()=>originalMethodSemantic(parsed,options),/accessor/);
  const handler={get(){calls++;throw Error('get invoked');},ownKeys(){calls++;throw Error('ownKeys invoked');},getPrototypeOf(){calls++;throw Error('prototype invoked');}};
  assert.throws(()=>originalMethodSemantic(parsed,new Proxy({},handler)),/non-proxy/);
  assert.throws(()=>originalMethodSemantic(parsed,{fieldEvidence:new Proxy(origin.token,handler)}),/unissued|fabricated/);
  const facade={};Object.defineProperty(facade,'token',{get(){calls++;return origin.token;}});
  assert.throws(()=>originalProjectMethodFieldEvidence(facade),/facade.*unissued/);
  assert.throws(()=>originalProjectMethodFieldEvidence(new Proxy({},handler)),/facade.*unissued/);
  assert.throws(()=>originalProjectMethodFieldEvidence(new Proxy(origin.token,handler),origin.transform),/unissued|fabricated/);
  assert.equal(calls,0);
});
test('private field origin rechecks its complete actual parsed source association',()=>{
  const {origin}=origins(),parsed=parseOriginalMethodTransform(origin.transform),surface=originalMethodSemantic(parsed,{fieldEvidence:origin.token});
  const capture=originalMethodParsedFacts(parsed),body=capture.entry.body;
  capture.entry.body={k:'lit',value:0n,span:body.span};
  try{assert.throws(()=>originalMethodSemanticFacts(surface),/body\/signature\/source namespace changed/);}finally{capture.entry.body=body;}
  originalMethodSemanticFacts(surface);
});
test('fresh processes import the actual project admission Host and parser without initialization cycles',{timeout:30000},()=>{
  for(const path of ['../project.mjs','../source-method-admission.mjs','../extensions/host-contracts.mjs','../source-method-parser.mjs']){
    const url=new URL(path,import.meta.url).href;
    const output=execFileSync(process.execPath,['--input-type=module','-e',`await import(${JSON.stringify(url)});process.stdout.write('original-import-ok');`],{encoding:'utf8',timeout:5000});
    assert.equal(output,'original-import-ok',path);
  }
});
