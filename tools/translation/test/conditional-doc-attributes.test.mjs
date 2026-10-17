import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdirSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {itemConfiguration,isInertConditionalAttribute,isAbsentConditionalAttribute,compilationProfile,PRODUCTION_PROFILE} from '../cfg-profile.mjs';
import {inspectConditionalAttribute,conditionalLiteralDocEvidence,originalConditionalDocumentationInputs} from '../conditional-attributes.mjs';
import {rustTokens,sourceItems} from '../rust-structure.mjs';
import {resolveModuleGraph,translateProject} from '../project.mjs';
import {resolveModuleBindings} from '../module-bindings.mjs';
import {inspectDeriveInput} from '../derive-inputs.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';
const hash=value=>createHash('sha256').update(value).digest('hex');
const condition=(source,profile=PRODUCTION_PROFILE)=>itemConfiguration(rustTokens(source),profile);
const inspect=source=>inspectConditionalAttribute(rustTokens(source));
const retain=(name,value)=>{const directory=process.env.ROUTER_CONDITIONAL_DOC_VECTOR_DIR;if(directory){mkdirSync(directory,{recursive:true});writeFileSync(join(directory,name+'.json'),JSON.stringify(value,null,2)+'\n',{flag:'wx'});}};
const plain=value=>JSON.parse(JSON.stringify(value));

test('literal documentation rule rejoins the complete pinned builtin owners and original transcriptions',()=>{
 const inputs=originalConditionalDocumentationInputs();retain('01-full-originals',inputs);
 assert.equal(inputs.length,3);for(const input of inputs){assert.equal(Buffer.byteLength(input.source),input.bytes);assert.equal(hash(input.source),input.sha256);assert.equal(Object.isFrozen(input),true);}
 const source='cfg_attr(alloc_docs, doc = "λ😀", doc = r##"raw # text"##)',input=inspect(source),proof=conditionalLiteralDocEvidence(input);retain('01-private-inspection',{source,input,proof});
 assert.ok(proof);assert.equal(proof.languageRule,'rust.cfg-attr.literal-doc-alternatives.v1');assert.equal(proof.source.owners.doc.original.includes('NameValueStr: "string"'),true);assert.equal(proof.source.owners.cfgAttr.original.includes('predicate, attr1, attr2, ...'),true);
 for(const key of ['compilerBodiesExecuted','featureSelection','arbitraryAttributeExpansion','namespaceAuthority','runtimeAuthority'])assert.equal(proof.source[key],false,key);
 assert.equal(proof.predicateSelected,false);for(const key of ['callerOwnerResolved','callerScopeComplete','itemAvailabilityProved','inertConditionalAttribute','builtinLiteralNamespaceTransformation','builtinLiteralRuntimeTransformation'])assert.equal(proof[key],false,key);assert.equal(Object.isFrozen(proof.inputs[0].tokens),true);
 assert.equal(conditionalLiteralDocEvidence(structuredClone(input)),null);assert.equal(conditionalLiteralDocEvidence({...input}),null);assert.equal(conditionalLiteralDocEvidence(proof),null);
});

test('literal-doc candidates preserve all input and never choose an unresolved caller owner',()=>{
 const observations=[];
 for(const profile of [null,PRODUCTION_PROFILE,compilationProfile({flags:{alloc_docs:true}}),compilationProfile({flags:{alloc_docs:false}})]){
  const source='// 😀 before\n#[cfg_attr(alloc_docs, doc = "first", doc = r#"second"#,)] pub fn amount()->u8{7}',result=condition(source,profile),attribute=result.attributes[0];observations.push({source,profile,result});
  assert.equal(result.status,profile?.flags.alloc_docs===false?'active':'unknown');assert.equal(attribute.evaluation.predicate.value,profile?.flags.alloc_docs??null);assert.equal(attribute.evaluation.configurationSelected,profile?.flags.alloc_docs!==undefined);
  assert.equal(attribute.evaluation.expansion,profile?.flags.alloc_docs===false?'absent':'unresolved');assert.equal(isInertConditionalAttribute(attribute),profile?.flags.alloc_docs===false);assert.equal(isAbsentConditionalAttribute(attribute),profile?.flags.alloc_docs===false);assert.equal(isInertConditionalAttribute(structuredClone(attribute)),false);
  assert.equal(source.slice(attribute.span.start,attribute.span.end),'#[cfg_attr(alloc_docs, doc = "first", doc = r#"second"#,)]');assert.deepEqual(attribute.evaluation.inputs.map(input=>input.tokens),[['doc','=','"first"'],['doc','=','r#"second"#']]);assert.equal(attribute.evaluation.literalDocumentationCandidate.inputs.length,2);
 }
 retain('02-profiles-and-complete-inputs',observations);
});

