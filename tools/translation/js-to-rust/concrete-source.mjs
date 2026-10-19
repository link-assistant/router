// Lossless source transport only. Existing native grammar and semantic issuers
// independently decide admission after this serialized/reparsed CST boundary.
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta,transportConcreteSyntaxSources,assertConcreteSyntaxHost} from '../concrete-syntax-meta.mjs';
import {originalStaticSourceIntrinsicsUnchanged,originalDataFreezeIntrinsicsUnchanged,throwOriginalCapturedTypeError,originalPrivateParserIngressUnchanged} from '../original-json-intrinsics.mjs';
const initial=originalPrivateParserIngressUnchanged()&&originalStaticSourceIntrinsicsUnchanged()&&originalDataFreezeIntrinsicsUnchanged();
function guard(){if(!initial||!originalPrivateParserIngressUnchanged()||!originalStaticSourceIntrinsicsUnchanged()||!originalDataFreezeIntrinsicsUnchanged())throwOriginalCapturedTypeError('Reverse concrete source host operations changed');}
function language(value){if(value!=='JavaScript'&&value!=='TypeScript')throwOriginalCapturedTypeError('Reverse concrete source requires JavaScript or TypeScript');return value;}

/** Consume a canonical concrete document; its status grants no grammar facts. */
export function parseReverseConcreteSource(text){
 guard();const stage=transportConcreteSyntaxMeta(text);guard();language(stage.document.language);
 // These fixed, explicitly separate source-rule sequences are identity rules.
 // Public callers cannot inject a callback, an owner claim or a skip marker.
 const {source,document,meta,trace}=stage;guard();
 return {source,concreteSyntax:{schema:'router-reverse-concrete-stage-v1',language:document.language,representationLevel:document.representationLevel,status:document.status,meta,trace}};
}

/** The ordinary entry must reconstruct every original UTF16 code unit. */
export function prepareReverseConcreteSource(source,sourceLanguage='JavaScript'){
 guard();language(sourceLanguage);const stage=transportConcreteSyntaxSource(source,{language:sourceLanguage});guard();
 if(stage.source!==source)throwOriginalCapturedTypeError('Reverse concrete source reconstruction differs');
 const {document,meta,trace}=stage;
 return {source:stage.source,concreteSyntax:{schema:'router-reverse-concrete-stage-v1',language:document.language,representationLevel:document.representationLevel,status:document.status,meta,trace}};
}

/** New original/preorder batch contract; existing single APIs stay unchanged. */
export function prepareReverseConcreteSources(rows){
 guard();const batch=transportConcreteSyntaxSources(rows);guard();const stages=[];
 for(let at=0;at<batch.rows.length;at++){
  const {source,document,meta,trace}=batch.rows[at];language(document.language);
  stages.push({source,concreteSyntax:{schema:'router-reverse-concrete-stage-v1',language:document.language,representationLevel:document.representationLevel,status:document.status,meta,trace}});
 }
 guard();return {stages,totals:batch.totals};
}

/** Recheck the original adapter/core host epoch without reusing source truth. */
export function assertReverseConcreteSourceHost(){guard();assertConcreteSyntaxHost();guard();}


import {transportConcreteSyntaxChunks} from '../concrete-syntax-meta.mjs';
/** Chunk order is explicit; stages grant no grammar, host or owner epoch. */
export function prepareReverseConcreteSourceChunks(chunks){
 guard();const result=transportConcreteSyntaxChunks(chunks);guard();const groups=[];
 for(let ci=0;ci<result.chunks.length;ci++){
  const chunk=result.chunks[ci],stages=[];
  for(let at=0;at<chunk.rows.length;at++){
   const {source,document,meta,trace}=chunk.rows[at];language(document.language);
   stages.push({source,concreteSyntax:{schema:'router-reverse-concrete-stage-v1',language:document.language,representationLevel:document.representationLevel,status:document.status,meta,trace}});
  }
  groups.push({stages,totals:chunk.totals});
 }
 guard();return {chunks:groups,totals:result.totals};
}

import {transportConcreteSyntaxParsedChunks} from '../concrete-syntax-meta.mjs';
/** Fixed source-origin specialization; semantic authority remains independent. */
export function prepareReverseConcreteParsedSourceChunks(chunks){
 guard();const result=transportConcreteSyntaxParsedChunks(chunks);guard();const groups=[];
 for(let ci=0;ci<result.chunks.length;ci++){
  const chunk=result.chunks[ci],stages=[];
  for(let at=0;at<chunk.rows.length;at++){
   const {source,document,meta,trace}=chunk.rows[at];language(document.language);
   stages.push({source,concreteSyntax:{schema:'router-reverse-concrete-stage-v1',language:document.language,representationLevel:document.representationLevel,status:document.status,meta,trace}});
  }
  groups.push({stages,totals:chunk.totals});
 }
 guard();return {chunks:groups,totals:result.totals};
}
