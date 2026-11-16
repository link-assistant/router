// Additive complete source-copy profile, with a distinct private issuer/codec.
import {createOwnedCoreSourceContext,ownedCoreSourceData,requireOwnedCoreSourceCurrent,ownedCoreRuntimeSources} from './owned-outcome-source.mjs';
import {analyzeOwnedCoreModule,emitOwnedCoreProgram,prepareOwnedCoreRuntime,evaluateOwnedCoreProgram,evaluateOwnedCoreBatch} from './owned-outcome-operations.mjs';
import {serializeOwnedCoreDocument,readOwnedCoreDocument} from './owned-outcome-document.mjs';
import {prepareReverseConcreteSource,parseReverseConcreteSource} from './concrete-source.mjs';
import {createRulePipeline} from '../rule-pipeline.mjs';
import {posix} from 'node:path';
import {projectOwnedCollectionsTypeScript} from './owned-collections-typed-source.mjs';
export {createOwnedCoreSourceContext as createOwnedCollectionsContext,ownedCoreRuntimeSources as ownedCollectionsRuntimeSources,prepareOwnedCoreRuntime as prepareOwnedCollectionsRuntime,evaluateOwnedCoreProgram as evaluateOwnedCollections,evaluateOwnedCoreBatch as evaluateOwnedCollectionsBatch,readOwnedCoreDocument as readOwnedCollectionsMeta};
export const emitOwnedCollectionsRust=program=>emitOwnedCoreProgram(program,'rust');
function translate(stage,{context,sourcePath,typescriptOutputPath}={}){const sequenceData=ownedCoreSourceData(context),execute=()=>{
 if(ownedCoreSourceData(context).files.find(row=>row.path===sourcePath)?.source!==stage.source)throw new TypeError('Owned collection complete original source/path differs');
 const run=createRulePipeline([
  {phase:'language',rules:[
   {id:'collections:bind-complete-original-Rust-runtime-and-callback-source',apply:()=>{const analysis=analyzeOwnedCoreModule(context,sourcePath);if(analysis.source!==stage.source||analysis.diagnostics.length)throw new TypeError(analysis.diagnostics[0]?.message??'Complete original source differs');return analysis;}},
   {id:'meta:serialize-reparse-and-freshly-reissue-all-collection-callers',apply:analysis=>{const meta=serializeOwnedCoreDocument(analysis.program,{context}),program=readOwnedCoreDocument(meta,{context});return {analysis,meta,program};}},
   {id:'collections:emit-checked-Rust-and-strict-TypeScript',apply:value=>({...value,rust:emitOwnedCoreProgram(value.program,'rust'),typescript:emitOwnedCoreProgram(value.program,'typescript',{outputPath:typescriptOutputPath})})},
  ]},
  {phase:'repository',rules:[{id:'router:retain-original-collection-source-and-explicit-parity-obligations',apply:value=>({...value,javascript:stage.source,concreteSyntax:stage.concreteSyntax,profile:'router-owned-json-outcome-v1',runtimeParity:false,wholeRouterSynchronization:false,rustExecuted:false})}]},
 ]).run(null);requireOwnedCoreSourceCurrent(context);return {...run.value,trace:run.trace};
};return sequenceData.files.some(row=>row.path===sequenceData.runtimeRoot+'/primitive-sequence-runtime.mjs')?withOriginalPrimitiveSequenceSourceOperation(execute):execute();}

