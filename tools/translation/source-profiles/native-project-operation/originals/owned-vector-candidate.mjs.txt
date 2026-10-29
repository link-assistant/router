// Explicit receiving API. Run the actual source-copy producer before use.
// Original owned-core/portable APIs and codecs retain their existing dispatch.
import {createOwnedCoreSourceContext,ownedCoreSourceData,requireOwnedCoreSourceCurrent} from './owned-vector-candidate-source.mjs';
import {analyzeOwnedCoreModule,emitOwnedCoreProgram,prepareOwnedCoreRuntime,evaluateOwnedCoreProgram} from './owned-vector-candidate-operations.mjs';
import {serializeOwnedCoreDocument,readOwnedCoreDocument} from './owned-vector-candidate-document.mjs';
import {prepareReverseConcreteSource} from './concrete-source.mjs';
import {createRulePipeline} from '../rule-pipeline.mjs';
export {createOwnedCoreSourceContext as createOwnedVectorCandidateContext,prepareOwnedCoreRuntime as prepareOwnedVectorCandidateRuntime};
export const evaluateOwnedVectorCandidate=evaluateOwnedCoreProgram;
export const parseOwnedVectorCandidateMeta=readOwnedCoreDocument;
export const emitOwnedVectorCandidateRust=program=>emitOwnedCoreProgram(program,'rust');
export function translateOwnedVectorCandidate(source,{context,sourcePath,typescriptOutputPath}={}){
 const stage=prepareReverseConcreteSource(source);if(!sourcePath?.endsWith('.mjs')||ownedCoreSourceData(context).files.find(row=>row.path===sourcePath)?.source!==stage.source)throw TypeError('Owned vector candidate complete original source/path differs');
 const pipeline=createRulePipeline([
  {phase:'language',rules:[
   {id:'owned-vector-candidate:actual-original-rust-and-paired-source-bindings',apply:()=>{const analysis=analyzeOwnedCoreModule(context,sourcePath);if(analysis.source!==stage.source||analysis.diagnostics.length)throw TypeError(analysis.diagnostics[0]?.message??'Complete original source differs');return analysis;}},
   {id:'owned-vector-candidate:serialize-reparse-and-fresh-private-reissuance',apply:analysis=>{const meta=serializeOwnedCoreDocument(analysis.program,{context}),program=readOwnedCoreDocument(meta,{context});return {analysis,meta,program};}},
   {id:'owned-vector-candidate:checked-rust-and-typescript-emission',apply:row=>({...row,rust:emitOwnedCoreProgram(row.program,'rust'),typescript:emitOwnedCoreProgram(row.program,'typescript',{outputPath:typescriptOutputPath})})},
  ]},
  {phase:'repository',rules:[{id:'router:separate-zero-parameter-primitive-vector-candidate',apply:row=>({...row,concreteSyntax:stage.concreteSyntax,profile:'router-owned-primitive-vector-candidate-v1',productionSelected:false,runtimeParity:false,rustExecuted:false})}]},
 ]);
 const result=pipeline.run(null);requireOwnedCoreSourceCurrent(context);return {...result.value,trace:result.trace};
}