test('mixed known lint and literal doc alternatives retain the original lint-only protocol',()=>{
 const source='#[cfg_attr(target_docs,allow(dead_code),doc="text",allow(unused_mut,))] pub struct Item;',result=condition(source),lint=condition('#[cfg_attr(target_docs,allow(dead_code),allow(unused_mut,))] pub struct Item;');retain('03-mixed-and-old-lint',{source,result,lint});
 assert.equal(result.status,'unknown');assert.equal(result.attributes[0].evaluation.expansion,'unresolved');assert.equal(result.attributes[0].evaluation.predicate.value,null);assert.equal(isInertConditionalAttribute(result.attributes[0]),false);assert.equal(result.attributes[0].evaluation.literalDocumentationCandidate.callerOwnerResolved,false);
 assert.equal(lint.status,'active');assert.equal(lint.attributes[0].evaluation.expansion,'inert-lint-alternatives');assert.equal(Object.hasOwn(lint.attributes[0].evaluation,'literalDocumentationCandidate'),false);
 assert.equal(conditionalLiteralDocEvidence(inspect('cfg_attr(target_docs,allow(dead_code))')),null);
});

test('arbitrary attributes macro expressions and no_std never gain literal-doc inertness',()=>{
 const inputs=['doc=include_str!("unread.md")','doc=concat!("x","y")','doc(hidden)','owner::doc="x"','doc="x",custom','doc="x",no_std','cfg_attr(nested,doc="x")','doc="x",derive(Clone)','doc=9','doc=true','doc=b"bytes"','doc="x"u8','doc="bad\\q"','doc="x" trailing'],observations=[];
 for(const input of inputs){const source=`#[cfg_attr(unknown,${input})] pub struct Item;`,result=condition(source);observations.push({source,result});assert.equal(result.status,'unknown',input);assert.equal(isInertConditionalAttribute(result.attributes[0]),false,input);assert.ok(result.diagnostics.length,input);}
 for(const source of ['#![cfg_attr(not(feature="std"),no_std)] pub fn value()->u8{7}','#![cfg_attr(x,doc="x",cfg_attr(y,custom))] pub fn value()->u8{7}']){const result=condition(source);observations.push({source,result});assert.equal(result.status,'unknown');assert.equal(isInertConditionalAttribute(result.attributes[0]),false);}
 retain('04-unresolved-alternatives',observations);
});

test('valid literal documentation never masks malformed cfg diagnostics or sibling effects',()=>{
 const observations=[];
 for(const predicate of ['custom(x)','not(x,)','all(x,,y)','true','false','feature=9','x trailing']){
  const source=`#[cfg_attr(${predicate},doc="x")] pub fn amount()->u8{7}`,result=condition(source);observations.push({source,result});assert.equal(result.status,'unknown',predicate);assert.ok(result.diagnostics.length,predicate);assert.equal(isInertConditionalAttribute(result.attributes[0]),false,predicate);
 }
 for(const [source,status]of [['#[cfg_attr(x,doc="x")] #[cfg(test)] pub fn amount()->u8{7}','inactive'],['#[cfg_attr(x,doc="x")] #[cfg(y)] pub fn amount()->u8{7}','unknown']]){const result=condition(source);observations.push({source,result});assert.equal(result.status,status);assert.equal(result.attributes[1].evaluation.value,status==='inactive'?false:null);}
 const source='#[cfg_attr(x,doc="x")] #[custom] pub struct Item;',bindings=resolveModuleBindings({modules:[{file:'src/lib.rs',path:[],source}],compilationProfile:PRODUCTION_PROFILE});assert.equal(bindings.scopes[0].unresolvedAttributeMacroScope,true);retain('05-diagnostics-and-siblings',{observations,source,bindings});
});

test('private inspection rejects changed source tokens copied flags getters and proxy attempts',()=>{
 const outcomes=[];
 for(const mutate of [input=>input.attributes[0].tokens[2]='"changed"',input=>input.predicate[0].text='different',input=>input.inertBuiltinLint=true,input=>input.attributes.push({tokens:['custom'],span:{start:0,end:1}})]){
  const input=inspect('cfg_attr(x,doc="original")');mutate(input);assert.throws(()=>conditionalLiteralDocEvidence(input),{name:'TypeError',message:'Conditional literal documentation inspection changed'});outcomes.push(plain(input));
 }
 const getter=inspect('cfg_attr(x,doc="x")');let reads=0;Object.defineProperty(getter,'attributes',{get(){reads++;return [];},enumerable:true});assert.throws(()=>conditionalLiteralDocEvidence(getter),TypeError);assert.equal(reads,0);
 const input=inspect('cfg_attr(x,doc="x")');let traps=0;const proxy=new Proxy(input,{get(){traps++;throw new Error('proxy get');},ownKeys(){traps++;throw new Error('proxy ownKeys');}});assert.equal(conditionalLiteralDocEvidence(proxy),null);assert.equal(traps,0);
 const inherited=Object.getOwnPropertyDescriptor(Object.prototype,'toJSON');let serializations=0;try{Object.defineProperty(Object.prototype,'toJSON',{configurable:true,value(){serializations++;return 'hidden';}});assert.ok(conditionalLiteralDocEvidence(input));}finally{if(inherited)Object.defineProperty(Object.prototype,'toJSON',inherited);else delete Object.prototype.toJSON;}assert.equal(serializations,0);retain('06-private-mutation-controls',{outcomes,reads,traps,serializations});
});

