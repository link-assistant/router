import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {repositorySourceURL} from './fixtures/repository-paths.mjs';
import {loadDeriveDependencyProof} from '../derive-dependencies.mjs';
import {createDeriveFootprintContext,deriveFootprintOriginalModule,deriveFootprintExternalModules} from '../derive-footprints.mjs';
import {PRODUCTION_PROFILE} from '../cfg-profile.mjs';
import {originalSourceModuleItems} from '../source-module-views.mjs';
import {prepareSchemarsWithOutputProposal} from '../prepare-schemars-with-output.mjs';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
import {proveSchemarsBangFootprint} from '../schemars-bang-footprints.mjs';
import {proveSchemarsWithTypeConfinement} from '../derive-schemars-with.mjs';
import {proveSchemarsWithOutput,assertSchemarsWithOutput,isSchemarsWithOutput,originalSchemarsWithOutput} from '../schemars-with-bang-candidate.mjs';
import {createDeriveEnclosingNamespaceContext,deriveEnclosingNamespaceOutputAt,proveDeriveEnclosingNamespaceEffect,deriveEnclosingNamespaceEffectFacts} from '../schemars-with-context-candidate.mjs';
import {createDeriveEnclosingNamespaceContext as createOriginalEnclosing,deriveEnclosingNamespaceOutputAt as originalEnclosingAt} from '../derive-enclosing-namespace-context.mjs';
const root=new URL('../../../',import.meta.url),read=path=>readFileSync(repositorySourceURL(path,root),'utf8'),hash=value=>createHash('sha256').update(value).digest('hex');
const dependencies=loadDeriveDependencyProof({manifest:read('Cargo.toml'),lock:read('Cargo.lock')});
const simple='/// Original documented container.\n#[derive(schemars::JsonSchema)]#[schemars(with="String")]pub enum Entry{First,Last}';
function setup(source,name='Entry',file='src/lib.rs'){
 const context=createDeriveFootprintContext({modules:[{file,path:[],source,configurationCondition:'active'}],dependencies,compilationProfile:PRODUCTION_PROFILE}),certificate=context.certificates.find(row=>row.name===name);
 const module=certificate?deriveFootprintOriginalModule(context,certificate):null,item=module?originalSourceModuleItems(module).find(row=>row.start===certificate.span.start&&row.end===certificate.span.end):null;return {source,context,certificate,module,item};
}
const issue=row=>proveSchemarsWithOutput({context:row.context,certificate:row.certificate});
function close(row){const enclosing=createDeriveEnclosingNamespaceContext({deriveContext:row.context}),certificate=deriveEnclosingNamespaceOutputAt(enclosing,row.context,row.module,row.item);return {enclosing,certificate};}
function methodNames(output){const words=[];const visit=nodes=>{for(const node of nodes){if(node.tag==='token')words.push(node.text);if(node.nodes)visit(node.nodes);}};visit(output.syntax);return words.flatMap((word,index)=>word==='fn'?[words[index+1]]:[]);}

test('actual complete source producer retains three original modules and both serialized inverse phases',{timeout:60000},()=>{
 const proposal=prepareSchemarsWithOutputProposal({root:fileURLToPath(root)});assert.equal(proposal.files.length,3);assert.equal(proposal.productionSelected,false);assert.equal(proposal.typeOwnerResolved,false);
 for(const file of proposal.files){
  assert.equal(file.current,file.after);assert.equal(transportConcreteSyntaxMeta(file.beforeMeta).source,file.before);assert.equal(transportConcreteSyntaxMeta(file.afterMeta).source,file.after);assert.equal(file.inverse,file.before);
  assert.deepEqual(file.stages.map(row=>row.phase),['language','repository']);assert.equal(file.nativeBindings.nativeSemanticScopeChecked,true);
  let inverse=file.after;for(const phase of [...file.stages].reverse()){assert.equal(inverse,phase.after);assert.equal(transportConcreteSyntaxMeta(phase.beforeMeta).source,phase.before);assert.equal(transportConcreteSyntaxMeta(phase.afterMeta).source,phase.after);inverse=phase.inverse;}assert.equal(inverse,file.before);
 }
 for(const input of proposal.inputs)assert.equal(hash(readFileSync(new URL(input.path,root),'utf8')),input.sha256);
});

