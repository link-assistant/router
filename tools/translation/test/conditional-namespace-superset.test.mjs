import {repositorySourceURL} from "./fixtures/repository-paths.mjs";
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {join} from 'node:path';
import {captureSourceModuleViews,originalSourceModuleItems} from '../source-module-views.mjs';
import {loadDeriveDependencyProof} from '../derive-dependencies.mjs';
import {PRODUCTION_PROFILE,compilationProfile,itemConfiguration} from '../cfg-profile.mjs';
import {captureOriginalNamespaceSourceSuperset,originalNamespaceSourceSupersetFacts,CONDITIONAL_NAMESPACE_SUPERSET_LIMITS} from '../conditional-namespace-superset.mjs';
import {captureOriginalExternalTraitPackage,originalExternalTraitPackageInputs} from '../extensions/external-trait-sources.mjs';
import {resolveModuleGraph,translateProject} from '../project.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';
const root=new URL('../../../',import.meta.url),read=path=>readFileSync(repositorySourceURL(path,root),'utf8');
const dependencies=loadDeriveDependencyProof({manifest:read('Cargo.toml'),lock:read('Cargo.lock')});
const hash=value=>createHash('sha256').update(value).digest('hex');
const retain=(name,value)=>{const directory=process.env.ROUTER_CONDITIONAL_NAMESPACE_SUPERSET_VECTOR_DIR;if(directory){mkdirSync(directory,{recursive:true});writeFileSync(join(directory,name+'.json'),JSON.stringify(value)+'\n',{flag:'wx'});}};
function authored(source,profile=PRODUCTION_PROFILE){const capture=captureSourceModuleViews({source,sourcePath:'src/lib.rs',compilationProfile:profile});return {module:{file:'src/lib.rs',path:[],source,sourceView:capture.views[0],compilationProfile:profile},dependencies};}
function issue(input){const token=captureOriginalNamespaceSourceSuperset(input);return {token,facts:originalNamespaceSourceSupersetFacts(token,input)};}
const assertNoAuthority=facts=>{for(const key of ['wholePackageComplete','callerScopeComplete','attributeOwnersResolved','namespaceAuthority','runtimeAuthority'])assert.equal(facts[key],false,key);};

test('complete actual Engine source retains all8 builtin syntax candidates beside unresolved custom owners and every nested bang',{timeout:60000},()=>{
 const packageToken=captureOriginalExternalTraitPackage(dependencies,'base64'),original=originalExternalTraitPackageInputs(packageToken),sources=new Map(original.sources.map(row=>[row.path,row.source]));
 const paths=original.sources.filter(row=>row.path.endsWith('.rs')).map(row=>row.path),graph=resolveModuleGraph({entry:original.crateRoot,paths,readSource:path=>sources.get(path),compilationProfile:null});
 const module=graph.modules.find(module=>module.file==='src/engine/mod.rs');assert.ok(module);
 const input={module,dependencies},result=issue(input);retain('01-whole-package-inputs-and-actual-module',{original,graph,input,result});
 assert.equal(result.facts.source.sourceSha256,hash(module.source));assert.equal(result.facts.outputs.length,8);
 for(const output of result.facts.outputs){assert.equal(output.ownerResolved,false);assert.equal(output.alternatives[0].kind,'unresolved-custom-or-ambiguous-owner');assert.equal(output.alternatives[1].kind,'registered-builtin-source-syntax-candidate');}
 for(const text of ['vec!','unreachable!','panic!'])assert.equal(result.facts.bangs.some(call=>call.original.startsWith(text)),true,text);
 for(const call of result.facts.bangs){assert.equal(module.source.slice(call.span.start,call.span.end),call.original);assert.equal(call.parsedExpansionPosition,true);assert.equal(call.originalPosition.facts.position,'Expr');assert.equal(call.originalPosition.facts.enclosingAttributeBindingsUnchanged,false);assert.equal(call.originalPosition.facts.unresolvedGlobalMacroExportKindsRetained,true);assert.equal(call.dimensions.globalBangEffect,'unresolved');assert.equal(call.dimensions.enclosingAttributeEffect,'ordinary-bindings-block-local; global-generated-macro-kind-pending');}
 assertNoAuthority(result.facts);assert.equal(module.configurationCondition,'unknown');
});

