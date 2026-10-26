// Independent original architecture macro SOURCE draft; all cases remain unrun.
import test from 'node:test';
import assert from 'node:assert/strict';
import {originalFreshPrimitiveNamespaceSources,PRIMITIVE_NAMESPACE_SOURCE_PROFILE} from '../extensions/primitive-namespace-sources.mjs';
import {proposeOriginalArchitectureTypeMacroSources} from '../architecture-type-macro-sources.mjs';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
import {prepareArchitectureTypeExpansionSources} from '../prepare-architecture-type-expansion-sources.mjs';
const limits={timeout:60000};
test('fresh original namespace loading retains all pinned original files while caller map edits never affect another load',limits,()=>{
 const first=originalFreshPrimitiveNamespaceSources(),path='crates/core_arch/src/macros.rs',original=first.get(path);assert.ok(original.source.includes('macro_rules! types'));assert.equal(first.size,PRIMITIVE_NAMESPACE_SOURCE_PROFILE.coreSources.length+135);first.delete(path);const second=originalFreshPrimitiveNamespaceSources();assert.equal(second.get(path).source,original.source);assert.notStrictEqual(second.get(path),original);assert.equal(second.size,PRIMITIVE_NAMESPACE_SOURCE_PROFILE.coreSources.length+135);
});
test('actual original x86 type invocations expand recursively with full CST inputs and exact original-input lineage',limits,()=>{
 const result=proposeOriginalArchitectureTypeMacroSources({paths:['crates/core_arch/src/x86/mod.rs']}),names=new Set(result.emittedDeclarations.map(row=>row.name));for(const name of ['__m128i','__m128','__m128d'])assert.ok(names.has(name),name);assert.ok(!names.has('JustOne'));assert.ok(result.calls.length>0);assert.ok(result.observedExpansions>result.calls.length);assert.ok(result.observedSourceCells>0);for(const row of result.sourceInputs){assert.equal(row.inverse,row.source);assert.equal(transportConcreteSyntaxMeta(row.concreteSyntax).source,row.source);}for(const row of result.calls){assert.equal(row.originalInvocation.path[0],'types');assert.equal(row.expansion.lineage.parent,null);assert.equal(row.definitionHeader.name,'types');assert.equal(row.definitionHeader.attributeOwnersResolved,false);}assert.ok(result.remainingProducerObligations.length>0);assert.equal(result.macroOwnerResolved,false);assert.equal(result.typeNamespaceComplete,false);assert.equal(result.typePrefixAbsenceQualified,false);assert.equal(result.architectureExportsComplete,false);assert.equal(result.namespaceAuthority,false);assert.equal(result.runtimeAuthority,false);assert.equal(result.crossInvocationCache,false);
});
test('candidate source options refuse unowned getters proxy/sparse/duplicate paths and paths escaping original archives',limits,()=>{
 let calls=0;const getter={};Object.defineProperty(getter,'paths',{get(){calls++;return [];}});assert.throws(()=>proposeOriginalArchitectureTypeMacroSources(getter),/own/u);assert.equal(calls,0);for(const value of [{paths:[]},{paths:new Array(1)},{paths:['../outside.rs']},{paths:['crates/core_arch/src/../outside.rs']},{paths:['crates/core_arch/src/x86/mod.rs','crates/core_arch/src/x86/mod.rs']},{paths:['crates/core_arch/src/x86/mod.rs'],namespaceAuthority:true},new Proxy({paths:['crates/core_arch/src/x86/mod.rs']},{})])assert.throws(()=>proposeOriginalArchitectureTypeMacroSources(value));
});
test('all four complete source equations retain full originals native owner spans and both substitution phases',limits,()=>{
 const plan=prepareArchitectureTypeExpansionSources();assert.equal(plan.files.length,4);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.semanticAuthority,false);assert.equal(plan.receivingExecuted,false);
});