test('documented original Type override retains complete nontransparent output and private enclosing effect',{timeout:60000},()=>{
 const row=setup(simple),proof=issue(row),output=originalSchemarsWithOutput(proof,row.context,row.certificate,row.module,row.item);
 assert.equal(assertSchemarsWithOutput(proof,row.context,row.certificate),proof);assert.equal(proof.selectedOwnerBangComplete,true);assert.equal(proof.generatedImplBehavior,false);assert.equal(proof.semanticSyntaxRoundTrip,true);
 assert.deepEqual(proof.outputObservation.definitions,[]);assert.deepEqual(proof.outputObservation.macroExports,[]);assert.equal(proof.inputSource.withOutput.typeOwnerResolved,false);
 assert.ok(proof.branchProofs.some(row=>row.predicate.includes('no transparent flag')));assert.ok(proof.sourceBindings.some(row=>row.role==='actual Type helper and source-proved ignored registered siblings'));assert.equal(output.provenance.semanticRoundTrip,true);
 assert.deepEqual(methodNames(output),['schema_name','schema_id','json_schema','inline_schema']);
 const joined=close(row);assert.ok(joined.certificate);assert.deepEqual(joined.certificate.residualOwners,[]);
 const effect=proveDeriveEnclosingNamespaceEffect(joined.enclosing,row.context,row.module,row.item),facts=deriveEnclosingNamespaceEffectFacts(effect,joined.enclosing,row.context,row.module,row.item);
 assert.deepEqual(facts.enclosingTypeBindings,[]);assert.deepEqual(facts.enclosingUsableValueBindings,[]);assert.deepEqual(facts.enclosingMacroNames,[]);assert.equal(facts.generatedImplBehavior,false);assert.equal(facts.runtimeAuthority,false);
 // A source-only specialization never changes the old standalone refusal.
 assert.throws(()=>proveSchemarsBangFootprint({context:row.context,certificate:row.certificate}));
 const old=createOriginalEnclosing({deriveContext:row.context});assert.equal(originalEnclosingAt(old,row.context,row.module,row.item),null);
});

test('complete genuine ClientKind source joins every actual sibling while preserving all value aliases',{timeout:60000},()=>{
 const original=read('src/clients.rs');assert.equal(hash(original),'2f12c5aa34a65ec62b793902cdefe8f36c1b6c414c673e6499ef40c7dbfb8c2d');
 const row=setup(original,'ClientKind','src/clients.rs');assert.ok(row.certificate,JSON.stringify(row.context.diagnostics));const proof=issue(row),joined=close(row);assert.ok(joined.certificate,JSON.stringify(joined.enclosing.diagnostics));
 assert.equal(proof.inputStyle,'unit-enum');assert.ok(proof.inputSource.withOutput.ignoredHelperProofs.length>0);for(const helper of proof.inputSource.withOutput.ignoredHelperProofs){assert.equal(helper.attribute.name,'value');assert.ok(helper.registrations.some(row=>row.target.join('::')==='clap::ValueEnum'));}
 assert.equal(joined.certificate.actualOwners.length,8);assert.equal(joined.certificate.selectedOwners.length,8);assert.deepEqual(joined.certificate.residualOwners,[]);assert.equal(joined.certificate.generatedImplBehavior,false);
 assert.equal(row.source,original);assert.equal(row.source.slice(row.certificate.span.start,row.certificate.span.end),original.slice(row.item.start,row.item.end));
 const effect=proveDeriveEnclosingNamespaceEffect(joined.enclosing,row.context,row.module,row.item),facts=deriveEnclosingNamespaceEffectFacts(effect,joined.enclosing,row.context,row.module,row.item);assert.equal(facts.certificate,joined.certificate);assert.equal(facts.generatedImplBehavior,false);assert.equal(facts.runtimeAuthority,false);
});

test('no-document Type override retains the complete distinct six-method transparent source branch',{timeout:60000},()=>{
 const row=setup(simple.replace('/// Original documented container.\n','')),proof=issue(row),output=originalSchemarsWithOutput(proof,row.context,row.certificate,row.module,row.item);
 assert.equal(proof.inputSource.withOutput.transparent,true);assert.equal(proof.semanticSyntaxRoundTrip,true);assert.equal(proof.selectedOwnerBangComplete,true);assert.equal(proof.generatedImplBehavior,false);assert.deepEqual(proof.macros,[]);assert.deepEqual(proof.outputObservation.bangCalls,[]);assert.deepEqual(proof.callerMacroOwners.targets,[]);assert.equal(proof.callerMacroOwners.qualifiedRootSourceCalls,false);assert.equal(proof.callerMacroOwners.sourceProfileSha256,null);
 assert.deepEqual(methodNames(output),['inline_schema','schema_name','schema_id','json_schema','_schemars_private_non_optional_json_schema','_schemars_private_is_option']);
 assert.ok(proof.branchProofs.some(row=>row.predicate.includes('complete transparent impl')));const joined=close(row);assert.ok(joined.certificate);assert.deepEqual(joined.certificate.residualOwners,[]);assert.equal(joined.certificate.generatedImplBehavior,false);
 assert.throws(()=>proveSchemarsBangFootprint({context:row.context,certificate:row.certificate}));
});