test('unknown custom or qualified derives are never replaced by builtin-looking names',{timeout:60000},()=>{
 const input=authored('#[derive(Copy,custom::Copy,Foreign)]struct Payload{value:u8}'),result=issue(input);retain('02-complete-original-owner-alternatives',{input,result});
 assert.deepEqual(result.facts.outputs.map(output=>output.path),[['Copy'],['custom','Copy'],['Foreign']]);
 assert.equal(result.facts.outputs[0].alternatives[1].kind,'registered-builtin-source-syntax-candidate');
 for(const output of result.facts.outputs){assert.equal(output.alternatives[0].kind,'unresolved-custom-or-ambiguous-owner');assert.equal(output.ownerResolved,false);}
 for(const output of result.facts.outputs.slice(1))assert.equal(output.alternatives[1].kind,'builtin-source-candidate-refused');
 assertNoAuthority(result.facts);
});

test('both cfg alternatives remain even for explicit false or existing optimistic inert lint configuration',()=>{
 const source='#[cfg_attr(switch,doc="literal")]struct One;#[cfg_attr(switch,allow(dead_code))]struct Two;';const observations=[];
 for(const profile of [PRODUCTION_PROFILE,compilationProfile({flags:{switch:false}}),compilationProfile({flags:{switch:true}})]){
  const input=authored(source,profile),result=issue(input);observations.push({input,result});
  assert.equal(result.facts.attributes.length,2);
  for(const row of result.facts.attributes){assert.equal(row.attribute.kind,'conditional-attribute');assert.deepEqual(row.attribute.alternatives.map(choice=>choice.kind),['absent','present']);assert.equal(row.attribute.availabilitySelected,false);assert.equal(row.ownerResolved,false);}
  const two=originalSourceModuleItems(input.module).find(item=>item.name==='Two');assert.equal(itemConfiguration(two.tokens,profile).status,'active','old lint optimism is evidence only, never authority for the new collector');
  assertNoAuthority(result.facts);
 }
 retain('03-all-conditional-alternatives',observations);
});

test('nested conditional and arbitrary documentation payloads retain complete original tokens rather than normalized evidence',()=>{
 const source='#![cfg_attr(unknown,cfg_attr(other,doc="é 😀"))]\n#[cfg_attr(unknown,doc=include_str!("other.md"))]struct Payload;';const input=authored(source),result=issue(input);retain('04-whole-conditional-payloads',{input,result});
 const nested=result.facts.attributes[0].attribute;assert.equal(nested.kind,'conditional-attribute');assert.equal(nested.alternatives[1].attribute.kind,'conditional-attribute');
 assert.equal(result.facts.attributes[1].attribute.kind,'unparsed-conditional-attribute');assert.equal(result.facts.attributes[1].attribute.allOutputObligationsPending,true);
 assert.equal(result.facts.bangs.some(row=>row.original==='include_str!("other.md")'),true);
 for(const attribute of result.facts.attributes)assert.equal(source.slice(attribute.span.start,attribute.span.end),attribute.original);
 assertNoAuthority(result.facts);
});

test('hidden exports imports definitions dead branches and nested source producers remain pending in each dimension',()=>{
 const source='use foreign::*;use foreign::r#doc as r#allow;pub fn caller()->bool{if false{#[macro_export] macro_rules! escape{()=>{}}}let _=outer!(inner!());true}';const input=authored(source),result=issue(input);retain('05-complete-hidden-output-candidates',{input,result});
 const imports=result.facts.declarations.flatMap(row=>row.imports);assert.equal(imports.some(row=>row.glob),true);assert.equal(imports.some(row=>row.name==='allow'),true);
 assert.equal(result.facts.attributes.some(row=>row.attribute.name==='macro_export'),true);
 assert.equal(result.facts.bangs.some(row=>row.kind==='written-declarative-definition'),true);
 for(const name of ['outer!','inner!'])assert.equal(result.facts.bangs.some(row=>row.original.startsWith(name)),true);
 assert.equal(result.facts.bangs.find(row=>row.original.startsWith('outer!')).parsedExpansionPosition,true);for(const row of result.facts.bangs.filter(row=>row.kind==='written-declarative-definition'||row.original.startsWith('inner!')))assert.equal(row.parsedExpansionPosition,false);assert.equal(result.facts.bangs.find(row=>row.original.startsWith('outer!')).originalPosition.facts.enclosingAttributeBindingsUnchanged,false);assertNoAuthority(result.facts);
});

