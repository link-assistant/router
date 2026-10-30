// Independent actual root/history/known-source case SOURCE. Execution UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,mkdtempSync,rmSync} from 'node:fs';
import {join,dirname} from 'node:path';
import {tmpdir} from 'node:os';
import {gunzipSync} from 'node:zlib';
import {prepareOwnedTextVectorRootActivation,ownedTextVectorRootActivationSourcePlan} from '../prepare-owned-text-vector-root-activation.mjs';
import {prepareOwnedTextVectorRootActivationSources} from '../prepare-owned-text-vector-root-activation-sources.mjs';
import {preparePrimitiveOwnedVectorRootActivation} from '../prepare-primitive-owned-vector-root-activation.mjs';
import {preparePrimitiveSequenceRootActivation} from '../prepare-primitive-sequence-root-activation.mjs';
import {prepareFixedTypeCoreNativeSources} from '../prepare-fixed-type-core-native-sources.mjs';
import {prepareJsonIterationCore} from '../prepare-json-iteration-core.mjs';
import {prepareNativeSourceHistory,ORIGINAL_NATIVE_SOURCE_HISTORY_PROFILE,PRIMITIVE_SEQUENCE_NATIVE_SOURCE_HISTORY_PROFILE,PRIMITIVE_OWNED_VECTOR_NATIVE_SOURCE_HISTORY_PROFILE} from '../native-source-history.mjs';
import {requireCurrentOwnedTextVectorOperationSource} from '../current-owned-text-vector-source.mjs';
import {withFreshOwnedTextVectorInputs} from '../fresh-owned-text-vector-inputs.mjs';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
const limits={timeout:60000},root=new URL('../../../',import.meta.url),archive='tools/translation/source-profiles/owned-text-vector-root-activation/complete-native-history.json.gz';
test('the actual owned String core edge retains its complete original and exact two-phase inverse without caller qualification',limits,()=>{
 const plan=prepareOwnedTextVectorRootActivation(),row=plan.files[0],actual=readFileSync(new URL('rust/src/lib.rs',root),'utf8');assert.equal(row.current,actual);assert.equal(row.after,actual);assert.equal(row.currentAfter,actual);assert.equal(row.after,row.before+'\npub mod translation_owned_text_vectors_core;\n');assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);
 for(const stage of row.stages){assert.equal(transportConcreteSyntaxMeta(stage.beforeMeta).source,stage.before);assert.equal(transportConcreteSyntaxMeta(stage.afterMeta).source,stage.after);assert.equal(stage.inverse,stage.before);}
 assert.equal(plan.sourceAuthority,false);assert.equal(plan.semanticAuthority,false);assert.equal(plan.namespaceAuthority,false);assert.equal(plan.sourceInstalled,false);assert.equal(plan.nativeRustGrammarChecked,false);assert.equal(plan.receivingExecuted,false);assert.equal(plan.rustExecuted,false);
 for(const constructor of [preparePrimitiveOwnedVectorRootActivation,preparePrimitiveSequenceRootActivation,prepareFixedTypeCoreNativeSources,prepareJsonIterationCore]){const prior=constructor(),native=prior.files.find(row=>row.path==='rust/src/lib.rs');assert.equal(native.current,actual);assert.equal(native.currentAfter,actual);assert.equal(native.inverse,native.before);}
});
test('default native history is exactly 24 equations over 17 paths and retains every complete 21/22/23-step prefix',limits,()=>{
 const plan=prepareNativeSourceHistory(),native=plan.files.find(row=>row.path==='rust/src/lib.rs'),rows=JSON.parse(gunzipSync(readFileSync(new URL(archive,root)))).files;
 assert.equal(plan.files.length,17);assert.equal(plan.files.reduce((sum,row)=>sum+row.historyChain.length,0),24);assert.equal(rows.length,24);assert.equal(native.historyChain.length,4);assert.equal(native.current,readFileSync(new URL('rust/src/lib.rs',root),'utf8'));assert.equal(native.after,native.current);assert.equal(native.inverse,native.historyChain[0].before);assert.equal(native.historyChain[3].before,native.historyChain[2].after);assert.equal(native.historyChain[3].after,native.current);assert.equal(native.stages.length,8);
 for(const [profile,count]of [[ORIGINAL_NATIVE_SOURCE_HISTORY_PROFILE,21],[PRIMITIVE_SEQUENCE_NATIVE_SOURCE_HISTORY_PROFILE,22],[PRIMITIVE_OWNED_VECTOR_NATIVE_SOURCE_HISTORY_PROFILE,23]]){const original=JSON.parse(gunzipSync(readFileSync(new URL(profile.archive,root)))).files;assert.equal(original.length,count);assert.deepEqual(rows.slice(0,count),original);}
 assert.equal(plan.sourceCache,false);assert.equal(plan.receivingExecuted,false);assert.equal(plan.rustExecuted,false);
});
test('all three explicit historical profiles accept their original roots and refuse the unrecorded later owned-text root',limits,t=>{
 const actual=readFileSync(new URL('rust/src/lib.rs',root),'utf8');
 for(const [profile,count]of [[ORIGINAL_NATIVE_SOURCE_HISTORY_PROFILE,21],[PRIMITIVE_SEQUENCE_NATIVE_SOURCE_HISTORY_PROFILE,22],[PRIMITIVE_OWNED_VECTOR_NATIVE_SOURCE_HISTORY_PROFILE,23]]){
  const directory=mkdtempSync(join(tmpdir(),'router-owned-text-historical-'));t.after(()=>rmSync(directory,{recursive:true,force:true}));const write=(path,value)=>{mkdirSync(dirname(join(directory,path)),{recursive:true});writeFileSync(join(directory,path),value);},packed=readFileSync(new URL(profile.archive,root)),rows=JSON.parse(gunzipSync(packed)).files;write(profile.archive,packed);for(const row of rows){write(row.originalPath,row.before);write(row.path,row.after);}
  const plan=prepareNativeSourceHistory({root:directory,...profile});assert.equal(plan.files.reduce((sum,row)=>sum+row.historyChain.length,0),count);write('rust/src/lib.rs',actual);assert.throws(()=>prepareNativeSourceHistory({root:directory,...profile}),/unknown complete native current source/u);
 }
});
test('an unrecorded root cannot be admitted by adding an inert comment or by using an unchecked proposal',limits,t=>{
 const directory=mkdtempSync(join(tmpdir(),'router-owned-text-root-refusal-'));t.after(()=>rmSync(directory,{recursive:true,force:true}));const native=prepareOwnedTextVectorRootActivation().files[0],profile=JSON.parse(gunzipSync(readFileSync(new URL(archive,root)))).files.at(-1),write=(path,value)=>{mkdirSync(dirname(join(directory,path)),{recursive:true});writeFileSync(join(directory,path),value);};
 write(profile.originalPath,profile.before);write('rust/src/lib.rs',native.after);assert.equal(prepareOwnedTextVectorRootActivation({root:directory}).files[0].current,native.after);
 const unsupported=native.after+'\n// not a recorded complete root\n';write('rust/src/lib.rs',unsupported);const proposal=ownedTextVectorRootActivationSourcePlan({root:directory});assert.equal(proposal.files[0].current,unsupported);assert.equal(proposal.files[0].after,native.after);assert.equal(proposal.sourceAuthority,false);assert.equal(proposal.semanticAuthority,false);assert.throws(()=>prepareOwnedTextVectorRootActivation({root:directory}),/Unknown complete native/u);
});
test('all eight paired ABI joins see the actual public core file and exact physical root while retaining false owner/caller flags',limits,()=>{
 const source=readFileSync(new URL('rust/src/lib.rs',root),'utf8'),files=withFreshOwnedTextVectorInputs(frame=>new Map([['src/lib.rs',source],...frame.sources.filter(row=>row.path!=='owned-text-vector-contracts.mjs').map(row=>[row.language==='Rust'?row.path:'runtime/'+row.path,row.source])]));
 for(const operation of ['new','from_slice','push','append','truncate','replace','len','get']){const row=requireCurrentOwnedTextVectorOperationSource(files,{runtimeRoot:'runtime'},'vec_text_'+operation);assert.equal(row.operation,operation);assert.equal(row.privateCallerBindingQualified,false);assert.equal(row.nativeTypeOwnerQualified,false);assert.equal(row.nativeRootActivated,false);assert.equal(row.namespaceAuthority,false);assert.equal(row.receivingExecuted,false);assert.equal(row.crossInvocationCache,false);}
});
test('twelve complete mixed source equations preserve all original histories both phases and exact inverses',limits,()=>{
 const plan=prepareOwnedTextVectorRootActivationSources();assert.equal(plan.files.length,12);assert.equal(plan.receivingExecuted,false);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);assert.ok(row.after.split('\n').length-1<1000);}
 const native=plan.files.find(row=>row.path==='rust/src/lib.rs');assert.equal(native.nativeBindings.rustCstSourceChecked,true);assert.equal(native.nativeBindings.rustCompilationExecuted,false);assert.equal(native.nativeBindings.nativeSemanticScopeChecked,false);
});
