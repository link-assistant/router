// Independent regression SOURCE. Nothing in this file ran during bulk drafting.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {loadDeriveDependencyProof} from '../derive-dependencies.mjs';
import {captureOriginalGenericDerivedOuterAttributeSource,originalGenericDerivedOuterAttributeSourceFacts} from '../builtin-derived-outer-attribute-source.mjs';
import {originalDerivedOuterBuiltinAttributeRegistrations} from '../derive-ancestor-attribute-scope.mjs';
import {originalMacroProducerKindSourcePlan} from '../macro-producer-kind-source.mjs';
import {prepareBuiltinDerivedAttributeSources} from '../prepare-builtin-derived-attribute-sources.mjs';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
import {repositorySourceURL} from './fixtures/repository-paths.mjs';
const root=new URL('../../../',import.meta.url),inputs={manifest:readFileSync(repositorySourceURL('Cargo.toml',root),'utf8'),lock:readFileSync(repositorySourceURL('Cargo.lock',root),'utf8')},dependencies=loadDeriveDependencyProof(inputs),limits={timeout:60000};
const names=['automatically_derived','allow','warn','deny','forbid','stable','unstable'];
test('every generated outer name has an actual original ungated expansion and complete concrete source',limits,()=>{
 const value=originalDerivedOuterBuiltinAttributeRegistrations();assert.deepEqual(value.registrations.map(row=>row.name),names);assert.equal(transportConcreteSyntaxMeta(value.concreteSyntax).source,value.source);assert.equal(value.inverse,value.source);
 for(const {name,registration}of value.registrations){assert.equal(value.source.slice(registration.originalInvocation.sourceSpan.start,registration.originalInvocation.sourceSpan.end),registration.originalInvocation.original);assert.ok(registration.originalInvocation.original.startsWith('ungated!'));assert.equal(registration.expansion.ownerVerified,false);assert.equal(registration.expansion.generatedBehavior,false);assert.ok(registration.expansion.trees.length>0);assert.ok(name.length>0);}
 for(const key of ['sourceAuthority','namespaceAuthority','runtimeAuthority','callerOwnerResolved','attributeBehaviorExecuted','crossInvocationCache'])assert.equal(value[key],false,key);
});
test('whole original attribute constructors defaults overrides registry and collector form a conditional source lemma',limits,()=>{
 const token=captureOriginalGenericDerivedOuterAttributeSource(dependencies,'Debug'),value=originalGenericDerivedOuterAttributeSourceFacts(token,dependencies,'Debug');assert.equal(value.name,'Debug');assert.deepEqual(value.conditionalConclusion.generatedOuterAttributeNames,names);assert.equal(value.conditionalConclusion.outerAttributeNamesSourceClosed,true);assert.equal(value.conditionalConclusion.builtinLookupPrecedesCustomAttributeLookup,true);assert.equal(value.callbacks.collectAttribute.name,'take_first_attr');assert.equal(value.callbacks.attributeIdent.name,'ident');assert.equal(value.owners.attributeIdent.header,'implAttributeExtforAttribute');assert.equal(value.owners.pathFromIdent.header,'implPath');assert.match(value.createSuffix,/let attrs = thin_vec!/u);
 for(const source of value.sources){assert.equal(transportConcreteSyntaxMeta(source.concreteSyntax).source,source.source);assert.equal(source.inverse,source.source);}
 assert.deepEqual(value.trace.map(row=>row.phase),['language','repository']);for(const key of ['callerOwnerResolved','generatedOuterAttributeOwnersResolved','macroExportExceptionClosed','completeGeneratedOutput','namespaceAuthority','runtimeAuthority','wholeCompilerExecuted','crossInvocationCache'])assert.equal(value[key],false,key);
 const current=originalGenericDerivedOuterAttributeSourceFacts(token,dependencies,'Debug');assert.notStrictEqual(current,value);assert.notStrictEqual(current.sources,value.sources);assert.deepEqual(current,value);
 for(const other of [{...token},structuredClone(token),new Proxy(token,{}),value])assert.throws(()=>originalGenericDerivedOuterAttributeSourceFacts(other,dependencies,'Debug'),/copied|foreign/);
 assert.throws(()=>originalGenericDerivedOuterAttributeSourceFacts(token,loadDeriveDependencyProof(inputs),'Debug'),/foreign/);assert.throws(()=>originalGenericDerivedOuterAttributeSourceFacts(token,dependencies,'Clone'),/changed/);assert.throws(()=>captureOriginalGenericDerivedOuterAttributeSource(dependencies,'CoercePointee'));assert.throws(()=>captureOriginalGenericDerivedOuterAttributeSource(structuredClone(dependencies),'Debug'));
});
test('finite producer joins one shared complete source flow to every actual generic registration',limits,()=>{
 const value=originalMacroProducerKindSourcePlan(dependencies),shared=value.genericOuterAttributeSource;assert.equal(shared.joinedRegistrations.length,value.genericRanges.length);assert.ok(shared.joinedRegistrations.length>=11);assert.deepEqual(shared.facts.conditionalConclusion.generatedOuterAttributeNames,names);
 for(const row of shared.joinedRegistrations){assert.equal(row.sharedOriginalCallbacksJoined,true);assert.equal(row.callerOwnerResolved,false);assert.equal(row.namespaceAuthority,false);assert.ok(value.genericRanges.some(range=>range.registration.name===row.name&&range.facts.callbacks.entry.original===row.callback.original));}
 assert.equal(value.producerUniverseClosed,false);assert.equal(value.dataItemEffectsClosed,false);assert.equal(value.namespaceAuthority,false);assert.equal(value.runtimeAuthority,false);assert.equal(value.exceptional.length,1);
});
test('complete original producer catalogue and adjacent source histories retain native selections and both inverses',limits,()=>{
 const plan=prepareBuiltinDerivedAttributeSources();assert.equal(plan.files.length,3);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);assert.ok(row.nativeSelections.language.length>0||row.nativeSelections.repository.length>0);}assert.equal(plan.receivingExecuted,false);assert.equal(plan.sourceAuthority,false);assert.equal(plan.semanticAuthority,false);
});