export function translateOwnedCollectionsJavaScript(source,options){return translate(prepareReverseConcreteSource(source),options);}
export function translateOwnedCollectionsConcreteSyntaxMeta(meta,options){return translate(parseReverseConcreteSource(meta),options);}
export function translateOwnedCollectionsTypeScript(source,{context,sourcePath,typescriptOutputPath}={}){
 const data=ownedCoreSourceData(context);if(typeof sourcePath!=='string'||!/\.(mts|ts)$/u.test(sourcePath)||data.files.find(row=>row.path===sourcePath)?.source!==source)throw new TypeError('Complete current original TypeScript source/path required');
 const typedRoot=posix.dirname(data.declarationRoot),javascriptRoot=posix.dirname(data.runtimeRoot);if(typedRoot!=='.'&&!sourcePath.startsWith(typedRoot+'/'))throw new TypeError('TypeScript source must stay inside its declared source root');
 const suffix=typedRoot==='.'?sourcePath:sourcePath.slice(typedRoot.length+1),javascriptPath=(javascriptRoot==='.'?'':javascriptRoot+'/')+suffix.replace(/\.(mts|ts)$/u,'.mjs');let projection,derivedContext;
 const run=createRulePipeline([
  {phase:'language',rules:[
   {id:'typescript:retain-complete-typed-source-and-native-annotation-inverse',apply:()=>{projection=projectOwnedCollectionsTypeScript(source);return projection.source;}},
   {id:'collections:check-fresh-projection-and-actual-paired-written-types',apply:value=>{const previous=data.files.find(row=>row.path===javascriptPath);if(previous&&previous.source!==value)throw new TypeError('Concurrent differing paired JavaScript source requires conflict resolution');const files=data.files.filter(row=>row.path!==javascriptPath).concat([{path:javascriptPath,source:value}]);derivedContext=createOwnedCoreSourceContext({...data,files});return translate(prepareReverseConcreteSource(value),{context:derivedContext,sourcePath:javascriptPath,typescriptOutputPath});}},
  ]},
  {phase:'repository',rules:[{id:'router:retain-authoritative-typed-source-and-full-projection-history',apply:value=>({...value,originalTypeScript:source,ownedCollectionTypeScriptHistory:{sourcePath,javascriptPath,projection:projection.history,sourceAuthority:false,semanticAuthority:false}})}]},
 ]).run(null);requireOwnedCoreSourceCurrent(context);requireOwnedCoreSourceCurrent(derivedContext);return {...run.value,ownedCollectionTypeScriptRuleTrace:run.trace};
}

export {createOwnedCoreSourceContext as createOwnedIterationContext,ownedCoreRuntimeSources as ownedIterationRuntimeSources,prepareOwnedCoreRuntime as prepareOwnedIterationRuntime,evaluateOwnedCoreProgram as evaluateOwnedIteration,evaluateOwnedCoreBatch as evaluateOwnedIterationBatch,readOwnedCoreDocument as readOwnedIterationMeta};
export {translateOwnedCollectionsJavaScript as translateOwnedIterationJavaScript,translateOwnedCollectionsTypeScript as translateOwnedIterationTypeScript,translateOwnedCollectionsConcreteSyntaxMeta as translateOwnedIterationConcreteSyntaxMeta};

export {createOwnedCoreSourceContext as createOwnedStateContext,ownedCoreRuntimeSources as ownedStateRuntimeSources,prepareOwnedCoreRuntime as prepareOwnedStateRuntime,evaluateOwnedCoreProgram as evaluateOwnedState,evaluateOwnedCoreBatch as evaluateOwnedStateBatch,readOwnedCoreDocument as readOwnedStateMeta};
export {translateOwnedCollectionsJavaScript as translateOwnedStateJavaScript,translateOwnedCollectionsTypeScript as translateOwnedStateTypeScript,translateOwnedCollectionsConcreteSyntaxMeta as translateOwnedStateConcreteSyntaxMeta,emitOwnedCollectionsRust as emitOwnedStateRust};

export {createOwnedCoreSourceContext as createOwnedOutcomeContext,ownedCoreRuntimeSources as ownedOutcomeRuntimeSources,prepareOwnedCoreRuntime as prepareOwnedOutcomeRuntime,evaluateOwnedCoreProgram as evaluateOwnedOutcome,evaluateOwnedCoreBatch as evaluateOwnedOutcomeBatch,readOwnedCoreDocument as readOwnedOutcomeMeta};
export {translateOwnedCollectionsJavaScript as translateOwnedOutcomeJavaScript,translateOwnedCollectionsTypeScript as translateOwnedOutcomeTypeScript,translateOwnedCollectionsConcreteSyntaxMeta as translateOwnedOutcomeConcreteSyntaxMeta,emitOwnedCollectionsRust as emitOwnedOutcomeRust};

import {withOriginalPrimitiveSequenceSourceOperation} from '../current-primitive-sequence-source.mjs';
