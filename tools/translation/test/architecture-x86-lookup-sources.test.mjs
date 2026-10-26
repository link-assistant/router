// Independent actual-source integration SOURCE; all cases are unrun.
import test from 'node:test';
import assert from 'node:assert/strict';
import {proposeOriginalX86TypeMacroLookupSources} from '../architecture-x86-lookup-sources.mjs';
import {captureOriginalTextualMacroLookupFrame,originalTextualMacroLookupSourceFacts} from '../textual-macro-lookup-source.mjs';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
import {prepareArchitectureX86LookupSources} from '../prepare-architecture-x86-lookup-sources.mjs';
const limits={timeout:60000},path='crates/core_arch/src/x86/mod.rs';
test('actual root definition and call prefixes join private generated CST frames and all native lookup premises',limits,()=>{
 const result=proposeOriginalX86TypeMacroLookupSources({paths:[path]}),prefixes=result.sourcePrefixes;assert.equal(result.schema,'original-x86-type-macro-lookup-source-proposal-v1');assert.ok(result.calls.length>0);assert.ok(result.generatedCandidates.length>0);assert.ok(result.namespaceFrames.length>0);
 for(const name of ['root','caller','definitionFile','localMacros']){const row=prefixes[name],full=result.sourceInputs.find(input=>input.path===row.sourcePath);assert.ok(full,name);assert.equal(full.source.slice(row.span.start,row.span.end),row.original);assert.equal(transportConcreteSyntaxMeta(row.concreteSyntax).source,row.original);assert.equal(row.inverse,row.original);assert.equal(row.sourceDomain,'standalone-physical-file-prefix');assert.equal(row.actualRustNamespacePath,null);assert.equal(row.availabilitySelected,false);for(const item of row.items)assert.equal(full.source.slice(item.span.start,item.span.end),item.original);}
 assert.ok(prefixes.rootMacroUse.original.includes('macro_use'));assert.ok(prefixes.callerMacroUse.original.includes('macro_use'));assert.ok(prefixes.rootMacroUse.span.end<=prefixes.rootX86.span.start);assert.ok(prefixes.callerMacroUse.span.end<=prefixes.caller.span.end);assert.equal(prefixes.typeDefinition.name,'types');assert.equal(prefixes.nativeDefinitionHeader.name,'types');assert.ok(prefixes.root.original.includes('include_str!'));assert.ok(prefixes.rootX86.original.includes('cfg'));
 assert.equal(Object.keys(result.nativeLookupFacts.callbacks).length,11);assert.ok(result.nativeLookupFacts.nativeInventoryCells>0);assert.ok(result.observedSourceCells>=result.nativeLookupFacts.nativeInventoryCells&&result.observedSourceCells<=200000);const fresh=originalTextualMacroLookupSourceFacts(result.nativeLookupFrame.token);assert.equal(fresh.profileSha256,result.nativeLookupFacts.profileSha256);
 for(const name of ['modulePathsQualified','configurationSelected','macroOwnerResolved','modularizedCandidatesClosed','globalExportsClosed','attributeAndDeriveEffectsClosed','typePrefixAbsenceQualified','sourceAuthority','namespaceAuthority','runtimeAuthority'])assert.equal(prefixes[name],false,name);for(const name of ['macroOwnerResolved','typeNamespaceComplete','typePrefixAbsenceQualified','architectureExportsComplete','runtimeAuthority','receivingExecuted'])assert.equal(result[name],false,name);
 for(const row of result.wholeFileProposals){assert.equal(row.history.inverse,row.before);assert.equal(row.originalApplicationCoverageQualified,false);}
});
test('the additive exact source domain refuses other architectures duplicate or accessor paths before expansion',limits,()=>{
 for(const paths of [['crates/core_arch/src/x86_64/mod.rs'],[path,path],[],['crates/core_arch/src/arm/mod.rs']])assert.throws(()=>proposeOriginalX86TypeMacroLookupSources({paths}));
 let touched=false;assert.throws(()=>proposeOriginalX86TypeMacroLookupSources({get paths(){touched=true;return [path];}}));assert.equal(touched,false);
});
test('one-operation native frame supplies fresh facts and a private request without a durable source verdict',limits,()=>{
 const frame=captureOriginalTextualMacroLookupFrame();assert.ok(frame.facts.nativeInventoryCells>0&&frame.facts.nativeInventoryCells<=200000);const second=originalTextualMacroLookupSourceFacts(frame.token);assert.notStrictEqual(second,frame.facts);assert.equal(second.nativeInventoryCells,frame.facts.nativeInventoryCells);assert.equal(second.macroOwnerResolved,false);assert.equal(frame.sourceAuthority,false);assert.equal(frame.namespaceAuthority,false);assert.equal(frame.runtimeAuthority,false);assert.throws(()=>originalTextualMacroLookupSourceFacts({...frame.token}),/copied or foreign/u);
});
test('all four complete source equations retain actual original implementations native owners and both rule sequences',limits,()=>{
 const plan=prepareArchitectureX86LookupSources();assert.equal(plan.files.length,4);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.semanticAuthority,false);assert.equal(plan.receivingExecuted,false);
});