test('copied foreign or changed dependency source item view path and profile cannot reuse the private source superset',()=>{
 const input=authored('struct Payload{value:u8}'),result=issue(input);
 for(const token of [{},structuredClone(result.token),{...result.token,namespaceAuthority:true}])assert.throws(()=>originalNamespaceSourceSupersetFacts(token,input),TypeError);
 for(const dependencies of [{},structuredClone(input.dependencies)])assert.throws(()=>captureOriginalNamespaceSourceSuperset({...input,dependencies}),TypeError);
 const other=authored(input.module.source);assert.throws(()=>originalNamespaceSourceSupersetFacts(result.token,other),/association changed/);
 for(const [field,value]of [['source',input.module.source+' '],['file','src/other.rs'],['path',['foreign']],['compilationProfile',null],['sourceView',structuredClone(input.module.sourceView)]]){const saved=input.module[field];input.module[field]=value;assert.throws(()=>originalNamespaceSourceSupersetFacts(result.token,input),TypeError);input.module[field]=saved;assert.equal(originalNamespaceSourceSupersetFacts(result.token,input),result.facts);}
 retain('06-private-source-joins',{input,result});
});

test('descriptor-only ingress holes getters proxies and source bounds fail without observer callbacks',()=>{
 const input=authored('struct Payload;');let callbacks=0;
 const accessor=Object.defineProperty({...input},'module',{get(){callbacks++;throw Error('getter');}});assert.throws(()=>captureOriginalNamespaceSourceSuperset(accessor),TypeError);
 const proxy=new Proxy(input.module,{get(){callbacks++;throw Error('proxy');},getOwnPropertyDescriptor(){callbacks++;throw Error('proxy descriptor');}});assert.throws(()=>captureOriginalNamespaceSourceSuperset({...input,module:proxy}),TypeError);
 const path=[];path.length=1;path.unrelated='same descriptor count';assert.throws(()=>captureOriginalNamespaceSourceSuperset({...input,module:{...input.module,path}}),TypeError);
 assert.equal(callbacks,0);
 const source='//'+'.'.repeat(CONDITIONAL_NAMESPACE_SUPERSET_LIMITS.sourceBytes);assert.throws(()=>issue(authored(source)),/bounded complete/);
 retain('07-zero-callback-ingress',{callbacks,limits:CONDITIONAL_NAMESPACE_SUPERSET_LIMITS});
});

test('source candidates keep existing whole checked meta JS and strictTS execution separate from unresolved namespace authority',{timeout:60000},async()=>{
 const source='trait Other{fn call(&self)->bool;}pub fn available(value:i32)->bool{value>=0}',input=authored(source),result=issue(input),translation=translateProject({entry:'src/lib.rs',paths:['src/lib.rs'],readSource:()=>source,compilationProfile:PRODUCTION_PROFILE});retain('08-whole-ordinary-translation',{input,result,translation});
 assertNoAuthority(result.facts);assert.equal(translation.meta.executable.some(row=>row.name==='available'),true);const observations=[];
 try{await verifyTypedTargets(translation,api=>{const values=[api.available(-1n),api.available(0n),api.available(1n)];assert.deepEqual(values,[false,true,true]);observations.push(values);},{childTimeoutMs:20000});}finally{retain('08-whole-target-observations',observations);}
 assert.equal(observations.length,2);
});