test('copied foreign getter and unrelated module carriers never acquire output or effect membership',{timeout:60000},()=>{
 const first=setup(simple),second=setup(simple),proof=issue(first);let reads=0;
 for(const fake of [structuredClone(proof),{...proof},new Proxy(proof,{}),Object.defineProperty({},'owners',{get(){reads++;throw Error('observer must not run');}})]){assert.equal(isSchemarsWithOutput(fake),false);assert.throws(()=>assertSchemarsWithOutput(fake,first.context,first.certificate));}
 assert.equal(reads,0);assert.throws(()=>assertSchemarsWithOutput(proof,second.context,second.certificate));assert.throws(()=>issue({...first,context:structuredClone(first.context)}));assert.throws(()=>originalSchemarsWithOutput(proof,first.context,first.certificate,{...first.module,source:first.source+' '},first.item));
 const joined=close(first),effect=proveDeriveEnclosingNamespaceEffect(joined.enclosing,first.context,first.module,first.item);assert.throws(()=>deriveEnclosingNamespaceEffectFacts({...effect},joined.enclosing,first.context,first.module,first.item));assert.throws(()=>deriveEnclosingNamespaceEffectFacts(effect,joined.enclosing,second.context,second.module,second.item));
 assert.ok(deriveFootprintExternalModules(first.context) instanceof Map);
});

test('unknown callback helpers source macros configuration and shadowed owners keep original refusals',{timeout:60000},()=>{
 const inputs=[simple.replace('with="String"','schema_with="callback"'),simple.replace('with="String"','with="callback!()"'),simple.replace('with="String"','with="String",with="Other"'),simple.replace('pub enum','#[cfg(unknown_feature)]pub enum'),simple.replace('pub enum','#[cfg(test)]pub enum'),'mod schemars{}'+simple,'unknown!();'+simple,simple.replace('pub enum','#[unknown]pub enum'),simple.replace('First,','#[value(alias="extra")]First,'),simple.replace('First,','#[unknown]First,'),simple.replace('with="String"','with="String",title=callback!()')];
 for(const source of inputs)assert.throws(()=>issue(setup(source)),undefined,source);
 const callback=proveSchemarsWithTypeConfinement({dependencies,value:'String',position:'container'});assert.equal(callback.completeDeriveOutput,false);assert.equal(callback.typeOwnerResolved,false);assert.equal(callback.generatedImplBehavior,false);
});

test('complete sibling and ancestor producers stay residual despite a closed selected Schemars output',{timeout:60000},()=>{
 for(const source of [simple.replace('schemars::JsonSchema','schemars::JsonSchema,unknown::Producer'),simple+'use unavailable::*;',simple+'#[cfg(unknown_feature)]pub struct Other;',simple+'unknown!();']){
  const row=setup(source);if(!row.certificate){assert.ok(row.context.diagnostics.length);continue;}
  const joined=close(row);if(!joined.certificate)assert.ok(joined.enclosing.diagnostics.length);else{
   // A per-item effect cannot promise the full surrounding source is closed.
   assert.equal(joined.enclosing.scopeWideCompleteness,false);assert.equal(joined.enclosing.generatedImplBehavior,false);assert.ok(row.context.diagnostics.length||source.includes('use unavailable::*;')||source.includes('unknown_feature'));
  }
 }
});

test('whole original source pins reject corruption without changing original source APIs or fixtures',{timeout:60000},()=>{
 for(const name of ['schemars-bang-footprints.mjs','schemars-schema-route.mjs','derive-enclosing-namespace-context.mjs']){
  const source=readFileSync(new URL('../'+name,import.meta.url),'utf8');assert.throws(()=>prepareSchemarsWithOutputProposal({root:fileURLToPath(root),inputSources:{[name]:source+'\n'}}),/whole pinned source differs/);
 }
 const row=setup(simple),output=issue(row);assert.equal(output.inputSource.withOutput.typeOwnerResolved,false);assert.equal(row.certificate.generatedImplBehavior,false);
});