test('whole original parents retain unknown doc ownership while known false absence preserves JS strict TS',{timeout:60000},async()=>{
 const files={'src/lib.rs':'#![cfg_attr(test,doc="root")]\n#[cfg_attr(test,doc="child module")] mod child; #[cfg_attr(test,doc="entry")] pub fn amount(value:u8)->u8{child::amount(value)}','src/child.rs':'#![cfg_attr(test,doc=r#"child root"#)]\n#[cfg_attr(test,doc="arithmetic")] pub fn amount(value:u8)->u8{value+1}'},observations=[];
 for(const profile of [null,compilationProfile({flags:{test:true}})]){
  const options={entry:'src/lib.rs',paths:Object.keys(files),readSource:path=>files[path],compilationProfile:profile},graph=resolveModuleGraph(options),bindings=resolveModuleBindings({modules:graph.modules,compilationProfile:profile}),result=translateProject(options);observations.push({files,profile,graph,bindings,result});
  assert.deepEqual(result.meta.executable,[]);assert.equal(bindings.scopes.some(scope=>scope.unresolvedAttributeMacroScope),true);assert.equal(condition(files['src/lib.rs'],profile).status,'unknown');
 }
 retain('07-whole-unresolved-originals',observations);
 const options={entry:'src/lib.rs',paths:Object.keys(files),readSource:path=>files[path],compilationProfile:PRODUCTION_PROFILE},result=translateProject(options);retain('07-whole-known-false-absence',{files,result});
 assert.equal(result.meta.sources.length,2);for(const row of result.meta.sources)assert.equal(row.sha256,hash(files[row.source]));assert.equal(result.meta.executable.some(row=>row.name==='amount'),true);
 const runtime=[];await verifyTypedTargets(result,api=>{const value=api.amount(6n);runtime.push({value:String(value)});assert.equal(value,7n);assert.throws(()=>api.amount(255n),RangeError);},{childTimeoutMs:20000});retain('07-existing-absence-js-strict-ts',runtime);assert.equal(runtime.length,2);
});

test('literal-doc candidate facts cannot close foreign imported local or ancestor attribute scopes',()=>{
 const files=[
  {'src/lib.rs':'use foreign::doc; #[cfg_attr(p,doc="candidate")] pub fn amount()->u8{7}'},
  {'src/lib.rs':'mod local{#[proc_macro_attribute] pub fn doc(){}} use local::doc; #[cfg_attr(p,doc="candidate")] pub fn amount()->u8{7}'},
  {'src/lib.rs':'use foreign::doc; mod child;','src/child.rs':'#[cfg_attr(p,doc="candidate")] pub fn amount()->u8{7}'},
  {'src/lib.rs':'use foreign::*; #[cfg_attr(p,doc="candidate")] pub fn amount()->u8{7}'},
  {'src/lib.rs':'inject!(); #[cfg_attr(p,doc="candidate")] pub fn amount()->u8{7}'},
 ],observations=[];
 for(const sources of files){const options={entry:'src/lib.rs',paths:Object.keys(sources),readSource:path=>sources[path],compilationProfile:PRODUCTION_PROFILE},graph=resolveModuleGraph(options),bindings=resolveModuleBindings({modules:graph.modules,compilationProfile:PRODUCTION_PROFILE}),result=translateProject(options);observations.push({sources,graph,bindings,result});assert.equal(result.meta.executable.some(row=>row.name==='amount'||row.name==='child.amount'),false);assert.equal(bindings.scopes.some(scope=>scope.unresolvedAttributeMacroScope||scope.unresolvedMacroScope),true);}
 const source='#[derive(Clone,Copy)] #[cfg_attr(doc_build,doc="record")] struct Item{#[cfg_attr(doc_build,doc="field")] value:u8}',item=sourceItems(source).find(row=>row.term==='struct');assert.throws(()=>inspectDeriveInput(item,PRODUCTION_PROFILE),/active original compilation/);
 const absence=inspectDeriveInput(item,compilationProfile({flags:{doc_build:false}}));assert.deepEqual(absence.derives.map(row=>row.path),[['Clone'],['Copy']]);assert.equal(absence.inertConditionalAttributes.length,0);assert.equal(absence.absentConditionalAttributes.length,2);assert.equal(absence.generatedImplBehavior,false);
 retain('08-all-owner-refusals-and-existing-absence',{observations,source,absence});
});
