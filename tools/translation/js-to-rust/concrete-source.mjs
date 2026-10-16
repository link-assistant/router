// Lossless source transport only. Existing native grammar and semantic issuers
// independently decide admission after this serialized/reparsed CST boundary.
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
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
